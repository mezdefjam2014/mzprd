"""New moves from never-used CMU clips: horror/creatures, climbing/parkour, fights/interactions."""
import json, gzip, glob, os, re, math, numpy as np, mocap, loops, strikes, ikclean, weapons, truth, build_more
from concurrent.futures import ThreadPoolExecutor
P = mocap.PTS; I = {k: i for i, k in enumerate(P)}; F = mocap.FLOOR
IDX = json.load(open(mocap.HERE / "cmu_index.json"))
THEMES = {
 "horror": (["zombie", "monster", "creep", "drag", "limp", "hurt", "injur", "wounded", "stagger", "drunk", "scared", "fear", "dinosaur", "gorilla", "bear", "spider", "snake", "frog", "dragon", "animal", "monkey", "dog", "cat", "mouse", "chicken", "elephant", "prairie", "penguin", "crab", "squirrel"], ["dance", "chicken dance", "dancing", "vacation"]),
 "climbing": (["ladder", "climb", "steps", "high jump", "forward jump", "leap", "vault", "hurdle", "jump over", "step over", "balance beam"], ["playground - climb, sit"]),
 "everyday": (["drink", "eat", "phone", "wash", "sweep", "mop", "wipe", "open", "close", "door", "window", "pick up", "carry", "lift", "sit", "chair", "lie", "sleep", "read", "write", "type", "cook", "scoop", "plant", "dig", "rake", "shovel", "paint", "put on", "take off", "tie", "brush"], ["dance"]),
 "sports": (["basketball", "soccer", "football", "golf", "tennis", "volleyball", "bowling", "frisbee", "dribble", "shoot", "bow and arrow", "throw", "catch", "skip", "jumping jacks", "squat", "stretch", "exercise", "jog", "run", "sprint", "race"], ["dance"]),
 "dance": (["dance", "salsa", "waltz", "ballet", "jive", "twist", "breakdance", "hip hop", "charleston", "pirouette", "jete", "arabesque", "cha-cha", "tango", "disco"], []),
 "emotions": (["laugh", "cry", "yawn", "shrug", "wave", "point", "clap", "cheer", "celebrate", "angry", "frustrat", "nervous", "surprise", "startle", "bow", "salute", "victory", "sad", "happy", "excited", "tired", "bored", "impatient", "think"], ["dance"]),
 "walks": (["walk", "march", "strut", "stroll", "stride", "swagger", "tiptoe", "stomp", "shuffle", "hurry", "wander", "pace", "trudge"], ["dance", "walk on uneven", "playground"]),
 "fights": (["violence", "fight", "quarrel", "threat", "grab", "shove", "push", "angry", "frustrat", "scramble", "argue", "pull", "slap", "pound"], ["push heavy", "pushing a swing", "push off", "pushing broom", "pull up"]),
}
CATS = {"horror": "horror & creatures", "climbing": "climbing & parkour", "fights": "fights & interactions", "everyday": "everyday actions", "sports": "sports & exercise", "dance": "dance", "emotions": "emotions & reactions", "walks": "character walks"}
def used_clips():
    u = set(os.path.basename(p)[:-4] for p in glob.glob(str(strikes.SRC / "*.npy")))
    for p in mocap.MOVES.glob("*.json.gz"):
        try:
            m = re.search(r"(\d+_\d+)", json.load(gzip.open(p, "rt")).get("source", ""))
            if m: u.add(m.group(1))
        except Exception: pass
    return u
def theme_clips(th, used):
    inc, exc = THEMES[th]
    return [c for c, d in IDX.items() if c not in used and any(w in d.lower() for w in inc) and not any(x in d.lower() for x in exc)]

def short(desc):
    d = re.sub(r"\(.*?\)", "", desc).strip(" -,"); return d[:48]
def ladder_props(m, rails_x=None):
    """a static ladder in front of the climber so the hands have something to hold"""
    hx = float(np.median(np.r_[m["rH"][:, 0], m["lH"][:, 0]])) + 2 if rails_x is None else rails_x
    top = float(min(m["rH"][:, 1].min(), m["lH"][:, 1].min())) - 20
    segs = [weapons.seg((hx, F, -13), (hx, top, -13), 2, 3), weapons.seg((hx, F, 13), (hx, top, 13), 2, 3)]
    y = F - 25
    while y > top: segs.append(weapons.seg((hx, y, -13), (hx, y, 13), 2, 2.5)); y -= 25
    return [segs for _ in range(len(m["hip"]))]

def extract(c, th):
    a = strikes.load(c); out = []
    loc, _ = loops.frames_local(a); act = loops.activity(loc, 15)
    if act.max() < 2: return out
    desc = IDX[c].lower()
    # locomotion-like clips (creature walks, limps, drunk, crawl...) -> gait cycles; everything else -> moves cut calm-to-calm
    cyc = (th == "walks") or th == "horror" and any(w in desc for w in ["walk", "limp", "crawl", "drag", "stagger", "drunk", "creep", "monkey", "bear", "elephant", "dinosaur", "gorilla", "dog", "cat", "snake", "frog", "mouse", "spider", "penguin", "crab", "chicken", "prairie", "squirrel", "animal"])
    if cyc:
        for m in build_more.cycles(a, 3): out.append(("loop", m))
    for pk in build_more.events(a, 3):
        if th == "climbing" and ("ladder" in desc or "climb" in desc):
            m = build_more.oneshot(a, pk, maxs=4.0); kind = "oneshot"
        else:
            m = strikes.window_loop(a, pk, focus=None, min_s=.8, max_s=3.0); kind = "loop"
            if m is None: m = build_more.oneshot(a, pk); kind = "oneshot"
        if m is not None: out.append((kind, m))
    return out

def good(m, th, kind):
    raw = m.pop("_raw", None)
    q = strikes.quality(m)
    if q["stretch"] > .05 or q["sink"] > 1.5 or (kind == "loop" and q["seam"] > 1.8) or q["power"] < 2.5: return None
    a = loops.arr(m); meas = truth.measure(a)
    lowest = (F - a[:, :, 1]).min(1)
    if (lowest > 12).mean() > .2 and meas["airborne"] < 4: return None          # standing/hanging on something that isn't drawn
    loc, _ = loops.frames_local(a); body = float(np.ptp(loc, axis=0).max(1).mean())
    legs = meas["step_side"] + meas["step_fwd"]
    whole = legs > 45 or meas["head_drop"] > 25 or meas["airborne"] > 3 or meas["lying"]
    if body < 20 or not (whole or (th in ("everyday", "emotions", "dance") and body > 30)): return None
    return meas

def main(themes=("horror", "climbing", "fights"), per_theme=60):
    used = used_clips(); v = json.loads(mocap.VARS_INDEX.read_text()); blocked = set(json.load(open(mocap.HERE / "rejected.json")))
    titles = json.loads((mocap.HERE / "titles.json").read_text()); made = []
    for th in themes:
        cl = theme_clips(th, used)
        with ThreadPoolExecutor(8) as ex: list(ex.map(build_more._safe_fetch, cl))
        n = 0; seen_poses = []
        for c in cl:
            if n >= per_theme: break
            if not (strikes.SRC / f"{c}.npy").exists(): continue
            k = 0
            for kind, m in extract(c, th):
                if n >= per_theme or k >= 2: break
                m = ikclean.clean(m, lock=not (th == "climbing"))
                meas = good(m, th, kind)
                if meas is None: continue
                feat = loops.frames_local(loops.arr(m))[0][::5].mean(0)
                if any(np.linalg.norm(feat - f, axis=1).mean() < 5 for f in seen_poses): continue
                seen_poses.append(feat); k += 1; n += 1
                name = f"{th}_{c.replace('_', 'x')}_{k}"
                if name in blocked or name in v: continue
                props = ladder_props(m) if (th == "climbing" and ("ladder" in IDX[c].lower() or "climb" in IDX[c].lower()) and meas["hands_high"] > .2) else None
                really = truth.say(meas)
                title = f"{short(IDX[c]).capitalize()}" + (f" #{k}" if k > 1 else "")
                desc = f"{'one-shot' if kind == 'oneshot' else 'seamless loop'}, {meas['sec']}s. Recording: '{IDX[c]}' (CMU {c}). Measured: {really}"
                a = loops.arr(m); weapons.save(name, desc, a, props if props else [[] for _ in range(len(a))], CATS[th])
                v[name] = dict(cat=CATS[th], how=desc, loop=kind != "oneshot", oneshot=kind == "oneshot", frames=len(a), status="active")
                titles[name] = title; made.append(name)
        print(f"{th}: {n} new moves from {len(cl)} unused clips")
    mocap.VARS_INDEX.write_text(json.dumps(v, indent=1)); (mocap.HERE / "titles.json").write_text(json.dumps(titles, indent=1))
    print(len(made), "made")
if __name__ == "__main__": main()
