#!/usr/bin/env python3
"""Table de correspondance des overlays de l'extension VASL Overlays.

Pour chaque image « ovr<nom><o>.gif » de l'extension (.vmdx), cherche
l'image de l'archive du dépôt VASL (boards/bdFiles/overlays) qui lui
correspond : son orientation et le cadre de l'image de l'extension dans
celle-ci (dx, dy, largeur, hauteur), puis, pour un board retourné,
l'orientation et le coin de l'image tournée de 180°. La table est écrite dans VASLweb.html
(TABLE_OVR_EXT_TEXTE) ; les images sans correspondance sûre sont listées.

    python3 outils/table_overlays_ext.py VASL_Overlays.vmdx [cache] [--reprendre]

Il faut Pillow et numpy, et le réseau pour télécharger les archives (mises
en cache dans le dossier « cache », par défaut outils/cache-overlays).
--reprendre réutilise les correspondances déjà calculées (candidats.json).
"""
import io, itertools, json, os, re, sys, urllib.request, zipfile
from multiprocessing import Pool
import numpy as np
from PIL import Image

DEPOT = 'https://raw.githubusercontent.com/vasl-developers/vasl/develop/boards/bdFiles/overlays/'
ICI = os.path.dirname(os.path.abspath(__file__))
CARTE = os.path.join(ICI, '..', 'VASLweb.html')
IOU_MIN = 0.85          # recouvrement minimal des pixels opaques

# Mêmes règles que VASLweb.html (_equivalence, _trimNom, archiveOverlay).
def equivalence(f):
    if re.match(r'^be[23]', f): return 'be1' + f[3:]
    if re.match(r'^be[56]', f): return 'be4' + f[3:]
    if f.startswith('oc2'): return 'oc1' + f[3:]
    if f.startswith('oc4'): return 'oc3' + f[3:]
    return f
def trim(s):
    s = s[:-1]
    if re.match(r'^[0-9]', s): return s
    return re.sub(r'[0-9]+$', '', s) or s
def archive(nom): return 'ovr' + trim(equivalence(nom + 'a')).upper()

def rgba(f): return np.array(Image.open(f).convert('RGBA')).astype(np.int16)
def reduit(m, k):
    h, w = m.shape[0] // k * k, m.shape[1] // k * k
    return m[:h, :w].reshape(h // k, k, w // k, k).mean(axis=(1, 3))
def score(E, A, dx, dy):
    """Recouvrement (intersection / union) des pixels opaques et écart
    moyen des couleurs, l'image E posée en (dx, dy) dans A."""
    he, we = E.shape[:2]; ha, wa = A.shape[:2]
    x0, y0, x1, y1 = max(0, dx), max(0, dy), min(wa, dx + we), min(ha, dy + he)
    if x1 <= x0 or y1 <= y0: return 0.0, 999.0
    sa, se = A[y0:y1, x0:x1], E[y0 - dy:y1 - dy, x0 - dx:x1 - dx]
    both = (sa[:, :, 3] > 0) & (se[:, :, 3] > 0)
    inter = int(both.sum())
    union = int((E[:, :, 3] > 0).sum() + (A[:, :, 3] > 0).sum()) - inter
    diff = float(np.abs(sa[both][:, :3] - se[both][:, :3]).mean()) if inter else 999.0
    return inter / max(union, 1), diff
def position(E, A, k=4):
    """Décalage de E dans A : corrélation des masques réduits, puis
    affinage au pixel."""
    ma, me = reduit((A[:, :, 3] > 0).astype(np.float32), k), reduit((E[:, :, 3] > 0).astype(np.float32), k)
    H, W = ma.shape[0] + me.shape[0], ma.shape[1] + me.shape[1]
    c = np.fft.irfft2(np.fft.rfft2(ma, (H, W)) * np.conj(np.fft.rfft2(me, (H, W))), (H, W))
    dy, dx = np.unravel_index(np.argmax(c), c.shape)
    if dy > H // 2: dy -= H
    if dx > W // 2: dx -= W
    best = None
    for ddy in range(-k - 2, k + 3):
        for ddx in range(-k - 2, k + 3):
            s = score(E, A, int(dx) * k + ddx, int(dy) * k + ddy)
            if not best or s[0] > best[2][0]: best = (int(dx) * k + ddx, int(dy) * k + ddy, s)
    return best

def apparier(args):
    chemin, cache = args
    f = os.path.basename(chemin)
    nom, l = re.match(r'^ovr([a-z0-9]+)([a-f])\.gif$', f, re.I).groups()
    nom = nom.lower()
    arch = os.path.join(cache, archive(nom))
    if not os.path.exists(arch): return nom + l.lower(), None
    z = zipfile.ZipFile(arch)
    noms = {n.lower(): n for n in z.namelist()}
    E = rgba(chemin)
    cands = []
    for c in 'abcdef':
        n = noms.get('ovr' + equivalence(nom + c) + '.gif')
        if not n: continue
        dx, dy, (iou, diff) = position(E, rgba(io.BytesIO(z.read(n))))
        cands.append({'c': c, 'dx': dx, 'dy': dy, 'w': E.shape[1], 'h': E.shape[0], 'iou': round(iou, 4), 'diff': round(diff, 1)})
    return nom + l.lower(), cands or None

def note(x): return x['iou'] - x['diff'] / 100

def affecter(res, marge=0.05):
    """Orientation de l'archive pour chaque image de l'extension : la mieux
    notée (recouvrement, moins l'écart des couleurs). Deux images d'un
    overlay peuvent viser la même (rr3 : a et d → a, l'image d de l'archive
    ne correspond à aucune). Mais une forme presque symétrique (champs,
    vergers, voies) recouvre presque aussi bien à un demi-tour près : pour
    une image dont les meilleurs candidats sont à moins de « marge », on
    prend parmi eux une orientation que les autres images de l'overlay
    n'ont pas encore prise."""
    familles = {}
    for k, cands in res.items():
        if cands: familles.setdefault(k[:-1], {})[k] = sorted(cands, key=note, reverse=True)
    table = {}
    for imgs in familles.values():
        nets = {k: c for k, c in imgs.items() if len(c) < 2 or note(c[0]) - note(c[1]) >= marge}
        for k, c in nets.items(): table[k] = c[0]
        pris = {table[k]['c'] for k in nets}
        for k, c in sorted(((k, c) for k, c in imgs.items() if k not in nets), key=lambda kc: -note(kc[1][0])):
            proches = [x for x in c if note(x) >= note(c[0]) - marge]
            x = next((x for x in proches if x['c'] not in pris), c[0])
            table[k] = x
            pris.add(x['c'])
    return table

def retourner(args):
    """Cadre, dans l'archive, de l'image de l'extension tournée de 180° :
    sur un board retourné, la pièce reste droite et l'overlay tourne avec
    le board. L'image opposée de l'extension (trois crans plus loin) est
    bien cette image tournée, mais avec d'autres marges (l'une centrée sur
    un hexagone, l'autre sur un côté) : on la positionne dedans."""
    k, bons, images = args
    nom, l = k[:-1], k[-1]
    o = nom + 'abcdef'[('abcdef'.index(l) + 3) % 6]
    if o not in bons: return k, None
    E = rgba(os.path.join(images, f'ovr{k}.gif'))[::-1, ::-1].copy()
    A = rgba(os.path.join(images, f'ovr{o}.gif'))
    dx, dy, (iou, diff) = position(E, A)
    if iou < IOU_MIN: return k, None
    v = bons[o]
    return k, {'c': v['c'], 'dx': v['dx'] + dx, 'dy': v['dy'] + dy}

def main():
    reprendre = '--reprendre' in sys.argv
    args = [a for a in sys.argv[1:] if a != '--reprendre']
    vmdx = args[0]
    cache = args[1] if len(args) > 1 else os.path.join(ICI, 'cache-overlays')
    os.makedirs(os.path.join(cache, 'images'), exist_ok=True)
    z = zipfile.ZipFile(vmdx)
    images = [n for n in z.namelist() if re.match(r'^images/ovr[a-z0-9]+[a-f]\.gif$', n, re.I)]
    for n in images:
        cible = os.path.join(cache, 'images', os.path.basename(n))
        if not os.path.exists(cible): open(cible, 'wb').write(z.read(n))
    for a in sorted({archive(re.match(r'^images/ovr([a-z0-9]+)[a-f]\.gif$', n, re.I).group(1).lower()) for n in images}):
        cible = os.path.join(cache, a)
        if os.path.exists(cible) or os.path.exists(cible + '.absent'): continue
        try: octets = urllib.request.urlopen(DEPOT + a).read()
        except Exception as e:
            print('archive absente du dépôt :', a, e); open(cible + '.absent', 'w').close()
            continue
        open(cible, 'wb').write(octets)
    deja = os.path.join(cache, 'candidats.json')
    if reprendre and os.path.exists(deja): res = json.load(open(deja))
    else:
        with Pool() as p:
            res = dict(p.map(apparier, [(os.path.join(cache, 'images', os.path.basename(n)), cache) for n in images], chunksize=4))
        json.dump(res, open(deja, 'w'), indent=0)
    table = affecter(res)
    bons = {k: v for k, v in table.items() if v['iou'] >= IOU_MIN}
    with Pool() as p:
        retournes = dict(p.map(retourner, [(k, bons, os.path.join(cache, 'images')) for k in sorted(bons)], chunksize=8))
    def entree(k, v):
        r = retournes.get(k)
        return f"{k}:{v['c']}{v['dx']},{v['dy']},{v['w']},{v['h']}" + (f",{r['c']}{r['dx']},{r['dy']}" if r else '')
    texte = ' '.join(entree(k, v) for k, v in sorted(bons.items()))
    html = open(CARTE, encoding='utf-8').read()
    html = re.sub(r"const TABLE_OVR_EXT_TEXTE = '[^']*';", lambda m: f"const TABLE_OVR_EXT_TEXTE = '{texte}';", html, count=1)
    open(CARTE, 'w', encoding='utf-8').write(html)
    print(f'{len(res)} images, {len(bons)} dans la table')
    for k in sorted(res):
        if k not in bons:
            v = table.get(k)
            print('  sans correspondance sûre :', k, v and f"(meilleure : {v['c']}, recouvrement {v['iou']})")

if __name__ == '__main__':
    main()
