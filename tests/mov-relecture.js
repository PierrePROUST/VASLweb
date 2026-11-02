// Mark unmoved (bouton MOV) après la relecture d'un .vlog : l'état d'un
// pion VASL finit par une contre-oblique (« …;OldMap;Main Map\ »), que le
// D/ du log écrit juste devant le « / » qui sépare le nouvel état de
// l'ancien. Relu, le pion doit garder un état à autant de traits que son
// type ; MOV ne doit alors lui faire perdre ni son image ni ses couches.
const nav = require('./navigateur.js');
(async () => {
  const b = await nav.lancer();
  const pg = await (await b.newContext({viewport: {width: 1280, height: 800}})).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await pg.goto('file://' + nav.fichier(process.argv[2] || 'carte.html'));
  const r = await pg.evaluate(async () => {
    const bdd = await chargerBDD();
    const x = bdd.pions.find(s => s.n === '4-6-7 sq') || bdd.pions.find(s => s.n === '5-4-8 SSsq');
    const def = developperDefinition(x.cmd);
    const im = def.T.findIndex(t => /^(moved|markmoved);/.test(t));
    const etat = (moved, px) => {
      const S = def.S.slice();
      S[im] = String(moved);
      S[S.length - 1] = _majPosEtat(S[S.length - 1], 'Main Map', px, 700) + ';OldMap;Main Map\\';
      return encoderTraits(S);
    };
    const type = encoderTraits(def.T);
    await chargerPartie(['begin_save', 'bd\t0\t0\ta', `+/T1/${type}/${etat(false, 900)}`, 'end_save',
                         `LOG\tD/T1/${etat(true, 900)}/${etat(false, 900)}`].join('\x1b'), 'mov.vlog', new Map());
    const att = () => new Promise(f => setTimeout(f, 1000));
    await att();
    const p = parUid('T1');
    const voir = () => {
      const te = _typeEtEtat(p.seg);
      return `traits ${decoderTraits(te.etat).length}/${decoderTraits(te.type).length}, `
        + `${lirePiece(p.seg).deplace ? 'moved' : 'unmoved'}, image ${p.face.getAttribute('src') ? 'oui' : 'NON'}`;
    };
    const r = {depart: voir()};
    allerLog(_etapes.length); await att(); r.finLog = voir();
    leverDeplaces(); await att();           r.mov = voir();
    annuler(); await att();                 r.undo = voir();
    return r;
  });
  console.log(JSON.stringify(r, null, 1), errs.length ? errs : 'sans erreur');
  await b.close();
})();
