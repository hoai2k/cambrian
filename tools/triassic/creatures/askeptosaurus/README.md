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
