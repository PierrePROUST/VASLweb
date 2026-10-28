const nav = require('./navigateur.js');
exports.ouvrir = async (fichier, opts = {}) => {
  fichier = nav.fichier(fichier);
  const b = await nav.lancer();
  const ctx = await b.newContext(Object.assign({viewport: {width: 1280, height: 800}}, opts, {profil: undefined}));
  const pg = await ctx.newPage();
  if(opts.profil) await pg.addInitScript(p => { localStorage.setItem('aslweb.profil', p); }, opts.profil);
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await pg.goto('file://' + fichier);
  await pg.evaluate(async () => {
    const bdd = await chargerBDD();
    const noms = ['5-4-8 SSsq', '8-1', 'MMG', 'DM', 'Smoke', '8-3-8 SSsq', '4-6-7 sq', '2-3-7 hs', '8-3-8 SSsq'];
    const pos = [[900, 700], [900, 700], [900, 700], [1100, 760], [1100, 760], [1300, 700], [900, 700], [900, 700], [900, 700]];
    const segs = []; let n = 0;
    for(const nom of noms){
      const x = bdd.pions.find(s => s.n === nom) || bdd.pions.find(s => s.n === '5-4-8 SSsq');
      const te = _typeEtEtat(x.cmd.replace(/^\+\/null\//, '+/0/'));
      const [px, py] = pos[n];
      segs.push('+/T' + (++n) + '/' + te.type + '/' + _majPosEtat(te.etat, 'Main Map', px, py));
    }
    const piles = [`+/S1/stack/Main Map;900;700;T1;T2;T3;T7;T8;T9;@@-1`, `+/S2/stack/Main Map;1100;760;T4;T5;@@-1`];
    await chargerPartie(['begin_save', 'bd\t0\t0\ta', ...segs, ...piles, 'end_save'].join('\x1b'), 'test.vsav', new Map());
    document.querySelectorAll('.fenetre').forEach(f => f.remove());
    setZoom(0.6);
    const w = document.getElementById('mapWrap'); w.scrollLeft = 900*SC*0.6 - w.clientWidth/2; w.scrollTop = 700*SC*0.6 - w.clientHeight/2;
  });
  await pg.waitForTimeout(1500);
  const ecran = (x, y) => pg.evaluate(([x, y]) => { const r = document.getElementById('mapInner').getBoundingClientRect(); return [r.left + x*SC*zoom, r.top + y*SC*zoom]; }, [x, y]);
  const centre = uid => pg.evaluate(u => { const r = parUid(u).el.getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; }, uid);
  const cdp = await ctx.newCDPSession(pg);
  const touche = (type, pts) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: pts.map((p, i) => ({x: p[0], y: p[1], id: p[2] ?? i}))});
  const cmds = () => pg.evaluate(() => _histo.flatMap(e => e.cmds).filter(c => /^[M+\-]\//.test(c)).map(c => c.replace(/\/[^/]*$/, '')));
  return {b, pg, errs, ecran, centre, touche, cmds};
};
