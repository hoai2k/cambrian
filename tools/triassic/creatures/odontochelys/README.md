# Odontochelys semitestacea — authored Tripo body and procedural twin

*Late Triassic · Guanling, Guizhou · 0.4 m · rung I, armoured from below*

The earliest turtle, and the one whose shell is only half built: a **plastron** under the belly and
**no carapace** over the back, teeth in both jaws, four clawed limbs and a tail a quarter of the
animal. Built through the shared pipeline in `tools/triassic/creatures/_pipeline/tripo.py`; the
authored body and its measured volume twin share one armature, one set of inverse binds, one set of
sockets and one set of actions.

## Reproduce

```sh
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/odontochelys/build.py
node tools/triassic/creatures/odontochelys/audit.mjs --package --decode
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/odontochelys/render.py -- --decoded
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/odontochelys/render.py -- --decoded --portraits
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/odontochelys/render.py -- --decoded --twin --portraits
python3 tools/triassic/creatures/odontochelys/contact-sheets.py
node tools/triassic/skin-tears.mjs public/assets/triassic/creatures/odontochelys.glb
node tools/triassic/idle-bones.mjs public/assets/triassic/creatures/odontochelys.glb
/opt/blender/blender -b --factory-startup --python tools/triassic/gape-solid.py -- odontochelys \
    Bite@0.09 Attack@0.45 Heavy@0.5 Eat@0.42
```

| | |
|---|---:|
| Authored triangles | 21,926 |
| Twin triangles | 7,314 (**33.4 %**) |
| Joints | 29 (including the rigid `plastron`) |
| Max influences / mean | 4 / 3.51 |
| Envelope, worst of 21 stations | 0.0421 = **0.84 %** of body length (tolerance 4 %) |
| Surface distance, max / p95 | 0.154 / 0.019 |
| Anchor surface distance, worst | 0.0035 of body length (tolerance 2 %) |
| Limb root seating inside the trunk | 0.0152 – 0.0181 |
| Jaw hinge / plastron bone seating | 0.0074 / 0.0353 |
| Worst **skin** tear | **5.13×** (`Sprint`, `tail_00`) |
| Gape solid | **3 px** of 378,000 (tolerance 12) |
| Idle bones | every joint owns skin |

## The plastron, and why there is no carapace bone

Henodus and Placodus each lock a fused dorsal shell to one unanimated bone, and the obvious move is
to copy that whole. **The anatomy does not justify it.** Odontochelys' back is broadened ribs under
skin and it bends; a `carapace` bone here would stiffen the one part of this animal that still
flexes. What is genuinely a plate is the belly, so that is what goes rigid — and the audit asserts
both halves: `plastron` carries no animation channel in any clip of either body, and there is no
`carapace` joint in the skin at all.

The plate is **measured, not declared**. The generation paints it: a pale plate with suture lines on
an otherwise banded hide, and the ventral luminance runs 0.61–0.70 over the trunk against 0.45–0.51
in front of and behind it. Taking the pale ventral vertices and keeping the largest connected run
gives **1,326 vertices against 157 in the next run** — a clean separation — spanning y −0.236 to
0.207, x ±0.15, z −0.104 to −0.026. A superellipse is then fitted to the 6th-to-94th percentile of
that run and used as a **feathered field**, because a hard `lo < y < hi` gate is a step in the
weight field and a step in a weight field is a tear. 915 vertices end up mostly on the plate.

The exporter samples every pose bone whether or not it was keyed, so a bone the performance never
touches still leaves 46 constant channels per body; those are stripped from the GLB after
`patch_glb`, as Henodus strips its carapace's. "Rigid" then rests on the channels being absent
rather than on their values happening to match.

## Two measurement faults this pose exposed

Both are the shore-animal kit's "inside and outside cannot be taken from the nearest triangle's
normal" turning up somewhere new.

- **At the shoulder, the nearest surface to the body's own midline is the inner face of a limb.**
  The forelimbs are tucked hard against the flank, so `depth_probe` reads a point plainly inside the
  trunk at y −0.252 as **0.004 outside** it, and `seat()` walked the whole way to the centreline
  without ever finding a seat. Worse, the kit's centreline is itself unusable there: it is the
  median of the *thick* vertices, and a leg is thick, so the median lands in the crease between the
  trunk, the tucked neck and the folded arm — 0.0043 from the nearest surface and on the wrong side
  of it. The bones therefore stand on the section's own **deepest interior point**, found by
  distance and confirmed by ray parity, smoothed along the body. All four limb roots seat 0.015 to
  0.018 inside; the median station depth along the body is 0.041.
- **The deepest-point search has to walk the whole sorted candidate list, not its head.** The
  section band spans the limbs as well as the trunk, so the candidates furthest from any surface
  include points in the open water *between* a hanging forelimb and the belly — and on this pose
  those beat every interior point. Testing only the best six rejected all six at every station and
  the deep centreline silently fell back to the median one it exists to replace. It reported a
  median station depth of exactly **0.0**, which is what gave it away.

## The head, and the mouth

**The head is 0.075 of the body long and a forelimb reaches past it**, so every head measurement is
taken inside a radius of the head's own axis. A plain band at y −0.330 reads a half depth of
**0.228** where the head's own is **0.051** — it is reading the shoulder. `head_half_depth` is what
the lining is sized in units of and what the seam is judged against, so an ungated read puts the
mouth line out through the top of the skull. The build asserts that no head station reads more than
three times the head's median, and that **the seam stays inside the animal** (worst clearance
0.0170).

The mouth is **modelled**: 106 cavity vertices at a 0.012 gap, and the seam is the cavity's own mid
height per station, blurred once. Station-to-station roughness **0.053** of the local radius. Behind
the hinge the detector walks off the head onto the forelimb standing beside the jaw — the seam it
reports there falls a fifth of a body length below the head — so only the stations in front of the
hinge are fitted. A straight cut would have deviated 0.0020 raw (0.093 of the local radius); the
curve used deviates 0.0038 from the measured line. The albedo read agrees to 0.187 of the local
radius and is recorded as a second opinion.

Containment for the oral geometry is a **section-hull** test, for the reasons Atopodentatus records
in detail: the signed depth probe reads a point in a modelled lumen as outside the animal, and ray
parity reads the same way one level down, because a modelled mouth is a pocket in a closed shell.
The lining takes a per-vertex fit against the hull and finishes with **0 vertices outside it** and a
worst clearance of 0.0020. No authored dentition; no tooth patch straddles the cut.

## How it moves

A **rower on a diagonal-couplet gait**: the two sides alternate on each girdle and the hind pair is
half a beat behind the fore, which is a walking tetrapod's gait taken into the water rather than a
sea turtle's synchronous flight.

| | Swim | Sprint | Crawl | Idle |
|---|---:|---:|---:|---:|
| Limb sweep at the root, degrees | 67 – 72 | 83 – 91 | 70 – 76 | 18 – 20 |
| Slide over rise at the limb tip | 2.52 | 2.38 | 2.20 | 2.71 |
| Left against right, fractions of a beat | 0.494 | 0.494 | 0.493 | 0.494 |
| Hind behind fore | 0.499 | 0.499 | 0.498 | 0.499 |
| Tail tip as a share of the limb stroke | 0.084 | 0.108 | 0.149 | 0.072 |
| Trunk as a share of the limb stroke | 0.000 | 0.000 | 0.000 | 0.000 |
| Plastron offset drift from the trunk | 5e-11 | 9e-11 | 4e-10 | 1e-11 |

The swept angle is taken from **the limb's own direction in world space**, never off an Euler
channel, and the build refuses a limb that sweeps under 60° in Sprint or 45° in Swim.

**Ability is `bellyTurn`**: a one-shot roll that carries the plate **1.55 rad** round towards the
threat and back to exactly its rest offset, with the head drawn in over it and the limbs pulled
under. The roll is measured as the angle of the plate's offset *from its own resting offset* — taken
as an absolute bearing the series wraps through ±π at the top of the roll and reads 6.25 rad, which
is the wrap and not the animal. **Crawl** is the punt along the bottom, an extra beside the swim set
rather than the locomotion. Heavy and Attack are bites; the attack anchor is on the skull, because
nothing about this animal strikes with a neck, a tail or a limb.

## What the skinning cost, and what is still weak

The worst skin tear is **5.13× in Sprint, on `tail_00`** — which is the hip, and `tail_00` is the
hind limbs' parent. That is the weakest thing about this body. Four measured passes got it there
from **11.04×**:

| Change | Worst skin |
|---|---:|
| First build (kit defaults, blend 0.040, radius 92nd percentile, 4 relax passes) | 11.04× |
| Root fade over 1.4 of the first bone, radius 88th, blend 0.060, 6 passes, gentler stroke | 7.02× |
| Root fade 2.0, radius 84th, 9 passes, almost nothing at `tail_00` | 5.83× |
| **Radii growing with arc length (`r·(1 + 0.6 t²)`, `r·(1 + 1.2 t²)`)** | **5.13×** |

That last one is the finding worth keeping. The kit takes one inner and one outer radius per limb,
and beyond the outer one a vertex gets no limb weight at all. On a hydrofoil or a paddle that is
safe. On a **clawed leg the toes splay past the end of the chain**, so the half per cent of cluster
vertices outside the 99.5th percentile are the toe tips — and they came out weighted to `tail_00`,
sitting against neighbours weighted to `hind_tip_R`: 3.84× between exactly those two bones on the
right hind foot, and 163 more torn edges within `tail_00` around it. Both radii now grow with arc
length, tight at the shoulder where the trunk is next door and open at the foot where nothing else
is. Opening them *further* (2.40/3.00 on a 90th-percentile base) went back up to **6.46×**: a radius
wide enough to cover a splayed foot is also wide enough to reach the hip from the knee.

Two cures that did **not** work and are recorded so they are not retried:

- **Gating the limb by distance to its own measured thin cluster.** Exactly wrong on a clawed leg: a
  thin cluster is the blade-like part of a limb, which on a leg is the foot and lower limb only. The
  upper arm is thick and so is not in the cluster, and the gate took all four `*_upper` bones' skin
  away entirely — caught by `idle-bones.mjs`, and it would have made every swept angle recorded for
  them a measurement of nothing.
- **Bounding each limb to its own side of the animal.** It moved the figure by 0.02× and starved
  `hind_upper_L` to 0.02 % of the skin, because that limb's own measured root sits at x +0.017 — on
  the *other* side of the midline, where the limb wraps over the hip.

The inter-joint blend is a **fraction of each limb's own length** (0.16, giving 0.040–0.045 here)
rather than a number copied from another animal: Rhaeticosaurus' 0.050 is 0.16 of a flipper reaching
0.30 from the axis, and as a number on a shorter chain it is more than a whole segment wide, every
vertex then carries all four joints at nearly equal weight, and the relaxation trims a different
four on neighbouring vertices.

## For the neutral-pose pass

`meanCurvatureRadiusOverSection`, in units of the body's own half-thickness:

| Region | Mean | Tightest |
|---|---:|---:|
| Spine (8 stations) | 19.12 | 3.07 |
| Neck and head (2) | 3.52 | 3.10 |
| Tail (3) | 42.66 | 4.08 |

The body is nearly straight; nothing here needs unbending.

Paired-limb asymmetry is **high: mean 0.098 of body length, worst 0.108**. That is the walking pose
the generation arrived in — the left forelimb is 0.077 of a body further forward than the right —
and the rig is built to each limb's own measured axis rather than to a mirrored ideal, so both
deform correctly and simply do not match each other at rest. It is the largest asymmetry measured on
any body in this batch and is the obvious first item for the neutral pose.

## Limitations

- **5.13× at the hip in Sprint** is the outstanding defect, and it is the hind limbs' root band
  against `tail_00`. It is weights rather than geometry — the same clips on a straighter-limbed
  animal measure 3.4× — and the four passes above are recorded so the next attempt starts where this
  one stopped rather than at the beginning.
- The seam behind the hinge is **continued rather than measured**, because the cavity detector walks
  onto the forelimb there.
- Living colours, soft tissues and movements are artistic reconstruction. World travel remains
  engine-owned.
- Not shipped: registered in `src/content/triassic/review-bodies.json` for the specimen viewer.
  `tools/triassic/shipped.json`, the roster stand-in and the preview badge are a separate human
  decision.
