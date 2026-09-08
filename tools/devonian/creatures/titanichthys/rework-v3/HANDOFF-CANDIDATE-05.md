# Titanichthys candidate05 — corrected skinned correspondence

Astra high authors; Terra medium executes G1/G2/G3 in order. Candidate05 repairs only the measured eye coordinate-space omission in04's export-colour transfer. Every old candidate/source and diagnostic remains immutable. No public/Git/packaging/final audits or further source/threshold edits.

CWD: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.

## Verify frozen inputs

Manifest SHA-256: `ba99dda6f2e4ec1d2f1bb7e4e76236546df1de240cd470cb6e8f8be85cc0287f` (114 entries).

```sh
shasum -a 256 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/frozen-candidate-05.sha256
shasum -a 256 -c /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/frozen-candidate-05.sha256
```

Verify digest and all entries before each group and after completion. Manifest includes preserved04 partial files, prior frozen inputs, exact diagnostic results/arrays/log, installed exporter evidence and new source. Fresh target must be absent: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/candidate-05`. Astra verified absent. Do not precreate/reuse it; keep logs beside the target.

| New source | Bytes | SHA-256 |
| --- | ---: | --- |
| candidate_05.py | 21256 | `4180b3ba0fd1b2bbb10f7995981c1f9b925ed394266f67103257a946ff6d8d0d` |
| atlas_pigment_03.py | 8706 | `39cb6a405a7b903e03b62c469911dd18062b69fd89beddab26d3b91e8e8ab10f` |
| check_candidate_05.py | 10614 | `f732ce8513ad0dff4f3a37f4dc3b589c3d87ee20fa1897b58825496dfb995a46` |
| render_candidate_05.py | 7993 | `48a02e0d2ebaf15297e158bc642579128d14419c5efc6a8789b08187b4b8aa46` |

## G1 — production export

Initial20-minute budget; CPU2threads. Report progress before extending; do not alter source.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/candidate_05.py
```

Expected9 `TITANICHTHYS_PIGMENT_OK`,18 `TITANICHTHYS_ACTION_OK`,9 `TITANICHTHYS_LOD_PIGMENT_OK`, then `TITANICHTHYS_CANDIDATE_BUILD_OK`.

Outputs: titanichthys-production-05.blend, full/LOD GLBs with18/18 clips, metadata,18 export-textures, candidate-report.json, lod-pigment-stages.json and lod-pigment-transfer.json. Final transfer now applies matrix_world and export float32/Y-up convention before matching source POSITION+UV. Original round6,2e−6 correspondence and5e−5 ambiguity limits remain; all non-colour bytes must remain unchanged. Per-primitive maximum coordinate/UV error is recorded.

No rig/geometry/actions/weights/material/texture-size/ratio changes. Body neutral reduction must still exactly match measured diagnostic geometry, and convex same-role filtered pigment plus final-UV fin/eye sampling remain unchanged. The failure was in correspondence after these stages passed; see CANDIDATE05-CORRECTION.md for quantified evidence.

## G2 — actual full/LOD contract

Only after G1 success and reverified hashes. Budget3minutes.

```sh
python3 -B /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/check_candidate_05.py
```

Expected `TITANICHTHYS_EXPORT_STRUCTURE_PASS` and export-structural-review.json, reporting18/18 actions. Checker04 remains identical except target path. Full/LOD channel values, timing and interpolation must match; all18 actions must be dynamic/distinct with correct recovery/loops/held Death. Jaw/skull/oral-floor checks in Attack/Bite/Heavy/Eat/Ability run on both. Original pigment, PBR, palette, normalized weights, skeleton/bind and nested anchors remain mandatory.

## G3 —23 actual candidate/LOD views

Only after G1/G2 success and hash reverify. Initial30-minute budget; CPU2threads,48samples, no blend save.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/render_candidate_05.py
```

Expected23 `TITANICHTHYS_CANDIDATE_VIEW_OK`, final `TITANICHTHYS_CANDIDATE_RENDER_OK`,23 images and portrait-pose-manifest.json. Unchanged04 review set: four portraits,15 action/orbital views, actual LOD pigment and neutral comparison, plus actual imported LOD Attack-oblique(.46) and Eat-oral(.5), using their own imported layered action slots.

Return LOD pigment/action, oral and orbital views first, then remaining images and all artifact hashes. Parent/Astra review actual results; no automatic approval or integration. Actual runtime animation playback and completed-candidate eye-volume/visual orbital/oral/general reviews remain required. Raw size and final packaging budget remain unresolved; no silent texture/motion reduction is authorized.

## Evidence and stopping

Actual two-eye diagnostic:644 exported vertices per eye; local coordinates miss all, transformed coordinates match all with zero ambiguity and maximum2.98e−8 residual under the original2e−6 bound. Both eye colour errors are below half a16-bit step. Source-only replay exercised the corrected helper on all1288 actual eye accessor/corner pairs in a temporary fixture and proved non-colour bytes unchanged.4 scripts parse. No Blender execution or candidate05 actual export/pass by Astra.

Stop on any unexpected error, mismatch, existing target or need to alter sources/selectors/thresholds. Preserve partial output and exact failure; do not rerun04/05 or introduce a new version. Prior frozen results remain untouched.
