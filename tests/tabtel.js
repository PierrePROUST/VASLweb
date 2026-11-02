// Tablette et téléphone : même disposition (colonne d'icônes à droite, dés
// compris) ; un dé lancé depuis la colonne s'affiche dans l'aperçu du chat,
// sur deux lignes, même quand le filtre Dés le cache dans le journal.
const {ouvrir} = require('./commun.js');
(async () => {
  for(const [profil, w, h] of [['tactile', 360, 740], ['tactile', 1024, 768], ['tactile', 768, 1024]]){
    const {b, pg, errs, touche} = await ouvrir(process.argv[2], {hasTouch: true, isMobile: true, viewport: {width: w, height: h}, profil});
    const tap = async s => { const r = await pg.evaluate(s => { const e = document.querySelector(s); e.scrollIntoView({block: 'nearest'}); const q = e.getBoundingClientRect(); return [q.left + q.width/2, q.top + q.height/2]; }, s); await pg.waitForTimeout(150); await touche('touchStart', [[r[0], r[1], 1]]); await touche('touchEnd', []); await pg.waitForTimeout(200); };
    const out = {profil, w, h};
    out.disposition = await pg.evaluate(() => ({haut: !!document.querySelector('#chromeHaut .barreHaut'), colonne: !!document.querySelector('#chromeGauche nav.navGauche'),
      des: [...document.querySelectorAll('.navGauche .act.de:not([aria-hidden])')].map(e => e.textContent.trim()), rail: !!document.getElementById('rail'), fab: !!document.querySelector('.fabDes')}));
    await pg.evaluate(() => { _filtresChat.delete('jet'); majFiltresChat(); afficherChat('<adv> - salut'); });
    await tap('.navGauche :not([aria-hidden])[data-action="DR_MC"]');
    out.apercu = await pg.evaluate(() => [...document.querySelectorAll('#apercuChat .txt > div')].map(d => (d.className ? '[' + d.className + '] ' : '') + d.textContent));
    out.hauteur = await pg.evaluate(() => document.getElementById('apercuChat').offsetHeight);
    out.carte = await pg.evaluate(() => Math.round(document.getElementById('mapWrap').clientHeight / innerHeight * 100) + '%');
    await pg.screenshot({path: `tabtel_${profil}_${w}.png`});
    console.log(JSON.stringify(out), errs);
    await b.close();
  }
})();
