// Continuité du cumul des MF de l'infanterie (board 5) : une pile
// escouade + chef fait dix pas sur un parcours varié ; à chaque pas, le
// cumul annoncé doit égaler la somme des coûts recalculés hexagone par
// hexagone. En cours de route : une autre unité bouge, un saut de deux
// hexagones, un Undo puis la reprise, et la pile se sépare. Une pile est
// annoncée d'un bloc, au cumul de l'unité qui a le plus dépensé. Mark
// unmoved remet tout à zéro, et Undo rend les cumuls.
const nav = require('./navigateur.js');
(async () => {
  const b = await nav.lancer();
  const pg = await (await b.newContext({viewport: {width: 1280, height: 800}})).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await pg.goto('file://' + nav.fichier(process.argv[2] || 'VASLweb.html'));
  const r = await pg.evaluate(async () => {
    await chargerBDD();
    await chargerPartie(['begin_save', 'bd\t0\t0\t05', 'end_save'].join('\x1b'), 'cumul.vsav', new Map());
    await carteLOS();
    const m = _losPrete;
    const H = m.hexGrid.flat().filter(Boolean);
    const hx = n => H.find(h => h.getName() === n);
    const px = h => { const c = h.getHexCenter(); return [c.x * _losZoom() + BOARD_MARGIN, c.y * _losZoom() + BOARD_MARGIN]; };
    const tic = () => new Promise(f => setTimeout(f, 20));
    const poser = async (nom, h) => { const [x, y] = px(h); poserDepuisPalette(_bdd.pions.find(s => s.n === nom), x, y); await tic(); return vivants().slice(-1)[0]; };
    const aller = async (l, h) => { deplacer(l, ...px(h)); await tic(); };
    const dernier = () => _histo.flatMap(e => e.cmds).filter(c => /^CHAT.*(cumul|M[FP]\/ )/.test(c)).slice(-1)[0].replace(/^CHAT\* /, '');
    const cumulLu = t => (/(?:cumul |M[FP]\/ )([^ )M]+)/.exec(t) || [])[1];
    const fmt = v => _fmtCout(v);
    const inf = {col: 'inf', unite: 'MF'};
    const vois = h => [0, 1, 2, 3, 4, 5].map(s => m.getAdjacentHex(h, s)).filter(Boolean);
    const journal = [], ecarts = [];
    let attendu = 0;
    const verifier = (quoi, ajout, txt) => {
      attendu = _plus(attendu, ajout);
      const lu = cumulLu(txt), ok = lu === fmt(attendu);
      journal.push(`${quoi} : ${txt}${ok ? '' : '  ✘ attendu ' + fmt(attendu)}`);
      if(!ok) ecarts.push(quoi);
    };
    // Parcours : depuis W5, chaque pas va au voisin pas encore visité dont
    // le terrain varie (bois, ravin, route…), en restant praticable.
    const depart = hx('W5');
    const sq = await poser('5-4-8 SSsq', depart), ldr = await poser('8-1', depart);
    const autre = await poser('5-4-8 SSsq', hx('CC6'));
    let h = depart; const vus = new Set([h]);
    for(let i = 0; i < 10; i++){
      const cand = vois(h).filter(v => !vus.has(v) && _estNb(coutEntree(m, h, v, inf).cout));
      if(!cand.length) break;
      cand.sort((u, v) => _cMax(coutEntree(m, h, v, inf).cout) - _cMax(coutEntree(m, h, u, inf).cout));
      const v = cand[i % cand.length];
      const c = coutEntree(m, h, v, inf);
      await aller([sq, ldr], v);
      verifier(`pas ${i + 1} ${h.getName()}→${v.getName()} (${c.lib})`, c.cout, dernier());
      vus.add(v); h = v;
      // Une autre unité bouge entre deux pas : le cumul de la pile n'en dépend pas.
      if(i === 2 && autre){ await aller([autre], vois(hx('CC6'))[0]); journal.push('  (une autre unité a bougé)'); }
      // Undo au pas 5, puis reprise du même pas.
      if(i === 4){
        const c5 = c.cout;
        annuler(); await tic();
        attendu = _plus(attendu, _fois(c5, -1));
        journal.push(`  Undo → cumul ${_mvtCumul(sq)} (attendu ${fmt(attendu)})`);
        if(_mvtCumul(sq) !== fmt(attendu)) ecarts.push('undo');
        await aller([sq, ldr], v);
        verifier(`  reprise ${v.getName()}`, c5, dernier());
      }
    }
    // Saut de deux hexagones : la somme du chemin le moins cher.
    let loin = null;
    for(let d = 0; d < 6 && !loin; d++){
      const a1 = m.getAdjacentHex(h, d), a2 = a1 && m.getAdjacentHex(a1, d);
      if(a2 && !vus.has(a2) && cheminMoinsCher(m, h, a2, inf)) loin = a2;
    }
    const ch = cheminMoinsCher(m, h, loin, inf);
    await aller([sq, ldr], loin);
    verifier(`saut ${h.getName()}→${loin.getName()} par ${ch.length} hexagones`, ch.map(x => x.cout).reduce(_plus, 0), dernier());
    h = loin;
    // La pile se sépare : le chef continue seul, son cumul suit le sien.
    const seul = vois(h).find(v => _estNb(coutEntree(m, h, v, inf).cout));
    const cs = coutEntree(m, h, seul, inf);
    await aller([ldr], seul);
    verifier(`chef seul → ${seul.getName()} (${cs.lib})`, cs.cout, dernier());
    journal.push(`escouade restée : cumul ${_mvtCumul(sq)}`);
    // Une escouade fraîche rejoint le chef : la pile annonce une seule
    // ligne, au cumul de l'unité qui a le plus dépensé (le chef).
    const frais = await poser('5-4-8 SSsq', seul);
    const suite = vois(seul).find(v => _estNb(coutEntree(m, seul, v, inf).cout));
    const cf = coutEntree(m, seul, suite, inf);
    await aller([ldr, frais], suite);
    verifier(`pile chef + escouade fraîche → ${suite.getName()} (${cf.lib})`, cf.cout, dernier());
    journal.push(`escouade fraîche : cumul ${_mvtCumul(frais)}`);
    // Mark unmoved : tout repart de zéro ; Undo rend les cumuls.
    const avantMU = _mvtCumul(ldr);
    leverDeplaces(); await tic();
    journal.push(`Mark unmoved : ${ldr.mvt ? '✘ cumul ' + _mvtCumul(ldr) : 'cumuls remis à zéro'}`);
    if(ldr.mvt) ecarts.push('mark unmoved');
    annuler(); await tic();
    journal.push(`  Undo → chef ${ldr.mvt ? _mvtCumul(ldr) : 'aucun cumul'} (attendu ${avantMU})`);
    if(!ldr.mvt || _mvtCumul(ldr) !== avantMU) ecarts.push('undo mark unmoved');
    leverDeplaces(); await tic();
    const apres = vois(suite).find(v => _estNb(coutEntree(m, suite, v, inf).cout));
    const ca = coutEntree(m, suite, apres, inf);
    attendu = 0;
    await aller([ldr], apres);
    verifier(`nouvelle phase, chef → ${apres.getName()} (${ca.lib})`, ca.cout, dernier());
    return {journal, ecarts};
  });
  console.log(r.journal.join('\n'));
  console.log(r.ecarts.length ? '✘ écarts : ' + r.ecarts.join(', ') : '✔ cumul continu', errs.length ? errs : 'sans erreur');
  await b.close();
})();
