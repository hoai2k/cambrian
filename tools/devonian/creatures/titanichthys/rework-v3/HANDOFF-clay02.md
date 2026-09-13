# Titanichthys clay-02 — frozen secondary sculpt handoff

Creative owner: Astra high. Executor: Terra medium. Clay-01 is rejected for completed form and preserved unchanged. `visual-review.md` records all eight inspected views and their hash-bound evidence. This handoff approves execution only, followed by a four-view creative review.

## Input freeze

CWD: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.

| Source | Bytes | SHA-256 |
| --- | ---: | --- |
| `tools/devonian/creatures/titanichthys/rework-v3/build_clay02.py` | 24683 | `a4142814eb10db533eef2063fb4bfdca147860020a988ab6dedbe3edf1de7955` |
| `tools/devonian/creatures/titanichthys/rework-v3/render_clay02.py` | 3371 | `4103d297e3e1aab58924e79f194b716b5026863ca025a38941bfd0d9cffd2a8f` |

Both pass Python AST parsing. The two original clay-01 script hashes were rechecked and are unchanged. No Blender construction or rendering has been run by Astra. The preserved user reference remains `36e15fd7b077975150b0bed164a66c8a188d37ed3e5774dbe3a53ac4014a5932` and is not embedded or redistributed.

New output directory, which must not already exist:

`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/clay-02/`

## Construction, then four renders

Verify input hashes, then run this command group:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/build_clay02.py
```

Expected: `TITANICHTHYS_CLAY_BUILD_OK` and the exact clay-02 output path; `titanichthys-clay-02.blend` plus `construction.json`. Report finite geometry and zero nonmanifold/degenerate faces for closed meshes, with builder/blend hashes. Record output bytes and hashes. A saved log belongs under local `rework-v3/`, outside the candidate folder until the script creates it.

Only after successful construction and rechecking frozen input hashes:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b /Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/clay-02/titanichthys-clay-02.blend --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/render_clay02.py
```

Expected: four `TITANICHTHYS_CLAY_VIEW_OK` markers and `TITANICHTHYS_CLAY_RENDER_OK`. Outputs are `render-manifest.json` and four 1440×1080 PNGs under `clay-02/renders/`:

- `01-side.png`: nearly closed rest mouth, thinner lower jaw, slope/planes of head, shoulder, smooth posterior and new fin profile.
- `02-front.png`: rest mouth is a small slit, with a sculpted cranial roof/cheek structure rather than an annular bowl.
- `04-three-quarter.png`: integrated plate-scale planes, jaw/commissure architecture, broad fin-root mass and curved swept membranes.
- `08-gape-side.png`: independent lower-jaw depression and attached commissure, with an actual space between the jaws and no stretched tall ventral wall.

Camera positions and framing match those clay-01 views. Exposure is intentionally reduced from +0.55 to −0.35 and fill lowered, because the earlier clay illumination obscured shape. Every other lighting/camera decision is frozen in the new source. CPU Cycles uses two threads and 48 denoised samples. No additional renders are authorized by this command group.

## Structural changes being judged

The mouth boundary now sweeps posteriorly to the hinge rather than forming a planar oval. Its neutral gap is small and the ventral anterior envelope is slender. The oral passage stays broad behind the jaw before a downward bend; the tiny early pharyngeal funnel is gone. The cranium slopes from its broad roof to the snout, with explicit plate-scale planes, cheek hollow, hinge recess and embedded quiet eyes. Thoracic planes and shoulder mass distinguish armour from the flexible posterior. Periodic body corrugations and radial membrane relief are removed. Pectorals have thicker roots, a curved sweep, membrane camber, and a single controlled distal cap; the old chord-dependent tip hook cannot recur through the same construction.

These are source decisions awaiting evidence, not claims that the new clay already succeeds. The fossil constraints and reconstruction uncertainties remain those in `ANATOMICAL_BRIEF.md`: broad short shield, small eyes and slender edentulous jaws; complete body, fins, tail, exact plate arrangement and soft tissues remain interpretations. No teeth, blades or filtering apparatus are added.

## Stop conditions

Stop for a source/hash mismatch, preexisting candidate/render directory, unexpected command error, construction validation failure, missing required outputs/markers, or any need to alter source geometry, thresholds, materials, lighting, views or paths. Preserve all partial evidence and return to Astra. Do not overwrite/retry into the candidate folder or make creative repairs.

After four views, stop and send the parent the manifest, blend and PNG paths/hashes. Astra must compare their actual forms to the user reference and clay-01. Do not proceed to full rig/actions, fine textures, exports, LODs, portraits, public integration or general audits. Preview status remains unchanged.
