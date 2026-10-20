# Ligne de vue (LOS) dans `carte.html` — portage du moteur de VASL

Sources lues (branche `develop` de `vasl-developers/vasl`) :
`VASL.LOS.Map` (`Map`, `Hex`, `Location`, `Terrain`, `LOSResult`, `Bridge`),
`VASLThread`, `ASLMap.buildVASLMap`, `BoardArchive.addLOSDatatoVASLMap`,
`VASLBoard.applyColorSSRules…`, `LOSDataEditor`, `SharedBoardMetadata`.

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
| `VASLThread` : fil, couleurs, étiquettes, niveaux ↑/↓, Ctrl, rapport, `VASLLOSCommand` | bouton **LOS**, F10, `commencerFil`, `dessinerFil`, `filDistant` |

## Validation

Le moteur Java de VASL, compilé à part (dépendances VASSAL neutralisées,
grille construite comme `ASLMap`), sert d'oracle : sur 25 boards
(01 à 52), 3 000 lignes de vue chacun — centres, côtés contournés, points
auxiliaires, étages, toits, caves — les résultats (portée, blocage, point
de blocage, raison, gênes) et l'état de chaque hexagone sont identiques.
L'assemblage (boards côte à côte et superposés, retournés, recadrés) donne
les mêmes lignes de vue que le board seul.

## Différences et limites

- **Pions** : fumée, véhicules, OBA, terrains de pion et éclairage de nuit
  ne sont pas lus (`VASLGameInterface` vide, jamais de nuit).
- **Overlays d'hexagones** : leur terrain n'est pas lu
  (`ASLMap.adjustLOSForOverlays` non porté). Comme VASL pour un overlay qu'il
  ne sait pas lire, un fil qui en traverse un affiche « LOS Check Disabled -
  Overlay nearby » et l'encadre. Idem pour les overlays déplaçables.
- **Boards sans `LOSData`** : fil sans vérification, portée seule.
- Les SSR s'appliquent au seul board qui les porte (VASL les applique à toute
  la carte à chaque board).
- Après ↑/↓, bouger la souris dans le même lieu garde le niveau choisi
  (VASL le remet à zéro).
- « Verbose LOS mode » est actif par défaut (clic droit sur le bouton).
