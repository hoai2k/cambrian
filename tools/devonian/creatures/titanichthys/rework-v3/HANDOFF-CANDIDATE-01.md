# Titanichthys candidate01 — frozen production rig/export and review evidence

Astra high owns source and visual judgment; Terra medium executes these exact command groups. Material02 passed only the animated-candidate gate; `MATERIAL_GATE-02.md` and `RIG_ACTION_DESIGN-01.md` define approval and design. No prior geometry/material candidate is overwritten. This handoff does not authorize public assets, Git, final audit execution, integration or creative repairs.

CWD: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.

## Frozen verification

Manifest SHA-256: `409b98c91c1eca91cc2af051a53cc1685aa4305af82953796a977a3f3722f3e6`.

```sh
shasum -a 256 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/frozen-candidate-01.sha256
shasum -a 256 -c /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/frozen-candidate-01.sha256
```

Verify the digest itself, then every listed input, before each group and after completion. The manifest includes all six executable/data sources, the two design/gate documents, accepted material blend/report/render manifest, and all eighteen source maps. Accepted blend SHA is `59754793e889e1d17b66c6bbce1b29e9502d4f57441db01dac1d4021a67ce34d`.

| Source in this directory | Bytes | SHA-256 |
| --- | ---: | --- |
| `candidate_01.py` | 19878 | `e8b79f0dccfabea3e2e9dae07514fdafe00414e8b9d52e714e86fd143c5b2fcc` |
| `rig_actions_01.py` | 9746 | `47208081c18809057edae80475b4e80ea46921d56df01d933601d1529f051902` |
| `export_patch_01.py` | 2921 | `dc226b724856caeba0ddaaf6f5ef573bd0f4c93f1ecb36016aea80e80a20dc1f` |
| `check_candidate_01.py` | 9693 | `768a06d2838e3706fac86587438fa441e96a95c6dd3440fa7832aab5ce3ff894` |
| `render_candidate_01.py` | 6296 | `de92bd080d651123316c3f659b26c919a9f629df5defc60063aad30798fe4481` |
| `metadata_seed_01.json` | 1843 | `63f8f35f3ba41cb2cf4fa1bfb19e50cacb0309202d87b48b78ed1be95ebcfcbd` |

New output must be absent:

`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/candidate-01/`

Keep logs alongside this directory; do not precreate it. Stop on a partial/preexisting output. No retry into it or source edits by Terra.

## Group 1 — custom rig, eighteen actions, full and LOD exports

Budget: 20 minutes initially; report real progress before extending rather than changing any settings.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/candidate_01.py
```

The script opens the exact accepted material blend itself. Expect nine `TITANICHTHYS_PIGMENT_OK` markers, eighteen `TITANICHTHYS_ACTION_OK` markers, then `TITANICHTHYS_CANDIDATE_BUILD_OK`.

Outputs: `titanichthys-production-01.blend`, `titanichthys.glb`, `titanichthys.lod1.glb`, `titanichthys.json`, `candidate-report.json` and eighteen new maps under `export-textures/`. All are local candidate evidence. The production source retains the accepted zero-valued clay study; export duplicates strip that unused shape key. No new creature geometry is introduced.

Mandatory build results: exact geometry/topology/key/transform fingerprints match the approved input before and after; the90,430 semantic vertex records reproduce the approved gape-study coordinates within2e-6; normalized1–4 bone influences;25 real bones;18 distinct finite actions, stable root/no scales; seamless loops/recoveries except held Death; new LOD below40% of full triangles. LOD has the same skeleton/anchors, matching palette roles and filtered linear vertex pigment; only Idle/Swim/Death remain.

Texture budget is explicit: source maps preserved; body albedo4096, unchanged other albedo resolutions; body normal2048/roughness1024, fin normal at most1024/roughness512, eyes remain512. These candidate copies are used in both exports and portraits. Raw GLB byte sizes are reported. The25MB delivery gate remains mandatory after lossless packaging; this group does not perform public packaging or claim shipping-size approval.

Record all output hashes/bytes and success/failure. Stop on hash, scene, semantic correspondence, bake, export, rest-geometry, weights or LOD error. Preserve source and partial evidence.

## Group 2 — actual exported structure

Budget: 3 minutes. Run only after group1 completes successfully; reverify manifest first.

```sh
python3 -B /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/check_candidate_01.py
```

Writes fresh `export-structural-review.json`; expected `TITANICHTHYS_EXPORT_STRUCTURE_PASS`.

Checks full/LOD inverse binds and complete25-bone/5-anchor graph equality, exact nested anchor dictionaries and effector parents, normalized finite weights/attributes, five material palette roles, PBR full with white COLOR_0, texture-free LOD with nonuniform linear pigment and white factors, action names/durations/dynamic variation/uniqueness, root/scale policy, non-Death recovery/loop seams, actual exported terminal Death hold, and real jaw/skull/floor channels in Bite/Eat/Ability. Sampler hold checks evaluate LINEAR quaternion SLERP or STEP and correctly handle constant channels. This is structural validation, not animation/anatomy/eye approval.

## Group 3 — exact candidate portraits, poses and imported LOD

Budget: 30 minutes initially. Reverify manifest and output blend/GLB hashes first.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/render_candidate_01.py
```

Exactly21 PNGs: four portrait files at candidate root; eleven actual rig-pose views under `renders/` (Idle, Swim, TurnLeft, Bite, Eat, Heavy, Ability oral and side, Guard, Dodge, Death); four orbital directions; actual imported LOD oblique pigment and neutral-geometry views. Portrait sizes: select1600×1200 transparent, card800×600 transparent, thumb256×192 transparent, studio1600×1200. Pose/LOD images1400×1050. CPU2threads,48 denoised samples, exposure−0.35; oral lighting matches the accepted inspection setup. The renderer never saves a blend.

Expected21 `TITANICHTHYS_CANDIDATE_VIEW_OK` markers and `TITANICHTHYS_CANDIDATE_RENDER_OK`; `portrait-pose-manifest.json` checkpoints exact paths/hashes and poses. Return actual mouth Ability/Bite views, orbital directions, representative whole-form/Death and LOD comparisons to root/Astra. Root owns dispatch of subsequent runtime full-action playback and final actual-mesh eye/general audits after this completed candidate is frozen. No old eye audit transfers; conspicuous eyes remain an explicit unresolved gate until measured and visually reviewed.

## Author checks and stop boundary

Astra ran no Blender. Source ASTs passed. Pure specification checks passed for25 bones,90,430 semantic vertices, finite normalized≤4-influence head weights,18 distinct sampled trajectories, identity root, all non-Death loop/recovery endpoints and exact held Death. The exported-sampler helper passed constant-channel, linear translation, STEP terminal endpoint and quaternion SLERP cases. Approved clay04/material02 sources were reverified unchanged; candidate directory absent at freeze.

These checks do not predict visual deformation acceptance. Terra stops on any unexpected error, mismatch, output collision, failed structural requirement or need to alter source/thresholds/cameras. Preserve logs and partial files; do not silently repair or choose a new version. After outputs, only Astra/root actual-image and playback judgment can advance the candidate. No final material reduction, eye correction, rig tuning, extra renders, audits, public/Git/shared-state work or packaging is authorized by this handoff.
