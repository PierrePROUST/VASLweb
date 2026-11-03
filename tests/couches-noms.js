// Couches dont l'image est un nom nu : un pion posé avec un module VASL
// plus ancien nomme « mofan », « mober », « mohro » (Fanatic, Berserk,
// Heroic) sans dossier ni extension. Ces couches doivent se dessiner, et
// se cumuler sur un même pion.
const nav = require('./navigateur.js');
(async () => {
  const b = await nav.lancer();
  const pg = await (await b.newContext({viewport: {width: 1280, height: 800}})).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await pg.goto('file://' + nav.fichier(process.argv[2] || 'VASLweb.html'));
  const r = await pg.evaluate(async () => {
    const bdd = await chargerBDD();
    const def = developperDefinition(bdd.pions.find(s => s.n === '8-1').cmd);
    const T = def.T.map(t => t.replace(/;(mofan|mober|mohro)\.svg;/, ';$1;'));
    const S = def.S.slice();
    S[S.length - 1] = _majPosEtat(S[S.length - 1], 'Main Map', 900, 700);
    await chargerPartie(['begin_save', 'bd\t0\t0\ta', `+/T1/${encoderTraits(T)}/${encoderTraits(S)}`, 'end_save'].join('\x1b'),
                        'couches.vsav', new Map());
    seConnecter(null, true);
    const att = () => new Promise(f => setTimeout(f, 800));
    await att();
    const p = parUid('T1');
    const aplatir = items => items.flatMap(it => it.items ? aplatir(it.items) : [it]);
    const r = {nomsNus: T.filter(t => /;(mofan|mober|mohro);/.test(t)).length};
    const n = () => p.el.querySelectorAll('img.couche').length;
    r.depart = n();
    for(const c of ['Fanatic', 'Berserk', 'Heroic']){
      const it = aplatir(arbreCommandes(p).items).find(i => i.nom === c);
      if(!it){ r[c] = 'commande absente'; continue; }
      lancerCommande(p, it); await att();
      r[c] = n() + ' couche(s)';
    }
    return r;
  });
  console.log(JSON.stringify(r), errs.length ? errs : 'sans erreur');
  await b.close();
})();
