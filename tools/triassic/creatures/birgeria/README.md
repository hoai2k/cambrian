# Birgeria — authored Tripo body and measured procedural twin

*B. stensioei*, Middle Triassic, Monte San Giorgio. The pursuit fish: a big naked-bodied predatory
actinopterygian with a very wide gape and fangs in three sizes. **Built, not shipped** — it is
registered in `src/content/triassic/review-bodies.json` so the specimen viewer can show it, and
`tools/triassic/shipped.json` is untouched, so the game goes on borrowing a Devonian body and the
roster keeps its preview badge until a human says otherwise.

Reproduce:

```
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/birgeria/build.py
node tools/triassic/creatures/birgeria/audit.mjs --package --decode
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/birgeria/render.py -- --decoded
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/birgeria/render.py -- --decoded --portraits
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/birgeria/render.py -- --decoded --twin --portraits
python3 tools/triassic/creatures/birgeria/contact-sheets.py
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/birgeria/mouth-views.py -- local/triassic-authoring/birgeria/mouth
node tools/creatures/motion/apply.mjs birgeria          # the shore gait (Flop) back onto the family
node tools/triassic/creatures/birgeria/audit.mjs --package --decode
/opt/blender/blender -b --factory-startup --python tools/triassic/gape-solid.py -- birgeria Gape@0.4667 Ability@0.4667 Heavy@0.5333 Bite@0.1333 Attack@0.4 Eat@0.3667 FastStart@0.3 Hit@0.2667 Stagger@0.6 Death@1.8 Flop@0.1333 Grab@0.1 Breath@1.2 Guard@0.6 Idle@1.3 Sprint@0.4667 Swim@0.7333 --as-drawn
/opt/blender/blender -b --factory-startup --python tools/triassic/mouth-space.py -- birgeria Gape@0.4667 docs/triassic/verification/birgeria-mouth-space.png
node tools/triassic/skin-tears.mjs public/assets/triassic/creatures/birgeria.glb
node tools/triassic/idle-bones.mjs public/assets/triassic/creatures/birgeria.glb
```

## The source

The build reads `birgeria.preview.glb`, the **published preview**, not the raw generation beside it.
`docs/triassic/preview-mesh-defects.md` records why: this generation grew a **second dorsal fin**
behind the first, and `smooth-region.py` collapsed it to 0.9 % of its protrusion (151 vertices,
0.1131 → 0.0010). Nothing was deleted, so the mesh is still one connected surface; what is left is
a low thin patch on the back, and it takes axial weights like the skin around it. The untouched
generation stays in `tripo-raw/` (sha256 `69dde446…`), and the preview this build reads hashes
`3dcf1653…`.

| | |
| --- | --- |
| Source triangles | 19,836 · one connected component after a 1e-6 weld, no detached flake |
| Authored delivery | 22,414 triangles (body, mandible, oral lining, hinge envelope) |
| Twin | 7,480 triangles = **33.4 %** of the authored body, and `lod1` byte for byte |
| Joints | 22, all of which own skin |
| Influences | 4 maximum, 2.87 mean |

## The frame, and which end is the head

This generation lies **27.7°** across the file's axes and a bounding box would have said `x`. The
long axis is the first principal component of the vertices and the roll is read off the animal's own
countershading — 24 stations, mean harmonic strength 0.394, a roll correction of −21.0°.

Which end is the head is **not** the principal component's sign, and on a fish it cannot be: a
Birgeria rostrum and a Birgeria caudal lobe are both thin. It is decided by the **caudal fin** — the
deepest thin cluster, 0.276 of a body deep and deeply forked, at one end of the axis — and the build
asserts both that the cluster is behind mid-body and that it is deep enough to be that fin.

## The fins, measured rather than typed

Every blade is found by connectivity on the measured shell thickness and classified by where it
stands. Nothing here names a station.

| Cluster | Vertices | Station (fraction of body from the snout) | Reach from the axis |
| --- | ---: | --- | ---: |
| Caudal, forked | 865 | 0.805–1.00 | 0.215 |
| Left pectoral | 774 | 0.290–0.404 | 0.325 |
| Right pectoral | 483 | 0.232–0.321 | 0.308 |
| Dorsal | 535 | 0.401–0.574 | 0.190 |
| Anal | 277 | 0.575–0.755 | 0.133 |
| Collapsed second dorsal | 129 | 0.647–0.729 | 0.081 |

The pectorals are **posed asymmetrically** and the rig is built to each one's own measured axis, so
they deform correctly and simply do not match each other at rest: mean mirror distance **0.106 of a
body length**, worst joint 0.164. That is the generation's pose, recorded rather than straightened.

## The mouth

**The cut is a reviewer's and the mouth is closed by its own rim (T3D-38, below).** What follows
this paragraph down to *The aimed cut* is the generation's own mouth as this builder measured it,
which is still read and recorded; it no longer cuts, and the lining the gape proof below describes
is retired.

**This generation models its mouth**, so Placodus' geometric method is the primary and the painted
line is the cross-check rather than the other way round.

- The geometric read — every head vertex casting its own outward normal back into the mesh — returns
  **79 vertices** over the front eighth of the body (y −0.389 to −0.264 in body-length units) and
  **nothing at all** between there and the pectorals. The cavity profiles from y −0.3818 to −0.2968,
  which is where the hinge goes.
- The painted line was read independently with `tripo.painted_line` — a matched filter for a thin
  dark line between lighter skin, resolved as one continuous path along the head — and lands within
  **0.057 of the local radius** of the modelled line on average and **0.277** at worst. Two methods
  measuring the same feature is what says the first one found the mouth and not a cheek crease.
- **The line is very nearly straight, and that is the finding rather than a disappointment.** A
  fish's is, and the pipeline asks for the number instead of a curve forced onto a line with none:
  a straight ramp through the same points would have deviated by 0.0161 raw, **0.187 of the local
  radius**. The cut still follows the measurement station for station, because that costs nothing.
- No tooth patch straddles the cut. The generation carries its own tooth relief along both jaw
  margins (`toothPatches` in `validation.json`) and **no dentition was authored**.

### What the gape proof cost

`gape-solid.py` renders at full gape against magenta with and without a backface-cull shim and
counts the backdrop the body encloses. It found five separate faults, and each one is a general
lesson rather than a Birgeria detail:

| Fault | Leak |
| --- | ---: |
| The mandible had a front cut plane, and the ring it left at the snout tip swung into view the moment the jaw dropped | 956 px |
| The throat did not follow the jaw | 780 px |
| The blend had to be **full** at the mouth line and **full** at the cut plane, not half of it: a ramp centred on either reads 0.5 exactly where the mandible's rigid 1.0 meets it, and the relaxation carries that step into a seam along the gular line | 162 → 36 px |
| The lining was sized from `cavity_profile`'s width — which is the span of the lip *line*, wider than the head at the seam — and came out through both cheeks; binning the flank instead only moved the mistake, a tall band bulging and a tight band leaving an annular strip the jaw opens | 113 px |
| A 14-gon lining left wedges against a finely tessellated tooth row, and the lining stopped short of the hinge, leaving the wedge at the corner of the mouth | 45 → 18 px |
| **Final** | **1 px of 378,000** |

The lining's section is now **ray cast** from the mouth's own axis — out along ±x for the width,
capped by the head's own section because a lateral ray can run out through the corner of the lip
into open air. Height is deliberately *not* cast: the mouth is shut in the bind pose, so a ray up
from the seam measures the closed slit, three thousandths of a body, and the lining has to be taller
than that because it stretches when the jaw swings.

`mouth-views.py` agrees: worst see-through **1 pixel of 313,603** at Heavy's widest gape, and the
cull changes nothing at all with the mouth shut.

The mouth interior is dark (0.22, 0.095, 0.085) because this generation models its slit slightly
**open**: with the mouth shut the lining is visible along the whole lip line, exactly as the inside
of a fish's lip is, and at the era's usual value it read as a bright pink band drawn on the snout.

### The aimed cut, closed by its own rim (T3D-38)

A reviewer re-aimed this mouth in the viewer's mouth editor on the body then shipping
(`docs/triassic/mouths/birgeria-mouth.json`, sha256 `134d7f01…`, which it matched), and the reviewer
was also looking at something the gape proofs could not see: with *Mouth geometry* switched on in
the viewer, the lining **came out through both cheeks**.

**What was poking out, measured before anything moved.** `gape-solid.py` counts backdrop the cull
*opens*, and a shell standing proud of a cheek draws lining over skin, which is not backdrop — so
the question had to be asked another way. Painted an emissive marker and photographed shut from four
units off both flanks and from above, the shipped head showed **14,868 marker pixels** (7,101 left,
4,590 right, 3,177 top): a blob on the cheek in front of the eye and a line back along the lip
(`docs/triassic/verification/birgeria-mouth-space-before-shown.png` is the same lining at `Gape`).
Of twelve camera rays cast through marker pixels on the left flank, **eleven met the lining first**,
0.002–0.019 units in front of the skin on the same line (the twelfth met the mandible's lip a
hair in front of it). Ray parity over the shipped mesh (nine oblique
rays per vertex, majority vote, against body and mandible together): 35 of the lining's 816
vertices outside the solid. The cause is the one CLAUDE.md warns about: the lining was seated with
`depth()`, which beside a modelled slit reads the lumen's own wall, and read this lining as inside
at every station.

**What moved, and why it is not a re-seat.** A tube fitted about one mouth line does not close an
aperture cut on another, and a cut mouth is closed by its own rim — so the builder now cuts on the
document, exactly as Cartorhynchus' does: schema and id asserted; the frame asserted against the
bounding box the document measured (worst 1.2e-07 units); the plane (+32.1° of pitch, +2.8° of yaw,
−11.1° of roll) and hinge read straight off the file; the mouth line read on the body's own
centreline `cx`, which the reviewer's hinge sits 0.0006 of a body from; `T.cap_cut` over the hinge
wall, then `T.cap_mouth` along the mouth line, each half domed into itself (dome 0.30, ceiling 0.55
of the head's own room either side of the line); `T.jaw_junction` with `rear` = the document's
hinge wall and `dz` over the mandible's whole depth. The lining and the hinge envelope are retired —
the body carries no oral mesh at all now, so the viewer offers no *Mouth geometry* switch for it and
there is nothing hidden in play. The axial rig is untouched (every station still hangs off the back
of the modelled slit); only the jaw joint moves, onto the aimed hinge line at the centreline, 0.0075
of a body behind where the slit peters out. It turns about the frame's x like every jaw in the era —
the audits read the gape as the jaw's local rotation, so a bone rolled onto the document's axis
(9.9° off x) reads its own rest offset as a gape — and the gait still opens the mouth in `Flop`
(0.116–0.213 rad, the same direction as before).

`cut_rim`: one closed loop per half (145 vertices on the authored body, 95 on the twin). Every cap
vertex is held to its own body's closed surface — the twin to the twin's, because a voxel
resurfacing fuller than the intake reads "outside" it wherever it is fuller — and asserted: the
intake's section hull clears every authored cap vertex (worst +0.0021 raw), none stands out of the
skin by more than 0.0025 raw, and along the cube's 26 directions one authored and seven twin cap
vertices escape, all of them within 0.0018 raw of the skin (the first ring inside the rim, where a
planar fill lies a thousandth proud of a curving lip).

**The gape, over every clip that opens the jaw**, at each clip's own peak (`gape-solid.py`,
backdrop test `r > .90, g < .20, b > .90`; *through / opened*). *Plain* is what the file contains,
*as drawn* is what the game draws (oral parts hidden), *shown* is what the viewer's *Mouth geometry*
switch drew:

| Shot | plain, before → after | as drawn, before → after | shown, before → after |
| --- | ---: | ---: | ---: |
| `Gape@0.4667` | 0 / 423 → 0 / 0 | 4 / 15,357 → 0 / 0 | 0 / 423 → 0 / 0 |
| `Ability@0.4667` | 0 / 122 → 0 / 0 | 4 / 8,416 → 0 / 0 | 0 / 122 → 0 / 0 |
| `Heavy@0.5333` | 0 / 78 → 0 / 0 | 2 / 7,239 → 0 / 0 | 0 / 78 → 0 / 0 |
| `Bite@0.1333` | 1 / 159 → 0 / 0 | 1 / 9,592 → 0 / 0 | 1 / 159 → 0 / 0 |
| `Attack@0.4` | 0 / 85 → 0 / 0 | 1 / 7,487 → 0 / 0 | 0 / 85 → 0 / 0 |
| `Eat@0.3667` | 0 / 107 → 0 / 0 | 1 / 8,067 → 0 / 0 | 0 / 107 → 0 / 0 |
| `FastStart@0.3` | 0 / 32 → 0 / 0 | 4 / 5,539 → 0 / 0 | 0 / 32 → 0 / 0 |
| `Hit@0.2667` | 0 / 21 → 0 / 0 | 1 / 4,724 → 0 / 0 | 0 / 21 → 0 / 0 |
| `Stagger@0.6` | 0 / 17 → 0 / 0 | 4 / 4,656 → 0 / 0 | 0 / 17 → 0 / 0 |
| `Death@1.8` | 0 / 17 → 0 / 0 | 0 / 4,842 → 0 / 0 | 0 / 17 → 0 / 0 |
| `Flop@0.1333` | 0 / 78 → 0 / 0 | 3 / 7,446 → 0 / 0 | 0 / 78 → 0 / 0 |
| `Grab@0.1` | 0 / 10 → 0 / 0 | 7 / 2,887 → 0 / 0 | 0 / 10 → 0 / 0 |
| `Breath@1.2` | 0 / 5 → 0 / 0 | 44 / 616 → 0 / 0 | 0 / 5 → 0 / 0 |
| `Guard@0.6` | 0 / 6 → 0 / 0 | 10 / 913 → 0 / 0 | 0 / 6 → 0 / 0 |
| `Idle@1.3` | 0 / 4 → 0 / 0 | 81 / 378 → 0 / 0 | 0 / 4 → 0 / 0 |
| `Sprint@0.4667` | 0 / 4 → 0 / 0 | 194 / 375 → 0 / 0 | 0 / 4 → 0 / 0 |
| `Swim@0.7333` | 0 / 4 → 0 / 0 | 203 / 407 → 0 / 0 | 0 / 4 → 0 / 0 |
| worst | **1 / 423 → 0 / 0** | **203 / 15,357 → 0 / 0** | **1 / 423 → 0 / 0** |

`opened` is the honest column: as drawn, the shipped mouth was the widest hole on the roster
(15,357 px at `Gape`) and it leaked through the head with the mouth all but shut — 203 px at `Swim`, 194 at
`Sprint`, 81 at `Idle` — because the slit the lining filled was open under it. Every one is 0 now,
because there is nothing hidden left to fail.

**What it cost, measured on the packaged files.** Skin `3.46x` unchanged (`pec_upper_R` in Dodge);
the mouth region `jaw` 1.50x → 1.57x and `skull` 1.31x → 1.95x, both at `Gape`, the stretch of a
wider cut. `lag.mjs`: 130 pairs on the document's hinge wall, worst 0.01 % of a body; the jaw follows
its bone 1.01 in `Bite`/`Attack`/`Heavy` and 0.89 in `Eat` (0.97 before). `idle-bones`: every joint
owns skin. Twin 30.0 % of the authored triangles (was 33.4 % with the lining counted in both);
envelope 0.77 % of a body; surface distance max 0.0404 (0.0798 before). Anchors: mouth 0.24 %,
attack 0.17 % of a body from the surface, swallow inside by parity and by the head's own section.
`oral-shell-audit`: no oral lining on any variant. The reviewer's `npm run triassic:mouth` file now
refuses on the hash (the body is `070441275bbb…`), which is what consuming it looks like.

## The performance

**Thunniform**, which is what the roster says this animal is (`thunniform: true`), and the audit
measures it rather than taking it on trust:

| | Swim | Sprint |
| --- | ---: | ---: |
| Wavelengths on the body | 0.318 | 0.318 |
| Shoulder travel ÷ tail tip | 0.004 | 0.004 |
| Skull travel ÷ tail tip | 0.012 | 0.012 |
| Dorsal fin ÷ tail tip | 0.047 | 0.047 |
| Anal fin ÷ tail tip | 0.117 | 0.117 |
| Pectoral ÷ tail tip | 0.064 | 0.064 |

Against Mixosaurus' carangiform 0.5 of a wavelength, that is a different animal moving. The wave
runs down the body in order at every station, and the caudal lobes lag the peduncle.

The **pectorals steer; they do not row**. `limbSweepDegrees` says so with a number — 8.6° at the
root in Swim, 12.7° in Sprint — because "a limbed swimmer's dash has to paddle" is a rule about
limbed swimmers and this is a fish: the tail is the engine, and a pectoral that swept like an oar
would be a reading this animal does not have.

Two clips beyond the contract's set, both of them this animal rather than decoration:

- **`Gape`** — open to the limit, hold, close. 0.92 rad, the widest mouth in the set, and the
  tagline ("Wide open. Whatever it was is inside now.").
- **`FastStart`** — a C-start: the whole body folds one way in a sixth of a second and snaps through
  straight. Half the snout's travel falls inside a quarter of the clip, and the mouth stays nearly
  shut, so it is not a short Attack.

`Ability` is the roster's `runThrough`, a bite taken at full speed and carried a long way *past* the
target, and the audit checks that it reaches further than the `Attack` it is built from.

## What is measured, and what is weak

| | |
| --- | --- |
| Envelope, authored against twin | worst **0.0385** = 0.77 % of body length, tolerance 4 % |
| Surface distance | max 0.0404 = 0.81 %, p95 0.0156 = 0.31 % |
| Anchor distances | mouth 0.0024, attack 0.0017 of a body, both inside the 2 % bound |
| Skin tears | worst **3.46×** on `pec_upper_R` in Dodge (Nothosaurus 2.98×, Saurichthys 3.61×) |
| Idle bones | none — all 22 joints own skin |
| Gape | 0 / 0 through / opened at every one of 17 opening clips, plain and as drawn (T3D-38) |
| Loop seams | 0.0 on every looping clip |

Recorded for the neutral-pose pass (task #24): `meanCurvatureRadiusOverSection` **6.02** over the
spine (tightest 2.21), **7.57** over the tail (tightest 2.48); paired-limb asymmetry **0.106** of a
body length mean, 0.164 worst.

**Weak, and honestly so:**

- **The dorsal fin is in the wrong place, and that is the pose.**
  `docs/triassic/proportion-audit.md` measures it at frac 0.40–0.57 against the research's "single
  dorsal set far back", with a second dorsal behind it. The second is collapsed; the first is where
  `canonical/birgeria.png` draws it. That is a **redraw question**, not a mesh correction, and
  nothing here touches it.
- **The swallow anchor cannot meet the 2 % surface bound and should not be asked to.** Birgeria's
  head is 0.18 of a body deep at the back of the mouth, so a throat point there is 2.9 % of a body
  from the nearest skin by construction. The build asserts it is *inside* the closed surface and
  within 5 %, and records the depth. The two surface anchors keep the 2 %.
- The pectorals' 0.106-of-a-body asymmetry is large enough to see from above at rest.
- `Death` and `Ability` are one-shots and end away from where they started, by design; only the
  looping clips are seam-checked.
