const {ouvrir} = require('./commun.js');
// Alerte SAN / piège : bandeau sur la carte, ligne du journal marquée,
// rien sur un jet ordinaire, ni pendant un saut dans le log, ni une fois
// l'option décochée.
(async () => {
  const {b, pg, errs} = await ouvrir(process.argv[2], {profil: process.argv[3]});
  const r = await pg.evaluate(() => {
    const des = [];
    const vrai = crypto.getRandomValues.bind(crypto);   // dés imposés
    crypto.getRandomValues = t => { if(t instanceof Uint8Array && t.length === 1 && des.length){ t[0] = des.shift() - 1; return t; } return vrai(t); };
    const fixer = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('change')); };
    fixer('sanAxis', '7'); fixer('bbAllied', 'B');
    const etat = () => { const a = document.getElementById('alerteJetCarte'); return a ? a.textContent.replace('✕', '') : null; };
    const derniere = () => document.getElementById('journal').lastElementChild.classList.contains('alerteJet');
    const o = {};
    des.push(4, 3); lancerDR('IFT'); o.san = [etat(), derniere()];
    fermerAlerteJet();
    des.push(2, 3); lancerDR('IFT'); o.ordinaire = [etat(), derniere()];
    des.push(4, 3); lancerDR('TK'); o.sanTK = [etat(), derniere()];
    des.push(5, 6); lancerDR('TC'); o.piege = [etat(), derniere()];
    fermerAlerteJet();
    des.push(5, 6); lancerDR('IFT'); o.piegeHorsTC = [etat(), derniere()];
    afficherChat('*** (MC DR) 1,6 ***   <Autre>      Axis SAN    [1 / 2   avg   7,00 (7,00)]    (01.02)');
    o.recu = [etat(), derniere()];
    fermerAlerteJet();
    _rendreDiffere = true; des.push(4, 3); lancerDR('IFT'); _rendreDiffere = false;
    o.saut = [etat(), derniere()];
    const c = document.getElementById('alerteJet'); c.checked = false; c.dispatchEvent(new Event('change'));
    des.push(4, 3); lancerDR('IFT'); o.decoche = [etat(), derniere(), localStorage.getItem('aslweb.alerteJet')];
    c.checked = true; c.dispatchEvent(new Event('change'));
    des.push(4, 3); lancerDR('IFT');
    return o;
  });
  await pg.screenshot({path: 'alerte.png'});
  console.log(JSON.stringify(r), errs);
  await b.close();
})();
