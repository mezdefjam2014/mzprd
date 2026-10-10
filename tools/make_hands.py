"""Cuts the two hand photos out (skin colour on a dark mouse pad) and writes mpc/hand_r.webp, mpc/hand_l.webp and mpc/hands.json
Usage: python tools/make_hands.py <right_hand.jpg> <left_hand.jpg>"""
import sys, json, os, numpy as np
from PIL import Image, ImageDraw, ImageFilter
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(root, 'mpc')
SEEDS = {'r': (610, 1150), 'l': (640, 1050)}  # a point inside each wrist
meta = {}
for key, path in zip(('r', 'l'), sys.argv[1:3]):
    im = Image.open(path).convert('RGB')
    a = np.asarray(im).astype(np.float32); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = a.max(axis=2); mn = a.min(axis=2); sat = (mx - mn) / (mx + 1e-3)
    # skin, loosely: warm (red above blue), not an LED colour, brighter than the dark pad; nails and shaded skin included
    skin = (r >= g - 4) & (g >= b - 8) & (r - b > 7) & (mx > 66) & ((b - g) < 14) & (sat < .8)
    raw = Image.fromarray((skin * 255).astype(np.uint8), 'L').filter(ImageFilter.MinFilter(3))
    m = raw
    m = m.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5))        # remove specks
    m = m.filter(ImageFilter.MaxFilter(21)).filter(ImageFilter.MinFilter(21))        # close small gaps (nails, creases)
    # gap filling may only happen right next to real skin (nails, creases), never between the fingers
    near = raw.filter(ImageFilter.MaxFilter(9))
    m = Image.fromarray((np.minimum(np.asarray(m), np.asarray(near))).astype(np.uint8), 'L')
    # keep only the piece of skin that is the hand + arm
    lab = m.point(lambda v: 255 if v > 127 else 0).copy()
    ImageDraw.floodfill(lab, SEEDS[key], 128, thresh=0)
    sel = (np.asarray(lab) == 128)
    mk = Image.fromarray((sel * 255).astype(np.uint8), 'L').filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.8))
    ys, xs = np.where(sel)
    top = ys.min(); rows = np.where(ys < top + 8)[0]; tipx = float(xs[rows].mean())
    bot = ys.max(); bx = float(xs[ys > bot - 6].mean())
    # keep the hand and about 1500 px of arm
    y0 = max(0, top - 14); y1 = min(im.size[1], top + (1370 if key == 'r' else 1130)); x0 = max(0, xs.min() - 14); x1 = min(im.size[0], xs.max() + 14)
    rgba = im.copy(); rgba.putalpha(mk)
    rgba = rgba.crop((x0, y0, x1, y1))
    S = 760 / rgba.size[0] if rgba.size[0] > 760 else 1.0
    # carry the arm on past the picture (so it runs off the bottom of the video frame) along the same slant, shaded darker
    ext = 900; arr = np.asarray(rgba).astype(np.float32); H0, W0 = arr.shape[:2]
    def cx(y):
        al = arr[y, :, 3]; xs2 = np.where(al > 128)[0]; return float(xs2.mean()) if len(xs2) else W0 / 2
    sl = (cx(H0 - 4) - cx(H0 - 260)) / 256.0
    base = arr[H0 - 14:H0].mean(axis=0)
    rows = np.zeros((ext, W0, 4), np.float32)
    for i in range(ext):
        sh = int(round(sl * (i + 1))); r_ = np.roll(base, sh, axis=0)
        if sh > 0: r_[:sh] = 0
        elif sh < 0: r_[sh:] = 0
        k = 1 - .5 * (i / ext); r_ = r_.copy(); r_[:, :3] *= k; rows[i] = r_
    full = np.concatenate([arr, rows], axis=0).astype(np.uint8); rgba = Image.fromarray(full, 'RGBA')
    out = rgba.resize((int(rgba.size[0] * S), int(rgba.size[1] * S)), Image.LANCZOS)
    out.save(os.path.join(OUT, 'hand_%s.webp' % key), quality=88, method=6)
    # finger width 110 px below the tip (original px), arm axis from tip to the bottom of the arm
    row = np.where(sel[top + 110])[0]; fw = float(row.max() - row.min()) if len(row) else 100
    meta[key] = {'w': out.size[0], 'h': out.size[1], 'tip': [(tipx - x0) * S, (top - y0) * S], 'axis': float(np.arctan2(bx - tipx, bot - top if bot - top > 0 else 1)),
                 'finger': fw * S}
    print(key, out.size, meta[key])
json.dump(meta, open(os.path.join(OUT, 'hands.json'), 'w'))
