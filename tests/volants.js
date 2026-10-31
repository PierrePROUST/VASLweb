// Fenêtres flottantes déplaçables par leur poignée : l'éventail de pile et
// le panneau LOS, au doigt (affichage tactile) puis à la souris (PC).
const {ouvrir} = require('./commun.js');
(async () => {
  const out = {};
  for(const profil of ['tactile', 'pc']){
    const doigt = profil === 'tactile';
    const {b, pg, errs, centre, touche} = await ouvrir(process.argv[2], doigt
      ? {hasTouch: true, isMobile: true, viewport: {width: 800, height: 1000}, profil}
      : {hasTouch: true, viewport: {width: 1280, height: 800}, profil});
    const tap = async (x, y) => { await touche('touchStart', [[x, y, 1]]); await touche('touchEnd', []); await pg.waitForTimeout(150); };
    const glisse = async (x, y, tx, ty) => {
      if(doigt){
        await touche('touchStart', [[x, y, 1]]);
        for(let i = 1; i <= 8; i++) await touche('touchMove', [[x + (tx-x)*i/8, y + (ty-y)*i/8, 1]]);
        // Doigt arrêté avant d'être levé : sinon Chrome lance un « fling »
        // et l'appui suivant ne sert qu'à l'arrêter.
        await pg.waitForTimeout(100);
        await touche('touchEnd', []);
      } else {
        await pg.mouse.move(x, y); await pg.mouse.down();
        for(let i = 1; i <= 8; i++) await pg.mouse.move(x + (tx-x)*i/8, y + (ty-y)*i/8);
        await pg.mouse.up();
      }
      await pg.waitForTimeout(250);
    };
    const pos = sel => pg.evaluate(sel => { const e = document.querySelector(sel); if(!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)]; }, sel);
    const poignee = sel => pg.evaluate(sel => { const r = document.querySelector(sel + ' .poigneeVolant').getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; }, sel);
    const o = out[profil] = {profil: await pg.evaluate(() => _profil)};
    await pg.evaluate(() => { const w = document.getElementById('mapWrap'); w.scrollLeft = 900*SC*zoom - w.clientWidth/2; w.scrollTop = 700*SC*zoom - w.clientHeight/2; });
    // Éventail : un appui au doigt sur la pile (les deux profils).
    let [x, y] = await centre('T9'); await tap(x, y);
    o.ev0 = await pos('#eventail');
    let [px, py] = await poignee('#eventail');
    await glisse(px, py, px - 120, py + 150);
    o.ev1 = await pos('#eventail');
    o.evOuvert = await pg.evaluate(() => !!_eventail);
    // Reconstruit (sélection d'un pion) : il reste où on l'a mis.
    await pg.evaluate(() => majEventail());
    o.ev2 = await pos('#eventail');
    // « Aucun » : plus de pion sélectionné, l'éventail reste ouvert ; « Tout » les reprend.
    const bouton = c => pg.evaluate(c => { const r = document.querySelector('#eventail .' + c).getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; }, c);
    [x, y] = await bouton('aucun'); await tap(x, y);
    o.aucun = await pg.evaluate(() => [_sel.size, !!_eventail, _pileSel, document.querySelectorAll('#eventail .vigEv.sel').length]);
    [x, y] = await bouton('tout'); await tap(x, y);
    o.tout = await pg.evaluate(() => [_sel.size, document.querySelectorAll('#eventail .vigEv.sel').length]);
    // Panneau LOS : fil ancré au doigt.
    await pg.evaluate(() => fermerPile());
    await pg.evaluate(() => armerFil('L'));
    await touche('touchStart', [[200, 400, 1]]);
    for(let i = 1; i <= 8; i++) await touche('touchMove', [[200 + 25*i, 400 + 6*i, 1]]);
    await touche('touchEnd', []);
    await pg.waitForTimeout(1500);
    o.fil0 = await pos('#panneauFil');
    [px, py] = await poignee('#panneauFil');
    await glisse(px, py, px + 60, py + 300);
    o.fil1 = await pos('#panneauFil');
    o.filAncre = await pg.evaluate(() => !!(_fil && _fil.ancre));
    // Nouvelle cible : le panneau se refait sans bouger.
    await tap(500, 250);
    o.fil2 = await pos('#panneauFil');
    o.errs = errs;
    await b.close();
  }
  console.log(JSON.stringify(out, null, 1));
})();
