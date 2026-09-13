# Furcaster frozen initial-preview handoff — 2026-09-07

## Status and ownership

Complete initial preview, frozen for parent packaging/viewer integration/publication. Only tools/devonian/creatures/furcaster and ../devonian-authoring/furcaster were edited. No public/shared/git edits. All prior creatures remain frozen. No older Furcaster public model existed at intake.

Seven delivery files in `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/furcaster/v1/candidate/`: full/LOD GLBs, four matching PNGs and metadata (`artStatus: preview`). Original packed Blender v1/furcaster.blend; preserved initial clay v1/furcaster-clay.blend; source snapshot v1/source. Original imagegen art and PBR maps/provenance preserved in source directory. Do not overwrite after parent packaging without coordination.

## Counts and hashes

- Full 227,096 triangles, 147,706 vertices, 27,450,768 bytes raw. SHA256 `ef3111da7de76e59a4167f8a07e08c70cad950412a16e7c9c9d5a5284cfd6f0b`.
- LOD 59,222 triangles (26.08%), 53,559 vertices, 5,668,344 bytes. SHA256 `449ed9fd684de4bc349faea55b6629228729a119cc2eeeb18d35387b64d86b79`.
- Same 188-bone graph: root/disc, five 36-joint arm chains, five mouth-angle bones and oral pump. Nineteen full clips; four LOD Idle/Swim/Crawl/Death. Three nested v1 anchors at actual ventral mouth, inner chamber and leading-arm contact. Root stable, normalized nonzero weights, no scale tracks, finite and distinct clip motion, designated loops seamless. Oral pump translations verified in Attack/Bite/Heavy/Eat. See validation.json, skeleton-graph.json and delivery.json.
- Full uses white COLOR_0 with original UV albedo/normal/roughness; LOD is texture-free with baked linear pigment. Raw full exceeds25MB; parent handles lossless packaging.

## Anatomy and review

Independent F. palaeozoicus model informed by primary micro-CT arm specimen OKL96, Clark et al.2020 Fig3c and section3.5 (directly inspected). Five long arms with opposed paired ambulacrals, curved lateral ossicles, fine external/groove spines, narrow flexible integument; small granular disc and modeled ventral oral chamber. No macroscopic eye globes; eye-volume criterion is anatomically not applicable. No fish jaw or arthropod moulting.

Final actual-GLB full views in v1/review-export-full: dorsal, side, three-quarter, arm detail, directly lit oral and ventral disc, Crawl/Swim/Bite/Eat/Heavy/Guard/Ability/Dodge/Death. Actual LOD locomotion and Death inspected. Fifteen sequential Crawl/Heavy/Ability frames show independently phased arms, gathering/contact and recovery without detached arm bases. Final review uses verified Blender EEVEE PBR, avoiding unusually slow host Cycles rendering. Portraits1600×1200 selection,800×600card,256×192thumb,1200×900studio all match same final source. Contact sheets v1/preview-review.jpg and sequence-review.jpg.

## Explicit preview limits

Disc granulation is uneven and simplified; much paired ambulacral relief remains under living tissue. Fine arm/disc-root sculpting, exact spine/posture/ossicle comparison, precise fivefold oral frame and complete multi-arm collision/transition clearance remain refinement work. Selected arm CT does not resolve exact disc tissue/podia/oral anatomy.36 sections per arm and chosen spine counts are production interpretations, not measured fossil counts. Living pigment is artistic. Swim is compatibility sculling, not known habitual behavior; Growth is unscaled. Representative12cm span is illustrative, not species maximum.

## Reproduction

README.md gives commands. materials.py → Blender build.py → validate.py → render.py FUR_IMPORT=full/lod with FUR_RENDER=preview/lod/portrait/sequence → finish.py. build.py FUR_CLAY=1 produces clay only; texture_export.py applies PBR and exports from a reviewed source without rebuilding anatomy. Renderer defaults to BLENDER_EEVEE; optional FUR_ENGINE=CYCLES. Blender /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2; host requires escalation to avoid sandbox Metal crash.

All final logs have completion markers: /tmp/furcaster-export.log, /tmp/furcaster-final-review.log, /tmp/furcaster-final-lod.log, /tmp/furcaster-final-portrait.log, /tmp/furcaster-final-sequence.log. Source, ledgers and review evidence are saved. No production process remains running.
