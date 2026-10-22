const {ouvrir} = require('./commun.js');
// SAN, piège et Sniper sur la ligne du jet, comme ASLChatter : annonces
// soulignées après le joueur, SAN ou piège en tête ; pas de SAN sur TK,
// CC, Rally, pas de piège hors TC ; dr SA 1 et 2 (A14.3).
(async () => {
  const {b, pg, errs} = await ouvrir(process.argv[2], {profil: process.argv[3]});
  const r = await pg.evaluate(() => {
    const des = [];
    const vrai = crypto.getRandomValues.bind(crypto);   // dés imposés
    crypto.getRandomValues = t => { if(t instanceof Uint8Array && t.length === 1 && des.length){ t[0] = des.shift() - 1; return t; } return vrai(t); };
    const fixer = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('change')); };
    fixer('sanAxis', '7'); fixer('bbAllied', 'B');
    const ligne = () => { const l = document.getElementById('journal').lastElementChild, s = l.querySelector('.spe'); return s ? [s.textContent, !!s.querySelector('.san')] : null; };
    const o = {};
    des.push(4, 3); lancerDR('IFT'); o.san = ligne();
    des.push(2, 3); lancerDR('IFT'); o.ordinaire = ligne();
    des.push(4, 3); lancerDR('TK'); o.sanTK = ligne();
    des.push(5, 6); lancerDR('TC'); o.piege = ligne();
    des.push(5, 6); lancerDR('IFT'); o.piegeHorsTC = ligne();
    afficherChat('*** (TH DR) 1,6 ***   <Autre>      Axis SAN    [1 / 2   avg   7,00 (7,00)]    (01.02)');
    o.recuTH = ligne();
    des.push(1); lancerdr('SA'); o.sa1 = ligne();
    des.push(2); lancerdr('SA'); o.sa2 = ligne();
    des.push(3); lancerdr('SA'); o.sa3 = ligne();
    return o;
  });
  await pg.screenshot({path: 'alerte.png'});
  console.log(JSON.stringify(r), errs);
  await b.close();
})();
