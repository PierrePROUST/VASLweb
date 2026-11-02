const {ouvrir} = require('./commun.js');
(async () => {
  const [profil, w, h] = [process.argv[3], +process.argv[4], +process.argv[5]];
  const {b, pg, errs} = await ouvrir(process.argv[2], {hasTouch: true, isMobile: true, viewport: {width: w, height: h}, profil});
  await pg.evaluate(() => selectionnerPile('900,700'));
  await pg.waitForTimeout(300);
  const r = await pg.evaluate(() => { const m = document.getElementById('mapWrap').getBoundingClientRect(); return {profil: _profil, carte: Math.round(m.height / innerHeight * 100) + '%'}; });
  await pg.screenshot({path: `prof_${profil}.png`});
  console.log(JSON.stringify(r), errs);
  await b.close();
})();
