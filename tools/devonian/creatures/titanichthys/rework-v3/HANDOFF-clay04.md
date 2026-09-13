# Titanichthys clay04 — frozen architecture study

Creative owner: Astra high. Executor: Terra medium. This authorizes one build and four fixed renders, followed by root/Astra actual-image review. It does not approve anatomy or further production work.

`PATCH_MAP-clay04.md` records explicit patch ownership. The new head is built from anatomical control boundaries instead of collapsing a longitudinal body profile onto the mouth. Outer lip, mandibular envelope and inner floor share vertices; there is no separate rail. Two cheek windows are bridged into closed sockets. The posterior and caudal scaffold are retained. Paired fins now use local span/chord/normal sections with camber, dihedral and twist. Their plan endpoint reach is retained; their tips are 0.22 units lower in Z, an explicit form-study change.

## Input freeze

CWD: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.

| Absolute source | Bytes | SHA-256 |
| --- | ---: | --- |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/build_clay04.py` | 27531 | `7c5df220934b94b27ed4865feb912722c259c2a18ff0b8e7cee4a3641d78f73e` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/render_clay04.py` | 3565 | `e45c9b6a72b32a7dddfbc7ccb4fd420f483dfa17fae3d20adfa4957f7273c613` |

AST parsing and author-side numerical cage/topology checks passed; see `AUTHOR_CHECKS-clay04.md` for exact scope and limitations. No Blender was run by Astra. Clay01, clay02 and clay03 source hashes were reverified unchanged.

New output directory only:

`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/clay-04/`

It must not already exist. Save command logs beside the candidate directory, not inside it before the builder creates it.

## Group 1 — verify, then construct

```sh
shasum -a 256 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/build_clay04.py /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/render_clay04.py
```

Only after both hashes match the table and the output directory is absent:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/build_clay04.py
```

Expected marker: `TITANICHTHYS_CLAY_BUILD_OK` and the exact clay04 path. Expected files: `titanichthys-clay-04.blend` and `construction.json`. All closed meshes must pass finite-coordinate, nonmanifold-edge and degenerate-face checks. The body includes the lining and sockets; it should have 90,430 vertices and 90,648 faces. There is no separate mandibular rail object in this candidate. Record actual output bytes/hashes and construction results in individual execution state.

Any error is a stop, not authorization to repair source or reuse the output directory.

## Group 2 — four actual views

After successful construction, reverify both source hashes and the saved blend hash against `construction.json`. Then:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b /Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/clay-04/titanichthys-clay-04.blend --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/render_clay04.py
```

Expected: four `TITANICHTHYS_CLAY_VIEW_OK` markers and `TITANICHTHYS_CLAY_RENDER_OK`, plus `render-manifest.json` and four 1440×1080 PNGs:

- `renders/01-side.png`: inset upper oral margin below a short rounded preoral face; fixed substantial cheek; narrow coherent mandibular envelope; continuous armour silhouette and retained posterior.
- `renders/02-front.png`: broad cranial roof, small visible eyes in clean real sockets, coherent mouth corners, and a restrained jaw rather than a separate rail or oversized pouch.
- `renders/04-three-quarter.png`: sculpted roof/cheek/shoulder relationships, no disconnected patch seams, broad proximal fin membranes with taper, camber and twist.
- `renders/08-gape-side.png`: actual space beneath the upper margin, one thin moving mandibular envelope, and a recessed floor with short posterior cheek tissue. Reject any hanging helmet, long triangular outer membrane, detached lip, collapsed socket or thin needle replacing a jaw.

Cameras, framing, lights, exposure, CPU device, two threads and 48 denoised samples match the previous four-view recipe. Temporary gape/camera changes are not saved into the source blend. No additional renders are part of this handoff.

## Stop conditions and return

Stop for changed input hashes, preexisting candidate/render output, unexpected command error, construction failure, missing expected files/markers, or any need to edit geometry, thresholds, lights, cameras or paths. Preserve partial evidence and report the exact error. Terra does not make creative repairs.

After four views, send the parent actual blend/manifest/PNG paths, bytes and hashes. Root and the author inspect those exact images against the user reference and prior failures. No textures, final skeleton/actions, GLBs, LODs, public intake, final eye/general audits, Git or shared checkpoint changes. Preview status remains unchanged until an explicit subsequent decision.
