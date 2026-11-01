// Relecture d'un .vlog et Undo : Undo n'annule que les coups joués ici,
// jamais un coup relu du log (seul ◀ recule la relecture). La colonne
// d'icônes du tactile montre ◀ pendant la relecture.
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
    const type = encoderTraits(def.T);
    const etat = (px, py) => { const S = def.S.slice(); S[S.length - 1] = _majPosEtat(S[S.length - 1], 'Main Map', px, py); return encoderTraits(S); };
    const mv = (id, x1, y1, x0, y0) => `LOG\tM/${id}/Main Map/${x1}/${y1}/null/Main Map/${x0}/${y0}/null/x`;
    await chargerPartie(['begin_save', 'bd\t0\t0\ta', `+/T1/${type}/${etat(300, 300)}`, `+/T2/${type}/${etat(900, 700)}`, 'end_save',
                         mv('T1', 400, 300, 300, 300), mv('T1', 500, 300, 400, 300), mv('T1', 600, 300, 500, 300)].join('\x1b'), 'u.vlog', new Map());
    const att = () => new Promise(f => setTimeout(f, 700));
    await att();
    const t1 = parUid('T1'), t2 = parUid('T2');
    const pos = p => `${p.x},${p.y}`;
    const r = {};
    allerLog(1); await att();
    r.undoSansCoupJoue = `actif ${!!_aAnnuler()}, annuler() → ${annuler()}, coup ${_logPos}, T1 ${pos(t1)}`;
    const avant = pos(t2);
    deplacer([t2], t2.x - 200, t2.y); await att();
    allerLog(2); await att();
    const t1avant = pos(t1);
    annuler(); await att();
    r.undoApresLog = `T2 revient ${pos(t2) === avant}, T1 inchangé ${pos(t1) === t1avant}, coup ${_logPos}`;
    r.undoEncore = `actif ${!!_aAnnuler()}`;
    reculerLog(); await att();
    r.recul = `coup ${_logPos}, T1 ${pos(t1)}`;
    return r;
  });
  await pg.close();
  const {ouvrir} = require('./commun.js');
  const t = await ouvrir(process.argv[2], {hasTouch: true, isMobile: true, viewport: {width: 360, height: 740}, profil: 'tactile'});
  r.rail = await t.pg.evaluate(async () => {
    await chargerPartie(['begin_save', 'bd\t0\t0\ta', 'end_save', 'LOG\tCHAT<x> a', 'LOG\tCHAT<x> b'].join('\x1b'), 'v.vlog', new Map());
    await new Promise(f => setTimeout(f, 500));
    const ico = [...document.querySelectorAll('.navGauche [aria-hidden] ~ *, .navGauche *')].filter(e => e.textContent.trim() === '◀' && e.offsetParent);
    return `◀ visible ${ico.length > 0}`;
  });
  console.log(JSON.stringify(r, null, 1), errs.length ? errs : 'sans erreur');
  await t.b.close(); await b.close();
})();
