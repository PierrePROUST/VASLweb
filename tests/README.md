# Tests de `carte.html`

Des scripts Playwright qui ouvrent `carte.html` dans Chromium, fabriquent
une partie avec des pions de la base VASL (board « a », pris sur le dépôt
GitHub de VASL : il faut le réseau), puis jouent des gestes à la souris ou
au doigt (écran tactile simulé par CDP).

```sh
npm install playwright      # ou une installation globale
sh tests/tout.sh            # compare à origin/map
sh tests/tout.sh HEAD~3     # compare à une autre version
```

`CHROMIUM=/chemin/vers/chrome` choisit le navigateur. Le navigateur se dit
français (`fr-FR`) : l'interface reste celle qu'attendent les tests ;
`LANGUE=en` la passe en anglais. Les sorties (JSON,
captures d'écran) vont dans `tests/sortie/`, ignoré par git.

## Non-régression (comparées à la référence)

| Script | Ce qu'il vérifie |
|---|---|
| `banc.js` | Export `.vsav` sans jouer : segments identiques, aux identifiants de piles près |
| `jeu.js` | Clic, glissé d'une pile, ▲ du panneau, glissé d'une ligne vers la carte : mêmes `M/` |
| `touche.js` | Raccourcis Ctrl+M, Ctrl+F, Ctrl+B sur une pile : mêmes `D/` |
| `chat1.js` | Message envoyé à Entrée sur PC : même segment `CHAT…` |

## Scénarios

| Script | Ce qu'il montre |
|---|---|
| `erreurs.js` | Aucune erreur au chargement de la page |
| `pince.js` | Un pincement qui commence sur un pion zoome et ne déplace rien |
| `doigt.js` | Appui court, appui long (menu), glissé au doigt, lâcher sur le panneau |
| `pc.js` | Double-clic, clic dans une pile dépliée, Ctrl+clic, ↑, glissé de la sélection, Échap, Maj+rectangle, clic dans le vide |
| `alt.js` | Alt + molette dans une pile |
| `pile-arrivee.js` | Pion entré dans une pile occupée : la sélection reste la sienne ; glissé depuis lui ou depuis un pion déjà là, seul lui repart ; Ctrl+clic ajoute un pion au groupe ; clic simple : pile entière ; pions HIP adverses de la pile d'arrivée laissés sur place |
| `p4.js` | Panneau Pile : rang par glisser-déposer (un seul `M/`), Undo, Maj+clic, Ctrl+clic |
| `ui.js` | Menus (Alt, flèches), Ctrl+K inactif, onglet Dés, changement de profil à chaud |
| `desbarre.js` | Dés en boutons sous la barre d'icônes (PC) |
| `ift.js` | Lancer IFT au doigt : feuille à deux roues (4 FP, 0 par défaut), DR forcés croisés avec la table A7, NE, Cowering (Leader, Green), symboles de case ; au PC, IFT reste un simple jet |
| `alerte.js` | SAN, Booby Trap et Sniper sur la ligne du jet (ASLChatter) : annonces soulignées, SAN ou piège en tête ; pas de SAN sur TK, CC, Rally ni de piège hors TC ; dr SA 1 et 2 (A14.3) |
| `log500.js` | « ⏭ Fin du log » sur 500 coups : un seul rendu |
| `p3.js` | Téléphone 360×740 : éventail, 3ᵉ pion d'une pile de 6, commande, sommet, déplacement seul |
| `l3.js` | Tablette : fil LOS ancré, mode pose, feuille de commandes |
| `etat.js` | Commandes d'état en tête des barres rapides (panneau Pile au PC, barre de pile au doigt : `node etat.js carte.html tactile`) : Prep Fire, First Fire, Break, Pin, Conceal ; un seul Prep Fire pour la pile, retiré au second appui (une action) ; Pin à moitié puis sur chaque unité ; Break et Conceal basculés |
| `qmark.js` | Unités dissimulées sorties d'une pile : « ? » neuf si l'ancien coiffe encore d'autres unités, sinon l'ancien suit |
| `mf.js` | Décompte des MF / MP (table des terrains de VASL Tools) : coût de l'hexagone et cumul au chat et au log — bois, mur, pile avec chef, saut, montée, Undo, T-34 sur route (1 MP boutonné, ½ CE) et en bois (Z), Mark unmoved |
| `mf-ravin.js` | Board 5 : ravin 2 MF, ravin-bois 4 MF (B19.4), sortie de ravin à coût doublé (B10.4), pont sur le ravin par la route (B3.4) |
| `mf-cumul.js` | Board 5 : continuité du cumul de l'infanterie sur dix pas (une ligne par pile, sans détail), avec une autre unité qui bouge, un Undo, un saut, une pile qui se sépare , une escouade fraîche qui rejoint le chef, Mark unmoved (remise à zéro, Undo) |
| `mf-contournement.js` | Board 5 : trou d'obus « 1 ou 2 MF » (B2.4) ; contournement d'un bois à pied, côtés 1 à 4 : +1, +0, +1, +0 (A4.31) ; VBM (D2.3, D2.33) ; VCA 1 MP par hexspine, 2 dans les bois (D2.11) ; démarrage et arrêt, Motion (D2.12, D2.13) ; véhicule dans l'hexagone entré (D2.14) ; Undo |
| `mf-start.js` | Board 5 : menu des véhicules — « Start/Stop » et « Reverse » avant « CA cw » ; marche arrière ×4, changement de sens en marche (arrêt + démarrage), Undo d'un Stop |
| `mf-transport.js` | Board 5 : passagers et Riders — entrée à pied (pas passagère), Load (D6.4 : 1 MF, ¼ des MP gardés par MF restant), transport sans MF (D6.3), Unload (D6.5 : ¼ des MP, MF du trajet en véhicule), Undo, nouvelle phase à bord |
| `mf-horscarte.js` | Board 5 : unité hors carte qui entre sur le board (coût du premier hexagone, le décompte ne plante plus) ; chef reconnu par son nom affiché |
| `mf-relecture.js` | Board 5 : décompte des coups relus d'un .vlog (M/ d'un pion, M/ d'une pile VASSAL), au chat sans entrer dans le log ; changement de phase relu ; recul |
| `mov-relecture.js` | Mark unmoved (MOV) après la relecture d'un D/ dont le nouvel état finit par une contre-oblique : état du pion entier, image gardée, Undo |
| `precadrage.js` | Relecture : la vue rejoint la case d'arrivée avant que le pion bouge et que le message du coup paraisse ; ▶ pendant la pause joue le coup en attente |
| `log-coups.js` | .vlog écrit puis relu : un D/ dont l'état finit par une contre-oblique, dernier de son coup, est mis entre apostrophes ; deux déplacements de suite restent deux coups |
| `devoilement.js` | Log commencé avec « Permettre à mes adversaires de démasquer mes unités » : commande UNMASK de VASSAL dans le .vlog ; rouvert par un autre joueur, l'unité reste un « ? » dont seule la commande Conceal est permise, et la démasque ; sans la case, tout est refusé |
| `couches-noms.js` | Couches dont l'image est un nom nu (« mofan », « mober », « mohro » d'un module plus ancien) : Fanatic, Berserk et Heroic dessinés et cumulés |
| `munitions.js` | Munitions épuisées d'un véhicule (Sherman III(a)) : label « $finalammo$ » calculé, s / WP barrés en rouge, Toggle On/Off |
| `qrdc.js` | Tables QRDC (ChartWindow de VASL). En tactile, sous la zone de la carte : trois petits pions sous les boards, onglets du module au doigt (CC, Vehicle TK > HEAT), déplacement et pose refusés sur les tables, rien dans le `.vsav`, masquage ; au PC, rien sur la carte, fenêtre flottante à onglets, déplacée par son titre, fermée par ✕ |
| `overlays.js` | Overlays déplaçables (fenêtres Draggable Overlays et Deluxe Draggable de VASL) : dans la palette, sur leur couche « Overlays », dessinés sous les pions ; en jeu, clic, Maj+clic et glissé les traversent (l'escouade posée sur une route reste prise) ; case « Overlays » cochée, la route se prend au clic ; repris sur leur couche par la sauvegarde ; ruisseau St3 de l'extension VASL Overlays (« ovrst3c.gif » : orientation e de l'archive ovrST recadrée, 422×744, comme VASL la dessine) dessiné sur la couche des overlays, jamais sélectionnable (même case « Overlays » cochée), son segment repris tel quel dans la sauvegarde |
| `page-html.js` | Page HTML d'un label (« HTML Placeholder », VASL Information Tables) : dessinée à l'échelle de Swing (×1,3), au fond sous le pion posé dans une case, logos de nationalité remplacés par les marqueurs de tour VASL, coins de renfort, ni script ni `onerror`, feuille de style cloisonnée |
| `insignes.js` | Images incluses d'un pion SVG (silhouette et insigne de classe : runes SS…) toutes intégrées, aucun chemin relatif laissé |
| `svg-webkit.js` | Pions redessinés trois fois quand le `naturalWidth` d'une image affichée vaut sa taille à l'écran (comme sous WebKit : Safari, Firefox iOS) : leur taille ne change pas |
| `liens.js` | PieceLinker : « Fire Lane » au menu d'une MG (pas d'une escouade) pose un Firelane lié et sélectionné ; « + ACQ » d'un véhicule lie l'ACQ ; trait rouge et « Range: 3 » de D4 à G5 ; Ctrl+Alt+L / Ctrl+Alt+U ; `LINK_PIECE` repris par la sauvegarde ; Undo |
| `mf-route.js` | Boards 5 et 24 : bois traversé d'une route (5I4 : 1 ou 2 MF par la route, 2 par le bois ; A4.132, B13.4), chemin (24W8 : 1 MF, B13.6), bois traversé d'un chemin (24W7) |
| `mf-niveaux.js` | Board 5 : foxhole (entrer dessous 1 + 1 MF, en sortir +1 ; B27.4, B27.5), tranchées reliées (1 MF, B27.54), étage par le compteur « Building » (1 MF par niveau, B23.4), Undo |
| `mf-escaliers.js` | Board 1 : arrivée au rez-de-chaussée sous le marqueur d'étage (B23.421) ; escalier imprimé (1U3), absent (1U2, B23.23), maison sans étage (1D4, B23.21), maison à deux niveaux 1F1-G1 (même étage : 2 MF), toit (B23.8) |
| `p5.js` | Loupe de dépôt, double appui pour zoomer |
| `loupe.js` | Loupe : 200 px, rayon de 1 hexagone, dans l'écran (`node loupe.js carte.html 360 740`) |
| `loupelos.js` | LOS au doigt en deux temps : source puis cible, chacune avec la loupe dès l'appui et posée au relâché ; un deuxième doigt pince la carte |
| `prof.js` | Capture d'un profil et part de la carte (`node prof.js carte.html tactile 360 740`) |
| `tabtel.js` | Tablette et téléphone : même disposition, dés dans la colonne d'icônes, aperçu du chat sur deux lignes avec les jets |
| `fermer.js` | Téléphone : la pile se ferme d'un appui à côté (zoom « Ajuster » compris) ou par la croix rouge |
| `liste.js` | Liste de la pile au téléphone (et profil PC sur écran étroit) : appui sur la carte et croix rouge la ferment |
| `orphelin.js` | Un seul éventail à la fois (double appui, verrou des pions) ; la croix le ferme |
| `vues.js` | Vues Pile, Pions, Journal, Plus du téléphone |
| `loupepc.js` | PC : pendant un glissé à la souris, la loupe ne montre que l'hexagone survolé |
| `loupelospc.js` | LOS à la souris : la loupe montre l'hexagone survolé avec le fil, et disparaît au relâché |
| `nav.js` | Colonne d'icônes du téléphone (à droite) : ses icônes (toutes celles de Plus comprises, aucune vide), défilement au doigt, carte sans pions, Remove all |
| `chat0.js` | Journal non ramené en bas, profil gelé pendant la saisie |
| `chat2.js` | Relecture d'un log de 50 messages chat compact ouvert ; message reçu en vue Carte ; Retour |
| `chat3.js` | Seules les 5 phrases ; une phrase envoyée d'un appui, brouillon gardé |
| `chat4.js` | Filtres, lieu cliquable, Retour depuis le journal plein |
| `cote.js` | Icône ⇄ : colonne d'icônes à droite ou à gauche, choix retenu ; « Affichage : PC » dans Plus seulement |
| `pcchat.js` | Rien de nouveau visible sur PC |

`commun.js` ouvre la partie de test (piles de 6 et de 2 pions) ;
`navigateur.js` trouve Playwright et Chromium.

Ces tests ne remplacent pas un essai sur de vrais appareils (Safari iOS,
Chrome et Firefox Android) ni la relecture des `.vlog` dans VASL 6.7.3.
