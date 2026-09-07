# Status update — handed off, frozen

User changed priority to complete initial versions for every subject before further
refinement. Rhinodipterus is ready for parent preview integration. The already-running
render job finished at the handoff boundary: all25 full renders, five profile views,
three LOD poses and four portraits are complete. `delivery-v2.py` passed and wrote
`delivery-v2.json`; exact full/LOD/blend hashes below remain unchanged. Full/LOD Idle
and Death plus final closing were checked; no further modelling or render work is
running. Deferred work is any future gameplay/viewer-driven refinement, not an incomplete
asset family. Parent owns preview label, independent viewer integration and main commit.
The detailed checkpoint below is retained as provenance; its running/pending section
is superseded by this completion note. Author proceeds to Jaekelopterus separately.

# Rhinodipterus V2 durable checkpoint

Updated 2026-09-07. This task owns only `tools/devonian/creatures/rhinodipterus/`
and `../devonian-authoring/rhinodipterus/`. No public assets, shared files or git
operations were performed. Parent integrates, packages, checks the real viewer and
commits to main. Parent reports main `09591be` contains nine reviewed creatures and
the texture-aware palette fix. Rhinodipterus is the next approved local candidate.

## Frozen model — do not rebuild

Parent approved full profile, gape profile, opposite gape and closing geometry after
several close-up corrections. The model and source blend are fixed. Remaining work
is final evidence rendering and formal delivery manifest, not further anatomy edits.

Authoring directory:
`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/rhinodipterus/`

Candidate folder: `v2-candidate/`, seven files `rhinodipterus{.glb,.lod1.glb,.json,.png,.select.png,.card.png,.thumb.png}`.

- Full SHA-256: `ad29e4157364b09cf20716d00982d9ae13f4e9566db0f1d72e9fa96230f6c97c`
- Full: 14,875,052 bytes, 216,511 triangles, 21 joints, 18 clips, 3 anchors, 9 textures.
- LOD SHA-256: `56d4a9218027ce7ca2440c4cefc36ae4e9262e403a1706d3bfb30a84a76483f9`
- LOD: 2,295,480 bytes, 57,751 triangles (26.67%), matching 21 joints / 3 anchors, Idle/Swim/Death, zero textures.
- Original `rhinodipterus-v2.blend` SHA-256: `b89773bc803ffafa7a33075ced850fd274e68814bb2e01913384b284ac201a69`, 11,289,023 bytes.
- V1 source, all seven original assets and original Blender files preserved in `v1/` with `manifest.json` before editing.

## Completed / reviewed

- Bespoke long-snouted cranial planes and body proportions. Main reference Clement2012
  Figure7; full body outline explicitly comparative (R.ulrichi), not a complete Gogo fossil.
- Continuous rounded rostral exterior, shallow mandibular rami, genuine palate,
  cheek lining, recessed pharynx and paired upper seven-row / lower six-row rounded
  grinding plates. Jaw stays under 15 degrees; no invented crushing predator bite.
- Removed exposed anterior lining tube, posterior throat/body annulus flange and
  rear oral-coloured exterior panel. Blended cheek material/normals into skull.
- Individually authored cosmine, scale-field and fin UV albedo/normal/roughness maps;
  imagegen source/prompt/provenance preserved. Exact source vertex colours restored
  per material primitive, avoiding cross-material interpolation streaks. LOD bakes
  albedo once into pigment. No double colour multiplication.
- Leaf-like fleshy paired fins with tapered/cambered roots, body-fitted median fins,
  independent fin-tip lag and posterior travelling waves.
- All18 individual actions run in actual Three.js; finite transforms, stable root,
  no errors, exact midpoint pose screenshots, recorded `motion-review-v2.webm`.
  `playback-validation-v2.json` in authoring folder is final. Source-copy report will
  be refreshed by delivery script because the last run improved capture timing.
- `validation.json` proves clips, normalized weights, finite bounds, distinct motion,
  loop seams, root, sockets and real LOD reduction.
- Final actual full/LOD eye audits: full 83.2825% / 83.1142%; LOD83.3242% /83.1636%.
  All conservative 95% lower bounds >82.8%; closed head envelopes, zero nonmanifold
  edges, no temporary caps. `eye-audit-full-v2.json` / `eye-audit-lod-v2.json` match
  the frozen GLB hashes. Actual globe volume sampling, decorative lids excluded.
- `attachment-validation-v2.json` evaluates actual skinned paired-fin root vertices
  at seven phases of all18 full / all3 LOD actions. All sampled points remain inside;
  worst signed outward distances -0.014037 full / -0.014297 LOD.
- Parent approved `full-profile-v2.png`, `gape-profile-v2.png`,
  `gape-opposite-v2.png`, `closing-opposite-v2.png`. All in hash directory
  `review-ad29e4157364/`; `profile-validation-v2.json` records these plus lit frontal
  maximum gape. All use 30fps, Heavy frame12 (actual near-maximum gape).
- Four final portrait sizes have already rendered and been checked:
  studio/select1600x1200, card800x600, thumb256x192.
- Final full action poses Idle, Swim, Bite, Eat, Heavy, Ability, Guard, Dodge,
  Death and TurnLeft have rendered. Reviewed Swim/Bite/Heavy/Guard/Dodge/Death/TurnLeft
  and all18 exact Three poses. Remaining eye/mouth close-ups will finish below.
- All Python source files parsed via in-memory compile; no code changes needed.

## Active job and remaining work

Active exec session **80342** runs a sequential pipeline:

1. `render-v2.py -- --preview --profile-only` — COMPLETE, approved, hash-bound.
2. `render-v2.py` — RUNNING final 64-sample full GLB batch. Writes all four portraits,
   ten action poses, four eye angles, six mouth views and opposite Death. Progress in
   `render-final-v2.log`; outputs copied into authoring aliases and frozen hash folder.
   On completion writes source `render-validation-v2.json`.
3. `render-lod-v2.py` — QUEUED, final actual LOD Idle/Swim/Death, source hash-bound
   `render-validation-lod-v2.json`. Log `render-lod-v2.log`.

The first full portrait took about2min; later1000x750 poses generally15–65sec. Keep
waiting/reviewing; do not restart completed modelling. Metal GPU preview stalled in
Apple's shader compiler. The two exact known preview PIDs were stopped; rendering
uses reliable CPU Cycles. `--metal` is optional only, not the default. Diagnostic
stack/logs remain locally; no system or user GPU settings were saved/changed.

To resume after a process interruption, first inspect logs and verify source hashes.
The rendering commands below never modify the frozen GLBs or blend. They can safely
regenerate evidence from the exact candidate if the active job has stopped:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/rhinodipterus/render-v2.py
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/rhinodipterus/render-lod-v2.py
python3 tools/devonian/creatures/rhinodipterus/delivery-v2.py
```

Blender requires host Metal access even for startup, so shell tools have used approved
`require_escalated` calls, always with `--background --threads 2`.

After the batch finishes:

1. Inspect all four final eye close-ups; confirm no exposed concave globe backside.
2. Inspect final lit mouth gape/closing/rest/eat and both oblique attachments, plus
   all3 LOD poses. Any new actual defect requires reopening geometry review; do not
   silently accept one to preserve hashes.
3. Run `delivery-v2.py`. It verifies full/LOD/report hashes, all portrait dimensions,
   every render image hash,18 actual Three clips/video, full/LOD eye passes and
   all-action root immersion. It copies final eye/playback reports into source,
   makes the final action contact sheet and writes `delivery-v2.json`.
4. Inspect the delivery report and update this checkpoint to complete. Parent gets
   candidate path, exact full/LOD/blend hashes, report paths and clear frozen handoff.
   Parent performs independent viewer/palette validation, public promotion and main commit.

Do not touch frozen Coccosteus, Bothriolepis, Dunkleosteus or other agents' assets.

Progress update: all four final eye close-ups are rendered and visually checked, plus
the final lit maximum gape. Remaining full renders: closing/rest/eat, both oblique
mouth views and opposite Death; then three LOD poses and delivery verification.
Frozen full/LOD/blend hashes remain unchanged.
