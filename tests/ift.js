// Lancer IFT au doigt : le bouton IFT de la colonne ouvre la feuille à deux
// roues (4 FP et 0 par défaut) ; un DR forcé est croisé avec la table A7,
// avec Cowering sur un double (une colonne, deux si Green, aucune avec un
// Leader ; NE sous la colonne 1 FP) et symboles de case (DR original,
// mine A-T sur le DR final). Au PC, IFT reste un simple jet.
const {ouvrir} = require('./commun.js');
(async () => {
  const {b, pg, errs, touche} = await ouvrir(process.argv[2], {hasTouch: true, isMobile: true, viewport: {width: 360, height: 740}, profil: 'tactile'});
  const tap = async s => { const r = await pg.evaluate(s => { const e = document.querySelector(s); e.scrollIntoView({block: 'nearest'}); const q = e.getBoundingClientRect(); return [q.left + q.width/2, q.top + q.height/2]; }, s); await pg.waitForTimeout(150); await touche('touchStart', [[r[0], r[1], 1]]); await touche('touchEnd', []); await pg.waitForTimeout(250); };
  await tap('.navGauche :not([aria-hidden])[data-action="DR_IFT"]');
  const out = {};
  out.defaut = await pg.evaluate(() => [...document.querySelectorAll('.feuille .iftItem.on')].map(e => e.textContent));
  // Dés forcés : c (coloré) puis b (blanc).
  const jet = (c, bl, fp, mod, leader = false, green = false) => pg.evaluate(([c, bl, fp, mod, leader, green]) => {
    const q = [c, bl], g0 = crypto.getRandomValues;
    crypto.getRandomValues = t => { t[0] = q.shift() - 1; return t; };
    try {
      const col = IFT_COLS.findIndex(x => x.fp === fp);
      const r = lancerIFT(col, mod, leader, green);
      return [r.ligne, ...r.sp.map(x => x.s + ' ' + x.t)].join(' | ');
    } finally { crypto.getRandomValues = g0; }
  }, [c, bl, fp, mod, leader, green]);
  out.jets = [
    await jet(5, 2, '4', 0),            // 7 en 4 FP : PTC
    await jet(6, 4, '2', 2),            // 12 : NE
    await jet(3, 1, '12', -2),          // 2, original 4 : 1KIA ; aucun symbole (case du 4 : 3MC)
    await jet(3, 3, '4', 0),            // double : 2 FP, 6 > PTC
    await jet(3, 3, '4', 0, false, true),   // Green : 1 FP, 6 > NE
    await jet(3, 3, '4', 0, true, true),    // Leader : 4 FP, 6 > NMC
    await jet(1, 1, '2', 0, false, true),   // sous 1 FP : NE
    await jet(6, 5, '36+', 0)           // 11 : 2MC ‡ mine A-T
  ];
  // Roues : 12 FP, +2, Valider
  await pg.evaluate(() => { const [a, m] = document.querySelectorAll('.feuille .iftRoue'); a.scrollTop = 5 * 44; m.scrollTop = 8 * 44; });
  await pg.waitForTimeout(200);
  await tap('.feuille .valider');
  await pg.waitForTimeout(400);
  out.feuille = await pg.evaluate(() => [document.querySelector('.feuille .iftRes').textContent, document.querySelector('.feuille .valider').textContent]);
  out.chat = await pg.evaluate(() => document.getElementById('journal').lastElementChild.textContent);
  // Roue encore lancée (24/120 → 12/70) quand on valide : le jet attend
  // qu'elle s'arrête et lit 12/70, la ligne sous le bandeau.
  await pg.evaluate(() => { const a = document.querySelector('.feuille .iftRoue'); a.scrollTop = 8 * 44; });
  await pg.waitForTimeout(300);
  await pg.evaluate(() => { const a = document.querySelector('.feuille .iftRoue'); a.scrollTo({top: 5 * 44, behavior: 'smooth'}); document.querySelector('.feuille .valider').click(); });
  await pg.waitForTimeout(1500);
  out.elan = await pg.evaluate(() => [document.querySelector('.feuille .iftItem.on').textContent, document.querySelector('.feuille .iftRes').firstChild.textContent]);
  await pg.screenshot({path: 'ift_mobile.png'});
  await b.close();
  const pc = await ouvrir(process.argv[2]);
  await pc.pg.click('.barreDes button[data-action="DR_IFT"]');
  out.pc = await pc.pg.evaluate(() => [!!document.querySelector('.feuille'), document.getElementById('journal').lastElementChild.className]);
  console.log(JSON.stringify(out, null, 1), errs, pc.errs);
  await pc.b.close();
})();
