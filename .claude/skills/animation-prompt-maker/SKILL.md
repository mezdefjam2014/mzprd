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

## Step 3 — Write the output in this exact format

````
# ANIMATION PROMPT: <Name>
Settings: <2D/3D> · <perspective> · <tool> · <fps> fps · frames <start>–<end> · <loop/one-shot> · <style>

## Overview
<2–3 sentences: what happens, the feel, what the viewer must read clearly from this camera.>

## Setup
- Scene/rig: <bones or objects involved, using the user's names or standard Rigify/Mixamo names>
- Camera: <position, angle, FOV — e.g. FPS viewmodel: camera at head, weapon lower-right, 70° FOV>
- Props: <weapon, magazine, etc. and where they parent at each phase>

## Keyframes
### Frame <N> — <Phase name>
- Body/root: <position & rotation, concrete values when possible (e.g. "hips down 5 cm, rotate 10° left")>
- Arms/hands: <...>
- Legs/feet: <...>
- Head/eyes: <...>
- Props: <...>
- What the camera sees: <one line describing the silhouette from the chosen perspective>
- Easing into next key: <ease-in / ease-out / linear / hold>

(repeat for every key pose — usually 6–12)

## Timing Chart
<ASCII timeline, e.g.>
1----8-----16---22--28------40-----48
Idle Antic  Act  Hit Follow  Settle Idle

## Polish Notes
- Overlap/secondary motion (hair, clothing, weapon sway, camera shake on impact)
- Arcs to check, smear frames (2D), motion blur, sound cue frames
- Common mistakes to avoid for this action

## Tool Instructions
<For Blender: a short bpy script skeleton that inserts the keyframes above (keyframe_insert on pose bones, set fcurve interpolation), OR step-by-step manual instructions. For sprites: sprite-sheet layout (frames per row, cell size, facing direction). For Unity/Unreal: clip settings, events at contact frames.>
````

## Rules

- **Always frame-numbered.** Never just prose — every key pose has a frame number and a phase name.
- **Perspective-specific.** Describe what is visible from the chosen camera. FPS = only arms/weapon; 2D side view = silhouette readability; top-down = mainly torso rotation and limb reach.
- **2D sprites:** list each drawn frame (e.g. 8 frames), mention holds ("hold 2 frames"), smears, and facing direction.
- **Concrete numbers** (degrees, cm, frames) beat adjectives.
- Real-world correctness: reload steps must match the weapon type (mag release → mag out → new mag in → seat/slap → bolt/slide if empty); kicks need chamber → extend → retract; walks need opposite arm/leg.
- After the prompt, offer: "Want a variation (faster, heavier, empty-reload, mirrored), the full Blender script, or a different perspective?"
