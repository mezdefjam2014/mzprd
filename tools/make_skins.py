"""Builds machine-skin versions of the two desk pictures from the 4-skin sheet:
   mpc/desk_h_s2..s4.webp (16:9, no can) and mpc/desk_v_s2..s4.webp (9:16). Skin 1 (cream) is the original picture.
   Each skin is aligned to the machine in the desk picture (edge based, homography), then lit with the desk's own lighting
   (the low-frequency light of the original machine is transferred to the new surface).
Usage: python tools/make_skins.py <skin_sheet.webp>"""
import sys, os, numpy as np, cv2
from PIL import Image
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT = os.path.join(root, 'mpc')
sheet = cv2.cvtColor(np.asarray(Image.open(sys.argv[1]).convert('RGB')), cv2.COLOR_RGB2BGR)
H2, W2 = sheet.shape[0] // 2, sheet.shape[1] // 2
quads = [sheet[0:H2, 0:W2], sheet[0:H2, W2:], sheet[H2:, 0:W2], sheet[H2:, W2:]]
SKIN_BOX = [(31, 53, 983, 961), (19, 53, 972, 963), (31, 20, 985, 937), (17, 18, 972, 940)]   # machine bbox in each quadrant
ZONES = {   # (top zone box, panel zone box) in picture pixels: the screen/knobs strip and the pads/buttons panel
    'h': dict(top=(560, 230, 1560, 430), panel=(560, 500, 1560, 960), split=(430, 500)),
    'v': dict(top=(120, 630, 1040, 790), panel=(120, 880, 1040, 1300), split=(790, 880)),
}
# zones that get their own fine alignment (a scale and a shift each): screen strip, pads panel, command panel, and the play/rec button row
LZ = {
    'h': [(560, 230, 1560, 430), (560, 500, 1070, 940), (1060, 500, 1560, 940), (1240, 835, 1530, 960)],
    'v': [(120, 630, 1040, 790), (120, 880, 575, 1300), (565, 880, 1040, 1300), (740, 1165, 1000, 1300)],
}
def local_align(ref, img, zones):
    h, w = img.shape[:2]; er, ei = edges(ref), edges(img)
    outs = []; wts = []
    for zi, z in enumerate(zones):
        x0, y0, x1, y1 = z; T = er[y0:y1, x0:x1].copy(); S = ei[y0:y1, x0:x1].copy()
        cands = [np.eye(2, 3, dtype=np.float32)]
        def pc(a_, b_):
            try:
                win = cv2.createHanningWindow((a_.shape[1], a_.shape[0]), cv2.CV_32F); (dx_, dy_), _r = cv2.phaseCorrelate(a_.astype(np.float32), b_.astype(np.float32), win)
                if abs(dx_) < 70 and abs(dy_) < 70: m_ = np.eye(2, 3, dtype=np.float32); m_[0, 2] = dx_; m_[1, 2] = dy_; return m_
            except cv2.error: pass
            return None
        c1 = pc(T, S)
        if c1 is not None: cands.append(c1)
        if zi == 3:
            def cream(im):
                r = im[y0:y1, x0:x1].astype(int); g = r.mean(axis=2); sat = r.max(axis=2) - r.min(axis=2)
                return cv2.GaussianBlur(((g > 165) & (sat < 60)).astype(np.float32), (0, 0), 3)
            c2 = pc(cream(ref), cream(img))
            if c2 is not None: cands.append(c2)
        best = (-1, np.eye(2, 3, dtype=np.float32))
        for M0 in cands:
            M = M0.copy(); cc = -1
            for sc in (4, 2, 1):
                t = cv2.resize(T, None, fx=1 / sc, fy=1 / sc, interpolation=cv2.INTER_AREA); s_ = cv2.resize(S, None, fx=1 / sc, fy=1 / sc, interpolation=cv2.INTER_AREA)
                Ms = M.copy(); Ms[:, 2] /= sc
                try: cc, Ms = cv2.findTransformECC(t, s_, Ms, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 150, 1e-7), None, 5)
                except cv2.error: cc = -1; break
                M = Ms.copy(); M[:, 2] *= sc
            if cc > best[0]: best = (cc, M.copy())
        M = best[1]
        H3 = np.vstack([M, [0, 0, 1]]); To = np.array([[1, 0, x0], [0, 1, y0], [0, 0, 1]], np.float32)
        Mf = (To @ H3 @ np.linalg.inv(To))[:2]
        outs.append(cv2.warpAffine(img, Mf, (w, h), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP, borderValue=(255, 255, 255)).astype(np.float32))
        m = np.zeros((h, w), np.float32); m[y0:y1, x0:x1] = 1; wts.append(cv2.GaussianBlur(m, (0, 0), 7))
    # the button row zone sits on top of the command panel zone: give the smaller zones more weight
    bm = np.clip(wts[3], 0, 1)
    for i in (0, 1, 2): wts[i] = wts[i] * (1 - bm)
    lp = np.clip(wts[1], 0, 1); wts[2] = wts[2] * (1 - lp)
    tot = sum(wts) + 1e-3; rest = np.clip(1 - tot, 0, 1); res = img.astype(np.float32) * rest[..., None]
    norm = np.maximum(tot, 1.0)
    for o, wt in zip(outs, wts): res += o * (wt / norm)[..., None]
    return np.clip(res, 0, 255).astype(np.uint8)
TARGETS = {
    'h': dict(src='desk_nocan.webp', box=(497, 123, 1613, 1052)),
    'v': dict(src='desk_v.webp', box=(60, 505, 1078, 1397)),
}
def edges(img):
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
    g = cv2.GaussianBlur(g, (0, 0), 1.6)
    gx = cv2.Sobel(g, cv2.CV_32F, 1, 0); gy = cv2.Sobel(g, cv2.CV_32F, 0, 1)
    m = np.sqrt(gx * gx + gy * gy); return cv2.GaussianBlur(m, (0, 0), 2.0) / (m.max() + 1e-6)
def zone_shift(ref, img, box):
    x0, y0, x1, y1 = box
    a = edges(ref)[y0:y1, x0:x1]; b = edges(img)[y0:y1, x0:x1]
    win = cv2.createHanningWindow((a.shape[1], a.shape[0]), cv2.CV_32F)
    (dx, dy), resp = cv2.phaseCorrelate(a.astype(np.float32), b.astype(np.float32), win); return dx, dy, resp
def remap_zones(img, shifts, split):
    h, w = img.shape[:2]; y = np.arange(h, dtype=np.float32)
    t = np.clip((y - split[0]) / max(1, split[1] - split[0]), 0, 1); t = t * t * (3 - 2 * t)
    dxs = shifts[0][0] * (1 - t) + shifts[1][0] * t; dys = shifts[0][1] * (1 - t) + shifts[1][1] * t
    mx, my = np.meshgrid(np.arange(w, dtype=np.float32), y)
    return cv2.remap(img, mx + dxs[:, None], my + dys[:, None], cv2.INTER_CUBIC, borderValue=(255, 255, 255))
def warp_skin(qi, tgt, box):
    sx0, sy0, sx1, sy1 = SKIN_BOX[qi]; tx0, ty0, tx1, ty1 = box
    q = quads[qi]
    A = np.array([[(tx1 - tx0) / (sx1 - sx0), 0, tx0 - sx0 * (tx1 - tx0) / (sx1 - sx0)], [0, (ty1 - ty0) / (sy1 - sy0), ty0 - sy0 * (ty1 - ty0) / (sy1 - sy0)]], np.float32)
    h, w = tgt.shape[:2]
    pre = cv2.warpAffine(q, A, (w, h), flags=cv2.INTER_CUBIC, borderValue=(255, 255, 255))
    return pre
def refine(pre, tgt, box):
    # align the edges of the pre-warped skin to the edges of the real machine (homography, coarse to fine)
    tx0, ty0, tx1, ty1 = box; pad = 30
    r = (max(0, tx0 - pad), max(0, ty0 - pad), min(tgt.shape[1], tx1 + pad), min(tgt.shape[0], ty1 + pad))
    T = edges(tgt)[r[1]:r[3], r[0]:r[2]]; S = edges(pre)[r[1]:r[3], r[0]:r[2]]
    M = np.eye(3, dtype=np.float32)
    for sc in (4, 2, 1):
        t = cv2.resize(T, None, fx=1 / sc, fy=1 / sc, interpolation=cv2.INTER_AREA); s = cv2.resize(S, None, fx=1 / sc, fy=1 / sc, interpolation=cv2.INTER_AREA)
        Ms = M.copy(); Ms[0, 2] /= sc; Ms[1, 2] /= sc; Ms[2, 0] *= sc; Ms[2, 1] *= sc
        try:
            _, Ms = cv2.findTransformECC(t, s, Ms, cv2.MOTION_HOMOGRAPHY, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 120, 1e-6), None, 5)
        except cv2.error as e:
            print('   ecc failed at', sc); break
        M = Ms.copy(); M[0, 2] *= sc; M[1, 2] *= sc; M[2, 0] /= sc; M[2, 1] /= sc
    full = np.eye(3, dtype=np.float32); full[0, 2] = -r[0]; full[1, 2] = -r[1]
    back = np.eye(3, dtype=np.float32); back[0, 2] = r[0]; back[1, 2] = r[1]
    Mfull = back @ np.linalg.inv(M) @ full if False else back @ M @ full
    return Mfull
for key, T in TARGETS.items():
    tgt = cv2.imread(os.path.join(OUT, T['src'])); box = T['box']
    base0 = cv2.imread(os.path.join(OUT, 'desk.webp')) if key == 'h' else tgt        # original machine (with its lighting)
    warped = []
    for qi in range(4):
        pre = warp_skin(qi, tgt, box)
        M = refine(pre, base0, box)
        w = cv2.warpPerspective(pre, M, (tgt.shape[1], tgt.shape[0]), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP, borderValue=(255, 255, 255))
        w = local_align(base0, w, LZ[key])
        fin = 0
        warped.append(w); print(key, 'skin', qi + 1, 'aligned')
    # machine mask of each skin (anything not white)
    def mask_of(w):
        m = (w.min(axis=2) < 238).astype(np.uint8)
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)); n, lab, st, _ = cv2.connectedComponentsWithStats(m, connectivity=8)
        k = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA]); m = (lab == k).astype(np.uint8)
        m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8)); return m
    # lighting of the desk: low-frequency light of the ORIGINAL machine divided by the low-frequency light of the (cream) skin 1
    m1 = mask_of(warped[0]); orig = base0.astype(np.float32)
    def lowpass(img, m, s):
        mm = cv2.GaussianBlur(m.astype(np.float32), (0, 0), s) + 1e-4
        return np.dstack([cv2.GaussianBlur(img[..., c] * m, (0, 0), s) / mm for c in range(3)])
    L_orig = lowpass(orig, m1.astype(np.float32), 45); L_skin = lowpass(warped[0].astype(np.float32), m1.astype(np.float32), 45)
    light = np.clip(L_orig / (L_skin + 1), .35, 2.4)
    for qi in range(1, 4):
        w = warped[qi].astype(np.float32); m = mask_of(warped[qi])
        lit = np.clip(w * light, 0, 255)
        # the original machine is under the new one: use the new mask (slightly eroded) with a soft edge
        mk = cv2.GaussianBlur(cv2.erode(m, np.ones((3, 3), np.uint8)).astype(np.float32), (0, 0), 1.2)[..., None]
        # where the old machine sticks out past the new one, keep the old (it is almost the same outline)
        if key == 'h':
            # the lamp shade hangs over the top-left corner of the machine: keep the original lamp, not the new skin
            lum = cv2.cvtColor(base0, cv2.COLOR_BGR2GRAY); dark = (lum < 70).astype(np.uint8); dark[:, 760:] = 0; dark[460:, :] = 0
            nn, ll = cv2.connectedComponents(dark, connectivity=8); lamp = (ll == ll[150, 150]).astype(np.uint8) if ll[150, 150] else np.zeros_like(dark)
            lamp = cv2.morphologyEx(lamp, cv2.MORPH_CLOSE, np.ones((21, 21), np.uint8)); lamp = cv2.dilate(lamp, np.ones((9, 9), np.uint8))
            lm = cv2.GaussianBlur(lamp.astype(np.float32), (0, 0), 2.0)[..., None]; mk = mk * (1 - lm)
        res = tgt.astype(np.float32) * (1 - mk) + lit * mk
        out = os.path.join(OUT, 'desk_%s_s%d.webp' % (key, qi + 1))
        Image.fromarray(cv2.cvtColor(np.clip(res, 0, 255).astype(np.uint8), cv2.COLOR_BGR2RGB)).save(out, quality=90, method=6)
        print('wrote', out)
