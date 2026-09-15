# Cartorhynchus — the amphibious one, and the only paddler in the batch

The delivered Tripo body and its procedural twin share one **25-joint skeleton**, the same three
mouth/attack sockets and **23 byte-for-byte equivalent decoded animation performances**. The twin is
also the runtime LOD, with every clip retained so either model can perform the same gameplay.

*Cartorhynchus* is the odd one out of these four in exactly one way: **its limbs do the work**. The
other three carry their paddles as control surfaces and drive with the tail. This animal has the
shortest trunk in the set, pachyostotic ribs (ballast, not armour), and flipper-wrists so poorly
ossified that Motani et al. 2014 read them as bending like a sea turtle's — and the research's
reading of its locomotion is "anguilliform at slow speed, **paddle-assisted**", on a body that
hauled out. So the forelimbs here take a real stroke, and the audit measures them at **1.29 times
the tail tip's travel**: on the other three that ratio is well under one by construction.

| Delivery | Triangles | Vertices | Packaged bytes |
| --- | ---: | ---: | ---: |
| `cartorhynchus.glb` — authored Tripo body | 21,020 | 12,211 | 1,743,196 |
| `cartorhynchus.puppet.glb` — procedural twin | 7,670 | 3,941 | 680,192 |
| `cartorhynchus.lod1.glb` — identical puppet alias | 7,670 | 3,941 | 680,192 |

The reduced model is **36.49 %** of the authored triangles, inside the contract's 40 %. The model is
**3.0 engine authoring units** long, faces +Z in glTF and uses +Y up. The research gives ~40 cm
reconstructed, from a 21.4 cm preserved skeleton.

## Source and reconstruction

The preserved source is `tripo-raw/cartorhynchus.raw.glb`. Intake welds the texture-seam split
vertices (11,278 → 9,799) and finds a **single** connected component; no detached flake is removed.
19,594 source triangles. The raw file is never changed.

The frame is measured rather than read off the file: the long axis is the first principal component
of the actual vertices (4.8° off the file's own axis), and the roll is read off the animal's own
countershading — 24 stations, mean harmonic strength **0.548**, the strongest signal of the four,
and a roll correction of −7.3°.

The proportion audit reads this body as **OK**: "Snout 0.10 L, and through frac 0.19–0.26 the body
with its flippers stands 0.40 L deep and 0.59 L across (thick and blunt, as a pachyostotic body
should be), tail 0.24 L. Matches 'very short snout (about half skull length)', 'thick, pachyostotic
ribs', 'short trunk, few vertebrae'." Nothing here contradicts that. The builder additionally
asserts that the forelimbs are the larger pair, which the fossil requires and the generation
delivers: measured reach 0.383 against 0.235 from the axis.

### How posed is the generation?

| Run | stations | mean curvature radius ÷ section | tightest |
| --- | ---: | ---: | ---: |
| Whole spine | 7 | **1.09** | 0.62 |
| Head to shoulder | 2 | **1.66** | 1.21 |
| Tail | 3 | **0.89** | 0.62 |

**Read this one with care.** The ratio is the axis's curvature radius over the body's *own* section radius, and this animal is 0.42 of a body length deep and 0.59 across at mid-trunk — the stoutest of the four by a long way. A ratio below 1 does not mean the centreline is coiled; it means the centreline wanders on a scale finer than the body is thick, which on a blunt body is measurement noise rather than pose. The absolute number is the useful one: the measured centreline's lateral range is 0.046 of a body length and its vertical range 0.142, against Cymbospondylus' 0.036 and 0.067. There is nothing here to unbend.

Paired-limb asymmetry, as the mean distance between each limb's joints and its mirrored
partner's, over body length:

| Pair | joints | mean | worst |
| --- | ---: | ---: | ---: |
| Pectoral | 4 | 0.0725 | 0.1327 |
| Pelvic | 4 | 0.0431 | 0.0598 |
| Both | | **0.0578** | 0.1327 |

## The mouth: the geometric method, and only just

**Method: the geometric one.** Placodus' measurement — every head vertex casts its own outward
normal back into the mesh over 0.030 raw units, and a vertex that hits is looking across the slit at
the lip opposite — answers here with **26 vertices on the rostrum**, against Placodus' 193 and
Cymbospondylus' 280.

Twenty-six is a small number and the honest question is whether it is a mouth or noise. It is a
mouth: they lie in one band, their mid height moves smoothly from 0.0746 to 0.0764 along the snout,
and their half width and half depth grow and then taper as a slit's do. What it is *not* is an open
cavity — this is a shallow modelled groove on a very short blunt snout, and it is measured as one.

Because 26 points is thin evidence, the seam is the **straight ramp fitted to** the per-station mid
heights rather than the raw curve: a curve fitted through that little evidence would be fitting the
noise. The residual is reported both ways in `validation.json` — against the head's local depth
(the useful number) and against the slit's own half depth (which is 0.002 raw, so any residual looks
enormous against it).

The jaw is cut along that ramp with the shear-cut-unshear pass, the lining is one skinned tube on
the cavity's own measured section wound inwards, and the skin under it is double-sided as the
backstop. The lining rides the measured centreline rather than the file's x = 0.

**No teeth were authored, and that is right.** Huang et al. 2020 found this animal's teeth by CT:
rounded, molariform, angled nearly perpendicular to the jaw, in three rows per ramus, and
**invisible in side view**. The generation carries no dentition. The fossil and the generation agree,
and authoring a row would have contradicted both.

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
| Idle | 0.04 rad (2.3°) | 0 px of 490000 = 0.0000 % |
| Bite | 0.55 rad (31.3°) | 0 px of 490000 = 0.0000 % |
| Attack | 0.48 rad (27.4°) | 1 px of 490000 = 0.0002 % |
| Heavy | 0.60 rad (34.4°) | 2 px of 490000 = 0.0004 % |
| Ability | 0.62 rad (35.5°) | 3 px of 490000 = 0.0006 % |
| Eat | 0.44 rad (25.1°) | 1 px of 490000 = 0.0002 % |

**The backdrop proof.** Widest gape of each clip is then rendered against a saturated backdrop
twice — once with the cull shim and once without — and the two images differed by
**0.000 % of pixels** at worst (largest single-channel difference 4/255, which is CYCLES' own sampling
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
| **skin** | **5.17x** | `chest` | Sprint | 0.011 → 0.057 |
| oral lining | 1.54x | `skull` | Ability | 0.034 → 0.051 |

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

The shared rig is root, body, chest, neck, skull, jaw, **five caudal controls**, two caudal lobes
and three controls per limb — 25 joints, the smallest in the batch, because this is a short animal
with a short tail. Skinning is by arc length along measured polylines.

The action set is the contract's, plus this animal's own **Haul** and **Breathe**. `locomotion` is
`Swim`: this animal could get out of the water, and the roster gives it `punt` and `sink`, but it
lives in it, and `Haul` sits **alongside** the swim set rather than in place of it — Placodus'
`Crawl` is the precedent.

| Clip | s | | Clip | s | | Clip | s |
| --- | ---: | --- | --- | ---: | --- | --- | ---: |
| Idle | 2.4 | | Bite | 0.4 | | Stagger | 1.1 |
| Swim | 1.4 | | Heavy | 1.0 | | Ability | 0.7 |
| Sprint | 0.9 | | Hit | 0.5 | | Grab | 1.0 |
| TurnLeft | 1.2 | | Death | 1.6 | | Breath | 2.0 |
| TurnRight | 1.2 | | Guard | 1.1 | | Growth | 1.2 |
| Dive | 1.2 | | Parry | 0.35 | | **Haul** | 1.6 |
| Rise | 1.2 | | Dodge | 0.45 | | **Breathe** | 2.8 |
| Attack | 0.8 | | Eat | 1.4 | | | |

Idle, Swim, Sprint, Guard, Eat, Grab, Breathe **and Haul** loop exactly. **Grab is a 1.0 s held
loop**, inside the contract's 0.9–1.2 s.

### The stroke

The forelimb cycle is a long power phase sweeping back and down and a quick feathered recovery, with
the hind pair running a third of a beat behind. The **wrist leads the elbow** through it, which is
what *lenticarpus* means — the blade is still catching as the upper arm starts its recovery, which
is what a flexible flipper does and what a stiff one cannot.

| | Cartorhynchus | the other three |
| --- | ---: | --- |
| Forelimb tip travel ÷ tail tip travel, Swim | **1.29** | control surfaces only |
| Forelimb tip travel ÷ tail tip travel, Sprint | **1.18** | — |
| Wavelengths on the body at once | 0.33 | 0.36–0.72 |
| Caudal lobes trailing the peduncle | 0.111 of a beat | 0.119–0.135 |

The body wave is deliberately small (0.080 rad per joint against Cymbospondylus' 0.170): on this
animal the undulation is the assist and the paddles are the drive, which is the research's reading
and the opposite of every other body in the batch.

**Haul** is the flipper-walk. Both pairs plant, out of phase with each other, and the body is
levered forward over them with the belly dragging. The audit measures it as a gait rather than
asserting it: the two pairs plant at different phases, and the body is actually carried forward.

### How the attack reads

`Attack` and `Heavy` cock and drive with the jaws, with the paddles braking on the cock and pulling
on the drive. `Bite` is 0.4 s and the whole of it is the snap.

**`Ability` is a suction snap, not a bite.** The roster's `suctionSnap` "pulls any snack within half
a body length into the mouth", and the fossils say the same thing: a very short snout with
edentulous tips and a large robust hyoid is a suction feeder's kit. So the gape opens *faster than
it shuts* — the audit measures the rise to peak against the fall away from it and requires the rise
to be shorter — and the head is drawn **back** as it opens, because prey comes to the animal. Its
snout reach is 0.071 units against Attack's 0.430, and that is the point: a suction feeder that
lunges is a biter.

| Clip | snout reach (units) | half the snout's travel falls inside |
| --- | ---: | ---: |
| Attack (0.8 s) | 0.430 | 30 % of the clip |
| Heavy (1.0 s) | 0.431 | 30 % |
| Bite (0.4 s) | 0.171 | 35 % |
| Ability (0.7 s) | 0.071 | — (exempt; it has its own test) |

### What the limbs do, in degrees

This is the one animal in the batch that answers the paddling rule head on. `limbSweepDegrees` in
`validation.json`, measured at each limb root over a whole cycle:

| Clip | fore | hind |
| --- | ---: | ---: |
| Swim | 104° along the body, 32° out from the flank | 65° / 20° |
| Sprint | 132° / 32° | 82° / 20° |

The forelimb stroke runs from stretched forward to flush with the flank and back, the wrist leads
the elbow, and the two sides are half a cycle apart. The forelimbs out-travel the tail tip — the
only body here that does — which is what `audit.mjs` asserts rather than leaves to the eye.

## Measurements

`cartorhynchus-profile.json` records **21 exact plane-intersection envelopes** of both actual meshes.

| Measure | Value | As % of the 3.0-unit body | Tolerance |
| --- | ---: | ---: | --- |
| Maximum dorsal/ventral/width envelope difference | 0.0429 | **1.43 %** | 4 % |
| Nearest twin-surface distance, 95th percentile | 0.0085 | 0.28 % | — |
| Nearest twin-surface distance, maximum | 0.1085 | 3.62 % | — |
| Reduced model triangles | 36.49 % | — | ≤ 40 % |

The surface-distance maximum is the largest relative figure in the batch and it is the flipper
rims: this animal's blades are the widest and thinnest relative to its body, and a voxel field
rounds a rim. The envelope — which is what the contract actually bounds — is comfortable at 1.43 %.
Anchors and oral-part seating are in `validation.json`.

## Verification

`node tools/triassic/creatures/cartorhynchus/audit.mjs --package --decode`. Through
`_pipeline/paired-audit.mjs` it proves exact rig, inverse-bind, socket and clip-sample parity
between the two bodies, normalised weights, unique dynamic clips, loop seams on every channel, no
root or scale channels, Grab's duration and loop, and the LOD's budget and byte identity. It then
plays 61 phases of every clip on both models through Three.js and runs this animal's own assertions:
**the forelimbs out-travel the tail**, the wave still travels in order, the beat grows backwards,
the lobes lag, `Ability` opens faster than it shuts, and `Haul` plants its two pairs out of phase
and carries the body forward.

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
- **[The stroke from above](paired-stroke-sheet.jpg)** — Swim and Sprint through a beat. This and
  the haul sheet are what this animal is judged on.
- **[Haul](paired-haul-sheet.jpg)** — the flipper-walk through its cycle, from the side and above.
- [The rest of the action set](paired-actions-sheet.jpg)
- [The mouth, open and shut, from the side and from below](paired-mouth-sheet.jpg)

No independent human review is invented by this automated QA record.

## Reproduction

```sh
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/cartorhynchus/build.py
node tools/triassic/creatures/cartorhynchus/audit.mjs --package --decode
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/cartorhynchus/render.py -- --decoded
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/cartorhynchus/render.py -- --portraits --twin
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/cartorhynchus/mouth-views.py
python3 tools/triassic/creatures/cartorhynchus/contact-sheets.py
node tools/triassic/review-bodies.mjs
node tools/update-asset-sizes.mjs
```

## What is still open

- **`Haul` is a swim-rig gait, not a land rig.** There is no ground contact solving and no weight
  transfer through a substrate: the body is carried forward over planted flippers on the same
  skeleton that swims. For an animal that spends almost all of the game in the water, and whose
  haul-out is a traversal trait rather than a locomotion mode, that is the right trade — but a
  reviewer looking for a land gait will not find one.
- **The mouth is a groove, not a cavity.** 26 measured vertices is the thinnest evidence any of the
  four gave, and the seam is a fitted ramp rather than a measured curve because of it. A generation
  with a real modelled mouth would let the curve be used.
- **The limbs are posed**, as on every body in this batch; see `limbAsymmetry` in `validation.json`.
  On this animal the hind pair is the more asymmetric.
- **The pose-deviation ratio is not meaningful on a body this stout** — see the note above the
  table. The absolute centreline ranges are the number to read.
- Cartorhynchus is **not** in `tools/triassic/shipped.json` and its preview badge is **not**
  cleared. It is registered in `src/content/triassic/review-bodies.json`.
- **There are no eye globes**, as on every Triassic body delivered so far.
- **Only the twin's portrait is written** (`public/assets/triassic/creatures/cartorhynchus.puppet.png`),
  beside the other delivered bodies that carry one. The authored body's roster cards are not:
  until a human decides this animal ships, the placeholder cards cut from the canonical pose
  stay where they are.
- Living colours, soft tissues and movements are artistic reconstruction. World travel, grip and
  capture rules remain engine-owned.
