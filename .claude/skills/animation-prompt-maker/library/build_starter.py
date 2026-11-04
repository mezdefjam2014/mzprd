"""One-off: download the starter set of game moves from CMU into moves/ (re-runnable)."""
import json, re, mocap
from concurrent.futures import ThreadPoolExecutor
idx = json.load(open("cmu_index.json"))
PLAN = [  # (name prefix, words that must all appear, how many)
 ("walk", ["walk"], 12), ("walk_backward", ["walk", "backward"], 3), ("walk_crouched", ["crouched"], 3), ("sneak", ["sneak"], 4),
 ("run", ["run"], 10), ("jog", ["jog"], 3), ("jump", ["jump"], 10), ("hop", ["hop"], 3), ("jump_kick", ["jump kick"], 3),
 ("kick", ["kick"], 10), ("spin_kick", ["spin kick"], 2), ("punch", ["punch"], 6), ("boxing", ["boxing"], 6), ("swordplay", ["swordplay"], 3),
 ("fall", ["fall"], 4), ("flip", ["flip"], 5), ("cartwheel", ["cartwheel"], 3), ("roll", ["roll"], 3), ("crawl", ["crawl"], 3),
 ("climb", ["climb"], 5), ("throw", ["throw"], 5), ("zombie", ["zombie"], 6), ("drunk", ["drunk"], 3), ("limp", ["limp"], 4),
 ("duck", ["duck"], 3), ("idle", ["idle"], 2), ("sit_stand", ["stand up"], 3), ("pick_up", ["pick up"], 4), ("push", ["push"], 3),
 ("wave", ["wave"], 3), ("dance", ["dance"], 6), ("monkey", ["monkey"], 2), ("elephant", ["elephant"], 2), ("march", ["soldiers march"], 2),
 ("stretch", ["stretch"], 3), ("swing", ["swing"], 2), ("salsa", ["salsa"], 2), ("chicken_dance", ["chicken dance"], 1),
]
jobs, used = [], set()
for pre, words, n in PLAN:
    hits = [c for c, d in idx.items() if all(w in d.lower() for w in words) and c not in used][:n]
    for i, c in enumerate(hits, 1):
        used.add(c); jobs.append((c, f"{pre}_{i}"))
def go(j):
    c, name = j
    try: mocap.fetch(c, name); return name, idx[c], None
    except Exception as e: return name, idx.get(c, ""), str(e)
saved = {}
with ThreadPoolExecutor(8) as ex:
    for name, desc, err in ex.map(go, jobs):
        if err: print("FAILED", name, err)
        else: saved[name] = desc
json.dump(dict(sorted(saved.items())), open("saved.json", "w"), indent=0)
print(len(saved), "moves saved")
