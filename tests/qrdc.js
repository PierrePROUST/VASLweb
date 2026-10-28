// Tables QRDC sous la zone de la carte : position (trois petits pions sous
// les boards), onglets du module, pions refusés, rien dans le .vsav.
const {ouvrir} = require('./commun.js');
(async () => {
  const {b, pg, errs, cmds} = await ouvrir(process.argv[2]);
  await pg.waitForSelector('#tablesQRDC img[src]');
  await pg.waitForTimeout(800);
  const r = await pg.evaluate(() => {
    const t = rectTables(), e = _empriseBoards;
    const onglets = [...document.querySelector('#tablesQRDC .qOnglets').querySelectorAll('button')].map(b => b.textContent);
    return {ecart: (t.y - (e.y + e.h)) / SC, gauche: t.x === e.x, onglets,
            carteContient: _mapH >= t.y + t.h, vsav: _source.join('').includes('QRDC')};
  });
  console.log('Écart sous les boards (px natifs) :', r.ecart, '— attendu', 3 * 48);
  console.log('Aligné à gauche des boards :', r.gauche, '; carte agrandie :', r.carteContient);
  console.log('Onglets :', r.onglets.join(' | '));
  // Onglet CC, puis Vehicle TK > HEAT.
  await pg.evaluate(() => {
    const t = document.getElementById('tablesQRDC');
    t.scrollIntoView();
  });
  await pg.click('#tablesQRDC .qOnglets button:has-text("CC")');
  await pg.waitForTimeout(500);
  const imgsCC = await pg.$$eval('#tablesQRDC img', l => l.map(i => i.alt));
  console.log('Onglet CC :', imgsCC.join(', '));
  await pg.click('#tablesQRDC .qOnglets button:has-text("Vehicle TK")');
  await pg.click('#tablesQRDC .qOnglets button:has-text("HEAT")');
  await pg.waitForTimeout(500);
  console.log('Vehicle TK > HEAT :', (await pg.$$eval('#tablesQRDC img', l => l.map(i => i.alt))).join(', '));
  await pg.click('#tablesQRDC .qOnglets button:has-text("IFT")');
  await pg.waitForTimeout(500);
  // Un pion déplacé sur les tables : refusé ; à côté, accepté.
  const avant = (await cmds()).length;
  const res = await pg.evaluate(() => {
    const t = rectTables(), p = parUid('T4');
    deplacer([p], (t.x + 100) / SC, (t.y + 100) / SC);
    const refuse = p.x === 1100 && p.y === 760;
    const nb = vivants().length;
    poserDepuisPalette(_bdd.pions.find(s => s.n === 'DM'), (t.x + 200) / SC, (t.y + 200) / SC);
    return {refuse, poseRefusee: vivants().length === nb};
  });
  console.log('Déplacement sur les tables refusé :', res.refuse, '; pose refusée :', res.poseRefusee,
              '; aucune commande :', (await cmds()).length === avant);
  await pg.screenshot({path: __dirname + '/sortie/qrdc.png'});
  // Masquer puis remontrer.
  const m = await pg.evaluate(() => { basculerTables(); const a = !document.getElementById('tablesQRDC'); const h = _mapH;
    basculerTables(); return {a, h}; });
  console.log('Masquées par le menu :', m.a, '; hauteur sans tables :', m.h);
  console.log(errs.length ? errs.join('\n') : 'Aucune erreur');
  await b.close();
})();
