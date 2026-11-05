"""First-person viewmodel moves (arms + fingers + weapon), in camera space.
Camera at origin looking down -Z, +X right, +Y up, units cm. Only what a game camera sees: hand, wrist, a little forearm.
Arms are two-bone IK from fixed shoulders; fingers are 3-joint chains with joint limits that wrap the grip / trigger / magazine."""
import json, math, numpy as np
FPS = 30
SHR, SHL = np.array([17., -27., 6.]), np.array([-17., -27., 6.])     # shoulders sit behind/below the eye
UP, FO = 28.0, 26.0                                                   # upper arm, forearm (cm)
D = dict(x=20, y=-14.5, z=-32, yaw=9, pitch=3, roll=0, trig=.5, magY=0, mfx=0, mfy=0, mfz=0, magOn=1,
         lx=-34, ly=-62, lz=-14, lcurl=.35, lOnMag=0, lOnBolt=0, lOnShroud=0, bolt=0, cp=0, cy=0, cr=0, cx=0, cyy=0, cz=0)
def n(v): v = np.asarray(v, float); return v / (np.linalg.norm(v) + 1e-9)
def rot(yaw, pitch, roll):
    y, p, r = map(math.radians, (yaw, pitch, roll))
    Ry = np.array([[math.cos(y), 0, math.sin(y)], [0, 1, 0], [-math.sin(y), 0, math.cos(y)]])
    Rx = np.array([[1, 0, 0], [0, math.cos(p), -math.sin(p)], [0, math.sin(p), math.cos(p)]])
    Rz = np.array([[math.cos(r), -math.sin(r), 0], [math.sin(r), math.cos(r), 0], [0, 0, 1]])
    return Ry @ Rx @ Rz
def ik(S, T, pole):
    d = T - S; L = np.linalg.norm(d); L = min(L, UP + FO - .01); f = n(d)
    a = (UP**2 + L**2 - FO**2) / (2 * UP * L); a = max(-1, min(1, a))
    p = n(pole - f * np.dot(pole, f))
    E = S + f * UP * a + p * UP * math.sqrt(1 - a * a)
    return E, S + f * L
def curve(keys, dur):
    """Catmull-Rom per channel between keyframes (t seconds, overrides)."""
    ks = []; cur = dict(D)
    for t, o in keys: cur = dict(cur, **o); ks.append((t, dict(cur)))
    N = int(round(dur * FPS)); out = []
    for i in range(N):
        t = i / FPS; j = max(k for k in range(len(ks)) if ks[k][0] <= t + 1e-9) if t >= ks[0][0] else 0
        j2 = min(j + 1, len(ks) - 1); t0, t1 = ks[j][0], ks[j2][0]; u = 0 if t1 == t0 else min(1, (t - t0) / (t1 - t0))
        u = u * u * (3 - 2 * u)
        a, b = ks[max(j - 1, 0)][1], ks[j][1]; c, d = ks[j2][1], ks[min(j2 + 1, len(ks) - 1)][1]
        fr = {}
        for k in D:
            p0, p1, p2, p3 = a[k], b[k], c[k], d[k]
            fr[k] = .5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3)
            if k in ("magOn",): fr[k] = b[k] if u < 1 else c[k]
        out.append(fr)
    return out
def shots(frames, times, kick=1.0, climb=0.0):
    fl = [0] * len(frames)
    for s, t in enumerate(times):
        i0 = int(round(t * FPS)); fl[min(i0, len(fl) - 1)] = 1
        for i in range(i0, len(frames)):
            dt = (i - i0) / FPS; e = math.exp(-dt / .07) * (1 if i > i0 else .6); c = climb * s
            f = frames[i]; f["z"] += 3.8 * kick * e; f["pitch"] += (6 * kick * e) + c * math.exp(-dt / .5); f["y"] += .8 * kick * e
            f["roll"] += 1.5 * kick * e * (1 if s % 2 else -1); f["cp"] += 1.1 * kick * e + c * .25 * math.exp(-dt / .5)
            f["trig"] = max(f["trig"], .5 + .28 * math.exp(-dt / .05)); f["bolt"] = max(f["bolt"], math.exp(-dt / .02) * (dt < .1))
    return fl
# ---------------- geometry ----------------
def cap(a, b, r, col): return [round(float(v), 2) for v in (*a, *b)] + [r, col]
def box(c, ax, ay, az, sx, sy, sz, col):
    return [round(float(v), 3) for v in (*c, *(n(ax) * sx), *(n(ay) * sy), *(n(az) * sz))] + [col]
def finger(base, dirs, lens, r, out, col=0):
    p = base
    for d, L in zip(dirs, lens):
        q = p + d * L; out.append(cap(p, q, r, col)); p = q; r *= .9
    return p
def pose(f):
    R3 = rot(f["yaw"], f["pitch"], f["roll"]); F, U, Rt = R3 @ [0, 0, -1], R3 @ [0, 1, 0], R3 @ [1, 0, 0]
    O = np.array([f["x"], f["y"], f["z"]]); caps, boxes = [], []
    g = n(-U - .28 * F)                                                       # grip axis, raked back
    gx = n(np.cross(Rt, g))
    # --- gun (TEC-9 style): receiver, perforated shroud, grip, guard, magazine ahead of the trigger, bolt knob on the left
    boxes.append(box(O + F * 7 + U * 2.6, Rt, U, F, 3.2, 4.6, 23, 2))
    boxes.append(box(O + F * 23.5 + U * 2.9, Rt, U, F, 2.7, 2.7, 10, 3))
    for k in range(4): boxes.append(box(O + F * (20 + k * 2.4) + U * 2.9 - Rt * 1.4, Rt, U, F, .3, 1.1, 1.0, 5))
    boxes.append(box(O + F * 27.5 + U * 5.0, Rt, U, F, .5, 2.0, .6, 2)); boxes.append(box(O - F * 2.6 + U * 5.6, Rt, U, F, 1.8, 1.8, .5, 2))
    boxes.append(box(O + g * 5.2 + F * .2, Rt, g, gx, 3.0, 10.5, 3.6, 2))
    boxes.append(box(O + F * 3.4 - U * 2.6, Rt, U, F, .5, .5, 4.8, 2)); boxes.append(box(O + F * 5.6 - U * 1.4, Rt, U, F, .5, 2.4, .5, 2))
    trig_c = O + F * (3.2 - f["trig"] * .8) - U * 1.2; boxes.append(box(trig_c, Rt, U, F, .35, 1.8, .45, 3))
    mag_axis = n(-U + .06 * F); mag_attached = O + F * 9.5 + mag_axis * 7.5
    magC = mag_attached + mag_axis * f["magY"] + np.array([f["mfx"], f["mfy"], f["mfz"]])
    if f["magOn"] > .5: boxes.append(box(magC, Rt, mag_axis, n(np.cross(Rt, mag_axis)), 2.2, 14, 3.2, 4))
    knob = O + F * (5 - f["bolt"] * 6.5) + U * 3.6 - Rt * 2.4; boxes.append(box(knob, Rt, U, F, 1.6, 1.2, 1.2, 3))
    muzzle = O + F * 29 + U * 2.9
    # --- right hand wrapped on the grip
    W = O - F * 4.6 + Rt * 1.4 - U * 2.4
    E, W2 = ik(SHR, W, np.array([.6, -1, .5]))
    caps.append(cap(SHR, E, 4.6, 0)); caps.append(cap(E, W2, 4.0, 0)); caps.append(cap(W2 + n(W2 - E) * -9, W2, 3.2, 0))
    Kn = [O + g * (1.0 + 2.15 * i) + F * 1.7 + Rt * 1.9 for i in range(4)]       # index, middle, ring, pinky knuckles
    palmc = (W + Kn[0] + Kn[3]) / 3 + Rt * .4
    boxes.append(box(palmc, n(Kn[0] - Kn[3]), n(np.cross(n(Kn[0] - Kn[3]), n(palmc - W))), n(palmc - W), 7.6, 3.0, 8.2, 0))
    caps.append(cap(W, Kn[0], 1.7, 0)); caps.append(cap(W, Kn[3], 1.6, 0))
    def wrap(c, lim=(65, 150, 215)):                                          # curl around the grip axis: forward -> across -> back
        return [F * math.cos(math.radians(a * c)) - Rt * math.sin(math.radians(a * c)) for a in lim]
    lens = [(4.2, 2.5, 2.0), (4.7, 2.9, 2.2), (4.3, 2.7, 2.1), (3.5, 2.1, 1.8)]
    for i in range(4):
        if i == 0:   # index finger goes forward onto the trigger and curls by the trigger amount
            dirs = [n(F * 1 - U * .25), n(F * math.cos(math.radians(40 + 80 * f["trig"])) - U * math.sin(math.radians(40 + 80 * f["trig"])) - Rt * .25),
                    n(-U - F * (f["trig"] - .3) - Rt * .2)]
            finger(Kn[0], dirs, lens[0], .95, caps)
        else: finger(Kn[i], wrap(1.0), lens[i], .95 - .07 * i, caps)
    T0 = W + F * 2.2 - Rt * 1.2 + U * .8                                     # thumb along the left side of the grip
    finger(T0, [n(F - Rt * .9 + U * .3), n(F - Rt * .2), n(F - U * .4)], (3.4, 2.8, 2.2), 1.15, caps)
    # --- left hand: free / on the magazine / on the bolt knob / supporting the shroud
    free = np.array([f["lx"], f["ly"], f["lz"]])
    on_mag = magC + mag_axis * 8.5 - F * 2.5 - Rt * 1.0
    on_bolt = knob - Rt * 3.0 - F * 3.5 + U * .5
    on_shroud = O + F * 21 - U * 3.2 - Rt * 1.0
    wts = [max(0, 1 - f["lOnMag"] - f["lOnBolt"] - f["lOnShroud"]), f["lOnMag"], f["lOnBolt"], f["lOnShroud"]]
    LW = sum(w * p for w, p in zip(wts, (free, on_mag, on_bolt, on_shroud)))
    hf = n(F * .9 + U * .25 + Rt * .35) if f["lOnBolt"] < .5 else n(F * .6 + Rt * .8)
    pn = n(np.cross(hf, -F)) if f["lOnMag"] + f["lOnShroud"] > .3 else n(Rt + U * .3)
    pn = n(pn - hf * np.dot(pn, hf)); side = n(np.cross(pn, hf))
    LE, LW2 = ik(SHL, LW, np.array([-.6, -1, .5]))
    caps.append(cap(SHL, LE, 4.6, 0)); caps.append(cap(LE, LW2, 4.0, 0)); caps.append(cap(LW2 + n(LW2 - LE) * -9, LW2, 3.2, 0))
    lk = [LW + hf * 8 + side * (2.6 - 1.75 * i) for i in range(4)]
    pc = (LW + lk[0] + lk[3]) / 3
    boxes.append(box(pc, n(lk[0] - lk[3]), pn, n(pc - LW), 7.4, 3.0, 8, 0))
    caps.append(cap(LW, lk[0], 1.7, 0)); caps.append(cap(LW, lk[3], 1.6, 0))
    c = f["lcurl"]
    for i in range(4):
        dirs = [n(hf * math.cos(math.radians(a * c)) + pn * math.sin(math.radians(a * c))) for a in (55, 140, 205)]
        finger(lk[i], dirs, lens[i], .95 - .07 * i, caps)
    finger(LW + hf * 2.5 + side * 2.4 + pn * 1, [n(hf + side * .8 + pn * .4), n(hf + pn * .5 * c), n(hf + pn * c)], (3.4, 2.8, 2.2), 1.15, caps)
    cam = [round(f[k], 2) for k in ("cp", "cy", "cr", "cx", "cyy", "cz")]
    return dict(c=caps, b=boxes, cam=cam, m=[round(float(v), 2) for v in (*muzzle, *F)])
# ---------------- the moves ----------------
def mv(name, title, keys, dur, loop, shots_at=(), kick=1., climb=0., note=""):
    fr = curve(keys, dur); fl = shots(fr, shots_at, kick, climb) if shots_at else [0] * len(fr)
    P = [pose(f) for f in fr]
    for p, x in zip(P, fl): p["f"] = x
    return dict(n=name, t=title, loop=loop, sec=round(dur, 2), note=note, fr=P)
def loop_keys(ch, dur, steps=8):
    return [(dur * i / steps, {k: (fn(i / steps)) for k, fn in ch.items()}) for i in range(steps + 1)]
S2 = lambda a, ph=0: (lambda u: a * math.sin(2 * math.pi * (u + ph)))
S4 = lambda a, ph=0: (lambda u: a * math.sin(4 * math.pi * (u + ph)))
def build():
    M = []
    M.append(mv("fp_tec9_idle", "TEC-9 idle (breathing sway)", loop_keys(dict(x=lambda u: 20 + S2(.35)(u), y=lambda u: -14.5 + S2(.45, .25)(u), pitch=lambda u: 3 + S2(.6, .1)(u),
              roll=lambda u: S2(.8)(u), cp=S2(.25, .3)), 3.2, 16), 3.2, True))
    M.append(mv("fp_tec9_walk", "TEC-9 walk (step bob)", loop_keys(dict(x=lambda u: 20 + S2(1.3)(u), y=lambda u: -14.5 - abs(math.sin(2 * math.pi * u)) * 1.6, yaw=lambda u: 9 + S2(1.2)(u),
              roll=lambda u: S2(2.0)(u), cyy=lambda u: -abs(math.sin(2 * math.pi * u)) * 1.4, cr=S2(.5), cx=S2(.8)), 1.1, 16), 1.1, True))
    M.append(mv("fp_tec9_sprint", "TEC-9 sprint (gun tucked, arm pumping)", loop_keys(dict(x=lambda u: 20 + S2(3)(u), y=lambda u: -27 - abs(math.sin(2 * math.pi * u)) * 3, z=lambda u: -36 + S2(3)(u),
              yaw=lambda u: 38 + S2(5)(u), pitch=lambda u: -18 + S2(4, .2)(u), roll=lambda u: 40 + S2(6)(u), trig=lambda u: .15,
              cyy=lambda u: -abs(math.sin(2 * math.pi * u)) * 3, cr=S2(1.2), cx=S2(1.6), cp=lambda u: 3 + S4(.6)(u)), .66, 16), .66, True))
    M.append(mv("fp_tec9_fire", "TEC-9 single shot", [(0, {}), (.55, {})], .55, False, shots_at=(.06,)))
    M.append(mv("fp_tec9_burst", "TEC-9 full-auto burst (9 rounds, muzzle climb)", [(0, {}), (1.4, {})], 1.4, False, shots_at=[.05 + i * .075 for i in range(9)], kick=.75, climb=1.1))
    M.append(mv("fp_tec9_dry_fire", "TEC-9 empty click (dry fire, check the gun)", [(0, {}), (.08, dict(trig=.85)), (.16, dict(trig=.5)), (.3, dict(trig=.85)), (.38, dict(trig=.5)),
              (.7, dict(yaw=22, roll=24, pitch=8, x=20, y=-17)), (1.2, dict(yaw=22, roll=24, pitch=8, x=20, y=-17)), (1.6, dict(D))], 1.6, False))
    def reload(empty):
        tilt = dict(yaw=24, roll=30, pitch=12, x=16, y=-11, z=-35, cp=-1.5)
        k = [(0, {}), (.3, tilt), (.5, dict(lx=-2, ly=-30, lz=-30, lcurl=.2)), (.62, dict(lOnMag=1, lcurl=.75)),
             (.82, dict(magY=13)), (1.0, dict(magY=13, mfx=-14, mfy=-30, mfz=10, lOnMag=1)), (1.05, dict(magOn=0, lOnMag=0, lx=-30, ly=-60, lz=-6, magY=0, mfx=0, mfy=0, mfz=0)),
             (1.12, dict(magOn=1, lOnMag=1, magY=13, mfx=-14, mfy=-30, mfz=10)), (1.4, dict(mfx=0, mfy=0, mfz=0, magY=15)),
             (1.58, dict(magY=0, lcurl=.45, y=-12.2, cp=-.6)), (1.66, dict(y=-11, cp=-1.5))]
        t = 1.66
        if empty:
            k += [(1.82, dict(lOnMag=0, lOnBolt=1, lcurl=.8)), (1.98, dict(bolt=1, yaw=24, roll=32)), (2.06, dict(bolt=0, lOnBolt=.0, lx=-22, ly=-40, lz=-30)), (2.4, dict(lx=-34, ly=-62, lz=-14, lcurl=.35))]
            t = 2.4
        else:
            k += [(1.9, dict(lOnMag=0, lx=-34, ly=-62, lz=-14, lcurl=.35))]; t = 1.9
        k += [(t + .45, dict(D))]
        return mv("fp_tec9_reload_empty" if empty else "fp_tec9_reload", "TEC-9 reload from empty (mag swap + rack the bolt)" if empty else "TEC-9 tactical reload (mag swap)", k, t + .5, False)
    M.append(reload(False)); M.append(reload(True))
    off = dict(x=30, y=-52, z=-24, yaw=30, pitch=-35, roll=50, trig=.1)
    M.append(mv("fp_tec9_draw", "TEC-9 draw (up into view)", [(0, off), (.35, dict(D, pitch=8, y=-19)), (.55, dict(D))], .6, False))
    M.append(mv("fp_tec9_holster", "TEC-9 holster (down out of view)", [(0, dict(D)), (.15, dict(D, pitch=6, y=-19.5)), (.5, off)], .55, False))
    M.append(mv("fp_tec9_inspect", "TEC-9 inspect (turn it over, check the mag)", [(0, {}), (.5, dict(x=12, y=-14, z=-36, yaw=55, roll=-35, pitch=10, cp=-2)),
              (1.4, dict(x=12, y=-14, z=-36, yaw=70, roll=-60, pitch=14, cp=-2)), (1.9, dict(x=14, y=-15, z=-36, yaw=10, roll=70, pitch=6, cp=-1, lx=-8, ly=-30, lz=-32, lcurl=.3)),
              (2.2, dict(lOnMag=1, lcurl=.7)), (2.5, dict(magY=3)), (2.75, dict(magY=0, lOnMag=0, lx=-34, ly=-62, lz=-14, lcurl=.35)), (3.3, dict(D))], 3.4, False))
    M.append(mv("fp_tec9_bash", "TEC-9 melee bash (pistol-whip forward)", [(0, {}), (.18, dict(x=34, y=-12, z=-30, yaw=-10, roll=-30, pitch=25, cy=2, cr=2)),
              (.32, dict(x=4, y=-20, z=-58, yaw=45, roll=60, pitch=-10, cy=-4, cr=-3, cp=1)), (.42, dict(x=2, y=-21, z=-58, yaw=48, roll=62, pitch=-12, cy=-4.5, cr=-3)), (.85, dict(D))], .9, False))
    M.append(mv("fp_tec9_flinch", "TEC-9 jump-scare flinch (recoil back, then re-aim)", [(0, {}), (.08, dict(x=14, y=-10, z=-26, yaw=24, pitch=22, roll=-10, cp=4, cyy=2, cz=3, lx=-14, ly=-14, lz=-30, lcurl=.15)),
              (.45, dict(x=15, y=-11, z=-27, yaw=22, pitch=18, roll=-8, cp=3, cyy=1.5, cz=2.5, lx=-15, ly=-16, lz=-30, lcurl=.2)), (.9, dict(D, x=20, y=-17, yaw=5, pitch=4)), (1.3, dict(D))], 1.35, False))
    M.append(mv("fp_tec9_two_hand_aim", "TEC-9 two-hand steady aim (left hand on the shroud)", [(0, {}), (.35, dict(x=10, y=-16, z=-42, yaw=4, lOnShroud=1, lcurl=.7)), (1.6, dict(x=10, y=-16, z=-42, yaw=4, lOnShroud=1, lcurl=.7, pitch=3.6)),
              (2.0, dict(D))], 2.1, False))
    M.append(mv("fp_tec9_two_hand_fire", "TEC-9 two-hand burst (left hand on the shroud)", [(0, dict(x=10, y=-16, z=-42, yaw=4, lOnShroud=1, lcurl=.7)), (1.2, dict(x=10, y=-16, z=-42, yaw=4, lOnShroud=1, lcurl=.7))],
              1.2, False, shots_at=[.05 + i * .075 for i in range(7)], kick=.55, climb=.6))
    return M
if __name__ == "__main__":
    import sys; M = build(); s = json.dumps(M, separators=(",", ":"))
    open(sys.argv[1], "w").write(s); print(len(M), "moves", len(s) // 1024, "KB")
