"""Builds mpc/hand_r.webp, mpc/hand_l.webp and mpc/hands.json from two hand cutouts that already have transparency.
Usage: python tools/make_hands.py <right_hand_cutout.webp> <left_hand_cutout.webp>
Stray specks are removed, the arm is carried on past the picture (along its slant, shaded darker) so it runs off the bottom of the video frame."""
import sys, json, os, numpy as np
from PIL import Image, ImageDraw, ImageFilter
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(root, 'mpc')
meta = {}
for key, path in zip(('r', 'l'), sys.argv[1:3]):
    im = Image.open(path).convert('RGBA'); a = np.asarray(im).copy(); al = a[..., 3]
    # keep only the biggest piece (the hand and arm), drop specks: label the pieces on a small copy
    from collections import deque
    sm = (al[::4, ::4] > 40); H4, W4 = sm.shape; lab = np.zeros((H4, W4), np.int32); best = (0, 0); n = 0
    for y in range(H4):
        for x in range(W4):
            if sm[y, x] and not lab[y, x]:
                n += 1; q = deque([(y, x)]); lab[y, x] = n; cnt = 0
                while q:
                    cy, cx_ = q.popleft(); cnt += 1
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = cy + dy, cx_ + dx
                        if 0 <= ny < H4 and 0 <= nx < W4 and sm[ny, nx] and not lab[ny, nx]: lab[ny, nx] = n; q.append((ny, nx))
                if cnt > best[0]: best = (cnt, n)
    big = (lab == best[1]); up = np.kron(big, np.ones((4, 4), bool))[:al.shape[0], :al.shape[1]]
    upm = Image.fromarray((up * 255).astype(np.uint8), 'L').filter(ImageFilter.MaxFilter(15))
    keep = (np.asarray(upm) > 0)
    a[..., 3] = np.where(keep, al, 0)
    ys, xs = np.where(a[..., 3] > 40)
    top, bot = ys.min(), ys.max(); x0, x1 = max(0, xs.min() - 8), min(im.size[0], xs.max() + 8); y0 = max(0, top - 8)
    rows = np.where(ys < top + 8)[0]; tipx = float(xs[rows].mean())
    bx = float(xs[ys > bot - 6].mean())
    rgba = Image.fromarray(a, 'RGBA').crop((x0, y0, x1, bot + 1))
    # carry the arm on past the picture
    ext = 800; arr = np.asarray(rgba).astype(np.float32); H0, W0 = arr.shape[:2]
    def cx(y):
        q = np.where(arr[y, :, 3] > 128)[0]; return float(q.mean()) if len(q) else W0 / 2
    sl = (cx(H0 - 4) - cx(H0 - 260)) / 256.0
    base = arr[H0 - 14:H0].mean(axis=0); rows_ = np.zeros((ext, W0, 4), np.float32)
    for i in range(ext):
        sh = int(round(sl * (i + 1))); r_ = np.roll(base, sh, axis=0)
        if sh > 0: r_[:sh] = 0
        elif sh < 0: r_[sh:] = 0
        r_ = r_.copy(); r_[:, :3] *= 1 - .5 * (i / ext); rows_[i] = r_
    full = Image.fromarray(np.concatenate([arr, rows_], axis=0).astype(np.uint8), 'RGBA')
    S = 760 / full.size[0] if full.size[0] > 760 else 1.0
    out = full.resize((int(full.size[0] * S), int(full.size[1] * S)), Image.LANCZOS)
    out.save(os.path.join(OUT, 'hand_%s.webp' % key), quality=90, method=6)
    meta[key] = {'w': out.size[0], 'h': out.size[1], 'tip': [round((tipx - x0) * S, 1), round((top - y0) * S, 1)], 'axis': round(float(np.arctan2(bx - tipx, bot - top)), 4)}
    print(key, out.size, meta[key])
json.dump(meta, open(os.path.join(OUT, 'hands.json'), 'w'))
