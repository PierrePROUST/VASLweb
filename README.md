# VASLweb

Carte VASL dans le navigateur : ouvrir, jouer et relire des parties
`.vsav` / `.vlog`. Application installable (PWA), servie par GitHub Pages :
ouvrir `VASLweb.html` (ou la racine du site), puis « Installer » /
« Ajouter à l'écran d'accueil ».

**Ce dépôt ne sert qu'à la diffusion.** Le code, les tests, les analyses
de VASL et les outils sont dans le dépôt de développement
[ASLweb](https://github.com/PierrePROUST/ASLweb) (branche `Vaslhtml`).
Ne pas modifier les fichiers ici : ils sont remplacés à chaque publication
par `sh outils/publier-vaslweb.sh` lancé depuis ASLweb.

| Fichier | Rôle |
|---|---|
| `VASLweb.html` | L'application entière (une seule page) |
| `pwa.js` | Manifeste, service worker, ouverture des `.vsav` / `.vlog` (inactif en `file://`) |
| `sw.js` | Service worker : application réseau d'abord, boards VASL gardés pour le hors-ligne |
| `manifest.webmanifest`, `icons/` | Installation |
| `index.html` | Renvoie vers `VASLweb.html` |
