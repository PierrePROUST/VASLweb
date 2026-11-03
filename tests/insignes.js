// Images incluses d'un pion SVG de VASL : la silhouette (« svg/….png ») et
// l'insigne de classe en haut à droite (« ./svg/class_ss.svg » : runes
// SS). Toutes doivent être intégrées à l'image chargée ; un chemin
// relatif laissé dans le blob ne s'affiche pas.
const nav = require('./navigateur.js');
(async () => {
  const b = await nav.lancer();
  const pg = await (await b.newContext()).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await pg.goto('file://' + nav.fichier(process.argv[2] || 'VASLweb.html'));
  const r = await pg.evaluate(async () => {
    const r = {};
    for(const im of ['ge/ge468Ss.svg', 'ge/ge248Hs.svg', 'ru/ru628Sae.svg']){
      const u = await chargerImage(im);
      const svg = u ? await (await fetch(u)).text() : '';
      r[im] = u ? `${(svg.match(/<image\b/g) || []).length} image(s) incluse(s), `
        + `${(svg.match(/href="data:/g) || []).length / 2} intégrée(s), `
        + `${(svg.match(/href="(\.\/)?svg\//g) || []).length} chemin(s) relatif(s)` : 'introuvable';
    }
    return r;
  });
  console.log(JSON.stringify(r), errs.length ? errs : 'sans erreur');
  await b.close();
})();
