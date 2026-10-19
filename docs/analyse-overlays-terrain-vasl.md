# Overlays et transformations de terrain dans VASL — analyse pour `carte.html`

Analyse faite sur les sources de VASL (branche `develop` de
`vasl-developers/vasl`) pour préparer le portage dans `carte.html`.
Classes lues : `ASLBoardPicker`, `boardPicker/ASLBoard`, `Overlay`,
`SSROverlay`, `Underlay`, `SSRFilter`, `board/ASLHexGrid`,
`boardArchive/BoardArchive`, `BoardMetadata`, `AbstractMetadata`.
Données lues : `dist/boardData/SharedBoardMetadata.xml`, `SSRControls`, les
archives d'overlays `ovrO`, `ovrRR`, `ovrBE`, `ovrOG`, `ovrX`, `ovr1` et le
board `bd92`.

---

## 1. Ce que fait `carte.html` aujourd'hui

| Fonction | État |
|---|---|
| `_parseBoardSegment` | lit position, nom, `r` (retourné), recadrage, `ZOOM` et la liste `SSR`. **Ignore `OVR`.** |
| `chargerGeoBoard` | lit `width`, `height`, `hexWidth`, `hexHeight` dans `BoardMetadata.xml`. **Ignore `A1CenterX/Y` et `altHexGrain`.** |
| `appliquerSSR` | repeint les couleurs avec la table `LOS_SSR` (81 règles `colorSSR` partagées, couleurs déjà converties en RGB), **une passe par règle, dans l'ordre de la sauvegarde**. |
| `_renderBoards` | repeint (SSR), puis recadre et retourne l'image du board dans un canvas. |
| Overlays d'hexagones (`OVR`) | **non gérés.** |
| SSR par image (`overlaySSRule`, ex. `bd92_NoRoads.gif`) | **non gérées.** |
| SSR par motif (`underlaySSRule`, ex. `WoodsToBrush`) | **non gérées.** Les 67 entrées `"m"` de `LOS_SSR` sont ignorées par `appliquerSSR`. Ces règles sont donc bien reconnues, puis signalées à tort par « aucune couleur à repeindre ». |

`baseVaslWeb (6).html` contient déjà `_parseOverlays`, `_trimOverlayName`,
`_overlayArchive` et `_fetchOverlayImage`, mais **ce code n'est jamais
appelé**. En plus, il prend toujours l'orientation `a`, ne calcule aucune
position, et associe les images `bdXX_Règle.gif` par leur nom sans lire les
coordonnées `x,y` données dans `BoardMetadata.xml`. Il peut servir de point
de départ, pas plus.

---

## 2. Format dans la sauvegarde (`ASLBoard.getState`)

```
bd \t x \t y \t [r]nom \t [cropX \t cropY \t cropW \t cropH \t]
   VER \t version \t
   (OVR \t nomOverlay \t hex1 \t hex2 \t)*
   [SSR \t règle1 \t règle2 \t …]
   [\t ZOOM \t z]
   [\t FH \t true]
```

- Les overlays viennent **avant** `SSR`, dans l'ordre où ils ont été posés.
  Cet ordre compte pour la superposition.
- `Overlay.toString()` n'écrit que `OVR\tnom\thex1\thex2`. Le 4ᵉ champ
  `persistelevation` (« Preserve Levels ») **n'est jamais enregistré**. À la
  relecture, `Boolean.parseBoolean("OVR"|"SSR"|…)` donne `false`. Pour un
  `.vsav`, on peut donc ignorer la transformation « preserve elevation »
  (§ 5.4).
- Les règles SSR sont séparées par des tabulations (le `rule="A,B,C"` de
  `SSRControls` est converti en tabulations par `TerrainOption`). VASL les
  découpe avec `StringTokenizer` (espaces et tabulations) et supprime les
  doublons. Les jetons inconnus (`ZOOM`, `1.5`, `FH`, `true`…) n'ont aucun
  effet.
- À la lecture (`ASLBoardPicker`, l. 838-852), VASL consomme chaque `OVR`
  avec `while (bd.contains("OVR"))`, puis prend comme règles tout ce qui suit
  `SSR`.

Le parseur actuel de `carte.html` convient pour `SSR`. Pour `OVR`, la
fonction `_parseOverlays` de baseVaslWeb peut être reprise telle quelle.

---

## 3. Pipeline de rendu d'un board (`ASLBoard.BoardOp.eval`)

C'est l'ordre exact à reproduire :

```
1. im  = canvas de la taille VISIBLE (crop.w×crop.h, ou image entière)
2. dessiner le board de base, découpé au rectangle de recadrage
3. pour chaque overlay o de board.overlays, DANS L'ORDRE DE LA LISTE :
     dessiner o.image à o.bounds (repère du board NON recadré) − crop.xy
     si o a ses propres SSR (archive avec BoardMetadata/colorSSR) :
         dessiner ses SSROverlay décalées de o.bounds.xy
4. si le board a des SSR : terrain.transform(im)    ← repeint TOUTE l'image
5. (VASSAL) retournement de 180° si le board est « r », puis zoom
```

Conséquences :

- **Le repeint des couleurs s'applique après les overlays.** `NoGrain`
  enlève aussi le blé d'un overlay, et `WoodsToBrush` repeint aussi le motif
  posé par l'underlay. Dans `carte.html`, le repeint se fait aujourd'hui sur
  le board seul, avant le recadrage. Il devra passer **après** la
  composition.
- **Le retournement porte sur l'image composée.** Un overlay sur un board
  `rXX` est tourné de 180° avec lui. On ne calcule jamais de position
  « retournée » pour les overlays.
- **Ordre de la liste `overlays`.** `addOverlay` ajoute les overlays
  d'hexagones à la fin, dans l'ordre de la sauvegarde. Ensuite,
  `setTerrain` insère chaque `SSROverlay` **en tête** (`overlays.add(0, o)`).
  `SSRFilter` crée d'abord les overlaySSR puis les underlays, donc après les
  insertions en tête la liste vaut :

  ```
  [underlay_n … underlay_1, overlaySSR_n … overlaySSR_1, OVR_1 … OVR_k]
  ```

  Les SSR graphiques passent **sous** les overlays d'hexagones, et les
  underlays sous les images SSR.

---

## 4. Transformations de terrain (`SSRFilter`)

Une règle SSR peut avoir trois formes, et une même règle peut en combiner
plusieurs :

| Forme | Source | Effet |
|---|---|---|
| `colorSSR` | `SharedBoardMetadata.xml` + `BoardMetadata.xml` du board | substitution de couleurs `nomCouleur → nomCouleur` |
| `overlaySSRule` / `overlaySSRuleSet` | `BoardMetadata.xml` du board (ou de l'overlay) | une ou plusieurs images de l'archive posées à `x,y` (repère du board non recadré) |
| `underlaySSRule` | `SharedBoardMetadata.xml` (68 règles) | motif `boardData/XxxPattern.gif` qui remplace certaines couleurs du board |

Les règles déclarées seulement comme `<LOSSSRule>` (`NoCliffs`, `Bamboo`,
`RoadsToPaths`…) n'ont **aucun effet graphique en elles-mêmes**. Mais
plusieurs d'entre elles ont une `overlaySSRule` propre à un board : `bd92`
fournit `bd92_RoadsToPaths.gif`, `bd92_Bamboo.gif`, `bd92_DenseJungle.gif`,
`bd92_PalmTrees.gif`… Le classement « sans effet graphique » de
`SSR_LOS_SEULES` n'est donc vrai que **pour les boards qui n'en déclarent
pas**.

### 4.1 Substitution de couleurs : l'algorithme exact

`SSRFilter.loadRules` ne fait pas de cascade. Il construit **une seule
table** `couleur → couleur`, puis l'applique en **une seule passe** :

```js
// regles : Set des noms demandés (jetons du champ SSR, sans doublons)
// colorSSRules : Map ORDONNÉE nom → [[de, vers], …] (ordre du fichier partagé,
//                puis règles nouvelles du BoardMetadata du board)
// rgb : nom de couleur → entier 0xRRGGBB (couleurs du board, cf. 4.2)
const table = new Map();
for (const [nom, maps] of colorSSRules) {          // ordre du FICHIER
  if (!regles.has(nom)) continue;
  for (const [de, vers] of maps) {
    const a = rgb.get(de), b = rgb.get(vers);
    if (a == null || b == null || a === b) continue;
    if (!table.has(a)) table.set(a, b);              // la première règle gagne
    for (const [k, v] of table) if (v === a) table.set(k, b); // fermeture vers l'arrière
  }
}
// puis, pour chaque pixel : rgb = table.get(rgb) ?? rgb (alpha conservé)
```

Différences avec `appliquerSSR` :

1. **L'ordre** est celui du fichier de métadonnées, pas celui de la
   sauvegarde. `Level6ToLevel5 … Level1ToLevel0` y est rangé du haut vers le
   bas, ce qui produit l'effet « en cascade ». Dans l'ordre inverse, VASL ne
   ferait **pas** descendre un niveau 6 jusqu'à 0.
2. **Chaînes dans une même règle.** La fermeture relie aussi les
   correspondances d'une même règle. Cela arrive dans `Mud`
   (`GullyHill5 → GullyHill5Mud`, qui a le même RGB que `Level6`, lui-même
   remappé). Avec une seule table par passe, `carte.html` ne relie pas ces
   correspondances.
3. **Performance.** Une seule passe sur l'image au lieu d'une par règle.

L'algorithme ci-dessus est à la fois plus simple et fidèle. Il remplace la
boucle actuelle.

### 4.2 Couleurs et règles propres à un board

`BoardMetadata` commence par copier les couleurs et règles partagées, puis lit
le `BoardMetadata.xml` du board :

- `<colors>` **remplace** les couleurs du même nom (`parseColors(…, true)`) ;
- `<colorSSRules>` **ajoute** des règles, ou complète une règle partagée du
  même nom (ses correspondances viennent à la suite) ;
- `<overlaySSRules>` contient les images SSR du board, ainsi que d'éventuels
  `underlaySSRule` supplémentaires.

La table `LOS_SSR` de `carte.html` est calculée d'avance avec les couleurs
**partagées**. Elle ne voit donc ni les couleurs redéfinies par un board, ni
ses règles propres. L'archive du board est déjà téléchargée (`_archive`) :
il suffit de lire en plus `<colors>`, `<colorSSRules>` et `<overlaySSRules>`
de son `BoardMetadata.xml`, et de les fusionner avec la table partagée au
moment du rendu.

Recommandation : garder une table partagée embarquée, mais sous forme
**nommée** (`nom → RGB` et `règle → [[nomDe, nomVers]]`) plutôt que déjà
convertie en RGB, pour permettre ces surcharges. Autre option : télécharger
`dist/boardData/SharedBoardMetadata.xml` (279 Ko) une seule fois.

### 4.3 Images SSR (`SSROverlay`)

```xml
<overlaySSRule name="Level1ToLevel0" image="bd92_Level1ToLevel0.gif" x="646" y="553"/>
<overlaySSRuleSet name="…"><overlaySSRuleImage image="…" x=".." y=".."/>…</overlaySSRuleSet>
```

- L'image est lue **dans l'archive du board** (ou de l'overlay qui déclare la
  règle).
- `bounds = (x, y, largeur, hauteur de l'image)` dans le repère du board non
  recadré. Elle est dessinée à `(x − crop.x, y − crop.y)`.
- Une archive peut contenir d'autres images (`SSO_92_N16.gif`). Seules
  celles que nomme une règle sont utilisées.

### 4.4 Motifs (`Underlay`)

Pour une règle `underlaySSRule name=R image=P.gif` avec la liste de couleurs
`C` :

```
1. base  = image du board NON repeinte (getBaseImage), entière
2. trou  = base où chaque pixel de couleur ∈ C devient TRANSPARENT,
           et tout autre pixel devient NOIR OPAQUE      (HolePunch(C, mask=0))
3. motif = P.gif répété en mosaïque sur toute la taille du board
4. comp  = motif, puis trou dessiné par-dessus, décalé de −crop.xy
5. comp  : tout pixel noir (0,0,0) devient transparent  (HolePunch({0}))
6. comp est dessiné comme un overlay à crop.xy, donc à (0,0) du canvas visible
```

Résultat : le motif n'apparaît que là où le board avait une couleur de `C`.
Les pixels **noirs du motif** deviennent eux aussi transparents (effet de
bord de l'étape 5, à reproduire tel quel). Le repeint des couleurs (§ 4.1)
s'applique ensuite au motif.

Dans un canvas, en une seule passe sur l'`ImageData` de la base :
`masque[i] = C.has(rgb)`, puis pour chaque pixel masqué on recopie
`motif[(x % w) + (y % h) * w]` s'il n'est ni transparent ni noir. Pas besoin
de canvas intermédiaire.

Les 12 motifs (`BrushPattern.gif`, `VineyardPattern.gif`, `PaddyPattern.gif`,
`WoodsPattern.gif`, `CactusPattern.gif`, `OliveGrovePattern.gif`…, 0,2 à
3 Ko chacun) se trouvent dans
`https://raw.githubusercontent.com/vasl-developers/vasl/develop/dist/boardData/`.
Les noms de couleur de chaque règle sont déjà dans `LOS_SSR[r].m[1]`, sous
forme RGB.

Si l'archive de l'underlay n'est pas un board (son nom ne commence pas par
`bd`), le trou est découpé dans l'image de l'**overlay** concerné au lieu du
board. Ce cas ne se produit qu'avec un overlay qui embarque ses propres SSR.

---

## 5. Overlays d'hexagones (`Overlay`)

### 5.1 Archive et fichier image

```
archive = "ovr" + trimName(equivalence(nom + "a")).toUpperCase()
image   = "ovr" + equivalence(nom + orientation) + ".gif"
```

- `equivalence` : `be2*`, `be3*` → `be1*` ; `be5*`, `be6*` → `be4*` ;
  `oc2*` → `oc1*` ; `oc4*` → `oc3*`. **Absente de baseVaslWeb**, à ajouter.
- `trimName` : retire le dernier caractère (l'orientation). Si le nom ne
  commence pas par un chiffre, retire aussi la queue de chiffres.
  `o3a → O`, `rr10a → RR`, `x20a → X`, `st1a → ST`, `1a → 1`.
- Archives : `boards/bdFiles/overlays/<archive>` (107 archives, de 50 Ko à
  1 Mo). Les images seules existent aussi sous
  `boards/bdFiles/overlays/images/`, mais le fichier `data` (origines) n'est
  que dans l'archive. Le plus simple est de télécharger l'archive avec
  `_zipRead`, puis de la garder en cache comme `_archives`.
- Le nom est mis en minuscules à l'ajout (`ASLBoardSlot`). Les fichiers de
  l'archive sont en minuscules (`ovro3a.gif`). Mieux vaut chercher sans
  tenir compte de la casse.

### 5.2 Orientation

```
si hex1 == hex2                        → 'a'
p1 = centre(hex1), p2 = centre(hex2)   (grille du board, § 5.5)
x1 == x2 : y1 <  y2 → 'd'   sinon 'a'
x1 >  x2 : y1 >  y2 → 'f'   sinon 'e'
x1 <  x2 : y1 >  y2 → 'b'   sinon 'c'
```

Un overlay est **mono-hexagone** si l'archive contient `…a.gif` mais pas
`…d.gif`. Son image est alors toujours l'orientation `a`.

### 5.3 Position (`setBounds`)

Fichier `data` de l'archive (texte) :

```
o1 b2;b1;c1;d1;d2;c3        ← nom puis 6 hexagones d'origine, un par orientation a…f
version 2.1
placeAt e5 e6               ← (facultatif) impose hex1/hex2
```

```
origine = origines(nom)[orientation − 'a']      // 6 champs séparés par « ; »
bounds.xy = centre(hex1) − centre(origine)      // repère du board NON recadré
bounds.wh = taille de l'image
```

Si le fichier `data` ne contient pas de ligne pour ce nom, VASL se rabat sur
`getDefaultOriginList` (table codée en dur, à recopier telle quelle).

L'origine est le centre de l'hexagone (dans la grille du board) qui se trouve
à la même distance de (0,0) que le coin haut-gauche de l'image l'est du
centre de l'hexagone « 1 » de l'overlay.

Deux bricolages de VASL, à reproduire **à l'identique** :

- boards `1b` … `21b` : la lettre de colonne de l'origine est décalée de
  +16. La liste Java contient la chaîne unique `"22b, 23b, 24b, 25b, 26b"` :
  les boards 22b à 26b ne sont **pas** concernés.
- boards `BFPDW1b` … `BFPDW7b` : le numéro de rangée de l'origine est
  augmenté de 10.

### 5.4 « Preserve Levels » (`Overlay.transform`)

Elle n'est active que si `persistelevation` vaut vrai, ce qui n'arrive
jamais à la relecture d'un `.vsav` (§ 2). Le principe : chaque pixel de
l'overlay dont le terrain est de catégorie LOS `OPEN` devient transparent,
sauf pour les overlays `og*`. Si le board, sous ce pixel, n'est pas `OPEN`,
on y peint la couleur `OPEN` la plus proche dans un rayon de 3 px. Il faut
pour cela la table couleur → terrain → catégorie de
`SharedBoardMetadata.xml`. À reporter **après** le reste. Ce n'est utile que
si `carte.html` permet un jour de poser des overlays.

### 5.5 Grille du board : ce qui manque à `carte.html`

`ASLHexGrid.getLocation(hex)` :

```
hex = minuscules ; colonne = lettre − 'a' (+26 par lettre répétée : aa, bb…)
x = round(dx × col) + x0
y = col pair   ? round(dy × (rang − 1))   + y0
  : alternate  ? round(dy × (rang − 1.5)) + y0
  :              round(dy × (rang − 0.5)) + y0
(rang peut être 0 ou négatif ; « -a1 » inverse x)
```

Avec `x0 = A1CenterX` (par défaut 0), `y0 = A1CenterY` (par défaut
`hexHeight / 2`), `dx = hexWidth`, `dy = hexHeight`, `alternate =
altHexGrain`. Pour les boards anciens sans `BoardMetadata.xml`, ces valeurs
sont dans le fichier `data`.

`chargerGeoBoard` doit donc lire en plus `A1CenterX`, `A1CenterY` et
`altHexGrain`. Le même calcul devrait aussi remplacer celui de
`_buildHexTable`, qui suppose `x0 = 0` et `y0 = hh/2` : c'est faux pour les
boards « b » (`A1CenterX = −901`), DW, RB, etc.

---

## 6 bis. « Board XX Special overlays » (menu Terrain SSR)

**Où c'est stocké : dans chaque archive de board, pas dans le module.**

| Fichier de l'archive `bdXX` | Rôle |
|---|---|
| `SSRControls` | ajoute au menu Terrain SSR une `<Option name="Board XX Special overlays">` avec des cases à cocher `<entry name="…" rule="SSO_…" text="…"/>`. Ce fichier est lu par `BoardArchive` puis `ASLBoardPicker.readOptions`, après le `boardData/SSRControls` du module. |
| `BoardMetadata.xml` | `<overlaySSRule name="SSO_…" image="XX_SSO_….gif" x=".." y=".."/>`, ou un `overlaySSRuleSet` pour plusieurs images. |
| `XX_SSO_….gif` | l'image, posée à `x,y` dans le repère du board non recadré. |

Exemple : board 71, scénario AP101.

```xml
<!-- bd71/SSRControls -->
<Option name="Board 71 Special overlays">
  <Checkbox name=""><entry name="AP101: When I Call Roll (complete SSR1; …)" rule="SSO_AP101" text="scenario AP101 overlay"/></Checkbox>
  <Checkbox name=""><entry name="300 - Nor Will Deep Hell Receive Them" rule="SSO_300" text="Bd71 Scen 300 SSO"/></Checkbox>
</Option>
<!-- bd71/BoardMetadata.xml -->
<overlaySSRule name="SSO_AP101" image="71_SSO_AP101.gif" x="0" y="0" />
```

**Ce que fait VASL quand la case est cochée :**

1. La règle (`SSO_AP101`) s'ajoute au champ `SSR` du board dans la
   sauvegarde. Avec « tous les boards », elle s'ajoute à chacun : un board
   qui ne la déclare pas l'ignore.
2. `SSRFilter.loadoverlaySSR` trouve la règle dans les `overlaySSRules` du
   board et crée une `SSROverlay` pour chaque image (§ 4.3).
3. Le rendu est celui de toutes les images SSR (§ 3) : sur les motifs et
   sous les overlays d'hexagones, avant le repeint. Une règle servie par une
   image ne passe plus par l'underlay.
4. Les préfixes `SSO`/`BSO` n'ont de sens que pour la visée
   (`ASLMap.getOverlayTerrainType`, `VASLThread`). Pour le dessin, ce sont
   des règles comme les autres.

Les archives d'overlays ont aussi leurs SSO. Par exemple, `ovr1` déclare
`SSO_ovr1_A45` et `SSO_ovr1_G28` dans son propre `BoardMetadata.xml`. Elles
sont dessinées avec l'overlay (§ 5) quand la sauvegarde les cite. VASL lit
pourtant le `SSRControls` du **module**, et non celui de l'overlay, pour
construire le menu (`ASLBoardPicker`, `OVERLAY_SSR_CONTROL_FILE_NAME`). Ces
cases n'apparaissent donc pas dans son menu.

**Inventaire du dépôt VASL (develop, octobre 2026)** :

- 531 boards au total.
- 156 boards ont un `SSRControls`, dont 143 avec un menu « Special overlays ».
- Ces menus comptent 502 entrées et appellent 608 règles.
- 41 de ces règles n'ont pas d'image dans leur board :
  - soit ce sont des règles partagées (`LightWoods`, `BridgeToFord`,
    `SaP_GrainToLightGrain`) ;
  - soit ce sont des incohérences dans les données de VASL. Par exemple, bd03
    appelle `3_BSO_TR3-1` alors que l'image est déclarée sous `BSO_TR3-1`.
    De même, bd12 (`SSO_12_J114`), bd40 (`40_SSO_U36`), LFT6/LFT8
    (`SSO_FT283/284`), RBv2 (usines « gutted ») et bd80 à 83 et FB
    (`RogueKorea`) ont une image dans l'archive, ou une entrée de menu, mais
    pas d'`overlaySSRule`. D'après le code, VASL ne les dessine pas non plus.
    `carte.html` fait de même.

**Dans `carte.html`** : rien de spécifique n'est nécessaire. `reglesBoard`
et `poserImagesSSR` (étape 3) appliquent ces règles, et `dessinerOverlay`
(étape 4) applique celles des overlays. Le journal affiche maintenant le
libellé du menu du board : « 🖼️ bd71 : SSO_AP101 (scenario AP101 overlay)
— 1 image(s) du board ».

## 6. Overlays déplaçables (pions)

L'extension *Overlays* fournit des overlays sous forme de **pions** : leur
propriété `overlay` est non nulle (`ASLOverlayCounter`,
`ASLOverlayBasicPiece`). VASL ne leur applique pas les SSR (le code
correspondant de `ASLBoard.setTerrain` est commenté). Ils restent toujours
visibles dans le mode d'affichage « carte seule » (`ASLMap`, `ShowMapOnly`).
Dans `carte.html`, ils passent déjà par le rendu des pions. Il reste
seulement à les placer **sous** les autres pions et à les garder visibles
quand on masque les pions.

---

## 7. Plan d'intégration proposé

**Étape 1 — Composition et repeint fidèles** (aucune donnée nouvelle) — **faite** : `composerBoard`, `tableSSR`, `repeindre`

1. Nouvelle fonction `async composerBoard(b)` qui renvoie un canvas de la
   taille visible et suit le pipeline du § 3. `_renderBoards` ne fait plus
   ensuite que le retournement et le zoom vers le canvas affiché.
2. Remplacer `appliquerSSR` par la table unique du § 4.1, appliquée **après**
   la composition, et ordonnée selon l'ordre de `LOS_SSR`, qui suit celui du
   fichier.
3. Mettre à jour le journal : une règle `m` n'est plus « sans couleur ».

**Étape 2 — Motifs (underlays)** — **faite** : `chargerMotif`, `poserMotifs` ; les règles `m` de `LOS_SSR` remises dans l’ordre du fichier (`WallToCactus` venait de l’exemple commenté)

4. Charger et mettre en cache `boardData/<motif>.gif`.
5. Appliquer le motif comme au § 4.4, sur l'image de base non repeinte, avant
   les overlays SSR et d'hexagones. Cela rend utilisables les 67 règles
   aujourd'hui sans effet (`WoodsToBrush`, `GrainToVineyard`,
   `SwampToSwampPattern`, `WallsOnly`…).

**Étape 3 — Métadonnées du board** — **faite** : `_lireMetaSSR`, `metaPartagee`, `reglesBoard`, `poserImagesSSR`, `centreHex`, `hexrow` ; `_buildHexTable` suit la grille VASL (x0/y0 tronqués, demi-hexagones de bord, boards « b » à partir de la colonne Q)

6. Lire dans `BoardMetadata.xml` : `A1CenterX`, `A1CenterY`, `altHexGrain`,
   `<colors>`, `<colorSSRules>`, `<overlaySSRules>` (avec `overlaySSRuleSet`
   et les `underlaySSRule` propres au board).
7. Poser les images SSR du board (§ 4.3), puis revoir `SSR_LOS_SEULES` :
   pour chaque board, signaler une règle comme « sans effet graphique »
   seulement si le board ne fournit pas d'image pour elle.
8. Reconstruire la table des couleurs à partir des noms, pour tenir compte
   des surcharges du board.

**Étape 4 — Overlays d'hexagones** — **faite** : `_parseOverlays`, `chargerArchiveOverlay`, `preparerOverlay`, `dessinerOverlay` (images SSR et motifs propres à l'archive de l'overlay compris)

9. `_parseBoardSegment` : ajouter `overlays: [{nom, hex1, hex2}]` (reprendre
   `_parseOverlays`).
10. `_archiveOverlay(nom)`, construite comme `_archive`, avec `equivalence`
    et `trimName`. Lecture de `data` (origines, `placeAt`). Table
    `getDefaultOriginList` en secours.
11. `centreHex(b, nom)` (§ 5.5), puis calcul de l'orientation, du mono-hexagone
    et des bounds (§ 5.2-5.3), sans oublier les deux bricolages.
12. Dessin dans l'ordre de la sauvegarde, au-dessus des SSR, **avant** le
    repeint. Si l'archive de l'overlay a ses propres `overlaySSRules`, ses
    images SSR sont dessinées décalées de `bounds.xy`.
13. Tolérer les échecs (overlay introuvable, hexagone hors grille) : le
    journal le signale et le board s'affiche sans cet overlay, comme pour les
    boards.

**Étape 5 (facultative)** — « Preserve Levels » (§ 5.4) et ajout ou retrait
d'overlays depuis l'interface. Pour l'export, écrire
`OVR\tnom\thex1\thex2\t` entre `VER` et `SSR`.

### Points de vigilance

- **Export** : `carte.html` réécrit le segment `bd` d'origine, donc il n'y a
  rien à changer tant que les overlays restent en lecture seule.
- **Taille des canvas** : composer au format natif (1800×645 pour un
  geomorphique), puis réduire à l'affichage avec `_sizeCanvasSafely`, comme
  aujourd'hui.
- **`getImageData`** : les images viennent d'URL de Blob, donc il n'y a pas
  de canvas « contaminé » (*tainted*). Garder le `try/catch` existant.
- **Cache** : une archive d'overlay sert à plusieurs boards. La même règle
  `colorSSR` donne des résultats différents selon les couleurs du board :
  mettre en cache la table par **board**, pas par règle.
- **Coordonnées des pions** : elles ne bougent pas. Un overlay ne change pas
  la taille du board, et les rectangles hors du canvas visible sont
  découpés comme dans VASL (`visible.intersection`).
