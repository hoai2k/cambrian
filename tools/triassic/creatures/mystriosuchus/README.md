# Mystriosuchus — authored Tripo body and measured procedural twin

*M. steinbergeri*, Late Triassic, the Dachstein lagoon of Austria. A marine phytosaur:
crocodile-shaped but not a crocodile, with a long narrow rostrum, nostrils raised on a crest before
the eyes, a double row of dorsal osteoderms and a laterally flattened sculling tail. 4.0 m in life
(`docs/research/triassic-swimming.json`), 5.0 engine units as built.

**This animal is one of the era's four shore animals.** `shore: true` in
`src/content/triassic/creatures.ts`, and `kindAt` in `src/sim/triassic/shore.ts` puts it on about a
quarter of the banks. That is load-bearing rather than bookkeeping: a shore animal is never
playable, it is pinned at a post above the waterline and strikes into the water, and `CLAUDE.md`
makes it the stated exception to *a playable Triassic animal swims* — **for whom the land motion is
the primary**. So `locomotion` here is `Crawl`, as it is for Tanystropheus, Macrocnemus and
Coelophysis, and four of its clips are driven by the simulation itself.

```
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/mystriosuchus/build.py
node tools/triassic/creatures/mystriosuchus/audit.mjs --package --decode
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/mystriosuchus/render.py -- --decoded
python3 tools/triassic/creatures/mystriosuchus/contact-sheets.py
/opt/blender/blender -b --factory-startup --python tools/triassic/gape-solid.py -- mystriosuchus Bite@0.12 Heavy@0.6 Ability@0.55 SnapLeft@0.35 Eat@0.4
node tools/triassic/skin-tears.mjs public/assets/triassic/creatures/mystriosuchus.glb
node tools/triassic/idle-bones.mjs public/assets/triassic/creatures/mystriosuchus.glb
```

## What the delivery is

| | |
| --- | --- |
| Authored body | `mystriosuchus.glb` — 22,406 triangles, the generation's own surface and UV albedo |
| Procedural twin | `mystriosuchus.puppet.glb` — 7,776 triangles (34.7 %), a voxel-occupancy resurfacing that reuses no source vertex or face |
| Reduced model | `mystriosuchus.lod1.glb` — **byte-identical to the twin** |
| Rig | 28 joints, one armature, one set of inverse binds, one set of sockets, one set of actions on both bodies |
| Clips | 27, of which 8 loop — the standard set plus `Crawl` and the four the shore mechanic drives |
| Anchors | `anchor_mouth` (jaw), `anchor_mouth_inside` (skull), `anchor_attack_primary` (skull) |

Source: `tripo-raw/mystriosuchus.raw.glb`, preserved unchanged (`f1835bc9…`); the build reads the
published preview, which is the same geometry repackaged — 19,746 triangles and 9,875 vertices
after the 1e-6 weld, one connected component, no flake removed.

## The shore performance, on the simulation's own clock

`shoreClip` in `src/sim/triassic/shore.ts` names exactly four clips and gives each a duration taken
from the mechanic's own constants. A clip whose length merely *resembles* the phase it plays under
is two clocks that happen to agree, so these are built from the constants:

| clip | duration | from |
| --- | ---: | --- |
| `Lower` | 1.5 s | `TELEGRAPH` |
| `SnapLeft` | 0.6 s | the strike window |
| `SnapRight` | 0.6 s | the strike window |
| `Retract` | 0.9 s | `RECOVER` |

`Severed` is Tanystropheus' alone — a neck long enough to cut — and this animal does not carry it.

**Which way a snap goes is checked, not assumed.** The shore pass has already shipped a strike that
named the wrong side, and no check saw it because the hit lands either way. The chain: a shore
animal is pinned at `yaw = π`, increasing yaw turns a creature to its left, so its left is world
−x; a model faces its own +Z with up +Y, so model-local left is +X; `export_yup` maps Blender +X to
glTF +X. `audit.mjs` measures the skull's signed lateral excursion in the loaded model's own frame:
`SnapLeft` **+0.568**, `SnapRight` **−0.528**, and the audit refuses a pair whose product is not
negative. Both snaps put the mouth socket 1.7 units into the water; `Lower` drops the skull 0.42
units and reaches 1.33.

## The judgement calls, and what settled each

### Which way the body lies

`preview-orientation.json` records an **estimated** yaw of 180 for this animal, read off a
fixed-world-axis render. Nothing here reads it. The long axis is the vertex cloud's first principal
component, 8.50 degrees off the file's own Y. The **roll is the interesting one: −14.59 degrees**,
read off the countershading (harmonic strength 0.407 over 24 stations, dorsal measured at 75.4).
On a body this symmetric no bounding box and no second principal component could have found that —
a roughly elliptical section is rotationally ambiguous — and a body left rolled by fifteen degrees
swims with its flank to the sky.

### The body's own axis — measured twice, and this animal is why

`T.measured_centreline` takes the median x and z of the *thick* vertices in each slab, which is
written for a body whose appendages are blades. **A sprawling leg is thick**, so it enters the
median and drags it into the armpit. Measured on this generation, the axis it returns is:

- **outside the skin** at y −0.15, where the body is 0.15 wide and 0.08 deep (`depth` −0.0066);
- 0.0075 inside through the whole head, where the head is 0.07 deep;
- displaced by up to 0.068 of a body length toward whichever limb has more vertices in the slab.

Everything downstream reads off it: limb roots are seated by pulling them towards it, the skin is
banded by arc length along it, the Voronoi test that says which vertices are a limb's measures
distance to it, and `curvature_over_section` is the ratio of its bend to its own thickness. The
first build failed outright on it — `T.seat` could not find a point 0.014 inside the skin anywhere
along the line from the shoulder to the axis, because the axis was not in the animal.

So the axis is measured twice. The kit's pass finds the limb clusters; then **2,375 vertices** that
are nearer a limb's own polyline than the rough axis are dropped, and the second pass takes the
**mid-range of the 4th and 96th percentiles** rather than the median — a centre is the middle of a
section, not the middle of its vertices. Both this builder and Aphaneramma's do it, and on
Aphaneramma the correction moved the tail's `meanCurvatureRadiusOverSection` from 5.86 to 13.31 and
its tightest station from 1.42 to 3.97. **The bend was in the measurement, not the animal.**

### The head's own section, and a lining that went through the skull

`head_half_depth` is the 90th percentile of |z − cz| in a slab. It is what the painted mouth line is
read in *units of*, what sizes the oral lining, and what the seam is built from (`cz + u ·
halfDepth`). Taking every vertex in the slab, it went **0.025 → 0.177 in one station** at y −0.354 —
which is where the **forelimb** enters the slab, not where the head gets deep. This generation's
forelimbs reach forward under the jaw. The consequence ran all the way down: the mouth line climbed
out through the top of the skull, the extrapolation past the read carried it further, and the oral
lining ended up **0.034 outside the skin**. Nothing upstream said so; what said so was the
oral-part seating assertion three hundred lines later.

Two fixes, both in this builder and Aphaneramma's: the head's section drops the limb mask the axis
pass already measured, and **the seam is now asserted to stay inside the animal** at 40 stations
along it, because a station where the seam leaves the skin is a cut through open air.

### The mouth line

Placodus' geometric method returns **87 hits** over the whole front third at every gap from 0.02 to
0.05, spread over **0.199 of z** — the entire depth of the head. That is the gular folds and the
scute relief finding each other across a crease; a modelled slit is a thin band along the lip. So
the line is painted.

`tripo.painted_line` reads it as a continuous curve with the jump penalty raised from the kit's 1.2
to **3.0**: roughness **0.0339** of the local radius, flank disagreement **0.167** mean and 0.30 at
worst. The read runs to `Y0 + 0.180` and **stops short of the hinge** at `Y0 + 0.215`: at the jaw
corner the mandible flares, and a render of the fitted line on the head showed the path leaving the
lip and climbing onto the gold-on-dark boundary above it, pinned against the search band's own
ceiling for the last eight stations. The seam is extrapolated from there on the slope of the
stations that do read (−0.064). A straight cut would have deviated **0.186 of the local radius**.

The flank disagreement is the weakest number in this build (Aphaneramma's is 0.106): this hide is
dark with gold blotches rather than countershaded, and the two sides are painted differently.

### The tail curls in two planes

Up and then down as well as across — an S, so it has two curvature centres rather than one.
Measured on the corrected axis: tail **7.61 mean, 3.22 tightest**, per station
`[8.8, 7.8, 15.6, 6.8, 3.5, 3.2]`. That is the **gentle case** against Dinocephalosaurus'
calibration (tail around 9, straightened on the rig) and nothing here is unbent in the mesh.

The head-and-neck run is the tight one: **2.44 mean, 1.55 tightest**, which is Dinocephalosaurus'
neck territory (2.8 mean, 1.51 tightest, which *was* unbent in the mesh). It is a much shorter run —
two joints over 0.06 of a body, against a neck that was most of the animal — and what it records is
a head carried up off the shoulders, which a rig holds down without difficulty. It is flagged here
for the `Neutral` pose pass rather than acted on.

Paired-limb asymmetry: **0.091 of a body length mean, 0.117 at worst** — the two forelimbs sit 0.093
of a body apart along the axis and the two hind limbs 0.046 apart.

### Sprawling limbs, and where the skin tears

`skin-tears.mjs`, worst **skin** ratio, in the order the fixes landed:

| build | worst skin | what changed |
| --- | ---: | --- |
| first | 8.01x | chest → body → tail_00 with 0.157 and 0.155 of a body between them |
| + `thorax` and `lumbar`, halving both gaps; 4-joint limbs | 9.10x | *worse* — see below |
| + limb blend as a fraction of the limb's own length | 8.32x | |
| back to 3-joint limbs with a wider proportional blend; the snap graded off the shoulder | 7.65x | |
| + a wider Voronoi margin, 10 relax passes, a shorter limb excursion in the water | **5.51x** | |

Three findings worth keeping:

- **A fourth limb joint made it worse.** Rhaeticosaurus' flippers wanted four because a hydrofoil
  bends along its length; a sprawling leg is a *straight polyline through a bent limb*, so a fourth
  joint narrows every weight band without describing the animal any better.
- **The blend between a limb's joints is a fraction of that limb's own length, not a constant.**
  Rhaeticosaurus' 0.050 is 0.16 of a flipper that reaches 0.30 from the axis; copied as a number
  onto a leg whose whole chain is 0.09 long it is two and a half *segments* wide, and `limb_chain`
  then hands every vertex on the limb all four joints at nearly the same weight. That is over the
  four-influence budget once the root station is added, so `relax_weights` trims — and picks a
  *different* four on neighbouring vertices, which is exactly the discontinuity Cartorhynchus'
  radiating paddle spikes came from.
- **The snap had to be graded off the shoulder.** Giving `chest` the same 0.52 rad of yaw as
  `neck_00` put thirty degrees into one joint at the shoulder girdle and tore 640 edges on `thorax`;
  a crocodilian head swing is carried by the neck and the front of the trunk together (1.0 / 0.55 /
  0.28 over `neck_00`, `chest`, `thorax`).

Era context: Rhaeticosaurus 2.81x is the cleanest, Nothosaurus 2.98x is the reference, Henodus
4.81x, Cartorhynchus 5.17x, Hupehsuchus 5.79x, Hybodus 5.93x. **Every one of the 28 joints owns
skin** (`idle-bones.mjs`).

### The mouth is solid

`gape-solid.py` at full gape on five clips, against a saturated backdrop, with and without a
backface-cull shim: **2 pixels of backdrop seen through the body**, against a tolerance of 12 of
378,000. One closed skinned lining, roof on the skull, floor on the jaw, wall stretching between
them, wound inwards, superellipse power 2.7; the skin is double-sided behind it as a backstop and
the lining is not culled either.

## The gaits

`Crawl` is the locomotion and is where the limbs carry the animal. Swept angle at each limb root,
taken from the **limb's own direction** (root joint to tip joint in world space) rather than off an
Euler channel:

| clip | `fore_upper_L` | `fore_upper_R` | `hind_upper_L` | `hind_upper_R` |
| --- | ---: | ---: | ---: | ---: |
| Crawl | 87.9° | 77.5° | 100.3° | 108.7° |
| Sprint | 48.9° | 42.8° | 60.5° | 65.0° |
| Swim | 32.4° | 28.0° | 40.4° | 43.6° |
| SnapLeft | 87.8° | 43.3° | 34.4° | 47.3° |
| Idle | 16.0° | 14.0° | 18.2° | 19.6° |

The build refuses a limb under 60° in `Crawl` or under 40° in `Sprint`. In world travel every foot
tip covers more than 1.2 units in `Crawl`, the diagonal couplet's lag measures 0 to seven decimal
places and a girdle's two limbs are half a cycle apart — measured on the **stroke** rather than the
raw yaw, because a left limb and a right limb sweeping backwards together carry opposite rotations
about the body's long axis.

**In the water the tail is the engine.** A crocodile-shaped ambusher sculls and holds its limbs back
along its flanks; it does not row. The tail tip travels **41x** the shoulder in both `Swim` and
`Sprint`, the armoured trunk's own bend is under a quarter of the tail's, and the limbs are trailed
and kick rather than paddling. That is a deliberate departure from the era's "a limbed swimmer's
dash has to paddle" rule, taken because the rule's own exception names this animal: it is a shore
animal and its primary is the land gait. The audit still refuses frozen limbs in the water
(every foot tip over 0.15 units).

`Heavy` and `Ability` are the animal's own named **surface lunge** — a straight-line charge driven
by one enormous tail stroke, not a sweep. Forward-over-lateral excursion of the snout: Attack 31.6,
Heavy 59.3, Ability 21.7, and Ability reaches 0.859 against Attack's 0.364.

## Measured tolerances

| | measured | tolerance |
| --- | ---: | ---: |
| Section envelope, authored against twin, 21 stations | 0.1256 (2.51 % of body length) | 4 % |
| Authored surface to twin surface, max | 0.0722 (1.44 %) | 0.20 |
| Authored surface to twin surface, p95 | 0.0191 | — |
| `anchor_mouth` to the nearest surface | 0.0024 of body length | 2 % |
| `anchor_attack_primary` to the nearest surface | 0.0057 of body length | 2 % |
| `anchor_mouth_inside`, inside the head | yes, 0.024 of body length from the surface | 5 % |
| Limb roots seated inside the trunk | all four | > 0.010 raw |
| Skin influences | 4 max, 3.44 mean | 4 |
| Loop seams | 0.0 on all 8 looping clips | 1e-6 |

`exactRigParity`, `exactAnimationParity`, `exactAnchorParity` and `normalizedWeights` all hold
between the authored body and the twin, and `lod1` is the twin byte for byte.

## What is weak, and honestly

- **The twin is 2.5 % off at its worst station**, against Aphaneramma's 0.99 %. The voxel field
  cannot hold the dorsal osteoderm crest and the very narrow rostrum at the same voxel size; the
  p95 surface distance is 0.019, so the miss is local rather than general.
- **Eight tooth patches straddle the mouth cut.** On a phytosaur the teeth run the whole jaw margin
  and the generation models the closed rows as one continuous band of relief across the line, so a
  cut along the painted lip necessarily passes through some of them. This is the family of fault
  Placodus shipped; it is recorded in `validation.json` (`toothPatchesStraddlingTheCut`) rather than
  smoothed away, because moving the cut off the painted line to miss them would put the seam
  somewhere the animal is not.
- **The flank disagreement on the mouth line is 0.167** of the local radius, the worst of the two
  bodies in this batch. The hide is blotched rather than countershaded and the two sides are painted
  differently.
- **The head-and-neck curvature is 2.44 mean / 1.55 tightest**, which is on the wrong side of
  Dinocephalosaurus' calibration. It is a two-joint run over 0.06 of a body, so the consequence is
  small, but it is the one thing in this body a `Neutral` pass might want to unbend in the mesh.
- **5.51x is mid-pack, not clean.** The residue is on `hind_lower_L` and on the band behind the
  shoulder girdle.
- Living colours, soft tissues and movements are artistic reconstruction. World travel is
  engine-owned.
