# Tourelle, TCA et état BU / CE dans VASL — analyse pour `carte.html`

Analyse faite sur les sources de VASL (branche `develop` de
`vasl-developers/vasl`, module 6.7.4-beta5) et de VASSAL 3.7
(`vassalengine/vassal`).
Classes lues : `VASL.counters.Turreted`, `ASLCommandEncoder`
(`createDecorator`, `createVehicle`, `VehicleInfo`), et côté VASSAL
`Embellishment0`, `Embellishment`, `FreeRotator`, `BasicCommandEncoder`.
Données lues : `dist/buildFile` (prototypes `xxCTtur`, `xxOTtur`,
`xxOTturF`, `xxTRtur`, `xxCT2tur`, `xxCTnt`, `xxOTnt`, `brCTntAVRE`,
`xxTR`, `repTCA`, `repVCA`, et les PieceSlot des véhicules) et les images
`dist/images/ge/geBU1..6.svg`, `geCE1..6.svg`, `geBUnt.svg`, `geCEnt.svg`.

---

## 1. En bref

- Dans VASL, **il n'y a pas de pion BU ou CE séparé.** L'état BU/CE fait
  partie du véhicule lui-même. Il est porté par un trait propre à VASL,
  `turr;` (classe `Turreted`), quand le véhicule a une tourelle, et par une
  couche `emb2` dans le cas contraire.
- Pour un char à tourelle, le marqueur de tourelle **est** le pion BU/CE :
  la même image indique à la fois le TCA et l'état de l'équipage.
- Le TCA (1 à 6) est **relatif à la caisse**. 3 veut dire « tourelle dans
  l'axe ». Le marqueur n'est pas dessiné quand le TCA vaut 3 et que
  l'équipage est dans son état par défaut (BU pour un CT, CE pour un OT).
- Le trait `rotate` (CA de la caisse) **enveloppe** la tourelle et la couche
  BU/CE : quand la caisse tourne, ces marqueurs tournent avec elle.
- Le marqueur de tourelle n'est **pas centré** sur le pion. Il est décalé
  d'une valeur fixe qui dépend du TCA (§ 3.4).
- Deux couches invisibles (`repTCA`, `repVCA`), plus une troisième (le nom
  BU/CE), servent seulement à changer le **nom** de la pièce dans les
  rapports du journal.

---

## 2. Les prototypes de véhicules

Chaque nation (`ge`, `ru`, `am`…) a sa propre série de prototypes. Le
PieceSlot d'un véhicule en contient un seul :

| Prototype | Véhicules | Trait BU/CE | État par défaut | Nb de PieceSlot |
|---|---|---|---|---|
| `xxCTtur` | blindé fermé à tourelle | `turr;xx/xxBU;xx/xxCE;S;A;r` | BU | 549 |
| `xxOTtur` | blindé ouvert à tourelle | `turr;xx/xxCE;xx/xxBU;S;A;r` | CE | 88 |
| `geOTturF` | 37 FlaK/Pz IV | `turr;ge/geCE;ge/geCE;S;A;r` | CE (toujours) | 1 |
| `xxTRtur` | non blindé à tourelle (SU-12…) | `turr;xx/xxCE;xx/xxCE;S;A;r`, sans couche de nom | CE (toujours) | 41 |
| `xxCT2tur` | deux tourelles (T-26 M31…) | 2 × 2 couches `emb2` (§ 5) | BU | 8 |
| `xxCTnt` | blindé fermé sans tourelle (StuG…) | `emb2` image `xx/xxCEnt.svg` | BU | 98 |
| `xxOTnt`, `…CAR`, `…LVT` | blindé ouvert sans tourelle | `emb2` image `xx/xxBUnt.svg` | CE | 252 |
| `brCTntAVRE` | Churchill AVRE | `emb2` `brFascineBU.svg` / `brFascineCE.svg` | BU | 1 |
| `xxTR` | camions, Dozer… | aucun | — | 222 |

Les comptes sont ceux du `buildFile`, toutes nations confondues, hors variantes `(KFW)`.

### 2.1 Ordre des traits (`geCTtur`)

Du plus externe au plus interne, c'est-à-dire dans l'ordre de la sauvegarde
(les rapports, placemark et labels sont omis) :

```
prototype;IsUnit · prototype;DBUnit · prototype;MTveh
rotate;6;88,130;90,130;CA cw;CA ccw;…          ← CA de la caisse (Ctrl+X / Ctrl+Z)
prototype;Unit58vw
conceal;C;ge/geqmark58.svg;ge;…                ← « ? »
prototype;VehGunlayers · prototype;Bad Things  ← Malf, Bog, Immobilized…
emb2;…;+ BU,+ CE;…;66,130;…                     ← nom « BU » / « CE » (Ctrl+B), sans image
prototype;repTCA                               ← nom « tca1…6 » (absolu)
prototype;repVCA                               ← nom « vca1…6 »
turr;ge/geBU;ge/geCE;S;A;r                      ← tourelle + BU/CE
report;65,130,83,130,66,130;$location$: $newPieceName$ *
…
piece;;;;                                       ← BasicPiece (image du véhicule)
```

Ce qu'il faut en retenir :

- `rotate` est **à l'extérieur** de `turr` et du `emb2` BU/CE.
  `FreeRotator.draw` fait tourner tout le dessin intérieur
  (`Op.rotateScale(Op.piece(piece), angle)`). La tourelle, le marqueur CE
  d'un véhicule sans tourelle et les marqueurs de `Bad Things` tournent
  donc avec la caisse. Les couches posées dans le PieceSlot, à l'extérieur
  du prototype (par exemple les Schürzen `Sz_ov.svg` du PzKw IV), ne
  tournent pas.
- `conceal` est à l'extérieur de `turr`. Pour l'adversaire, le « ? »
  remplace donc tout le dessin, tourelle comprise.
- Une seule frappe de Ctrl+B est reçue par **tous** les traits qui la
  reconnaissent : `turr` change l'image, le `emb2` change le nom, puis le
  `report` (touches 65 A, 83 S, 66 B) écrit dans le journal.

---

## 3. Le trait `turr;` (`VASL.counters.Turreted`)

### 3.1 Type

```
turr;<avant>;<arrière>;<touche cw>;<touche ccw>[;r]
turr;ge/geBU;ge/geCE;S;A;r
```

- `avant` / `arrière` : préfixes d'images. L'image affichée est
  `<préfixe><TCA>.svg`, par exemple `ge/geBU4.svg`.
- Les touches sont d'**ancien format** (une lettre, avec Ctrl implicite) :
  Ctrl+S = « TCA cw », Ctrl+A = « TCA ccw ».
- `r` (`rotateWithCounter`, VASL ≥ 4.2) : le pion tourne en entier.
  `getVehicleCA()` renvoie alors toujours 3. Tous les prototypes actuels
  ont ce `r`. Sans lui (anciennes sauvegardes), le CA de la caisse est lu
  dans un `Embellishment` dont le type contient « Rotate ».

En interne, `mySetType` construit une couche `Embellishment0` à l'ancien
format :

```
emb;;_;S;TCA cw;A;TCA ccw;0;0;;;;;;
```

On y lit : pas de touche d'activation (la couche est toujours active), une
commande `_`, donc `drawUnderneathWhenSelected = true`, 6 niveaux sans
image et un décalage (0, 0). Les images réelles sont dans deux tableaux à
part, `frontImages[6]` et `backImages[6]`, que `draw` choisit selon
`flipped`.

### 3.2 État

```
<TCA>;<activation>;<flipped>        ex. « 3;;false »
```

- `TCA` : niveau de 1 à 6. Il boucle (`loopLevels = true`). **3 = dans
  l'axe** (valeur de départ dans le prototype).
- `activation` : toujours vide.
- `flipped` : `true` quand l'image `arrière` est affichée. Ctrl+B l'inverse
  (commande de menu « BU »).

Le sens de `flipped` dépend du prototype :

| Prototype | `flipped = false` | `flipped = true` |
|---|---|---|
| `CTtur` (avant = BU) | BU | CE |
| `OTtur` (avant = CE) | CE | BU |
| `OTturF`, `TRtur` (CE / CE) | CE | CE |

On ne peut donc **pas** lire « CE » directement dans `flipped`. Il faut
regarder quelle image le trait affiche (`avant` ou `arrière`).

### 3.3 Quand le marqueur est dessiné

```java
isActive() = super.isActive() && (flipped || value != getVehicleCA())   // getVehicleCA() = 3
```

- Pour un CT dans l'axe et BU, rien n'est dessiné : c'est le cas par défaut
  d'un char.
- Dès que la tourelle tourne (TCA ≠ 3), ou que l'équipage passe CE, le
  marqueur `geBU<n>` ou `geCE<n>` apparaît.
- Pour un OT, c'est l'inverse : CE dans l'axe ne montre rien, BU montre
  `geBU3`.
- `getName()` ne change pas le nom (les niveaux n'ont pas de nom quand le
  type contient `r`).
- Quand la pièce est sélectionnée, `drawUnderneathWhenSelected` redessine
  le véhicule **par-dessus** le marqueur de tourelle. On voit alors la
  caisse en entier.

### 3.4 Image et position

Les images `geBU1..6.svg` / `geCE1..6.svg` font **68 × 68**. Le véhicule
(`ge/veh/pzivh.svg`) fait 60 × 60. Chaque image contient un pion de
48 × 48 placé en (8, 8), qui porte la mention « BU » ou « CE ». Ce pion est
tourné **dans le SVG** de `(TCA − 3) × 60°` :

| TCA | Rotation dans le SVG | Décalage `getCurrentImageBounds` | Centre du petit pion par rapport au centre du véhicule |
|---|---|---|---|
| 1 | −120° | (+20, −10) | (+18, −12) |
| 2 | −60° | (+20, +5) | (+18, +3) |
| 3 | 0° | (+20, +20) | (+18, +18) |
| 4 | +60° | (−10, +20) | (−12, +18) |
| 5 | +120° | (−10, +5) | (−12, +3) |
| 6 | 180° | (−10, −10) | (−12, −12) |

`Embellishment0.draw` dessine l'image à `getCurrentImageBounds()`. Ce
rectangle vaut `(−34, −34, 68, 68)`, soit l'image centrée sur la pièce,
puis Turreted le **translate** selon le TCA (`switch (value)`).
La dernière colonne vaut `(−34 + dx + 32, −34 + dy + 32)`. Elle ne tient
pas compte des petites translations internes du SVG, qui font moins de
6 px. Le tout est ensuite tourné avec la caisse par le `rotate` extérieur
(§ 2.1).

Le marqueur déborde donc du pion, sur le côté où pointe la tourelle. Il
n'est **ni centré, ni réduit à la taille du véhicule**.

### 3.5 Commandes

| Commande (menu) | Touche | Effet |
|---|---|---|
| CA cw / CA ccw | Ctrl+X / Ctrl+Z | `rotate` : caisse ±60°. Comme la tourelle est dedans, son orientation absolue suit. |
| TCA cw / TCA ccw | Ctrl+S / Ctrl+A | `turr` : TCA ±1, en boucle de 1 à 6. |
| BU | Ctrl+B | `turr` : `flipped` inversé. Le `emb2` de nom passe au niveau suivant. |

Rappel de `FreeRotator` : `validAngles[i] = −i × 60°`, et « CA cw » fait
`angleIndex + 1`. Un index *i* correspond donc à *i* × 60° dans le sens
horaire, ce que `carte.html` applique déjà avec `rotate(v × 60deg)`.

---

## 4. Les couches de nom : BU/CE, `repTCA`, `repVCA`

Ce sont trois couches **sans image**, qui servent seulement aux rapports
(`$newPieceName$`) :

```
emb2;;2;;;2;B;…; , ;+ BU,+ CE;…;66,130;…   (CTtur ; « + CE,+ BU » pour OTtur ; « + CE,+ CE » pour OTturF)
repTCA : emb2;;2;;;2;SX;;2;AZ;…; , , , , , ;+ tca3,+ tca4,+ tca5,+ tca6,+ tca1,+ tca2;…   état « 1; »
repVCA : emb2;;2;;;2;X;;2;Z;…;  , , , , , ;+ vca3,+ vca4,+ vca5,+ vca6,+ vca1,+ vca2;…    état « 1; »
```

- La couche BU/CE a une commande vide : elle ne figure pas dans le menu,
  mais elle répond à Ctrl+B (`increaseKeyStroke` = 66,130).
- `repTCA` a des touches à plusieurs lettres (`SX`, `AZ`). Elle reste donc
  en version 0, et `BasicCommandEncoder` l'instancie en `Embellishment0`,
  qui accepte chacune de ces lettres. Ctrl+S **ou** Ctrl+X la font avancer,
  Ctrl+A **ou** Ctrl+Z la font reculer. Elle donne ainsi le **TCA absolu**
  (caisse + tourelle), alors que `turr` garde le TCA relatif.
- `repVCA` ne suit que la caisse (X / Z).
- Chaque nom `+ X` s'ajoute à la fin du nom intérieur. Pour un CT, le nom
  reconstruit devrait donc ressembler à « PzKw IVH vca3 tca3 BU ». C'est
  une déduction tirée de `Embellishment.getName`, pas une sortie relevée
  dans VASL.

Pour qu'une modification venue de la page reste cohérente avec VASL, **les
quatre états (`turr`, BU/CE, `repTCA`, `repVCA`) doivent changer ensemble**.
C'est ce qui se passe quand on envoie la touche à toute la pièce, comme le
fait VASSAL.

---

## 5. Les autres cas

### 5.1 Véhicule sans tourelle (`xxCTnt`, `xxOTnt`, AVRE)

```
emb2;;2;;BU;2;B;;2;;;70,130;1;true;-16;-16; ,ge/geCEnt.svg;+ BU,+ CE;…;66,130;…   état « 1 »
```

- Il y a deux niveaux. Le niveau 1 n'a pas d'image (BU). Le niveau 2 affiche
  `ge/geCEnt.svg`, un pion de **48 × 48** marqué « CE », centré en
  **(−16, −16)**, donc en haut à gauche du véhicule.
- Commande de menu « BU », Ctrl+B. Ctrl+F (la touche du Wreck) remet le
  niveau 1.
- Pour un OT (`xxOTnt`), c'est l'inverse : `+ CE,+ BU`, image `geBUnt.svg`.
- Pour l'AVRE, les deux niveaux ont une image (`brFascineBU.svg`,
  `brFascineCE.svg`), placée en (−12, −12).
- `drawUnderneathWhenSelected = true`. La couche est à l'intérieur de
  `rotate` et tourne donc avec la caisse.

### 5.2 Deux tourelles (`xxCT2tur`)

Ce cas n'utilise pas `Turreted`. Chaque tourelle a deux couches `emb2`,
toutes deux à l'intérieur de `rotate` :

| | Tourelle 1 | Tourelle 2 |
|---|---|---|
| Position | (14, −12) | (−12, 14) |
| Couche « BU » (activable) : `ruCE3…ruCE2`, inactive par défaut | Ctrl+T | Ctrl+B |
| Couche TCA : niveau 1 sans image, puis `ruBU4…ruBU2` | Ctrl+W / Ctrl+Q | Ctrl+S / Ctrl+A |
| Couche de nom | `1tca3…` (X W / Z Q) | `2tca3…` (X S / Z A) |

Les touches de rotation font avancer en même temps la couche CE et la
couche TCA. Quand la couche CE est active, elle est dessinée par-dessus la
couche TCA, même dans l'axe. Le sous-menu `TCA` regroupe les commandes
« 1 cw, 1 ccw, 1 BU, 2 cw, 2 ccw, 2 BU ».

### 5.3 Anciennes sauvegardes (VASL < 4)

`ASLCommandEncoder.createVehicle` convertit les anciennes pièces `veh` :

```
CA et TCA lus de 1 à 6, puis −1 ; CE lu comme booléen
OT     → new Turreted("turr;tcaCE;tca;SX;AZ")  setFlipped(!CE)
sinon  → new Turreted("turr;tca;tcaCE;SX;AZ")  setFlipped(CE)
setValue(TCA)
```

Ce type n'a pas de `r`. Le CA est donc lu dans la couche « Rotate » de la
caisse, et la tourelle est masquée quand TCA = CA. Ce cas ne concerne que
les très vieux fichiers.

---

## 6. Ce que fait `carte.html` aujourd'hui

| Fonction | État |
|---|---|
| `_tourelle(ts)` (l. 1595) | Choisit bien `avant` ou `arrière` selon `flipped`, et `<préfixe><TCA>.svg`. **Affiche le marqueur dès que TCA > 0**, donc aussi quand TCA = 3 et que l'équipage est dans son état par défaut. Résultat : un marqueur « BU » est posé sur chaque char CT, alors que VASL n'en montre pas. |
| Dessin de la tourelle (l. 2209) | L'image est **étirée à 100 % du pion**, en `left:0; top:0`. Elle devrait garder sa taille propre (68 × SC), être centrée et être décalée selon le tableau du § 3.4. |
| Rotation | Seul `p.face` reçoit `rotate(...)`. Les `.couche` (tourelle, CE sans tourelle, marqueurs de `Bad Things`) restent droites, alors que dans VASL elles sont à l'intérieur de `rotate` et tournent avec la caisse. Les couches extérieures (Schürzen, labels) doivent, elles, rester droites. |
| `commandesDe` → `turr` (l. 3135) | TCA cw / ccw et BU sont bien gérés, avec les touches Ctrl+S, Ctrl+A et Ctrl+B. |
| `emb2` à plusieurs touches (`repTCA`) | Gérés comme `Embellishment0`, ce qui est correct. |
| Envoi des touches (`executerTouche`) | Une touche est passée à tous les traits, comme dans VASSAL. `turr`, le nom BU/CE, `repTCA` et le `report` restent donc synchronisés. |
| CE sans tourelle (`emb2` −16, −16) | Bien placé par `imagesCouches`, mais **pas tourné** avec la caisse. |
| `drawUnderneathWhenSelected` | Non géré. C'est mineur. |

### Corrections proposées

1. **`_tourelle`** : renvoyer `null` quand `v === 3 && !flipped`. C'est la
   règle `isActive` de Turreted, avec `getVehicleCA() = 3` pour les types
   en `;r`. Sans `r`, il faudrait comparer à `CA + 1`, mais aucun pion
   actuel n'est dans ce cas.
2. **Placement** : renvoyer aussi le décalage, et dessiner l'image à sa
   taille propre :
   ```js
   const DECALAGE_TCA = {1:[20,-10], 2:[20,5], 3:[20,20], 4:[-10,20], 5:[-10,5], 6:[-10,-10]};
   // left = cote/2 + (dx − w/2)·SC ; top = cote/2 + (dy − h/2)·SC, avec w = h = 68
   ```
3. **Rotation** : regrouper le visage et les couches **intérieures** à
   `rotate` (celles dont l'indice de trait est plus grand que celui du
   trait `rotate`) dans un même conteneur tourné. Les couches extérieures
   restent hors de ce conteneur. Pour cela, `_parseLayers` et `_tourelle`
   doivent conserver l'indice du trait.
4. Option : quand la pièce est sélectionnée, redessiner le visage au-dessus
   du marqueur de tourelle (`drawUnderneathWhenSelected`).

---

## 7. Ce que fait `baseVaslWeb (6).html`

C'est un modèle maison qui ne suit pas celui de VASL :

- BU et CE y sont des **marqueurs séparés** (`MARKERS['ce']`,
  `MARKERS['bu']`). `toggleCE` les fait passer par **trois** états :
  aucun → CE → BU → aucun. Dans VASL, il n'y en a que deux, l'état par
  défaut dépend de CT ou OT, et c'est le véhicule lui-même qui le porte.
- Les entrées de menu « Tourner TCA ↺ / ↻ » appellent `_rotL` / `_rotR`,
  c'est-à-dire `rotateCA`, qui fait tourner **la caisse**. Il n'existe pas
  de TCA séparé. Les raccourcis annoncés (← →) ne sont pas ceux de VASL
  (Ctrl+A / Ctrl+S).
- `_parseTourelle` (l. 6382) calcule `angle = (v % 6) × 60`. Or le TCA est
  relatif à la caisse et vaut 3 dans l'axe : l'angle relatif est
  `(v − 3) × 60`. Il prend aussi `ce = flipped`, ce qui est faux pour un OT
  (`flipped` y veut dire BU) et sans objet pour `TRtur` / `OTturF`. Le
  résultat (`turrRot`, `ce`) est conservé, mais n'est jamais dessiné
  (commentaire l. 5813).

Si l'on veut garder ce fichier, la piste la plus simple est de reprendre la
lecture et le dessin de `carte.html`, une fois corrigés comme au § 6.
