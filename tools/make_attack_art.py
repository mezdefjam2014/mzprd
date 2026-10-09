"""Cuts the green background out of the 30 attack images and writes battle/a01_1.webp .. a10_3.webp (fighter number, attack order).
Usage: python tools/make_attack_art.py "<folder with the 10 fighter folders>" """
import sys, os, glob, numpy as np
from PIL import Image
root = sys.argv[1]
ORDER = {'Beat Smith': 1, 'THE DISC THROWER': 2, 'The Crate King': 3, 'The Prodigy': 4, 'The Queen of Keys': 5,
         'The Crate Digger': 6, 'The Cable Whip': 7, 'The Night Owl': 8, 'The Drummer': 9, 'The Hustler': 10}
out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'battle')
for d, n in ORDER.items():
    for k, f in enumerate(sorted(glob.glob(os.path.join(root, d, '*.png')))[:3], 1):
        im = Image.open(f).convert('RGB').resize((768, 768), Image.LANCZOS)
        a = np.asarray(im).astype(np.float32); r, g, b = a[..., 0], a[..., 1], a[..., 2]
        dom = g - np.maximum(r, b)
        alpha = 1 - np.clip((dom - 55) / 85, 0, 1)
        g2 = np.minimum(g, np.maximum(r, b) + 28)        # despill the green fringe
        a[..., 1] = np.where(alpha < 1, g2, g)
        rgba = np.dstack([a, alpha * 255]).astype(np.uint8)
        Image.fromarray(rgba, 'RGBA').save(os.path.join(out, f'a{n:02d}_{k}.webp'), quality=84, method=6)
print('ok')
