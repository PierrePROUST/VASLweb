// Loupe de dépôt : capture pendant un glissé au doigt, rayon montré.
const {ouvrir} = require('./commun.js');
(async () => {
  const [w, h] = [+(process.argv[3] || 800), +(process.argv[4] || 900)];
  const {b, pg, errs, centre, ecran, touche} = await ouvrir(process.argv[2], {hasTouch: true, isMobile: true, viewport: {width: w, height: h}, profil: w < 600 ? 'mobile' : 'tablette'});
  let [x, y] = await centre('T9'); const [tx, ty] = await ecran(960, 820);
  await touche('touchStart', [[x, y, 1]]);
  for(let i = 1; i <= 8; i++) await touche('touchMove', [[x + (tx-x)*i/8, y + (ty-y)*i/8, 1]]);
  await pg.waitForTimeout(150);
  const r = await pg.evaluate(() => { const l = document.getElementById('loupe'); const c = l && l.querySelector('canvas').getBoundingClientRect(); return l && {label: l.textContent, diametre: Math.round(c.width), dansEcran: c.left >= 0 && c.right <= innerWidth && c.top >= 0}; });
  await pg.screenshot({path: `loupe_${w}.png`});
  await touche('touchEnd', []);
  console.log(JSON.stringify(r), errs);
  await b.close();
})();
