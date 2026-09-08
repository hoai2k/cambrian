# Paused refinement checkpoint — 8 September 2026

## Eye-audit scope — user clarification

The quantitative 50% eye-globe embedding/containment audit applies only to fish-like creatures. Do not apply it to arthropods, cephalopods or other creatures with naturally exposed or stalked eyes; in particular, do not force Odaraia or nautiloid eyes into their bodies to meet this threshold. Their eyes should follow the creature-specific anatomy and references. Ordinary visual checks for unintended gaps, attachment errors and animation defects still apply. This clarification supersedes broader eye-audit wording in older plans and handoffs. Work remains paused.


**USER PAUSE.** The user asked to finish current jobs and small parallel work, then pause for the day. All assigned jobs and reviews have finished. Do not start further execution until the user resumes. No active Blender render/export or worker PTY remains. The local review server may remain listening on4176; user5173 was untouched.

## Delivered during the latest resumed block

- **Titanichthys V3 refined preview**: featureadf2847, mainbc5a2d0, pushed. Deep armored body, long fins, articulated oral lining, seated eyes,18 clips on both levels and five anchors. Full21,955,988B SHA `de056f4d2af273e5a2c279a2727158d285f20f97db2790729f4580b74ac89ef9`; LOD2,365,892B `d99b2060c89ac1caa23ec9613c9de3b82c9604dc5669d54386d42e93f611f1a7`. Conservative eye-volume bounds60.32–61.68%;58 oral poses pass. Editable production08 and four new portraits retained locally. Build/typecheck/intake pass. Post-main actual viewer Idle/Ability/Bite/Eat/Death checked; served full/LOD/meta matched main. Still preview for LOD surface/eye-rim polish, washed-out alternate palette, controller transitions and L01 illustration refresh. Exact entry: `tools/devonian/creatures/titanichthys/rework-v3/RELEASE08-ART-VERDICT.md` and `RELEASE-CANDIDATE08-EXECUTION.md`.
- **Dunkleosteus LOD color correction**: featuredcb234a, mainff9a853, pushed. Quantitative diagnosis proved encoded sRGB values were written directly to linear vertex colors. Linear05 applies standard EOTF only to21 referenced RGB accessors; alpha and every other byte remain identical. NewLOD2,371,052B SHA `c639770bd1b612cb7747856d38cd5b748d2671b10fdf6998dda4450db223c5f5`. Full and four portraits unchanged. Four matched actual full/LOD views accepted; intake18clips/3anchors, typecheck/build pass. Viewer card/full model remains available with18actions/preview; its reduced link serves exact main bytes. Still preview for reduced normal/detail/roughness parity and controller/art polish. Read `tools/devonian/creatures/dunkleosteus/face-v4/LINEAR05-VERDICT.md`. No interactive LOD switch exists in this viewer; do not claim a transition test.

## Resume priorities and exact next steps

1. **Finish Coccosteus V3 candidate07 validation and release.** Full and reduced surface review now PASS, all six new LOD and six full-reference images inspected. Connected plate/ray/bar features and footprint-filtered grain remove the broad false wrinkles. Full22,931,780B SHA `b7b929b9978f51f89e0cb1e687dec10d95b90edd3e2b2ba27b12432f58474655`; LOD3,236,312B `eec740e92fcf2187c54eacb2418fc7335cd584fe57b2792e64e8e4f1bbd31756`,59,194triangles,18clips each.207 frozen inputs intact. Final oral/eye/temporal-motion checks, controller/palette/LOD transition and packaging remain; no public replacement yet. Do not redo the surface study or audit the obsolete public model. Start `tools/devonian/creatures/coccosteus/rework-v3/HANDOFF-CANDIDATE07-PAUSE.md` (SHA9086afcdd06a4cb1ba79899c1c325cdb64a3479a824e98235d71439c1d8e57a8), `review-candidate07-actual.md`, `frozen-candidate07-review.json`. Four candidate04 full portraits may be reused by exact full-geometry identity. Watch tiny commissure dots, close Attack highlight and minor lower-flank/fin-root simplification. No next iteration started.
2. **Bothriolepis M04 targeted art correction.** Nine actual views reviewed,44 source inputs and20 outputs verified. Overall HOLD: oval mouth surround, armored bulk and bowed appendages are improved and must be preserved; nuchal facets, excessive cephalic microtexture and the smooth triangular rostral-cap mismatch remain. No production rig yet, only five oral study poses. Next bounded diagnostic/correction is documented, not implemented: `tools/devonian/creatures/bothriolepis/rework-v3/review-material04-and-next-direction.md` (SHA93ce76a278d3be53a6137a8670be4987ccfe5c43c09936af4d3557ca68fd5c49). Local material04 blend SHA5d839ec10a030595c9ab2c66405b97379e0d319f1fbe8c7966c5bae26f626c9b. Preserve M03/04; no M05 job exists.
3. **Odaraia production rig/material baking/export.** Material02 coarse direction accepted after six dark/light views: less glass glare, organic olive cuticle, clearer internal trunk, darker eyes and varied appendages. Geometry unchanged. Local output `../expansion-authoring/odaraia-rework/material02/`, manifest eabb28c993294e62c3bbdf47a122caf2116a56acd97ba59fc60e19848a5a3139. Eye-edge highlight and rigid repeated limb fan remain for production/pose review. Astra plan saved in `tools/creatures/odaraia/rework-v3/production-plan03.md` SHA2fc2833226f43b8b8b61dbe686a35d6a3dc34ef33fadcd43d1bed36e8af7e2dd: economical406-bone proposal, all32limb pairs/20anatomicalintervals,18actions inclMoult, articulated reach/secure/carry-to-mouth Eat and semantic sockets. PLAN ONLY; no new production rig or GLB. Read plan and ATTACK_EAT_RIG_DIRECTION.md before freezing implementation. Validate game alpha sorting; Cycles material review alone is insufficient.
4. **Doryaspis and Stethacanthus complete reworks.** Doryaspis clay01 held for oral presentation, jagged rim and abrupt roots; reconcile user below-snout direction with reference/anatomy. Stethacanthus shark silhouette and same-colored dorsal structure queued. Then newer individual references: Tiktaalik, Onychodus, Rhinodipterus, Cheirolepis, Cladoselache, Nahecaris and remaining requests. Onychodus anatomy brief exists, no new clay. See `docs/devonian/refinement-queue.md`.
5. **Remaining19 attack/eating passes** after delivered Michelinoceras, across12Cambrian/8Devonian total entries with overlaps. Nautiloid articulated flare/whip, arthropod insect/spider strikes, Furcaster multi-arm grasp and transfer to underside mouth; actual prey/anchor behavior required. `docs/attack-feeding-refinement.md`, `tools/attack-feeding-refinements.json`.
6. **Post-rework final polish/audits**, dependent Coccosteus/Titanichthys scale/lighting illustrations and controller review. All21Devonian and12pendingCambrian remain preview until their requirements complete. Do not broad-audit geometry awaiting complete replacement.

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
  at0.4667s inspected. **Still preview:** encoded-albedo/linear-vertex mismatch has now been corrected in linear05 (mainff9a853); reduced normals, fine detail and controller polish remain. Head/gnathal improvement is accepted, not whole-creature final approval.
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



## Repository, evidence and restart rules

Worktree `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`, branch `devonian-assets`; main worktree `../devonian-publish`. Accepted asset changes are mainff9a853 or earlier; final closing documentation merge appears in `git log main`. Fetch and merge concurrent origin/main before publication; never force push. HTTPS fetch works with escalation; push both branches through `git@github.com:hoai2k/cambrian.git`.

Concurrent mainb9e4bd5 was merged before closing (persistent discoveries and revised controller layout). Required production build/typecheck pass on the combined tree;60 discovery-record assertions across both eras and menu-binding checks also pass. Use Devonian intake/catalogue/sizes, not legacy Cambrian cards/lods. Keep these reworks'18actions on both levels. Actual viewer evidence uses127.0.0.1:4176, byte-matched to main. The viewer exposes full and reduced download links but only displays the full model; controller LOD transitions remain separate work. No site deployment claimed.

Local originals/intermediates/blends/audits/logs/backups remain under `../devonian-authoring/`; Odaraia uses `../expansion-authoring/odaraia-rework/`. Read `../devonian-authoring/execution-summary-2026-09-08.md` for completed executor outputs. Latest backups: `backups/titanichthys-pre-v3-2026-09-08/` (old seven public files and anchors), `backups/dunkleosteus-before-linear05-2026-09-08/` (oldLOD/meta); earlier named originals remain. User references remain local and untouched.

Root's Titan numerical classifier is asset-local; shared eye-audit.py and50% gate unchanged. Detailed repeated-ray failure, oral-boundary correction, preserved failed studies and frozen exact inputs remain beside the source. Do not cite old reports as fresh executions. Copy geometric audits only with proven unchanged geometric/rig/animation bytes and explicit provenance.

Use Astra high for research/sculpt/material/rig judgment; Terra medium for frozen build/render/checks. Blender5.2 at `/Applications/Blender.app/Contents/MacOS/Blender`, CPU2. Serialize heavy jobs. Ignore .DS_Store and __pycache__; no such cache staged. One trailing whitespace line in frozen Cocc07 was deliberately retained so execution input hashes did not change.

Storage shortage resolved to roughly23GiB earlier. Root recovered732MB by hash-verifying777 duplicate dist files before replacing only those build copies with links; subsequent normal builds recreated dist. No authoring source/backups deleted. Proof `../devonian-authoring/viewer-build-duplicate-proof-2026-09-08.json`.

This checkpoint is mirrored to `../devonian-authoring/CURRENT_STATE.md`. **Paused; resume only on the user's request.**
