# Titanichthys candidate02 — frozen LOD pigment correction

Astra high owns creative source; Terra medium executes. This is a bounded correction to the actual candidate01 export failure, documented in `CANDIDATE02-CORRECTION.md` and `candidate01-pigment-diagnosis.json`. Every LOD primitive had white COLOR_0; the checker is retained and strengthened. No broad sculpt, rig/action redesign, new texture-size reduction or final audit is part of this handoff.

CWD: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.

## Verification

Frozen manifest SHA-256: `fd30c4df4bccb7ffa9fd45222b3af612fa35dd04ce4670a83b9372265a0564b5`.

```sh
shasum -a 256 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/frozen-candidate-02.sha256
shasum -a 256 -c /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/frozen-candidate-02.sha256
```

Verify the manifest itself and every entry before each group and after completion. It binds the new sources and96 independent PNG sample controls, unchanged rig/export utility/metadata, accepted material02 inputs/maps, correction evidence, original manifest and actual candidate01 full/LOD/blend/report. Candidate01 is immutable failed evidence.

| New source | Bytes | SHA-256 |
| --- | ---: | --- |
| candidate_02.py | 19948 | `a1026fe4e5383337f2e1f5651052cc285810311ad8039da771584b2d27eac49d` |
| atlas_pigment_02.py | 7778 | `7c344561e8129ec92a8004e95a35bdd22c479aa310c3a676ef43b1c19c13ac86` |
| atlas_samples_02.json | 18411 | `e4ca45037b85798cece28ba5bde4e4e78be07b9ae841832bc2bc029966e22a24` |
| check_candidate_02.py | 9986 | `3cb78175be351bc071c60cabc2b763519776765942abede804f65aceeeafab87` |
| render_candidate_02.py | 6296 | `5c9289ee09ae7b369f43a2b2af801d68552a79721ab368bc28239c0fe2fd16fe` |

Fresh output only:

`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/candidate-02/`

Verified absent at freeze. Keep logs beside this target; do not precreate it or reuse partial output. Do not change thresholds, version names, source code or sampling controls after a failure.

## Group1 — corrected production export

Initial budget20minutes; report progress before extending without altering source.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/candidate_02.py
```

Expected9 `TITANICHTHYS_PIGMENT_OK` sampling markers,18 `TITANICHTHYS_ACTION_OK`, then `TITANICHTHYS_CANDIDATE_BUILD_OK`.

Outputs: `titanichthys-production-02.blend`, full/LOD GLBs, metadata, candidate-report.json,18 export-textures and new `lod-pigment-transfer.json`. The latter records dense sampled/filtered/pre-decimation/post-decimation pigment plus per-primitive exported-before/intended/after ranges and quantization error. Only existing COLOR_0 bytes are transferred after exact source POSITION+UV correspondence; all non-colour bytes must remain identical through that operation. Decoding/UV orientation/sRGB conversion must match frozen independent PNG values before sampling.

The25-bone rig,18actions,5anchors, geometry/rest keys, texture dimensions and decimation ratios are unchanged from candidate01. The palette-specific LOD shader now explicitly reads Color. Construction attributes remain in the authoring source but are excluded from export copies. The exact oral-accent role avoids misclassifying 'pectoral' as oral for LOD roughness. All original semantic/geometry/weights/loop/LOD gates remain in force.

No new reduction addresses the44MB raw size here. Raw sizes are reported; final lossless packaging still must satisfy the25MB delivery gate. Do not tune texture sizes or compression to make this pass.

## Group2 — preserved and stronger actual structural gates

Run only after successful group1 and reverified manifest. Budget3minutes.

```sh
python3 -B /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/check_candidate_02.py
```

Expected `TITANICHTHYS_EXPORT_STRUCTURE_PASS`; fresh `export-structural-review.json`. The original nonwhite/nonuniform >.005 requirement remains. New checks reject unintended COLOR_1 fields, white/out-of-range LOD pigment and bright lost eye pigment. Full PBR/white COLOR_0, all palette roles, skeleton/bind equality, weights, nested anchors, root/scales,18/3clips, durations, dynamic oral bones, recovery/loop seams and terminal Death hold still apply.

Stop any failure; preserve logs and candidate02. No checker-only relaxation or local repair.

## Group3 — actual candidate and LOD views

Run only after groups1/2 succeed and hashes match. Initial budget30minutes.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/render_candidate_02.py
```

Same bounded21 images as the original unexecuted G3: four portraits, eleven rig/action views, four orbital directions and two actual imported LOD pigment/neutral-geometry comparisons. Expected21 `TITANICHTHYS_CANDIDATE_VIEW_OK` and final `TITANICHTHYS_CANDIDATE_RENDER_OK`. `portrait-pose-manifest.json` records hashes/poses; no blend save. CPU2threads,48samples and established camera/light settings remain unchanged.

Return the actual LOD comparison first, then oral Ability/Bite, eyes and representative whole-form/action images plus all report/blend/GLB/manifest hashes. Parent/Astra must inspect these. Actual runtime playback and completed-candidate eye-volume/orbital/oral/general audits remain later mandatory gates; no old-model audit applies.

## Author validation and boundaries

Actually performed by Astra: decoded failed GLB primitive data; verified actual albedos against approved maps; inspected installed exporter colour-masking code; preserved all original frozen hashes; AST parsed new sources; generated independent96 PNG control samples; ran a synthetic transfer fixture verifying coordinate/UV correspondence, quantization and unchanged non-colour bytes. No Blender run and no actual candidate02 export/audit exists yet.

Terra stops on any unexpected hash/path/output collision, decoder control mismatch, missing/ambiguous correspondence, staged pigment failure, altered non-colour bytes, structural error or need for creative judgment. No public/Git/shared-state work, additional source changes, final audits, packaging or automatic acceptance is authorized by this handoff.
