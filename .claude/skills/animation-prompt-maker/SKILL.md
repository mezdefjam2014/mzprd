---
name: animation-prompt-maker
description: Universal animation maker for games, backed by a real motion-capture library. Use WHENEVER the user asks to make, animate, or get a prompt for ANY motion - reloads, attacks, kicks, punches, monster or creature scares, roars, walk/run/sprint cycles, jumps, idles, deaths, emotes, dances, climbing, picking up items, UI motion, camera moves - in 2D or 3D, for Blender, Unity, Unreal, Godot or sprite sheets. Trigger even on short asks like "make me a reload", "can you do a monster scare", "I need a run cycle". It returns a clean frame-by-frame prompt, a playable motion-graphic preview, and a Blender script that rebuilds the same animation.
---

# Animation Prompt Maker

Your job: convert a vague animation idea into a **precise, frame-by-frame prompt** the user can paste into Claude (or a Blender scripting agent, sprite tool, etc.) so the result looks right the first time.

## Step 1 — Ask before writing (one short message)

Unless the user already answered, ask these in ONE message (use AskUserQuestion if available, otherwise a numbered list). Offer defaults so they can just say "defaults".

1. **2D or 3D game/project?** (default: 3D)
2. **Perspective / camera** — 3D: first-person (FPS viewmodel), third-person over-shoulder, side view, front view, top-down/isometric. 2D: side-scroller (facing right), top-down 4/8-direction, isometric, front-facing.
3. **Target tool** — Blender (Python `bpy` script or manual keyframes), Unity, Unreal, Godot, Spine, Aseprite/sprite sheet, or "just describe it". (default: Blender)
4. **Frame rate & length** — default 24 fps for 3D, 12 fps for 2D sprites. Length chosen by action (see timing table).
5. **Style** — realistic, snappy/arcade, anime, cartoon (squash & stretch), pixel art.
6. Anything specific: weapon/object, character rig (Rigify, Mixamo, custom bone names), loop or one-shot.

If the user says "just do it", use defaults and state them at the top.

## Step 2 — Break the motion into key poses

Every animation uses this phase structure (adapt names to the action):

| Phase | Purpose |
|---|---|
| **Start / Idle** | Neutral pose the clip begins from (and returns to, if looping) |
| **Anticipation** | Small wind-up opposite the main motion |
| **Action / Contact** | The main event (kick impact, mag seats, foot plants) |
| **Follow-through / Overshoot** | Momentum carries past the target |
| **Settle / Recovery** | Ease back to idle or into the next clip |

Typical timing at 24 fps (scale ×0.5 for 12 fps):

| Action | Frames | Notes |
|---|---|---|
| Rifle tactical reload | 48–72 | slower when mag is empty (+chamber) |
| Pistol reload | 36–48 | |
| Punch / jab | 10–16 | contact ~frame 5–6 |
| High kick | 20–30 | contact ~40% through |
| Jump (one-shot) | 24–36 | crouch, launch, apex hold, land squash |
| Walk cycle (loop) | 24–32 | contact/down/pass/up ×2 |
| Run cycle (loop) | 16–20 | |
| Idle breathe (loop) | 48–96 | very small motion |
| Death / knockdown | 30–60 | |

## Step 3 — Write ONE clean, paste-ready prompt

Output the prompt as plain text inside a single code block so the user can copy it in one click. The prompt itself must be clean natural language:
- NO markdown inside the prompt: no #, ##, **, tables, bullets with -, or ASCII charts.
- Write it as direct instructions to the AI that will do the work ("Create a 60-frame first-person rifle reload in Blender at 24 fps...").
- Use short paragraphs and plain numbered lines for frames, e.g. "1. ...", "2. ...", "3. ..."

Keep it SHORT: 100-180 words total. Long prompts lose coherence. Cut anything the AI can infer.
- 6-8 frames max, ONE line each, only the essential pose change.
- One line of setup, one line of polish, one line of tool instruction.
- No sound cues, rig bone lists, or camera specs unless the user asks.

FRAMES = PICTURES. The prompt must ask for ONE image split into numbered panels (a storyboard / sprite sheet), one panel per frame:
- Number frames 1, 2, 3, 4... in order with NO gaps (never "Frame 1, Frame 8, Frame 14").
- 6-8 frames. Every frame is a DIFFERENT moment of the action. Never repeat a pose or show the same action twice.
- Together the frames must cover the whole action from start to finish, so nothing is skipped.
- Same character, outfit, camera angle and scale in every panel, so only the pose changes.

Template:

Create a [N]-panel [2D/3D] animation storyboard of [character] doing a [action], viewed from [perspective], [style]. Lay the panels out left to right, numbered 1 to [N], same character, camera and scale in every panel. Each panel shows a different moment:

1. [distinct pose]
2. [distinct pose]
...
[N]. [distinct pose]

[One sentence: keep motion readable between panels, avoid [common mistake].]
[Optional, only if the user uses Blender/an engine: "Then animate it in [tool] at [fps] fps, spacing these poses over [X] frames."]

Outside the code block, add at most one short line before it (the settings used) and one line after it offering variations (faster, heavier, empty reload, mirrored, other perspective). Nothing else.

## Step 4 — Build the motion graphic preview (always, fast)

After the prompt, make a playable stick-figure preview. Do NOT write HTML from scratch: the engine is saved in `templates/motion-preview.html`. You only write a small JSON file.

1. Copy the closest example from `templates/examples/` and edit it: `pistol-reload.json` (props, hand work, planted feet), `high-kick.json` (IK kick, locked standing foot), `monster-scare.json` (crouch, burst, lunge step), `walk-cycle.json` (looping locomotion).
2. Fill in: `title`, `meta` (settings line), `fps`, `note` (optional), `prompt` (the exact prompt from Step 3), `props`, `keys`.
3. Each key: `{"f": frame, "n": panel caption (same text as the prompt line), "snap": true for hard hits, "pose": {...}, "props": {...}}`. Frame 1..N captions match the prompt's numbered lines.
4. Run `python3 .claude/skills/animation-prompt-maker/templates/build.py data.json <out>.html` (out file in the scratchpad or the user's folder), then publish it with the Artifact tool. Skip extra screenshots unless something looks broken.

POSE WITH IK (preferred). Place hands and feet where they should be; the engine works out shoulders, elbows, hips and knees with real two-bone IK. Knees always bend forward, elbows bend back/down, and no joint bends past 150 degrees.

World coordinates (same units as the preview, figure ~175 tall): `x` forward, `y` DOWN (floor = 89, planted ankle = 85), `z` = character's right side (+) / left (-). With the default `hipH` the hip is at y = 5, shoulders ~y -50, head ~y -75.
- `hipH`: hip height above the floor (standing 84, soft stance 80-82, crouch 50, deep crouch 44). Required when feet use IK.
- `fFoot`, `bFoot`: ankle targets for the right/near and left/far foot, e.g. stance `[22,85,5]` and `[-22,85,-5]`. Keep a planted foot's target IDENTICAL across keys and it stays locked to the floor (no sliding). Lifted foot: raise y (smaller number), e.g. knee chamber `[8,24,5]`, head-height kick `[58,-44,5]`.
- `rHand`, `lHand`: hand targets, e.g. guard by the chin `[16,-40,6]`, gun forward at chest `[40,-38,0]`, hip pouch `[-6,10,-12]`.
- Feet are automatic: flat on the floor when planted, toe pointed along the shin when lifted (kicks look right). Override with `fP`/`bP` (0 = flexed, 90 = fully pointed), e.g. toe-off in a walk `"bP": 35`.
- `x`, `z` move the hips (lunges, steps). Angles below still work for any limb you don't give a target (arms in a walk swing nicely with angles).

ALWAYS CHECK: after build.py, run `node .claude/skills/animation-prompt-maker/templates/check.js <out>.html` (set NODE_PATH to the global node_modules if playwright isn't found). It prints any pose a body can't do (knee backwards, limb can't reach its target, body part through the floor, both feet off the ground without `"air": true`) and saves a `.check.png` screenshot. Fix every warning before publishing, and delete the `.check.png` afterwards. The same check shows on the page under the stage.

Angle controls (side view, figure faces right; degrees, 0 = pointing forward, 90 = straight down, -90 = straight up; absolute, not relative to the parent). Omitted values use the rest pose:
- Without foot targets, feet are planted on the floor automatically, so never fight gravity with `y`. For jumps, flips or anything airborne add `"air": true` to the key and use `y` (negative = up) to lift the body.
- `x`: move the body forward/back.
- `lean`: lower-body tilt (positive = forward). `chest`: extra upper-back bend on top of lean (hunch +, arch -). `head`: look down (+) or up (-).
- `rU`, `rF`: near (right) upper arm and forearm. `lU`, `lF`: far (left) arm. Rest: 86/80 and 93/86 (relaxed, hands slightly forward).
- `fT`, `fS`: near (front) thigh and shin. `bT`, `bS`: far (back) leg. Rest: 84/97 and 95/90 (soft knees). Prefer `fFoot`/`bFoot` targets for legs.
- Real joints only bend one way: knee = shin angle bigger than thigh angle (foot behind knee); elbow = forearm angle smaller than upper arm angle when the hand comes forward/up. Keep the torso lean within -35..60 and the head within -45..45.
- Examples: arm pointing forward = upper 15, forearm -5. Fists up guard = upper 60, forearm -80. Knee chambered = thigh -10, shin 95. Kick at head height = thigh -35, shin -32. Deep crouch = thigh 15, shin 125, lean 30.

3D (the preview and Blender rig are fully 3D; the angles above are the side-view swing, these add depth):
- `rO`, `lO`: arm swings out to the side (positive = away from the body, negative = across the body toward center, e.g. two-handed grip: rO -8, lO -28). `fO`, `bO`: legs out to the side (wide stance 15).
- `twist`: upper-body rotation in degrees (positive = chest turns to the character's left). Use for walk/run arm swing (±5-8), punches (±30), throws.
- `turn`: whole-body rotation around the hips (e.g. spinning kick, turning to face the camera). `look`: head turn left (+) / right (-). `z`: move sideways.
- Top-level `"dim": "2D"|"3D"` and `"view": "side"|"3/4"|"front"|"over shoulder"|"back"|"top"` set the default camera (2D defaults to side, 3D to 3/4). Use the perspective the user picked. Viewers can switch views and drag to orbit.

Props: define `"props": {"name": {"color": "--prop1".."--prop4", "layer": "back"|"front"|"top", "shapes": [[x, y, w, h], ...]}}`, flat plates in local units (the figure is ~175 units tall). In each key, place props with `{"at": "rH"|"lH"|"fFoot"|"bFoot"|"hip"|"head"|"chest"|"world", "x", "y", "z", "r", "yaw", "follow": true to rotate with the limb}`. Props turn with the body automatically. A prop left out of a key is hidden. Props blend smoothly between keys, so swapping hands or dropping something to the floor (`"at": "world"`) just works.

## Step 5 — Blender rebuild (when the user uses Blender or asks for it)

The same JSON also rebuilds the animation in Blender, so Blender gets exactly what the preview shows:

`python3 .claude/skills/animation-prompt-maker/templates/to_blender.py data.json <name>_blender.py`

Give the user the file and say: in Blender, open the Scripting tab, open the file, press Run Script. It creates a 3D armature (spine, chest, neck, head, shoulder/upper_arm/forearm .L/.R, pelvis/thigh/shin/foot .L/.R) with REAL IK: hand.L/R and foot_ik.L/R target controls plus .pole controls for elbows and knees, all keyframed on every key frame, so the user can grab a hand or foot in Blender and adjust it. Also props as boxes, scene fps and frame range, and hard snaps on "snap" keys. If the user has their own character, tell them to retarget this rig's action onto theirs (for example with the Rokoko or Auto-Rig Pro retargeting tools), or ask for their bone names and adapt the script.

## Fastest path: the motion-capture library (try this FIRST)

`library/` holds real recorded human motion (CMU mocap, free for commercial use): 157 moves saved locally (walks, runs, jumps, kicks, jump/spin kicks, punches, boxing, sword, falls, flips, rolls, crawls, climbs, throws, zombie walks, limps, drunk walks, sneaks, idles, pick-ups, dances...) plus a searchable list of all 2,435 CMU clips that download in about 1 second on first use.

```
L=.claude/skills/animation-prompt-maker/library/mocap.py
python3 $L search zombie walk                      # saved names + CMU clip ids
python3 $L peek zombie_3                           # where the action happens (to trim)
python3 $L make zombie_3 --start 0 --end 4 -o <dir> --title "Zombie Walk Storyboard" --view 3/4
```
`make` writes the prompt (printed), `<name>.html` preview and `<name>_blender.py` in one step, so publish the html and you're done. Don't hand-write poses when a library move fits.

New moves from real ones (combine any of these; a move can be `name@start-end` in seconds):
- `--upper boxing_1@4.8-8.8`: upper body from another move (walking punch, zombie brawler, running throw)
- `--then jump_3@0-2 --then fall_1`: chain moves with smooth transitions
- `--blend run_1:0.3`: mix two moves (jog = walk + 30% run)
- `--mirror` (left/right swap), `--speed 1.5`, `--exaggerate 0.4` (bigger, snappier), `--inplace` (remove travel for loops), `--keys 8` (number of storyboard panels)
- Ready-made variations (57 seamless in-place loops, one clean move each, Mixamo style; `library/loops.py` cuts any move to a perfect loop: `make_loop(move, 'action'|'cycle')`, in `library/variations/`, recipes in `library/build_variations.py`): attacks, blocking, waves, zombies, monsters, boxing, social, emotions. Use them by name like any move. Rejected moves are listed in `library/rejected.json`: never rebuild, show or suggest them. Suspend or restore: `python3 $L suspend <name>|all` / `restore <name>|all`. Originals are never changed. Add a recipe to build_variations.py and rerun it to make more; rebuild the gallery with `python3 library/build_gallery.py tools/animation-preview/move-library.html`.
- Mimic any video: `python3 $L/../video2motion.py clip.mp4 --name my_move --model pose_landmarker_heavy.task` tracks the person with MediaPipe Pose (3D), maps it to our skeleton, smooths jitter, keeps bone lengths constant and plants the feet. Setup once: `pip install mediapipe opencv-python-headless`, `apt-get install -y libegl1 libgles2`, model from https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task. Then cut it into moves with the usual loop/one-shot tools. Users put videos in the repo's `videos/` folder. Only use videos the user has the rights to.
- Own recordings (Rokoko Video, etc.): `python3 $L import my.bvh --name my_move`
- Strikes from real mocap: `library/strikes.py` + `build_strikes.py` find every punch/swing in long CMU sessions, classify it (jab, cross, hooks, uppercuts, body shots, combos by boxing numbers; sword/machete/axe/bat swings), cut guard-to-guard loops and reject anything without guard, with jumps, multiple punches or stretched limbs. Knife moves reuse real punch mechanics with a blade.
- More moves: `library/build_more.py` (ducks, dodges, rolls, falls, get-ups, flips, cartwheels, jumps, hops, kicks, throws, stumbles, carries, side steps... each with its own realism check), `build_bats.py` (bat swings driven by the real recorded wrist rotation), and `ikclean.py` (exact bone lengths, feet locked during contact with two-bone IK, nothing through the floor, both hands on two-handed weapons).
- Weapons: `library/weapons2.py` hand-animates pistol (aim, fire with recoil, double tap, 4-count draw, speed reload, pistol whip) and knife (slash combo, thrust, reverse-grip stab) loops from real technique; copy its key lists to make new ones.
- If nothing in the library fits (creatures), fall back to hand posing with IK below.

## Fast path (hand-posed)

## Fast path

For "make me a ___" requests: ask only what you can't infer (2D/3D, perspective), write the prompt, write the JSON (start from the closest file in `templates/examples/`: pistol-reload, high-kick, monster-scare, walk-cycle), run build.py and publish, run to_blender.py if they use Blender. Don't redesign the page or rewrite the engine.

## Rules

- **Always frames 1..N with no gaps**, each a different picture of a different moment. Never skip steps or repeat a pose.
- **Perspective-specific.** Describe what is visible from the chosen camera. FPS = only arms/weapon; 2D side view = silhouette readability; top-down = mainly torso rotation and limb reach.
- **2D sprites:** list each drawn frame (e.g. 8 frames), mention holds ("hold 2 frames"), smears, and facing direction.
- **Concrete numbers** (degrees, cm, frames) beat adjectives.
- Real-world correctness: reload steps must match the weapon type (mag release → mag out → new mag in → seat/slap → bolt/slide if empty); kicks need chamber → extend → retract; walks need opposite arm/leg.
- Keep the prompt clean: no markdown symbols inside it.
- After the prompt, offer: "Want a variation (faster, heavier, empty-reload, mirrored), the full Blender script, or a different perspective?"
