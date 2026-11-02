// Munitions épuisées d'un véhicule (sous-menu « Depleted Ammo ») : le
// label affiche « $finalammo$ », propriété calculée qui vaut le texte HTML
// « ammoText » quand ShowDepletion vaut 1. Chaque munition épuisée y est
// barrée en rouge ; Toggle On/Off montre ou cache le label.
const nav = require('./navigateur.js');
(async () => {
  const b = await nav.lancer();
  const pg = await (await b.newContext({viewport: {width: 1280, height: 800}})).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await pg.goto('file://' + nav.fichier(process.argv[2] || 'VASLweb.html'));
  const r = await pg.evaluate(async () => {
    await chargerBDD();
    await chargerPartie(['begin_save', 'bd\t0\t0\ta', 'end_save'].join('\x1b'), 'munitions.vsav', new Map());
    seConnecter(null, true);
    const att = () => new Promise(f => setTimeout(f, 600));
    poserDepuisPalette(_bdd.pions.find(x => x.n === 'Sherman III(a)'), 1000, 900); await att();
    const p = vivants().slice(-1)[0];
    const aplatir = items => items.flatMap(it => it.items ? aplatir(it.items) : [it]);
    // Texte du label, chaque munition barrée entre tirets.
    const voir = () => {
      const e = p.el.querySelector('.etiq');
      if(!e) return '(aucun label)';
      const c = e.cloneNode(true);
      c.querySelectorAll('s').forEach(s => { s.textContent = '-' + s.textContent + '-'; });
      return c.textContent.replace(/ /g, ' ').trim();
    };
    const r = {depart: voir()};
    for(const [k, c] of [['affiche', 'Toggle On/Off'], ['smoke', 'Smoke'], ['wp', 'WP'], ['smokeRendu', 'Smoke'], ['cache', 'Toggle On/Off']]){
      const it = aplatir(arbreCommandes(p).items).find(i => i.nom === c);
      if(!it){ r[k] = 'commande absente : ' + c; continue; }
      lancerCommande(p, it); await att();
      r[k] = voir();
    }
    return r;
  });
  console.log(JSON.stringify(r), errs.length ? errs : 'sans erreur');
  await b.close();
})();
