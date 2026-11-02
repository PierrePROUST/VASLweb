const nav = require('./navigateur.js');
(async () => {
  const b = await nav.lancer();
  const pg = await b.newPage();
  pg.on('pageerror', e => console.log('PAGEERROR', e.message, e.stack.split('\n')[1]));
  await pg.goto('file://' + nav.fichier(process.argv[2])); await pg.waitForTimeout(500); await b.close();
})();
