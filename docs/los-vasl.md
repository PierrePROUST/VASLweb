# Ligne de vue (LOS) dans `carte.html` — portage du moteur de VASL

Sources lues (branche `develop` de `vasl-developers/vasl`) :
`VASL.LOS.Map` (`Map`, `Hex`, `Location`, `Terrain`, `LOSResult`, `Bridge`),
`VASLThread`, `ASLMap.buildVASLMap`, `BoardArchive.addLOSDatatoVASLMap`,
`VASLBoard.applyColorSSRules…`, `LOSDataEditor`, `SharedBoardMetadata`,
`VASLGameInterface`, `VASL.LOS.counters`, `dist/CounterMetadata.xml`.

## Ce qui est porté

| VASL | `carte.html` |
|---|---|
| `Map.LOS()` et toutes ses règles (dépression, bâtiments, toits, caves, haies/murs, bocage, vergers partiels, remblais RB, murs de rangées et d'usine, hexagones aveugles, falaises, buttes, demi-niveaux, terrains partagés, ponts, gênes) | `LosMap`, `LosStatus` — méthode par méthode, noms Java conservés |
| `Hex`, `Location`, `Terrain`, `LOSResult`, `Bridge` | `LosHex`, `LosLocation`, `LosTerrain`, `LosResult`, `LosBridge` |
| Fichier `LOSData` du board (flux `ObjectOutputStream` gzip) | `lireLOSData` |
| `terrainTypes` et `LOSSSRules` de `SharedBoardMetadata.xml` | `lireTerrainsLOS` |
| Assemblage multi-boards, recadrage, retournement, demi-hexagones de raccord | `construireCarteLOS` |
| SSR de terrain (terrainMap, elevationMap, …, customCode) | `_ssrGrilles`, `_ssrHexagones` |
| Pentes, remblais RB, vergers partiels (`BoardMetadata.xml`) | `_cotesSpeciaux` |
| Overlays d'hexagones (`ASLMap.adjustLOSForOverlays`) : terrain et niveau tirés des couleurs de l'overlay, puis terrain inhérent étendu à l'hexagone, côtés et niveau du point central | `LosOverlay` (`passeGrilles`, `passeHexagones`), `lireCouleursLOS` |
| Pions (`VASLGameInterface.updatePieces`, `CounterMetadata.xml`) : fumée et incendies, fumée d'OBA (FFE, barrages, bombardements navals), OBA, épaves et véhicules (pièces à propriété `Hindrance` non déplacées), terrains de pion (décombres, vergers, neige… avec niveau), pions de côté (haies, murs, bocage, congères, brèches, barres de rangées), retranchements, ponts et crêtes (lieux ajoutés à l'hexagone) | `LosPions`, `lireMetaPions` ; règles `checkSameHexSmokeRule`, `checkHexSmokeRule`, `checkVehicleHindranceRule`, `checkOBAHindranceRule`, pions de côté dans `applyLOSRules`, `isIgnorableHexsideTerrain`, `checkRowhouseFactoryWallAndBreach` |
| `VASLThread` : fil, couleurs, étiquettes, niveaux ↑/↓, Ctrl, rapport, `VASLLOSCommand` | bouton **LOS**, F10, `commencerFil`, `dessinerFil`, `filDistant` |

## Validation

Le moteur Java de VASL, compilé à part (dépendances VASSAL neutralisées,
grille construite comme `ASLMap`), sert d'oracle : sur 25 boards
(01 à 52), 3 000 lignes de vue chacun — centres, côtés contournés, points
auxiliaires, étages, toits, caves — les résultats (portée, blocage, point
de blocage, raison, gênes) et l'état de chaque hexagone sont identiques.
L'assemblage (boards côte à côte et superposés, retournés, recadrés) donne
les mêmes lignes de vue que le board seul.

Pour les overlays, le code d'`ASLMap` (lignes 916 à 2063) est compilé tel
quel dans l'oracle, avec les mêmes pixels d'overlay que la page : sur
6 boards et 25 overlays (o, wd, g, b, x, m, p, rp, sh, h, st, d, s, sd, w,
hd, ow, rr, sr, wr, be, oc, v, ef, 1), 2 000 lignes de vue chacun, grilles,
hexagones et résultats sont identiques.

Pour les pions, le vrai `VASLGameInterface` est compilé dans l'oracle
(pièces VASSAL remplacées par une liste nom, position, `Hindrance`,
déplacé, `overlay`) : sur 25 boards, avec de 12 à 80 pions tirés au hasard
dans `CounterMetadata.xml` (et des véhicules, piles, noms à étiquettes),
1 500 à 2 000 lignes de vue chacun, les résultats sont identiques ; les
pions en changent de 6 à 76 %.

## Différences et limites

- **Nuit** : jamais de nuit (`checkNVRRule`, éclairage et lueurs de tir
  non lus).
- **Pions** : comme VASL, l'instantané est pris au lancement du fil. Les
  pions de l'adversaire dissimulés (« ? ») ou en HIP ne comptent pas.
  - VASL lit la couleur du pixel de l'image d'un pion overlay
    (`getTerrainFromOverlayCounterImage`) ; ici on prend le terrain du pion
    sur son côté (haie, mur, brèche…) ou dans l'hexagone (décombres à
    étages), et le terrain de la carte ailleurs. Comme VASL, sans pièce
    dans l'hexagone traversé, le terrain est dégagé.
  - VASL partage un même objet entre tous les pions de côté de même nom
    (deux haies déplaçables : la dernière posée impose son côté aux deux) ;
    ici chaque pion garde le sien.
  - VASL garde les lieux ajoutés par un retranchement, un pont ou une
    crête retirés jusqu'au rechargement de la carte ; ici ils disparaissent
    avec le pion.
  - Une fumée de bombardement naval trop près du bord fait échouer VASL
    (NPE) et arrête la lecture des pions ; ici seul ce pion est ignoré.
  - L'ordre des fumées d'un même hexagone (`HashSet` en Java) n'est pas
    celui de VASL : seul l'incendie d'épave (« Blaze » sur un véhicule) en
    dépend.
- **Overlays** : comme dans VASL, un overlay hors de la liste que
  `VASLThread` sait lire, ou un overlay déplaçable (pion « overlay »), arrête
  la vérification : « LOS Check Disabled - Overlay nearby », overlay encadré.
  L'option « Preserve Levels » (`persistelevation`) n'est pas reprise : VASL
  ne l'enregistre pas dans la sauvegarde.
- Sur un board retourné ou recadré, la position des overlays est la vraie ;
  VASL, lui, ne la corrige pas toujours (cas laissés en `ToDo`).
- **Boards sans `LOSData`** : fil sans vérification, portée seule.
- Les SSR s'appliquent au seul board qui les porte (VASL les applique à toute
  la carte à chaque board).
- Après ↑/↓, bouger la souris dans le même lieu garde le niveau choisi
  (VASL le remet à zéro).
- « Verbose LOS mode » est actif par défaut (clic droit sur le bouton).
