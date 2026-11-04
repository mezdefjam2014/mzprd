"""Creature attacks and bites (crawler + brute), hand-animated with IK, with a visible jaw that opens and snaps shut."""
import json, math, numpy as np, mocap, weapons, weapons2, ikclean
from creatures import CRAWL, BRUTE, F
P = mocap.PTS
CH, CF = ([62, 16], [62, -16]), ([-40, 20], [-40, -20])
BH, BF = ([44, 15], [44, -15]), ([-6, 13], [-6, -13])
def limbs(H, Fe): return dict(rHand=[H[0][0], F, H[0][1]], lHand=[H[1][0], F, H[1][1]], fFoot=[Fe[0][0], F, Fe[0][1]], bFoot=[Fe[1][0], F, Fe[1][1]])
C0 = dict(CRAWL, x=0, twist=0, look=0, **limbs(CH, CF)); B0 = dict(BRUTE, x=0, twist=0, look=0, **limbs(BH, BF))

def jaw(pts, g0, g1, t, first):
    """upper jaw follows the head; lower jaw hinges open by 'jaw' (0 shut .. 1 wide)"""
    o = g0.get("jaw", 0) + (g1.get("jaw", 0) - g0.get("jaw", 0)) * t
    hd, nk = pts["hd"], pts["nk"]; r = pts["shF"] - pts["shB"]; r = r / (np.linalg.norm(r) + 1e-9)
    body_f = np.cross(r, np.array([0, -1.0, 0])); body_f /= np.linalg.norm(body_f) + 1e-9
    up_h = (hd - nk) / (np.linalg.norm(hd - nk) + 1e-9)
    snout = up_h * .45 + body_f * .9; snout /= np.linalg.norm(snout)
    down = np.cross(r, snout); down /= np.linalg.norm(down) + 1e-9
    if down[1] < 0: down = -down                                          # 'down' points toward the floor side of the head
    a = math.radians(8 + 42 * o)
    base = hd + snout * 5
    upper = base + snout * 17
    lower = base + (snout * math.cos(a) + down * math.sin(a)) * 15
    return [weapons.seg(base, upper, 1, 4), weapons.seg(base + down * 2, lower, 1, 3.5)]

def bake(keys):
    fr, props = weapons2.bake(keys, jaw, stance={})
    return ikclean.no_penetration(fr.copy()), props

def J(v): return {"jaw": v}
def S(v): return {"jaw": v, "snap": True}

def build():
    out = []
    # ---------- crawler ----------
    out.append(("crawler_lunge_bite", "Crawler: lunge forward and bite", bake([
        (0, C0, J(0)), (8, dict(C0, x=-8, hipH=38, head=-46, chest=10), J(.9)),                       # coil back, mouth opens
        (13, dict(C0, x=18, hipH=46, head=-14, chest=-4), S(.05)),                                      # lunge, jaws snap shut
        (20, dict(C0, x=14, hipH=45, head=-20), J(.15)), (34, C0, J(0))])))
    out.append(("crawler_snap_bites", "Crawler: rapid snapping bites", bake([
        (0, C0, J(0)), (5, dict(C0, x=6, head=-44), J(.8)), (8, dict(C0, x=12, head=-22), S(.05)),
        (12, dict(C0, x=4, head=-44), J(.9)), (15, dict(C0, x=13, head=-20), S(.05)),
        (19, dict(C0, x=4, head=-46), J(.9)), (22, dict(C0, x=14, head=-18), S(.05)), (34, C0, J(0))])))
    out.append(("crawler_claw_swipe", "Crawler: rear up on one arm and claw swipe (right)", bake([
        (0, C0, J(0)), (8, dict(C0, hipH=50, chest=-6, twist=-20, rHand=[40, 40, 34], head=-44), J(.5)),
        (13, dict(C0, hipH=48, twist=24, rHand=[80, 70, -18], head=-30), dict(jaw=.7, snap=True)),
        (18, dict(C0, twist=18, rHand=[66, F, -6]), J(.3)), (32, C0, J(0))])))
    out.append(("crawler_feed", "Crawler: feeding on a downed victim (tearing bites)", bake([
        (0, dict(C0, hipH=42, head=10, chest=14), J(.2)),
        (6, dict(C0, hipH=38, head=34, chest=20, x=4), J(.9)), (10, dict(C0, hipH=36, head=46, chest=22, x=6, look=12), S(.05)),
        (16, dict(C0, hipH=40, head=24, chest=16, look=-16), J(.2)), (22, dict(C0, hipH=37, head=40, chest=22, x=6, look=14), J(.9)),
        (26, dict(C0, hipH=36, head=46, chest=22, x=6, look=-10), S(.05)), (34, dict(C0, hipH=42, head=10, chest=14), J(.2))])))
    # leap onto the target, bite on landing, stays where it lands (one-shot, root motion)
    land = dict(CRAWL, x=40, rHand=[104, F, 16], lHand=[104, F, -16], fFoot=[-6, F, 20], bFoot=[-6, F, -20])
    out.append(("crawler_pounce_bite", "Crawler: pounce and bite on landing (one-shot)", bake([
        (0, C0, J(0)), (10, dict(C0, hipH=32, x=-10, head=-40), J(.6)),
        (16, dict(CRAWL, hipH=62, x=30, head=-24, rHand=[100, 50, 16], lHand=[100, 50, -16], fFoot=[-10, 72, 20], bFoot=[-10, 72, -20]), dict(jaw=1, snap=True)),
        (22, dict(land, hipH=42, head=-10), S(.05)), (28, dict(land, hipH=40, head=-4), J(.6)), (31, dict(land, hipH=40, head=0), S(.05)), (44, dict(land, head=-30), J(0))])))
    # ---------- brute ----------
    out.append(("brute_lunge_bite", "Brute: lunge forward and bite", bake([
        (0, B0, J(0)), (9, dict(B0, x=-6, hipH=44, head=-50, chest=20), J(1)),
        (14, dict(B0, x=16, hipH=50, head=-16, chest=4, lean=76), S(.05)), (22, dict(B0, x=10, head=-24), J(.2)), (38, B0, J(0))])))
    out.append(("brute_grab_bite", "Brute: rear up, grab with both hands, bite and shake", bake([
        (0, B0, J(0)), (10, dict(B0, hipH=60, lean=40, chest=-8, head=-40, rHand=[44, -6, 34], lHand=[44, -6, -34]), J(.6)),
        (15, dict(B0, hipH=62, lean=34, chest=-4, head=-30, rHand=[58, 4, 12], lHand=[58, 4, -12]), dict(jaw=1, snap=True)),   # hands clamp shut on the victim
        (21, dict(B0, hipH=60, lean=48, chest=10, head=4, rHand=[48, 12, 10], lHand=[48, 12, -10], x=4), S(.05)),             # pulls in and bites
        (25, dict(B0, hipH=60, lean=48, chest=10, head=8, look=20, rHand=[48, 12, 10], lHand=[48, 12, -10], x=4), J(.05)),     # tearing shake
        (29, dict(B0, hipH=60, lean=48, chest=10, head=8, look=-20, rHand=[48, 12, 10], lHand=[48, 12, -10], x=4), J(.05)),
        (33, dict(B0, hipH=60, lean=48, chest=10, head=6, look=14, rHand=[48, 12, 10], lHand=[48, 12, -10], x=4), J(.05)),
        (40, dict(B0, hipH=54, lean=66), J(.3)), (54, B0, J(0))])))
    out.append(("brute_bite_tear", "Brute: bite down and tear (head shakes)", bake([
        (0, B0, J(0)), (8, dict(B0, head=-46, chest=18, hipH=50), J(1)), (12, dict(B0, head=10, chest=26, hipH=44, x=8), S(.05)),
        (16, dict(B0, head=14, chest=26, hipH=44, x=8, look=24), J(.05)), (20, dict(B0, head=14, chest=26, hipH=44, x=8, look=-24), J(.05)),
        (24, dict(B0, head=12, chest=26, hipH=44, x=8, look=18), J(.05)), (30, dict(B0, head=-20, chest=18, hipH=46, x=2), J(.6)), (42, B0, J(0))])))
    out.append(("brute_double_swipe", "Brute: left-right claw swipes", bake([
        (0, B0, J(0)), (7, dict(B0, twist=22, lHand=[20, -12, -42], hipH=52, lean=62), J(.4)),
        (11, dict(B0, twist=-26, lHand=[70, 30, 24], hipH=52, lean=62), dict(jaw=.8, snap=True)),
        (17, dict(B0, twist=-22, lHand=[60, F, -4], rHand=[20, -12, 42], hipH=52, lean=62), J(.4)),
        (21, dict(B0, twist=26, rHand=[70, 30, -24], lHand=[60, F, -4], hipH=52, lean=62), dict(jaw=.8, snap=True)),
        (28, dict(B0, twist=10, rHand=[56, F, 6], lHand=[60, F, -4]), J(.2)), (42, B0, J(0))])))
    bl = dict(BRUTE, x=44, rHand=[96, F, 15], lHand=[96, F, -15], fFoot=[36, F, 13], bFoot=[36, F, -13])
    out.append(("brute_pounce_bite", "Brute: leap and bite on landing (one-shot)", bake([
        (0, B0, J(0)), (10, dict(B0, hipH=40, x=-8, head=-44), J(.5)),
        (17, dict(BRUTE, hipH=70, x=26, lean=60, head=-30, rHand=[84, 30, 22], lHand=[84, 30, -22], fFoot=[10, 70, 13], bFoot=[10, 70, -13]), dict(jaw=1, snap=True)),
        (23, dict(bl, hipH=44, head=6, chest=22), S(.05)), (27, dict(bl, hipH=44, head=8, chest=22, look=18), J(.05)), (31, dict(bl, hipH=44, head=8, chest=22, look=-18), J(.05)),
        (44, dict(bl, head=-30), J(0))])))
    return out

def main():
    v = json.loads(mocap.VARS_INDEX.read_text()); T = json.loads((mocap.HERE / "titles.json").read_text()); made = []
    for name, title, (fr, props) in build():
        one = "one-shot" in title
        for nm, tt, f2, p2 in [(name, title, fr, props)] + ([(name + "_left", title.replace("(right)", "(left)").replace("left-right", "right-left"), *weapons.mirror_frames(fr, props))] if "swipe" in name else []):
            weapons.save(nm, f"original creature attack, hand-animated with IK, jaw opens and snaps. {tt}", f2, p2, "creature attacks")
            v[nm] = dict(cat="creature attacks", how=tt, loop=not one, oneshot=one, frames=len(f2), status="active"); T[nm] = tt; made.append(nm)
    mocap.VARS_INDEX.write_text(json.dumps(v, indent=1)); (mocap.HERE / "titles.json").write_text(json.dumps(T, indent=1)); print(made)
if __name__ == "__main__": main()
