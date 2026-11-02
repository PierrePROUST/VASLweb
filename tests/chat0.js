const {ouvrir} = require('./commun.js');
(async () => {
  const {b, pg, errs} = await ouvrir(process.argv[2], {hasTouch: true, isMobile: true, viewport: {width: 1024, height: 700}});
  const out = {profil0: await pg.evaluate(() => _profil)};
  await pg.evaluate(() => { document.getElementById('bas').classList.remove('replie'); for(let i = 0; i < 40; i++) afficherChat('<adv> - ligne ' + i); });
  await pg.evaluate(() => { const j = document.getElementById('journal'); j.scrollTop = 0; });
  await pg.evaluate(() => afficherChat('<adv> - salut'));
  out.defil = await pg.evaluate(() => [document.getElementById('journal').scrollTop, document.getElementById('nouveauxChat') && document.getElementById('nouveauxChat').textContent]);
  // clavier : la fenêtre passe sous 600 px de haut pendant la saisie
  await pg.focus('#chatIn');
  await pg.setViewportSize({width: 1024, height: 420}); await pg.waitForTimeout(500);
  out.pendant = await pg.evaluate(() => [_profil, document.body.classList.contains('saisie')]);
  await pg.evaluate(() => document.activeElement.blur());
  await pg.setViewportSize({width: 1024, height: 700}); await pg.waitForTimeout(500);
  out.apres = await pg.evaluate(() => _profil);
  console.log(JSON.stringify(out), errs);
  await b.close();
})();
