# Saurichthys — the straightest body in the set, and the one the thickness rule cannot read

**Status: built, measured and rendered; not shipped.** `saurichthys` is deliberately *not* in
`tools/triassic/shipped.json` and its preview badge in
`src/content/triassic/pending-refinements.json` is untouched, so nothing in the game has changed.
The animal still borrows its Devonian stand-in in play. This directory is the candidate and the
evidence for it; a human decides whether it ships.

The delivered pair keeps the generation's needle body, its long rostrum with jaws of equal length,
its opposed dorsal and anal fins set far back and its near-symmetric caudal, on one 24-joint
skeleton with the same three sockets and **23 byte-for-byte identical decoded animation
performances**. The twin is also the runtime LOD.

| Delivery | Triangles | Vertices | Packaged bytes |
| --- | ---: | ---: | ---: |
| `saurichthys.glb` — worked Tripo body | 22,084 | 13,478 | 1,736,836 |
| `saurichthys.puppet.glb` — procedural twin | 8,462 | 4,350 | 1,297,480 |
| `saurichthys.lod1.glb` — byte-identical twin alias | 8,462 | 4,350 | 1,297,480 |

The reduced model is **38.3 %** of the authored triangles, inside the contract's 40 %. The model is
5.000 engine authoring units long, faces +Z in glTF and uses +Y up; the research registry gives the
animal 1 m.

---

## Which end is the head

Every other body in this batch is oriented by a rule that fails here. A tail tapers to a blade and
a head does not — so the head is the end whose first fifth carries the thicker shell — and on this
animal the two ends measure **0.0171 against 0.0143**, a margin of nothing, because the rostrum is
as thin as the caudal fin. The builder **asserts that the margin is inadequate** rather than
trusting it, so nobody later reads the fallback as a redundant belt and braces.

The mouth decides instead. Casting every vertex's own outward normal back into the mesh finds 927
that look across a slit at the surface opposite; **689 of them lie in the front sixth of one end and
0 in the front sixth of the other**. That is not a close call, and it is a measurement of the one
thing that distinguishes a head.

## Intake: mostly levelling, hardly any unbending

The proportion audit measured this animal's bent path at 1.006 of its straight axis — the straightest
body in the Triassic set — so the rigid section carry is very nearly the identity and most of what
intake does is *level* the animal.

| | |
| --- | ---: |
| centreline arc | 1.1511 |
| total turning | 94.6° |
| median section radius | 0.0312 |
| mean curvature radius ÷ section radius | **22.4** |
| largest vertex move | **0.1436** raw |
| tail tip's distance from its own chord, before | 0.1388 |
| tail tip's distance from the midline, after | **0.0060** |
| body length, before → after | 1.000 → **1.0684** |

The roll is read off the animal's own countershading — the first circular harmonic of the darkness
round each station points at dorsal — at mean harmonic strength **0.587** over 55 of 60 stations,
with 15.0° of measured drift along the body. The snout finishes 0.030 off the midline, which is the
one place this body does not land square: that is the generation's own asymmetry at the tip of a
rostrum a third of the animal long, and the carry does not invent a correction for it.

**How far from neutral the rest pose is**, which is what decides whether a curve can be straightened
on the rig or has to come out of the mesh:

| Region | arc | turning | section radius | mean curvature radius ÷ section |
| --- | ---: | ---: | ---: | ---: |
| whole spine | 1.132 | 94.6° | 0.0319 | **21.48** |
| head and trunk | 0.365 | 32.8° | 0.0464 | 13.73 |
| tail | 0.441 | 47.1° | 0.0218 | 24.65 |

No neck to measure separately. Nothing here is within a factor of seven of the 2.8 that forced
Dinocephalosaurus' neck to be unbent in the mesh.

**Left–right asymmetry of the paired fins.** The rig's own joints differ by **0.42 %** of body
length on average and 0.84 % at worst, because `seat()` pulled the two pectoral roots in by slightly
different amounts. The generation's own asymmetry, measured by mirroring the intake surface in x and
asking every paired-fin vertex how far it is from its reflection, is **0.78 %** on average and 2.18 %
at the 95th percentile.

## The mouth

| | |
| --- | ---: |
| method | geometric (normals cast back into the mesh) |
| cavity vertices found | 416 over 16 stations |
| the mouth's extent | raw y −0.5161 … −0.3558, 15 % of body length |
| how far the measured lip line departs from a straight line | 0.00207 raw, **0.19 % of body length** |
| **the cut's own deviation from that lip line** | **0, by construction** |

A needle fish's mouth is genuinely almost straight, which is the easy case, and the number says so:
two thousandths of a body length of curvature over a 15 % run. The cut follows the measured curve
anyway — the head is sheared by −seam(y) so the curve lands exactly on z = 0, the cut is taken there
and the shear undone.

**The generation arrived with its mouth shut for practical purposes.** The slit is a quarter of the
local head depth, but on a rostrum that shallow that is a closing rotation of only **2.5°**, so
nothing here has to fold a modelled gape closed. The jaw still rests shut in every clip that carries
the body and opens only for the strikes; posed shut, 518 of 1,425 mandible vertices touch the
skull's surface to a maximum of 3.2 % of body length and a mean of 0.2 %, which is the two tooth
rows meeting.

**The cut and the lining run to the very tip of the rostrum.** The jaws do, and the modelled cavity
stops a little short of them: left at the cavity's own front, the last 0.016 of the snout stayed on
the skull while the mandible swung away from it and the gape opened onto nothing there.

**The teeth are the generation's own** — 945 vertices in the oral zone, 45 standing proud of their
neighbourhood, the tallest by 0.0033 raw. Nothing is authored. 792 tooth-bearing vertices go whole
onto the mandible, and which jaw a tooth belongs to is decided by the height of the *smoothed*
surface it grows out of rather than by its own height. That correction is the one this animal
forced: with a graded height test, the upper tooth row came out of the first render as **a comb of
needles two head-depths long**, each tooth stretched between the skull and the jaw. Flood-filling
labels from the skin was tried as the fix and is worse here — the seeds are sparse on a tube this
thin and the label boundary wanders through the snout, which tore it into ribbons.

### Proving the gape is not a hole

One skinned lining, wound inwards, roof on the skull, floor on the jaw, wall stretching, skin
double-sided behind it; the mandible's cut boundary filled so the jaw is a closed shell; one blunt
ellipsoid rigid on the skull closing the wedge at the pivot. Everything authored takes its UVs from
the nearest intake surface and wears the body's own albedo.

```
blender -b --python tools/triassic/gape-solid.py -- saurichthys Heavy@0.50 Attack@0.40 Bite@0.15
```

**5 pixels of 378,000** at the worst of three shots (tolerance 12) — `PASS`.

| shot | differing pixels | opened by culling | seen through the body |
| --- | ---: | ---: | ---: |
| `Heavy` @ 0.50 | 0 | 0 | **0** |
| `Attack` @ 0.40 | 0 | 0 | 0 |
| `Bite` @ 0.15 | 11,604 | 8 | 5 |

## Rig

24 joints: `root`, `body`, `chest`, `skull`, `jaw`; `tail_00…tail_06`; `caudal_upper` and
`caudal_lower`; `dorsal` and `anal`; `pec_upper/pec_mid/pec_tip` per side; `pelvic` per side. The
rostrum and skull are one rigid piece on one joint, which is what an elongate, partly ossified
column with the fins set far back actually is. Dorsal and anal ride the caudal chain and are
opposite each other, because with the caudal they are one rudder.

Every root is seated inside the trunk's own cross-section: pectorals 0.0165/0.0179 raw deep,
pelvics 0.0182/0.0185, the jaw hinge 0.0129. Every vertex on both bodies has normalised non-zero
weights and at most four influences.

| | Measured | Fraction of the 5.000 body | Tolerance |
| --- | ---: | ---: | ---: |
| maximum envelope difference over 21 stations | **0.0724** | **1.45 %** | 4 % |
| nearest-twin-surface distance, max | 0.0470 | 0.94 % | — |
| the same, 95th percentile | 0.0244 | 0.49 % | — |
| `anchor_mouth` to the nearest authored surface | 0.0812 | **1.62 %** | 2 % |
| `anchor_mouth_inside` | 0.0044 | 0.09 % | 2 % |
| `anchor_attack_primary` | 0.0887 | **1.77 %** | 2 % |

`anchor_mouth` (role mouth) is on the **jaw**, `anchor_mouth_inside` (role swallow) on the **skull**,
`anchor_attack_primary` (role attack) on the **skull** — the roster's heavy attack here is *Spear*,
delivered by the rostrum, which is rigid on the skull. Both of the front two anchors sit further
from the surface than the others because the rostrum is a needle and the mouth line runs down the
middle of it: 1.6–1.8 % of body length, inside the 2 % the pipeline allows but the least comfortable
number on this animal.

The twin is a voxel volume resurfacing at **0.0042** raw units — finer than the shark's, because a
rostrum 0.01 across has to survive the occupancy field as a rostrum — relaxed under a thickness mask
and reduced. No source vertex or face survives it; pigment is sampled through the nearest source
triangle's own interpolated UV.

## Motion

21 contract clips plus this animal's own **FastStart** and **Hover**.

| Clip | s | | Clip | s | | Clip | s |
| --- | ---: | --- | --- | ---: | --- | --- | ---: |
| Idle\* | 3.0 | | Attack | 0.9 | | Stagger | 1.2 |
| Swim\* | 1.6 | | Bite | 0.45 | | Ability | 1.0 |
| Sprint\* | 0.9 | | Heavy | 1.1 | | **Grab\*** | **1.1** |
| TurnLeft | 1.5 | | Hit | 0.6 | | Breath | 2.4 |
| TurnRight | 1.5 | | Death | 1.7 | | Growth | 1.5 |
| Dive | 1.4 | | Guard\* | 1.2 | | **FastStart** | **0.8** |
| Rise | 1.4 | | Parry | 0.4 | | **Hover\*** | **3.4** |
| | | | Dodge | 0.45 | | Eat\* | 1.5 |

`*` loops exactly, seam 0.0 to the float. Grab is a 1.1 s held loop. Root motion and scale animation
are absent. `locomotion` is **Swim**.

**This is not the shark's performance and does not read like it.** Kogan et al. 2015's flow-tank and
CFD work reads *Saurichthys* as a pike-like fast start on a body that is a poor sustained swimmer, so
the cruise is small and stiff and the burst is enormous:

| | Swim | Sprint |
| --- | ---: | ---: |
| skull lateral travel | **0.004** | 0.012 |
| `tail_03` | 0.084 | 0.228 |
| `tail_06` | 0.285 | 0.712 |
| caudal lobe tip | **0.613** | **1.462** |
| caudal lobe lag behind the peduncle | 0.041 of a beat | 0.043 |

The head moves four thousandths of a unit through a whole Swim cycle — 141 times less than the tail
tip — which is what a stiff-bodied ambusher looks like from above.

**The strike is a C-start, not a swim that speeds up.** The chain folds one way in unison over the
wind-up and unrolls from the front, the pectorals clamp back against the flank for it, and the
rostrum leads and holds the line through the drive:

| | skull reach | peak forward speed | fastest frame at | peak gape |
| --- | ---: | ---: | ---: | ---: |
| `Attack` (0.9 s) | 0.629 | 8.11 u/s | phase 0.31 | 0.65 rad |
| `Heavy` (1.1 s) | 0.841 | 11.81 u/s | phase 0.32 | 0.75 rad |
| `FastStart` (0.8 s) | **0.907** | 11.27 u/s | phase 0.30 | 0.55 rad |
| `Bite` (0.45 s) | 0.080 | — | — | 0.70 rad |

FastStart is the roster's *ambush surge* and has to out-reach the ordinary attack or it is the same
clip twice under two names: it does, by **1.44×**, and the audit asserts both that and that it
out-accelerates Attack.

**Hover is the passive the roster names** — "hangs motionless and is very hard to notice while it
does" — so it has to be measurably still, and the audit holds it to that: the skull travels
**0.038** of an engine unit over the whole 3.4 s clip and the tail tip 0.166. Only the paired fins
scull, and the body breathes.

**The paired fins work the dash.** Swept angle at each root over the whole Sprint clip (two beats):
**0.77 rad** at each pectoral, **0.95 rad** at each pelvic.

## Verification

```sh
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/saurichthys/build.py
node tools/triassic/creatures/saurichthys/audit.mjs --package --decode
/opt/blender/blender -b --factory-startup --python tools/triassic/gape-solid.py -- saurichthys Heavy@0.50 Attack@0.40 Bite@0.15
node tools/triassic/skin-tears.mjs public/assets/triassic/creatures/saurichthys.glb
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/saurichthys/render.py -- --decoded
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/saurichthys/render.py -- --decoded --twin
python3 tools/triassic/creatures/saurichthys/contact-sheets.py
node tools/triassic/review-bodies.mjs
```

`build.py` authors both geometry and performance, writes only this species' asset family, touches no
shared registry and performs no git operations. It installs an excepthook that kills the process
with a non-zero status on any exception, because Blender exits 0 when a script raises.

`audit.mjs --package --decode` does everything the Hybodus audit does — exact rig, inverse-bind,
socket and per-clip sample parity between the three files, normalised weights, loop seams, no root
or scale channels, the twin under 40 % — and then plays 61 phases of every clip on both models
through the real loader and mixer and asserts this animal's own motion: the beat grows backwards
from a still head, the caudal lobe lags the peduncle, the strike commits, FastStart out-reaches and
out-accelerates Attack, Hover is still, and the jaw never closes past the measured shut pose.

Repository checks run green: `npm run triassic`, `npm run typecheck`, `npm run build`,
`npm run eras`, `npm run props`.

Sheets, rendered from the decoded packaged files through identical cameras and lights for both
models: [volume](paired-volume-sheet.jpg), [deformation](paired-deformation-sheet.jpg),
[the lunge](paired-lunge-sheet.jpg), [remaining actions](paired-actions-sheet.jpg),
[the beat from above](paired-beat-sheet.jpg), [this animal's own clips](paired-era-clips-sheet.jpg),
[the mouth](paired-mouth-sheet.jpg).

## What I actually looked at, and what is weak

I rendered every clip and looked at the sheets; there was no human reviewer and none is claimed.

What I saw: the needle body is straight and level, the opposed dorsal and anal read as one rudder
with the caudal, the rostrum holds its line through the dash, and the gape opens as a long lined
cavity with both tooth rows on their own jaws.

Honest limitations, worst first:

1. **Skinning tears.** `node tools/triassic/skin-tears.mjs` reports a worst edge stretch of
   **23.1×** (Death; an edge 0.011 units long at rest reaching 0.251), 21 of 23 clips tearing
   something past 2×, and `chest` and the pectoral chain dominating the torn-edge counts. Placodus'
   12.4× is already called broken, so this is over the line and is the worst thing about the body.
   Widening the fin root blend did not move it, which says the fault is the *blade mask* — a
   smoothstep on measured shell thickness that behaves as a step where the thickness changes
   abruptly at a fin's base — rather than the root blend. I did not fix it. Full per-clip table in
   [`skin-tears.txt`](skin-tears.txt).
2. **The mouth and attack anchors sit 1.6–1.8 % of body length off the nearest surface**, against
   0.09–0.34 % on the shark. The rostrum is a needle and the mouth line runs down the middle of it,
   so there is very little surface near the midline to be close to. Inside tolerance, but it is the
   number I would look at first if a grip reads as landing in air.
3. **A few long strands still cross the front of the gape** at the widest openings — the last of the
   sac's front cap being dragged open by a jaw this long. They are two or three edges wide and the
   `gape-solid` test does not see them as holes, but they are visible in the mouth sheet.
4. **The snout finishes 0.030 raw off the midline** (2.8 % of body length). That is the generation's
   own asymmetry at the tip of a very long rostrum; the carry does not invent a correction for it.
5. **No eye globes**, as on every other body in the era so far.
6. **The lining wears the skin's pigment stretched**, which reads as flesh at distance and as a smear
   in a close-up.
7. Living colours, soft tissue and movement are artistic reconstruction. Travel, the live birth the
   roster gives this animal, and the grip rules remain engine-owned.
