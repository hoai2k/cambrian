# Odaraia V3 — stage 1 kinematic evidence

Rig source: `rig_v3.py` + `odaraia_v3_lib.py` + `perform_v3.py`, run headless on
Blender 5.2.1. Input: the accepted material02 scene, loaded and never written to.
Numbers below are all in M02 authoring units (the animal is 5.49 units long, so
0.01 unit is 0.18 % of body length). Machine-readable record: `evidence_v3.json`.

```
/opt/blender/blender -b --factory-startup --python rig_v3.py -- build
/opt/blender/blender -b --factory-startup --python rig_v3.py -- evidence
```

## Inputs preserved

| | |
| --- | --- |
| Geometry hash before rigging | `b4086bbddf3bfb5a6551964df927f3a69fa8bbf79a2a1f405f23053a0df0023f` |
| Geometry hash after rigging | identical — the build asserts it |
| Objects skinned | 213 (the hidden half-shell study included, for the cutaway only) |
| Vertices skinned | 175 868 |
| Max influences per vertex | **2** (export limit is 4) |
| Coordinates | +Y up / anatomical ventral, +Z forward — the M02 convention, unchanged |

## Recovered curves verified against the loaded coordinates

The limb curves, interval boundaries `u(q) = (q/20)^1.22`, paddle curve and
endite stations were re-derived from `build_clay02.py`'s formulas without
running its scene creation, then checked against the mesh actually loaded:

| Check | Samples | Max error |
| --- | ---: | ---: |
| Endopod loft ring centres vs `endopod_at(u)` | 3 904 | 2.46e-07 |
| Exopod rod ring centres vs `paddle_at(u)` | 1 088 | 2.53e-07 |
| Endite station centres vs the shaft point they grow from | 1 024 | 2.46e-07 |

## Skeleton — 406 bones, exactly the plan's table

`root`, `body_core`, `head`, `trunk_free_01..03`, `tail_terminal`,
`tail_L/R/dorsal_01..02`, `eye_L/R`, `limb_01..32_L/R_prox|mid|dist|tip` (256),
`paddle_01..32_L/R_base|tip` (128), `labrum`, `mandible_L/R`,
`maxilla_L/R_base|tip`. Endopod bones sit at q = 0 → 6 → 13 → 17 → 20, i.e.
u = 0 → 0.2295 → 0.5872 → 0.8215 → 1, so q = 13 lands on the authored u = .58
knee and the bent rest shaft is preserved rather than replaced by a straight chain.
Limbs 26–32 parent to the exposed-trunk controls by their own insertion station;
1–25 parent to the rigid core. No bone is named `body_NN` or `segment_NN`, so the
runtime's additive spine selector (`SPINE_RE` in `src/render/creature.ts`) finds
nothing here.

## Weights

Rigid podomere surfaces, blended only across the three controlled boundaries in
a collar window of ±0.45 interval units — which sits on the modeled collar rings
and never on an endite root, since those lie at q + 0.5. Every endite is owned
outright by the shaft segment it grows from (`endite_weights`), so a spine can
never be nearest-distance weighted to the neighbouring limb. Paddles are a
sibling branch from the same root with stations u = 0 → .55 → 1 and a ±0.085
collar. The shell is 100 % `body_core`; the covered trunk is too, blending into
the three free-trunk controls and then the terminal segment over wide, locally
smooth junctions. Result: **two influences per vertex, normalised**, nothing torn.

## Control senses — measured, not assumed

Each limb bone's local +Y is its rest chord and local +Z is the medial
(filtering-basket) direction, so `flex` about local X is the anatomical curl.
Displacing a pair-1 tip by +0.20 rad on all four segments:

| Control | Left tip moves | Right tip moves |
| --- | --- | --- |
| flex | (+0.423, −0.131, −0.038) | (−0.465, −0.142, −0.041) |
| twist | (+0.198, +0.039, −0.121) | (−0.216, +0.042, −0.125) |
| swing | (+0.040, −0.350, +0.255) | (−0.041, −0.389, +0.275) |

Positive flex carries both tips toward the midline — the intended feeding side —
and the two sides mirror (sum of the X components is 0.04 of a 0.44 excursion).
`swing` is the fore/aft channel sweep. Mirroring is by anatomical frame and
quaternion, never by negative object scale or a reused Euler sign.

## Poses reviewed

Rest, Attack .18 / .50 / .83, Eat .22 / .52 / .88, each rendered side, front and
oblique with the shell intact, plus a shell-cutaway diagnostic at Attack .50 and
Eat .52. Images in `/home/user/expansion-authoring/odaraia-rework/rig-v3/`:
`stage1-<pose>-<view>.png`, `stage1-attack-050-oblique-cutaway.png`,
`stage1-eat-052-oblique-cutaway.png`.

## Clearance

Two independent measures per pose. **Analytic**: every authored surface vertex of
pairs 1–8 skinned in pure Python from the bind matrices, plus the endopod
centreline as a capsule with its authored radius. **Mesh**: the same pairs read
back out of Blender's own evaluated deformation. The only contact excluded is a
limb's own endites on its own shaft; nothing else is excluded.

Evaluated-mesh surface clearance (positive everywhere — no interpenetration):

| Pose | Neighbour min | Worst pair | Shell margin | Head | Food proxy |
| --- | ---: | --- | ---: | ---: | ---: |
| rest | 0.00098 | 5L–6L filter | 0.33138 | 0.01401 | — |
| attack .18 | 0.00111 | 6R–7R filter | 0.30979 | 0.01685 | — |
| attack .50 | 0.00134 | 4R–5R shaft | 0.22030 | 0.00577 | — |
| attack .83 | 0.00119 | 7L–8L filter | 0.27896 | 0.01646 | — |
| eat .22 | 0.00122 | 2R–3R shaft | 0.30336 | 0.01370 | −0.02165 |
| eat .52 | 0.00026 | 5L–6L filter | 0.26268 | 0.01450 | −0.02220 |
| eat .88 | 0.00103 | 5R–6R filter | 0.29608 | 0.01345 | −0.02934 |

Analytic capsule/surface clearance, as a delta against the rest geometry's own
value for the same pair (successive same-side pairs), with cross-midline pairs
reported absolutely because every attack and feeding pose is *meant* to close the
midline:

| Pose | Hard-shaft min | Filter min | Worst same-side delta | Midline min |
| --- | ---: | ---: | ---: | ---: |
| rest | −0.01790 | 0.00098 | 0 | 0.29243 |
| attack .18 | −0.00211 | 0.00111 | −0.00792 (6L–7L paddle) | 0.29243 |
| attack .50 | −0.02513 | 0.00184 | −0.01219 (4R–5R shaft) | −0.02165 |
| attack .83 | −0.02674 | 0.00043 | −0.00707 (6R–7R paddle) | −0.02674 |
| eat .22 | −0.02895 | 0.00145 | −0.01532 (5R–6R shaft) | 0.00487 |
| eat .52 | −0.02870 | 0.00048 | −0.00978 (5L–6L shaft) | 0.00051 |
| eat .88 | −0.03851 | 0.00054 | −0.00882 (6R–7R paddle) | −0.03234 |

**Finding about the input, not the rig:** the accepted M02 geometry already has
adjacent distal endopod shafts inside one another *as capsules* at rest — 7R and
8R come to 0.0105 centre-to-centre at u ≈ 0.85 / 0.90 against radii 0.0148 and
0.0135, for −0.0179. The filtering comb interdigitates; that is what a comb does,
and the real surfaces stay 0.00098 apart. This is the baseline every pose is
judged against, and no pose costs a same-side pair more than 0.0153 of clearance
(0.28 % of body length). The evaluated-mesh measure never reaches zero.

Shell: no limb vertex of pairs 1–8 is inside the closed part of the valve at all —
the trunk sits high enough in the U that limb roots emerge through the ventral
channel immediately — so the governing measure is distance to the free ventral
margin, which never falls below 0.220 (attack .50). Where posterior tissue *is*
inside the enclosed band the inner-wall clearance is ≥ 0.470. The shell is 100 %
`body_core` and is never deformed by any of this.

Head: the limb roots sit 0.006–0.017 outside the head surface at every reviewed
pose (worst at attack .50, where the front pairs load).

Food proxy (diameter 0.07): the lead pairs 1–3 are in contact throughout
(−0.021 … −0.029, i.e. the filtering pads close on the proxy by about a third of
its radius, which is the grip), while pairs 4–6 hold an open clearance lane of
0.543 → 0.593 as the carry proceeds. Proxy against the shell margin and against
the head is positive at every station.

## Oral measurements

Taken on the presented pose with the mandibles open, not guessed.

| | |
| --- | --- |
| Food-centre oral contact | (0, 0.345, 1.690) |
| Measured aperture diameter | **0.04513** (narrowest point of the descent corridor) |
| Nearest mouthpart surface at that point | 0.02257 |
| `anchor_mouth` presentation centre | (0, 0.305, 1.690) |
| `anchor_mouth_inside` | (0, 0.225, 1.655), head-ellipsoid ratio 0.8651 — inside the sculpted head |
| Descent station | z = 1.690, behind the labrum plate, which ends at z = 1.80 |

## Runtime pickup-offset domain

The production plan asked for a study around 0.02–0.03 model units. Measured
instead, twice:

* with the author-time **bounded** solver (per-segment limits 0.55 / 0.80 / 0.90 /
  1.00 rad), offsets up to **0.24** in all six axis directions still reach the
  corrected contact and cost nothing in clearance;
* with the runtime's **unbounded** CCD reproduced exactly — no joint limits, a
  0.22 rad per-iteration cap, the common offset transferred to every companion
  attack chain and 10 / 24 iterations as `feedAuthored` does it — offsets up to
  **0.18** stay within the runtime's own contact-acceptance radius
  (`apertureDiameter × 0.25` = 0.01128) and within 0.03 of the un-offset pose's
  clearance. 0.24 fails on reach (residual 0.024), not on pose.

Adopted: `pickupOffsetLimit = 0.18`, `apertureDiameter = 0.045`.

## Deviations from the plan, and why

1. **Final Eat descent ends at y = 0.345, not the plan's draft y = 0.30.** With
   the food centre at 0.300 the *carrier's own shaft* dips to y = 0.246 while the
   sculpted head surface at z = 1.69 is at y = 0.269 — measured, first pass, head
   clearance −0.0122. The plan says to determine the final limit from the actual
   mouthpart clearance, so it was: 0.345 keeps the carrier clear (head +0.0135)
   and still puts the proxy's near face at the mandible tooth tips (y ≈ 0.298).
   `anchor_mouth` and `anchor_mouth_inside` cover the remaining transit, and the
   runtime shrinks a carried body to the aperture across the carry phase anyway —
   the evidence renders draw the proxy on that same schedule.
2. **Attack's contact sweep uses +swing (forward/down the channel) plus +flex
   (inward).** The first pass used −swing, which the measured axis senses showed
   carries the tip backward and up. Corrected against measurement rather than
   assumption.
3. **The hard-shaft capsule measure is negative at rest.** Reported rather than
   tuned away: it is a property of the accepted input geometry (see above), and
   the pass criterion is the per-pair delta against it, not an absolute zero.

---

# Stage 2 — actions, export, LOD

```
/opt/blender/blender -b --factory-startup --python actions_v3.py
/opt/blender/blender -b --factory-startup --python export_v3.py -- full
/opt/blender/blender -b --factory-startup --python export_v3.py -- lod
/opt/blender/blender -b --factory-startup --python export_v3.py -- anchors
/tmp/bpyenv/bin/python validate_v3.py
/opt/blender/blender -b --factory-startup --python sheet_v3.py
/tmp/bpyenv/bin/python compose_sheet_v3.py
```

Candidate: `/home/user/expansion-authoring/odaraia-rework/v3-candidate/odaraia.glb`
and `odaraia.lod1.glb`, both **raw/uncompressed**, plus `odaraia.json`.
Machine-readable: `candidate_v3.json`, `validation_v3.json`, `anchors_v3.json`,
`runtime_v3.json`.

## Actions

Eighteen clips at 24 fps, authored as FK controls plus author-time constrained
solving (Eat's lead pairs 1–3 are solved onto the food path by the same bounded
CCD stage 1 used), converted to quaternions and key-reduced against linear
interpolation at a component tolerance of 0.0015.

| | |
| --- | --- |
| Sampled key components | 1 144 124 |
| Retained | 477 972 (58.2 % reduced) |
| Worst induced tip error | **0.0114 model units** (0.21 % of body length, Idle) |
| Loop seam, Idle / Swim / Guard / Eat | 0, 0, 0, 9.0e-08 |
| Death hold | bitwise constant over the final 25 % |
| Root translation / scale channels | none — every channel is a bone rotation |

Per-clip frames, retained keys and measured error are in
`rig-v3/stage2-actions.json`. Ability, Moult, TurnLeft/Right, Rise and Dive also
close on their own first frame; the one-shots return to their gait phase rather
than snapping to bind.

The metachronal phase is `2π·u − 0.58·pairIndex + 1.05·side + jitter`, with the
per-pair jitter and gain drawn once from seed 20260912 in the library and never
at runtime. Distal regions lag the middle by 0.45–1.30 rad and the paddle power
stroke lags by a further 1.75 rad, so no two of the 64 limbs share a rotation.

## Meshes

| | Full | LOD1 |
| --- | ---: | ---: |
| Triangles | **130 184** | **49 878** |
| Raw GLB bytes | 19 611 928 | 13 509 764 |
| Animation bytes | 2 235 748 | 2 235 748 |
| Skinned draws | 7 (6 opaque + the transparent shell) | 7 |
| Joints | 406, `UNSIGNED_SHORT` JOINTS_0 | identical |
| Clips | all 18 | all 18 |

Draw breakdown (full): trunk 22 576, endopods 26 240, exopods 23 552, endites
32 768, eyes 3 312, mouthparts 2 760, shell 18 976.

The body surfaces — valve, trunk, head, eyes, mouthparts, tail — are the
**accepted M02 geometry unchanged** in the full model. The limbs are re-lofted by
`lod_v3.py` from the same recovered curves at a lower cross-section density: all
32 pairs, all 20 endopod intervals with their collar rings, all 16 endite
stations with four spines each, both rami, seven lamellae per paddle and all
three tail blades are present. Maximum deviation from the exact authored lofts:
endopod 0.0050, exopod blade 0.0047, rod 0.0032, endite root 0.0041 model units —
centrelines, radii, lengths, directions and tapers are the authored ones exactly.
The LOD reduces the same elements further (3-sided shafts, flat spine, endite-root
and lamella blades) and quadric-collapses the body shells at 0.26–0.45.

## Materials

Pigment, shell coverage and relief are baked in **rest space** with a Cycles
vertex bake off the accepted M02 shaders, then un-premultiplied so base colour is
the authored pigment and alpha the authored coverage: **0.311 – 1.0**, matching
the study's 0.28 + 0.18·margin + 0.12·noise. Each of the seven draws is a standard
`KHR`-free PBR material — `baseColorTexture` (the shared neutral chitin albedo)
multiplied by COLOR_0, `normalTexture` (the shared cuticle normal), constant
`roughnessFactor` and `metallicFactor` 0. **No transmission**: the shell is
`alphaMode: BLEND`, single-sided, its coverage riding in COLOR_0's alpha, which is
what three.js multiplies through as vertex alpha. UVs are a deterministic
dominant-axis box projection, so the tiling detail maps land without unwrapping
4 096 individual spines.

## Sockets and the runtime contract

`anchors_v3.json` holds 16 records for `odaraia`: `anchor_mouth` (role mouth) and
`anchor_mouth_inside` (role swallow) on `head`; `anchor_grasp` and its exact alias
`anchor_attack_primary` on `limb_01_L_tip`; and `anchor_attack_01..06_L/R` on each
anterior tip. Every CCD chain is `prox → mid → dist → tip` of its own limb —
`root`, `body_core`, the trunk controls, the shell and the eyes never appear.

Run through `add-anchors.mjs`'s own `appendAnchors` against both candidates: 16
sockets appended, 414 → 430 nodes, world-point reconstruction error 2.3e-16, and
a second application is byte-identical.

Scene extras carry `{version: 1, mode: 'authored-grasp', clip: 'Eat',
apertureDiameter: 0.045, pickupOffsetLimit: 0.18}` — both dimensions measured in
stage 1, not guessed.

## Validation

`validate_v3.py` (plain Python, no Blender): **267 checks, 0 failures**.
Finite transforms and positive scales; zero root translation and rotation-only
channels; ≤ 4 influences (authored: 2) with weights normalised to 2e-3; uint16
joints within the skin; all 18 clips at their intended durations; Idle/Swim/
Guard/Eat seamless; Death held; every socket's ancestry, parent/effector identity
and non-zero reach; COLOR_0 VEC4 on every primitive; shell BLEND and no
transmission extension; textures embedded; and full ↔ LOD parity of the joint
list and order, the inverse bind matrices, the bind pose, the clip set, the
durations and the per-clip channel counts.

Exported bounds are the M02 bounds to four decimals
(−0.9653…0.9653, −0.9898…1.2841, −3.058…2.435), so the inverted swimming pose and
the +Y up / +Z forward convention survive the export unchanged.

## Review sheet

`odaraia-v3-sheet.png` (2508 × 1322) in the scratchpad `odar/` folder, with its 27
source frames beside it. Row 1: rest lateral, dorsal, front and quarter with the
shell intact. Row 2: Attack .00 / .18 / .42 / .50 / .60 / .83 / 1. Row 3: Eat
.00 / .22 / .36 / .52 / .67 / .78 / .88 / 1. Row 4: the decisive poses matched
full against LOD — Attack .50 contact, Eat .36 secured, Eat .78 presented — and a
Swim mid-cycle frame on the whole animal.

## Further deviations, and why

4. **The full model is 130 184 triangles, 8 % above the ≈80–120 k planning
   target.** The accepted M02 mesh is 317 k triangles as delivered, which exports
   to a 39 MB raw GLB, so it could not ship as-is. The floor was measured rather
   than guessed: 32 pairs × 16 endite stations × 4 spines is 4 096 spines, and at
   the smallest honest cross-section (a flat blade of the authored length and
   taper) they alone are 32 768 triangles; the two rami add a further 49 792 at
   the densities used here, and the accepted body surfaces are 44 k. Reaching
   120 k means either collapsing the accepted valve/trunk surfaces or dropping
   anatomy, and the plan forbids the second and reserves the first. The parameter
   set is one dict in `lod_v3.py` (`PROFILES['full']`), so the reviewer can pick a
   different point on that curve without re-authoring anything.
5. **Pigment is baked to COLOR_0 rather than to a per-creature albedo atlas.**
   The M02 shaders define roughness as a constant per material; only base colour,
   shell coverage and a fine bump vary spatially. A 4 096-spine atlas would spend
   its resolution on hairlines, and the shipped Cambrian pipeline already carries
   pigment per vertex with shared tiling detail maps, which is what
   `package-expansion.mjs` preserves on the LOD. Both a real `baseColorTexture`
   and a real `normalTexture` are embedded.
6. **`export_yup=False`.** The M02 scene is authored directly in game coordinates,
   so the exporter must not apply its Z-up conversion. As a consequence the
   `point` field in `anchors_v3.json` is written in the shared manifest's own
   source convention (X lateral, Z up, −Y anterior) — that is, `(bx, −bz, by)` of
   the Blender world point — so that `add-anchors.mjs`'s `[x, z, −y]` mapping
   lands the socket exactly where it was authored. Each record also carries
   `blenderWorld` and `gltfWorld` for a human reader; the tool ignores them.
7. **Eat's release blends the solved carry back into the free gait over
   .88 – 1.0**, so the clip closes on its own first frame. The runtime's
   `feedingPhase` has already handed the food to `anchor_mouth_inside` by then
   (`swallow` = smoothstep .78 → 1), so nothing is dropped: this is the plan's
   release/recover phase, and it is what makes a progress-scrubbed Eat loop cleanly.
