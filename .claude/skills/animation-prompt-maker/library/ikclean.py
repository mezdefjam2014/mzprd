"""Final IK cleanup applied to every new move: exact bone lengths, feet locked during ground contact
(legs re-solved with two-bone IK, original knee direction kept), nothing below the floor,
optional two-handed weapon grip (left hand IK'd onto the handle)."""
import numpy as np, mocap, weapons
P = mocap.PTS; I = {k: i for i, k in enumerate(P)}
IKF = weapons.IK["ik"]
FLOOR = mocap.FLOOR

def lengths_from(a):
    return {(x, y): float(np.median(np.linalg.norm(a[:, I[y]] - a[:, I[x]], axis=1))) for x, y in mocap.CHAIN}

def solve_leg(a, i, hip, knee, ank, toe, target):
    h = a[i, I[hip]]; k = a[i, I[knee]]; an = a[i, I[ank]]
    L1 = np.linalg.norm(k - h); L2 = np.linalg.norm(an - k)
    mid = (h + an) / 2; pole = k - mid
    if np.linalg.norm(pole) < 1e-3: pole = np.array([1.0, 0, 0])
    nk, na = IKF(tuple(h), tuple(target), L1, L2, tuple(pole / np.linalg.norm(pole)), 165)
    toe_off = a[i, I[toe]] - an
    a[i, I[knee]] = nk; a[i, I[ank]] = na; a[i, I[toe]] = np.asarray(na) + toe_off

def lock_feet(a, loop=False):
    """foot is planted when its ankle is low and nearly still: pin it for the whole contact, re-solve the leg"""
    N = len(a)
    for hip, knee, ank, toe in (("hF", "fK", "fAn", "fTo"), ("hB", "bK", "bAn", "bTo")):
        y = a[:, I[ank], 1]; sp = np.r_[0, np.linalg.norm(np.diff(a[:, I[ank]], axis=0), axis=1)]
        contact = (y > FLOOR - 12) & (sp < 1.3)
        i = 0
        while i < N:
            if not contact[i]: i += 1; continue
            j = i
            while j < N and contact[j]: j += 1
            if j - i >= 3:
                tgt = a[i:j, I[ank]].mean(0); tgt[1] = min(tgt[1], FLOOR - 4)
                for f in range(i, j):
                    w = min(1.0, (f - i + 1) / 2, (j - f) / 2)          # ease in/out over 2 frames
                    solve_leg(a, f, hip, knee, ank, toe, a[f, I[ank]] * (1 - w) + tgt * w)
            i = j
    return a

def no_penetration(a):
    low = a[:, :, 1].max(1)                                         # y points down: largest y = lowest point
    lift = np.maximum(0, low - FLOOR)
    a[:, :, 1] -= lift[:, None]
    return a

def clean(m, lock=True):
    a = np.stack([m[k] for k in P], 1).astype(float)
    ref = {k: a[:, I[k]].copy() for k in P}
    fixed = mocap.fix_lengths({k: a[:, I[k]] for k in P}, ref); a = np.stack([fixed[k] for k in P], 1)
    if lock: a = lock_feet(a)
    a = no_penetration(a)
    return {k: a[:, I[k]].copy() for k in P}

def foot_slide(m):
    """worst sliding of a planted foot (units per frame) - 0 is perfect"""
    worst = 0.0
    for ank in ("fAn", "bAn"):
        p = m[ank]; sp = np.r_[0, np.linalg.norm(np.diff(p[:, [0, 2]], axis=0), axis=1)]
        planted = p[:, 1] > FLOOR - 6
        if planted.sum() > 2: worst = max(worst, float(np.percentile(sp[planted], 95)))
    return worst

def bat_grip(m, bat_len=60, dirs=None):
    """two hands on one bat: model the bat direction, put the left hand on the handle with arm IK"""
    N = len(m["hip"]); rH = m["rH"]; chest = m["sh"]
    v = np.gradient(rH, axis=0); sp = np.linalg.norm(v, axis=1)
    out_dir = rH - chest; out_dir /= np.linalg.norm(out_dir, axis=1, keepdims=True) + 1e-9
    up_back = np.array([-0.35, -1.0, 0.0]); up_back /= np.linalg.norm(up_back)
    trail = -v / (sp[:, None] + 1e-9)
    w = np.clip((sp - 1.5) / 4.0, 0, 1)[:, None]                    # slow: bat held up/back; fast: bat trails the hands, whipping through
    d = (1 - w) * (0.5 * out_dir + up_back) + w * (0.45 * out_dir + trail)
    d /= np.linalg.norm(d, axis=1, keepdims=True) + 1e-9
    if dirs is not None: d = dirs                                    # real recorded wrist orientation wins
    k = 5; d = np.stack([np.convolve(np.pad(d[:, c], k // 2, mode="edge"), np.ones(k) / k, "valid") for c in range(3)], 1)
    d /= np.linalg.norm(d, axis=1, keepdims=True) + 1e-9
    lH_t = rH - d * 7                                               # left hand just below the right on the handle
    a = np.stack([m[x] for x in P], 1)
    for i in range(N):
        sh = a[i, I["shB"]]; e = a[i, I["lE"]]; h = a[i, I["lH"]]
        L1 = np.linalg.norm(e - sh); L2 = np.linalg.norm(h - e); pole = e - (sh + h) / 2
        if np.linalg.norm(pole) < 1e-3: pole = np.array([0, 1.0, 0])
        ne, nh = IKF(tuple(sh), tuple(lH_t[i]), L1, L2, tuple(pole / np.linalg.norm(pole)), 160)
        a[i, I["lE"]] = ne; a[i, I["lH"]] = nh
    mm = {x: a[:, I[x]].copy() for x in P}
    props = [[weapons.seg(rH[i] - d[i] * 10, rH[i] + d[i] * bat_len, 2, 4.5), weapons.seg(rH[i] + d[i] * (bat_len - 18), rH[i] + d[i] * bat_len, 2, 6.5)] for i in range(N)]
    return mm, props
