# Atopodentatus unicus — authored Tripo body and procedural twin

*Middle Triassic · Luoping, Yunnan · 3 m · rung III, the grazer*

The hammerhead: a T-bar rostrum with a comb of chisel teeth along its front edge and a mesh of
needle teeth behind it, four broad rowing paddles, and a tail that is more than a third of the
animal. Built through the shared pipeline in `tools/triassic/creatures/_pipeline/tripo.py`; the
authored body and its measured volume twin share one armature, one set of inverse binds, one set
of sockets and one set of actions.

## Reproduce

```sh
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/atopodentatus/build.py
node tools/triassic/creatures/atopodentatus/audit.mjs --package --decode
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/atopodentatus/render.py -- --decoded
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/atopodentatus/render.py -- --decoded --portraits
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/atopodentatus/render.py -- --decoded --twin --portraits
python3 tools/triassic/creatures/atopodentatus/contact-sheets.py
node tools/triassic/skin-tears.mjs public/assets/triassic/creatures/atopodentatus.glb
node tools/triassic/idle-bones.mjs public/assets/triassic/creatures/atopodentatus.glb
/opt/blender/blender -b --factory-startup --python tools/triassic/gape-solid.py -- atopodentatus \
    Bite@0.19 Attack@0.46 Eat@0.5 Ability@0.25
```

## What the source is

The **published preview**, not the raw generation: its ventral fins were collapsed by
`smooth-region.py` (1054 vertices, protrusion 0.1838 → 0.0137, 7.4 % — see
`docs/triassic/preview-mesh-defects.md`). The raw generation is preserved unchanged in
`tripo-raw/` and its hash is recorded in `validation.json`. One connected component, 9,584 vertices
after a 1e-6 weld, no flake removed.

## The frame, and why it is measured rather than assumed

`measure_frame` takes the body's own first principal component and a builder says which end of it
the head is on. Taken head-**positive**, this animal's rostrum lands at +Y and its tail tip at −Y,
which is the mirror of every other body in the era. The T-bar settles it, and the builder asserts
it: over y −0.338 to −0.280 the section is 0.10 wide and 0.02 deep — flat and broad, which nothing
else on this animal is — while the far end tapers to a half width of 0.007. The rostrum is the wide
flat end.

The principal axis lies 1.25° off the file's x axis and the countershading reads dorsal at 94.5°,
so the roll correction is 4.5°. Countershading strength 0.47 over 24 stations.

| | |
|---|---:|
| Authored triangles | 22,890 |
| Twin triangles | 7,872 (**34.4 %**) |
| Joints | 30 |
| Max influences / mean | 4 / 3.12 |
| Envelope, worst of 21 stations | 0.0585 = **1.17 %** of body length (tolerance 4 %) |
| Surface distance, max / p95 | 0.152 / 0.037 |
| Anchor surface distance, worst | 0.0163 of body length (tolerance 2 %, swallow 5 %) |
| Paddle root seating inside the trunk | 0.0162 – 0.0168 |
| Jaw hinge seating | 0.0306 |
| Worst **skin** tear | **3.90×** (`Heavy`, `neck_02`/`jaw`) |
| Gape solid | **9 px** of 378,000 (tolerance 12) |
| Idle bones | every joint owns skin |

## The paddles

Four broad blades, found by connectivity on the measured shell thickness. **The rostrum is thin
too** — 0.02 deep against 0.10 wide — so it is the largest thin cluster on the animal by a factor
of four, and a naive "thin means limb" test would rig the hammer as a fifth flipper. Two readings
separate them: the paddles stand 0.25 to 0.32 from the axis where the rostrum stands 0.12, and the
rostrum straddles the midline where a paddle does not. The tail tip is the other thin cluster, at
0.039.

Four joints in each blade rather than three, for the reason Rhaeticosaurus' hydrofoils have four:
a limb that sweeps a real arc on three joints puts a third of that arc across each band between
them. The radius inside which a vertex is wholly the limb's is the **92nd percentile** of the
blade's own distances to its polyline — the figure Rhaeticosaurus had to move the kit's 55th
percentile to, re-measured here rather than inherited.

## The mouth

**Modelled**, which makes this the easy case of the three the pipeline records. Placodus' geometric
method — cast every head vertex's own outward normal back into the mesh — returns **634 cavity
vertices** at a 0.020 gap, running y −0.333 to −0.196, and the seam is that cavity's own mid height
per station, blurred once. Station-to-station roughness **0.023** of the local radius. A straight
cut would have deviated 0.0075 raw, 0.177 of the local radius; the curve used deviates 0.0041 from
the measured line. The albedo read (`painted_line`) is taken as a second opinion and recorded in
`validation.json`; it agrees to 0.177 of the local radius, which is a corroboration rather than a
measurement.

The cavity's last few stations climb steeply (seam 0.024 → 0.041 over 0.03 of the body) while its
half width collapses to 0.016: that is the detector following the narrowing groove at the corner of
the mouth up onto the cheek, not the lip. The seam is fitted over the stations in front of the
hinge and continued behind them.

### Three things this head taught the kit, each of them an instrument that does not work here

- **`cavity_profile`'s width is the span of the lip *line*, and across a T-bar that is wider than
  the head.** 0.108 against a widest vertex 0.096 off the axis. Unclamped, the lining came out
  through both corners of the hammer by 0.023 of a body length. This is Birgeria's lesson in the
  shape a hammerhead gives it.
- **The signed depth probe cannot judge anything near a modelled mouth**, which Birgeria records:
  the nearest surface to a point in the lumen is the lumen wall, whose normal points at it, so a
  correctly placed sac reads as outside the animal. It also shrank the jaw-hinge envelope to half
  its radius — 0.025 against a head half width of 0.055 — so the envelope stopped well short of the
  sides, which is exactly where the corner of the mouth is. `gape-solid.py` then saw a 20-pixel
  sliver of backdrop at that corner in three clips out of four, and **no change to the lining moved
  it, because it was never the lining.**
- **Ray parity fails one level down, for the same reason.** The modelled mouth is a *pocket* in a
  closed shell, so the lumen is genuinely exterior space and a ray from it crosses an odd number of
  faces exactly as a ray from outside the cheek does: 302 of 780 lining vertices read as outside,
  and they were the mouth.

What does answer it is the **section hull**. A mouth lumen is inside the convex hull of the head's
own section at its station; a vertex that has come out through the cheek is not. On that reading
the lining gets the per-vertex fit Rhaeticosaurus established and Birgeria had to do without — 79
vertices were outside the hull by up to 0.0144 before it, and none after, with a worst clearance of
0.0025.

The lining is also **darker and rougher than the era's standard** (0.15, 0.062, 0.055 at roughness
0.82, against 0.30, 0.13, 0.115 at 0.62). Every previous body's lining is hidden behind a shut lip
and only ever lit from inside an open mouth. This rostrum carries a comb of separate needle teeth
with real gaps between them, so at Idle the interior is *front lit through the fence*, and the
standard colour read as a pink sausage lying along the bar. It is set back from the palate along
the comb and left at full section at the corner — pulled in everywhere, it left the corner 26 px
open at full gape.

**No authored dentition.** The generation carries its own comb and the only thing this build does
about the teeth is check that the measured cut does not saw through one: seven protruding patches,
none straddling the cut.

## How it moves

A **rower**, not a flyer, and the audit's checks are deliberately the opposite way round from
Rhaeticosaurus'. That animal's trunk is a stiff box, its tail must not drive, and a flipper tip has
to rise and fall further than it slides. Here the stroke is fore and aft, the two sides alternate,
and the long tail is allowed a share of the cruise.

| | Swim | Sprint | Idle |
|---|---:|---:|---:|
| Paddle sweep at the root, degrees | 98 – 106 | 124 – 136 | 27 – 29 |
| Slide over rise at the blade tip | 2.25 | 2.06 | 2.51 |
| Left against right, fractions of a beat | 0.486 | 0.485 | 0.486 |
| Hind behind fore | 0.249 | 0.249 | 0.249 |
| Tail tip as a share of the paddle stroke | 0.176 | 0.229 | 0.143 |
| Trunk as a share of the paddle stroke | 0.000 | 0.000 | 0.000 |

The swept angle is taken from **the limb's own direction in world space** — root joint to tip joint,
the largest angle between any two directions over the cycle — never off an Euler channel, and the
build refuses a paddle that sweeps under 60° in Sprint or 45° in Swim.

**A mirrored pair given the same joint angle moves in opposite directions along the body**, so the
alternation has to be read off the tip's own position and not off the joint: measured on the
channel, four paddles in perfect antiphase read as 0.000 of a beat apart, which is the same trap
Rhaeticosaurus' power stroke records one axis over. The blade tip is likewise a bone *head*, not a
`:tip` probe — `name:tip` asks for a point 0.8 along the bone's own local +Y, and every bone in
these rigs rests pointing along the *body* axis, so on a paddle that probe is a lever sticking out
fore-and-aft and a rotation that sweeps the blade backwards moves it sideways. Measured that way
the row read as a rise.

**Heavy is the hammer sweep** and is built on a different shape from the bite: the bar is cocked to
one side and swung across with the whole animal behind it, and the jaws stay nearly shut through it
(0.138 rad). It swings 2.52 across against 1.96 forward, where Attack — the forward strike —
reaches 0.44 forward against 0.13 across. **Ability is `scrapeSieve`** and is a held loop, as the
roster declares it: nose down on the meadow, head working side to side (0.71 of lateral head swing
against 0.00 of body swing), jaws opening on the scrape and shutting on the sieve.

## For the neutral-pose pass

`meanCurvatureRadiusOverSection`, in units of the body's own half-thickness at each station:

| Region | Mean | Tightest |
|---|---:|---:|
| Spine (10 stations) | 9.71 | 1.26 |
| Neck and head (3) | 4.36 | 1.80 |
| Tail (4) | 18.18 | 4.72 |

Paired-limb asymmetry, as a fraction of body length: **mean 0.0367, worst 0.0714**. The fore pair
is the asymmetric one — the left blade sits 0.05 of a body further back than the right — and the
rig is built to each blade's own measured axis rather than to a mirrored ideal, so both deform
correctly and simply do not match each other at rest.

## Limitations

- The **mouth interior is visible at rest**, through the gaps between the needle teeth. That is a
  property of the generation rather than of this build: the comb is a fence of separate pickets and
  there is a real lumen behind it, which the raw Tripo render also shows as a dark line. It is as
  dark and as far back as it can be made without opening the corner of the mouth.
- The lining is **sized and fitted from a measured cavity whose back stations are unreliable**, and
  the fit behind the hinge rests on a seam continued rather than measured.
- Living colours, soft tissues and movements are artistic reconstruction. World travel remains
  engine-owned.
- Not shipped: registered in `src/content/triassic/review-bodies.json` for the specimen viewer.
  `tools/triassic/shipped.json`, the roster stand-in and the preview badge are a separate human
  decision.
