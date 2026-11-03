// Fabrique un .vlog : un T-34 M40 (chenillé, 17 MP) parcourt le board 1
// par tous les terrains qui n'y sont ni des bois ni des bâtiments —
// terrain ouvert, Paved Road, Dirt Road —, en entrant sur la route par un
// côté sans route (B3.2), en la suivant par ses côtés de route (B3.41,
// équipage découvert : ½ MP), puis en la quittant. Il s'oriente vers chaque
// hexagone avant d'y entrer (VCA, D2.11), démarre (D2.12) et s'arrête
// (D2.13) ; une phase finit quand l'arrêt ne tiendrait plus dans ses MP,
// puis Mark unmoved ouvre la suivante.
//   node tests/log-vehicule.js [VASLweb.html] [sortie.vlog]
const nav = require('./navigateur.js');
const fs = require('fs'), path = require('path');
(async () => {
  const sortie = process.argv[3] || path.join(__dirname, '..', 'logs', 'T-34_board1_terrains.vlog');
  const b = await nav.lancer();
  const ctx = await b.newContext({viewport: {width: 1280, height: 800}, acceptDownloads: true});
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await pg.goto('file://' + nav.fichier(process.argv[2] || 'VASLweb.html'));
  const telechargement = pg.waitForEvent('download', {timeout: 120000});
  const r = await pg.evaluate(async () => {
    await chargerBDD();
    await chargerPartie(['begin_save', 'bd\t0\t0\t01', 'end_save'].join('\x1b'), 'board1.vsav', new Map());
    await carteLOS();
    const m = _losPrete, H = m.hexGrid.flat().filter(Boolean);
    const tic = () => new Promise(f => setTimeout(f, 20));
    const T = h => { const t = _autreTerrainMvt(h) || _terrainMvt(h); return t ? t.getName() : 'Open Ground'; };
    const libre = h => /^(Open Ground|Paved Road|Dirt Road)$/.test(T(h));
    const px = h => { const c = h.getHexCenter(); return [c.x * _losZoom() + BOARD_MARGIN, c.y * _losZoom() + BOARD_MARGIN]; };
    const voisins = h => [0, 1, 2, 3, 4, 5].map(s => m.getAdjacentHex(h, s)).filter(Boolean);
    const coteRoute = (a, b) => { const s = _coteVers(m, a, b); const t1 = _coteDe(a, s), t2 = _coteDe(b, (s + 3) % 6); return !!((t1 && t1.isRoad()) || (t2 && t2.isRoad())); };
    const sur = (h, nom) => T(h) === nom;
    // Parcours en largeur sur la route d'un type, par ses côtés de route.
    const lePlusLoin = (h0, nom) => {
      const prec = new Map([[h0, null]]), file = [h0];
      let fin = h0;
      while(file.length){
        const h = file.shift(); fin = h;
        for(const v of voisins(h)) if(!prec.has(v) && sur(v, nom) && coteRoute(h, v)){ prec.set(v, h); file.push(v); }
      }
      const ch = [];
      for(let h = fin; h; h = prec.get(h)) ch.unshift(h);
      return ch;
    };
    // Plus court chemin (en hexagones) par les seuls terrains voulus.
    const relier = (h0, but) => {
      const prec = new Map([[h0, null]]), file = [h0];
      while(file.length){
        const h = file.shift();
        if(but(h)){ const ch = []; for(let x = h; x !== h0; x = prec.get(x)) ch.unshift(x); return ch; }
        for(const v of voisins(h)) if(!prec.has(v) && libre(v)){ prec.set(v, h); file.push(v); }
      }
      return null;
    };
    // Dirt Road : son plus long tronçon, et la Paved Road la plus proche.
    const dirt = H.filter(h => sur(h, 'Dirt Road')).map(h => lePlusLoin(h, 'Dirt Road')).sort((x, y) => y.length - x.length)[0];
    let pFin = null, versDirt = null;
    for(const h of H) if(sur(h, 'Paved Road')){
      const c = relier(h, x => x === dirt[0]);
      if(c && (!versDirt || c.length < versDirt.length)){ pFin = h; versDirt = c; }
    }
    // Paved Road jusqu'à ce point, par la route, depuis un hexagone qu'on
    // peut aborder par un côté sans route après deux terrains ouverts
    // (au moins six hexagones de route quand c'est possible).
    const toute = lePlusLoin(pFin, 'Paved Road').reverse();
    const abord = r => { const o1 = voisins(r).find(v => sur(v, 'Open Ground') && !coteRoute(v, r)
                           && voisins(v).some(w => sur(w, 'Open Ground') && w !== r && !voisins(w).includes(r)));
                         return o1 && [voisins(o1).find(w => sur(w, 'Open Ground') && w !== r && !voisins(w).includes(r)), o1]; };
    let iDeb = -1;
    for(let i = Math.max(0, toute.length - 6); i >= 0 && iDeb < 0; i--) if(abord(toute[i])) iDeb = i;
    for(let i = toute.length - 5; i < toute.length && iDeb < 0; i++) if(i >= 0 && abord(toute[i])) iDeb = i;
    if(iDeb < 0) return {erreur: `pas d'abord hors route sur ${toute.map(h => h.getName())}`};
    const paved = toute.slice(iDeb), [o0, o1] = abord(paved[0]);
    // Sortie : terrain ouvert, par un côté sans route, puis encore un pas.
    const dFin = dirt[dirt.length - 1];
    const s1 = voisins(dFin).find(v => sur(v, 'Open Ground') && !coteRoute(dFin, v));
    const s2 = s1 && voisins(s1).find(v => sur(v, 'Open Ground') && v !== dFin && !voisins(v).includes(dFin));
    const trajet = [o0, o1, ...paved, ...versDirt.slice(0, -1), ...dirt, s1, s2].filter(Boolean);
    if(trajet.some(h => !libre(h))) return {erreur: 'trajet hors des terrains voulus'};

    // Le char au départ, puis le log.
    poserDepuisPalette(_bdd.pions.find(s => s.n === 'T-34 M40'), ...px(o0)); await tic();
    const tk = vivants().slice(-1)[0];
    // Équipage découvert (CE) : ½ MP par un côté de route, 1 MP pour
    // aborder la route par un autre côté (B3.2, B3.41).
    const cmd = nom => commandesDe(_typeEtEtat(tk.seg).type).cmds.find(c => c.nom === nom);
    if(natureMouvement(tk).bu){ executerTouche(tk, cmd('BU').touche); await tic(); }
    const n = natureMouvement(tk), MP = n.mp;
    commencerLog();
    document.getElementById('lgNom').value = 'T-34_board1_terrains';
    document.getElementById('lgOk').click(); await tic();
    const menu = nom => { const t = it => { for(const x of it){ if(x.nom === nom) return x; const f = x.items && t(x.items); if(f) return f; } };
                          return t(arbreCommandes(tk).items); };
    // Facette du VCA vers b : la facette 0 regarde le nord de la carte,
    // chaque cran CA cw tourne de 60° en sens horaire.
    const facette = (a, b) => { const A = a.getHexCenter(), B = b.getHexCenter();
                                const ang = Math.atan2(B.x - A.x, A.y - B.y) * 180 / Math.PI;
                                return ((Math.round(ang / 60) % 6) + 6) % 6; };
    const depense = () => tk.mvt ? _cMax(_mvtSomme(tk)) : 0;
    const enMarche = () => tk.mvt && _etatMvt(tk.mvt.etapes).etat === 'marche';
    let phase = 1;
    const journal = [];
    const rapports = () => _histo.flatMap(e => e.cmds).filter(c => /^CHAT\*/.test(c)).map(c => c.replace(/^CHAT\* /, '').replace(/&gt;/g, '>').replace(/&lt;/g, '<'));
    let vus = rapports().length;
    const noter = () => { const l = rapports(); for(const x of l.slice(vus)) journal.push(x); vus = l.length; };
    for(let i = 1; i < trajet.length; i++){
      const a = trajet[i - 1], h = trajet[i];
      const v = _vcaPion(tk), f = facette(a, h);
      const cw = ((f - v) % 6 + 6) % 6, crans = Math.min(cw, 6 - cw);
      const entree = coutEntree(m, a, h, n).cout;
      const prevu = (enMarche() ? 0 : 1) + crans + _cMax(entree);
      // L'arrêt (1 MP) doit encore tenir dans l'allocation.
      if(depense() + prevu + 1 > MP){
        if(enMarche()){ lancerCommande(tk, menu('Start/Stop')); await tic(); }
        noter();
        leverDeplaces(); await tic();
        noter();
        phase++;
        journal.push(`— phase ${phase} —`);
      }
      for(let k = 0; k < crans; k++){ executerTouche(tk, cmd(cw <= 3 ? 'CA cw' : 'CA ccw').touche); await tic(); }
      deplacer([tk], ...px(h)); await tic();
      noter();
    }
    if(enMarche()){ lancerCommande(tk, menu('Start/Stop')); await tic(); }
    noter();
    terminerLog(); await tic();
    return {trajet: trajet.map(h => `${h.getName()} ${T(h)}`), phases: phase, journal};
  });
  if(r.erreur){ console.log(r.erreur); await b.close(); process.exit(1); }
  fs.mkdirSync(path.dirname(sortie), {recursive: true});
  await (await telechargement).saveAs(sortie);
  fs.writeFileSync(sortie.replace(/\.vlog$/, '.txt'), r.journal.join('\n') + '\n');
  console.log('→ ' + sortie);
  console.log(r.trajet.join(' → '));
  console.log(r.journal.join('\n'));
  console.log(errs.length ? errs : 'sans erreur');
  await b.close();
})();
