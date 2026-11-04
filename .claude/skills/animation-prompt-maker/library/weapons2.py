"""Hand-animated pistol and knife loops built from real technique (isosceles stance, recoil, 4-count draw,
speed reload in the workspace, pistol whip, knife slashes/thrust/reverse-grip stab). python3 weapons2.py"""
import json, math, numpy as np, mocap, weapons as W
from weapons import seg, nrm, save, mirror_frames, IK
P = mocap.PTS
F = 85
ISO = dict(hipH=84, fFoot=[9, F, 11], bFoot=[-5, F, -11])           # isosceles: square, shoulder-width, soft knees
def ease(t): return t * t * (3 - 2 * t)

def bake(keys, prop, stance=ISO):
    """keys: (frame, pose, state). pose = IK targets/angles, state = weapon state. Last key == first (seamless loop)."""
    frames, props = [], []
    for (f0, p0, g0), (f1, p1, g1) in zip(keys, keys[1:]):
        for fr in range(f0, f1):
            t = (fr - f0) / (f1 - f0); t = 1 - (1 - t) ** 3 if g1.get("snap") else ease(t)
            p = {}
            for k in set(p0) | set(p1):
                a, b = p0.get(k, p1.get(k)), p1.get(k, p0.get(k))
                p[k] = [x + (y - x) * t for x, y in zip(a, b)] if isinstance(a, list) else a + (b - a) * t
            pose = IK["ground"]({"pose": {**stance, **p}}); s = IK["raw"](pose)
            pts = {k: np.array(s[k], float) for k in P}
            frames.append([pts[k] for k in P]); props.append(prop(pts, g0, g1, t, fr - f0 == 0))
    return np.array(frames), props

def lerpv(a, b, t): return np.asarray(a, float) + (np.asarray(b, float) - np.asarray(a, float)) * t
HOLSTER = np.array([1.0, 12, 14])                                       # right hip
def gun_frame(pts, g):
    """position + barrel direction + 'down' (toward the grip) for one weapon state"""
    if g.get("mode") == "holster": return HOLSTER, np.array([0, 1.0, 0]), np.array([-1.0, 0, 0])
    if g.get("mode") == "arm":                                          # gun follows the forearm (whip)
        d = nrm(pts["rH"] - pts["rE"]); up = np.array([0, -1.0, 0]); side = nrm(np.cross(d, up))
        return pts["rH"], d, nrm(np.cross(side, d)) * -1
    a = math.radians(g.get("tilt", 0)); d = np.array([math.cos(a), math.sin(a), 0]); dn = np.array([-math.sin(a), math.cos(a), 0])
    return pts["rH"], d, dn
def pistol(pts, g0, g1, t, first):
    h0, d0, n0 = gun_frame(pts, g0); h1, d1, n1 = gun_frame(pts, g1)
    h, d, dn = lerpv(h0, h1, t), nrm(lerpv(d0, d1, t)), nrm(lerpv(n0, n1, t))
    sl = lerpv([g0.get("slide", 0)], [g1.get("slide", 0)], t)[0] * 4
    out = [seg(h - d * (3 + sl), h + d * (14 - sl), 0, 5.5), seg(h - d * 1, h + dn * 8 - d * 2.5, 0, 4.5)]
    well = h + dn * 8 - d * 2.5
    m0, m1 = g0.get("mag", "gun"), g1.get("mag", "gun")
    def where(st):
        return {"gun": well, "hand": pts["lH"] + np.array([0, -2, 0]), "pouch": np.array([7.0, 1, -11])}.get(st)
    if m0 == "gun" and m1 == "drop":
        p = well + np.array([0, 1.0, 0]) * (84 - well[1]) * t * t; out.append(seg(p, p + dn * 7, 1, 4))
    elif m0 in ("drop",) and m1 == "pouch": pass
    elif where(m0) is not None and where(m1) is not None:
        p = lerpv(where(m0), where(m1), t); out.append(seg(p, p + (dn if m1 == "gun" or m0 == "gun" else np.array([0, 1.0, 0])) * 7, 1, 4))
    if g0.get("flash") and first: out.append(seg(h + d * 15, h + d * 24, 1, 7))   # muzzle flash on the shot frame
    return out
def knife(pts, g0, g1, t, first):
    rev = g0.get("grip") == "reverse"
    d = nrm(pts["rH"] - pts["rE"]); h = pts["rH"]
    if rev:   # reverse (ice-pick) grip: blade comes out of the pinky side, pointing back along the forearm and down
        b = nrm(-d * .8 + np.array([0, .6, 0])); return [seg(h, h + b * 3, 0, 5), seg(h + b * 2, h + b * 17, 0, 3)]
    b = nrm(d + np.array([0, -.25, 0])); return [seg(h - b * 2, h + b * 3, 0, 5), seg(h + b * 3, h + b * 18, 0, 3)]

# ---------------- poses ----------------
AIM = dict(rHand=[61, -60, 1], lHand=[59, -59, -1], lean=8, head=2, twist=0)
G = lambda **k: {**dict(mode="aim", tilt=0, mag="gun", slide=0), **k}
def recoil(f):   # one shot: muzzle flip and hands rise for 2 frames, settle over ~5 (real recoil is fast)
    return [(f, AIM, G(flash=True)),
            (f + 2, dict(AIM, rHand=[58, -66, 1], lHand=[56, -65, -1], head=1, lean=7), G(tilt=-20, slide=1, snap=True)),
            (f + 4, dict(AIM, rHand=[60, -62, 1], lHand=[58, -61, -1]), G(tilt=-6)),
            (f + 7, AIM, G())]
FIRE = [(0, AIM, G())] + recoil(8) + [(30, AIM, G())]
DOUBLE = [(0, AIM, G())] + recoil(6)[:-1] + recoil(13) + [(34, AIM, G())]
AIM_IDLE = [(0, AIM, G()), (20, dict(AIM, rHand=[61, -59.3, 1.4], lHand=[59, -58.3, -.6], lean=8.5), G()), (40, AIM, G())]

RELAX = dict(rHand=[5, 14, 15], lHand=[5, 14, -15], lean=3, head=4)
DRAW = [  # four-count draw, then reholster so it loops
    (0, RELAX, G(mode="holster")),
    (4, dict(RELAX, rHand=[2, 10, 14], lHand=[14, -38, -3]), G(mode="holster")),                   # 1: grip, support hand to chest
    (8, dict(rHand=[3, -8, 13], lHand=[16, -40, -3], lean=5, head=4), G(mode="aim", tilt=80)),        # 2: clear the holster
    (11, dict(rHand=[10, -22, 10], lHand=[18, -42, -3], lean=6, head=4), G(tilt=0)),                 # 2: rotate level at the pec
    (14, dict(rHand=[20, -44, 2], lHand=[19, -43, -1], lean=7, head=4), G()),                        # 3: hands meet at the chest
    (19, AIM, G(snap=True)),                                                                       # 4: punch out to the target
    (34, AIM, G()),
    (40, dict(rHand=[36, -30, 1], lHand=[34, -29, -1], lean=6, head=6), G()),                        # lower to ready
    (46, dict(rHand=[10, -22, 10], lHand=[16, -36, -3], lean=5, head=8), G(tilt=60)),                # back to the hip, look at holster
    (50, dict(rHand=[2, 10, 14], lHand=[12, -30, -3], lean=4, head=10), G(mode="holster")),          # reholster
    (56, RELAX, G(mode="holster")),
]
WS = dict(rHand=[25, -52, -3], lHand=[24, -51, -4], lean=8, head=14)                              # workspace: high, in front of the chin
RELOAD = [  # speed reload, gun stays up where you can still see the threat
    (0, AIM, G()),
    (5, WS, G(tilt=-18)),                                                                          # pull into the workspace, cant toward support side
    (7, dict(WS, lHand=[14, -30, -8]), G(tilt=-18, mag="gun")),                                      # thumb presses release, support hand already moving
    (11, dict(WS, lHand=[7, 0, -11]), G(tilt=-18, mag="drop")),                                      # empty mag drops free, hand reaches the pouch
    (14, dict(WS, lHand=[7, 1, -11]), G(tilt=-18, mag="pouch")),                                     # grab the fresh magazine, index finger on its front
    (19, dict(WS, lHand=[23, -42, -3]), G(tilt=-18, mag="hand")),                                    # bring it up to the mag well
    (21, dict(WS, lHand=[24, -46, -3]), G(tilt=-18, mag="gun", snap=True)),                          # seat it hard with the heel of the hand
    (24, dict(WS, lHand=[28, -60, -2]), G(tilt=-10)),                                                # overhand grip on the slide
    (27, dict(WS, rHand=[29, -52, -3], lHand=[16, -60, -2]), G(tilt=-10, slide=1, snap=True)),       # rack: slide back while the gun pushes forward
    (30, dict(WS, rHand=[27, -53, -2], lHand=[25, -52, -3]), G(tilt=-4)),                            # hands rejoin
    (36, AIM, G(snap=True)),                                                                       # punch back out
    (46, AIM, G()),
]
READY = dict(rHand=[26, -44, 5], lHand=[22, -56, -7], lean=6, head=4, twist=0)                    # retention: gun tucked, support hand up as a fence
GA = G(mode="arm")
WHIP = [
    (0, READY, G()),
    (6, dict(rHand=[4, -74, 17], lHand=[24, -54, -9], lean=3, head=0, twist=-22, x=-3), GA),        # cock the gun back by the ear, chest turns away
    (9, dict(rHand=[40, -54, -4], lHand=[18, -40, -12], lean=16, head=6, twist=24, x=7), dict(GA, snap=True)),   # drive down and across: strike with the slide
    (12, dict(rHand=[28, -26, -18], lHand=[16, -40, -12], lean=19, head=10, twist=30, x=8), GA),     # follow-through
    (18, dict(rHand=[24, -42, 3], lHand=[20, -54, -8], lean=9, head=4, twist=5, x=2), G()),          # recover the gun to the chest
    (26, READY, G()),
]
BACKHAND_WHIP = [
    (0, READY, G()),
    (5, dict(rHand=[14, -50, -18], lHand=[22, -56, -6], lean=6, head=2, twist=26, x=-2), GA),        # wind across the body
    (8, dict(rHand=[42, -56, 22], lHand=[18, -46, -10], lean=12, head=4, twist=-24, x=6), dict(GA, snap=True)),  # backhand swing out to the right
    (11, dict(rHand=[30, -50, 30], lHand=[18, -46, -10], lean=12, head=4, twist=-30, x=6), GA),
    (18, dict(rHand=[24, -42, 3], lHand=[20, -54, -8], lean=8, head=4, twist=0, x=1), G()),
    (26, READY, G()),
]
KG = dict(rHand=[30, -40, 8], lHand=[24, -54, -7], lean=9, head=4, twist=0)                       # knife guard, forward grip
FIG8 = [
    (0, KG, {}),
    (4, dict(KG, rHand=[10, -64, 17], twist=-24, x=-2), {}),                                          # cock to the right shoulder
    (8, dict(KG, rHand=[34, -28, -22], twist=26, lean=14, x=6), {"snap": True}),                     # forehand slash down and across
    (12, dict(KG, rHand=[14, -56, -15], twist=20, lean=10, x=3), {}),                                # load the backhand
    (16, dict(KG, rHand=[38, -34, 22], twist=-22, lean=13, x=6), {"snap": True}),                    # backhand slash back across
    (24, KG, {}),
]
THRUST = [
    (0, KG, {}),
    (5, dict(KG, rHand=[14, -38, 8], lean=6, x=-3), {}),                                              # chamber at the hip
    (9, dict(KG, rHand=[60, -46, 2], lHand=[16, -46, -12], lean=17, twist=16, x=12, fFoot=[30, F, 11]), {"snap": True}),   # lunge and thrust
    (14, dict(KG, rHand=[48, -44, 3], lean=14, twist=10, x=10, fFoot=[30, F, 11]), {}),
    (22, dict(KG, fFoot=[9, F, 11]), {}),                                                            # step back to guard
    (28, KG, {}),
]
RG = dict(rHand=[22, -48, 7], lHand=[24, -56, -7], lean=8, head=4)                                # reverse-grip guard
ICEPICK = [
    (0, RG, {"grip": "reverse"}),
    (6, dict(RG, rHand=[14, -86, 12], lean=2, head=-6, twist=-10), {"grip": "reverse"}),             # raise overhead
    (9, dict(RG, rHand=[38, -30, 2], lean=22, head=10, twist=12, x=6), {"grip": "reverse", "snap": True}),   # drive the blade down
    (13, dict(RG, rHand=[32, -20, 0], lean=24, head=12, twist=14, x=6), {"grip": "reverse"}),
    (22, RG, {"grip": "reverse"}),
]
def retime(keys, k): return [(int(round(f * k)), p, g) for f, p, g in keys]

def build():
    blocked = set(json.load(open(mocap.HERE / "rejected.json")))
    items = [
        ("pistol_aim_idle", "two-handed isosceles aim, breathing", bake(AIM_IDLE, pistol)),
        ("pistol_fire", "aim and fire one shot: muzzle flip, recover on target", bake(FIRE, pistol)),
        ("pistol_double_tap", "two fast shots", bake(DOUBLE, pistol)),
        ("pistol_draw_holster", "four-count draw from the hip, aim, reholster", bake(DRAW, pistol)),
        ("pistol_speed_reload", "speed reload in the workspace: drop mag, seat, overhand rack", bake(RELOAD, pistol)),
        ("pistol_speed_reload_fast", "fast speed reload", bake(retime(RELOAD, .75), pistol)),
        ("pistol_whip", "pistol whip: cock by the ear, strike down and across with the slide", bake(WHIP, pistol)),
        ("pistol_whip_backhand", "backhand pistol whip", bake(BACKHAND_WHIP, pistol)),
        ("knife_slash_combo", "forward-grip forehand + backhand slash (figure 8)", bake(FIG8, knife)),
        ("knife_thrust", "lunging knife thrust", bake(THRUST, knife)),
        ("knife_icepick_stab", "reverse-grip overhead stab", bake(ICEPICK, knife)),
    ]
    v = json.loads(mocap.VARS_INDEX.read_text()); out = []
    for name, desc, (f, p) in items:
        if name in blocked: continue
        save(name, desc, f, p); out.append(name)
        v[name] = dict(cat="weapons", how=desc, loop=True, frames=len(f), status=v.get(name, {}).get("status", "active"))
    for name, desc, src in [("pistol_whip_lefty", "left-handed pistol whip", "pistol_whip"), ("knife_slash_combo_lefty", "left-handed knife slashes", "knife_slash_combo")]:
        if name in blocked: continue
        f, p = dict((n, r) for n, _, r in items)[src]; f2, p2 = mirror_frames(f, p); save(name, desc, f2, p2); out.append(name)
        v[name] = dict(cat="weapons", how=desc, loop=True, frames=len(f2), status=v.get(name, {}).get("status", "active"))
    mocap.VARS_INDEX.write_text(json.dumps(v, indent=1)); print(len(out), "built:", ", ".join(out))
if __name__ == "__main__": build()
