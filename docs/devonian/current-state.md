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

### Gemuendina — newest terminal-snout correction

User rejected published main0b639d0 mouth interpretation: front flap itself IS
terminal mouth, not an opening set back on the top. Eyes closer together like
nostrils immediately above snout. Prior candidate02 audits only apply to preserved
candidate02 and are not acceptance of this new requirement. All remain preview.
Root study03/04 shifted the mouth but produced a folded ventral apron; rejected.
New dedicated Astra high /root/gemuendina_terminal_snout owns study05: separate
upper/lower/ventral profiles and oral cavity from terminal lip ring, eyes±.125,
smaller .55, smoothly removes old orbital ridges. Terra executing CPU2, side first.
Read face-v4/TERMINAL_SNOUT_STATE.md for hashes/recipe. All6 actualimages specialistaccepted, root side/oblique/dorsalaccepted. Production05
transfer/structural/fullLODeye+oralchecksPASS. Actual12viewexportreview running,
portraitsqueued. Specialistmustreviewcurrentriggedmouthbeforepublic/main.
Accepted V3 posterior/materials and original94file backup preserved.

### Dunkleosteus — face V4 delivery close

Candidate03 full/LOD export and173feeding poses PASS both eyes and zero opposing
shell/gnathal failures. Six sculpted gnathals adjusted for receiving lanes; posterior
upper plate has rounded shoulders/tapered curved edge. Source/rig/body/interior
preserved. Author reviewed all20actual full/LOD/portraitimages; full art accepted,
butLODwhiteCOLOR0 masked correctCOLOR1. Pigment04 exact shader-binding derivative
preserves all non-colour JSON and BIN, geometric audits explicitly carried forward
via equality proof. Eight correctedLODposes complete, root reviewed key3+fullEat
andselect; owneracceptedall8focusedfacepreview with explicitcolourlimitation. LOD visibly losesfinepigment/looks paler; broad
material/LODpolish remains preview. Finalizer04 andselectedintake/build/typecheckPASS;
publicfamilycopied, builtviewerIdle/Heavy.4667verified18clips. Maincommitnext.
Commands/hashes in face-v4/WORKING_STATE.md. Neveruseoldfinalizer03/whiteLOD.

### Titanichthys — candidate06 held at specific diagnostic gates

Candidate06 all23images reviewed byauthor, rootAbility/oblique: improvedform/material
survives butpairedpaleoralpatches inAbility. RootfrozenV1 actualtriangleprobe confirms
undersidefirst80full/94LOD vs0inBite/Eat; authorverifiedpairedsectioncrossings: real
localdeformationinversion. V2eyeaudit failed excessrayintersections onclosedfullbind
(no boundarycaps); NOcontainmentPASS. Authorfreezingdiagnostic withoutweakeninglimits.
P1lossless exactequality/all18clips PASS butsizebudgetFAIL:full36,046,104B/LOD2,343,984B.
Embeddedimages30,324,633B; nonimage5,721,471B meansgeometryalonecannotreach25MiB.
Raw06outputs/artifacts and allfailureevidence preserved. No publicreplacement.
Astra /root/titanichthys_rework_clay03 owns nextdiagnostic/correctionhandoff.

### Coccosteus — candidate04 actual export/portraits done, art review next

Candidate02 whitecranialpatches diagnosed as roughness UVbakeholes. Candidate03
bake02stopuncoveredalbedo preserved. Bake03 pairedtest provesinheritedmargin
ADJACENT_FACES16 had1311invalidborderpixels; explicitEXTEND32 haszero withidentical
broadinteriorpigment. Candidate04 downstreamonlyfromacceptedbake03 now TerraPASS
all4groups, full/LOD18/18clips, atlascomplete,4portraits+19reviewviews. No publicrelease.
Manifest8c78e16bafb72c157f5bc54eebf1802c4d56dbbfca07ee2252680169c46a4d2e verified111inputs.
OwningAstra inspectedall23: fullPBRseamrepairPASS, butHOLDforLODlongitudinal
smears/losttransversebars,finrayblotches,patchyarmourandjaggedoralrim. Explicit
topology-awareLODdirectionbeingfrozen, thenstopfortoday; nofurtherexecutions.

### Bothriolepis

Material03 executed8views and root reviewed all: HOLD. Uniform pale olive shield,
visible forehead midline difference and four-sided oral transition persist. See
root-review-material03.md. Avoid another full rig/export on this finish. Original author
independent review/substantial targeted correction pending. Materials01/02/03 preserved.

### Cambrian Odaraia

Material01 executed6 dark/light views. Root inspectedall6: HOLD glass-like shell glare,
marble-like eyes and uniform tan limbs/tail. See root-review-material01.md. Keep translucent
wrapping coat geometry; next study needs cuticular finish. Rig/action source direction saved
in ATTACK_EAT_RIG_DIRECTION.md. Author next material review pending; no public replacement.

### Doryaspis / Stethacanthus

Dory clay01 actually rendered7views; root HOLD mouth presentation above snout contrary user
art direction, jagged rim and abrupt roots. Read root-review-clay01.md for anatomical evidence
versus requested presentation. Steth full rework remains queued. Backups intact.

### Michelinoceras

Completed motion art60views, runtime actual full/LOD/prey12scenarios, strict intake and
lossless packaging. Final family runtime-intake-02/family copied to public for viewer check:
full SHA646fe1ec885296d6195783fb9fc591d49e5c7212d0d11a0214ed5aecb0495cc1,
LOD SHAc1005758eee00eaca5b1e73ace492a5fcc5fda3ec60f5cb21c880e00e5fabf82.
19/7clips,166bones,13anchors. Runtime follows authored grasp with bounded pickup correction,
rig-scaled aperture and progress Eat; old models/Opabinia retain previous route.
Exact identity scale channels accepted; measured sub-ppm exporter noise canonicalized only
in separate hash-bound derivative (max posed displacement4.957e-7). Original evidence preserved.
See motion-v3/RUNTIME_HANDOFF.md and immutable48input handoff in local authoring.
Fresh built browser4176 viewer loads19clips; root inspected Eat reach .25s, basket .70s,
closed crown1.30s. This verifies viewer GPU poses; real-prey scenarios were production headless
runtime, not interactive controller play. Published on main8730c96 (ownac16d82), pushed. Model stays
preview because broader individual quality refinement and controller playtest remain.

### Other reference briefs

Onychodus rework-v3 ANATOMY_REFERENCE_BRIEF.md frozen: paired bony parasymphyseal bases,
adult tusk interpretation, dermal cranial fields; Andrews figure4 still needs actual retrieval
before clay. No new model. Nahecaris and other refs queued with concrete shape targets.
Gemu and Dunk face passes are in progress as detailed above, not merely queued. Preserve working rigs and backups.
Gemu previous research describes upward oral/dorsal eye anatomy: reconcile with latest visual
request explicitly; dorsal markings must not be construed as eyes.

## Repo / validation / execution

Repo /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo, devonian-assets.
Separate main worktree ../devonian-publish. Latest own checkpointbc79286; concurrent c08e039 included.
Main0b639d0 and feature84ea9bc pushed to same GitHub repository over SSH. HTTPS fetch works; HTTPS push lacks credentials. Use explicit git@github.com:hoai2k/cambrian.git for push. Fetch/merge concurrent main; never force.
Commit finished frozen source/docs/status independently of mutable agent work. No broad add.
Do not stage __pycache__. Michelinoceras motion delivery is published; Gemu face candidate02 is published too.

User-authorized workflow: Astra high creative research/sculpt/material/rig/visual judgment;
Terra medium deterministic Blender/export/render/check execution. Four active slots. Earlier executor spawn hit a temporary agent-thread limit. New /root/frozen_blender_execution
Terra medium is now working, plus dedicated Astra high /root/dunkleosteus_face_v4. Root ran
its Gemu frozen execution directly without claiming a model switch. Reuse available agents
for their existing individual authorship; keep execution/output terse. No usage reset/schedule.
Blender5.2 /Applications/Blender.app/Contents/MacOS/Blender, CPU2, Mac startup needs escalation.

After concurrent c08e039 merge: typecheck/build,688 Devonian checks and23debug checks PASS. New
all-preview build/typecheck and686 Devonian checks PASS: ../devonian-authoring/review/resume-2026-09-08-preview-*.log.
Catalogue regenerated after Gemu/Dunk reopening. Fresh built viewer tab8 verified all21 Devonian and12 Cambrian preview labels;
recheck after main merge only if runtime files change. Original old4176 tab7 server had died;
root restarted4176 (session86616). New hidden tab8 is the current review surface.
Browser available built preview4176/viewer; don't interrupt user's5173 tab/server.
No site deployment claimed. Model requests target repo main.

This file is mirrored at ../devonian-authoring/CURRENT_STATE.md. Update after each meaningful
result/publication; current work does not reset or finish just because a new reference arrives.
