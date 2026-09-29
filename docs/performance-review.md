# Performance: what is held for review

From the September 2026 performance audit. Everything else the audit recommended has landed on
`main`; these are held because they would change how the game looks or feels, or because the
measurement said the change would not pay. Each needs a decision before anyone builds it.

## Why the Devonian draws 9.3 M triangles a frame (investigation only)

Measured in a real Devonian match at high quality, one frame, per draw (the Cambrian beside it):

| | Devonian | Cambrian |
|---|---|---|
| Creatures, main pass | 0.65 M | 0.35 M |
| Scenery, main pass | 7.39 M | 1.78 M |
| Shadow pass | 0.25 M | 0.12 M |

Almost all of it is two plants:

- **Crinoids: 3.66 M triangles in 7 draws.** Each is 2,154 triangles
  (`public/assets/devonian/props-instanced/devonian-crinoid.glb`). The forest band plants them at
  density 30 (`src/content/devonian/environment.ts`), so about 1,700 are drawn.
- **Reeds (`devonian-algal-clump`): 1.86 M in 7 draws.** Each is 1,600 triangles, and the
  nursery and the shallows plant them at 26 and 16, so about 1,160 are drawn.

Creatures are not the problem: the per-frame creature budget works as designed.

Ways out, in rough order of how little they change the picture:

1. **A decimated copy of each plant past a few tens of units.** Every creature already has one
   (`lod1`). A 300-triangle crinoid drawn past about 25 units would take most of the 3.66 M away,
   and those plants are fog-washed at that range anyway. This needs new prop meshes built by the
   prop pipeline, which is the reason it is held.
2. **A shorter draw range for these two kinds** (`range` on the flora meshes in
   `src/render/sea.ts`). This is cheap, but the carpet thins out visibly at the edge of the fog.
3. **Thinner forest and nursery density.** This is a design change: that density is the cover a
   hatchling hides in.

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

The plant copies above would do more.

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
