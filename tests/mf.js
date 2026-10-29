// Décompte des MF / MP d'après la table des terrains de VASL Tools : après
// chaque déplacement, coût de l'hexagone entré et cumul, au chat et au
// log (« * 5-4-8 SSsq : +2MF/ 2MF »). Bois, mur, pile avec chef,
// saut par le chemin le moins cher, montée, Undo, véhicule sur route
// (1 MP boutonné, ½ équipage découvert) et en bois (Z : moitié des MP du gpid), Mark unmoved.
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
    // Un coup par geste : la pose et le déplacement ne doivent pas se
    // fondre dans la même action (Undo les annulerait ensemble).
    const tic = () => new Promise(f => setTimeout(f, 20));
    const poser = async (nom, h) => { const [x, y] = px(h); poserDepuisPalette(_bdd.pions.find(s => s.n === nom), x, y); await tic(); return vivants().slice(-1)[0]; };
    const aller = async (l, h) => { const [x, y] = px(h); deplacer(l, x, y); await tic(); };
    // Le décompte part au log comme un rapport : dernier segment CHAT.
    const msg = () => _histo.flatMap(e => e.cmds).filter(c => /^CHAT.*(cumul|M[FP]\/ )/.test(c)).slice(-1)[0].replace(/^CHAT\* /, '');
    const r = {};
    r.lignesInconnues = Object.entries(_LIGNE_TEC).filter(([k, v]) => !TEC_MVT[v]).map(([k]) => k);
    // 1. Terrain ouvert → bois : 2 MF.
    const og = hexes.find(h => T(h) === 'Open Ground' && voisins(h).some(v => v && T(v) === 'Woods'));
    const bois = voisins(og).find(v => v && T(v) === 'Woods');
    const sq = await poser('5-4-8 SSsq', og);
    await aller([sq], bois);
    r.bois = msg();
    // 2. Bois → route : le cumul continue.
    const rteB = voisins(bois).find(v => v && /Road/.test(T(v)));
    if(rteB){ await aller([sq], rteB); r.boisRoute = msg(); }
    // 3. Undo : le cumul revient à l'hexagone retrouvé.
    annuler();
    r.undo = sq.mvt && sq.mvt.etapes.slice(1).map(e => e.cout).join('+');
    // 4. Mur vers un bâtiment de pierre : 1+COT (B9).
    let mur = null;
    for(const h of hexes) for(let s = 0; s < 6 && !mur; s++)
      if(h.getHexsideTerrain(s) && h.getHexsideTerrain(s).getName() === 'Wall' && m.getAdjacentHex(h, s)) mur = [h, m.getAdjacentHex(h, s)];
    const sq2 = await poser('5-4-8 SSsq', mur[0]);
    await aller([sq2], mur[1]);
    r.mur = msg();
    // 5. Pile escouade + chef : une seule ligne pour les deux.
    const bat = hexes.find(h => /Wooden Building/.test(T(h)) && voisins(h).some(v => v && T(v) === 'Open Ground'));
    const dep = voisins(bat).find(v => v && T(v) === 'Open Ground');
    const sq3 = await poser('5-4-8 SSsq', dep), ldr = await poser('8-1', dep);
    await aller([sq3, ldr], bat);
    r.pile = msg();
    // 6. Saut de trois hexagones : chemin le moins cher, coût par hexagone.
    let loin = null;
    for(const h of hexes) for(let d = 0; d < 6 && !loin; d++){
      const a = m.getAdjacentHex(h, d), b2 = a && m.getAdjacentHex(a, d), c = b2 && m.getAdjacentHex(b2, d);
      if(c && T(h) === 'Open Ground') loin = [h, c];
    }
    const sq4 = await poser('5-4-8 SSsq', loin[0]);
    await aller([sq4], loin[1]);
    r.saut = msg();
    // 7. Montée d'un niveau : coût du terrain doublé (h). Le board « a »
    // est plat : on surélève un hexagone le temps du calcul.
    const niv = bois.getBaseLevelofHex;
    bois.getBaseLevelofHex = () => 1;
    r.montee = (({cout, lib}) => ({cout, lib}))(coutEntree(m, og, bois, {col: 'inf', unite: 'MF'}));
    r.monteeChar = (({cout, lib}) => ({cout, lib}))(coutEntree(m, og, bois, {col: 'ft', unite: 'MP', mp: 17}));
    bois.getBaseLevelofHex = niv;
    // 8. T-34 : ½ MP sur la route, puis Z (moitié de ses 17 MP) en bois.
    const rte = hexes.find(h => T(h) === 'Paved Road' && voisins(h).some(v => v && T(v) === 'Paved Road'));
    const rte2 = voisins(rte).find(v => v && T(v) === 'Paved Road');
    const tk = await poser('T-34 M40', rte);
    r.mpT34 = natureMouvement(tk);
    await aller([tk], rte2);
    r.route = msg();
    // Équipage découvert (CE, Ctrl+B) : ½ MP ; boutonné : 1 MP.
    executerTouche(tk, _touche(66, 2)); await tic();
    r.nomCE = tk.nom;
    await aller([tk], rte);
    r.routeCE = msg();
    executerTouche(tk, _touche(66, 2)); await tic();
    await aller([tk], rte2);
    const boisR = voisins(rte2).find(v => v && T(v) === 'Woods');
    if(boisR){ await aller([tk], boisR); r.charBois = msg(); }
    // 9. Rien sur les pions ; Mark unmoved remet les cumuls à zéro.
    r.pastilles = document.querySelectorAll('.pastilleMF').length;   // plus de pastille MF sur les piles
    leverDeplaces();
    r.apresUnmoved = pions.filter(p => p.mvt).length;
    return r;
  });
  console.log(JSON.stringify(r, null, 1), errs.length ? errs : 'sans erreur');
  await b.close();
})();
