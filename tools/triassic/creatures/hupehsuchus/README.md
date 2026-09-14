# Hupehsuchus — the armoured one, and a pelican rather than a whale

The delivered Tripo body and its procedural twin share one **28-joint skeleton**, the same three
mouth/attack sockets and **23 byte-for-byte equivalent decoded animation performances**. The twin is
also the runtime LOD, with every clip retained so either model can perform the same gameplay.

Two published readings of this animal disagree, and a build has to pick one.

- **Fang et al. 2023** (*BMC Ecol Evol*) read the skull as converging on a baleen whale, with the
  soft-tissue grooves along the jaw margins as keratin racks and an enlarged buccal cavity:
  continuous ram filter feeding, like a bowhead.
- **Motani, Pyenson & Jiang 2025** (*PeerJ*) re-examined it and found no intraoral space for baleen,
  grooves that are ambiguous in one specimen, flawed morphometrics, and a kilogram-scale animal that
  cannot energetically afford balaenid filtering. They put the skull closest to a **pelican**:
  gulping and lunge feeding, without a filter.

**This build takes the 2025 reading.** It is the stronger case, `docs/triassic/research.md` says so,
and it is also the roster's: `filterGulp` is described as "a lunge through a school with the pouch
open … it feeds on shoals of small fish, not on blooms". So the mouth here is a **pouch**, not a
sieve — it opens wide and low and the throat drops — and the feeding clips are lunges rather than a
cruise with the mouth held open. There is no baleen, no sieve and no cruise-feed clip.

The other thing this animal is, is **stiff**. Rows of dorsal osteoderms over bipartite neural spines
run most of the trunk, and the research is explicit that the trunk does not undulate and the tail
does. The gain curve here is the flattest of the four: zero through the armour, everything behind
it, and the audit measures the armoured trunk at **1 % of the tail tip's travel**.

| Delivery | Triangles | Vertices | Packaged bytes |
| --- | ---: | ---: | ---: |
| `hupehsuchus.glb` — authored Tripo body | 20,930 | 11,921 | 1,853,052 |
| `hupehsuchus.puppet.glb` — procedural twin | 7,660 | 3,941 | 746,428 |
| `hupehsuchus.lod1.glb` — identical puppet alias | 7,660 | 3,941 | 746,428 |

The reduced model is **36.60 %** of the authored triangles, inside the contract's 40 %. The model is
**4.0 engine authoring units** long, faces +Z in glTF and uses +Y up. The research gives ~1 m.

## Source and reconstruction

The preserved source is `tripo-raw/hupehsuchus.raw.glb`. Intake welds the texture-seam split
vertices (11,063 → 9,772) and finds a **single** connected component; no detached flake is removed.
19,540 source triangles. The raw file is never changed.

The frame is measured rather than read off the file: the long axis is the first principal component
of the actual vertices (6.1° from the file's own axis, the straightest of the four), and the roll is
read off the animal's own countershading — 24 stations, mean harmonic strength **0.468**, roll
correction −6.8°.

The proportion audit reads this body as **OK**: "dorsal plate ridge frac 0.15–0.85, head+neck
0.34 L, body 0.156 L deep … Matches 'rows of dorsal osteoderm plates', 'elongate neck and
comparatively small head'." Nothing here contradicts that.

### How posed is the generation?

| Run | stations | mean curvature radius ÷ section | tightest |
| --- | ---: | ---: | ---: |
| Whole spine | 9 | **8.69** | 1.42 |
| Head to shoulder | 2 | **17.76** | 4.52 |
| Tail | 5 | **5.05** | 1.42 |

Nothing here needed unbending. The tightest station is the last caudal joint, where the tail narrows to a blade and any ratio against its own section falls; the trunk, which is the part that must not bend, is the straightest run in the batch.

Paired-limb asymmetry, as the mean distance between each limb's joints and its mirrored
partner's, over body length:

| Pair | joints | mean | worst |
| --- | ---: | ---: | ---: |
| Pectoral | 4 | 0.0278 | 0.0397 |
| Pelvic | 4 | 0.0279 | 0.0370 |
| Both | | **0.0278** | 0.0397 |

## The armour

The osteoderm rows read as blade-thin, because they are plates standing off the back, so the same
measurement that finds a paddle finds them. What tells them apart is that they sit on the midline
above the axis and reach nowhere sideways, and the builder classifies them on exactly that.

| | |
| --- | ---: |
| Plate patches measured | **6** |
| Vertices in them | 2717 |
| Span, as a fraction of body length from the snout | 0.25 to 0.81 |


**They get no bone.** They ride the trunk, which is what a stiff armoured back *is*: a plate row on
its own joint would be a plate row that could move relative to the body it is bolted to. Because the
trunk's own wave amplitude is zero through the armoured span — that is the performance, not an
accident — the plates do not shear against each other, and the audit measures the trunk at 1.0–1.3 %
of the tail tip's travel to prove it. No plate was modelled, moved or added.

## The mouth: measured off the albedo, and a pouch that is animation rather than geometry

**Method: the albedo fallback.** Placodus' geometric method goes first and finds **17 vertices over
the whole front third, none of them on the rostrum** — the long toothless snout is one smooth closed
tube with the mouth painted on it, exactly as Dinocephalosaurus' was. So the lip is read off the
light/dark boundary in the source albedo, walking outwards from the pale belly on each flank.

| | Value |
| --- | ---: |
| Cavity vertices found geometrically, on the rostrum | **0** |
| Stations measured along the rostrum | 22 |
| Flank-to-flank disagreement, maximum | 0.0025 raw |
| Measured line's worst distance from the fitted ramp | **0.047 of the local body depth** |

0.047 is the best fit of the three albedo-measured mouths in this batch and better than
Dinocephalosaurus' 0.142: a long straight toothless snout with a clean countershading step is the
easiest possible case for this measurement.

**The pouch** is one joint under the throat, `pouch`, a child of `jaw`. It carries the generation's
own throat skin — the ventral half of the head behind the jaw's front and in front of the shoulder,
blended off at both ends — and it is swung and **translated down**. It is the one bone in these four
deliveries that keyframes a location channel other than `body`. Nothing was modelled for it: a
pelican's gulp is the floor of the mouth dropping, and dropping the floor is animation.

The pouch fills fast and empties slowly, which is the asymmetry that makes a gulp read as a gulp
rather than as a yawn. Measured off the played rig, as the throat joint's drop from rest in the
jaw's own frame:

| Clip | drop from rest | peak phase |
| --- | ---: | ---: |
| `Gulp` (1.4 s) | see `paired-audit.json` | early |
| `Ability` (2.4 s, the roster's mobile filter gulp) | fills **twice** | 0.25 and 0.7 |
| `Attack`, `Heavy` | fills once on the drive | before the follow-through |
| `Idle` | shut | — |

The audit asserts the pouch fills on Gulp, Ability, Attack and Heavy, is shut at rest, and peaks
before phase 0.62 on the lunges — a pouch that filled late would be a bowhead's cruise, which is the
reading this build rejects.

**The lining** is one skinned tube on the head's own measured radius profile, fitted so every ring
lies inside the closed intake surface, wound inwards, with the skin double-sided as the backstop. It
rides the measured centreline rather than the file's x = 0.

**No teeth, and that is correct.** *Hupehsuchus* is toothless; the generation carries no dentition;
nothing was authored. This is the one animal in the batch where the generation and the fossil agree
about the mouth's contents.

### Gape see-through

<!--SEE-THROUGH-->

## Rig and motion

The shared rig is root, body, chest, neck, skull, jaw, the **pouch**, seven caudal controls, two
caudal lobes and three controls per limb — 28 joints. Skinning is by arc length along measured
polylines; every vertex has normalised nonzero weights and at most four influences.

The action set is the contract's, plus this animal's own **Gulp** and **Breathe**. `locomotion` is
`Swim`. `Ability` is the roster's own 2.4 s mobile filter gulp; `Gulp` is the shorter single lunge
at a shoal, and the two are deliberately different performances rather than one clip at two lengths.

| Clip | s | | Clip | s | | Clip | s |
| --- | ---: | --- | --- | ---: | --- | --- | ---: |
| Idle | 2.6 | | Bite | 0.5 | | Stagger | 1.2 |
| Swim | 1.6 | | Heavy | 1.2 | | Ability | 2.4 |
| Sprint | 1.1 | | Hit | 0.6 | | Grab | 1.1 |
| TurnLeft | 1.5 | | Death | 1.8 | | Breath | 2.4 |
| TurnRight | 1.5 | | Guard | 1.2 | | Growth | 1.4 |
| Dive | 1.4 | | Parry | 0.4 | | **Gulp** | 1.4 |
| Rise | 1.4 | | Dodge | 0.5 | | **Breathe** | 3.0 |
| Attack | 1.0 | | Eat | 1.6 | | | |

Idle, Swim, Sprint, Guard, Eat, Grab and Breathe loop exactly. **Grab is a 1.1 s held loop**.

### Swim and Sprint: stiff in front, everything behind

| | Hupehsuchus | Mixosaurus | Cymbospondylus |
| --- | ---: | ---: | ---: |
| Wavelengths on the body at once | **0.36** | 0.44 | 0.72 |
| Armoured-trunk travel as a fraction of the tail tip's | **1.0 %** | — | — |
| Head travel as a fraction of the tail tip's | 1.3 % | 1.7 % | 11 % |
| Caudal lobes trailing the peduncle | 0.119 of a beat | 0.127 | 0.135 |

The gain curve is `[0, 0, 0.01, 0.05, 0.16, 0.34, 0.58, 0.82, 0.96, 1.0]` from the neck back: the
neck and chest contribute **nothing at all**, the armoured trunk almost nothing, and the last three
caudal joints carry the whole beat. That is the research's "stiff armoured trunk, undulation of the
tail", and it is why this animal reads slow beside Mixosaurus at a similar tail amplitude.

### How the attack reads

This animal has `noBite` in the roster and its light and heavy attacks are named *Gape* and *Gulp*,
so the strikes here are not bites. They are lunges with the pouch: cock, drive, the pouch filling
behind an open jaw, and a slow squeeze on the recovery. The tail keeps working through the lunge —
with no neck and no jaws to reach with, what carries this animal onto a shoal is the beat.

| Clip | snout reach (units) | half the snout's travel falls inside |
| --- | ---: | ---: |
| Attack (1.0 s) | 0.433 | 29 % of the clip |
| Heavy (1.2 s) | 0.435 | 30 % |
| **Gulp (1.4 s)** | **0.612** | 29 % |
| Bite (0.5 s) | 0.165 | 31 % |

The head tips up as the pouch fills, which is what a pelican does and what makes the throat read as
a bag rather than as an open jaw. `Ability` holds the jaws wide through the pass (the audit requires
over 0.6 rad) and swims *through* the shoal rather than stopping at it, which is the roster's
`mobileAbility`.

## Measurements

`hupehsuchus-profile.json` records **21 exact plane-intersection envelopes** of both actual meshes.

| Measure | Value | As % of the 4.0-unit body | Tolerance |
| --- | ---: | ---: | --- |
| Maximum dorsal/ventral/width envelope difference | 0.0174 | **0.43 %** | 4 % |
| Nearest twin-surface distance, 95th percentile | 0.0147 | 0.37 % | — |
| Nearest twin-surface distance, maximum | 0.0308 | 0.77 % | — |
| Reduced model triangles | 36.60 % | — | ≤ 40 % |

0.43 % is by far the best envelope agreement in the batch — this is a slender, smooth, nearly
straight body with short paddles and no fluke, which is the easiest possible case for a voxel
resurfacing. The anchors and the oral-part seating are in `validation.json`.

## Verification

`node tools/triassic/creatures/hupehsuchus/audit.mjs --package --decode`. Through
`_pipeline/paired-audit.mjs` it proves exact rig, inverse-bind, socket and clip-sample parity
between the two bodies, normalised weights, unique dynamic clips, loop seams on every channel, no
root or scale channels, Grab's duration and loop, and the LOD's budget and byte identity. It then
plays 61 phases of every clip on both models through Three.js and runs this animal's own assertions:
the wave travels in order and lives in the tail (0.18–0.48 of a wavelength), the **armoured trunk
does not undulate** (under 10 % of the tail tip), the pouch fills on the feeding clips, is shut at
rest, and peaks before the follow-through, and the mobile gulp holds the jaws wide.

Sheets, rendered from the **decoded packaged** files through identical cameras and lights for both
models:

- [Side, top and front](paired-volume-sheet.jpg)
- [Deformation: Idle, Swim, the turns, Dive, Rise, Attack, Bite](paired-deformation-sheet.jpg)
- [The wave from above — the stiff trunk and the working tail](paired-wave-sheet.jpg)
- **[The gulp](paired-gulp-sheet.jpg)** — Gulp through its beats and the 2.4 s mobile filter gulp,
  from the side and from above. This is the sheet this animal is judged on.
- [The rest of the action set](paired-actions-sheet.jpg)
- [The mouth, open and shut, from the side and from below](paired-mouth-sheet.jpg)

No independent human review is invented by this automated QA record.

## Reproduction

```sh
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/hupehsuchus/build.py
node tools/triassic/creatures/hupehsuchus/audit.mjs --package --decode
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/hupehsuchus/render.py -- --decoded
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/hupehsuchus/render.py -- --decoded --twin
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/hupehsuchus/mouth-views.py
python3 tools/triassic/creatures/hupehsuchus/contact-sheets.py
node tools/triassic/review-bodies.mjs
node tools/update-asset-sizes.mjs
```

## What is still open

- **The feeding reading is a choice**, and a live disagreement in the literature. This build takes
  Motani, Pyenson & Jiang 2025 (pelican) over Fang et al. 2023 (bowhead). If a reviewer wants the
  2023 reading, the clips change: a cruise with the mouth held open, not a lunge.
- **There is no modelled mouth and no throat volume.** The pouch is the generation's own skin moved
  by a joint, so the gulp is a *suggestion* of a pouch rather than a modelled one. A generation with
  a real buccal cavity would let the pouch actually inflate.
- **The plates are one weld with the body.** They are the generation's own relief and they ride the
  trunk correctly, but they are not separable parts and could not be given per-plate articulation
  without cutting the shell.
- **The limbs are posed**, as on every body in this batch; see `limbAsymmetry` in `validation.json`.
- Hupehsuchus is **not** in `tools/triassic/shipped.json` and its preview badge is **not** cleared.
  It is registered in `src/content/triassic/review-bodies.json`.
- **There are no eye globes**, as on every Triassic body delivered so far.
- **No portraits are written**; the roster's placeholder cards stay where they are.
- Living colours, soft tissues and movements are artistic reconstruction. World travel, grip and
  capture rules remain engine-owned.
