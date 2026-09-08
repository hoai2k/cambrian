# Active refinement checkpoint — 8 September 2026

The user resumed work again and will say when to tie up. The earlier end-of-day
pause is superseded. Continue from these priorities; save sources and checkpoints.
Working branch fast-forwarded to main885a08a at resume; no new public model yet.

## Current assignments

- Astra high Coccosteus author: LOD-only structured body/fin sampling from accepted
  candidate04, protecting oral bands and measuring interior pigment error. Full
  model, bake03 and rig remain unchanged. Await frozen execution handoff.
- Astra high Titanichthys author: candidate07 weights-only oral repair with shared
  physical coordinates across paired floor layers; preserve24-degree gape and18
  clips. Candidate07 was built and structural contract passed; actual sweep failed at full
  Ability0.5 because underside-first rays remain. G4 was not run. Independent diagnosis now finds46 candidate06 underside-first hits inside the
  actual oral-material boundary versus0 in07; remaining38 hits lie outside that
  boundary. The rectangular gate includes legitimate lip/chin. Author is freezing
  a topology-derived mouth-boundary checker with unchanged section tolerances;
  rerun remains required. No08 geometry change is warranted by current evidence.
- Root: independent Titan eye measurement and texture-size work. The original
  eye-ray failure is now reproduced as a float32 repeated-hit loop:64hits refer to
  only2 triangles; float64 direct tests find2 forward/0 reverse intersections.
  This diagnoses the checker, not eye containment. New asset-local float64
  projected classifier leaves the shared checker and50% criterion unchanged.
  Analytical cube/hollow120,000 cases and the actual failing ray pass; boundary
  uncertainty remains conservative. The immutable06
  full/LOD Bind/Ability audit completed: every eye FAILS at40.9–42.1% interior,
  zero uncertain/disagreeing rays. Root's actual-geometry seating study gives
  about61.8% at0.030 inward along each original socket normal. Terra medium is
  producing an isolated eyes-only derivative and actual pose audit/closeups.
  The actual eyes-only derivative study02 PASSES full/LOD Bind/Ability: conservative
  bounds60.32–61.68%, no uncertain/disagreeing rays. Closeup art review is running;
  do not call it released or whole-creature approved. Failed study01 wrote through
  a copied buffer (zero position changes), preserved and excluded from validation.
  No socket envelope inflation.
- Lossless PNG study: exact decoded RGB preserved for18 maps, estimated full GLB
  29,365,861B (still over25MiB). Root is testing only the4096 body normal map at2048
  with linear vector filtering/renormalization;4096 albedo and all other maps stay
  intact. Vector-filtered body normal2048 yields a21,853,112B package, exact other scene
  values and all18 clips. Mean discarded normal angle0.697deg,p953.17deg, with a
  tiny preexisting short-vector patch; six matched head/body/oral renders running.
  This requires actual visual approval before production adoption.

## Temporary storage constraint —18:48 UTC

Disk fell to roughly300MiB free. Root asked the user to free5–10GB or give an
external authoring destination; response pending. Heavy exports/renders paused;
source planning/review continues. Originals and failed candidates remain preserved.
Normal study wrote five of six images; final normal2048-oral save failed. Preserve
those files and log; render_normal_resume_03.py prepares only the missing oral view
in a new directory once storage is available. Head and body pairs visually retain armor edges, pigment and grain; final paired
oral review still required.

Eye study02 numerical results are valid, but its eight initial orbit renders are
NOT valid pose evidence: renderer omitted explicit Bind pose reset and used1.0s
instead of the actual2.4s Ability duration. Root caught identical LOD Bind/Ability
poses. Terra is saving a corrected source recipe, with explicit local paths,
pose-basis reset and actual imported action slots/duration; fresh images pending
storage. Do not accept those old images as a maximum-gape comparison.

Root committed eye/texture study sources and checkpoint as b5ae6ea on feature.
Publication to main and remaining source commits are still pending.

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
- **Gemuendina terminal-snout preview, candidate05**: included in this closing
  publication. The user rejected candidate02/main0b639d0 because the mouth still
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

## Next work, in priority order

1. **Coccosteus reduced model.** Actual candidate04 full PBR surface passes art:
   repaired UV-bake coverage removes the white/brown polygon flashes while retaining
   grain, armor, bars and rays. Overall replacement remains held: reduced mesh loses
   transverse bars into longitudinal smears, fin rays into blotches, coarse armor,
   pale jagged mouth rim and dark commissure slits. All23 views inspected. Preserve
   accepted full model, bake03 and18-action rig; next use structured body rings and
   fin topology to retain markings, with a small actual comparison. Do not run broad
   eye audits against the obsolete public model. Entry:
   `tools/devonian/creatures/coccosteus/rework-v3/HANDOFF-CANDIDATE04-HOLD.md`.
   Evidence manifest a94f1729ceac1414355e127ac06effaf188baef94163adc670c62584b4ecd90f.
   Bake03 proved1311 invalid inherited ADJACENT_FACES/16 pixels become zero with
   explicit EXTEND/32; interior pigment is unchanged. All prior failures preserved.
2. **Titanichthys mouth deformation and eye diagnostic.** Candidate06 retains the
   new deep armored fish form, long fins and18/18 actions; all23 images reviewed.
   Ability exposes underside through oral lining: actual triangle rays/sections
   confirm80 full/94 LOD underside-first hits versus zero in Bite/Eat. Fix this
   local deformation. Eye audit failed excessive ray intersections on the closed
   full bind body, with no caps involved; NO eye containment pass exists. The frozen diagnostic reproduced a numerical repeated-hit loop; the new
   independent float64 measurement is running without weakening thresholds. Entry:
   `tools/devonian/creatures/titanichthys/rework-v3/HANDOFF-DIAGNOSTIC-EYE-RAY06-01.md`.
   Manifest f5d21ee5618ddcb187826566b9de09498976a421adc32dd0f152928a37652a81.
   Exact lossless packaging preserves18/18 but full remains36.05MB: textures alone
   30.32MB, non-image content5.72MB. Size/texture options documented, no lossy change
   authorized by an internal gate or performed. Current public model unchanged.
3. **Other complete reworks:** Bothriolepis material03 is held for uniform pale shield,
   forehead seam and angular oral transition; Odaraia material01 for glass-like shell
   glare, marble eyes and flat tan limbs/tail. Preserve the translucent wrapping coat
   and prominent upward legs. Doryaspis clay01 is held for wrong mouth presentation,
   jagged rim and abrupt roots. Stethacanthus remains queued. Each source rework-v3
   WORKING_STATE and root-review file explains the next targeted change. Complete
   these structural reworks before general audits of their replacements.
4. **Other individual refinements:** Tiktaalik, Onychodus, Rhinodipterus, Cheirolepis,
   Cladoselache, Nahecaris and remaining roster requests are in refinement-queue.md.
   All21 Devonian creatures remain preview while broader work is pending. Onychodus
   has a frozen anatomy brief; no new clay. Read the supplied references before work.
5. **Attack/eating pass:**20 entries (12 Cambrian+8 Devonian), overlapping body work.
   Michelinoceras motion preview is integrated;19 other new passes remain. Nautiloids
   need articulated flare/whip, arthropods insect/spider attacks, Furcaster multi-arm
   grasp and placement at its underside mouth. Real prey/anchor behavior is part of
   the task. All12 pending Cambrian cards remain preview. See
   `docs/attack-feeding-refinement.md` and `tools/attack-feeding-refinements.json`.

## Repo, validation and preservation

Working repo `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`,
branch `devonian-assets`; main worktree `../devonian-publish`. Use `git log main` for
this closing integration commit. Fetch and merge concurrent main before publication;
never force push. HTTPS fetch works; push main and feature with explicit
`git@github.com:hoai2k/cambrian.git` (HTTPS push lacks credentials).

Selected final Dunk/Gemu intake, build and typecheck pass. The last engine changes
included concurrent mainc08e039 and passed688 Devonian checks plus23 debug checks.
No engine changes were made by the final face-only deliveries. Final viewer checks
and exact asset hashes are recorded in each release review. No site deployment is
claimed. Viewer verification uses the identical built assets in hidden tab8 at
`http://127.0.0.1:4176/viewer/`; leave the user's5173 tab/server alone.

Editable Blender sources, intermediate exports, audits, PNGs, logs and backups live
under `../devonian-authoring/` (Cambrian Odaraia uses its preserved authoring paths).
Gemu/Dunk original backups: `<id>-final-pre-face-refinement-2026-09-08` (94/38 files).
Reference originals in Downloads are untouched; copies and hashes in per-creature
user-reference directories. Copyrighted references are not redistributed as game art.
All frozen source, handoffs and status changes are committed. Ignore untracked Python
`__pycache__`; do not stage caches. Do not reuse old final reports for a changed mesh.

Use Astra high for anatomy/research/sculpt/material/rig judgment; Terra medium for
frozen build/export/render/validation jobs. Root sometimes executes an exact frozen
command directly and does not claim its model changed. Blender5.2 CPU2 executable:
`/Applications/Blender.app/Contents/MacOS/Blender`; Mac startup may need escalation.
Work is active again. Before the next user-requested pause, finish or explicitly
checkpoint every running job and record exact outputs.
This file is mirrored at `../devonian-authoring/CURRENT_STATE.md`.
