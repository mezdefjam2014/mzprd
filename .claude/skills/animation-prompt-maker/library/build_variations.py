"""Make new animations from the real moves. Originals are never changed.
   python3 build_variations.py            -> (re)builds every recipe into variations/ and variations.json
   Suspend / restore one:  python3 mocap.py suspend <name>  |  python3 mocap.py restore <name>"""
import json, mocap, numpy as np
from concurrent.futures import ThreadPoolExecutor
EXTRA = {  # extra real source moves (become normal originals)
 "block_1": "144_07", "block_2": "144_08", "block_3": "144_26", "block_4": "144_27",
 "conversation_1": "18_08", "conversation_2": "18_09", "conversation_3": "19_08", "quarrel_1": "18_10", "quarrel_2": "19_10", "argue_1": "80_48",
 "shrug_1": "111_25", "shrug_2": "141_21", "laugh_1": "13_14", "laugh_2": "14_17", "scared_1": "79_73", "scared_walk_1": "91_32", "scared_2": "142_16",
 "sad_1": "79_71", "sad_walk_1": "82_10", "attack_1": "76_01", "attack_2": "76_02", "dodge_1": "76_03", "swat_1": "76_05", "creep_1": "77_14", "creep_2": "77_29",
 "gorilla_1": "80_49", "gorilla_2": "120_02", "bear_1": "28_11", "bear_2": "29_16", "dinosaur_1": "28_19", "dinosaur_2": "29_23", "robot_1": "120_21",
 "shake_hands_1": "18_01", "phone_1": "79_36", "strike_1": "02_05", "threaten_1": "22_20",
}
import loops
def base(name):
    return mocap.load_move(name)[0]
def loop_speed(m, k):
    n = max(8, int(round(mocap.nframes(m) / k))); a = loops.arr(m); a = np.concatenate([a, a[:1]])
    src = np.linspace(0, 1, len(a)); dst = np.linspace(0, 1, n + 1)
    out = np.stack([[np.interp(dst, src, a[:, j, c]) for c in range(3)] for j in range(a.shape[1])], 0).transpose(2, 0, 1)
    return loops.unarr(out[:-1])
def loop_exag(m, k):
    w = 7; ker = np.ones(w) / w; out = {}
    for j, v in m.items():
        sm = np.stack([np.convolve(np.pad(v[:, c], w // 2, mode="wrap"), ker, "valid") for c in range(3)], 1)
        out[j] = v + (v - sm) * k
    return mocap.ground(mocap.fix_lengths(out, m))
def V(src, kind="action", focus=None, speed=None, exag=None, mirror=False, lean=None, **kw):
    def f():
        m, _ = loops.make_loop(base(src), kind, focus, **kw)
        if mirror: m = mocap.mirror(m)
        if lean: m = mocap.lean(m, lean)
        if speed: m = loop_speed(m, speed)
        if exag: m = loop_exag(m, exag)
        return m
    return f
A, C, H, K = "action", "cycle", "hands", "kick"
R = [  # (name, category, description, builder) - every one is a single move, cut to a seamless in-place loop
 # attacks
 ("punch", "attacks", "clean single punch", V("punch_1", A, H, exag=.3)),
 ("snap_jab", "attacks", "fast snappy jab", V("punch_1", A, H, speed=1.35, exag=.5)),
 ("heavy_haymaker", "attacks", "slow, heavy wind-up punch", V("strike_1", A, H, speed=.8, exag=.7)),
 ("lefty_punch", "attacks", "punch with the left hand", V("punch_1", A, H, exag=.3, mirror=True)),
 ("lunge_punch", "attacks", "stepping attack punch", V("attack_1", A, H, exag=.4)),
 ("feint_strike", "attacks", "fake then strike", V("attack_2", A, H, exag=.4)),
 ("front_kick", "attacks", "single front kick", V("kick_8", A, K, exag=.4)),
 ("snap_kick", "attacks", "fast snap kick", V("kick_8", A, K, speed=1.3, exag=.5)),
 ("left_kick", "attacks", "kick with the left leg", V("kick_8", A, K, exag=.4, mirror=True)),
 ("jump_kick", "attacks", "jump kick, in place", V("jump_kick_2", A, K, max_s=2.2)),
 ("jump_kick_left", "attacks", "jump kick, mirrored", V("jump_kick_2", A, K, max_s=2.2, mirror=True)),
 ("spin_kick", "attacks", "jumping spin kick", V("spin_kick_2", A, K, max_s=2.2)),
 ("sword_slash", "attacks", "single sword slash", V("swordplay_1", A, H, exag=.4)),
 ("sword_heavy", "attacks", "slow heavy sword swing", V("swordplay_2", A, H, speed=.8, exag=.6)),
 ("overhead_smash", "attacks", "raise and smash overhead", V("threaten_1", A, H, exag=.5)),
 # blocking
 ("block_left", "blocking", "block on the left side", V("block_1", A, H, exag=.3)),
 ("block_right", "blocking", "block on the right side", V("block_3", A, H, exag=.3)),
 ("block_fast", "blocking", "quick reflex block", V("block_2", A, H, speed=1.3, exag=.4)),
 ("block_heavy", "blocking", "braced heavy block", V("block_4", A, H, speed=.85, exag=.4)),
 ("dodge", "blocking", "dodge out of the way", V("dodge_1", A, None, exag=.3)),
 ("duck", "blocking", "duck under an attack", V("duck_1", A, None, exag=.3)),
 # waves
 ("wave", "waves", "friendly wave", V("wave_1", A, H)),
 ("big_wave", "waves", "big, exaggerated wave", V("wave_1", A, H, exag=.8)),
 ("excited_wave", "waves", "fast excited wave", V("wave_2", A, H, speed=1.4, exag=.5)),
 ("tired_wave", "waves", "slow, slumped wave", V("wave_1", A, H, speed=.75, exag=-.3, lean=10)),
 ("left_hand_wave", "waves", "wave with the left hand", V("wave_1", A, H, mirror=True)),
 ("signal_wave", "waves", "directing-traffic wave", V("wave_3", A, H, exag=.3)),
 # zombies (gait cycles)
 ("zombie_walk", "zombies", "zombie walk cycle", V("zombie_3", C)),
 ("zombie_hunched", "zombies", "hunched zombie walk", V("zombie_3", C, lean=22)),
 ("zombie_heavy", "zombies", "slow, heavy zombie walk", V("zombie_4", C, speed=.7, exag=.4)),
 ("zombie_march", "zombies", "zombie march cycle", V("zombie_1", C)),
 ("zombie_mirrored", "zombies", "zombie walk, mirrored", V("zombie_4", C, mirror=True)),
 ("zombie_lurch", "zombies", "lurching zombie", V("zombie_6", C, exag=.6, lean=12)),
 ("drunk_shamble", "zombies", "drunken shamble cycle", V("drunk_1", C, exag=.3)),
 ("limp_walk", "zombies", "limping walk cycle", V("limp_1", C)),
 # monsters
 ("ape_walk", "monsters", "ape knuckle walk", V("gorilla_1", C, lean=12, exag=.3)),
 ("ape_rage", "monsters", "ape chest-beat / rage", V("gorilla_2", A, H, exag=.6)),
 ("monster_stalk", "monsters", "slow hunched monster stalk", V("zombie_3", C, speed=.75, exag=.5, lean=25)),
 ("beast_charge", "monsters", "hunched charging run", V("run_1", C, min_s=.45, max_s=1.0, lean=25, exag=.3)),
 ("dino_walk", "monsters", "dinosaur stalk", V("dinosaur_1", C, lean=15, exag=.4)),
 ("dino_snap", "monsters", "dinosaur lunge", V("dinosaur_2", A, None, exag=.6)),
 ("robot_move", "monsters", "robotic motion", V("robot_1", A, H, speed=1.2, exag=.5)),
 ("giant_stomp", "monsters", "slow, heavy giant stomp", V("walk_1", C, speed=.65, exag=.7, lean=8)),
 ("monster_rage", "monsters", "hunched rage", V("quarrel_1", A, H, exag=.9, lean=20)),
 # boxing
 ("boxing_combo", "boxing", "boxing combo", V("boxing_1", A, H, exag=.3)),
 ("boxing_fast", "boxing", "fast combo", V("boxing_2", A, H, speed=1.35, exag=.4)),
 ("southpaw", "boxing", "left-handed boxing", V("boxing_1", A, H, exag=.3, mirror=True)),
 ("heavyweight", "boxing", "slow heavy punches", V("boxing_3", A, H, speed=.8, exag=.6)),
 ("boxing_bounce", "boxing", "boxer bounce and jab", V("boxing_4", A, H, exag=.3)),
 ("boxing_hook", "boxing", "hooks", V("boxing_5", A, H, exag=.4)),
 # social
 ("talking", "social", "explaining with gestures", V("conversation_1", A, H, max_s=3)),
 ("animated_talker", "social", "big expressive gestures", V("conversation_1", A, H, max_s=3, exag=.7)),
 ("calm_talker", "social", "calm, small gestures", V("conversation_3", A, H, max_s=3, speed=.85, exag=-.4)),
 ("arguing", "social", "angry argument", V("quarrel_2", A, H, max_s=3, exag=.5)),
 ("heated_argument", "social", "fast, heated argument", V("argue_1", A, H, max_s=3, speed=1.2, exag=.6)),
 ("shrug", "social", "shrug", V("shrug_1", A, H)),
 ("big_shrug", "social", "big exaggerated shrug", V("shrug_2", A, H, exag=.8)),
 ("laugh", "social", "laughing", V("laugh_1", A, None, max_s=3)),
 ("big_laugh", "social", "doubled-over laugh", V("laugh_2", A, None, max_s=3, exag=.6)),
 ("phone_call", "social", "answering the phone", V("phone_1", A, H, max_s=3)),
 # emotions / movement
 ("scared", "emotions", "scared flinch", V("scared_1", A, None, exag=.4)),
 ("scared_walk", "emotions", "scared, hunched walk", V("walk_2", C, speed=.85, lean=18, exag=-.2)),
 ("sad_walk", "emotions", "sad walk cycle", V("sad_walk_1", C, lean=12)),
 ("proud_walk", "emotions", "proud walk cycle", V("walk_4", C, lean=-8)),
 ("sneak", "emotions", "sneaking cycle", V("sneak_1", C)),
 ("creep", "emotions", "creeping cycle", V("creep_1", C)),
 ("run_cycle", "emotions", "run cycle", V("run_1", C, min_s=.45, max_s=1.0)),
 ("walk_cycle", "emotions", "walk cycle", V("walk_1", C)),
]

def fetch_extra():
    have = mocap._saved()
    todo = [(n, c) for n, c in EXTRA.items() if n not in have]
    with ThreadPoolExecutor(8) as ex: list(ex.map(lambda j: mocap.fetch(j[1], j[0]), todo))

def main():
    import gzip, shutil
    fetch_extra()
    if mocap.VARS.exists(): shutil.rmtree(mocap.VARS)
    mocap.VARS.mkdir()
    old = json.loads(mocap.VARS_INDEX.read_text()) if mocap.VARS_INDEX.exists() else {}
    idx, bad, rep = {}, [], []
    def one(r):
        name, cat, how, fn = r
        try:
            m = fn(); q = loops.seam_quality(m); st = loops.strength(loops.arr(m))
            a = loops.arr(m)
            doc = dict(name=name, source="variation", desc=how, cat=cat, loop=True, fps=mocap.FPS, joints=mocap.PTS, frames=np.round(a).astype(int).tolist())
            with gzip.open(mocap.VARS / f"{name}.json.gz", "wt") as fh: json.dump(doc, fh, separators=(",", ":"))
            return name, cat, how, q, st, len(a), None
        except Exception as e:
            return name, cat, how, 0, 0, 0, repr(e)
    with ThreadPoolExecutor(8) as ex:
        for name, cat, how, q, st, n, err in ex.map(one, R):
            if err: bad.append((name, err)); continue
            idx[name] = dict(cat=cat, how=how, loop=True, frames=n, seam=round(q, 2), status=old.get(name, {}).get("status", "active"))
            rep.append((name, n, q, st))
    mocap.VARS_INDEX.write_text(json.dumps(idx, indent=1))
    for name, n, q, st in sorted(rep, key=lambda x: -x[2]): print(f"{name:18s} {n/30:4.1f}s  seam {q:4.2f}  power {st:5.1f}")
    print(len(idx), "loops built | failed:", bad)

if __name__ == "__main__": main()
