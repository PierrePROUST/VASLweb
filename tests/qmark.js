// Unités dissimulées sorties d'une pile (A12.15) : l'ancien « ? » suit
// s'il ne couvre plus rien, sinon les partants reçoivent un « ? » neuf.
const {ouvrir} = require('./commun.js');
(async () => {
  const {b, pg, errs} = await ouvrir(process.argv[2] || 'carte.html');
  const r = await pg.evaluate(() => {
    const parUid = u => window.parUidT[u];
    const qm = k => pile(k).filter(p => infoDissimulation(p).compteur).length;
    const masque = u => !!infoDissimulation(parUid(u)).proprio;
    const coiffe = u => { const p = parUid(u), s = pile(cle(p)); return !!_qmarkAuDessus(s, s.indexOf(p), infoDissimulation(p).nation); };
    // Unités posées comme depuis la palette : traits développés, donc
    // porteuses du trait conceal.
    const poser = nom => { poserDepuisPalette(_bdd.pions.find(s => s.n === nom), 1100, 600); return vivants().slice(-1)[0]; };
    const u8 = poser('5-4-8 SSsq'), u9 = poser('5-4-8 SSsq');
    window.parUidT = {T8: u8, T9: u9};
    dissimuler(u9);             // le « ? » posé au sommet coiffe les deux
    const depart = cle(u8);
    const r = {avant: {qDepart: qm(depart), T8: masque('T8'), T9: masque('T9')}};
    // Une seule unité sort : « ? » neuf, l'ancien reste sur T8.
    deplacer([parUid('T9')], 1300, 900);
    r.une = {qDepart: qm(depart), qArrivee: qm(cle(parUid('T9'))), T9: masque('T9') && coiffe('T9'), T8: masque('T8') && coiffe('T8')};
    // La dernière unité coiffée sort : l'ancien « ? » la suit.
    const total = vivants().length;
    deplacer([parUid('T8')], 1500, 900);
    r.derniere = {qDepart: qm(depart), qArrivee: qm(cle(parUid('T8'))), T8: masque('T8') && coiffe('T8'), pionsCrees: vivants().length - total};
    return r;
  });
  console.log(JSON.stringify(r), errs.length ? errs : 'sans erreur');
  await b.close();
})();
