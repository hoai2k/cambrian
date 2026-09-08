# Titanichthys total rework — individual working state

## 2026-09-07T21:17:41Z — Titanichthys — anatomical and sculpt authorship

- Owner/model: Astra high.
- Status: authoring; initial-delivery gate confirmed by parent at main `f7b5618`.
- Scope: entirely new clay candidate, independent of the V1/V2 builder. Preserve every old source/public file. No integration, material baking, action export, or old-model audit.
- Reference inspected: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/user-reference/titanichthys-user-reference-2026-09-07.webp`.
- Decision: transfer the reference's deep oral/cheek chamber, large thorax, long swept pectorals, and differentiated posterior. Retain the fossil-supported broad shallow cranial roof, small eyes, and slender edentulous jaw margins. The roof's proportions are not the entire living head's depth.
- Primary sources checked: Boyle & Ryan 2017, DOI `10.1017/jpa.2016.136`, Cambridge article text; Coatham et al. 2020, DOI `10.1098/rsos.200272`, PMC/PubMed and Bristol repository records. Some direct PDF requests were rate-limited/forbidden; the accessible primary article records independently resolve the critical anatomical constraints. No further general research needed for this clay pass.
- Execution: none. Blender construction and rendering are reserved for a Terra medium executor after source freeze.
- Acceptance: three-dimensional form from side/front/dorsal/oblique, connected cheek-to-thorax contour, slender toothless oral margins, deep lined mouth, embedded small eyes, fleshy fin roots leading to long tapering membranes, and a muscular tail base. This is a creative clay review, not a final geometry/eye/export audit.
- Stop condition: actual clay renders require Astra judgment. Remain preview.
- Resume: finish independent build script, fixed multiview recipe, anatomical brief, and hash-bound handoff.

## 2026-09-07 — Titanichthys clay-01 — source freeze and execution handoff

- Owner/model: Astra high.
- Status: candidate-ready **source plan**; no Blender output or clay approval exists yet.
- Decision: independent continuous outer sculpture with incised plate transitions and substantial cheeks/thorax, sewn rolled lip and deep bent oral cavity, small recessed globes, cambered long closed pectorals, strong caudal support. Wide-gape shape study establishes the proposed hinge movement for review; final skeleton/actions/materials are deferred. Rig and colour direction are recorded in `ANATOMICAL_BRIEF.md`.
- Inputs:
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/build_clay.py`: `6d242a9542b5be441474515ad5ca4bf926baf0cb330fd9ebe9b2d6b0d2b63673`.
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/render_clay.py`: `746b7a2c0f62fe8286f1769a2fad3292d727b01dbe19019a705a1354ef7b696b`.
  - Preserved reference above: `36e15fd7b077975150b0bed164a66c8a188d37ed3e5774dbe3a53ac4014a5932`.
- Execution: exact two command groups and stop conditions in `HANDOFF.md`; both script hashes sent to parent for Terra dispatch. Astra has not run Blender and has not spawned agents.
- Output target: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/clay-01/` only. New directory guard prevents silent reuse. Expected `.blend`, construction report, eight rendered views and a hash manifest. No published assets touched.
- Actual validation: Python `ast.parse` passed both scripts (`STATIC_PARSE_OK`); hashes captured after final source correction. Numerical geometry checks await Terra execution.
- Resource used/remaining: bounded primary-source reconciliation and one new source build completed; one construction plus eight fixed renders delegated; no finalization budget consumed.
- Stop condition: await execution evidence and Astra actual-image review. Any source change invalidates this handoff. Terra must not repair creative inputs.
- Resume from: `HANDOFF.md` command group 1 after input verification, then command group 2 after successful construction; return to Astra after `TITANICHTHYS_CLAY_RENDER_OK`.

## 2026-09-07 — clay-01 review and clay-02 secondary sculpt

- Owner/model: Astra high.
- Status: authoring; clay-01 rejected as completed form after all eight actual views and user reference were inspected.
- Reviewed blend: `0ac6cdef7578f0fe7270673a5348a620d1d88a33a1b055a96eb29407fd1ac4bf`; manifest: `90affbf0f7a8a2fbe05a6cb111ee4929cb8dc636d63c1a2f741e7dc5af3be191`.
- Decision: depth improved, but generic inflated forebody, annular oral bowl/drain, undeveloped jaw architecture, scalloped seams, washboard posterior and hooked sheet-fin tips need structural sculpt correction. Detailed image-by-image findings are in `visual-review.md`.
- New files: `build_clay02.py` and `render_clay02.py`, separate from frozen clay-01 sources. Planned output only `.../devonian-authoring/titanichthys/rework-v3/clay-02/`.
- Next evidence budget: four renders, neutral side/front/three-quarter and open-jaw side. No fine texture, final skeleton/actions, exports or integration before convincing form.
- Stop condition: freeze revised source and hand off to Terra; no Blender execution by Astra.

## 2026-09-07 — clay-02 — secondary sculpt source freeze

- Owner/model: Astra high.
- Status: candidate-ready source; actual clay-02 remains unbuilt/unreviewed.
- Decision: nearly closed U-shaped jaw boundary with posterior commissures; much thinner anterior mandibular envelope; broad oral passage with rear downward turn; plate-scale cranial/thoracic plane sculpture; localized cheek/hinge/root forms; no periodic posterior or radial fin relief; swept cambered fins with single resolved tip caps. Full detail in `HANDOFF-clay02.md`.
- Frozen inputs:
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/build_clay02.py`: `a4142814eb10db533eef2063fb4bfdca147860020a988ab6dedbe3edf1de7955` (24683 bytes).
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/render_clay02.py`: `4103d297e3e1aab58924e79f194b716b5026863ca025a38941bfd0d9cffd2a8f` (3371 bytes).
- Execution: exact two commands in `HANDOFF-clay02.md`; CPU two threads, four fixed views. No Blender executed by Astra. Output only local `rework-v3/clay-02/`.
- Actual validations: both new Python sources passed AST parsing; the two frozen clay-01 script hashes were independently rechecked and preserved. New numerical geometry checks await Terra.
- Expected evidence: blend and construction hash report, four PNGs, render manifest. Improved anatomy cannot be accepted from code alone.
- Resource: one secondary sculpt source pass; next budget one build and four renders. Additional views only if the four establish promising form or expose a specific unresolved question.
- Stop condition: any execution error/source mismatch/path reuse, then actual-image judgment. No integration or finalization authorized.
- Resume from: `HANDOFF-clay02.md` construction command after input hash verification; return to Astra after four-render marker.

## 2026-09-07T22:04Z — clay-03 — ownership and structural redesign

- Owner/model: Astra high (new bounded sculpt author).
- Status: authoring. Inspected the actual `/Users/hoai/Downloads/Titanichthys.webp` and all four clay-02 PNGs; agree with `root-review-clay02.md` rejection.
- Decision: remove the polygon tangent-plane projection entirely; use a continuous rounded armour envelope with broad anatomical curvature and shallow curved sutures. Rebuild the blunted preoral contour, quiet recessed eye region, and lower oral architecture. A separately closed slender edentulous U rail represents the jaw envelope; the continuous floor behind it is compliant tissue that eases toward a fixed throat, rather than a rigid rotating ventral torso wall.
- Preserve: frozen clay01/02 sources/output; posterior outline, caudal support and fin endpoint layout. Reduce exposed paired-fin membrane thickness without changing endpoints.
- Scope: only new clay03 source, local output plan, individual state/design/handoff. No Blender execution by Astra, public integration, materials/rig finalization, Git, or shared checkpoint edits.
- Resume: finish new build/render sources, static checks, source hashes and exact four-view Terra handoff.

## 2026-09-07T22:11Z — clay-03 — source freeze and bounded execution handoff

- Owner/model: Astra high.
- Status: candidate-ready **source only**. No clay03 Blender output or art approval exists.
- Decision: continuous curved armour replaces all polygon plane projection; clean rounded snout/orbit; independent slender toothless mandibular arch; soft floor folds toward a fixed throat; posterior and fin endpoints retained with reduced exposed fin thickness. Full rationale and actual-view acceptance in `DESIGN-clay03.md`.
- Inputs:
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/build_clay03.py`: 23925 bytes, SHA-256 `97cc8492542755849f4fba27bb895aef6679dd973994791de1b1a30ff5fd2e87`.
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/render_clay03.py`: 3565 bytes, SHA-256 `9427fd6ba4a4a2bc04323020d3fa366e214202fe2d20019f305e089a298b7d81`.
- Execution: two exact command groups and stop conditions in `HANDOFF-clay03.md`. Terra medium only. Astra did not execute Blender or spawn another agent.
- Output target: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/clay-03/` only; preexisting directory is a hard stop.
- Actual validations: new Python AST parse PASS; analytic profile PASS at 5001 stations; four historical frozen builder/renderer hashes preserved. Full numerical construction and anatomy judgment await execution.
- Expected evidence: new blend/construction report, four fixed 1440×1080 renders and hash manifest. No material/rig/action/export/public work authorized.
- Resource: one bounded structural source revision; next one build and four renders. Inspect these before choosing any further creative step.
- Stop condition: source mismatch, existing candidate output, execution failure, or actual-image decision. No automatic fixes or silent candidate reuse.
- Resume from: root dispatches `HANDOFF-clay03.md` group 1 after verifying frozen inputs; after group 2, author/root inspect the actual four PNGs and compare with the actual reference.

## 2026-09-07T22:17Z — clay-03 — actual-image rejection and architecture proposal

- Owner/model: Astra high.
- Status: authoring; clay03 rejected as completed anatomy after independent inspection of all four actual PNGs. Do not advance to materials/rigging.
- Hash-bound evidence: blend `cef5249afb1dd79e98b86fd3a0d12809c6646717a3639350754ad3076298d00c`; render manifest `1a7f781d4a6abc4bc624c351f0822db77bbf29779a47e3f5a8e246220f6b81a6`. Both independently verified. Individual PNG hashes and detailed findings in `visual-review-clay03.md`.
- Findings: masonry/folds removed, but upper head now reads as a hanging helmet with a cut edge; orbit remains a bead; jaw rail separates visually from a triangular pouch wall; paired fins still appear as ribbons/slabs. Posterior silhouette and endpoints remain useful.
- Decision: no further ring-profile or additive-mask tuning. Proposed bounded new anterior cage with independent cranial/preoral/cheek/throat patches, inset mouth, thin closed tissue-covered mandibular envelope, medially recessed floor and posterior-only cheek membranes; explicit local fin sections rather than world-Z thickness offsets. Keep fossil-supported broad short roof/small eyes/toothless jaws and the reference's connected mass; do not copy its cutting edges.
- Execution: none during this review. No new builder or candidate path, Blender/public/Git changes. All prior source/output preserved.
- Resource boundary: next one structural source candidate and four comparable clay views, after a concrete landmark/patch ownership map. No materials/actions/exports or repeated broad research.
- Resume: parent reviews the bounded architecture proposal in `visual-review-clay03.md`; then the author can construct the explicit patch map and new head/fin source. Do not dispatch clay03 again or claim it is accepted.

## 2026-09-07 — clay04 — accepted architecture correction in progress

- Owner/model: Astra high.
- Status: authoring. Parent accepted the bounded structural proposal for authoring only.
- Decision: explicit shared anterior patch boundaries, inset oral rim, coherent narrow mandibular envelope, recessed floor and independently placed palate; real orbital openings with socket bridges; fins generated from local chord/normal sections. Ownership map saved in `PATCH_MAP-clay04.md` before construction.
- Preservation: clay01/02/03 and posterior/caudal scaffold remain unchanged. No Blender/public/Git/shared-state changes.
- Resume: finish the new source, static/numerical source checks, then freeze clay04 and four-view Terra handoff. No visual approval presumed.

## 2026-09-07 — clay04 — structural source draft saved

- Owner/model: Astra high.
- Status: authoring. `build_clay04.py` now has an independent six-boundary anterior cage joined to the retained posterior neck loop, one shared outer/inner lip, a medial floor, palatal passage, and two cut cheek windows bridged into closed orbital sockets. The detached rail object is removed.
- Fins: local span/chord/normal frames now generate true membrane width, modest camber and lenticular sections, mild downward dihedral and 11-degree gradual washout. Plan endpoints are retained; distal Z is lowered 0.22 units, explicitly part of this new form study.
- Validation so far: Python AST parsing passed the initial full draft; no Blender execution. Analytical source checks and the final frozen handoff remain.
- Resume: inspect the cage geometry and boundary/motion relationships numerically, correct source issues before freeze, then return exact hashes for one four-view Terra run.

## 2026-09-07T22:38Z — clay04 — frozen architecture-study handoff

- Owner/model: Astra high.
- Status: candidate-ready **source only**. No clay04 blend, render or visual approval exists yet.
- Decision: independent anterior cage boundaries with shared vertices and neck join; inset oral rim; one thin tissue-covered mandibular envelope with shared lining; medially recessed floor; separate palatal shape; two real socket windows; paired fins authored in local span/chord/normal frames. Patch ownership is in `PATCH_MAP-clay04.md`.
- Inputs:
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/build_clay04.py`: 27531 bytes, SHA-256 `7c5df220934b94b27ed4865feb912722c259c2a18ff0b8e7cee4a3641d78f73e`.
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/render_clay04.py`: 3565 bytes, SHA-256 `e45c9b6a72b32a7dddfbc7ccb4fd420f483dfa17fae3d20adfa4957f7273c613`.
- Execution: exact verification/build/render commands and stop conditions in `HANDOFF-clay04.md`, for Terra medium. Astra did not execute Blender or spawn another agent.
- Output target: new `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/clay-04/` only. Preserve all prior candidates.
- Actual author validations: AST PASS; 21,312 finite locally nondegenerate cage samples; corresponding sagittal floor separation; source-only closed topology PASS for body/lining/sockets and both paired-fin definitions. Scope/limitations in `AUTHOR_CHECKS-clay04.md`; Blender checks and visual/anatomical decisions remain outstanding.
- Preservation: all six frozen clay01–03 script hashes independently reverified unchanged. No public, Git or shared-state modifications. Posterior and caudal scaffold retained. Fin plan endpoints retained with explicitly authored 0.22-unit distal lowering.
- Resource boundary: one build and four comparable clay views. No textures, final skeleton/actions, exports or integration.
- Stop condition: source mismatch, existing output, execution failure, or actual-image judgment. No silent repairs/reuse or automatic advance to materials.
- Resume: parent dispatches `HANDOFF-clay04.md` group 1 after verification, then group 2 after construction passes; author/root review the exact four resulting PNGs.

## 2026-09-07T22:50Z — clay04 — four-view review and two-view oral inspection freeze

- Owner/model: Astra high.
- Status: review-needed; preserve clay04 pending targeted oral evidence, not an automatic broad rejection or material advance.
- Actual review: independently inspected all four clay04 PNGs. Fins now have useful area/camber and avoid the former slab impression; anterior cheek/preoral/shoulder relationships are more coherent. The side-gape triangular region alone cannot establish a wide wall versus recessed-floor projection. Detailed assessment in `visual-review-clay04.md`.
- Verified immutable inputs: blend `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/clay-04/titanichthys-clay-04.blend`, SHA-256 `69ad4e7d1daa7aec64835a198c9b13c4a017cf4aa441cd2e58ae9a4207c404ec`; original manifest SHA-256 `dd109e9bfd3d0c577ce280469a1fbab1196d66be0aea38432408561899026591`.
- New frozen source: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/render_oral_clay04.py`, 6537 bytes, SHA-256 `874ad7052a952e31c8fed36d58aa175a360d841c6c1f50254dd0f0a8cc9f4b53`.
- Execution: single exact command in `HANDOFF-oral-clay04.md`, Terra medium only. Same saved blend; two 1600×1200 matching close oral-front views at rest and existing open-gape study. New output only `clay-04/oral-inspection-01/`. No mesh edits or blend save; script rechecks fixed inputs and original PNGs after rendering.
- Actual validation: new renderer AST parse PASS. No Blender executed by Astra, no geometry/public/Git/shared-state change.
- Resource: exactly two diagnostic renders, CPU two threads/64 samples. Final eye audit remains after completed rework.
- Stop condition: any hash/path/scene mismatch or command failure; after both outputs, actual oral-surface judgment is required before further editing/materials.
- Resume: parent dispatches `HANDOFF-oral-clay04.md`; author/root inspect both actual PNGs for palate/floor/hinge continuity, intersections and the side-wall question.

## 2026-09-07T23:11Z — clay04 — coarse form approved; material authorship

- Owner/model: Astra high.
- Status: authoring material01. **Coarse form only approved** for blend `69ad4e7d1daa7aec64835a198c9b13c4a017cf4aa441cd2e58ae9a4207c404ec` after independent actual six-view review.
- Evidence: oral manifest `83f79de58ed6aee72cfb113a83091101b6f4299d32745f944bf6e5cf492e4503`, rest PNG `5897b5cd15a2f21fa921aa78d355d26fb3ecaebb84f08f88adc25f125cd8f076`, open PNG `67822f45815c04886956754e7e1743767aa4e603161d4a35f082b797c7d977ab`. All independently verified. The lip/floor/commissures are continuous and inset; no detached rail or lining panel is visible. Side triangle is consistent with projection.
- Decision: preserve geometry and proceed to anatomy-mapped armour/PBR study. Approval boundary in `COARSE_FORM_APPROVAL-clay04.md`; design in `MATERIAL_DESIGN-01.md`. Final eye/general audit, final rig/actions, exports and public intake remain outstanding.
- Scope: new local material01 source and frozen Terra handoff, no Blender execution by Astra or public/Git/shared-state changes.
- Resume: author region attributes, procedural PBR and UV bake source, material renderer, geometry-preservation checks and exact hashes.

## 2026-09-07 — material01 — regional source draft saved

- Owner/model: Astra high.
- Status: authoring. `materials_01.py` now maps armour pigment/suture roughness to the accepted cage, keeps a related flexible posterior and warm ventral/oral tissues, authors local fin-ray normal detail and dark socket-axis-aligned eye pigment. `render_material_01.py` contains four fixed study views.
- Geometry contract: before/after fingerprints include coordinates, polygon connectivity, all shape-key coordinates and object transforms. The source changes UVs, region/pigment attributes and materials only. Mirrored fin UVs copy by polygon vertex correspondence; the two eye axes use separate atlas halves.
- Atlas/source plan: editable procedural blend, baked mapped blend and six albedo/normal/roughness families (18 maps); body 2048, pectoral/caudal 1024, pelvic/dorsal/eyes 512. No GLBs or LODs in this material study.
- Validation so far: AST parse PASS; exact outer-head/fin attribute correspondence checked against the frozen cage layout; forbidden modelling/export operation scan PASS. Blender UV/bake/render execution remains Terra's work after freeze.
- Resume: finish source validation and exact hash-bound handoff, then await actual four material renders.

## 2026-09-07T23:29Z — material01 — frozen PBR source handoff

- Owner/model: Astra high.
- Status: candidate-ready material **source only**. Coarse clay04 form approved; material study remains unbuilt and unreviewed.
- Decision: anatomy-mapped blue/slate armour tone/suture roughness, related flexible skin, warm underside/lining, locally directed fin-ray normal detail and dark socket-axis eye pigment. No geometry displacement. Six atlas families and two editable/baked blends; four fixed material views.
- Inputs:
  - Coarse blend `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/clay-04/titanichthys-clay-04.blend`: `69ad4e7d1daa7aec64835a198c9b13c4a017cf4aa441cd2e58ae9a4207c404ec`.
  - Oral approval evidence manifest: `83f79de58ed6aee72cfb113a83091101b6f4299d32745f944bf6e5cf492e4503`.
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/materials_01.py`: 24593 bytes, SHA-256 `cbc010cc676f358e736165c5ace3e23e6c5d48f2d647c8545f18baa82ad6386b`.
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/render_material_01.py`: 5305 bytes, SHA-256 `5afbafe35231311454aef2067ba8b61168be128dc2052f2ef8db9e1b2421bf29`.
- Execution: exact two command groups, expected eighteen bake/four view markers and stop conditions in `HANDOFF-MATERIAL-01.md`, Terra medium only. Source fingerprints coordinates, topology, all shape keys and object transforms before/after material work.
- Output target: new `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/material-01/` only, verified absent at freeze.
- Actual validation: new AST parses PASS; exact cage/fin attribute correspondence checked; scope scan excludes modelling/export operations; all frozen clay04 sources reverified unchanged. UV, bake, geometry preservation and appearance remain to be executed/reviewed.
- Preservation: no Blender run by Astra, public/Git/shared-state changes or old-source/output edits. No rig/action/export/LOD work.
- Stop condition: any hash/path/scene mismatch, UV/bake/render error or geometry-preservation failure; then actual material judgment after the four views.
- Resume: parent dispatches `HANDOFF-MATERIAL-01.md` group 1, then group 2 if successful. Author/root review exact rendered materials. Final eye/general creature audits remain after completed rework.

## 2026-09-07T23:55Z — material02 — frozen corrective source handoff

- Owner/model: Astra high.
- Decision: independent actual four-view review rejects material01 finish while preserving clay04 coarse form. The blue-grey clouds, weak armour differentiation and invisible fine fin/dermal detail require material correction. Oral geometry remains coherent. Evidence and hashes in `visual-review-material01.md`.
- Built-in ImageGen: executed and inspected two original slate-blue pigment swatches. First rejected for ringed pebbly cells; second accepted as a colour-only source. Original tool files and copied local candidates both preserved. Exact prompts/provenance in `imagegen-dermal-provenance.json`; no reference pixels or Gemuendina swatch used.
- New source: original pigment sampled with normal-weighted three-plane, edge-blended mapping; stronger anatomy-bound plate tones and narrow distance-based sutures; independent fine normal/roughness; quieter posterior; visible local fin rays; restrained moist oral floor/palate distinction. No geometry edits or displacement.
- Frozen authoring script: `materials_02.py`, 30626 bytes, SHA-256 `302905617819ca475c43607b3791524b308036ba7c3d3da378f4e5681e83198a`.
- Frozen renderer: `render_material_02.py`, 5561 bytes, SHA-256 `a8d1bdf0aab756368aa4c3df72dc3e4ba050edab287c99468c85e7e73793622e`.
- Frozen accepted pigment: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/material-sources/titanichthys-dermal-imagegen-02.png`, 1435797 bytes, SHA-256 `2e208ae8f68a51c412a70dd3031a67adecb3512269d833984d8279974874643f`.
- Provenance SHA-256: `fdfc86c3feb44c7dafb3b5bd4429c66422c428fb1887da32ac2f5a6041f72fde`.
- Execution: exact two frozen command groups and all input hashes in `HANDOFF-MATERIAL-02.md`, Terra medium only. Body 4096, pectoral/caudal 2048, pelvic/dorsal 1024, eyes 512; eighteen maps and the same four material comparisons. Before/after geometry fingerprints remain mandatory.
- Output target: new local `material-02/`, verified absent. Source/procedural and packed mapped blends; no export/LOD. All prior candidates preserved.
- Actual validation: Python AST PASS for both scripts; source operation scope checked; all clay04/material01 frozen sources unchanged; material01 evidence hashes verified. No Blender executed by Astra, no public/Git/shared-state changes.
- Status: candidate-ready SOURCE ONLY. No material02 render exists or is approved. Coarse form approval persists; material, final eye/general, rig/action and export reviews remain outstanding.
- Resume: parent dispatches group 1, then group 2 if successful; author/root inspect the exact four material02 images. Stop on any mismatch/error or actual-image issue. Do not advance automatically.

## 2026-09-08T00:24Z — material02 gate / production candidate01 source

- Owner/model: Astra high. Status: authoring production candidate01, source nearly frozen.
- Actual gate: independently inspected all four material02 views and user reference; accept for animated-candidate phase only. Exact blend/report/manifest hashes in `MATERIAL_GATE-02.md`. Fine pigment, sutures and fin rays are readable; oral geometry remains coherent. Eyes conspicuous and still require completed-candidate actual-volume plus four-direction visual audit, full and LOD.
- Saved source: `rig_actions_01.py` (25 bones,18 bespoke clips); `candidate_01.py` (immutable rest geometry, semantic jaw/floor correspondence check, PBR export copies, palette regions, filtered vertex-pigment LOD); `export_patch_01.py`; structural checker and21-view renderer. Design in `RIG_ACTION_DESIGN-01.md`.
- Actual author checks: all new Python ASTs pass; 90,430 semantic vertices; finite normalized head weights, maximum4 influences;18 distinct pure motion trajectories; loop/recovery seams and held Death pass. No Blender execution by Astra.
- Resource decision: preserve source maps and4096 body albedo; explicit lower export normal/roughness resolutions, judged in candidate renders. Raw size is reported; final packaged<25MB remains a delivery gate. Fullrest geometry unchanged; LOD target<40%.
- Resume: complete frozen manifest/commands, parent dispatches Terra build then structural check then bounded21PNG group. No final eye/general audit, playback approval, export acceptance or public/Git/shared-state changes yet.

## 2026-09-08T00:29Z — candidate01 — frozen production source handoff

- Owner/model: Astra high. Status: candidate-ready SOURCE ONLY.
- Frozen manifest: `frozen-candidate-01.sha256`, SHA-256 `409b98c91c1eca91cc2af051a53cc1685aa4305af82953796a977a3f3722f3e6`. It binds all six production sources/data, accepted material inputs and18maps, gate/design documents. Exact commands/stop criteria in `HANDOFF-CANDIDATE-01.md`.
- Builder SHA-256 `e8b79f0dccfabea3e2e9dae07514fdafe00414e8b9d52e714e86fd143c5b2fcc`; rig/actions `47208081c18809057edae80475b4e80ea46921d56df01d933601d1529f051902`; renderer `de92bd080d651123316c3f659b26c919a9f629df5defc60063aad30798fe4481`; structural checker `768a06d2838e3706fac86587438fa441e96a95c6dd3440fa7832aab5ce3ff894`.
- New local output only: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/candidate-01`. Preserves approved rest geometry and all prior source/output.25 bones,18 actions,5 nested anchors; full PBR and palette-compatible filtered vertex-pigment LOD<40%; four portraits+17 diagnostic images.
- Author validation: AST and pure rig/weight/action/interpolation checks PASS. No Blender/public/Git/shared-state changes by Astra. No generated candidate or rendered/audited final result exists yet.
- Resume: parent dispatches Terra group1build, group2structural checks, group3bounded21PNG evidence, verifying frozen manifest before/after each. Then author/root actual image/playback review. Final full/LOD actual-mesh eye-volume and four-direction orbital/general audits remain mandatory after completed rework; no old audit accepted. Final losslessly packaged<25MB gate also outstanding.

## User pause — resume later from the frozen candidate01 handoff

Current refinements are tied off as source only. Parent received the final frozen manifest digest `409b98c91c1eca91cc2af051a53cc1685aa4305af82953796a977a3f3722f3e6`; no Terra candidate build, export, render or final audit has run. Do not begin another phase during this pause. On explicit resumption, verify that manifest and continue with HANDOFF-CANDIDATE-01.md group1. The parent owns checkpoint/push and overall pause state.
