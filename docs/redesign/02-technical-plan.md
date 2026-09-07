# 02 · Technical plan

> Current combat and Y controls: [Hiding and native combat](05-hiding-and-combat.md) supersedes the original signature-ability mappings below.

How the design in `01-game-design.md` gets built on top of the assets and
techniques audited in `00-current-state.md`.

> **This is the plan, and it has been built.** Everything through M8 shipped
> except two music files; see
> [the implementation status](README.md#implementation-status) for what is and
> is not in the game. Where the built thing diverged from the plan — the
> repository layout, the controller bindings, the bounded world, swarm
> impostors — the divergence is marked in place below and the code is the
> authority.

## Ground rules

1. **Fresh source tree, same stack.** The repo only has a compiled bundle.
   We recreate a Vite + TypeScript + React + Three.js project and port the
   pieces worth keeping (sea generator, shaders, rig loader, animation
   layering, split-screen renderer, gamepad reading) by reading the
   prettified bundle. Nothing gameplay-related is ported.
2. **Keep the shipped assets exactly.** `assets/creatures/*.glb` and `*.png`
   move to `public/assets/creatures/` untouched. The high-poly
   `assets/anomalocaris.glb` stays for the viewer and becomes the Giant
   near-LOD. New clips are additive to the GLBs, never replacements.
3. **Deterministic fixed-step simulation, rendering on top.** The sim runs at
   60 Hz in sub-steps (as today), owns all gameplay state, and never touches
   Three.js. Rendering interpolates. This keeps split-screen cheap, keeps
   bots and players identical, and leaves the door open to replays and
   online play later.
4. **Data-driven creatures.** Every number in the design tables lives in one
   TypeScript data file per creature with a shared schema, so tuning is a
   text edit and a hot reload.

## Repository layout

```
cambrian/
├─ index.html · viewer.html          (entries, as today)
├─ public/assets/creatures/*.glb/png (moved, unchanged)
├─ public/assets/anomalocaris.glb    (viewer + Giant LOD0)
├─ src/
│  ├─ app/            React shell: lobby, HUD, pause, settings, controller diagram
│  ├─ input/          Gamepad + keyboard → InputFrame per player; button remap; deadzones
│  ├─ sim/            Pure TS, no Three.js. Fixed-step world simulation
│  │  ├─ world/       chunked heightfield, biome mask, cover volumes, current field
│  │  ├─ actors/      Actor state, growth tiers, size bands
│  │  ├─ combat/      moves, hitboxes, guard/parry/poise, stamina, damage
│  │  ├─ ai/          senses/detection, needs-based brains, boids, giants
│  │  ├─ modes/       Rise, Frenzy, HunterHunted, Reef rule sets
│  │  └─ creatures/   one data file per creature (+ schema + validation)
│  ├─ render/         Three.js: sea, chunks, flora instancing, creature views, FX, cameras, split-screen
│  ├─ audio/          WebAudio graph: layers, spatial one-shots, heartbeat/drone systems
│  └─ shared/         math, RNG, events, config
├─ tools/             glb-inspect, clip-bake, balance sheet export
└─ docs/redesign/     these documents
```

> **What was actually built.** The split between `sim`, `render`, `app`,
> `input`, `audio` and `shared` held; the sub-directories under `sim/` did not.
> `src/sim/` is flat files — `world.ts`, `actors.ts`, `combat.ts`, `ai.ts`,
> `creatures.ts`, `expansion.ts`, `expansion-abilities.ts`, `flora.ts`,
> `spatial.ts`, `types.ts` — and the four mode rule sets live in `game.ts`
> rather than a `modes/` directory. The entry points are `index.html`,
> `viewer/index.html` and `workbench/index.html` (three Vite inputs), and
> `src/workbench/` is a development surface this plan did not anticipate. See
> the repository README for the layout as it stands.

## Simulation architecture

### Loop

```
render frame (rAF):
  dtReal = clamp(now - last, 0, 75ms)
  accumulate; while (acc >= 1/60) { sim.step(1/60, inputs); acc -= 1/60 }
  render.sync(sim, alpha = acc / (1/60))     // interpolate transforms
  for each player viewport: camera.update, renderer.render
```

Inputs are sampled once per render frame into an `InputFrame` per player
(sticks, analog triggers, button `pressed`/`justPressed`/`justReleased`) and
fed to every sub-step. Bots produce the same `InputFrame` type, so combat
code never knows who is controlling an actor.

### Actor model

```ts
interface Actor {
  id: number; creature: CreatureId; controller: 'player' | 'bot' | 'ambient' | 'giant' | 'swarm';
  player?: number;
  // body
  pos, vel: Vec3; yaw, pitch, bank: number; onGround: boolean;
  scale: number;            // × adult model; length = creature.adultLength × scale
  tier: Tier; nutrition: number;
  // resources
  hp, hpMax, stamina, staminaMax, poise, poiseMax: number;
  // combat state machine
  state: 'free' | 'attack' | 'dodge' | 'guard' | 'parry' | 'stagger' | 'grabbed' | 'grabbing'
       | 'eating' | 'ability' | 'moult' | 'dead';
  stateT: number; move?: MoveId; comboIndex: number; iframes: number;
  lockTarget?: number; hitThisSwing: Set<number>;
  // senses / stealth
  noise: number; inCover: number; stillness: number; detectionBy: Map<number, number>;
  // ai
  brain?: BrainState;
}
```

Actor arrays are plain objects in a typed pool; a **spatial hash** (cell size
8 units) indexes positions for all queries (hits, senses, boids, eating).
Budget: 400 live actors (mostly swarm members) at 60 Hz sub-steps.

### Movement

- Camera-relative desired velocity from the stick (with camera pitch for
  swimmers), scaled by `speed × burstMultiplier(RT) × tierSpeedFactor`.
- Velocity approaches desired velocity with a creature `agility` constant
  (current build's exponential damping, kept), plus glide drag when the stick
  is released, plus the current field.
- Heading turns toward velocity at `turnRate`; bank = −turn rate × k
  (exists today). Pitch follows vertical velocity for swimmers, terrain slope
  for crawlers (exists today).
- Crawlers: projected onto the heightfield; a hop is a ballistic arc with
  landing detection; slopes over 55° are walls they slide along.
- Collision: capsule vs heightfield, vs boulder cylinders (existing obstacle
  list, extended with height and overhang volumes), vs other actors
  (soft push, mass-weighted so a Giant walks through a Larva).
- Lock-on: desired velocity is expressed in the target frame (forward =
  toward target, sideways = orbit), and the actor faces the target.

### Combat

A **move** is data:

```ts
interface Move {
  id: MoveId; anim: ClipName; animSpeed: number;
  windup: number; active: number; recovery: number;          // real seconds, identical at every size (see below)
  hitboxes: { socket: BoneName; radius: number; offset: Vec3 }[];
  damage: number; poiseDamage: number; knockback: number; stamina: number;
  lunge: number;            // body lengths of forward carry during windup+active
  guardBreak?: boolean; grab?: GrabSpec; cancelIntoDodgeAfter?: number;
  noise: number;
}
```

- Timings are **fixed in real seconds** regardless of size, so a Larva and a
  Giant have the same rhythm; what changes is reach and damage. Animation
  playback speed is set to fit the clip into `windup + active + recovery`.
- Hitboxes are spheres attached to named bones (`raptor_1_0_4`, `proboscis_11`,
  `body_00`, tail tips…) sampled each sub-step in world space; a hit is a
  sphere-vs-capsule test against the spatial hash candidates, once per swing
  per victim.
- Damage pipeline: `base × momentumBonus × directionBonus × sizeRatioFactor
  → guard (×0.5, stamina cost) / parry (0, stagger attacker) / iframes (0)
  → hp, poise, knockback, hit-stop, events`.
- `sizeRatioFactor` implements the size rule: `clamp((len(attacker)/len(victim))^1.6, 0.05, 6)`,
  so a Giant's bite is lethal and a Larva's is a tickle without special cases.
- Grabs: attacker enters `grabbing`, victim `grabbed`, victim's position is
  slaved to the attacker's mouth socket; escape by mash (`RB` presses count)
  or when the attacker is hit for > 15% hp.
- Poise, stagger, stamina exhaustion and guard-break are small state
  transitions in one `combat/resolve.ts`, all unit-tested with no renderer.

### Growth and size

- `scale` is continuous; tier thresholds are on nutrition. On tier change:
  `moult` state 1.5 s, `scale` lerps, `hpMax/staminaMax/poiseMax` recompute,
  renderer scales the group and pulls the camera rig back.
- Eating: `eating` state with per-tick nutrition transfer from a corpse or a
  consumed Snack; interrupted by any hit.
- Death: drop tier, spawn corpse actor (edible, drifts with current, decays
  in 60 s), respawn timer, respawn at nearest nursery with `iframes`.

### AI

Three brain sizes so 400 actors are affordable:

| Brain | Used by | Cost | Behaviour |
| --- | --- | --- | --- |
| **Swarm** | Snack schools | O(neighbours) boids on the spatial hash, 10 Hz | cohesion, alignment, separation, flee-from-threat, return-to-cover |
| **Needs** | Ambient adults, versus bots | 10 Hz decision, 60 Hz steering | utility scores for hunger / fear / territory pick a goal: hunt (target selection by size band), flee (away from threat via cover), hide, wander, fight (uses the same `Move` data through an `InputFrame` with reaction delay and skill knobs) |
| **Giant** | Giants, the Shadow | 10 Hz | patrol route → notice → hunt (pursuit prediction, follow silt trails) → lose → search → resume; feed on ambient life; drawn to noise; lair sleep cycle |

Detection is the formula from the design doc, computed for each (sensor,
target) pair within sense range using the spatial hash, at 10 Hz.

**Bot difficulty** for versus modes is three knobs: reaction delay
(0.12–0.4 s), parry chance, and stamina awareness.

### World

- `world/heightfield.ts`: the current analytic `H(x,z)` becomes
  `biomeHeight(x,z, biomeMask)`, a sum of the existing terms with per-biome
  amplitude, plus the channel carve and boulder-field bumps. Chunks of
  50 × 50 units, 64 × 64 verts at `high`, generated on demand and cached.
- `world/flora.ts`: the five existing instanced flora sets are placed per
  chunk by biome density tables. Each placement also registers a **cover
  volume** (sphere or capsule, with a `maxOccupantLength`) in the spatial hash.
- `world/current.ts`: the existing analytic current field, strengthened along
  the channel spline.
- Boulders register collision cylinders and, for stacked ones, overhang
  volumes (cover with `maxOccupantLength`).
- The whole world is a seed; `Reef` mode exposes it.

## Rendering

- Port `de()` (sea) and its shader chunks as `render/sea/*`. Split it into
  `SeaEnvironment` (fog, lights, surface, shafts, particles) and `ChunkView`
  (terrain mesh + instanced flora for one chunk). Particles become
  camera-following.
- `render/creature/CreatureView.ts` is the port of `Q()` (rig loader) with:
  - group scale from `actor.scale` (already how `length` is applied today),
  - animation state machine driven by `actor.state` and `move.anim`,
  - the existing additive Turn/Dive/Rise layers,
  - a **procedural layer**: a spine-bend sine along `body_NN` / `segment_NN`
    bones at speed-dependent frequency, and a look-at on the head bone toward
    the lock target. This is what makes bigger and smaller creatures move
    differently without new clips,
  - socket lookup by bone name for hitboxes, mouth, and grab attach points,
  - 3 LODs: game GLB (LOD0), a decimated GLB baked with `gltf-transform`
    (LOD1, ~25%), and an impostor billboard for swarm members past 40 units.
    Giants use the high-poly `anomalocaris.glb` as LOD0 in the viewport they
    are near. *(Built with two LODs; the impostor billboard was not needed —
    swarm members take the same `*.lod1.glb` path by on-screen size, and the
    performance targets were met. LOD1 is about 15% of the triangles for the
    original rigs and 38–51% for the detailed expansion rigs.)*
- `render/fx/`: hit sparks (bubbles), silt clouds (soft particle volumes
  that also register as cover), blood trail particles in the current, moult
  flash, Giant wake distortion.
- Split-screen: the existing scissor/viewport code, plus per-viewport LOD
  bias and a shared shadow map update once per frame, not per viewport.
- Performance targets: ≤ 400 draw calls per viewport at `high`; ≤ 1.2 M
  triangles total for 4 viewports; GPU skinning for all creatures; swarm
  members instanced per creature type with per-instance animation phase.

## Input

- `input/gamepad.ts`: the current `dt(e)` mapping generalised into a
  **binding table** with the layout in the design doc as default:

| Button | Standard index | Default |
| --- | --- | --- |
| LS / RS | axes 0–1 / 2–3 | move / camera |
| LS click | 10 | dive nudge |
| A | 0 | rise / hop (in menus: join, confirm) |
| B | 1 | dodge, double-tap retreat |
| X | 2 | heavy (hold to charge) |
| Y | 3 | ability |
| LB | 4 | guard (hold) / parry (tap) |
| RB | 5 | light attack |
| LT | 6 | lock-on toggle |
| RT | 7 | burst (analog) |
| View | 8 | scoreboard / map |
| Menu | 9 | pause / start |
| D-pad ↑ | 12 | sense pulse |
| D-pad ←/→ | 14/15 | creature select (lobby) |

> **Superseded by what shipped.** The table above is the plan; the bindings the
> game reads are in `readGamepad()` in `src/input/input.ts` and are listed in
> [01 · Combat](01-game-design.md#verbs). The differences that matter: **A** is
> sprint (not rise), **RB** is rise (not light), **X** is light (not heavy),
> **RT** is heavy/pounce (not burst), **LB** is dodge (not guard), **B** is
> guard/parry (not dodge), **LT** is aim rather than a lock-on toggle, and
> **D-pad ↓** opens the teleport menu, which this plan predates.

- Rumble via `gamepad.vibrationActuator` on hits taken, Giant proximity
  heartbeat, tier-up.
- Keyboard 1 and 2 layouts kept for development; the design targets pads.
- Menus are navigable entirely from a pad (the current lobby mostly is).

## Animation asset work

Everything ships first on the **nine existing clips** plus procedural layers,
so no milestone is blocked on art. The mapping:

| Design action | Clip strategy without new art |
| --- | --- |
| Light attack | `Attack` at 1.6× speed, cropped to the first 60% |
| Heavy attack | `Attack` at 0.8× with a held windup frame, plus procedural lunge |
| Guard | `Hit` frozen at 30% + `Idle` blend, body tilted toward the threat |
| Parry | `TurnLeft`/`TurnRight` burst at 2× toward the attacker |
| Dodge | `Dive`/`Rise`/`Turn` additive at full weight + root motion |
| Eat | `Attack` at 0.5× with a head look-at on the corpse |
| Stagger | `Hit` at 0.6× held, extra bank wobble |
| Burrow / Enroll / Shell-up / Anchor | procedural: scale-y squash, spine curl on `body_NN`, sink into terrain |
| Moult | procedural scale with a `Hit` flinch |

Then, as a parallel art track (Blender, additive to each GLB): `Bite`,
`Heavy`, `Guard`, `Parry`, `Dodge`, `Eat`, `Stagger`, and per-creature
`Ability` and `Enroll`/`Burrow`. The state machine reads clip names, so a new
clip replaces its procedural stand-in the moment it exists.

## Audio

WebAudio graph with a music/ambience layer (depth and biome mixed by
crossfade), a **tension layer** driven by the highest detection score against
the player (drone → heartbeat), spatialised one-shots for hits, bursts, and
Giant movement (their audible radius is a gameplay signal), and UI stingers
for tier-up and escape. Everything routes through one bus per viewport so
volumes can be balanced per player.

See [docs/audio.md](../audio.md) for what is actually built: the sound library
and how to regenerate it, the distance falloff for world sounds, and the audio
workbench at `/workbench/?edit=audio`.

## Milestones

Each milestone ends with a playable build and a specific question for
playtesting. Estimates are for one experienced developer; the art track runs
in parallel.

| # | Milestone | Scope | Exit criteria | Playtest question |
| --- | --- | --- | --- | --- |
| **M0** | Bootstrap (1–2 wks) | New Vite/TS/React/Three project; port sea, rig loader, split-screen, gamepad; creature data schema; sim/render split; test harness for `sim/` | The eight creatures swim/crawl in the existing sea with the *new* camera-relative movement; 4 pads, 4 viewports | Does swimming feel better already? |
| **M1** | Movement feel (2 wks) | Glide, burst, stamina, currents, hop, lock-on orbit, camera rig, procedural spine bend, size scaling from 0.25 to 2.6 with camera pull-back | Move a Larva and an Apex around the sea; both feel right | Which creature is most fun to *just move*? |
| **M2** | Combat core (3 wks) | Move data, bone hitboxes, light/heavy/dodge/guard/parry, poise, stagger, damage pipeline with size factor, hit reactions, hit-stop, grabs, versus rule set with bots | Two players fight in the arena for 10 minutes and want another round | Do fights get described in spacing and timing terms? |
| **M3** | Eat and grow (2 wks) | Nutrition, tiers, moult, corpses, eating state, death penalty, respawn, HUD ring | Solo player goes Larva → Apex on ambient life | Does the size-rule flip register? |
| **M4** | Ecosystem and AI (3 wks) | Spatial hash, swarm boids, needs brains, detection model, alarm, cover volumes, prey panic, ambient population manager | The reef looks alive with no players moving | Is hunting a game? |
| **M5** | World and giants (3 wks) | Chunked biomes, channel, boulder field, sponge forest, cover, Giants with patrol/notice/hunt/lose, the Shadow, escape resolution audio | Rise mode start to finish | Did anyone react out loud to a Giant? |
| **M6** | Abilities and identity (3 wks) | All eight abilities and passives, per-creature move tuning, Wiwaxia grazing, Marrella burrow, Olenoides enroll physics | Every creature has a reason to be picked | Can players say why they picked theirs? |
| **M7** | Modes and couch (2 wks) | Feeding frenzy, Hunter & hunted, Reef, drop-in, spectate, per-viewport readability pass, bot difficulty | Four players, any mode, no keyboard | Does quarter-screen read? |
| **M8** | Polish (3 wks) | New clips swapped in, audio pass, onboarding prompts, rumble, quality tiers, performance to targets, viewer updated to show new clips | 60 fps 4-player `low` on a mid laptop; onboarding hits its 60-second goal | Ship it? |

**Status: M0–M8 are done**, bar the two biome music loops in
[`docs/audio-requests.md`](../audio-requests.md). The roster grew from 8 to 21
along the way and the world became endless — both after this table was written.
See [the implementation status](README.md#implementation-status).

Total: roughly 22–24 weeks for the full design; **M0–M3 (8–9 weeks) is the
proof that the core is fun** and is the point to decide how far to go.

## Testing

- `sim/` has zero renderer dependencies and is exercised by Vitest: damage
  pipeline tables, size-band classification, parry windows, stamina economy,
  detection decay, boid stability, growth math. Deterministic RNG makes
  replays and regression tests possible.
- A headless **balance harness** runs bot-vs-bot matchups across all creature
  pairs and tiers and prints win rates and time-to-kill; run in CI so tuning
  regressions are visible.
- Playwright smoke test boots the game with fake gamepads and asserts a frame
  renders per viewport.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Scaling rigs from 0.25× to 6× exposes skinning or animation artefacts | Scaling is on the group node, so skinning is unaffected; test the extremes in M1 and fix per-creature clip speed curves. |
| 400 actors × detection pairs too slow | 10 Hz AI tick, spatial hash range culling, swarm members do not sense. Budget measured in M4. |
| Rival fights degenerate into heavy-spam or dodge-spam | Stamina is shared and heavies have long recovery; balance harness catches degenerate strategies; parry exists to punish predictability. |
| Split-screen GPU cost with high-poly rigs | Per-viewport LOD, impostors for swarms, shared shadow pass, `low` tier. Budgets are hard limits in M8. |
| Procedural stand-in animations look poor | They ship only until the art track lands; the state machine is clip-name-driven so replacement is zero-code. |
| Losing the current viewer | The viewer is kept as a second entry and gains the new clips; it doubles as our animation QA tool. |


## 21-creature integration

`src/sim/expansion.ts` defines 13 additional options. The shared `CreatureDef`
adds optional diet/provenance, collision radius, terrain clearance, authored
locomotion ownership and held/mobile ability metadata. Existing definitions
keep their defaults. `expansion-abilities.ts` owns new ability effects and food
rates; `Game` provides spatial queries, nutrition, events and ally checks.
Armor-piercing moves pass their bypass fraction through the regular combat
pipeline so guard, invulnerability, death and relative-size rules still apply.

The renderer preserves material opacity/transparency for gelatinous models,
plays authored Ability loops while moving, and disables its extra spine wave
and legacy corpse bending when the model owns its deformation. Assets retain the existing URL convention:
`<id>.glb`, `<id>.lod1.glb`, `<id>.card.png`, `<id>.thumb.png`. LODs contain genuinely simplified
geometry. Streaming still prioritizes selected species; no 21-model boot gate.
The selector uses the shared 7-by-3 thumbnail grid and individual player cards.
Short screens scroll the grid/card area while keeping the start controls available.

Authoring scripts and texture inputs are committed under `tools/creatures/`.
Original `.blend` files and intermediate renders remain in the user's local
`cambrian/local/expansion-authoring/` workspace. Preserve all eight old GLBs.

Verification: typecheck and production build; existing controls/respawn/flora
checks; `tools/expansion-test.ts` for ability activation/completion, ally safety,
armor piercing, once-per-target damage and all-tier feeding; asset validation
for required clips, finite skinned poses, loop endpoints, LOD reduction and
rendered appearance. Browser review covers the expanded selector and loaded
models. Physical controller testing is distinct from browser/simulation checks.

All 13 additions share [the v1 attachment contract](../creature-anchors.md).
There are 140 new named sockets per detail level. Anatomical mouths, internal
swallow destinations, primary/paired contacts and dedicated feeding-only CCD
chains are stored on non-deforming child nodes. The final anchor pass preserves
all mesh, skin, material and animation binary bytes; it is idempotent. Update
both sizes and the shared anchor registry after this pass. Runtime tests cover
transformed instances, every articulated chain and attachment behavior.

## Shared engine and era content

Implemented: `src/content/index.ts` selects one plain-data `EraDefinition`; Cambrian-specific roster,
ecology, atmosphere, palettes, soundtrack and asset locations live under `src/content/cambrian/`.
Game, viewer and intake tooling consume the selected pack. No era selector is exposed. See
[Era content boundary](06-era-content.md) for the Devonian integration sequence and remaining shared
terrain, styling and ability responsibilities.
