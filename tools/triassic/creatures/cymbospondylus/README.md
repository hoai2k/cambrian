# Cymbospondylus — the first giant, rigged as the eel it is

The delivered Tripo body and its procedural twin share one **29-joint skeleton**, the same three
mouth/attack sockets and **23 byte-for-byte equivalent decoded animation performances**. The twin
is also the runtime LOD, with every clip retained so either model can perform the same gameplay.

The thing this delivery is about is the *kind* of swimmer it is. The research calls *Cymbospondylus*
a basal, "primitive" body plan — eel-like proportions scaled to sperm-whale size, an elongate trunk,
a long weakly differentiated tail, **no dorsal fin**, and a low caudal fin rather than a crescent —
and puts its locomotion at "anguilliform/undulatory cruising, not tuna-like thunniform". So the
performance is built to be *measurably* that, and the audit reads it back off the played rig:
**0.72 of a wavelength lives on the body at once**, against Mixosaurus' 0.44 and Hupehsuchus' 0.28,
and the wave runs down every station in order.

| Delivery | Triangles | Vertices | Packaged bytes |
| --- | ---: | ---: | ---: |
| `cymbospondylus.glb` — authored Tripo body | 20,604 | 12,057 | 1,901,512 |
| `cymbospondylus.puppet.glb` — procedural twin | 7,986 | 4,152 | 827,140 |
| `cymbospondylus.lod1.glb` — identical puppet alias | 7,986 | 4,152 | 827,140 |

The reduced model is **38.76 %** of the authored triangles, inside the contract's 40 %. Files are in
`public/assets/triassic/creatures/`, with metadata; meshopt packaging preserves mesh attributes and
animation sample values exactly and textures are embedded. The model is **6.0 engine authoring
units** long, faces +Z in glTF and uses +Y up; the runtime normalises by the bounding box and
applies the species' natural size. The research registry gives 17.65 m.

## Source and reconstruction

The preserved source is `tripo-raw/cymbospondylus.raw.glb`, SHA-256
`62c5f531d6b860e1d001116975d5bf087e0d1dfbcaf61b9ab36ebfae9ba279b5`. The raw file is never changed.

Intake welds the texture-seam split vertices (11,128 → 9,585) and finds a **single** connected
component, so no detached flake is removed. 19,166 source triangles.

### The frame is measured, not read off the file

`tools/triassic/preview-orientation.json` is an estimate and the brief warns it is wrong for at
least one animal. Nothing here reads it. The long axis is the first principal component of the
actual vertices, and it lies **17.9°** away from the file's own y axis — a body rigged on the
bounding box would have been rigged crooked by that much.

The **roll** about that axis cannot come from geometry: a roughly elliptical section is
rotationally ambiguous, and the second principal component of a body with four big paddles points
at the paddles, not at the sky. It is read off the animal's own countershading, as
Dinocephalosaurus' neck and head frames are — dark back, pale belly, and the first circular
harmonic of darkness round each station points at dorsal.

| | |
| --- | ---: |
| Stations sampled for the first harmonic of darkness | 24 |
| Mean harmonic strength | **0.455** (the build refuses below 0.30) |
| Measured dorsal, in the geometric frame | 76.9° |
| **Roll correction applied** | **−13.1°** |

### How posed is the generation?

Recorded for the `Neutral`-pose pass that will re-base these clips. The ratio is the axis's own
mean curvature radius over the body's section radius at that station; Dinocephalosaurus is the
calibration, with a tail around 9 that straightened on the rig and a neck at 2.8 mean / 1.51
tightest that had to be carried onto a new axis in the mesh first.

| Run | stations | mean curvature radius ÷ section | tightest |
| --- | ---: | ---: | ---: |
| Whole spine | 11 | **13.04** | 2.37 |
| Head to shoulder | 2 | 8.97 | 8.72 |
| Tail | 7 | 12.43 | **2.37** |

**Nothing here needed unbending.** The one tight station is the very last, where the generated tail
turns down into the caudal fin — and that downturn is the animal's anatomy (ichthyosaurs have a
hypocercal bend supporting the ventral lobe), not the pose, so straightening it would be the error.

Paired-limb asymmetry, as the mean distance between each limb's joints and its mirrored partner's,
over body length:

| Pair | joints | mean | worst |
| --- | ---: | ---: | ---: |
| Pectoral | 4 | 0.0733 | 0.0919 |
| Pelvic | 4 | 0.0812 | **0.1141** |
| Both | | **0.0772** | 0.1141 |

That is a real pose, not noise: the left pectoral sits 0.044 of a body further back than the right
and hangs 0.15 lower. The rig is built to **each limb's own measured axis**, so both deform
correctly; they simply do not match each other at rest. A symmetric animal is a fresh generation,
not a Blender push-and-pull.

## What the measurements say about the animal, and what is wrong with it

The proportion audit reads this body as **WRONG** — "head 0.22–0.25 L against a documented 2 m
skull on 17.65 m = 0.11 L" — and blames the canonical pose, which is a three-quarter view with the
head towards the camera.

Measured in the body's **own** frame rather than along the file's axis, it is not as bad as that
and it is still wrong. The modelled mouth runs from the snout tip at y −0.448 to the jaw hinge at
y −0.311: **a skull 0.137 of the body**, against the 0.11 the research documents — an overshoot of
about a quarter, not of a factor of two. The audit's 0.22–0.25 was measured to the pectoral girdle
along the un-rotated preview, and the 17.9° tilt inflates it.

**This build does not fix it.** Per CLAUDE.md, a Tripo body is worked, not authored, and a
known-wrong *proportion* goes back to the pose for a redraw and a fresh generation rather than
being remodelled by hand. What it costs is recorded here and in `validation.json`:
`mouth.hingeY` and `mouth.jawFrontY` are the measurement, and the skull is a quarter too long for
the animal in the books.

## The mouth: a measured cut, and the cut's own seam filled

**Method: the geometric one.** Placodus' measurement — every head vertex casts its own outward
normal back into the mesh over 0.030 raw units, and a vertex that hits is looking across the slit
at the lip opposite — answers here with **280 vertices**, against Placodus' 193 and
Dinocephalosaurus' zero. This generation models a real mouth, so Dinocephalosaurus' albedo fallback
was not needed and was not used.

Per station (0.0025 wide, 6th/94th percentiles, lightly blurred) that gives the mouth's mid height,
half width and half depth, and the mid height **is** the seam. It is a curve, so the head is
sheared vertically by −seam(y) first, which carries the curve exactly onto the plane *z* = 0; the
cut is taken there and the shear undone, so every vertex the cut adds lands on the seam itself and
every vertex that was already there returns to where it was. Only head faces are offered to that
pass, so the rest of the body keeps its topology.

**The teeth are the generation's own.** `protrusions()` measures the snout relief the same way
Placodus measures its chisels — a connected patch standing proud of the same surface smoothed —
and finds 4 patches, the largest 0.0045 raw proud. **None of them straddles the cut**
(`toothPatchesStraddlingTheCut` is empty), which is the fault Placodus shipped and had to correct.
No dentition was authored: CLAUDE.md allows a tooth as an exception that has to justify itself, and
a row that the generation already carries does not need one.

**The lining and the hinge envelope are retired (T3D-34), and the cut's own seam is filled
instead.** What used to stand here was a one-sac lining wound into the cavity and a fitted ellipsoid
at the hinge, and neither survives its own measurement:

- the sac is the form CLAUDE.md names as the one that reads as **a mouthful of gum**, and it is
  hidden in play anyway, so it was showing a reviewer the wrong thing the moment the viewer's
  *Mouth geometry* switch went on;
- the ellipsoid covered "the square the cut leaves at the back of the mandible", and since
  `T.jaw_junction` landed there **is** no square: the hinge cross-section is the one run of the rim
  whose two copies the junction holds together, asserted equal weight for weight. Measured as
  drawn — which is how it is drawn, because the runtime hides it — this head reads **1 px through**
  at its widest gape with the plug already invisible. With the switch on it was a black blister
  standing proud of the cheek beside the mouth it was not filling.

**What the cut actually left open**, measured rather than assumed (`T.cut_rim`, in
`validation.json` as `mouth.cutRim`): one closed loop of **112 vertices**, 59 of them on the seam,
reaching **0.042** of a body back from the hinge on a mouth **0.1375** long, plus a 13-vertex loop
the generation's own slit contributes. The twin's is 101 + 9. Forward of the commissure the two jaws
are already separate sheets and the seam plane passes between them without touching either, so
nothing there was cut and nothing there needs anything — this generation is `cut_rim`'s **case 2**,
and `cap_mouth` over the whole boundary would seal its modelled mouth shut.

**The fill is the ruled surface between the two copies of that rim** (`T.seam_web`; the whole
argument is in `_pipeline/tripo.py` above the function and in
`docs/triassic/throat-repairs/oral-verdicts.md`). It closes by construction: every boundary vertex
is a rim vertex's own rest position and own weight dictionary, and linear blend skinning is a
function of those two alone, so the web's boundary *is* the two halves' rims in every pose — worst
rest-position difference 0.0, worst weight difference 0.0, asserted rather than rendered. 250 faces
on the authored body, 220 on the twin. The fold into the flesh is `0.30` of how far the two copies
actually part at the widest gape the clips reach (`SEAM_GAPE`, checked against them), floored and
capped by a cast inwards on the pre-cut intake, and **smoothed four passes round each cycle** —
unsmoothed it came out corrugated and read as a grille.

It wears the **lumen's** albedo and not the cheek's: 280 vertices whose own outward normal meets the
wall opposite, mean (0.193, 0.102, 0.071) against (0.218, 0.212, 0.170) for the rest of the body.
More than half this rim is outer skin, so sampling the rim — which is what `cap_mouth` does, rightly,
where the whole rim is a cut — would have dragged the flank into the inside of a mouth.

It is **off**: named so `src/shared/oral-geometry.ts` matches it, so the game hides it and the
viewer's switch starts with it hidden. It is the only thing that switch turns on for this animal.

As drawn, with it hidden (the shipped state) and shown, at every clip that opens the jaw, and how
much backdrop it covers in a single-sided render:

| clip | hidden `through`/`opened` | shown | backdrop covered |
| --- | ---: | ---: | ---: |
| `Heavy@0.6` | 1 / 744 | 155 / 155 | **3,114** |
| `Lunge@0.7333` | 3 / 719 | 143 / 143 | 2,954 |
| `Eat@0.4333` | 0 / 750 | 146 / 146 | 2,626 |
| `Bite@0.1667` | 0 / 647 | 116 / 116 | 2,224 |
| `Ability@0.3667` | 113 / 308 | 68 / 68 | 944 |
| `Attack@0.4667` | 106 / 286 | 61 / 61 | 884 |
| `Hit@0.3` | 113 / 301 | 64 / 64 | 879 |
| `Stagger@0.6` | 122 / 319 | 76 / 76 | 889 |
| `Death@2.0` | 99 / 244 | 55 / 55 | 704 |
| `Breathe@1.6` | 19 / 19 | 16 / 16 | 8 |
| `Breath@1.3` | 0 / 0 | 0 / 0 | 0 |

The hidden column is unchanged from what shipped, and that is checkable rather than asserted: the
visible geometry is byte-identical to the previous build's, attribute for attribute. `through` rising
on the clips whose hidden figure was near zero is the enclosure test, not the mouth — the web closes
the route from the hole to the frame edge, so what was reachable surround becomes enclosed backdrop.
Skin 2.48x unchanged; worst including oral geometry 9.98x → 2.79x; twin fraction 38.76 % → 36.79 %.

Sheets: `docs/triassic/verification/cymbospondylus-mouth-space.png` (shipped) and
`-mouth-space-seam-web.png` (with the switch on).

**The aimed cut is measured, not adopted.** `docs/triassic/mouths/cymbospondylus-mouth.json` is this
body's first human-aimed cut. Its hinge sits **0.047 of a body behind** the one this builder
measures — a rig change, not a cut change — and its plane runs 0.0028–0.0044 of a body below the
measured lip line, where this builder's own record says a *straight* cut would have deviated from
its measured curve by 0.0007. The comparison is
`docs/triassic/verification/cymbospondylus-aimed-cut-vs-measured.json`;
`npm run triassic:mouth` refuses the file until it is re-aimed at the body that ships.

### The lining as it was, before T3D-34

**The lining.** One closed lining on the cavity's own measured section — 26 stations by 14, from
0.004 behind the hinge to 0.006 past the mandible's front, at 95 % of the measured half width and
half depth — and it is *skinned* rather than split: the roof follows the skull, the floor follows
the jaw, and the wall between them stretches, so no opening the clips reach can part it. It is
wound **inwards** and is the one material here that culls, because what an open mouth shows is the
far wall of the lumen and the near wall has to be got out of the way. The skin does the opposite:
`Cymbospondylus body pigmentation` is double-sided, as the backstop under the lining.

It rides the body's **measured centreline**, not the file's x = 0. That is not a nicety: built on
zero, the lining on the narrowest of these four bodies came out entirely outside the snout it was
meant to be inside, at −0.019 raw.

The hinge envelope — the closed cap over the square the cut leaves at the back of the mandible,
which swings into view the moment the mouth opens — is **fitted rather than typed**: the largest
ellipsoid at the hinge that still lies inside the closed intake surface everywhere, probed at 220
points. It wears the creature's own texture, sampled through the generation's UVs at the nearest
point of the intake surface, rather than a flat material.

### Gape see-through

Measured by `mouth-views.py`: every transparent pixel lying between the topmost and bottommost
opaque pixel of the head, column by column, is a hole straight through the animal. Each clip is
photographed at the phase **its own gape is widest**, framed in the **skull's own frame**, with the
backface cull emulated (CYCLES ignores `use_backface_culling`, and without the emulation a review
shot shows the near wall the runtime throws away).

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
| Idle | 0.04 rad (2.3°) | 1 px of 279138 = 0.0004 % |
| Bite | 0.51 rad (29.3°) | 1 px of 237479 = 0.0004 % |
| Attack | 0.48 rad (27.5°) | 1 px of 288088 = 0.0003 % |
| Heavy | 0.60 rad (34.4°) | 0 px of 285117 = 0.0000 % |
| Lunge | 0.58 rad (33.2°) | 1 px of 286595 = 0.0003 % |
| Eat | 0.44 rad (25.1°) | 2 px of 240586 = 0.0008 % |
| Ability | 0.49 rad (28.0°) | 0 px of 237962 = 0.0000 % |

**The backdrop proof.** Widest gape of each clip is then rendered against a saturated backdrop
twice — once with the cull shim and once without — and the two images differed by
**0.0016 % of pixels** at worst (largest single-channel difference 17/255, which is CYCLES' own sampling
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
| **skin** | **2.48x** | `fore_mid_L` | Death | 0.041 → 0.101 |
| oral lining | 12.48x | `skull` | Heavy | 0.019 → 0.234 |

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

The shared rig is root, body, chest, neck, skull, jaw, **nine caudal controls**, two caudal fin
lobes and three controls per limb — 29 joints. Skinning is parameterised by **arc length along
measured polylines** rather than by a body axis: the axial chain projects each vertex onto a
15-point centreline so weight bands stay square to the body, and each limb projects onto its own
root → mid → tip → reach polyline whose radius is measured from that limb's own blade rather than
guessed. Every vertex has normalised nonzero weights and at most four influences (mean 2.12).

The action set is the contract's — Idle, Swim, Sprint, TurnLeft, TurnRight, Dive, Rise, Attack,
Bite, Heavy, Hit, Death, Guard, Parry, Dodge, Eat, Stagger, Ability, Grab, Breath, Growth — plus
this animal's own **Lunge** and **Breathe**. `locomotion` is `Swim`; there is no walk and no crawl,
because no playable Triassic animal leaves the water and this one could not haul itself anywhere.

| Clip | s | | Clip | s | | Clip | s |
| --- | ---: | --- | --- | ---: | --- | --- | ---: |
| Idle | 3.0 | | Bite | 0.5 | | Stagger | 1.2 |
| Swim | 2.2 | | Heavy | 1.3 | | Ability | 1.1 |
| Sprint | 1.4 | | Hit | 0.6 | | Grab | 1.1 |
| TurnLeft | 1.8 | | Death | 2.0 | | Breath | 2.6 |
| TurnRight | 1.8 | | Guard | 1.2 | | Growth | 1.5 |
| Dive | 1.6 | | Parry | 0.4 | | **Lunge** | 1.5 |
| Rise | 1.6 | | Dodge | 0.5 | | **Breathe** | 3.2 |
| Attack | 1.0 | | Eat | 1.8 | | | |

Idle, Swim, Sprint, Guard, Eat, Grab and Breathe loop exactly (seams close to 0.0). **Grab is a
1.1 s held loop**, inside the 0.9–1.2 s the contract asks for, and the audit checks the duration,
the loop and the fact that it is in the loop set. Root motion and scale animation are absent.

### Swim and Sprint: anguilliform, and the numbers that say so

A travelling wave runs down a twelve-joint chain from the neck to the last caudal joint. Three
numbers define it and the two ichthyosaurs in this batch are built out of the same three:

| | Cymbospondylus | Mixosaurus |
| --- | ---: | ---: |
| Wavelengths on the body at once | **0.72** | 0.44 |
| Gain at the shoulder (of the peduncle's) | 0.10 | 0.03 |
| Stations peaking in order | 5 / 5 | 4 / 4 |

Lateral travel along the body in Swim, in engine units on a 6-unit animal:

| skull | neck | chest | body | tail_00 | tail_02 | tail_04 | tail_06 | tail_08 | tail tip |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 0.146 | 0.111 | 0.056 | 0 | 0.026 | 0.137 | 0.340 | 0.626 | 0.944 | **1.316** |

The head is the quiet end — 11 % of the tail tip's travel — and it is quiet *by construction*: the
skull takes back 86 % of whatever the chain in front of the pivot has added, measured from the
joints themselves rather than from one hand-tuned constant, so the braincase holds the line of
travel whatever amplitude the clip is running at. The caudal lobes trail the peduncle by **0.135 of
a beat**, which is what makes a tail fin read as a fin rather than as a plate bolted to the last
joint.

The paddles are control surfaces. They set pitch and roll in `Dive`, `Rise` and the turns, they
brace in `Guard` and `Parry`, and they never take a stroke — which is the opposite of Cartorhynchus
in this same batch, and deliberately so.

### How the attack reads

Four clips are built out of one shape — **cock, drive, snap, gather** — rather than out of a sine.
The anticipation is a lateral S loaded from the tail forward; the drive unrolls it head-last so the
thrust arrives at the shoulder after the tail has made it; the trunk's weight goes back on the cock
and is thrown forward as the chain unrolls.

The measurement that says a strike is committed rather than swelling is where its travel falls:

| Clip | snout reach (units) | half the snout's travel falls inside |
| --- | ---: | ---: |
| Attack (1.0 s) | 0.486 | **31 % of the clip** |
| Heavy (1.3 s) | 0.488 | 31 % |
| Lunge (1.5 s) | 0.484 | 31 % |
| Bite (0.5 s) | 0.120 | 31 % |

A smooth sine would put half its travel in about half the clip. The gape is timed to the strike
rather than to the button — it parts on the cock, is widest as the body unrolls and shuts on the
follow-through, which is the frame the prey is in. Peak openings: Bite 0.51 rad at phase 0.33,
Attack 0.48 at 0.46, Heavy 0.60 at 0.48, Lunge 0.58 at 0.50, Ability 0.50 at 0.33.

`Ability` is the roster's **exhaustion hold** at its own 1.1 s: the jaws take hold early and stay
shut on it while the body works, which is a different performance from `Lunge`, the longer hunting
strike. `Bite` is half a second and the whole of it is the snap. `Grab` is the held loop, with the
body hauling back in heaves and a worrying shake running out to the head between them.

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

`cymbospondylus-profile.json` records **21 exact plane-intersection envelopes** of both actual
meshes (body and mandible together).

| Measure | Value | As % of the 6.0-unit body | Tolerance |
| --- | ---: | ---: | --- |
| Maximum dorsal/ventral/width envelope difference | 0.2269 | **3.78 %** | 4 % |
| Nearest twin-surface distance, 95th percentile | 0.0305 | 0.51 % | — |
| Nearest twin-surface distance, maximum | 0.1810 | 3.02 % | — |
| Appendage roots seated inside the intake surface | 0.016–0.022 raw | 1.6–2.2 % deep | inside |
| Jaw hinge seated inside the head | 0.0176 raw | 1.8 % deep | inside |
| `anchor_mouth` to the nearest surface | 0.0019 units | 0.03 % | 2 % |
| `anchor_mouth_inside` to the nearest surface | 0.0050 units | 0.08 % | 2 % |
| `anchor_attack_primary` to the nearest surface | 0.0112 units | 0.19 % | 2 % |
| Measured teeth straddling the mouth cut | **0 of 4** | — | 0 |
| Reduced model triangles | 38.76 % | — | ≤ 40 % |

The envelope difference is the tightest of the four in this batch and sits closest to the bar; the
station that carries it is the pectoral blade, where a voxel field cannot hold a knife edge. The
blades are dilated 0.005 along their normals before the field is sampled and held back from the
relaxation afterwards, which is what keeps the fin tips; the twin's fins come back a little
plumper and reach the same tips.

Joint and socket coordinates are shared between the two bodies, so their parity error is exactly
zero. These are generated measurements, not a claimed human anatomical sign-off.

## The twin

A procedural **volume resurfacing**, not a decimation of the authored faces: Blender regenerates
topology from a 0.0045 raw-unit voxel occupancy field (56,404 triangles), relaxes it once with the
blades masked out, and reduces the new topology to the puppet budget at ratio 0.117. No source
vertex or face is reused. Puppet pigment is sampled through each nearest source triangle's
interpolated UV, never by averaging unrelated atlas islands at a welded seam vertex. The authored
body keeps the full embedded original albedo with white vertex colours, restrained normal relief
(0.15) and explicitly nonmetallic skin at roughness 0.66.

## Verification

`node tools/triassic/creatures/cymbospondylus/audit.mjs --package --decode` binds the checks to the
final packaged hashes. Through `_pipeline/paired-audit.mjs` it asserts exact paired joint names,
hierarchy, local rest transforms, inverse bind arrays, socket transforms and metadata, clip names,
timing and every sample array; normalised weights; finite attributes; unique dynamic clips; loop
seams on every channel; no root or scale channels; Grab's duration and loop; and that the reduced
model is at most 40 % of the triangles and byte-identical to the puppet. It then plays **61 phases
of every clip on both models** through the Three.js GLTFLoader and AnimationMixer, evaluating
actual skinned vertices, and runs this animal's own assertions over 121 phases: the wave travels in
order, most of a wavelength is on the body, the beat grows backwards, the head holds the line, the
caudal lobes lag, the jaw never closes past the bind pose, the gape peaks on the drive, and half of
each strike's travel falls inside a third of its clip.

The Blender build additionally checks every vertex of both bodies at 13 phases of all 23 clips,
asserts the countershading signal is strong enough to read a roll from, refuses any appendage root
it cannot seat inside the trunk, refuses a lining narrower than the measured mouth, and refuses a
measured tooth on the wrong side of the cut.

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
- **[The wave from above](paired-wave-sheet.jpg)** — Swim and Sprint through a beat, and the attack
  coiling and unrolling. This is the sheet this animal is judged on.
- [The rest of the action set](paired-actions-sheet.jpg)
- [This animal's own clips: Lunge, Breathe, Ability](paired-era-clips-sheet.jpg)
- [The mouth, open and shut, from the side and from below](paired-mouth-sheet.jpg)

No independent human review is invented by this automated QA record.

## Reproduction

From the repository root with Blender 5.2 and the project's Node dependencies installed:

```sh
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/cymbospondylus/build.py
node tools/triassic/creatures/cymbospondylus/audit.mjs --package --decode
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/cymbospondylus/render.py -- --decoded
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/cymbospondylus/render.py -- --portraits --twin
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/cymbospondylus/mouth-views.py
python3 tools/triassic/creatures/cymbospondylus/contact-sheets.py
node tools/triassic/review-bodies.mjs
node tools/update-asset-sizes.mjs
```

The editable Blender project, the decoded review GLBs and the individual frames live in
`local/triassic-authoring/cymbospondylus/`. `build.py` authors both geometry and performance and
writes only this species' asset family; it touches no shared registry and performs no git
operation. The machinery it shares with the other three ichthyosauromorphs in this batch is
`tools/triassic/creatures/_pipeline/`.

## What is still open

- **The skull is about a quarter too long.** 0.137 of the body against a documented 0.11. That is
  the canonical pose (drawn three-quarter with the head towards the camera) and the generation, not
  this build, and under CLAUDE.md's rule it goes back to a redraw and a regeneration rather than
  being remodelled here.
- **The limbs are posed.** The two pectorals sit at different stations and hang at different
  angles; the mirrored-partner distance averages 0.077 of a body and reaches 0.114. The rig follows
  each limb's own axis so they deform correctly, but the animal is not symmetric at rest.
- Cymbospondylus is **not** in `tools/triassic/shipped.json` and its preview badge is **not**
  cleared. That is the reviewer's call after looking at the sheets. It is registered in
  `src/content/triassic/review-bodies.json`, which is the viewer-only register for a built body
  waiting on a human, exactly as Placodus, Dinocephalosaurus and Helicoprion are.
- **There are no eye globes.** The generated head has sculpted eyes in its surface and albedo, and
  this build does not cut and seat separate globes — as Nothosaurus, Placodus and Dinocephalosaurus
  do not. The pipeline contract asks for them; it is outstanding on all of them.
- **The envelope is the tightest of the four**, at 3.78 % against a 4 % bar, and the station that
  carries it is the pectoral blade. A finer voxel would improve it at the cost of twin triangles;
  0.0045 is what fits both bars at once.
- **Only the twin's portrait is written** (`public/assets/triassic/creatures/cymbospondylus.puppet.png`),
  beside the other delivered bodies that carry one. The authored body's roster cards are not:
  `render.py -- --portraits` will produce them into this directory's `portraits/`, but the
  placeholder cards cut from the canonical pose stay where they are until a human decides this body
  ships.
- The mouth interior is authored geometry — one lining and one hinge cap — because a gape that
  shows through the head is worse than an authored interior. Nothing on the **outside** of the
  animal was modelled, moved or added.
- Living colours, soft tissues and movements are artistic reconstruction. World travel, grip and
  capture rules remain engine-owned.
