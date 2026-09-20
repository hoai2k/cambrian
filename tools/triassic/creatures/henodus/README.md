# Henodus — paired authored Tripo body and procedural twin

*Henodus chelyops*, 1.0 m, the roster's slowest swimmer. The authored body, procedural twin,
and puppet LOD are shipped and playable. The current mouth repair was verified on 19 September
2026; `paired-audit.json` is the current export record.

## Reproduce

```
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/henodus/build.py
node tools/triassic/creatures/henodus/audit.mjs --package --decode
node tools/triassic/skin-tears.mjs public/assets/triassic/creatures/henodus.glb
/opt/blender/blender -b --factory-startup --python tools/triassic/gape-solid.py -- henodus \
    Bite@0.25 Heavy@0.1 Eat@0.4 Graze@0.6 Ability@0.5
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/henodus/render.py
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/henodus/render.py -- --puppet
node tools/triassic/creatures/henodus/delivery-record.mjs
node tools/triassic/review-bodies.mjs
```

`qa.json` contains older gape and strain measurements. The builder keeps them under
`historicalQA`, explicitly marked unvalidated after rebuilding. Current paired checks and the
posterior jaw attachment test are in `paired-audit.json`.

CYCLES on CPU throughout: EEVEE and Workbench want EGL, which this container has not got.

## Earlier reconstruction measurements (historical)

| | |
|---|---|
| Source | `tripo-raw/henodus.raw.glb`, 19,204 triangles, one closed shell, sha256 `f27e0907…` |
| Envelope, authored against twin | worst **0.096** on a 5.0 model — 1.9 %, against a 4 % tolerance |
| Surface distance, authored to twin | p95 **0.014**, p99 0.028, max 0.075; nothing over 0.15 |
| Joints | **25** — root, body, chest, neck, skull, jaw, carapace, six caudals, four limbs of three |
| Clips | **24** — the 21 contract clips plus Crawl, Graze and Breathe |
| Triangles | authored **20,280**, twin **7,584**; LOD fraction 0.374 |
| Skin tears | worst **4.81×** (Dodge, `fore_paddle_L`, 0.045 → 0.215) |
| Gape solid | **PASS**, 9 px of 378,000 seen through the body at worst, tolerance 12 |
| Limb sweep per cycle | Swim 39.6°, Sprint 47.5°, Crawl 45–59° at every limb root |
| Anchors | `anchor_mouth` (jaw), `anchor_mouth_inside` (skull), `anchor_attack_primary` (skull) |

Recorded for the neutral-pose pass: mean curvature radius over mean half-section — tail **10.2**,
spine **21.2**, neck **4.8** — and paired-limb asymmetry, which on this generation is small: 0.002
of a body length at every limb joint, and 0.005 of reach between the two forelimbs.

## The mouth

The source contains a narrow inner mandible inside a hanging upper fringe. A cut based only on
mouth height severed the fringe and assigned its tips to the lower jaw. The cut now descends
outside the measured inner width. Only the connected sheet reaching the hinge becomes the
mandible; disconnected tooth fragments remain on the skull with their roots. This returns
80 authored and 18 puppet candidate faces to the upper fringe without deleting any source face.

At the rear cut, the mandible shares the body's weights and blends to its rigid jaw bone over
0.018 source units. The exported attachment test matches 80 authored and 53 puppet rim vertices
at 61 phases of all 24 clips; both measure zero separation. Both cut cross-sections are capped
with source skin. Separate rigid palate/floor shells replace the hidden stretching sac.

Grab is also included in the loop metadata and tested at the seam. Authored, puppet and LOD retain
matching skeletons, clips and anchors. The current close-up evidence, including a view from below
showing the inner mandible behind the intact fringe, lives in `docs/triassic/throat-repairs/`.

## The forked tail — a recorded generation defect, repaired under bound

**The generation bifurcates the tail.** Behind raw x −0.365 the rearmost plane the tail can be
taken off on stops leaving one boundary loop and starts leaving two: two closed tubes at |y|
0.10–0.19 with a gap on the midline, which reads in a top view as a two-pronged fork. The greenlit
canonical draws a single tapering tail with one row of dorsal bosses.

`build.py` finds that plane by topology rather than by eye — it scans cut planes from −0.44 forward
and takes the rearmost one whose cut leaves exactly one simple loop — cuts the fork off there, and
closes the opening with four rings tapering as (1−u)^0.62 to a single apex on the caudal centreline
carried back at the slope the sections in front of the cut already run at, so the repaired tail is
exactly as long as the forked one was. Every new corner takes its UV from the boundary edge it grows
out of, so the cap wears the animal's own scales rather than being a flat island. `FORK_CUT=False`
rebuilds the forked tail for comparison.

**This is a repair, not a fix.** A tail that forks is a generation disagreeing with its own greenlit
pose, and the route the pipeline actually wants is a fresh generation. Two things are weaker for
the cut than they would be for a regeneration: the cap's UVs repeat the boundary strip down the
cone, so the texture smears lengthwise over the last 14 % of the tail, and a cone off a ring 0.077
raw in radius is blunter than the reference's tail tip even with the concave taper.

## The carapace

The fused dorsal shell is a rigid part on its own bone, `carapace`, hung off the trunk and never
given an animation channel — the same thing Placodus' gastral basket is, and the audit asserts it
across all three exports. The bone is a documentary as much as a mechanical device: being a child
of `body` it moves exactly as `body` does, and what actually stiffens the shell is that its 1,756
vertices do not blend onto `chest`, so no swim wave or turn can send a ripple across plates that
are fused in life.

Only skin that is **not** on a limb may join the shell (`carapace_share` is multiplied by one minus
the limb's claim), because a shoulder that went rigid would tear the moment the limb swung.

## What the weighting cost, and what it is

The first build used Nothosaurus' scheme unchanged — trunk blends longitudinally between axial
stations, limb blends radially outward *in its own lateral coordinate* — because Nothosaurus is the
era's cleanest body by skin-tear measurement at 2.98×. On Henodus it tore to **64.9×**, and the
reason is worth writing down: Nothosaurus can take "outboard of |y| 0.09" to mean "on the limb"
because its trunk is narrow, and Henodus' carapace is **half a body length wide**. The criterion put
84 % of a forelimb into the *top of the shell*.

The build now bounds a limb's claim both radially, against its own bone chain, and along it — the
along-limb ramp is still Nothosaurus', starting inside the flank so the shoulder never carries a
ring of half-limb half-trunk vertices, and the base under a partly weighted limb vertex is the axial
station at the limb's own root rather than at that vertex's own x. That is 64.9× → **4.81×**: second
in the era only to Nothosaurus, and well clear of Placodus' 12.4×.

What remains is the splayed five-toed manus. Its toes spread 0.14 of a body length *along* x while
the paddle bone runs across y, so no tube around that bone can claim the whole foot at once; the
worst edge in the body is there, in Dodge, growing 0.045 → 0.215 engine units.

## What is weak

- **The head is narrower than the canonical's.** The greenlit pose draws the broad squared skull
  Henodus is named for; the generation's is a narrower, more gharial-like snout with the denticle
  fringe intact. This is the model disagreeing with the pose, and the route out is a regeneration.
- **The forked tail**, above: repaired under bound, not fixed.
- **The cap's texture smears** over the last 14 % of the tail.
- The glTF exporter warns that the twin's two meshes "may be exported wrongly"; the packaging audit
  compares every decoded attribute array by value and finds no difference, so this is noise from the
  voxel remesh's loose geometry rather than a defect in what ships.
- 20 of 24 clips still tear some edge past 2×, which is normal for this audit (Nothosaurus does too);
  the number that matters is the worst, and it is 4.81×.
