"""Mimic a person in an ordinary video: MediaPipe Pose (3D) -> our skeleton -> smoothing, constant bones, feet on the floor.
   python3 video2motion.py video.mp4 --name my_move [--model pose_landmarker_heavy.task] [--start s --end e]"""
import sys, json, argparse, numpy as np, cv2, mocap
import mediapipe as mp
from mediapipe.tasks import python as mpt
from mediapipe.tasks.python import vision
L = dict(nose=0, lear=7, rear=8, lsh=11, rsh=12, lel=13, rel=14, lwr=15, rwr=16, lhip=23, rhip=24, lkn=25, rkn=26, lan=27, ran=28, lheel=29, rheel=30, ltoe=31, rtoe=32)

def track(path, model, start=None, end=None):
    opts = vision.PoseLandmarkerOptions(base_options=mpt.BaseOptions(model_asset_path=model), running_mode=vision.RunningMode.VIDEO, num_poses=1,
                                        min_pose_detection_confidence=.5, min_tracking_confidence=.5)
    det = vision.PoseLandmarker.create_from_options(opts)
    cap = cv2.VideoCapture(path); fps = cap.get(cv2.CAP_PROP_FPS) or 30; i = 0; out = []; vis = []
    while True:
        ok, fr = cap.read()
        if not ok: break
        t = i / fps; i += 1
        if start is not None and t < start: continue
        if end is not None and t > end: break
        r = det.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(fr, cv2.COLOR_BGR2RGB)), int(t * 1000))
        if r.pose_world_landmarks:
            w = r.pose_world_landmarks[0]; out.append([[p.x, p.y, p.z] for p in w]); vis.append([p.visibility for p in w])
        else: out.append(None); vis.append(None)
    return out, vis, fps

def fill_and_smooth(seq, w=7):
    idx = [k for k, s in enumerate(seq) if s is not None]
    if len(idx) < 10: return None
    a = np.array([seq[k] for k in idx], float); t = np.array(idx)
    full = np.stack([[np.interp(np.arange(len(seq)), t, a[:, j, c]) for c in range(3)] for j in range(a.shape[1])], 0).transpose(2, 0, 1)
    k = np.ones(w) / w                                                   # gentle smoothing removes tracking jitter
    return np.stack([[np.convolve(np.pad(full[:, j, c], w // 2, mode="edge"), k, "valid") for c in range(3)] for j in range(full.shape[1])], 0).transpose(2, 0, 1)

def to_bvh_like(lm):
    """MediaPipe world (x right, y down, z away from camera) -> Y-up, named joints like a BVH, so the normal converter applies"""
    P = lambda k: np.stack([lm[:, L[k], 0], -lm[:, L[k], 1], -lm[:, L[k], 2]], 1) * 100
    hip = (P("lhip") + P("rhip")) / 2; sh = (P("lsh") + P("rsh")) / 2; ear = (P("lear") + P("rear")) / 2
    neck = sh + (ear - sh) * .35; head = ear; top = ear + (ear - neck) * .9
    pos = {"Hips": hip, "RightUpLeg": P("rhip"), "LeftUpLeg": P("lhip"), "RightLeg": P("rkn"), "LeftLeg": P("lkn"), "RightFoot": P("ran"), "LeftFoot": P("lan"),
           "RightToeBase": P("rtoe"), "LeftToeBase": P("ltoe"), "RightArm": P("rsh"), "LeftArm": P("lsh"), "RightForeArm": P("rel"), "LeftForeArm": P("lel"),
           "RightHand": P("rwr"), "LeftHand": P("lwr"), "Neck": neck, "Head": head, "Spine1": hip + (sh - hip) * .5}
    return pos, {"Head": top}

def convert(path, model, start=None, end=None):
    seq, vis, fps = track(path, model, start, end)
    lm = fill_and_smooth(seq)
    if lm is None: return None, 0
    pos, ends = to_bvh_like(lm)
    pts = mocap.to_points(pos, ends, fps)
    m = {k: pts[k] for k in mocap.PTS}
    ref = {k: v.copy() for k, v in m.items()}
    m = mocap.fix_lengths(m, ref)                                         # constant bone lengths (video depth wobbles)
    # world landmarks are hip-centred: plant the lowest foot on the floor each frame
    low = np.maximum(np.maximum(m["fAn"][:, 1] + 4, m["fTo"][:, 1]), np.maximum(m["bAn"][:, 1] + 4, m["bTo"][:, 1]))
    gap = mocap.FLOOR - low; gap = np.convolve(np.pad(gap, 3, mode="edge"), np.ones(7) / 7, "valid")
    m = {k: v + np.stack([0 * gap, gap, 0 * gap], 1) for k, v in m.items()}
    seen = np.mean([s is not None for s in seq])
    return m, seen

if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("video"); ap.add_argument("--name", required=True); ap.add_argument("--model", required=True)
    ap.add_argument("--start", type=float); ap.add_argument("--end", type=float); a = ap.parse_args()
    m, seen = convert(a.video, a.model, a.start, a.end)
    if m is None: sys.exit("no person found in the video")
    p = mocap.save_move(a.name, m, dict(name=a.name, source="video: " + a.video.split("/")[-1], desc="mimicked from video")); mocap._remember(a.name, "mimicked from video " + a.video.split("/")[-1])
    print(f"saved {a.name}: {len(m['hip'])/30:.1f}s, person tracked in {seen:.0%} of frames")
