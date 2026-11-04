"""Build the boxing / knife / weapon-swing loop set from real strikes. python3 build_strikes.py"""
import json, gzip, numpy as np, mocap, loops, strikes, weapons, weapons2
from weapons import save
P = mocap.PTS; I = {k: i for i, k in enumerate(P)}

def candidates(clips, finder=strikes.find_strikes, classify=strikes.classify, **kw):
    out = []
    box = kw.pop("boxing", True)
    for c in clips:
        a = strikes.load(c); ss, loc = finder(a, **kw)
        for s in ss:
            n = classify(loc, s)
            if not n: continue
            m = strikes.window_loop(a, s["peak"], guard=box) if box else strikes.window_loop(a, s["peak"], min_s=.7, max_s=1.6)
            if m is None: continue
            q = strikes.quality(m)
            if q["ok"] and box and strikes.boxing_ok(m, s["hand"]): continue
            if q["ok"]: out.append(dict(span=(s["peak"] - 45, s["peak"] + 45), clip=c, name=n, m=m, q=q, s=s, impact_pose=loops.frames_local(loops.arr(m))[0][min(len(m["hip"]) - 1, s["impact"] - s["peak"] + 6)]))
    return out

USED = []
def pick(cands, kind, n, per_clip=2, reuse=False):
    """strongest clean examples of a kind, spread across actors, no near-duplicates, no recorded moment used twice"""
    pool = sorted([c for c in cands if c["name"] == kind], key=lambda c: -c["q"]["power"])
    pool = [c for c in pool if reuse or not any(u[0] == c["clip"] and abs(u[1] - c["span"][0]) < 60 for u in USED)]
    got, by_clip = [], {}
    for c in pool:
        if by_clip.get(c["clip"], 0) >= per_clip: continue
        if any(np.linalg.norm(c["impact_pose"] - g["impact_pose"], axis=1).mean() < 6 for g in got): continue
        if any(g["clip"] == c["clip"] and abs(g["span"][0] - c["span"][0]) < 60 for g in got): continue   # same recorded moment
        got.append(c); by_clip[c["clip"]] = by_clip.get(c["clip"], 0) + 1
        if len(got) == n: break
    if not reuse: USED.extend((g["clip"], g["span"][0]) for g in got)
    return got

LABEL = {"jab": "jab (lead straight)", "cross": "cross (rear straight)", "lead_hook": "lead hook", "rear_hook": "rear hook",
         "lead_uppercut": "lead uppercut", "rear_uppercut": "rear uppercut", "jab_body": "jab to the body", "cross_body": "cross to the body",
         "lead_hook_body": "lead hook to the body", "rear_hook_body": "rear hook to the body"}
def knife_props(m, grip):
    pts = lambda i: {k: m[k][i] for k in P}
    return [weapons2.knife(pts(i), {"grip": grip}, {"grip": grip}, 0, False) for i in range(len(m["hip"]))]

def main():
    blocked = set(json.load(open(mocap.HERE / "rejected.json")))
    v = json.loads(mocap.VARS_INDEX.read_text()); made = []
    def put(name, cat, desc, m, props=None):
        if name in blocked: return
        a = loops.arr(m); save(name, desc, a, props if props is not None else [[] for _ in range(len(a))], cat)
        v[name] = dict(cat=cat, how=desc, loop=True, frames=len(a), status=v.get(name, {}).get("status", "active")); made.append(name)
    C = candidates(strikes.BOX)
    print("clean candidates:", len(C))
    # ---- boxing: the six numbered punches + body shots, several real takes each ----
    plan = {"jab": 6, "cross": 6, "lead_hook": 5, "rear_hook": 5, "lead_uppercut": 5, "rear_uppercut": 5,
            "jab_body": 3, "cross_body": 3, "lead_hook_body": 4, "rear_hook_body": 4}
    chosen = {}
    for kind, n in plan.items():
        chosen[kind] = pick(C, kind, n)
        for k, c in enumerate(chosen[kind], 1):
            put(f"box_{kind}_{k}", "boxing", f"{LABEL[kind]}, real boxer take {k} (CMU {c['clip']})", c["m"])
    # ---- combinations (real shadowboxing chains) ----
    allc = []
    for c in strikes.BOX: allc += strikes.combos(c)
    allc.sort(key=lambda c: -c["q"]["power"]); seen = {}
    for c in allc:
        if any(u[0] == c["clip"] and abs(u[1] - c["start"]) < 60 for u in USED): continue
        if seen.get(c["label"], 0) >= 2: continue
        seen[c["label"]] = seen.get(c["label"], 0) + 1; USED.append((c["clip"], c["start"]))
        put(f"box_combo_{c['label'].replace('-', '_')}_{seen[c['label']]}", "boxing", f"combination {c['label']} (1 jab, 2 cross, 3 lead hook, 4 rear hook, 5/6 uppercuts, b = body), real boxer (CMU {c['clip']})", c["m"])
    # ---- knife combinations from the same real chains (knife in the right hand) ----
    kc = 0
    for c in allc:
        lab = c["label"]
        if kc >= 8: break
        if not set(lab.replace("b", "").split("-")) <= {"1", "2", "3", "4"}: continue
        kind = "thrusts" if set(lab.replace("b", "").split("-")) <= {"1", "2"} else "slashes"
        kc += 1; m = c["m"]
        put(f"knife_combo_{kind}_{kc}", "knife", f"knife combination ({kind}), from real punches {lab} (CMU {c['clip']})", m, knife_props(m, "forward"))
    # ---- stance / footwork idles ----
    k = 0
    for c in strikes.BOX:
        r = strikes.idles(c)
        if r and k < 4: k += 1; put(f"box_guard_bounce_{k}", "boxing", f"boxer's guard, bouncing on the toes, no punches (CMU {c})", r[0])
    # ---- southpaw (left-handed stance) versions of the best single punches ----
    for kind in ("jab", "cross", "lead_hook", "rear_hook", "lead_uppercut", "rear_uppercut"):
        if chosen.get(kind): put(f"box_southpaw_{kind}", "boxing", f"southpaw {LABEL[kind]} (mirrored real take)", mocap.mirror(chosen[kind][0]["m"]))
    # ---- knife: real punch mechanics with a blade (thrust = straight punch, slash = hook, rising stab = uppercut) ----
    for kind, nm, grip, n, desc in [("cross", "knife_thrust", "forward", 3, "forward-grip thrust (rear hand, driven like a cross)"),
                                   ("jab", "knife_jab_thrust", "forward", 3, "quick lead-hand thrust (driven like a jab)"),
                                   ("rear_hook", "knife_slash", "forward", 3, "forward-grip horizontal slash (angle 1, driven like a hook)"),
                                   ("lead_hook", "knife_backhand_slash", "forward", 2, "lead-side slash (angle 2)"),
                                   ("rear_uppercut", "knife_rising_stab", "forward", 2, "rising stab under the ribs"),
                                   ("rear_hook_body", "knife_body_slash", "forward", 2, "low slash to the body"),
                                   ("rear_hook", "knife_reverse_slash", "reverse", 3, "reverse-grip (ice-pick) hooking slash, close range"),
                                   ("cross_body", "knife_reverse_stab", "reverse", 2, "reverse-grip punch-stab to the body")]:
        for k, c in enumerate(pick(C, kind, n, per_clip=1, reuse=True), 1):
            rh = c["s"]["hand"] == "R"; m = c["m"] if rh else mocap.mirror(c["m"])     # knife always in the right hand
            put(f"{nm}_{k}", "knife", f"{desc}, from a real strike (CMU {c['clip']})", m, knife_props(m, grip))
    # ---- weapon swings from real sword / chopping / bat / hammer / overhead-smash sessions ----
    def swing_class(loc, s):
        if s["hand"] != "R": return None
        H = I["rH"]; j = s["impact"]; i0 = max(0, j - 8); path = loc[j, H] - loc[i0, H]
        if -path[1] > 18: return "down"
        if abs(path[2]) > 15 and abs(path[2]) >= abs(path[1]): return "side"
        if path[1] > 15: return "up"
        if path[0] > 15: return "thrust"
        return None
    W = candidates(strikes.SWING, classify=swing_class, min_speed=3.0, boxing=False)
    print("clean swing candidates:", len(W))
    groups = {"02_": "sword", "22_": "smash", "23_": "smash", "79_01": "axe", "80_71": "axe", "124_": "bat", "62_": "hammer"}
    def grp(c): return next(g for k, g in groups.items() if c.startswith(k))
    for g, prop, nm, kinds, n in [("sword", "sword", "sword", ("down", "side", "up", "thrust"), 3), ("sword", "machete", "machete", ("down", "side"), 3),
                                  ("axe", "axe", "axe", ("down", "side"), 4), ("smash", "bat", "overhead_smash", ("down",), 3),
                                  ("bat", "bat", "bat_swing", ("side", "down", "up"), 3), ("hammer", "hammer", "hammer", ("down",), 3)]:
        pool = [c for c in W if grp(c["clip"]) == g]
        for kind in kinds:
            for k, c in enumerate(pick(pool, kind, n, per_clip=2), 1):
                m = c["m"]; shp = "sword" if prop == "machete" else prop
                props = weapons.props_for(m, shp) if prop != "machete" else [weapons.prop_long({x: m[x][i] for x in P}, 42, 0, two_hand=False) for i in range(len(m["hip"]))]
                desc = {"down": "downward chop", "side": "horizontal swing", "up": "rising swing", "thrust": "thrust"}[kind]
                put(f"{nm}_{kind}_{k}", "weapon swings", f"{nm.replace('_', ' ')}: {desc}, real take (CMU {c['clip']})", m, props)
    # ---- left-handed knife (mirror of the best right-handed ones) ----
    for n in [x for x in made if x.startswith("knife_") and x.endswith("_1")][:6]:
        doc = json.load(gzip.open(mocap.VARS / f"{n}.json.gz", "rt"))
        f, p = weapons.mirror_frames(np.array(doc["frames"], float), doc["g"])
        if f"{n[:-2]}_left_hand" not in blocked:
            save(f"{n[:-2]}_left_hand", "left-handed " + doc["desc"], f, p, "knife"); v[f"{n[:-2]}_left_hand"] = dict(cat="knife", how="left-handed " + doc["desc"], loop=True, frames=len(f), status="active"); made.append(f"{n[:-2]}_left_hand")
    # ---- bat: overhead smashes from real two-handed chops/smashes, and left-handed swings ----
    for k, c in enumerate(pick([c for c in W if grp(c["clip"]) in ("axe", "smash")], "down", 4, per_clip=2, reuse=True), 1):
        put(f"bat_overhead_smash_{k}", "weapon swings", f"bat: two-handed overhead smash, real take (CMU {c['clip']})", c["m"], weapons.props_for(c["m"], "bat"))
    for n in [x for x in made if x.startswith("bat_swing_")]:
        doc = json.load(gzip.open(mocap.VARS / f"{n}.json.gz", "rt")); f, p = weapons.mirror_frames(np.array(doc["frames"], float), doc["g"])
        save(n + "_lefty", "left-handed " + doc["desc"], f, p, "weapon swings"); v[n + "_lefty"] = dict(cat="weapon swings", how="left-handed " + doc["desc"], loop=True, frames=len(f), status="active"); made.append(n + "_lefty")
    mocap.VARS_INDEX.write_text(json.dumps(v, indent=1))
    print(len(made), "loops made")
    import collections; print(collections.Counter(v[n]["cat"] for n in made))
if __name__ == "__main__": main()
