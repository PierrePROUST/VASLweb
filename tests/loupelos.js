// LOS au doigt : la loupe suit le doigt, montre le fil et le lieu visé, et
// disparaît au relâché (le fil reste ancré).
const {ouvrir} = require('./commun.js');
(async () => {
  const [w, h] = [+(process.argv[3] || 800), +(process.argv[4] || 900)];
  const {b, pg, errs, ecran, touche} = await ouvrir(process.argv[2], {hasTouch: true, isMobile: true, viewport: {width: w, height: h}, profil: w < 600 ? 'mobile' : 'tablette'});
  await pg.evaluate(() => armerFil('L'));
  const [x, y] = await ecran(900, 700), [tx, ty] = await ecran(1150, 820);
  await touche('touchStart', [[x, y, 1]]);
  await pg.waitForTimeout(800);
  for(let i = 1; i <= 8; i++){ await touche('touchMove', [[x + (tx-x)*i/8, y + (ty-y)*i/8, 1]]); await pg.waitForTimeout(30); }
  await pg.waitForTimeout(150);
  const r = await pg.evaluate(() => { const l = document.getElementById('loupe'); const c = l && l.querySelector('canvas').getBoundingClientRect(); return l && {label: l.textContent, diametre: Math.round(c.width), dansEcran: c.left >= 0 && c.right <= innerWidth && c.top >= 0}; });
  await pg.screenshot({path: `loupelos_${w}.png`});
  await touche('touchEnd', []);
  await pg.waitForTimeout(100);
  r.apres = await pg.evaluate(() => ({loupe: !!document.getElementById('loupe'), ancre: !!(_fil && _fil.ancre)}));
  console.log(JSON.stringify(r), errs);
  await b.close();
})();
