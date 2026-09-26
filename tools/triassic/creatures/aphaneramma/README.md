# Aphaneramma — authored Tripo body and measured procedural twin

*A. rostratum*, Early Triassic, Spitsbergen. A trematosaur temnospondyl: a marine amphibian with a
gharial's snout, four sprawling limbs with long webbed digits, spotted flanks and a laterally
flattened swimming tail. 1.6 m in life (`docs/research/triassic-swimming.json`), 5.0 engine units
as built.

Built by `build.py` (Blender 5.2.1), packaged and measured by `audit.mjs`. Everything below is a
number this build produced, not an impression.

```
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/aphaneramma/build.py
node tools/triassic/creatures/aphaneramma/audit.mjs --package --decode
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/aphaneramma/render.py -- --decoded
python3 tools/triassic/creatures/aphaneramma/contact-sheets.py
/opt/blender/blender -b --factory-startup --python tools/triassic/gape-solid.py -- aphaneramma Bite@0.12 Heavy@0.55 Ability@0.45 Attack@0.45 Eat@0.4
node tools/triassic/skin-tears.mjs public/assets/triassic/creatures/aphaneramma.glb
node tools/triassic/idle-bones.mjs public/assets/triassic/creatures/aphaneramma.glb
```

## What the delivery is

| | |
| --- | --- |
| Authored body | `aphaneramma.glb` — 22,477 triangles, the generation's own surface and UV albedo |
| Procedural twin | `aphaneramma.puppet.glb` — 7,766 triangles (34.6 %), a voxel-occupancy resurfacing that reuses no source vertex or face |
| Reduced model | `aphaneramma.lod1.glb` — **byte-identical to the twin** |
| Rig | 26 joints, one armature, one set of inverse binds, one set of sockets, one set of actions on both bodies |
| Clips | 23, of which 8 loop |
| Anchors | `anchor_mouth` (jaw), `anchor_mouth_inside` (skull), `anchor_attack_primary` (skull) |

Source: `tripo-raw/aphaneramma.raw.glb`, preserved unchanged
(`196863cf…`); the build reads the published preview, which is the same geometry repackaged —
19,949 triangles and 9,977 vertices after the 1e-6 weld, one connected component, no flake removed.

## The judgement calls, and what settled each

### Which way the body lies

`tools/triassic/preview-orientation.json` records an **estimated** yaw of 180 for this animal, read
off a fixed-world-axis render. Nothing in this build reads it. The long axis is the vertex cloud's
first principal component, which lies **18.51 degrees** off the file's own Y — a bounding box would
have named the right *axis* and the wrong *direction along it* by nearly a fifth of a right angle.
The roll cannot come from geometry (a section is rotationally ambiguous and the second principal
component of a body with big sprawling limbs points at the limbs), so it comes from the animal's own
countershading: harmonic strength **0.495** over 24 stations, dorsal measured at 93.7 degrees, a
**+3.68 degree** correction. Which end is the head is the half-width test: 0.016 at the snout tip
against 0.105 through the trunk.

### The body's own axis — measured twice, and the second time is the one that matters

`T.measured_centreline` takes the median x and z of the *thick* vertices in each slab. That is
written for a body whose appendages are blades, and **a sprawling leg is not a blade**: it is thick,
so it enters the median. Measured on this batch's other animal the kit's axis leaves the skin
entirely at the shoulder; here it was less dramatic but wrong in the same way, and everything reads
off it — limb roots are seated by pulling them towards it, the skin is banded by arc length along
it, the Voronoi test that says which vertices are a limb's measures distance to it, and
`curvature_over_section` is a ratio of its bend to its own thickness.

So the axis is measured twice. The first pass is the kit's, good enough to find the limb clusters;
the second drops **2,175 vertices** that are nearer a limb's own polyline than the rough axis and
takes the **mid-range of the 4th and 96th percentiles** rather than the median, because a centre is
the middle of a section and not the middle of its vertices.

What that changed is not cosmetic. The pose deviation before and after, on the same mesh and the
same clips:

| | tail mean | tail tightest | spine mean |
| --- | ---: | ---: | ---: |
| kit's axis | 5.86 | 1.42 | 4.18 |
| trunk axis | **13.31** | **3.97** | **12.86** |

A tightest ratio of 1.42 is Dinocephalosaurus' neck, which had to be unbent in the mesh; 3.97 is
comfortably the gentle case. **The bend was in the measurement, not in the animal.**

### The tail: the gentle case, straightened on the rig

`meanCurvatureRadiusOverSection` over the tail chain is **13.31**, tightest **3.97**, per station
`[8.8, 29.9, 13.8, 7.9, 4.0, 15.4]`. Over the whole spine, 12.86 mean and 3.97 tightest; over the
head and chest, 16.19 and 7.80. The calibration is Dinocephalosaurus — tail around 9, straightened
on the rig; neck 2.8 mean and 1.51 tightest, which had to be carried section by section onto a new
axis in the mesh before binding. **Nothing here is unbent in the mesh**, and the later `Neutral`
pose pass (task #24) can take this body's rest curve out on the rig.

**But the ratio is not the whole of it, and this animal is what showed that.** It says how *tight*
a bend is against the body's own thickness; it is silent about how far the run turns altogether.
This tail turns **61.98 degrees** from its first segment to its last — 31.76 of it in one joint,
`tail_05` → `tail_06`, at the base of the caudal fin — while reporting a comfortable 13.31. A long
gentle curve through sixty degrees is exactly what an animal's tail hooking round behind it looks
like, and the ratio calls it gentle. Both builders in this batch now record `restTurning` beside
`poseDeviation` for that reason.

Paired-limb asymmetry, for the same pass: **0.129 of a body length mean, 0.181 at worst**, and it is
a *station* asymmetry rather than an angle one — the two forelimbs sit 0.10 of a body apart along
the axis and the two hind limbs 0.14 apart. That is what the generation drew; the rig is built to
each limb's own measured axis so each deforms correctly, and they simply do not mirror each other
at rest.

### The mouth line

Placodus' geometric method — cast every head vertex's own normal back into the mesh and keep the
hits — returns **34 vertices** over the whole front third, at every gap from 0.02 to 0.05, and they
are spread over **0.133 of z**, which is the entire depth of the head. That is the gular folds and
the snout's own relief finding each other across a crease; a modelled slit is a thin band along the
lip. So the line is painted, not modelled.

`albedo_mouth_line`'s walk up from the belly is **not** a reading on this animal: the flanks are
pale with dark blotches on them, the walk stops at the first blotch, and the two sides disagree by a
mean **0.61** of the local radius while the answer moves **0.29** of a radius between neighbouring
stations. `tripo.painted_line` reads it as a continuous curve instead — a matched filter for a thin
dark line with lighter skin above and below, resolved as the best path along the head under a jump
penalty.

Two things had to be changed from the kit's defaults, and a render of the fitted line drawn on the
head is what showed both:

- **The jump penalty, from 1.2 to 3.0.** At 1.2 the path held the lip for the front three quarters
  and then let go and slid down onto the gular fold: roughness 0.040 of a radius, flank disagreement
  0.144. At 3.0 it is **0.0153 and 0.106**.
- **The read stops short of the hinge**, at `Y0 + 0.225` against a hinge at `Y0 + 0.258`. At the jaw
  corner the mandible flares and every per-station reading there is the fold under it rather than
  the lip. The seam is **extrapolated** over that last 0.033 of body on the slope of the stations
  that do read (-0.082), rather than clamped flat, because a flat clamp carries a level lip into a
  corner that is plainly still descending and puts the cut through the mandible's rear rim.

The seam is then asserted to stay inside the animal — `depth()` at 40 stations along it — because a
station where the seam leaves the skin is a cut through open air, and nothing upstream says so.

A straight cut would have deviated **0.112 of the local radius** from the fitted curve at worst. The
cut actually taken deviates 0.0012 raw from the measured line (the blur). Two tooth patches straddle
the cut, both of them relief at the snout tip and at the hinge rather than a crown sawn in half.

### The head's own section excludes the limbs

`head_half_depth` is the 90th percentile of |z − cz| in a slab, and it is what the painted line is
read in units of, what sizes the lining, and what the seam is built from (`cz + u · halfDepth`). A
first pass took every vertex in the slab — and on a sprawling quadruped **the forelimb reaches
forward under the jaw**. On this batch's other animal the measured half depth went 0.025 → 0.177 in
one station where the forelimb enters, the mouth line climbed out through the top of the skull and
the lining broke the skin by 0.034. The limb mask the axis pass already measured is exactly the set
to drop, and both builders drop it.

### Sprawling limbs, and where the skin tears

A limb is bound by a **Voronoi split against the body's own axial polyline** — a vertex is the
limb's where it is nearer the limb's bone chain than the axis, blended over 0.042 of a body either
side of the tie and faded out over the first third of the chain. That is Henodus' lesson (64.9x from
a limb test that was a trunk-width constant) in the shape it takes on a leg: a leg is thick at the
shoulder, thin at the wrist and broad again at the webbed foot, so no single radius describes it.

`skin-tears.mjs`, worst **skin** ratio, in the order the fixes landed:

| build | worst skin | where |
| --- | ---: | --- |
| first pass | 5.45x | `hind_upper_L` in Sprint, 397 torn edges on `tail_00` |
| gentler gain ramp at the pelvis, wider Voronoi margin, 6 relax passes | 4.92x | `skull` in Ability |
| the side swipe spread off the skull onto the neck behind it | 4.54x | `tail_00` in Sprint |
| an **eighth tail joint**, halving the 0.12-of-a-body step from the trunk to the first tail joint | 4.42x | `tail_01` in Sprint |
| the trunk axis above, plus 8 relax passes at hold 0.48 | 4.61x | `tail_01` in Sprint |
| the swim wave halved (below) | **4.45x** | `tail_01` in Sprint |

The fourth row is a tenth better than the fifth and is *not* the one that ships, because it was
measured against an axis that was in the wrong place. Era context: Rhaeticosaurus
2.81x is the cleanest, Nothosaurus 2.98x is the reference, Henodus 4.81x, Cartorhynchus 5.17x,
Hupehsuchus 5.79x, Hybodus 5.93x. **Every one of the 26 joints owns skin** (`idle-bones.mjs`).

### The mouth is solid

`gape-solid.py`, at full gape on five clips against a saturated backdrop, with and without a
backface-cull shim: **0 pixels of backdrop seen through the body**, against a tolerance of 12 of
378,000. The mouth is a rigid palate on the skull and a rigid floor on the jaw, overlapping behind
the hinge and each closed on its own (`T.oral_shells`, since T3D-08D — the one-sac form this
paragraph used to describe is the thing CLAUDE.md says not to rebuild), at superellipse power 2.8
because a temnospondyl's skull is very flat and very wide and an ellipse at that aspect ratio
narrows to nothing exactly where the mandible's rim reaches at full gape. The skin is double-sided behind it as a backstop, and the lining is not culled either:
a sac buried inside a head is never seen from outside whatever its winding, and culling it takes
away the floor exactly when something is looking up into an open mouth.

### The shells came out through the cheek, and the fit gave up rather than failing

`gape-solid.py` counts backdrop seen *through* the body; a shell that comes out through a cheek
draws lining pixels over *skin*, which that proof passes at 0 px and a reviewer sees at once.
Painted an emissive marker and photographed from four units away, the shipped head shows **9,714
marker pixels** from outside at rest — scattered patches under and behind the eye, above the real
mouth line. A ray cast through them (`CLAUDE.md`'s rule: ask every surface on the line rather than
re-read renders) finds the **lining first on almost every one of them**.

The cause is in the fit, and it is a shrink with a floor under it: `fit_lining_point` pulled a
vertex towards the mouth's axis in twelve steps of 3.5 % and, where twelve were not enough,
**returned it at 0.615 of the way out regardless**. Nothing failed. Worse, the test it shrank
against — `depth()`, a signed nearest-surface probe — is satisfied by a *ten-thousandth* of a body,
and on a flat wide skull with thin flesh over the lumen that is no clearance at all: 255 of the 720
vertices sat within 0.004 of a body of the skin and the closest was **0.0003**.

What replaced it is the question itself: **can this point be seen from outside the animal?** A point
strictly inside a closed surface meets skin along every direction; a point outside escapes along at
least one. Twenty-six directions — the cube's faces, edges and corners — cast against the closed
intake surface, and the walk towards the axis has no floor under it any more.

**Twenty-six and not four, and this animal is the reason.** Four *axis* reaches ask about x and z,
and on a snout yawed 17.5° the direction out of the cheek is neither: asked along the axes, **371 of
the 720 vertices read as inside the head** while a camera four units away drew them on the cheek.
And a point *on* the skin is not outside it — what has to reach the skin is the shell's width,
because that is what a line of sight into the gape passes beside — so a vertex within `ORAL_BAND` of
the mouth line may sit on the skin to within `ORAL_TOUCH` and one outside that band must be
`ORAL_MARGIN` inside it. Both one-number answers were built and measured: a touch everywhere left
the palate lying on the inside of this thin snout, which a camera drew as a green slab over the
whole rostrum.

| | shipped | rebuilt |
| --- | ---: | ---: |
| closest lining vertex to the skin | 0.0003 of a body | **0.0008** |
| vertices within 0.004 of a body of the skin | 255 of 720 | **10** |
| marker pixels seen from outside at rest | 9,714 | **7,817** |
| vertices pulled in by the seat | — | 112, worst 0.0088 raw |
| body skin (`skin-tears.mjs`) | 4.43x | **4.43x** |
| jaw cut (`lag.mjs`) | 0.00 % | **0.00 %** |
| gape, plain | 0 / 0 | **0 / 0** |

The patches are gone; what the 7,817 still counts is the **cut's own rim** along the mouth line,
one polygon thick and at a grazing angle down the length of a long snout, which is Macrocnemus'
19 px in a larger frame and is the line of the mouth rather than a hole in the cheek.

### The aimed cut is read, and it is not cut on

A reviewer aimed a cut plane and a hinge on this exact shipped body in the viewer's mouth editor
(`docs/triassic/mouths/aphaneramma-mouth.json`). The builder reads it, fits the frame against it —
the document's own bounding box against this build's, worst disagreement **1.5e-08** — and records
what the two disagree about in `validation.json`. The reviewer's plane is worth having: it carries
**−17.5° of yaw** on a +16.2° line, and this generation's long snout is *turned*, so a term in x is
exactly what the painted read cannot express, `T.bisect_on_curve` shearing the head by −seam(y).

**Cutting on it is a separate piece of work and the measurement says so.** Built that way this
body's gape opens **4,229 px of `opened by culling`** at full gape against **0** on the painted
line's own cut, and the shells built about the aimed line rather than the painted one read 7,163.
The mandible the plane takes is a different shape from the one the shells were fitted to. What
closes a mouth cut where a human aimed it is the cut's **own rim** (`T.cap_cut` and `T.cap_mouth`),
the construction Cartorhynchus was ported to on the day it took its aimed cut and which this body
has never been ported to.

## The performance

Swimming is the locomotion, as it is for every playable Triassic animal. The research calls this
body an **elongate anguilliform** swimmer, so the axial gain climbs monotonically from the shoulder
to the tail tip (0.11 → 1.16 over eleven joints) and the lag spreads a full wavelength over the
body. `Crawl` is an extra clip beside that set, not the locomotion the rest is built on — the
generation is posed for land because that is the pose that shows the animal.

**The limbs row on the same beat rather than hanging off it**, in a diagonal couplet (each fore
limb with the opposite hind). The swept angle at each limb root is measured from the *limb's own
direction*, root joint to tip joint in world space, never off an Euler channel:

| clip | `fore_upper_L` | `fore_upper_R` | `hind_upper_L` | `hind_upper_R` |
| --- | ---: | ---: | ---: | ---: |
| Sprint | 110.8° | 76.4° | 105.3° | 111.8° |
| Swim | 81.8° | 57.5° | 79.1° | 81.7° |
| Crawl | 97.3° | 69.8° | 93.5° | 102.3° |
| Idle | 18.6° | 13.4° | 18.3° | 18.4° |

The build refuses a limb under 60° in Sprint or 45° in Swim. `fore_upper_R` is the smallest in every
clip because that limb is the one the generation posed furthest forward, so a given rotation covers
less arc; it is the same stroke.

**The wave was halved, and the reason it was halved turned out to be something else.** At 0.105
radians per unit of gain each tail joint turns at most seven degrees, which reads as nothing on its
own and sums down eleven joints; the review sheet showed the tail hooked right round at the peak of
the cruise stroke, so the wave was cut to 0.052. Rendering the **raw generation** afterwards showed
the hook is already there, before any rig — see *what is weak* below — so the wave was never the
cause. The cut is kept anyway, on the number rather than on the picture: it took the worst skin
tear from 4.61x to **4.45x**, and at 0.052 the tail's chord still swings **34.0 degrees** off the
trunk at worst in Swim and 35.5 in Sprint (against 38.8 and 41.8 before), which is plainly a wave. `audit.mjs` records
`worstTailChordToTrunkDegrees`, and it is taken from the joint **positions**: every bone in this
rig rests with an identity rotation and its local +Y along the straight body axis, so a bone's own
direction says nothing about the shape of the tail it sits in — measured that way a tail that
visibly hooks reads nine degrees.

In world travel, from `audit.mjs`: the wave amplitude grows tailward at every joint in both
locomotion clips, the tail tip travels **19.5x** the shoulder in Swim, and the four foot tips travel
1.31 to 1.80 units. The diagonal couplet's lag measures 0 to seven decimal places and the two limbs
of a girdle are half a cycle apart — measured on the **stroke** rather than the raw yaw, because a
left limb and a right limb sweeping backwards together carry opposite rotations about the body's
long axis and read as half a cycle apart if the sign is not undone.

`Heavy` and `Ability` are the animal's own named **side swipe** — the sideways sweep of a long
rostrum — and not a bigger `Attack`. The audit measures the lateral share of the snout's excursion
to say so: Attack **0.03**, Heavy **1.00**, Ability **1.05**, and Ability reaches 0.91 against
Attack's 0.65.

### The swipe reaches (T3D-23, closed by T3D-32D)

The swipe used to spend its first third taking the weapon away from the prey. Measured on the
**packaged** file over 41 phases, `anchor_attack_primary`'s travel along the animal's forward
direction, over body length:

| clip | before | after |
| --- | --- | --- |
| `Heavy` | −18.0 % back, +11.5 % forward | **−4.7 % / +16.9 %** |
| `Ability` | −24.9 % back, +9.8 % forward | **−4.8 % / +16.9 %** |
| `Attack` | −2.9 % back, +8.4 % forward | **−0.3 % / +12.4 %** |

Three changes, and the argument for each is in `build.py` beside it. The **gather no longer scales
with the sweep** (`gather`): `sway` is how far the rostrum goes across, and multiplying the windup
by it as well meant the widest sweep — the ability — cocked the head 53° before the animal moved and
stood a tenth of a body *behind* its own rest while it did. The reach is the **dart** (`carry`):
the body is carried 12 % of a body forward on a plateau that rises **through** the gather rather
than after it and is held through the sweep, so the head cocks while the animal is already going
forward and the swipe crosses in front of where it stood. And the head's **dip rides the carry**
rather than the drive, because with the two half a clip apart the snout shot forward at 0.20 and
then sank for the next half second, which the audit reads as a strike whose travel is spread out —
half of `Attack`'s in 0.40 of the clip, its bar exactly. Together: half the travel now falls in
0.20 / 0.21 / 0.32 of the clip. `validation.json` `attackReach` records the trace and `build.py`
asserts the floors (+0.12 forward, −0.06 back, and the gather before the reach). Strip:
[before and after](../../../../docs/triassic/verification/aphaneramma-attack-reach.png).

Nothing else moved: skin **4.43x**, `gape-solid.py` 0 px plain and 7 px as drawn (identical to the
file this replaced, both under the tolerance of 12), `lag.mjs` 0.00 % of a body, every joint owns
skin, packaging parity exact and the LOD1 byte-identical to the twin.

## Measured tolerances

| | measured | tolerance |
| --- | ---: | ---: |
| Section envelope, authored against twin, 21 stations | 0.0496 (0.99 % of body length) | 4 % |
| Authored surface to twin surface, max | 0.0327 | 0.20 |
| Authored surface to twin surface, p95 | 0.0159 | — |
| `anchor_mouth` to the nearest surface | 0.0028 of body length | 2 % |
| `anchor_attack_primary` to the nearest surface | 0.0040 of body length | 2 % |
| `anchor_mouth_inside`, inside the head | yes, 0.041 of body length from the surface | 5 % |
| Limb roots seated inside the trunk | all four | > 0.010 raw |
| Skin influences | 4 max, 3.18 mean | 4 |
| Loop seams | 0.0 on all 8 looping clips | 1e-6 |

`exactRigParity`, `exactAnimationParity`, `exactAnchorParity` and `normalizedWeights` all hold
between the authored body and the twin, and `lod1` is the twin byte for byte.

## What is weak, and honestly

- **Paired-limb asymmetry is large** (0.129 of a body length mean). That is the generation's pose
  and it is recorded for the `Neutral` pose pass rather than corrected here — correcting it would
  be sculpting the animal rather than repairing the model.
- **4.45x is mid-pack, not clean.** The residue is concentrated on `tail_01`, where the pelvis, the
  first tail joint, the hind limbs' roots and the base of the tail's own fin all meet.
- **The generation's tail is hooked right round, and this is the worst thing about this body.**
  It sweeps out to 0.22 from the axis at 0.38 of a body and comes back to 0.09 at the tip, so it
  crosses its own station: a slab across the body at the last few stations cuts the tail twice, and
  the y-parameterised centreline every builder in this era measures folds the hook flat. That is
  why `restTurning` reports a mild-sounding 61.98 degrees while a three-quarter render shows a
  closed ring, and why `meanCurvatureRadiusOverSection` calls the tail comfortably gentle at 13.31.
  It is in `tripo-raw/aphaneramma.raw.glb` before any rig, so nothing here caused it and nothing
  here can take it out on the rig — the routes are a Neutral-pose **mesh** unbend or a
  regeneration, both of which belong to the passes that own them. Recorded in
  `docs/triassic/preview-mesh-defects.md`. Rhaeticosaurus
  got to 2.81x on a body whose limbs are blades, and nothing here matches that.
- `fore_upper_R` sweeps 76° in Sprint against its partner's 109°, because the generation posed the
  two forelimbs at different stations and angles. The stroke is the same; the arc a straight
  root-to-tip line covers is not.
- The eye is modelled by the generation and is not separated or reseated: it deforms with the skull.
- Living colours, soft tissues and movements are artistic reconstruction. World travel is
  engine-owned.
