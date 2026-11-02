const {ouvrir} = require('./commun.js');
(async () => {
  const {b, pg, errs, centre, cmds} = await ouvrir(process.argv[2]);
  let [x, y] = await centre('T9'); await pg.mouse.click(x, y);
  const lig = i => pg.evaluate(i => { const r = document.querySelectorAll('#pile .lig')[i].getBoundingClientRect(); return [r.left + 20, r.top + r.height/2]; }, i);
  const out = {};
  out.avant = await pg.evaluate(() => pile('900,700').map(p => p.uid));
  // glisser la 5e ligne (du sommet) à la 1re place
  const [ax, ay] = await lig(4), [bx, by] = await lig(0);
  await pg.mouse.move(ax, ay); await pg.mouse.down(); await pg.mouse.move(ax, ay - 10, {steps: 2}); await pg.mouse.move(bx, by - 12, {steps: 6}); await pg.mouse.up();
  await pg.waitForTimeout(150);
  out.apres = await pg.evaluate(() => pile('900,700').map(p => p.uid));
  out.cmds = await cmds();
  await pg.keyboard.press('Control+z'); await pg.waitForTimeout(100);
  out.undo = await pg.evaluate(() => pile('900,700').map(p => p.uid));
  // clic, Maj+clic, Ctrl+clic
  [x, y] = await lig(1); await pg.mouse.click(x, y);
  [x, y] = await lig(3); await pg.keyboard.down('Shift'); await pg.mouse.click(x, y); await pg.keyboard.up('Shift');
  out.plage = await pg.evaluate(() => trierParPile([..._sel]).map(p => p.uid));
  [x, y] = await lig(2); await pg.keyboard.down('Control'); await pg.mouse.click(x, y); await pg.keyboard.up('Control');
  out.ctrl = await pg.evaluate(() => trierParPile([..._sel]).map(p => p.uid));
  await pg.screenshot({path: 'p4.png'});
  console.log(JSON.stringify(out), errs);
  await b.close();
})();
