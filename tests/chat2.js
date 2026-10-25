const {ouvrir} = require('./commun.js');
(async () => {
  const {b, pg, errs, touche} = await ouvrir(process.argv[2], {hasTouch: true, isMobile: true, viewport: {width: 360, height: 740}, profil: 'mobile'});
  const tap = async sel => { const r = await pg.evaluate(s => { const e = document.querySelector(s); if(!e) return null; const q = e.getBoundingClientRect(); return [q.left + q.width/2, q.top + q.height/2]; }, sel); if(!r) return false; await touche('touchStart', [[r[0], r[1], 1]]); await touche('touchEnd', []); await pg.waitForTimeout(60); return true; };
  await pg.evaluate(() => {
    const segs = [];
    for(let i = 0; i < 50; i++){
      const [a, c] = i % 2 ? [1300, 900] : [900, 1100];
      const [pa, pc] = i % 2 ? [900, 1100] : [1300, 700];
      segs.push(`LOG\tCHAT&lt;adv&gt; - message ${i}`);
      segs.push(`LOG\tM/T6/Main Map/${a}/${c}/null/Main Map/${pa}/${pc}/null/adv`);
    }
    preparerRelecture(segs);
  });
  const out = {etapes: await pg.evaluate(() => _etapes.length), carte: await pg.evaluate(() => Math.round(document.getElementById('mapWrap').clientHeight / innerHeight * 100) + '%')};
  await tap('#apercuChat .txt');
  out.etat = await pg.evaluate(() => [_etatChat, _vue()]);
  let vus = 0, visibleRelecture = true, pionVisible = 0;
  for(let i = 0; i < 100; i++){
    visibleRelecture = visibleRelecture && await tap('.relectureBas [data-action="lgAv"]');
    const r = await pg.evaluate(() => {
      const der = [...document.querySelectorAll('#journal .msg')].pop();
      const j = document.getElementById('journal').getBoundingClientRect();
      const t = der && der.getBoundingClientRect();
      const p = parUid('T6').el.getBoundingClientRect(), bas = document.getElementById('bas').getBoundingClientRect(), w = document.getElementById('mapWrap').getBoundingClientRect();
      return {dbg: [Math.round(p.top), Math.round(p.bottom), Math.round(bas.top), Math.round(w.top), hauteurVisibleCarte(), zoom], txt: der && der.textContent, vu: !!t && t.bottom <= j.bottom + 1 && t.top >= j.top - 1, etat: _etatChat, pion: p.bottom <= bas.top && p.top >= w.top};
    });
    if(i === 11){ out.dbg = r.dbg; await pg.screenshot({path: 'chat2m.png'}); }
    if(r.vu) vus++;
    if(r.pion) pionVisible++;
    if(r.etat !== 'compact'){ out.ferme = i; break; }
  }
  out.relecture = [await pg.evaluate(() => _logPos), visibleRelecture, 'messages visibles ' + vus + '/100', 'pion au-dessus du chat ' + pionVisible + '/100'];
  await pg.screenshot({path: 'chat2.png'});
  // retour à l'aperçu, puis un message de l'adversaire en réseau
  await pg.goBack().catch(() => {}); await pg.waitForTimeout(150);
  out.retour = await pg.evaluate(() => [_etatChat, location.href.slice(-10)]);
  const t0 = Date.now();
  await pg.evaluate(() => _netAppliquer('CHAT&lt;adv&gt; - à toi'));
  out.recu = await pg.evaluate(() => [document.querySelector('#apercuChat .txt').textContent, document.querySelector('#apercuChat .badgeAct').textContent, document.querySelector('.navBas :not([aria-hidden])[data-action=vueJournal] .badgeAct').textContent]);
  out.delai = Date.now() - t0;
  await pg.screenshot({path: 'chat2b.png'});
  console.log(JSON.stringify(out), errs);
  await b.close();
})();
