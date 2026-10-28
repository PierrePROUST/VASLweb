// Overlays déplaçables de VASL (fenêtres Draggable Overlays et Deluxe
// Draggable) : présents dans la palette, posés sur la couche « overlay »,
// dessinés sous les pions, traversés par le clic en jeu. La case
// « Overlays » de la sélection les rend saisissables ; la sauvegarde les
// garde et la relecture les remet sur leur couche.
const nav = require('./navigateur.js');
// Pièce St3 d'une partie VASL (extension VASL Overlays 2.12), posée en 600,500.
const ST3 = "+/1790710308542/hide;79,130;Opaque;;player:;0.5;;false\timmob;c;I;R;\\\tmark;overlay\\\\\temb2;;128;A;cw;128;;ccw;128;;;;1;false;0;0;ovrst3a-s.png,ovrst3b-s.png,ovrst3c-s.png,ovrst3d-s.png,ovrst3e-s.png,ovrst3f-s.png;,,,,,;true;Snow;;;false;;1;1;false;83,715;88,130;90,130;;1.0;;true\\\\\\\temb2;Activate;128;A;cw;128;;ccw;128;;;;1;false;0;0;ovrst3a.gif,ovrst3b.gif,ovrst3c.gif,ovrst3d.gif,ovrst3e.gif,ovrst3f.gif;,,,,,;true;;;;false;;1;1;true;65,130;88,130;90,130;;1.0;;true\\\\\\\\\tmacro;Snow;Snow;83,130;;83\\,130;83\\,715;false;;;counted;;;;false;;1;1\\\\\\\\\\\tclone;Clone;75,130;\\\\\\\\\\\\\tdelete;Delete;68,130;\\\\\\\\\\\\\\\tpiece;;;;St3/null\t\\\ttrue\\\\\t-3\\\\\\\t3\\\\\\\\\t\\\\\\\\\\\t\\\\\\\\\\\\\t\\\\\\\\\\\\\\\tMain Map;600;500;8a1:544;10;OldZone;;ClickedX;1041;UniqueID;1790710308542;OldLocationName;02G6\\/H5;OldDeckName;;ClickedY;930;OldX;962;OldY;1125;OldBoard;02;OldMap;Main Map";
(async () => {
  const b = await nav.lancer();
  const pg = await (await b.newContext({viewport: {width: 1280, height: 800}})).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await pg.goto('file://' + nav.fichier(process.argv[2] || 'carte.html'));
  const r = await pg.evaluate(async () => {
    localStorage.removeItem('couchesSel');
    await chargerBDD();
    await chargerPartie(['begin_save', 'bd\t0\t0\ta', 'end_save'].join('\x1b'), 'overlays.vsav', new Map());
    seConnecter(null, true);
    setZoom(0.6);
    const att = (n = 800) => new Promise(f => setTimeout(f, n));
    const r = {};
    r.palette = _bdd.arbre.enfants.map(e => e.nom);
    const fen = n => _bdd.arbre.enfants.find(e => e.nom === n);
    r.ongletsDO = fen('Draggable Overlays').enfants[0].enfants.map(e => e.nom).join(', ');
    const poser = (x, X, Y) => { const d = developperDefinition(x.cmd); return poserTraits(d.T, d.S, X, Y, null, 0); };
    // Escouade sur une route (DO), route seule, décombres (DD) seuls.
    const sq = poser(_bdd.pions.find(x => x.n === '5-4-8 SSsq'), 600, 500);
    const rd = poser(_bdd.parGpid.get('4249'), 600, 500);
    const rd2 = poser(_bdd.parGpid.get('4249'), 900, 500);
    const feuilles = n => n.enfants.flatMap(e => e.enfants ? feuilles(e) : [e]);
    const dd = feuilles(fen('Deluxe Draggable')).find(x => /Rubble/.test(x.n) && /DD\\\//.test(x.cmd))
            || feuilles(fen('Deluxe Draggable')).find(x => /DD\\\//.test(x.cmd));
    const ru = poser(dd, 750, 650);
    await att();
    r.couches = [sq.couche, rd.couche, rd2.couche, ru.couche, ru.nom];
    r.dessous = +rd.el.style.zIndex < +sq.el.style.zIndex;
    r.nonEmpile = rd.el.classList.contains('nonEmpile');
    selectionner([]);
    const w = document.getElementById('mapWrap');
    w.scrollLeft = 750*SC*0.6 - w.clientWidth/2; w.scrollTop = 550*SC*0.6 - w.clientHeight/2;
    await att(300);
    const centre = p => { const q = p.el.getBoundingClientRect(); return [q.left + q.width/2, q.top + q.height/2 + 15]; };
    r.pts = {sq: centre(sq), rd2: centre(rd2), ru: centre(ru)};
    window._t = {sq, rd, rd2, ru};
    return r;
  });
  const nom = () => pg.evaluate(() => [..._sel].map(p => p.nom).join(', ') || '∅');
  // Clics à la souris, couche des overlays non sélectionnable (défaut).
  await pg.mouse.click(...r.pts.rd2); r.clicRouteSeule = await nom();
  await pg.mouse.click(...r.pts.ru); r.clicDecombresSeuls = await nom();
  await pg.mouse.click(...r.pts.sq); r.clicEscouadeSurRoute = await nom();
  await pg.mouse.click(...r.pts.rd2, {modifiers: ['Shift']}); r.majClicRoute = await nom();
  // Glissé depuis une route : rien ne bouge (la carte défile au plus).
  const avant = await pg.evaluate(() => [_t.rd2.x, _t.rd2.y]);
  await pg.mouse.move(...r.pts.rd2); await pg.mouse.down();
  await pg.mouse.move(r.pts.rd2[0] + 80, r.pts.rd2[1] + 40, {steps: 5}); await pg.mouse.up();
  r.routeImmobile = JSON.stringify(avant) === JSON.stringify(await pg.evaluate(() => [_t.rd2.x, _t.rd2.y]));
  await pg.evaluate(() => selectionner([]));
  // Case « Overlays » cochée : la route se prend au clic.
  await pg.evaluate(() => basculerCouche('overlay'));
  r.coche = await pg.evaluate(() => COUCHES_SEL.overlay && JSON.parse(localStorage.getItem('couchesSel')).overlay);
  // Le glissé a pu faire défiler la carte : centres repris.
  r.pts = await pg.evaluate(() => {
    const c = p => { const q = p.el.getBoundingClientRect(); return [q.left + q.width/2, q.top + q.height/2 + 15]; };
    return {sq: c(_t.sq), rd2: c(_t.rd2), ru: c(_t.ru)};
  });
  await pg.mouse.click(...r.pts.rd2); r.clicRouteCoche = await nom();
  await pg.mouse.click(...r.pts.sq); r.clicEscouadeCoche = await nom();
  await pg.evaluate(() => basculerCouche('overlay'));
  // Sauvegarde et relecture : les overlays reviennent sur leur couche.
  // S'y ajoute un ruisseau St3 de l'extension VASL Overlays, tel qu'une
  // partie VASL l'écrit : son image « ovrst3c.gif » vient de l'archive
  // de l'overlay ovrST.
  const r2 = await pg.evaluate(async st3 => {
    const att = (n = 800) => new Promise(f => setTimeout(f, n));
    const sav = etatPartie();
    sav.splice(sav.indexOf('end_save'), 0, st3);
    await chargerPartie(sav.join('\x1b'), 'overlays2.vsav', new Map());
    await att(2500);
    const v = vivants();
    const s = v.find(p => p.nom === 'St3');
    return {st3: s && [s.couche, s.face.naturalWidth + '×' + s.face.naturalHeight, s.el.style.zIndex],
            relus: v.map(p => p.couche).sort().join(','),
            dessousRelu: v.filter(p => p.couche === 'overlay').every(o => v.filter(p => p.couche === 'unite').every(u => +o.el.style.zIndex < +u.el.style.zIndex)),
            verrou: v.filter(p => p.couche === 'overlay').every(p => p.el.classList.contains('verrou'))};
  }, ST3);
  Object.assign(r, r2);
  delete r.pts;
  await pg.screenshot({path: nav.fichier('tests/sortie/overlays.png')}).catch(() => {});
  console.log(JSON.stringify(r), errs.join(' | '));
  await b.close();
})();
