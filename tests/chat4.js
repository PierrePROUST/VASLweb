const {ouvrir} = require('./commun.js');
(async () => {
  const {b, pg, errs, touche} = await ouvrir(process.argv[2], {hasTouch: true, isMobile: true, viewport: {width: 360, height: 740}, profil: 'mobile'});
  const tap = async sel => { const r = await pg.evaluate(s => { const q = document.querySelector(s).getBoundingClientRect(); return [q.left + q.width/2, q.top + q.height/2]; }, sel); await touche('touchStart', [[r[0], r[1], 1]]); await touche('touchEnd', []); await pg.waitForTimeout(120); };
  const out = {};
  await pg.evaluate(() => { deplacer(pile('1300,700'), 1080, 820); selectionnerPile(null); });
  await tap('.navBas :not([aria-hidden])[data-action="vueJournal"]');
  const visibleRap = () => pg.evaluate(() => { const r = [...document.querySelectorAll('#journal .rap')].pop(); return getComputedStyle(r).display !== 'none'; });
  out.rap0 = await visibleRap();
  await tap('#filtresChat [data-filtre="rap"]'); out.rap1 = await visibleRap();
  await tap('#filtresChat [data-filtre="rap"]'); out.rap2 = await visibleRap();
  out.sysMasque = await pg.evaluate(() => getComputedStyle(document.querySelector('#journal .sys:not(.alerte)')).display);
  out.lien = await pg.evaluate(() => [...document.querySelectorAll('#journal .lieuChat')].map(s => s.textContent));
  await pg.evaluate(() => { const w = document.getElementById('mapWrap'); w.scrollLeft = 0; w.scrollTop = 0; });
  await tap('#journal .rap .lieuChat:last-child');
  out.apresLien = await pg.evaluate(() => { const w = document.getElementById('mapWrap'); const c = {x: (w.scrollLeft + w.clientWidth/2) / zoom / SC, y: (w.scrollTop + w.clientHeight/2) / zoom / SC}; return [_vue(), _etatChat, Math.round(c.x), Math.round(c.y), _hexParNom.get('aE3')]; });
  // Retour depuis le journal plein
  await tap('.navBas :not([aria-hidden])[data-action="vueJournal"]');
  const lg = await pg.evaluate(() => history.length);
  await pg.goBack().catch(() => {}); await pg.waitForTimeout(200);
  out.retour = await pg.evaluate(() => [_vue(), _etatChat, location.protocol]);
  // PC : rien de nouveau
  console.log(JSON.stringify(out), errs);
  await b.close();
})();
