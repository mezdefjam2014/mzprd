"""Weapon animations: real mocap (shoot, draw, swings, chops) + hand-animated IK reloads, each a seamless loop with the weapon drawn.
   python3 weapons.py   -> adds/updates the 'weapons' variations"""
import json, math, gzip, re, numpy as np, mocap, loops
from concurrent.futures import ThreadPoolExecutor
P = mocap.PTS
# ---- reuse the exact IK solver from the Blender exporter (same math as the preview) ----
_src = (mocap.HERE.parent / "templates" / "to_blender.py").read_text()
_rt = _src[_src.index("RUNTIME = r'''"):]
_rt = _rt[_rt.index("S = 0.01"):_rt.index("# bone: (head point")]
IK = {"math": math, "Vector": tuple}; exec(_rt, IK)

def nrm(v): v = np.asarray(v, float); return v / (np.linalg.norm(v) + 1e-9)
def seg(a, b, col, w): return [*map(float, a), *map(float, b), col, w]

# ---- weapon shapes (drawn as thick lines). col: 0 metal, 1 accent (magazine), 2 wood ----
def held_dir(f, two_hand=False):
    if two_hand:
        d = f["rH"] - f["lH"]
        if np.linalg.norm(d) > 6: return nrm(d)
    return nrm(f["rH"] - f["rE"])
def prop_pistol(f, d=None, tilt=None):
    d = held_dir(f) if d is None else d; h = f["rH"]; up = np.array([0, -1.0, 0])
    side = nrm(np.cross(d, up)); dn = nrm(np.cross(side, d))
    return [seg(h - d * 3, h + d * 13, 0, 5), seg(h, h + dn * 7 - d * 2, 0, 4)]
def prop_long(f, length, col, head=None, two_hand=True, back=6):
    d = held_dir(f, two_hand); h = f["rH"]
    out = [seg(h - d * back, h + d * length, col, 4 if col == 2 else 3.5)]
    if head == "axe": out.append(seg(h + d * (length - 2) + np.array([0, -5, 0]), h + d * (length - 2) + np.array([0, 7, 0]), 0, 7))
    if head == "hammer": out.append(seg(h + d * length + np.array([0, -4, 0]), h + d * length + np.array([0, 4, 0]), 0, 6))
    return out
SHAPES = {
    "pistol": prop_pistol,
    "bat": lambda f: prop_long(f, 62, 2, back=4),
    "axe": lambda f: prop_long(f, 48, 2, "axe"),
    "hammer": lambda f: prop_long(f, 22, 2, "hammer", two_hand=False, back=2),
    "sword": lambda f: prop_long(f, 70, 0, two_hand=False),
    "knife": lambda f: prop_long(f, 14, 0, two_hand=False, back=3),
    "ball": lambda f: [seg(f["rH"], f["rH"] + np.array([0.1, 0, 0]), 0, 7)],
}
def props_for(m, kind):
    """weapon direction = both forearms (or the right one), smoothed around the loop so it never flips"""
    two = kind in ("bat", "axe")
    d = (m["rH"] - m["rE"]) + ((m["lH"] - m["lE"]) if two else 0)
    d = d / (np.linalg.norm(d, axis=1, keepdims=True) + 1e-9); w = 5
    d = np.stack([np.convolve(np.pad(d[:, c], w // 2, mode="wrap"), np.ones(w) / w, "valid") for c in range(3)], 1)
    d = d / (np.linalg.norm(d, axis=1, keepdims=True) + 1e-9)
    out = []
    for i in range(mocap.nframes(m)):
        f = {k: m[k][i] for k in P}; f["rE"] = f["rH"] - d[i] * 10; f["lH"] = f["rH"] - d[i] * 10   # feed the smoothed direction to the shape
        out.append(SHAPES[kind](f))
    return out

# ---- hand-animated reloads (IK keys -> frames) ----
F = 85
STANCE = dict(hipH=84, fFoot=[14, F, 8], bFoot=[-14, F, -8])
def ease(t): return t * t * (3 - 2 * t)
def bake(keys, gun):
    """keys: (frame, pose dict, gun state). gun(f_points, state) -> prop segments. Last key must equal the first (loop)."""
    frames, props = [], []
    for (f0, p0, g0), (f1, p1, g1) in zip(keys, keys[1:]):
        for fr in range(f0, f1):
            t = ease((fr - f0) / (f1 - f0)); p = {}
            for k in set(p0) | set(p1):
                a, b = p0.get(k, p1.get(k)), p1.get(k, p0.get(k))
                p[k] = [x + (y - x) * t for x, y in zip(a, b)] if isinstance(a, list) else a + (b - a) * t
            pose = IK["ground"]({"pose": {**STANCE, **p}}); s = IK["raw"](pose)
            pts = {k: np.array(s[k], float) for k in P}
            frames.append([pts[k] for k in P]); props.append(gun(pts, g0, g1, t))
    return np.array(frames), props

def pistol_gun(pts, g0, g1, t):
    tilt = math.radians(g0["tilt"] + (g1["tilt"] - g0["tilt"]) * t)
    d = np.array([math.cos(tilt), math.sin(tilt), 0]); h = pts["rH"]; dn = np.array([-math.sin(tilt), math.cos(tilt), 0])
    slide = (g0.get("slide", 0) + (g1.get("slide", 0) - g0.get("slide", 0)) * t) * 4
    top = h - dn * 6 + d * 1.5                      # hand on the grip, slide above the hand
    out = [seg(h + dn * 3 - d * 1, top, 0, 4.5), seg(top - d * (3 + slide), top + d * (14 - slide), 0, 5)]
    well = h + dn * 3 - d * 1
    out += mag(pts, g0, g1, t, well, dn, 6)
    return out
def rifle_gun(pts, g0, g1, t):
    tilt = math.radians(g0["tilt"] + (g1["tilt"] - g0["tilt"]) * t)
    d = np.array([math.cos(tilt), math.sin(tilt), 0]); dn = np.array([-math.sin(tilt), math.cos(tilt), 0]); h = pts["rH"]
    bolt = (g0.get("slide", 0) + (g1.get("slide", 0) - g0.get("slide", 0)) * t) * 6
    out = [seg(h - d * 16, h + d * 52, 0, 5), seg(h + d * 4 + dn * 1, h + d * 2 + dn * 7, 0, 4), seg(h + d * 8 - dn * 4 - d * bolt, h + d * 14 - dn * 4 - d * bolt, 0, 3)]
    well = h + d * 12 + dn * 2
    out += mag(pts, g0, g1, t, well, nrm(dn + d * .2), 11)
    return out
def mag(pts, g0, g1, t, well, dn, L):
    """magazine: in the gun, dropping, in the left hand, or gone"""
    def where(g):
        st = g["mag"]
        if st == "gun": return well
        if st == "hand": return pts["lH"]
        if st == "pouch": return pts["hB"] + np.array([0, 4, -6])
        if st == "drop": return None
        return None
    a, b = where(g0), where(g1)
    if g0["mag"] == "gun" and g1["mag"] == "drop":       # old magazine falls out
        p = well + np.array([0, 1, 0]) * (85 - well[1]) * t * t
        return [seg(p, p + dn * L, 1, 4)] if t < .95 else []
    if a is None or b is None: return []
    if g0["mag"] == "gun" and g1["mag"] == "gun" and L < 9: return [seg(well, well - dn * 5, 1, 2.5)]   # pistol: seated inside the grip
    p = a + (b - a) * t
    return [seg(p, p + dn * L, 1, 4)]

READY_P = dict(rHand=[38, -36, 4], lHand=[35, -34, 0], head=6, lean=3)
def G(tilt, mg, slide=0): return dict(tilt=tilt, mag=mg, slide=slide)
PISTOL_KEYS = [
    (0, READY_P, G(0, "gun")),
    (6, dict(rHand=[24, -30, 2], lHand=[26, -28, -1], head=22, lean=5), G(-25, "gun")),
    (11, dict(rHand=[24, -30, 2], lHand=[0, 4, -12], head=24, lean=6), G(-25, "drop")),
    (15, dict(rHand=[24, -30, 2], lHand=[-2, 8, -13], head=24, lean=7), G(-25, "pouch")),
    (22, dict(rHand=[24, -30, 2], lHand=[22, -18, 0], head=24, lean=6), G(-25, "hand")),
    (25, dict(rHand=[24, -31, 2], lHand=[23, -24, 0], head=22, lean=5), G(-28, "gun")),
    (29, dict(rHand=[26, -32, 2], lHand=[30, -38, -1], head=18, lean=5), G(-15, "gun", 0)),
    (32, dict(rHand=[26, -32, 2], lHand=[16, -38, -1], head=16, lean=5), G(-15, "gun", 1)),
    (34, dict(rHand=[28, -33, 2], lHand=[24, -33, 0], head=12, lean=4), G(-10, "gun", 0)),
    (42, READY_P, G(0, "gun")),
]
READY_R = dict(rHand=[26, -38, 6], lHand=[52, -34, 0], head=8, lean=4)
RIFLE_KEYS = [
    (0, READY_R, G(0, "gun")),
    (7, dict(rHand=[22, -32, 6], lHand=[34, -24, 0], head=22, lean=6), G(-12, "gun")),
    (12, dict(rHand=[22, -32, 6], lHand=[30, -6, -2], head=26, lean=7), G(-12, "drop")),
    (17, dict(rHand=[22, -32, 6], lHand=[-2, 6, -13], head=26, lean=8), G(-12, "pouch")),
    (25, dict(rHand=[22, -32, 6], lHand=[33, -16, 0], head=26, lean=7), G(-12, "hand")),
    (28, dict(rHand=[22, -33, 6], lHand=[34, -22, 0], head=24, lean=6), G(-14, "gun")),
    (33, dict(rHand=[22, -33, 6], lHand=[26, -44, 2], head=18, lean=5), G(-8, "gun", 0)),
    (36, dict(rHand=[22, -33, 6], lHand=[16, -44, 2], head=16, lean=5), G(-8, "gun", 1)),
    (39, dict(rHand=[24, -35, 6], lHand=[36, -36, 0], head=12, lean=4), G(-4, "gun", 0)),
    (48, READY_R, G(0, "gun")),
]
def retime(keys, k): return [(int(round(f * k)), p, g) for f, p, g in keys]
def mirror_keys(keys): return keys  # (left-handed reloads come from mirroring the baked result)

def save(name, desc, frames, props, cat="weapons"):
    doc = dict(name=name, source="variation", desc=desc, cat=cat, loop=True, fps=mocap.FPS, joints=P,
               frames=np.round(frames).astype(int).tolist(), g=[[[round(x, 1) if isinstance(x, float) else x for x in s] for s in fr] for fr in props])
    with gzip.open(mocap.VARS / f"{name}.json.gz", "wt") as fh: json.dump(doc, fh, separators=(",", ":"))
    return name, desc, len(frames)

def mirror_frames(frames, props):
    lr = mocap.LEFT_RIGHT; idx = {k: i for i, k in enumerate(P)}
    f2 = frames.copy()
    for k, i in idx.items(): f2[:, i] = frames[:, idx[lr.get(k, k)]]
    f2[..., 2] *= -1
    p2 = [[[s[0], s[1], -s[2], s[3], s[4], -s[5], s[6], s[7]] for s in fr] for fr in props]
    return f2, p2

def mocap_weapon(src, kind, focus="hands", mirror=False, speed=None, **kw):
    m, _ = loops.make_loop(mocap.load_move(src)[0], "action", focus, **kw)
    if mirror: m = mocap.mirror(m)
    if speed:
        from build_variations import loop_speed; m = loop_speed(m, speed)
    return loops.arr(m), props_for(m, kind)

def build():
    blocked = set(json.loads((mocap.HERE / "rejected.json").read_text())) if (mocap.HERE / "rejected.json").exists() else set()
    out = []
    pf, pp = bake(PISTOL_KEYS, pistol_gun); rf, rp = bake(RIFLE_KEYS, rifle_gun)
    out.append(save("pistol_reload", "pistol reload: mag out, new mag, slide release", pf, pp))
    f, p = bake(retime(PISTOL_KEYS, .7), pistol_gun); out.append(save("pistol_reload_fast", "fast tactical pistol reload", f, p))
    f, p = mirror_frames(pf, pp); out.append(save("pistol_reload_lefty", "left-handed pistol reload", f, p))
    out.append(save("rifle_reload", "rifle reload: mag out, new mag, charging handle", rf, rp))
    f, p = bake(retime(RIFLE_KEYS, .72), rifle_gun); out.append(save("rifle_reload_fast", "fast rifle reload", f, p))
    f, p = bake(retime(RIFLE_KEYS, 1.3), rifle_gun); out.append(save("rifle_reload_slow", "slow, deliberate rifle reload", f, p))
    for name, desc, src, kind, kw in [
        ("pistol_shoot", "aim and fire a pistol (real mocap)", "gun_shoot_2", "pistol", {}),
        ("pistol_shoot_lefty", "left-handed pistol shot", "gun_shoot_2", "pistol", dict(mirror=True)),
        ("gun_draw", "draw the gun and aim (real mocap)", "gun_draw_1", "pistol", {}),
        ("bat_swing", "baseball bat swing (real mocap)", "bat_swing_1", "bat", {}),
        ("bat_swing_lefty", "bat swing, left-handed", "bat_swing_1", "bat", dict(mirror=True)),
        ("bat_swing_fast", "fast bat swing", "bat_swing_1", "bat", dict(speed=1.3)),
        ("axe_chop", "overhead axe chop (real mocap)", "axe_chop_1", "axe", {}),
        ("axe_chop_heavy", "heavy axe chop, second take", "axe_chop_2", "axe", {}),
        ("sword_slash", "one-handed sword slash (real mocap)", "swordplay_1", "sword", {}),
        ("sword_slash_2", "sword attack, second take", "swordplay_2", "sword", {}),
        ("sword_slash_3", "sword attack, third take", "swordplay_3", "sword", {}),
        ("knife_slash", "knife slash (slash motion from swordplay)", "swordplay_1", "knife", dict(speed=1.25)),
        ("knife_stab", "knife stab (thrust motion from strike)", "strike_1", "knife", dict(speed=1.2)),
        ("knife_slash_lefty", "left-handed knife slash", "swordplay_1", "knife", dict(mirror=True, speed=1.25)),
        ("grenade_throw", "big overhand throw (real pitching mocap)", "pitch_1", "ball", {}),
    ]:
        f, p = mocap_weapon(src, kind, **kw); out.append(save(name, desc, f, p))
    for name, _, _ in out:
        if name in blocked: (mocap.VARS / f"{name}.json.gz").unlink(missing_ok=True)
    out = [o for o in out if o[0] not in blocked]
    v = json.loads(mocap.VARS_INDEX.read_text())
    for name, desc, n in out:
        v[name] = dict(cat="weapons", how=desc, loop=True, frames=n, status=v.get(name, {}).get("status", "active"))
    mocap.VARS_INDEX.write_text(json.dumps(v, indent=1))
    print(len(out), "weapon loops:", ", ".join(n for n, _, _ in out))
if __name__ == "__main__": build()
