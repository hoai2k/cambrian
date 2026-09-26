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
/opt/blender/blender -b --factory-startup --python tools/triassic/gape-solid.py -- birgeria Gape@0.45 Heavy@0.5 Bite@0.12 Ability@0.45 Eat@0.4 Attack@0.4
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

### The shells came out through the cheek, and nothing in the build could see it

Every fault in the table above is a *hole*: backdrop seen through the body. The lining had another
kind of fault the whole time and no number here could see it — it **came out through the cheek**,
which draws lining pixels over skin rather than backdrop, so `gape-solid.py` passed it at 1 px
while a reviewer was looking at a pink blob in front of the eye.

The measurement, on the shipped body: **36 of the 816 lining vertices had no skin outboard of them
on their own side**, the worst 0.28 % of a body from the nearest surface — 2.8 % of the head's own
half width. Painted an emissive marker and photographed from four units away, the shipped head
shows **14,868 marker pixels** from outside at rest (7,101 left, 4,590 right, 3,177 top): a blob on
the cheek in front of the eye and a line running back along it, besides the thin line along the lip
that this animal is *meant* to show.

The seating test the build carried could not fail on it, and its failure is the `np.interp` lesson
in a second dress. `depth()` is a signed nearest-surface probe, and beside a modelled slit it
answers about the lumen's own wall rather than about the skull — it read the lining as inside at
every station but three. What replaced it is **the question itself**: can this point be seen from
outside the animal? A point strictly inside a closed surface meets skin along *every* direction; a
point outside escapes along at least one. Twenty-six directions — the cube's faces, edges and
corners — cast against the closed intake surface taken before the cut opens the head.

**Twenty-six and not four, and not a parity vote.** Both were tried here first and both agreed with
the old answer. Four *axis* reaches ask about x and z when the direction out of a cheek is oblique;
a three-ray parity vote is unreliable for a point sitting a thousandth off a surface, which is
where every one of these vertices lives. The cheapest way to see that both are wrong is the one
`CLAUDE.md` prescribes: cast the camera's own ray through a failing pixel and ask every surface on
the line. Done on the shipped body, the first surface on almost every marker pixel is the lining.

**And a point *on* the skin is not outside it.** That distinction is the whole balance of the seat,
and both one-number answers were built and measured. What has to reach the skin is the shell's
*width*, because that is what a line of sight into the gape passes beside; asking for a clearance
everywhere took that width away and the gape opened from 417 to 3,516 px. Asking for a touch
everywhere left the palate lying on the inside of the skin. So a vertex within `ORAL_BAND` of the
mouth line may sit **on** the skin to within `ORAL_TOUCH`, the mesh's own edge length here, and one
outside that band must be `ORAL_MARGIN` inside it.

| | shipped | rebuilt |
| --- | ---: | ---: |
| lining vertices with no skin outboard | 36 of 816 | **0** |
| worst, from the nearest surface | 0.0028 of a body | **0** |
| marker pixels seen from outside at rest | 14,868 | **2,010** |
| vertices pulled in by the seat | — | 48, worst 0.034 raw |
| vertices standing on the modelled slit | — | 7 |
| body skin (`skin-tears.mjs`) | 3.46x | **3.46x** |
| jaw cut (`lag.mjs`) | 0.00 % | **0.00 %** |

What is left of the 2,010 is the line along the mouth itself — the lining seen in the slit the
generation models open, which is the thing this material's darkness was chosen for.

The hinge envelope is seated by **both** tests now, the twenty-six directions and the old `depth()`
clearance, so the repair can only make it smaller: the rays alone would have grown it, and a bigger
plug at the corner of the mouth is the failure the other way round.

### The aimed cut is read, and it is not cut on

A reviewer aimed a cut plane and a hinge on this exact shipped body in the viewer's mouth editor
(`docs/triassic/mouths/birgeria-mouth.json`). The builder reads it, fits the frame against it — the
document's own bounding box against this build's, six numbers, worst disagreement **1.2e-07** on a
body five units long — and records what the two disagree about in `validation.json`'s `aimedCut` and
`mouthCutDeviation`. The reviewer's line is pitched **+32.1°** where the modelled slit's own ramp
reads +25.4°, carries **+2.8° of yaw and −11.1° of roll** (which a curve of y cannot express at all,
since `T.bisect_on_curve` shears the head by −seam(y)), and puts the hinge 9.95 % of the body back
from the nose where the slit peters out at 9.20 %.

**Cutting on it is a separate piece of work and the measurement says so.** Built that way — plane
bisect, the document's own half-spaces, the junction's rim widened to the band the oblique plane
needs — this body's gape opens **2,130 px of `opened by culling`** at full gape against **417** on
the slit's own line, because the mandible the plane takes is a different shape from the one the
lining was fitted to and a tube about a mouth line does not close an aperture it was not measured
from. Building the shells about the generation's own slit while cutting on the plane recovered half
of that (3,511 → 2,130) and no more. What closes a mouth cut where a human aimed it is the cut's
**own rim** (`T.cap_cut` and `T.cap_mouth`), the construction Cartorhynchus was ported to on the day
it took its aimed cut and which this body has never been ported to — T3D-32's rollout, which
`docs/triassic/throat-repairs/oral-verdicts.md` already names this animal as the remaining work for.

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
| Surface distance | max 0.0798 = 1.60 %, p95 0.0158 = 0.32 % |
| Anchor distances | mouth 0.0050 raw, attack 0.0006 raw, both inside the 2 % bound |
| Skin tears | worst **3.46×** on `pec_upper_R` in Dodge (Nothosaurus 2.98×, Saurichthys 3.61×) |
| Idle bones | none — all 22 joints own skin |
| Gape | 1 px of 378,000 seen through the body at full gape |
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
