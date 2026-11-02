// Coups d'un .vlog écrit ici : si le D/ « moved » d'un pion finit par
// une contre-oblique (« …;OldMap;Main Map\ »), dernier de son coup, il
// doit être mis entre apostrophes (SequenceEncoder.append), sans quoi
// cette contre-oblique échappe l'ESC qui le suit et, relus, deux
// déplacements ne font plus qu'un coup. (Celle que VASSAL met après
// chaque pièce de la sauvegarde est retirée à l'import : log-etat-depart.js.)
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
    const etat = (uid, px) => {
      const S = def.S.slice();
      S[S.length - 1] = _majPosEtat(S[S.length - 1], 'Main Map', px, 700) + ';OldMap;Main Map\\';
      return encoderTraits(S);
    };
    const type = encoderTraits(def.T);
    const att = () => new Promise(f => setTimeout(f, 300));
    await chargerPartie(['begin_save', 'bd\t0\t0\ta', `+/T1/${type}/${etat('T1', 900)}`,
                         `+/T2/${type}/${etat('T2', 1200)}`, 'end_save'].join('\x1b'), 'coups.vsav', new Map());
    await att();
    _logEnr = []; _logGroupes = []; _logDepart = etatPartie(); _logNom = 'coups.vlog';
    // Trois coups : T1 bouge (D/ moved en dernier), T1 rebouge, T2 bouge.
    deplacer([parUid('T1')], 960, 700); await att();
    deplacer([parUid('T1')], 1020, 700); await att();
    deplacer([parUid('T2')], 1260, 700); await att();
    let texte = null;
    _telecharger = async t => { texte = t; };
    const coups = _nbActions();
    ecrireVlog(); await att();
    await chargerPartie(texte, 'coups.vlog', new Map()); await att();
    const deplacements = _etapes.map(e => e.filter(c => c.startsWith('M/')).length);
    allerLog(_etapes.length); await att();
    return {coupsJoues: coups, coupsRelus: _etapes.length, deplacementsParCoup: deplacements.join(' '),
            arrivee: [parUid('T1').x, parUid('T2').x].join(' ')};
  });
  console.log(JSON.stringify(r), errs.length ? errs : 'sans erreur');
  await b.close();
})();
