"""Bat swings from real two-handed swinging (baseball swings, wood chopping, overhead smashes), both hands IK-locked on the bat."""
import json, numpy as np, mocap, loops, strikes, ikclean, weapons
P = mocap.PTS; I = {k: i for i, k in enumerate(P)}
SRC = {"124_07": "baseball swing", "124_08": "bunt", "79_01": "chop", "80_71": "chop", "86_04": "chop", "86_05": "chop", "22_20": "smash", "23_20": "smash", "62_10": "hammer"}
def kind(a, s):
    loc, _ = loops.frames_local(a); j = s["impact"]; i0 = max(0, j - 8); path = loc[j, I["rH"]] - loc[i0, I["rH"]]
    if -path[1] > 18: return "overhead"
    if abs(path[2]) > 12 and abs(path[2]) >= abs(path[1]) * .8: return "horizontal"
    if -path[1] > 8 and abs(path[2]) > 8: return "diagonal"
    return None
import urllib.request
def load_with_wrists(c):
    tmp = strikes.SRC / f".{c}.bvh"; urllib.request.urlretrieve(mocap.CMU_URL.format(s=int(c.split("_")[0]), c=c), tmp)
    pos, ends, fps = mocap.read_bvh(tmp); tmp.unlink(); pts = mocap.to_points(pos, ends, fps)
    a = np.stack([pts[k] for k in P], 1); g = pts["rGrip"] - pts["rH"]
    return a, g / (np.linalg.norm(g, axis=1, keepdims=True) + 1e-9)
def window_loop_extra(a2, pk):
    """same calm-to-calm loop cut as everything else, but carrying an extra point along"""
    lo = max(0, pk - int(1.2 * mocap.FPS)); hi = min(len(a2), pk + int(1.4 * mocap.FPS) + 12)
    sub = a2[lo:hi]
    if pk - lo < 6 or hi - pk < 20: return None
    s, e = loops.action_window(sub[:, :len(P)], None, min_s=.8, max_s=2.2, pk=pk - lo)
    if not (s < pk - lo < e): return None
    N = len(sub); L = e - s; B = max(3, int(min(10, L // 4, N - e - 1)))
    _, yaw = loops.frames_local(sub[:, :len(P)]); o = sub[s, 0].copy(); o[1] = 0
    seg = loops.align(sub[s:e + B], yaw[s], o)
    hip = seg[:, 0].copy(); _, yw = loops.frames_local(seg[:, :len(P)])
    import math
    dy = math.remainder(yw[L] - yw[0], 2 * math.pi); drift = hip[L] - hip[0]; drift[1] = 0
    for i in range(len(seg)):
        t = i / L; c, sn = math.cos(dy * t), math.sin(dy * t); dd = seg[i] - seg[i, 0]
        seg[i] = np.stack([dd[:, 0] * c - dd[:, 2] * sn, dd[:, 1], dd[:, 0] * sn + dd[:, 2] * c], 1) + seg[i, 0] - drift * t
    out = seg[:L].copy()
    for j in range(B):
        w = 0.5 - 0.5 * math.cos(math.pi * (j + 1) / (B + 1)); out[j] = seg[L + j] * (1 - w) + seg[j] * w
    m = {k: out[:, i] for i, k in enumerate(P)}; m["_grip"] = out[:, len(P)]
    return m
def main():
    blocked = set(json.load(open(mocap.HERE / "rejected.json")))
    v = json.loads(mocap.VARS_INDEX.read_text()); got = {}; made = []
    for c in SRC:
        a, grip = load_with_wrists(c); ss, loc = strikes.find_strikes(a, min_speed=3.0); used = []
        for s in sorted(ss, key=lambda s: -s["speed"]):
            if s["hand"] != "R" or any(abs(s["peak"] - u) < 40 for u in used): continue
            k = kind(a, s)
            if not k: continue
            # carry the real wrist direction through the same loop cut as the body (as a pseudo-joint just past the hand)
            a2 = np.concatenate([a, (a[:, I["rH"]] + grip * 20)[:, None]], 1)
            m = window_loop_extra(a2, s["peak"])
            if m is None: continue
            d = m.pop("_grip") - m["rH"]; d /= np.linalg.norm(d, axis=1, keepdims=True) + 1e-9
            m = ikclean.clean(m)
            m, props = ikclean.bat_grip(m, dirs=d)
            q = strikes.quality(m)
            if not (q["seam"] < 1.8 and q["stretch"] < .06 and q["sink"] < 1.5 and q["power"] > 4): continue
            used.append(s["peak"]); n = got.get(k, 0) + 1; got[k] = n
            name = f"bat_{k}_{n}"
            if name in blocked or name in v: continue
            desc = {"horizontal": "level two-handed bat swing (load, hips, whip, follow-through)", "overhead": "two-handed overhead bat smash", "diagonal": "diagonal downward bat swing"}[k]
            for nm, mm, pp, d in [(name, m, props, desc), (name + "_lefty", mocap.mirror(m), None, "left-handed " + desc)]:
                if pp is None: _, pp = ikclean.bat_grip(mm) if False else (None, weapons.mirror_frames(loops.arr(m), props)[1]); mm = mocap.mirror(m)
                weapons.save(nm, f"{d}, real {SRC[c]} motion (CMU {c}), hands IK-locked on the bat", loops.arr(mm), pp, "bat swings")
                v[nm] = dict(cat="bat swings", how=f"{d}, real motion (CMU {c})", loop=True, frames=len(mm["hip"]), status="active"); made.append(nm)
    mocap.VARS_INDEX.write_text(json.dumps(v, indent=1)); print(len(made), "bat swings:", got)
if __name__ == "__main__": main()
