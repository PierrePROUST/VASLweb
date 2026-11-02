// « Scenario Info Card » des versions récentes de VASL Tools : un Marker
// sans clé porte « id;nom;date;lieu » (texte encodé deux fois en UTF-8),
// le BasicPiece le gpid « VASLTablesPiece ». La barre se dessine au fond,
// et se cale sur les compteurs Compass et WindDir posés dans ses cases.
const nav = require('./navigateur.js');
(async () => {
  const b = await nav.lancer();
  const pg = await (await b.newContext({viewport: {width: 1280, height: 800}})).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await pg.goto('file://' + nav.fichier(process.argv[2] || 'VASLweb.html'));
  const r = await pg.evaluate(async () => {
    const bdd = await chargerBDD();
    const nom = 'The Bridge of VerdalsÃ\u0083Â¶ra';
    const T = ['immob;g;N;R;', 'mark;', 'piece;;;;Scenario Info Card'];
    const S = ['', `J36;${nom};1940-04-21;VerdalsÃ\u0083Â¶ra`, 'Main Map;900;300;VASLTablesPiece;0'];
    const role = (n, r, x) => {
      const u = developperDefinition(bdd.pions.find(s => s.n === n).cmd);
      const U = u.S.slice();
      U[U.length - 1] = _majPosEtat(U[U.length - 1], 'Main Map', x, 296).replace(/;(\d+);?$/, ';1;VASLTablesRole;' + r);
      return `+/${r}/${encoderTraits(u.T)}/${encoderTraits(U)}`;
    };
    await chargerPartie(['begin_save', 'bd\t0\t0\ta', `+/B1/${encoderTraits(T)}/${encoderTraits(S)}`,
                         role('8-1', 'Compass', 810), role('8-1', 'WindDir', 896), 'end_save'].join('\x1b'),
                        'barre.vsav', new Map());
    await new Promise(f => setTimeout(f, 2000));
    const p = parUid('B1'), q = parUid('Compass');
    return {
      genre: (lirePiece(p.seg).vt || {}).genre, fond: !!p.fond,
      texte: p.el.textContent.includes('J36 The Bridge of Verdalsöra'),
      dessous: +p.el.style.zIndex < +q.el.style.zIndex,
      cale: Math.round(p.decX) + ',' + Math.round(p.decY)
    };
  });
  console.log(JSON.stringify(r), errs.length ? errs : 'sans erreur');
  await b.close();
})();
