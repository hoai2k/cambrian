# Archelon

**Off the roster on purpose.** Archelon is Late Cretaceous, not Triassic, and where it belongs is
the open question in [`docs/triassic/05-mesozoic-expansion.md`](../../../../docs/triassic/05-mesozoic-expansion.md)
— widen this game, or build a fourth one. Being on `TRIASSIC_CREATURES` is what puts an animal in
the sea, in the population tables and on the pick screen, so it is listed in
`src/content/triassic/expansion.json` instead. It reaches a match as a **standing visitor**
(`src/content/triassic/guests.ts`, `standingVisitors` in `src/content/visitors.ts`): admitted to all
three games unconditionally rather than earned in one, and gated only on this body having shipped.

## The generation, and what the first attempt taught

The delivered reference (`intake/archelon-3d.jpeg`, added in `24a5996`) is a **six-panel contact
sheet** — frontal, side, dorsal, bottom-up, rear and quarter perspective, each captioned, with grid
lines and borders. Fed to Tripo whole, it produced **six turtles in one GLB**: the generator read
the sheet as a scene containing six animals rather than as six views of one, and gave each about a
sixth of the triangle budget.

That is not a quirk, it is what the pipeline already says. The Tripo input is a *single* view — see
the `inputPrompt` recorded in any `docs/triassic/canonical/model-inputs/<id>/metadata.json`:

> Single clean three-quarter front view from slightly above in a straight neutral symmetric extended
> pose, with paired appendages separated and the entire subject fully framed on flat pale neutral
> studio gray. **No water, scenery, text, labels, borders, cropping, or extra animals.**

The four-view `turnaround.png` that sits beside it is a *human review* artefact and is deliberately
never what Tripo is fed.

So the input here is the sheet's quarter-perspective panel, cropped out on its own, padded back onto
the sheet's own grey (132,132,132) so nothing is cut, and squared to 1024. It is preserved beside the
raw body as `tripo-raw/input.png`. The second generation is one turtle, 11,081 vertices and 19,058
triangles on a single body.

| | first attempt | this one |
|---|---|---|
| input | the whole six-panel sheet | the quarter-perspective panel alone |
| result | six turtles | one |
| triangles | 19,214 across six bodies | 19,058 on one |
| credits | 30 | 30 |

## What it is now

`build.py` rebuilds the pair: the authored Tripo skin and a measured voxel-volume twin on one shared
25-joint rig, 22 clips, three anchors. Everything below is measured by the build and written to
`validation.json`.

| | |
|---|---|
| authored / twin triangles | 20,822 / 7,230 (**0.347**, the contract is under 0.40) |
| joints · max influences | 25 · 4 (mean 3.38) |
| envelope, authored against twin | max **0.023** of 5.00 units (**0.47 %** of body length; the tolerance is 4 %) |
| surface distance, authored to twin | max 0.053, p95 0.017 |
| skin tears (`skin-tears.mjs`) | **3.86x** — between Mixosaurus' 3.62 and Henodus' 4.81 |
| gape proof (`gape-solid.py`) | **PASS at 8 px** of 378,000, tolerance 12 |
| idle bones | every joint owns skin |
| flipper sweep, Sprint | fore 95.7° / 108.2°, hind 51.2° / 57.2° |
| paired-limb asymmetry | mean 0.014, max 0.028 of body length |

## The four things this body made the pipeline say out loud

### 1. The countershading will not read on a turtle, and the roll has to be checked twice

`T.measure_frame` takes the roll from the first circular harmonic of darkness round each station —
dark back, pale belly — and refuses below a strength of 0.30 rather than guessing. Archelon measures
**0.214**: a turtle is mottled over its whole surface, carapace as heavily as flank, so there is
barely a harmonic to find. Ceratites is the precedent for measuring the frame a second way when the
shared one will not commit.

Here the floor is lowered to 0.15 and two independent readings are asserted instead. The harmonic is
*weak, not wrong* — it still points at **89.1°** where dorsal should be 90, a correction of 0.86° —
and geometrically **all four flippers hang below the measured axis while the carapace stands above
it** (rise 0.099 against the plastron's drop 0.088, with the limbs excluded from that measurement
because they would answer it as well as the other one). A frame rolled 180° would put every flipper
on top.

### 2. A body 0.94 wide against 1.00 long breaks the shared centreline

`T.measured_centreline` takes the **median** x and z of each slab's thick vertices, which is right
for a body whose appendages are blades and wrong for the widest thing the pipeline has seen.
Mystriosuchus' corrected two-pass version is used instead — the kit's pass to find the limb clusters,
then the **mid-range of the 4th and 96th percentiles** over everything neither thin nor nearer a
flipper polyline than the rough axis, because a centre is the middle of a section and not the middle
of its vertices.

Measured: the kit's axis wanders **0.046 of a body length in x** and 0.043 in z from the corrected
one. Every limb root is seated by pulling it towards this axis, the skin is banded by arc length
along it, and the test that says which vertices are a limb's measures distance to it, so that is not
a cosmetic error.

### 3. The shell margin is thin, so there are six thin patches and only four are limbs

`T.thin_clusters` returns the four flippers **and the two carapace rims**. Rhaeticosaurus separates
blades from debris by reach, which does not work here: a rim reaches 0.28 from the axis against the
hind flipper's 0.22. The discriminator is **station span**, as on Mystriosuchus — a rim runs 0.47 of
a body along the axis where no flipper runs more than 0.16.

The forelimb is then asserted to be the larger pair (0.48 against 0.22), which is both what a sea
turtle is and a check on which end the head is.

### 4. `depth()` cannot seat anything beside a modelled mouth

This generation *models* its beak slit, and Rhaeticosaurus' hinge-envelope search — shrink until
every probe point reads a positive depth — reported the envelope **outside the body at every size
from 0.17 to 1.00 of its nominal radius and inside below that**. That discontinuity is the slit being
found, not the head being small: `find_nearest` returns the lumen's own wall and the inside/outside
sign it reports is that wall's normal rather than the skull's. Placodus and Henodus both record this
rather than asserting on it. So the probe is recorded in `validation.json`, the oral parts are
asserted against the head's own measured section instead (which uses no normals at all), and what
proves the corner of the mouth is closed is the gape proof.

## The rig

- **The carapace is a rigid part.** `shell` is a bone parented to `body` with no channel written for
  it in any clip; the constant channels forced sampling writes are stripped from the packaged file,
  and `audit.mjs` proves all three files carry none. It owns 2,233 vertices. Placodus' gastral basket
  and Henodus' carapace are the pattern, and the reason it costs nothing is that a bone which never
  moves relative to its parent cannot tear the skin it shares with it.
- **The shoulder girdle is inside the shell**, so `chest` is given no part of the axial wave and no
  part of a turn, and both forelimbs hang off `body` rather than off it. Rooted on `chest` the skin
  tore **5.37x** and `chest` alone dominated four fifths of Sprint's torn edges.
- **The forelimb has four joints and the hind three**, and the radius inside which a vertex is wholly
  the limb's is the **99th** percentile of the cluster's own distances, not the kit's 55th or
  Rhaeticosaurus' 92nd. At the 92nd the blade's outer sixth sat on a partial alpha and the shoulder
  read 5.11x; at the 99th the whole blade is the limb's and the blend band lies on the trunk, where
  the along-limb ramp already holds it down. Each limb's inter-joint blend is **0.13 of its own arc
  length** rather than a constant, so the hind pair's shorter chain scales with it.

## The performance

Underwater flight over a box that cannot bend: two enormous forelimbs in a figure of eight, the hind
pair steering a fifth of a cycle behind them, and an axial chain that carries nothing at all through
the trunk. `Ability` is the power stroke — both forelimbs at once with no phase offset.

`Heavy` is a **crush, not a snatch**. Archelon does not snatch at anything; its heavy attack closes
the beak on an ammonite and bears down, so what separates it from `Attack` is *held time on the
target* rather than reach. Built from the same three ramps with the same numbers the two measured an
identical 0.33 of the clip at full reach — two names for one clip — so `Heavy`'s drive releases at
0.80 of the clip where `Attack`'s falls away from 0.62, and the audit refuses a Heavy that does not
dwell 1.25x longer and bite 1.1x wider.

## Reproducing it

    npm run blender                                     # Blender 5.2.1 to /opt/blender
    /opt/blender/blender -b --factory-startup --python tools/triassic/creatures/archelon/build.py
    node tools/triassic/creatures/archelon/audit.mjs --package --decode
    node tools/triassic/skin-tears.mjs public/assets/triassic/creatures/archelon.glb
    node tools/triassic/idle-bones.mjs public/assets/triassic/creatures/archelon.glb
    /opt/blender/blender -b --factory-startup --python tools/triassic/gape-solid.py -- \
        archelon Bite@0.12 Heavy@0.5 Eat@0.4 Attack@0.4
    /opt/blender/blender -b --factory-startup --python tools/triassic/creatures/archelon/render.py -- --decoded
    python3 tools/triassic/creatures/archelon/contact-sheets.py

The generation is not deterministic, so `run-image-to-model.mjs` produces *a* body rather than *this*
body; the one that shipped is preserved unchanged in `tripo-raw/archelon.raw.glb`.

    node tools/triassic/tripo/run-image-to-model.mjs --name archelon \
        --image tools/triassic/creatures/archelon/tripo-raw/input.png \
        --out local/triassic-authoring/archelon/tripo-single --submit

## Portraits

`render.py --portraits` writes into `portraits/` here rather than into `public/`, because a roster
animal keeps the placeholder card cut from its canonical pose until a human says its model ships.
Archelon has no canonical pose and no placeholder: it is off the roster, and the pick screen draws a
visitor's tile from `assets/triassic/creatures/<id>.<kind>.png`. So the four renders are **copied
into `public/assets/triassic/creatures/`** when the body ships, and `npm run triassic` checks they
are there.
