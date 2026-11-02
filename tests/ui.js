const {ouvrir} = require('./commun.js');
(async () => {
  const {b, pg, errs} = await ouvrir(process.argv[2]);
  const out = {};
  // menus : Alt seul, flèches, Entrée
  await pg.keyboard.press('Alt'); await pg.waitForTimeout(50);
  out.menuAlt = await pg.evaluate(() => _menuOuvert && _menuOuvert.titre.textContent);
  await pg.keyboard.press('ArrowRight'); await pg.keyboard.press('ArrowRight');
  out.menu3 = await pg.evaluate(() => _menuOuvert && [_menuOuvert.titre.textContent, _menuOuvert.items.map(i => i.textContent)]);
  await pg.screenshot({path: 'menu.png'});
  await pg.keyboard.press('Escape');
  // Ctrl+K n'ouvre plus rien (palette de commandes supprimée)
  await pg.keyboard.press('Control+k'); await pg.waitForTimeout(50);
  out.ctrlK = await pg.evaluate(() => !!document.getElementById('fenCmd'));
  out.n = await pg.evaluate(() => vivants().length);
  // onglet Dés, un jet
  await pg.click('#coteOnglets button[data-onglet="des"]');
  await pg.click('button[data-action="DR_IFT"]');
  out.jet = await pg.evaluate(() => document.getElementById('journal').lastElementChild.textContent.slice(0, 40));
  await pg.screenshot({path: 'des.png'});
  // changement de profil à chaud
  await pg.evaluate(() => { selectionnerPile('900,700'); choisirProfil('tactile'); choisirProfil('pc'); choisirProfil('auto'); });
  out.apresProfil = await pg.evaluate(() => [_sel.size, _profil, document.body.dataset.terminal, vivants().length]);
  console.log(JSON.stringify(out, null, 1), errs);
  await b.close();
})();
