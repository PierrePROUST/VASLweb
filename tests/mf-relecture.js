// Décompte des MF pendant la relecture d'un .vlog (board 5) : un coup
// relu (M/ d'un pion, M/ d'une pile VASSAL) est compté comme un coup
// joué ici, affiché au chat sans entrer dans le log ; un changement de
// phase relu remet les cumuls à zéro ; reculer rétablit les cumuls.
const nav = require('./navigateur.js');
(async () => {
  const b = await nav.lancer();
  const pg = await (await b.newContext({viewport: {width: 1280, height: 800}})).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await pg.goto('file://' + nav.fichier(process.argv[2] || 'carte.html'));
  const r = await pg.evaluate(async () => {
    await chargerBDD();
    await chargerPartie(['begin_save', 'bd\t0\t0\t05', 'end_save'].join('\x1b'), 'relecture.vsav', new Map());
    await carteLOS();
    const m = _losPrete;
    const H = m.hexGrid.flat().filter(Boolean);
    const T = h => h.getCenterLocation().getTerrain().getName();
    const px = h => { const c = h.getHexCenter(); return [c.x * _losZoom() + BOARD_MARGIN, c.y * _losZoom() + BOARD_MARGIN]; };
    const tic = () => new Promise(f => setTimeout(f, 20));
    const og = H.find(h => T(h) === 'Open Ground' && [0, 1, 2, 3, 4, 5].some(s => { const v = m.getAdjacentHex(h, s); return v && T(v) === 'Woods'; }));
    const bois = [0, 1, 2, 3, 4, 5].map(s => m.getAdjacentHex(og, s)).find(v => v && T(v) === 'Woods');
    const og2 = [0, 1, 2, 3, 4, 5].map(s => m.getAdjacentHex(bois, s)).find(v => v && v !== og && T(v) === 'Open Ground');
    poserDepuisPalette(_bdd.pions.find(s => s.n === '5-4-8 SSsq'), ...px(og)); await tic();
    const sq = vivants().slice(-1)[0];
    poserDepuisPalette(_bdd.pions.find(s => s.n === '8-1'), ...px(og)); await tic();
    const ldr = vivants().slice(-1)[0];
    const M = (id, h, de) => `M/${id}/Main Map/${px(h)[0]}/${px(h)[1]}/null/Main Map/${px(de)[0]}/${px(de)[1]}/null/joueur`;
    // Trois coups relus : l'escouade seule vers le bois, la pile VASSAL
    // (escouade + chef) vers le terrain ouvert, puis une nouvelle phase.
    _etapes = [[M(sq.uid, bois, og)], [M('S77', og2, og)], ['CHAT* German Turn 1 - DFPh'], [M(ldr.uid, og, og2)]];
    _logPos = 0; _instantanes = [];
    const lignes = () => [...document.querySelectorAll('.rap')].map(e => e.textContent).filter(t => /cumul/.test(t));
    const r = {};
    avancerLog(true); r.coup1 = lignes().slice(-1)[0];
    // Le chef rejoint l'escouade dans le bois ; la pile VASSAL S77 les
    // réunit (l'escouade déplacée seule au coup 1 a quitté son ancienne pile).
    ldr.x = sq.x; ldr.y = sq.y;
    _pilesVassal.set('S77', [sq.uid, ldr.uid]);
    _etapes[1] = [M('S77', og2, bois)];
    avancerLog(true); r.coup2 = lignes().slice(-1)[0];
    avancerLog(true); r.phase = (sq.mvt ? 'cumul ' + _mvtCumul(sq) : 'cumuls remis à zéro');
    avancerLog(true); r.coup4 = lignes().slice(-1)[0];
    reculerLog(true); reculerLog(true);
    r.recul = 'escouade ' + (sq.mvt ? _mvtCumul(sq) : 'aucun') + ', chef ' + (ldr.mvt ? _mvtCumul(ldr) : 'aucun');
    r.dansLeLog = _histo.flatMap(e => e.cmds).filter(c => /^CHAT.*cumul/.test(c)).length;
    return r;
  });
  console.log(JSON.stringify(r, null, 1), errs.length ? errs : 'sans erreur');
  await b.close();
})();
