// Commandes d'état des barres rapides : Prep Fire, First Fire, Break, Pin
// et Conceal en tête, allumées quand toutes les unités visées sont dans
// l'état ; un appui les y met (un seul Prep Fire pour la pile), un second
// les en sort. Au PC, la barre est en tête du panneau Pile ; au doigt,
// dans la barre de pile.
//   node etat.js [carte.html] [pc|tactile]
const {ouvrir} = require('./commun.js');
(async () => {
  const profil = process.argv[3] || 'pc';
  const {b, pg, errs} = await ouvrir(process.argv[2] || 'carte.html', {profil});
  const r = await pg.evaluate(async () => {
    const attendre = () => new Promise(r => setTimeout(r, 80));
    const poser = nom => { poserDepuisPalette(_bdd.pions.find(s => s.n === nom), 1100, 600); return vivants().slice(-1)[0]; };
    const sq = poser('5-4-8 SSsq'), ch = poser('8-1');
    await attendre();
    const barre = () => document.querySelector(_profil === 'pc' ? '#pile .actionsPile' : '#barrePile');
    const boutons = () => [...barre().querySelectorAll('.cmdRapide')].map(x =>
      (x.getAttribute('aria-label') || x.textContent) + (x.classList.contains('actif') ? ' ●' : x.classList.contains('mixte') ? ' ◐' : ''));
    const appui = async nom => {
      [...barre().querySelectorAll('.cmdRapide')].find(x => (x.getAttribute('aria-label') || x.textContent) === nom).click();
      await attendre();
    };
    const noms = () => pile(cle(sq)).map(p => p.nom).join(' | ');
    const r = {};
    selectionnerPile(cle(sq)); await attendre();
    r.depart = boutons();
    await appui('Prep Fire');
    r.prepFire = {pile: noms(), boutons: boutons()};
    const undo = _histo.length;
    await appui('Prep Fire');
    r.prepFireRetire = {pile: noms(), boutons: boutons(), uneAction: _histo.length - undo === 1};
    // Le chef seul : Pin posé sur lui ; puis toute la pile : Pin à moitié.
    selectionner([ch]); await attendre();
    await appui('Pin');
    selectionnerPile(cle(sq)); await attendre();
    r.pinMixte = {pile: noms(), boutons: boutons()};
    await appui('Pin');
    r.pinTous = {pile: noms(), boutons: boutons()};
    await appui('Pin');
    r.pinRetire = noms();
    selectionner([sq]); await attendre();
    await appui('Break');
    r.break = {nom: sq.nom, boutons: boutons()};
    await appui('Break');
    r.rallie = sq.nom;
    await appui('Conceal');
    r.conceal = {masque: !!infoDissimulation(sq).proprio, boutons: boutons()};
    await appui('Conceal');
    r.demasque = !infoDissimulation(sq).proprio;
    return r;
  });
  console.log(JSON.stringify(r), errs.length ? errs : 'sans erreur');
  await b.close();
})();
