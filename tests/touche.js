const {ouvrir} = require('./commun.js');
(async () => {
  const {b, pg, errs, centre} = await ouvrir(process.argv[2]);
  const [x, y] = await centre('T8'); await pg.mouse.click(x, y);
  for(const k of ['Control+m', 'Control+f', 'Control+b']) { await pg.keyboard.press(k); await pg.waitForTimeout(100); }
  const r = await pg.evaluate(() => _histo.flatMap(e => e.cmds).map(c => c.slice(0, 6) + ' ' + c.length));
  console.log(JSON.stringify(r), errs);
  await b.close();
})();
