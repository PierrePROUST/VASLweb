// Téléphone : la pile se ferme d'un appui à côté (au zoom « Ajuster » aussi)
// ou par la croix rouge cerclée de l'éventail et de la barre de pile.
const {ouvrir} = require('./commun.js');
(async () => {
  const {b, pg, errs, centre, touche} = await ouvrir(process.argv[2], {hasTouch: true, isMobile: true, viewport: {width: 360, height: 740}, profil: 'tactile'});
  const tap = async (x, y) => { await touche('touchStart', [[x, y, 1]]); await touche('touchEnd', []); await pg.waitForTimeout(250); };
  const tapSel = async s => { const r = await pg.evaluate(s => { const e = document.querySelector(s); if(!e) return null; const q = e.getBoundingClientRect(); return [q.left + q.width/2, q.top + q.height/2]; }, s); if(r) await tap(r[0], r[1]); return !!r; };
  const etat = () => pg.evaluate(() => [!!document.getElementById('eventail'), !!document.getElementById('barrePile'), _sel.size]);
  const out = {};
  let [x, y] = await centre('T9');
  await tap(x, y); out.ouvert = await etat();
  await pg.screenshot({path: 'fermer_eventail.png'});
  out.croixEventail = await tapSel('#eventail .croixFermer'); out.apresCroix = await etat();
  await tap(x, y); await tapSel('#eventail .croixFermer');
  // pile d'un seul pion : la barre de pile, avec sa croix
  await pg.evaluate(() => appuiSurPile('1300,700')); await pg.waitForTimeout(200); out.barre = await etat();
  await pg.screenshot({path: 'fermer_barre.png'});
  out.boutonsBarre = await pg.evaluate(() => [...document.querySelectorAll('#barrePile button')].map(b => b.textContent));
  await tapSel('#barrePile .croixFermer'); out.apresCroixBarre = await etat();
  // au zoom « Ajuster », un appui à 20 px à côté de la pile
  await pg.evaluate(() => zoomFit()); await pg.waitForTimeout(300);
  [x, y] = await centre('T9'); await tap(x, y);
  await tap(x - 20, y - 20); out.aCote = await etat();
  console.log(JSON.stringify(out), errs);
  await b.close();
})();
