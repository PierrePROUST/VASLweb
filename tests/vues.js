const {ouvrir} = require('./commun.js');
(async () => {
  const {b, pg, errs, touche} = await ouvrir(process.argv[2], {hasTouch: true, isMobile: true, viewport: {width: 360, height: 740}, profil: 'mobile'});
  const tap = async sel => { const r = await pg.evaluate(s => { const e = document.querySelector(s).getBoundingClientRect(); return [e.left + e.width/2, e.top + e.height/2]; }, sel); await touche('touchStart', [[r[0], r[1], 1]]); await touche('touchEnd', []); await pg.waitForTimeout(250); };
  await pg.evaluate(() => selectionnerPile('900,700'));
  await tap('.navBas [data-action="vuePile"]'); await pg.screenshot({path: 'v_pile.png'});
  await tap('.navBas [data-action="vuePions"]'); await pg.waitForTimeout(500); await pg.screenshot({path: 'v_pions.png'});
  await tap('.navBas [data-action="vueJournal"]'); await pg.screenshot({path: 'v_journal.png'});
  await tap('.navBas [data-action="plus"]'); await pg.screenshot({path: 'v_plus.png'});
  const plus = await pg.evaluate(() => [...document.querySelectorAll('.feuille .act.ligne .lb')].map(e => e.textContent));
  await pg.evaluate(() => fermerFeuille('feuillePlus'));
  await tap('.navBas [data-action="vueCarte"]');
  // dés : appui court
  await tap('.barreHaut [data-action="desMenu"]');
  const jet = await pg.evaluate(() => document.getElementById('journal').lastElementChild.textContent.slice(0, 20));
  console.log(JSON.stringify({plus, jet}), errs);
  await b.close();
})();
