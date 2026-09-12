# Coccosteus material-03 — existing anatomical plates lead the finish

Astra high authored this bounded material correction. Parent assigns Terra medium to execute
only these two frozen groups. No Blender has run for material-03. Material-02 is rejected as a
finish, while its geometry, oral passage, posterior pigmentation and fin-ray materials remain
the source. All candidates and named backup are preserved. No public/shared/Git modifications.

## Frozen inputs

Verify all six before each command group. Any mismatch stops execution.

| Absolute input | SHA-256 |
| --- | --- |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/materials-03.py` | `43a7045aa0e880615a413335ff99eea04f04f13cb3ecb7deaad4408eda846896` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/material-views-03.json` | `6899a98892eac311e79cab2c991ae3a22f6d5e59e6c571015e5e2d09b29303da` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/armour-layout-01.json` | `c703f3d02ea4595408173c8d1bad186b7e9721f8abbe4c580aae7b42b85d4b3a` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/material-02/coccosteus-material-02.blend` | `fb5d6149ca60af5109362d9080204c914b5a2f5e2003893a6cb0a6af76e35a49` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/material-02/material-report.json` | `b94af6882e191e55feea273444d54eff36bee86347091e6a9a6fccabf3ddae1f` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/clay-04/build-report.json` | `c964de05f5f51b60545d2ad8637389eccc6955308a6ca7f02ed48142ee7fa9a2` |

The unchanged material-01 layout supplies the same ten anatomical paths and six existing
curvature regions. Clay-04's report supplies the exact orbit exclusion zones used by the
accepted relief. Neither input is edited. CWD: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.

## Group 1 — material-only preparation

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/materials-03.py -- --stage prepare
```

Expected exit zero and `COCCOSTEUS_MATERIAL_03_PREPARE_COMPLETE`.
Outputs only under `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/material-03`:
`coccosteus-material-03.blend` and `material-report.json`.
The report must show equal `geometry.before` / `geometry.after`, equal `geometry.oralBefore` /
`geometry.oralAfter`, and equal `retainedSurface.before` / `retainedSurface.after`.

Geometry digest covers every mesh's coordinates, shape-key coordinates, topology, weights,
group names and transforms. Retained-surface digest covers all eight pre-existing packed
pigment image pixels, the four original body pigment/mask/coordinate attributes, and all
material assignments other than outer body slot 0. Fin shaders, eyes and oral material are
not edited. Only the outer body shader and three plate-response attributes are added.
Two new packed 1536×1024 RGB maps encode the existing sutures, a subdued response along one
margin and regional tone. No texture height is applied as geometry displacement.

Record command, version, elapsed time, source/output bytes/hashes and all equalities in the
per-creature state. Check source blend hash remains frozen after preparation. Never rerun a
successful group or overwrite existing evidence.

## Group 2 — seven unchanged review cameras

Verify the new blend/report and all six frozen inputs.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/materials-03.py -- --stage render
```

Expected exit zero and `COCCOSTEUS_MATERIAL_03_RENDER_COMPLETE`.
Outputs: `side.png`, `front.png`, `dorsal.png`, `oblique.png`, `mouth-open.png`,
`armour-material-close.png`, `armour-clay-close.png`, complete `render-manifest.json`.
CPU Cycles, two threads, 48 samples, fixed seed, 1280×960, same lights and seven cameras as
material-02. Neutral clay override is render-only and never saved to the blend. Optional logs
and execution evidence remain within material-03. Existing deliverables stop the group.

## Authored changes and actual-review requirements

- Exact accepted geometry/relief and oral ownership retained. No new grid, seam paths,
  disconnected plate objects, tubes, shell geometry or sculptural changes.
- Existing anatomical sutures gain narrow muted umber pigmentation and rougher troughs;
  a subtle one-sided material response follows their existing margins. Cranial/cheek/thoracic
  tonal and roughness fields use the six already-authored curvature regions.
- Broad cloud colour is removed. The base bronze range narrows from a five-fold red-channel
  value range to about 1.6-fold; grain colour is close-valued and no longer bright gold dots.
- Armour microbump maximum strength×distance falls from .001344 to .000216 (~84% reduction),
  further suppressed near sutures. The accepted geometric normals must dominate plate reading.
- The exact material-02 posterior colour branch, packed markings and fin materials remain.
  Dermis microbump uses the same source settings. Bone colour remains artistic inference.

Astra must inspect every actual image against the user reference before accepting material.
At whole-body side/oblique/dorsal scale, the cranial/cheek and thoracic plate structure must be
readable before grain. The material close-up should reveal the same structures as neutral
clay. Reject lost plates, a return to featureless mustard, intrusive black outlines, artificially
bright raised piping, detached/sticker plates, heavy dots/clouds or grain-free plastic. Check
mouth/eyes and preserved posterior markings/rays. Source-only map previews are not renders.
No rig authoring until the actual material gate passes; bake/runtime and final audits remain.

## Static evidence, budget and stops

AST/JSON parse passed. Both plate maps evaluated at the full 1536×1024 resolution with pure
NumPy, no bpy/Blender; finite 0..1 channels. Head regional-tone range .35182–.63017; thorax
.26549–.54003. Ten exact paths and matched seven-view cameras verified. Flat signal diagnostics
inspected to catch field artifacts; actual Blender shader appearance is still untested.

Allow 20 minutes preparation and 25 minutes rendering, 45 total, one group per state entry.
Stop on errors, timeout, changed hash, failed digest, absent map/output, incomplete manifest or
need for art decisions. Return exact evidence to Astra; no source/API/material/threshold/camera
fixes by Terra. Return all seven actual PNGs plus blend/report/manifest hashes after completion.
No bake, GLB, rig, dynamic actions, production audit, packaging, public integration or Git work.
