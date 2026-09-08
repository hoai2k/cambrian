# Bothriolepis V3 working state

## 2026-09-08 00:31:04 UTC — bothriolepis — MATERIAL01 frozen; user pause

- Owner/model: Astra high. Status: candidate-ready source, execution deferred
  because the user asked to save current refinements for later. **Do not run
  Blender or start another phase now.** Root owns the source commit/pause.
- Coarse verdict: independently inspected all seven clay02 images and accepted
  the bounded geometry gate on blend SHA-256
  `55ca3b38a1de698a9e788ca9f76ab576476aa28785c84380754d27ebcbecc84b` and inventory
  `3d1f7511578f67e4ab1e0bbab5f766e77416f6bc7db0dad9549b9481dfca84e2`.
  Full silhouettes, root attachment and actual oral recess improved sufficiently.
  This is not final appearance/rig/export or general-audit approval.
- Decision: MATERIAL01 opens that exact blend. Fourteen explicit anatomical
  suture paths drive bounded physical relief, pigment and packed normal/roughness
  maps. Warm brown-olive armor, quiet scaleless posterior, square rayless dorsal,
  lateral broad pectorals, protected root/oral/eye boundaries. One inspected
  original ImageGen dermal source contributes only +/-2.5% color and 0.00075
  height; original file and exact prompt saved under `material01-inputs/`.
- Frozen manifest:
  `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/bothriolepis/rework-v3/frozen-inputs-material01.json`
  SHA-256 `bcc10b7f9d4082a89735b5624cedd7248ff80f1353ed012149d009daa919b0d4`.
  Ten input hashes cover accepted clay/source, new builder/fields/executor,
  verdict, original texture/provenance, clay inventory and primary PDF.
- Builder SHA-256 `13f43ff595ffb1cd03de6858bb86d87dd8563493a03bf904e88055815887da80`.
  Field-source SHA-256 `83318292f9d2dc238cf2605e5e4de6acdbad6f52097df6755960b6b88b88a36f`.
- Actual preflight: all three Python sources AST-parse; sampled material fields
  finite; 14 paths; max sampled actual-relief field 0.004143 units; ImageGen
  color contribution <=2.5%; roughness 0.5300–0.6340 before microdetail variation.
  Accepted clay blend hash verified. Report:
  `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/bothriolepis/rework-v3/material01-source-preflight.json`.
  Blender execution/render has **not** run; this is a source-only PASS.
- Resume only after user resumes: Terra medium, CWD
  `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`, run once:

  ```sh
  /usr/bin/python3 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/bothriolepis/rework-v3/execute_material01.py --run-frozen-material01
  ```

- Expected new local outputs: `rework-v3/material01/bothriolepis-material01.blend`,
  eight review PNGs, six 1536x1024 packed/standalone PBR maps, source report,
  SHA-256 inventory and execution log. Two CPU threads; 32 samples per render.
- Dependencies: Blender at `/Applications/Blender.app/Contents/MacOS/Blender`
  with its NumPy; `/usr/bin/python3` executor; the ten existing frozen inputs.
  No ImageGen regeneration, additional research, rig or package step is needed
  before this exact deferred render group.
- Remaining art criteria: visible anatomy-bound plate structure at normal size;
  convincing shallow bony relief in `08-armour-detail`; subtle tuberculation
  that does not become gravel or hide sutures; brown-olive armor and quiet
  scaleless posterior; unchanged square dorsal/pectoral silhouette; no mouth
  mask, UV streaks, bright unrelated joint bands or changed eye/root relationship.
  Inspect all eight actual images, then issue a hash-bound material verdict.
- Further dependencies after MATERIAL01 acceptance: fine pectoral marginal
  denticle silhouette review, production rig (approximately 28 appropriate joints),
  18 authored actions/anchors, full/LOD/portraits, then new geometry-specific eye,
  attachment, motion and export audits. None is begun or approved by this gate.
- Stop condition after resumption: mismatch/existing material01 blend/error or
  missing inventory; preserve evidence and return without changing source,
  threshold or candidate directory. Existing models remain preserved/playable
  previews; no public, shared-state or Git edit was made by this author.
- Detailed verdict and handoff: `clay02-verdict-material01-handoff.md`.

## 2026-09-08 00:03:16 UTC — bothriolepis — clay01 reviewed, clay02 frozen

- Owner/model: Astra high; Terra medium executes the new group through root.
- Status: candidate-ready. Clay01 returned for bounded source correction;
  clay02 source is frozen but has not been built/rendered by this author.
- Actual reviewed clay01 blend: local `rework-v3/clay01/bothriolepis-clay01.blend`,
  SHA-256 `880c1268ca2a02079bab14288fc4d163e640c1ea10034d0f1cf1aaaf548c3b22`.
  Inventory SHA-256 `ab922e535b869b5597fca6bab7213d77923fa248d745973d85ac264742a7487a`.
  All six actual images independently inspected. Main volumes/proportions and
  pectoral orientation retained; no approval for later phases.
- Diagnosis: dorsal/underside cropped due orthographic aspect handling. Clay01
  root bridge quads twist (minimum triangle-normal dot -0.175521). Mouth really
  is recessed by ~0.10 at its center; the bright shallow funnel and rectangular
  tissue material boundary create a convex-plug illusion. Source ray evidence
  saved as local `rework-v3/clay01-depth-and-root-diagnosis.json`.
- Decision: tangent-matched 16-interval continuous root transition; deeper
  posterior-bending vestibule and no exterior rectangular tissue-colored band;
  smoothly introduced tail-section compression; projected-geometry camera fit
  with at least 6.5% margin; five full-body plus two oral close/depth views.
- Frozen input manifest:
  `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/bothriolepis/rework-v3/frozen-inputs-clay02.json`,
  SHA-256 `9a031f44774a2c047c11aaa5d76f92c718a3245839681ba3623b0afd954fd774`.
  Seven absolute input paths/hashes include new geometry, builder, executor,
  review brief, reference PDF, user image and clay01 output inventory.
- Geometry SHA-256 `cf5fa0dcecfa3cfd88d4b644785b939596cd0e98027108f057f543a53e169133`.
  Builder SHA-256 `23fcd249334a62f053c900138f2b0f298c18a9256b4355f2ba947b8abd68f6e2`.
- Execution CWD:
  `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.
- Next exact command (Terra only):

  ```sh
  /usr/bin/python3 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/bothriolepis/rework-v3/execute_clay02.py --run-frozen-clay02
  ```

- Expected outputs under local `rework-v3/clay02/`: new blend, seven PNGs,
  `source-check.json`, `outputs-sha256.json`, `execution.log`. No old file replaced.
- Actual source checks: AST parse PASS; 55,802 vertices, 56,104 faces, 111,600
  triangles; one connected closed orientable surface; Euler 2; every edge used
  twice; minimum triangle area 3.18932e-8. Root transition minimum quad triangle
  normal dot 0.788655; oral-open minimum normal dot 0.855227. Numerical report is
  local `rework-v3/source-numerical-check-clay02.json`.
- Acceptance/remaining risks: inspect all seven new images against
  `review-clay01-and-clay02-handoff.md`. Root must lose fan pinches without becoming
  a bulky collar; mouth must read as a real recess from both views; full-body
  framing must include the nose and tail with margin. Numerical checks cannot
  establish art acceptance or intersection freedom on their own.
- Resource: bounded correction complete; one two-thread Blender group with seven
  1100x880, 24-sample renders is next. No Blender launched by Astra.
- Stop condition: changed hash, existing clay02 blend, unexpected error or missing
  manifest. Preserve evidence and return; do not change source or directory.
- Resume from: exact executor command, then return actual images and hashes for
  the coarse gate. No materials, production rig/actions, GLBs, public edits,
  Git or general audits until explicitly accepted by Astra/root.

## 2026-09-07 23:50:36 UTC — bothriolepis — first clay frozen handoff

- Owner/model: Astra high; execution reserved for Terra medium assigned by root.
- Status: candidate-ready (source frozen; no Blender build/render has been run).
- Decision: complete new clay anatomy with a pentagonal bulky shield, steep
  cephalic roof, shared-boundary pectorals projecting outward/backward/downward,
  actual ventral mouth/cavity, scaleless posterior and square rayless dorsal.
  Primary figures 2, 3, 5 and 7 were inspected against the user's image. Fine
  relief/material/rig/actions remain later work after actual clay acceptance.
- Scope: only this script directory and
  `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/bothriolepis/rework-v3/`.
  Existing sources, GLBs and public family are preserved. No Git or shared docs edits.
- Frozen inputs and full SHA-256 values:
  `frozen-inputs-clay01.json` records six absolute inputs (geometry, builder,
  executor, anatomy brief, primary PDF and user image). The executor verifies
  every value before launching Blender.
  Manifest SHA-256: `c77aae90d34c29d04c2a8c0c8422e8309e319aae07dbb7ccd14d361a73f99cdc`.
- Geometry input:
  `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/bothriolepis/rework-v3/geometry_clay01.py`
  SHA-256 `3a5c1b6e1ba8092fe1ffd9c58e11c0127e2b034210f721173be2e1c624d148c4`.
- Builder input:
  `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/bothriolepis/rework-v3/build_clay01.py`
  SHA-256 `4061aaf623bbac30acedfb1157a0b662c53022c1ae481f651eb720c906b75ccd`.
- Execution CWD:
  `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.
- Next exact command (Terra only):

  ```sh
  /usr/bin/python3 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/bothriolepis/rework-v3/execute_clay01.py --run-frozen-clay01
  ```

- Expected outputs under local `rework-v3/clay01/`: `bothriolepis-clay01.blend`,
  `01-front.png`, `02-side.png`, `03-dorsal.png`, `04-oblique.png`,
  `05-underside.png`, `06-mouth-open.png`, `source-check.json`,
  `outputs-sha256.json`, `execution.log`.
- Actual validations: Python AST parse PASS; pure-source geometry PASS, 55,366
  used vertices / 55,680 faces / 110,728 triangles; exactly one connected closed
  orientable surface, every edge used twice, Euler characteristic 2, no collapsed
  triangle (minimum area 3.18932e-8). The local oral-opening study has minimum
  original/deformed triangle-normal dot 0.8552. These are source checks only.
  Report: local `rework-v3/source-numerical-check-clay01.json`.
- Pending geometry risks: pectoral root transition pinching, proximal blade
  orientation, abrupt posterior crest release, oral-annulus shape, flexible-tail
  volume and overly uniform seam interpretation. Inspect actual images; no art
  approval is inferred from topology PASS.
- Acceptance: six-view criteria in `anatomy-brief-clay01.md`; Astra must return a
  verdict bound to the output manifest before any later phase.
- Resource: one bounded preproduction/source phase complete; one two-thread
  Blender execution plus six 1100x880 24-sample clay views authorized next.
- Stop condition: hash mismatch, existing clay01 blend, unexpected Blender error
  or missing output manifest. Preserve log/evidence and return to Astra. Do not
  edit sources or choose a new candidate directory.
- Resume from: run the exact executor command once, return output manifest and
  all six image paths to the author for clay review. No GLBs, package, production
  rig, general audit or public edit is part of this command group.
