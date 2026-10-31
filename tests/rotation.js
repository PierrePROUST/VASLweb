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
  // Carte de scénario (page HTML) et un chef posé dans une de ses cases :
  // la carte suit la vue tournée, le chef reste dans sa case (son centre,
  // à l'écran, au même point de la carte de scénario).
  out.carte = await pg.evaluate(async () => {
    const T = ['immob;cg;I;R;', 'label;72,715;;10;;0,0,0;c;0;c;0;c;c;$pieceName$;Dialog;0;0;HTML;;false',
               'piece;K;D;;HTML Placeholder'];
    const page = '<html><head><style>table.main{border-collapse:separate;border-spacing:2px}'
      + 'td{height:60px;width:60px;text-align:center;border:1px solid #666}'
      + 'td.americans,td.americanslogo{background-color:#CDF000;height:35px;width:60px;background-size:contain}'
      + 'td.americanslogo{background-image:url(http://asl-players.net/images/nat-logos/americans.png)}'
      + '/* gabarit ----------------------------------------------------------------- */'
      + '</style></head><body style="font-family: Arial;">\\\\\t\\\\\t<table class="main"><tbody><tr>'
      + '<td class="americanslogo" id="player1_logo"></td><td class="americans">ELR: 5</td>'
      + '<td class="reinforce" style="background-image: url(&quot;http://asl-players.net/images/nat-logos/reinforce/free-french-germans.png&quot;);">1</td>'
      + '<td class="turn">2<img src="x" onerror="window.__piege++"><script>window.__piege++</script></td>'
      + '</tr></tbody></table></body></html >';
    const S = ['', page, 'Main Map;900;300;;0'];
    const u = developperDefinition(_bdd.pions.find(s => s.n === '8-1').cmd);
    const U = u.S.slice();
    U[U.length - 1] = _majPosEtat(U[U.length - 1], 'Main Map', 920, 300);
    tournerVue(-_rotVue);
    await chargerPartie(['begin_save', 'bd\t0\t0\ta', `+/H1/${encoderTraits(T)}/${encoderTraits(S)}`,
                         `+/U1/${encoderTraits(u.T)}/${encoderTraits(U)}`, 'end_save'].join('\x1b'), 'page.vsav', new Map());
    await new Promise(f => setTimeout(f, 2000));
    document.querySelectorAll('.fenetre').forEach(f => f.remove());
    // Centre du chef, à l'écran, ramené dans le repère de la carte de
    // scénario telle qu'elle est affichée (fraction de sa largeur et de sa hauteur).
    const rel = () => {
      const h = parUid('H1').el.getBoundingClientRect(), r = parUid('U1').el.getBoundingClientRect();
      const fx = ((r.left + r.right) / 2 - h.left) / h.width, fy = ((r.top + r.bottom) / 2 - h.top) / h.height;
      const [x, y] = {0: [fx, fy], 90: [fy, 1 - fx], 180: [1 - fx, 1 - fy], 270: [1 - fy, fx]}[_rotVue];
      return [+x.toFixed(2), +y.toFixed(2)];
    };
    const r = {};
    for(let i = 0; i < 4; i++){ r[_rotVue] = rel(); tournerVue(90); }
    tournerVue(90);
    r.suit = /^(none|0deg)$/.test(getComputedStyle(parUid('H1').el).rotate) && parUid('H1').el.classList.contains('terrain');
    r.chefDroit = getComputedStyle(parUid('U1').el).rotate;
    return r;
  });
  // Affichage tactile, tables QRDC sous la carte : elles restent droites,
  // sous la carte tournée, et un appui sur elles ne vise pas la carte.
  const t = await ouvrir(process.argv[2], {profil: 'tactile', viewport: {width: 625, height: 1000}, hasTouch: true, isMobile: true});
  await t.pg.waitForTimeout(3000);
  out.tables = await t.pg.evaluate(async () => {
    tournerVue(90); zoomFit();
    const el = document.getElementById('tablesQRDC'), m = document.getElementById('mapInner').getBoundingClientRect();
    if(!el) return null;
    const r = el.getBoundingClientRect();
    return {horsCarte: (el.closest('.sousCarte') || el).parentElement.id, sous: r.top >= m.bottom, vise: clientVersCarte(r.left + 20, r.top + 20, null, true)};
  });
  console.log(JSON.stringify(out), errs, t.errs);
  await t.b.close();
  await b.close();
})();
