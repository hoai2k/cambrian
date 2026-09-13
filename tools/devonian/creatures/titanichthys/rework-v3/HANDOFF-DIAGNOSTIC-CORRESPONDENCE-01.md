# Titanichthys candidate04 — focused eye correspondence diagnostic

Astra high authors; Terra medium executes **only this diagnostic**. Candidate04 G1 failed after full/LOD exports and all9 pigment stages passed. The mapping utility raised `Export colour correspondence missing Sphere.002 [1.10687625 0.59076643 2.07138991 0.01990001 0.02499998]`. No G2/G3 or production save occurred. The failed utility writes its modified byte buffer only at successful completion, so both GLBs remain original export evidence.

Before further work Astra inventoried22 existing output/log files in candidate04-correspondence-failure.json, SHA `7d01c89f451bdbee4ae9556007f7327569defcda3808f03034c91fe8c10b704e`, and reverified every frozen04 input. These files are bound below and must remain unchanged. No repair, tolerance relaxation, GLB write, production rerun or candidate05 is authorized here.

## Current evidence

Actual failing coordinates/UV equal vertex0 in both full and LOD Sphere.002, attached to Recessed socket eye L_export. Exported bounds are x[1.03187621,1.18187630], y[.44076645,.59076643], z[1.99638987,2.14638996]. The accepted construction places the eye center at Blender[1.1068762541,−2.0713899136,.5157664418], radius.075; source authoring creates a local sphere at that object location. The old helper uses raw mesh-local coordinates. Installed Blender5.2 primitive_extract.py applies object.matrix_world for skinned mesh positions before Y-up conversion. This supports a missing coordinate transform; the complete correspondence error and any remaining round6 boundary effects still need measured source loops.

## Frozen verification

CWD: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.

Manifest SHA-256: `a2883c44be6832d2ef3722de1605c9f08c557305208c533bf8798b1211f1ef19` (102 entries).
Diagnostic source: `9905590783516bc005eabfa317c23624c7cc1b979406cc07a59404d66e29b993` (9190 bytes).

```sh
shasum -a 256 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/frozen-diagnostic-correspondence-01.sha256
shasum -a 256 -c /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/frozen-diagnostic-correspondence-01.sha256
```

Verify manifest digest and all entries before and after execution. The manifest binds all previous frozen inputs,22 preserved failed artifacts/log, actual construction evidence and the inspected installed exporter source. Stop on mismatch.

Fresh diagnostic target must be absent: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/diagnostic-correspondence-01`. Verified absent by Astra. Keep logs beside it; do not precreate/reuse it.

## Single bounded command

Budget3minutes, CPU2threads. No body reduction, actions, GLB export/write, rendering, texture copying or blend save.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/diagnose_correspondence_01.py
```

The script verifies preserved failures and writes preserved-inputs.json before reduction. It opens approved material02, creates the same25 rest bones, reproduces only each eye's skull binding and neutral-Color .66 reduction, then samples its accepted atlas. It reads the immutable failed LOD positions, UVs and existing exported colours.

For both eyes it measures three source coordinate spaces: original raw-local helper; matrix_world via mathutils; and the installed exporter's matrix multiplication followed by float32 storage. It counts missing exact round6 buckets, exhaustive five-coordinate nearest matches beyond the original2e−6 bound, colour ambiguities beyond the original5e−5 bound, and actual exported-versus-sampled colour errors. It saves first/missing examples with full source/query values and deltas. No threshold is changed and no values are clipped or written into GLB.

Outputs:

- preserved-inputs.json before reproduction;
- partial-result.json after each eye;
- actual-eye-correspondence.npz with all three source coordinate/UV arrays, queries, loop mapping, sampled colours and actual exported colours;
- result.json with measurements and NPZ hash.

Expected two `TITANICHTHYS_EYE_CORRESPONDENCE_MEASURED` and `TITANICHTHYS_CORRESPONDENCE_DIAGNOSTIC_OK`. Success means measured data, not a repaired candidate or tolerance approval. Return result/archive hashes and each strategy's missing/over-tolerance/ambiguity/colour-error counts to root/Astra. Astra then decides a minimally corrected mapping utility and fresh production version if justified.

Stop on any hash mismatch, existing target, shape/source error or unexpected exception; preserve outputs and exact failure. Do not edit or rerun. Astra only parsed source and inspected actual GLB/source data; no Blender execution here. Runtime/eye/oral/general/visual and packaging gates remain pending.
