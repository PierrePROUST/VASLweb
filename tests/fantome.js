// Fantôme du glissé : un char dont on a tourné le CA et la tourelle se
// glisse avec son orientation et sa tourelle, pas avec son image droite.
const {ouvrir} = require('./commun.js');
(async () => {
  const {b, pg, errs} = await ouvrir(process.argv[2]);
  const tic = () => pg.waitForTimeout(300);
  await pg.evaluate(async () => {
    poserDepuisPalette(_bdd.pions.find(s => s.n === 'T-34 M40'), 1000, 760);
  });
  await tic();
  await pg.evaluate(async () => {
    const tk = vivants().slice(-1)[0];
    const cmds = commandesDe(_typeEtEtat(tk.seg).type).cmds;
    const touche = nom => (cmds.find(c => c.nom === nom) || {}).touche;
    window.__noms = cmds.map(c => c.nom);
    for(const n of ['CA cw', 'CA cw']) executerTouche(tk, touche(n));
    for(const n of cmds.filter(c => /TCA cw|Turret.*cw/i.test(c.nom)).slice(0, 1)) executerTouche(tk, n.touche);
  });
  await pg.waitForTimeout(800);
  const [cx, cy] = await pg.evaluate(() => { const tk = vivants().slice(-1)[0]; cadrerSur([tk]); return [0, 0]; });
  await tic();
  const c = await pg.evaluate(() => { const r = vivants().slice(-1)[0].face.getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; });
  await pg.mouse.move(c[0], c[1]); await pg.mouse.down(); await pg.mouse.move(c[0] + 60, c[1] + 40, {steps: 5});
  await tic();
  const r = await pg.evaluate(() => {
    const tk = vivants().slice(-1)[0], f = document.querySelector('.fantome');
    return {tag: f && f.tagName, faceRot: tk.face.style.transform,
            fantomeRot: f && f.querySelector('.face') && f.querySelector('.face').style.transform,
            couchesPion: tk.el.querySelectorAll('.couche').length, couchesFantome: f && f.querySelectorAll('.couche').length};
  });
  await pg.screenshot({path: 'tests/sortie/fantome.png'});
  await pg.mouse.up();
  console.log(JSON.stringify(r, null, 1), errs);
  await b.close();
})();
