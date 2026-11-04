#!/usr/bin/env python3
"""Motion-capture move library for animation-prompt-maker.

Commands (run from anywhere):
  mocap.py search kick [more words]        search all 2,435 CMU clips + saved moves (instant, offline)
  mocap.py fetch 86_02 --name spin_kick [--start 2.5 --end 5]   download one CMU clip, convert, save to the library
  mocap.py import my.bvh --name my_kick [--start s --end e]    add your own BVH (Rokoko Video, Mixamo-converted, etc.)
  mocap.py peek front_kick                 list the active segments of a move (to choose --start/--end)
  mocap.py make <move> [edits] -o out_dir [--title "..."] [--view 3/4] [--keys 7]
      edits: --start S --end E   trim (seconds)          --speed 1.5   faster (0.5 = slower)
             --mirror             swap left/right         --exaggerate 0.5   bigger, snappier motion
             --upper <move>       upper body from another move (e.g. walk legs + punch arms); any move can be name@start-end
             --then <move>        chain another move after it (repeatable)
             --blend <move>:0.3   mix in another move   --inplace   remove travel (for loops)
    -> writes <out_dir>/<name>.json (preview data), <name>.html (preview), <name>_blender.py (Blender rebuild)
"""
import sys, os, re, json, gzip, math, argparse, urllib.request, pathlib
import numpy as np

HERE = pathlib.Path(__file__).resolve().parent
MOVES = HERE / "moves"
VARS = HERE / "variations"
VARS_INDEX = HERE / "variations.json"
INDEX = HERE / "cmu_index.json"
TEMPL = HERE.parent / "templates"
CMU_URL = "https://raw.githubusercontent.com/una-dinosauria/cmu-mocap/master/data/{s:03d}/{c}.bvh"
FPS = 30
FLOOR = 89
# our skeleton points (same names as the preview engine)
PTS = ["hip", "mid", "sh", "shF", "shB", "nk", "hd", "rE", "rH", "lE", "lH", "hF", "hB", "fK", "fAn", "fTo", "bK", "bAn", "bTo"]
LEFT_RIGHT = {"shF": "shB", "rE": "lE", "rH": "lH", "hF": "hB", "fK": "bK", "fAn": "bAn", "fTo": "bTo"}
LEFT_RIGHT.update({v: k for k, v in LEFT_RIGHT.items()})
UPPER = ["sh", "shF", "shB", "nk", "hd", "rE", "rH", "lE", "lH"]
# bone chains used to keep limb lengths fixed after edits: (parent, child)
CHAIN = [("hip", "mid"), ("mid", "sh"), ("sh", "nk"), ("nk", "hd"), ("sh", "shF"), ("shF", "rE"), ("rE", "rH"),
         ("sh", "shB"), ("shB", "lE"), ("lE", "lH"), ("hip", "hF"), ("hF", "fK"), ("fK", "fAn"), ("fAn", "fTo"),
         ("hip", "hB"), ("hB", "bK"), ("bK", "bAn"), ("bAn", "bTo")]

# ---------------- BVH reading ----------------
def _rot(axis, deg):
    a = np.radians(deg); c, s = np.cos(a), np.sin(a); n = len(a)
    m = np.zeros((n, 3, 3)); m[:, 0, 0] = m[:, 1, 1] = m[:, 2, 2] = 1
    i, j = {"X": (1, 2), "Y": (2, 0), "Z": (0, 1)}[axis]
    m[:, i, i] = c; m[:, j, j] = c; m[:, i, j] = -s; m[:, j, i] = s
    return m

ROTS = {}   # world rotation matrices of joints from the last read_bvh (used for wrist/weapon orientation)
def read_bvh(path):
    txt = pathlib.Path(path).read_text(errors="ignore")
    head, motion = re.split(r"\bMOTION\b", txt, maxsplit=1)
    joints, stack, cur = [], [], None
    toks = head.split()
    i = 0
    while i < len(toks):
        t = toks[i]
        if t in ("ROOT", "JOINT"):
            cur = dict(name=toks[i + 1].split(":")[-1], parent=stack[-1] if stack else None, ch=[], off=None, end=None)
            joints.append(cur); i += 2; continue
        if t == "End":
            j = i + 2
            while toks[j] != "OFFSET": j += 1
            joints[stack[-1]]["end"] = [float(x) for x in toks[j + 1:j + 4]]
            depth, j = 0, i + 2
            while True:
                if toks[j] == "{": depth += 1
                elif toks[j] == "}":
                    depth -= 1
                    if depth == 0: break
                j += 1
            i = j + 1; continue
        if t == "{": stack.append(len(joints) - 1)
        elif t == "}": stack.pop()
        elif t == "OFFSET": cur["off"] = [float(x) for x in toks[i + 1:i + 4]]; i += 4; continue
        elif t == "CHANNELS":
            n = int(toks[i + 1]); cur["ch"] = toks[i + 2:i + 2 + n]; i += 2 + n; continue
        i += 1
    lines = motion.strip().splitlines()
    nf = int(lines[0].split(":")[1]); ft = float(lines[1].split(":")[1])
    data = np.array([[float(x) for x in l.split()] for l in lines[2:2 + nf] if l.strip()])
    # forward kinematics
    nf = len(data); col = 0
    W = [None] * len(joints); P = [None] * len(joints); ends = {}
    for k, j in enumerate(joints):
        pos = np.tile(np.array(j["off"]), (nf, 1)); R = np.tile(np.eye(3), (nf, 1, 1))
        for c in j["ch"]:
            v = data[:, col]; col += 1
            if c.endswith("position"): pos[:, "XYZ".index(c[0])] += v - (j["off"]["XYZ".index(c[0])] if j["parent"] is None else 0) * 0
            else: R = R @ _rot(c[0], v)
        if j["parent"] is None:
            W[k] = R; P[k] = pos
        else:
            pw, pp = W[j["parent"]], P[j["parent"]]
            P[k] = pp + np.einsum("nij,nj->ni", pw, pos); W[k] = pw @ R
        if j["end"] is not None:
            ends[j["name"]] = P[k] + np.einsum("nij,j->ni", W[k], np.array(j["end"]))
    pos = {j["name"]: P[k] for k, j in enumerate(joints)}
    ROTS.clear(); ROTS.update({j["name"]: W[k] for k, j in enumerate(joints)})
    return pos, ends, 1.0 / ft

def _pick(pos, *names):
    low = {k.lower(): v for k, v in pos.items()}
    for n in names:
        if n.lower() in low: return low[n.lower()]
    raise KeyError(f"BVH has none of {names}")

def to_points(pos, ends, src_fps, start=None, end=None):
    """Map any humanoid BVH (CMU / Mixamo / Rokoko naming) to our points, at 30 fps, facing +x, feet on our floor."""
    g = lambda *n: _pick(pos, *n)
    hipsP = g("Hips", "pelvis", "Root")
    rUL, lUL = g("RightUpLeg", "RightThigh", "RightHip"), g("LeftUpLeg", "LeftThigh", "LeftHip")
    rL, lL = g("RightLeg", "RightShin", "RightKnee"), g("LeftLeg", "LeftShin", "LeftKnee")
    rF, lF = g("RightFoot", "RightAnkle"), g("LeftFoot", "LeftAnkle")
    try: rT, lT = g("RightToeBase", "RightToe", "RightToes"), g("LeftToeBase", "LeftToe", "LeftToes")
    except KeyError: rT, lT = rF + (rF - rL) * .2, lF + (lF - lL) * .2
    rA, lA = g("RightArm", "RightUpperArm"), g("LeftArm", "LeftUpperArm")
    rFA, lFA = g("RightForeArm", "RightLowerArm", "RightElbow"), g("LeftForeArm", "LeftLowerArm", "LeftElbow")
    rH, lH = g("RightHand", "RightWrist"), g("LeftHand", "LeftWrist")
    neck = g("Neck1", "Neck", "Neck2"); head = g("Head")
    headTop = ends.get("Head", head + (head - neck))
    spine = g("Spine1", "Spine", "Spine2", "Chest")
    # resample to 30 fps and trim
    n = len(hipsP); t_src = np.arange(n) / src_fps
    s0 = 0 if start is None else start; s1 = t_src[-1] if end is None else min(end, t_src[-1])
    tt = np.arange(s0, s1 + 1e-9, 1 / FPS)
    rs = lambda a: np.stack([np.interp(tt, t_src, a[:, c]) for c in range(3)], 1)
    extra = {}
    if "RightHand" in ROTS and len(ROTS["RightHand"]) == len(rH):     # real wrist orientation: bat/handle axis = hand's thumb-side axis
        extra["rGrip"] = rH + ROTS["RightHand"][:, :, 2] * (leg_guess := np.median(np.linalg.norm(rL - rUL, axis=1))) * .3
        extra["lGrip"] = lH + ROTS["LeftHand"][:, :, 2] * leg_guess * .3
    J = dict(**extra, hip=(rUL + lUL) / 2, mid=spine, shF=rA, shB=lA, nk=neck, hd=(head + headTop) / 2,
             rE=rFA, rH=rH, lE=lFA, lH=lH, hF=rUL, hB=lUL, fK=rL, fAn=rF, fTo=rT, bK=lL, bAn=lF, bTo=lT)
    J = {k: rs(v) for k, v in J.items()}
    J["sh"] = (J["shF"] + J["shB"]) / 2
    up = np.array([0, 1.0, 0])
    # scale: leg length -> our thigh+shin (91)
    leg = np.median(np.linalg.norm(J["fK"] - J["hF"], axis=1) + np.linalg.norm(J["fAn"] - J["fK"], axis=1))
    sc = 91.0 / leg
    # facing from the first frame: right = right hip - left hip, forward = up x right
    r = J["hF"][0] - J["hB"][0]; r[1] = 0; r /= np.linalg.norm(r)
    f = np.cross(up, r); f /= np.linalg.norm(f)
    o = J["hip"][0].copy()
    floor = np.percentile(np.minimum(J["fTo"][:, 1], J["bTo"][:, 1]), 5)
    out = {}
    for k, v in J.items():
        d = v - o
        out[k] = np.stack([d @ f * sc, FLOOR - (v[:, 1] - floor) * sc, d @ r * sc], 1)
    return out

# ---------------- library storage ----------------
def save_move(name, pts, meta):
    arr = np.stack([pts[k] for k in PTS], 1)  # frames x joints x 3
    doc = dict(meta, fps=FPS, joints=PTS, frames=np.round(arr).astype(int).tolist())
    with gzip.open(MOVES / f"{name}.json.gz", "wt") as fh: json.dump(doc, fh, separators=(",", ":"))
    return MOVES / f"{name}.json.gz"

def load_move(name):
    p = MOVES / f"{name}.json.gz"
    if not p.exists() and (VARS / f"{name}.json.gz").exists(): p = VARS / f"{name}.json.gz"
    if not p.exists():
        if re.fullmatch(r"\d+_\d+", name): return load_move(fetch(name, name)[0])
        sys.exit(f"No saved move '{name}'. Try: mocap.py search {name}")
    doc = json.load(gzip.open(p, "rt"))
    arr = np.array(doc["frames"], float)
    return {k: arr[:, i] for i, k in enumerate(doc["joints"])}, doc

def load_spec(spec):
    """'name' or 'name@start-end' (seconds) -> motion"""
    name, _, rng = spec.partition("@")
    m = load_move(name)[0]
    if rng:
        s0, _, s1 = rng.partition("-"); m = trim(m, float(s0) if s0 else None, float(s1) if s1 else None)
    return m

def fetch(clip, name, start=None, end=None):
    s = int(clip.split("_")[0]); url = CMU_URL.format(s=s, c=clip)
    tmp = MOVES / f".{clip}.bvh"
    urllib.request.urlretrieve(url, tmp)
    try:
        pos, ends, fps = read_bvh(tmp)
        pts = to_points(pos, ends, fps, start, end)
    finally:
        tmp.unlink(missing_ok=True)
    desc = _index().get(clip, "")
    p = save_move(name, pts, dict(name=name, source=f"CMU {clip}", desc=desc, license="CMU mocap: free for research and commercial use"))
    if not name.startswith("."): _remember(name, desc)
    return name, p

SAVED = HERE / "saved.json"
def _saved():
    return json.loads(SAVED.read_text()) if SAVED.exists() else {}
import threading
_LOCK = threading.Lock()
def _remember(name, desc):
    with _LOCK:
        d = _saved(); d[name] = desc; SAVED.write_text(json.dumps(dict(sorted(d.items())), indent=0))

def _index():
    return json.loads(INDEX.read_text()) if INDEX.exists() else {}

# ---------------- edits ----------------
def nframes(m): return len(m["hip"])
def facing(m, i):
    r = m["hF"][i] - m["hB"][i]; r = np.array([r[0], 0, r[2]]); r /= (np.linalg.norm(r) or 1)
    f = np.array([r[2], 0, -r[0]])  # forward in our coords (x fwd, z right)
    return f, r
def trim(m, s, e):
    a = int(round((s or 0) * FPS)); b = nframes(m) if e is None else int(round(e * FPS)) + 1
    return {k: v[a:b] for k, v in m.items()}
def resample(m, n):
    src = np.linspace(0, 1, nframes(m)); dst = np.linspace(0, 1, n)
    return {k: np.stack([np.interp(dst, src, v[:, c]) for c in range(3)], 1) for k, v in m.items()}
def speed(m, k): return resample(m, max(2, int(round(nframes(m) / k))))
def mirror(m):
    out = {LEFT_RIGHT.get(k, k): v.copy() for k, v in m.items()}
    for v in out.values(): v[:, 2] *= -1
    return out
def inplace(m):
    d = m["hip"].copy(); d[:, 1] = 0; d -= d[0]
    return {k: v - d for k, v in m.items()}
def fix_lengths(m, ref):
    L = {(a, b): np.median(np.linalg.norm(ref[b] - ref[a], axis=1)) for a, b in CHAIN}
    out = {k: v.copy() for k, v in m.items()}
    for a, b in CHAIN:
        d = m[b] - m[a]; n = np.linalg.norm(d, axis=1, keepdims=True); n[n == 0] = 1
        out[b] = out[a] + d / n * L[(a, b)]
    return out
def ground(m):
    low = np.maximum(np.maximum(m["fAn"][:, 1] + 4, m["fTo"][:, 1]), np.maximum(m["bAn"][:, 1] + 4, m["bTo"][:, 1]))  # y points down: lowest point = largest y
    sink = np.clip(low - FLOOR, 0, None)  # push up anything below the floor
    return {k: v - np.stack([0 * sink, sink, 0 * sink], 1) for k, v in m.items()}
def exaggerate(m, k):
    # push each frame away from a smoothed version of the motion -> bigger, snappier
    w = 9; ker = np.ones(w) / w; out = {}
    for j, v in m.items():
        sm = np.stack([np.convolve(np.pad(v[:, c], w // 2, mode="edge"), ker, "valid") for c in range(3)], 1)
        out[j] = v + (v - sm) * k
    return ground(fix_lengths(out, m))
def lean(m, deg):
    """tilt the upper body forward (+) / back (-) around the hips, every frame (hunched monsters, proud walks)"""
    out = {k: v.copy() for k, v in m.items()}; a = math.radians(deg)
    for i in range(nframes(m)):
        f, r = facing(m, i); piv = m["hip"][i]
        for k in UPPER + ["mid"]:
            d = m[k][i] - piv; up = -d[1]; fw = d @ f
            nfw = fw * math.cos(a) + up * math.sin(a); nup = -fw * math.sin(a) + up * math.cos(a)
            side = d - fw * f - np.array([0, d[1], 0])
            out[k][i] = piv + nfw * f + np.array([0, -nup, 0]) + side
    return out
def auto_window(m, maxs=5.0):
    """the main active stretch of a clip (skips T-poses and idle lead-ins)"""
    segs = segments(m)
    if not segs: return m
    s0 = max(0, segs[0][0] - 6); s1 = min(nframes(m), s0 + int(maxs * FPS))
    return trim(m, s0 / FPS, (s1 - 1) / FPS)

def _local(m, i, k, origin):
    f, r = facing(m, i); u = np.array([0, -1.0, 0]); d = m[k][i] - m[origin][i]
    return np.array([d @ f, d @ u, d @ r])
def _world(m, i, loc, origin):
    f, r = facing(m, i); return m[origin][i] + loc[0] * f + np.array([0, -loc[1], 0]) + loc[2] * r
def upper_from(a, b):
    b = resample(b, nframes(a)); out = {k: v.copy() for k, v in a.items()}
    for i in range(nframes(a)):
        for k in UPPER:
            out[k][i] = _world(a, i, _local(b, i, k, "mid"), "mid")
    return fix_lengths(out, a)
def chain(a, b, blend=6):
    # align b's start (position + facing) to a's end, then crossfade
    fa, _ = facing(a, -1); fb, _ = facing(b, 0)
    ang = math.atan2(fa[2], fa[0]) - math.atan2(fb[2], fb[0]); c, s = math.cos(ang), math.sin(ang)
    o = b["hip"][0].copy(); t = a["hip"][-1].copy()
    def tf(v):
        d = v - o; x = d[:, 0] * c - d[:, 2] * s; z = d[:, 0] * s + d[:, 2] * c
        return np.stack([x + t[0], v[:, 1], z + t[2]], 1)
    b2 = {k: tf(v) for k, v in b.items()}
    n = min(blend, nframes(a), nframes(b2)); w = np.linspace(0, 1, n)[:, None]
    return {k: np.concatenate([a[k][:-n], a[k][-n:] * (1 - w) + b2[k][:n] * w, b2[k][n:]]) for k in a}
def mix(a, b, k):
    b = resample(b, nframes(a)); out = {}
    for j in a:
        out[j] = a[j] * (1 - k) + b[j] * k
    return ground(fix_lengths(out, a))

# ---------------- key frames + plain-English captions ----------------
def features(m, i):
    hip = m["hip"][i]; f, r = facing(m, i)
    return np.concatenate([_local(m, i, k, "hip") for k in ("fAn", "bAn", "rH", "lH", "hd")] + [[hip[1]]])
def pick_keys(m, n):
    N = nframes(m)
    if N <= n: return list(range(N))
    F = np.array([features(m, i) for i in range(N)])
    keys = [0, N - 1]; gap = max(2, N // (n * 2))
    while len(keys) < n:
        d = np.min([np.linalg.norm(F - F[k], axis=1) for k in keys], 0)
        for k in keys: d[max(0, k - gap):k + gap + 1] = -1
        if d.max() <= 0: break
        keys.append(int(d.argmax()))
    return sorted(keys)
def describe(m, i, prev=None):
    up = lambda k: FLOOR - m[k][i][1]  # height above floor
    hipH = up("hip"); parts = []
    fA, bA = up("fAn") - 4, up("bAn") - 4
    if fA > 12 and bA > 12: parts.append("in the air, both feet off the ground")
    elif hipH < 58: parts.append("crouched low")
    elif hipH < 74: parts.append("knees bent")
    lean = _local(m, i, "sh", "hip"); ang = math.degrees(math.atan2(lean[0], lean[1]))
    if ang > 25: parts.append("leaning forward")
    elif ang < -15: parts.append("leaning back")
    for foot, side in (("fAn", "right"), ("bAn", "left")):
        h = up(foot) - 4; fwd = _local(m, i, foot, "hip")[0]
        if fA > 12 and bA > 12: break
        if h > 140: parts.append(f"{side} foot kicked up above head height")
        elif h > 105: parts.append(f"{side} foot kicked up to head height")
        elif h > 70: parts.append(f"{side} leg raised to hip height" + (" and extended forward" if fwd > 35 else ""))
        elif h > 30: parts.append(f"{side} knee lifted")
        elif h > 8: parts.append(f"{side} foot lifting off the floor")
    for hand, sh, side in (("rH", "shF", "right"), ("lH", "shB", "left")):
        loc = _local(m, i, hand, sh); reach = np.linalg.norm(loc)
        hh = up(hand); headh = up("hd")
        if hh > headh + 12: parts.append(f"{side} arm raised overhead")
        elif reach > 48 and loc[0] > 35: parts.append(f"{side} arm thrust straight forward")
        elif reach > 48 and abs(loc[2]) > 35: parts.append(f"{side} arm swung out to the side")
        elif hh > headh - 25 and loc[0] > 5: parts.append(f"{side} hand up by the face")
        elif reach > 45 and loc[0] < -25: parts.append(f"{side} arm swung back")
    if prev is not None:
        d = m["hip"][i] - m["hip"][prev]; f, r = facing(m, prev)
        if d @ f > 25: parts.append("moving forward")
        elif d @ f < -25: parts.append("moving backward")
        fa, _ = facing(m, prev); fb, _ = facing(m, i)
        turn = math.degrees(math.atan2(fa[0] * fb[2] - fa[2] * fb[0], fa @ fb))
        if abs(turn) > 40: parts.append(f"turning {'right' if turn > 0 else 'left'} about {int(round(abs(turn), -1))} degrees")
    if not parts: parts.append("standing upright, arms relaxed")
    s = ", ".join(parts); return s[0].upper() + s[1:] + "."

def segments(m):
    sp = np.linalg.norm(np.diff(np.stack([m[k] for k in ("rH", "lH", "fAn", "bAn", "hip")], 1), axis=0), axis=2).sum(1)
    act = np.convolve(sp, np.ones(9) / 9, "same") > np.percentile(sp, 40)
    segs, s = [], None
    for i, a in enumerate(act):
        if a and s is None: s = i
        if not a and s is not None:
            if i - s > 8: segs.append((s, i))
            s = None
    if s is not None: segs.append((s, len(act)))
    return segs

# ---------------- output ----------------
def build(m, name, title, view, dim, nkeys, out_dir, desc=""):
    out_dir = pathlib.Path(out_dir); out_dir.mkdir(parents=True, exist_ok=True)
    keys = pick_keys(m, nkeys); caps = []
    for j, i in enumerate(keys): caps.append(describe(m, i, keys[j - 1] if j else None))
    N = nframes(m)
    frames = np.stack([m[k] for k in PTS], 1).round(1).tolist()
    what = title.replace(" Storyboard", "").lower()
    prompt = (f"Create a {len(keys)}-panel {dim} animation storyboard of a character doing a {what}, viewed from a {view} camera, realistic style. "
              f"Lay the panels out left to right, numbered 1 to {len(keys)}, same character, camera and scale in every panel. Each panel shows a different moment:\n\n"
              + "\n".join(f"{j + 1}. {c}" for j, c in enumerate(caps))
              + f"\n\nThis is based on real motion capture, so keep the weight shifts and balance natural.\nThen animate it at {FPS} fps over {N} frames.")
    data = dict(title=title, meta=f"{dim} · {view} view · {FPS} fps · frames 1–{N} · recorded motion", dim=dim, view=view, fps=FPS,
                note=(f"Source: real motion capture ({desc}). " if desc else ""), props={}, prompt=prompt,
                keys=[dict(f=i + 1, n=c) for i, c in zip(keys, caps)],
                motion=dict(joints=PTS, frames=frames))
    j = out_dir / f"{name}.json"; j.write_text(json.dumps(data, separators=(",", ":")))
    tpl = (TEMPL / "motion-preview.html").read_text()
    (out_dir / f"{name}.html").write_text(tpl.replace("__TITLE__", title).replace("__DATA__", json.dumps(data, separators=(",", ":"))))
    os.system(f'{sys.executable} "{TEMPL / "to_blender.py"}" "{j}" "{out_dir / (name + "_blender.py")}" > /dev/null')
    print(prompt); print(f"\nwrote {out_dir / (name + '.html')}  +  {name}_blender.py")

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("search"); s.add_argument("words", nargs="+")
    f = sub.add_parser("fetch"); f.add_argument("clip"); f.add_argument("--name"); f.add_argument("--start", type=float); f.add_argument("--end", type=float)
    im = sub.add_parser("import"); im.add_argument("bvh"); im.add_argument("--name", required=True); im.add_argument("--start", type=float); im.add_argument("--end", type=float)
    pk = sub.add_parser("peek"); pk.add_argument("move")
    for c in ("suspend", "restore"): sub.add_parser(c).add_argument("names", nargs="+")
    mk = sub.add_parser("make"); mk.add_argument("move")
    for a in ("--start", "--end", "--speed", "--exaggerate"): mk.add_argument(a, type=float)
    mk.add_argument("--mirror", action="store_true"); mk.add_argument("--inplace", action="store_true")
    mk.add_argument("--upper"); mk.add_argument("--then", action="append", default=[]); mk.add_argument("--blend")
    mk.add_argument("-o", "--out", default="."); mk.add_argument("--name"); mk.add_argument("--title")
    mk.add_argument("--view", default="3/4"); mk.add_argument("--dim", default="3D"); mk.add_argument("--keys", type=int, default=7)
    a = ap.parse_args()
    if a.cmd == "search":
        w = [x.lower() for x in a.words]
        saved = _saved()
        hits = [(n, d) for n, d in saved.items() if all(x in (n + " " + d).lower() for x in w)]
        if hits:
            print("SAVED (instant, use the name):")
            for n, d in hits[:25]: print(f"  {n:18s} {d}")
        print("NOT SAVED YET (CMU clip id, downloads in ~1 s on first use):")
        idx = _index(); res = [(c, d) for c, d in idx.items() if all(x in d.lower() for x in w)]
        for c, d in res[:25]: print(f"  {c:7s} {d}")
        print(f"{len(res)} CMU clips match" + (" (showing 25)" if len(res) > 25 else ""))
    elif a.cmd == "fetch":
        n, p = fetch(a.clip, a.name or a.clip, a.start, a.end); print(f"saved {n} ({p.stat().st_size // 1024} KB)")
    elif a.cmd == "import":
        pos, ends, fps = read_bvh(a.bvh); p = save_move(a.name, to_points(pos, ends, fps, a.start, a.end), dict(name=a.name, source=os.path.basename(a.bvh), desc=""))
        _remember(a.name, "imported from " + os.path.basename(a.bvh)); print(f"saved {a.name} ({p.stat().st_size // 1024} KB)")
    elif a.cmd in ("suspend", "restore"):
        idx = json.loads(VARS_INDEX.read_text())
        for n in a.names:
            if n == "all":
                for v in idx.values(): v["status"] = "suspended" if a.cmd == "suspend" else "active"
            elif n in idx: idx[n]["status"] = "suspended" if a.cmd == "suspend" else "active"
            else: print("not a variation:", n)
        VARS_INDEX.write_text(json.dumps(idx, indent=1)); print(a.cmd, "done. Originals are never affected.")
    elif a.cmd == "peek":
        m, doc = load_move(a.move); print(doc.get("desc", ""), f"| {nframes(m) / FPS:.1f}s")
        for s0, s1 in segments(m):
            mid = (s0 + s1) // 2
            print(f"  {s0 / FPS:5.1f}s - {s1 / FPS:5.1f}s  {describe(m, mid)}")
    elif a.cmd == "make":
        m, doc = load_move(a.move)
        if a.start is not None or a.end is not None: m = trim(m, a.start, a.end)
        if a.upper: m = upper_from(m, load_spec(a.upper))
        if a.blend:
            nm, k = a.blend.rsplit(":", 1); m = mix(m, load_spec(nm), float(k))
        for t in a.then: m = chain(m, load_spec(t))
        if a.mirror: m = mirror(m)
        if a.speed: m = speed(m, a.speed)
        if a.exaggerate: m = exaggerate(m, a.exaggerate)
        if a.inplace: m = inplace(m)
        name = a.name or a.move
        title = a.title or (name.replace("_", " ").title() + " Storyboard")
        build(m, name, title, a.view, a.dim, a.keys, a.out, doc.get("desc", ""))

if __name__ == "__main__":
    main()
