# Active creature refinements — 8 September 2026

User resumed work on 8 September. Continue; the 7 September pause is superseded.
This is the authoritative resume summary. Per-creature source WORKING_STATE and immutable
handoffs hold exact commands/hashes. Historical checkpoint details are in
`checkpoint-2026-09-08-history.md`; its assignments/counts are obsolete.

## Delivered and reopened

All 21 initial Devonian creatures and all initial non-creature assets reached main.
Non-creatures f7b5618:47 plants/props with LODs/portraits/metadata,11 runtime proxies,
9 biome paintings,29 scenery boards,9 regional boards,3 lighting concepts,10 material sets,
2 atmosphere atlases and2 scale plates. User was separately notified. Refresh dependent
scale/lighting illustrations after Titan/Cocc replacements.

All **21 Devonian creatures now show preview**: Cheirolepis and Cladoselache were reopened
by reference requests, and latest steering reopens Gemuendina and Dunkleosteus for focused
face corrections. This does not erase their prior successful delivery; previous reports apply
to the backed-up versions. Gemu V3 body/material quality is explicitly liked by the user.
Gemu's first complete rework finished main7c72eb3; the new face refinement is additional.

Six earlier complete reworks remain: Titanichthys, Coccosteus, Bothriolepis, Doryaspis,
Stethacanthus and Cambrian Odaraia. They precede general/eye audits of their replacements.
Sixteen Devonian individual refinements also remain, including the two new face passes;
the other five Devonian pending entries are complete reworks. Refinement work is substantial.

Separate motion scope: `docs/attack-feeding-refinement.md` and
`tools/attack-feeding-refinements.json`,20 creatures (12 Cambrian+8 Devonian). All12 Cambrian
entries show preview too. This overlaps existing body work, not20 additional new models.
Nautiloid articulated flare/whip; insect/spider-like arthropod joint sequences; multi-arm
Furcaster grasp-to-underside-mouth Eat. Real prey/anchors and runtime carry are required.

## Latest references and preservation

8 September references: Tiktaalik (fuller body, rounded-arrow snout), Onychodus (lower tusks
and cranial bones), Rhinodipterus (head, fish eyes, scales), Cheirolepis (face/eyes/fin angles),
Cladoselache (fin shapes/pattern), Nahecaris (shrimp curves, shell/legs/eyes/antennae).
Latest: Gemuendina front mouth/eyes just above it, dorsal motifs are markings; Dunkleosteus
additional face reference emphasizes head/cheek/brow and sharp shaped cutting plates.
Read `refinement-queue.md` for exact requirements, provenance and anatomical uncertainties.
Do not substitute a superficial general audit for a requested structural change.

Refs copied+SHA-verified under ../devonian-authoring/<id>/user-reference. Originals untouched;
local copyrighted references are not redistributed as game art. Final-pre-reference-rework
backups exist for Cheiro/Clado; pre-reference-rework backups for Tik/Ony/Rhino. Public families
for all20 motion entries are backed up in their era authoring/backups directory under
<id>-pre-motion-pass-2026-09-08. Preserve editable sources before each motion change.
Gemu/Dunk new public+source+production Blend backups:
<id>-final-pre-face-refinement-2026-09-08 (94 and38 files verified respectively).
Dunk reference SHA527aa96de6e581c08fbd75fec05a5e7645e589835707092b28a12d112a491d84.
Nahe reference SHAd5640abf84805adf6b4f6df335dc5b3bceda09931d426b2039089391ffb85cb3.

## Exact current work

### Titanichthys

Astra author /root/titanichthys_rework_clay03 finished candidate03 SOURCE. Accepted clay04/material02, not final.
Candidate01 full+LOD built but LOD all-white pigment failed. Candidate02 explicit sampled
colour failed after decimation; partial full GLB/maps preserved, no successful LOD or art review.
Focused diagnostic ran successfully, exact handoff HANDOFF-DIAGNOSTIC-DECIMATION-01.md;
result ../devonian-authoring/titanichthys/rework-v3/diagnostic-decimation-01/result.json.
All114340 loops finite,20 red values negative to -.04200587 after decimation; source positive.
Alpha7 tiny overshoots1.192e-7. No clamping/correction applied. Candidate03 frozen: final-UV atlas sampling for fins/eyes and convex same-region transfer
of accepted filtered body pigment after neutral-colour decimation. HANDOFF-CANDIDATE-03.md,
manifest4dd07f1f9e3c95fdb58d8327abc2e4724041d37b7789871c34b53fd2625853fb. Not executed. Cocc author informed. Reverify frozen diagnostic manifest.
Raw full44.56MB also needs final lossless packaging check; no silent quality reduction.
Next valid candidate needs full/LOD21poses,18 actual clips, anchors, oral and eye/general
checks, portraits, actual viewer and intake. Accepted sculpt/textures preserved.

### Coccosteus

Astra /root/coccosteus_material04_review active production source. Root+author actually
reviewed all7 material04 views and accepted this bounded material gate. Subtle irregular
pigment retains plate readability after prior overly smooth/overly noisy failures.
material-04 Blend2bd0d3da5ed2ad73801e200325b51f3c776989e027d01020e196838f10e633c9.
Reportd01c4be81cc558584fbf2bfe18508fa8b32ef1c16f6e5cbb7e55bf68d1becfad.
Author prepares PBR bake,20-bone skeleton,18 actions, real jaws/anchors/fullLOD/portraits.
No production Blender execution yet. Candidate source must be frozen before execution.
Original Cocc backup retained. Eye/general QA follows completed replacement.

### Bothriolepis

Astra /root/bothriolepis_rework_design active material02 SOURCE. Material01 actually rendered
all8 views and rejected by root+author. See root-review-material01.md. Pale collars/nose/oral
patch and hard forehead tone seam spoil finish. Author traced atlas linear values incorrectly
stored as sRGB bytes, plus nonperiodic normal seam; correct encoding and exterior transitions,
keep accepted clay02 geometry, pectoral roots, oral recess and suture paths. No rig stage yet.
material01 Blendd25049d96a664ed359597daa8fbb9d44f4c0ca14c5922c7308437abaae52ffaf.

### Cambrian Odaraia

Original Astra /root/odaraia_rework_design active material01 source. Frozen clay02 was executed:6 images and
framing/geometry reports PASS at ../expansion-authoring/odaraia-rework/clay02.
Root and original author independently inspected all6 and accept coarse gate.
Author is preparing geometry-preserving semitransparent shell material with dark/light views. Read new root-review-clay02.md.
Blendd5ec458053d58f45e5a0def15721485365449d1abee24ad75844fa9d38d9182c.
LegsUP/+Yup pose; curved wrapping valves,32 paired biramous limbs/20 intervals, supported
large eyes and three tail blades. Preserve2 references and original23-file backup.
Cambrian actions use Moult, not Growth. Incorporate articulated attacking/eating direction.

### Doryaspis

New source tools/devonian/creatures/doryaspis/rework-v3, clay01 actually rendered7 views.
Blend92977b2ea198748759e718fd994abada2ad79d56455602b4a4384c3a8d822ca8.
Root inspected all7, holds acceptance: conspicuous mouth above pseudorostrum remains visibly
contrary to user art direction; cranial/plate silhouette still smooth, appendage roots need
review. Read root-review-clay01.md. Existing primary reconstruction puts oral opening above
ventral pseudorostrum; don't silently invent jaw or claim user request satisfied. Resolve
shape/opening presentation explicitly. No material/rig/final eye audit authorized by clay pass.
Stethacanthus full rework still queued, existing source/public backup preserved.

### Michelinoceras

Astra /root/michelinoceras_attack_feeding_design SOURCE frozen motion-v3. Existing166-bone
rig has10 arms×16 sections; geometry/materials retained. Attack/Bite/Heavy/Eat independently
rewritten with flared travelling curvature and grasp/carry. Full19clips,LOD7,13 sockets planned.
Manifest0bc51090fbf5c5137aaf6dfd5fbd91738d44df83994ade7f74e3b8214794aad9.
Exact build_candidate.py passed, full19/LOD7clips exported. Original contract checker
rejected static root channels; independent v2 verifies every emitted sample equals original
bind exactly and PASS, no actual root motion. Original checker/manifest preserved.
Read validation-review-01/contract-validation-v2.json. Full45pose rendering now running;
LOD15poses follows, then original author art review. Not visually approved. Source preflight is not actual export QA.
Runtime Attachments.feed currently scales carry arc to TOTAL shell length, exceeding crown
reach. Must use soft-part/rig reach and progress-driven Eat after actual candidate approval;
adding FEEDING_PERFORMANCE alone is insufficient. See motion-v3 README/WORKING_STATE.

### Other reference briefs

Onychodus rework-v3 ANATOMY_REFERENCE_BRIEF.md frozen: paired bony parasymphyseal bases,
adult tusk interpretation, dermal cranial fields; Andrews figure4 still needs actual retrieval
before clay. No new model. Nahecaris and other refs queued with concrete shape targets.
Gemu/Dunk new face passes are queued; no facial mesh change yet. Preserve their working rigs.
Gemu previous research describes upward oral/dorsal eye anatomy: reconcile with latest visual
request explicitly; dorsal markings must not be construed as eyes.

## Repo / validation / execution

Repo /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo, devonian-assets.
Separate main worktree ../devonian-publish. Last previous own checkpoint a6008e8; resumed
feature fast-forwarded to concurrent main eb23dcc. Fetch/merge concurrent main; never force.
Commit finished frozen source/docs/status independently of mutable agent work. No broad add.
Do not stage __pycache__. No new production model was published on8Sept yet.

User-authorized workflow: Astra high creative research/sculpt/material/rig/visual judgment;
Terra medium deterministic Blender/export/render/check execution. Four active slots. Attempt
to spawn new Terra executor hit environment agent-thread limit (not user approval). Root ran
exact frozen commands directly; no claim that model setting changed. Reuse available agents
for their existing individual authorship; keep execution/output terse. No usage reset/schedule.
Blender5.2 /Applications/Blender.app/Contents/MacOS/Blender, CPU2, Mac startup needs escalation.

Latest before final status changes: typecheck/build and686 Devonian checks PASS. New
all-preview build/typecheck and686 Devonian checks PASS: ../devonian-authoring/review/resume-2026-09-08-preview-*.log.
Catalogue regenerated after Gemu/Dunk reopening. Fresh built viewer tab8 verified all21 Devonian and12 Cambrian preview labels;
recheck after main merge only if runtime files change. Original old4176 tab7 server had died;
root restarted4176 (session86616). New hidden tab8 is the current review surface.
Browser available built preview4176/viewer; don't interrupt user's5173 tab/server.
No site deployment claimed. Model requests target repo main.

This file is mirrored at ../devonian-authoring/CURRENT_STATE.md. Update after each meaningful
result/publication; current work does not reset or finish just because a new reference arrives.
