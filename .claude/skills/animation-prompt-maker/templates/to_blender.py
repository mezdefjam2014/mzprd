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
L = dict(torso=58, neck=8, head=12, upper=31, fore=29, thigh=44, shin=44)
REST = dict(x=0, y=0, lean=0, head=0, rU=80, rF=85, lU=95, lF=92, fT=80, fS=92, bT=100, bS=95)

def V(p):  # preview (x, y-down) -> Blender (X, Z-up), lifted so feet stand on Z=0
    return Vector((p[0] * S, 0.0, (89 - p[1]) * S))

def P(o, a, l):
    r = math.radians(a)
    return (o[0] + math.cos(r) * l, o[1] + math.sin(r) * l)

def solve(p):
    hip = (p["x"], p["y"])
    sh = P(hip, -90 + p["lean"], L["torso"])
    nk = P(sh, -90 + p["lean"] * .5, L["neck"])
    hd = P(nk, -90 + p["lean"] + p["head"] * .6, L["head"] * 2)
    sl = (sh[0] - 3, sh[1] + 1)
    rE = P(sh, p["rU"], L["upper"]); rH = P(rE, p["rF"], L["fore"])
    lE = P(sl, p["lU"], L["upper"]); lH = P(lE, p["lF"], L["fore"])
    fK = P(hip, p["fT"], L["thigh"]); fF = P(fK, p["fS"], L["shin"])
    bK = P(hip, p["bT"], L["thigh"]); bF = P(bK, p["bS"], L["shin"])
    # bone name: (head, tail, parent)
    return {
        "spine": (hip, sh, None), "neck": (sh, nk, "spine"), "head": (nk, hd, "neck"),
        "upper_arm.R": (sh, rE, "spine"), "forearm.R": (rE, rH, "upper_arm.R"),
        "upper_arm.L": (sl, lE, "spine"), "forearm.L": (lE, lH, "upper_arm.L"),
        "thigh.R": (hip, fK, "spine"), "shin.R": (fK, fF, "thigh.R"),
        "thigh.L": (hip, bK, "spine"), "shin.L": (bK, bF, "thigh.L"),
    }, {"rH": rH, "lH": lH, "fFoot": fF, "bFoot": bF, "hip": hip, "head": hd, "chest": sh}, \
       {"rH": p["rF"], "lH": p["lF"], "fFoot": p["fS"], "bFoot": p["bS"], "hip": p["lean"], "head": p["head"], "world": 0}

def bone_matrix(h, t):
    y = (V(t) - V(h)).normalized()
    z = Vector((0, -1, 0))
    x = y.cross(z)
    m = Matrix((x, y, z)).transposed().to_4x4()
    m.translation = V(h)
    return m

ORDER = ["spine", "neck", "head", "upper_arm.R", "forearm.R", "upper_arm.L", "forearm.L",
         "thigh.R", "shin.R", "thigh.L", "shin.L"]

scene = bpy.context.scene
scene.render.fps = DATA.get("fps", 24)
keys = [dict(k, pose={**REST, **k.get("pose", {})}) for k in DATA["keys"]]
scene.frame_start, scene.frame_end = keys[0]["f"], keys[-1]["f"]

# armature in rest pose
name = DATA["title"].replace(" Storyboard", "")
arm = bpy.data.armatures.new(name + " Rig")
arm.display_type = "STICK"
rig = bpy.data.objects.new(name + " Rig", arm)
scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode="EDIT")
rest_bones, _, _ = solve(REST)
for b in ORDER:
    h, t, par = rest_bones[b]
    eb = arm.edit_bones.new(b)
    eb.head, eb.tail = V(h), V(t)
    eb.align_roll(Vector((0, -1, 0)))
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
    bones, anchors, angs = solve(k["pose"])
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
            pos, rot = (pr.get("x", 0), pr.get("y", 0)), pr.get("r", 0)
        else:
            a = anchors[pr["at"]]; base = angs[pr["at"]] if pr.get("follow") else 0
            g = math.radians(base); x, y = pr.get("x", 0), pr.get("y", 0)
            pos = (a[0] + x * math.cos(g) - y * math.sin(g), a[1] + x * math.sin(g) + y * math.cos(g))
            rot = base + pr.get("r", 0)
        ob.location = V(pos)
        ob.rotation_euler = (0, math.radians(rot), 0)
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
