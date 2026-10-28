const {ouvrir} = require('./commun.js');
(async () => {
  const {b, pg, errs, ecran, touche} = await ouvrir(process.argv[2], {hasTouch: true, isMobile: true, viewport: {width: 800, height: 1000}, profil: 'tactile'});
  const tap = async (x, y) => { await touche('touchStart', [[x, y, 1]]); await touche('touchEnd', []); await pg.waitForTimeout(150); };
  const glisse = async (x, y, tx, ty) => { await touche('touchStart', [[x, y, 1]]); for(let i = 1; i <= 8; i++) await touche('touchMove', [[x + (tx-x)*i/8, y + (ty-y)*i/8, 1]]); await touche('touchEnd', []); await pg.waitForTimeout(300); };
  const out = {};
  await pg.evaluate(() => armerFil('L'));
  await glisse(200, 400, 400, 450);
  await pg.waitForTimeout(1500);
  out.fil = await pg.evaluate(() => _fil && {ancre: _fil.ancre, c1: [Math.round(_fil.c1.x), Math.round(_fil.c1.y)], src: !!_fil.src, boutons: [...document.querySelectorAll('#panneauFil button')].map(b => b.textContent + (b.disabled ? '(off)' : ''))});
  await tap(500, 300);
  out.c1 = await pg.evaluate(() => _fil && [Math.round(_fil.c1.x), Math.round(_fil.c1.y)]);
  await pg.screenshot({path: 'los.png'});
  const v = await pg.evaluate(() => { const r = document.querySelector('#panneauFil .valider, #panneauFil button.prim').getBoundingClientRect(); return [r.left+5, r.top+5]; });
  await tap(v[0], v[1]);
  out.apresValider = await pg.evaluate(() => [!!_fil, !!_filArme, document.getElementById('journal').lastElementChild.textContent]);
  // mode pose
  await pg.evaluate(() => montrerOnglet('palette'));
  await pg.waitForTimeout(800);
  const vg = await pg.evaluate(() => { const r = document.querySelector('#palCorps .vig').getBoundingClientRect(); return [r.left+10, r.top+10]; });
  const n0 = await pg.evaluate(() => vivants().length);
  await tap(vg[0], vg[1]);
  out.bandeau = await pg.evaluate(() => document.getElementById('bandeauMode') && document.getElementById('bandeauMode').textContent);
  await pg.evaluate(() => basculerCote(false));
  await tap(300, 600);
  out.pose = [n0, await pg.evaluate(() => vivants().length), await pg.evaluate(() => !!_modeCarte)];
  // appui long sur un pion : feuille de commandes
  const c = await pg.evaluate(() => { const r = parUid('T9').el.getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; });
  await touche('touchStart', [[c[0], c[1], 1]]); await pg.waitForTimeout(650); await touche('touchEnd', []);
  out.feuille = await pg.evaluate(c => { const e = document.elementFromPoint(c[0], c[1]); const p = parUid('T9'); return [c, e && (e.id || e.tagName), getComputedStyle(p.el).pointerEvents, p.el.className, p.el.isConnected, getComputedStyle(p.el).display, document.getElementById('mapInner').className, [...document.querySelectorAll('.feuille .act.ligne')].slice(0, 4).map(b => b.textContent)]; }, c);
  await pg.screenshot({path: 'feuille.png'});
  console.log(JSON.stringify(out, null, 1), errs);
  await b.close();
})();
