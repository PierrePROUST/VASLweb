// Bois traversés par une route ou un chemin. A4.132 : par un côté de
// route, l'infanterie paie la route ou l'autre terrain, à son choix (5I4 :
// 1 ou 2 MF) ; un véhicule prend la route. B13.4 : par un autre côté, le
// bois (2 MF). B13.6 : par un côté de chemin, 1 MF dans un bois ou des
// broussailles (24W8) ; un hexagone de bois traversé d'un chemin reste un
// bois (24W7, 24W6), même si la carte LOS met le chemin au centre.
const nav = require('./navigateur.js');
(async () => {
  const b = await nav.lancer();
  const out = [];
  for(const [bd, paires] of [['05', ['H4>I4', 'H3>I4', 'I4>H4']], ['24', ['V7>W7', 'X8>W8', 'W9>W8', 'V6>W6']]]){
    const pg = await (await b.newContext()).newPage();
    pg.on('pageerror', e => out.push('PAGEERROR ' + e.message));
    await pg.goto('file://' + nav.fichier(process.argv[2] || 'VASLweb.html'));
    out.push(...await pg.evaluate(async ([bd, paires]) => {
      await chargerBDD();
      await chargerPartie(['begin_save', 'bd\t0\t0\t' + bd, 'end_save'].join('\x1b'), 'route.vsav', new Map());
      await carteLOS(); const m = _losPrete;
      const H = m.hexGrid.flat().filter(Boolean), hx = n => H.find(h => h.getName() === n);
      return paires.map(p => {
        const [a, c] = p.split('>');
        const inf = coutEntree(m, hx(a), hx(c), {col: 'inf', unite: 'MF'});
        const ft = coutEntree(m, hx(a), hx(c), {col: 'ft', unite: 'MP', mp: 17});
        return `${bd}${a}→${c} : infanterie ${_fmtCout(inf.cout)} MF (${inf.lib}) ; chenillé de 17 MP ${_fmtCout(ft.cout)} MP`;
      });
    }, [bd, paires]));
  }
  console.log(out.join('\n'));
  await b.close();
})();
