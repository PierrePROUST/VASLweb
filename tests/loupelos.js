// LOS au doigt, en deux temps : le premier appui vise la source avec la
// loupe dès l'appui, posée au relâché ; l'appui suivant vise la cible,
// posée au relâché (fil ancré). Un deuxième doigt pendant une visée
// l'abandonne et pince la carte.
const {ouvrir} = require('./commun.js');
(async () => {
  const [w, h] = [+(process.argv[3] || 800), +(process.argv[4] || 900)];
  const {b, pg, errs, ecran, touche} = await ouvrir(process.argv[2], {hasTouch: true, isMobile: true, viewport: {width: w, height: h}, profil: w < 600 ? 'mobile' : 'tablette'});
  await pg.evaluate(() => armerFil('L'));
  await pg.waitForTimeout(800);
  const etat = () => pg.evaluate(() => { const l = document.getElementById('loupe'); const c = l && l.querySelector('canvas').getBoundingClientRect();
    return {loupe: l && l.textContent, diametre: c && Math.round(c.width), dansEcran: !c || (c.left >= 0 && c.right <= innerWidth && c.top >= 0),
            de: _fil && _fil.de, vers: _fil && _fil.vers, ancre: !!(_fil && _fil.ancre), panneau: !!document.getElementById('panneauFil'), zoom}; });
  const glisse = async (a, z, n = 8) => { for(let i = 1; i <= n; i++){ await touche('touchMove', [[a[0] + (z[0]-a[0])*i/n, a[1] + (z[1]-a[1])*i/n, 1]]); await pg.waitForTimeout(30); } };
  const r = {};
  // 1. Source : appui en C3, glissé jusqu'en D2.
  const s0 = await ecran(800, 760), s1 = await ecran(900, 700);
  await touche('touchStart', [[...s0, 1]]); await pg.waitForTimeout(100);
  r.appuiSource = await etat();
  await glisse(s0, s1); await pg.waitForTimeout(100);
  r.glisseSource = await etat();
  await pg.screenshot({path: `loupelos_source_${w}.png`});
  await touche('touchEnd', [[...s1, 1]]); await pg.waitForTimeout(100);
  r.sourcePosee = await etat();
  // 2. Cible : glissé jusqu'au côté F2/E3.
  const c0 = await ecran(1000, 900), c1 = await ecran(1150, 820);
  await touche('touchStart', [[...c0, 1]]); await glisse(c0, c1); await pg.waitForTimeout(100);
  r.glisseCible = await etat();
  await pg.screenshot({path: `loupelos_cible_${w}.png`});
  await touche('touchEnd', [[...c1, 1]]); await pg.waitForTimeout(100);
  r.ciblePosee = await etat();
  // 3. Pincement pendant une nouvelle visée : la cible d'avant revient.
  const p0 = await ecran(1000, 650), p1 = await ecran(1200, 650);
  await touche('touchStart', [[...p0, 1]]); await pg.waitForTimeout(50);
  await touche('touchStart', [[...p0, 1], [...p1, 2]]);
  for(let i = 1; i <= 5; i++){ await touche('touchMove', [[p0[0] - 20*i, p0[1], 1], [p1[0] + 20*i, p1[1], 2]]); await pg.waitForTimeout(30); }
  await touche('touchEnd', [[p0[0] - 100, p0[1], 1], [p1[0] + 100, p1[1], 2]]); await pg.waitForTimeout(100);
  r.pincement = await etat();
  console.log(JSON.stringify(r, null, 1), errs);
  await b.close();
})();
