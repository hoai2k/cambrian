# Ceratites

The era's first coiled cephalopod, and the first Triassic body with no skull, no spine and no paired
limbs. Almost nothing the fourteen vertebrate builders established transferred without being
re-derived, and what follows is what was measured rather than what was assumed.

**State: built, awaiting review.** It is registered in `src/content/triassic/review-bodies.json` and
nowhere else — `tools/triassic/shipped.json`, `TRIASSIC_STAND_INS` and the preview badge are
untouched, so the game still borrows a Devonian body for this animal and the roster still shows the
placeholder portrait cut from the canonical pose.

## Reproduce

```
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/ceratites/build.py
node tools/triassic/creatures/ceratites/audit.mjs --package --decode
node tools/triassic/skin-tears.mjs public/assets/triassic/creatures/ceratites.glb
node tools/triassic/idle-bones.mjs public/assets/triassic/creatures/ceratites.glb
/opt/blender/blender -b --factory-startup --python tools/triassic/gape-solid.py -- ceratites Bite@0.25 Attack@0.44 Eat@0.4
/opt/blender/blender -b --factory-startup --python tools/triassic/gape-crown.py -- ceratites Bite@0.25 Attack@0.44 Eat@0.4
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/ceratites/render.py -- --decoded --twin --portraits
node tools/triassic/review-bodies.mjs
```

## The frame, which the shared measurement cannot find

`T.measure_frame` reads the long axis off the first principal component and the roll off the
countershading, and both fail on an ammonoid. The bounding box is 0.75 × 1.00 × 0.69 — three numbers
describing a disc with a spray of arms, naming no axis — and the shell's ribs and tubercles drown the
countershading harmonic, which measures **0.262** against the module's 0.30 floor, so it refuses
rather than guessing. That refusal is correct and is why this builder measures its own frame:

| Reading | Method | Result |
| --- | --- | --- |
| Coil axis | Smallest principal axis of the **bulk** (shell thickness > 0.10, 2397 vertices) | (0.9997, −0.021, 0.014) — the file's x to within a degree |
| Coil centre | Least-squares circle in the plane normal to it | (−0.004, 0.229, 0.021), radius 0.209, outer whorl 0.301 |
| Forward | Centroid of the **thin** mass (the arms) against the coil centre | −y, by 0.318 |
| Up | Coil centre against the arms' centroid | +z, by 0.083 |

The shell's plane is therefore the file's y–z, which for a planispiral ammonoid is the plane of
symmetry and contains both forward and dorsal. All four readings are asserted in the builder, because
`tx()` comes out as the identity times SCALE and an identity transform that is right by accident is
the worst kind of right.

## Thirteen arms, measured

An arm crown fuses near the base, so how many arms a cut finds depends on where the cut is taken —
and that dependence *is* the measurement. Cutting a sphere out of the welded surface about the
measured crown and counting what falls off:

| Cut radius | 0.10 | 0.11 | 0.12 | 0.13 | 0.14 | 0.15 | 0.16 | 0.17 | 0.18 | 0.19 | 0.20 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Appendages ≥ 100 verts | 6 | 9 | 11 | 11 | 12 | 12 | 12 | 12 | **13** | 13 | 13 |

The 12 that holds over four radii is **not** the answer: at those radii one surviving component is
about twice the size of its neighbours, which is two arms still joined at the base. So the reading is
the *highest settled* count, the cut is taken at the smallest radius that reaches it, and the builder
asserts that no component at that radius is still 1.75× its neighbours. Each arm then gets a
centreline by **graph distance through its own skin** — a curled arm's distance from the crown stops
being monotonic half way along and its distance through the skin does not — and five joints, which is
one more than `conformArms` needs to engage.

## What is rigid, and why it costs nothing

`shell` is one bone with **no animation channel in any clip**, parented to `body` so the whole animal
still rolls. The builder writes no keyframe for it, but the glTF exporter runs with
`export_force_sampling`, which samples every bone whether it was keyed or not — a constant shell
channel was landing in all 21 clips and the rule was true only upstream of the file. It is dropped in
the same place the shared patch drops the root's.

The consequence is what makes a coil this large safe: a bone that never moves relative to its parent
cannot tear the skin it shares with it, so the long boundary between the shell and the mantle collar
is free. The only boundaries that can tear are head-to-body, head-to-arm and lip-to-face, and each of
those is a ramp rather than a test. `audit.mjs` proves it on the packaged body: the pairwise distances
between the 400 vertices the shell owns **outright** change by **0** over every phase of every clip.

## The mouth

The generation models none at all — not a slit, not a lip line, not a beak; thirteen arms converge on
a smooth dome of skin. Both established ways of finding a mouth fail, and the dangerous one fails by
appearing to succeed: casting head vertex normals back into the mesh (Placodus' method) returns
hundreds of hits spread over the whole crown, because on an arm crown what a normal meets across a gap
is the neighbouring arm. That is a **third** way that method can lie, after Keichousaurus'
countershading.

So the mouth is authored, and it is the only authored geometry on this body:

- **The peristome** is cut on the crown's own axis — the mean direction of the thirteen arms, not the
  surface normal at the dome, which is one facet's shape rather than the animal's. Its radius is
  1.55× the arms' own measured band radius (0.0365 of the body). A first attempt scaled it by the
  arm-root spread, which is set by where the cut sphere happened to fall, and took 1403 faces out of
  the crown: a crater, not a mouth. It now removes 143.
- **One closed skinned lining** behind it (`T.crown_lining`), sewn to the skin's own cut rim: its
  first rings carry the skin's weights at that point and only its throat rides the beak, and its first
  two rings are a flange wider than the hole and set back behind the skin.
- **Two keeled mandibles** (`T.crown_beak`), rigid on `skull` and `jaw`. A beak is two curved wedges,
  which is far below the tooth-whorl bar the era's rules set. They carry the oral apparatus' own
  material rather than the skin's, exactly as every other Triassic lining and tooth does — a beak is
  chitin, and painting it with the mantle's pigment would be the error that rule is about.

Proof, both directions, tolerance 12 px:

| Check | Before the sew | After the sew | After the flange |
| --- | --- | --- | --- |
| `gape-solid.py`, through the body | 168 | 27 | **7** |
| `gape-crown.py`, where the mouth is drawn | — | 40 | **4** |

`gape-crown.py` exists because `gape-solid.py` can neither aim nor judge on this shape: its camera
frames off the `jaw` bone's side, which on a crown is outside a thicket of arms, and its verdict is
opened backdrop the body *encloses* — and a crown encloses background between every pair of arms.

## What the simulation actually gives it

`shell: true` in `src/content/triassic/creatures.ts` makes `RULES.jet()` true: a free hover, and
travel backwards without turning round. It does **not** set `swimStyle: 'pulse'`, so `bell()` in
`src/render/creature.ts` returns false and nothing scrubs this clip to a phase. Authoring a
one-`PULSE_CYCLE` squeeze here, as the Cambrian's medusae carry, would be a lie: the squeeze would
drift against a thrust the simulation applies smoothly. `Swim` pumps the funnel twice per loop and
`Sprint` twice in half the time.

**If this animal is ever given `swimStyle: 'pulse'`,** `Swim` has to be re-timed to exactly one
`PULSE_CYCLE` with the squeeze filling the thrust window. That is a deliberate re-author, not a
tuning.

## Anchors

| Socket | Bone | Role | Why |
| --- | --- | --- | --- |
| `anchor_mouth` | `jaw` | mouth | the lower mandible's edge |
| `anchor_mouth_inside` | `skull` | swallow | inside the lining, behind the beak |
| `anchor_attack_primary` | ventral arm tip | attack | **not the beak.** A beak inside an arm crown reaches nothing on its own; what closes on prey, and what `grasp: true` is about, is the crown. Carries that arm's whole chain for IK. |
| `anchor_grasp` | dorsal arm tip | grasp | the opposite arm, with its own chain, so a mouthful is carried in the arms and passed to the beak rather than stuck to the front of the face |

## Numbers

| | |
| --- | --- |
| Joints | 72 (root, body, shell, head, funnel, skull, jaw + 13 arms × 5) |
| Clips | 21, the contract set; no `Crawl` (not `ground`) and no `Breathe` (gills) |
| Triangles | 19,999 authored · 7,945 twin (39.7 %, the contract's ceiling is 40 %) |
| Envelope, 21 stations | max 0.145 against a 0.20 tolerance (4 % of body length) |
| Surface distance, twin vs authored | p95 0.035, max 0.188 |
| Skin tears (`skin-tears.mjs`) | **3.23×** — era: Shonisaurus 1.44×, Keichousaurus 2.34×, Nothosaurus 2.98× |
| Idle bones | every joint owns skin; none below 0.05 % |
| Mean influences | 3.01, max 4 |
| Arm sweep per cycle | Swim 58°, Sprint 57°, Attack 136°, Grab 124° |
| Funnel sweep per cycle | Swim 31.5°, turns 31.5° |
| `meanCurvatureRadiusOverSection` | arms 9.62 (per arm against its own band radius) |
| Appendage asymmetry | mean 0.137, max 0.501 of body length, each arm against its reflection |

## Known weaknesses

- **Thirteen arms is an odd number**, so no arm has an exact mirror and the asymmetry figure above is
  each arm against its *nearest* reflection, with the angle mismatch recorded per arm (0.1° to 64°).
  That is a property of the generation, not of the rig. Ammonoid soft parts are not preserved for
  this genus, so the arm count is artistic reconstruction either way.
- **The beak is authored and the crown's surface is generated**, so it is smoother than its
  neighbourhood by construction. It is small, it is chitin, and it is mostly inside the peristome,
  but it is the one place on this body where the hand shows.
- **`conformArms` is not set** on this creature and arguably should be: it is a benthic scavenger with
  `grasp: true`, five joints per arm (the minimum `ArmConform` engages on) and `arm_<i>_<nn>` naming,
  so the flag would work the day it is set. It is left alone here because setting it now would apply
  to the Devonian body this animal still borrows in play.
- `tools/triassic/creatures/ceratites/portraits/` holds this body's own cards. They are **not** in
  `public/assets/` — the roster's placeholder cards stay until a human decides this ships.
