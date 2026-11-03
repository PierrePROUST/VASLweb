// Banc d'essai : charge VASLweb.html, fabrique une partie, renvoie l'état exporté.
const nav = require('./navigateur.js');
const fichier = nav.fichier(process.argv[2]);
(async () => {
  const b = await nav.lancer();
  const pg = await b.newPage({viewport: {width: 1280, height: 800}});
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  pg.on('console', m => { if(m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await pg.goto('file://' + fichier);
  const r = await pg.evaluate(async () => {
    const bdd = await chargerBDD();
    const noms = ['5-4-8 SSsq', '8-1', 'MMG', 'DM', 'Smoke', '8-3-8 SSsq'];
    const segs = []; let n = 0;
    const pos = [[600, 500], [600, 500], [600, 500], [700, 560], [700, 560], [820, 500]];
    for(const nom of noms){
      const x = bdd.pions.find(s => s.n === nom);
      if(!x) continue;
      const te = _typeEtEtat(x.cmd.replace(/^\+\/null\//, '+/0/'));
      const [px, py] = pos[n] || [900, 500];
      const uid = 'T' + (++n);
      segs.push('+/' + uid + '/' + te.type + '/' + _majPosEtat(te.etat, 'Main Map', px, py));
    }
    const piles = [`+/S1/stack/Main Map;600;500;T1;T2;T3;@@-1`, `+/S2/stack/Main Map;700;560;T4;T5;@@-1`];
    const texte = ['begin_save', 'bd\t0\t0\ta', ...segs, ...piles, 'end_save'].join('\x1b');
    window.__texte = texte;
    await chargerPartie(texte, 'test.vsav', new Map());
    document.querySelectorAll('.fenetre').forEach(f => f.remove());
    const etat = etatPartie();
    return {n: vivants().length, etat};
  });
  console.log(JSON.stringify({n: r.n, nsegs: r.etat.length, errs}));
  require('fs').writeFileSync(process.argv[3] || 'etat.json', JSON.stringify(r.etat.map(s => s.replace(/^\+\/w\d+\/stack\//, '+/w/stack/'))));
  await pg.waitForTimeout(3000); await pg.screenshot({path: (process.argv[3] || 'etat') + '.png'});
  await b.close();
})();
