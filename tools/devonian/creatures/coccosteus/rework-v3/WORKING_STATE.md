# Coccosteus total rework — current state

## 2026-09-07 — clay-01 — authoring frozen, awaiting Terra execution

- Owner/model: Astra high.
- Status: candidate-ready for execution; **not rendered, not reviewed, not approved**.
- Read first: repository CLAUDE.md, docs/devonian/agent-workflow.md, existing design.md and this
  state. Inspected actual user TUG image, saved Engelman Figure 7, old portrait and old builder.
- Decision: author new Coccosteus-specific cranial/cheek volume, rounded-planar thoracic shield,
  full short abdominal shoulder, rising compressed peduncle, low long dorsal, asymmetric tail,
  cambered thick-root paired fins, and a real lined jaw aperture. Clay contains no pigment or
  seam textures; volume must earn replacement of the old model.
- The existing complete named backup remains intact, as do public models and old source.
- Inputs (absolute + SHA-256):
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/clay.py`: `7e91fe87c5ae33c67aa4aa747cc74d59e65d31919ccf037e2f8c080011911e3d`
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/views.json`: `54c15132c6be7692b58a2e9bc777b4f8dcfdc02b50c46c8da8aa83aceedcb63f`
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/backups/coccosteus-pre-rework-2026-09-07/blender/coccosteus-v2.blend`: `251e55dee4cb7f3047e1d25ab9d6979977a201a903a8e992ce7950a22c6da146`
- Source changes: added clay.py, views.json, HANDOFF.md; appended design rationale here.
- Static validations: PASS Python AST and JSON parse, exact four body view names, positive axial
  widths, and monotone bounded interpolation over each HEAD/SHIELD/BODY/JAW interval. No Blender
  execution occurred. These checks do not establish visual acceptance.
- Outputs: no candidate files yet. Planned exclusive directory is
  `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/clay-01/`.
- Expected validation/evidence: editable blend + report; six new clay images (four fixed body,
  mouth-rest, mouth-open); four old clay images; complete hash-bound manifests. See HANDOFF.md.
- Resource: one bounded authoring pass complete; execution allowance 20 minutes/group, 60 total.
- Stop condition: wait for parent-assigned Terra medium; no executor spawned by this agent.
- Resume: verify three input hashes then run HANDOFF.md Group 1 exactly. Record one command group
  per state entry, then continue Groups 2 and 3 only on expected success. Return actual images
  to Astra. No material, rig, animation, audits, public integration, shared metadata or git work.

## 2026-09-07 — clay-02 — post-render correction frozen

- Owner/model: Astra high.
- Status: candidate-ready for execution; clay-02 **not rendered or approved**.
- Reviewed root-review-clay01.md and all ten actual clay-01 PNGs. Explicitly reject clay-01
  production form at blend SHA `4d728133a968e80707495ce3e2bb0f8699bdf471af41a342c2542cbe7c6b3b7a`.
  Old model retains organic appeal. Clay-01 evidence and old backup remain intact.
- Decision: eliminate universal polygon sections, sleeve/notch, lip cap artifacts, rectangular
  cheek boundaries and fin-tip upward points. Author rounded regional head/jaw tissue, shared
  oral equations, single shield-to-muscle surface, smooth rising peduncle and smaller swept fins.
  Correct dorsal camera scale to 6.65. Preserve low dorsal/asymmetric tail direction.
- Inputs (absolute + SHA-256):
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/clay-02.py`: `a0813a5b6210eec66f0bd57b5098dd023d798209153a732648a00f5fb6e58380`
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/views-02.json`: `7a935c568dd279632b229e3dd64c31d1b044e5909794afc5d65365d41e5a263a`
- Source: added new immutable clay-02.py, views-02.json and HANDOFF-02.md; appended design/state.
  No edit to clay.py, views.json, old candidate files, public files, shared state or git.
- Static validation PASS: AST/JSON parse; bounded monotone anatomical interpolation; finite main
  geometry coordinates; two-face edge incidence and no zero-area first triangles on generated
  HEAD/JAW/TORSO arrays; complete dorsal framing arithmetic. No Blender execution by Astra.
- Outputs: no clay-02 candidate files yet. Exclusive future output directory:
  `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/clay-02/`.
- Execution: parent assigns Terra medium; exact Group 1 build then Group 2 render in HANDOFF-02.md.
  CWD `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.
- Expected evidence: editable blend/report; side/front/dorsal/oblique rest + mouth-open PNGs;
  complete hash-bound manifest. No repeat of old comparison renders.
- Resource: one correction authoring pass complete; 20 minutes per execution group, 40 total.
- Stop: wait for Terra actual five-image evidence; command/hash/output error returns to Astra.
- Resume: verify both source hashes; run HANDOFF-02.md Group 1 exactly. No GLB/material/rig,
  production audits, packaging, public integration, shared metadata or git work in this phase.

## 2026-09-07 — clay-02 actual review / clay-03 diagnostic checkpoint

- Owner/model: Astra high.
- Status: authoring diagnosis complete; **clay-02 rejected**, clay-03 not yet authored.
- Inspected all five actual clay-02 images independently. Confirmed improved organic posterior,
  low dorsal, fin sweep and full framing; anterior remains a generic hood with stepped neck,
  weak armour volumes, and unacceptable crossing oral panels.
- Evidence verified:
  - Blend SHA `84df86a28328f7c723f7cfea3595b93c5ebd4efa32b5b5e80b17d8744351e1be`
  - Render manifest SHA `0ce1c198bf927dd2cc22e3231affcf23497c8cfde9c015ddb0a3c54966490334`
  - clay-02.py SHA `a0813a5b6210eec66f0bd57b5098dd023d798209153a732648a00f5fb6e58380`
- Concrete source-only diagnosis: oral_point clamps posterior lower rings to JAW's zero-width
  endpoint. Exactly 1,890 sleeve quads lie wholly on X=0 from Y=-0.8821311475 to -0.36, forming
  a folded central sheet. Fixed torso front_tunnel duplicates this moving oral passage.
  Outer head/torso/cheek closures likewise overlap without a canonical shared collar.
- Precision note: head rear n-gon is concave but planar at Y=-0.84; nonplanarity is not the
  proven cause. Removing its incompatible closure is still part of the single-boundary plan.
- Added `review-clay02-plan-clay03.md`: full image/source diagnosis, numeric evidence, canonical
  lip/collar/one-lumen ownership plan, regional anterior sculpt goals, bounded checks and scope.
- Proposed next source pass: correct anterior/neck/oral topology and anatomical volume only;
  retain improved posterior/fin broad shape. One new immutable clay-03 source/output group,
  hash-bound handoff to parent-assigned Terra after authoring; no Blender by Astra.
- No clay-03 source/outputs yet. Clay-02 and named backup preserved. No public/shared/Git edits.
- Resource: one bounded diagnostic pass complete. Stop at the requested design checkpoint.
- Resume: parent reviews diagnosis/ownership proposal, then continue the anterior clay-03
  source authoring step. Do not rerun the known-bad clay-02 or add patches to its duplicate lumen.

## 2026-09-07 — clay-03 — shared-boundary source correction frozen

- Owner/model: Astra high.
- Status: candidate-ready for execution; **clay-03 not rendered, not approved**.
- Parent accepted the concrete diagnosis and authorized the bounded source correction after
  the design checkpoint. Clay-02 and the named original backup remain untouched.
- Implementation: one connected exterior/oral skin, one swept shared lip loop, one shared
  head/thorax collar, one positive-width pharynx ending at a joint pole. Removed independent
  head/torso closures, duplicate passages and separate cheek cover construction. Named face
  regions and skull/jaw/body weights retain editability; study shape key only, no final rig.
- Sculpt: regional crown/orbit/cheek and lower-cup curvature; modest upper/lower thoracic plate
  curvature. Retained clay-02 posterior/fin broad geometry and corrected camera framing.
- During source-level fitting, sampled rays identified inner walls crossing outer skin.
  The final anterior/lumen shape corrects those sampled crossings. No Blender was run.
- Frozen inputs:
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/clay-03.py`: `5cd49f03f2038b2fbde3d31e94cd0e04ade8dc33aa4867d079c0f01d3a8ac286`
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/views-03.json`: `7a935c568dd279632b229e3dd64c31d1b044e5909794afc5d65365d41e5a263a`
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/check-clay03-source.py`: `da33b170adc80d8ea59e42bcdeadb05e509f7351ee21dd5aaa06e4ddd2d8e066`
- Static PASS: AST/JSON parse; 48,514 main-skin vertices, 48,640 faces, 97,024 triangles; two-face
  edge incidence; finite/normalized geometry and weights; positive areas at rest/half/full gape;
  min nonterminal oral width 0.03498629; 279 clear centerline segments, 288 inner-wall containment
  ray samples and 120 vertical sections with at most one roof/floor pair. These are sampled local
  authoring checks, not proof of global collision freedom or a completed production audit.
- New source files: clay-03.py, views-03.json, check-clay03-source.py, HANDOFF-03.md. This is a new
  immutable candidate. Earlier sources and evidence are preserved; no public/shared/Git changes.
- Planned exclusive outputs: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/clay-03/`.
- Execution: HANDOFF-03.md Group 1 build then Group 2 fixed five-view render, parent-assigned
  Terra medium; 2 CPU threads, --python-exit-code 1. No executor spawned by this agent.
- Resource: bounded source correction complete; execution allowance 20 minutes/group, 40 total.
- Stop/resume: verify three hashes then exact Group 1. Return actual five PNGs and blend/manifest
  hashes for Astra review. No materials/rig/GLB/production audits or integration at this gate.

## 2026-09-07 — clay-03 actual review / clay-04 exterior correction frozen

- Owner/model: Astra high.
- Status: candidate-ready for clay-04 execution; **clay-04 not rendered or approved**.
- Inspected all five actual clay-03 PNGs and re-compared user TUG reconstruction. Mouth panels
  are fixed; preserve its coherent oral construction. Overall anterior remains a shallow wedge
  with dorsal-crowded eyes and weak armour distinction. Model remains preview.
- Verified clay-03 evidence: blend `e88eacaeb7c64077430c0e5a322b5e1a21cabb234631a9ff8d32d998de57fc36`;
  manifest `df7323b529f1288f9553706b0d17e0fe7b7147d70342940984aee5d7763e7a27`.
- Diagnosis/decision saved in review-clay03-plan-clay04.md. Existing shallow Hermite rise and
  high fixed-Z eye ray produced the pointed head and medial/dorsal orbit. New external wrappers
  add steeper curved preoral rise, broader shoulders/cheek and cranial/thoracic plate curvature.
  Orbits now use actual lateral surface parameters and tangent-normal bases.
- Preserved geometry: all 12,289 oral vertices/weights and 12,288 oral faces, including the lip,
  match canonical clay-03 SHA `698be716534a6e5cf1a35c32d4946a0cbbfe45e2577dcee55664f280b91d9c79`.
  Build/checker assert this equality. No change to successful ownership or duplicate passages.
  Posterior/fin broad shape and the same fixed five cameras are retained.
- Frozen inputs:
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/clay-04.py`: `804d9932e9f3453aefc0a67b0aecdab4cb36491b2377b4839fbf7fe60605b0d3`
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/views-04.json`: `7a935c568dd279632b229e3dd64c31d1b044e5909794afc5d65365d41e5a263a`
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/check-clay04-source.py`: `bfa02e5d2bf3ad3fd8ca652c5849fe344b1c60e4627aab6d8533754bf401a8be`
- Static PASS: AST/JSON; unchanged oral digest; closed edge incidence/finite positions/normalized
  weights; positive areas at actual linear key values 0/.5/1; positive throat width; retained
  279 centerline, 288 containment and 120 vertical-section checks. New orbit surface normals
  |X|=.8409203; surface points X=±.2596500,Y=-1.5141687,Z=.0662618. Not a final eye audit.
- Remaining art concerns: actual anterior fullness, lateral orbit appeal, sufficient broad armour
  distinction without a sphere/block/sleeve, and preservation of mouth readability. These require
  actual five-view Astra judgment; no material or production approval inferred from static PASS.
- New files: clay-04.py, views-04.json, check-clay04-source.py, HANDOFF-04.md and review note.
  Earlier candidates/backup unchanged. No Blender/public/shared/Git execution or mutation.
- Planned output: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/clay-04/`.
- Resource: bounded exterior source pass complete; Terra budget 20 minutes/group, 40 total.
- Resume: parent assigns Terra medium; verify hashes, HANDOFF-04.md Group 1 build then Group 2
  five fixed views, two CPU threads, --python-exit-code 1. Return actual PNGs/hashes to Astra.

## 2026-09-07 — clay-04 coarse gate / material-01 authoring frozen

- Owner/model: Astra high.
- Gate: **ACCEPT clay-04 coarse foundation for relief/material study only**, not final model or
  public replacement. Reviewed all five actual views against TUG reference. Fuller curved snout,
  lateral eyes, organic rising posterior and coherent open mouth now support the next phase.
  Smooth hood/local plate hierarchy remains the detail task. Keep preview.
- Hash-bound gate evidence:
  - Blend `de46eb02497bbca59807d76bca5c97ab8b1998d019b6f415e71f34756e78ce9e`
  - Render manifest `a0baf173108f67b56ea4c8acc997b2d63faa2ca236d7a7ab120b7e4f22fd1f9c`
- Status: material-01 source candidate-ready; **not prepared, rendered or visually approved**.
- Decisions: ten anatomy-specific curved suture paths plus six broad curvature fields in existing
  skin; masks preserve lip/oral/eye regions; rough ochre-bronze armour versus cooler slate/olive
  dermis/pale belly; irregular pigment bars/flecks; graded fin striations and restrained iris.
  Oral key coordinates/weights/faces must hash identically before/after relief. No new topology.
- New source/config:
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/materials-01.py`: `52a698a8522ac21b7fbc3439d0a25e82d78f02647f48370b4d5c0b8c0162ef56`
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/armour-layout-01.json`: `c703f3d02ea4595408173c8d1bad186b7e9721f8abbe4c580aae7b42b85d4b3a`
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/material-views-01.json`: `6899a98892eac311e79cab2c991ae3a22f6d5e59e6c571015e5e2d09b29303da`
- Additional frozen input: clay-04 build-report SHA `c964de05f5f51b60545d2ad8637389eccc6955308a6ca7f02ed48142ee7fa9a2`; exact absolute paths and both input hashes in HANDOFF-MATERIAL-01.md.
- Static PASS: AST/JSON; dense relief grids finite/bounded (raw -0.00488 to +0.00703 before masks);
  positive bounded seam widths/depths; seven-view configuration and matching neutral/material
  armour close cameras. No Blender run and no shader/visual acceptance claimed.
- Output planned only in `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/material-01/`: new blend/report, five fixed body/oral images, two matched armour close-ups, manifest/logs.
- Remaining concerns: actual plate relief must read without colour; no drawn grid/black trenches,
  oversized grain, repetitive body bars or flat striped fins; preserve lip/eye readability and
  old-model appeal. Procedural shaders still need later baking and real runtime palette checks.
- Earlier sources/candidates/backup preserved. No Blender/public/shared/Git work by Astra.
- Resource: bounded material-source pass complete; Terra allowance 20 minutes prepare + 25 render.
- Resume: parent assigns Terra medium; verify five input hashes then HANDOFF-MATERIAL-01.md Group 1
  prepare and Group 2 seven renders. Return actual images/hashes. No final rig/bake/GLB/audits or integration.

## 2026-09-07 — material-01 review / material-02 frozen

- Owner/model: Astra high. Independently inspected all seven actual material-01 renders and TUG user reference.
- Gate: retain material-01 geometry/relief/oral passage; reject material finish (uniform mustard/rubber, weak monochrome grain, undersampled blurred bars and fin rays). See review-material01-plan-material02.md.
- Hash-bound source blend: `1d6b2f537e21f826bf3751eae380de999184cfa140725a49782b310baa7d4429`; source report `a172b6860beeb68c73ff6347caa6d915d8c8f0e27c772e470bf40a7e2417fefd`; rendered manifest `9d3749973686ab286547760b2fc11ee19aba998271d666666512641555dd3902`.
- Status: material-02 source-ready; not prepared/rendered/visually approved.
- Correction: original procedural bronze/umber tonal variation and two grain scales; matte roughness variation; packed continuous maps for legible irregular flank bars/flecks and fine fin rays. No ImageGen/photo input required. No added seams or geometry edits.
- Full-specimen coordinates/keys/faces/weights/transforms and oral coordinate/weight/face digests must match before/after preparation. Armour boundary, eyes/oral materials retained.
- Script `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/materials-02.py` SHA `4e79fe40644145efdda272699b7418dffab21a425cdc4c014429abb5b0be65b2`.
- Views `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/material-views-02.json` SHA `6899a98892eac311e79cab2c991ae3a22f6d5e59e6c571015e5e2d09b29303da`.
- Static PASS: AST/JSON, full-resolution pure NumPy masks finite/bounded, distinct left/right patterns, four fin fields, seven fixed views and identical close camera pair. Source mask diagnostic inspected. No bpy/Blender called.
- Planned outputs only `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/material-02`: blend/report, seven images/manifest/logs; packed maps inside blend. Prior sources/candidates and backup preserved.
- Remaining art concerns: cellular/stone grain, muddy pigment, zebra/stencil bars, overly broad rays, mouth/eye visibility. No final bake/rig/motion/runtime audit yet.
- Resume: parent assigns Terra medium via HANDOFF-MATERIAL-02.md, four frozen hashes, prepare then render, CPU 2 and python-exit-code 1; 20 + 25 minute budget. Return actual images for Astra judgment.
- No Blender/public/shared/Git work by Astra.

## 2026-09-07 — material-02 actual review / material-03 frozen

- Owner/model: Astra high. Reviewed all seven actual material-02 PNGs and TUG user reference.
- Gate: REJECT material finish; retain geometry/relief/oral ownership and improved posterior bars/fine fin rays. Rig remains blocked on visual material acceptance. Verdict: review-material02-plan-material03.md.
- Source blend `fb5d6149ca60af5109362d9080204c914b5a2f5e2003893a6cb0a6af76e35a49`; material report `b94af6882e191e55feea273444d54eff36bee86347091e6a9a6fccabf3ddae1f`; manifest `2dc3d038f2c6f6db1f64749d6fe903eb3a54b1ddb730c2d07e3016ab73a07530`.
- Diagnosis: no boundary colour, >5× base-value range, strong cellular colour/cloud multipliers and ~2.8× earlier microbump bury true plate relief. Matched clay/material close-ups isolate the surface failure.
- Material-03 source-ready, NOT prepared/rendered/approved. Exact ten accepted anatomical paths and six regional curvature fields now control boundary colour/roughness and subdued margin response. Calmer close-value grain; ~84% less armour bump; no geometry changes.
- Existing eight image pixels, four body pigment attributes and other material assignments must hash unchanged; full-specimen and oral digests also required. Posterior colour branch and fin shaders retained.
- Script `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/materials-03.py` SHA `43a7045aa0e880615a413335ff99eea04f04f13cb3ecb7deaad4408eda846896`. Views `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/material-views-03.json` SHA `6899a98892eac311e79cab2c991ae3a22f6d5e59e6c571015e5e2d09b29303da`. Six frozen inputs and exact commands in HANDOFF-MATERIAL-03.md.
- Static PASS: final AST/JSON, full resolution 1536×1024 finite/bounded plate fields, exact ten paths, seven fixed views/matching close cameras. Flat map signals inspected only; no Blender/API/visual pass claimed.
- Planned outputs only `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/material-03`: new blend/report, seven images/manifest/logs, two new packed response maps inside blend. Earlier candidates and backup retained.
- Remaining art concerns: ink/sticker boundaries, false piping, weak grain, uniform mustard or insufficient regional reading. Actual material gate required before rig/motions/bake/runtime audits.
- Resume: parent assigns Terra medium, HANDOFF-MATERIAL-03.md prepare then seven renders, CPU 2 and --python-exit-code 1, 20 + 25 minute group budget. Return actual PNGs/hashes to Astra.
- No Blender/public/shared/Git work by Astra.
