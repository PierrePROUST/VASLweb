// LOS à deux doigts : le premier tient la source, le deuxième vise la cible
// avec la loupe ; la cible est posée quand il se lève, le premier ne la
// bouge plus, et la carte ne zoome pas.
const {ouvrir} = require('./commun.js');
(async () => {
  const [w, h] = [+(process.argv[3] || 800), +(process.argv[4] || 900)];
  const {b, pg, errs, ecran, touche} = await ouvrir(process.argv[2], {hasTouch: true, isMobile: true, viewport: {width: w, height: h}, profil: w < 600 ? 'mobile' : 'tablette'});
  await pg.evaluate(() => armerFil('L'));
  const z0 = await pg.evaluate(() => zoom);
  const [x, y] = await ecran(900, 700), [x2, y2] = await ecran(1000, 900), [tx, ty] = await ecran(1150, 820);
  await touche('touchStart', [[x, y, 1]]);
  await pg.waitForTimeout(800);
  await touche('touchStart', [[x, y, 1], [x2, y2, 2]]);
  for(let i = 1; i <= 8; i++){ await touche('touchMove', [[x, y, 1], [x2 + (tx-x2)*i/8, y2 + (ty-y2)*i/8, 2]]); await pg.waitForTimeout(30); }
  await pg.waitForTimeout(150);
  const r = await pg.evaluate(() => { const l = document.getElementById('loupe'); return {loupe: l && l.textContent, cible: _fil && _fil.vers}; });
  await pg.screenshot({path: `losdeuxdoigts_${w}.png`});
  await touche('touchEnd', [[tx, ty, 2]]);
  await pg.waitForTimeout(100);
  r.leve2 = await pg.evaluate(() => ({loupe: !!document.getElementById('loupe'), cible: _fil && _fil.vers, ancre: !!_fil.ancre}));
  // Le premier doigt bouge encore : la cible ne change pas.
  await touche('touchMove', [[x - 150, y + 100, 1]]);
  await pg.waitForTimeout(100);
  await touche('touchEnd', []);
  await pg.waitForTimeout(100);
  r.leve1 = await pg.evaluate(() => ({cible: _fil && _fil.vers, ancre: !!(_fil && _fil.ancre), panneau: !!document.getElementById('panneauFil')}));
  r.zoomInchange = await pg.evaluate(z => zoom === z, z0);
  console.log(JSON.stringify(r), errs);
  await b.close();
})();
