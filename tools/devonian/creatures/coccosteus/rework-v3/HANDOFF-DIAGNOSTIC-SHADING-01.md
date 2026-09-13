# Coccosteus candidate02 shading diagnostic

Candidate02 passed execution/structural checks but fails actual appearance review. New white
quadrilateral/triangular cranial and thoracic seam patches are absent in accepted material04.
All four portraits and 19 pose/LOD views were independently inspected at adequate scale.
Do not integrate or approve candidate02. No anatomy, rig, motion, source bake or export edit is
authorized by this diagnostic. All original frozen files remain immutable.

Manifest `frozen-diagnostic-shading-01.json` SHA-256:
`5e7212133be66854eaf517e46a4be88642ec9d7090760d40bbe1a55e84ba987f`.
It binds 14 exact inputs, including the actual full/LOD GLBs, accepted/baked/production blends,
both image manifests, source and pure-Python atlas audit. Verify every input hash before run.
Script `diagnostic_shading_01.py` SHA-256:
`57d934d7fa63d13f66b4b0f2c84775251a714e12b9a8ef67e73e0f307672c34d`.

CWD: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/diagnostic_shading_01.py
```

Parent assigns Terra medium; CPU2, 20-minute budget. Expected exit zero and
`COCCOSTEUS_SHADING_DIAGNOSTIC_01_COMPLETE`. Exclusive new output directory:
`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/diagnostic-shading-01`.
Script refuses an existing directory, opens immutable inputs read-only, saves only 12 PNGs
and result.json with actual per-image hashes. No blend/export is saved and no source is changed.

Ten actual-GLB images reproduce Orbit-front and Armour-close at the exact candidate02 camera,
lights, Idle phase and seed. Five body-only variants: original, remove normal input, replace
roughness by .66, both changes, and diffuse albedo as emission. Eyes/fins stay unchanged.
Two additional Orbit-front images compare accepted material04 and baked01 before export.
Roughness .66 is a diagnostic constant, not a proposed production material replacement.

Stop on input mismatch, error, unexpected output or incomplete report; return exact log.
Do not tune camera, lights, material, thresholds, source or resolutions. Record elapsed time,
Blender version, exact command and output hashes in own WORKING_STATE.md group entry. Return all
12 actual images to Astra/root for causal comparison before authoring a versioned minimal repair.

The pure-Python audit already ran without Blender and verified all 23 candidate image hashes.
Its source is inspect_atlas_01.py; immutable result is candidate-02-atlas-audit-01.json in the
authoring root. Actual embedded textures show 404 body-role triangle centroids below .2 roughness,
including zero; body median triangle UV area is .616 pixels at roughness1024. No white albedo
samples were found. Exterior sampled normal blue is >=.980; 13 oral triangles have blue <.85.
These nearest-centroid measurements identify coverage/shading suspects; they do not prove which
input caused each rendered patch. Causal verdict awaits ablations.

Separate unresolved LOD appearance issue: posterior bars and fin rays are substantially weakened.
All 18 dynamic LOD actions are preserved, and Attack/Eat deform meaningfully. The shading diagnostic
does not change or accept LOD pigment. A subsequent bounded UV/filter repair must preserve markings.
