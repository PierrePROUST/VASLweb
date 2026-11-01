// Accrochage des pions : centres et côtés d'hexagone calculés comme
// HexGrid.hexPoint de VASSAL (tronqués), comparés aux points que VASL a
// posés lui-même dans le log J036_Pascal_Pierre_001 (board 8 en haut à
// gauche, marge 400). Sans navigateur : node accrochage.js carte.html
const fs = require('fs');
const src = fs.readFileSync(process.argv[2] || __dirname + '/../carte.html', 'utf8');
const fonction = n => {
  const i = src.indexOf('function ' + n + '(');
  let d = 0, j = src.indexOf('{', i);
  for(;; j++){ if(src[j] === '{') d++; if(src[j] === '}' && --d === 0) break; }
  return src.slice(i, j + 1);
};
const accrocheHex = new Function(fonction('accrocheHex') + '; return accrocheHex;')();
const g = {hw: 56.25, hh: 64.5, x0: 0, y0: 32, alt: false};
const cotes = ['', 'N', 'NE', 'SE', 'S', 'SO', 'NO'];
// lieu, point posé par VASL
const vasl = [['G4', '737,625'], ['H3', '793,593'], ['J4', '906,657'], ['L4', '1018,657'],
  ['I5', '850,690'], ['I6', '850,754'], ['I8', '850,883'], ['A3', '400,561'], ['B3', '456,593'],
  ['D9', '568,980'], ['H9', '793,980'], ['K4', '962,625'],
  ['G1/NE', '765,415'], ['G2/SE', '765,512'], ['E5/NE', '653,673'], ['E5/SE', '653,706'],
  ['H2/S', '793,561'], ['B4/SE', '484,673']];
let ko = 0;
for(const [lieu, attendu] of vasl){
  const [hex, cote] = lieu.split('/');
  const a = accrocheHex(g, hex.charCodeAt(0) - 65, parseInt(hex.slice(1), 10));
  const q = cote ? a.cotes[cotes.indexOf(cote)] : a;
  const obtenu = (q.x + 400) + ',' + (q.y + 400);
  if(obtenu !== attendu){ ko++; console.log('✘ 08' + lieu, obtenu, 'au lieu de', attendu); }
}
console.log(ko ? `✘ ${ko} point(s) hors de l'accrochage VASL` : `✔ ${vasl.length} points au pixel près de VASL`);
process.exitCode = ko ? 1 : 0;
