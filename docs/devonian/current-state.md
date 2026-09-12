# Paused after viewer detail comparison — 8 September 2026

## Eye-audit scope — user clarification

The quantitative 50% eye-globe embedding/containment audit applies only to fish-like creatures. Do not apply it to arthropods, cephalopods or other creatures with naturally exposed or stalked eyes; in particular, do not force Odaraia or nautiloid eyes into their bodies to meet this threshold. Their eyes should follow the creature-specific anatomy and references. Ordinary visual checks for unintended gaps, attachment errors and animation defects still apply. This clarification supersedes broader eye-audit wording in older plans and handoffs.


**USER PAUSED AFTER THIS COMMIT.** Final instruction: "Ok, stop after this task is commited." The bounded viewer task and state reconciliation are complete; do not start another task until the user resumes. No Blender jobs or delegated work remain active.

## Latest small task completed

- Added a Full / Reduced model selector to the specimen viewer. It loads the actual selected GLB, retains camera, palette and matching animation time/paused state for detail swaps, and falls back to rest when a clip is absent. Changing creature still resets framing. The actual loaded path is exposed on the animations region for future verification.
- Actual local viewer checks: Dunkleosteus Full → Reduced → Full retains Heavy at0.50/1.13s, paused, with matching camera/pose; Michelinoceras changes from19 full clips to7 reduced clips, with missing Growth safely returning to paused Idle. Typecheck, production build and era validation pass. These are viewer checks, not controller LOD-transition or whole-roster art approval. No model assets changed.
- Synced origin/main38954eb and reconciled newer animation deliveries below. Finish by publishing this checkpoint and viewer change together; find the release with `git log --all --grep="Add viewer full and reduced model comparison"`.

## Delivered during the prior resumed block

- **Titanichthys V3 refined preview**: featureadf2847, mainbc5a2d0, pushed. Deep armored body, long fins, articulated oral lining, seated eyes,18 clips on both levels and five anchors. Full21,955,988B SHA `de056f4d2af273e5a2c279a2727158d285f20f97db2790729f4580b74ac89ef9`; LOD2,365,892B `d99b2060c89ac1caa23ec9613c9de3b82c9604dc5669d54386d42e93f611f1a7`. Conservative eye-volume bounds60.32–61.68%;58 oral poses pass. Editable production08 and four new portraits retained locally. Build/typecheck/intake pass. Post-main actual viewer Idle/Ability/Bite/Eat/Death checked; served full/LOD/meta matched main. Still preview for LOD surface/eye-rim polish, washed-out alternate palette, controller transitions and L01 illustration refresh. Exact entry: `tools/devonian/creatures/titanichthys/rework-v3/RELEASE08-ART-VERDICT.md` and `RELEASE-CANDIDATE08-EXECUTION.md`.
- **Dunkleosteus LOD color correction**: featuredcb234a, mainff9a853, pushed. Quantitative diagnosis proved encoded sRGB values were written directly to linear vertex colors. Linear05 applies standard EOTF only to21 referenced RGB accessors; alpha and every other byte remain identical. NewLOD2,371,052B SHA `c639770bd1b612cb7747856d38cd5b748d2671b10fdf6998dda4450db223c5f5`. Full and four portraits unchanged. Four matched actual full/LOD views accepted; intake18clips/3anchors, typecheck/build pass. Viewer card/full model remains available with18actions/preview; its reduced link serves exact main bytes. Still preview for reduced normal/detail/roughness parity and controller/art polish. Read `tools/devonian/creatures/dunkleosteus/face-v4/LINEAR05-VERDICT.md`. At that delivery the viewer had no interactive LOD switch; the bounded task above adds and checks it. Controller transition checks remain pending.

## Resume priorities and exact next steps

1. **Finish Coccosteus V3 candidate07 validation and release.** Full and reduced surface review now PASS, all six new LOD and six full-reference images inspected. Connected plate/ray/bar features and footprint-filtered grain remove the broad false wrinkles. Full22,931,780B SHA `b7b929b9978f51f89e0cb1e687dec10d95b90edd3e2b2ba27b12432f58474655`; LOD3,236,312B `eec740e92fcf2187c54eacb2418fc7335cd584fe57b2792e64e8e4f1bbd31756`,59,194triangles,18clips each.207 frozen inputs intact. Final oral/eye/temporal-motion checks, controller/palette/LOD transition and packaging remain; no public replacement yet. Do not redo the surface study or audit the obsolete public model. Start `tools/devonian/creatures/coccosteus/rework-v3/HANDOFF-CANDIDATE07-PAUSE.md` (SHA9086afcdd06a4cb1ba79899c1c325cdb64a3479a824e98235d71439c1d8e57a8), `review-candidate07-actual.md`, `frozen-candidate07-review.json`. Four candidate04 full portraits may be reused by exact full-geometry identity. Watch tiny commissure dots, close Attack highlight and minor lower-flank/fin-root simplification. No next iteration started.
2. **Bothriolepis M04 targeted art correction.** Nine actual views reviewed,44 source inputs and20 outputs verified. Overall HOLD: oval mouth surround, armored bulk and bowed appendages are improved and must be preserved; nuchal facets, excessive cephalic microtexture and the smooth triangular rostral-cap mismatch remain. No production rig yet, only five oral study poses. Next bounded diagnostic/correction is documented, not implemented: `tools/devonian/creatures/bothriolepis/rework-v3/review-material04-and-next-direction.md` (SHA93ce76a278d3be53a6137a8670be4987ccfe5c43c09936af4d3557ca68fd5c49). Local material04 blend SHA5d839ec10a030595c9ab2c66405b97379e0d319f1fbe8c7966c5bae26f626c9b. Preserve M03/04; no M05 job exists.
3. **Odaraia production rig/material baking/export.** Material02 coarse direction accepted after six dark/light views: less glass glare, organic olive cuticle, clearer internal trunk, darker eyes and varied appendages. Geometry unchanged. Local output `../expansion-authoring/odaraia-rework/material02/`, manifest eabb28c993294e62c3bbdf47a122caf2116a56acd97ba59fc60e19848a5a3139. Eye-edge highlight and rigid repeated limb fan remain for production/pose review. Astra plan saved in `tools/creatures/odaraia/rework-v3/production-plan03.md` SHA1df9a4ecf27ede069f0430fe60e91f39771c9e96b697cb86274cdd8a017bbf4b: economical406-bone proposal, all32limb pairs/20anatomicalintervals,18actions inclMoult, articulated reach/secure/carry-to-mouth Eat and semantic sockets. PLAN ONLY; no new production rig or GLB. Read plan and ATTACK_EAT_RIG_DIRECTION.md before freezing implementation. Validate game alpha sorting; Cycles material review alone is insufficient.
4. **Doryaspis and Stethacanthus complete reworks.** Doryaspis clay01 held for oral presentation, jagged rim and abrupt roots; reconcile user below-snout direction with reference/anatomy. Stethacanthus shark silhouette and same-colored dorsal structure queued. Then newer individual references: Tiktaalik, Onychodus, Rhinodipterus, Cheirolepis, Cladoselache, Nahecaris and remaining requests. Onychodus anatomy brief exists, no new clay. See `docs/devonian/refinement-queue.md`.
5. **Attack/eating pass: delivery is ahead of review, not complete.** The authoritative `tools/attack-feeding-refinements.json` has 22 entries: 18 `review` and 4 `pending`. The 18 review entries comprise 17 Bite/Attack/Heavy/Eat review sets (including the existing Opabinia articulation) plus Hallucigenia's Grab/Dash-only set. The four pending entries are Odaraia and Nahecaris (body replacements), Michelinoceras (its separate preview still needs controller/broader review), and Ottoia (grip direction remains pending). Commit `cddf6cd` carries the sixteen-more-creatures delivery and `22da584` Hallucigenia; both are contained in current `38954eb`. Every delivered set still needs individual viewer/art review and a controller playtest; LOD attack clips remain absent where the delivery notes say so.
6. **Queue distinctions.** The content queues retain all 13 Cambrian and all 21 Devonian refinement entries; they are not a claim that every listed creature is an unreviewed all-new preview. In Cambrian, 11 four-clip motion deliveries and Hallucigenia's Grab/Dash delivery await review, while Odaraia remains a total rework. In Devonian, six four-clip motion deliveries await review; the broader fish/arthropod rework and refinement queue remains intact. Do not broad-audit geometry awaiting complete replacement.

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

Worktree `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`, branch `devonian-assets`; main worktree `../devonian-publish`. This checkout is fast-forwarded through `38954eb`, which includes `cddf6cd` and `22da584`. Fetch and merge concurrent origin/main before publication; never force push. HTTPS fetch works with escalation; push both branches through `git@github.com:hoai2k/cambrian.git`.

Concurrent mainb9e4bd5 was merged before closing (persistent discoveries and revised controller layout). Required production build/typecheck pass on the combined tree;60 discovery-record assertions across both eras and menu-binding checks also pass. Use Devonian intake/catalogue/sizes, not legacy Cambrian cards/lods. Keep these reworks'18actions on both levels. Actual viewer evidence uses127.0.0.1:4176, byte-matched to main. The viewer now supports actual full/reduced display comparison as documented above; controller LOD transitions remain separate work. No site deployment claimed.

Local originals/intermediates/blends/audits/logs/backups remain under `../devonian-authoring/`; Odaraia uses `../expansion-authoring/odaraia-rework/`. Read `../devonian-authoring/execution-summary-2026-09-08.md` for completed executor outputs. Latest backups: `backups/titanichthys-pre-v3-2026-09-08/` (old seven public files and anchors), `backups/dunkleosteus-before-linear05-2026-09-08/` (oldLOD/meta); earlier named originals remain. User references remain local and untouched.

Root's Titan numerical classifier is asset-local; shared eye-audit.py and50% gate unchanged. Detailed repeated-ray failure, oral-boundary correction, preserved failed studies and frozen exact inputs remain beside the source. Do not cite old reports as fresh executions. Copy geometric audits only with proven unchanged geometric/rig/animation bytes and explicit provenance.

Use Astra high for research/sculpt/material/rig judgment; Terra medium for frozen build/render/checks. Blender5.2 at `/Applications/Blender.app/Contents/MacOS/Blender`, CPU2. Serialize heavy jobs. Ignore .DS_Store and __pycache__; no such cache staged. One trailing whitespace line in frozen Cocc07 was deliberately retained so execution input hashes did not change.

Storage shortage resolved to roughly23GiB earlier. Root recovered732MB by hash-verifying777 duplicate dist files before replacing only those build copies with links; subsequent normal builds recreated dist. No authoring source/backups deleted. Proof `../devonian-authoring/viewer-build-duplicate-proof-2026-09-08.json`.

This checkpoint is mirrored to `../devonian-authoring/CURRENT_STATE.md`. The user has paused again; retain the full rework queue and the stated review/runtime limits. Resume first at Coccosteus candidate07 validation, then Bothriolepis correction and Odaraia production. Do not repeat completed initial-asset delivery or surface studies.


## 12 September 2026 — the model queue moved

Blender 5.2.1 runs in the session (`npm run blender`); the staging and tiering are
`docs/model-queue-plan.md`, the resume point `docs/model-queue-state.md`. Delivered on the user's
acceptance, all shipped from packaged candidates that passed lossless packaging and structural
intake: Cheirolepis V3 (reference face, seated fin roots, swept fins), Palaeoisopus V2 (oar-blade
articles, flat trunk, no joint beads), Jaekelopterus V2 (flattened stepped opisthosoma, blade rami),
Cladoselache V3 (fin outlines), Manticoceras (closed umbilicus), Eldredgeops (occipital joint).
Accepted as published: Titanichthys, Gemuendina, Dunkleosteus. Cleared by triage: Walliserops,
Furcaster, Michelinoceras. In flight as candidates: Acanthostega, Tiktaalik, Onychodus,
Rhinodipterus, Nahecaris, Stethacanthus; Bothriolepis M04 and Odaraia clay02/material02 being
re-derived here for the next judgement. Blocked on the user: Coccosteus (two evidence files exist
only on the Mac), Doryaspis (the mouth-position call).
