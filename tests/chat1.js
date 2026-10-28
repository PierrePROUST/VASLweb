const {ouvrir} = require('./commun.js');
(async () => {
  const mobile = process.argv[3] === 'mobile';
  const {b, pg, errs, touche} = await ouvrir(process.argv[2], mobile ? {hasTouch: true, isMobile: true, viewport: {width: 360, height: 740}, profil: 'mobile'} : {});
  const out = {};
  if(!mobile){
    await pg.click('#chatIn'); await pg.keyboard.type('Bonjour <toi> & 33B5'); await pg.keyboard.press('Enter');
  } else {
    await pg.evaluate(() => vueMobile('journal'));
    await pg.focus('#chatIn');
    const bt = await pg.evaluate(() => { const r = document.getElementById('chatEnvoi').getBoundingClientRect(); return [r.left + 10, r.top + 10]; });
    out.place = await pg.evaluate(() => document.getElementById('chatIn').placeholder);
    for(const m of ['un', 'deux', 'trois']){
      await pg.keyboard.type(m);
      await touche('touchStart', [[bt[0], bt[1], 1]]); await touche('touchEnd', []);
      await pg.waitForTimeout(100);
    }
    out.focus = await pg.evaluate(() => document.activeElement.id);
    out.saisie = await pg.evaluate(() => document.body.classList.contains('saisie'));
    out.grise = await pg.evaluate(() => document.getElementById('chatEnvoi').disabled);
  }
  out.chat = await pg.evaluate(() => _histo.flatMap(e => e.cmds).filter(c => c.startsWith('CHAT')));
  console.log(JSON.stringify(out), errs);
  await b.close();
})();
