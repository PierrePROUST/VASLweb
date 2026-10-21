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
exports.lancer = () => pw.chromium.launch(options());
// Le carte.html du dépôt, par défaut.
exports.CARTE = path.resolve(__dirname, '..', 'carte.html');
exports.fichier = a => path.resolve(a || exports.CARTE);
