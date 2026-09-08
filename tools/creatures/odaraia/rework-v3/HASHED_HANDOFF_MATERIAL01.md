# Odaraia material01 frozen handoff — 8 September 2026

Astra author independently accepted coarse clay02 shape/framing only. Read
AUTHOR_REVIEW_CLAY02_MATERIAL01.md for the hash-bound verdict and material gate.
This handoff authorizes ONE Terra-medium Blender material/render command group. It does not
execute the later motion plan. Source and wrapper passed Python syntax checks only.

## Frozen files

Repository: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.
Authoring root: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-authoring/odaraia-rework`.

| File | SHA-256 |
| --- | --- |
| `tools/creatures/odaraia/rework-v3/execute_material01.py` | `fa4f9c9837d39289b05273db49846747e18e0940ae47599984cd61d4bcaf2f99` |
| `tools/creatures/odaraia/rework-v3/material_study01.py` | `c91290a75a03e619598a1de62240deaad34330892576dcf7bf79d12655f7c13e` |
| `tools/creatures/odaraia/rework-v3/AUTHOR_REVIEW_CLAY02_MATERIAL01.md` | `be6a5b11974ad8b7c6a86cf8e56796770a709b8f903c5de21b849cde6f289d52` |
| `tools/creatures/odaraia/rework-v3/ATTACK_EAT_RIG_DIRECTION.md` | `0616cbd5d023193939635d6eb13968eac30d3ef3f648ad51bf231492a72f2221` |
| Authoring `clay02/odaraia-clay02.blend` | `d5ec458053d58f45e5a0def15721485365449d1abee24ad75844fa9d38d9182c` |
| Authoring `clay02/output-manifest.json` | `0222be3b7981649de1aa22028cbc7a00e4d54782f619957449bfcb452cec54a1` |

The wrapper also verifies both preserved user-reference hashes from the earlier clay handoff.

## Exact group

Verify wrapper hash above, then from repository root run:

```sh
python3 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/creatures/odaraia/rework-v3/execute_material01.py
```

It invokes:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/creatures/odaraia/rework-v3/material_study01.py
```

New candidate: authoring `material01/`; log: `material01-execution.log`. Existing paths are
refused. Budget one run, up to 25 minutes. Six Cycles 48-sample 1600×1200 images, editable
`odaraia-material01.blend`, geometry-preservation/material report, byte/hash output manifest.

Stop on any mismatch, existing path, unexpected error, new directory choice, shader/visual
judgment or repair temptation. Return the exact log and partial files to author. Do not change
inputs, opacity, camera, render engine, samples or thresholds, and do not retry automatically.
No rig, actions, GLB, baking, public copying, shared docs or Git commands in this group.

Expected marker: `ODARAIA_MATERIAL01_GEOMETRY_PRESERVED; SIX_VIEWS_RENDERED; ASTRA_REVIEW_REQUIRED`.
Return command/exit/elapsed time, log, manifest and all six actual images. Geometry hash equality
is a source-preservation check, not visual approval or proof of correct game transparency.
Author must inspect all six against the material gate before freezing another phase.
