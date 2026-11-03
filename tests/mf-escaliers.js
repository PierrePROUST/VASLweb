// Étages et escaliers (board 1), B23.21 à B23.24 et B23.421 : une unité
// arrive toujours au rez-de-chaussée, sous le marqueur d'étage ; elle
// monte en passant sur le marqueur, 1 MF par niveau, dans un hexagone
// d'escalier : imprimé (1U3) ou inhérent (maison à deux niveaux 1F1-G1).
// Sans escalier (1U2) ou sans étage (1D4) : alerte. D'un étage à l'autre
// hexagone du bâtiment au même étage : coût du bâtiment seul.
const nav = require('./navigateur.js');
(async () => {
  const b = await nav.lancer();
  const pg = await (await b.newContext({viewport: {width: 1280, height: 800}})).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await pg.goto('file://' + nav.fichier(process.argv[2] || 'VASLweb.html'));
  const r = await pg.evaluate(async () => {
    await chargerBDD();
    await chargerPartie(['begin_save', 'bd\t0\t0\t01', 'end_save'].join('\x1b'), 'escaliers.vsav', new Map());
    await carteLOS();
    const m = _losPrete;
    const H = m.hexGrid.flat().filter(Boolean), hx = n => H.find(h => h.getName() === n);
    const px = h => { const c = h.getHexCenter(); return [c.x * _losZoom() + BOARD_MARGIN, c.y * _losZoom() + BOARD_MARGIN]; };
    const tic = () => new Promise(f => setTimeout(f, 20));
    const piece = n => _bdd.pions.find(s => s.n === n);
    const poser = async (x, h) => { poserDepuisPalette(x, ...px(h)); await tic(); return vivants().slice(-1)[0]; };
    const msgs = n => _histo.flatMap(e => e.cmds).filter(c => /^CHAT.*(cumul|M[FP]\/ )/.test(c)).slice(-n).map(c => c.replace(/^CHAT\* /, '')).join(' | ');
    // Marqueur d'étage réglé au niveau voulu (il naît au niveau 3).
    const etage = async (h, n) => {
      const q = await poser(_bdd.parGpid.get('163'), h);
      const haut = commandesDe(_typeEtEtat(q.seg).type).cmds.find(c => c.nom === 'Higher');
      while(_niveauCompteur(q) !== n) executerTouche(q, haut.touche);
      return q;
    };
    const monter = async (p, q) => { const s = pile(cle(p)); deplacerDansPile(p, s.indexOf(q)); await tic(); };
    const r = {};
    // Voisins en terrain ouvert de U3, U2, D4 et F1, pour y entrer.
    const dehors = h => [0, 1, 2, 3, 4, 5].map(k => m.getAdjacentHex(h, k)).find(v => v && !(_autreTerrainMvt(v) || v.getCenterLocation().getTerrain()).isBuilding());
    for(const n of ['U3', 'U2', 'D4']){
      const h = hx(n), q = await etage(h, 1);
      const occupant = await poser(piece('8-1'), h);          // un chef déjà au niveau 1
      const sq = await poser(piece('5-4-8 SSsq'), dehors(h));
      leverDeplaces(); await tic();
      deplacer([sq], ...px(h)); await tic();
      const lieuArr = _decrireLieu(lieuDansPile(sq));
      // Monter : passer juste au-dessus du marqueur.
      const s = pile(cle(sq)); deplacerDansPile(sq, s.indexOf(q)); await tic();
      r[n] = `arrivée : ${lieuArr} ; ${msgs(1)}`;
    }
    // Maison à deux niveaux F1-G1 : du niveau 1 de F1 au niveau 1 de G1.
    const qF = await etage(hx('F1'), 1), qG = await etage(hx('G1'), 1);
    const ldr = await poser(piece('8-1'), hx('F1'));               // posé au sommet : niveau 1
    leverDeplaces(); await tic();
    r.F1 = _decrireLieu(lieuDansPile(ldr));
    deplacer([ldr], ...px(hx('G1'))); await tic();
    r.versG1 = msgs(2);
    const s = pile(cle(ldr)); deplacerDansPile(ldr, s.indexOf(qG)); await tic();
    r.remonteG1 = msgs(1);
    // Toit de F1 : depuis le niveau 1, escalier inhérent (B23.8).
    const toit = await etage(hx('G1'), 'toit');
    const s2 = pile(cle(ldr)); deplacerDansPile(ldr, s2.length - 1); await tic();
    r.toitG1 = msgs(1);
    return r;
  });
  console.log(JSON.stringify(r, null, 1), errs.length ? errs : 'sans erreur');
  await b.close();
})();
