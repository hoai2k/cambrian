# Titanichthys candidate05 — focused source-corner ambiguity diagnostic

Astra high authors; Terra medium executes this single diagnostic. Candidate05 G1 failed after all9 pigment stages and full/LOD exports, at atlas_pigment_03.py's unchanged `Ambiguous corner pigment correspondence` guard. No colour-transfer buffer was written, no production blend/report, G2 or G3 exists. No full build rerun, source repair or tolerance relaxation is authorized here.

Astra first preserved an inventory of22 candidate05 output/log files: candidate05-ambiguity-failure.json SHA `fa71951091d1eb3da196c4fa7982963a73b5b08b5a91918130fb26fd14f97dde`. Every frozen05 input was reverified. Candidate05 and all earlier sources/evidence remain immutable.

## Evidence and purpose

Actual candidate05 LOD has260 position/UV-coincident exported pairs with different colour across body palette primitives. The first inspected pairs have identical normals to float precision. The first eight meshes have no such exported pairs. The secondary-material white export masking obscures intended body colours, so the GLB alone cannot prove which source corner triggered the guard or whether material identity resolves every ambiguity. The current helper searches all source corners of a mesh without filtering by the exported primitive's material.

This diagnostic reconstructs the exact nine reduced source parts and records their intended final source colours, normals, UV, material and polygon identities. It checks both the unchanged original lookup and an observational same-material filter, under the same round6 bucket,2e−6 coordinate/UV and5e−5 colour ambiguity limits. It does not choose a winner, change normals/colours, relax limits or patch the GLB. Astra must inspect the measurements before authoring a next production version.

## Frozen verification

CWD: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.

Manifest SHA-256: `4e5cf0c146f9d467d1c52e9be12df7ce4ce2501034360da087eae3541a25de28` (139 entries).
Diagnostic source: `4d0552ca0cdf2b4d4fb9c1732cefdddca132cd1f5092ca7437b86b6b0f388e6a` (20118 bytes).

```sh
shasum -a 256 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/frozen-diagnostic-ambiguity-01.sha256
shasum -a 256 -c /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/frozen-diagnostic-ambiguity-01.sha256
```

Verify digest and all entries before and after execution. Manifest binds all prior sources/accepted inputs, preserved05 partial exports/textures/stages/log, failure inventory and this new diagnostic. Fresh target must be absent: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/diagnostic-ambiguity-01`. Astra verified absent. Do not precreate/reuse it; keep logs alongside.

## Single diagnostic command

Initial5-minute budget; CPU2threads. This is source reconstruction without the18 actions, any GLB export/write, render or blend save.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/diagnose_ambiguity_01.py
```

The source derives from frozen05 through exact mesh/material role preparation, atlas sampling/filtering and bone binding, then makes the same export copies and LOD reductions. It reads the same accepted albedo files directly and creates no new texture copies. Body geometry must exactly reproduce the measured diagnostic arrays, as in04/05. Colours follow the same final-UV or convex body-source method. It reads immutable candidate05 LOD queries rather than exporting another GLB.

Outputs:

- preserved-inputs.json before reconstruction;
- lod-pigment-stages.json, preserving reconstruction stages;
- nine source-corners-XX.npz archives with actual source position/UV, RGBA, material/polygon/vertex IDs and transformed corner normals, plus exported queries/normals/colours and all ambiguous query indices;
- partial-result.json after each mesh;
- result.json identifying the first reproduced object/primitive/query ambiguity, all candidate source loop/material/normal/colour differences, and counts/errors for original versus same-material lookup. Includes source-archive hashes.

Expected9 `TITANICHTHYS_PIGMENT_OK`,9 `TITANICHTHYS_LOD_PIGMENT_OK`,9 `TITANICHTHYS_AMBIGUITY_MESH_MEASURED`, then `TITANICHTHYS_AMBIGUITY_DIAGNOSTIC_OK`. A diagnostic completion is measured evidence, not a candidate pass or permission to apply a filter. Return result/archive hashes, first ambiguity details and all per-primitive strategy counts.

## Stop and resume

Stop any mismatch, source-layout issue, existing target or unexpected exception; preserve partial outputs and the exact failure. Do not change the selector or thresholds, rerun05, create06, export/render or begin final audits. Astra only AST-parsed/scoped the diagnostic and inspected actual failed GLBs/source; no Blender execution occurred in high mode.

All18 full/LOD action retention, geometry/material/rig/pigment design and old candidates remain unchanged. Final runtime/eye/oral/general/visual/packaging gates are still pending. Resume Astra with measured source-corner evidence before the next bounded repair.
