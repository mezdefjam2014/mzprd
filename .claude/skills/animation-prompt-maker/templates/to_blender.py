#!/usr/bin/env python3
"""Turn a motion-preview data JSON into a Blender Python script that rebuilds
the same animation: a stick-figure armature keyframed on every key pose, plus props.
Usage: python3 to_blender.py data.json out_blender.py
Then in Blender: Scripting tab > Open out_blender.py > Run Script."""
import json, sys, pathlib, pprint

RUNTIME = r'''
import bpy, math
from mathutils import Matrix, Vector

# side view: figure faces +X, up is +Z. 100 preview units = 1 m.
S = 0.01
L = dict(torso=30, chest=28, neck=7, head=11.5, upper=30, fore=27, thigh=46, shin=45, foot=14, shW=9, hipW=5)
FLOOR = 89
REST = dict(x=0, y=0, z=0, lean=2, chest=0, head=4, twist=0, turn=0, look=0,
            rU=86, rF=80, lU=93, lF=86, rO=8, lO=8, fT=84, fS=97, bT=95, bS=90, fA=0, bA=0, fO=3, bO=3)

def V(p):  # preview (x fwd, y down, z = character's right) -> Blender (X fwd, Z up, -Y = right), floor at Z=0
    return Vector((p[0] * S, -p[2] * S, (FLOOR - p[1]) * S))

def add(a, b): return (a[0] + b[0], a[1] + b[1], a[2] + b[2])
def limb(f, a, l, o=0, side=1):
    a, o = math.radians(a), math.radians(o)
    return add(f, (math.cos(a) * math.cos(o) * l, math.sin(a) * math.cos(o) * l, side * math.sin(o) * l))
def rotY(p, c, t):
    t = math.radians(t); dx, dz = p[0] - c[0], p[2] - c[2]
    return (c[0] + dx * math.cos(t) + dz * math.sin(t), p[1], c[2] - dx * math.sin(t) + dz * math.cos(t))

def raw(p):
    hip = (p["x"], p["y"], p["z"])
    mid = limb(hip, -90 + p["lean"], L["torso"])
    sh = limb(mid, -90 + p["lean"] + p["chest"], L["chest"])
    nk = limb(sh, -90 + p["lean"] * .5 + p["chest"] * .5, L["neck"])
    hd = limb(nk, -90 + p["lean"] + p["chest"] + p["head"] * .6, L["head"] * 2)
    shF, shB = add(sh, (0, 0, L["shW"])), add(sh, (0, 0, -L["shW"]))
    rE = limb(shF, p["rU"], L["upper"], p["rO"], 1); rH = limb(rE, p["rF"], L["fore"], p["rO"], 1)
    lE = limb(shB, p["lU"], L["upper"], p["lO"], -1); lH = limb(lE, p["lF"], L["fore"], p["lO"], -1)
    shF, shB, rE, rH, lE, lH = [rotY(q, sh, p["twist"]) for q in (shF, shB, rE, rH, lE, lH)]
    hF, hB = add(hip, (0, 0, L["hipW"])), add(hip, (0, 0, -L["hipW"]))
    fK = limb(hF, p["fT"], L["thigh"], p["fO"], 1); fAn = limb(fK, p["fS"], L["shin"], p["fO"], 1); fTo = limb(fAn, p["fA"], L["foot"])
    bK = limb(hB, p["bT"], L["thigh"], p["bO"], -1); bAn = limb(bK, p["bS"], L["shin"], p["bO"], -1); bTo = limb(bAn, p["bA"], L["foot"])
    pts = dict(hip=hip, mid=mid, sh=sh, shF=shF, shB=shB, nk=nk, hd=hd, rE=rE, rH=rH, lE=lE, lH=lH,
               hF=hF, hB=hB, fK=fK, fAn=fAn, fTo=fTo, bK=bK, bAn=bAn, bTo=bTo)
    if p["turn"]:
        pts = {k: rotY(v, hip, p["turn"]) for k, v in pts.items()}
    return pts

def ground(k):
    p = {**REST, **k.get("pose", {})}
    s = raw({**p, "y": 0})
    low = max(s["fAn"][1] + 4, s["fTo"][1], s["bAn"][1] + 4, s["bTo"][1])
    p["y"] = (FLOOR - low) + (p.get("y", 0) if k.get("air") else 0)
    return p

def solve(p):
    s = raw(p)
    bones = {
        "spine": (s["hip"], s["mid"], None), "chest": (s["mid"], s["sh"], "spine"),
        "neck": (s["sh"], s["nk"], "chest"), "head": (s["nk"], s["hd"], "neck"),
        "shoulder.R": (s["sh"], s["shF"], "chest"), "shoulder.L": (s["sh"], s["shB"], "chest"),
        "upper_arm.R": (s["shF"], s["rE"], "shoulder.R"), "forearm.R": (s["rE"], s["rH"], "upper_arm.R"),
        "upper_arm.L": (s["shB"], s["lE"], "shoulder.L"), "forearm.L": (s["lE"], s["lH"], "upper_arm.L"),
        "pelvis.R": (s["hip"], s["hF"], "spine"), "pelvis.L": (s["hip"], s["hB"], "spine"),
        "thigh.R": (s["hF"], s["fK"], "pelvis.R"), "shin.R": (s["fK"], s["fAn"], "thigh.R"), "foot.R": (s["fAn"], s["fTo"], "shin.R"),
        "thigh.L": (s["hB"], s["bK"], "pelvis.L"), "shin.L": (s["bK"], s["bAn"], "thigh.L"), "foot.L": (s["bAn"], s["bTo"], "shin.L"),
    }
    anchors = {"rH": s["rH"], "lH": s["lH"], "fFoot": s["fAn"], "bFoot": s["bAn"], "hip": s["hip"], "head": s["hd"], "chest": s["sh"]}
    angs = {"rH": p["rF"], "lH": p["lF"], "fFoot": p["fA"], "bFoot": p["bA"], "hip": p["lean"], "head": p["head"],
            "chest": p["lean"] + p["chest"], "world": 0}
    tw = p["turn"] + p["twist"]
    yaws = {"rH": tw, "lH": tw, "chest": tw, "head": tw + p["look"], "fFoot": p["turn"], "bFoot": p["turn"], "hip": p["turn"], "world": 0}
    return bones, anchors, angs, yaws

def bone_matrix(h, t):
    y = (V(t) - V(h)).normalized()
    ref = Vector((0, 0, 1)) if abs(y.z) < .95 else Vector((1, 0, 0))
    x = y.cross(ref).normalized()
    z = x.cross(y)
    m = Matrix((x, y, z)).transposed().to_4x4()
    m.translation = V(h)
    return m

ORDER = ["spine", "chest", "neck", "head", "shoulder.R", "shoulder.L", "upper_arm.R", "forearm.R", "upper_arm.L",
         "forearm.L", "pelvis.R", "pelvis.L", "thigh.R", "shin.R", "foot.R", "thigh.L", "shin.L", "foot.L"]

scene = bpy.context.scene
scene.render.fps = DATA.get("fps", 24)
keys = [dict(k, pose=ground(k)) for k in DATA["keys"]]
scene.frame_start, scene.frame_end = keys[0]["f"], keys[-1]["f"]

# armature in rest pose
name = DATA["title"].replace(" Storyboard", "")
arm = bpy.data.armatures.new(name + " Rig")
arm.display_type = "STICK"
rig = bpy.data.objects.new(name + " Rig", arm)
scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode="EDIT")
rest_bones = solve(ground({}))[0]
for b in ORDER:
    h, t, par = rest_bones[b]
    eb = arm.edit_bones.new(b)
    eb.head, eb.tail = V(h), V(t)
    if par: eb.parent = arm.edit_bones[par]
bpy.ops.object.mode_set(mode="POSE")

for pb in rig.pose.bones:
    pb.rotation_mode = "QUATERNION"

def ipo(obj, frame, kind):
    ad = obj.animation_data
    if not ad or not ad.action: return
    fcs = getattr(ad.action, "fcurves", None)
    if fcs is None:  # Blender 4.4+ layered actions
        fcs = [fc for l in ad.action.layers for s in l.strips for cb in s.channelbags for fc in cb.fcurves]
    for fc in fcs:
        for kp in fc.keyframe_points:
            if abs(kp.co[0] - frame) < .01: kp.interpolation = kind

# props: one box per prop
props = {}
for pn, d in DATA.get("props", {}).items():
    xs = [s[0] for s in d["shapes"]] + [s[0] + s[2] for s in d["shapes"]]
    ys = [s[1] for s in d["shapes"]] + [s[1] + s[3] for s in d["shapes"]]
    bpy.ops.mesh.primitive_cube_add(size=1)
    ob = bpy.context.active_object
    ob.name = pn
    ob.dimensions = ((max(xs) - min(xs)) * S, 0.03, (max(ys) - min(ys)) * S)
    bpy.ops.object.transform_apply(scale=True)
    ob.data.transform(Matrix.Translation(Vector((((max(xs) + min(xs)) / 2) * S, 0, -((max(ys) + min(ys)) / 2) * S))))
    props[pn] = ob
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode="POSE")

for k in keys:
    f = k["f"]
    scene.frame_set(f)
    bones, anchors, angs, yaws = solve(k["pose"])
    for b in ORDER:
        pb = rig.pose.bones[b]
        pb.matrix = bone_matrix(*bones[b][:2])
        bpy.context.view_layer.update()
        pb.keyframe_insert("location", frame=f)
        pb.keyframe_insert("rotation_quaternion", frame=f)
    for pn, ob in props.items():
        pr = k.get("props", {}).get(pn)
        ob.hide_viewport = ob.hide_render = pr is None
        ob.keyframe_insert("hide_viewport", frame=f); ob.keyframe_insert("hide_render", frame=f)
        if pr is None: continue
        if pr["at"] == "world":
            pos, rot, yaw = (pr.get("x", 0), pr.get("y", 0), pr.get("z", 0)), pr.get("r", 0), pr.get("yaw", 0)
        else:
            base = angs[pr["at"]] if pr.get("follow") else 0
            yaw = yaws[pr["at"]] + pr.get("yaw", 0)
            g = math.radians(base); x, y = pr.get("x", 0), pr.get("y", 0)
            off = rotY((x * math.cos(g) - y * math.sin(g), x * math.sin(g) + y * math.cos(g), pr.get("z", 0)), (0, 0, 0), yaw)
            pos = add(anchors[pr["at"]], off)
            rot = base + pr.get("r", 0)
        ob.location = V(pos)
        ob.rotation_euler = (0, math.radians(rot), math.radians(yaw))
        ob.keyframe_insert("location", frame=f); ob.keyframe_insert("rotation_euler", frame=f)

# hard snaps on keys marked "snap", smooth Bezier elsewhere
for i, k in enumerate(keys):
    if i + 1 < len(keys) and keys[i + 1].get("snap"):
        for ob in [rig] + list(props.values()):
            ipo(ob, k["f"], "LINEAR")

bpy.ops.object.mode_set(mode="OBJECT")
scene.frame_set(keys[0]["f"])
print("Built", name, "with", len(keys), "keys on frames", [k["f"] for k in keys])
'''

data = json.loads(pathlib.Path(sys.argv[1]).read_text())
out = "# Generated by animation-prompt-maker. Blender: Scripting tab > Open > Run Script.\n"
out += "DATA = " + pprint.pformat(data, width=110, sort_dicts=False) + "\n" + RUNTIME
pathlib.Path(sys.argv[2]).write_text(out)
print("wrote", sys.argv[2])
