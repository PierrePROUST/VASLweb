// PC : pendant un glissé à la souris, la loupe ne montre que l'hexagone survolé.
const {ouvrir} = require('./commun.js');
(async () => {
  const {b, pg, errs, centre, ecran} = await ouvrir(process.argv[2]);
  const [x, y] = await centre('T6'); const [tx, ty] = await ecran(1080, 820);
  await pg.mouse.move(x, y); await pg.mouse.down();
  await pg.mouse.move(x + 20, y, {steps: 3}); await pg.mouse.move(tx, ty, {steps: 10});
  await pg.waitForTimeout(150);
  const r = await pg.evaluate(() => { const l = document.getElementById('loupe'); return l && {label: l.textContent, hexSeul: l.classList.contains('hexSeul'), taille: l.offsetWidth}; });
  await pg.screenshot({path: 'loupepc.png'});
  await pg.mouse.up(); await pg.waitForTimeout(100);
  r.apres = await pg.evaluate(() => !!document.getElementById('loupe'));
  console.log(JSON.stringify(r), errs);
  await b.close();
})();
