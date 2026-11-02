const {ouvrir} = require('./commun.js');
(async () => {
  const {b, pg, errs, centre, touche, cmds} = await ouvrir(process.argv[2], {hasTouch: true});
  const [x, y] = await centre('T3');
  const z0 = await pg.evaluate(() => zoom);
  await touche('touchStart', [[x, y, 1]]);
  await touche('touchMove', [[x + 3, y + 3, 1]]);
  await touche('touchStart', [[x + 3, y + 3, 1], [x + 100, y, 2]]);
  for(let i = 1; i <= 10; i++) await touche('touchMove', [[x - 5*i, y - 2*i, 1], [x + 100 + 10*i, y, 2]]);
  await touche('touchEnd', []);
  await pg.waitForTimeout(300);
  const z1 = await pg.evaluate(() => zoom);
  console.log(JSON.stringify({z0, z1, cmds: await cmds(), errs}));
  await b.close();
})();
