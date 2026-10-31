# OBA dans VASL — analyse pour `carte.html`

Analyse faite sur les sources de VASL (branche `develop` de
`vasl-developers/vasl`). Classe lue : `VASL.build.module.OBA`
(`src/VASL/build/module/OBA.java`). Donnée lue : `dist/buildFile`, qui
déclare `<VASL.build.module.OBA hotkey="117,0"/>` (F6).

---

## 1. En bref

- L'OBA de VASL n'est **pas un pion** : c'est un composant de partie
  (`GameComponent`) avec son bouton « OBA » dans la barre d'outils (F6),
  qui ouvre ou cache la fenêtre « OBA Modules ».
- La fenêtre liste des **modules** ; chacun est une pioche de cartes
  **noires** et **rouges** (Battery Access, C1.21), 8 noires et 3 rouges
  à sa création. « Add Module » en ajoute un.
- Un module **appartient** au joueur qui l'a créé : son `userId` VASSAL
  (le mot de passe des préférences, le même que pour les masques). Seul
  le propriétaire tire, remet une carte ou modifie les champs ; les autres
  voient la pioche et les cartes tirées.
- Chaque module a aussi deux champs d'observateur hors carte (« OBO
  Bd/Hex », « OBO Level ») et un bouton « Add OBO » qui place cet
  observateur dans la carte LOS de VASL.

## 2. Les gestes

Le dessin (`DeckView`) : à gauche les cartes tirées (rectangles noirs ou
rouges de 22 × 33 px), puis la pioche (cartes grises empilées).

| Geste du propriétaire | Effet | Chat |
|---|---|---|
| Clic sur la pioche | Tire une carte : noire avec la probabilité noires / (noires + rouges) ; elle passe aux cartes tirées | `*** Battery Access Draw = Black ***` ou `= Red` |
| Clic sur une carte tirée | La remet dans la pioche | — |
| Nombre de noires ou de rouges changé | Les cartes tirées sont écartées (`showing` vidé) | — |
| 0 noire, 0 rouge, aucune carte tirée | Le module est retiré | — |
| Nom changé | Seul le nom change | — |

Le message de chat est un `Chatter.DisplayText` sans nom de joueur (avec
une espace en tête : `" *** Battery Access Draw = Black ***"`), auquel
VASL ajoute la commande `UpdateModule` : un seul coup composé.

## 3. Commandes et sauvegarde

Encodage par `SequenceEncoder("OBA", '/')` :

```
OBA/+/<rang>/<état>   CreateModule — Undo : RemoveModule
OBA/D/<rang>/<état>   UpdateModule — Undo : UpdateModule vers l'état d'avant
OBA/-/<rang>          RemoveModule — Undo : CreateModule de l'état d'avant
```

L'état, par `SequenceEncoder(',')` :

```
propriétaire,nom,rouges,noires,tirées,hexOBO,niveauOBO
```

« tirées » est une lettre par carte tirée : `b` noire, `r` rouge. Un
ancien état s'arrête après « tirées » (sans les deux champs OBO). Comme
toujours avec `SequenceEncoder`, un « , » dans le nom est précédé d'une
contre-oblique, puis un « / » dans l'état entier.

La sauvegarde (`getRestoreCommand`) contient un `CreateModule` par
module. Ils forment une sous-commande imbriquée : entre deux modules,
l'ESC est précédé d'une contre-oblique dans le `.vsav`.

## 4. Ce qu'en fait `carte.html`

- Mêmes commandes, même état, même message : un `.vsav` ou un `.vlog`
  passe de VASL à la page et retour ; les coups circulent en partie à
  distance ; Undo et la relecture (avant, arrière) les suivent.
- Le propriétaire est `idJoueur()` (le mot de passe de l'utilisateur, comme
  pour les masques) ; l'administrateur commande tous les modules.
- Au PC : une fenêtre flottante « OBA Modules » (bouton OBA de la barre,
  menu Outils, F6).
- En tactile : bouton OBA dans la colonne d'icônes ; les modules sont posés
  sous les boards, au-dessus des tables QRDC, comme elles ; nombres réglés
  par − / +, tirage et remise d'un appui ; texte et cartes gardent une
  taille touchable quand la carte s'éloigne.
- Les champs OBO sont lus et réécrits tels quels, mais pas proposés : la
  LOS de la page ne connaît pas l'observateur hors carte.
