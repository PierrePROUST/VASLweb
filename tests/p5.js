const {ouvrir} = require('./commun.js');
(async () => {
  const {b, pg, errs, centre, touche, ecran, cmds} = await ouvrir(process.argv[2], {hasTouch: true, isMobile: true, viewport: {width: 800, height: 900}, profil: 'tactile'});
  const out = {};
  // loupe pendant un glissé au doigt
  let [x, y] = await centre('T9'); const [tx, ty] = await ecran(1080, 820);
  await touche('touchStart', [[x, y, 1]]);
  for(let i = 1; i <= 8; i++) await touche('touchMove', [[x + (tx-x)*i/8, y + (ty-y)*i/8, 1]]);
  await pg.waitForTimeout(100);
  out.loupe = await pg.evaluate(() => { const l = document.getElementById('loupe'); return l && l.textContent; });
  await pg.screenshot({path: 'loupe.png'});
  await touche('touchEnd', []); await pg.waitForTimeout(100);
  out.loupeApres = await pg.evaluate(() => !!document.getElementById('loupe'));
  out.depose = (await cmds()).slice(-1);
  // double appui dans le vide
  const z0 = await pg.evaluate(() => zoom);
  const [vx, vy] = await ecran(1150, 600);
  for(let k = 0; k < 2; k++){ await touche('touchStart', [[vx, vy, 1]]); await touche('touchEnd', []); await pg.waitForTimeout(80); }
  out.zoom = [z0, await pg.evaluate(() => zoom)];
  console.log(JSON.stringify(out), errs);
  await b.close();
})();
