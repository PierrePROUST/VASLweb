// Gestes à la souris ; renvoie les commandes consignées.
const nav = require('./navigateur.js');
const fichier = nav.fichier(process.argv[2]);
(async () => {
  const b = await nav.lancer();
  const pg = await b.newPage({viewport: {width: 1280, height: 800}});
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await pg.goto('file://' + fichier);
  await pg.evaluate(async () => {
    const bdd = await chargerBDD();
    const noms = ['5-4-8 SSsq', '8-1', 'MMG', 'DM', 'Smoke', '8-3-8 SSsq'];
    const pos = [[900, 700], [900, 700], [900, 700], [1100, 760], [1100, 760], [1300, 700]];
    const segs = []; let n = 0;
    for(const nom of noms){
      const x = bdd.pions.find(s => s.n === nom);
      const te = _typeEtEtat(x.cmd.replace(/^\+\/null\//, '+/0/'));
      const [px, py] = pos[n];
      segs.push('+/T' + (++n) + '/' + te.type + '/' + _majPosEtat(te.etat, 'Main Map', px, py));
    }
    const piles = [`+/S1/stack/Main Map;900;700;T1;T2;T3;@@-1`, `+/S2/stack/Main Map;1100;760;T4;T5;@@-1`];
    await chargerPartie(['begin_save', 'bd\t0\t0\ta', ...segs, ...piles, 'end_save'].join('\x1b'), 'test.vsav', new Map());
    document.querySelectorAll('.fenetre').forEach(f => f.remove());
    setZoom(0.6);
    const w = document.getElementById('mapWrap'); w.scrollLeft = 900*SC*0.6 - 400; w.scrollTop = 700*SC*0.6 - 300;
  });
  await pg.waitForTimeout(1500);
  const ecran = async (x, y) => pg.evaluate(([x, y]) => { const r = document.getElementById('mapInner').getBoundingClientRect(); return [r.left + x*SC*zoom, r.top + y*SC*zoom]; }, [x, y]);
  const centre = async uid => pg.evaluate(u => { const r = parUid(u).el.getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; }, uid);
  // 1. clic sur la pile S1
  let [x, y] = await centre('T3'); await pg.mouse.click(x, y);
  const sel1 = await pg.evaluate(() => _pileSel);
  // 2. glisser la pile S1 sur S2
  [x, y] = await centre('T3'); const [tx, ty] = await ecran(1100, 760);
  await pg.mouse.move(x, y); await pg.mouse.down(); await pg.mouse.move(x+20, y+20, {steps: 3}); await pg.mouse.move(tx, ty, {steps: 8}); await pg.mouse.up();
  await pg.waitForTimeout(300);
  // 3. ▲ du pion du fond dans le panneau
  await pg.evaluate(() => changerRang(parUid('T4'), +1));
  // 4. glisser la ligne du sommet du panneau vers un autre hexagone
  const lig = await pg.evaluate(() => { const r = document.querySelector('#pile .lig').getBoundingClientRect(); return [r.left+20, r.top+15]; });
  const [ux, uy] = await ecran(1300, 900);
  await pg.mouse.move(lig[0], lig[1]); await pg.mouse.down(); await pg.mouse.move(lig[0]-30, lig[1], {steps: 3}); await pg.mouse.move(ux, uy, {steps: 10}); await pg.mouse.up();
  await pg.waitForTimeout(300);
  const r = await pg.evaluate(() => ({cmds: _histo.flatMap(e => e.cmds).filter(c => /^[M+\-D]\//.test(c)).map(c => c.replace(/\/[^/]*$/, '')),
    sel: _pileSel, etat: etatPartie().map(s => s.replace(/^\+\/w\d+\/stack\//, '+/w/stack/'))}));
  console.log(JSON.stringify({sel1, errs, cmds: r.cmds.map(c => c.startsWith('D/') ? c.slice(0, 20) : c), sel: r.sel}, null, 1));
  require('fs').writeFileSync(process.argv[3], JSON.stringify(r));
  await pg.screenshot({path: process.argv[3] + '.png'});
  await b.close();
})();
