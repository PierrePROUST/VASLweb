// Chromium piloté par Playwright. Playwright se cherche dans node_modules,
// puis dans l'installation globale ; Chromium est celui de Playwright, ou
// celui que nomme la variable CHROMIUM.
const fs = require('fs'), path = require('path');
let pw;
try { pw = require('playwright'); }
catch(e){ pw = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright')); }
const options = () => {
  const o = {};
  if(process.env.CHROMIUM) o.executablePath = process.env.CHROMIUM;
  else if(fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome')) o.executablePath = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  return o;
};
exports.chromium = pw.chromium;
// Les tests lisent l'interface en français : le terminal se dit français,
// sauf LANGUE=en (l'interface passe alors à l'anglais).
const LOCALE = process.env.LANGUE === 'en' ? 'en-US' : 'fr-FR';
exports.lancer = async () => {
  const b = await pw.chromium.launch(options());
  const ctx = b.newContext.bind(b), page = b.newPage.bind(b);
  b.newContext = (o = {}) => ctx(Object.assign({locale: LOCALE}, o));
  b.newPage = (o = {}) => page(Object.assign({locale: LOCALE}, o));
  return b;
};
// Le VASLweb.html du dépôt, par défaut.
exports.CARTE = path.resolve(__dirname, '..', 'VASLweb.html');
exports.fichier = a => path.resolve(a || exports.CARTE);
