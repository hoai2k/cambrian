# Titanichthys clay03 — frozen four-view execution handoff

Creative owner: Astra high. Executor: Terra medium. Execution only is authorized. Preserve clay01 and clay02 and all public assets. Review logic is in `DESIGN-clay03.md`; this is an unreviewed source candidate.

## Frozen inputs

CWD: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.

| Absolute input | Bytes | SHA-256 |
| --- | ---: | --- |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/build_clay03.py` | 23925 | `97cc8492542755849f4fba27bb895aef6679dd973994791de1b1a30ff5fd2e87` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/render_clay03.py` | 3565 | `9427fd6ba4a4a2bc04323020d3fa366e214202fe2d20019f305e089a298b7d81` |

Both sources passed Python AST parsing. A separate pure-Python analytical profile check sampled 5001 longitudinal stations and found finite coordinates, positive half-width and positive body height. This does not replace Blender construction checks or actual render review. All four frozen clay01/02 source hashes were verified unchanged. Astra has not run Blender.

New output only: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/clay-03/`. The candidate directory must not already exist. Save logs alongside this directory, not inside it before construction.

## Group 1 — verify and build

Verify both source hashes before running:

```sh
shasum -a 256 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/build_clay03.py /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/render_clay03.py
```

If and only if they match the frozen table and the output directory is absent:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/build_clay03.py
```

Expected: `TITANICHTHYS_CLAY_BUILD_OK` and the exact clay03 output path, `titanichthys-clay-03.blend`, and `construction.json`. All closed meshes must be finite with zero nonmanifold edges and degenerate faces. The new mandibular arch must be present as a separate closed mesh. Record actual bytes/hashes and construction output in the individual execution state. Stop on failure; do not edit or retry into the candidate directory.

## Group 2 — four actual renders

After successful build, recheck both frozen source hashes and confirm the construction report's blend hash matches the saved blend. Then:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b /Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/clay-03/titanichthys-clay-03.blend --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/render_clay03.py
```

Expected: four `TITANICHTHYS_CLAY_VIEW_OK` markers, then `TITANICHTHYS_CLAY_RENDER_OK`, `render-manifest.json`, and these 1440×1080 PNGs:

- `renders/01-side.png`: continuous armour silhouette, blunt preoral roof, resting mouth, retained posterior and fin outlines.
- `renders/02-front.png`: broad smooth head, small recessed eyes, clean commissures and lower margin; no collar or stacked lip artifact.
- `renders/04-three-quarter.png`: curved armour, quiet shallow sutures, organic cheek/root transitions and tapered membranes.
- `renders/08-gape-side.png`: the narrow jaw rail independently depresses while the soft floor unfolds toward the fixed throat. No rigid triangular jaw board, disconnected margin or tissue intersection.

Cycles CPU, two threads, 48 samples. Camera positions, framing, lights and exposure match clay02. Both body-floor and mandibular-arch shape keys must participate in the gape view; the renderer sets both. It does not save camera/gape mutations into the source blend.

## Stop and return

Stop on hash mismatch, preexisting output/render directory, unexpected command error, construction failure, missing outputs/markers, or any need to change source, paths, thresholds, lights or views. Preserve partial evidence. Record exact errors and return to Astra/root; the executor makes no creative repair.

After these four renders, return manifest/blend/PNG paths, bytes and hashes. Root and the author must inspect the actual images and issue an explicit hash-bound review. No further views, textures, final rig/actions, exports, LODs, eye/general final audits, public integration, shared checkpoint edits or Git actions are part of this handoff. Remain preview.
