// Rotation de l'affichage de la carte (0, 90, 180, 270°) : le point visé
// à l'écran reste le bon hexagone, un pion glissé arrive où on le lâche,
// le rectangle Maj prend la pile qu'il entoure, les pions restent droits.
const {ouvrir} = require('./commun.js');
(async () => {
  const {b, pg, errs, centre, cmds} = await ouvrir(process.argv[2]);
  // Point de la carte (pixels natifs) → point de l'écran, vue tournée.
  const ecran = (x, y) => pg.evaluate(([x, y]) => {
    const r = document.getElementById('mapInner').getBoundingClientRect(), v = _carteVersVue(x * SC, y * SC);
    return [r.left + v.x * zoom, r.top + v.y * zoom];
  }, [x, y]);
  const voir = (x, y) => pg.evaluate(([x, y]) => cadrerSur([{x, y}]), [x, y]);
  const out = {};
  for(const pas of [0, 90, 90, 90]){
    await pg.evaluate(p => { if(p) tournerVue(p); }, pas);
    await pg.waitForTimeout(300);
    const rot = await pg.evaluate(() => _rotVue);
    const r = out[rot] = {};
    await voir(1100, 760);
    await pg.waitForTimeout(200);
    // Le centre du pion T4, à l'écran, ramené sur la carte.
    const [cx, cy] = await centre('T4');
    r.vise = await pg.evaluate(([x, y]) => { const c = clientVersCarte(x, y, null, true); return [Math.round(c.x), Math.round(c.y)]; }, [cx, cy]);
    r.rotPion = await pg.evaluate(() => getComputedStyle(parUid('T4').el).rotate);
    // Glisser la pile S2 vers (1300, 900) puis la remettre.
    const n0 = (await cmds()).length;
    const [tx, ty] = await ecran(1300, 900);
    await pg.mouse.move(cx, cy); await pg.mouse.down(); await pg.mouse.move(cx + 20, cy, {steps: 3});
    await pg.mouse.move(tx, ty, {steps: 8}); await pg.mouse.up();
    await pg.waitForTimeout(200);
    r.glisse = (await cmds()).slice(n0).length;
    r.arrivee = await pg.evaluate(() => [parUid('T4').x, parUid('T4').y]);
    await pg.keyboard.press('Control+z'); await pg.waitForTimeout(200);
    r.retour = await pg.evaluate(() => [parUid('T4').x, parUid('T4').y]);
    // Maj + rectangle autour de la pile S2.
    await pg.keyboard.press('Escape'); await pg.keyboard.press('Escape');
    const [ax, ay] = await ecran(1050, 720), [bx, by] = await ecran(1150, 800);
    await pg.keyboard.down('Shift'); await pg.mouse.move(ax, ay); await pg.mouse.down();
    await pg.mouse.move(bx, by, {steps: 5}); await pg.mouse.up(); await pg.keyboard.up('Shift');
    r.lasso = await pg.evaluate(() => [..._sel].map(p => p.uid).sort());
    await pg.keyboard.press('Escape'); await pg.keyboard.press('Escape');
    await pg.screenshot({path: `rotation-${rot}.png`});
  }
  // Affichage tactile, tables QRDC sous la carte : elles restent droites,
  // sous la carte tournée, et un appui sur elles ne vise pas la carte.
  const t = await ouvrir(process.argv[2], {profil: 'tactile', viewport: {width: 625, height: 1000}, hasTouch: true, isMobile: true});
  await t.pg.waitForTimeout(3000);
  out.tables = await t.pg.evaluate(async () => {
    tournerVue(90); zoomFit();
    const el = document.getElementById('tablesQRDC'), m = document.getElementById('mapInner').getBoundingClientRect();
    if(!el) return null;
    const r = el.getBoundingClientRect();
    return {horsCarte: el.parentElement.id, sous: r.top >= m.bottom, vise: clientVersCarte(r.left + 20, r.top + 20, null, true)};
  });
  console.log(JSON.stringify(out), errs, t.errs);
  await t.b.close();
  await b.close();
})();
