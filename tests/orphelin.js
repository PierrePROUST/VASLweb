// Un seul éventail à la fois, quel que soit le geste (double appui, verrou
// des pions), et la croix rouge le ferme.
const {ouvrir} = require('./commun.js');
(async () => {
  const {b, pg, errs, centre} = await ouvrir(process.argv[2], {hasTouch: true, isMobile: true, viewport: {width: 360, height: 740}, profil: 'mobile'});
  const n = () => pg.evaluate(() => [document.querySelectorAll('.eventail').length, !!_eventail]);
  const [x, y] = await centre('T9');
  const essais = {};
  await pg.touchscreen.tap(x, y); await pg.waitForTimeout(80); await pg.touchscreen.tap(x, y); await pg.waitForTimeout(300);
  essais.doubleAppui = await n();
  await pg.touchscreen.tap(x, y); await pg.waitForTimeout(300); essais.appui = await n();
  await pg.evaluate(() => { const m = document.querySelector('#barrePile .miniPile'); if(m) m.click(); }); essais.mini = await n();
  await pg.evaluate(() => montrerOnglet('pile')); await pg.waitForTimeout(200); essais.vuePile = await n();
  await pg.evaluate(() => vueMobile('carte')); await pg.waitForTimeout(200); essais.vueCarte = await n();
  // verrou des pions
  await pg.evaluate(() => { basculerVerrou(); fermerPile(); });
  await pg.touchscreen.tap(x, y); await pg.waitForTimeout(80); await pg.touchscreen.tap(x, y); await pg.waitForTimeout(300);
  essais.verrouDouble = await n();
  // croix
  const c = await pg.evaluate(() => { const e = document.querySelector('.eventail .croixFermer'); const r = e.getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; });
  await pg.touchscreen.tap(c[0], c[1]); await pg.waitForTimeout(300); essais.apresCroix = await n();
  console.log(JSON.stringify(essais), errs);
  await b.close();
})();
