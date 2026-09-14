# Dinocephalosaurus — the generated neck, unbent, on a thirty-two joint chain

The delivered Tripo body and its procedural twin share one **57-joint skeleton**, the same three
mouth/attack sockets and **24 byte-for-byte equivalent decoded animation performances**. The twin
is also the runtime LOD, with every clip retained so either model can perform the same gameplay.

The whole of this build is one question — *what do you do with a heavily posed generation?* — and
the answer here is: **keep it and unbend it**. The neck that ships is the neck Tripo made. Every
generated vertex of it, its UVs and the source albedo are the delivery; intake carries each
cross-section rigidly out of the pose and onto a straight axis, and nothing about the neck is
procedural except where it is pointing.

| Delivery | Triangles | Packaged bytes |
| --- | ---: | ---: |
| `dinocephalosaurus.glb` — authored Tripo body | 21,738 | 2,696,404 |
| `dinocephalosaurus.puppet.glb` — procedural twin | 8,264 | 1,493,884 |
| `dinocephalosaurus.lod1.glb` — identical puppet alias | 8,264 | 1,493,884 |

The reduced model is **38.0 %** of the authored triangles, inside the contract's 40 %. Files are in
`public/assets/triassic/creatures/`, with studio, 1600 × 1200 transparent select, card and thumbnail
portraits and metadata. Meshopt packaging preserves mesh attributes and animation sample values
exactly; textures are embedded. The model is **5.5 engine authoring units** long, faces +Z in glTF
and uses +Y up; the runtime normalises by the bounding box and applies the species' natural size.
The research registry gives 5.5 m as the representative length.

## Source and reconstruction

The preserved source is `tools/triassic/creatures/dinocephalosaurus/tripo-raw/dinocephalosaurus.raw.glb`,
SHA-256 `df0704b432a7480952c58e16e04c258aef9d8c888b87eefb13968eeb412f0fd2`, from Tripo task
`4f30c63b-3efd-40cd-bb73-4030c1acdd93` using
`docs/triassic/canonical/model-inputs/dinocephalosaurus/input.png`. The raw file is never changed.

Intake welds coincident texture-seam vertices (11,032 loose-UV vertices collapse to 9,631; the raw
file's 39 apparent components are one shell once welded) and finds no detached flake to remove. A
true separate lower-jaw shell is cut along the mouth seam and rigidly skinned to its hinge, with a
curved oral floor, palate, two rows of conical fangs and seated hinge tissue closing the interior.

## What is actually in the mesh

The proportion audit reads this body as *"neck stub 0.20 L — the neck is built procedurally and the
paperwork asks for a stub"*, and the row before it warns that an axial measurement under-reads a
curled neck. It does. Measured along its own centreline — geodesic banding of the welded surface,
ring centroids as the axis, which `pose-study.py` measures and `build.py` repeats — the generation
carries a **full
neck**:

| | |
| --- | ---: |
| Neck arc length along its own centreline | **0.7253** of a posed body length |
| Neck axial extent (what the audit measured) | 0.1964 |
| Arc ÷ axial extent | **3.69** |
| Total turning of the neck centreline | **282.7°** |
| Median section radius | 0.0529 |
| Mean curvature radius ÷ section radius | 2.78 |
| Tightest curvature radius ÷ section radius | **1.51** |

So the audit's number and the render do not disagree — 0.20 axial *is* 0.73 of arc when the neck
turns through three quarters of a full circle — but the conclusion drawn from it, that the neck is
a stub and correct by design, is wrong. There is a whole neck in this file. Straightened, it is
**0.44 of the animal**, against the 0.38–0.46 the research gives for a 2.3 m neck on a 5–6 m animal.

The design paperwork (`03-image-and-model-requests.md` T04) does ask for "head and trunk with a
short neck stub", and the pipeline doc expects a procedural neck for this animal. Neither happened:
the greenlit canonical pose and the model input both show the complete animal in a dramatic S, and
the generation reproduced it faithfully. **The model matches the image it was greenlit from**, which
is the pipeline's own test of whether a body is wrong. It is not wrong; it is posed.

## The pose, and what it cost

`pose-study.py` builds three candidates from the same measurement and renders them from one fixed
camera: the raw pose, the Placodus rigid-section unbend, and — for comparison only — a neck rebuilt
as a ring-structured loft of the same measured sections. The unbend wins and is what `build.py`
does; the loft is recorded and not used.

**The technique is Placodus', extended.** Every neck cross-section is carried rigidly from its own
measured centreline frame onto a target axis built from the *same segment lengths*, so nothing is
stretched, sheared or thinned and the neck's arc length, depth and width survive exactly. Two things
had to change to make it reach a neck rather than a tail:

- **The target is a curve, not a line.** It leaves the shoulder along the neck's own tangent
  (0.731, −0.096, 0.676 — the neck rises 43° off the chest in this body) and eases to level over
  its length as a cubic Hermite whose arc length is solved to match the neck's exactly. Because the
  root section is not rotated at all, the trunk is never disturbed and there is no seam to hide.
- **The roll is measured, not fitted.** See below.

Largest vertex move **0.7096** raw units, 43 % of the finished body length; the head's centroid
travels from (0.464, 0.175, 0.289) to (1.014, 0.002, −0.024). That is a big correction and it is
the honest price of the pose. What it is not is a resculpt: no section changes shape, and setting
`UNBEND = False` at the top of `build.py` rebuilds the body in its generated pose for comparison.

The same carry unbends the **tail**, which the generation swept 0.21 of a body length out of the
midline. That is the easy half of the same problem, and the two numbers are the clearest statement
of why the neck was the hard one:

| | neck | tail |
| --- | ---: | ---: |
| Arc | 0.725 | 0.348 |
| Total turning | 282.7° | 49.1° |
| Mean curvature radius ÷ own section radius | 2.8 | 9.0 |
| Tightest curvature radius ÷ section radius | 1.51 | — |
| Largest vertex move | 0.710 | 0.217 |

The tail tip's mean lateral offset drops from **−0.2304 to −0.0432**; the residue is the tail base's
own offset from the mesh midline, which is the trunk's asymmetry and not the tail's.

## The roll, read off the animal's colouring

A roughly circular cross-section is rotationally ambiguous: a centreline fit tells you the neck's
*path* and can say nothing about its **roll** about that path. A rigid carry that gets the roll
wrong spirals the markings down a neck whose silhouette comes out perfectly straight, and that
failure is invisible in an untextured render.

The animal's own colouring settles it. The back is dark and the belly pale, so the light/dark seam
is the lateral midline and points at dorsal from every station. `build.py` samples the source albedo
right round each measured section — 64 rays out from the centreline, each hit's UV taken
barycentrically and the texel's luminance read — and takes the first circular harmonic of the
darkness. That vector is dorsal, measured.

- Mean harmonic strength **0.653** across 30 stations: a strong, unambiguous countershading signal
  (the build asserts it stays above 0.3, because a body without countershading cannot be rolled
  this way).
- Against that measurement, **parallel transport drifts by 117.6°** from shoulder to skull. That is
  the error the geometry alone would have baked in.

The target frames are rolled onto the measured dorsal at every station, tapered to nothing over the
first tenth of the neck so the root section stays exactly where the generation put it. The check is
the render: with the correction the countershading runs true from shoulder to skull; without it the
pale belly climbs onto the neck's upper flank near the base. Both were rendered textured and looked
at. The reviewer's idea worked, and it is the reason this delivery keeps the generated surface at
all.

## The twin

The twin is a procedural **volume resurfacing**, not a decimation of the authored faces: Blender
regenerates topology from a 0.0050 raw-unit voxel occupancy field, relaxes it once and reduces the
new topology to the puppet budget. No source vertex or face is reused. The voxel is finer than
Placodus' 0.0055 because a neck of radius 0.053 has to survive the remesh as a neck. Puppet pigment
is sampled through each nearest source triangle's interpolated UV. The authored body keeps the full
embedded original albedo with white vertex colors, restrained normal relief (0.15) and explicitly
nonmetallic skin at roughness 0.7.

## Measurements

`dinocephalosaurus-profile.json` records **21 exact plane-intersection envelopes** of both actual
meshes (body and lower jaw together).

| Measure | Value | As % of the 5.5-unit body | Tolerance |
| --- | ---: | ---: | --- |
| Maximum dorsal/ventral/width envelope difference | 0.00635 | **0.12 %** | 4 % |
| Nearest twin-surface distance, 95th percentile | 0.00386 | 0.07 % | — |
| Nearest twin-surface distance, maximum | 0.03382 | 0.62 % | — |
| Appendage roots seated inside the intake surface | 0.024–0.090 raw | 1.5–5.4 % deep | inside |
| Jaw hinge seated inside the head | 0.0195 raw | 1.2 % deep, 59 % of the local head radius | inside |
| Neck root (`neck_00`) seated inside the chest | 0.0552 raw | 3.3 % deep | inside |

No authored vertex is further than 0.034 from the twin — there is no outlier region at all on this
body, where Placodus had a lip crease finer than one voxel. Joint and socket coordinates are shared,
so their parity error is exactly zero. Every limb root is seated by construction: `seat()` pulls it
radially in towards the trunk axis until it is 0.022 inside the skin, and the build refuses a root
it cannot seat. These are generated measurements, not a claimed human anatomical sign-off.

## Rig and motion

The shared rig is root, body, chest, **thirty-two cervicals** (`neck_00` … `neck_31`, as Spiekman
et al. 2024 count them), skull, jaw, eight caudal controls and three controls per limb — 57 joints.
Skinning is parameterised by **arc length along measured polylines** rather than by a body axis: the
axial chain projects each vertex onto a 45-point centreline so weight bands stay square to the body
all the way down the neck, and each limb projects onto its own root → elbow → wrist → tip polyline.
A vertex whose nearest axial point is on the neck but which is nowhere near the neck is pulled back
onto `chest`, so the shoulders do not follow the cervical chain. Every vertex has normalised nonzero
weights and at most four influences (mean 2.01).

The action set is Idle, Swim, Sprint, TurnLeft, TurnRight, Dive, Rise, Attack, Bite, Heavy, Hit,
Death, Guard, Parry, Dodge, Eat, Stagger, Ability, Grab, Breath, Growth plus this animal's own
**NeckStrike, Periscope and Breathe**. Idle, Swim, Sprint, Guard, Eat, Grab, Periscope and Breathe
loop exactly (seams close to 1e-17). Root motion and scale animation are absent.

| Clip | s | | Clip | s | | Clip | s |
| --- | ---: | --- | --- | ---: | --- | --- | ---: |
| Idle | 2.6 | | Bite | 0.5 | | Ability | 1.0 |
| Swim | 2.0 | | Heavy | 1.2 | | Grab | 1.1 |
| Sprint | 1.3 | | Hit | 0.6 | | Breath | 2.4 |
| TurnLeft | 1.7 | | Death | 1.8 | | Growth | 1.5 |
| TurnRight | 1.7 | | Guard | 1.1 | | NeckStrike | 1.4 |
| Dive | 1.5 | | Parry | 0.4 | | Periscope | 3.2 |
| Rise | 1.5 | | Dodge | 0.5 | | Breathe | 3.0 |
| Attack | 1.0 | | Eat | 1.7 | | Stagger | 1.2 |

**Grab** is a **1.1 s held loop**, inside the 0.9–1.2 s the contract asks for, and the audit checks
both the duration and the loop seam.

**The neck bends along its length, and that is measured.** Every neck coefficient in the performance
is a *total* angle for the whole chain, spread over the joints by its own shape function and divided
out by the joint count — because a per-joint number on a chain this long is a trap: a tenth of a
radian each would swing the head through two body lengths. The audit reads the result back off the
packaged clips and the live Three.js skeleton:

| Clip | cervicals working | median ÷ max joint amplitude | joints peaking in order | skull travel ÷ chest travel |
| --- | ---: | ---: | ---: | ---: |
| NeckStrike | **32 / 32** | 0.81 | 31 / 31 | **40.7** |
| Ability | 32 / 32 | 0.81 | 31 / 31 | 24.4 |
| Periscope | 32 / 32 | 1.00 | 31 / 31 | 18.8 |
| Swim | 32 / 32 | 0.71 | 23 / 31 | 14.7 |

A hosepipe would show one joint with all the amplitude and thirty-one with none; the median joint
here carries 81 % of what the busiest one does. The strike **travels**: the shoulder end of the
chain peaks at phase 0.38 and the skull end at 0.62, and the build refuses a strike that does not
run down the chain in order. The head reaches 2.56 units while the chest moves 0.063 — the body
stays where it is, which is the animal's whole hunting kit and the roster's own description of the
ability. Periscope stands the skull 1.95 units above where Idle keeps it.

**Swim is axial, with a steady head.** A travelling wave runs down the eight caudal joints — each
peaks 0.067–0.083 of a cycle after the one in front of it — with the four paddles rowing and the
cervical chain trailing the trunk's wave, damped towards the skull. The tail tip sweeps 0.763 units
(Sprint 1.084) against 0.167 (0.250) of skull travel, a ratio of 4.6 (4.3). This animal is not a
pursuit predator and does not swim like one.

Guard folds the neck back over the shoulder, which is the only cover this animal has; Turns bank the
torso and propagate both a cervical and a caudal steering curve; Death rolls the body and lets the
neck fall. Ability is the roster's 1.0 s neck strike at its own duration; NeckStrike is the longer
hunting version and a deliberately different performance, not the same clip twice. These clips
supply body performance; world travel remains engine-owned.

## Verification

`node tools/triassic/creatures/dinocephalosaurus/audit.mjs --package --decode` binds the checks to
the final packaged hashes. It asserts exact paired joint names, hierarchy, local rest transforms,
inverse bind arrays, socket transforms and metadata, clip names, timing and every sample array; that
the thirty-two cervicals really are a chain (each the child of the one behind it, with the skull on
the last); normalised weights; finite attributes; unique dynamic clips; loop seams; no root or scale
channels; Grab's duration; and that the reduced model is at most 40 % of the triangles. It then
plays **61 phases of every clip on both models** through the Three.js GLTFLoader and AnimationMixer,
evaluating actual skinned vertices, and runs the Swim/Sprint and four neck assertions above over 121
phases. The Blender build additionally checks every vertex of both bodies at 13 phases of all 24
clips, asserts the countershading signal is strong enough to read a roll from, and refuses any
appendage root it cannot seat inside the body.

`delivery-files.json` records the size, hash and pixel dimensions of every delivered file.

Sheets, rendered from the decoded packaged files through identical cameras and lights for both
models:

- [Side, top, front, belly and mouth comparison](paired-volume-sheet.jpg)
- [Paired deformation: Idle, Swim, turns, Attack, Bite, Heavy, Dodge](paired-deformation-sheet.jpg)
- [Remaining actions: Sprint, Dive, Rise, Hit, Stagger, Guard, Parry, Eat, Death, Grab, Breath, Growth, Breathe](paired-actions-sheet.jpg)
- [This animal's own clips: NeckStrike, Ability, Periscope, Breathe](paired-era-clips-sheet.jpg)
- **[The neck bending along its length](paired-neck-sheet.jpg)** — the strike from the side and from
  above at seven phases, Periscope, a turn and Guard. This is the sheet this animal is judged on.

- **[The pose study](pose-study-sheet.jpg)** — the generation untouched, the unbend that ships, and
  the rebuilt loft that was measured and not used, side and top from one fixed camera. The unbend is
  rendered *textured*, which is the check that the roll correction worked: the countershading runs
  true from shoulder to skull rather than spiralling.

`pose-study.py` writes the individual frames to
`local/triassic-authoring/dinocephalosaurus/pose-study/`; `pose-sheet.py` assembles them.

No independent human review is invented by this automated QA record.

## Reproduction

From the repository root with Blender 5.2 and the project's Node dependencies installed:

```sh
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/dinocephalosaurus/build.py
node tools/triassic/creatures/dinocephalosaurus/audit.mjs --package --decode
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/dinocephalosaurus/render.py -- --decoded
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/dinocephalosaurus/render.py -- --decoded --puppet
python3 tools/triassic/creatures/dinocephalosaurus/contact-sheets.py
python3 tools/triassic/creatures/dinocephalosaurus/pose-sheet.py
node tools/triassic/creatures/dinocephalosaurus/delivery-record.mjs
node tools/triassic/review-bodies.mjs
node tools/update-asset-sizes.mjs
```

The pose study is separate and touches nothing in `public/`:

```sh
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/dinocephalosaurus/pose-study.py
```

The paired editable Blender project, decoded review GLBs and individual frames live in
`local/triassic-authoring/dinocephalosaurus/`. `build.py` authors both geometry and performance and
writes only this species' asset family; it touches no shared registry and performs no git operation.

## What is still open

- Dinocephalosaurus is **not** in `tools/triassic/shipped.json` and its preview badge is **not**
  cleared. That is the reviewer's call after looking at the sheets. Until then the roster still
  borrows a Devonian body through `TRIASSIC_STAND_INS`. It is registered in
  `src/content/triassic/review-bodies.json`, which is the viewer-only register for a built body
  waiting on a human, exactly as Placodus and Helicoprion are.
- The four portraits in `public/assets/triassic/creatures/` are now model renders rather than the
  crops `tools/triassic/placeholder-portraits.mjs` writes; re-running that tool would put the crops
  back.
- **The unbend is a deliberate departure from the generated pose.** It is bounded, measured and
  reversible from one constant, but it moves a vertex as much as 0.71 raw units, and it is the one
  place this delivery changes what Tripo returned. A reviewer who wants the pose can rebuild with
  `UNBEND = False`.
- **The limbs are still posed.** The generation's four paddles are asymmetric — the left fore is
  swept forward and 0.14 higher than the right, and the hind pair differ by as much — and nothing
  here corrects that, because a limb correction is a different and much less contained operation
  than an axial carry. The rig is built to each paddle's own axis, so they deform correctly; they
  simply do not match each other in the rest pose. The same is true of the trunk, whose tail base
  sits 0.043 left of the mesh's own midline. If the reviewer wants a symmetric animal, that is a
  fresh generation, not a Blender push-and-pull.
- **The head's roll is inherited, not independently verified.** It comes from the measured dorsal at
  the last neck station, which is a good measurement of the *neck*; that the skull sits square on it
  is an assumption checked only by looking at the renders.
- **There are no eye globes.** The generated head has sculpted eyes in its surface and albedo, and
  this build does not cut and seat separate globes, as Nothosaurus and Placodus do not. The pipeline
  contract asks for them; this is outstanding on all three.
- The mouth interior — palate, oral floor, fangs and hinge tissue — is authored geometry scaled to
  the head's measured radius profile, not source detail. Two attempts put it outside the animal: the
  first hung it off the neck's last frame rather than the head's own (the head sits 14° below the
  neck's end tangent, so the whole mouth floated beside the snout), and the second used fixed
  offsets on a snout that tapers to r = 0.008. The head frame is now fitted to the head's own slab
  centroids, everything inside the mouth is a fraction of the local radius, and the build asserts
  every oral vertex is inside the closed intake surface — it now clears it by 0.0024 to 0.0059 raw.
  Nothing in the measured numbers caught either mistake before that assertion existed.
- **The twin's head is smoother than the authored head.** At 0.0050 voxels the remesh keeps the
  silhouette (the envelope agrees to 0.12 %) but loses the snout's fine creases and the eye relief.
  That is visible in the mouth-closed pair on the volume sheet and is what a reduced model is for;
  it is recorded rather than hidden.
- Living colours, soft tissues and movements are artistic reconstruction.
