// Étages et fortifications dans le décompte des MF (board 5).
// B27.4 / B27.5 : entrer dans un hexagone puis sous un foxhole, 1 + 1 MF ;
// en sortir, +1 MF. B27.54 : d'une tranchée à la tranchée voisine, 1 MF en
// tout. B23.4 : changer d'étage, 1 MF par niveau (compteur « Building »).
// Undo d'un reclassement.
const nav = require('./navigateur.js');
(async () => {
  const b = await nav.lancer();
  const pg = await (await b.newContext({viewport: {width: 1280, height: 800}})).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await pg.goto('file://' + nav.fichier(process.argv[2] || 'carte.html'));
  const r = await pg.evaluate(async () => {
    await chargerBDD();
    await chargerPartie(['begin_save', 'bd\t0\t0\t05', 'end_save'].join('\x1b'), 'niveaux.vsav', new Map());
    await carteLOS();
    const m = _losPrete;
    const H = m.hexGrid.flat().filter(Boolean);
    const T = h => h.getCenterLocation().getTerrain().getName();
    const px = h => { const c = h.getHexCenter(); return [c.x * _losZoom() + BOARD_MARGIN, c.y * _losZoom() + BOARD_MARGIN]; };
    const tic = () => new Promise(f => setTimeout(f, 20));
    const poser = async (x, h) => { poserDepuisPalette(x, ...px(h)); await tic(); return vivants().slice(-1)[0]; };
    const piece = n => _bdd.pions.find(s => s.n === n);
    const msg = () => _histo.flatMap(e => e.cmds).filter(c => /^CHAT.* : /.test(c)).slice(-1)[0].replace(/^CHAT\* /, '');
    const rang = async (p, q) => { const s = pile(cle(p)); deplacerDansPile(p, s.indexOf(q)); await tic(); };
    const ligne = [];
    let l = null;
    for(const h of H) for(let d = 0; d < 6 && !l; d++){
      const a = m.getAdjacentHex(h, d), c = a && m.getAdjacentHex(a, d), e = c && m.getAdjacentHex(c, d);
      if(e && [h, a, c, e].every(x => T(x) === 'Open Ground' && x.getBaseLevelofHex() === 0)) l = [h, a, c, e];
    }
    const [A, B, C, E] = l;
    const r = {};
    // 1. Foxhole en B : l'escouade entre (1 MF), se glisse dessous (l'entrée
    // passe à 2 MF), puis ressort vers C (1 + 1 MF).
    const fox = await poser(piece('Foxhole'), B);
    const sq = await poser(piece('5-4-8 SSsq'), A);
    deplacer([sq], ...px(B)); await tic(); r.entree = msg();
    await rang(sq, fox); r.dessous = msg();
    r.lieu = _decrireLieu(lieuDansPile(sq));
    annuler(); await tic(); r.undo = `${_decrireLieu(lieuDansPile(sq))}, cumul ${_mvtCumul(sq)}`;
    await rang(sq, fox);
    deplacer([sq], ...px(C)); await tic(); r.sortie = msg();
    // 2. Tranchées reliées : tranchées en C et en E, voisins ; le chef,
    // sous celle de C, passe sous celle de E.
    const t1 = await poser(piece('Trench'), C), t2 = await poser(piece('Trench'), E);
    const ldr = await poser(piece('8-1'), C);
    await rang(ldr, t1);                             // sous la tranchée de C
    leverDeplaces(); await tic();
    deplacer([ldr], ...px(E)); await tic();
    r.versE = msg();
    await rang(ldr, t2); r.relie = msg();
    // 3. Étages : un compteur « Building » réglé au niveau 1 en A ; une
    // escouade au rez-de-chaussée monte dessus.
    leverDeplaces(); await tic();
    const bat = await poser(_bdd.parGpid.get('163'), A);
    const haut = commandesDe(_typeEtEtat(bat.seg).type).cmds.find(c => c.nom === 'Higher');
    for(let i = 0; i < 4; i++) executerTouche(bat, haut.touche);   // Level 3 → toit → cave → rez → niveau 1
    r.compteur = bat.nom + ' = ' + _niveauCompteur(bat);
    const sq2 = await poser(piece('5-4-8 SSsq'), A);
    // Posée, l'escouade tombe au sommet (niveau 1) : on la descend au
    // rez-de-chaussée, puis la phase repart de zéro.
    await rang(sq2, bat); r.rez = _decrireLieu(lieuDansPile(sq2));
    leverDeplaces(); await tic();
    const s = pile(cle(sq2)); deplacerDansPile(sq2, s.length - 1); await tic();
    r.monte = msg();
    annuler(); await tic(); r.undoMonte = `${_decrireLieu(lieuDansPile(sq2))}, cumul ${sq2.mvt ? _mvtCumul(sq2) : '0'}`;
    return r;
  });
  console.log(JSON.stringify(r, null, 1), errs.length ? errs : 'sans erreur');
  await b.close();
})();
