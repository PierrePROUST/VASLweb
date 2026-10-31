// OBA (VASL.build.module.OBA). En tactile : bouton OBA de la colonne
// d'icônes, pioches posées sous les boards au-dessus des tables QRDC ;
// ajout d'un module (8 noires, 3 rouges), tirage au doigt et message
// « Battery Access Draw », carte remise, Undo, nombres changés (cartes
// tirées écartées), module d'un autre joueur en lecture seule ; commandes
// OBA/+, OBA/D, OBA/- de VASL ; état relu d'un .vsav de VASL (sous-commande
// imbriquée, « / » échappé, ancien état sans OBO) ; .vsav et .vlog écrits
// puis relus, recul de la relecture ; au PC, fenêtre « OBA Modules » et F6.
const {ouvrir} = require('./commun.js');
(async () => {
  let {b, pg, errs, touche} = await ouvrir(process.argv[2], {profil: 'tactile', hasTouch: true, isMobile: true,
                                                             viewport: {width: 1024, height: 768}});
  const tap = async sel => {
    const el = await pg.$(sel);
    if(!el) throw new Error('Introuvable : ' + sel);
    await el.evaluate(e => e.scrollIntoView({block: 'center', inline: 'nearest'}));
    await pg.waitForTimeout(150);
    const r = await el.boundingBox();
    await touche('touchStart', [[r.x + r.width/2, r.y + r.height/2, 1]]); await touche('touchEnd', []);
    await pg.waitForTimeout(400);
  };
  const etat = () => pg.evaluate(() => _oba.map(m => `${m.label || '·'} ${m.black}N/${m.red}R [${m.showing}]`).join(' ; '));
  const derniers = n => pg.evaluate(n => _histo.flatMap(e => e.cmds).slice(-n), n);
  await pg.waitForSelector('#tablesQRDC img[src]');
  await pg.evaluate(() => { _utilisateur = {nom: 'Pierre', mdp: 'pw1'}; });

  // Bouton OBA de la colonne d'icônes : elle défile sans fin (trois
  // copies) ; on touche la copie visible à l'écran.
  await pg.evaluate(() => document.querySelector('.navBas :not([aria-hidden])[data-action="oba"]').scrollIntoView({block: 'center'}));
  await pg.waitForTimeout(400);
  const [ox, oy] = await pg.evaluate(() => {
    const n = document.querySelector('.navBas').getBoundingClientRect();
    const e = [...document.querySelectorAll('.navBas [data-action="oba"]')].map(x => x.getBoundingClientRect())
      .find(r => r.top >= n.top && r.bottom <= n.bottom);
    return [e.left + e.width/2, e.top + e.height/2];
  });
  await touche('touchStart', [[ox, oy, 1]]); await touche('touchEnd', []);
  await pg.waitForSelector('#zoneOBA');
  const pl = await pg.evaluate(() => {
    const z = document.getElementById('zoneOBA'), t = document.getElementById('tablesQRDC'), e = _empriseBoards;
    const r = rectTables();
    return {ecart: Math.round((r.y - (e.y + e.h)) / SC), dessus: z.offsetTop + z.offsetHeight <= t.offsetTop,
            meme: z.parentElement === t.parentElement, coche: obaOuvert()};
  });
  console.log('Zone OBA sous les boards (px natifs) :', pl.ecart, '; au-dessus des tables QRDC :', pl.dessus && pl.meme, '; coché :', pl.coche);

  await tap('#zoneOBA .obaAjout');
  console.log('Module ajouté :', await etat(), '—', (await derniers(1)).join(' '));
  await tap('#zoneOBA .obaPioche');
  const t1 = await pg.evaluate(() => ({cmds: _histo.flatMap(e => e.cmds).slice(-2),
    chat: [...document.querySelectorAll('#journal .obaJet')].map(l => l.textContent).pop()}));
  console.log('Tirage au doigt :', await etat(), '— commandes :', t1.cmds.join(' | '), '— chat :', t1.chat);
  await tap('#zoneOBA .obaCarte');
  console.log('Carte remise :', await etat(), '—', (await derniers(1)).join(' '));
  for(let i = 0; i < 3; i++) await tap('#zoneOBA .obaPioche');
  const avant = await etat();
  await pg.evaluate(() => annuler());
  console.log('3 tirages :', avant, '; Undo :', await etat(), '—', (await derniers(1)).join(' '));
  await tap('#zoneOBA .obaNoir button:has-text("+")');
  console.log('Une noire de plus (cartes tirées écartées) :', await etat());
  await pg.screenshot({path: __dirname + '/sortie/oba_tactile.png'});

  // Le module d'un autre joueur : visible, sans commande.
  const autre = await pg.evaluate(() => {
    _utilisateur = {nom: 'Marc', mdp: 'pw2'}; _dessinerOBA();
    const z = document.getElementById('zoneOBA');
    const r = {pioche: z.querySelector('.obaPioche').disabled, saisie: !!z.querySelector('input.obaNom'),
               tire: obaTirer(0), plus: z.querySelectorAll('.obaSt button').length};
    _utilisateur = {nom: 'Pierre', mdp: 'pw1'}; _dessinerOBA();
    return r;
  });
  console.log('Autre joueur — pioche désactivée :', autre.pioche, '; nom modifiable :', autre.saisie,
              '; tirage refusé :', autre.tire === false, '; boutons ± :', autre.plus);

  // Nom du module, saisi au clavier.
  await pg.fill('#zoneOBA input.obaNom', 'Div 105');
  await pg.press('#zoneOBA input.obaNom', 'Enter');
  await pg.waitForTimeout(100);
  console.log('Nom :', await etat(), '—', (await derniers(1)).join(' '));

  // Commandes reçues de VASL : mise à jour, module retiré, état d'un .vsav.
  const recu = await pg.evaluate(async () => {
    _netAppliquer('OBA/D/0/pw1,Div 105,2,5,rbb,,0');
    const a = _oba.map(m => `${m.black}N/${m.red}R [${m.showing}]`).join();
    annuler();
    const u = _oba.map(m => `${m.black}N/${m.red}R [${m.showing}]`).join();
    // .vsav de VASL : deux modules, le second en sous-commande imbriquée
    // (contre-oblique avant l'ESC), « / » échappé, état sans OBO.
    const txt = etatPartie().filter(s => !s.startsWith('OBA/')).join('\x1b')
      .replace('end_save', 'OBA/+/0/pw2,Bty A\\/1,3,8,b,23J5,2\\\x1bOBA/+/1/pw1,K,2,6,\x1bend_save');
    await chargerPartie(txt, 'vasl.vsav', new Map());
    return {a, u, lu: _oba.map(m => `${m.owner}|${m.label}|${m.black}N/${m.red}R [${m.showing}] ${m.obohex}/${m.obolevel}`).join(' ; '),
            ecrit: etatPartie().filter(s => s.startsWith('OBA/'))};
  });
  console.log('Reçu OBA/D :', recu.a, '; Undo :', recu.u);
  console.log('Relu d\'un .vsav de VASL :', recu.lu);
  console.log('Réécrit :', recu.ecrit.join(' | '));

  // Hasard : proportion de noires sur 11 000 tirages d'une pioche 8/3.
  const p = await pg.evaluate(() => { let n = 0; for(let i = 0; i < 11000; i++) if(_obaHasard(11) < 8) n++; return n / 11000; });
  console.log('Proportion de noires (8/11 = 0,727) :', p.toFixed(3));

  // .vlog écrit puis relu : tirage, ajout, retrait ; recul de la relecture.
  const lg = await pg.evaluate(async () => {
    let texte = null;
    _telecharger = async t => { texte = t; };
    const pause = () => new Promise(r => setTimeout(r, 5));
    _logNom = 'oba.vlog'; _logEnr = []; _logGroupes = []; _logDepart = etatPartie(); _histo = [];
    const d = s => _oba.map(m => `${m.black}N/${m.red}R[${m.showing}]`).join(',');
    const vus = [d()];
    obaTirer(1); await pause(); vus.push(d());
    obaAjouter(); await pause(); vus.push(d());
    _obaJouer('OBA/-/0'); await pause(); vus.push(d());
    terminerLog();
    await chargerPartie(texte, 'oba.vlog', new Map());
    const relus = [d()];
    for(let i = 0; i < 3; i++){ _avancerLog(true); relus.push(d()); }
    reculerLog(); reculerLog();
    return {vus, relus, recul: d(), etapes: _etapes.length};
  });
  console.log('Joué :', lg.vus.join(' → '));
  console.log('Relu :', lg.relus.join(' → '), `(${lg.etapes} coups)`, '; deux coups en arrière :', lg.recul);

  // Masqué par la commande : la zone disparaît, les tables restent.
  const m = await pg.evaluate(async () => { await basculerOBA(); return {zone: !!document.getElementById('zoneOBA'),
    tables: !!document.getElementById('tablesQRDC')}; });
  console.log('Masquée — zone :', m.zone, '; tables :', m.tables);

  // PC : fenêtre « OBA Modules », tirage à la souris, F6 la ferme.
  await pg.evaluate(() => { choisirProfil('pc'); basculerOBA(); });
  await pg.waitForSelector('#fenOBA');
  const n0 = await pg.evaluate(() => _oba.reduce((s, m) => s + m.showing.length, 0));
  await pg.click('#fenOBA .obaModule.moi .obaPioche');
  const n1 = await pg.evaluate(() => _oba.reduce((s, m) => s + m.showing.length, 0));
  console.log('PC — fenêtre :', await pg.$eval('#fenOBA .qTitre', e => e.textContent.trim()), '; tirage au clic :', n1 === n0 + 1);
  await pg.screenshot({path: __dirname + '/sortie/oba_pc.png'});
  await pg.keyboard.press('F6');
  console.log('F6 ferme la fenêtre :', !(await pg.$('#fenOBA')));
  console.log(errs.length ? errs.join('\n') : 'Aucune erreur');
  await b.close();
})();
