# Coelophysis — the dinosaur at the water, and the other way to strike

The delivered Tripo body and its procedural twin share one **35-joint skeleton**, the same three
mouth/attack sockets and **29 byte-for-byte equivalent decoded animation performances**. The twin is
also the runtime LOD, with every clip retained so either model can perform the same gameplay.

This animal stands on the same beach as Tanystropheus, runs the same cycle in
`src/sim/triassic/shore.ts` — it is the one other shore animal besides the boom and the phytosaur
with a **reach** (`reachOf` gives it 0.6 of its length) — and moves in almost the opposite way, so
the two are worth reading against each other:

|  | Tanystropheus | Coelophysis |
| --- | --- | --- |
| Cervicals | 13, a stiff beam | 8, a theropod's S |
| Median ÷ max joint amplitude in the strike | **0.149** | **0.817** |
| Base's share of the chain | 0.330 | 0.159 |
| What the strike does | sweeps sideways from the shoulder | drives the head forward and down |
| The audit asserts | the base must drive it | the work must *spread* along it |
| It also has | Drag, Severed | Run, Charge, Retreat |

Both builds carry the same four clips the mechanic names — `Lower` at TELEGRAPH, `SnapLeft` and
`SnapRight` at the strike window, `Retract` for the recovery — and both hand over between them
rather than returning to rest. On top of that this one gets what the reviewer asked the two runners
for: a land gait, a dash into the shallows, and a retreat back up the beach.

| Delivery | Triangles |
| --- | ---: |
| `coelophysis.glb` — authored Tripo body | 20,950 |
| `coelophysis.puppet.glb` — procedural twin | 8,176 |
| `coelophysis.lod1.glb` — identical puppet alias | 8,176 |

The reduced model is **39.0 %** of the authored triangles, inside the contract's 40 %. Files are in
`public/assets/triassic/creatures/`, with studio, 1600 × 1200 transparent select, card and thumbnail
portraits and metadata; sizes and hashes are in `delivery-files.json`. The model is **4.897 engine
authoring units** long, faces +Z in glTF and uses +Y up. The design gives about 3 m.

## Source and reconstruction

The preserved source is `tools/triassic/creatures/coelophysis/tripo-raw/coelophysis.raw.glb`,
SHA-256 `a9ea66a7183de767367fe7943d69f5d07fe306d7794ca3a56403d596d3070118`. It welds to **one shell**
with nothing to remove, and the build asserts that. The raw file is never changed.

Like Macrocnemus, this body's axis is measured from **two declared seeds** rather than by a double
sweep, because its longest geodesic path runs **claw to tail tip**: it stands on two very long legs
and banding from the wrong end reads a shin as a neck. One run from the tail tip forward, one from
the snout back, meeting at the shoulder. The trunk was found lying 62° across the plan and is turned
onto +X before anything else happens.

### The tail, unbent; the neck, left alone

The greenlit canonical holds the tail straight out behind as the counterweight it is; the
generation sweeps it across the plan. Each cross-section is carried rigidly onto a target of the
same segment lengths **and the same per-segment rise**, so the lift the pose gives the tail
survives, and the correction is gated by distance to the tail's own polyline so it cannot swing a
hind leg round with it.

| | |
| --- | ---: |
| Stations measured | 51 |
| Tail arc | 0.6742 raw |
| Total turning of the centreline | 93.3° |
| Largest vertex move | 0.2311 raw |

The neck is not touched. Its S is the animal.

### The head is not on the midline, and the neck runs under it

Two facts about this generation decide how the mouth is cut.

**The skull sits 0.0143 raw units off the body's centre** — it is drawn, not mirrored — so the
hinge, the lumen, the tooth rows and all three anchors are built on the head's own lateral axis,
interpolated per station from the head's own measured sections.

**The neck curves under and behind the head.** At the hinge station there is neck below the mandible
at the same x, so a cut that asked only "forward of the hinge and below the seam" would take the
throat with it. `is_jaw` carries a floor at the head's own measured underside.

And the hinge itself is taken from the head's measured span — a third of the way back from the
snout — rather than from the skull *bone*, which sits two thirds of the way to the tip and left a
mandible only 40 % of the head long on the first pass. A theropod's jaw is nearly the whole skull.

### The mouth

The normal-casting instrument that finds a modelled oral cavity (193 vertices on Placodus) finds
**81** here, restricted to the measured head. That is a shallow crease rather than a lumen, and it
is not enough to place a seam on, so the seam is read the way Tanystropheus' and Macrocnemus' are:
off the **painted mouth line** in the source albedo, per station, as the split in height that most
separates dark above from pale below.

- The line measures at **0.602 of the head's own section** with a median contrast of **0.272** in
  linear luminance, which the build asserts before it cuts anything. It sits high because a
  theropod's mandible is deep — this is a skull with a long jaw and a small braincase, not a
  gharial's tube.
- The relief the head carries — brow and lip ridges — is recorded patch by patch with how each fell
  either side of the cut, and the build refuses a raised patch halved by the seam with real relief
  on both sides.
- Small recurved blade teeth are **authored** into the lined lumen, eight stations each side on both
  jaws. The generation models none.
- Every oral vertex is finally seated by the depth probe, drawn radially towards the mouth's own
  axis until it is inside; the worst depth after seating is asserted positive.

The depth probe is **ray parity** in three jittered directions rather than nearest-triangle-normal,
because on a standing animal the nearest surface to a point on the midline at the hips is the inner
face of a thigh, whose normal points across the midline. Three consequences, each measured rather
than chosen: the trunk axis is the straight line between the two measured ends; the pelvis bone sits
a third of the trunk forward of the hip band's centroid, which measures outside the animal; and the
caudal chain starts 8 % along the tail, found by walking forward until the probe says the station is
inside.

### The twin

A procedural volume resurfacing from a **0.0034** raw-unit voxel occupancy field (92,060 triangles),
relaxed once and reduced to the puppet budget. No source vertex or face is reused. Puppet pigment is
sampled through each nearest source triangle's interpolated UV. The authored body keeps the full
embedded original albedo with white vertex colors, restrained normal relief (0.15) and nonmetallic
skin at roughness 0.7.

## Measurements

| Measure | Value | As % of the 4.897-unit body | Tolerance |
| --- | ---: | ---: | --- |
| Maximum envelope difference (21 slab stations) | 0.0201 | **0.41 %** | 4 % |
| Nearest twin-surface distance, 95th percentile | 0.0426 | 0.87 % | — |
| Nearest twin-surface distance, 99th percentile | 0.1584 | 3.23 % | — |
| Nearest twin-surface distance, maximum | 0.2396 | 4.89 % | — |
| Authored vertices further than 3 % of body length from the twin | **137 of 10,172** | 1.4 % | — |
| Appendage roots seated inside the intake surface | 0.0100–0.0131 raw | 1.0–1.3 % deep | inside |
| Weights per vertex | max 4, mean 2.14 | — | ≤ 4, normalised |

**The surface tail is this delivery's weakest measured number and is worth stating plainly.** The
envelope tolerance the contract sets is met twelve times over, and 95 % of the authored surface is
within a hundredth of body length of the twin — but 1.4 % of vertices are more than 3 % out, where
Tanystropheus has none at all. Those are the **hands**: this animal's arms are the thinnest thing on
any of the three bodies and a 0.0034 voxel field rounds their fingers off. A finer field would fix
it and would cost the twin's triangle budget, which is already at 39.0 % of 40 %.

## Rig and motion

Root, body, chest, **eight cervicals**, skull, jaw, ten caudal controls and three controls per limb
— 35 joints. Skinning is parameterised by arc length along measured polylines.

| Clip | s | | Clip | s | | Clip | s |
| --- | ---: | --- | --- | ---: | --- | --- | ---: |
| Idle | 3.0 | | Bite | 0.4 | | Crawl | 1.4 |
| Swim | 1.6 | | Heavy | 0.9 | | **Run** | **0.58** |
| Sprint | 1.0 | | Hit | 0.5 | | **Charge** | 1.0 |
| TurnLeft | 1.4 | | Death | 1.6 | | **Lower** | **1.5** |
| TurnRight | 1.4 | | Guard | 1.0 | | **SnapLeft** | **0.6** |
| Dive | 1.2 | | Parry | 0.3 | | **SnapRight** | **0.6** |
| Rise | 1.2 | | Dodge | 0.4 | | **Retract** | 0.9 |
| Attack | 0.8 | | Eat | 1.4 | | **Retreat** | 1.2 |
| Ability | 1.0 | | Stagger | 1.0 | | Grab | 1.0 |
| Breath | 2.0 | | Growth | 1.4 | | | |

Idle, Swim, Sprint, Guard, Eat, Grab, Crawl and Run loop exactly. Grab is a 1.0 s held loop. Every
clip but Death, Lower and Retract closes on itself; those three are open because Lower and Retract
are the two ends of the shore chain. Root motion and scale animation are absent.

### The shore chain

    Idle     the watch
    Lower    rest → crouched, held         (1.5 s, TELEGRAPH in shore.ts)
    Snap     crouched → strike → crouched  (0.6 s, the strike phase there)
    Retract  crouched → rest               (0.9 s, the recovery)

`crouch` is the pose the mechanic holds: the body dropped over the water, the neck folded back into
its S and the head brought forward and down. The build asserts the handovers on the pose vectors
(exact zero) and the audit asserts them again on every skinned vertex of the packaged model.

**The strike drives, it does not sweep.** Where Tanystropheus swings a beam sideways from the
shoulder, this head goes *forward and down* off the neck's S and turns onto the catch. Getting that
to read took one correction worth recording: a uniform down-pitch of the cervicals swings the head
along an arc about the shoulder, which takes it down and **backwards** — the first pass reached
0.08 units forward while dropping eight times that. The S has to *straighten*: the shoulder end
pitches down and the head end pitches up, so the neck extends, and the body lunges under it.

| Measured on the packaged body | SnapLeft |
| --- | ---: |
| Cervicals working | 8 / 8 |
| Joints peaking in order, shoulder → skull | 6 / 8 |
| Peak phase, shoulder → skull | 0.39 → 0.44 |
| **Median ÷ max joint amplitude** | **0.817** |
| Base's share of the whole chain | 0.159 |
| Skull drop into the water | −0.744 |
| Skull reach forward | +0.329 |

### The run, and the water

**Run** is a theropod's: the legs alternate half a cycle apart (measured gap 0.475), the body leaves
the ground twice a cycle (its height crosses its own midpoint four times, rising 0.236 units), and
the hindlimbs swing through **2.21×** what the little arms do. It out-strides the walk by 57 %.

**Charge** is the dash into the shallows — crouch and load, launch, three driving strides, then the
water takes the legs and the body pitches down as it wades in — and returns to the stand it started
from. **Retreat** turns the animal away over its first third (the tail tip swings 2.93 units) and
then four fast strides out of the water with the head twisted back to check. **Ability** is the
roster's own Snatch at its own 1.0 s, deliberately a different performance from the shore chain.

**Crawl** is the walk at the post — the renderer's ground loop, so it is what a player sees a
standing Coelophysis doing. **Idle** is the drink-and-watch: the ribs work, the weight shifts, the
head snaps round once to look and settles back.

## Verification

`node tools/triassic/creatures/coelophysis/audit.mjs --package --decode` binds the checks to the
final packaged hashes: exact paired joint names, hierarchy, local rest transforms, inverse bind
arrays, socket transforms and metadata, clip names, timing and every sample array; that the eight
cervicals and the ten caudals are chains; normalised weights; unique dynamic clips; loop seams; no
root or scale channels; Grab's duration; that Lower is exactly 1.5 s and the snaps exactly 0.6 s;
and the 40 % LOD cap. It then plays 61 phases of every clip on both models through the Three.js
GLTFLoader and AnimationMixer, evaluating actual skinned vertices, and runs the shore-chain, strike,
Run and Charge/Retreat assertions above over 121 phases.

The Blender build additionally checks every vertex of both bodies at 13 phases of all 29 clips,
asserts the painted mouth line has contrast to read, refuses a raised patch halved by the seam,
refuses any root or oral vertex it cannot seat inside the body, refuses a strike that does not run
down the neck in order, and refuses a handover that does not close.

Sheets, rendered from the decoded packaged files through identical cameras and lights for both
models:

- **[The strike, side and top, phase by phase](paired-strike-sheet.jpg)**
- **[The stride and the dash](paired-gait-sheet.jpg)**
- [Side, top, front, belly and mouth comparison](paired-volume-sheet.jpg)
- [Paired deformation](paired-deformation-sheet.jpg)
- [Remaining actions](paired-actions-sheet.jpg)
- [This animal's own clips](paired-shore-sheet.jpg)

No independent human review is invented by this automated QA record.

## Reproduction

```sh
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/coelophysis/build.py
node tools/triassic/creatures/coelophysis/audit.mjs --package --decode
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/coelophysis/render.py -- --decoded
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/coelophysis/render.py -- --decoded --puppet
python3 tools/triassic/creatures/coelophysis/contact-sheets.py
node tools/triassic/creatures/coelophysis/delivery-record.mjs
node tools/triassic/review-bodies.mjs
node tools/update-asset-sizes.mjs
```

The paired editable Blender project, decoded review GLBs and individual frames live in
`local/triassic-authoring/coelophysis/`. `build.py` authors both geometry and performance and writes
only this species' asset family; it touches no shared registry and performs no git operation. The
generic intake machinery it calls is `tools/triassic/creatures/shorekit.py`, shared with
Tanystropheus and Macrocnemus, which were built in the same pass.


## Worked, not authored

`CLAUDE.md`: on a Tripo-sourced body **what may be authored is decided by how simple the shape is**,
not by a list of parts — closing a hole is always fair game, foot webbing is within reach, a spiral
of a hundred and fifty tooth crowns is not — and *whatever is authored must wear the creature's own
texture*, taking its UVs from the surrounding surface so it is not a smooth flat-shaded island in a
pored hide. The first move is still to reshape what the generation already carries, because geometry
taken from the body always matches the body.

This build predates that rule being written down, so here is the audit against it, part by part.

| Part | Shape invented | Texture |
| --- | --- | --- |
| Body | None — the welded intake surface, reshaped | The source albedo, untouched |
| Lower jaw | None — the same surface, cut along the measured mouth line | " |
| Procedural twin | None — the intake *volume* resurfaced | Vertex colours sampled from the same albedo |
| Seated jaw hinge tissue | An ellipsoid closing the square face this build's own cut leaves | **The creature's own**, see below |
| Oral cavity lining | A tube on the head's measured section | Its own — it is a mouth, not hide |
| Upper and lower tooth rows | Small recurved cones | Their own, for the same reason |

**Nothing invents much shape.** The only exterior-facing authored geometry is the hinge plug, and it
is an ellipsoid filling a hole this build made — the simplest case the rule names, and one that
would not exist at all if the jaw were not cut. No new anatomy is modelled beside the generation.

**The hinge plug wears the skin.** It used to carry a flat brown material, which is exactly the
"smooth flat-shaded island in a pored hide" the rule is about. `wear_the_skin` in `shorekit.py` now
gives every one of its 360 loops the UV of the point on the intake surface nearest it and hands it
the body's own material, so it samples the same albedo as the skin it closes and the texture runs
continuously across the join. The build asserts that no loop is left unprojected. It is done after
`seat_inside`, so the UVs answer where the patch finally sits, and the packaged file carries one
material fewer than before.

The lining and the teeth are deliberately left on their own materials: they are interior, they are
meant to read as a mouth rather than as hide, and the reviewer has said the lining is fine as it is.
All three are pulled inside the intake surface before export and the build asserts it — the
shallowest oral vertex sits 0.00121 raw units *inside* the closed surface, so the teeth embed in flesh
and protrude into the lumen rather than standing on the skin.

The blocking defect in **What is still open** below is skinning, not geometry, so this rule does not
stand in the way of fixing it: no part of the answer involves modelling anything.

**Foot webbing was considered and is not wanted here** either. The rule names it as within reach and
this is the animal whose feet are most on show, but the generation's feet are closed surfaces with
separated digits and no holes to fill, and a Chinle theropod at the water's edge is not an animal to
give webbed feet to. What its feet actually need is the skinning fix, not more geometry.

## What is still open

- **Its builder briefly stopped running mid-pass, and the reason is worth keeping.** `build.py`
  refuses a mouth line outside `.15 < JAW_FRACTION < .65`, and while `shorekit.Albedo` was being
  reconstructed without its sRGB decode this head measured 0.656 — so the build stopped, correctly.
  The decode restored it to 0.6016233241902793, against the original's 0.6016233241902793, and the
  body now rebuilds to its original 20,950 triangles. Nothing was widened to make that happen; the
  assertion was right and the sampler was wrong. The kit's header note has the whole story, and the
  lesson is that a monotonic change to the luminance is not neutral here — the seam is the split
  that maximises a difference of means, which no curve leaves alone.

- **The hands are the twin's weak point** (see the measurements above): 1.4 % of authored vertices
  are more than 3 % of body length from the twin, all of them in the arms and fingers.
- **The forelimb chain is the least certain measurement in this build.** The hindlimbs and the tail
  came out of clustering the below-belly geometry, which separates them cleanly; the arms are tucked
  against the chest and cluster *with* it, so their elbow and wrist are placed from the chest-height
  banding and the canonical pose rather than measured joint by joint. They are small and they
  deform without artefacts, but they are the one part of this rig placed by eye.
- **The teeth are a reconstruction**, as on the other two: the generation models none.
- **There are no eye globes**, as across the era.
- **The limbs are posed and asymmetric** — the generation is drawn mid-stride — and the rig is built
  to each limb's own axis rather than making them match.
- **The shore chain is wired; the run is not.** `reachOf` in `src/sim/triassic/shore.ts` gives this
  animal `L * 0.6`, so it reaches the `lower`, `strike` and `rest` phases and `shoreClip` names
  `Lower`, `SnapLeft`/`SnapRight` and `Retract` — those four play. `Run`, `Charge` and `Retreat`
  have no caller, for the same reason as Macrocnemus': a shore animal is pinned to its post every
  step, so there is no phase in which it travels. They are there for the mechanic the design
  describes (S04: it "snatches a hatchling or anything small in the last stretch of shallows and
  otherwise ignores the water") once something asks a shore animal to move.
- `Run`'s and `Charge`'s cadences are authored judgements, not numbers taken from a speed the
  simulation uses: nothing in `src/sim` asks a shore animal to move.
- Living colours, soft tissues and movements are artistic reconstruction.
