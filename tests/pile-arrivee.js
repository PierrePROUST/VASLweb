// Pile d'arrivée : un pion qui entre dans un hexagone déjà occupé garde sa
// sélection. Le glissé suivant — depuis lui ou depuis un pion qui était
// déjà là — n'emporte que lui ; un clic sur la pile, ou Ctrl+clic, ajoute
// des pions au groupe en mouvement.
const {ouvrir} = require('./commun.js');
(async () => {
  const {b, pg, errs, centre, ecran, cmds} = await ouvrir(process.argv[2]);
  const sel = () => pg.evaluate(() => trierParPile([..._sel]).map(p => p.uid).sort());
  // Coin bas gauche : la partie visible d'un pion sous le sommet de la pile.
  const coin = u => pg.evaluate(u => { const r = parUid(u).el.getBoundingClientRect(); return [r.left + 4, r.bottom - 4]; }, u);
  const glisse = async ([x, y], [vx, vy]) => {
    const [tx, ty] = await ecran(vx, vy);
    await pg.mouse.move(x, y); await pg.mouse.down(); await pg.mouse.move(x + 20, y, {steps: 3});
    await pg.mouse.move(tx, ty, {steps: 8}); await pg.mouse.up(); await pg.waitForTimeout(200);
  };
  const partis = async n0 => (await cmds()).slice(n0).filter(c => c.startsWith('M/')).map(c => c.split('/')[1]).sort();
  const out = {};
  let n0;
  // T6, seul en 1300,700, entre dans la pile de six pions en 900,700.
  await pg.mouse.click(...await centre('T6'));
  await glisse(await centre('T6'), [900, 700]);
  out.arrivee = await sel();
  // Il poursuit depuis lui-même : seul T6 part.
  n0 = (await cmds()).length;
  await glisse(await centre('T6'), [900, 900]);
  out.depuisLui = {partis: await partis(n0), sel: await sel()};
  // Retour dans la pile, puis glissé depuis T1, qui y était déjà : seul T6 part.
  await glisse(await centre('T6'), [900, 700]);
  n0 = (await cmds()).length;
  await glisse(await coin('T1'), [700, 900]);
  out.depuisT1 = {partis: await partis(n0), sel: await sel()};
  // Retour, puis Ctrl+clic sur T2 : T2 rejoint le groupe, qui part à deux.
  await glisse(await centre('T6'), [900, 700]);
  await pg.keyboard.down('Control'); await pg.mouse.click(...await coin('T2')); await pg.keyboard.up('Control');
  out.ctrlT2 = await sel();
  n0 = (await cmds()).length;
  await glisse(await centre('T6'), [1300, 900]);
  out.ajout = {partis: await partis(n0), sel: await sel()};
  // Simple clic sur une pile d'arrivée : la pile entière est sélectionnée.
  await glisse(await centre('T6'), [900, 700]);
  await pg.mouse.click(...await coin('T2'));
  out.clicPile = await sel();
  // Pile d'arrivée faite de pions HIP adverses (T4, T5) : invisibles, ils
  // ne repartent pas avec T6, qui en est le seul pion visible.
  const h = await pg.evaluate(() => {
    const a = positionDepot(1100, 760);
    for(const u of ['T4', 'T5']){ const p = parUid(u); p.x = a.x; p.y = a.y; p.cache = true; p.el.style.display = 'none'; }
    rendreToutes(); selectionner([parUid('T6')]);
    return [a.x, a.y];
  });
  await glisse(await centre('T6'), h);
  out.hipArrivee = await pg.evaluate(() => pile(cle(parUid('T6'))).map(p => p.uid));
  n0 = (await cmds()).length;
  await glisse(await centre('T6'), [1300, 900]);
  out.hip = {partis: await partis(n0), restent: await pg.evaluate(h => pile(h.join(',')).map(p => p.uid), h)};
  console.log(JSON.stringify(out), errs);
  await b.close();
})();
