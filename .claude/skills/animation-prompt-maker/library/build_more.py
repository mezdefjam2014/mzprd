"""Extract hundreds of real moves (ducks, dodges, rolls, crawls, ladder/stairs climbing, falls, get-ups, flips,
jumps, kicks, throws, locomotion styles...) with per-type checks and IK cleanup.  python3 build_more.py"""
import json, gzip, math, re, numpy as np, mocap, loops, strikes, ikclean, weapons
from concurrent.futures import ThreadPoolExecutor
P = mocap.PTS; I = {k: i for i, k in enumerate(P)}; FPS = mocap.FPS; FLOOR = mocap.FLOOR
IDX = json.load(open(mocap.HERE / "cmu_index.json"))

def clips(words, exclude=(), limit=14):
    out = [c for c, d in IDX.items() if any(w in d.lower() for w in words) and not any(x in d.lower() for x in exclude)]
    return out[:limit]

# ---------- measurements on a motion (arrays N x J x 3, y down) ----------
def H(a, j): return FLOOR - a[:, I[j], 1]                       # height above the floor
def torso_up(a):
    d = a[:, I["sh"]] - a[:, I["hip"]]; return -d[:, 1] / (np.linalg.norm(d, axis=1) + 1e-9)   # 1 upright, 0 horizontal, <0 upside down
def travel(a):
    loc, yaw = loops.frames_local(a); d = a[-1, I["hip"]] - a[0, I["hip"]]
    f = np.array([math.cos(yaw[0]), 0, math.sin(yaw[0])]); r = np.array([-f[2], 0, f[0]])
    return float(d @ f), float(d @ r), float(-(d[1]))
def airborne(a): return np.minimum(H(a, "fAn"), H(a, "bAn")) > 14

CHECKS = {   # what makes each move type real
    "duck":      lambda a: H(a, "hd").min() < H(a, "hd")[0] - 22 and abs(H(a, "hd")[-1] - H(a, "hd")[0]) < 10 and torso_up(a).min() > .2,
    "dodge":     lambda a: (H(a, "hd").min() < H(a, "hd")[0] - 15 or np.ptp(loops.frames_local(a)[0][:, I["hd"], 2]) > 18) and not airborne(a).any(),
    "roll":      lambda a: torso_up(a).min() < .25 and H(a, "hip").min() < 45,
    "crawl":     lambda a: np.median(H(a, "hip")) < 62 and np.minimum(H(a, "rH"), H(a, "lH")).min() < 12,
    "climb":     lambda a: (np.maximum(H(a, "rH"), H(a, "lH")) > H(a, "hd")).mean() > .3 and abs(a[-1, I["hip"], 1] - a[0, I["hip"], 1]) > 8,
    "stairs":    lambda a: True,
    "fall":      lambda a: H(a, "hip")[0] > 70 and H(a, "hip")[-1] < 50,
    "get_up":    lambda a: H(a, "hip")[0] < 50 and H(a, "hip")[-1] > 72,
    "sit_down":  lambda a: H(a, "hip")[0] > 75 and 30 < H(a, "hip")[-1] < 65,
    "stand_up":  lambda a: 30 < H(a, "hip")[0] < 65 and H(a, "hip")[-1] > 75,
    "flip":      lambda a: torso_up(a).min() < -.3,
    "cartwheel": lambda a: torso_up(a).min() < 0 and np.maximum(H(a, "fAn"), H(a, "bAn")).max() > 100,
    "jump":      lambda a: airborne(a).sum() >= 4 and not airborne(a)[[0, -1]].any(),
    "hop":       lambda a: (np.maximum(H(a, "fAn"), H(a, "bAn")) > 14).sum() >= 4,
    "kick":      lambda a: np.maximum(H(a, "fAn"), H(a, "bAn")).max() > 45 and not airborne(a)[[0, -1]].any(),
    "throw":     lambda a: max(np.linalg.norm(np.diff(a[:, I[h]], axis=0), axis=1).max() for h in ("rH", "lH")) > 6,
    "stumble":   lambda a: torso_up(a).min() < .85,
    "push_pull": lambda a: True,
    "carry":     lambda a: True,
    "sidestep":  lambda a: abs(travel(a)[1]) > 25 and abs(travel(a)[1]) > abs(travel(a)[0]),
    "backward":  lambda a: travel(a)[0] < -25,
    "run":       lambda a: travel(a)[0] > 60 and airborne(a).sum() >= 1,
    "sneak":     lambda a: np.median(H(a, "hip")) < 80,
    "balance":   lambda a: True,
    "hang":      lambda a: (np.maximum(H(a, "rH"), H(a, "lH")) > H(a, "hd")).mean() > .6,
}
# (type, mode, words, exclude, max per clip, mirror?)   mode: loop (calm->move->calm, seamless), cycle (locomotion), oneshot (transition)
SPEC = [
    ("duck", "loop", ["duck"], [], 3, True), ("dodge", "loop", ["avoid", "dodge", "duck under"], [], 4, True),
    ("roll", "oneshot", ["roll"], ["roll up", "rolling pin"], 3, True), ("crawl", "cycle", ["crawl"], [], 3, True),
    ("climb", "cycle", ["ladder", "climb"], ["stairs"], 2, False), ("stairs", "cycle", ["stairs"], [], 2, False),
    ("fall", "oneshot", ["fall", "fallen"], [], 2, True), ("get_up", "oneshot", ["get up", "getting up", "get-up"], [], 2, True),
    ("sit_down", "oneshot", ["sit"], ["situp", "sit-up"], 1, False), ("stand_up", "oneshot", ["stand up", "stands up"], [], 1, False),
    ("flip", "oneshot", ["flip", "backflip"], [], 2, False), ("cartwheel", "oneshot", ["cartwheel"], [], 2, True),
    ("jump", "loop", ["jump"], ["jumping jack", "jump rope", "box jump"], 2, False), ("hop", "loop", ["hop"], [], 2, True),
    ("kick", "loop", ["kick"], ["soccer", "kick ball", "kickflip"], 3, True), ("throw", "loop", ["throw", "pitch"], ["throw away"], 2, True),
    ("stumble", "oneshot", ["stumble", "trip"], [], 2, True), ("push_pull", "loop", ["push", "pull"], ["pushup", "push up", "pull up"], 1, True),
    ("carry", "cycle", ["carry"], [], 1, False), ("sidestep", "cycle", ["sideways", "side step", "sidestep"], [], 2, True),
    ("backward", "cycle", ["backward"], ["dribble"], 1, False), ("run", "cycle", ["run"], ["run/jog", "run duck"], 1, False),
    ("sneak", "cycle", ["sneak", "creep", "tiptoe"], [], 1, False), ("balance", "loop", ["balance"], [], 2, False),
    ("hang", "cycle", ["hang", "monkey bars"], [], 1, False),
]

def events(a, n_max, sep=1.6):
    loc, _ = loops.frames_local(a); act = loops.activity(loc, 15); N = len(a); out = []
    order = np.argsort(-act)
    for i in order:
        if i < 20 or i > N - 30: continue
        if any(abs(i - j) < sep * FPS for j in out): continue
        out.append(int(i))
        if len(out) >= n_max * 3: break
    return out

def oneshot(a, pk, maxs=3.5):
    loc, _ = loops.frames_local(a); act = loops.activity(loc, 9); N = len(a)
    lo = max(0, pk - int(maxs * FPS * .5)); hi = min(N - 1, pk + int(maxs * FPS * .6))
    s = lo + int(np.argmin(act[lo:max(lo + 1, pk - 6)])); e = pk + 6 + int(np.argmin(act[pk + 6:hi])) if hi > pk + 7 else hi
    if e - s < 15: return None
    seg = a[s:e + 1].copy()
    o = seg[0, I["hip"]].copy(); o[1] = 0; _, yaw = loops.frames_local(seg)
    seg = loops.align(seg, yaw[0], o)                     # face +x, start at the origin, keep the real travel
    return {k: seg[:, I[k]] for k in P}

def cycles(a, n_max):
    N = len(a); out = []; chunk = max(FPS * 4, N // max(1, n_max))
    for c0 in range(0, N - FPS * 2, chunk):
        sub = a[c0:c0 + chunk + FPS]
        if len(sub) < FPS * 2: continue
        try:
            s, e = loops.cycle_window(sub, min_s=.5, max_s=1.8)
            m = loops.unarr(loops.build(sub, s, e, "cycle")); m["_raw"] = sub[s:e + 1]
            out.append(m)
        except Exception: pass
    return out

def build_type(t, mode, words, excl, per_clip, mirror):
    cl = clips(words, excl)
    with ThreadPoolExecutor(8) as ex: list(ex.map(lambda c: _safe_fetch(c), cl))
    res = []
    for c in cl:
        if not (strikes.SRC / f"{c}.npy").exists(): continue
        a = strikes.load(c); got = 0
        cands = cycles(a, per_clip) if mode == "cycle" else []
        if mode != "cycle":
            for pk in events(a, per_clip):
                m = strikes.window_loop(a, pk, focus=None, min_s=.8, max_s=3.0) if mode == "loop" else oneshot(a, pk)
                if m is not None: cands.append(m)
        for m in cands:
            if got >= per_clip: break
            raw = m.pop("_raw", None)
            m = ikclean.clean(m, lock=t not in ("roll", "flip", "cartwheel", "crawl", "hang", "climb"))
            arr = loops.arr(m)
            try:
                if not CHECKS[t](raw if raw is not None and t in ("sidestep", "backward", "run", "climb", "stairs") else arr): continue
            except Exception: continue
            q = strikes.quality(m)
            seam_ok = mode == "oneshot" or q["seam"] < 1.8
            if not (seam_ok and q["stretch"] < .05 and q["sink"] < 1.5): continue
            if mode != "oneshot" and ikclean.foot_slide(m) > 2.5 and t not in ("roll", "crawl", "climb", "hang", "stairs", "run", "sidestep", "backward"): continue
            res.append((c, m, mode)); got += 1
    return res

def _safe_fetch(c):
    try: strikes.fetch(c)
    except Exception: pass

def main():
    blocked = set(json.load(open(mocap.HERE / "rejected.json")))
    v = json.loads(mocap.VARS_INDEX.read_text()); made = []
    def put(name, cat, desc, m, mode, props=None):
        if name in blocked or name in v: return
        a = loops.arr(m); weapons.save(name, desc, a, props if props is not None else [[] for _ in range(len(a))], cat)
        v[name] = dict(cat=cat, how=desc, loop=mode != "oneshot", oneshot=mode == "oneshot", frames=len(a), status="active"); made.append(name)
    nice = {"get_up": "get up", "sit_down": "sit down", "stand_up": "stand up", "push_pull": "push / pull", "sidestep": "side step"}
    for t, mode, words, excl, per, mirror in SPEC:
        res = build_type(t, mode, words, excl, per, mirror)
        for k, (c, m, md) in enumerate(res, 1):
            what = nice.get(t, t)
            put(f"{t}_{k}", t.replace("_", " "), f"{what} ({'one-shot' if md == 'oneshot' else 'seamless loop'}), real take: {IDX[c]} (CMU {c})", m, md)
            if mirror: put(f"{t}_{k}_mirrored", t.replace("_", " "), f"{what}, mirrored (other side), real take (CMU {c})", mocap.mirror(m), md)
        print(f"{t:10s} {len(res):3d} real takes from {len(clips(words, excl))} clips")
    mocap.VARS_INDEX.write_text(json.dumps(v, indent=1)); print(len(made), "moves made")
    return made
if __name__ == "__main__": main()
