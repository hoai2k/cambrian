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
| Authored body | `aphaneramma.glb` — 22,479 triangles, the generation's own surface and UV albedo |
| Procedural twin | `aphaneramma.puppet.glb` — 7,764 triangles (34.5 %), a voxel-occupancy resurfacing that reuses no source vertex or face |
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
| the trunk axis above, plus 8 relax passes at hold 0.48 | **4.61x** | `tail_01` in Sprint |

The last row is a tenth worse than the row before it and is the one that ships, because the row
before it was measured against an axis that was in the wrong place. Era context: Rhaeticosaurus
2.81x is the cleanest, Nothosaurus 2.98x is the reference, Henodus 4.81x, Cartorhynchus 5.17x,
Hupehsuchus 5.79x, Hybodus 5.93x. **Every one of the 26 joints owns skin** (`idle-bones.mjs`).

### The mouth is solid

`gape-solid.py`, at full gape on five clips against a saturated backdrop, with and without a
backface-cull shim: **0 pixels of backdrop seen through the body**, against a tolerance of 12 of
378,000. One closed skinned lining — roof on the skull, floor on the jaw, wall stretching between
them, wound inwards, superellipse power 2.8 because a temnospondyl's skull is very flat and very
wide and an ellipse at that aspect ratio narrows to nothing exactly where the mandible's rim reaches
at full gape. The skin is double-sided behind it as a backstop, and the lining is not culled either:
a sac buried inside a head is never seen from outside whatever its winding, and culling it takes
away the floor exactly when something is looking up into an open mouth.

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
| Sprint | 109.4° | 75.9° | 106.3° | 113.0° |
| Swim | 80.6° | 56.9° | 80.2° | 82.7° |
| Crawl | 97.0° | 69.7° | 93.8° | 102.7° |
| Idle | 18.4° | 13.3° | 18.5° | 18.6° |

The build refuses a limb under 60° in Sprint or 45° in Swim. `fore_upper_R` is the smallest in every
clip because that limb is the one the generation posed furthest forward, so a given rotation covers
less arc; it is the same stroke.

In world travel, from `audit.mjs`: the wave amplitude grows tailward at every joint in both
locomotion clips, the tail tip travels **18.2x** the shoulder in Swim, and the four foot tips travel
1.27 to 1.83 units. The diagonal couplet's lag measures 0 to seven decimal places and the two limbs
of a girdle are half a cycle apart — measured on the **stroke** rather than the raw yaw, because a
left limb and a right limb sweeping backwards together carry opposite rotations about the body's
long axis and read as half a cycle apart if the sign is not undone.

`Heavy` and `Ability` are the animal's own named **side swipe** — the sideways sweep of a long
rostrum — and not a bigger `Attack`. The audit measures the lateral share of the snout's excursion
to say so: Attack **0.048**, Heavy **0.729**, Ability **0.772**, and Ability reaches 1.65 against
Attack's 0.48.

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
| Skin influences | 4 max, 3.24 mean | 4 |
| Loop seams | 0.0 on all 8 looping clips | 1e-6 |

`exactRigParity`, `exactAnimationParity`, `exactAnchorParity` and `normalizedWeights` all hold
between the authored body and the twin, and `lod1` is the twin byte for byte.

## What is weak, and honestly

- **Paired-limb asymmetry is large** (0.129 of a body length mean). That is the generation's pose
  and it is recorded for the `Neutral` pose pass rather than corrected here — correcting it would
  be sculpting the animal rather than repairing the model.
- **4.61x is mid-pack, not clean.** The residue is concentrated on `tail_01`, where the pelvis, the
  first tail joint, the hind limbs' roots and the base of the tail's own fin all meet. Rhaeticosaurus
  got to 2.81x on a body whose limbs are blades, and nothing here matches that.
- `fore_upper_R` sweeps 76° in Sprint against its partner's 109°, because the generation posed the
  two forelimbs at different stations and angles. The stroke is the same; the arc a straight
  root-to-tip line covers is not.
- The eye is modelled by the generation and is not separated or reseated: it deforms with the skull.
- Living colours, soft tissues and movements are artistic reconstruction. World travel is
  engine-owned.
