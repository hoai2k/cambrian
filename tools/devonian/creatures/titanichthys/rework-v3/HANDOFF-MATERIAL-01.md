# Titanichthys material01 — frozen regional PBR study

Creative owner: Astra high. Executor: Terra medium. Root authorized progression after coarse-form review. `COARSE_FORM_APPROVAL-clay04.md` approves only the exact clay04 coarse form; all final eye/general, rig/action and export/intake reviews remain outstanding.

`MATERIAL_DESIGN-01.md` is the artistic contract: blue/slate armour fields tied to the accepted cage and existing sutures, related flexible posterior, subdued warm ventral/oral tissues, full tapered fins with quiet locally directed ray relief and dark optical eyes. All pigment and fine texture are original procedural authorship, not reference-image pixels or old Titanichthys materials. No vertex displacement or new geometry.

## Frozen inputs

CWD: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.

| Absolute input | Bytes where relevant | SHA-256 |
| --- | ---: | --- |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/clay-04/titanichthys-clay-04.blend` | — | `69ad4e7d1daa7aec64835a198c9b13c4a017cf4aa441cd2e58ae9a4207c404ec` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/clay-04/oral-inspection-01/manifest.json` | — | `83f79de58ed6aee72cfb113a83091101b6f4299d32745f944bf6e5cf492e4503` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/build_clay04.py` | 27531 | `7c5df220934b94b27ed4865feb912722c259c2a18ff0b8e7cee4a3641d78f73e` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/materials_01.py` | 24593 | `cbc010cc676f358e736165c5ace3e23e6c5d48f2d647c8545f18baa82ad6386b` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/render_material_01.py` | 5305 | `5afbafe35231311454aef2067ba8b61168be128dc2052f2ef8db9e1b2421bf29` |

Both new scripts pass AST parsing. Source-side checks verified the exact outer-cage and paired-fin attribute correspondence and absence of modelling/export operations. All three frozen clay04 sources remain unchanged. Astra did not execute Blender.

New output directory, which must not already exist:

`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/material-01/`

Save execution logs alongside this directory before the script creates it. Preserve all old candidates and the source blend.

## Group 1 — verify inputs, author UVs/materials and bake

After every input hash above matches and the new output directory is absent:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b /Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/clay-04/titanichthys-clay-04.blend --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/materials_01.py
```

Expected: eighteen `TITANICHTHYS_MATERIAL_BAKE_OK` markers, then `TITANICHTHYS_MATERIAL_BUILD_OK`. The source loads the exact approved coarse mesh, adds anatomical attributes, creates editable procedural PBR materials, unwraps dedicated bake UVs, and bakes albedo, roughness and tangent-space normal maps with CPU Cycles and two threads. It fingerprints vertex coordinates, polygon connectivity, all shape-key coordinates and object transforms before and after; those must remain unchanged.

Expected outputs:

- `titanichthys-procedural-material-01.blend`: editable regional source saved before bake.
- `titanichthys-material-01.blend`: baked PBR study with embedded maps.
- `material-report.json`: input/output hashes, texture inventory, geometry preservation and reconstruction notes.
- Eighteen PNG maps, three each (`-albedo`, `-roughness`, `-normal`) for `body` (2048²), `fins-pectoral` (1024²), `fins-pelvic` (512²), `fins-dorsal` (512²), `fins-caudal` (1024²) and `eyes` (512²).

Paired fins share mapped pigment using explicit polygon-vertex UV correspondence despite mirrored winding. The eyes occupy separate atlas halves so each iris follows its own socket axis. Albedo is unlit; roughness and +Y tangent-space normals are Non-Color. White `Color` attributes prevent duplicate mapped colour tint in a later full export. No GLB/LOD is produced here.

Record actual files, bytes, hashes and the geometry-preservation result. Stop on an error; do not repair a source, change a UV/bake setting or reuse a partial candidate silently.

## Group 2 — verify outputs and render four material views

Reverify both frozen script hashes, the material report's saved blend hash, the unchanged coarse source blend and all eighteen texture hashes. Then:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b /Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/material-01/titanichthys-material-01.blend --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/render_material_01.py
```

Expected: four `TITANICHTHYS_MATERIAL_VIEW_OK` markers and `TITANICHTHYS_MATERIAL_RENDER_OK`, four 1600×1200 PNGs under `material-01/renders/`, and `renders/manifest.json`:

- `01-material-side.png`: armour/skin/underside relationship, maintained head/posterior and fin silhouettes.
- `02-material-oblique.png`: broad curved plate tones, full tapered fins, natural material scale without a rock/scale lattice.
- `03-armour-close.png`: existing sutures, quiet puncta/grain, cheek/shoulder transitions and dark eyes. No raised fake tiles, painted eye ring or excessive gloss.
- `04-oral-open.png`: continuous edentulous margin, readable warm lining and inset floor under the same external oral-inspection light arrangement used for coarse review.

CPU Cycles, two threads, 48 denoised samples and exposure −0.35. The first three use the saved neutral studio rig; the fourth uses the frozen external 200 W / 70 W oral illumination. Existing gape/eye-follow transforms and cameras are temporary. The renderer contains no blend-save operation.

## Review boundary

Stop for any input hash/path mismatch, preexisting output/render directory, unexpected scene structure, failed geometry-preservation check, UV/bake/render error, missing output/marker or need to alter source settings. Preserve evidence and return to Astra/root. Terra does not make creative repairs.

After the four renders, return the material report, saved blend and render manifest/PNG paths with bytes/hashes. Root and the author must inspect the actual materials before choosing further work. Coarse approval does not transfer to final materials, eye containment, a future rig or all action poses. No further renders, rig/actions, exports, LODs, public assets, Git or shared checkpoint modifications are authorized by this handoff.
