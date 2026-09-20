# Askeptosaurus: what is actually wrong with it, measured

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

## Regeneration in progress · 19 September 2026

The owner requested a new canonical and Tripo generation, retaining the previous body as
**Model: Backup Model** with its corrections and animations. The new canonical and single
Tripo input are byte-identical studio images: a straight axis, closed mouth, separated limbs,
a visible neck, and a projected tail fraction around 0.64. The four-view sheet is only a
qualitative review aid; the single image is the submission authority.

All previous canonical/model-input files are preserved in
`canonical/model-inputs/askeptosaurus/backup-2026-09-19/`. The original raw GLB and corrected
preview remain untouched at their existing paths; their hashes and actual animation state
are recorded in `tools/triassic/creatures/askeptosaurus/backup-source-manifest.json`. They
currently contain **zero skins and zero animation clips**. A final animated backup therefore
requires new rigging of the preserved corrected surface, not merely relabeling the raw preview.

The reviewed request is ready to run from the repository root (requires `TRIPO_API_KEY`):

```sh
node tools/triassic/tripo/run-image-to-model.mjs --name askeptosaurus --image docs/triassic/canonical/model-inputs/askeptosaurus/input.png --out tools/triassic/creatures/askeptosaurus/tripo-regenerated-2026-09-19 --submit
```

The new output directory prevents overwriting or resuming the previous generation. Its
`request-dry-run.json` records the exact image digest and textured v3.1 request. The canonical
change is authorized by the owner's regeneration instruction; it is not marked delivered.
T3D-01 remains active until the replacement, animated backup, authored/puppet parity, portraits,
LOD, anchors and runtime integration have actually passed review.
