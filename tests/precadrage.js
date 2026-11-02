// Relecture d'un .vlog : le coup est lu avant d'être joué. La vue rejoint
// d'abord la case d'arrivée, le pion n'a pas encore bougé ni le message du
// coup paru au chat ; ils viennent après la pause. Un ▶ pendant la pause
// joue aussitôt le coup en attente.
const nav = require('./navigateur.js');
(async () => {
  const b = await nav.lancer();
  const pg = await (await b.newContext({viewport: {width: 1280, height: 800}})).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await pg.goto('file://' + nav.fichier(process.argv[2] || 'VASLweb.html'));
  const r = await pg.evaluate(async () => {
    const bdd = await chargerBDD();
    const x = bdd.pions.find(s => s.n === '4-6-7 sq') || bdd.pions.find(s => s.n === '5-4-8 SSsq');
    const def = developperDefinition(x.cmd);
    const type = encoderTraits(def.T);
    const S = def.S.slice();
    S[S.length - 1] = _majPosEtat(S[S.length - 1], 'Main Map', 300, 300);
    await chargerPartie(['begin_save', 'bd\t0\t0\ta', `+/T1/${type}/${encoderTraits(S)}`, 'end_save',
                         'LOG\tCHAT&lt;adv&gt; - coup 1', 'LOG\tM/T1/Main Map/2000/1200/null/Main Map/300/300/null/adv',
                         'LOG\tCHAT&lt;adv&gt; - coup 3'].join('\x1b'), 'pre.vlog', new Map());
    const att = ms => new Promise(f => setTimeout(f, ms));
    await att(800);
    allerLog(1);
    const w = document.getElementById('mapWrap');
    const centre = () => [Math.round((w.scrollLeft + w.clientWidth / 2) / zoom / SC), Math.round((w.scrollTop + hauteurVisibleCarte() / 2) / zoom / SC)];
    const dernier = () => [...document.querySelectorAll('#journal .msg')].pop()?.textContent || '';
    const p = parUid('T1');
    const r = {};
    avancerLog();
    r.pendant = {pion: [p.x, p.y], centre: centre(), logPos: _logPos, chat: dernier()};
    await att(700);
    r.apres = {pion: [p.x, p.y], centre: centre(), logPos: _logPos};
    // ▶ pendant la pause : le coup en attente est joué, puis le suivant.
    reculerLog(); allerLog(1); w.scrollLeft = w.scrollTop = 0;
    avancerLog(); avancerLog();
    r.enchaine = {pion: [p.x, p.y], logPos: _logPos, chat: dernier()};
    return r;
  });
  r.ok = r.pendant.pion.join() === '300,300' && r.pendant.logPos === 1 && !/coup 3/.test(r.pendant.chat)
      && Math.abs(r.pendant.centre[0] - 2000) < 5 && Math.abs(r.pendant.centre[1] - 1200) < 5
      && r.apres.pion.join() === '2000,1200' && r.apres.logPos === 2
      && r.enchaine.logPos === 3 && /coup 3/.test(r.enchaine.chat);
  r.errs = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
