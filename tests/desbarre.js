const {ouvrir} = require('./commun.js');
(async () => {
  const {b, pg, errs} = await ouvrir(process.argv[2]);
  await pg.click('.barreDes button[data-action="DR_IFT"]');
  const r = await pg.evaluate(() => [[...document.querySelectorAll('.barreDes button')].map(b => b.textContent), document.getElementById('journal').lastElementChild.textContent.slice(0, 12)]);
  await pg.screenshot({path: 'desbarre.png', clip: {x: 0, y: 0, width: 1280, height: 120}});
  console.log(JSON.stringify(r), errs);
  await b.close();
})();
