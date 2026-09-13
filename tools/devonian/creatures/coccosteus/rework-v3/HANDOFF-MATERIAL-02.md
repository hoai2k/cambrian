# Coccosteus material-02 — frozen material-only refinement

Astra high owns creative decisions. Parent assigns Terra medium to execute the two frozen
command groups below. No Blender was run during authoring. Preserve material-01 geometry,
all earlier candidates, old models and the named full backup. No public/shared/Git writes.

## Frozen inputs

Verify all four before each command group. A mismatch stops execution.

| Absolute input | SHA-256 |
| --- | --- |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/materials-02.py` | `4e79fe40644145efdda272699b7418dffab21a425cdc4c014429abb5b0be65b2` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/material-views-02.json` | `6899a98892eac311e79cab2c991ae3a22f6d5e59e6c571015e5e2d09b29303da` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/material-01/coccosteus-material-01.blend` | `1d6b2f537e21f826bf3751eae380de999184cfa140725a49782b310baa7d4429` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/material-01/material-report.json` | `a172b6860beeb68c73ff6347caa6d915d8c8f0e27c772e470bf40a7e2417fefd` |

CWD: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`
Exclusive output: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/material-02`

## Group 1 — prepare material-only candidate

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/materials-02.py -- --stage prepare
```

Expected zero exit and `COCCOSTEUS_MATERIAL_02_PREPARE_COMPLETE`.
Outputs: `coccosteus-material-02.blend`, `material-report.json`.
The report must show equal `geometry.before`/`geometry.after` (all mesh coordinates,
shape-key coordinates, face indices, weights, group names and world transforms), and equal
`geometry.oralBefore`/`geometry.oralAfter`. This pass must apply no geometry displacement.
Eight original procedural pigment maps must be packed in the new editable blend: two
2048×1024 flank patterns and six 1024×1024 fin-ray maps. Eye/oral materials remain as saved.
Record command, Blender version, elapsed time, bytes/hashes, equality checks and frozen
source blend hash after the command. Never repeat a successful preparation.

## Group 2 — seven matched review views

Verify the generated blend against material-report.json and the four frozen inputs.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/materials-02.py -- --stage render
```

Expected zero exit and `COCCOSTEUS_MATERIAL_02_RENDER_COMPLETE`.
Outputs: `side.png`, `front.png`, `dorsal.png`, `oblique.png`, `mouth-open.png`,
`armour-material-close.png`, `armour-clay-close.png`, complete `render-manifest.json`.
All cameras, lights, resolution 1280×960, samples 48, seed and CPU two-thread setup match the
material-01 review. Neutral clay close-up temporarily replaces only the outer body material;
no render override is saved. Optional execution logs/evidence remain inside material-02 only.
Existing output deliverable paths are an error; do not overwrite or select another path.

## Authored scope and review criteria

- Retain exact accepted geometry, anatomical sutures, relief, posterior, fins and oral ownership.
- Original 3D bronze/umber tonal fields, warmer sparse highlights, and visible bony granules
  at two scales; a varied matte finish instead of uniformly mustard colour and uniform sheen.
  No metallic shader, photo projection, ImageGen swatch, generic plate grid or extra seam incision.
- Continuous flank texture sampling resolves varied oblique bars and small lower dashes/flecks.
  Left/right patterns use independent deterministic seeds. Pigment only, no raised body ridges.
- Fine fan-directed fin rays sampled per texture pixel; restrained ray bump only. Fin geometry
  is untouched. Procedural cells/bump remain shader-only and are not topology displacement.
- Pigmentation is an artistic inference informed by the user reconstruction. All procedural
  source is original. Packed maps are editable source assets, not a completed glTF bake.

Astra must inspect all seven actual images. Judge grain in the armour close-up and its effect
at side-view scale; avoid rubber, oversized pebbles, stone-like cells, metallic glitter or muddy
brown loss of form. Bars must remain readable but irregular, without continuous zebra rings,
blurry/dotted fragments or a painted-on stencil appearance. Fin rays must read as fine membrane
structure. The neutral close-up must match the accepted relief; the oral study must retain the
continuous passage. No final material, rig, eye/general audit or production gate is claimed.

## Static evidence and stop conditions

AST/JSON parse passed. Pure NumPy pigment functions were evaluated at full configured image
resolution without bpy/Blender: finite and bounded 0..1, distinct two-sided maps; six fin-family
instances use four tested ray fields. Matched close-up cameras and seven-view count verified.
A source-only mask diagnostic was inspected; it is not a render or material acceptance.

Allow 20 minutes prepare and 25 minutes render (45 total), one group per state entry. Stop on
error, timeout, changed hash, failed digest, missing output, incomplete manifest, unpacked map
or need for art judgment. Return exact error/evidence to Astra; do not fix APIs, maps, shaders,
source, samples or thresholds mechanically. After execution return seven actual PNGs and
blend/report/manifest hashes. No Blender execution outside these groups, bake, GLB, final rig,
production audits, packaging or public integration is authorized by this handoff.
