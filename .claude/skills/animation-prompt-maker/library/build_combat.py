"""Battle/combat + horror moves from unused CMU clips, and combat-pistol moves (real body, arms IK-locked onto a pistol)."""
import json, math, numpy as np, mocap, loops, strikes, ikclean, weapons, truth, build_more, build_new
from concurrent.futures import ThreadPoolExecutor
P = mocap.PTS; I = {k: i for i, k in enumerate(P)}; F = mocap.FLOOR
IDX = json.load(open(mocap.HERE / "cmu_index.json"))
CLIPS = {  # clip: (category, honest name, mode)
 "135_04": ("battle & combat", "Front kick", "loop"), "143_24": ("battle & combat", "Kicking", "loop"), "144_05": ("battle & combat", "Front kick (right leg)", "loop"),
 "144_06": ("battle & combat", "Front kick (right leg)", "loop"), "144_09": ("battle & combat", "Front kick (left leg)", "loop"), "144_10": ("battle & combat", "Front kick (left leg)", "loop"),
 "90_07": ("battle & combat", "Jump kick", "loop"), "76_04": ("battle & combat", "Defensive guard", "loop"), "22_17": ("battle & combat", "Rush in and grapple", "oneshot"),
 "23_17": ("battle & combat", "Rush in and grapple", "oneshot"), "91_46": ("battle & combat", "Spinning jump (evade)", "loop"), "91_53": ("battle & combat", "180° jump turn (evade)", "loop"),
 "75_08": ("battle & combat", "360° jump", "loop"), "82_02": ("battle & combat", "Drop off a ledge", "oneshot"), "82_03": ("battle & combat", "Drop off a ledge", "oneshot"),
 "127_17": ("battle & combat", "Run, stop, run", "oneshot"), "83_42": ("battle & combat", "Long jump forward", "oneshot"),
 "139_16": ("knockdown & recovery", "Get up from the ground", "oneshot"), "139_17": ("knockdown & recovery", "Get up from the ground", "oneshot"),
 "139_18": ("knockdown & recovery", "Get up from lying on your back", "oneshot"), "140_01": ("knockdown & recovery", "Get up from face down", "oneshot"),
 "140_02": ("knockdown & recovery", "Get up from face down", "oneshot"), "140_03": ("knockdown & recovery", "Get up from lying on your side", "oneshot"),
 "140_04": ("knockdown & recovery", "Get up from lying on your side", "oneshot"), "140_08": ("knockdown & recovery", "Get up from lying on your back", "oneshot"),
 "140_09": ("knockdown & recovery", "Get up from lying on your back", "oneshot"),
 "111_16": ("horror & creatures", "Peek out (peek-a-boo)", "loop"), "113_12": ("horror & creatures", "Peek out (peek-a-boo)", "loop"), "141_18": ("horror & creatures", "Peek out (peek-a-boo)", "loop"),
 "143_33": ("horror & creatures", "Peek out (peek-a-boo)", "loop"), "139_33": ("horror & creatures", "Sneaking", "cycle"), "139_34": ("horror & creatures", "Sneaking", "cycle"),
 "142_22": ("horror & creatures", "Sneaky creep", "cycle"), "143_41": ("horror & creatures", "Sneak", "cycle"),
}
def cut(c, mode):
    a = strikes.load(c); out = []
    if mode == "cycle": out += [("loop", m) for m in build_more.cycles(a, 2)]
    for pk in build_more.events(a, 3):
        if mode == "oneshot": m = build_more.oneshot(a, pk, maxs=4.5); k = "oneshot"
        else:
            m = strikes.window_loop(a, pk, focus=None, min_s=.7, max_s=2.6); k = "loop"
            if m is None: m = build_more.oneshot(a, pk); k = "oneshot"
        if m is not None: out.append((k, m))
    return out
def ok(m, kind, cat):
    m.pop("_raw", None); q = strikes.quality(m)
    if q["stretch"] > .05 or q["sink"] > 1.5 or (kind == "loop" and q["seam"] > 1.8): return None
    A = loops.arr(m); meas = truth.measure(A); loc, _ = loops.frames_local(A)
    lowest = (F - A[:, :, 1]).min(1)
    if (lowest > 12).mean() > .2 and meas["airborne"] < 4: return None
    if float(np.ptp(loc, axis=0).max(1).mean()) < (12 if "Peek" in cat else 18): return None
    return meas

# ---------- combat pistol: arms IK-locked onto a pistol, body is real motion ----------
GRIPS = {"low ready": (30, -26, 0), "two-handed aim": (54, 6, 0), "one-handed aim (right)": (58, 6, 9)}
def pistol_overlay(m, grip):
    a = loops.arr(m).copy(); N = len(a); IKF = ikclean.IKF
    fwd, up_off, side = GRIPS[grip]; props = []
    for i in range(N):
        sh = a[i, I["sh"]]; r = a[i, I["shF"]] - a[i, I["shB"]]; r[1] = 0; r /= np.linalg.norm(r) + 1e-9
        f = np.array([r[2], 0, -r[0]]); up = np.array([0, -1.0, 0])
        eye = a[i, I["hd"]] + np.array([0, 3.0, 0])
        base = eye if "aim" in grip else sh
        t = base + f * fwd + up * up_off + r * side
        targets = [("shF", "rE", "rH", t)]
        if "one-handed" not in grip: targets.append(("shB", "lE", "lH", t - r * 2.5 + np.array([0, 1.5, 0])))
        for s, e, h, tg in targets:
            S, E, H = a[i, I[s]], a[i, I[e]], a[i, I[h]]
            L1, L2 = np.linalg.norm(E - S), np.linalg.norm(H - E)
            side_sign = 1 if s == "shF" else -1
            pole = np.array([0, 1.0, 0]) * .7 + r * side_sign * .6 - f * .3
            ne, nh = IKF(tuple(S), tuple(tg), L1, L2, tuple(pole / np.linalg.norm(pole)), 165)
            a[i, I[e]] = ne; a[i, I[h]] = nh
        h = a[i, I["rH"]]; d = f if "aim" in grip else (f * .85 + np.array([0, .5, 0])); d = d / np.linalg.norm(d)
        dn = np.array([0, 1.0, 0]) - d * d[1]; dn /= np.linalg.norm(dn) + 1e-9
        top = h - dn * 6 + d * 1.5
        props.append([weapons.seg(h + dn * 3 - d * 1, top, 0, 5), weapons.seg(top - d * 3, top + d * 15, 0, 5.5)])
    return loops.unarr(a), props

def main():
    with ThreadPoolExecutor(8) as ex: list(ex.map(build_more._safe_fetch, CLIPS))
    v = json.loads(mocap.VARS_INDEX.read_text()); T = json.loads((mocap.HERE / "titles.json").read_text())
    blocked = set(json.load(open(mocap.HERE / "rejected.json"))); made = []
    def put(name, cat, title, desc, m, kind, props=None):
        if name in blocked or name in v: return
        A = loops.arr(m); weapons.save(name, desc, A, props or [[] for _ in range(len(A))], cat)
        v[name] = dict(cat=cat, how=desc, loop=kind != "oneshot", oneshot=kind == "oneshot", frames=len(A), status="active"); T[name] = title; made.append(name)
    bodies = []
    for c, (cat, title, mode) in CLIPS.items():
        if not (strikes.SRC / f"{c}.npy").exists(): continue
        k = 0
        for kind, m in cut(c, mode):
            if k >= 2: break
            m = ikclean.clean(m, lock=cat != "knockdown & recovery"); meas = ok(m, kind, title)
            if meas is None: continue
            k += 1
            put(f"cb_{c.replace('_', 'x')}_{k}", cat, title + (f" #{k}" if k > 1 else ""),
                f"{'one-shot' if kind == 'oneshot' else 'seamless loop'}, {meas['sec']}s. Recording: '{IDX[c]}' (CMU {c}). Measured: {truth.say(meas)}", m, kind)
            if mode == "cycle" or "Get up" in title or "Drop off" in title: bodies.append((c, title, m, kind))
    # pistol versions on real tactical bodies: new sneaks/get-ups + approved crouched creeps, side steps, backward walks
    extra = ["horror_136x13_1", "horror_136x15_1", "horror_139x31_1", "sidestep_1", "sidestep_10", "backward_1", "backward_3", "run_cycle", "walk_cycle", "creep"]
    for n in extra:
        try: mm, _ = mocap.load_move(n); bodies.append((n, T.get(n, n), mm, "loop"))
        except SystemExit: pass
    for src, title, m, kind in bodies:
        base = title.split(" #")[0]
        for grip in GRIPS:
            if "Get up" in base and grip != "low ready": continue
            mm, props = pistol_overlay(m, grip)
            q = strikes.quality(mm)
            if q["stretch"] > .06: continue
            put(f"pistol_{src.replace('_', 'x')}_{grip.split()[0]}_{grip.split()[-1].strip('()')}", "combat pistol",
                f"{base} with pistol, {grip}", f"real '{base}' body motion, arms IK-locked to a pistol held at {grip}", mm, kind, props)
    mocap.VARS_INDEX.write_text(json.dumps(v, indent=1)); (mocap.HERE / "titles.json").write_text(json.dumps(T, indent=1))
    import collections; print(len(made), collections.Counter(v[n]["cat"] for n in made))
if __name__ == "__main__": main()
