# Performance: what is held for review

From the September 2026 performance audit. Everything else the audit recommended has landed on
`main`, item 11 included (below). Items 9, 10 and 14 are held because they would change how the
game looks or feels, or because the measurement said the change would not pay. Each needs a
decision before anyone builds it.

## Why the Devonian drew 9.3 M triangles a frame (audit item 11, done)

Measured in a real Devonian match at high quality, one frame, per draw (the Cambrian beside it):

| | Devonian | Cambrian |
|---|---|---|
| Creatures, main pass | 0.65 M | 0.35 M |
| Scenery, main pass | 7.39 M | 1.78 M |
| Shadow pass | 0.25 M | 0.12 M |

Almost all of it was two plants:

- **Crinoids: 3.66 M triangles in 7 draws.** Each is 2,154 triangles
  (`public/assets/devonian/props-instanced/devonian-crinoid.glb`). The forest band plants them at
  density 30 (`src/content/devonian/environment.ts`), so about 1,700 are drawn.
- **Reeds (`devonian-algal-clump`): 1.86 M in 7 draws.** Each is 1,600 triangles, and the
  nursery and the shallows plant them at 26 and 16, so about 1,160 are drawn.

**What was done:** every Devonian plant prop now has a reduced-detail copy
(`<id>.lod1.glb`, built by `tools/devonian/props-instancing/lods.mjs`), drawn instead of the full
one past `SCENERY_LOD_NEAR` in `src/render/sea.ts`. The choice is made per quarter-chunk and per
viewport, so split screen gets it right for every seat.

- **The copies.** Six kinds are simplified by meshopt at 15–25 %. The crinoid is rebuilt from its
  own parts (560 triangles against 2,154), because a simplifier erases its thin arms and pinnules
  and breaks its stem of seventy separate discs into dots.
- **Render-only.** Collision is still measured off the full prop, and `npm run props` checks that
  each copy keeps the full prop's height, pivot and reach.
- **Results.** Main-pass scenery went from 8.8–9.0 M triangles to 2.4–3.0 M across four runs. That
  cost about 75 more instanced draws (scenery 120 → 200). In the same scene with and without the
  copies, 180 of 921,600 pixels differ, all in the fogged background.

The other two ways out stay available if more is ever needed: a shorter draw range for these
kinds (the carpet thins visibly at the fog's edge), or thinner forest and nursery density (a design
change, since that density is the cover a hatchling hides in).

## A step cap for slow frames (audit item 9)

The simulation already runs at most three 60 Hz steps a frame (`engine.ts`), so it cannot spiral
without end. Capping it lower when steps are expensive trades a stutter for slow motion on weak
devices, which is a change in how the game feels. Held for a decision on which of the two is
preferred.

## Batching scenery into larger regions (audit item 10)

Held because the measurement says it would not pay:

- The scenery is 180–190 of about 190–250 draw calls a frame in all three eras. That is modest
  for any GPU the game targets.
- Triangles, not draws, are what is heavy (above).
- Batching chunks into larger regions coarsens culling, so each region draws more of what is off
  screen. That makes the real problem worse.

The plant copies above did more.

## Creature textures (audit item 14)

- **Duplicate images.** Removing images duplicated inside a file saves only 10 MB across the whole
  shipped set, all of it in three Devonian bodies (Furcaster, Walliserops, Eldredgeops).
- **The real weight.** It is 156 MB of Devonian texture images, uncompressed PNG, against 27 MB in
  the Cambrian and 30 MB in the Triassic.
- **Cost on the GPU.** Decoded, a single full-detail Devonian body holds up to 238 MB of texture.
  That is why models are now freed when idle (`evictIdleModels`).

Cutting the Devonian's textures means resizing or recompressing them (KTX2 with a `KTX2Loader`).
That is a visible change to the animals. It also rewrites the shipped GLBs, which `CLAUDE.md`
forbids outside the creature-intake process (`docs/creature-intake.md`: re-render, `npm run
cards`, `npm run lods`, `npm run check`). Held for a decision on the resolution each era's
bodies should ship at.
