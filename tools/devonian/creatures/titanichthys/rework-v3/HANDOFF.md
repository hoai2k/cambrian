# Frozen clay-01 execution handoff

Owner: Astra high. Executor: Terra medium. Phase: new clay construction and fixed multiview rendering only. This handoff does not approve a model or authorize integration. No old model is read by either script.

## Verify before running

All commands use CWD `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.

| Input | SHA-256 |
| --- | --- |
| `tools/devonian/creatures/titanichthys/rework-v3/build_clay.py` | `6d242a9542b5be441474515ad5ca4bf926baf0cb330fd9ebe9b2d6b0d2b63673` |
| `tools/devonian/creatures/titanichthys/rework-v3/render_clay.py` | `746b7a2c0f62fe8286f1769a2fad3292d727b01dbe19019a705a1354ef7b696b` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/user-reference/titanichthys-user-reference-2026-09-07.webp` | `36e15fd7b077975150b0bed164a66c8a188d37ed3e5774dbe3a53ac4014a5932` |

The reference is a visual authorship input; the script deliberately does not read or embed it. The output folder must not already exist:

`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/clay-01/`

Python AST parsing passed for both scripts. Blender has not been run by Astra. There is no rendered or numerical geometry approval yet.

## Command group 1 — construction

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/build_clay.py
```

Expected terminal marker: `TITANICHTHYS_CLAY_BUILD_OK` followed by the exact output folder. Outputs are `titanichthys-clay-01.blend` and `construction.json` inside that folder. The report binds the builder and saved blend hashes, records object topology and design landmarks, and labels the clay unreviewed. The body and closed fins must pass finite-coordinate, nonmanifold-edge and degenerate-face checks. The small iris caps intentionally have boundary edges against the globe. The report is a basic construction check, not an eye-volume or final attachment audit.

Record terminal output, elapsed duration, file bytes and SHA-256 hashes in the individual state. If saving a separate execution log, put it under the local `titanichthys/rework-v3/` directory, outside the not-yet-created `clay-01/` folder. Do not pre-create `clay-01/`, because that intentionally invalidates the command.

## Command group 2 — fixed multiview rendering

After successful construction, verify the two source hashes again, then run:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b /Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/clay-01/titanichthys-clay-01.blend --threads 2 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/render_clay.py
```

Expected terminal markers: eight `TITANICHTHYS_CLAY_VIEW_OK` messages and one `TITANICHTHYS_CLAY_RENDER_OK`. The script verifies the exact blend and builder before rendering. It writes these 1440×1080 PNGs under `clay-01/renders/`, using CPU Cycles, two threads and 48 denoised samples:

1. `01-side.png` — full left side, orthographic.
2. `02-front.png` — front proportions, mouth and paired roots.
3. `03-dorsal.png` — cranial width/length, fin sweep and posterior.
4. `04-three-quarter.png` — connected mass and plate planes.
5. `05-ventral-oblique.png` — throat, belly and fin insertion.
6. `06-head-sculpt.png` — cheek, small eye, cranial/thoracic transition.
7. `07-oral-front.png` — wide gape with explicit inspection fill.
8. `08-gape-side.png` — hinge/commissure shape study.

`clay-01/render-manifest.json` binds the source, recipe and every PNG hash, camera, gape state and inspection light. Gape/camera changes are temporary and are never saved into the source blend. No GLB, portrait, LOD, atlas, action or public file is produced. Do not package or run a generic old-model audit.

## Stop conditions and return

Stop immediately for an input hash mismatch, preexisting candidate/render directory, unexpected Blender error, topology failure, missing output/marker, or any need to choose geometry, cameras, thresholds, lighting, materials or a new candidate path. Never edit the script to make an execution check pass. Keep partial output and the exact error; Astra chooses the next version or repair.

After the eight views finish, stop for Astra's actual image review. Return compact output paths, sizes/hashes and terminal markers to the parent. The decision is not delegated to Terra. Astra must judge the side/front depth, dorsal broad roof, oral continuity, new eye embedding, cheek/hinge character, fin emergence and substantial posterior in the generated images. The relevant creative acceptance criteria are in `ANATOMICAL_BRIEF.md`.

Resource boundary: one construction command and one eight-view render command; two CPU threads. No further work without a new creative handoff. Public status remains preview.
