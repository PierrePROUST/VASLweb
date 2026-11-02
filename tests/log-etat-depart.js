// D/ d'un pion de la sauvegarde, écrit dans un .vlog : VASSAL fait suivre
// chaque pièce de l'état de départ d'une contre-oblique, qui échappe l'ESC
// suivant. Elle n'est pas à l'état du pion : gardée, elle finissait le
// nouvel état du D/ (« …;OldMap;Main Map\/ancien »), et VASSAL, qui y lit
// un « / » échappé, collait l'ancien état au nouveau (ChangePiece sans
// ancien état, état du pion qui enfle à chaque coup).
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
    const S = def.S.slice();
    S[S.length - 1] = _majPosEtat(S[S.length - 1], 'Main Map', 900, 700) + ';OldMap;Main Map';
    const seg = `+/T1/${encoderTraits(def.T)}/${encoderTraits(S)}`;
    const att = () => new Promise(f => setTimeout(f, 300));
    await chargerPartie(['begin_save', '', '\\', 'bd\t0\t0\ta\\', seg + '\\', 'end_save'].join('\x1b'), 'depart.vsav', new Map());
    await att();
    _logEnr = []; _logGroupes = []; _logDepart = etatPartie(); _logNom = 'depart.vlog';
    deplacer([parUid('T1')], 960, 700); await att();
    marquerDeplace(parUid('T1'), false); await att();
    let texte = null;
    _telecharger = async t => { texte = t; };
    ecrireVlog(); await att();
    const segs = texte.split('\x1b');
    const cmds = _decoupeSeq(segs.slice(segs.indexOf('end_save') + 1).join('\x1b'), '\x1b').flatMap(_commandesLog);
    // SequenceEncoder.Decoder de VASSAL : id, nouvel état, ancien état.
    const D = cmds.filter(c => c.startsWith('D/')).map(c => _decoupeSeq(c.substring(2), '/'));
    return {D: D.length, champs: D.map(t => t.length).join(' '),
            ancienEtat: D.map(t => /;OldMap;Main Map$/.test(t[2] || '') ? 'oui' : 'non').join(' ')};
  });
  console.log(JSON.stringify(r), errs.length ? errs : 'sans erreur');
  await b.close();
})();
