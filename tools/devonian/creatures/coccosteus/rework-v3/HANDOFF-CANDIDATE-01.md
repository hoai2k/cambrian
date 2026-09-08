# Coccosteus production candidate-01 — frozen execution handoff

Astra high independently accepted material-04 for this production candidate stage; root also
accepted the same bounded gate. See review-material04-gate.md. Material, geometry and prior
candidates stay immutable. **The new bake/rig/GLBs/portraits have not run and are not approved.**
Parent assigns Terra medium. No source tuning, public/shared files, Git, packing or integration.

## Frozen inputs

Manifest: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/frozen-candidate-01.json`.
Manifest SHA-256: `136479902de636c03a4807bc755bef638f67aaebc20568012e4c15328df1439d`.
Verify this manifest hash and every listed input hash before each group. The Blender stages
also verify the complete manifest. A mismatch stops execution, never update the manifest to pass.

| Absolute input | SHA-256 |
| --- | --- |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/production_common_01.py` | `a034b809c683bcc974864f7fd19b51176552d45c9497f9b45d7fd6bc9370b9f1` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/bake_01.py` | `73b063d0bb112ee9a0175923bf75dddb9ae744d1f7f01319125245ea34ceb098` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/atlas_pigment_01.py` | `278a0597dd491309f8a0c5a1dd5c6bc89e29754425ec3dc4374fbc160eeb012f` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/rig_actions_01.py` | `ca1d7bec10dfaa3a40bdb48974cd88f8f105eca85a686a6d544436c2f2c0320b` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/candidate_01.py` | `b88c0fc4f2b9bf7566fc5bcc2568de8ce2166d95237d0cb32e8a3ca4ca975f92` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/export_patch_01.py` | `dc226b724856caeba0ddaaf6f5ef573bd0f4c93f1ecb36016aea80e80a20dc1f` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/render_candidate_01.py` | `60709269fe3b6ee763c5cd36b97429455110702a14ec94b99ba6121310d17574` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/check_candidate_01.py` | `bf4052460efa39489964986b8a872fafe8094c5e2f35ee8625aea8d2e716b19f` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/metadata_seed_01.json` | `142a66a0d5c26d030fa3144a2dcb6b7e1ef8f9dbff4e399392661db6f0aa2262` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/check_production_source_01.py` | `00294546065a2fabf9bf4d8f19debe2b5f7e4434ee2aac873e7e86b78dd910f2` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/clay-04.py` | `804d9932e9f3453aefc0a67b0aecdab4cb36491b2377b4839fbf7fe60605b0d3` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/check-clay04-source.py` | `bfa02e5d2bf3ad3fd8ca652c5849fe344b1c60e4627aab6d8533754bf401a8be` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/material-04/coccosteus-material-04.blend` | `2bd0d3da5ed2ad73801e200325b51f3c776989e027d01020e196838f10e633c9` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/material-04/material-report.json` | `d01c4be81cc558584fbf2bfe18508fa8b32ef1c16f6e5cbb7e55bf68d1becfad` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/material-04/render-manifest.json` | `a7165aa26944f98deac59ad760914ed79699f86e7bc8621f3215ba2436639481` |

CWD for all groups: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.
No candidate output exists yet. Each group has an exclusive new destination and refuses to
reuse its blend/report/directory. Record one group per WORKING_STATE.md entry: exact command,
Blender version, elapsed time, input and output bytes/hashes, all success checks and any error.
Verify each earlier group's generated report/files against recorded hashes before proceeding.

## Group 1 — bake accepted material-04 into PBR maps

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/bake_01.py
```

Expected exit zero and `COCCOSTEUS_BAKE_01_COMPLETE`. Budget 40 minutes.
Exclusive output: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/baked-01`.
Nine exact mesh families; 27 PNG maps, `coccosteus-baked-01.blend`, `bake-report.json`.
The body gets 4096 albedo, 2048 normal and 1024 roughness; each fin gets 1024 albedo and
512 normal/roughness; each eye gets separate 512 maps. This preserves asymmetry and pupil axes.

Dedicated atlas UVs leave every original coordinate/shape key/face/transform untouched. Albedo
and roughness bake from their actual shader inputs through emission; tangent normals bake
from the original normal branch. Specular/coat/IOR values are retained per original material.
Body/underside/oral palette slots share the same body atlas, retaining the original face colour.
No photo pixels or invented field replace the accepted surface.

The bake report must show `accepted_rest_geometry_unchanged: true`, nine geometric fingerprints,
27 finite nonempty image records and nine bounded nonwhite linear pigment records. Albedo PNGs
are independently decoded, then compared against Blender's raw decoder at 49 UV controls per
atlas (tolerance 2e-6). This catches orientation/colour-space errors independently of bake success.
Images and bake blend hashes become the exact generated inputs of Group 2. Actual visual fidelity
of the bake is still pending exported renders; do not call this material reapproval.

## Group 2 — real rig, all actions, full and texture-free LOD

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/candidate_01.py
```

Expected exit zero and `COCCOSTEUS_CANDIDATE_01_COMPLETE`. Budget 30 minutes.
Exclusive output: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/candidate-01`.
Expected `coccosteus-production-01.blend`, `coccosteus.glb`, `coccosteus.lod1.glb`,
`coccosteus.json`, `candidate-report.json`, `lod-pigment-transfer.json`.

Author decisions:

- 20 bones: stable root, rigid thoracic body, real skull/jaw, six sequential muscular tail
  sections, caudal/dorsal trim and two controls for each paired fin. The shield stays rigid;
  tail flex starts beyond its rear margin. Fins keep their buried roots and graded trim.
- Skull/jaw use the exact accepted pivots `(0,-.865,.245)` / `(0,-.99,-.224)` and rotations
  `-.041` / `.34` radians at full gape. Existing skull/jaw/body weights carry the one shared
  lip, palate, floor and throat. No new oral sheet, cap, mouth scale or independent corner fix.
- Both a mathematical comparison and actual Blender armature evaluation must reproduce the
  accepted GapeStudy endpoint (max coordinate error 2e-6 / 3e-6 respectively). The source blend
  retains study keys as evidence; export copies remove them. All production motion is in bones.
- 18 deliberately different actions: Idle, Swim, TurnLeft, TurnRight, Dive, Rise, Attack, Bite,
  Heavy, Hit, Death, Guard, Parry, Dodge, Eat, Stagger, Ability, Growth. All use 30 fps linear
  sampling. Purposeful tail effort, opposite turn banks/fin trims, jaw anticipation/closure,
  short ambush surge, feeding double pump, shield parry and held final death are authored.
  Root/scale stay fixed; all loops and non-death recoveries close. Death holds after phase .82.
- Mouth, swallow and primary-contact anchors follow real jaw/skull bones and carry version-1
  cambrianAnchor metadata. Their world-space bind positions are authored in rig_actions_01.py.
- Full export carries embedded PBR maps and white COLOR_0. LOD uses .25 body, .70 eye and .24 fin
  decimation ratios and must remain below .40 of full triangles, with the same bones/binds/anchors.
  LOD retains Idle, Swim, Death only and uses texture-free linear vertex pigment.

**Measured decimation issue incorporated:** another candidate produced red values down to
-0.042 after colour-attribute interpolation, so this source never sends authored pigment through
Blender's decimator. It reduces geometry with neutral white Color, checks that neutral stage,
then samples the accepted albedo at the FINAL LOD UVs. A positive 3x3 kernel averages in linear
light (body UV radius .0022, fins .0008, eyes zero). No negative colour clamp or relaxed pigment
threshold conceals interpolation errors. The atlas sampler's edge extension follows the mapped
material and does not clamp colour values.

`lod-pigment-transfer.json` must record dense sampled pigment, pre/post-decimation neutral
statistics and final UV-sampled pigment, including RGBA extrema/invalid counts. Final colour
must be finite, nonnegative, <=1.00001, nonwhite (RGB max <.75) and have RGB range >.005.
Exact POSITION+UV correspondence transfers only existing exported COLOR_0 bytes when required;
all other GLB bytes must remain unchanged during that transfer. Geometry/weights/animations
are never repaired by this utility. This is source-authored plumbing, not a claim it has run.

## Group 3 — read actual full/LOD exports structurally

```sh
/usr/bin/python3 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/check_candidate_01.py
```

Expected exit zero and `COCCOSTEUS_EXPORT_STRUCTURE_PASS`. Budget 5 minutes.
Writes only `candidate-01/export-structural-review.json`. Must confirm all 18 distinct full
clips with matching durations and dynamic skull/jaw channels, three reduced clips, finite
attributes, normalized weights, stable root/no scale animation, matched skeleton/bind/anchor
graphs, three anchor parents, five palette roles, full textures and nonwhite texture-free LOD.
Raw bytes are reported; final lossless packaging and the packaged size gate are later work.

## Group 4 — four portraits from the actual full GLB

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/render_candidate_01.py -- --group portraits
```

Expected exit zero and `COCCOSTEUS_CANDIDATE_PORTRAITS_COMPLETE`. Budget 20 minutes.
Four new outputs in candidate-01: `coccosteus.select.png` (1600x1200 transparent),
`coccosteus.card.png` (800x600 transparent), `coccosteus.thumb.png` (256x192 transparent),
`coccosteus.png` (1600x1200 studio). Manifest: `portrait-evidence/manifest.json`.
The renderer loads the exact exported GLB after clearing source meshes/actions; no source-blend
appearance substitutes for the export. Same accepted studio lights, CPU 2, Cycles 48 samples,
seed 71204. The GLB hash, imported action/frame and camera are recorded per image.

## Group 5 — actual full/LOD material and rig review views

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/render_candidate_01.py -- --group review
```

Expected exit zero and `COCCOSTEUS_CANDIDATE_REVIEW_COMPLETE`. Budget 35 minutes.
17 new views and complete `pose-evidence/manifest.json`: four rest body views and armour close,
Heavy open mouth, Eat front, closing Bite, Swim, TurnLeft, Dodge, Death, two orbit angles,
actual LOD oblique/Swim and neutral LOD geometry. These use actual imported GLB actions.
An extra oral-fill setting is explicitly recorded for inspection views. No render edits the
saved production/bake blends, procedural source, metadata or other candidate evidence.

Return every actual image path and complete manifests plus all blend/GLB/report hashes to Astra.
Do not rerun a successful group. Partial/error evidence stays where it was written.

## Acceptance and stops

Astra must compare actual exported rest/armour views to material-04: unchanged plate silhouette,
subordinate fine pigment and visible sutures, correct eyes, posterior bars/rays, no white/pale
LOD or double-multiplied colour. Inspect all posed oral views for a continuous lip/cup/floor,
no sheet crossing or detached throat. Check fin roots, torso rigidity, tail shape, LOD silhouette
and all four portrait framings. Source/static or structural passes do not establish appearance.

Static source-only checks PASS: 20 bones, 18 distinct dynamic action signatures sampled at 101
phases, stable root/no authored scale, exact recoveries, held death, bounded .34-radian gape;
300 normalized axial weight samples; independent PNG/bilinear/linear-light checks. The accepted
clay topology passed rotational LBS at five gapes (465 centreline, 480 wall-containment and 200
vertical-section checks), not merely linear study-key interpolation. These are source-level
checks. Blender APIs, actual baked/rig/export results and all final audits remain unverified.
Static report: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/production-01-static-report.json`.

Stop on changed hash, an existing output, command/API error, timeout, failed digest, missing map,
invalid pigment, failed correspondence, changed geometry or any required visual decision. Return
exact errors to Astra; no executor source/material/threshold/camera modifications or clamping.
Budget totals 130 minutes across five bounded groups, one state entry per group. Production
approval, actual browser playback, full/LOD final eye/oral/general audits, palette validation,
packaging, integration, shared docs and Git are later gates. End this handoff at actual evidence.
