# 00 · Current state audit

This is what exists in the repository today, read directly from the shipped
build (there is no source code checked in). Everything in the redesign is
grounded in these facts.

## What the repo contains

| Path | What it is |
| --- | --- |
| `index.html` | Entry for the game ("Cambrian · Below the light"). Loads `assets/game-*.js`. |
| `viewer.html` | Entry for the specimen viewer ("Anomalocaris 3D"). Orbit, color variants, animation scrubbing, skeleton view. |
| `assets/game-engine-*.js` | The whole game: procedural sea, actor simulation, creature rig loader, split-screen renderer. ~1,500 lines prettified. |
| `assets/game-*.js` | React UI: lobby, crew cards, HUD, settings, controller diagram, keyboard + gamepad reading. |
| `assets/globals-*.js` | Shared React runtime, icon set, **creature stat table** (see below). |
| `assets/three.module-*.js`, `meshopt_decoder.module-*.js` | Three.js and the meshopt decoder. |
| `assets/creatures/*.glb` + `*.png` | Eight game-ready rigged creatures with card renders. |
| `assets/anomalocaris.glb` | High-poly Anomalocaris used only by the viewer (9 MB, ~200k verts). |

The build was produced by Vite from a React + TypeScript + Three.js project.
**The source is not in the repo.** The redesign therefore starts a fresh
source tree and treats the shipped bundle as reference material, not as a
codebase to edit.

## Creature assets (the part worth keeping)

All eight models are Blender exports with `EXT_meshopt_compression`, one skin
each, a normal map, and named PBR materials. Every rig has the same clip set,
which makes a shared animation state machine straightforward.

| Creature | Joints | Verts (game model) | Locomotion clip | Other clips |
| --- | --- | --- | --- | --- |
| Anomalocaris | 115 | ~90k | Swim | Attack, Death, Dive, Hit, Idle, Rise, TurnLeft, TurnRight |
| Opabinia | 72 | ~62k | Swim | same |
| Waptia | 88 | ~45k | Swim | same |
| Canadia | 70 | ~47k | Swim | same |
| Hallucigenia | 50 | ~23k | Crawl | same |
| Marrella | 120 | ~30k | Crawl | same |
| Olenoides | 78 | ~29k | Crawl | same |
| Wiwaxia | 10 | ~44k | Crawl | same |

Clip lengths: Idle and locomotion 2.0–2.4 s loops, Attack 0.87–1.33 s, Hit
0.6–0.83 s, Death 1.2–2.0 s, Dive/Rise/Turn 1.2–2.4 s. Bone naming is
consistent per body plan (`body_NN`, `flap_L_NN`, `leg_NN_L`, `proboscis_NN`,
`raptor_1_0_N`, `tail_1_N`, `antenna_1`), which lets us attach hitboxes and
mouth/grab sockets by name.

Bounding boxes are roughly 3–4 units long. The game rescales each model so its
length equals the `length` stat below, so **uniform scaling already works**
and growth can reuse the same pipeline.

## Creature stat table shipped today

| id | ground | length | speed | hp | damage | reach | cooldown | defense | role |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| anomalocaris | no | 3.9 | 5.4 | 115 | 27 | 3.5 | 1.15 | 0.06 | Pursuit predator |
| opabinia | no | 3.0 | 4.6 | 90 | 21 | 4.1 | 0.95 | 0.05 | Reach specialist |
| waptia | no | 2.7 | 6.4 | 80 | 16 | 2.5 | 0.65 | 0.03 | Agile swimmer |
| canadia | no | 2.8 | 5.6 | 85 | 19 | 2.8 | 0.85 | 0.08 | Bristled evasive swimmer |
| hallucigenia | yes | 2.7 | 3.2 | 115 | 24 | 3.0 | 0.85 | 0.32 | Spiny bottom dweller |
| wiwaxia | yes | 2.6 | 2.9 | 155 | 28 | 2.8 | 1.15 | 0.42 | Armored grazer |
| marrella | yes | 2.7 | 4.8 | 90 | 18 | 2.8 | 0.70 | 0.15 | Nimble seabed rover |
| olenoides | yes | 3.0 | 3.5 | 145 | 27 | 3.0 | 1.05 | 0.38 | Armored trilobite |

Every creature is the same size class. Nothing eats anything.

## Environment (also worth keeping, but too small)

`game-engine` builds a procedural "Cambrian sea · sediment shelf":

- A 160×160 heightfield plane with an analytic height function (`H(x,z)`),
  a shallow channel running through it, and a rim that rises toward the edge.
- 76 instanced boulders (the only collision obstacles), 300 rock fragments.
- Five instanced flora/sponge sets: Vauxia-like branching sponges, sac and
  stalked sponges, Choia-like radial sponges, Bosworthia-like thalli,
  Marpolia-like filament tufts. Algae sway with an analytic current field.
- Custom shader chunks: sediment grain and ripples, microbial mats, rock
  layering, sponge pores, animated caustics on everything, fog and tinted
  background.
- A water surface plane at y = 18 with a refracted light window, 7 light
  shafts, ~1,000 drifting organic particles that follow the current.
- Two quality tiers (`high` / `low`) that switch shadows, tessellation and
  instance counts.

Playable area is a circle of radius ~33 units. Depth ranges from the
seabed (~ −1 to 1) to y = 16. It looks good and it is procedural, so it can
be made much bigger and more varied by parameterising the same generator.

## Gameplay as shipped

- **Modes:** Co-op survival (gather 18 food, clear 3 predator waves) and
  Versus (first to 5 knockouts or lead after 4 minutes).
- **Players:** 1–4 local, split-screen viewports. Xbox controllers via the
  Gamepad API, plus two keyboard layouts. Join with A, pick with D-pad,
  ready with A, start with Menu.
- **Controls:** left stick = turn + throttle (yaw-based, not camera-relative),
  right stick = look, RT/LT = rise/dive, X/RB = attack, B/LB = dash.
- **Simulation:** fixed 60 Hz sub-steps. Velocity damps toward
  `heading × throttle × speed`, plus a small current push. One attack with a
  wind-up window (0.21–0.49 s into a 0.72 s attack) that hits everything in a
  `reach` sphere in front. Damage is `damage × (1 − defense)` with a small
  knockback. Stamina: dash costs 28, attack costs 16, regen 15/s.
- **Bots:** steer toward nearest enemy, attack when in reach, dash when far.
- **Food:** 36 static glowing pellets that heal 9 HP.
- **Camera:** follow cam behind the creature, clamped to seabed and surface.
- **Animation:** Idle/Swim/Crawl cross-fade, Attack/Hit/Death one-shots,
  additive TurnLeft/TurnRight/Dive/Rise layers weighted by turn rate and
  vertical velocity. This is a solid base and is kept.

## Why it is not fun (the problems the redesign solves)

1. **One button, one attack, no defence.** No block, dodge with invulnerability,
   parry, lock-on or spacing. Fights are two creatures facing each other and
   pressing X.
2. **No size, no growth, no stakes.** Every creature is the same size and
   never changes. There is no reason to hunt and no reason to fear.
3. **No prey and no predators.** "Food" is a static pellet. Enemies are three
   creature types that spawn at the rim and walk at you.
4. **Tank-style steering.** Left stick turns the creature rather than moving it
   relative to the camera, so motion feels like driving a boat, not swimming.
5. **Tiny flat arena.** One 66-unit circle with boulders. Nothing to explore,
   nowhere to hide, no vertical play beyond a 16-unit water column.
6. **No hiding or stealth.** Nothing detects or loses track of the player.
7. **Modes are score-attack wrappers** rather than an experience of *being* a
   Cambrian animal.

What *is* good: the models and rigs, the animation layering, the procedural
sea and shaders, the split-screen renderer, the controller plumbing and the
fixed-step simulation loop. The redesign keeps all of that.
