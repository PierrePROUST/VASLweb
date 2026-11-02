// PieceLinker : « Fire Lane » au menu d'une MG pose un Firelane lié à
// elle ; « + ACQ » d'un véhicule lie l'ACQ posée. Ctrl+Alt+L / Ctrl+Alt+U
// sur deux pièces sélectionnées ; trait rouge et portée ; Undo ; liens
// repris par la sauvegarde.
const nav = require('./navigateur.js');
(async () => {
  const b = await nav.lancer();
  const pg = await (await b.newContext({viewport: {width: 1280, height: 800}})).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await pg.goto('file://' + nav.fichier(process.argv[2] || 'carte.html'));
  const r = await pg.evaluate(async () => {
    await chargerBDD();
    await chargerPartie(['begin_save', 'bd\t0\t0\ta', 'end_save'].join('\x1b'), 'liens.vsav', new Map());
    seConnecter(null, true);
    const att = (n = 600) => new Promise(f => setTimeout(f, n));
    const aplatir = items => items.flatMap(it => it.items ? aplatir(it.items) : [it]);
    const liens = () => JSON.stringify([..._liens]);
    const r = {};
    poserDepuisPalette(_bdd.pions.find(x => x.n === 'MMG'), 600, 500); await att();
    const mg = vivants().slice(-1)[0];
    const it = aplatir(arbreCommandes(mg).items).find(i => i.nom === 'Fire Lane');
    r.menuFL = !!it;
    lancerCommande(mg, it); await att();
    const fl = vivants().slice(-1)[0];
    r.fl = fl.nom; r.flSel = _sel.has(fl) && _sel.size === 1;
    r.lienFL = _liens.get(mg.uid)?.includes(fl.uid) && _liens.get(fl.uid)?.includes(mg.uid);
    r.cmdsFL = _histo[_histo.length - 1].cmds.filter(c => /LINK/.test(c));
    await att(300);
    r.trait = document.querySelectorAll('#liensPions line').length;
    r.etiquette = [...document.querySelectorAll('.etiqLien')].map(e => e.textContent);
    // MG en D4, Fire Lane en G4 : « Range: 3 », sous la MG sélectionnée.
    const m = (await carteLOS()).map;
    const px = h => { const c = h.getHexCenter(); return [c.x * _losZoom() + BOARD_MARGIN, c.y * _losZoom() + BOARD_MARGIN]; };
    deplacer([mg], ...px(m.hexGrid[3][4])); await att(50);
    deplacer([fl], ...px(m.hexGrid[6][4])); await att(50);
    selectionner([mg]); await att(300);
    r.portee = [lieu(mg.x, mg.y), lieu(fl.x, fl.y), ...[...document.querySelectorAll('.etiqLien')].map(e => e.textContent)];
    // Pas de Fire Lane au menu d'une escouade.
    poserDepuisPalette(_bdd.pions.find(x => /^\d-\d-\d \w*sq$/.test(x.n)), 900, 500); await att();
    const sq = vivants().slice(-1)[0];
    r.sqSansFL = !aplatir(arbreCommandes(sq).items).some(i => i.nom === 'Fire Lane');
    // ACQ d'un véhicule.
    poserDepuisPalette(_bdd.pions.find(x => x.n === 'Sherman III(a)'), 1000, 900); await att();
    const v = vivants().slice(-1)[0];
    const acq = aplatir(arbreCommandes(v).items).find(i => /ACQ/.test(i.nom));
    r.menuACQ = acq && acq.nom;
    if(acq){ lancerCommande(v, acq); await att(); }
    const a = vivants().slice(-1)[0];
    r.acq = a.nom; r.lienACQ = !!_liens.get(v.uid)?.includes(a.uid);
    // Ctrl+Alt+L sur MG et escouade, puis Ctrl+Alt+U.
    selectionner([mg, sq]);
    const touche = code => document.dispatchEvent(new KeyboardEvent('keydown', {code, key: code.slice(3).toLowerCase(), ctrlKey: true, altKey: true, bubbles: true}));
    touche('KeyL'); await att(100);
    r.ctrlAltL = !!_liens.get(sq.uid)?.includes(mg.uid);
    touche('KeyU'); await att(100);
    r.ctrlAltU = !_liens.has(sq.uid) && !_liens.get(mg.uid).includes(sq.uid);
    // Sauvegarde puis rechargement.
    const sav = etatPartie();
    r.savLiens = sav.filter(s => /LINK_PIECE/.test(s)).length;
    const avant = liens();
    await chargerPartie(sav.join('\x1b'), 'liens2.vsav', new Map()); await att();
    r.recharge = liens() === avant;
    // Undo de l'ACQ : lien et pion retirés.
    poserDepuisPalette(_bdd.pions.find(x => x.n === 'Sherman III(a)'), 1300, 900); await att();
    const v2 = vivants().slice(-1)[0];
    lancerCommande(v2, aplatir(arbreCommandes(v2).items).find(i => /ACQ/.test(i.nom))); await att();
    r.avantUndo = _liens.has(v2.uid);
    annuler(); await att();
    r.apresUndo = !_liens.has(v2.uid);
    selectionner([mg]); await att(300);
    return r;
  });
  await pg.screenshot({path: nav.sortie ? nav.sortie('liens.png') : 'sortie/liens.png'});
  console.log(JSON.stringify(r, null, 1), errs.length ? errs : 'sans erreur');
  await b.close();
})();
