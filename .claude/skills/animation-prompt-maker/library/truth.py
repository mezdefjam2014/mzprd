"""Measure what a move really does, so its label can be checked against reality."""
import json, gzip, math, numpy as np, mocap, loops
P = mocap.PTS; I = {k: i for i, k in enumerate(P)}; F = mocap.FLOOR
def load(n):
    p = mocap.MOVES / f"{n}.json.gz"
    d = json.load(gzip.open(p, "rt")); return np.array(d["frames"], float), d
def measure(a):
    loc, yaw = loops.frames_local(a); N = len(a)
    h = lambda j: F - a[:, I[j], 1]
    d = a[-1, I["hip"]] - a[0, I["hip"]]; f = np.array([math.cos(yaw[0]), 0, math.sin(yaw[0])]); r = np.array([-f[2], 0, f[0]])
    # travel measured along the way (loops are in place, so also use foot motion relative to the hips)
    feet = np.r_[loc[:, I["fAn"]], loc[:, I["bAn"]]]
    up = (a[:, I["sh"]] - a[:, I["hip"]]); upr = -up[:, 1] / (np.linalg.norm(up, axis=1) + 1e-9)
    hand = lambda k: np.linalg.norm(np.diff(loc[:, I[k]], axis=0), axis=1)
    return dict(sec=round(N / 30, 1), fwd=round(float(d @ f)), side=round(float(d @ r)),
                head_drop=round(float(h("hd")[0] - h("hd").min())), hip_low=round(float(h("hip").min())), hip_start=round(float(h("hip")[0])), hip_end=round(float(h("hip")[-1])),
                upside_down=bool(upr.min() < -.2), lying=bool(upr.min() < .3), airborne=int((np.minimum(h("fAn"), h("bAn")) > 14).sum()),
                feet_lift=round(float(np.maximum(h("fAn"), h("bAn")).max())), hand_speed=round(float(max(hand("rH").max(), hand("lH").max())), 1),
                hands_high=round(float((np.maximum(h("rH"), h("lH")) > h("hd")).mean()), 2),
                step_side=round(float(np.ptp(loc[:, I["fAn"], 2]) + np.ptp(loc[:, I["bAn"], 2]))), step_fwd=round(float(np.ptp(loc[:, I["fAn"], 0]) + np.ptp(loc[:, I["bAn"], 0]))),
                turn=round(math.degrees(abs(math.remainder(yaw[-1] - yaw[0], 2 * math.pi)))))
def say(m):
    """plain-English description built only from the measurements"""
    p = []
    if m["upside_down"]: p.append("goes upside down")
    elif m["lying"]: p.append("goes down onto the ground")
    if m["hip_start"] < 50 and m["hip_end"] > 75: p.append("gets up from the ground")
    elif m["hip_start"] > 75 and m["hip_end"] < 55: p.append("ends low / on the ground")
    elif m["head_drop"] > 22 and not m["lying"]: p.append(f"drops low (head down {m['head_drop']}cm)")
    if m["airborne"] > 3: p.append("leaves the ground")
    if m["feet_lift"] > 45 and m["airborne"] <= 3: p.append("lifts a leg high")
    if m["step_side"] > 40 and m["step_side"] > m["step_fwd"]: p.append("steps sideways")
    elif m["step_fwd"] > 40: p.append("steps forward/back")
    if m["hand_speed"] > 6: p.append("fast arm strike/swing")
    if m["hands_high"] > .4: p.append("arms raised above the head")
    if m["turn"] > 60: p.append(f"turns {m['turn']}°")
    return ", ".join(p) or "mostly in place, small movement"
