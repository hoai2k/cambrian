# Titanichthys material02 — frozen corrective PBR study

Creative owner: Astra high. Executor: Terra medium. Root authorized a material-only correction after actual material01 review. `visual-review-material01.md` rejects its cloudy smooth finish; `MATERIAL_DESIGN-02.md` defines the correction. Clay04 coarse approval is preserved. No final material, eye/general, rig/action or export approval exists.

## Frozen inputs

CWD: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.

Verify every input SHA before either command group. The source checks all six data/dependency inputs itself; the handoff binds both executable scripts.

| Absolute input | Bytes | SHA-256 |
| --- | ---: | --- |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/clay-04/titanichthys-clay-04.blend` | 5114171 | `69ad4e7d1daa7aec64835a198c9b13c4a017cf4aa441cd2e58ae9a4207c404ec` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/clay-04/construction.json` | 4290 | `76af1d3f7c181a1dee47e6bffc854258d53041fd07ea99a39b7252a11dc74734` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/clay-04/oral-inspection-01/manifest.json` | 2577 | `83f79de58ed6aee72cfb113a83091101b6f4299d32745f944bf6e5cf492e4503` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/build_clay04.py` | 27531 | `7c5df220934b94b27ed4865feb912722c259c2a18ff0b8e7cee4a3641d78f73e` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/material-sources/titanichthys-dermal-imagegen-02.png` | 1435797 | `2e208ae8f68a51c412a70dd3031a67adecb3512269d833984d8279974874643f` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/imagegen-dermal-provenance.json` | 4094 | `fdfc86c3feb44c7dafb3b5bd4429c66422c428fb1887da32ac2f5a6041f72fde` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/materials_02.py` | 30626 | `302905617819ca475c43607b3791524b308036ba7c3d3da378f4e5681e83198a` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/render_material_02.py` | 5561 | `a8d1bdf0aab756368aa4c3df72dc3e4ba050edab287c99468c85e7e73793622e` |

Only the second generated swatch is used. `imagegen-dermal-provenance.json` preserves the exact built-in ImageGen prompts, original tool paths, copied local paths, both hashes and the rejected first swatch's assessment. Its image is colour-only; no image luminance enters normal or roughness. All approved geometry and all material01 files remain immutable.

New output directory, verified absent at freeze:

`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/material-02/`

Keep execution logs alongside that target, not inside it before group 1 creates it. Do not precreate the output directory. Stop if any partial/preexisting candidate exists.

## Group 1 — material source, UVs and eighteen-map bake

After hash verification:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b /Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/clay-04/titanichthys-clay-04.blend --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/materials_02.py
```

Expected: eighteen `TITANICHTHYS_MATERIAL_BAKE_OK` markers, then `TITANICHTHYS_MATERIAL_BUILD_OK`.

Expected output: editable `titanichthys-procedural-material-02.blend`, packed mapped `titanichthys-material-02.blend`, `material-report.json`, and eighteen PNG maps. Six families each have albedo, roughness and tangent-space +Y normal: body 4096²; fins-pectoral/fins-caudal 2048²; fins-pelvic/fins-dorsal 1024²; eyes 512². The source swatch is packed in the editable blend. The mapped blend embeds its maps. No GLB or LOD is produced.

The source preserves coordinates, topology, all shape-key coordinates and object transforms through before/after fingerprints. Only UVs, material/region attributes and materials change. Higher authoring atlas resolution is intentional to retain fine detail. It is not a final shipping budget decision. Body colour remains regional but shares restrained specular/coat response; roughness varies anatomically. Mirrored fin UVs copy by polygon vertex correspondence, and both eyes retain separate atlas halves. Full `Color` attributes are white to prevent duplicate tint.

Record files, bytes, hashes, all markers and the geometry-preservation result. Do not change source settings or repair a failure. CPU Cycles, two threads, one bake sample; there are twelve colour-only image samples in the triplanar edge-safe pigment graph, so the body bake may take longer than material01.

## Group 2 — same four material comparisons

Reverify both source-script hashes, all six input/dependency hashes, the material report's mapped-blend hash and eighteen texture hashes. Then:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b /Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/material-02/titanichthys-material-02.blend --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/render_material_02.py
```

Expected: four `TITANICHTHYS_MATERIAL_VIEW_OK` markers followed by `TITANICHTHYS_MATERIAL_RENDER_OK`; four 1600×1200 PNGs and `renders/manifest.json` under material-02:

- `01-material-side.png`: distinct armour versus flexible posterior; fine detail should survive full-body view without large cloudy islands.
- `02-material-oblique.png`: continuous rounded armour, coherent pigment scale and visible rays on the preserved cambered fins.
- `03-armour-close.png`: anatomy-bound narrow sutures, related plate tones and fine living dermal detail, without pebbles/cobblestones, bright outlines, false cracks or glossy stone.
- `04-oral-open.png`: coherent edentulous lip/floor/hinge junction, restrained warm/cool lining variation and moist surface detail.

Cameras, studio lights, oral lights and exposure match material01 exactly. CPU Cycles, two threads, 48 denoised samples, exposure −0.35. The renderer uses only existing temporary gape and eye-follow transforms. It never saves or overwrites a blend.

## Author checks and stop boundary

Actual source-side checks: both AST parses PASS; existing cage/fin attribute correspondence retained; allowed bpy.ops scan contains only inherited UV selection/unwrap, bake and new-blend save operations; no renderer save; every frozen clay04/material01 source preserved; rejected material01 blend/manifest/all four PNG hashes verified; new output absent. These are source checks, not a completed Blender bake or material approval. Astra did not execute Blender.

Stop for any hash/path/scene mismatch, preexisting output/render directory, missing marker/map, UV/bake/render failure or geometry-preservation failure. Preserve logs/evidence and return to Astra/root without editing scripts or selecting a workaround. After the four views, return saved blend/report/manifest/PNG paths, bytes and hashes. Astra and root inspect the actual images before deciding further work. No extra renders, rig/actions, final eye audit, exports, LODs, public assets, Git or shared-state changes are authorized here.
