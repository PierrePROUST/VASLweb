// LOS à la souris : pendant le tracé, la loupe montre l'hexagone survolé
// seul, avec le fil et le lieu visé ; elle disparaît au relâché.
const {ouvrir} = require('./commun.js');
(async () => {
  const {b, pg, errs, ecran} = await ouvrir(process.argv[2]);
  await pg.evaluate(() => armerFil('L'));
  const [x, y] = await ecran(900, 700), [tx, ty] = await ecran(1150, 820);
  await pg.mouse.move(x, y); await pg.mouse.down();
  await pg.waitForTimeout(800);
  await pg.mouse.move(tx, ty, {steps: 10});
  await pg.waitForTimeout(150);
  const r = await pg.evaluate(() => { const l = document.getElementById('loupe'); return l && {label: l.textContent, hexSeul: l.classList.contains('hexSeul'), taille: l.offsetWidth}; });
  await pg.screenshot({path: 'loupelospc.png'});
  await pg.mouse.up(); await pg.waitForTimeout(100);
  r.apres = await pg.evaluate(() => !!document.getElementById('loupe'));
  console.log(JSON.stringify(r), errs);
  await b.close();
})();
