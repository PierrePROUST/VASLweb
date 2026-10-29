const {ouvrir} = require('./commun.js');
(async () => {
  const {b, pg, errs, centre, ecran, touche, cmds} = await ouvrir(process.argv[2], {hasTouch: true, isMobile: true, viewport: {width: 360, height: 740}, profil: 'tactile'});
  const tap = async (x, y) => { await touche('touchStart', [[x, y, 1]]); await touche('touchEnd', []); await pg.waitForTimeout(120); };
  const glisse = async (x, y, tx, ty) => { await touche('touchStart', [[x, y, 1]]); for(let i = 1; i <= 12; i++) await touche('touchMove', [[x + (tx-x)*i/12, y + (ty-y)*i/12, 1]]); await pg.waitForTimeout(60); await touche('touchEnd', []); await pg.waitForTimeout(150); };
  const out = {profil: await pg.evaluate(() => _profil)};
  await pg.evaluate(() => { const w = document.getElementById('mapWrap'); w.scrollLeft = 900*SC*zoom - w.clientWidth/2; w.scrollTop = 700*SC*zoom - w.clientHeight/2 + 80; });
  let [x, y] = await centre('T9'); await tap(x, y);
  out.eventail = await pg.evaluate(() => _eventail && document.querySelectorAll('#eventail .vigEv').length);
  await pg.screenshot({path: 'p3a.png'});
  const vig = i => pg.evaluate(i => { const r = document.querySelectorAll('#eventail .vigEv')[i].getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2 + 8]; }, i);
  [x, y] = await vig(2); await tap(x, y);
  out.sel3 = await pg.evaluate(() => [..._sel].map(p => p.uid));
  out.boutons = await pg.evaluate(() => [...document.querySelectorAll('#eventail .actionsEv button')].map(b => b.textContent));
  const n0 = (await pg.evaluate(() => _histo.flatMap(e => e.cmds).length));
  const bt = await pg.evaluate(() => { const r = document.querySelector('#eventail .actionsEv .cmdRapide').getBoundingClientRect(); return [r.left + 10, r.top + 10]; });
  await tap(bt[0], bt[1]);
  out.commande = await pg.evaluate(n => _histo.flatMap(e => e.cmds).slice(n).map(c => c.slice(0, 14)), n0);
  // au sommet : glisser la 3e vignette jusqu'après la dernière
  [x, y] = await vig(2); const [dx, dy] = await vig(5);
  await glisse(x, y, dx + 25, dy);
  out.ordre = await pg.evaluate(() => pile('900,700').map(p => p.uid));
  out.rang = (await cmds()).slice(-1);
  // la déplacer seule vers la carte : glisser hors de l'éventail
  [x, y] = await vig(5); const [tx, ty] = [60, 570];
  await glisse(x, y, tx, ty);
  out.deplace = (await cmds()).slice(-1);
  out.reste = await pg.evaluate(() => pile('900,700').map(p => p.uid));
  await pg.screenshot({path: 'p3b.png'});
  console.log(JSON.stringify(out, null, 1), errs);
  await b.close();
})();
