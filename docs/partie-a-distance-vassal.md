# Partie à distance dans VASSAL/VASL — analyse et portage dans `carte.html`

Analyse faite sur les sources de VASSAL (`vassalengine/vassal`, branche
principale), paquetages `VASSAL.chat` et `VASSAL.chat.node`. Classes lues :
`NodeClient`, `Protocol`, `ServerNode`, `AsynchronousServerNode`, `Node`,
`Compressor`, `SynchEncoder`, `SynchCommand`, `ui/SynchAction`,
`CommandDecoder`, `PrivateChatEncoder`, ainsi que `GameModule.sendAndLog` et
`GameState.getRestoreCommand` / `isNewGameAllowed`.

VASL n'ajoute rien au réseau : il utilise le client de VASSAL tel quel. Les
coups qui circulent sont les mêmes commandes que celles des `.vlog`.

---

## 1. Le serveur de VASSAL

Le client ouvre une socket TCP sur le serveur de jeux
(`game.vassalengine.org:5050`). Les messages sont des lignes de texte. Les
joueurs forment un arbre `module/salle/joueur`, par exemple
`VASL/Main Room/<id>`.

| Ligne | Sens | Rôle |
|---|---|---|
| `REG\t<id>\t<chemin>\t<info>` | client → serveur | inscription, d'abord dans `VASL/Main Room` |
| `LOGIN\t<nom>` | client → serveur | nom de compte (facultatif) |
| `JOIN\t<module/salle>[\t<mdp>]` | client → serveur | changer de salle |
| `STATS\t<info>` | client → serveur | nouveau nom ou statut du joueur |
| `FWD\t<chemin>\t<message>` | client → serveur | faire suivre un message |
| `KICK\t<id>` | client → serveur | expulser (propriétaire d'une salle verrouillée) |
| `LIST\t<chemin>=<info>\t…` | serveur → clients | tous les joueurs, salle par salle |
| `ROOM_INFO\t<propriétés>` | serveur → clients | `owner` et verrou de chaque salle |
| `REG_REQUEST\t` | serveur → client | prié de se réinscrire |

Le chemin d'un `FWD` désigne les destinataires (`ServerNode.getMsgSender`) :

- `VASL/<salle>/~<moi>` : toute la salle sauf soi (`sendToOthers`) ;
- `VASL/*/<id>` : un seul joueur, où qu'il soit (`sendTo`) ;
- `VASL/<salle>` : toute la salle, soi compris (`sendToAll`).

Un message de plus de 1000 caractères part en `!ZIP!` suivi du base64 d'un
zip à une seule entrée nommée `Dummy` (`Compressor`).

Le propriétaire d'une salle est son premier occupant
(`AsynchronousServerNode`). Après chaque changement, le serveur envoie à
chacun une `LIST` puis un `ROOM_INFO`.

## 2. La séquence de connexion

1. **Connexion.** Le client ouvre la socket puis envoie
   `REG\t<id>\tVASL/Main Room\t<info>` (`registerNewConnection`).
2. **Liste.** Le serveur répond par `LIST` et `ROOM_INFO`. Le client
   reconstruit les salles et les joueurs (`updateRooms`).
3. **Entrée dans une salle** (`setRoom`). Le client envoie `JOIN`. Si la
   salle a déjà un propriétaire, il note une synchronisation en attente
   (`pendingSynchToRoom`). Il n'est réellement dans la salle qu'à la `LIST`
   suivante.
4. **Demande de synchronisation.** À cette `LIST`, le client lance
   `SynchAction` vers le propriétaire. Il vide sa partie (`setup(false)`)
   puis envoie `FWD\tVASL/*/<proprio>\tSYNC<info du demandeur>`. Une
   nouvelle demande vers la même salle est refusée pendant 15 s
   (`TOO_SOON`). Le client annonce ensuite son arrivée dans le chat
   (« joining room … »).
5. **Réponse du propriétaire.** Chez le propriétaire, `SYNC…` est décodé en
   `SynchCommand`. Son exécution produit l'état complet de la partie,
   `GameState.getRestoreCommand()` : `begin_save`, les pièces, chaque
   composant, puis `end_save`, soit le contenu d'un `.vsav`. Cet état part
   au seul demandeur (`sendTo`).
6. **Restauration.** Le demandeur reçoit `begin_save…end_save`, le décode et
   l'exécute : il a maintenant la même partie que le propriétaire.
7. **Jeu.** Chaque action locale est exécutée puis passée à
   `GameModule.sendAndLog`, qui fait `sendToOthers` puis la consigne au log.
   Chez les autres, `CommandDecoder` décode la ligne, exécute la commande et
   la consigne aussi. Un coup composé (une pile qui bouge) part en une
   seule commande dont les sous-commandes sont séparées par ESC.

Deux règles complètent cette séquence :

- dans une salle, seul le propriétaire peut ouvrir ou commencer une partie
  (`isNewGameAllowed`). Les autres doivent se synchroniser ;
- `SYNC`, `PRIV_CHAT`, `SOUND` et `INVITE` sont des encodeurs que le client
  réseau ajoute au module. Ils voyagent comme des commandes ordinaires.
  `SynchCommand` n'est pas consignée au log (`isLoggable` vaut faux).

## 3. Portage dans `carte.html`

Un navigateur ne peut pas ouvrir de socket TCP vers le port 5050. La page
qui héberge joue donc le rôle du serveur (`creerServeur`, équivalent de
`ServerNode`) et garde le même dialogue ligne à ligne. Les lignes passent :

- **par Internet**, en WebRTC. PeerJS (chargé à la demande depuis unpkg)
  met les postes en relation grâce à son serveur public de rendez-vous ;
  les postes échangent ensuite directement. L'identifiant PeerJS de l'hôte
  est `aslweb-<code>`, où `<code>` est le code de la salle ;
- **entre onglets d'un même navigateur**, par `BroadcastChannel`. Ce mode
  sert aux essais et au jeu à deux sur un même poste.

| VASSAL | `carte.html` |
|---|---|
| `ServerNode.forward` / `getMsgSender` | `creerServeur().recevoir` / `cibles` |
| `ReportContentsThread` (LIST, ROOM_INFO) | `creerServeur().changer` |
| `NodeClient.registerNewConnection` | `_netInscrire` |
| `NodeClient.setRoom` + `pendingSynchToRoom` | `_netRejoindreSalle` + `n.attente` |
| `NodeClient.handleMessageFromServer` | `_netTraiter`, `_netListe` |
| `SynchAction` (garde de 15 s) | `netSynchroniser` |
| `SynchCommand` → `getRestoreCommand` | `_netRepondreSync` → `etatPartie()` |
| exécution du `begin_save…end_save` | `_netRestaurer` → `chargerPartie` |
| `GameModule.sendAndLog` → `sendToOthers` | `_logCmd` → `_netCoup` → `_netAuxAutres` |
| `CommandDecoder` | `_netAppliquer` (`rejouerLog`, puis `_logCmd`) |
| `Compressor` / `!ZIP!` | `_netZip` / `_netDezip` |
| `isNewGameAllowed` | `netProprietaire`, vérifié dans `openGameFile` |
| `setUserInfo` → `STATS` | `_netMajInfo`, appelé par `seConnecter` |

Les commandes échangées sont exactement celles du log (`M/`, `D/`, `+/`,
`-/`, `CHAT`, `INFO\t`). Les commandes d'une même action, nées dans le même
tour de boucle, partent en une commande composée séparée par ESC, comme
dans un `.vlog`. Chaque joueur consigne donc aussi les coups des autres, et
son export `.vlog` contient toute la partie depuis sa synchronisation.

Écarts avec VASSAL :

- quand le propriétaire ouvre une partie alors que la salle est occupée,
  `carte.html` l'envoie aussitôt aux autres (`netPartieChargee`). Dans
  VASSAL, chacun doit demander la synchronisation ;
- après la restauration, un invité qui est encore observateur se voit
  demander son identité. Ses pions masqués restent ainsi invisibles pour
  l'adversaire ;
- la page de l'hôte est le serveur. Si elle est fermée, la salle disparaît.
  Avec VASSAL, le serveur central confierait la salle à l'occupant suivant ;
- les messages privés (`PRIV_CHAT`), les sons, les invitations, le verrou
  et l'expulsion ne sont pas repris.

Le protocole est gardé ligne pour ligne. On pourrait donc, plus tard, relier
la page au vrai serveur de VASSAL par une passerelle WebSocket → TCP
(websockify, par exemple). Il faudrait alors encoder les informations des
joueurs avec le `PropertiesEncoder` de Java au lieu de la forme
`clé=valeur&…` utilisée ici.
