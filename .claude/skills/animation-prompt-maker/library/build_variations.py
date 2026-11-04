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
def W(spec, maxs=5.0):
    m = mocap.load_spec(spec)
    return m if "@" in spec else mocap.auto_window(m, maxs)
def cut(m, n): return {k: v[:n] for k, v in m.items()}
E = mocap.exaggerate; S = mocap.speed; M = mocap.mirror; U = mocap.upper_from; C = mocap.chain; B = mocap.mix; LN = mocap.lean
R = [  # (name, category, how it was made, builder)
 # ---------- attacks ----------
 ("snap_jab", "attacks", "punch_1, 1.4x speed, exaggerated", lambda: E(S(W("punch_1"), 1.4), .5)),
 ("heavy_haymaker", "attacks", "punch_1, slowed, big exaggeration", lambda: E(S(W("punch_1"), .75), .8)),
 ("lefty_punch", "attacks", "punch_1 mirrored", lambda: M(W("punch_1"))),
 ("walking_punch", "attacks", "walk_1 legs + punch_1 arms", lambda: U(W("walk_1"), W("punch_1"))),
 ("charging_punch", "attacks", "run_1 legs + strike_1 arms", lambda: U(W("run_1", 3), W("strike_1"))),
 ("snap_kick", "attacks", "kick_8, faster and snappier", lambda: E(S(W("kick_8"), 1.3), .5)),
 ("left_kick", "attacks", "kick_8 mirrored", lambda: M(W("kick_8"))),
 ("slowmo_jump_kick", "attacks", "jump_kick_2 at half speed", lambda: S(W("jump_kick_2@1.2-3.8"), .5)),
 ("mirrored_jump_kick", "attacks", "jump_kick_2 mirrored", lambda: M(W("jump_kick_2@1.2-3.8"))),
 ("sword_heavy", "attacks", "swordplay_1 slowed, exaggerated", lambda: E(S(W("swordplay_1"), .8), .6)),
 ("sword_lefty", "attacks", "swordplay_1 mirrored", lambda: M(W("swordplay_1"))),
 ("feint_and_strike", "attacks", "attack_2, snappier", lambda: E(W("attack_2"), .4)),
 ("punch_then_kick", "attacks", "punch_1 then kick_8", lambda: C(W("punch_1", 2), W("kick_8"))),
 ("overhead_threat", "attacks", "threaten_1, exaggerated", lambda: E(W("threaten_1"), .5)),
 # ---------- blocking ----------
 ("block_left_fast", "blocking", "block_1, 1.3x speed", lambda: S(W("block_1"), 1.3)),
 ("block_right_heavy", "blocking", "block_3, slowed and braced", lambda: E(S(W("block_3"), .8), .4)),
 ("block_mirrored", "blocking", "block_1 mirrored", lambda: M(W("block_1"))),
 ("retreating_block", "blocking", "walk_backward_1 legs + block_2 arms", lambda: U(W("walk_backward_1"), W("block_2"))),
 ("crouched_guard", "blocking", "walk_crouched_1 legs + boxing_1 arms", lambda: U(W("walk_crouched_1"), W("boxing_1@4.8-8.8"))),
 ("dodge_and_counter", "blocking", "dodge_1 then punch_1", lambda: C(W("dodge_1", 3), W("punch_1", 2))),
 # ---------- waves ----------
 ("big_wave", "waves", "wave_1, big exaggeration", lambda: E(W("wave_1"), .8)),
 ("left_hand_wave", "waves", "wave_1 mirrored", lambda: M(W("wave_1"))),
 ("tired_wave", "waves", "wave_1 slowed, damped, slumped", lambda: LN(E(S(W("wave_1"), .7), -.4), 12)),
 ("excited_wave", "waves", "wave_1 1.5x speed, exaggerated", lambda: E(S(W("wave_1"), 1.5), .6)),
 ("walking_wave", "waves", "walk_2 legs + wave_1 arms", lambda: U(W("walk_2"), W("wave_1"))),
 ("wave_then_hop", "waves", "wave_1 then hop_1", lambda: C(W("wave_1", 3), W("hop_1", 2.5))),
 # ---------- zombies ----------
 ("hunched_zombie", "zombies", "zombie_3 hunched forward 25 degrees", lambda: LN(W("zombie_3"), 25)),
 ("slow_heavy_zombie", "zombies", "zombie_3 at 0.6x speed, exaggerated", lambda: E(S(W("zombie_3"), .6), .5)),
 ("limping_zombie", "zombies", "limp_1 legs + zombie_3 arms", lambda: U(W("limp_1"), W("zombie_3"))),
 ("running_zombie", "zombies", "run_2 legs + zombie_4 arms, hunched", lambda: LN(U(W("run_2", 3), W("zombie_4")), 15)),
 ("drunk_zombie", "zombies", "zombie_3 blended 40% with drunk_1", lambda: B(W("zombie_3"), W("drunk_1"), .4)),
 ("zombie_lunge", "zombies", "zombie_3 then attack_1, hunched", lambda: LN(C(W("zombie_3", 3), W("attack_1", 2.5)), 15)),
 ("zombie_mirrored", "zombies", "zombie_4 mirrored", lambda: M(W("zombie_4"))),
 ("creeping_zombie", "zombies", "creep_1 legs + zombie_3 arms", lambda: U(W("creep_1"), W("zombie_3"))),
 # ---------- monsters ----------
 ("ape_monster", "monsters", "gorilla_1, hunched and exaggerated", lambda: LN(E(W("gorilla_1"), .5), 15)),
 ("charging_ape", "monsters", "run_1 legs + gorilla_2 arms, hunched", lambda: LN(U(W("run_1", 3), W("gorilla_2")), 20)),
 ("heavy_beast", "monsters", "bear_1 slowed and exaggerated", lambda: E(S(W("bear_1"), .7), .6)),
 ("dino_stomp", "monsters", "dinosaur_1, exaggerated, leaning", lambda: LN(E(W("dinosaur_1"), .7), 18)),
 ("robot_glitch", "monsters", "robot_1 1.4x speed, snappy", lambda: E(S(W("robot_1"), 1.4), .7)),
 ("monster_rage", "monsters", "quarrel_1 hunched, exaggerated", lambda: LN(E(W("quarrel_1"), .9), 20)),
 ("stalking_beast", "monsters", "creep_2 legs + gorilla_1 arms, hunched", lambda: LN(U(W("creep_2"), W("gorilla_1")), 22)),
 ("giant_walk", "monsters", "elephant_1 slowed, exaggerated", lambda: E(S(W("elephant_1"), .7), .5)),
 # ---------- boxing ----------
 ("boxing_fast", "boxing", "boxing_1 at 1.4x speed", lambda: S(W("boxing_1@4.8-8.8"), 1.4)),
 ("southpaw_boxing", "boxing", "boxing_1 mirrored", lambda: M(W("boxing_1@4.8-8.8"))),
 ("heavyweight", "boxing", "boxing_2 slowed, exaggerated", lambda: E(S(W("boxing_2"), .8), .6)),
 ("advancing_boxer", "boxing", "walk_3 legs + boxing_1 arms", lambda: U(W("walk_3"), W("boxing_1@4.8-8.8"))),
 ("retreating_boxer", "boxing", "walk_backward_2 legs + boxing_3 arms", lambda: U(W("walk_backward_2"), W("boxing_3"))),
 ("tired_boxer", "boxing", "boxing_4 slowed, damped, slumped", lambda: LN(E(S(W("boxing_4"), .7), -.4), 10)),
 # ---------- social ----------
 ("animated_talker", "social", "conversation_1, exaggerated gestures", lambda: E(W("conversation_1"), .7)),
 ("calm_talker", "social", "conversation_1 slowed and damped", lambda: E(S(W("conversation_1"), .8), -.5)),
 ("walk_and_talk", "social", "walk_1 legs + conversation_1 arms", lambda: U(W("walk_1"), W("conversation_1"))),
 ("heated_argument", "social", "quarrel_2, faster and exaggerated", lambda: E(S(W("quarrel_2"), 1.2), .6)),
 ("big_shrug", "social", "shrug_1, exaggerated", lambda: E(W("shrug_1"), .8)),
 ("big_laugh", "social", "laugh_1, exaggerated", lambda: E(W("laugh_1"), .7)),
 ("nervous_talker", "social", "conversation_3 blended 30% with scared_1", lambda: B(W("conversation_3"), W("scared_1"), .3)),
 ("phone_pacing", "social", "walk_2 legs + phone_1 arms", lambda: U(W("walk_2"), W("phone_1"))),
 ("handshake_mirrored", "social", "shake_hands_1 mirrored", lambda: M(W("shake_hands_1"))),
 # ---------- emotions / movement ----------
 ("terrified_walk", "emotions", "scared_walk_1, exaggerated, hunched", lambda: LN(E(W("scared_walk_1"), .6), 12)),
 ("sad_slow_walk", "emotions", "sad_walk_1 slowed, slumped", lambda: LN(S(W("sad_walk_1"), .75), 14)),
 ("proud_walk", "emotions", "walk_4 leaning back slightly", lambda: LN(W("walk_4"), -8)),
 ("sneak_attack", "emotions", "sneak_1 then punch_1", lambda: C(W("sneak_1", 3), W("punch_1", 2))),
 ("jog", "emotions", "walk_1 blended 40% with run_1", lambda: B(W("walk_1"), W("run_1", 3), .4)),
]

def fetch_extra():
    have = mocap._saved()
    todo = [(n, c) for n, c in EXTRA.items() if n not in have]
    with ThreadPoolExecutor(8) as ex: list(ex.map(lambda j: mocap.fetch(j[1], j[0]), todo))
    print(len(todo), "new source moves fetched")

def main():
    fetch_extra()
    mocap.VARS.mkdir(exist_ok=True)
    old = json.loads(mocap.VARS_INDEX.read_text()) if mocap.VARS_INDEX.exists() else {}
    idx, bad = {}, []
    for name, cat, how, fn in R:
        try:
            m = mocap.ground(fn())
            arr = np.stack([m[k] for k in mocap.PTS], 1)
            doc = dict(name=name, source="variation", desc=how, cat=cat, fps=mocap.FPS, joints=mocap.PTS, frames=np.round(arr).astype(int).tolist())
            import gzip
            with gzip.open(mocap.VARS / f"{name}.json.gz", "wt") as fh: json.dump(doc, fh, separators=(",", ":"))
            idx[name] = dict(cat=cat, how=how, status=old.get(name, {}).get("status", "active"))
        except Exception as e:
            bad.append((name, repr(e)))
    mocap.VARS_INDEX.write_text(json.dumps(idx, indent=1))
    print(len(idx), "variations built", "| failed:", bad)

if __name__ == "__main__": main()
