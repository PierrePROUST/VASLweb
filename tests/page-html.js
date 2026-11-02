// Page HTML collée dans le label d'un « HTML Placeholder » (gabarit VASL
// Information Tables d'asl-players.net) : dessinée sur la carte à
// l'échelle de Swing (1 px CSS = 1,3 px), au fond, sous le pion posé
// dans une de ses cases. Les logos de nationalité deviennent les
// marqueurs de tour VASL ; ni script ni gestionnaire d'événement ne passe.
const nav = require('./navigateur.js');
(async () => {
  const b = await nav.lancer();
  const pg = await (await b.newContext({viewport: {width: 1280, height: 800}})).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await pg.goto('file://' + nav.fichier(process.argv[2] || 'carte.html'));
  const r = await pg.evaluate(async () => {
    window.__piege = 0;
    const page = '<html><head><style>table.main{border-collapse:separate;border-spacing:2px}'
      + 'td{height:60px;width:60px;text-align:center;border:1px solid #666}'
      + 'td.americans,td.americanslogo{background-color:#CDF000;height:35px;width:60px;background-size:contain}'
      + 'td.americanslogo{background-image:url(http://asl-players.net/images/nat-logos/americans.png)}'
      + '/* gabarit ----------------------------------------------------------------- */'
      + '</style></head><body style="font-family: Arial;">\\\\\t\\\\\t<table class="main"><tbody><tr>'
      + '<td class="americanslogo" id="player1_logo"></td><td class="americans">ELR: 5</td>'
      + '<td class="reinforce" style="background-image: url(&quot;http://asl-players.net/images/nat-logos/reinforce/free-french-germans.png&quot;);">1</td>'
      + '<td class="turn">2<img src="x" onerror="window.__piege++"><script>window.__piege++</script></td>'
      + '</tr></tbody></table></body></html >';
    const bdd = await chargerBDD();
    // Les tabulations du gabarit sont échappées un cran plus bas que les
    // séparateurs de traits, comme dans une sauvegarde de VASSAL.
    const T = ['immob;cg;I;R;', 'label;72,715;;10;;0,0,0;c;0;c;0;c;c;$pieceName$;Dialog;0;0;HTML;;false',
               'piece;K;D;;HTML Placeholder'];
    const S = ['', page, 'Main Map;900;300;;0'];
    const u = developperDefinition(bdd.pions.find(s => s.n === '8-1').cmd);
    const U = u.S.slice();
    U[U.length - 1] = _majPosEtat(U[U.length - 1], 'Main Map', 900 + 25, 300);
    await chargerPartie(['begin_save', 'bd\t0\t0\ta', `+/H1/${encoderTraits(T)}/${encoderTraits(S)}`,
                         `+/U1/${encoderTraits(u.T)}/${encoderTraits(U)}`, 'end_save'].join('\x1b'),
                        'page.vsav', new Map());
    await new Promise(f => setTimeout(f, 2000));
    const p = parUid('H1'), q = parUid('U1');
    const o = p.el.querySelector('.vtp');
    const ombre = o && o.shadowRoot;
    return {
      fond: !!p.fond, couche: p.couche,
      // Largeur à l'échelle de Swing : celle du tableau × 1,3 × SC.
      echelle: o ? +(p.larg / o.offsetWidth / SC).toFixed(2) : null,
      dessous: +p.el.style.zIndex < +q.el.style.zIndex,
      logoVasl: !!(ombre && ombre.querySelector('#player1_logo img.logo')),
      coinsRenfort: ombre ? ombre.querySelectorAll('td.reinforce .coin').length : 0,
      sansScript: ombre ? !ombre.querySelector('script, [onerror]') && window.__piege === 0 : false,
      texte: ombre ? ombre.querySelector('.americans').textContent : null,
      // La feuille du gabarit reste dans l'ombre : les cases de l'interface
      // ne prennent pas ses 60 px.
      cloisonnee: ![...document.querySelectorAll('style')].some(x => x.textContent.includes('americanslogo'))
    };
  });
  console.log(JSON.stringify(r), errs.length ? errs : 'sans erreur');
  await b.close();
})();
