// Camp du joueur (Axe / Alliés), choisi à l'identification et gardé sur
// le poste : le camp des pions vient de leur nationalité ; déplacer un
// pion du camp adverse est bloqué par une fenêtre de confirmation, au PC
// (glissé à la souris) comme au doigt (glissé tactile) : tant qu'elle est
// ouverte, rien ne bouge ; « Annuler », rien ne bouge ; « Déplacer quand
// même », le pion part. Le camp se choisit explicitement à chaque
// connexion : jamais présélectionné, le dernier est seulement indiqué.
// Les pions de son camp et les marqueurs partent sans question ; « Les
// deux », l'administrateur et l'observateur ne sont jamais interrogés.
// Le camp n'entre pas dans le .vsav.
//   node camp.js [VASLweb.html]
const nav = require('./navigateur.js');

async function scenario(b, tactile){
  const ctx = await b.newContext(tactile ? {viewport: {width: 600, height: 800}, hasTouch: true}
                                          : {viewport: {width: 1280, height: 800}});
  const pg = await ctx.newPage();
  await pg.addInitScript(p => {
    if(!sessionStorage.getItem('init')){
      localStorage.clear(); sessionStorage.setItem('init', '1');
    }
    localStorage.setItem('aslweb.profil', p);
  }, tactile ? 'tactile' : 'pc');
  const errs = [], natifs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  // Aucune boîte native (confirm) : la fenêtre est celle de la page.
  pg.on('dialog', d => { natifs.push(d.message()); d.dismiss(); });
  await pg.goto('file://' + nav.fichier(process.argv[2] || 'VASLweb.html'));
  // Une partie : escouade allemande (T1), russe (T2), un DM (T3).
  const camps = await pg.evaluate(async () => {
    const bdd = await chargerBDD();
    const proto = (re, nom) => bdd.pions.find(s => s.n === nom && re.test(s.cmd)) || bdd.pions.find(s => re.test(s.cmd) && /sq$/.test(s.n));
    const choix = [proto(/prototype;geINF/, '4-6-7 sq'), proto(/prototype;ruINF/, '4-4-7 sq'), bdd.pions.find(s => s.n === 'DM')];
    const pos = [[900, 700], [1100, 760], [1300, 700]];
    const segs = choix.map((x, i) => {
      const te = _typeEtEtat(x.cmd.replace(/^\+\/null\//, '+/0/'));
      return `+/T${i + 1}/${te.type}/${_majPosEtat(te.etat, 'Main Map', pos[i][0], pos[i][1])}`;
    });
    await chargerPartie(['begin_save', 'bd\t0\t0\ta', ...segs, 'end_save'].join('\x1b'), 'c.vsav', new Map());
    setZoom(0.6);
    const w = document.getElementById('mapWrap');
    w.scrollLeft = 1000*SC*0.6 - w.clientWidth/2; w.scrollTop = 730*SC*0.6 - w.clientHeight/2;
    return ['T1', 'T2', 'T3'].map(u => [parUid(u).nom, nationPion(parUid(u)), campPion(parUid(u))]);
  });
  await pg.waitForTimeout(800);
  // Identification : nouvel utilisateur sans camp refusé, puis Axe.
  const ident = await pg.evaluate(() => {
    const $ = id => document.getElementById(id);
    if(!$('utSel')) demanderUtilisateur();
    const sel = $('utSel');
    sel.value = [...sel.options].find(o => /Nouvel utilisateur/.test(o.text)).value;
    sel.dispatchEvent(new Event('change'));
    $('utNom').value = 'Alice'; $('utMdp').value = 'secretA';
    $('utOk').click();
    const sansCamp = $('utErr').textContent;
    $('utCamp').value = 'axe';
    $('utOk').click();
    return {sansCamp, camp: _utilisateur && _utilisateur.camp, stocke: localStorage.getItem('aslweb.camps')};
  });
  const centre = uid => pg.evaluate(u => { const r = parUid(u).el.getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; }, uid);
  const ecran = (x, y) => pg.evaluate(([x, y]) => { const r = document.getElementById('mapInner').getBoundingClientRect(); return [r.left + x*SC*zoom, r.top + y*SC*zoom]; }, [x, y]);
  const cdp = tactile ? await ctx.newCDPSession(pg) : null;
  const touche = (type, pts) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: pts.map(p => ({x: p[0], y: p[1], id: 1}))});
  // Glissé d'un pion vers (cx, cy) de la carte, à la souris ou au doigt.
  const glisser = async (uid, cx, cy) => {
    await pg.evaluate(u => {
      selectionner([]);
      const p = parUid(u), w = document.getElementById('mapWrap');
      w.scrollLeft = p.x*SC*zoom - w.clientWidth/2; w.scrollTop = p.y*SC*zoom - w.clientHeight/2;
    }, uid);
    await pg.waitForTimeout(100);
    const [x, y] = await centre(uid), [tx, ty] = await ecran(cx, cy);
    if(tactile){
      await touche('touchStart', [[x, y]]);
      for(let i = 1; i <= 10; i++) await touche('touchMove', [[x + (tx-x)*i/10, y + (ty-y)*i/10]]);
      await pg.waitForTimeout(50);
      await touche('touchEnd', []);
    } else {
      await pg.mouse.move(x, y); await pg.mouse.down();
      for(let i = 1; i <= 10; i++) await pg.mouse.move(x + (tx-x)*i/10, y + (ty-y)*i/10);
      await pg.mouse.up();
    }
    await pg.waitForTimeout(150);
    return pg.evaluate(u => [parUid(u).x, parUid(u).y], uid);
  };
  const pos = uid => pg.evaluate(u => [parUid(u).x, parUid(u).y], uid);
  const question = () => pg.evaluate(() => { const w = document.getElementById('fenCamp'); return w ? w.querySelector('p').textContent : null; });
  // Réponse à la fenêtre : clic, ou toucher du doigt.
  const repondre = async id => {
    const [x, y] = await pg.evaluate(i => { const r = document.getElementById(i).getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; }, id);
    if(tactile){ await touche('touchStart', [[x, y]]); await touche('touchEnd', []); }
    else await pg.mouse.click(x, y);
    await pg.waitForTimeout(150);
  };
  const essai = async (uid, cx, cy) => {
    const avant = await pos(uid), apres = await glisser(uid, cx, cy);
    return {avant, bouge: String(apres) !== String(avant), question: await question()};
  };
  const r = {camps, ident};
  // Pion de son camp : aucune question.
  r.propre = await essai('T1', 960, 640);
  // Marqueur (sans camp) : aucune question.
  r.marqueur = await essai('T3', 1360, 640);
  // Pion adverse : bloqué, fenêtre ouverte ; « Annuler » : rien ne bouge.
  r.refuse = await essai('T2', 1160, 640);
  await repondre('campNon');
  r.refuse.apresAnnuler = String(await pos('T2')) !== String(r.refuse.avant);
  r.refuse.fermee = (await question()) === null;
  r.refuse.journal = await pg.evaluate(() => [...document.querySelectorAll('#journal .sys')].map(d => d.textContent).filter(t => /annulé/.test(t)).pop());
  // Pion adverse : « Déplacer quand même » : il part.
  r.accepte = await essai('T2', 1160, 640);
  await repondre('campOui');
  r.accepte.apresOui = String(await pos('T2')) !== String(r.accepte.avant);
  r.accepte.fermee = (await question()) === null;
  // « Les deux », administrateur, observateur : jamais de question.
  for(const [qui, f] of [['deux', () => seConnecter({nom: 'Alice', mdp: 'secretA', camp: 'tous'}, false)],
                         ['admin', () => seConnecter(null, true)], ['observateur', () => seConnecter(null, false)]]){
    await pg.evaluate(f);
    const x = 1100 + 60 * (Object.keys(r).length % 3);
    r[qui] = await essai('T2', x, 820);
  }
  r.natifs = natifs;
  // Le camp reste hors du .vsav, et la boîte le reprend pour Alice.
  r.horsVsav = await pg.evaluate(() => !etatPartie().join('\x1b').includes('aslweb') && !/\bcamp\b/.test(etatPartie().join('\x1b')));
  r.memorise = await pg.evaluate(() => {
    demanderUtilisateur();
    const sel = document.getElementById('utSel');
    sel.value = [...sel.options].find(o => /^Alice/.test(o.text)).value;
    sel.dispatchEvent(new Event('change'));
    const v = {valeur: document.getElementById('utCamp').value, indique: document.getElementById('utCampInd').textContent};
    document.querySelectorAll('.fenetre').forEach(w => w.remove());
    return v;
  });
  r.errs = errs;
  await ctx.close();
  return r;
}

(async () => {
  const b = await nav.lancer();
  const pc = await scenario(b, false), doigt = await scenario(b, true);
  console.log(JSON.stringify({pc, doigt}, null, 1));
  await b.close();
})();
