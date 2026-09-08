# Active refinement checkpoint — 8 September 2026

The user resumed work and will say when to tie up. **Work remains active.** Save sources, evidence and checkpoints frequently. Do not infer a new pause from the earlier end-of-day request.

## Current priority and exact restart points

1. **Titanichthys release08 — published refined preview, mainbc5a2d0.** Final combined full/LOD Ability front and oblique views plus select portrait inspected by root. Oral lining continuous; eye placement accepted. Packaged full21,955,988B SHA256 `de056f4d2af273e5a2c279a2727158d285f20f97db2790729f4580b74ac89ef9`; LOD2,365,892B `d99b2060c89ac1caa23ec9613c9de3b82c9604dc5669d54386d42e93f611f1a7`. Both retain18 clips,25 bones, five anchors. Actual full/LOD Bind+Ability eye lower95% bounds60.32–61.68%, zero uncertain rays; all58 actual oral poses pass. Editable production08.blend and four fresh portraits complete. Featureadf2847 merged mainbc5a2d0 and both pushed. Selected intake, catalogue, sizes, typecheck and build passed. Root viewer checks passed Idle/Ability/Bite/Eat/Death; see release art verdict. Shoal Sea-Green washes out, queued for polish. Read `tools/devonian/creatures/titanichthys/rework-v3/RELEASE-CANDIDATE08-EXECUTION.md` and `RELEASE08-ART-VERDICT.md` for exact hashes and acceptance limits. Local output `../devonian-authoring/titanichthys/rework-v3/release-candidate08/`. Old public seven files plus anchor spec backed up and hash-verified in `../devonian-authoring/backups/titanichthys-pre-v3-2026-09-08/`. Remains preview for LOD eye-rim/surface polish, controller playtest and L01 illustration refresh.
2. **Coccosteus LOD05 held; targeted correction being authored by Astra high.** Accepted full04 and bake03 unchanged. Candidate05 preserves18/18 actions,20 bones, three anchors,58,468 triangles (38.5% of full), exact4,096 oral triangles. Build/check passed;11 actual matched views and six emission/neutral diagnostic views reviewed. Pigment aliasing causes broad armor wrinkles and fin chevrons; neutral mesh is substantially smoother. Next pure LOD plan filters fine grain by footprint and connects matching ray/plate features across stations, retaining40% triangle budget. Do not publish05. Four split mouth vertices have a72-degree normal deviation and remain separately tracked. Restart `tools/devonian/creatures/coccosteus/rework-v3/WORKING_STATE.md`, `review-candidate05-actual.md`, `HANDOFF-LOD05-FIELDS-01.md`. Field diagnostic frozen182 inputs verified unchanged before/after execution. Connected-feature LOD07 frozen and Terra executing: HANDOFF-LOD-07.md,207inputs SHA58a67b430259bd10a73e0079101318b6e83d81b8b827818b4744fbecc8247b56. Plan59,194triangles, exactprotectedmouth; targeted seamUV/fourlipnormal repair. Six actualLODviews pending. 05/field sources saved in553366c, now main385d972.
3. **Bothriolepis targeted candidate04 authoring assigned to Astra high.** Material04 now executed: all44frozeninputs intact, nine actual images and editableblend complete. Astra reviewing before rig stage. Material03 was held for uniformly pale flat shield, forehead seam and angular oral transition. Read its rework-v3 state and preserved reference. Correct sculpt/material locally while preserving bulky armor and outward/back curved appendages; freeze routine build/render handoff. No public changes yet.
4. **Odaraia, Doryaspis, Stethacanthus complete reworks.** Odaraia material02 coarse appearance accepted after six matched dark/light views; reduced glass glare and cuticular pigment now read better. Read root-review-material02.md. Production rig/all18actions/baking/fullLOD/anchors and real alpha sorting remain; retain bright corneal-edge and rigid limb-fan concerns for that stage. Doryaspis clay01 held for mouth presentation, jagged rim and abrupt roots; reconcile orientation/anatomy with user request before moving oral geometry. Stethacanthus shark silhouette and same-colored anvil queued. Per-creature rework-v3 states retain exact failures and reference paths.
5. **Next individual references:** Tiktaalik (rounder arrow snout, deeper body), Onychodus (lower tooth whorl and facial armor), Rhinodipterus, Cheirolepis, Cladoselache, Nahecaris and remaining roster requests. Read `docs/devonian/refinement-queue.md`; Onychodus has an anatomy brief but no new clay. All21 Devonian models retain preview while pending.
6. **Attack/eating passes:**19 remain after Michelinoceras, from20 total entries across12 Cambrian/8 Devonian creatures. Nautiloid tentacle flare/whip; arthropod articulated insect/spider strikes; Furcaster multi-arm grasp and transfer to underside mouth. Include actual prey/anchor behavior. See `docs/attack-feeding-refinement.md` and `tools/attack-feeding-refinements.json`. All12 pending Cambrian models retain preview.
7. **General audits after each complete rework.** Eye containment, mouth/limb collision, dynamic all-action review, anchors, LOD/palette transitions and controller playtests. Do not waste broad audits on models awaiting replacement.

## Delivered today

- **Michelinoceras motion preview**: published main8730c96, ownac16d82. Articulated
  flare, whip and feeding basket, real authored grasp runtime and prey attachment
  handoff. Full19/LOD7 actions,166 joints,13 sockets. Sixty art views and12 production
  runtime/prey scenarios passed; viewer Eat reach/basket/closed-crown inspected.
  Controller playtest and broader creature refinement remain. Source handoff:
  `tools/devonian/creatures/michelinoceras/motion-v3/RUNTIME_HANDOFF.md`.
- **Dunkleosteus face preview**: published main0cde60f, own379377d. Candidate03 head,
  brow, cheeks and sculpted gnathals, with pigment04 LOD binding repair. Working jaw,
  mouth lining and anchors preserved. Full18.29MB/LOD2.37MB,18 actions each,3 sockets.
  Both actual exported models passed173 feeding poses with zero opposing-shell or
  gnathal penetration, and conservative eye containment above86%. All20 family
  images reviewed; eight LOD images rerendered after repair. Viewer Idle and Heavy
  at0.4667s inspected. **Still preview:** LOD looks paler/smoother; investigate
  encoded-albedo values baked into linear vertex colors before claiming material
  parity. Head/gnathal improvement is accepted, not whole-creature final approval.
  `tools/devonian/creatures/dunkleosteus/face-v4/WORKING_STATE.md` and
  `focused-face-verdict.md` hold exact provenance and limitations.
- **Gemuendina terminal-snout preview, candidate05**: published on main885a08a. The user rejected candidate02/main0b639d0 because the mouth still
  read as a top opening. Latest requirement: the leading front flap itself forms
  upper/lower lips of a terminal snout; closer-set eyes immediately above it, like
  nostril positions. Candidate05 fulfills that direction and preserves the liked
  V3 posterior silhouette/pigmentation. Root studies03/04 had a ventral fold and
  were rejected. Dedicated Astra study05 fixed it with separate upper/lower/belly
  profiles and a new oral cavity. Full16,412,316B/LOD2,868,160B,18 actions each,
 28 bones and3 sockets. Ten actual full/LOD poses pass: measured eye interior
  minimum75.1335%, conservative lower95%74.3516%; minimum sampled mouth-to-swallow
  corridor clearance0.0072873, maximum denticle contact distance0.0037863.
  All12 exported views and four portraits inspected by the artist; root inspected
  side, Heavy front, LOD Heavy side and select portrait. **Still preview:** small
  LOD chin/cheek creases, fine pigment and broader controller/art polish.
  `tools/devonian/creatures/gemuendina/face-v4/TERMINAL_SNOUT_STATE.md`,
  `author-review-05.json` and `release-review-05.json` are the restart entry points.

All21 initial Devonian creatures and all initial non-creature assets were already
on main before this block. Non-creatures mainf7b5618:47 plants/props with LODs and
portraits,11 runtime proxies,9 biome paintings,29 scenery boards,9 regional boards,
3 lighting concepts,10 material sets,2 atmosphere atlases and2 scale plates. The
user was separately notified. Refresh dependent scale/lighting illustrations after
Titanichthys/Coccosteus replacements are accepted.


## Active small material correction

Dunkleosteus LOD encoded-sRGB vertex colors confirmed by exact source/PNG comparisons. Frozen HANDOFF-LINEAR05.md converts RGB only, preserves alpha and all other bytes, and renders four matched actual full/LOD views. Terra medium executing after Odaraia02. Four actual full/LOD views accepted: tones now substantially closer; roughness/normal/detail differences remain. PublicLOD and metadata copied; selected intake/typecheck/build PASS, commit/main pending. NewLOD c639770bd1b612cb7747856d38cd5b748d2671b10fdf6998dda4450db223c5f5. Full and four portraits unchanged.

## Repo and working rules

Worktree `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`, branch `devonian-assets`; main worktree `../devonian-publish`. At resume main885a08a; source checkpoints b5ae6ea and d86ba5c on feature. Read current git log for subsequent release commits. Fetch and merge concurrent origin/main before integrating; no force push. HTTPS fetch works with network escalation. Push both main and feature using explicit `git@github.com:hoai2k/cambrian.git` because HTTPS push lacks credentials.

Devonian intake uses `tools/devonian/check.mjs`, its own portraits and texture-free vertex-color LODs. Do not run legacy Cambrian cards/lods on Devonian replacements. Refresh asset sizes and catalogue; retain all18 clips in these reworks. Required npm build/typecheck before main. Keep pending preview flags. Public creature files are flat `public/assets/devonian/creatures/<id>.*`.

Editable Blender sources/intermediates/audits/logs/backups live in `../devonian-authoring/`. Preserve original references locally and do not redistribute user reference images as game art. Stage source files explicitly, not Python caches or .DS_Store. Keep failed studies; do not cite their results as current approval. Root's Titan float64 classifier is asset-local; shared eye-audit.py and50% gate unchanged. Detailed original numerical-loop diagnosis and oral-boundary correction are retained beside the Titan source.

Use Astra high for anatomy, sculpt, materials and rig judgment; Terra medium for frozen execution/export/render/checks. Root may run frozen commands directly without claiming a model switch. Blender5.2: `/Applications/Blender.app/Contents/MacOS/Blender`, CPU2 for render jobs. Avoid overlapping heavy work.

Storage shortage resolved: disk recovered to approximately23GiB. Before that, root hash-verified777 duplicate dist model files and replaced only those build-output copies with symlinks to public originals, recovering732MB. Proof at `../devonian-authoring/viewer-build-duplicate-proof-2026-09-08.json`. No authoring sources/backups deleted. A normal build can recreate dist now.

Review server PID9627 at127.0.0.1:4176. New isolated in-app review tab9; leave user's5173 tab/server untouched. Final08 full packaged viewer reviewed after main integration; served full/LOD/meta match main hashes. Viewer exposes no LOD toggle; controller transition remains pending. Do not claim deployment.

This checkpoint is mirrored at `../devonian-authoring/CURRENT_STATE.md`.
