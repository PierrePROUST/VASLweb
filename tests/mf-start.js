// Menu des véhicules : Start / Stop et Reverse, placés avant le
// changement de VCA (D2.12, D2.13, D2.21). Coûts au chat et au log,
// marche arrière ×4 pour un char, changement de sens en marche (arrêt +
// démarrage), Undo d'une commande.
const nav = require('./navigateur.js');
(async () => {
  const b = await nav.lancer();
  const pg = await (await b.newContext({viewport: {width: 1280, height: 800}})).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await pg.goto('file://' + nav.fichier(process.argv[2] || 'carte.html'));
  const r = await pg.evaluate(async () => {
    await chargerBDD();
    await chargerPartie(['begin_save', 'bd\t0\t0\t05', 'end_save'].join('\x1b'), 'start.vsav', new Map());
    await carteLOS();
    const m = _losPrete;
    const H = m.hexGrid.flat().filter(Boolean);
    const T = h => h.getCenterLocation().getTerrain().getName();
    const px = h => { const c = h.getHexCenter(); return [c.x * _losZoom() + BOARD_MARGIN, c.y * _losZoom() + BOARD_MARGIN]; };
    const tic = () => new Promise(f => setTimeout(f, 20));
    const msg = () => _histo.flatMap(e => e.cmds).filter(c => /^CHAT.* : /.test(c)).slice(-1)[0].replace(/^CHAT\* /, '');
    // Trois hexagones de terrain ouvert en ligne.
    let l = null;
    for(const h of H) for(let d = 0; d < 6 && !l; d++){
      const a = m.getAdjacentHex(h, d), c = a && m.getAdjacentHex(a, d);
      if(c && [h, a, c].every(x => T(x) === 'Open Ground')) l = [h, a, c];
    }
    poserDepuisPalette(_bdd.pions.find(s => s.n === 'T-34 M40'), ...px(l[0])); await tic();
    const tk = vivants().slice(-1)[0];
    const aplatir = items => items.flatMap(it => it.items ? [it.nom + ' ▸', ...aplatir(it.items).map(x => '  ' + x)] : [it.nom]);
    const menu = () => aplatir(arbreCommandes(tk).items);
    const choisir = async nom => {
      const trouver = items => { for(const it of items){ if(it.nom === nom) return it; const f = it.items && trouver(it.items); if(f) return f; } };
      lancerCommande(tk, trouver(arbreCommandes(tk).items)); await tic();
    };
    const r = {};
    const mn = menu(), i = mn.findIndex(x => /CA cw/.test(x));
    r.menu = mn.slice(Math.max(0, i - 3), i + 2);
    await choisir('Start (1 MP)');        r.start = msg();
    deplacer([tk], ...px(l[1])); await tic(); r.avance = msg();
    await choisir('Stop (1 MP)');         r.stop = msg();
    annuler(); await tic();               r.undoStop = _mvtCumul(tk) + ' / ' + menu().filter(x => /Start|Stop/.test(x)).join();
    await choisir('Stop (1 MP)');
    await choisir('Reverse (×4)');        r.reverse = msg();
    deplacer([tk], ...px(l[0])); await tic(); r.recul = msg();
    await choisir('Marche avant');        r.sens = msg();
    r.menuFin = menu().filter(x => /Start|Stop|Reverse|Marche/.test(x));
    return r;
  });
  console.log(JSON.stringify(r, null, 1), errs.length ? errs : 'sans erreur');
  await b.close();
})();
