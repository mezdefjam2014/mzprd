"""Original all-fours creature animations (crawler + knuckle-walking brute), hand-animated with IK.
   Gaits use a lateral-sequence walk (BL, FL, BR, FR) so three limbs are planted; planted limbs stay locked to the floor."""
import json, math, numpy as np, mocap, weapons, weapons2, strikes, loops, truth
P = mocap.PTS; F = 85     # planted ankle / wrist height (floor 89 - 4)
import ikclean
def bake(keys):
    fr, props = weapons2.bake(keys, lambda *a: [], stance={})
    m = ikclean.no_penetration(fr.copy())          # nothing below the floor
    return m, props
def gait(N, body, hands, feet, stride, lift, phase=(0, .25, .5, .75), duty=.75, bob=2.0, sway=0.0, extra=None, root=False):
    """body: dict of base pose. hands/feet: base (x,z) of right/left limbs. Limbs move back while planted, swing forward when lifted."""
    keys = []
    order = {"bFoot": phase[0], "lHand": phase[1], "fFoot": phase[2], "rHand": phase[3]}   # back-left, front-left, back-right, front-right
    base = {"fFoot": feet[0], "bFoot": feet[1], "rHand": hands[0], "lHand": hands[1]}
    for f in range(0, N + 1, 2):
        t = f / N; p = dict(body)
        rx = stride / duty * t if root else 0.0            # root motion: the body travels, planted limbs stay put in the world
        if root: p["x"] = body.get("x", 0) + rx
        for limb, ph in order.items():
            u = (t - ph) % 1.0
            if u < duty:   # planted: slides back at body speed (in place, like a treadmill)
                x = stride / 2 - stride * (u / duty); y = F
            else:          # swing: arcs forward through the air
                s = (u - duty) / (1 - duty); x = -stride / 2 + stride * (.5 - .5 * math.cos(math.pi * s)); y = F - lift * math.sin(math.pi * s)
            bx, bz = base[limb]; p[limb] = [bx + x + rx, y, bz]
        p["hipH"] = body["hipH"] + bob * math.sin(4 * math.pi * t)
        p["twist"] = body.get("twist", 0) + sway * math.sin(2 * math.pi * t)
        if extra: extra(p, t)
        keys.append((f, p, {}))
    if not root: keys[-1] = (N, keys[0][1], {})
    return keys
# ---------------- body types ----------------
CRAWL = dict(hipH=44, lean=88, chest=6, head=-38, turn=0, x=0, twist=0, look=0)          # low crawler: belly near the ground, head craned up
BRUTE = dict(hipH=47, lean=82, chest=14, head=-34, x=0, twist=0, look=0)                   # hulking knuckle-walker: humped back, heavy shoulders
def still(body, hands, feet, N, breathe=2.0, head_twitch=0.0, sway=0.0):
    keys = []
    for f in range(0, N + 1, 2):
        t = f / N; p = dict(body)
        p.update(rHand=[hands[0][0], F, hands[0][1]], lHand=[hands[1][0], F, hands[1][1]], fFoot=[feet[0][0], F, feet[0][1]], bFoot=[feet[1][0], F, feet[1][1]])
        p["hipH"] = body["hipH"] + breathe * math.sin(2 * math.pi * t); p["chest"] = body["chest"] + breathe * .8 * math.sin(2 * math.pi * t)
        p["look"] = head_twitch * (math.sin(2 * math.pi * t * 3) if head_twitch else 0); p["twist"] = sway * math.sin(2 * math.pi * t)
        keys.append((f, p, {}))
    keys[-1] = (N, keys[0][1], {}); return keys

def build():
    out = []
    CH, CF = ([62, 16], [62, -16]), ([-40, 20], [-40, -20])           # crawler: arms reach far forward, legs splayed wide
    BH, BF = ([44, 15], [44, -15]), ([-6, 13], [-6, -13])           # brute: hands under the shoulders, feet under the hips
    out.append(("crawler_idle", "Crawler: idle, breathing, head twitching", bake(still(CRAWL, CH, CF, 60, 2, 18))))
    out.append(("crawler_crawl", "Crawler: crawl forward on all fours", bake(gait(44, CRAWL, CH, CF, stride=34, lift=10, bob=1.5, sway=6))))
    out.append(("crawler_scurry", "Crawler: fast scurry", bake(gait(26, dict(CRAWL, hipH=46), CH, CF, stride=40, lift=12, duty=.6, bob=2.5, sway=8))))
    out.append(("crawler_creep", "Crawler: slow creep (stalking)", bake(gait(80, dict(CRAWL, hipH=40, head=-30), CH, CF, stride=24, lift=7, bob=1, sway=4))))
    # crawler pounce: coil back, launch forward low, land, recover
    coil = dict(CRAWL, hipH=34, x=-10); fly = dict(CRAWL, hipH=60, x=26, head=-20)
    hc = {"rHand": [CH[0][0], F, CH[0][1]], "lHand": [CH[1][0], F, CH[1][1]], "fFoot": [CF[0][0], F, CF[0][1]], "bFoot": [CF[1][0], F, CF[1][1]]}
    P0 = dict(CRAWL, **hc)
    pounce = [(0, P0, {}), (10, dict(coil, **hc), {}),
              (16, dict(fly, rHand=[98, 52, 16], lHand=[98, 52, -16], fFoot=[-12, 70, 20], bFoot=[-12, 70, -20]), {"snap": True}),
              (22, dict(CRAWL, x=30, rHand=[96, F, 16], lHand=[96, F, -16], fFoot=[-8, F, 20], bFoot=[-8, F, -20]), {}),
              # lands and stays: the body settles over the planted hands, the feet step in after it (root motion one-shot)
              (32, dict(CRAWL, x=34, rHand=[96, F, 16], lHand=[96, F, -16], fFoot=[-8, F, 20], bFoot=[-8, F, -20]), {}),
              (44, dict(CRAWL, x=34, rHand=[96, F, 16], lHand=[96, F, -16], fFoot=[-8, F, 20], bFoot=[-8, F, -20]), {})]
    out.append(("crawler_pounce", "Crawler: coil and pounce forward, claws out", bake(pounce)))
    out.append(("brute_idle", "Brute: heavy idle on its knuckles, breathing", bake(still(BRUTE, BH, BF, 70, 3, 10, sway=4))))
    out.append(("brute_prowl", "Brute: knuckle-walk prowl", bake(gait(56, BRUTE, BH, BF, stride=36, lift=12, bob=2.5, sway=8))))
    out.append(("brute_charge", "Brute: charge (bounding gallop)", bake(gait(24, dict(BRUTE, lean=80, head=-24), BH, BF, stride=52, lift=18, phase=(0, .1, .5, .6), duty=.55, bob=5, sway=4))))
    # brute roar: rears up off the front hands, chest out, arms wide, slams back down
    BP = dict(BRUTE, rHand=[BH[0][0], F, BH[0][1]], lHand=[BH[1][0], F, BH[1][1]], fFoot=[BF[0][0], F, BF[0][1]], bFoot=[BF[1][0], F, BF[1][1]])
    roar = [(0, BP, {}), (10, dict(BP, hipH=62, lean=40, chest=-10, head=-40, rHand=[30, -20, 40], lHand=[30, -20, -40]), {}),
            (14, dict(BP, hipH=64, lean=30, chest=-18, head=-50, rHand=[24, -30, 48], lHand=[24, -30, -48]), {"snap": True}),
            (34, dict(BP, hipH=64, lean=32, chest=-16, head=-46, rHand=[26, -28, 46], lHand=[26, -28, -46]), {}),
            (40, dict(BP, hipH=54), {"snap": True}), (56, BP, {})]
    out.append(("brute_roar", "Brute: rear up and roar, then slam down", bake(roar)))
    # brute claw swipe: weight shifts to the left arm, right arm sweeps across
    swipe = [(0, BP, {}), (8, dict(BP, twist=-22, rHand=[20, -10, 40]), {}),
             (13, dict(BP, twist=28, rHand=[70, 30, -22]), {"snap": True}), (18, dict(BP, twist=30, rHand=[52, 50, -36]), {}), (30, dict(BP, twist=6), {}), (40, BP, {})]
    out.append(("brute_swipe", "Brute: rearing claw swipe (right arm)", bake(swipe)))
    out.append(("brute_slam", "Brute: two-handed ground slam", bake([(0, BP, {}), (12, dict(BP, hipH=62, lean=45, chest=-6, rHand=[34, -45, 14], lHand=[34, -45, -14]), {}),
        (17, dict(BP, hipH=52, lean=78, rHand=[58, F, 14], lHand=[58, F, -14]), {"snap": True}), (24, dict(BP, hipH=50), {}), (40, BP, {})])))
    # stunned / dazed: sinks low, head lolls, body sways, shakes it off
    def daze(p, t): p["look"] = 22 * math.sin(2 * math.pi * t * 2); p["head"] = -6 + 14 * math.sin(2 * math.pi * t)
    out.append(("brute_stunned", "Brute: stunned and dazed, swaying", bake(still(dict(BRUTE, hipH=48, lean=82, head=-6, chest=22), ([40, 18], [40, -18]), ([-6, 15], [-6, -15]), 72, 2, 0, sway=10))))
    out.append(("brute_hit_react", "Brute: flinch from a hit", bake([(0, BP, {}), (4, dict(BP, hipH=54, lean=60, head=-50, twist=18), {"snap": True}), (10, dict(BP, hipH=55, lean=66, head=-40, twist=12), {}), (26, BP, {})])))
    for nm, title, args in [("crawler_crawl", "Crawler: crawl forward", (44, CRAWL, CH, CF, 34, 10, (0, .25, .5, .75), .75, 1.5, 6)),
                            ("crawler_scurry", "Crawler: fast scurry", (26, dict(CRAWL, hipH=46), CH, CF, 40, 12, (0, .25, .5, .75), .6, 2.5, 8)),
                            ("crawler_creep", "Crawler: slow creep", (80, dict(CRAWL, hipH=40, head=-30), CH, CF, 24, 7, (0, .25, .5, .75), .75, 1, 4)),
                            ("brute_prowl", "Brute: knuckle-walk prowl", (56, BRUTE, BH, BF, 36, 12, (0, .25, .5, .75), .75, 2.5, 8)),
                            ("brute_charge", "Brute: charge", (24, dict(BRUTE, lean=80, head=-24), BH, BF, 52, 18, (0, .1, .5, .6), .55, 5, 4))]:
        N, body, hands, feet, stride, lift, phase, duty, bob, sway = args
        out.append((nm + "_root_motion", title + " (root motion: travels forward, planted limbs never slide)", bake(gait(N, body, hands, feet, stride, lift, phase, duty, bob, sway, root=True))))
    return out

def main():
    v = json.loads(mocap.VARS_INDEX.read_text()); T = json.loads((mocap.HERE / "titles.json").read_text())
    for n, x in v.items():
        if x["status"] == "active": x["status"] = "older"
    made = []
    for name, title, (fr, props) in build():
        mirrored = name in ("brute_swipe",)
        weapons.save(name, f"original creature animation, hand-animated with IK (all four limbs locked to the floor when planted). {title}", fr, props, "creatures (all fours)")
        one = name == "crawler_pounce"
        v[name] = dict(cat="creatures (all fours)", how=title + (" (one-shot)" if one else ""), loop=not one, oneshot=one, frames=len(fr), status="active"); T[name] = title; made.append(name)
        if mirrored:
            f2, p2 = weapons.mirror_frames(fr, props); weapons.save(name + "_left", title.replace("right", "left"), f2, p2, "creatures (all fours)")
            v[name + "_left"] = dict(cat="creatures (all fours)", how=title.replace("right", "left"), loop=True, frames=len(f2), status="active"); T[name + "_left"] = title.replace("right", "left"); made.append(name + "_left")
    mocap.VARS_INDEX.write_text(json.dumps(v, indent=1)); (mocap.HERE / "titles.json").write_text(json.dumps(T, indent=1)); print(made)
if __name__ == "__main__": main()
