const {ouvrir} = require('./commun.js');
(async () => {
  const {b, pg, errs} = await ouvrir(process.argv[2]);
  const r = await pg.evaluate(() => {
    const segs = [];
    for(let i = 0; i < 500; i++){
      const [a, c] = i % 2 ? [1300, 900] : [900, 1100];
      const [pa, pc] = i % 2 ? [900, 1100] : [1300, 700];
      segs.push(`LOG\tM/T6/Main Map/${a}/${c}/null/Main Map/${pa}/${pc}/null/web`);
    }
    preparerRelecture(segs);
    let n = 0;
    const orig = rendreToutes;
    rendreToutes = () => { n++; orig(); };
    const t0 = performance.now();
    allerLog(_etapes.length);
    const t = performance.now() - t0;
    rendreToutes = orig;
    return {etapes: _etapes.length, pos: _logPos, rendus: n, ms: Math.round(t), ou: [parUid('T6').x, parUid('T6').y]};
  });
  console.log(JSON.stringify(r), errs);
  await b.close();
})();
