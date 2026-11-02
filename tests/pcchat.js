const {ouvrir} = require('./commun.js');
(async () => {
  const {b, pg, errs} = await ouvrir(process.argv[2]);
  const r = await pg.evaluate(() => ['#chatEnvoi', '#chatRapide', '#filtresChat', '#apercuChat', '.poigneeChat', '#nouveauxChat'].map(s => { const e = document.querySelector(s); return s + ':' + (e ? (e.offsetParent !== null && getComputedStyle(e).display !== 'none' && !e.hidden ? 'VISIBLE' : 'caché') : 'absent'); }));
  const sys = await pg.evaluate(() => getComputedStyle(document.querySelector('#journal .sys')).display);
  await pg.screenshot({path: 'pcchat.png', clip: {x: 0, y: 640, width: 1280, height: 160}});
  console.log(JSON.stringify({r, sys}), errs);
  await b.close();
})();
