// Décompte des MF / MP : trous d'obus (1 ou 2 MF, B2.4), contournement
// d'un bois par l'infanterie (A4.3) et par un véhicule (VBM, D2.3, D2.33),
// changements de VCA (D2.11 : 1 MP par hexspine, 2 dans les bois) et Undo.
// Board 5 : hexagones standard, bois et terrain ouvert.
const nav = require('./navigateur.js');
(async () => {
  const b = await nav.lancer();
  const pg = await (await b.newContext({viewport: {width: 1280, height: 800}})).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await pg.goto('file://' + nav.fichier(process.argv[2] || 'carte.html'));
  const r = await pg.evaluate(async () => {
    await chargerBDD();
    await chargerPartie(['begin_save', 'bd\t0\t0\t05', 'end_save'].join('\x1b'), 'contournement.vsav', new Map());
    await carteLOS();
    const m = _losPrete;
    const hexes = m.hexGrid.flat().filter(Boolean);
    const T = h => h.getCenterLocation().getTerrain().getName();
    const px = h => { const c = h.getHexCenter(); return [c.x * _losZoom() + BOARD_MARGIN, c.y * _losZoom() + BOARD_MARGIN]; };
    const tic = () => new Promise(f => setTimeout(f, 20));
    const poser = async (nom, h) => { const [x, y] = px(h); poserDepuisPalette(_bdd.pions.find(s => s.n === nom), x, y); await tic(); return vivants().slice(-1)[0]; };
    const aller = async (l, x, y) => { deplacer(l, x, y); await tic(); };
    // Dernier décompte au log (les traits Report de VASL écrivent aussi au chat).
    const msg = () => _histo.flatMap(e => e.cmds).filter(c => /^CHAT.* : (VCA )?\+/.test(c)).slice(-1)[0].replace(/^CHAT\* /, '');
    // Milieu du côté s (0 à 5) de l'hexagone h, en pixels de carte, et ses deux hexagones.
    const cote = (h, s) => { const c = h.getHexsideLocation(s).getEdgeCenterPoint(); return [c.x * _losZoom() + BOARD_MARGIN, c.y * _losZoom() + BOARD_MARGIN]; };
    const voisinPar = (h, s) => m.getAdjacentHex(h, s) ? [h, m.getAdjacentHex(h, s)] : null;
    const r = {};

    // 1. Trou d'obus : terrain donné à un hexagone le temps du test.
    const og = hexes.find(h => T(h) === 'Open Ground' && [0, 1, 2, 3, 4, 5].some(s => { const v = m.getAdjacentHex(h, s); return v && T(v) === 'Open Ground'; }));
    const og2 = [0, 1, 2, 3, 4, 5].map(s => m.getAdjacentHex(og, s)).find(v => v && T(v) === 'Open Ground');
    const vrai = og2.getCenterLocation().getTerrain();
    og2.getCenterLocation().setTerrain(m.getTerrain('Shellholes'));
    const sq0 = await poser('5-4-8 SSsq', og);
    await aller([sq0], ...px(og2));
    r.trouObus = msg();
    await aller([sq0], ...px(og));
    r.trouObusRetour = msg();
    og2.getCenterLocation().setTerrain(vrai);

    // 2. Contournement d'un bois X : depuis un voisin A en terrain ouvert,
    // sur un côté de X qui ne touche pas d'autre obstacle.
    let cas = null;
    for(const X of hexes.filter(h => T(h) === 'Woods')){
      for(let s = 0; s < 6 && !cas; s++){
        const c = voisinPar(X, s), c2 = voisinPar(X, (s + 1) % 6);
        if(!c || !c2 || c.some(h => h !== X && _obstacleMvt(h)) || c2.some(h => h !== X && _obstacleMvt(h))) continue;
        const Y = c.find(h => h !== X);
        const A = [0, 1, 2, 3, 4, 5].map(k => m.getAdjacentHex(X, k)).find(v => v && v !== Y && T(v) === 'Open Ground' && _coteVers(m, v, Y) >= 0);
        if(A) cas = {X, s, A, Y};
      }
      if(cas) break;
    }
    r.cas = cas && [cas.X.getName(), cas.s, cas.A.getName(), cas.Y.getName()];
    r.positions = [_posMvt(m, ...cote(cas.X, cas.s)), _posMvt(m, ...cote(cas.X, (cas.s + 1) % 6))].map(q => q.cle + ' ' + (q.cote || []).map(h => h.getName()).join('|'));
    const sq = await poser('5-4-8 SSsq', cas.A);
    await aller([sq], ...cote(cas.X, cas.s));
    r.entree = msg();
    await aller([sq], ...cote(cas.X, (cas.s + 1) % 6));
    r.suite = msg();
    await aller([sq], ...px(cas.X));
    r.dansLeBois = msg();

    // 3. T-34 : VBM (2 × terrain ouvert), suite (1 VCA + 2 VBM), puis VCA.
    const tk = await poser('T-34 M40', cas.A);
    await aller([tk], ...cote(cas.X, cas.s));
    r.vbm = msg();
    await aller([tk], ...cote(cas.X, (cas.s + 1) % 6));
    r.vbmSuite = msg();
    const cmd = nom => commandesDe(_typeEtEtat(tk.seg).type).cmds.find(c => c.nom === nom);
    // Hors obstacle : retour sur A, puis deux hexspines.
    await aller([tk], ...px(cas.A));
    executerTouche(tk, cmd('CA cw').touche); await tic();
    r.vca1 = msg();
    executerTouche(tk, cmd('CA cw').touche); await tic();
    r.vca2 = msg();
    // Undo d'une rotation : le cumul revient en arrière.
    const avantUndo = _mvtCumul(tk);
    annuler(); await tic();
    r.undoVca = avantUndo + ' → ' + _mvtCumul(tk);
    // Dans le bois : 2 MP par hexspine.
    await aller([tk], ...px(cas.X));
    executerTouche(tk, cmd('CA ccw').touche); await tic();
    r.vcaBois = msg();
    return r;
  });
  console.log(JSON.stringify(r, null, 1), errs.length ? errs : 'sans erreur');
  await b.close();
})();
