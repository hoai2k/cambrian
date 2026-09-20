# Askeptosaurus: original diagnosis, regeneration, and the body that ships

*15 September 2026. Reproduce with `local/askepto.py`, `local/askepto2.py`, `local/askepto3.py` and
`local/askcurv.py` — each is a Blender or plain-Python script that prints its numbers.*

Askeptosaurus was attempted once and abandoned, and the standing note said it was a **redraw
question rather than a build**: `proportion-audit.md` records "tail 0.49–0.54 against about
two-thirds; no neck (body full width within 0.06 of the snout) against 13 elongate cervicals", and
the abandoned build is remembered as the geodesic-window section carry shredding the body.

Measured again, three of those four statements do not survive, and the one that does is not about
the animal's proportions at all.

## 1. The straight-axis measurements are artefacts of a body bent 1.81× along itself

Every figure in the proportion audit's Askeptosaurus entry is a fraction of the **straight axis**,
and the entry says so — "bent path 1.729× the straight axis, the most strongly posed body in the
set, so every straight-axis fraction here is a floor."

Measured along the animal's own surface instead, from the snout, over 44 geodesic bands:

| | Along the straight axis | Along the animal | Target |
|---|---:|---:|---:|
| Body length | 1.000 (normalised) | **1.578** | — |
| Tail | 0.49–0.54 | **0.580** | 0.63–0.66 |
| Head and neck to full trunk width | 0.06 | **0.193** | ≈0.12–0.15 plus a skull |

The centreline through those band centres runs **1.587 long against a straight end-to-end of
0.877 — an arc-over-straight of 1.81**, worse than the 1.73 the audit measured and the most
strongly posed body in the era by a wide margin (Hupehsuchus 1.00, Tanystropheus 1.30).

So **there is a neck** — about a fifth of the animal from snout to full trunk width, which 13
elongate cervicals plus a skull is entitled to be — and the tail is **0.58, not 0.49**. The tail is
still short of the board's two-thirds, by about 12 %; the era has shipped worse (Nothosaurus' neck
measures 0.034 of its body against about 0.2).

## 2. The axial pipeline genuinely cannot build it, and that is measurable

This is the part that stands, and it is the reason the first attempt shredded.

- The body's first principal component lies **42.3° off the nearest file axis**, and the
  countershading puts dorsal at 123°, so the frame carries a **33.0° roll correction**. Both are
  the largest in the era.
- `measured_centreline`, the kit's axis, **swings 0.355 laterally across the frame against a mean
  trunk half width of 0.108 — 3.28× the body's own thickness.** An axis that wanders three times
  the animal's girth is not a line a rig can stand on.
- Worse than wandering, the axial stations **interleave the parts of the animal**. Along the
  measured y axis the section half width runs 0.089 → 0.358 (y −0.50 to −0.37, which is *tail*
  crossing the frame) → 0.034 (y −0.23, which is the *rostrum*) → 0.088 (y +0.10, the trunk) →
  0.020 (y +0.50, the tail again). Two different parts of the animal share most stations.

Both of the audit's proportion faults fall straight out of that interleaving: a "tail" measured
between stations that also hold the trunk is short, and a "neck" measured where the tail crosses
the frame beside the head is absent.

## 3. A geodesic banding *does* work — with the seeds declared

The shore-animal kit's answer to a posed body is a geodesic centreline, and the note that it
"shredded" this one is half right: it shreds if it is seeded automatically.

- The double sweep finds the two ends correctly here: **snout (−0.042, 0.498, −0.031) to tail tip
  (−0.389, −0.287, 0.145), 1.578 apart over the surface.** That is the animal, not a flipper —
  Macrocnemus' failure mode does not occur.
- But **which end is which cannot be taken from the frame**, and that is the trap. The first pass
  of this measurement assumed the snout was at the frame's minimum y, as every other body's is, and
  banded the animal **from a flipper tip**: the bands then blew up to a radius of 0.28 in the
  middle of the body and the tail fraction came out at 0.010. The frame is scrambled (section 2),
  so the frame cannot name the ends.
- What names them is distance from the middle of the animal: on a body whose tail is most of it,
  the **tail tip is 1.017 from the centre-most vertex and the snout 0.569**. Declared that way the
  banding is clean — the band centres walk smoothly, the radii rise from 0.023 at the snout to
  0.171 at the shoulder and fall to 0.017 at the tail tip, and the closest pair of bands more than
  a fifth of the body apart still clears by 0.0014 rather than overlapping.

The abandoned build's "section carry shredded it" is consistent with exactly this: a geodesic
window seeded at the wrong end carries sections across the animal instead of along it.

## 4. The pose's bend is within what a rig can straighten, except in the shoulder

`meanCurvatureRadiusOverSection`, the ratio task #24 uses to decide rig-straightening against mesh
unbending (Dinocephalosaurus is the calibration: a tail around 9 straightened on the rig; a neck at
2.8 mean / 1.51 tightest had to be carried onto a new axis first):

| Region | Stations | Mean | Tightest |
|---|---:|---:|---:|
| Whole body | 42 | 6.78 | 0.41 |
| Head and neck | 10 | 5.27 | 0.82 |
| Trunk | 8 | 1.48 | 0.41 |
| Tail | 25 | **8.84** | 0.78 |

The tail — the part that is actually bent, and the part that matters — reads **8.84 mean**, which
is Dinocephalosaurus' tail, which straightened on the rig. The tight stations are all in the
head, shoulder and hip (0.148, 0.261, 0.398, 0.420), and they are tight because the *section* there
is fat, not because the path folds: the trunk's band radius is 0.171 where the tail's is 0.024.

## Verdict

**Askeptosaurus is not a proportion problem, and its tail is not short enough to be one.** It is a
body that cannot be built with the shared axial kit in `_pipeline/tripo.py`, because that kit is
axial in every part — `measured_centreline`, `thin_clusters`, `bisect_on_curve` (which cuts the jaw
on planes of constant y), `lining`, `protrusions` and `paired_profile` all read the frame's y — and
this animal's frame is 42° off, rolled 33°, and interleaves its own tail with its own trunk.

Two routes out, and the recommendation is the first:

1. **Redraw the canonical pose straight**, which is what the pipeline's own rule already asks for:
   step 1b says the canonical pose is the animal "in the rest pose the rig wants (flippers
   half-spread, neck straight, mouth closed)", and a body bent 1.81× along itself is not that. A
   straight pose makes this animal an ordinary build with the shared kit, like every other body in
   the era, and removes 1.81× of bend that the neutral-pose pass (#24) would otherwise have to
   undo. The same redraw is the place to hold the tail at two-thirds, which is the one proportion
   still outside its target.
2. **Write a geodesic builder for it**, as the shore animals have their own kit. The measurements
   above say it would work — the banding is clean once the seeds are declared, and the tail's bend
   is within rig-straightening range — but it is a builder of its own rather than a variation on an
   existing one, because almost nothing in the shared kit reads a geodesic.

What is **not** recommended is building it on the shared kit as it stands. That is what was tried
once, and the numbers above say why it could not have worked.

## Regeneration delivered · 19–20 September 2026

The owner's selected straight-pose route is complete. The updated canonical and single Tripo
input produced a textured body for 30 credits; its measured neutral-axis tail fraction is 0.6323.
The authored model and independent volume twin now ship with one exact 33-joint rig, 24 dynamic
clips, three anchors, LOD and fresh portraits. The game uses the replacement. The viewer offers
**Model: Backup Model**, preserving the original corrected surface on a pose-matched animated rig.

The earlier source files and canonical images remain preserved. The old sources had zero skins
and zero clips; the backup adds the complete action set rather than claiming preexisting animation.
Its curved rest pose differs from the replacement, and its coil/whip range is limited to prevent
skin stretching. The reconstruction does not force the old surface onto a straight axis.

All 24 clips pass dynamic playback and skin checks. Full/twin rig, clips and anchors match exactly.
The posterior throat attachment has zero gap at 61 phases of every clip for full, twin and backup.
Real Chrome viewer swaps load all three bodies with 24 actions and no page errors. The game build,
typecheck, 442 Triassic checks and asset check pass. T3D-01 is finished.

See [the build and validation record](../../tools/triassic/creatures/askeptosaurus/README.md),
[paired audit](../../tools/triassic/creatures/askeptosaurus/paired-audit.json), and
[review images](../../tools/triassic/creatures/askeptosaurus/review/).

## Pose follow-up · 20 September 2026 (T3D-24)

The straight regeneration was the right call and stands. What it left behind is that the straight
*modelling* pose became the pose the animal was seen in: every clip rode on it and every portrait
was shot at it, so the roster card was a needle with four spines and `Idle` carried a quarter of a
degree of tail yaw. The animal's curvature is now authored as **pose, in the clips**, the bind is
untouched, the clip amplitudes and the wave's phase step are re-tuned and measured into
`validation.json`, and the cards are shot from a posed frame. See the builder's README and
`docs/triassic/3d-work-status.md` T3D-24.

The preceding September 15 analysis is retained as the historical diagnosis, not current work.

## The swap · 20 September 2026 (T3D-25)

**The posed generation is the shipped body again, and the straight regeneration is the backup.**
The owner's reading of the two: the regeneration is lumpy, too straight and too flat, while the
preserved generation has the textures and the proportions the subject wants and only its
*positioning* was ever wrong. So the regeneration's contribution stands as a diagnosis — it proved
the shared axial kit could not build the posed body as it was — but the animal that ships is the one
that reads as an animal.

What the September 15 analysis got right and wrong about the posed body, measured again on the
build:

- **The tail's bend was never the blocker, and section 4 said so**: 8.84 mean curvature over
  section is Dinocephalosaurus' tail, which straightened on the rig. It straightens here too, in
  pose, and the trunk's 0.41 tightest — a bend radius smaller than its own section — is the exact
  reason no *mesh* unbending can work there and the rejected one overlapped.
- **The axis was the blocker, and it was fixable.** Section 3 was right that a geodesic banding
  works once the seeds are declared, and half right about why the first one shredded. The seeds were
  declared in the backup build and the banding still lied, because the four **paddles** were left in
  the bands: a paddle sits at much the same geodesic distance from the snout as the flank it grows
  from, so its vertices join the band and drag the median sideways. That axis measured 2.025 against
  a surface the verdict itself measured at 1.578, and its first three tail controls doubled back on
  each other at 68.9° and 89.9°. Excluding the paddles and smoothing once gives 1.612, a monotone
  chain, and a tail fraction of **0.606** rather than 0.562 — against the board's 0.63–0.66 and the
  regeneration's 0.632. The proportion complaint the original audit opened with was, in the end,
  another artefact of a bad axis.

The positioning is fixed in the rest skeleton and the clips and nowhere else: seventy per cent of the
tail's 180.4° of turn is carried into the bind by posing the rig and letting the skin follow its own
weights, and the rest is per-clip, so the animal holds a curve at rest, lays itself out to sprint and
coils back past its own generation. Not one vertex is moved by anything but the weights that already
held it — no remesh, no smoothing, no reshaping, no change to a UV or a texel — which is the whole
reason this body was promoted. Skin 1.34x, second on the roster; the jaw cut closed; every joint
owning skin.

**One thing this swap leaves open, and it is a human's to close.** `docs/triassic/canonical/askeptosaurus.png`
is the straight redraw, and the body that now ships is the generation made from the *previous*
canonical (preserved at `model-inputs/askeptosaurus/backup-2026-09-19/original-canonical.png`). The
pipeline's rule is that a body which no longer matches its pose is the body that is wrong — but here
the owner's judgement is that the pose is what is wrong, so the two are deliberately out of step
until a canonical is drawn in this body's own proportions and greenlit. Nothing downstream reads the
image, and the manifest's `previousCanonical` already names the one this body came from; it is
recorded here so nobody reads the disagreement as an oversight.

See [the build and validation record](../../tools/triassic/creatures/askeptosaurus/README.md) and
`docs/triassic/verification/askeptosaurus-swap-*.png`.
