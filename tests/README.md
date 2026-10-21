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

`CHROMIUM=/chemin/vers/chrome` choisit le navigateur. Les sorties (JSON,
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
| `p4.js` | Panneau Pile : rang par glisser-déposer (un seul `M/`), Undo, Maj+clic, Ctrl+clic |
| `ui.js` | Menus (Alt, flèches), Ctrl+K, onglet Dés, changement de profil à chaud |
| `desbarre.js` | Dés en boutons sous la barre d'icônes (PC) |
| `log500.js` | « ⏭ Fin du log » sur 500 coups : un seul rendu |
| `p3.js` | Téléphone 360×740 : éventail, 3ᵉ pion d'une pile de 6, commande, sommet, déplacement seul |
| `l3.js` | Tablette : fil LOS ancré, mode pose, feuille de commandes |
| `qmark.js` | Unités dissimulées sorties d'une pile : « ? » neuf si l'ancien coiffe encore d'autres unités, sinon l'ancien suit |
| `p5.js` | Loupe de dépôt, double appui pour zoomer |
| `prof.js` | Capture d'un profil et part de la carte (`node prof.js carte.html mobile 360 740`) |
| `vues.js` | Vues Pile, Pions, Journal, Plus du téléphone |
| `chat0.js` | Journal non ramené en bas, profil gelé pendant la saisie |
| `chat2.js` | Relecture d'un log de 50 messages chat compact ouvert ; message reçu en vue Carte ; Retour |
| `chat3.js` | « OK » en deux appuis ; 📍 lieu identique à celui des rapports |
| `chat4.js` | Filtres, lieu cliquable, Retour depuis le journal plein |
| `pcchat.js` | Rien de nouveau visible sur PC |

`commun.js` ouvre la partie de test (piles de 6 et de 2 pions) ;
`navigateur.js` trouve Playwright et Chromium.

Ces tests ne remplacent pas un essai sur de vrais appareils (Safari iOS,
Chrome et Firefox Android) ni la relecture des `.vlog` dans VASL 6.7.3.
