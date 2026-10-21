const {ouvrir} = require('./commun.js');
(async () => {
  const {b, pg, errs, touche, centre, ecran} = await ouvrir(process.argv[2], {hasTouch: true, isMobile: true, viewport: {width: 360, height: 740}, profil: 'mobile'});
  const pos = sel => pg.evaluate(s => { const q = document.querySelector(s).getBoundingClientRect(); return [q.left + q.width/2, q.top + q.height/2]; }, sel);
  const out = {};
  // 1. ✏ puis appui long sur « OK »
  let [x, y] = await pos('#apercuChat .ecrire'); await touche('touchStart', [[x, y, 1]]); await touche('touchEnd', []); await pg.waitForTimeout(150);
  out.focus = await pg.evaluate(() => [document.activeElement.id, _etatChat]);
  out.pastilles = await pg.evaluate(() => [...document.querySelectorAll('#chatRapide .pastilleChat')].map(b => b.textContent));
  [x, y] = await pos('#chatRapide .pastilleChat'); await touche('touchStart', [[x, y, 1]]); await pg.waitForTimeout(650); await touche('touchEnd', []); await pg.waitForTimeout(100);
  out.envoye = await pg.evaluate(() => _histo.flatMap(e => e.cmds).filter(c => c.startsWith('CHAT')));
  out.champ = await pg.evaluate(() => document.getElementById('chatIn').value);
  // 2. lieu de la pile sélectionnée, puis déplacement : le même nom au rapport
  await pg.evaluate(() => { fermerChat(); deplacer(pile('1300,700'), 1080, 820); });
  await pg.evaluate(() => ouvrirChat(false));
  out.lieu = await pg.evaluate(() => document.querySelector('#chatRapide .lieu') && document.querySelector('#chatRapide .lieu').textContent);
  out.rapport = await pg.evaluate(() => [...document.querySelectorAll('#journal .rap')].pop().textContent);
  [x, y] = await pos('#chatRapide .lieu'); await touche('touchStart', [[x, y, 1]]); await touche('touchEnd', []); await pg.waitForTimeout(100);
  out.insere = await pg.evaluate(() => [document.getElementById('chatIn').value, document.activeElement.id]);
  await pg.screenshot({path: 'chat3.png'});
  console.log(JSON.stringify(out), errs);
  await b.close();
})();
