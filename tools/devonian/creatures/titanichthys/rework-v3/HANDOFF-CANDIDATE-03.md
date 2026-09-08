# Titanichthys candidate03 — frozen post-decimation pigment assignment

Astra high authored this bounded repair from actual diagnostic arrays. Terra medium executes the three groups below in order. No Blender execution by Astra. Candidate01, candidate02 partial outputs, diagnostic01 and all previous sources stay immutable. No public assets, Git, packaging, final audits or additional creative edits are authorized by this handoff.

CWD: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.

## Verify frozen inputs

Manifest SHA-256: `4dd07f1f9e3c95fdb58d8327abc2e4724041d37b7789871c34b53fd2625853fb` (68 entries).

```sh
shasum -a 256 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/frozen-candidate-03.sha256
shasum -a 256 -c /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/frozen-candidate-03.sha256
```

Verify manifest digest and all entries before each group and after completion. It binds the original failure inputs, accepted material/maps, measured result/arrays and new source. Astra reverified both original candidate02 and diagnostic manifests and independently read the NPZ. See `CANDIDATE03-CORRECTION.md` for quantified evidence and the chosen same-region convex transfer.

| New source | Bytes | SHA-256 |
| --- | ---: | --- |
| candidate_03.py | 21256 | `95515b71286ca9120f095ddc4ebdd2391ec6dc3147c19015fdd3636d91a75332` |
| lod_pigment_03.py | 8146 | `12d8136067ca0a8f8b34223a1ef243cfc4c193a697c39c427e2cc93e920520bb` |
| check_candidate_03.py | 9986 | `12404895496e94f569c2db4a504bd8bdfea4f9ca26b3cbac693e33dac6a5f59b` |
| render_candidate_03.py | 6296 | `218e96ae447e8b01c3f5dafee5c91b036f82f8898609e7344a1e9a1810f63f0e` |

Fresh target must be absent before G1: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/candidate-03`. Verified absent at freeze. Do not precreate or reuse it; keep execution logs alongside it. Every error stops the group and returns exact evidence to Astra. No reruns, source/threshold edits or new version choices by Terra.

## G1 — build and export

Initial20-minute budget; CPU2threads. Report progress before extending; do not change the source.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/candidate_03.py
```

Expected9 `TITANICHTHYS_PIGMENT_OK`,18 `TITANICHTHYS_ACTION_OK`,9 `TITANICHTHYS_LOD_PIGMENT_OK`, then `TITANICHTHYS_CANDIDATE_BUILD_OK`.

The decimator receives neutral Color. Fins/eyes sample accepted atlas pigment at final UV. Body samples its unchanged dense region/normal-filtered field on a closest source triangle within the exact palette material, with nonnegative barycentric weights summing to1. No colour-range clipping. The body LOD positions, loop mapping, UV and material IDs must exactly equal the measured diagnostic arrays. Any mismatch stops. Full accepted geometry/shape-key/transform hashes, semantic gape, weights, rig/actions and reduction gates remain unchanged.

Outputs: `titanichthys-production-03.blend`, full/LOD GLBs, metadata,18 export-textures, candidate-report.json, lod-pigment-stages.json and lod-pigment-transfer.json. Stage evidence records discarded neutral values, exact body geometry comparison, source/target per-role RGB bounds, projection distances and coefficient ranges, plus final actual pigment. Existing GLB transfer still checks exact position/UV correspondence and unchanged non-colour bytes. Reports must show valid bounded pigment; rendering remains the visual gate.

## G2 — actual structural validation

Only after G1 success and hash reverify. Budget3minutes.

```sh
python3 -B /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/check_candidate_03.py
```

Expected `TITANICHTHYS_EXPORT_STRUCTURE_PASS` and export-structural-review.json. Checker02 is preserved byte-for-byte except the new target directory. Its nonwhite/nonuniform pigment, dark-eye pigment, palette slots, PBR, normalized weights, identical skeletons, nested anchors,18/3 clips, oral bone dynamics, loop/recovery and held-Death assertions all remain. Raw44MB full size remains an unresolved packaging gate; no texture-size changes are part of03.

## G3 — portraits, actions, orbital and LOD evidence

Only after G1/G2 success and hash reverify. Initial30-minute budget; CPU2threads,48samples. Renderer02 is retargeted without creative changes; no blend save.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/render_candidate_03.py
```

Expected21 `TITANICHTHYS_CANDIDATE_VIEW_OK`, final `TITANICHTHYS_CANDIDATE_RENDER_OK`,21 PNGs and portrait-pose-manifest.json. Four portraits, eleven action poses, four orbital views and two actual imported LOD colour/geometry comparisons. Return LOD pigment and oral views first, then orbital and representative motion images, plus all output hashes.

Astra/root must inspect actual results before approval. Actual runtime playback and final completed-candidate eye-volume/visual-orbital, oral and general audits remain mandatory later gates. No old-model audit applies. No automatic final acceptance or integration.

## Author validation

New sources AST-parse. Six exact projection fixtures,3,000 seeded varying-scale interior/normal-projection cases and two degenerate triangles pass; maximum coefficient error6.614e−11. Positive-weight pigment stays inside source bounds. These are pure math/source checks; Blender BVH, exports, structural results and render appearance remain unexecuted. The diagnostic itself proved a real failure (20 negative-red corners at4 shared head/oral vertices), not a candidate pass.
