# End-of-day restart — 8 September 2026

The user requested one additional bounded work block, then a pause with saved state.
That block covers Dunkleosteus face delivery, Gemuendina terminal-snout delivery,
and Coccosteus replacement review. Do not start further refinement jobs until resumed.
This file supersedes earlier running-task summaries. Exact per-creature evidence and
commands remain in the source handoffs listed below. Original models and failed
candidates are preserved; never rebuild into an existing candidate directory.

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
   full bind body, with no caps involved; NO eye containment pass exists. Run the
   frozen diagnostic rather than weakening parity thresholds. Entry:
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
No new Blender/refinement jobs should remain running after the closing checkpoint.
This file is mirrored at `../devonian-authoring/CURRENT_STATE.md`.
