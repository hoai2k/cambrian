# Macrocnemus — the runner, and the axis a bounding box could not find

The delivered Tripo body and its procedural twin share one **33-joint skeleton**, the same three
mouth/attack sockets and **26 byte-for-byte equivalent decoded animation performances**. The twin
is also the runtime LOD, with every clip retained so either model can perform the same gameplay.

Two things are worth reading this delivery for.

**It runs.** The design's line on this animal is four words — "Tripo body, a Run and a Stand" — and
the reviewer's brief is that it *goes into the water* after something too near the shoreline and
comes back out. In `src/sim/triassic/shore.ts` it is the one shore animal with no reach at all
(`reachOf` returns zero for it), so it never strikes from its post: everything it does, it does by
moving. `Run` is a land gait with two suspensions a cycle, `Charge` the dash into the shallows,
`Snatch` the strike at something in them, `Retreat` the turn and bolt back up the beach. A walk
cycle at the post would have missed the animal entirely.

**Its axis had to be measured twice.** `docs/triassic/proportion-audit.md` left Macrocnemus
**CANNOT TELL** because it is drawn standing and an axial instrument could not separate neck from
limb. The finding is real and this build hit it head on: **this body's longest geodesic path runs
claw to tail tip, not snout to tail tip**, because the hindlimbs are as long as the neck. Banding
the surface from the ends of that path reads a shin as a neck — it produces a perfectly plausible
table in which the foot is a head, the ankle is a skull and the tibia is a row of cervicals. So the
axis is measured from **two declared seeds**, once from the tail tip forward and once from the snout
back, and the two runs meet at the shoulder.

| Delivery | Triangles |
| --- | ---: |
| `macrocnemus.glb` — authored Tripo body | 20,954 |
| `macrocnemus.puppet.glb` — procedural twin | 7,910 |
| `macrocnemus.lod1.glb` — identical puppet alias | 7,910 |

The reduced model is **37.8 %** of the authored triangles, inside the contract's 40 %. Files are in
`public/assets/triassic/creatures/`, with studio, 1600 × 1200 transparent select, card and thumbnail
portraits and metadata; sizes and hashes are in `delivery-files.json`. Meshopt packaging preserves
mesh attributes and animation sample values exactly; textures are embedded. The model is **4.886
engine authoring units** long, faces +Z in glTF and uses +Y up. The research registry gives about
90 cm for *M. bassanii*.

## Source and reconstruction

The preserved source is `tools/triassic/creatures/macrocnemus/tripo-raw/macrocnemus.raw.glb`,
SHA-256 `25fe69221698be87f6c7939edff529638baec8bc2b55988aeb315a865d14984a`. The raw file is never
changed. It welds to **one shell** with nothing to remove, and the build asserts that: a future
regeneration arriving with debris stops here rather than silently losing a limb.

### The tail, unbent; the neck, left alone

The greenlit canonical (`docs/triassic/canonical/macrocnemus.png`) strides along the shore with its
neck raised at about sixty degrees, the head up and watching, and the tail held straight out behind
with a droop at the tip. The generation reproduces all of that except the tail, which it curves a
fifth of a body width across the plan.

So the tail is unbent — each cross-section carried rigidly from its own measured centreline frame
onto a target of the same segment lengths **and the same per-segment rise**, so the droop the pose
gives it survives — and the neck is not touched at all. Its angle *is* the animal.

| | |
| --- | ---: |
| Stations measured | 52 |
| Tail arc | 0.6924 raw |
| Largest vertex move | 0.3250 raw |
| Mean lateral offset of the tip, before → after | +0.0846 → −0.0481 |

The correction is gated by distance to the tail's own polyline as well as by station, and that is
not a nicety: a hind claw sits *behind* the tail's base station, so an axial gate carries the whole
hindlimb round with the tail. The first build did exactly that and folded the surface at the hip
badly enough that the tail's own centreline measured *outside its own tail*. `UNBEND_TAIL = False`
rebuilds the generated sweep.

### Where a bone can go, and how this build finds out

A standing animal's builder needs a reliable inside/outside test more than a swimming one does, and
the obvious one is wrong. Nearest triangle, sign from its normal: at the hips the nearest surface to
a point on the midline is the **inner face of a thigh**, whose normal points across the midline, so
a point plainly between the belly and the backbone reads as outside. The probe is now **ray parity**
in three jittered directions with a majority vote (`shorekit.depth_probe`), and three consequences
follow, each of them measured rather than chosen:

- **The trunk axis is the straight line between the two measured ends**, not a run of vertical
  slabs. At the hip station the hindlimbs fill the bottom two thirds of a slab and drag its
  mid-height down by a fifth of a body height.
- **The pelvis bone is a fifth of the trunk's length forward of the hip band's centroid.** That
  band has both hindlimbs in it and its own centroid measures 0.009 raw *outside* the animal.
- **The caudal chain starts 17 % of the way along the tail**, found by walking forward along the
  tail's axis until the depth probe says the station is properly inside.

### The head is not on the midline

This generation is drawn, not mirrored: its skull sits **0.0139 raw units** — about a third of its
own width — to the left of the body's centre. So the hinge, the lumen, the tooth rows and all three
anchors are built on the **head's own lateral axis**, interpolated per station from the head's own
measured sections. On y = 0 they would be outside the head.

### The mouth

Same instrument as Tanystropheus and the same answer: this head models **no** mouth cavity (the
normal-casting instrument that finds 193 vertices on Placodus finds none here that are not between
the toes) and no teeth. So:

- the seam is read off the **painted mouth line** in the source albedo — per station across the
  snout, the split in height that most separates dark above from pale below — which measures at
  **0.229 of the head's own section** with a median contrast of **0.293** in linear luminance. The
  build asserts that contrast before it cuts anything;
- the seam then follows the head's own taper at that one fraction, and the cut is taken by shearing
  the curve onto a plane, bisecting there and shearing back, so every vertex the cut adds lands on
  the seam;
- the relief the head *does* carry — brow, nostril and lip ridges, up to 0.006 raw proud of its own
  smoothed surface — is recorded patch by patch with how each one fell either side of the cut, and
  the build refuses a raised patch that is halved by the seam with real relief on both sides. That
  is Placodus' chisel check, adapted: there are no teeth here to bisect, but there are ridges;
- small conical insectivore's teeth are **authored** into the lined lumen, upper row on the skull
  and lower on the jaw;
- every oral vertex is finally seated by the depth probe, drawn radially towards the mouth's own
  axis until it is inside. The worst depth after seating is asserted positive.

### The twin

A procedural **volume resurfacing**, not a decimation: topology regenerated from a **0.0034**
raw-unit voxel occupancy field (78,028 triangles), relaxed once and reduced to the puppet budget.
No source vertex or face is reused. The field is finer than Placodus' 0.0055 because this animal's
shins measure r ≈ 0.007 and would not survive a coarser one. Puppet pigment is sampled through each
nearest source triangle's interpolated UV. The authored body keeps the full embedded original albedo
with white vertex colors, restrained normal relief (0.15) and nonmetallic skin at roughness 0.7.

## Measurements

`macrocnemus-profile.json` records 21 envelopes of both actual meshes, taken as **slabs one station
thick** rather than as infinitesimal plane intersections — the right instrument for a body whose
legs run *along* the sectioning axis, where a leg beginning a thousandth of a unit either side of a
plane is in one section and absent from the other. The plane intersection is still taken at every
station and unioned in.

| Measure | Value | As % of the 4.886-unit body | Tolerance |
| --- | ---: | ---: | --- |
| Maximum envelope difference | 0.0497 | **1.02 %** | 4 % |
| Nearest twin-surface distance, 95th percentile | 0.0186 | 0.38 % | — |
| Nearest twin-surface distance, maximum | 0.1521 | 3.11 % | — |
| Authored vertices further than 3 % of body length from the twin | **1 of 10,149** | — | — |
| Appendage roots seated inside the intake surface | 0.0124–0.0193 raw | 1.2–1.9 % deep | inside |
| Jaw hinge seated inside the head | see `validation.json` | as a fraction of the local head radius | inside |
| Weights per vertex | max 4 | — | ≤ 4, normalised |

Joint and socket coordinates are shared, so their parity error is exactly zero. These are generated
measurements, not a claimed human anatomical sign-off.

## Rig and motion

Root, body, chest, six cervicals, skull, jaw, ten caudal controls (the animal has 52–53 caudals and
a tail that is three fifths of it) and three controls per limb — 33 joints. Skinning is
parameterised by arc length along measured polylines; a vertex whose nearest axial point is on the
neck but which is nowhere near the neck is pulled back onto `chest`.

| Clip | s | | Clip | s | | Clip | s |
| --- | ---: | --- | --- | ---: | --- | --- | ---: |
| Idle | 3.0 | | Bite | 0.4 | | Growth | 1.4 |
| Swim | 1.6 | | Heavy | 0.9 | | Crawl | 1.4 |
| Sprint | 1.0 | | Hit | 0.5 | | **Run** | **0.62** |
| TurnLeft | 1.4 | | Death | 1.6 | | **Charge** | 1.0 |
| TurnRight | 1.4 | | Guard | 1.0 | | **Snatch** | 0.7 |
| Dive | 1.2 | | Parry | 0.3 | | **Retreat** | 1.2 |
| Rise | 1.2 | | Dodge | 0.4 | | Grab | 1.0 |
| Attack | 0.8 | | Eat | 1.4 | | Ability | 1.0 |
| Breath | 2.0 | | Stagger | 1.0 | | | |

Idle, Swim, Sprint, Guard, Eat, Grab, Crawl and Run loop exactly. Grab is a 1.0 s held loop, inside
the contract's 0.9–1.2 s. Every clip but Death closes on itself. Root motion and scale animation are
absent.

**Run** is a basilisk's sprint, and the audit checks it is one rather than a fast walk: the body
leaves the sand twice a cycle (its height crosses its own midpoint four times), the diagonal
couplets are diagonal (a fore foot reaches forward within a fifth of a cycle of the *opposite* hind
foot and half a cycle from its own partner), and the hindlimbs swing through more than the
forelimbs. The tail is held as a counterweight rather than waved: its tip sweeps 0.69 units against
a body that does not move laterally at all, and the audit refuses a wag over 0.9.

A note on how "the hindlimbs drive it" is measured, because the obvious reading is wrong twice over.
Measured in world space, the *fore* feet travel further — the fore roots sit 0.17 raw units forward
of the pelvis bone and the hind roots almost on it, so the body's own pitch swings the front feet
through a far longer lever. Measured about their own roots they are still nearly equal, because this
generation's fore and hind limbs are close to the same length root-to-foot: the shoulder sits higher
than the hip, so the shorter forelimb reaches the same ground. What *does* separate them is the
angle each limb swings through, read off the authored quaternion tracks, and that is what the
assertion uses.

**Charge** is the dash into the shallows: crouch and load, launch, three driving strides, then the
water takes the legs and the body pitches down as it wades in — and back to the stand it started
from, so it can be played from and into Idle. **Snatch** puts the head down into the water, jaws
through, and takes it out with a shake. **Retreat** turns away over its first third, then four fast
strides out of the water with the head twisted back to check. **Ability** is the roster's own Bolt:
freeze, then one explosive shove off the hindlimbs that throws the animal up the beach.

**Crawl** is the walk at the post — the renderer's ground loop, so it is what a player sees a
standing Macrocnemus doing — with the head up and watching. **Idle** is the Stand the design asks
for: the ribs work, the weight shifts, the head snaps round once to look and settles back.

## What this animal does *not* have, and why

No `Lower`, no `SnapLeft`/`SnapRight`, no `Retract`. `shoreClip` in `src/sim/triassic/shore.ts`
names those for the telegraph, the strike and the recovery, and this animal never reaches any of
those phases: `reachOf` gives it zero, so its post sits in `watch` forever and the renderer keeps it
on the shared state machine's Idle. Giving it a telegraph would be giving it a clip the simulation
can never ask for. Tanystropheus and Coelophysis have those four; this one has a run instead, which
is what the design and the reviewer both asked of it.

**And nothing plays that run yet.** This is the honest gap in this delivery and it is worth being
plain about. `Run`, `Charge`, `Snatch` and `Retreat` have no caller: `shoreClip` names a clip per
*phase*, this animal only ever has the `watch` phase, and so it stands on its bank doing nothing.

That is not a bug in `shore.ts` so much as a mechanic that was never written. The design
([01-triassic-design.md](../../../../docs/triassic/01-triassic-design.md) · S03) asks for exactly
one behaviour — "**it bolts** when a player nears the shallows and is a rare snack if it wades" —
and a bolt is the one thing the shore-animal class cannot currently express: `pin()` writes the
body back to its post every single step, and every other shore animal is *supposed* to be pinned.
Making this one move means either unpinning an actor class whose whole contract is that it does
not move, or giving it a brain, and both are design decisions rather than wiring. So it was left,
deliberately, rather than half-done.

What a future pass needs: a `flee` phase entered when a player comes inside some radius, a post
position that is allowed to travel up the beach while that phase runs, and a return to the post
when it ends. `shoreClip` then names `Retreat` on entry and `Run` for the travel, which is what
they were authored for and why `Run` is a travelling gait rather than a walk on the spot. `Charge`
and `Snatch` are for the design's "rare snack if it wades" and want a reach this animal does not
have; they are speculative and a reviewer may well decide an ambient-only animal should not strike
at all, in which case they are two clips of dead weight in a 1.94 MB file and cost nothing else.

## Verification

`node tools/triassic/creatures/macrocnemus/audit.mjs --package --decode` binds the checks to the
final packaged hashes: exact paired joint names, hierarchy, local rest transforms, inverse bind
arrays, socket transforms and metadata, clip names, timing and every sample array; that the six
cervicals and the ten caudals really are chains; normalised weights; finite attributes; unique
dynamic clips; loop seams; no root or scale channels; Grab's duration; and the 40 % LOD cap. It then
plays 61 phases of every clip on both models through the Three.js GLTFLoader and AnimationMixer,
evaluating actual skinned vertices, and runs the Run, Charge/Snatch/Retreat and tail assertions
above over 121 phases.

The Blender build additionally checks every vertex of both bodies at 13 phases of all 26 clips,
asserts the painted mouth line has contrast to read, refuses a raised patch halved by the seam,
refuses any root or oral vertex it cannot seat inside the body, and checks the gait from its own
authored angles.

Sheets, rendered from the decoded packaged files through identical cameras and lights for both
models:

- **[The stride, side and top, eight frames of a cycle](paired-gait-sheet.jpg)** — the sheet this
  animal is judged on.
- [Into the water and back out: Charge, Snatch, Retreat](paired-water-sheet.jpg)
- [Side, top, front, belly and mouth comparison](paired-volume-sheet.jpg)
- [Paired deformation: Idle, Crawl, turns, Attack, Bite, Heavy, Dodge](paired-deformation-sheet.jpg)
- [Remaining actions](paired-actions-sheet.jpg)
- [This animal's own clips](paired-shore-sheet.jpg)

No independent human review is invented by this automated QA record.

## Reproduction

```sh
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/macrocnemus/build.py
node tools/triassic/creatures/macrocnemus/audit.mjs --package --decode
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/macrocnemus/render.py -- --decoded
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/macrocnemus/render.py -- --decoded --puppet
python3 tools/triassic/creatures/macrocnemus/contact-sheets.py
node tools/triassic/creatures/macrocnemus/delivery-record.mjs
node tools/triassic/review-bodies.mjs
node tools/update-asset-sizes.mjs
```

The paired editable Blender project, decoded review GLBs and individual frames live in
`local/triassic-authoring/macrocnemus/`. `build.py` authors both geometry and performance and writes
only this species' asset family; it touches no shared registry and performs no git operation. The
generic intake machinery it calls is `tools/triassic/creatures/shorekit.py`, shared with
Tanystropheus and Coelophysis, which were built in the same pass.

## What is still open

- Macrocnemus is **not** in `tools/triassic/shipped.json` and its preview badge is **not** cleared.
  That is the reviewer's call after looking at the sheets.
- The four portraits in `public/assets/triassic/creatures/` are now model renders rather than the
  crops `tools/triassic/placeholder-portraits.mjs` writes.
- **One region of the twin diverges.** The maximum nearest-surface distance is 3.1 % of body length
  against a 95th percentile of 0.38 %, which is the voxel field losing the finest toes. One vertex
  of 10,149 is over 3 % out. A finer field would fix it and would cost the twin's triangle budget;
  the envelope tolerance the contract actually sets is met four times over.
- **The gape is the weakest thing about this animal, and it is a known defect with a diagnosis.**
  At its widest — `Snatch` at 0.23, 28.6 degrees of jaw, which is *more* than Tanystropheus opens —
  the mouth reads as a black triangle a few pixels across at the snout tip, with the cut edge of the
  mandible showing beside it as a bare pale facet. It is not legible at any distance.

  The cause is `HINGE_X = SKULL_PT[0] + .012`: the hinge is taken from the skull *bone*, which sits
  0.90 of the way along the neck axis and so near the front of the head, and `is_jaw` therefore
  cuts a sliver off the snout rather than a mandible. Coelophysis had exactly this and was fixed by
  taking the hinge from the head's own measured span instead (`X_SNOUT - .66 * (X_SNOUT - HX[0])`);
  Macrocnemus was not.

  That fix was tried here and is **not** in this build, deliberately. It works as far as it goes —
  the hinge moves to 0.401, the mandible becomes 481 triangles rather than a sliver, the hinge
  seats at 0.50 of the head radius and the gape becomes a large legible wedge — but it exposes a
  second defect underneath it that a small gape was hiding: **the throat does not follow the jaw.**
  The mandible is weighted to `jaw` and the throat skin behind it to the cervicals, with nothing
  blending between, so a wide gape separates the two and the animal's pale ventral throat reads as
  a flat slab hanging off a detached lower jaw. The closed mouth is clean, which is why this was
  invisible until the jaw could actually move. Deepening the oral lumen to the measured seam height
  was tried and does not help: the slab is skin, not an unlined cavity.

  So the whole fix is two changes, not one — the hinge, *and* `skin_weights` blending `jaw`
  influence back into the throat over a distance behind the hinge, the way a limb root blends onto
  the body bones under it. The second half needs its own verification pass and is not something to
  land unlooked-at. Shipping the hinge alone would trade a quiet defect for a loud one.
- **The teeth and the tooth rows are a reconstruction**, as the fangs are on Tanystropheus. The
  generation models none.
- **There are no eye globes**, as on Nothosaurus, Placodus, Dinocephalosaurus and Tanystropheus. The
  pipeline contract asks for them; this is outstanding across the era.
- **The limbs are posed and asymmetric** — the generation is drawn mid-stride, the left hind foot a
  tenth of a body length forward of the right — and the rig is built to each limb's own axis rather
  than making them match. A symmetric animal is a fresh generation.
- **`Run`'s cadence is authored, not derived.** Nothing in `src/sim` asks a shore animal to move, so
  the clip's 0.62 s cycle is a judgement about how a 90 cm animal looks running, not a number taken
  from a speed the simulation uses.
- Living colours, soft tissues and movements are artistic reconstruction.
