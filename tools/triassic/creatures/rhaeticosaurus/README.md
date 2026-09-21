# Rhaeticosaurus — authored Tripo body and measured procedural twin

*R. mertensi*, Late Triassic, Bonenburg. The first true plesiosaur and the first thing in the sea to
fly: four hydrofoil flippers beating together over a barrel trunk and a short tail. **Built, not
shipped** — registered in `src/content/triassic/review-bodies.json` so the specimen viewer can show
it, with `tools/triassic/shipped.json`, the stand-ins and the preview badge untouched.

Reproduce:

```
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/rhaeticosaurus/build.py
node tools/triassic/creatures/rhaeticosaurus/audit.mjs --package --decode
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/rhaeticosaurus/render.py -- --decoded
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/rhaeticosaurus/render.py -- --decoded --portraits
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/rhaeticosaurus/render.py -- --decoded --twin --portraits
python3 tools/triassic/creatures/rhaeticosaurus/contact-sheets.py
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/rhaeticosaurus/mouth-views.py -- local/triassic-authoring/rhaeticosaurus/mouth
/opt/blender/blender -b --factory-startup --python tools/triassic/gape-solid.py -- rhaeticosaurus Heavy@0.45 Heavy@0.5 Bite@0.1 Attack@0.45 Eat@0.4
node tools/triassic/skin-tears.mjs public/assets/triassic/creatures/rhaeticosaurus.glb
node tools/triassic/idle-bones.mjs public/assets/triassic/creatures/rhaeticosaurus.glb
```

## The source, and what has already been done to it

The build reads `rhaeticosaurus.preview.glb`, the **published preview**, which carries two
corrections recorded in `docs/triassic/preview-mesh-defects.md`:

- the generation grew **three tail blades where there should be one** — a central tail with a
  further blade either side of it, growing from the tail root and nothing to do with the limbs. The
  two spares were collapsed by `smooth-region.py` to 6.1 % of their protrusion (361 vertices,
  0.1186 → 0.0073). Nothing was deleted, so the body is still one connected surface;
- a **neck stretch** baked on top of that by the viewer's own `warp()` — this generation came from a
  superseded short-neck input and joined the head to the shoulder through a seal-like neck.

The raw generation is preserved unchanged in `tripo-raw/` (sha256 `53a1cbe8…`); the preview this
build reads hashes `867bc10e…`.

| | |
| --- | --- |
| Source triangles | 19,138 · one connected component after a 1e-6 weld |
| Authored delivery | 21,320 triangles at T3D-08F (body, mandible, oral lining, hinge envelope); 20,848 now, with the lining and the hinge envelope retired and the cut capped with its own rim |
| Twin | 7,582 triangles = **35.6 %** of the authored body, and `lod1` byte for byte |
| Joints | 30, all of which own skin |
| Influences | 4 maximum, 3.25 mean |

## The frame, and why the bounding box is not allowed near it

**This animal's flipper span is longer than it is**, which is why
`docs/triassic/proportion-audit.md` had to force `--axis z` when measuring it and why nothing here
reads a box: `boundingBoxWouldHaveSaid: y`, and the long axis is in fact the vertex cloud's first
principal component, 21.6° off the file's. The roll is read off the animal's own countershading —
24 stations, mean harmonic strength 0.483, a roll correction of +11.9°.

## The flippers

Four hydrofoils, found by connectivity on the measured shell thickness and split fore from hind by
where they stand. The collapsed tail blades are thin too and are not limbs: they reach 0.045 from
the axis against the smallest flipper's 0.302, which is what the reach test separates.

| Flipper | Vertices | Seat | Reach | Radius (inner / outer) |
| --- | ---: | --- | --- | --- |
| fore L | 803 | (−0.071, −0.091, −0.009) | (−0.416, −0.108, 0.063) | 0.050 / 0.083 |
| fore R | 705 | (0.089, −0.046, −0.022) | (0.414, −0.087, −0.111) | 0.050 / 0.088 |
| hind L | 628 | (−0.039, 0.203, 0.019) | (−0.302, 0.256, 0.009) | 0.054 / 0.089 |
| hind R | 788 | (0.027, 0.214, 0.000) | (0.269, 0.275, −0.108) | 0.062 / 0.095 |

Each has **four joints**, not three. The research gives this animal hyperphalangy, and the skinning
wants the same thing for its own reason: a blade sweeping 130° on three joints puts a quarter of
that arc across each band between them.

## What the skinning cost, and the finding that came out of it

The first build read **7.9×** on `skin-tears.mjs` — worse than any body in the era. The cause was
not the joint count, the chain blend or the amount of bend, all of which were tried and moved it by
under a tenth:

> The kit's fin radius takes the **55th percentile** of a blade's own distances to its polyline as
> the radius inside which a vertex is wholly the limb's. That is right for a small paddle that
> steers. On a hydrofoil it leaves nearly half the blade on a partial alpha, and the weight
> relaxation then spreads *trunk* weight right out along it: vertices 1.35 units off the midline, on
> a limb swinging 130°, carrying 0.26 of `chest` and 0.23 of `body`.

At the **92nd percentile** the blade is the limb's and only its rim is blended, and the figure is
**2.81×** — the cleanest skin in the era, past Nothosaurus' 2.98×. That is the concrete form of "a
copied rig is a starting point to be re-measured on the new animal, never a transplant".

## The mouth

**Painted, not modelled.** Placodus' geometric method returns three vertices over the whole front
third, so the head is one closed solid with the mouth drawn on it.

Which feature the albedo method finds is the whole question here, and Keichousaurus records why —
on a long-necked swimmer the shared `albedo_mouth_line` returned the *countershading* boundary
rather than the lip. On this generation it returns neither cleanly. Three independent per-station
readings were compared:

| Reading | Mean flank disagreement | Station-to-station roughness |
| --- | ---: | ---: |
| The walk up from the belly (`albedo_mouth_line`) | 0.323 of the local radius | 0.129 |
| Keichousaurus' darkest row within the pale zone | 0.350 | 0.196 |
| The steepest downward luminance step | 0.387 | 0.137 |

All three are that noisy because **this jaw is white with black speckles painted on it**, and a walk
up from the belly stops at the first speckle. So the line is read as a *curve* instead
(`tripo.painted_line`, added to the kit for this): a matched filter for a thin dark line with
lighter skin above and below it, resolved as the best path along the head under a jump penalty.
Roughness **0.017** of the local radius, and the flanks still disagree by 0.358 on average — this is
a noisy read on a blotched hide and is recorded as such.

The search band is bounded **below the section's mid height**, and that bound is load-bearing: the
eye and the countershading boundary both outscore the lip, and an unbounded read climbed off the
jaw corner and followed the countershading back along the neck, ending 0.43 of a radius *above* the
axis. A render with the fitted line drawn on the head is what settled it, and it is also what places
the hinge — the jaw corner is where the read leaves the lip, at 0.102 of a body behind the snout.

A straight ramp through the same points would have deviated by 0.0019 raw, **0.038 of the local
radius** — this reptile's mouth line is very nearly straight too, and that is measured rather than
assumed. No tooth patch straddles the cut, and **no dentition was authored**.

### What the gape proof cost, and what it exposed about the proof

`gape-solid.py` renders at full gape against magenta with and without a backface-cull shim. It
failed this body at 508 pixels, and the first three fixes moved the count by **not one pixel**:

> The background test was `r > .5, g < .3, b > .5` — a half-space, not the backdrop. A magenta
> *world* also lights the scene, and the era's standard oral lining (0.30, 0.13, 0.115) renders
> under it at (0.73, 0.29, 0.51): inside that window by a hair on green. 394 of the 508 pixels were
> the animal's own mouth, correctly drawn and correctly front-facing.

The discriminator is **blue** — the backdrop renders at 0.93 and above, a lit red lining at about
half that — so the test is now `r > .75, g < .45, b > .75`. Tightening can only ever reduce a count,
so nothing that passed before can fail now: Birgeria goes 1 → 0 and Mixosaurus 3 → 0 on unchanged
files.

What was left was 125 pixels, at the drive of `Heavy` and nowhere else, and not the mouth either:
through the gap between an open jaw and the throat you could see the **inside of the mandible's
lower rear corner**, backfacing. No lining can cover that, because it is outside the mouth. Cut
along the line this generation paints, the corner of the mouth starts to open somewhere between
0.47 and 0.50 radians of jaw, so the snatch runs at **0.47** — wider than Attack's 0.43, inside
Bite's 0.52. What makes a snatch a snatch is its reach, 1.43 against Attack's 1.04, not another five
degrees of jaw. **Final: 1 pixel of 378,000.**

Two things the lining needed, both now options in the shared kit: a superellipse `power`, because a
mouth's section is not an ellipse and an ellipse narrows towards its floor; and a **per-vertex
`fit`**, because shrinking a whole ring by one factor couples its two axes — a floor set deep enough
to sit inside the mandible rather than stipple against it took the *width* down to 0.68 of the
mouth's own and the far wall then stopped short of the mandible's rim.

### T3D-28: the mouth is the cut, capped and domed — and the lining is gone

Everything above about the lining is history. This head **arrived shut** — one closed solid with
the lip painted on it, which is exactly what the geometric method returning three vertices means —
so turning the jaw bone opens nothing until the cut makes an aperture, and what the cut leaves is a
hole in each half. `T.cut_rim` measures it: **one closed loop of 116 vertices per half** on the
authored body, 68 of them on the seam and 48 on the head's cross-section at the hinge; 69 on the
twin.

Those two holes are now closed with the cut's own rim and domed apart (`T.cap_mouth`), and the
`Oral cavity lining` and the blended `Seated jaw hinge tissue` are both retired. The hinge
cross-section is fanned first with its own vertices (`T.cap_cut`, 50 faces authored / 31 twin);
what is left — the two lip runs joined round the snout and the chord that fan closed the hinge with
— is filled in the mouth's own plane and poked twice (594 faces authored / 342 twin), then pushed
into its own half by **0.34 of each vertex's own distance from the rim**, bounded at 0.55 of
`mouth_half_depth` (the ray cast from the seam to the skin). Deepest 0.016 raw on a mouth 0.10 long.
Nothing is invented: every cap vertex is a convex combination of rim vertices, and its UVs and
vertex colour come off the rim, so the roof of the mouth is this animal's own albedo.

| Measurement | Before | After |
| --- | --- | --- |
| `gape-solid.py`, plain, six opening clips | 0 px through, 166–177 opened | **0 px through, 0 opened** |
| `gape-solid.py --as-drawn` (what the game shows) | **4,626 px through** at `Heavy`; 4,427–6,066 opened at `Attack`, `Bite`, `Eat` | **0 through, 0 opened** |
| `lag.mjs` | 0 open past 0.2 % | 0 open past 0.2 %, worst 0.00 % |
| `skin-tears.mjs` | 2.81x | 2.81x (mouth skin jaw 1.52x, skull 1.26x) |
| `oral-shell-audit.mjs` | palate + floor | no oral lining on any variant |

The as-drawn row is the one that matters and it is new: the runtime hides everything
`src/shared/oral-geometry.ts` matches, so the plain proof was about a body the game never drew.
Pictures, with the classifier applied, at `Heavy`'s widest:
[before](../../../../docs/triassic/verification/rhaeticosaurus-mouth-before.png) — a black void into
a hollow head — and [after](../../../../docs/triassic/verification/rhaeticosaurus-mouth-after.png).

## The performance: underwater flight

A plesiosaur's trunk is a stiff box — that is what the gastralia are for — so the axial chain here
carries almost nothing and the animal is carried by its flippers. The audit measures that rather
than naming it:

| | Swim | Sprint |
| --- | ---: | ---: |
| Flipper tip rise ÷ its sideways slide | 1.70 | 1.48 |
| Trunk travel ÷ flipper tip rise | 0.000 | 0.000 |
| Shoulder ÷ flipper tip rise | 0.0024 | 0.0028 |
| Tail tip ÷ flipper tip rise | 0.068 | 0.078 |
| Hind pair behind the fore | 0.199 of a cycle | 0.199 |

**The swept angle is measured from the limb's own direction** — root joint to tip joint in world
space, the largest angle between any two directions over the cycle — and not read off an Euler
channel, because a rotation written on one axis is a stroke on one body and a twist on another. The
build refuses a flipper that sweeps under 60° in Sprint or 45° in Swim.

| | fore L | fore R | hind L | hind R |
| --- | ---: | ---: | ---: | ---: |
| Swim | 90.4° | 102.1° | 76.2° | 80.9° |
| Sprint | 118.5° | 133.9° | 99.0° | 103.3° |
| Ability | 107.4° | 106.0° | 90.9° | 90.4° |
| Glide | 12.6° | 14.2° | 10.7° | 11.4° |

`Ability` is the roster's **power stroke**: all four flippers with no phase offset at all — measured
0.146 radians apart — shoulders first, half the body's travel inside 0.22 of the clip. `Glide` is
the other end of the same animal, all four held out and barely moving.

`Heavy` is the snatch and the neck is what delivers it: skull travel 1.01 against the shoulder's
0.47, and a snout reach of 1.43 against `Attack`'s 1.04. Built from the same three shapes with the
same numbers the two measured an *identical* 1.04, which is two names for one clip; the snatch's
extra reach is the neck's rather than the shoulder's, because carrying the trunk forward with it
took the skull's travel down to 1.4× the chest's.

## What is measured, and what is weak

| | |
| --- | --- |
| Envelope, authored against twin | worst **0.062** = 1.24 % of body length, tolerance 4 % |
| Surface distance | max 0.031 = 0.62 %, p95 0.017 = 0.33 % |
| Anchor distances | mouth 0.0074 raw, attack 0.0057 raw, both inside the 2 % bound |
| Skin tears | worst **2.81×** on `tail_00` in Ability — the cleanest in the era |
| Idle bones | none — all 30 joints own skin |
| Gape | 1 px of 378,000 seen through the body with every backface culled |
| Loop seams | 0.0 on every one of the eight looping clips |

Recorded for the neutral-pose pass (task #24): `meanCurvatureRadiusOverSection` **21.4** over the
spine (tightest 3.96), **41.5** over the neck and head (tightest 5.64), **9.0** over the tail
(tightest 3.96) — a very straight animal, which is what a stiff-trunked flyer should measure.
Paired-limb asymmetry **0.093** of a body length mean, 0.177 worst.

**Weak, and honestly so:**

- **The flippers are too long, and that is the pose.** `docs/triassic/proportion-audit.md` measures
  each one standing about 0.31 of a body length clear of the flank — the audit read 0.36 on the
  unstretched preview — against roughly 0.25 L for a plesiosaur forelimb, giving a span of 0.83 L
  where the reference asks for about 0.75. `canonical/rhaeticosaurus.png` already draws flippers
  about 0.4 of body length. That is a **redraw question**, not a mesh correction, and nothing here
  touches it.
- **The painted mouth line is a noisy read.** The two flanks disagree by 0.358 of the local radius
  on average, which is three times what a cleanly countershaded animal gives. The continuous read
  makes the *curve* usable (roughness 0.017) but it cannot make the underlying measurement precise,
  and the seam is fitted to a blotched hide rather than to a modelled slit.
- **The snatch's gape is capped by the generation**, not by the animal: 0.47 rad rather than the
  0.60 it was authored at, because past about 0.50 the corner of the mouth opens onto the inside of
  the mandible. A generation with a modelled mouth line would not have this ceiling.
- **The swallow anchor cannot meet the 2 % surface bound and should not be asked to.** It is 2.85 %
  of a body from the nearest skin by construction, because it is inside the throat. The build
  asserts it is inside the closed surface and within 5 %, and records the depth; the two surface
  anchors keep the 2 %.
- `mouth-views.py` reports 850 hole pixels of 380,032 at `Heavy`, which its own docstring predicts:
  its column-wise test encloses the genuine background between an open jaw and a curving neck. The
  cull-shim comparison, which is the authoritative proof, is 1 pixel.
