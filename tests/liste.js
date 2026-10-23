// Liste de la pile sur un écran de téléphone (profil téléphone, et profil PC
// sur écran étroit) : un appui sur la carte la ferme, la croix rouge aussi.
const {ouvrir} = require('./commun.js');
(async () => {
  for(const profil of ['mobile', 'pc']){
    const {b, pg, errs, centre} = await ouvrir(process.argv[2], {hasTouch: true, isMobile: true, viewport: {width: 360, height: 740}, profil});
    const vis = () => pg.evaluate(() => { const c = document.getElementById('cote'); return getComputedStyle(c).display !== 'none' && c.getBoundingClientRect().height > 0; });
    const [x, y] = await centre('T9');
    await pg.touchscreen.tap(x, y); await pg.waitForTimeout(300);
    await pg.evaluate(() => montrerOnglet('pile')); await pg.waitForTimeout(300);
    const r = {profil, ouverte: await vis(), croix: await pg.evaluate(() => { const f = document.querySelector('#coteOnglets .fermeCote'); return !!f && f.getBoundingClientRect().width > 0; })};
    await pg.screenshot({path: `liste_${profil}.png`});
    r.sous = await pg.evaluate(() => { const e = document.elementFromPoint(20, 300); const ch = []; for(let x = e; x && ch.length < 6; x = x.parentElement) ch.push(x.tagName + (x.id ? '#' + x.id : '') + (typeof x.className === 'string' && x.className ? '.' + x.className.split(' ')[0] : '')); return ch.join(' < '); });
    await pg.touchscreen.tap(20, 300); await pg.waitForTimeout(300);
    r.apresAppuiCarte = await vis();
    await pg.evaluate(() => montrerOnglet('pile')); await pg.waitForTimeout(300);
    const c = await pg.evaluate(() => { const f = document.querySelector('#coteOnglets .fermeCote').getBoundingClientRect(); return [f.left + f.width/2, f.top + f.height/2, f.width]; });
    await pg.touchscreen.tap(c[0], c[1]); await pg.waitForTimeout(300);
    r.apresCroix = [await vis(), c[2]];
    console.log(JSON.stringify(r), errs);
    await b.close();
  }
})();
