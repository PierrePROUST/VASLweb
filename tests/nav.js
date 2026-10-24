// Téléphone : colonne d'icônes à gauche (Carte, carte sans pions, Pions,
// ALL, Journal, puis toutes les actions de Plus), qui défile au doigt.
const {ouvrir} = require('./commun.js');
(async () => {
  const {b, pg, errs, touche} = await ouvrir(process.argv[2], {hasTouch: true, isMobile: true, viewport: {width: 360, height: 740}, profil: 'mobile'});
  const pos = s => pg.evaluate(s => { const q = document.querySelector(s).getBoundingClientRect(); return [q.left + q.width/2, q.top + q.height/2]; }, s);
  const tap = async s => { const [x, y] = await pos(s); await touche('touchStart', [[x, y, 1]]); await touche('touchEnd', []); await pg.waitForTimeout(200); };
  const out = {icones: await pg.evaluate(() => [...document.querySelectorAll('.navBas .act')].map(e => e.dataset.action)),
               bords0: await pg.evaluate(() => document.querySelector('.navBas').className)};
  await pg.screenshot({path: 'nav0.png', clip: {x: 0, y: 0, width: 120, height: 740}});
  // défilement : un glissé de bas en haut dans la colonne
  const [x, y] = await pos('.navBas');
  await touche('touchStart', [[x, 650, 1]]);
  for(let i = 1; i <= 10; i++) await touche('touchMove', [[x, 650 - 40 * i, 1]]);
  await touche('touchEnd', []); await pg.waitForTimeout(400);
  out.defile = await pg.evaluate(() => [Math.round(document.querySelector('.navBas').scrollTop), document.querySelector('.navBas').className]);
  await pg.screenshot({path: 'nav1.png', clip: {x: 0, y: 0, width: 120, height: 740}});
  out.sansIcone = await pg.evaluate(() => [...document.querySelectorAll('.navBas .act')].filter(e => !e.querySelector('.ic, img, .icPion') || (e.querySelector('.ic') && !e.querySelector('.ic').textContent.trim() && !e.querySelector('.icPion'))).map(e => e.dataset.action));
  // L'élan du défilement s'achève, puis on revient au début.
  await pg.waitForTimeout(1200);
  await pg.evaluate(() => { document.querySelector('.navBas').scrollTop = 0; });
  await pg.waitForTimeout(300);
  // carte sans pions, puis ALL
  const v0 = await pg.evaluate(() => _vueCarte);
  await tap('.navBas [data-action="masquer"]');
  out.masquer = [v0, await pg.evaluate(() => _vueCarte)];
  await tap('.navBas [data-action="all"]'); await pg.waitForTimeout(400);
  out.all = await pg.evaluate(() => { const f = document.querySelector('.feuille .tt'); return f && f.textContent; });
  console.log(JSON.stringify(out), errs);
  await b.close();
})();
