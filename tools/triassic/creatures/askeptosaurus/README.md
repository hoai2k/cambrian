# Askeptosaurus — two bodies, and which of them is in front

This animal has been generated twice, and `build.py` builds **both**, from one `FRONT` constant:

```python
POSED='posed'          # the preserved generation: curved, organic, `review/backup.jpg`
STRAIGHT='straight'    # the 19 September 2026 regeneration, drawn and generated straight
FRONT=POSED            # <-- the swap is this one line. The other body becomes the backup.
```

Since **T3D-25 the posed generation is the shipped body** and the straight regeneration is the
viewer's `Backup Model`. Nothing else in the file names a position: each body keeps its own axis,
centreline thresholds, mouth frame, jaw cut and resting constants, and `FRONT` decides only which
one gets the procedural twin (which is also its byte-identical LOD1), the public portraits and
`askeptosaurus.json`. Flipping it back is the same one line.

**Checked by flipping it rather than by assertion.** With `FRONT=STRAIGHT` the two builds produce
the straight body as `askeptosaurus.glb` with a 6,246-triangle twin and the posed body as a
single-model `askeptosaurus.backup.glb` — each still on its own axis, its own thresholds and its own
resting constants, because the maps are keyed to the body and not to the position. The shipped
files were restored afterwards and re-hashed against `paired-audit.json`.

Why: the regeneration solved the rigging problem and lost the animal. Its surface is lumpy, its
proportions read flat, and its tail is a straight rod; the preserved generation has the textures and
the proportions the subject actually wants, and everything wrong with it was **positioning** — a
modelling pose with the tail hooked back under the belly. Positioning is what this build fixes, and
it fixes it entirely in the rest skeleton and the clips: **no vertex is moved by anything except the
weights that already held it.** No remesh, no smoothing, no reshaping, no change to a UV or a texel.

| Variant | Triangles | Packed size | Purpose |
| --- | ---: | ---: | --- |
| Full (`askeptosaurus.glb`) | 20,064 | 2,201,816 bytes | The preserved posed generation, rigged and carried |
| Procedural twin / LOD1 | 6,402 | 835,988 bytes | Same rig, clips and anchors; LOD is a byte-identical alias |
| Backup (`askeptosaurus.backup.glb`) | 19,648 | 1,936,284 bytes | The straight regeneration, its own rig and all 24 clips |

## The posed body's own rigging map

**The axis it shipped with was not the animal.** `backup_axis` banded the surface by geodesic
distance from the measured snout landmark and took each band's median — with the four paddles still
in the bands. A paddle sits at much the same geodesic distance from the snout as the flank it grows
from, so its vertices join that band and drag the median out sideways; the polyline zig-zags, and as
it zig-zags it gets longer. Measured both ways:

| | Axis length (raw) | First three tail joints' turn |
| --- | ---: | --- |
| Paddles in the bands (what shipped) | 2.025 | 68.9°, 89.9°, 3.9° |
| Paddles excluded | 1.714 | 14.1°, 3.6°, 13.7° |
| Excluded, one smoothing pass (now) | 1.612 | 23.2°, 2.8°, 10.9° |
| The verdict's own geodesic measurement of the surface | 1.578 | — |

So the shipped backup's first three tail controls doubled back on each other, and its `hindL` limb
radius had inflated to 0.109 against its mirror's 0.052. `geodesic_bands` now runs twice — band once
with everything in, find the four paddles against that axis, band again with their 2,716 vertices
out — and the tail fraction comes out at **0.606** where the contaminated axis said 0.562 (the
straight regeneration measures 0.632; the board asks for 0.63–0.66).

Everything else is as it was: the explicit true-snout landmark (a geometry-only double sweep ends on
a forepaddle on this source), the mouth's own head frame independent of the curled torso, the jaw cut
taken from the source lip, closed throat caps and separate settled palate and floor shells.

## The uncurling

The tail carries **180.4° of turn over twelve controls**, 1.661 arc over its own chord, and hooks
back under the belly. That is the whole reason the body was replaced, and it is answered in two
places, neither of which touches the surface.

**Nothing is unbent in the mesh, and the measurement says it cannot be.** The verdict read the tail
at 8.84 mean curvature over section — Dinocephalosaurus' tail, which straightened on the rig — but
the trunk at **0.41 tightest**, a bend radius *smaller than the section there*. Carrying sections
onto a straight axis through a bend like that must overlap, which is exactly what the rejected
unbending did and why the first attempt at this animal shredded. So the straightening is a rotation
of joints, and the skin follows through the weights it already had.

**`uncurl()` is the operator.** `build_armature` gives every bone the same rest orientation (head at
its own point, tail at head + Y, roll 0), so a pose bone's local frame is the armature's and the
accumulated rotation down a chain is the product of the locals. Asking segment *i* to point at
`t_i` makes the accumulated rotation the minimal arc from the measured direction `d_i` to `t_i` and
the local one `M_(i-1)⁻¹ ∘ A_i`; `t_i` is `d_i` slerped toward a target by `u`, so `u` = 0 is the
generation's own shape and `u` = 1 is dead straight, continuously, every joint sharing the work in
proportion to how far it is bent. No angle is typed anywhere: the chain is the measurement.

**The target is each chain's own first segment, never the trunk's tangent.** The obvious target —
the direction the body runs in where the chain leaves it — makes the first local rotation a rigid
swing of the whole chain, because the root's rotation is exactly the arc from its own direction to
the target: 24.7° on this tail and 44.5° on this neck. Measured as skin, aiming the two chains at
the trunk read **2.62x** on `skin-tears.mjs`; aiming each at its own first segment reads 1.51x.
With its own first segment as the target the root rotation is identity at every value of `open`, so
the tail leaves the body exactly where the generation put it and only the bend after that comes out.

**Seventy per cent of it is carried into the bind.** `loadCreature` in `src/render/creature.ts`
divides a model by the widest horizontal side of its **bind** box and the actor's own length
multiplies that back, so what is drawn is the animal's length times *its posed span over that bind
side*. With the whole straightening left in the clips this body ran **1.38 to 1.56 of its bind**
over five phases of every clip — a swimming Askeptosaurus half as long again as the body the
simulation collides with — where the straight regeneration sits at 0.92 to 0.99. `carry_rest` moves
the rest instead: the armature is posed to `carry`, the deformed positions are written back, and the
bones are re-laid at the heads they were posed to with the same parallel rest orientation, so the
bind is identity again and every clip still composes as a product of world-frame rotations. Only the
tail is carried, so the head, the mouth, its anchors, the jaw cut and both paddle pairs stay exactly
where they were measured; and the builder asserts the re-laid rest is still parallel, because a
bone re-laid head-first keeps whatever roll Blender derived from the intermediate vector and a
rolled rest turns every later yaw into a mixture, silently.

`uncurl` takes the carried fraction as `u0`, so the held-shape table keeps its one meaning — `open`
is how much of the **generation's** curve is out — and a clip asking for less than the carry curls
back toward the generation rather than being unable to. Measured over five phases of every clip:

| carry | Idle | Swim | Sprint | Dive | Rise |
| ---: | --- | --- | --- | --- | --- |
| 0 (all in the clips) | 1.38–1.42 | 1.47–1.54 | 1.51–1.56 | 1.48–1.50 | 1.42–1.45 |
| **0.70 (shipped)** | 0.94–0.96 | 1.00–1.05 | 1.03–1.06 | 1.01–1.02 | 0.96–0.98 |
| 0.82 | 0.90–0.93 | 0.97–1.01 | 1.00–1.02 | 0.98–0.99 | 0.92–0.94 |
| 0.92 | 0.89–0.92 | 0.96–1.00 | 0.99–1.01 | 0.97–1.00 | 0.91–0.93 |

0.70 is the carry that centres the straight-line clips on the bind, with `Idle` just under 1 —
a resting animal holding more of its curve than a swimming one, which is the character the body was
promoted for. `posedExtentOverBind` is now recorded per clip in `validation.json` and asserted on the
straight-line clips; a turn is honestly shorter (`TurnRight`, into the hook, 0.84) and a coil
shorter still (0.56). **The rest turn after the carry is 57.0°**, down from 180.4°: the animal still
holds a curve and can also straighten.

`SCALE` stays 6 as the raw-to-engine factor, but it is **not** this body's length — the carried bind
box measures **8.726** where the straight regeneration's is 6.000 — so every travel figure in
`motion` is divided by the measured bind box instead, which is what the renderer sizes by and the
only divisor that makes the two bodies' numbers comparable. `askeptosaurus.json` reports that as
`modelLength`.

## The held shapes, and the coil

`HOLD` is unchanged from T3D-24 and shared by both bodies — it is the *performance* — with two
columns added that only a body with a curve to spend can use: `open` (how far the tail's own
measured curve is straightened) and `level` (the same for the cervical chain). `Idle` 0.55,
`Swim` 0.78, `Sprint` 0.96, `Guard` 0.30, and the acts pass through `GATHER` 0.26 and `EXTEND` 0.96.

**A coil has no handedness of its own, so it closes into the animal's own curve.** `hook` is the
signed total of the rest tail's joint turns about the rig's dorsoventral axis (−180.4° here, +1 by
definition on a body generated straight, so nothing on that path moves) and it signs the tail
strike and the coil. Against the curve the two cancel: at `Coil`'s peak the residual bend and the
clip's own swing left the tail at 1.10 arc over chord, *straighter* than `Idle`'s 1.12 — the
animal's one curling move was the move that uncurled it. Signed, `Coil` reaches **3.59**.

The 28 % clamp the curved body shipped with — every rotation of `Heavy`, `TailWhip`, `Ability` and
`Coil` scaled down to avoid stretching a skin that was already at its hook — is gone. Those four run
at full amplitude and the builder asserts they do:

| Clip | Tail-tip travel (body lengths) | Tail-chain yaw swept (rad) | Tail arc over chord |
| --- | ---: | ---: | --- |
| Idle | 0.064 | 0.51 | 1.06–1.10 |
| Swim | 0.191 | 1.63 | 1.00–1.05 |
| Sprint | 0.280 | 2.39 | 1.01–1.03 |
| Heavy / TailWhip | 0.681 / 0.682 | 4.13 / 4.15 | 1.01–1.49 |
| Ability / Coil | 0.688 | 3.44 | 1.08–3.59 |

The wave is the straight body's, re-measured on this chain: `WAVE_STEP` 0.40 (twelve controls
lagging by more than that carry over a wavelength and cancel at the tip), travel growing toward the
tip as `.45+.55u^1.2`, and a dorsoventral component a quarter beat behind at 0.26 of the lateral one.

## A body that curls broke `lag.mjs`, and that is fixed centrally

`lag.mjs` separates the jaw cut from the lip along the body's long axis, and took that axis from the
skin's own longest extent. That is the right reading on a body laid out straight and meaningless on
one that curls: this generation spreads furthest across X because its tail hooks back under it while
its head runs along Z, so every lip point projected to within a hundredth of the hinge's station,
the whole seam was taken for the cut, and the mouth opening was reported as **36 rim points open at
1.97 % of a body** — which was the gape. The axis now comes from the **neck**: the first ancestor of
the skull at least a tenth of a body back, and the line from it to the skull, snapped to a cardinal
axis exactly as the extent was. The mouth's own two anchors were the obvious reading and are not
reliable — Cartorhynchus' `anchor_mouth_inside` sits 0.048 *ahead* of its `anchor_mouth`, so
front-minus-back there points at the tail. Checked across the twenty-seven shipped bodies the two
readings agree on twenty-six and differ only on Askeptosaurus.

## Validation

`paired-audit.json` verifies exact full/twin rig, clip, anchor and inverse-bind parity; normalised
weights; finite skinning at 61 phases of every clip; a tail-led gait; closed locomotion mouths; loop
seams; and the backup's clip names, dynamic playback and anchor metadata. The posterior throat cut
has **zero gap** at all 61 phases of all 24 clips on all three variants.

| | Shipped (posed) | Twin | Backup (straight) |
| --- | ---: | ---: | ---: |
| `skin-tears.mjs`, worst skin | **1.34x** | 1.27x | 1.31x |
| Clips over 2x | 0 of 24 | 0 of 24 | 0 of 24 |

1.34x is second on the roster, behind this animal's own other body at 1.31 and ahead of Shonisaurus
at 1.44. The carry is most of why: with the whole straightening in the clips it read 1.51x.

`lag.mjs`: 70 rest-coincident cross-mesh pairs, cut plane 18, **0 open past 0.2 %**, worst 0.00 % of
a body; lip 52, gape 1.3 %. `idle-bones.mjs`: every joint owns skin. `oral-shell-audit.mjs`:
separate closed rigid palate and floor on authored, puppet and LOD. `throat-audit.mjs` and
`hidden-parts.mjs --check` clean. `askeptosaurus-profile.json` records the paired envelope.

## Source preservation

Both sources are immutable and hashed in `backup-source-manifest.json`; `audit.mjs` re-hashes them
on every run. The posed body is built from `askeptosaurus.preview.glb` (sha256
`a57ec311…`), the straight one from `tripo-regenerated-2026-09-19/askeptosaurus.raw.glb` (sha256
`fc074bb6…`). The old canonical/input bundle survives under
`docs/triassic/canonical/model-inputs/askeptosaurus/backup-2026-09-19/`. Neither original source had
a skin or an animation; both rigs and both action sets are this builder's.

## Portraits

`creature_render.run` takes a builder-supplied `portrait_pose`, and this animal names
`('TurnLeft', .2)` — for opposite reasons on its two bodies. The straight regeneration's bind is a
modelling pose, a ramrod needle with four paddles. The posed generation's bind is the pose Tripo
drew it in, and a card shot there is an animal tied in a knot. Both are answered the same way,
because the shape lives in the clips: `TurnLeft`'s held shape is the long C through trunk, neck and
tail, where a three-quarter camera sees the arch over the shoulders, the head brought round toward
the lens and the tail sweeping away. **Early** in the clip on purpose — the held shape is constant
across it and the swing is not. A posed portrait is re-framed on the geometry the armature actually
produced (`posed_points`/`fit_ortho`), because a long animal bent into a curve projects to a
fraction of its own bounding box.

Before and after, and the rest of the swap's evidence: `docs/triassic/verification/askeptosaurus-swap-*.png`.

## Reproduce

From the repository root, with Blender 5.2 and project Node dependencies:

```sh
blender -b --python tools/triassic/creatures/askeptosaurus/build.py              # the body in front
blender -b --python tools/triassic/creatures/askeptosaurus/build.py -- --backup  # the other one
node tools/triassic/creatures/askeptosaurus/audit.mjs --package --decode
blender -b --python tools/triassic/creatures/askeptosaurus/render.py -- --decoded
blender -b --python tools/triassic/creatures/askeptosaurus/render.py -- --decoded --twin
blender -b --python tools/triassic/creatures/askeptosaurus/render.py -- --decoded --portraits
blender -b --python tools/triassic/creatures/askeptosaurus/render.py -- --decoded --twin --portraits
blender -b --python tools/triassic/creatures/askeptosaurus/review-backup.py
blender -b --python tools/triassic/creatures/askeptosaurus/review-swap.py -- --tag after
python3 tools/triassic/creatures/askeptosaurus/swap-sheets.py
python3 tools/triassic/creatures/askeptosaurus/contact-sheets.py
node tools/triassic/creatures/askeptosaurus/review-viewer.mjs   # with Vite on port 4179
node tools/triassic/publish-portraits.mjs
node tools/update-asset-sizes.mjs
node tools/triassic/skin-tears.mjs public/assets/triassic/creatures/askeptosaurus.glb
node tools/triassic/lag.mjs public/assets/triassic/creatures/askeptosaurus.glb
```
