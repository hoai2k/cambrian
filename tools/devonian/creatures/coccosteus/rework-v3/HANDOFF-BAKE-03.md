# Coccosteus bake03 — paired coverage reproduction and padding repair

The candidate03 group1 bake02 stopped at body albedo coverage: min0, max.5529412. Only three
00-fins maps were saved; the body albedo was checked before saving and is unavailable. Preserve
that partial baked-02 directory and all frozen sources. Candidate03 is absent and remains on hold.

The exact failed pixel locations cannot be inferred from a scalar minimum. Continuous strips
have finite footprints, but the old bake inherited its margin type and did not explicitly demand
edge extension into the checked border/pole-fan gaps. This version tests that padding hypothesis
without weakening any coverage gate. It first saves an exact paired albedo reproduction with
inherited margin type/16, then rebakes with explicit body EXTEND32. It saves maps and detailed
pixel-coordinate probes before validation, so another failure will be diagnosable.

This is a **bake-only repair candidate**, not a proven fix or production acceptance. No geometry,
UV, material-field, roughness-resolution, rig, motion, LOD or checker threshold change. The exact
body_uv_02.py topology and coverage helper remain immutable. Fin/eye policy remains inherited/16.
No painted pixel fill, roughness clamp or constant production replacement.

## Inputs

Verify frozen-bake-03.json's SHA below and every listed input before execution. It binds prior
candidate03's 60 inputs, its frozen manifest/handoff, new bake/check sources, static report and
the preserved three partial baked02 maps. bake03 also calls the original frozen verification.

Manifest: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/frozen-bake-03.json`.
68 inputs; SHA `a19d8f30d9b9d13b8560c84ef1a34823c2ae190f0080a543844ca7cfb9f15191`.
Static report: `../devonian-authoring/coccosteus/rework-v3/bake-03-static-report.json`,
SHA `f45c6fad993916573fa7235b03418d782e216aa44a08ba3b08ce72ce612cd904`.

Source bake_03.py SHA:
`9d848be9199ded29481efcde061c9c1b9a53a945e93a37b9f94de47eec9bd812`.
Unchanged body_uv_02.py SHA:
`4aa2214001f2ddd286770c9da07ec3da9d3eb77819683a335c50d4a4a792d4c7`.

Static PASS: old60 hashes, AST, unchanged UV/coverage helper, saved-map-before-check ordering,
partial output preservation. Conservative pole/border extension radius <=14.94px at4096 and
<=10.03px at2048; EXTEND32 covers it without crossing the 163.84/81.92px strip gap or wrap boundary.
This mathematical bound does not prove Blender's actual image contents. No Blender by author.

## One assigned execution group

Parent assigns execution slot; CPU2, 40-minute budget. CWD:
`/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/bake_03.py
```

Exclusive new output:
`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/baked-03`.
Refuse any existing directory. Expected exit0 and `COCCOSTEUS_BAKE_03_COMPLETE`.
Outputs: 27 baked maps, baked03 blend/report; one extra before-EXTEND albedo PNG and four JSON
probes (before and final albedo, normal, roughness). Each probe records exact image hash, actual
margin mode, region bounds/min/max, invalid-pixel counts and first64 invalid coordinates/RGB.
Final report binds all diagnostic outputs as well as production bake files. Original coverage
gates apply unchanged after each body map is saved. All accepted geometry fingerprints must hold.

Stop immediately on error or failed coverage; preserve every new map/probe. Do not lower gates,
manually fill pixels, alter UVs, retry into the same output or silently tune parameters. Return
log and all available map/probe hashes. Record elapsed time, Blender version, exact command and
checks in own WORKING_STATE entry. No public/shared/Git edits.

After success, **do not run candidate_03.py**: it still points to preserved failed baked-02.
Return the paired albedo maps/probes and successful bake report to Astra/root. Author must inspect
the actual missing-pixel locations and whether EXTEND removes them while preserving authored
variation. Only then freeze a minimal versioned downstream handoff consuming baked03. Existing
candidate03 rig/LOD changes remain the intended next phase; they are not yet repointed or executed.
