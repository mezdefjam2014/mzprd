"""Turn a raw recording into a clean, seamless, in-place loop (Mixamo style)."""
import math, numpy as np, mocap
FPS = mocap.FPS
P = mocap.PTS

def arr(m): return np.stack([m[k] for k in P], 1)            # N x J x 3
def unarr(a): return {k: a[:, i].copy() for i, k in enumerate(P)}

def frames_local(a):
    """every joint in the hips' own frame (forward, up, right) -> compare poses regardless of position/facing"""
    hip = a[:, P.index("hip")]; r = a[:, P.index("hF")] - a[:, P.index("hB")]; r[:, 1] = 0
    r /= np.linalg.norm(r, axis=1, keepdims=True) + 1e-9
    f = np.stack([r[:, 2], 0 * r[:, 0], -r[:, 0]], 1)
    d = a - hip[:, None]
    loc = np.stack([(d * f[:, None]).sum(2), -d[:, :, 1], (d * r[:, None]).sum(2)], 2)
    loc[:, :, 1] += (mocap.FLOOR - hip[:, 1])[:, None]       # keep hip height in the comparison
    yaw = np.arctan2(f[:, 2], f[:, 0])
    return loc, yaw

ENDS = [P.index(k) for k in ("rH", "lH", "fAn", "bAn", "hd")]
def activity(loc):
    v = np.linalg.norm(np.diff(loc[:, ENDS], axis=0), axis=2).sum(1)
    v = np.append(v, v[-1]); return np.convolve(v, np.ones(5) / 5, "same")

def pose_dist(loc, i, j): return np.linalg.norm(loc[i] - loc[j], axis=1).mean()

def best_action_window(a, focus=None, min_s=0.6, max_s=2.6):
    """one action: the strongest burst, cut where the start and end poses match and the body is calm"""
    loc, yaw = frames_local(a); act = activity(loc); N = len(a)
    score = act.copy()
    if focus == "kick": score = score + 3 * np.maximum(0, loc[:, [P.index("fAn"), P.index("bAn")], 1].max(1) - 20) / 10
    if focus == "hands": score = np.linalg.norm(np.diff(loc[:, [P.index("rH"), P.index("lH")]], axis=0, append=loc[-1:, [P.index("rH"), P.index("lH")]]), axis=2).sum(1)
    pk = int(np.argmax(np.convolve(score, np.ones(5) / 5, "same")))
    best = None
    for s in range(max(0, pk - int(max_s * FPS * .7)), max(1, pk - 3)):
        for e in range(pk + 4, min(N, s + int(max_s * FPS))):
            L = e - s
            if L < min_s * FPS: continue
            dy = abs(math.remainder(yaw[e] - yaw[s], 2 * math.pi))
            c = pose_dist(loc, s, e) + 25 * dy + 1.5 * (act[s] + act[e]) + 0.02 * L
            if best is None or c < best[0]: best = (c, s, e)
    if best is None: return 0, N - 1
    return best[1], best[2]

def best_cycle(a, min_s=0.55, max_s=1.8):
    """locomotion: one exact gait cycle (same pose, same foot forward) from the steadiest part of the clip"""
    loc, yaw = frames_local(a); N = len(a); best = None
    lo, hi = int(min_s * FPS), int(max_s * FPS)
    a0, a1 = int(N * .1), int(N * .9)
    act = activity(loc); need = 0.6 * np.percentile(act, 80); cs = np.concatenate([[0], np.cumsum(act)])
    for L in range(lo, min(hi, (a1 - a0) - 1)):
        for s in range(a0, a1 - L, 2):
            if (cs[s + L] - cs[s]) / L < need: continue      # must actually be moving, not standing still
            dy = abs(math.remainder(yaw[s + L] - yaw[s], 2 * math.pi))
            c = pose_dist(loc, s, s + L) + 25 * dy + 0.004 * L
            if best is None or c < best[0]: best = (c, s, s + L)
    if best is None: return 0, N - 1
    return best[1], best[2]

def close_loop(a, s, e, inplace=True):
    """cut [s, e), face +x, remove travel, and spread the tiny start/end mismatch across the clip so frame e == frame s"""
    seg = a[s:e + 1].copy(); N = len(seg)
    loc, yaw = frames_local(seg)
    # face +x at the start, then cancel any slow turning so it doesn't spin over repeats
    w = np.linspace(0, 1, N)
    drift = math.remainder(yaw[-1] - yaw[0], 2 * math.pi)
    hip = seg[:, P.index("hip")].copy()
    out = np.empty_like(seg)
    for i in range(N):
        t = -(yaw[0] + drift * w[i])            # rotate so facing -> +x
        c, sn = math.cos(t), math.sin(t)
        d = seg[i] - hip[i]
        x = d[:, 0] * c + d[:, 2] * sn; z = -d[:, 0] * sn + d[:, 2] * c
        out[i] = np.stack([x, d[:, 1], z], 1)
        out[i][:, 1] += hip[i][1]
        if not inplace: out[i][:, 0] += hip[i][0] - hip[0][0]; out[i][:, 2] += hip[i][2] - hip[0][2]
    # spread the leftover pose difference (end vs start) linearly so the loop closes exactly
    diff = out[-1] - out[0]
    out -= diff[None] * w[:, None, None]
    return out[:-1]                              # last frame == first frame, so drop it

def plant(m):
    """walk cycles: keep the lowest foot on the floor every frame (no floating), smoothed around the loop"""
    low = np.minimum(np.minimum(m["fAn"][:, 1] + 4, m["fTo"][:, 1]), np.minimum(m["bAn"][:, 1] + 4, m["bTo"][:, 1]))
    gap = mocap.FLOOR - low; w = 5
    gap = np.convolve(np.pad(gap, w // 2, mode="wrap"), np.ones(w) / w, "valid")
    return {k: v + np.stack([0 * gap, gap, 0 * gap], 1) for k, v in m.items()}

def strength(a):
    loc, _ = frames_local(a); return float(activity(loc).max())

def make_loop(m, kind="action", focus=None, **kw):
    a = arr(m)
    s, e = best_cycle(a, **kw) if kind == "cycle" else best_action_window(a, focus, **kw)
    out = close_loop(a, s, e, inplace=True)
    loopm = mocap.ground(mocap.fix_lengths(unarr(out), unarr(out)))
    if kind == "cycle": loopm = plant(loopm)
    return loopm, (s, e)

def seam_quality(m):
    """jump across the loop seam compared with a normal frame step (1.0 = invisible)"""
    a = arr(m); steps = np.linalg.norm(np.diff(a, axis=0), axis=2).mean(1)
    seam = np.linalg.norm(a[0] - a[-1], axis=1).mean()
    return seam / (np.median(steps) + 1e-6)
