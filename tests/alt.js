const {ouvrir} = require('./commun.js');
(async () => {
  const {b, pg, errs, centre} = await ouvrir(process.argv[2]);
  const [x, y] = await centre('T9');
  await pg.mouse.move(x, y);
  await pg.keyboard.down('Alt');
  const r = [];
  for(let i = 0; i < 3; i++){ await pg.mouse.wheel(0, -100); await pg.waitForTimeout(80); r.push(await pg.evaluate(() => [..._sel].map(p => p.uid).join())); }
  await pg.keyboard.up('Alt');
  console.log(JSON.stringify({r, dep: await pg.evaluate(() => [..._depliees]), zoom: await pg.evaluate(() => zoom)}), errs);
  await b.close();
})();
