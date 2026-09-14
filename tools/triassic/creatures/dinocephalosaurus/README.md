# Dinocephalosaurus — the generated neck, unbent, on a thirty-two joint chain

The delivered Tripo body and its procedural twin share one **57-joint skeleton**, the same three
mouth/attack sockets and **24 byte-for-byte equivalent decoded animation performances**. The twin
is also the runtime LOD, with every clip retained so either model can perform the same gameplay.

The whole of this build is one question — *what do you do with a heavily posed generation?* — and
the answer here is: **keep it, unbend it, and then use both.** The neck that ships is the neck Tripo
made. Every generated vertex of it, its UVs and the source albedo are the delivery; intake carries
each cross-section rigidly out of the pose and onto a straight axis, and nothing about the neck is
procedural except where it is pointing.

The two shapes that come out of that do two different jobs. **The straightened body is what ships,
what is rigged and what performs** — a bind pose with a doubled-back neck makes every clip a large
correction and pinches at the tight bends. **The generated pose is what the roster's portraits are
rendered from**, because the pose is the better picture and a still has no bind pose to be good
for. They are the same animal folded two ways, and [what that costs](#the-portrait-is-not-the-body)
is said plainly below rather than left for someone to notice.

| Delivery | Triangles | Packaged bytes |
| --- | ---: | ---: |
| `dinocephalosaurus.glb` — authored Tripo body | 21,276 | 2,686,276 |
| `dinocephalosaurus.puppet.glb` — procedural twin | 8,092 | 1,490,832 |
| `dinocephalosaurus.lod1.glb` — identical puppet alias | 8,092 | 1,490,832 |

The reduced model is **38.0 %** of the authored triangles, inside the contract's 40 %. Files are in
`public/assets/triassic/creatures/`, with studio, 1600 × 1200 transparent select, card and thumbnail
portraits — all four rendered from the **generated pose**, not from this body — and metadata.
Meshopt packaging preserves mesh attributes and animation sample values
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

## The portrait is not the body

The four roster portraits — `.card.png`, `.select.png`, `.thumb.png` and the `.png` studio render —
are rendered from the generated pose, from `dinocephalosaurus.posed.glb`, which `build.py` copies
off the intake surface **before** anything is unbent and writes to the workbench. It carries no rig,
no jaw cut and no mouth interior, because it is a still at rest with the mouth closed; its material
is the same datablock as the shipped body's, so it is lit and shaded identically.

**Say it plainly: the portrait and the playable body are different shapes.** Same vertices, same
UVs, same albedo, different fold. The portrait animal measures **3.32 engine units** along its
longest axis and the playable body **5.5**, because unbending a neck that turns through 283° makes
the animal longer. Nothing about the portrait is evidence about the model — if you want to know what
the game draws, look at the volume sheet, not the card.

Framing is measured rather than typed. `portrait()` in `render.py` projects the subject's own
vertices into the camera, centres on them and sets `ortho_scale` so the animal takes `FILL` of the
frame; at 0.74 the card comes out **66.2 % of the frame wide and 74.0 % tall**, against Placodus'
69.6 % wide and Nothosaurus' 78.1 %. One rule, and it cannot go stale when a body changes shape.

The camera is nearly side-on — (8.5, −1.2, 3.0) — rather than the three-quarter the review shots
use, at the same elevation, lights and output sizes as the rest of the roster. The generated pose
throws the neck up and back in one plane and the review camera looks straight down that plane, so
from there the animal reads as a lump with its head foreshortened into its own shoulder.
`render.py -- --posed --probe` renders that camera at six azimuths into the workbench, which is how
this one was picked; it is a looking tool, not a measurement.

The twin's studio render, `dinocephalosaurus.puppet.png`, is still the straightened twin. It is a
review artefact about the reduced model, so it shows the body the reduced model actually is.

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

## The head was rolled 83.6°, and the mouth was built on it

The previous delivery listed "the head's roll is inherited, not independently verified" as open. It
was wrong, and by most of a right angle.

`HEAD_UP` was taken from the neck target curve's parallel-transport normal — the very frame this
build already measures a **117.6° drift** in, and corrects the neck's own sections against. The head
frame never got that correction, so the frame the entire mouth was constructed in was rolled about
its own axis, and `is_jaw` was cutting the mandible off the **side** of the snout. The jaw swung
sideways; the gape was a chip at the tip; the fangs sat on a flank.

The head's dorsal is now measured the way the neck's is, and for the same reason — a roughly round
section is rotationally ambiguous and the animal's own colouring is the only measurement there is:

| | |
| --- | ---: |
| Stations round the head sampled for the first harmonic of darkness | 20 |
| Mean harmonic strength | **0.613** |
| Roll error in the inherited frame | **83.6°** |

With the frame square, the pale belly runs from about 110° to 250° round every station, centred on
ventral, where before it sat centred on a flank. That is the check, and it is the same check the
neck's roll gets.

### The mouth line, measured

**Placodus' cavity method does not reach this animal.** Casting every head vertex's own outward
normal back into the mesh — the measurement that found Placodus' oral cavity — finds **0 vertices
here** against Placodus' 120-plus. This generation has no modelled mouth slit at all: the snout is
one smooth closed tube and the mouth is *painted on it*. So the mouth line is read off the albedo
instead, which is what this build already does for the roll.

Per station, on each flank, walking **outwards from the belly** rather than inwards from the back —
the pale belly is one solid block and the step off it is sharp, where the dark back is mottled and
crosses mid-value several times — the light/dark boundary is the lip. The jaw is cut with planes, so
what the cut can follow is a ramp, and the measurement's job is to say *which* ramp:

| | Value |
| --- | ---: |
| Stations measured along the head | 24 |
| Flank-to-flank disagreement, maximum | 0.00499 raw (this animal is not symmetric) |
| Fitted ramp at the hinge | −0.00874 raw |
| Fitted ramp slope | 0.0519 |
| Measured line's worst distance from that ramp | 0.00117 raw, **0.142 of the local radius** |

The build refuses a fit worse than 0.20 of a local radius. The mouth line runs at −0.22 of the local
radius at the back of the head and −0.43 at the snout tip; the shipped rule was a flat −0.38 at both
ends, which in *magnitude* was not far off — the roll was the whole of the error.

### The lining, and the hole under it

The palate and the oral floor were two separate closed tubes, one rigid on the skull and one rigid
on the jaw. They part the moment the jaw swings and leave a wedge at the back of the mouth; and the
source material **culls its backfaces**, which is right for a closed shell and wrong for one cut in
half, so what showed through that wedge was the far side of the head.

There is now **one lining** on the head's own measured radius profile — 26 stations by 14, from
0.005 behind the hinge to 0.004 short of the snout, drawn in at both ends so it closes rather than
ending in a ring standing in open flesh — and it is *skinned* rather than split: the roof follows
the skull, the floor follows the jaw and the wall between them stretches, so no opening the clips
reach can part it. It is wound **inwards** and is the one material here that culls, because what an
open mouth shows is the far wall of the lumen and the near wall has to be got out of the way so the
fangs between them are seen. The skin is now double-sided, as the backstop under the lining rather
than in place of it.

`mouth-views.py` measures it: every transparent pixel that lies between the topmost and bottommost
opaque pixel of the head, column by column, is a hole straight through the animal. It photographs
each clip at the phase **its own gape is widest**, which is the aperture worth measuring, and it
frames in the **skull's own frame** rather than the world's — the neck now throws the head most of
two body lengths and turns it right over, so a camera held level to the world looks at the top of
the head and a silhouette curving through the frame encloses background that is not a hole at all.

| Gape see-through, side view, at peak gape | |
| --- | ---: |
| `Bite` | **0.04 %** of the aperture |
| `Attack` | **0.01 %** |
| `Heavy` | **0.01 %** |
| `NeckStrike` | **0.03 %** |
| `Idle` (mouth shut) | 0 % |

Against, on the same measure at `Bite` before the lining, **3.60 %**. On the *shipped* rolled frame
it read 1.56 % — lower only because the mouth barely opened at all.

It reads **dark** in a review render rather than red: CYCLES path-traces and almost no light reaches
the inside of a closed sac through a gape this narrow. The engine lights a surface by ambient
without occluding it, so in play it will not be. The measurement, not the shot, is what says the
hole is gone. `mouth-views.py` emulates the cull for the same reason Placodus' does — CYCLES ignores
`use_backface_culling`, and without the emulation a review shot shows the near wall the runtime
throws away and cannot be used to judge either fault.

**The fangs are on the jaws they belong to by construction**: two rows of conical teeth, the upper
rigid on `skull` and the lower rigid on `jaw`, authored either side of the measured seam rather than
cut out of source geometry — so there is no equivalent of Placodus' sawn chisels to find here. The
front pair are the largest; they interlock, and both rows read against the lining in the front view.

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
| Jaw hinge seated inside the head | 0.0168 raw | 1.0 % deep | inside |
| Neck root (`neck_00`) seated inside the chest | 0.0552 raw | 3.3 % deep | inside |
| Head frame's inherited roll error | 83.6° | corrected from the countershading | — |
| Measured mouth line vs. the fitted straight ramp | 0.00117 raw max | 0.142 of the local radius | < 0.20 |
| Gape see-through at peak gape, side view | 0.01–0.04 % of the aperture | `Bite` was 3.60 % | — |
| Mouth lining and fangs inside the intake surface | 0.0013–0.0037 raw | — | inside |

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
| NeckStrike | **32 / 32** | 0.82 | 31 / 31 | **36.6** |
| Ability | 32 / 32 | 0.83 | 31 / 31 | 20.7 |
| Periscope | 32 / 32 | 1.00 | 31 / 31 | 18.8 |
| Swim | 32 / 32 | 0.71 | 23 / 31 | 14.7 |

A hosepipe would show one joint with all the amplitude and thirty-one with none; the median joint
here carries 82 % of what the busiest one does. The strike **travels**: the shoulder end of the
chain peaks at phase 0.50 and the skull end at 0.79, and the build refuses a strike that does not
run down the chain in order. The head reaches 2.30 units while the chest moves 0.063 — the body
stays where it is, which is the animal's whole hunting kit and the roster's own description of the
ability. Periscope stands the skull 1.95 units above where Idle keeps it.

### The neck attacks

This animal is a long neck with a body attached, so a clip in which the neck merely follows the
trunk is a wasted clip. Nine of them are now built out of one shape — **cock, drive, follow through,
gather** — rather than out of a sine:

- `runs(u0, w, lead, ph)` is a bump that **runs down the chain**: joint `ph` starts it `lead · ph`
  of the clip after the shoulder does, so the shape arrives at the skull last. `sharp` above 1
  narrows it in place, which is what makes a strike read as committed rather than as a swell. It
  asserts `u0 + w + lead ≤ 1`, because a bump that has not finished at the skull by the last frame
  leaves a clip whose first and last poses differ and which therefore cannot be blended out of —
  which is exactly how the first pass of this work broke `Heavy`, at a seam of 4.7e-4.
- **NeckStrike** (1.4 s) and **Ability** (1.0 s) load into a deep lateral S with the head carried
  back and high, hold a beat, unroll it head-last, throw the skull through the target and down, and
  re-form the S the other way coming back. NeckStrike is the longer, deeper performance; Ability is
  the roster's tighter one. The throw is deliberately kept short of curling the head back under the
  shoulder: the first version reached a pitch of 1.05 rad across the chain and the head passed below
  and behind the fore paddle, which reads as a knot rather than as a strike.
- **Attack** (1.0 s) and **Heavy** (1.2 s) cock the neck back into an S with the head drawn up over
  the shoulders, then drive it forward and down, overshoot past straight and gather. The trunk shifts
  its weight behind the neck — back on the cock, forward as the chain unrolls — rather than doing
  the striking itself.
- **Bite** (0.5 s) is half a second, so the whole of it is the snap: a short sharp cock and a stab,
  at `sharp = 2`.
- **Eat** (1.7 s) throws the fish back head-up and then **swallows it**, and on a neck this long the
  bolus is something you can watch travel — skull to shoulder, against the direction everything else
  runs. It is `peristalsis()` rather than `runs()`: a travelling *bulge*, where each joint goes one
  way and then the other as the wave passes it, so the chain's net curvature stays about where it
  was. The same bump with one sign bends the whole neck progressively instead, and the first attempt
  at this read as the animal dropping its head under its own chest. Eat's resting head-down was also
  cut from 0.45 to 0.16, because at `NK` the old baseline was most of a right angle of neck and it
  buried the swallow.
- **Grab** (1.1 s) is no longer a sway: the neck braces back and hauls in heaves, with a worrying
  shake running out to the head between them.
- **Dodge** (0.5 s) sends the head first and the rest of the chain after it, so it reads as the
  animal taking its head off the line rather than sliding sideways.
- **Guard** (1.1 s) keeps the fold back over the shoulder — the only cover this animal has — but
  folded is also cocked, so it is held as a loaded S with the head drawn back and up, breathing.

The gape is timed to the strike rather than to the button: it parts on the cock, is widest as the
neck unrolls, and shuts on the follow-through, which is the frame the fish is in. Peak openings are
0.50 rad on Bite and Attack, 0.56 on Heavy, 0.52 on NeckStrike, 0.48 on Ability.

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
  above at its own seven beats (rest, the cock, the drive, the follow-through, the gather),
  Periscope, a turn and Guard. This is the sheet this animal is judged on.
- **[The neck as the actor in the rest of the clip set](paired-neck-attacks-sheet.jpg)** — Attack,
  Heavy, Ability, Bite, Eat, Grab and Dodge at the phases their performances turn on.
- **[The mouth, before and after](mouth-fix-sheet.jpg)** — the gape as shipped (a chip at the snout
  tip, cut off the side by the rolled frame), with the frame corrected but the two split tubes still
  parting, and with the one skinned lining under a double-sided skin. Three rows at `Bite`'s widest,
  from three-quarter, front and side, with the backface cull emulated. This one is a **record of the
  fix, not a reproducible artefact**: the first two rows are earlier states of the builder, and their
  cameras are the fixed world-space ones `mouth-views.py` used before it learned to frame on the
  skull, which is why the middle column changes what it is looking at between rows.

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
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/dinocephalosaurus/render.py -- --posed
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/dinocephalosaurus/render.py -- --decoded
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/dinocephalosaurus/render.py -- --decoded --puppet
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/dinocephalosaurus/mouth-views.py -- local/triassic-authoring/dinocephalosaurus/mouth
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
- **The portrait is a different shape from the playable body** — the generated pose against the
  straightened one, 3.32 units long against 5.5. That is what was asked for and it is defensible for
  a dramatic still, but it means the card is not evidence about the model, and a reviewer comparing
  the two should expect the neck to disagree. Nothing else about them differs: same vertices, same
  UVs, same albedo, same material.
- **The portrait camera is the one framing decision made by eye.** The fill fraction and the centring
  are measured off the subject, but which azimuth shows this pose was picked by looking at six of
  them. There is no measurement that says a pose reads.
- **The mandible's cut face shows when the jaw drops.** Opening the jaw swings the square the cut
  leaves at the hinge into view, and the hinge envelope — a sphere at 0.80/0.68/0.60 of the local
  head radius — does not quite cover it, so at full gape the back of the lower jaw reads as a blunt
  pale block. Placodus had the same thing and enlarged its envelope; this one has not been.
- **`Grab` still rears the neck a long way up** at the top of each heave. It reads as hauling, which
  is what it is for, but it is at the edge of what a held prey item would allow.
- **The lower jaw is 143 triangles.** The mandible is a genuinely small piece of a 5.5-unit animal —
  a slender snout on a body whose whole authored mesh is 21,276 triangles — but it is thin enough
  that the jaw reads as a blade rather than as a modelled mandible in a close-up, and the mouth's
  volume comes almost entirely from the authored lining rather than from the generation.
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
- ~~The head's roll is inherited, not independently verified.~~ **Closed, and it was wrong by 83.6°**
  — see above. The head's dorsal is now measured off its own countershading at harmonic strength
  0.613. What remains assumed is the head's *pitch* relative to the neck's last frame, which is
  fitted to the head's own slab centroids and checked only by looking.
- **There are no eye globes.** The generated head has sculpted eyes in its surface and albedo, and
  this build does not cut and seat separate globes, as Nothosaurus and Placodus do not. The pipeline
  contract asks for them; this is outstanding on all three.
- The mouth interior — lining, fangs and hinge tissue — is authored geometry scaled to the head's
  measured radius profile, not source detail, because there is no source detail: the generation has
  no modelled mouth. Three attempts put it in the wrong place: the first hung it off the neck's last
  frame rather than the head's own, the second used fixed offsets on a snout that tapers to
  r = 0.008, and the third — the one that shipped — built it all on a frame rolled 83.6°. Only the
  last of those was caught by a measurement (the countershading harmonic); the first two were caught
  by an assertion added after the fact, and the third by *looking at a render*. The build now asserts
  every oral vertex is inside the closed intake surface, clearing it by 0.0013 to 0.0037 raw, and
  the seating margin on the hinge tissue at 0.0013 is thin.
- **The twin's head is smoother than the authored head.** At 0.0050 voxels the remesh keeps the
  silhouette (the envelope agrees to 0.12 %) but loses the snout's fine creases and the eye relief.
  That is visible in the mouth-closed pair on the volume sheet and is what a reduced model is for;
  it is recorded rather than hidden.
- Living colours, soft tissues and movements are artistic reconstruction.
