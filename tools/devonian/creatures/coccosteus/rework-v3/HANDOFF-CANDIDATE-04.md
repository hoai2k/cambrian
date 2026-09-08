# Coccosteus candidate04 — consume successful actual bake03

This minimal downstream amendment changes only source imports/version names, output paths and
the input blend from failed baked02 to successful baked03. Candidate03's intended anatomy,
20-bone rig, all18 full/LOD actions, anchors, fin45%/body25%/eye70% LOD ratios, direct final-UV
pigment sampling and all checker policies remain unchanged. Original sources and partial outputs
are immutable. Do not rerun either bake02 or bake03.

Astra independently inspected actual paired albedo, normal/roughness maps and all four probes.
ADJACENT_FACES16 baseline has1311 uncovered tail-pole-border albedo pixels; EXTEND32 has zero in
both rectangles. Interior comparison is byte-identical. Exterior roughness retains.459–.788
variation; oral.541 constant is authored. All27 maps plus six blend/diagnostic files verify.
See review-bake03-actual.md. This accepts bake coverage for downstream production only; final
appearance, LOD markings, oral/eye and runtime gates remain open.

## Frozen inputs

Manifest absolute path:
`/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/frozen-candidate-04.json`
SHA `8c78e16bafb72c157f5bc54eebf1802c4d56dbbfca07ee2252680169c46a4d2e`.
Verify all111 inputs before each group. It binds all prior dependencies, every actual successful
bake03 artifact/report, five minimal new sources, review and static evidence.

Actual bake report:
`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/baked-03/bake-report.json`
SHA `fd63824840f5839198ea2c805a17193b34460d5fbafa2641da53594ed58b4545`.

Static report `../devonian-authoring/coccosteus/rework-v3/production-04-static-report.json`
SHA `44a073d782e890d39a97b24aea43167ab21f6f236de9717b108eb9cc8a76ceed`.
New source syntax, exact path-only normalized differences, old68 frozen dependencies and33
generated bake files pass. No Blender by author. Existing source/rig/coverage tests still apply.

Parent assigns the next execution slot to Terra medium. CWD for all commands:
`/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.
Blender CPU2, --python-exit-code1. Exclusive new output directory:
`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/candidate-04`.
It is absent at freeze. Every output group refuses existing evidence. Record exact commands,
elapsed time, Blender version, output bytes/hashes and checks/errors in own WORKING_STATE entry.
Stop on mismatch, error or failed gate; preserve artifacts and return log. No executor tuning,
source/gate changes, public/shared/Git edits or final acceptance.

## Group1 — candidate build (30-minute budget)

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/candidate_04.py
```

Expected exit0 and `COCCOSTEUS_CANDIDATE_04_COMPLETE`. Produces production04 blend, full/LOD GLBs,
metadata, candidate report and LOD pigment-transfer report. Verifies actual baked03 hashes,
unchanged accepted geometry, jaw/skull deformation, neutral-color reduction, strict final pigment
and exact actual COLOR_0 transfer. Both levels preserve all18 actions.

## Group2 — structural and exported-map checks (5-minute combined budget)

```sh
/usr/bin/python3 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/check_candidate_04.py
```

```sh
/Users/hoai/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/check_export_atlas_04.py
```

Both exit0; expected `COCCOSTEUS_EXPORT_STRUCTURE_PASS` and
`COCCOSTEUS_EXPORT_ATLAS_04_COMPLETE`. Produces export-structural-review.json and
export-atlas-review.json. All existing rig/material/action/anchor gates and actual body-map
decoded-pixel equality/complete coverage checks must pass unchanged.

## Group3 — four actual full-GLB portraits (20-minute budget)

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/render_candidate_04.py -- --group portraits
```

Expected exit0 and `COCCOSTEUS_CANDIDATE_PORTRAITS_COMPLETE`. Four standard PNGs and complete
portrait-evidence/manifest.json. Renderer imports actual full GLB at the unchanged comparison setup.

## Group4 — nineteen actual full/LOD views (35-minute budget)

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/render_candidate_04.py -- --group review
```

Expected exit0 and `COCCOSTEUS_CANDIDATE_REVIEW_COMPLETE`.19 PNGs and complete pose-evidence
manifest; unchanged cameras/poses include cranial closeups, full gape/Eat/Bite, LOD Attack/Eat
and neutral LOD. Return all23 actual images plus reports and hashes to Astra/root. Verify clean
seams, retained living finish, meaningful LOD bars/rays, and oral lip/corner/eye appearance before
acceptance. Browser playback, final audits, packaged-size/lossless delivery and integration are
later gates. Do not imply these pass from execution or numeric coverage alone.
