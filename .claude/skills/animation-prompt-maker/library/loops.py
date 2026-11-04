"""Turn a raw recording into a clean, seamless, in-place game loop (the way animators do it):
   actions: calm pose -> full move (wind-up, hit, recovery) -> back to the calm pose, joined with a short crossfade at the seam only
   cycles:  one full stride, steady forward travel removed (bob and sway kept), short crossfade at the seam"""
import math, numpy as np, mocap
FPS = mocap.FPS
P = mocap.PTS
HIP = P.index("hip")

def arr(m): return np.stack([m[k] for k in P], 1)            # N x J x 3
def unarr(a): return {k: a[:, i].copy() for i, k in enumerate(P)}

def facing(a):
    r = a[:, P.index("hF")] - a[:, P.index("hB")]; r[:, 1] = 0
    r /= np.linalg.norm(r, axis=1, keepdims=True) + 1e-9
    return np.stack([r[:, 2], 0 * r[:, 0], -r[:, 0]], 1)
def frames_local(a):
    f = facing(a); r = np.stack([-f[:, 2], 0 * f[:, 0], f[:, 0]], 1)
    d = a - a[:, HIP][:, None]
    loc = np.stack([(d * f[:, None]).sum(2), -d[:, :, 1], (d * r[:, None]).sum(2)], 2)
    loc[:, :, 1] += (mocap.FLOOR - a[:, HIP, 1])[:, None]
    return loc, np.arctan2(f[:, 2], f[:, 0])

ENDS = [P.index(k) for k in ("rH", "lH", "fAn", "bAn", "hd")]
def activity(loc, w=9):
    v = np.linalg.norm(np.diff(loc[:, ENDS], axis=0), axis=2).sum(1)
    v = np.append(v, v[-1]); return np.convolve(v, np.ones(w) / w, "same")
def pose_dist(loc, i, j): return np.linalg.norm(loc[i] - loc[j], axis=1).mean()
def ydiff(a, b): return abs(math.remainder(a - b, 2 * math.pi))

def action_window(a, focus=None, min_s=1.0, max_s=3.0):
    loc, yaw = frames_local(a); act = activity(loc); N = len(a)
    score = act.copy()
    if focus == "kick": score = score + np.maximum(0, loc[:, [P.index("fAn"), P.index("bAn")], 1].max(1) - 25) / 4
    if focus == "hands":
        h = loc[:, [P.index("rH"), P.index("lH")]]
        score = np.convolve(np.linalg.norm(np.diff(h, axis=0, append=h[-1:]), axis=2).sum(1), np.ones(5) / 5, "same")
    pk = int(np.argmax(score[int(.05 * N):int(.95 * N)])) + int(.05 * N)
    calm = np.percentile(act, 35)
    B = 8
    S = [s for s in range(max(0, pk - int(2.2 * FPS)), pk - int(.2 * FPS)) if act[s] <= calm * 1.6] or list(range(max(0, pk - int(1.5 * FPS)), max(1, pk - 3)))
    E = [e for e in range(pk + int(.25 * FPS), min(N - B - 1, pk + int(2.6 * FPS))) if act[e] <= calm * 1.6] or list(range(pk + 4, max(pk + 5, min(N - B - 1, pk + int(2 * FPS)))))
    best = None
    for s in S:
        for e in E:
            L = e - s
            if L < min_s * FPS or L > max_s * FPS: continue
            hd = np.linalg.norm((a[e, HIP] - a[s, HIP])[[0, 2]])
            c = pose_dist(loc, s, e) + 0.15 * hd + 30 * ydiff(yaw[e], yaw[s]) + 0.6 * (act[s] + act[e]) + 0.01 * L
            if best is None or c < best[0]: best = (c, s, e)
    if best is None: return max(0, pk - 20), min(N - B - 1, pk + 25)
    return best[1], best[2]

def cycle_window(a, min_s=0.8, max_s=1.6):
    loc, yaw = frames_local(a); N = len(a); act = activity(loc)
    need = 0.6 * np.percentile(act, 75); cs = np.concatenate([[0], np.cumsum(act)])
    best = None; B = 8
    for L in range(int(min_s * FPS), int(max_s * FPS) + 1):
        for s in range(int(N * .1), int(N * .9) - L - B, 2):
            if (cs[s + L] - cs[s]) / L < need: continue
            c = np.mean([pose_dist(loc, s + k, s + L + k) for k in (0, 3, 6)]) + 30 * ydiff(yaw[s + L], yaw[s]) + 0.003 * L
            if best is None or c < best[0]: best = (c, s, s + L)
    if best is None: return int(N * .3), int(N * .3) + FPS
    return best[1], best[2]

def align(seg, yaw0, origin):
    """turn the clip so it faces +x and starts at the origin (one fixed transform: nothing is bent)"""
    c, s = math.cos(-yaw0), math.sin(-yaw0)
    d = seg - origin
    x = d[..., 0] * c - d[..., 2] * s; z = d[..., 0] * s + d[..., 2] * c
    return np.stack([x, seg[..., 1], z], -1)

def build(a, s, e, kind):
    N = len(a); L = e - s; B = int(min(10, L // 4, N - e - 1)); B = max(B, 3)
    _, yaw = frames_local(a)
    o = a[s, HIP].copy(); o[1] = 0
    seg = align(a[s:e + B], yaw[s], o)                     # L + B frames
    hip = seg[:, HIP, :].copy()
    if kind == "cycle":
        v = (hip[L] - hip[0]) / L; v[1] = 0                # steady travel per frame
        seg = seg - (np.arange(len(seg))[:, None] * v)[:, None, :]
    else:
        # leftover step and turn between end and start: spread evenly over the clip (Mixamo "in place")
        _, yw = frames_local(seg)
        dy = math.remainder(yw[L] - yw[0], 2 * math.pi); drift = hip[L] - hip[0]; drift[1] = 0
        for i in range(len(seg)):
            t = i / L; c, sn = math.cos(dy * t), math.sin(dy * t)
            d = seg[i] - seg[i, HIP]; d = np.stack([d[:, 0] * c - d[:, 2] * sn, d[:, 1], d[:, 0] * sn + d[:, 2] * c], 1)
            seg[i] = d + seg[i, HIP] - drift * t
    out = seg[:L].copy()
    for j in range(B):                                     # crossfade: the frames after the end blend into the first frames
        w = 0.5 - 0.5 * math.cos(math.pi * (j + 1) / (B + 1))
        tail = seg[L + j].copy()
        out[j] = tail * (1 - w) + seg[j] * w
    return out

def make_loop(m, kind="action", focus=None, **kw):
    a = arr(m)
    s, e = cycle_window(a, **kw) if kind == "cycle" else action_window(a, focus, **kw)
    out = build(a, s, e, kind)
    lm = unarr(out)
    # keep feet on the floor (only lifts what sinks; walks also come down if floating)
    low = np.maximum(np.maximum(lm["fAn"][:, 1] + 4, lm["fTo"][:, 1]), np.maximum(lm["bAn"][:, 1] + 4, lm["bTo"][:, 1]))  # y points down: lowest point = largest y
    gap = mocap.FLOOR - low
    if kind != "cycle": gap = np.minimum(gap, 0)   # actions: only lift what sinks; cycles: lowest foot exactly on the floor
    lm = {k: v + np.stack([0 * gap, gap, 0 * gap], 1) for k, v in lm.items()}
    return lm, (s, e)

def seam_quality(m):
    a = arr(m); steps = np.linalg.norm(np.diff(a, axis=0), axis=2).mean(1)
    return np.linalg.norm(a[0] - a[-1], axis=1).mean() / (np.median(steps) + 1e-6)
def strength(a):
    loc, _ = frames_local(a); return float(activity(loc).max())
