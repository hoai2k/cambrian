# Devonian authoring checkpoint — 7 September 2026, 18:01 UTC

This is a resumable work checkpoint, not a completion report. The user requested it to preserve context and judge remaining token use. Update the current status as deliveries land; do not infer that drafts are approved from their presence on disk.

## Current execution update — published initial library; phased reworks active

**Verified pushed main: f7b5618**. Complete initial library commit 6cd8de7 and concurrent-main
integration/workflow commit 69b35a0 are included. All 21 creatures and every initial supporting
asset set are on main. The separate non-creature completion notification WAS sent to the user.
There are 3 final / 18 preview creatures, including all six requested total reworks.

User authorized model-specific delegation: **gpt-6-astra / high** for anatomy research,
sculpting decisions and implementation, rig/animation design, complex merge judgment and visual
approval; **gpt-5.6-terra / medium** for frozen-script Blender runs, renders, exports, packaging
and established tests. See `agent-workflow.md`. Batch mechanical work, use compact hash-bound
handoffs, return unexpected design/failure decisions to Astra. Avoid duplicating full history.

Active new creative authors (each explicitly spawned as Astra high with compact context):
- `/root/titanichthys_rework_design`: new rework-v3 research/sculpt brief + Blender clay source.
- `/root/gemuendina_rework_design`: new rework-v3 research/sculpt brief + Blender clay source.
Both preserve old public/source files and write own WORKING_STATE. First deliverable is a frozen
script/render handoff, then `/root/devonian_execution_handoff` (Terra medium, currently idle)
runs it and parent/Astra reviews the resulting form before materials/rig/full actions. Keep one
execution slot free instead of putting all workers into creative phases. Remaining full reworks:
Doryaspis, Coccosteus, Bothriolepis and Stethacanthus. Named Coccosteus backup remains preserved.

All integration checks passed: typecheck/build, 644 Devonian checks, 21-creature/47-prop asset
inventory, era isolation and loader regression. Stale Vite HMR initially failed scenery QA;
Astra provided fresh isolated 4181 server (session62072) and corrected baseline isolation.
All three runs pass: low 1,307,304 / high 8,087,473 / baseline 1,211,203 triangles; 104 calls,
errors[], clean disposal. Astra visually reviewed low/high images. Viewer4176 was rebuilt and
reloaded; pending labels are present, and Manticoceras rendered with its 19 actions available.
Logs: `../devonian-authoring/review/workflow-merge-*.log`.

Concurrent main scenery export library (24 files) and environment mappings are preserved.
The explicit instancing collection owns its mappings, quality threshold and two intentional
procedural giant exceptions, preventing underwater land-plant fallthrough. Remote day/night,
UI and ecology changes remain. No original Cambrian creature files changed.

## Latest additional reference — Odaraia and first clay execution

User added **Odaraia (Cambrian) TOTAL REWORK**, preserving original as backup. Queue is
`docs/cambrian/refinement-queue.md`: many-legged shrimp-like form, prominent compound eyes,
shaped open wrapping coat-like carapace with partial transparency, not a cylinder. Existing
Devonian jobs continue. Seven requested total reworks now take priority over general refinements.
Named local backup `../expansion-authoring/backups/odaraia-pre-rework-2026-09-07/` contains
23 files / 44,616,856 bytes plus backup-manifest.json. Terra verified all 24 source/copy pairs
including user reference; reference SHA 01c3449922bf37fb7e00956dc0c05c13650a7bdc3aa1a4d4e19d703cc2ffde7c.
All original Cambrian public model/portrait bytes remain unchanged. New derived status map
`src/content/cambrian/model-status.ts` marks pending Odaraia preview in both game and viewer.
Typecheck/build/era checks pass; actual viewer displays its preview badge. No old geometry audit.

Gemuendina's first new clay source is frozen: `tools/devonian/creatures/gemuendina/rework-v3/HANDOFF.md`,
manifest SHA 37b2372eccf4df0425c6662424d038eaa6137371e211fa75555cef5a6585786c. Terra executor is running
its two frozen Blender commands with additional --python-exit-code 1. Outputs only local
`../devonian-authoring/gemuendina/rework-v3/clay-01/`. Eight fixed clay renders, no final rig/textures
or public export yet. Parent and author review actual output before next creative phase.
Titanichthys creative source remains in progress; do not stage its un-frozen folder.

Parent saved Coccosteus preproduction in `tools/devonian/creatures/coccosteus/rework-v3/design.md`.
TUG 1817-152 identity verified via institutional catalogue; detailed specimen page unavailable.
No new Coccosteus builder yet. Preserve backup and use the notes to avoid repeated research.

## Latest priority — supersedes older refinement sequencing below

The user now requests carefully authored INITIAL versions of every creature and every plant,
prop and supporting image first, committed early to main, then full refining passes. Existing
quality and eye requirements remain, but extended repeated art/collision reviews are deferred
and recorded. Do not block initial delivery on final-art perfection. Mark unfinished models
**⚠ Preview model** on the game choice cards and viewer. The lifecycle source is
`src/content/devonian/model-status.json`; three reviewed models are final; all pending refinements, including six requested total reworks, are preview.

Current initial collection: **21/21 creatures integrated; 3 reviewed/final + 18 preview**.
Initial collection and complete supporting library were pushed as **f7b5618** on main, with feature **69b35a0**. Latest two cephalopods and eleven instancing proxies are integrated and verified.
A separate main checkout at `../devonian-publish` avoids disturbing active authoring edits.

Six user-directed TOTAL REWORKS: Titanichthys, Coccosteus, Bothriolepis, Doryaspis, Gemuendina, Stethacanthus.
All user images are preserved under each local creature/user-reference folder. Coccosteus has a
named complete published/source/Blender backup under local/devonian-authoring/backups.
The pending-refinements.json ledger prevents catalogue generation with a pending model marked
final. Finish initial creature delivery to main, then prioritize total reworks. Run eye/general
creature audits only AFTER completing each total rework, per latest user instruction. Do not
repeat audits of superseded geometry. Other individual refinements follow the total reworks.

Initial non-creature outputs prepared: 47 scenery models and 9 runtime paintings already main;
11 dedicated instancing proxies plus renderer config ready (High uses authored ordinary flora,
Performance retains procedural flora; 2 giant silhouettes remain procedural exceptions);
29 scenery appearance boards, 9 regional boards, 3 lighting concepts, 10 material source sets,
2 RGBA atmosphere atlases prepared. Both scale plates are complete and verified, with all21 models, uniform 600px/metre and explicitly separate 5× inset.
T01–T05/T07–T09 numerical maps and T06/T10 Blender-derived atlas data were independently
checked and corrected for normal green convention and inherited denoising; source albedos unchanged.
Supporting-asset-review.json has evidence. Original imagegen sources and exact prompts are saved.
All initial sets have been verified on main; the requested separate completion notification has been sent.

Agent handoffs complete: eye_audit delivered scale plates; titanichthys delivered scenery and
supporting-data QA; dunkleosteus delivered Michelinoceras.
All initial author handoffs and source projects are saved. New Titanichthys and Gemuendina full reworks are active as described above.
Manticoceras and Michelinoceras final hashes are in preview-delivery.json after lossless packaging.

The pending local Onychodus palatal-pocket edit is NOT exported: tracked build.py matches the
shipped GLB; do not run the local assembler without reviewing it. No full-refinement loop should
restart before the complete initial collection exists. Older sections below retain useful evidence
but their production order and numerical progress are superseded by this update.

Latest post-merge typecheck, build and Devonian test commands completed successfully. No non-creature completion notification has been sent; the outstanding list above is still required. The user repeated the request to save state after every meaningful handoff. Keep this file and local SESSION_CHECKPOINT.md synchronized; each author also maintains WORKING_STATE.md.

## New user feedback — Doryaspis and milestone notification

See refinement-queue.md. User reference preserved locally, requested lower mouth placement,
turtle-like dorsal surface pattern and tail appearance/motion. Current dorsal opening is indeed
modeled mouth; resolve anatomical relationship carefully at refining stage, not during initial
library production. Doryaspis and Gemuendina reopened as preview (7 reviewed/final, 8 previews among current15).
Gemuendina user reference preserved locally; requested fuller ray-like sculpt and flowing fin/tail
contours, not a flat toy. Both requests are explicitly queued AFTER complete initial delivery.
Give a separate explicit notification when ALL non-creature initial assets, including remaining
material/reference/atmosphere/scale images and runtime placements, are committed/pushed main.

## Scope and completion

User wants 21 individually considered Devonian creatures, high-quality Blender geometry and materials, dynamic game-compatible actions, actual modeled oral anatomy where applicable, three specimen anchors, source/intermediates under `cambrian/local`, natural-history/art documentation, viewer integration, and finished work merged/pushed to main. Early approved deliveries are authorized. Eyes must be at least 50% inside the continuous body/head, with a preferred margin above 65%; ornamental rims cannot make an audit pass. Dunkleosteus specifically needs a real oral interior and moving jaw bones used in animation. Those Dunkleosteus requirements are already delivered.

**At this checkpoint: 9/21 creatures are reviewed and published; 2 are in final review; 2 are being refined; 8 have no finished model.** There are 47 scenery prototypes but zero approved shipped props. Most completed work involved rebuilding the first eight specimens following the user's quality criticism. No completion date or remaining token count has been promised.

## Repository and environment

- Shared checkout: `cambrian/local/expansion-repo` (absolute parent on this machine: `/Users/hoai/Documents/Stuff/Generations`). Current working branch: `devonian-assets`.
- Verified pushed main and feature HEAD: **09591be**, `Merge texture-aware creature palette rendering`.
- Fetch/push through `git@github.com:hoai2k/cambrian.git`; the configured HTTPS origin tracking ref is stale, so an 'ahead of origin/main' count is not authoritative. Other agents actively push main. Fetch and merge without force; preserve their changes.
- Local authoring: `../devonian-authoring/<creature>/` relative to the repo. Packed `.blend` originals and intermediates stay local, outside the git source tree. WIP sources remain under `tools/devonian/creatures/<id>/`.
- Blender: `/Applications/Blender.app/Contents/MacOS/Blender`, version 5.2. Use background `--threads 2 --python-exit-code 1`; this Mac requires the authorized elevated process for initialization. CPU Cycles works; Metal compilation stalled for an author, who reverted to CPU. Avoid unbounded extra rendering jobs.
- Vite on 5173; built preview on 4176. User unlocked the Mac, so interactive viewer checks work. CUA has `reviewTab` for browser `2`, tab `4`, URL `http://127.0.0.1:4176/viewer/`. If this binding is lost, select the tab through the documented CUA entry point. Use CUA for the user's browser. Independent headless Three.js test harnesses may run through the local engineering tools.
- Bundled Python: `/Users/hoai/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3`; has Pillow, pdfplumber and pypdfium2, but not fitz. `pypdfium2` successfully extracts/renders reference PDFs. Bundled `pdftoppm` works with noisy font configuration warnings; do not assume a sibling pdftotext exists.
- Read `CLAUDE.md` and `docs/creature-intake.md`. New shipments require catalogue, asset sizes, stand-in removal and Devonian tests. Do not hand-edit generated swimming stats. Original Cambrian public creature files must remain unchanged.

## Published models — all now reviewed

| Creature | Full / LOD eye containment | Principal completed revision |
| --- | --- | --- |
| Dunkleosteus | ~84% / ~84% | Compact head and muscular trunk, continuous armour, imagegen/UV integument, articulated skull and jaw, real palate/cheeks/floor/pharynx; removed internal caps and jaw-floor defects. |
| Titanichthys | ~88% / ~88% | Broad flattened toothless head, modeled narrowing oral lumen, corrected UVs and fin membranes. |
| Coccosteus | ~82% / ~82% | Rounded cranial/thoracic armour, corrected proportions and jaw shape, real oral tissues, corrected pigment boundaries. |
| Bothriolepis | ~79% / ~79% | Angular continuous armour, jointed dermal pectorals and flexible posterior, genuine ventral oral recess. |
| Gemuendina | ~82–83% / ~82–83% | Low broad cranial wedge, undulating pectorals, finless tail and shallow upward-facing articulated mouth. |
| Doryaspis | ~81% / ~81% | Short rigid pseudorostrum, fixed cornual plates, dorsal/ventral shield asymmetry, hypocercal posterior. |
| Cladoselache | ~77% / ~77% | Blunt continuous head, attached cladodont teeth and lined jaw, soft branchial recesses, broad fins, anterior dorsal spine, keeled crescent tail. |
| Stethacanthus | ~80% / ~80% | Short head, lined articulated mouth, supported flared spine-brush and denticle fields, cambered fins/whips; fixed a real posterior-fin root gap in Swim. |
| Cheirolepis | ~80% / ~80% | Scottish C. trailli, long articulated jaw, real oral tissues, fine rhombic relief, gill covers and ray-supported fins. |

Each has 18 full action clips, three LOD clips, the same skeleton in both levels, and three version-one nested anchors. See each committed `README.md`, `eye-packaged-review.json`, and available visual/runtime evidence. `docs/devonian/art-review.md` summarizes the current approvals. Packaged eye reports identify exact shipped hashes; raw source exports have different hashes after lossless compression.

Recent delivery commits:
- `2550fe3` Coccosteus revision and Cheirolepis first delivery; merged/pushed as `fa1564e`.
- `70a9aba` Cladoselache V2, `3f9825c` Stethacanthus V2; integrated with concurrent main through `fe573d3`.
- `92d2391` texture-aware palette normalization; integrated/pushed as `09591be`.

Cladoselache packaged bytes: 9,644,796 full / 1,171,792 LOD; 136,556 / 38,232 triangles, 22 bones.
Stethacanthus packaged bytes: 15,733,048 full / 2,352,376 LOD; 262,784 / 78,220 triangles, 24 bones.

Both were inspected in the actual built viewer, all 18 actions selected while paused and frame-stepped, with jaw gapes inspected and no browser errors. Their final packaged eye audits used closed continuous heads without artificial audit caps.

## Current agent ownership

Do not stage or overwrite an active author's files. Ask for a frozen handoff before integration.

1. `/root/devonian_eye_audit`: **Rhinodipterus**, final rendering/reports. Per-creature `WORKING_STATE.md` requested. Next intended creature after handoff: Jaekelopterus, separately authored.
2. `/root/devonian_titanichthys`: **Tiktaalik**, geometry/material/motion refinement. Per-creature `WORKING_STATE.md` requested. It previously delivered Titanichthys, Gemuendina and Cladoselache.
3. `/root/devonian_dunkleosteus`: **Eldredgeops**, clay articulation/enrollment refinement. `tools/devonian/creatures/eldredgeops/WORKING_STATE.md` saved. It previously delivered Dunkleosteus, Doryaspis and Stethacanthus.
4. Parent `/root`: **Onychodus**, integration, shared viewer rendering fixes, and reference research for Acanthostega.

The user explicitly authorized individual subagents. Reusing an available agent for the next individual creature is allowed. Do not create new user-owned sidebar tasks for these subtasks.

## Onychodus — near delivery, but a pending palate change must be resolved

- Source: `tools/devonian/creatures/onychodus/`. Editable blend: `../devonian-authoring/onychodus/onychodus.blend`. Runtime candidate only: `../devonian-authoring/onychodus/v2-candidate/`; no public Onychodus yet. 'v2' is an internal directory name, not an earlier published version.
- Current exported full SHA: `536a42c3c21e3e7eaddc9271df8fc70110323a0c8c550d36c965ec02699b4dc7`, 9,970,892 bytes.
- Current exported LOD SHA: `092669867094e4f9498f0963af582a942b980255f2b80178492158762ba3d07c`, 2,355,212 bytes.
- 139,544 / 39,064 triangles; 25 bones; 18 / 3 clips; three nested anchors. Full PBR includes original `scale-source.png` imagegen art, authored rounded scale relief and buried fin-ray relief. The README contains the exact imagegen prompt and primary source links.
- Distinct anatomy: robust oval Gogo fish, separate anterior and posterior dorsals, long anal, nearly diphycercal deep tail without coelacanth filament, restrained fleshy paired fins, paired crescent tusk platforms and palatal recesses, marginal/palatal dentition, true floor and pharynx.
- Header/geometry/fin/material/export components are currently assembled by **local `../devonian-authoring/onychodus/assemble.py`** into the standalone committed-intended `build.py`. Edit components before running assemble; otherwise an edit directly to build.py will be overwritten. Components: `header.py`, `geometry-draft.py`, `fin-utility.py`, `fins-materials.py`, `export-utility.py`.
- Recent repairs: seated tusk platforms (originally pierced the lower front), corrected rostral pigmentation, rounded/thinned lip bridge with closed topology, removed raised ray tubes causing grazing-angle artifacts, matched paired and median fin-root skin weights to the torso.
- Current actual-GLB eye reports in `v2-eye-audit/` and `v2-eye-audit-lod/` show ~86–87% inside the closed head. Full Three.js all-18 playback passes finite transforms and fixed root at 91 phases each. `motion-review-v2.webm`, `playback-validation-v2.json` and `action-contact-v2.jpg` are local. All 18 representative Three frames were visually reviewed.
- Blender final full batch (four portraits, all 18 poses, three mouth views, six opposite-side jaw phases, side/dorsal) completed in `final-review-v2/`. LOD batch in `lod-review-v2/` also completed. **These must still be visually reviewed as a final set.** Root exec session 22756 was the full/LOD render job; logs `render-final.log` and `render-final-lod.log` show Blender quit.
- **Pending, not yet rebuilt:** Analytical inspection suggested the anterior tusk tips might intersect the palatal lining even though they stay inside the external skull. Local geometry component now broadens/deepens the paired pockets: gate `(y+2.49)/.065`, height `.245`, longitudinal center `-2.27`, width `.30`. The currently exported hashes above DO NOT contain that last edit. Verify actual tusk/head intersection rather than assuming the concern is proven; rebuild/inspect if warranted. This edit affects inner skull geometry, not rig motion or external eye positions.
- Planned check: import GLB at bind pose, build BVH of the actual closed upper-head solid, select tooth/whorl vertices by the `whorlL/R` bone groups, and reject tooth surface points inside skull tissue. Compare with the actual palatal pocket, not only the outer envelope. A new `check-tusks-export.py` was contemplated but **has not been written**.
- `render-final.py -- --refresh-mouth` was added to refresh portraits/oral views without repeating unrelated whole-body action shots; it skips the all-action loop. It has not been run for the pending pocket change. Final raw hash reports and portrait matching must follow the final export.
- Remaining: resolve palate seating; inspect matching full/LOD pose images; fresh applicable audits; source manifest; independent package/check; add shipment/stand-in/boot/catalogue integration; built viewer review; commit/merge/push. Do not publish the stale candidate while the pending anatomical concern remains.

Onychodus source references already read: Andrews et al. 2006 DOI `10.1017/S0263593300001309` (author-uploaded full text via ResearchGate); Campbell & Barwick 2006 `https://ijdb.ehu.eus/article/pdf/052125kc` (local PDF and rendered pages 2/3/4). Original authors disagree over active whorl motion; the four-degree modeled adjustment is documented as interpretation. The 1.5 m size is an extrapolation from a tusk, not a measured complete individual.

## Rhinodipterus — frozen geometry, final delivery report pending

- Local candidate: `../devonian-authoring/rhinodipterus/v2-candidate/`.
- Full SHA `ad29e4157364b09cf20716d00982d9ae13f4e9566db0f1d72e9fa96230f6c97c`, 14,875,052 bytes; LOD `56d4a9218027ce7ca2440c4cefc36ae4e9262e403a1706d3bfb30a84a76483f9`, 2,295,480 bytes.
- 216,511 / 57,751 triangles, 21 bones, 18 / 3 clips, three anchors; 9 / 0 textures.
- Full eyes 83.28 / 83.11%; LOD 83.32 / 83.16%; closed head and no caps. Actual root samples stay inside torso across all 18 clips, minimum clearance 0.014 model units.
- Parent approved matching `full-profile-v2.png`, `gape-profile-v2.png`, `gape-opposite-v2.png`, `closing-opposite-v2.png`, plus closing/gape oblique views. Rounded exterior nose lip replaces the red cut triangle; rear mandibular/throat flange removed; real radial tooth plates and shallow ~16-degree inferred gape. Body/fins explicitly comparative per Clement 2012 because fossil body/snout tip are incomplete.
- Author reports all 18 final Three clips and exact midpoint contact sheet visually reviewed. All four matching portraits now exist; ten final Blender action poses done. Remaining oral/eye close-ups, LOD renders and frozen report are in progress. No geometry changes are planned.
- **Untracked `public/assets/devonian/creatures/rhinodipterus.*` files are OLD V1 and must not be accidentally staged.** Replace them only with the reviewed frozen candidate. Shipped manifest currently excludes Rhinodipterus.

## Tiktaalik — substantive work remaining

Source/local ownership as above; authoring from primary 2006 pectoral, 2021 feeding and 2024 axial reconstructions. Broad shallow skull, mobile neck, robust four appendages with fin rays, no digits; aquatic support/paddling rather than routine terrestrial walking. Corrected too-short trunk by placing pelvis roughly two skull lengths behind shoulder. Distal tail outline is inferred.

Parent feedback: fix curved commissural fold (author found non-monotonic mapping), blend roots into muscular flank, remove squared tail, round thick front wall, harmonize fine cranial material with body, model concave oral depth. Latest author found lining overlap after jaw thinning and is correcting actual clearance. Eyes after thinning are ~73–74% full/LOD, lower bounds >73.1%; previous 86% report is stale. Current screenshots remain intermediate; no frozen handoff.

## Eldredgeops — substantive work remaining

E. rana, 17 dorsoventral lens files, 11 rigid thoracic tergites, inflated tuberculate glabella and rounded genal outline. Current source has 313 anatomical bones and 20 actions: all 18 shared clips plus Crawl and Moult. LOD intended Idle/Crawl/Death. No candidate GLBs yet.

Four clay iterations so far. Parent requested stronger glabellar inflation and axial/pleural definition, correct cephalon-first-ring overlap, tapered/flattened podomeres rather than ropes, and ventral branchial fans. Author is correcting cephalic/pleural transverse vaulting and coaptation for actual enrollment; antennae/limbs must tuck inside. Mouth is a ventral arthropod aperture with pharynx, gnathobases and hypostome, not a fish jaw.

Eyes require a tailored audit: real closed crescent ocular tissue integrated with cephalon plus per-lens actual solids; ensure each lens satisfies 50% rather than hiding a bad lens in a volume-weighted mean. No decorative rims count. See the saved per-creature WORKING_STATE.md.

## Eight creatures without finished models

Acanthostega, Walliserops, Jaekelopterus, Nahecaris, Furcaster, Palaeoisopus, Manticoceras and Michelinoceras.

Acanthostega reference research has started, but no builder exists. Downloaded primary papers in `../devonian-authoring/acanthostega/references/`: Coates 1996 (59-page postcranial anatomy) and Porro et al. 2015 (33-page skull CT reconstruction). Text extracted and selected figures rendered with pypdfium2. Parent viewed Coates Fig31 whole skeleton (PDF p41), Fig18 forelimb (p25), and Porro Fig8 skull (PDF p27). Eight unequal digits per limb, deeply finned long tail, internal gills, short weak neck, aquatic limbs; forelimb phalangeal formula 3:3:3:3:4:4:4:3 excluding metacarpals, hind reconstruction 1:2:3:3:3:3:3:2. No external axolotl gills or ordinary five-finger salamander hands. The newer skull has a longer postorbital region and hooked anterior lower jaw. References/soft-tissue interpretation need their own concise notes when authoring starts.

## Plants and props

47 untracked prototype variants in 29 families; all outside `tools/devonian/shipped.json` (props is empty). Source builders in `tools/devonian/props/`, sources and reviews in `../devonian-authoring/props/`. Do not stage/release them wholesale.

Six variants previously refined: two B01 massive stromatoporoids, two B04 massive tabulate corals, B10 fenestrate bryozoan and G12 organic remains. Remaining 41 still need individual material/geometry review and re-export after builder improvements. G12 derives actual Dunkleosteus jaw cutting fragments via `decode-source.mjs`, not generic whole armour plates; its description and appearance still need review. Global normal/PBR changes were not exported to every variant. Integration/placement must follow current procedural scenery contracts and `docs/redesign/09-devonian-remaining.md`.

## Shared palette fix and latest verification

Concurrent main made the viewer use each era's palette defaults. Actual viewer inspection found revised UV-coloured models were nearly black: `recolor.ts` normalized actual texture pigment by white vertex luminance. Commit `92d2391` samples cached UV albedo in linear space (including UV transforms, vertex pigment and material factor), retaining the original untextured path. It preserves era defaults; do not undo that upstream feature. No normal maps/roughness or asset bytes changed.

- `tools/recolor-texture-test.ts`: dark atlas patch, linear conversion, material factor, UV transform, mixed vertex/texture and legacy fallback all pass.
- `npm run palettes`: 21 original creatures, 176 materials, zero failures.
- `npm run portraits`: 21 preserved default sets and 36 scheme images pass.
- Typecheck and build pass. Actual built viewer shows correct Cladoselache countershade and Stethacanthus lavender rather than black; no browser errors. Full palette-slot naming refinement has not been done; no unrequested palette defaults were changed.
- Latest `npm run devonian`: **462 checks pass** after concurrent nursery, viewer/classification and scoreboard integrations. `palette-merged-devonian.log` records this.
- World tests passed after nursery changes. A concurrent new `tools/modes-test.ts` suite is/was running as root exec session 34778 (`palette-merged-modes.log`); last output has passing scoreboard checks, but do not claim final completion until process exit is read.
- Every asset packaging pass verified all 126 original Cambrian GLB/PNG files byte-identical and exact decoded numeric/material/weight/animation round trips. Use `tools/devonian/package.mjs <id>` before final packaged eye reports.

## Resume order

1. Read agent WORKING_STATE files and obtain their latest status; preserve active ownership.
2. Resolve the Onychodus pending tusk/palate concern, then finish its verification without repeating already valid unrelated checks.
3. Integrate frozen Rhinodipterus when report/LOD images finish; author may then take Jaekelopterus.
4. Continue individual Tiktaalik and Eldredgeops reviews and remaining eight creatures. Keep shipping approved examples early.
5. Review and integrate scenery individually. Verify every newly shipped creature appears in the built viewer and merge necessary integration changes to main.
6. Keep this status current and report partial completion honestly. The project is not done at this checkpoint.

A local manifest hashes 128 current source, state, candidate, report and Blender files: `../devonian-authoring/checkpoints/2026-09-07-1801-files.json`. These files survive context compaction. Unfinished sources are intentionally not added to the approved shipment manifest.
