#!/bin/sh
# Rejoue les tests de carte.html dans Chromium (Playwright).
#   sh tests/tout.sh [référence]
# La référence (par défaut origin/map) est la version de carte.html à
# laquelle on compare l'export sans jouer, les M/ des gestes à la souris
# et les D/ d'un raccourci. Sorties (JSON, captures) : tests/sortie/.
set -u
ICI=$(cd "$(dirname "$0")" && pwd)
REF=${1:-origin/map}
mkdir -p "$ICI/sortie"
cd "$ICI/sortie"
git -C "$ICI/.." show "$REF:carte.html" > ref.html || { echo "Référence $REF introuvable"; exit 1; }
CARTE="$ICI/../carte.html"
echecs=0
compare(){   # nom, commande sur la référence, commande sur la version courante
  a=$(eval "$2" 2>&1); b=$(eval "$3" 2>&1)
  if [ "$a" = "$b" ]; then echo "✔ $1 : identique à $REF"; else echo "✘ $1 : différent de $REF"; echo "  $REF : $a"; echo "  actuel : $b"; echecs=$((echecs+1)); fi
}
echo "— Syntaxe"
awk '/^<script>$/{f=1;next}/^<\/script>$/{f=0}f' "$CARTE" > script.js && node --check script.js && echo "✔ node --check" || echecs=$((echecs+1))
node "$ICI/erreurs.js" "$CARTE"
echo "— Non-régression contre $REF"
node "$ICI/banc.js" ref.html export_ref.json >/dev/null; node "$ICI/banc.js" "$CARTE" export.json >/dev/null
if cmp -s export_ref.json export.json; then echo "✔ export .vsav sans jouer : segments identiques"; else echo "✘ export .vsav : segments différents"; echecs=$((echecs+1)); fi
compare "gestes à la souris (M/)" "node '$ICI/jeu.js' ref.html jeu_ref.json" "node '$ICI/jeu.js' '$CARTE' jeu.json"
compare "raccourci sur une pile (D/)" "node '$ICI/touche.js' ref.html" "node '$ICI/touche.js' '$CARTE'"
compare "segment CHAT au PC" "node '$ICI/chat1.js' ref.html" "node '$ICI/chat1.js' '$CARTE'"
echo "— Scénarios (résultats à lire)"
for t in pince doigt pc pile-arrivee p4 ui pcchat desbarre alerte alt log500 p3 l3 p5 vues chat0 chat2 chat3 chat4 qmark mf mf-ravin mf-contournement mf-cumul mf-start mf-transport mf-horscarte mf-relecture mf-route mf-niveaux mf-escaliers mov-relecture; do
  echo "· $t"; node "$ICI/$t.js" "$CARTE" 2>&1 | tr -d '\n' | cut -c1-600; echo
done
echo "· chat1 (téléphone)"; node "$ICI/chat1.js" "$CARTE" mobile
for p in "mobile 360 740" "tablette 1024 768"; do echo "· prof $p"; node "$ICI/prof.js" "$CARTE" $p; done
echo "— $echecs échec(s) de non-régression"
exit $echecs
