// Tables QRDC. En tactile, sous la zone de la carte : trois petits pions
// sous les boards, onglets du module, pions refusés, rien dans le .vsav.
// Au PC, dans une fenêtre flottante, et rien sur la carte.
const {ouvrir} = require('./commun.js');
(async () => {
  let {b, pg, errs, cmds, touche} = await ouvrir(process.argv[2], {profil: 'tactile', hasTouch: true, isMobile: true,
                                                                   viewport: {width: 1024, height: 768}});
  const tap = async sel => {
    const el = await pg.$(sel);
    await el.evaluate(e => e.scrollIntoView({block: 'center', inline: 'nearest'}));
    const r = await el.boundingBox();
    await touche('touchStart', [[r.x + r.width/2, r.y + r.height/2, 1]]); await touche('touchEnd', []);
    await pg.waitForTimeout(500);
  };
  const images = () => pg.$$eval('#tablesQRDC img', l => l.map(i => i.alt).join(', '));
  await pg.waitForSelector('#tablesQRDC img[src]');
  await pg.waitForTimeout(800);
  const r = await pg.evaluate(() => {
    const t = rectTables(), e = _empriseBoards;
    const onglets = [...document.querySelector('#tablesQRDC .qOnglets').querySelectorAll('button')].map(b => b.textContent);
    return {ecart: (t.y - (e.y + e.h)) / SC, gauche: t.x === e.x, onglets,
            carteContient: _mapH >= t.y + t.h, vsav: _source.join('').includes('QRDC')};
  });
  console.log('Tactile — écart sous les boards (px natifs) :', r.ecart, '— attendu', 3 * 48);
  console.log('Aligné à gauche des boards :', r.gauche, '; carte agrandie :', r.carteContient);
  console.log('Onglets :', r.onglets.join(' | '));
  await tap('#tablesQRDC .qOnglets button:has-text("CC")');
  console.log('Onglet CC, au doigt :', await images());
  await tap('#tablesQRDC .qOnglets button:has-text("Vehicle TK")');
  await tap('#tablesQRDC .qOnglets button:has-text("HEAT")');
  console.log('Vehicle TK > HEAT :', await images());
  await tap('#tablesQRDC .qOnglets button:has-text("IFT")');
  // Un pion déplacé sur les tables : refusé ; une pose aussi.
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
  await pg.screenshot({path: __dirname + '/sortie/qrdc_tactile.png'});
  const m = await pg.evaluate(() => { basculerTables(); const a = !document.getElementById('tablesQRDC');
    basculerTables(); return a; });
  console.log('Masquées par la commande :', m);
  // Passage au PC : la couche quitte la carte ; la commande ouvre la fenêtre.
  const pc = await pg.evaluate(async () => {
    choisirProfil('pc');
    const surCarte = !!document.getElementById('tablesQRDC');
    basculerTables();
    await new Promise(r => setTimeout(r, 800));
    const f = document.getElementById('fenQRDC');
    return {surCarte, fenetre: !!f, onglets: f && f.querySelectorAll('.qOnglets button').length};
  });
  console.log('PC — tables sur la carte :', pc.surCarte, '; fenêtre :', pc.fenetre, '; boutons d\'onglets :', pc.onglets);
  await pg.click('#fenQRDC .qOnglets button:has-text("Ordnance TH")');
  await pg.waitForTimeout(500);
  console.log('Fenêtre, onglet Ordnance TH :', await pg.$$eval('#fenQRDC img', l => l.map(i => i.alt).join(', ')));
  const t = await (await pg.$('#fenQRDC .qTitre')).boundingBox();
  await pg.mouse.move(t.x + 40, t.y + t.height/2); await pg.mouse.down();
  await pg.mouse.move(t.x + 80, t.y + 140, {steps: 5}); await pg.mouse.up();
  const t2 = await (await pg.$('#fenQRDC .qTitre')).boundingBox();
  console.log('Fenêtre déplacée par son titre :', Math.round(t2.x - t.x), Math.round(t2.y - t.y));
  await pg.screenshot({path: __dirname + '/sortie/qrdc_pc.png'});
  await pg.click('#fenQRDC .qFermer');
  console.log('Fermée :', !(await pg.$('#fenQRDC')));
  console.log(errs.length ? errs.join('\n') : 'Aucune erreur');
  await b.close();
})();
