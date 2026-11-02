// Overlay d'hexagones à cheval sur deux boards : un bois wd1 posé en
// FF5-FF6 du board 02 dépasse sur le board 03 voisin. Sa partie qui dépasse
// est dessinée sur le board 3 (avant, elle était coupée au bord du 2), et
// la carte LOS y prend le terrain de l'overlay. Même chose pour le
// ruisseau St3 de l'extension VASL Overlays, posé dans le board comme par
// « Add overlays » : déplacée, la pièce emmène son débord ; retirée, le
// board voisin redevient tel quel.
const nav = require('./navigateur.js');
// Pièce St3 de tests/overlays.js, 26 colonnes plus à droite (G → GG).
const ST3 = require('fs').readFileSync(__dirname + '/overlays.js', 'utf8').match(/const ST3 = (".*");/)[1];
(async () => {
  const b = await nav.lancer();
  const pg = await (await b.newContext({viewport: {width: 1280, height: 800}})).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await pg.goto('file://' + nav.fichier(process.argv[2] || 'carte.html'));
  const r = await pg.evaluate(async st3Brut => {
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
    // Extension VASL Overlays : la pièce St3 posée en GG5 du board 02.
    const st3 = JSON.parse(st3Brut).replace('Main Map;568;690;', 'Main Map;2031;690;');
    await chargerPartie(['begin_save', 'bd\t0\t0\t02bd\t1\t0\t03', st3, 'end_save'].join('\x1b'), 'ovr3.vsav', new Map());
    const att = (n = 1500) => new Promise(f => setTimeout(f, n));
    await att();
    const b03 = () => { const B = _losBoards[1]; return B._cv.getContext('2d').getImageData(0, 0, 400, B._cv.height).data; };
    const ecart = (a, b) => { let n = 0; for(let i = 0; i < a.length; i += 4) if(a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) n++; return n; };
    const ext = () => _losBoards.flatMap(b => (b.overlaysExt || []).map(o => `${b.name} ${o.hex1}-${o.hex2}`)).join(',') || '∅';
    const s = vivants().find(p => p.nom === 'St3');
    const pose = [ext(), ecart(sans, b03())];
    s.x -= 56.25 * 2; rendreToutes(); await att();
    const deplace = [ext(), ecart(sans, b03())];
    s.deleted = true; planifierOverlaysExt(); await att();
    const retire = [ext(), ecart(sans, b03())];
    return {diff, boisSans, boisAvec, ext: {pose, deplace, retire}, logs: logs.filter(l => /overlay|LOS/.test(l))};
  }, ST3);
  r.erreurs = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
  const e = r.ext;
  process.exit(r.diff > 500 && r.boisAvec > r.boisSans
    && e.pose[1] > 500 && e.deplace[1] < e.pose[1] && e.retire[0] === '∅' && e.retire[1] === 0 && r.logs.some(l => /prolongé sur bd03/.test(l)) && !errs.length ? 0 : 1);
})();
