// Passagers et Riders (D6) : infanterie au-dessus de son véhicule.
// Load (D6.4) : 1 MF, le véhicule garde un quart de ses MP par MF
// restant ; transport sans MF (D6.3) ; Unload (D6.5) : un quart des MP
// du véhicule, l'infanterie paie 1 MF et un MF par quart de MP déjà
// utilisé par le véhicule. Undo, et nouvelle phase avec l'infanterie à bord.
const nav = require('./navigateur.js');
(async () => {
  const b = await nav.lancer();
  const pg = await (await b.newContext({viewport: {width: 1280, height: 800}})).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await pg.goto('file://' + nav.fichier(process.argv[2] || 'VASLweb.html'));
  const r = await pg.evaluate(async () => {
    await chargerBDD();
    await chargerPartie(['begin_save', 'bd\t0\t0\t05', 'end_save'].join('\x1b'), 'transport.vsav', new Map());
    await carteLOS();
    const m = _losPrete;
    const H = m.hexGrid.flat().filter(Boolean);
    const T = h => h.getCenterLocation().getTerrain().getName();
    const px = h => { const c = h.getHexCenter(); return [c.x * _losZoom() + BOARD_MARGIN, c.y * _losZoom() + BOARD_MARGIN]; };
    const tic = () => new Promise(f => setTimeout(f, 20));
    const poser = async (nom, h) => { poserDepuisPalette(_bdd.pions.find(s => s.n === nom), ...px(h)); await tic(); return vivants().slice(-1)[0]; };
    const log = [];
    let vu = 0;
    const nouveaux = () => { const c = _histo.flatMap(e => e.cmds).filter(c => /^CHAT/.test(c)); const n = c.slice(vu); vu = c.length; return n.map(x => x.replace(/^CHAT\* /, '')); };
    const noter = quoi => log.push(quoi + ' → ' + (nouveaux().join(' | ') || '(rien)'));
    const menu = p => arbreCommandes(p).items.map(it => it.nom).filter(n => /^(Load|Unload)$/.test(n)).join() || '—';
    const choisir = async (p, nom) => { lancerCommande(p, arbreCommandes(p).items.find(it => it.nom === nom)); await tic(); };
    // Trois hexagones de terrain ouvert en ligne : A (escouade), V (char), W.
    let l = null;
    for(const h of H) for(let d = 0; d < 6 && !l; d++){
      const a = m.getAdjacentHex(h, d), c = a && m.getAdjacentHex(a, d);
      if(c && [h, a, c].every(x => T(x) === 'Open Ground')) l = [h, a, c];
    }
    const [A, V, W] = l;
    const tk = await poser('T-34 M40', V), sq = await poser('5-4-8 SSsq', A);
    nouveaux();
    deplacer([sq], ...px(V)); await tic(); noter('escouade entre à pied');
    log.push('  menu escouade : ' + menu(sq) + ' ; passagère : ' + _estPassager(sq));
    await choisir(sq, 'Load'); noter('Load');
    log.push('  pile : ' + pile(cle(sq)).map(p => p.nom.split(' ')[0]).join(' < ') + ' ; menu : ' + menu(sq));
    deplacer([tk, sq], ...px(W)); await tic(); noter('char + escouade avancent');
    lancerCommande(tk, arbreCommandes(tk).items.find(it => it.nom === 'Start/Stop')); await tic(); noter('Stop');
    await choisir(sq, 'Unload'); noter('Unload');
    log.push('  pile : ' + pile(cle(sq)).map(p => p.nom.split(' ')[0]).join(' < ') + ' ; menu : ' + menu(sq));
    annuler(); await tic();
    log.push(`Undo de l'Unload → escouade ${_mvtCumul(sq)} MF, char ${_mvtCumul(tk)} MP, passagère : ${_estPassager(sq)}`);
    nouveaux();
    leverDeplaces(); await tic(); nouveaux();
    deplacer([tk, sq], ...px(V)); await tic(); noter('nouvelle phase, char + escouade à bord');
    return log;
  });
  console.log(r.join('\n'));
  console.log(errs.length ? errs : 'sans erreur');
  await b.close();
})();
