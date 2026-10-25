// Téléphone : colonne d'icônes à gauche (Carte, carte sans pions, Pions,
// ALL, Journal, Undo, dés, puis toutes les actions de Plus), sans barre en
// haut ; elle défile au doigt sans fin : au-dessus de la première icône
// vient la dernière, et sous la dernière, la première.
const {ouvrir} = require('./commun.js');
(async () => {
  const {b, pg, errs, touche} = await ouvrir(process.argv[2], {hasTouch: true, isMobile: true, viewport: {width: 360, height: 740}, profil: 'mobile'});
  const pos = s => pg.evaluate(s => { const q = document.querySelector(s).getBoundingClientRect(); return [q.left + q.width/2, q.top + q.height/2]; }, s);
  const tap = async s => { const [x, y] = await pos(s); await touche('touchStart', [[x, y, 1]]); await touche('touchEnd', []); await pg.waitForTimeout(200); };
  const vus = () => pg.evaluate(() => { const n = document.querySelector('.navBas'), h = n.getBoundingClientRect();
    return [...n.querySelectorAll('.act')].filter(e => { const r = e.getBoundingClientRect(); return r.bottom > h.top && r.top < h.bottom; }).map(e => e.dataset.action); });
  const out = {barreHaut: await pg.evaluate(() => !!document.querySelector('.barreHaut')),
               icones: await pg.evaluate(() => [...document.querySelectorAll('.navBas .act:not([aria-hidden])')].map(e => e.dataset.action)),
               debut: (await vus()).slice(0, 3)};
  await pg.screenshot({path: 'nav0.png', clip: {x: 0, y: 0, width: 120, height: 740}});
  // vers le haut : un glissé de haut en bas fait apparaître la fin de la liste
  const [x] = await pos('.navBas');
  await touche('touchStart', [[x, 100, 1]]);
  for(let i = 1; i <= 6; i++) await touche('touchMove', [[x, 100 + 40 * i, 1]]);
  await touche('touchEnd', []); await pg.waitForTimeout(1500);
  out.audessus = (await vus()).slice(0, 4);
  await pg.screenshot({path: 'nav1.png', clip: {x: 0, y: 0, width: 120, height: 740}});
  // beaucoup de tours vers le bas : la colonne ne s'arrête jamais
  for(let t = 0; t < 4; t++){
    await touche('touchStart', [[x, 680, 1]]);
    for(let i = 1; i <= 12; i++) await touche('touchMove', [[x, 680 - 50 * i, 1]]);
    await touche('touchEnd', []); await pg.waitForTimeout(800);
  }
  out.apresTours = (await vus()).length > 5;
  out.sansIcone = await pg.evaluate(() => [...document.querySelectorAll('.navBas .act')].filter(e => !e.querySelector('.ic, img, .icPion') || (e.querySelector('.ic') && !e.querySelector('.ic').textContent.trim() && !e.querySelector('.icPion'))).map(e => e.dataset.action));
  await pg.waitForTimeout(1200);
  // carte sans pions, puis ALL (copie lue par les lecteurs d'écran)
  await pg.evaluate(() => document.querySelector('.navBas :not([aria-hidden])[data-action="vueCarte"]').scrollIntoView({block: 'start'}));
  await pg.waitForTimeout(300);
  const v0 = await pg.evaluate(() => _vueCarte);
  await tap('.navBas :not([aria-hidden])[data-action="masquer"]');
  out.masquer = [v0, await pg.evaluate(() => _vueCarte)];
  await tap('.navBas :not([aria-hidden])[data-action="all"]'); await pg.waitForTimeout(400);
  out.all = await pg.evaluate(() => { const f = document.querySelector('.feuille .tt'); return f && f.textContent; });
  console.log(JSON.stringify(out), errs);
  await b.close();
})();
