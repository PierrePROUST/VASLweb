const {ouvrir} = require('./commun.js');
(async () => {
  const {b, pg, errs, touche, centre, ecran} = await ouvrir(process.argv[2], {hasTouch: true, isMobile: true, viewport: {width: 360, height: 740}, profil: 'tactile'});
  const pos = sel => pg.evaluate(s => { const q = document.querySelector(s).getBoundingClientRect(); return [q.left + q.width/2, q.top + q.height/2]; }, sel);
  const out = {};
  // 1. ✏ puis un appui sur « Hello » : envoyé tel quel, champ intact
  let [x, y] = await pos('#apercuChat .ecrire'); await touche('touchStart', [[x, y, 1]]); await touche('touchEnd', []); await pg.waitForTimeout(150);
  out.focus = await pg.evaluate(() => [document.activeElement.id, _etatChat]);
  out.pastilles = await pg.evaluate(() => [...document.querySelectorAll('#chatRapide .pastilleChat')].map(b => b.textContent));
  await pg.keyboard.type('brouillon');
  [x, y] = await pos('#chatRapide .phrase'); await touche('touchStart', [[x, y, 1]]); await touche('touchEnd', []); await pg.waitForTimeout(100);
  out.envoye = await pg.evaluate(() => _histo.flatMap(e => e.cmds).filter(c => c.startsWith('CHAT')));
  out.champ = await pg.evaluate(() => document.getElementById('chatIn').value);
  await pg.screenshot({path: 'chat3.png'});
  console.log(JSON.stringify(out), errs);
  await b.close();
})();
