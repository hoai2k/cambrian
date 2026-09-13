# Frozen execution handoff — clay 01

Owner: Astra high. Executor: Terra medium. Status: candidate-ready script,
**no Blender candidate has been run or visually accepted yet**.

Input manifest: `frozen-inputs.sha256`, SHA-256
`37b2372eccf4df0425c6662424d038eaa6137371e211fa75555cef5a6585786c`.
It binds all three executable sources and the design document to absolute paths.

All commands use CWD:
`/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.

First verify the manifest digest matches above, then its contents:

```sh
shasum -a 256 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/gemuendina/rework-v3/frozen-inputs.sha256
shasum -a 256 -c /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/gemuendina/rework-v3/frozen-inputs.sha256
```

Command group 1, build; record completion before moving to group 2:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/gemuendina/rework-v3/build_clay.py
```

Expected final marker: `GEMUENDINA_CLAY_BUILD_OK`. New outputs only:
`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/gemuendina/rework-v3/clay-01/gemuendina-clay-01.blend`
and sibling `build-report.json`. The builder refuses a nonempty candidate folder.
The report binds the exact blend and source hashes. No rig/GLB/texture/export yet.

Command group 2, rendering, after a successful build and unchanged source hashes:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/gemuendina/rework-v3/render_clay.py
```

Expected final marker: `GEMUENDINA_CLAY_RENDER_OK`. Outputs in that same folder:
`threequarter.png`, `dorsal.png`, `front.png`, `side.png`, `rear_oblique.png`,
`ventral.png`, `cranial.png`, `oral.png`, and `render-manifest.json`, which binds
all rendered bytes to the blend and sources. Fixed orthographic 1200×1000 CPU
Cycles, 32 samples, two threads; no geometry or pose changes between views.
Log captures, if used, belong in `.../gemuendina/rework-v3/`, outside `clay-01`.

Stop on any error, hash mismatch, existing-output refusal, incomplete render
manifest, or creative/anatomical judgment. Preserve partial evidence, report
the exact error, and return to Astra. Do not retry with edited settings or
overwrite this candidate. Build budget 5 minutes; render group budget 20 minutes;
if exceeded, return current progress before deciding whether to extend.

Static verification already completed: all scripts parse; the pure new mesh has
89,298 vertices, 89,696 polygons, no nonmanifold edges and no unused vertices.
Bounds: X ±1.86994, Y −1.98…4.08, Z −0.19510…0.50813. These checks do not replace
Blender execution or actual image review. The final winding fix changes only oral
face orientation and was syntax-checked; Blender recalculates closed normals.

After rendering, send root/Astra the eight image paths, blend/source hashes and
report. `DESIGN.md` defines the visual acceptance criteria and proposed later
rig/material direction. Keep old sources/public family and preview status intact.
