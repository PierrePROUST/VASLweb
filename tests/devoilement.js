// Dévoilement autorisé : un joueur masque une unité, commence un log en
// cochant « Autoriser l'adversaire à dévoiler… », joue un coup et écrit
// le .vlog. Rouvert par un autre joueur, le fichier lui montre l'unité et
// la lui laisse démasquer ; sans la case, elle reste voilée.
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
    const etat = px => { const S = def.S.slice(); S[S.length - 1] = _majPosEtat(S[S.length - 1], 'Main Map', px, 700); return encoderTraits(S); };
    const type = encoderTraits(def.T);
    const att = () => new Promise(f => setTimeout(f, 300));
    const fermer = () => document.querySelectorAll('.fenetre').forEach(w => w.remove());
    const partie = ['begin_save', 'bd\t0\t0\ta', `+/T1/${type}/${etat(900)}`, `+/T2/${type}/${etat(1200)}`, 'end_save'].join('\x1b');
    let texte = null, annexes = null;
    _telecharger = async (t, n, a) => { texte = t; annexes = a; };

    const ecrire = async coche => {
      await chargerPartie(partie, 'd.vsav', new Map()); await att(); fermer();
      seConnecter({nom: 'Alice', mdp: 'secretA'}, false);
      fixerMasque(parUid('T1'), idJoueur()); await att();
      commencerLog();
      document.getElementById('lgDevoile').checked = coche;
      document.getElementById('lgOk').click();
      deplacer([parUid('T2')], 1260, 700); await att();
      terminerLog(); await att();
      return {texte, annexes: new Map(annexes)};
    };
    const relire = async f => {
      await chargerPartie(f.texte, 'd.vlog', f.annexes); await att(); fermer();
      seConnecter({nom: 'Bob', mdp: 'secretB'}, false); await att();
      const p = parUid('T1');
      const vu = p.el.title, refuse = accesRefuse(p);
      dissimuler(p); await att();
      return {annexe: f.annexes.has('aslweb-devoilement'), titre: vu, refuse, demasque: !lirePiece(p.seg).masque};
    };
    return {avec: await relire(await ecrire(true)), sans: await relire(await ecrire(false))};
  });
  console.log(JSON.stringify(r), errs.length ? errs : 'sans erreur');
  await b.close();
})();
