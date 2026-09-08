# Coccosteus LOD05 — frozen source-only structured amendment

Owner Astra high. Execution/art HOLD pending parent-assigned CPU2 build and actual matched views.
Do not run heavy jobs while the machine is low on disk. Root must confirm disk headroom and
assign the slot. No author Blender, public/shared-doc or Git operation was performed.

Preserve candidate04 accepted full GLB, bake03, production04 rig, all original frozen versions
and partial attempts. New output is exclusively `../devonian-authoring/coccosteus/rework-v3/candidate-05`.
No full rebake, full export, geometry decimator, pigment clamp or recreated color formula.
The full GLB and metadata are copied byte-for-byte; only the new LOD is built/exported.

## Frozen source and numeric evidence

`frozen-lod-05.json` binds 159 inputs, including the accepted actual full/rig/bake/review chain,
new sources and completed 2.35 MB mesh plan. SHA256:
`09e9869d34ac0d3a1fc4caa3e46c253270f5717f7f4ba9bcc8348081b182ca5f`.

| New source | SHA256 |
|---|---|
| lod_common_05.py | f6101be0629982500f0a4a5289898b55dd5c75308b30d56be2a814c548a5a15e |
| lod_plan_05.py | b66487a18a62022233c7e2d31e160b6a0bd770bdb0daa93b88a5f8e95cdf4c49 |
| check_lod_plan_05.py | ddb0e4115cb6279a446de3fc45c34ecc1a9ad11b4224442eec3d162b83ca0862 |
| build_lod_05.py | 62d1178c1f3441d7db19845632c7502208833216c6bc95cb437140627c5012a5 |
| check_candidate_05.py | ce88a5ded75b712b09247faea27f706da7afaf1f22999a75bba59e0814763d7d |
| render_lod_05.py | 29a632a26ce31447cfa88bc1aeb318e210c23dfed5ce9a0f7d5fa040cc269d81 |

Completed, do not rerun/overwrite:
- `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/lod-plan-05/plan-report.json`
- `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/lod-plan-05/plan-validation.json`
- `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/lod-05-static-report.json`

Plan: 58,468 triangles / 151,920 full = 38.486%, below unchanged 40% gate. Original body rings
are sampled regularly; posterior triangle axial span max .0358722 versus candidate04 max .310194.
Original fin ray center/shoulder positions add structured sampling stations; actual accepted
embedded PNGs provide linear pigment. Exact full eye triangles are retained. All meshes are
closed two-face-per-edge manifolds with valid nonnegative pigment and normalized four-bone weights.

The first eight exterior AND oral mouth bands retain all 4,096 exact dense triangles, sharing
the original rim. Independent numeric matching finds zero position error and max weight error
2.385e-8. Extra angular stations protect commissures behind that band. No claim that deeper
oral posing or the existing tiny full commissure dots are now approved.

Seven strict triangle-interior probes compare interpolated LOD pigment with the original dense
surface's actual texture field. Posterior mean max-channel error .005593 / p95 .028762 versus
old LOD .009254 / .048669. Armor mean .008629 versus .009126, but p95 .028155 is slightly worse
than .026676. Fin p95 is approximately .0277–.0325; maximum surface deviation .00836 on caudal.
Probe parameterizations differ where the old LOD distorted UV, documented in validation. These
are meaningful diagnostics, not art acceptance. Matched renders must decide coherence/readability.

## Group 1 — LOD build (15-minute budget)

Run from the repository root. Entrypoint resolves its real authoring paths, not the working directory.

```sh
OPENBLAS_NUM_THREADS=2 OMP_NUM_THREADS=2 /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/build_lod_05.py
```

Expected exit0 + `COCCOSTEUS_LOD_05_COMPLETE`, two GLBs, unchanged copied metadata and
candidate-report.json. Uses actual production04 rig/actions, 20 bones, three anchors and all18
clips. Existing strict color correspondence writes only COLOR_0 bytes; object transforms are
asserted identity to match that established helper convention. No new production blend is saved.

## Group 2 — actual export structural check (5-minute budget)

```sh
OPENBLAS_NUM_THREADS=2 OMP_NUM_THREADS=2 /usr/bin/python3 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/check_candidate_05.py
```

Expected exit0 + `COCCOSTEUS_EXPORT_STRUCTURE_PASS` and export-structural-review.json.
All previous gates remain: all18 dynamic clips, durations/recoveries, held Death, jaw/skull
motions, normalized weights, valid palette, strict pigment, identical skeleton/binds/anchors.
Additional gates require exact full copy, metadata equality, exactly 58,468 LOD triangles and
identical actual full/LOD animation channel sample signatures. Atlas rechecking is unnecessary:
the accepted full GLB is an exact byte copy of the already checked candidate04 output.

## Group 3 — eleven matched actual GLB views (25-minute budget)

```sh
OPENBLAS_NUM_THREADS=2 OMP_NUM_THREADS=2 /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/render_lod_05.py
```

Expected exit0 + `COCCOSTEUS_LOD_05_MATCHED_COMPLETE` and complete matched-evidence/manifest.json.
CPU2 Cycles48; same accepted studio. Both actual full/LOD GLBs: Idle side, oblique, fin close,
Attack .32, Eat .25; plus LOD neutral oblique. Renderer binds the actual imported NLA strip's
action AND action_slot, resets frame/pose between clips/imports, verifies actual duration against
CLIPS seconds, and records slot/action/frame/source hash in the manifest.

Stop on any failure; preserve the partial new directory and logs. Do not silently relax any gate
or edit frozen sources. Return reports, all11 PNGs and complete manifest for Astra/root actual
review. Require readable transverse posterior bars and continuous fin rays without broad patchy
armor, and mouth/lip/commissure shape no worse than accepted full. General art, eye, oral, motion,
playback, packaging and integration remain separate unapproved gates.
