# Coccosteus material-01 — frozen relief and dermal study

Astra high owns visual/anatomical decisions. Parent-assigned Terra medium executes these two
command groups. Clay-04 has passed the coarse gate **for this detail study only**; see
review-clay04-material-gate.md. Model and new material study remain preview. No Blender has run
for this new source. Preserve all earlier candidates, old public models and named backup.

## Frozen inputs

Verify all five hashes before each group. On mismatch stop and return to Astra.

| Absolute input | SHA-256 |
| --- | --- |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/materials-01.py` | `52a698a8522ac21b7fbc3439d0a25e82d78f02647f48370b4d5c0b8c0162ef56` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/armour-layout-01.json` | `c703f3d02ea4595408173c8d1bad186b7e9721f8abbe4c580aae7b42b85d4b3a` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/material-views-01.json` | `6899a98892eac311e79cab2c991ae3a22f6d5e59e6c571015e5e2d09b29303da` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/clay-04/coccosteus-clay-04.blend` | `de46eb02497bbca59807d76bca5c97ab8b1998d019b6f415e71f34756e78ce9e` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/clay-04/build-report.json` | `c964de05f5f51b60545d2ad8637389eccc6955308a6ca7f02ed48142ee7fa9a2` |

The report supplies exact lateral eye centers/normals. No old builder is imported and no source
blend is saved. Preparation opens clay-04 then saves only the new material-01 blend.

CWD: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`

## Group 1 — prepare editable relief/material study

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/materials-01.py -- --stage prepare
```

Expected: exit zero, `COCCOSTEUS_MATERIAL_01_PREPARE_COMPLETE`, new editable blend and material
report. The report must show equal `oralBefore` / `oralAfter` hashes covering every actual oral
key coordinate, weight and face. Topology remains unchanged. Record Blender version, command
output, elapsed time, all bytes/hashes and this equality in WORKING_STATE.md. Never rerun a
successful preparation. Recheck frozen clay-04 blend hash after preparation.

## Group 2 — seven actual fixed views

Verify the generated material blend against material-report.json and all frozen inputs.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/materials-01.py -- --stage render
```

Expected: exit zero, `COCCOSTEUS_MATERIAL_01_RENDER_COMPLETE`, seven PNGs, complete manifest.
CPU Cycles, two threads, fixed seed, 48 samples, 1280×960. Five established views plus a matched
armour close-up pair. `armour-clay-close` temporarily gives the outer body a uniform neutral
material to reveal geometry alone; this render-only override is not saved to the source blend.

## Exclusive output directory

`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/material-01/`

- `coccosteus-material-01.blend`
- `material-report.json`
- `side.png`, `front.png`, `dorsal.png`, `oblique.png`, `mouth-open.png`
- `armour-material-close.png`, `armour-clay-close.png`
- `render-manifest.json`
- Optional captured logs and execution evidence list within the same directory only.

Existing deliverable paths stop the command. Never overwrite/delete a candidate or select a
new directory to continue. Nothing writes to clay-04, public, shared metadata or Git.

## Frozen visual intent

- Ten custom curved regional sutures and six broad plate-curvature fields, built into existing
  skin. Narrow shallow incisions, soft margins and no independent plate objects or generic grid.
- Geometry masks preserve mouth vertices/lip and eye surroundings. Oral shape keys/weights/faces
  must remain exactly unchanged. Existing coarse shape, posterior and fin geometry are retained.
- Rougher muted ochre/bronze armour with fine granulation; cooler slate/olive flexible back and
  pale belly; irregular short oblique pigment bars/flecks; no large scales or raised stripes.
- Curved fan-oriented fin pigment and root grading. Restrained iris colour on existing globes.
- Colours/microdetail are artistic inference. Procedural nodes remain editable and need a later
  texture bake before game export and authored/default runtime palette validation.

Astra must inspect all seven actual images. Reject generic grid/black-trench/sticker armour,
weak underlying plate curvature, oversized granulation, repetitive zebra/washboard posterior,
striped flat-fin appearance, lost old-model appeal, or compromised lip/orbit readability.
The neutral close-up must demonstrate actual relief independently of pigmentation and bump.
No appearance is accepted merely because preparation succeeds.

## Static evidence / bounds

AST and JSON parse passed. Dense source-only parameter grids evaluated the relief field:
head approximately -0.004846 to +0.007024; thorax -0.004877 to +0.007008 authoring units before
anatomical masking. Authored individual widths .0055–.009 and depths .0020–.0030 are bounded;
intersecting suture paths can combine within the recorded field range. Runtime assertion limits
absolute relief below .014. Matched armour close-up cameras and seven-view list passed.
No Blender shader/render validation has occurred; unexpected API/error output must return to
Astra unchanged. No final eye/general creature audit is claimed.

## Budget and stops

One command group per state entry; allow 20 minutes for prepare and 25 minutes for renders,
45 minutes total. Stop on error, timeout, changed hash, failed assertion, missing file,
incomplete manifest or need for visual/anatomical judgment. Record exact evidence; do not edit
source, seams, shaders, samples, thresholds or metadata to continue. No automatic fixes.
After both groups return all seven full-resolution PNGs and blend/manifest/report hashes to
Astra. No GLB, bake, final rig, production audits, packaging or public integration is authorized.
