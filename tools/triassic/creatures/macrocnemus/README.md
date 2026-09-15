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
| Upper and lower tooth rows | Small cones | Their own, for the same reason |

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
shallowest oral vertex sits 0.00122 raw units *inside* the closed surface, so the teeth embed in flesh
and protrude into the lumen rather than standing on the skin.

The gape defect in **What is still open** below sits comfortably inside this rule, which is worth
saying because it means the fix stays available. The mandible is too small because the hinge was
measured off the wrong thing — that is a *cut* moving. The throat that then fails to follow it is a
*weighting* problem. Neither wants new geometry.

**Foot webbing was considered and is not wanted here.** The rule names it as within reach, and this
animal runs on land where its feet are seen; but the generation's feet are closed surfaces with
separated digits and no holes, so there is nothing to fill. Adding webbing would be inventing shape
the animal does not have rather than closing a gap, and a long-toed terrestrial tanystropheid is not
an animal the research gives webbed feet to.


## Rest pose, mouth cut and limb sweep

Numbers the re-basing pass asked for, measured while the body was open rather than re-derived later.

**How far this generation's rest pose is from neutral.** `meanCurvatureRadiusOverSection` is
Dinocephalosaurus' measure — the radius a run curves on, over that run's own section radius — so it
says whether a curve is gentle *for a body that thick*. High means the rig can straighten it by
rotating joints (Dinocephalosaurus' tail is about 20); low means the curve is tight enough for its
girth that straightening on the rig collapses the inside of the bend and the mesh has to be unbent
before binding. It is measured on the same rows this builder unbends from, coarsened to every third
station.

| Run | Turning | Section radius | Radius / section | Trustworthy |
| --- | ---: | ---: | ---: | --- |
| tail | 389.1° | 0.0159 | **5.85** | **no** — see below |
| spine | 576.9° | 0.1345 | **0.53** | **no** — see below |
| neck | 72.3° | 0.0283 | **7.77** | yes |

**The trunk figure is not anatomy and is flagged as such.** A geodesic banding of a *standing*
animal is contaminated where the limbs attach: each band picks up a different amount of leg, the
centroids jump from side to side, and the angle sum runs away — which is why a short thick trunk
reports more than a full circle of turning. The runs that matter for re-basing are the neck and the
tail, and those are measured on rows the limbs are not in.

**Paired-limb asymmetry**, the mean distance between each limb joint and its partner's mirrored
position, over body length: **0.04077** (fore 0.0328) (hind 0.04874).
These generations are drawn rather than modelled to a rig, so the four limbs are posed mid-stride
and do not match; this is by how much.

**The mouth cut against the measured lip line.** No modelled mouth slit on this head — the cavity
instrument finds 9 vertices and none of them is a cavity — so the lip line is read off the
albedo per station and the cut is the head's section at the median of those readings, which is
Dinocephalosaurus' method. Max deviation of the cut from the per-station readings: **0.03114** of body
length, worst at x = 0.3956. The readings themselves run 0.0888 to 0.6601 of the head's
section against the 0.229 used, so the spread is wide and a single fraction is smoothing a
contour that wanders — the deviation number is the honest size of that smoothing.

**Limb sweep**, the total angle each limb root turns through per cycle (summed frame to frame, so a
limb that goes forward, back and forward again has swept more than its extremes say):

| Clip | Swept per cycle |
| --- | --- |
| `Run` | fore L 98.6°, fore R 99.6°, hind L 127.6°, hind R 127.6° |
| `Charge` | fore L 289.8°, fore R 291.0°, hind L 390.6°, hind R 398.4° |
| `Sprint` | fore L 67.7°, fore R 67.7°, hind L 129.2°, hind R 129.2° |
| `Crawl` | fore L 56.0°, fore R 56.0°, hind L 71.1°, hind R 71.1° |

`Charge` is the dash down into the shallows and is where it bears.

## The hinge, the throat, the rim and the skin: what this build repaired

Four faults, all in this builder rather than in the generation, and they had to go together. The
body ships from the same preserved source at the same triangle count; nothing about the animal
changed.

| | Before | After |
| --- | ---: | ---: |
| Worst **skin** edge, `tools/triassic/skin-tears.mjs` | 23.31x | **2.94x** |
| Mandible | 74 triangles, a sliver off the snout | **384 triangles**, a lizard's jaw |
| Jaw hinge, as a fraction of the head's span behind the snout | 0.28 | **0.66** |
| `gape-solid.py`, backdrop seen through the body at full gape | — (the jaw barely opened) | **0 px**, tolerance 12 |

### The hinge, and why it could not ship on its own

`HINGE_X` was `SKULL_PT[0] + .012` — the skull *bone*, which sits 0.90 of the way along the neck
axis and so near the front of the head. `is_jaw` therefore cut a sliver off the snout rather than a
mandible, and the widest gape this animal has, `Snatch` at 28.6° of jaw, read as a black triangle a
few pixels across with the cut edge showing beside it as a bare pale facet. The hinge now comes from
the head's own measured span, `X_SNOUT - .66 * (X_SNOUT - HX[0])`, which is Coelophysis' fix.

The previous build diagnosed this, tried it, and deliberately did not ship it, because it exposes a
worse fault underneath: **the throat did not follow the jaw.** That is now fixed too, and so are two
more that only a real gape could reveal.

### The throat follows the jaw

The mandible is rigid on `jaw` and the skin behind the hinge was on the axial chain, with nothing
blending between them, so a wide gape separated the two and this animal's pale gular skin read as a
slab hanging off a detached lower jaw. `throat_jaw_share` hands the skin behind the cut a share of
`jaw`, **full at the mouth line and full at the cut plane** — not half of either, because a ramp
centred on the cut reads 0.5 exactly where the mandible's own 1.0 meets it, and that step is the
seam opening. Rhaeticosaurus and Birgeria each had to learn the same thing.

It is bounded **radially about the hinge as well**, and that part is this animal's own. A window in
the body axis alone is not enough here: the generation is drawn mid-stride with its neck raised, so
its right hand sits at x 0.388, inside any x window the throat needs, a fifth of a body *below* the
head. Gated on x and height only, 41 % of the hand went to `jaw` and the tear sweep read 15.09x on
edges carrying `jaw = 0.58` against `fore_foot_R = 0.41`. A throat is a place on the animal, not a
slab of space, and the build now measures what the share claims (153 vertices in a box 0.034 × 0.054
× 0.043) and refuses one that has reached past the head.

### The lining, measured from the mouth rather than from the head

Three separate things were wrong with the lumen, and each is Birgeria's or Rhaeticosaurus' lesson
arriving here:

- **It stopped short of its own hinge.** The rearmost ring sat 0.004 in front of the cut and was
  pinched to a seventh of its width there, while the cut ran full width to the hinge. It now starts
  0.008 *behind* the cut at the head's own full section, and does not taper at the back at all.
- **It was sized from the head at its broadest.** `HW` is a 96th percentile of |y| over the whole
  section; the seam on this animal sits at 0.229 of the section, low on a head that tapers downward,
  so 0.86 of the broadest measurement was wider than the head is where the mouth is. The width is
  **cast** from the mouth's own axis now, which is what Birgeria's note says to do.
- **And both sides are cast, not one.** `head_y` is the median of the section over a band, which on
  a head that is drawn rather than mirrored is not the middle of the mouth. Taking the nearer wall
  as the half-width put the lumen 0.86 of the way to one cheek and left a strip of open mouth beside
  it on the other.

Its floor also follows the mandible outright and tapers at neither end, where it used to fade over
0.012 behind the hinge and 0.007 at the snout; and its section is a **squircle** (`power = 3.0`),
because an ellipse narrows towards its floor and at the height the mandible's rim reaches at full
gape it was a fraction of the mouth's own width.

### The rim, which is what the last 19 pixels actually were

After all of that the gape proof still read **19 px** at `Snatch`, at the same six screen positions
it had read 18 at before any of it — and a count that will not move is the tell that nothing being
changed is the thing that is wrong. A ray cast through those pixels, measuring its own distance to
each part rather than reading renders, found it passing 0.004 from the mandible, 0.013 from the
lining, and hitting the inside of the far cheek: it was slipping along the **mandible's cut rim**,
which is one polygon thick. At a grazing angle that rim *is* the silhouette, and whether its last
quad is wound towards the camera or away is decided by a rounding error in the pose.

So both halves of the cut get a lip. `K.rim_flange` extrudes the boundary and draws the new ring
towards the mouth's own axis; Blender keeps the extrusion's winding consistent with the faces it
grew from, so the lip's outer side is the skin's outer side folded inwards, which is what a lip is.
It is the "closing a hole is simple and is always fair game" case in `CLAUDE.md` — every vertex of
it comes from the generation's own rim.

The fold **runs out before the snout**: at the very tip the two rims meet round the front of the
mouth, and folding both of them inwards there parts them instead of closing them. Folded to the tip
it cost 12 px in *every* clip at *any* gape, which is again the signature of something that is not
about the gape. Tapered away over the last 0.010, every shot reads 0.

With the rim closed the gape needs no cap at all: `Snatch` keeps its full 0.50 rad — wider than
Tanystropheus opens — and still measures 0 px through the body.

### The skin

`shorekit` did not relax its weights, and the marine kit always has. That is the whole reason this
animal and Coelophysis sat at 23.3x and 25.3x while every body built on `_pipeline/tripo.py` sat
between 1.4x and 12x. `K.bind` now runs that kit's own `relax_weights` — imported rather than
copied, so there is one implementation of the thing that stops a gate tearing a skin — for 14
passes. Beside it, `trunk_pullback`'s gates are a product of slopes rather than three hard tests
whose second arm handed out a flat 1.0, and the distal limb radius is measured off the body by
`K.measure_radii` rather than authored, the limb being flooded from its tip over the mesh's own
edges so that the measurement cannot walk into the trunk.

And the blend between a limb's joints is a **fraction of that limb's own segments**, not a constant
copied from another animal: 0.024 and 0.013 at this forelimb's elbow and wrist, where a flipper's
0.050 would have been a band wider than two whole segments and would have handed every vertex all
four joints at nearly one weight.

At **2.94x** this is now the cleanest limbed skin in the era after Rhaeticosaurus' 2.81x, ahead of
Nothosaurus' 2.98x. What remains is `body` against `hind_upper_L` in `Sprint`, an edge going 0.027
to 0.079 — a thigh fused to a trunk, which is a real blend rather than a gate.

The gape record is [`gape-solid.json`](gape-solid.json): **0 px** through the body on all six shots,
against a tolerance of 12.

## What is still open

- Registering the model — `tools/triassic/shipped.json`, the stand-in and the preview badge — is not
  done here. That is the ship-out pass's business and this build does not touch it.
- **The twin's finest toes still diverge.** The maximum nearest-surface distance is 3.1 % of body
  length against a 95th percentile of 0.38 %, which is the voxel field losing them. One vertex of
  10,149 is over 3 % out; the envelope tolerance the contract sets is met four times over.
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
