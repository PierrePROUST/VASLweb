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
| Overlays d'hexagones (`ASLMap.adjustLOSForOverlays`) : terrain et niveau tirés des couleurs de l'overlay, puis terrain inhérent étendu à l'hexagone, côtés et niveau du point central | `LosOverlay` (`passeGrilles`, `passeHexagones`), `lireCouleursLOS` |
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

## Différences et limites

- **Pions** : fumée, véhicules, OBA, terrains de pion et éclairage de nuit
  ne sont pas lus (`VASLGameInterface` vide, jamais de nuit).
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
