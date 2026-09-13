# Coccosteus material-04 — focused dermal finish handoff

Astra high has reviewed all seven actual material-03 images and authored this frozen source.
Parent assigns Terra medium to execute the two groups below. Material-04 is source-ready,
not rendered or approved. Preserve every previous candidate and backup. No public/shared/Git
edits, creative substitutions, camera edits, rig work, baking or packaging are authorized here.

## Frozen inputs

Verify all five hashes before each group; a mismatch stops execution.

| Absolute input | SHA-256 |
| --- | --- |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/materials-04.py` | `cb1b0338f825a014aacfebfb21b3eeb8ae5392a2d584b9e92ad934886290e102` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/material-views-04.json` | `6899a98892eac311e79cab2c991ae3a22f6d5e59e6c571015e5e2d09b29303da` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/materials-03.py` | `43a7045aa0e880615a413335ff99eea04f04f13cb3ecb7deaad4408eda846896` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/material-03/coccosteus-material-03.blend` | `e936eaf3284147d8906c9319652670138f9646436d10b229807e0e9251682a00` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/material-03/material-report.json` | `894dc335cb2c7d50fdf8a5ca661a5e0bdc5e0fd1f9ab69235a403c7e45ec76ca` |

The prior source is imported only for frozen utility functions; its preparation/render entry
points are never invoked. Existing maps and geometry come directly from the material-03 blend.
No prior layout/map regeneration occurs. CWD for both commands:
`/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.

## Group 1 — prepare the new material candidate

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/materials-04.py -- --stage prepare
```

Expected: exit zero and `COCCOSTEUS_MATERIAL_04_PREPARE_COMPLETE`.
Exclusive output directory:
`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/material-04`.
Expected files: `coccosteus-material-04.blend` and `material-report.json`.
Record exact command, Blender version, elapsed time, bytes and SHA-256 for source/output files
in WORKING_STATE.md. No rerun after success; existing blend/report files stop preparation.

Report requirements:

- `geometry.before == geometry.after == ccd280fa50009e96d5a40f9334a25fe155178880b3ae8ee60eef6dd676ea8f00`.
- `geometry.oralBefore == geometry.oralAfter == cf732fa3dd277a54ffb686f1d2c60cc28fa214edd2a7bcb0f39fe6d6d1c44fe3`.
- `retainedSurface.before == retainedSurface.after`; ten original images are listed (eight
  pigment/ray images plus both existing plate-response images).
- `plateAttributes.before == plateAttributes.after` for PlateUV/PlateHead/PlateStrength.
- `shaderPatch.replacedLinks` has exactly two entries; all three retained-branch flags are true.
  The script asserts every original node survives and that new connections enter old nodes
  only at the selected plate-colour and plate-roughness inputs. It does not edit old settings.
- `notApproved` remains true, and the report's new blend/script/views/helper hashes match disk.

Verify the source material-03 blend hash again after preparation. Geometry, shape keys, oral
passage, eyes, fins, posterior material branch, normal branches and plate response are retained.
Only a copied outer-body material gets added fine pigment/roughness before the old suture mix.

## Group 2 — seven fixed comparison views

Verify all five inputs and the Group 1 blend/report hashes recorded in state, then run:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/materials-04.py -- --stage render
```

Expected: exit zero and `COCCOSTEUS_MATERIAL_04_RENDER_COMPLETE`. CPU Cycles, two threads,
48 samples, fixed seed 71204, 1280x960. Same source lights and all seven material-03 cameras.
New outputs: `side.png`, `front.png`, `dorsal.png`, `oblique.png`, `mouth-open.png`,
`armour-material-close.png`, `armour-clay-close.png`, and complete `render-manifest.json`.
Neutral-clay override is render-only and is not saved to the candidate blend.

Record the group in WORKING_STATE.md, verify all manifest image hashes/bytes and the seven
view names, and return actual PNG paths plus blend/report/manifest hashes to Astra. Success
does not imply material approval. All interpretation belongs to Astra's actual image review.

## Acceptance, resource bound and stops

See review-material03-plan-material04.md for the actual prior verdict and authored ranges.
At whole-body scale, plate hierarchy must still lead. At close range, expect quiet irregular
pigment and roughness variation, with no bright dots, broad clouds, rocky cells or disappearing
sutures. The actual neutral clay view, mouth, eyes, posterior bars and fin rays must retain
their prior appearance. No rig until Astra explicitly accepts actual material evidence.

Source-only AST/JSON, previous seven evidence hashes and analytical signal bounds passed;
record: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/material-04-static-report.json`.
No Blender/API validation or new visual acceptance has occurred.

Budget: 20 minutes preparation, 25 minutes rendering; one group per state entry. Stop and
return exact evidence on timeout, input mismatch, unexpected API/source error, failed digest,
existing output, absent image or incomplete manifest. Do not fix source, thresholds, shaders,
metadata, selector or cameras. Preserve failures for Astra. End after the frozen seven renders;
no bake, GLB, rig, actions, audits, public integration, shared documents or Git work.
