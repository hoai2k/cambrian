# Devonian authoring checkpoint — 7 September 2026, 18:01 UTC

This is a resumable work checkpoint, not a completion report. The user requested it to preserve context and judge remaining token use. Update the current status as deliveries land; do not infer that drafts are approved from their presence on disk.

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
