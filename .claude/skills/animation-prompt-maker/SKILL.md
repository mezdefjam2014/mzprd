---
name: animation-prompt-maker
description: Turns any animation request into a step-by-step, frame-by-frame prompt that another AI (Claude, a Blender Python agent, an image/sprite generator) can follow exactly. Use this WHENEVER the user mentions an animation, or asks for a prompt for one: weapon reloads, attacks, kicks, punches, jumps, walk/run cycles, idles, deaths, emotes, UI motion, camera moves, VFX, cutscenes, Blender/Unity/Unreal/Godot/Spine/sprite-sheet work, 2D or 3D. Trigger even if the user only says "make me a prompt for a ___ animation" or "animate ___".
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

1. Copy the closest example from `templates/examples/` (`pistol-reload.json` = props/weapons, `high-kick.json` = full-body move) and edit it.
2. Fill in: `title`, `meta` (settings line), `fps`, `note` (optional), `prompt` (the exact prompt from Step 3), `props`, `keys`.
3. Each key: `{"f": frame, "n": panel caption (same text as the prompt line), "snap": true for hard hits, "pose": {...}, "props": {...}}`. Frame 1..N captions match the prompt's numbered lines.
4. Run `python3 .claude/skills/animation-prompt-maker/templates/build.py data.json <out>.html` (out file in the scratchpad or the user's folder), then publish it with the Artifact tool. Skip extra screenshots unless something looks broken.

Pose values (side view, figure faces right; angles in degrees, 0 = pointing right, 90 = straight down, -90 = straight up; each limb angle is absolute, not relative to its parent). Omitted values use the rest pose:
- `x`, `y`: move the hips (y negative = up, for jumps). Floor is y = 89 at rest.
- `lean`: torso tilt (positive = forward). `head`: look down (+) or up (-).
- `rU`, `rF`: near (right) upper arm and forearm. `lU`, `lF`: far (left) arm. Rest: 80/85 and 95/92.
- `fT`, `fS`: near (front) thigh and shin. `bT`, `bS`: far (back) leg. Rest: 80/92 and 100/95.
- Examples: arm pointing forward = upper 15, forearm -5. Fists up guard = upper 60, forearm -80. Knee chambered = thigh -10, shin 95. Kick at head height = thigh -35, shin -32.

Props: define `"props": {"name": {"color": "--prop1".."--prop4", "layer": "back"|"front"|"top", "shapes": [[x, y, w, h], ...]}}`, rectangles in local units (the figure is ~200 units tall). In each key, place props with `{"at": "rH"|"lH"|"fFoot"|"bFoot"|"hip"|"head"|"chest"|"world", "x", "y", "r", "follow": true to rotate with the limb}`. A prop left out of a key is hidden. Props blend smoothly between keys, so swapping hands or dropping something to the floor (`"at": "world"`) just works.

## Rules

- **Always frames 1..N with no gaps**, each a different picture of a different moment. Never skip steps or repeat a pose.
- **Perspective-specific.** Describe what is visible from the chosen camera. FPS = only arms/weapon; 2D side view = silhouette readability; top-down = mainly torso rotation and limb reach.
- **2D sprites:** list each drawn frame (e.g. 8 frames), mention holds ("hold 2 frames"), smears, and facing direction.
- **Concrete numbers** (degrees, cm, frames) beat adjectives.
- Real-world correctness: reload steps must match the weapon type (mag release → mag out → new mag in → seat/slap → bolt/slide if empty); kicks need chamber → extend → retract; walks need opposite arm/leg.
- Keep the prompt clean: no markdown symbols inside it.
- After the prompt, offer: "Want a variation (faster, heavier, empty-reload, mirrored), the full Blender script, or a different perspective?"
