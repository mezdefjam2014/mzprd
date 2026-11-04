"""Find, classify and cut individual strikes (punches, slashes, swings) out of long real mocap sessions."""
import json, gzip, math, urllib.request, numpy as np, mocap, loops
from concurrent.futures import ThreadPoolExecutor
SRC = mocap.HERE / "sources"
P = mocap.PTS; I = {k: i for i, k in enumerate(P)}
# real boxing / punching sessions only (exercise mixes and vignettes removed: they produce jumps and flailing arms)
BOX = ["13_17", "13_18", "14_01", "14_02", "14_03", "15_13", "17_10", "79_08", "80_10", "143_23", "144_13", "144_14", "144_20", "144_21",
       "02_05", "76_01", "76_02", "111_19", "113_13", "141_14"]
SWING = ["02_07", "02_08", "02_09", "22_20", "23_20", "79_01", "80_71", "124_07", "62_07", "62_08", "62_10"]

def fetch(clip):
    out = SRC / f"{clip}.npy"
    if out.exists(): return clip
    tmp = SRC / f".{clip}.bvh"
    urllib.request.urlretrieve(mocap.CMU_URL.format(s=int(clip.split("_")[0]), c=clip), tmp)
    pos, ends, fps = mocap.read_bvh(tmp); tmp.unlink()
    pts = mocap.to_points(pos, ends, fps); np.save(out, np.stack([pts[k] for k in P], 1).astype(np.float32))
    return clip
def load(clip): return np.load(SRC / f"{clip}.npy").astype(float)

def smooth(x, w=5): return np.convolve(np.pad(x, w // 2, mode="edge"), np.ones(w) / w, "valid")
def find_strikes(a, min_speed=5.0):
    """every strike: a peak of hand speed (in the body's own frame) that ends at an extension"""
    loc, yaw = loops.frames_local(a); out = []
    for hand, sh, side in (("rH", "shF", "R"), ("lH", "shB", "L")):
        h = loc[:, I[hand]]; v = np.r_[0, np.linalg.norm(np.diff(h, axis=0), axis=1)]; v = smooth(v)
        ext = np.linalg.norm(loc[:, I[hand]] - loc[:, I[sh]], axis=1)
        pk = [i for i in range(3, len(v) - 3) if v[i] >= v[i - 3:i + 4].max() and v[i] > min_speed]
        last = -99
        for i in pk:
            if i - last < 9: continue
            j = min(len(a) - 1, i + int(np.argmax(ext[i:i + 8])))          # impact = max reach just after the speed peak
            out.append(dict(hand=side, peak=i, impact=j, speed=float(v[i]))); last = i
    return out, loc

def classify(loc, s):
    H = I["rH"] if s["hand"] == "R" else I["lH"]; S = I["shF"] if s["hand"] == "R" else I["shB"]; E = I["rE"] if s["hand"] == "R" else I["lE"]
    j = s["impact"]; i0 = max(0, j - 7)
    v = loc[j, H] - loc[j, S]; path = loc[j, H] - loc[i0, H]
    lead = (loc[j, I["bAn"], 0] > loc[j, I["fAn"], 0]) == (s["hand"] == "L")   # hand on the same side as the forward foot = lead hand
    fwd, up, lat = path[0], path[1], abs(path[2])
    body = loc[j, H, 1] < loc[j, S, 1] - 22
    elbow_up = loc[j, E, 1] > loc[j, H, 1] - 8
    if up > 10 and up > fwd * .8: kind = "uppercut"
    elif lat > max(10, fwd * .7) and elbow_up: kind = "hook"
    elif v[0] > 25 and fwd > 8: kind = "straight"
    else: kind = None
    if kind is None: return None
    name = {"straight": "jab" if lead else "cross", "hook": ("lead" if lead else "rear") + "_hook", "uppercut": ("lead" if lead else "rear") + "_uppercut"}[kind]
    return name + ("_body" if body and kind != "uppercut" else "")

def guard_mask(a):
    loc, _ = loops.frames_local(a)
    return np.array([all(loc[i, h, 1] > loc[i, I["sh"], 1] - 26 and loc[i, h, 0] > 8 for h in (I["rH"], I["lH"])) for i in range(len(a))])
def window_loop(a, pk, focus="hands", min_s=.6, max_s=1.2, guard=False):
    """cut a loop around one strike: calm -> strike -> calm, seam crossfaded (same method as the approved loops)"""
    lo = max(0, pk - int(1.2 * mocap.FPS)); hi = min(len(a), pk + int(1.4 * mocap.FPS) + 12)
    sub = a[lo:hi]
    if pk - lo < 6 or hi - pk < 20: return None
    s, e = loops.action_window(sub, focus, min_s=min_s, max_s=max_s, pk=pk - lo, ok=guard_mask(sub) if guard else None)
    if not (s < pk - lo < e): return None
    out = loops.build(sub, s, e, "action")
    m = loops.unarr(out)
    low = np.maximum(np.maximum(m["fAn"][:, 1] + 4, m["fTo"][:, 1]), np.maximum(m["bAn"][:, 1] + 4, m["bTo"][:, 1]))
    gap = np.minimum(mocap.FLOOR - low, 0)
    return {k: v + np.stack([0 * gap, gap, 0 * gap], 1) for k, v in m.items()}

def quality(m):
    """reject anything that wouldn't look right: bad seam, stretched limbs, feet through the floor, too weak"""
    a = loops.arr(m); seam = loops.seam_quality(m)
    L = lambda x, y: np.linalg.norm(a[:, I[x]] - a[:, I[y]], axis=1)
    stretch = max(np.ptp(L(x, y)) / (np.median(L(x, y)) + 1e-6) for x, y in (("shF", "rE"), ("rE", "rH"), ("shB", "lE"), ("lE", "lH"), ("hF", "fK"), ("fK", "fAn")))
    low = np.maximum(np.maximum(a[:, I["fAn"], 1] + 4, a[:, I["fTo"], 1]), np.maximum(a[:, I["bAn"], 1] + 4, a[:, I["bTo"], 1]))
    sink = float((low - 89).max())
    loc, _ = loops.frames_local(a); hv = max(np.linalg.norm(np.diff(loc[:, I[h]], axis=0), axis=1).max() for h in ("rH", "lH"))
    return dict(seam=round(float(seam), 2), stretch=round(float(stretch), 3), sink=round(sink, 1), power=round(float(hv), 1), ok=seam < 1.6 and stretch < .05 and sink < 1.5)

if __name__ == "__main__":
    with ThreadPoolExecutor(8) as ex: print(list(ex.map(fetch, BOX + SWING)))


def boxing_ok(m, hand):
    """a real boxing loop: guard at the start/end, feet on the ground, full extension, exactly one punch"""
    a = loops.arr(m); loc, _ = loops.frames_local(a); N = len(a)
    H = I["rH"] if hand == "R" else I["lH"]; S = I["shF"] if hand == "R" else I["shB"]; O = I["lH"] if hand == "R" else I["rH"]
    def guard(i):   # both fists up in front of the face/chin
        return all(loc[i, h, 1] > loc[i, I["sh"], 1] - 26 and loc[i, h, 0] > 8 for h in (I["rH"], I["lH"]))   # measured from real boxers: fists ~12-20 below the shoulder joint, ~20 in front
    if not (guard(0) and guard(N - 1)): return "no guard"
    feet = np.minimum(loc[:, I["fAn"], 1], loc[:, I["bAn"], 1])        # the lower ankle's height above the floor
    if feet.max() > 22: return "jump"          # boxers bounce on their toes; a real jump lifts both feet much higher
    arm = np.median(np.linalg.norm(a[:, S] - a[:, I["rE" if hand == "R" else "lE"]], axis=1) + np.linalg.norm(a[:, I["rE" if hand == "R" else "lE"]] - a[:, H], axis=1))
    reach = np.linalg.norm(a[:, H] - a[:, S], axis=1).max() / arm
    if reach < .8: return "no extension"
    def strikes_of(h, thr):
        v = smooth(np.r_[0, np.linalg.norm(np.diff(loc[:, h], axis=0), axis=1)])
        return sum(1 for i in range(3, N - 3) if v[i] >= v[i - 3:i + 4].max() and v[i] > thr)
    if strikes_of(H, 5.0) > 1 or strikes_of(O, 8.5) > 0: return "more than one punch"
    return None

NUM = {"jab": "1", "cross": "2", "lead_hook": "3", "rear_hook": "4", "lead_uppercut": "5", "rear_uppercut": "6"}
def cut_between(a, first, last, ok):
    """loop that contains everything from the first to the last strike, cut on guard frames with matching poses"""
    loc, yaw = loops.frames_local(a); N = len(a); B = 8
    S = [x for x in range(max(0, first - 30), first - 3) if ok[x]]; E = [x for x in range(last + 6, min(N - B - 1, last + 30)) if ok[x]]
    best = None
    for s in S:
        for e in E:
            c = loops.pose_dist(loc, s, e) + 30 * loops.ydiff(yaw[e], yaw[s]) + .15 * np.linalg.norm((a[e, 0] - a[s, 0])[[0, 2]])
            if best is None or c < best[0]: best = (c, s, e)
    if best is None: return None
    out = loops.build(a, best[1], best[2], "action"); m = loops.unarr(out)
    low = np.maximum(np.maximum(m["fAn"][:, 1] + 4, m["fTo"][:, 1]), np.maximum(m["bAn"][:, 1] + 4, m["bTo"][:, 1]))
    gap = np.minimum(mocap.FLOOR - low, 0)
    return {k: v + np.stack([0 * gap, gap, 0 * gap], 1) for k, v in m.items()}

def combos(clip):
    """chains of 2-3 punches thrown together (< 0.5 s apart), as boxers count them: 1-2, 1-2-3, ..."""
    a = load(clip); ss, loc = find_strikes(a); ok = guard_mask(a)
    ss = sorted([dict(s, name=classify(loc, s)) for s in ss], key=lambda s: s["peak"])
    out = []
    for i in range(len(ss)):
        for n in (3, 2):
            ch = ss[i:i + n]
            if len(ch) < n or any(not s["name"] for s in ch): continue
            if any(b["peak"] - a_["peak"] > 15 for a_, b in zip(ch, ch[1:])): continue
            if i > 0 and ch[0]["peak"] - ss[i - 1]["peak"] < 15: continue           # must start a fresh combination
            if i + n < len(ss) and ss[i + n]["peak"] - ch[-1]["peak"] < 15: continue  # and end it
            m = cut_between(a, ch[0]["peak"], ch[-1]["impact"], ok)
            if m is None: continue
            q = quality(m)
            if not q["ok"]: continue
            L, _ = loops.frames_local(loops.arr(m))
            if np.minimum(L[:, I["fAn"], 1], L[:, I["bAn"], 1]).max() > 22: continue
            body = any(s["name"].endswith("_body") for s in ch)
            label = "-".join(NUM[s["name"].replace("_body", "")] + ("b" if s["name"].endswith("_body") else "") for s in ch)
            out.append(dict(clip=clip, label=label, m=m, q=q, start=ch[0]["peak"]))
            break
    return out

def idles(clip):
    """boxer in stance, bouncing, no punches (1-2 s)"""
    a = load(clip); ss, _ = find_strikes(a, min_speed=4.0); ok = guard_mask(a); N = len(a)
    busy = np.zeros(N, bool)
    for s in ss: busy[max(0, s["peak"] - 12):s["peak"] + 12] = True
    best = None
    for s0 in range(0, N - 70, 5):
        L = 45
        if busy[s0:s0 + L + 10].any() or not ok[s0:s0 + L].all(): continue
        out = loops.build(a, s0, s0 + L, "action"); m = loops.unarr(out); q = quality(m)
        if q["ok"] and (best is None or q["seam"] < best[1]["seam"]): best = (m, q)
    return best
