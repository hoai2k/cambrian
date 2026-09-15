# Mixosaurus — the small quick one, and the oldest dorsal fin there is

The delivered Tripo body and its procedural twin share one **28-joint skeleton**, the same three
mouth/attack sockets and **23 byte-for-byte equivalent decoded animation performances**. The twin
is also the runtime LOD, with every clip retained so either model can perform the same gameplay.

This animal is built to read *against* Cymbospondylus, which was delivered in the same batch off the
same machinery. The research separates them: *Cymbospondylus* is a basal eel-bodied undulator, and
*Mixosaurus* has a dorsal fin — the oldest known in any amniote, preserved as fibre-stiffened soft
tissue — plus a lobed tail, which Renesto et al. read as "stable, sustained undulatory swimming;
more fish-like than its basal relatives". So the wave here is **carangiform**: 0.44 of a wavelength
on the body against Cymbospondylus' 0.72, a gain curve that is 3 % of the peduncle's at the
shoulder against 10 %, and a dorsal fin that moves **0.8 % of what the tail tip does**. Those three
numbers are read back off the played rig by the audit.

| Delivery | Triangles | Vertices | Packaged bytes |
| --- | ---: | ---: | ---: |
| `mixosaurus.glb` — authored Tripo body | 20,446 | 11,912 | 1,792,044 |
| `mixosaurus.puppet.glb` — procedural twin | 7,768 | 4,015 | 691,404 |
| `mixosaurus.lod1.glb` — identical puppet alias | 7,768 | 4,015 | 691,404 |

The reduced model is **37.99 %** of the authored triangles, inside the contract's 40 %. The model is
**4.0 engine authoring units** long, faces +Z in glTF and uses +Y up; the runtime normalises by the
bounding box and applies the species' natural size. The research gives adults typically under 1.5 m.

## Source and reconstruction

The preserved source is `tripo-raw/mixosaurus.raw.glb`, SHA-256
`3078ee238d387222165d30d7bf3910f62b889c06712c798c775cd84e23002f3a`. The raw file is never changed.
Intake welds the texture-seam split vertices (10,932 → 9,451) and finds a **single** connected
component; no detached flake is removed. 18,898 source triangles.

### The frame is measured, and this is the body that proves why

This generation lies **25.2°** across the file's axes — the most crooked of the four in this batch —
and its caudal fluke spans further across the body than the tail is long, so neither the file's own
axes nor a bounding box finds the animal. The long axis is the first principal component of the
actual vertices; the roll is read off the countershading, because a roughly elliptical section is
rotationally ambiguous.

| | |
| --- | ---: |
| Angle between the measured long axis and the file's nearest axis | **25.2°** |
| Stations sampled for the first harmonic of darkness | 24 |
| Mean harmonic strength | 0.405 (the build refuses below 0.30) |
| Roll correction applied | −5.9° |

### How posed is the generation?

Recorded for the `Neutral`-pose pass that will re-base these clips. The ratio is the axis's own mean
curvature radius over the body's section radius; Dinocephalosaurus is the calibration (tail ≈ 9,
straightened on the rig; neck 2.8 mean and 1.51 tightest, unbent in the mesh first).

| Run | stations | mean curvature radius ÷ section | tightest |
| --- | ---: | ---: | ---: |
| Whole spine | 9 | **5.92** | 1.53 |
| Head to shoulder | 2 | **5.82** | 4.77 |
| Tail | 5 | **7.58** | 1.98 |

Nothing here needed unbending: at 5.9 mean and 1.53 tightest the spine is looser than the neck
Dinocephalosaurus had to carry onto a new axis, and the tightest station is the peduncle, where a
tail narrows and any ratio against its own section falls. The clips straighten it on the rig.

Paired-limb asymmetry, as the mean distance between each limb's joints and its mirrored partner's,
over body length:

| Pair | joints | mean | worst |
| --- | ---: | ---: | ---: |
| Pectoral | 4 | 0.0447 | 0.0479 |
| Pelvic | 4 | 0.0234 | 0.0272 |
| Both | | **0.0340** | 0.0479 |

This is the most symmetric of the four — a third of Cymbospondylus' — but it is still a pose: the
rig is built to each limb's own measured axis so both deform correctly, and they do not match each
other at rest.

## The two things that are wrong with this generation, and are not fixed here

**1. The fluke.** The proportion audit reads this body as **WRONG**: "caudal fin 0.284 L deep,
deeply forked, with two lobes of comparable size", against `research.md`'s "a well-developed
triangular dorsal lobe of connective tissue over a long, low tail — **not the post-Triassic lunate
fluke**". Measured in this body's own frame the caudal cluster spans y 0.348 to 0.552 and z −0.162
to 0.072: **0.234 of a body length deep**, still deeply forked, still two comparable lobes. The
audit's reading stands.

**2. There is no modelled mouth.** See below.

Neither is repaired here. CLAUDE.md is explicit that a Tripo body is worked rather than authored and
that a known-wrong proportion goes back to the pose for a redraw and a fresh generation; the audit
names this one as "the pose needs restating and the body regenerating". A hand-cut fluke would be a
smooth invented shape welded onto a pored hide, which is the failure the rule exists to prevent.
What it costs is recorded: the animal's silhouette from behind reads Jurassic.

## The mouth: measured off the albedo, because there is nothing to measure geometrically

**Method: the albedo fallback**, and this is the second body in the era to need it.

Placodus' geometric method goes first, as the pipeline requires: every head vertex casts its own
outward normal back into the mesh over 0.030 raw units, and a vertex that hits is looking across the
slit at the lip opposite. Over the whole front third it answers with **29 vertices, of which one is
on the rostrum**; the rest lie at y −0.29 to −0.13, behind the snout entirely, in the cheek crease.
The rostrum, which runs from −0.448 to about −0.28, is one smooth closed tube with the mouth painted
on it — exactly as Dinocephalosaurus' was.

So the lip is read off the light/dark boundary in the source albedo, walking **outwards from the
belly** on each flank rather than inwards from the back: the pale belly is one solid block with a
sharp step off it, where the dark back is mottled and crosses mid value several times.

| | Value |
| --- | ---: |
| Stations measured along the rostrum | 22 |
| Flank-to-flank disagreement, maximum | 0.0096 raw (this animal is not symmetric) |
| Measured line's worst distance from the fitted ramp | **0.216 of the local body depth** |
| Jaw hinge / jaw front | y −0.2828 / −0.4398 |

The cut a plane pass can follow is a ramp, so the measurement's job is to say *which* ramp; the
build refuses a fit worse than 0.40 of a local radius. 0.216 is a looser fit than
Dinocephalosaurus achieved (0.142), and that is honest: a painted mouth line on a mottled flank is
weaker evidence than a modelled slit, and this animal's is weaker than that one's.

**The lining.** There is no measured cavity to size it from, so it is sized off the **head's own**
measured radius profile — and that profile is taken finely (48 stations, ±0.005 bands) rather than
from the whole-body centreline table, which is smoothed five stations wide and reads a tapering
rostrum wider than it is. It is then **fitted**: each ring is shrunk until every point on it lies
inside the closed intake surface. That test is only safe because this generation has no modelled
mouth — where Placodus has one, a point in the lumen is *outside* the closed shell and the test
reads backwards, which is why Cymbospondylus' lining is sized from its measured cavity instead.

The lining is one skinned tube — roof on the skull, floor on the jaw, the wall between them
stretching — wound inwards, and it is the one material here that culls its backfaces. The skin is
double-sided as the backstop under it. It rides the body's measured centreline rather than the
file's x = 0; built on zero it came out **entirely outside** this animal's snout, at −0.019 raw.

**No teeth were authored.** *Mixosaurus* is heterodont in life — pointed in front, blunt and
crushing behind — and the generation models none of it. `protrusions()` finds 4 patches of relief on
the rostrum and records where each falls; one of them straddles the cut, and it is a lip ridge
rather than a tooth, which is what a mouth line is meant to split. CLAUDE.md allows a tooth as an
exception that has to justify itself, and on a 1 m animal at swimming distance an authored row would
be invented shape for no legibility. **An open Mixosaurus mouth shows a lined cavity and no
dentition**, and that is a limitation of the generation, recorded rather than papered over.

### Gape see-through

The metric is a **flood fill from the border**, not a column scan. A column scan
counts every transparent pixel between the top and bottom of the head, which on a three-quarter
view of an open mouth includes the background visible *past* the animal between the jaw and the
shoulder: it read 7-11 % on bodies with no hole in them at all, and the number it was reporting was
the framing. Filling the transparency in from the edge of the image and counting only what the fill
cannot reach leaves exactly the pixels that are enclosed by the animal — a hole straight through it
and nothing else.

Each clip is photographed at the phase **its own gape is widest**, from three views, framed on the
midpoint of skull and `anchor_mouth` in the skull's own frame, with the backface cull emulated
(CYCLES ignores `use_backface_culling`, and without the emulation a review shot shows the near wall
of the lining that the runtime throws away, which hides the fault instead of showing it).

| Clip | gape | worst enclosed hole |
| --- | ---: | ---: |
| Idle | 0.04 rad (2.3°) | 1 px of 279405 = 0.0004 % |
| Bite | 0.54 rad (31.2°) | 1 px of 205481 = 0.0005 % |
| Attack | 0.48 rad (27.5°) | 5 px of 304081 = 0.0016 % |
| Heavy | 0.60 rad (34.2°) | 2 px of 284475 = 0.0007 % |
| Eat | 0.44 rad (25.1°) | 2 px of 215608 = 0.0009 % |
| Ability | 0.46 rad (26.4°) | 1 px of 223599 = 0.0004 % |

**The backdrop proof.** Widest gape of each clip is then rendered against a saturated backdrop
twice — once with the cull shim and once without — and the two images differed by
**0.0004 % of pixels** at worst (largest single-channel difference 9/255, which is CYCLES' own sampling
noise at 10 samples). Comparing against the plain background instead would have measured the
backdrop and passed whatever the mesh did; comparing the two renders of the same frame is what
actually says the lining closes the mouth.

**The generation arrived mouth-closed.** Nothing here is a gaping pose brought shut: the jaw sits
closed in the neutral pose because that is how the intake surface was modelled, the cut is taken
along the measured seam of a closed mouth, and every clip that opens it opens it from there.

### Skinning tears

`node tools/triassic/skin-tears.mjs` sweeps every edge of every skinned mesh over 17 phases of all
23 clips and reports the ones stretched furthest past their rest length, with an absolute floor of
1.5 % of body length so a thousandth of oral geometry cannot outrank a torn flank.
`_pipeline/record-tears.mjs` runs the same sweep and writes it into `validation.json`, split in two,
because one number for both halves hides the half that matters:

| | worst ratio | on | in | grew |
| --- | ---: | --- | --- | --- |
| **skin** | **3.62x** | `hind_mid_R` | Dart | 0.020 → 0.071 |
| oral lining | 29.16x | `skull` | Heavy | 0.006 → 0.179 |

The **skin** figure is the one to read, and the one to compare against the shore batch
(Nothosaurus 2.98x, Tanystropheus 6.1x, Placodus 12.4x, Macrocnemus 23.3x, Coelophysis 25.3x). The
lining is a single skinned tube whose roof rides the skull and whose floor rides the jaw: the wall
between them is *built* to stretch, its rest length at a shut mouth is nearly nothing, and its ratio
at full gape says the mouth opened rather than that anything tore.

The first build of this body measured far worse, and the fix is in the weights rather than in the
gates. Every gate a builder writes — a shell-thickness threshold that tells a blade from a flank, a
radius round a limb's polyline — is a per-vertex decision, and two vertices a hundredth of a body
apart can fall on opposite sides of one. `T.relax_weights` diffuses the weight field over the mesh's
own edge graph before it is written, **coupled by inverse edge length** so the sliver triangles a
Tripo surface carries (one thirteenth of the median edge, on this batch) pull their two ends
together hardest, welding runs joined by edges under a quarter of the median into one weight set,
and **trimming to four influences on every pass rather than once at the end** — a long tail of tiny
influences makes a single top-four cut pick a different four on neighbouring vertices, which is a
worse discontinuity than the gate it was sent to fix.

## Rig and motion

The shared rig is root, body, chest, neck, skull, jaw, **seven caudal controls**, two caudal fin
lobes, the **dorsal** fin's own seated joint, and three controls per limb — 28 joints. Skinning is
by arc length along measured polylines; every vertex has normalised nonzero weights and at most four
influences (mean 2.03).

Nothing about the fins is typed. The blades are found by connectivity on the measured shell
thickness and classified by where they sit: a paired paddle reaches out to one side, the caudal
reaches past the end of the body, and the **dorsal** is the median blade that stands above the axis
and reaches nowhere sideways. It is a stiffened blade in life — fibre bundles, not a flag — so it
gets one joint, it is seated inside the back rather than sitting on it, and it only ever leans.

The action set is the contract's, plus this animal's own **Dart** and **Breathe**. `locomotion` is
`Swim`. Everything is shorter and faster than the giant's, because a metre-long animal beats at
several times the rate of an eighteen-metre one and a clip set that did not say so would make the
two read as the same creature at two sizes.

| Clip | s | | Clip | s | | Clip | s |
| --- | ---: | --- | --- | ---: | --- | --- | ---: |
| Idle | 2.0 | | Bite | 0.35 | | Stagger | 1.0 |
| Swim | 1.1 | | Heavy | 0.9 | | Ability | 0.8 |
| Sprint | 0.7 | | Hit | 0.45 | | Grab | 1.0 |
| TurnLeft | 1.0 | | Death | 1.6 | | Breath | 1.8 |
| TurnRight | 1.0 | | Guard | 1.0 | | Growth | 1.2 |
| Dive | 1.0 | | Parry | 0.3 | | **Dart** | 0.6 |
| Rise | 1.0 | | Dodge | 0.4 | | **Breathe** | 2.4 |
| Attack | 0.7 | | Eat | 1.2 | | | |

Idle, Swim, Sprint, Guard, Eat, Grab and Breathe loop exactly. **Grab is a 1.0 s held loop**, inside
the contract's 0.9–1.2 s, and the audit checks its duration and its loop.

### Swim and Sprint, and what makes them carangiform

| | Mixosaurus | Cymbospondylus |
| --- | ---: | ---: |
| Wavelengths on the body at once | **0.44** | 0.72 |
| Gain at the shoulder, as a fraction of the peduncle's | 0.03 | 0.10 |
| Stations peaking in order | 4 / 4 | 5 / 5 |
| Head travel as a fraction of the tail tip's | **1.7 %** | 11 % |
| Dorsal-fin travel as a fraction of the tail tip's | **0.8 %** | — |
| Caudal lobes trailing the peduncle | 0.127 of a beat | 0.135 |

The head is the quiet end by construction: the skull takes back 86 % of whatever the chain in front
of the pivot has added, measured from the joints themselves rather than from a tuned constant.

### How the attack reads

`Attack` and `Heavy` cock into a lateral S loaded from the tail forward, drive it head-last and
gather; the gape parts on the cock, is widest as the body unrolls and shuts on the follow-through.
`Bite` is a third of a second and the whole of it is the snap — open hard at 0.56 rad, shut harder.

**`Dart` is the one this animal is judged on.** It is the roster's `shoalDart` and it is a
**C-start**, not a short Attack: every joint folds the same way at once — that is what makes it a C
rather than a wave — it holds for two frames, and then snaps through straight and overshoots the
other way. There is no gape in it (the audit refuses more than 0.12 rad) and no reach with the jaws;
what there is, is a launch.

| Clip | snout reach (units) | half the snout's travel falls inside |
| --- | ---: | ---: |
| Attack (0.7 s) | 0.455 | 31 % of the clip |
| Heavy (0.9 s) | 0.456 | 30 % |
| **Dart (0.6 s)** | **0.902** | **25 %** |
| Bite (0.35 s) | 0.165 | 31 % |

Dart carries the animal twice as far as Attack does in less time, and puts half of that travel
inside a quarter of the clip. That is the difference between a fast-start and a bite.

### What the limbs do, in degrees

The standing rule is that a limbed swimmer's dash has to paddle, and this animal is the exception
the rule has to survive: an ichthyosaur's forefin is a **hydrofoil**, not an oar. Nothing in the
anatomy rows — the humerus is short, the blade is stiff, the propulsion is entirely axial — so a
`Sprint` that swung the fins back and forth would be a worse animal, not a more compliant one.
`limbSweepDegrees` in `validation.json` is what it does instead, measured at the limb root over a
whole cycle:

| Clip | fore | hind |
| --- | ---: | ---: |
| Swim | 10° along the body, 10° out from the flank | 6° / 6° |
| Sprint | 14° / 14° | 8° / 8° |

That is the fin *setting its angle against the beat*, and the figure is deliberately not small: the
first build ran it at 0.030 rad, which measured about five degrees over a cycle and read on the
sheets as a fin welded to the flank. Where the fins genuinely work is the manoeuvres — they set
pitch in `Dive` and `Rise`, bank the turns, brace in `Guard` and `Parry`, and cock and drive with
the strike — and those are much larger angles than either row above.

## Measurements

`mixosaurus-profile.json` records **21 exact plane-intersection envelopes** of both actual meshes.

| Measure | Value | As % of the 4.0-unit body | Tolerance |
| --- | ---: | ---: | --- |
| Maximum dorsal/ventral/width envelope difference | 0.1233 | **3.08 %** | 4 % |
| Nearest twin-surface distance, 95th percentile | 0.0114 | 0.29 % | — |
| Nearest twin-surface distance, maximum | 0.0194 | 0.49 % | — |
| `anchor_mouth` to the nearest surface | 0.0115 units | 0.29 % | 2 % |
| `anchor_mouth_inside` to the nearest surface | 0.0687 units | 1.72 % | 2 % |
| `anchor_attack_primary` to the nearest surface | 0.0188 units | 0.47 % | 2 % |
| Oral lining seated inside the skin, worst point | +0.0011 raw | inside | inside |
| Hinge envelope seated inside the head, worst point | +0.0030 raw | inside | inside |
| Reduced model triangles | 37.99 % | — | ≤ 40 % |

`anchor_mouth_inside` at 1.72 % is the loosest anchor in the batch and is inside the 2 % bar: it is
the swallow point, which on a short-snouted animal sits well back in a throat the generation does
not model.

The twin resurfaces a **0.0036 raw-unit** voxel occupancy field (116,076 triangles) and reduces at
ratio 0.055 — a finer field than the giant's, because a 1 m animal's fins are relatively thinner and
a coarser one put the twin's hindfin 4.9 % outside the authored envelope. Blade dilation is 0.0028
for the same reason. No source vertex or face is reused; puppet pigment samples each nearest source
triangle's interpolated UV.

## Verification

`node tools/triassic/creatures/mixosaurus/audit.mjs --package --decode`. Through
`_pipeline/paired-audit.mjs` it asserts exact rig, inverse-bind, socket and clip-sample parity
between the two bodies, normalised weights, unique dynamic clips, loop seams on every channel, no
root or scale channels, Grab's duration and loop, and the LOD's triangle budget and byte identity.
It then plays 61 phases of every clip on both models through Three.js and runs this animal's own
assertions: the wave travels in order, the body carries **between 0.30 and 0.56** of a wavelength
(under a third would be a tuna, over half would be Cymbospondylus — the two animals are separated
here), the dorsal fin keels rather than flaps, the beat grows backwards, the head holds the line,
the lobes lag, Dart keeps its mouth shut and is explosive, and the gape peaks on the drive.

Sheets, rendered from the **decoded packaged** file — the authored body alone. The twin's own pose
set is not rendered: the pairing is verified by the audit, which checks *parity* and cannot see
deformation at all, and every real defect this batch turned up was on the authored body and
invisible on a twin that has no fin rays and no toes. The twin keeps its byte-identical LOD1, its
envelope and surface measurements, the parity checks and its delivered portrait; only the
side-by-side picture is gone.

`creature_render.py` refuses a decoded copy older than the packaged file it came from. A stale
decode renders silently and looks fresh — one pass of these sheets showed Cartorhynchus' paddles
coming apart into spikes at the extremes of its stroke, off a decode written two builds earlier,
while the body that shipped was clean.

- [Side, top and front](paired-volume-sheet.jpg)
- [Deformation: Idle, Swim, the turns, Dive, Rise, Attack, Bite](paired-deformation-sheet.jpg)
- [The wave from above](paired-wave-sheet.jpg)
- **[Dart, from the side and from above](paired-dart-sheet.jpg)** — the fold, the hold and the
  launch. This is the sheet this animal is judged on.
- [The rest of the action set](paired-actions-sheet.jpg)
- [The mouth, open and shut, from the side and from below](paired-mouth-sheet.jpg)

No independent human review is invented by this automated QA record.

## Reproduction

```sh
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/mixosaurus/build.py
node tools/triassic/creatures/mixosaurus/audit.mjs --package --decode
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/mixosaurus/render.py -- --decoded
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/mixosaurus/render.py -- --portraits --twin
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/mixosaurus/mouth-views.py
python3 tools/triassic/creatures/mixosaurus/contact-sheets.py
node tools/triassic/review-bodies.mjs
node tools/update-asset-sizes.mjs
```

`build.py` authors both geometry and performance and writes only this species' asset family; it
touches no shared registry and performs no git operation. The machinery it shares with the other
three ichthyosauromorphs in this batch is `tools/triassic/creatures/_pipeline/`.

## What is still open

- **The caudal fluke is wrong and is not fixed.** 0.234 of a body deep, deeply forked, two
  near-equal lobes, where the research gives a long low tail with one triangular dorsal lobe. Back
  to the pose and a regeneration.
- **There is no modelled mouth and no dentition.** The mouth line is painted, the lip was read off
  the albedo at a looser fit than Dinocephalosaurus managed, and an open mouth shows a lined cavity
  with nothing in it. A generation with a modelled slit would fix all three at once.
- **The limbs are posed**, as on every body in this batch; the mirrored-partner distance is recorded
  in `validation.json` under `limbAsymmetry`.
- Mixosaurus is **not** in `tools/triassic/shipped.json` and its preview badge is **not** cleared.
  It is registered in `src/content/triassic/review-bodies.json`, the viewer-only register for a
  built body waiting on a human.
- **There are no eye globes**, as on every Triassic body delivered so far.
- **Only the twin's portrait is written** (`public/assets/triassic/creatures/mixosaurus.puppet.png`),
  beside the other delivered bodies that carry one. The authored body's roster cards are not:
  `render.py -- --portraits` produces them into `portraits/`, and the placeholder cards cut from the
  canonical pose stay where they are until a human decides this body ships.
- Living colours, soft tissues and movements are artistic reconstruction. World travel, grip and
  capture rules remain engine-owned.
