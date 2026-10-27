// Taille des pions SVG sous WebKit (Safari, Firefox iOS) : le naturalWidth
// d'un SVG affiché y vaut sa taille à l'écran. On l'imite dans Chromium,
// puis on redessine les pions plusieurs fois : leur taille ne doit pas
// changer (elle grossissait de SC à chaque rendu).
const {ouvrir} = require('./commun.js');
(async () => {
  const fichier = process.argv[2] || 'carte.html';
  const {b, pg, errs} = await ouvrir(fichier, {});
  await pg.evaluate(() => {
    const proto = HTMLImageElement.prototype;
    for(const k of ['naturalWidth', 'naturalHeight']){
      const vrai = Object.getOwnPropertyDescriptor(proto, k).get;
      Object.defineProperty(proto, k, {configurable: true, get(){
        const r = vrai.call(this);
        // Les images sont des URL blob: : on traite toutes celles affichées
        // comme des SVG.
        if(!this.isConnected || !this.getBoundingClientRect().width) return r;
        return k === 'naturalWidth' ? this.offsetWidth : this.offsetHeight;
      }});
    }
  });
  const res = await pg.evaluate(async () => {
    const tailles = () => pions.filter(p => !p.cache).map(p => p.sz);
    const avant = tailles();
    for(let i = 0; i < 3; i++) for(const p of pions) await majApparence(p);
    return {avant, apres: tailles()};
  }).catch(e => ({erreur: e.message}));
  const ok = res.avant && JSON.stringify(res.avant) === JSON.stringify(res.apres);
  console.log(JSON.stringify(Object.assign(res, {ok, errs})));
  await b.close();
})();
