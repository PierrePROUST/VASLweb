// Décompte des MF / MP d'après le terrain (A4, chapitre B) : coût
// d'entrée, mur, chef (+2 MF), chemin sur un saut, Undo, Mark unmoved,
// route à ½ MP pour un véhicule. Seul le total part au chat et au log ;
// rien ne s'affiche sur les pions.
const {ouvrir} = require('./commun.js');
(async () => {
  const {b, pg, errs} = await ouvrir(process.argv[2] || 'carte.html');
  const r = await pg.evaluate(async () => {
    await carteLOS();
    const m = _losPrete;
    const hexes = m.hexGrid.flat().filter(Boolean);
    const T = h => h.getCenterLocation().getTerrain().getName();
    const voisins = h => [0, 1, 2, 3, 4, 5].map(s => m.getAdjacentHex(h, s));
    // Centre d'un hexagone en pixels de carte (inverse de _versLOS).
    const px = h => { const c = h.getHexCenter(); return [c.x * _losZoom() + BOARD_MARGIN, c.y * _losZoom() + BOARD_MARGIN]; };
    const poser = (nom, h) => { const [x, y] = px(h); poserDepuisPalette(_bdd.pions.find(s => s.n === nom), x, y); return vivants().slice(-1)[0]; };
    const aller = (l, h) => { const [x, y] = px(h); deplacer(l, x, y); };
    const etat = p => p.mvt ? {hexes: p.mvt.hexes.join('>'), couts: p.mvt.couts.join('+'), total: _mvtTotal(p), mf: p.mvt.mf} : null;
    // Le total part au log comme un rapport : dernier segment CHAT.
    const msgs = () => _histo.flatMap(e => e.cmds).filter(c => /^CHAT/.test(c)).slice(-1)[0];
    // Un coup par geste : la pose et le déplacement ne doivent pas se
    // fondre dans la même action (Undo les annulerait ensemble).
    const tic = () => new Promise(f => setTimeout(f, 20));
    const r = {};
    // 1. Terrain ouvert → bois : 2 MF ; puis bois → route : 1 MF.
    const og = hexes.find(h => T(h) === 'Open Ground' && voisins(h).some(v => v && T(v) === 'Woods'));
    const bois = voisins(og).find(v => v && T(v) === 'Woods');
    const sq = poser('5-4-8 SSsq', og);
    await tic();
    aller([sq], bois);
    await tic();
    r.bois = etat(sq); r.msgBois = msgs();
    // 2. Undo : retour sur l'hexagone de départ, chemin tronqué.
    annuler();
    r.undo = etat(sq);
    // 3. Mur : coût du terrain + 1 (B9).
    let mur = null;
    for(const h of hexes) for(let s = 0; s < 6 && !mur; s++)
      if(h.getHexsideTerrain(s) && h.getHexsideTerrain(s).getName() === 'Wall' && m.getAdjacentHex(h, s)) mur = [h, m.getAdjacentHex(h, s)];
    const sq2 = poser('5-4-8 SSsq', mur[0]);
    aller([sq2], mur[1]);
    r.mur = Object.assign(etat(sq2), {terrain: T(mur[1])});
    // 4. Chef avec l'escouade : 6 MF pour les deux (A4.12).
    const bat = hexes.find(h => /Building/.test(T(h)) && voisins(h).some(v => v && T(v) === 'Open Ground'));
    const dep = voisins(bat).find(v => v && T(v) === 'Open Ground');
    const sq3 = poser('5-4-8 SSsq', dep), ldr = poser('8-1', dep);
    aller([sq3, ldr], bat);
    r.chef = {sq: etat(sq3), ldr: etat(ldr), terrain: T(bat), msg: msgs()};
    // 5. Saut de plusieurs hexagones : chemin le moins cher.
    let loin = null;
    for(const h of hexes) for(let d = 0; d < 6 && !loin; d++){
      const a = m.getAdjacentHex(h, d), b2 = a && m.getAdjacentHex(a, d), c = b2 && m.getAdjacentHex(b2, d);
      if(c && T(h) === 'Open Ground') loin = [h, c];
    }
    const sq4 = poser('5-4-8 SSsq', loin[0]);
    aller([sq4], loin[1]);
    r.saut = etat(sq4); r.msgSaut = msgs();
    // 6. Véhicule sur la route : ½ MP par hexagone.
    const rte = hexes.find(h => T(h) === 'Paved Road' && voisins(h).some(v => v && T(v) === 'Paved Road'));
    const rte2 = voisins(rte).find(v => v && T(v) === 'Paved Road');
    const tk = poser('T-34 M40', rte);
    aller([tk], rte2);
    r.route = etat(tk);
    // Montée d'un niveau : coût du terrain doublé (B10.4). Le board « a »
    // est plat : on surélève un hexagone le temps du calcul.
    const haut = bois, bas = og, niv = haut.getBaseLevelofHex;
    haut.getBaseLevelofHex = () => 1;
    r.montee = coutEntree(m, bas, haut, false);
    haut.getBaseLevelofHex = niv;
    r.msgRoute = msgs();
    // 7. Rien d'affiché sur les pions, puis Mark unmoved.
    r.pastilles = [...document.querySelectorAll('.pastille')].map(e => e.textContent);
    leverDeplaces();
    r.apresUnmoved = [sq, sq2, sq3, ldr, sq4, tk].map(etat).filter(Boolean).length + ' chemin(s)';
    return r;
  });
  console.log(JSON.stringify(r, null, 1), errs.length ? errs : 'sans erreur');
  await b.close();
})();
