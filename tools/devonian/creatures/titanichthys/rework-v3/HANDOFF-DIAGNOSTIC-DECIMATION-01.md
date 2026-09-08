# Titanichthys candidate02 — focused colour-decimation diagnostic

Astra high authors; Terra medium executes. Candidate02's generic post-decimation error did not persist the offending values. Its full GLB and18 maps cannot establish a post-decimator colour range, and no LOD/production blend/report was saved. Candidate01 and02 remain immutable. **No clamping, threshold change, production repair or broad rerun is authorized here.**

This single diagnostic reuses the frozen candidate02 sampling, palette regions, dense body filtering, semantic weights and25-bone bind setup. It stops before actions and exports, takes one body copy with the same shape-key/attribute stripping, and applies the exact0.26 decimator before its armature. It reads accepted albedos directly (already verified byte-identical to candidate02 albedos). It does not create export-texture copies, reduce other parts, animate, render, save a blend or export a model.

## Frozen input verification

CWD: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.

Manifest SHA-256: `27054cffcccd36cd41444a1840693ee7af8e143d349d82bb6e6867f0b6c16acc`.
Diagnostic source SHA-256: `be458ea76211dbb8a49dcac678a89dba1d08760b67519e6c4642ba43f9a7f831` (13287 bytes).

```sh
shasum -a 256 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/frozen-diagnostic-decimation-01.sha256
shasum -a 256 -c /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/frozen-diagnostic-decimation-01.sha256
```

The manifest binds the source and frozen original helpers, accepted material/maps, both failure provenance and every preserved candidate02 partial file. Verify before and after. New directory must be absent:

`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/diagnostic-decimation-01/`

## One diagnostic command

CPU2threads; initial10minute budget. Keep log beside the new directory, do not precreate it.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/diagnose_decimation_01.py
```

Expected one `TITANICHTHYS_PIGMENT_OK` sampling marker, then `TITANICHTHYS_DECIMATION_DIAGNOSTIC_OK`. Diagnostic success means the data were measured, not that colour or anatomy passed.

Outputs:

- `before-summary.json`: source/helper/material hashes, exact body layout/key comparison, dense sampled/filtered ranges, per-channel finite/min/max/mean/negative/above-range counts and original modifier stack. Written before decimation so another failure preserves useful evidence.
- `result.json`: post-decimation per-channel and per-material ranges/counts; invalid-loop count; offending/extreme loop IDs, vertex coordinates, UVs and materials. Includes hypothetical physical-range clipping counts and maximum changes explicitly labelled **NOT APPLIED**.
- `actual-decimation-colours.npz`: unmodified before/after RGBA arrays, post-decimation positions, loop vertex mapping, UVs and material IDs, with hash in result.json.

The output distinguishes RGB versus alpha, nonfinite versus negative versus high values, and errors relative to a16-bit colour step. No values are clipped or corrected. Return exact result/archive hashes plus printed channel summaries to root/Astra. If the diagnostic does not reproduce invalid values, report that directly; it does not justify a clamp or a repaired production candidate.

## Stop and next gate

Stop on any changed hash/path, existing output, pre-decimation sampling/validity failure, unexpected Blender error or need to edit code. Preserve partial evidence. Do not execute candidate02 again, author a candidate03, rerun structural/render groups or normalize colours independently.

Astra has only parsed and scoped the diagnostic source and inspected preserved file/source evidence; no Blender execution occurred in high mode. Both original manifests reverified unchanged. After quantified actual values arrive, Astra can author a narrowly justified new repair source if warranted. Rig/geometry/art remain accepted at their existing bounded gates; final runtime/eye/oral/general and packaging reviews remain pending.
