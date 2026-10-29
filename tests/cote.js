// Tablette/téléphone : icône ⇄ de la colonne pour la placer à droite (défaut)
// ou à gauche, choix retenu ; « Affichage : PC » dans Plus, pas en icône.
const {ouvrir} = require('./commun.js');
(async () => {
  const {b, pg, errs, touche} = await ouvrir(process.argv[2], {hasTouch: true, isMobile: true, viewport: {width: 360, height: 740}, profil: 'tactile'});
  const S = '';
  const etat = () => pg.evaluate(() => { const r = id => Math.round(document.getElementById(id).getBoundingClientRect().left);
    return [document.body.dataset.colonne, r('chromeGauche'), r('mapWrap'), document.querySelector('.navGauche :not([aria-hidden])[data-action=coteColonne]').title]; });
  const out = {avant: await etat(), sansPc: await pg.evaluate(() => !document.querySelector('.navGauche [data-action=profil_pc]'))};
  await pg.evaluate(() => { const e = document.querySelector('.navGauche :not([aria-hidden])[data-action=coteColonne]'); e.scrollIntoView({block: 'center'}); });
  await pg.waitForTimeout(300);
  const [x, y] = await pg.evaluate(() => { const q = [...document.querySelectorAll('.navGauche [data-action=coteColonne]')].find(e => { const r = e.getBoundingClientRect(); return r.top > 0 && r.bottom < innerHeight; }).getBoundingClientRect(); return [q.left + q.width/2, q.top + q.height/2]; });
  await touche('touchStart', [[x, y, 1]]); await touche('touchEnd', []); await pg.waitForTimeout(300);
  out.apres = await etat();
  out.pref = await pg.evaluate(() => localStorage.getItem('aslweb.colonne'));
  await pg.evaluate(() => { selectionnerPile('900,700'); montrerOnglet('pile'); }); await pg.waitForTimeout(300);
  out.cote = await pg.evaluate(() => { const q = document.getElementById('cote').getBoundingClientRect(); return [Math.round(q.left), Math.round(q.right)]; });
  await pg.screenshot({path: S + 'gauche.png'});
  await pg.evaluate(() => fermerPile && fermerPile());
  await pg.evaluate(() => ouvrirFeuillePlus()); await pg.waitForTimeout(200);
  out.plus = await pg.evaluate(() => [...document.querySelectorAll('.feuille .act.ligne')].map(e => e.dataset.action).slice(-3));
  await pg.reload(); await pg.waitForTimeout(1500);
  out.recharge = await pg.evaluate(() => document.body.dataset.colonne);
  console.log(JSON.stringify(out), errs); await b.close();
})();
