"""Cuts the 12 cans out of the can sheet (white background) into mpc/can_01..12.webp, and builds mpc/desk_nocan.webp
(the 16:9 desk picture with the original can painted out) so a different can can be put on the desk.
Usage: python tools/make_cans.py <can_sheet.webp> <desk.webp>"""
import sys, os, numpy as np, cv2
from PIL import Image, ImageFilter
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT = os.path.join(root, 'mpc')
sheet = Image.open(sys.argv[1]).convert('RGB'); a = np.asarray(sheet)
mn = a.min(axis=2)
bg = (mn >= 244).astype(np.uint8)
# background = the white that touches the border
n, lab = cv2.connectedComponents(bg, connectivity=4)
border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
isbg = np.isin(lab, [b for b in border if b != 0 and bg[np.where(lab == b)][0] == 1][:] ) if False else None
bgmask = np.zeros(bg.shape, bool)
for b in border:
    if b == 0: continue
    ys, xs = np.where(lab == b);
    if bg[ys[0], xs[0]] == 1: bgmask |= (lab == b)
fg = (~bgmask).astype(np.uint8)
fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
n2, lab2, stats, cent = cv2.connectedComponentsWithStats(fg, connectivity=8)
comps = [i for i in range(1, n2) if stats[i, cv2.CC_STAT_AREA] > 20000]
comps.sort(key=lambda i: (round(cent[i][1] / (a.shape[0] / 2)), cent[i][0]))   # rows then columns
print('cans found', len(comps))
for k, i in enumerate(comps[:12], 1):
    x, y, w, h = stats[i, 0], stats[i, 1], stats[i, 2], stats[i, 3]
    m = (lab2 == i).astype(np.uint8) * 255
    m = cv2.GaussianBlur(cv2.erode(m, np.ones((3, 3), np.uint8)), (0, 0), 1.1)
    rgba = np.dstack([a, m])[max(0, y - 6):y + h + 6, max(0, x - 6):x + w + 6]
    im = Image.fromarray(rgba, 'RGBA'); s = 560 / im.size[1]
    im = im.resize((max(1, int(im.size[0] * s)), 560), Image.LANCZOS)
    im.save(os.path.join(OUT, 'can_%02d.webp' % k), quality=88, method=6)
    print(k, im.size)
# the desk without its can: copy real wood from the empty-desk picture over it and blend the edge in (Poisson blend), so the grain stays
d = cv2.imread(sys.argv[2]); H, W = d.shape[:2]
bgp = cv2.imread(os.path.join(OUT, 'bg_h.webp'))
mask = np.zeros((H, W), np.uint8)
poly = np.array([[1662, 215], [1715, 138], [1790, 112], [1880, 130], [1925, 175], [1935, 260], [1935, 340], [1900, 440], [1835, 496], [1735, 492], [1668, 432], [1648, 330]], np.int32)
cv2.fillPoly(mask, [poly], 255)
x, y, w, h = cv2.boundingRect(poly)
sx, sy = 1010, 530                      # wood in the empty desk picture
patch = bgp[sy:sy + h, sx:sx + w].copy()
m = mask[y:y + h, x:x + w].copy()
m = cv2.erode(m, np.ones((5, 5), np.uint8))
# match the brightness of the patch to the wood around the can
ring = cv2.dilate(mask, np.ones((61, 61), np.uint8)) - cv2.dilate(mask, np.ones((21, 21), np.uint8))
tgt = d[ring > 0].reshape(-1, 3).mean(axis=0); cur = patch.reshape(-1, 3).mean(axis=0)
patch = np.clip(patch.astype(np.float32) * (tgt / cur), 0, 255).astype(np.uint8)
res = cv2.seamlessClone(patch, d, m, (x + w // 2, y + h // 2), cv2.NORMAL_CLONE)
Image.fromarray(cv2.cvtColor(res, cv2.COLOR_BGR2RGB)).save(os.path.join(OUT, 'desk_nocan.webp'), quality=90, method=6)
print('plate done')
