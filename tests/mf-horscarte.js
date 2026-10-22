// Décompte des MF depuis le hors-carte (zone de mise en place, renforts) :
// une unité posée hors des boards entre sur la carte et paie le coût du
// premier hexagone ; le décompte ne plante plus. Un chef est reconnu par
// son nom affiché (« 8-1 »), même si son nom de base est « xxLDR ».
const nav = require('./navigateur.js');
(async () => {
  const b = await nav.lancer();
  const pg = await (await b.newContext({viewport: {width: 1280, height: 800}})).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await pg.goto('file://' + nav.fichier(process.argv[2] || 'carte.html'));
  const r = await pg.evaluate(async () => {
    await chargerBDD();
    await chargerPartie(['begin_save', 'bd\t0\t0\t05', 'end_save'].join('\x1b'), 'horscarte.vsav', new Map());
    await carteLOS();
    const m = _losPrete;
    const H = m.hexGrid.flat().filter(Boolean);
    const T = h => h.getCenterLocation().getTerrain().getName();
    const px = h => { const c = h.getHexCenter(); return [c.x * _losZoom() + BOARD_MARGIN, c.y * _losZoom() + BOARD_MARGIN]; };
    const tic = () => new Promise(f => setTimeout(f, 20));
    const msg = () => _histo.flatMap(e => e.cmds).filter(c => /^CHAT.*cumul/.test(c)).slice(-1)[0].replace(/^CHAT\* /, '');
    const r = {};
    // Hors carte : au-dessus du board, dans la marge.
    const bois = H.find(h => T(h) === 'Woods' && h.getHexCenter().y < 120);
    const [bx] = px(bois);
    poserDepuisPalette(_bdd.pions.find(s => s.n === '5-4-8 SSsq'), bx, BOARD_MARGIN - 150); await tic();
    const sq = vivants().slice(-1)[0];
    r.depart = lieu(sq.x, sq.y) + ' / hexagone LOS : ' + (_hexDe(m, sq.x, sq.y) ? 'oui' : 'aucun');
    deplacer([sq], ...px(bois)); await tic();
    r.entree = msg();
    const og = [0, 1, 2, 3, 4, 5].map(s => m.getAdjacentHex(bois, s)).find(v => v && T(v) === 'Open Ground');
    deplacer([sq], ...px(og)); await tic();
    r.suite = msg();
    // Chef : nom affiché et nom de base.
    poserDepuisPalette(_bdd.pions.find(s => s.n === '8-1'), ...px(og)); await tic();
    const ldr = vivants().slice(-1)[0];
    r.chef = [ldr.nom, lirePiece(ldr.seg).nomBase, (natureMouvement(ldr) || {}).mf];
    r.escouade = (natureMouvement(sq) || {}).mf;
    r.erreurs = [...document.querySelectorAll('div.sys')].map(e => e.textContent).filter(t => /Décompte des MF/.test(t));
    return r;
  });
  console.log(JSON.stringify(r, null, 1), errs.length ? errs : 'sans erreur');
  await b.close();
})();
