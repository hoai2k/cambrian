# Tanystropheus — the boom, unbent, and the clip set `shore.ts` was waiting for

The delivered Tripo body and its procedural twin share one **38-joint skeleton**, the same three
mouth/attack sockets and **28 byte-for-byte equivalent decoded animation performances**. The twin is
also the runtime LOD, with every clip retained so either model can perform the same gameplay.

Two things make this delivery what it is.

**The neck is animated as the fossils describe it.** Thirteen hyperelongate cervicals, braced
underneath by rib bundles that blocked ventral flexion, with overlapping zygapophyses that limited
lateral bending and low neural spines that gave the dorsal muscles almost no leverage — a nearly
rigid beam swung as a unit from its base, striking with a fast **sideways snap of the skull**
(Renesto & Saller 2018; Spiekman et al. 2020, *Current Biology* and *PeerJ*). So this is not
Dinocephalosaurus. Where that animal's audit demands an even share of the arc across thirty-two
joints, this one measures the base's share and asserts it stays *large*. The strike still travels
down the chain in order — a beam is not one hinge — but a third of every neck angle is in the first
joint by design.

**The clips are the ones `src/sim/triassic/shore.ts` says it is waiting for.** That file's own
comment read *"the strike is a hit and an event, not yet a clip, so nothing here depends on an
animation that does not exist"*. `Lower` is 1.5 s because `TELEGRAPH` is 1.5 s; `SnapLeft` and
`SnapRight` are 0.6 s because that is how long the strike phase is held; `Retract` is the recovery
off it. The three hand over to each other rather than each returning to rest, and both the build
and the audit check that handover on the actual skinned body. `shore.ts` now names them
(`shoreClip`) and the renderer plays them (`EraRules.clip`), so the telegraph a player sees on the
HUD is the telegraph the animal performs.

| Delivery | Triangles | Packaged bytes |
| --- | ---: | ---: |
| `tanystropheus.glb` — authored Tripo body | 20,734 | see `delivery-files.json` |
| `tanystropheus.puppet.glb` — procedural twin | 8,078 | " |
| `tanystropheus.lod1.glb` — identical puppet alias | 8,078 | " |

The reduced model is **39.0 %** of the authored triangles, inside the contract's 40 %. It is tighter
than Placodus' 38.9 % or Dinocephalosaurus' 38.0 % for a reason worth knowing: this animal's
authored skin is unusually *cheap* — 19,298 triangles stretched over a very thin body — while the
shared mouth interior (1,096 triangles of lining, fangs and hinge tissue) is a fixed cost paid once
on each model. The lining and the fangs were drawn with the fewest rings that still follow the
taper for exactly that reason.

Files are in `public/assets/triassic/creatures/`, with studio, 1600 × 1200 transparent select, card
and thumbnail portraits and metadata. Meshopt packaging preserves mesh attributes and animation
sample values exactly; textures are embedded. The model is **5.159 engine authoring units** long,
faces +Z in glTF and uses +Y up; the runtime normalises by the bounding box and applies the species'
natural size. The research registry gives 5.25 m as the representative length for *T. hydroides*.

## Source and reconstruction

The preserved source is `tools/triassic/creatures/tanystropheus/tripo-raw/tanystropheus.raw.glb`,
SHA-256 `b4ca21e0cfaec7f6ed3c332cb57162658a977c49833b5c44812cbf0cb4853af2`, from Tripo task
`aa7cb744-2664-426b-9e1e-a21ff6e96ec8`. The raw file is never changed.

Intake welds the texture-seam duplicates and removes **one** thing: the conspicuous detached, thin
textured island beside the neck that the source checkpoint's own static review found in the top and
three-quarter views, 114 vertices of it. The build asserts that is the only component dropped, so a
future regeneration that arrives with different debris stops here rather than silently losing a
limb.

### The pose, and the unbend

The greenlit canonical (`docs/triassic/canonical/tanystropheus.png`) stands the animal on a rock
shelf with its neck held out **dead straight** over the water — which is also exactly the pose the
game needs, because that is what a shore animal does at its post. The generation reproduced the
animal faithfully and then swept the neck a third of a body width across the plan and the tail the
other way. By the pipeline's own rule the model is the thing that is wrong.

The correction is Placodus' rigid-section carry, extended by Dinocephalosaurus and extended again
here in two ways.

- **The target keeps each segment's own rise.** Dinocephalosaurus' target is a curve in space;
  this one turns only the *heading in plan* (`yaw_straight_target` in `shorekit.py`), eased over the
  first fifth of the run, and leaves every segment's vertical component exactly alone. So the neck's
  gentle decline towards the head and the lift of the tail tip — both of them in the pose — survive
  the correction untouched, and only the sideways wander is taken out.
- **The carry is gated by distance to its own axis, not just by station.** A hind foot sits
  *behind* the tail's base station, so an axial gate swings the whole hindlimb round with the tail:
  on Macrocnemus that folded the surface at the hip badly enough that the tail's own centreline
  measured outside its own tail. `carry_run` requires a vertex to be within 2.6 section radii of the
  run's polyline as well as past the cut.

| | neck | tail |
| --- | ---: | ---: |
| Stations measured | 46 | 21 |
| Arc | 0.6775 | 0.2917 |
| Total turning of the centreline | 63.8° | (noisy; a short run) |
| Largest vertex move | **0.3851** raw | 0.0554 raw |
| Mean lateral offset of the far end, before → after | −0.158 → +0.147 | 0.200 → 0.158 |

The neck's end offset moves to where the body's own midline is (the body is centred on the median
y of all its vertices, which the trunk dominates), so "before −0.158, after +0.147" is the neck
arriving on the trunk's line. Largest vertex move is 30 % of the finished body length, which is the
honest price of the pose; no section changes shape, and `UNBEND = False` at the top of `build.py`
rebuilds the body exactly as Tripo returned it.

### The mouth: what this head actually is

Placodus and Dinocephalosaurus both carry a *modelled* mouth — a slit with an interior, which their
builders find by casting every head vertex's own normal back into the mesh and measuring the cavity
the hits describe. Run the same instrument on this head and it answers with **one vertex**
(Placodus: 193). There is no cavity here. The generated skull is a closed taper, the mouth is
**painted** on it, and the fish-trap fangs the skull CT is known for are not modelled at all — the
build measures nothing standing proud of the snout's own smoothed surface anywhere.

So the seam is measured differently, and the method is stated for what it is.

- **Where the mouth is, comes off the albedo.** The snout is dark above a line that runs its whole
  length and the mandible below it is white. Per station across the snout the flank vertices are
  sorted by height within the head's own measured section and the split that most separates dark
  above from pale below is found; the median of those splits is the seam and the contrast across it
  is the strength of the signal. This is Dinocephalosaurus' move — it reads its neck's *roll* off
  its countershading — applied to a mouth line instead.
- **The numbers.** The painted line sits at **0.2116 of the head's section** above its floor, with a
  median contrast of **0.227** in linear luminance, which the build asserts is above 0.04 before it
  cuts anything. The geometric crease is measured too and recorded beside it as a cross-check: its
  median lands at 0.613 with an interquartile range of 0.214 across fourteen stations, which is to
  say it wanders from a twentieth of the section to nine tenths of it and **cannot carry a cut**.
  That is why the pigment is what the seam is placed on.
- **The seam follows the head's own taper** rather than being a plane or a fitted curve: it is that
  one fraction of the measured section at every station, and the cut is taken by shearing the curve
  onto a plane, bisecting there and shearing back, so every vertex the cut adds lands on the seam.
- **The fangs are authored**, as Dinocephalosaurus' conical fangs are: twenty long recurved
  interlocking cones, ten on each jaw, leaning back towards the throat as a fish trap's teeth do,
  seated by a fraction of the measured lumen so they cannot end up outside the head.
- **The lining is one closed sac** on the measured section, wound inwards and culling its
  backfaces, with the skin double-sided underneath it as the backstop. The floor follows the jaw,
  the roof the skull, and the wall between them stretches, so no opening the clips reach can part
  it.

Finally, **every oral vertex is seated by measurement**. Dinocephalosaurus put its mouth outside
the animal twice before an assertion caught it, and the fix there — fit the head frame properly —
is necessary and not sufficient on a head this small: a smooth interpolation of a 300-vertex section
cannot promise to stay inside it. `seat_inside` draws every vertex of the lining, the fangs and the
hinge tissue radially towards the mouth's own axis until the depth probe says it is in. The
corrections it needed are recorded (0.011–0.020 raw) and the final worst depth is **+0.0012 raw
inside**, asserted.

The depth probe itself was rewritten for these three animals and the reason belongs here. The
obvious signed-distance test — nearest triangle, sign from its normal — is wrong exactly where a
standing animal's builder needs it: at the hips the nearest surface to a point on the midline is the
*inner face of a thigh*, whose normal points across the midline, so a point plainly between the
belly and the backbone reads as outside. It is now **ray parity** in three jittered directions with
a majority vote.

### The twin

A procedural **volume resurfacing**, not a decimation of the authored faces: Blender regenerates
topology from a 0.0040 raw-unit voxel occupancy field (55,356 triangles), relaxes it once and
reduces the new topology to the puppet budget. No source vertex or face is reused. The field is
finer than Placodus' 0.0055 because a neck of radius 0.020 has to survive the remesh as a neck.
Puppet pigment is sampled through each nearest source triangle's interpolated UV. The authored body
keeps the full embedded original albedo with white vertex colors, restrained normal relief (0.15)
and explicitly nonmetallic skin at roughness 0.7.

## Measurements

`tanystropheus-profile.json` records **21 envelopes of both actual meshes** (body and lower jaw
together).

| Measure | Value | As % of the 5.159-unit body | Tolerance |
| --- | ---: | ---: | --- |
| Maximum dorsal/ventral/width envelope difference | 0.0353 | **0.68 %** | 4 % |
| Nearest twin-surface distance, 95th percentile | 0.00560 | 0.11 % | — |
| Nearest twin-surface distance, 99th percentile | 0.00893 | 0.17 % | — |
| Nearest twin-surface distance, maximum | 0.01552 | 0.30 % | — |
| Authored vertices further than 3 % of body length from the twin | **0 of 9,909** | — | — |
| Appendage roots seated inside the intake surface | 0.0134–0.0348 raw | 1.0–2.7 % deep | inside |
| Jaw hinge seated inside the head | 0.0059 raw | 39.6 % of the local head radius | inside |
| Mouth interior, worst vertex | +0.0012 raw inside | — | inside |
| Weights per vertex | max 4, mean 2.27 | — | ≤ 4, normalised |

The envelopes are taken as **slabs one station thick**, not as infinitesimal plane intersections,
and that is a deliberate change of instrument. A plane intersection is right for a body whose
appendages run across it and wrong for a body whose legs run *along* it: a leg that begins a
thousandth of a unit either side of the plane is in one section and absent from the other, and the
first measurement here reported a whole limb's width (5.4 % of body length) of disagreement between
two surfaces that are everywhere within a third of a percent of each other. The plane intersection
is still taken at every station and unioned in.

Joint and socket coordinates are shared, so their parity error is exactly zero. These are generated
measurements, not a claimed human anatomical sign-off.

## Rig and motion

The shared rig is root, body, chest, **thirteen cervicals** (`neck_00` … `neck_12`, as the fossils
count them), skull, jaw, eight caudal controls and three controls per limb — 38 joints. Skinning is
parameterised by **arc length along measured polylines** rather than by a body axis: the axial chain
projects each vertex onto a 25-point centreline so weight bands stay square to the body all the way
down the neck, and each limb projects onto its own root → elbow → wrist → toe polyline. A vertex
whose nearest axial point is on the neck but which is nowhere near the neck is pulled back onto
`chest`, which this body needs more than Dinocephalosaurus does, because a 0.020-radius neck leaves
a chest whose arc positions are adjacent to it. Every vertex has normalised nonzero weights and at
most four influences (mean 2.27).

| Clip | s | | Clip | s | | Clip | s |
| --- | ---: | --- | --- | ---: | --- | --- | ---: |
| Idle | 3.2 | | Bite | 0.5 | | Growth | 1.5 |
| Swim | 2.2 | | Heavy | 1.2 | | Crawl | 2.2 |
| Sprint | 1.4 | | Hit | 0.6 | | **Lower** | **1.5** |
| TurnLeft | 1.8 | | Death | 2.0 | | **SnapLeft** | **0.6** |
| TurnRight | 1.8 | | Guard | 1.2 | | **SnapRight** | **0.6** |
| Dive | 1.4 | | Parry | 0.4 | | **Retract** | 0.9 |
| Rise | 1.4 | | Dodge | 0.5 | | **Drag** | 1.6 |
| Attack | 1.0 | | Eat | 1.8 | | **Severed** | 2.2 |
| Ability | 1.0 | | Stagger | 1.2 | | Grab | 1.1 |
| Breath | 2.4 | | | | | | |

Idle, Swim, Sprint, Guard, Eat, Grab, Crawl and Drag loop exactly (seams close to 1e-17). **Grab**
is a 1.1 s held loop, inside the 0.9–1.2 s the contract asks for, and the audit checks both the
duration and the seam. Root motion and scale animation are absent.

### The shore chain

Four clips, one performance. `lowered` is the pose the mechanic actually holds — the head dropped a
hand's breadth with the neck gone rigid, which is the design's own description of the telegraph —
and the chain is:

    Idle     the watch: the head does not move, and that is the point
    Lower    rest → lowered, held                (1.5 s, TELEGRAPH in shore.ts)
    Snap     lowered → strike → lowered          (0.6 s, the strike phase there)
    Retract  lowered → rest                      (0.9 s, the recovery off it)

So `Lower`'s last frame *is* `SnapLeft`'s and `SnapRight`'s first frame, and a Snap's last frame is
`Retract`'s first. The build asserts that on the pose vectors and the audit asserts it again on
every skinned vertex of the packaged model through Three.js: the worst disagreement is **1.2e-8
units**. Every other clip in the set closes on itself; Death and Severed end where they fall, and
Lower and Retract are deliberately open because they are the two ends of this chain. A telegraph
that ended back at rest would be a telegraph that un-telegraphed.

`Lower` is not a smooth sine either. The drop comes in one committed movement between 0.08 and
0.55, overshoots a little, settles, and the last third is held absolutely still — which is what a
second and a half of warning is *for* — with the ribs still working underneath so the animal is not
a statue. Measured on the skinned body, the head travels **0.872 units** over the clip, 17 % of the
animal's length.

`Snap` is four beats and not one of them is a sine: a last cock *against* the swing (0.00–0.20), the
boom sweeping across and **down into the water** as one beam driven from its base (0.10–0.36), the
skull whipping through the last of it a beat after the shoulder (0.28–0.60), and the follow-through
the whole body is rocked by, settling back to the watch-lowered pose (0.50–1.00).

| Measured on the packaged body | SnapLeft | SnapRight | Ability |
| --- | ---: | ---: | ---: |
| Cervicals working | 13 / 13 | 13 / 13 | 13 / 13 |
| Joints peaking in order, shoulder → skull | 12 / 13 | 12 / 13 | 12 / 13 |
| Peak phase, shoulder → skull | 0.39 → 0.44 | 0.39 → 0.44 | 0.53 → 0.63 |
| Median ÷ max joint amplitude | 0.149 | 0.149 | 0.148 |
| **Base's share of the whole chain** | **0.330** | 0.330 | 0.334 |
| Skull travel ÷ chest travel | **25.2** | 25.2 | 19.3 |
| Skull drop into the water | −0.655 | −0.655 | −0.587 |

Read the middle two rows together. A hosepipe would show one joint with all the amplitude and
twelve with none; a Dinocephalosaurus shows a median joint carrying 81 % of the busiest one. This
animal shows 15 % — because it is a *beam*, and a third of the arc is in the first joint. The
assertion is written that way round on purpose: the audit refuses a base share below 0.20 and a
dead cervical, and it refuses a strike that arrives everywhere at once. `SnapLeft` and `SnapRight`
are mirror images and the audit checks the skull actually goes to opposite sides.

The reach is the animal's whole point: the head travels **2.80 units** while the chest moves 0.11.

`Retract` is the other half of the strike and, at this reach, as much of what the strike reads as.
The head comes up out of the water, a shake throws the water off it (skull yaw and roll at 7 Hz over
0.34–0.74), and the body resettles onto all four at the post.

`Severed` is the one way to clear a bank: a rung III or IV bite at the middle of the neck takes it
clean through (Spiekman & Mujal 2023, and `shore.ts`). The tension leaves the chain from the bite
outward — the front of the neck goes first and the collapse runs back to the shoulder — while the
trunk spasms away from the bite and goes down where it stands. The first pass of this clip gave
every cervical a fifth of a radian and wound thirteen of them into a closed ring, which is a
hosepipe's death and not a boom's; the droop is now a **total** angle for the whole chain (1.45 rad,
front-weighted), as every other neck angle in this file is. The audit checks the head drops (0.54
units) and that the far end goes slack before the base does (0.35 against 0.025).

`Drag` is the haul up the beach the design asks for: surges backward against the weight with the
neck raised and the feet braced, the head shaking the catch between hauls. `Ability` is the
roster's own Boom strike at its own 1.0 s — the whole act compressed into one gesture that begins
and ends at the post — and is deliberately a different performance from the Lower/Snap/Retract
chain, not the same clip twice.

### Crawl, and the rest

`Crawl` is the walk at the post, and the thing that makes it this animal is that the boom **does not
bob**: diagonal couplets, the belly low, the feet reaching, and the neck carried like a plank the
whole way through. Measured: the feet travel 0.45 units fore-and-aft while the skull rises 0.075.
The audit asserts the skull's rise stays under half the foot travel.

`Swim` and `Sprint` are hindlimb-driven bursts with the neck held out and steady, which is what the
research gives this body — it has no fast-swimming kit at all and is not a pursuit predator.
`Guard` brings the boom back over the shoulder, which is the only cover it has. Turns bank the torso
and propagate both a cervical and a caudal steering curve. These clips supply body performance;
world travel remains engine-owned.

## Wiring

`shore.ts` is wired, and the change is small and one-directional.

- `EraRules.clip?(a)` is a new **presentation-only** hook: the clip an era wants played on a body
  the shared state machine has nothing to say about. Shore animals are pinned and brainless, never
  enter `attack` or `ability`, and would otherwise watch, telegraph and strike entirely in Idle.
- `shoreClip(a)` in `src/sim/triassic/shore.ts` reads the phase the step has already decided and
  names a clip and a duration. It writes nothing, so a replay is unaffected by whether anyone was
  watching. The post is found through a `WeakMap<Actor, Post>`, because the renderer has no `Game`
  to ask with and an Actor belongs to exactly one match.
- `src/render/creature.ts` asks for it once per frame and fires a one-shot when the name changes,
  **only if the loaded model has that clip**. Every body that does not — the borrowed Devonian
  stand-ins the roster still uses, Mystriosuchus, anything in the other two eras — is exactly as it
  was.
- The **sever** names `Severed`. `kill()` would otherwise route the one death this animal has its
  own clip for to the shared `Death` one-shot, so the post carries a `severed` flag that outlives
  `cleared` — `cleared` stops the step loop, the flag is what `shoreClip` reads — and the neck goes
  down the way it was authored to while the carcass lies on the bank.
- Which **side** the head goes is taken from the animal's own facing, not from a comparison of
  world x. `src/render/creature.ts` states the convention: increasing yaw turns a creature to its
  left, so its right is `(-cos yaw, 0, sin yaw)`, which at the pinned `yaw = PI` is **+x**. The
  first version of this read "larger x is to its left" and so named the snap that swings the head
  *away* from what it is striking — a bug no other check here could see, because the hit lands
  either way. `sideOf` asks the facing.
- `tools/triassic-test.ts` covers all of it: the telegraph names `Lower` at 1.5 s, the strike names
  a snap at 0.6 s, a target on each side is struck with the snap that goes toward it, the severed
  neck names `Severed` at 2.2 s, and a body that is not on a post is left to the shared state
  machine.

What is **not** wired: `Drag` has no caller. `shore.ts` does not take a hold today — its
snack-sized second bite is an `applyHit`, not a `takeHold` — so there is nothing being dragged up
the beach to play it over. It is one line in `shoreClip` once the mechanic takes a hold, and the
clip is there waiting.

## Verification

`node tools/triassic/creatures/tanystropheus/audit.mjs --package --decode` binds the checks to the
final packaged hashes. It asserts exact paired joint names, hierarchy, local rest transforms,
inverse bind arrays, socket transforms and metadata, clip names, timing and every sample array; that
the thirteen cervicals really are a chain with the skull on the last and the jaw on the skull;
normalised weights; finite attributes; unique dynamic clips; loop seams; no root or scale channels;
Grab's duration; that `Lower` is exactly 1.5 s and the snaps exactly 0.6 s; and that the reduced
model is at most 40 % of the triangles. It then plays **61 phases of every clip on both models**
through the Three.js GLTFLoader and AnimationMixer, evaluating actual skinned vertices, and runs the
shore-chain, boom, Crawl and Severed assertions above over 121 phases.

The Blender build additionally checks every vertex of both bodies at 13 phases of all 28 clips,
asserts the painted mouth line has contrast to read, refuses a strike that does not travel down the
beam in order, refuses any root or oral vertex it cannot seat inside the body, and refuses a
handover that does not close.

`delivery-files.json` records the size, hash and pixel dimensions of every delivered file.

Sheets, rendered from the decoded packaged files through identical cameras and lights for both
models:

- **[The strike, side and top, phase by phase](paired-strike-sheet.jpg)** — Lower at four phases,
  SnapLeft at six, Retract at four, each from the side and from above. **This is the sheet this
  animal is judged on.**
- [The severed neck, the mirrored snap and the drag](paired-severed-sheet.jpg)
- [Side, top, front, belly and mouth comparison](paired-volume-sheet.jpg)
- [Paired deformation: Idle, Crawl, turns, Attack, Bite, Heavy, Dodge](paired-deformation-sheet.jpg)
- [Remaining actions: Swim, Sprint, Dive, Rise, Hit, Stagger, Guard, Parry, Eat, Death, Grab, Breath, Growth](paired-actions-sheet.jpg)
- [This animal's own clips: Lower, Snap, Retract, Ability, Drag, Severed and the open mouth](paired-shore-sheet.jpg)

No independent human review is invented by this automated QA record.

## Reproduction

From the repository root with Blender 5.2 and the project's Node dependencies installed:

```sh
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/tanystropheus/build.py
node tools/triassic/creatures/tanystropheus/audit.mjs --package --decode
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/tanystropheus/render.py -- --decoded
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/tanystropheus/render.py -- --decoded --puppet
python3 tools/triassic/creatures/tanystropheus/contact-sheets.py
node tools/triassic/creatures/tanystropheus/delivery-record.mjs
node tools/triassic/review-bodies.mjs
node tools/update-asset-sizes.mjs
```

The paired editable Blender project, decoded review GLBs and individual frames live in
`local/triassic-authoring/tanystropheus/`. `build.py` authors both geometry and performance and
writes only this species' asset family; it touches no shared registry and performs no git operation.
The generic intake machinery it calls is `tools/triassic/creatures/shorekit.py`, shared with
Macrocnemus and Coelophysis, which were built in the same pass.

## What is still open

- Tanystropheus is **not** in `tools/triassic/shipped.json` and its preview badge is **not**
  cleared. That is the reviewer's call after looking at the sheets. Until then the roster still
  borrows a Devonian body through `TRIASSIC_STAND_INS`; it is registered in
  `src/content/triassic/review-bodies.json`, the viewer-only register for a built body waiting on a
  human, as Placodus, Helicoprion and Dinocephalosaurus are.
- The four portraits in `public/assets/triassic/creatures/` are now model renders rather than the
  crops `tools/triassic/placeholder-portraits.mjs` writes; re-running that tool would put the crops
  back.
- **The mandible is shallow**, because the painted mouth line sits low: 0.21 of the head's section
  rather than the third or so a gharial-like snout suggests. It is measured, the contrast behind
  the measurement is strong, and the gape reads clearly at the distances the sheets show — but the
  reading itself is a judgement about a painted line on a head three hundred vertices across, and a
  reviewer who thinks the mouth should sit higher is arguing with the generation, not with the
  measurement.
- **The fangs are a reconstruction.** They are the animal's single most characteristic feature and
  the generation has none, so they are authored into the lumen at a size and a rake taken from the
  skull CT descriptions rather than measured off anything in this file.
- **There are no eye globes.** The generated head has sculpted eyes in its surface and albedo, and
  this build does not cut and seat separate globes, as Nothosaurus, Placodus and Dinocephalosaurus
  do not. The pipeline contract asks for them; this is outstanding on all four.
- **The limbs are posed and asymmetric.** The generation's four limbs are drawn mid-stride and do
  not match each other; the rig is built to each limb's own axis so they deform correctly, and
  nothing here makes them match. A symmetric animal is a fresh generation, not a Blender push.
- **The head is proportionally large.** The skull measures 7.8 % of the body against the 2.6 % the
  138 mm CT skull on a 5.25 m animal gives. That is the greenlit pose's reading and not this
  build's to change.
- `Drag` has no caller yet: nothing in `shore.ts` takes a hold (see **Wiring** above).
- Living colours, soft tissues and movements are artistic reconstruction.
