# Askeptosaurus — delivered replacement and animated backup

The owner's regeneration request is complete. The new canonical supplied a straight, closed-mouth,
four-paddle thalattosaur with a distinct neck and a long laterally compressed tail. The new Tripo
body measures **63.23% tail** along its neutral axis. Its authored skin and independently resurfaced
volume twin share the exact 33-joint rest skeleton, inverse binds, 24 clips and three anchors.
The game now resolves Askeptosaurus to its own model; the viewer also offers **Model: Backup Model**.

| Variant | Triangles | Packed size | Purpose |
| --- | ---: | ---: | --- |
| Full | 19,648 | 1,844,324 bytes | Regenerated textured body |
| Procedural twin / LOD1 | 6,246 | 741,792 bytes | Same rig, clips and anchors; LOD is a byte-identical alias |
| Backup | 20,064 | See `paired-audit.json` | Original corrected surface, pose-matched rig and all 24 public clips |

## Source preservation

The old canonical/input bundle survives under
`docs/triassic/canonical/model-inputs/askeptosaurus/backup-2026-09-19/`.
`tripo-raw/askeptosaurus.raw.glb` and `askeptosaurus.preview.glb` are unchanged; hashes are in
`backup-source-manifest.json`. The former public preview was a duplicate of the preserved tools
source and is retired from publication once the replacement ships. Neither original source had a
skin or animation. The backup therefore adds the complete rig and actions to the preserved
corrected surface instead of claiming to retain nonexistent clips.

The replacement raw source lives separately in `tripo-regenerated-2026-09-19/`, with safe request
and response metadata. Tripo charged 30 credits. Its SHA-256 is
`fc074bb6df131052de8bd258909d1a876b90ae5400c73713f33b47159db24747`.
The canonical image and single model input are byte-identical; the four-view sheet is a review aid.

## Rig and mouth

Twelve tail controls create the main swimming wave. Four neck controls keep the head steady;
three joints per paddle row rather than spin. Heavy/TailWhip strike with the tail; Ability/Coil
curl and recover; Bite/Attack open and close the jaw; Grab maintains its hold. World steering stays
in the simulation. No root animation or scale tracks are authored.

The backup retains its original strongly curved rest geometry and has its own pose-matched
skeleton. It shares clip names and meanings, not rest coordinates or animation samples. Its strongest
coil and whip rotations are limited to 28% of the new straight body's range to avoid stretching
the curved skin. No geodesic section-carry unbending is used. The explicit true-snout landmark in
`backup_axis` is essential: a geometry-only double sweep selected a paddle on this source.

The lower jaw is cut from the actual source lip and separately skinned. Posterior duplicate cut
vertices reuse body skin weights exactly, blending to the jaw forward of the hinge. Both sides
have closed throat caps. Palate and floor are separate settled shells; the existing runtime
hidden-by-default oral-geometry setting is unchanged.

## Resting shape and clip amplitudes (T3D-24)

T3D-01 regenerated this animal **straight** so that its over-curved tail could be rigged at all,
and the straight bind pose stays: it is what every clip is authored from, what the roster matrix
proves (`basePose.closedRestJaw`, identity rest jaw) and what `lag.mjs` measures the jaw cut
against. What was missing is that nothing ever put the animal's *shape* back, so the body read as a
needle — in every clip, and, because portraits are shot at the bind pose, on the roster card.
`Idle` carried a tail amplitude of **0.008 rad**, a quarter of a degree, in yaw alone.

The shape is now in the **clips**, never in the bind (`restpose()` in `build.py`): a dorsal arch
through the shoulders and four cervicals with the skull levelling off again, a tail that falls away
instead of standing out straight behind, a standing lateral bow through the middle of the tail, a
lateral lean through trunk, neck and tail, and paddles set off the flank rather than square to it.

**Every clip is posed for what that clip is doing.** One resting curve stamped under all twenty-four
as a constant offset is the same mistake as no curve at all, one step along — an idling animal holds
itself differently from one turning, diving, rising, feeding, bracing or dead, and on a body that is
two thirds tail that difference has to run through the whole length rather than being a tail waggle
on a straight trunk. `HOLD` names a **held shape** per clip as multipliers on the resting constants,
so `Idle` is what everything else is a departure from and each row reads as what it changes:

| Clip | Held shape | Trunk arch (rad) | Tail fall (rad) | Trunk lean (rad) |
| --- | --- | ---: | ---: | ---: |
| Idle | the relaxed hold | 0.114 | −0.348 | 0 |
| Swim | straighter, paddles laid back | 0.074 | −0.278 | 0 |
| Sprint | laid out along the axis | 0.023 | −0.209 | 0 |
| Guard | gathered over a humped shoulder | 0.180 | −0.452 | 0 |
| Eat | reaching down over the food | −0.076 | −0.435 | 0 |
| Grab | braced, neck level, tail stiff | 0.106 | −0.400 | 0 |
| TurnLeft / TurnRight | one long C through the whole animal | 0.094 | −0.296 | ±0.468 |
| Dive | nose down, tail carried high behind | 0.123 | −0.104 | 0 |
| Rise | head up, tail swept low | 0.122 | −0.522 | 0 |

The acts move *through* a shape rather than holding one: an attack gathers (`GATHER`) and then
extends through the whole body (`EXTEND`) — a strike that moves the head on a still trunk is the
same fault one clip along — the tail strikes brace against their own swing, a hit recoils, a dash
streaks, and death goes slack. `heldShape` in `validation.json` records the resolved shape at the
start, middle and end of every clip, in multipliers and in absolute radians, and `build.py` asserts
that the ten named holds are pairwise distinct and that each act's shape actually changes across it.
Renders: `docs/triassic/verification/askeptosaurus-pose-holds-side.png` and `-holds-top.png`.

The preserved backup gets none of it and none of the raised amplitudes — its own geometry is still the curved generation, its skeleton is pose-matched
to that curve and its performance is a preserved artefact — so nothing on the `--backup` path moved:
`askeptosaurus.backup.glb` is byte for byte the file that shipped, re-packaged by `audit.mjs
--package` without a single sample changing, still loading its 24 clips and still reading 1.74x on
`skin-tears.mjs`.

The wave was the other half, and the **phase step mattered more than the amplitude**. Twelve tail
controls lagging by `WAVE_STEP` carry `12*WAVE_STEP` radians of wave; at the .62 a first pass
reached for that is more than a whole wavelength on the tail and the joints' contributions to the
tip cancel — the same amplitude that reads as a swimming animal at .40 moves the tail tip 1.1 % of
a body at .62. `WAVE_STEP` is .40, the travel grows toward the tip (`.45+.55u^1.2`), and a
dorsoventral component a quarter beat behind the lateral one (`WAVE_VERT` .26) takes the tip round
a flattened ellipse; lateral stays the larger by about four to one, which is what a thalattosaur
swims with.

`measure()` reads the result back off the keyed actions — peak-to-peak rotation per joint, and how
far a point at the far end of a joint actually gets, in body lengths — and writes it as `motion` in
`validation.json`, with floors asserted in the builder so the original fault cannot come back.

| Clip | Tail-tip travel (body lengths) | Tail-chain yaw swept (rad) | Was |
| --- | ---: | ---: | ---: |
| Idle | 0.054 | 0.51 | 0.008 |
| Swim | 0.188 | 1.63 | 0.074 |
| Sprint | 0.274 | 2.39 | 0.117 |
| TurnLeft | 0.273 | 0.67 | — |

Skin is 1.10x → **1.31x**, still the best on the roster (next is Shonisaurus at 1.44x); the worst
edge is three instances on `body` in `Sprint`, 0.070 → 0.092, which is 0.37 % of a body length. The
backup is unchanged at 1.74x. `lag.mjs` still reports 0 pairs open past 0.2 % and a
worst separation of 0.00 % of a body, and `idle-bones`, `oral-shell-audit`, `throat-audit` and
`hidden-parts --check` are clean.

## Portraits

`creature_render.run` now takes a builder-supplied `portrait_pose`, defaulting to the `('Idle', 0)`
every other shipped portrait in the roster was rendered from — naming nothing changes nothing, which
was checked by re-rendering Hupehsuchus' four portraits and its puppet view with the modified
pipeline and with the pipeline from `main`: the two agree to 5 pixels of CYCLES sampling noise at a
maximum channel difference of 1, and each differs from the shipped file by the same 1,623–1,624
pixels at a maximum of 26, which is this machine against the machine that rendered them.

Askeptosaurus names `('TurnLeft', .2)`, where a three-quarter camera sees the most of the animal:
the arch over the shoulders, the head brought round toward the lens and the tail sweeping away in a
broad curve — the reading the preserved generation had (`review/backup.jpg`). **Early** in the clip
on purpose: the held shape is constant across it and the swing is not, so at 0.20 s the card is
mostly the hold, and by 0.50 s the tail has curled back over the animal into a hook. A posed portrait is re-framed
on the geometry the armature actually produced (`posed_points`/`fit_ortho` in `_pipeline/review.py`),
because a long thin animal bent into a curve projects to a fraction of its own bounding box and a
card framed on that box is mostly empty. Before and after:
`docs/triassic/verification/askeptosaurus-pose-*.png`.

Rebuilt on Linux, this builder reports the same 19,648 and 6,246 triangles as the shipped files but
11,171 rather than 11,236 exported vertices; the **unmodified** builder from `main` reproduces
11,171 here too, so that is this machine's export splitting rather than anything this change did.

## Validation

`paired-audit.json` verifies exact full/twin rig, clip, anchor and inverse-bind parity; normalized
weights; finite skinning at 61 phases of every clip; dynamic tail-led gait; closed locomotion mouths;
loop seams; and backup clip names, dynamic playback and anchor metadata. The posterior throat cut
has **zero gap** at all 61 phases of all 24 clips on all three variants.

`skin-tears.mjs` reports **0 of 24 clips over 2x skin stretch** for both the full body (worst 1.10x)
and the backup (worst 1.74x), using its 1.5%-body-length edge floor. `askeptosaurus-profile.json`
records 0.03687 maximum paired envelope difference at body length 6, surface-distance P95 0.00667.
Decoded full/twin views, action phases, mouth closeups and preserved-pose backup were visually
reviewed; contact sheets are in `review/`. `viewer-review.json` records real Chrome full/backup/twin
loading, 24 clips each, working backup Swim playback and zero page errors. Fresh public portraits
are rendered from the replacement.

The integration checks pass: `npm run typecheck`, `npm run build`, `npm run triassic` (442 checks)
and `npm run check` (0 errors/warnings). The pending initial-model flag is cleared under the owner's
explicit instruction to integrate the finished model, backed by these reviews; this does not claim
a separate human visual signoff.

## Reproduce

From the repository root, with Blender 5.2 and project Node dependencies:

```sh
blender -b --python tools/triassic/creatures/askeptosaurus/build.py
blender -b --python tools/triassic/creatures/askeptosaurus/build.py -- --backup
node tools/triassic/creatures/askeptosaurus/audit.mjs --package --decode
blender -b --python tools/triassic/creatures/askeptosaurus/render.py -- --decoded
blender -b --python tools/triassic/creatures/askeptosaurus/render.py -- --decoded --twin
blender -b --python tools/triassic/creatures/askeptosaurus/render.py -- --decoded --portraits
blender -b --python tools/triassic/creatures/askeptosaurus/review-backup.py
node tools/triassic/creatures/askeptosaurus/review-viewer.mjs # with Vite on port 4179
node tools/triassic/publish-portraits.mjs
node tools/update-asset-sizes.mjs
node tools/triassic/skin-tears.mjs public/assets/triassic/creatures/askeptosaurus.glb
node tools/triassic/skin-tears.mjs public/assets/triassic/creatures/askeptosaurus.backup.glb
```
