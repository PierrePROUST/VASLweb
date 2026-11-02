// Décompte des MF sur le board 5 : ravin (niveau -1), ravin-bois (5Z8,
// coûts cumulés), sortie de ravin (montée, coût doublé), pont sur le
// ravin pris par la route (B19.4, B10.4, B3.4).
const nav = require('./navigateur.js');
(async () => {
  const b = await nav.lancer();
  const pg = await (await b.newContext({viewport: {width: 1280, height: 800}})).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await pg.goto('file://' + nav.fichier(process.argv[2] || 'carte.html'));
  const r = await pg.evaluate(async () => {
    await chargerBDD();
    await chargerPartie(['begin_save', 'bd\t0\t0\t05', 'end_save'].join('\x1b'), 'ravin.vsav', new Map());
    await carteLOS();
    const m = _losPrete;
    const H = m.hexGrid.flat().filter(Boolean);
    const hx = n => H.find(h => h.getName() === n);
    const inf = {col: 'inf', unite: 'MF'};
    const voisins = h => [0, 1, 2, 3, 4, 5].map(s => m.getAdjacentHex(h, s)).filter(Boolean);
    const c = (a, b) => { const r = coutEntree(m, hx(a), hx(b), inf); return `${a}→${b} ${r.cout} (${r.lib})`; };
    const r = {
      ravin: c('Y2', 'Y3'),            // terrain ouvert → ravin : 2
      ravinBois: c('Z7', 'Z8'),        // → ravin-bois : 2 + 2
      sortie: c('Y3', 'Y2'),           // ravin (-1) → niveau 0 : 2 × 1
      longRavin: c('Y3', 'Z3') + ' / ' + (hx('Z3').isDepressionTerrain() ? 'Z3 ravin' : 'Z3 hors ravin')
    };
    // Pont : hexagone de ravin avec pont, et sa route.
    const pont = H.find(h => h.isDepressionTerrain() && h.getBridgeTerrain());
    const rte = pont && voisins(pont).find(v => {
      const s = [0, 1, 2, 3, 4, 5].find(k => m.getAdjacentHex(v, k) === pont);
      return _routeMvt(v) && v.getHexsideLocation(s).getTerrain().isRoad();
    });
    if(pont && rte){
      r.pont = c(rte.getName(), pont.getName());
      const apres = voisins(pont).find(v => v !== rte && _routeMvt(v) && !v.isDepressionTerrain()
        && pont.getHexsideLocation([0, 1, 2, 3, 4, 5].find(k => m.getAdjacentHex(pont, k) === v)).getTerrain().isRoad());
      if(apres) r.horsPont = c(pont.getName(), apres.getName());
    }
    return r;
  });
  console.log(JSON.stringify(r, null, 1), errs.length ? errs : 'sans erreur');
  await b.close();
})();
