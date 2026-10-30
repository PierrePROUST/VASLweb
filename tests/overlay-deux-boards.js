// Overlay d'hexagones à cheval sur deux boards : un bois wd1 posé en
// FF5-FF6 du board 02 dépasse sur le board 03 voisin. Sa partie qui dépasse
// est dessinée sur le board 3 (avant, elle était coupée au bord du 2), et
// la carte LOS y prend le terrain de l'overlay.
const nav = require('./navigateur.js');
(async () => {
  const b = await nav.lancer();
  const pg = await (await b.newContext({viewport: {width: 1280, height: 800}})).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await pg.goto('file://' + nav.fichier(process.argv[2] || 'carte.html'));
  const r = await pg.evaluate(async () => {
    const logs = [];
    const orig = window.chatLog;
    window.chatLog = (m, ...a) => { logs.push(String(m)); return orig(m, ...a); };
    await chargerBDD();
    // Le même board 3 avec et sans overlay voisin : on compare ses pixels.
    const pixels = async (bd) => {
      await chargerPartie(['begin_save', bd, 'end_save'].join('\x1b'), 'ovr2.vsav', new Map());
      const cvs = [...document.querySelectorAll('canvas.boardLayer')];
      const c = cvs.sort((a, b) => parseFloat(a.style.left) - parseFloat(b.style.left))[1];
      if(!c) return logs;
      // Bois de la carte LOS sur la bande de jonction du board 03.
      const {map: m} = await carteLOS();
      const B = m.boards[1]._los;
      let bois = 0;
      for(let x = B.x; x < B.x + 40; x++) for(let y = 0; y < B.h; y++)
        if(/Woods/.test(m.getGridTerrain(x, y).getName())) bois++;
      return {px: c.getContext('2d').getImageData(0, 0, Math.min(c.width, 400), c.height).data, bois};
    };
    const {px: sans, bois: boisSans} = await pixels('bd\t0\t0\t02bd\t1\t0\t03');
    const {px: avec, bois: boisAvec} = await pixels('bd\t0\t0\t02\tOVR\twd1\tGG5\tGG5bd\t1\t0\t03');
    let diff = 0;
    for(let i = 0; i < sans.length; i += 4)
      if(sans[i] !== avec[i] || sans[i + 1] !== avec[i + 1] || sans[i + 2] !== avec[i + 2]) diff++;
    return {diff, boisSans, boisAvec, logs: logs.filter(l => /overlay|LOS/.test(l))};
  });
  r.erreurs = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
  process.exit(r.diff > 500 && r.boisAvec > r.boisSans && r.logs.some(l => /prolongé sur bd03/.test(l)) && !errs.length ? 0 : 1);
})();
