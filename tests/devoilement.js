// Démasquage par l'adversaire (ObscurableOptions de VASSAL) : Alice
// masque une unité et commence un log en cochant « Permettre à mes
// adversaires de démasquer mes unités ». Le .vlog porte alors la commande
// UNMASK avec son identifiant. Rouvert par Bob, l'unité reste voilée
// (« ? ») et ses commandes refusées, sauf Conceal, qui la démasque ;
// sans la case, Conceal lui est refusé aussi. Un observateur peut cocher
// la case : elle s'applique quand il s'identifie.
const nav = require('./navigateur.js');
(async () => {
  const b = await nav.lancer();
  const pg = await (await b.newContext({viewport: {width: 1280, height: 800}})).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await pg.goto('file://' + nav.fichier(process.argv[2] || 'VASLweb.html'));
  const r = await pg.evaluate(async () => {
    try { localStorage.removeItem('aslweb.OpponentUnmaskable'); } catch(e){}
    const bdd = await chargerBDD();
    const x = bdd.pions.find(s => s.n === '4-6-7 sq') || bdd.pions.find(s => s.n === '5-4-8 SSsq');
    const def = developperDefinition(x.cmd);
    const etat = px => { const S = def.S.slice(); S[S.length - 1] = _majPosEtat(S[S.length - 1], 'Main Map', px, 700); return encoderTraits(S); };
    const type = encoderTraits(def.T);
    const att = () => new Promise(f => setTimeout(f, 300));
    const fermer = () => document.querySelectorAll('.fenetre').forEach(w => w.remove());
    const partie = ['begin_save', 'bd\t0\t0\ta', `+/T1/${type}/${etat(900)}`, `+/T2/${type}/${etat(1200)}`, 'end_save'].join('\x1b');
    let texte = null;
    _telecharger = async t => { texte = t; };

    const ecrire = async coche => {
      await chargerPartie(partie, 'd.vsav', new Map()); await att(); fermer();
      seConnecter({nom: 'Alice', mdp: 'secretA'}, false);
      fixerMasque(parUid('T1'), idJoueur()); await att();
      commencerLog();
      document.getElementById('lgDevoile').checked = coche;
      document.getElementById('lgOk').click();
      deplacer([parUid('T2')], 1260, 700); await att();
      terminerLog(); await att();
      return texte;
    };
    const relire = async t => {
      await chargerPartie(t, 'd.vlog', new Map()); await att(); fermer();
      seConnecter({nom: 'Bob', mdp: 'secretB'}, false); await att();
      const p = parUid('T1');
      const unmask = t.split('\x1b').find(s => s.startsWith('UNMASK\t')) || null;
      const menu = (arbreCommandes(p).items || []).map(i => i.nom).join(',');
      const titre = p.el.title, refuse = accesRefuse(p);
      commander([p], _cmdDemasque(p).touche); await att();
      return {unmask, titre, refuse, menu, demasque: !lirePiece(p.seg).masque};
    };
    // Observateur : la case se coche ; elle vaut dès qu'il s'identifie,
    // pendant le log, et l'état de départ du .vlog porte son identifiant.
    const observateur = async () => {
      try { localStorage.removeItem('aslweb.OpponentUnmaskable'); } catch(e){}
      await chargerPartie(partie, 'd.vsav', new Map()); await att(); fermer();
      seConnecter(null, false);
      commencerLog();
      const c = document.getElementById('lgDevoile');
      const libre = !c.disabled;
      c.click();
      document.getElementById('lgOk').click();
      seConnecter({nom: 'Alice', mdp: 'secretA'}, false);
      fixerMasque(parUid('T1'), idJoueur()); await att();
      deplacer([parUid('T2')], 1260, 700); await att();
      terminerLog(); await att();
      return {libre, coche: c.checked, unmask: texte.split('\x1b').find(s => s.startsWith('UNMASK\t'))};
    };
    return {avec: await relire(await ecrire(true)), sans: await relire(await ecrire(false)), observateur: await observateur()};
  });
  console.log(JSON.stringify(r), errs.length ? errs : 'sans erreur');
  await b.close();
})();
