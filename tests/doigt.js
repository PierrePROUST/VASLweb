const {ouvrir} = require('./commun.js');
(async () => {
  const {b, pg, errs, centre, ecran, touche, cmds} = await ouvrir(process.argv[2], {hasTouch: true, viewport: {width: 600, height: 800}});
  let [x, y] = await centre('T8');
  // appui court : sélection
  await touche('touchStart', [[x, y, 1]]); await touche('touchEnd', []);
  await pg.waitForTimeout(100);
  const sel = await pg.evaluate(() => _pileSel);
  // appui long : menu
  await touche('touchStart', [[x, y, 1]]); await pg.waitForTimeout(650);
  const menu = await pg.evaluate(() => !!document.getElementById('ctx'));
  await touche('touchEnd', []);
  await pg.evaluate(() => fermerMenu());
  // glissé au doigt vers un hexagone
  [x, y] = await centre('T8'); const [tx, ty] = await ecran(950, 820);
  await touche('touchStart', [[x, y, 1]]);
  for(let i = 1; i <= 10; i++) await touche('touchMove', [[x + (tx-x)*i/10, y + (ty-y)*i/10, 1]]);
  await pg.waitForTimeout(50);
  await touche('touchEnd', []);
  await pg.waitForTimeout(100);
  // glissé lâché sur le panneau latéral (ouvert par-dessus la carte)
  await pg.evaluate(() => { document.getElementById('cote').classList.remove('ferme'); cadrerSur([{x: 906, y: 788}]); setZoom(0.6); const w = document.getElementById('mapWrap'); w.scrollLeft = 906*SC*0.6 - 150; w.scrollTop = 788*SC*0.6 - w.clientHeight/2; });
  await pg.waitForTimeout(100);
  [x, y] = await centre('T8');
  const cote = await pg.evaluate(() => { const r = document.getElementById('cote').getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height - 40]; });
  await touche('touchStart', [[x, y, 1]]);
  for(let i = 1; i <= 10; i++) await touche('touchMove', [[x + (cote[0]-x)*i/10, y + (cote[1]-y)*i/10, 1]]);
  await pg.waitForTimeout(50);
  await touche('touchEnd', []);
  await pg.waitForTimeout(100);
  console.log(JSON.stringify({sel, menu, cmds: await cmds(), errs}));
  await pg.screenshot({path: 'doigt.png'});
  await b.close();
})();
