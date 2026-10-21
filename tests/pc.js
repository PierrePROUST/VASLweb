const {ouvrir} = require('./commun.js');
(async () => {
  const {b, pg, errs, centre, ecran, cmds} = await ouvrir(process.argv[2]);
  const etat = () => pg.evaluate(() => ({sel: trierParPile([..._sel]).map(p => p.uid), pile: _pileSel, dep: [..._depliees],
     ordre: pile('900,700').map(p => p.uid), past: [...document.querySelectorAll('.pastille')].map(e => e.textContent)}));
  const out = {};
  // Partie visible d'un pion d'une pile dépliée : son coin bas gauche.
  const visible = u => pg.evaluate(u => { const r = parUid(u).el.getBoundingClientRect(); return [r.left + 4, r.bottom - 4]; }, u);
  let [x, y] = await centre('T8');
  await pg.mouse.dblclick(x, y); await pg.waitForTimeout(100);
  out.dbl = await etat();
  // clic sur le 2e pion (T2) de la pile dépliée
  [x, y] = await visible('T2'); await pg.mouse.click(x, y); out.clicT2 = await etat();
  // Ctrl+clic sur T7
  [x, y] = await visible('T7'); await pg.keyboard.down('Control'); await pg.mouse.click(x, y); await pg.keyboard.up('Control'); out.ctrlT7 = await etat();
  // flèche haut (top) : T2 et T7 au sommet
  await pg.keyboard.press('ArrowUp'); out.top = await etat();
  const n0 = (await cmds()).length;
  // glisser T2 (sélectionné) vers un hexagone : T2 et T7 partent
  [x, y] = await visible('T2'); const [tx, ty] = await ecran(1300, 900);
  await pg.mouse.move(x, y); await pg.mouse.down(); await pg.mouse.move(x+20, y, {steps: 3}); await pg.mouse.move(tx, ty, {steps: 8}); await pg.mouse.up();
  await pg.waitForTimeout(200);
  out.glisse = (await cmds()).slice(n0); out.apres = await etat();
  // Échap : replie puis vide
  await pg.keyboard.press('Escape'); out.esc1 = await etat();
  await pg.keyboard.press('Escape'); out.esc2 = await etat();
  // Maj + rectangle autour de la pile S2
  const [ax, ay] = await ecran(1050, 720), [bx, by] = await ecran(1150, 800);
  await pg.keyboard.down('Shift'); await pg.mouse.move(ax, ay); await pg.mouse.down(); await pg.mouse.move(bx, by, {steps: 5}); await pg.mouse.up(); await pg.keyboard.up('Shift');
  out.lasso = await etat();
  // clic dans le vide
  const [vx, vy] = await ecran(700, 900); await pg.mouse.click(vx, vy); out.vide = await etat();
  console.log(JSON.stringify(out, null, 1), errs);
  await pg.screenshot({path: 'pc.png'});
  await b.close();
})();
