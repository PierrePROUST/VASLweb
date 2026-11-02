// Corrections du décompte des MF / MP (eASLRB) :
// C1 route entrée par un côté sans route (B3.2, B3.41), C2 pas de
// démarrage depuis le hors-carte (D2.12), C3 « ALL » d'un véhicule = reste
// de ses MP (B13.41), C4 changements d'élévation abrupts (B10.51), C5
// étage en décombres (B24.2, B24.4), C6 code « D » (B5.42), C7 VCA sur la
// route d'un bois (D2.11), C8 code « L » (lecture de la case), C9
// surempilement (A5.11).
const nav = require('./navigateur.js');
(async () => {
  const b = await nav.lancer();
  const pg = await (await b.newContext({viewport: {width: 1280, height: 800}})).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await pg.goto('file://' + nav.fichier(process.argv[2] || 'VASLweb.html'));
  const r = await pg.evaluate(async () => {
    await chargerBDD();
    const tic = () => new Promise(f => setTimeout(f, 20));
    let m, H;
    const charger = async bd => {
      await chargerPartie(['begin_save', 'bd\t0\t0\t' + bd, 'end_save'].join('\x1b'), bd + '.vsav', new Map());
      await carteLOS(); m = _losPrete; H = m.hexGrid.flat().filter(Boolean);
    };
    const hx = n => H.find(h => h.getName() === n);
    const T = h => h.getCenterLocation().getTerrain().getName();
    const px = h => { const c = h.getHexCenter(); return [c.x * _losZoom() + BOARD_MARGIN, c.y * _losZoom() + BOARD_MARGIN]; };
    const voisins = h => [0, 1, 2, 3, 4, 5].map(s => m.getAdjacentHex(h, s)).filter(Boolean);
    const poser = async (x, h) => { poserDepuisPalette(x, ...px(h)); await tic(); return vivants().slice(-1)[0]; };
    const aller = async (l, h) => { deplacer(l, ...px(h)); await tic(); };
    const msg = () => _histo.flatMap(e => e.cmds).filter(c => /^CHAT.*M[FP]\/ /.test(c)).slice(-1)[0].replace(/^CHAT\* /, '').replace(/&gt;/g, '>');
    const piece = n => _bdd.pions.find(s => s.n === n);
    const parImage = re => _bdd.pions.find(s => re.test(lirePiece(s.cmd.replace(/^\+\/null\//, '+/0/')).img || ''));
    const nat = (col, mp, bu) => ({col, unite: col === 'inf' ? 'MF' : 'MP', mp: mp || null, bu: !!bu});
    const cout = (a, b, n) => _fmtCout(coutEntree(m, hx(a), hx(b), n).cout);
    const cote = (a, b) => { const s = _coteVers(m, a, b); const t1 = _coteDe(a, s), t2 = _coteDe(b, (s + 3) % 6); return (t1 && t1.isRoad()) || (t2 && t2.isRoad()); };
    const r = {};

    // C1 — board 1 : terrain ouvert → route par un côté sans route.
    await charger('01');
    let og = null, rte = null;
    for(const h of H){
      if(!/^(Dirt|Paved) Road$/.test(T(h)) || _autreTerrainMvt(h) || h.isDepressionTerrain()) continue;
      const v = voisins(h).find(v => T(v) === 'Open Ground' && !_autreTerrainMvt(v) && !cote(v, h)
        && v.getBaseLevelofHex() === h.getBaseLevelofHex() && !v.getHexsideTerrain(_coteVers(m, v, h)) && !h.getHexsideTerrain(_coteVers(m, h, v)));
      if(v){ og = v; rte = h; break; }
    }
    const route2 = voisins(rte).find(v => /Road/.test(T(v)) && cote(rte, v) && v.getBaseLevelofHex() === rte.getBaseLevelofHex() && !_autreTerrainMvt(v));
    r.C1 = {de: `${og.getName()} → ${rte.getName()} (${T(rte)})`,
      ft: cout(og.getName(), rte.getName(), nat('ft', 17)), ht: cout(og.getName(), rte.getName(), nat('ht', 15)),
      ac: cout(og.getName(), rte.getName(), nat('ac', 30)), mc: cout(og.getName(), rte.getName(), nat('mc', 30)),
      tr: cout(og.getName(), rte.getName(), nat('tr', 30)), inf: cout(og.getName(), rte.getName(), nat('inf')),
      routeCE: cout(rte.getName(), route2.getName(), nat('ft', 17, false)), routeBU: cout(rte.getName(), route2.getName(), nat('ft', 17, true))};

    // C2 — un char entre depuis le hors-carte dans un terrain ouvert.
    const ogBord = H.filter(h => T(h) === 'Open Ground' && !_autreTerrainMvt(h)).sort((a, b) => a.getHexCenter().y - b.getHexCenter().y)[0];
    const [bx] = px(ogBord);
    poserDepuisPalette(piece('T-34 M40'), bx, BOARD_MARGIN - 150); await tic();
    const tk = vivants().slice(-1)[0];
    await aller([tk], ogBord); r.C2 = msg();

    // C3 — camion de 30 MP : démarrage, trois terrains ouverts, un bois.
    const camion = _bdd.pions.find(s => { const n = natureMouvement({seg: s.cmd.replace(/^\+\/null\//, '+/0/'), nom: s.n}); return n && n.col === 'tr' && n.mp === 30; });
    const tr = nat('tr', 30);
    let l = null;
    for(const h of H) for(let d = 0; d < 6 && !l; d++){
      const c = [h]; for(let k = 0; k < 4 && c[k]; k++) c.push(m.getAdjacentHex(c[k], d));
      if(c.every(Boolean) && T(c[4]) === 'Woods'
         && [1, 2, 3].every(k => coutEntree(m, c[k - 1], c[k], tr).cout === 4)
         && coutEntree(m, c[3], c[4], tr).cout === 30) l = c;
    }
    leverDeplaces(); await tic();
    const cam = await poser(camion, l[0]);
    r.C3 = [];
    for(const h of l.slice(1)){ await aller([cam], h); r.C3.push(msg()); }

    // C9 — board 1, bâtiment F5 : 2 squads et 1 équipage allemands.
    const sqG = parImage(/^ge\/ge\d{3}S/), hsG = parImage(/^ge\/ge\d{3}H/), crG = parImage(/^ge\/ge\d{3}C/);
    const F5 = hx('F5'), F6 = voisins(F5).find(v => T(v) === 'Open Ground' || /Road/.test(T(v)));
    for(const x of [sqG, sqG, crG]) await poser(x, F5);
    leverDeplaces(); await tic();
    const entrant = await poser(sqG, F6);
    await aller([entrant], F5); r.C9squad = `${sqG.n} ${F6.getName()} → F5 : ${msg()}`;
    annuler(); await tic(); annuler(); await tic();
    const hs = await poser(hsG, F6);
    await aller([hs], F5); r.C9hs = `${hsG.n} ${F6.getName()} → F5 : ${msg()}`;
    r.C9equiv = [sqG, hsG, crG].map(x => `${x.n} = ${_equivSquad({seg: x.cmd.replace(/^\+\/null\//, '+/0/')})}`).join(', ');

    // C4 — boards 15 et 13 : exemples de B10.51.
    await charger('15');
    const inf = nat('inf'), ft = nat('ft', 17, true);
    r.C4 = {R3R4: cout('R3', 'R4', inf), R4R3: cout('R4', 'R3', inf), Y9X9: cout('Y9', 'X9', inf), BB8AA9: cout('BB8', 'AA9', inf)};
    await charger('13');
    Object.assign(r.C4, {L6L5: cout('L6', 'L5', ft), L5L6: cout('L5', 'L6', ft)});

    // C6 — board 13 : char CE entrant par la route sur la route surélevée,
    // une épave dans l'hexagone : (1 × 2) × 2 + coût de la route.
    let el = null, avant = null;
    for(const h of H){
      if(T(h) !== 'Elevated Road') continue;
      const v = voisins(h).find(v => cote(v, h) && /Road/.test(T(v)));
      if(v){ el = h; avant = v; break; }
    }
    const ce = nat('ft', 17, false);
    r.C6 = {hex: `${avant.getName()} (${T(avant)}) → ${el.getName()}`, case: _casesTEC('ETO:Road-Elevated', 'ft'),
            sansEpave: cout(avant.getName(), el.getName(), ce), codeD: coutEntree(m, avant, el, ce).d};
    const t34 = await poser(piece('T-34 M40'), avant);
    const ceCmd = commandesDe(_typeEtEtat(t34.seg).type).cmds.find(c => /^CE$|Unbutton|CE/.test(c.nom));
    if(ceCmd && natureMouvement(t34).bu) executerTouche(t34, ceCmd.touche);
    await poser(piece('Wreck'), el);
    leverDeplaces(); await tic();
    await aller([t34], el); r.C6.avecEpave = msg();
    const cmd = nom => commandesDe(_typeEtEtat(t34.seg).type).cmds.find(c => c.nom === nom);
    executerTouche(t34, cmd('CA cw').touche); await tic(); r.C6.vca = msg();

    // C7 — board 19 : char sur la route de X1 (bois), un hexspine : 1 MP.
    await charger('19');
    const X1 = hx('X1'), vX = voisins(X1).find(v => cote(v, X1));
    const t2 = await poser(piece('T-34 M40'), vX);
    leverDeplaces(); await tic();
    await aller([t2], X1); r.C7 = {entree: msg()};
    const cmd2 = nom => commandesDe(_typeEtEtat(t2.seg).type).cmds.find(c => c.nom === nom);
    executerTouche(t2, cmd2('CA cw').touche); await tic(); r.C7.vca = msg();

    // C5 — board 20 : décombres au niveau 1 de H2 (compteur d'étage au
    // niveau 1, pion de décombres dessus).
    await charger('20');
    const H2 = hx('H2');
    const bat = await poser(_bdd.parGpid.get('163'), H2);
    const haut = commandesDe(_typeEtEtat(bat.seg).type).cmds.find(c => c.nom === 'Higher');
    for(let i = 0; i < 4; i++) executerTouche(bat, haut.touche);
    const rub = await poser(piece('Stone Rubble') || piece('Rubble'), H2);
    deplacerDansPile(rub, pile(cle(bat)).indexOf(bat) + 1); await tic();
    r.C5 = {etage: _niveauCompteur(bat), decombres: _niveauDecombres(H2, pile(cle(bat)))};
    for(const n of ['I2', 'G3', 'H3', 'I3']){
      leverDeplaces(); await tic();
      const q = await poser(sqG, hx(n));
      await aller([q], H2);
      r.C5[n] = msg();
      annuler(); await tic(); annuler(); await tic();
    }
    // Escalier depuis puis vers l'étage en décombres (B24.4) : posée,
    // l'escouade est au niveau 1 ; elle descend, puis remonte.
    const q = await poser(sqG, H2);
    leverDeplaces(); await tic();
    deplacerDansPile(q, 0); await tic();
    r.C5.descente = `${_decrireLieu(lieuDansPile(q))} : ${msg()}`;
    leverDeplaces(); await tic();
    deplacerDansPile(q, pile(cle(q)).length - 1); await tic();
    r.C5.montee = `${_decrireLieu(lieuDansPile(q))} : ${msg()}`;

    // C8 — code « L » lu dans les cases du remblai.
    r.C8 = ['ft', 'tr', 'inf'].map(c => `${c} ${_casesTEC('ETO:Railroads-EmRR (D)', c)} → L ${_codeTEC(_casesTEC('ETO:Railroads-EmRR (D)', c), 'L')}`).join(' ; ');
    r.D = ['ETO:Woods', 'ETO:Road-Sunken', 'ETO:Road', 'PTO:Dense Jungle dmn', 'ETO:Open Ground'].map(x => `${x} ${_codeTEC(_casesTEC(x, 'ft'), 'D')}`).join(' ; ');
    return r;
  });
  console.log(JSON.stringify(r, null, 1), errs.length ? errs : 'sans erreur');
  await b.close();
})();
