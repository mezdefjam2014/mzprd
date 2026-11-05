"""Conversation, confrontation and threat moves (horror-game dialogue scenes) from real CMU two-person and storytelling clips."""
import json, numpy as np, mocap, loops, strikes, ikclean, truth, build_more, build_combat
from concurrent.futures import ThreadPoolExecutor
IDX = json.load(open(mocap.HERE / "cmu_index.json"))
C, T_, A_ = "talk & conversation", "confrontation & threats", "dialogue actions"
CLIPS = {
 "18_08": (C, "Explaining with hand gestures", "loop"), "19_08": (C, "Explaining with hand gestures", "loop"),
 "18_09": (C, "Talking while walking", "oneshot"), "19_09": (C, "Talking while walking", "oneshot"),
 "18_10": (T_, "Angry quarrel (hand gestures)", "loop"), "19_10": (T_, "Angry quarrel (hand gestures)", "loop"),
 "80_48": (T_, "Arguing", "loop"), "22_18": (T_, "Stare-down, leaning in", "loop"), "23_18": (T_, "Stare-down, leaning in", "loop"),
 "22_19": (T_, "Stare-down, leaning in", "loop"), "22_20": (T_, "Pick up a stool and threaten to strike", "oneshot"),
 "23_20": (T_, "Threatened with a stool (flinch back)", "oneshot"), "22_21": (T_, "Pound the table and point (accusing)", "loop"),
 "23_21": (T_, "Pound the table and point (accusing)", "loop"), "56_02": (T_, "Angrily grab and smash against the wall", "oneshot"),
 "18_04": (A_, "Pull someone along (they resist)", "oneshot"), "19_04": (A_, "Resist being pulled", "oneshot"),
 "18_05": (A_, "Pull someone by the elbow", "oneshot"), "19_05": (A_, "Resist being pulled by the elbow", "oneshot"),
 "22_12": (A_, "Stumble into someone", "oneshot"), "22_10": (A_, "Shield someone from harm", "oneshot"), "23_11": (A_, "Shield someone from harm", "oneshot"),
 "22_03": (A_, "Kneel and comfort someone", "oneshot"), "23_03": (A_, "Sit with face in hands (despair)", "loop"),
 "22_04": (A_, "Hand on someone's shoulder", "oneshot"), "80_45": (A_, "Crying", "loop"), "80_46": (A_, "Crying", "loop"),
 "141_20": (C, "Waiting (impatient)", "loop"), "141_21": (C, "Shrug", "loop"), "141_27": (C, "Mope", "loop"), "18_01": (A_, "Walk up and shake hands", "oneshot"),
}
for i in range(11, 31): CLIPS[f"138_{i}"] = (C, "Telling a story (gesturing)", "loop")
def ok(m, kind, title):
    m.pop("_raw", None); q = strikes.quality(m)
    if q["stretch"] > .05 or q["sink"] > 1.5 or (kind == "loop" and q["seam"] > 1.8): return None
    A = loops.arr(m); meas = truth.measure(A); loc, _ = loops.frames_local(A)
    if float(np.ptp(loc, axis=0).max(1).mean()) < 8: return None          # talking is smaller motion, but must visibly move
    return meas
def main():
    with ThreadPoolExecutor(8) as ex: list(ex.map(build_more._safe_fetch, CLIPS))
    v = json.loads(mocap.VARS_INDEX.read_text()); T = json.loads((mocap.HERE / "titles.json").read_text())
    blocked = set(json.load(open(mocap.HERE / "rejected.json"))); made = []; story = 0
    for c, (cat, title, mode) in CLIPS.items():
        if not (strikes.SRC / f"{c}.npy").exists(): print("missing", c); continue
        k = 0; cap = 1 if c.startswith("138") else 2
        if c.startswith("138") and story >= 12: continue
        for kind, m in build_combat.cut(c, mode):
            if k >= cap: break
            m = ikclean.clean(m, lock=True); meas = ok(m, kind, title)
            if meas is None: continue
            k += 1; name = f"talk_{c.replace('_', 'x')}_{k}"
            if name in blocked or name in v: continue
            A = loops.arr(m); mocap.save_move(name, f"{'one-shot' if kind == 'oneshot' else 'seamless loop'}, {meas['sec']}s. Recording: '{IDX[c]}' (CMU {c}). Measured: {truth.say(meas)}", m, cat=cat, variation=True) if False else None
            import weapons; weapons.save(name, f"{'one-shot' if kind == 'oneshot' else 'seamless loop'}, {meas['sec']}s. Recording: '{IDX[c]}' (CMU {c}). Measured: {truth.say(meas)}", A, [[] for _ in range(len(A))], cat)
            v[name] = dict(cat=cat, how=IDX[c], loop=kind != "oneshot", oneshot=kind == "oneshot", frames=len(A), status="active"); T[name] = title + (f" #{k}" if k > 1 else ""); made.append(name)
            if c.startswith("138"): story += 1
    mocap.VARS_INDEX.write_text(json.dumps(v, indent=1)); (mocap.HERE / "titles.json").write_text(json.dumps(T, indent=1))
    import collections; print(len(made), collections.Counter(v[n]["cat"] for n in made)); print(made)
if __name__ == "__main__": main()
