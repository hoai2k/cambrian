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

## 2026-09-08 13:09 UTC — material-03 actual review / material-04 frozen

- Owner/model: Astra high. Status: candidate-ready source; material-04 NOT prepared/rendered/approved.
- Independently inspected the user Coccosteus.jpg and all seven actual material-03 PNGs. Verified
  every old manifest image hash/byte count. Retain plate legibility, accepted geometry, oral
  passage, posterior bars and rays; reject the uniformly smooth ochre finish. Detailed actual
  view-by-view verdict and criteria: review-material03-plan-material04.md. No rig gate passed.
- Actual evidence: material-03 blend `e936eaf3284147d8906c9319652670138f9646436d10b229807e0e9251682a00`;
  report `894dc335cb2c7d50fdf8a5ca661a5e0bdc5e0fd1f9ab69235a403c7e45ec76ca`;
  seven-image manifest `73b8fc122d1f8c240e31912f256dec1ed43f39e18524e77c343e4ac348ea34ae`.
- Decision: small procedural pigment/roughness splice into copied actual material-03 shader.
  Preserve all existing nodes; replace exactly two links before the old suture responses.
  Add fine domain-warped dark pigment, smaller breakup, independent roughness; reduce both near
  anatomy-defined exclusions/sutures. No broad colour clouds, bright dots, new maps or bump edits.
  Original colour inference, no photo pixels/ImageGen needed. Geometry and oral topology exact.
- Frozen inputs (absolute path + SHA-256):
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/materials-04.py`: `cb1b0338f825a014aacfebfb21b3eeb8ae5392a2d584b9e92ad934886290e102`.
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/material-views-04.json`: `6899a98892eac311e79cab2c991ae3a22f6d5e59e6c571015e5e2d09b29303da`.
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/materials-03.py`: `43a7045aa0e880615a413335ff99eea04f04f13cb3ecb7deaad4408eda846896`.
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/material-03/coccosteus-material-03.blend`: `e936eaf3284147d8906c9319652670138f9646436d10b229807e0e9251682a00`.
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/material-03/material-report.json`: `894dc335cb2c7d50fdf8a5ca661a5e0bdc5e0fd1f9ab69235a403c7e45ec76ca`.
- Source-only PASS: Python AST; JSON and identical seven cameras/matched close pair; actual old
  render evidence hashes; analytical added colour multiplier bounds .6976515–1.037252 and
  roughness delta bounds +/- .08. No bpy import/Blender/API/visual material-04 pass claimed.
  Record `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/material-04-static-report.json`.
- Expected runtime invariants: same complete mesh/shape-key/face/weight/transform digest and oral
  digest; ten existing image buffers, seven pigment/plate attributes and other material slots
  unchanged; exact two-link shader splice and original normal/posterior/suture branches retained.
- Execution: parent assigns Terra medium, HANDOFF-MATERIAL-04.md Group 1 prepare then Group 2
  render; exact absolute commands supplied there. CWD `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.
  CPU Cycles 2 threads, --python-exit-code 1, seven unchanged 1280x960/48-sample views.
- Outputs planned only under `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/material-04`:
  new blend/report; seven actual PNGs/manifest/logs. None yet. No prior output/source overwritten.
- Resource: one bounded source/review pass complete. Terra allowance 20 minutes prepare + 25
  render, one state entry per group. Stop on hash/API/digest/output error or art decision.
- Resume: verify the five frozen hashes, then execute HANDOFF-MATERIAL-04.md Group 1 exactly;
  continue Group 2 only on expected success. Return actual images and blend/report/manifest
  hashes for Astra acceptance. Rig, motions, baking, GLB, final eye/oral/general audits and
  production integration remain later gates. No Blender/public/shared/Git work by this author.

## 2026-09-08 — material-04 actual gate / production authoring underway

- Owner/model: Astra high. Independently inspected all seven material-04 images and user reference;
  verified every evidence hash and byte count. ACCEPT surface for production rig/bake candidate
  authoring only. review-material04-gate.md records actual verdict; final rework remains preview.
- Accepted blend `2bd0d3da5ed2ad73801e200325b51f3c776989e027d01020e196838f10e633c9`,
  report `d01c4be81cc558584fbf2bfe18508fa8b32ef1c16f6e5cbb7e55bf68d1becfad`,
  manifest `a7165aa26944f98deac59ad760914ed79699f86e7bc8621f3215ba2436639481`.
- Small irregular dark dermal pigment is visible while plate hierarchy leads. Front highlights,
  side/oblique/dorsal, oral passage, posterior bars/rays hold. Neutral clay retains visible relief;
  no byte/pixel identity claimed. All geometry/oral/maps/plate-attribute equalities PASS.
- Next source-only phase: dedicated PBR bake, bespoke real skull/jaw rig preserving accepted LBS,
  18 differentiated actions, full/LOD with explicit linear pigment transfer checks, anchors and
  actual exported four portraits/review images. Earlier candidates remain immutable.
- No Blender/public/shared/Git work by author. Root independently reviews this same gate.

## 2026-09-08 — production candidate-01 source frozen

- Owner/model: Astra high. Status: candidate-ready SOURCE ONLY; no bake/rig/export/render executed.
  Material-04 is accepted for this candidate phase by author and root; final rework remains preview.
- Frozen author choices: actual material04 PBR bake, 20-bone compact custom rig, 18 distinct sampled
  actions, three skeletal mouth/swallow/contact anchors, full PBR GLB plus texture-free reduced
  GLB, and four portraits/17 review images from actual imported GLBs. No geometry redesign.
- Oral ownership retained exactly: same skull/jaw/body weights, shared lip/collar/lumen,
  real jaw/skull pivots and .34/-.041 rad full-gape rotations. Source rotational-LBS checks
  passed five gapes, 465 centreline, 480 wall-containment and 200 vertical sections. The candidate
  additionally requires actual Blender armature-vs-GapeStudy agreement before action generation.
- Surface bake uses original shader fields, dedicated UVs, 4096 body albedo/2048 normal/1024
  roughness plus per-fin/per-eye maps. Body/underside/oral roles share exact field values.
  Explicit independently decoded PNG sampling checks orientation/linear colour conversion.
- LOD decision incorporates measured Titan decimation failure (-.042 red overshoot): reduce
  neutral-white export copies, then sample final LOD UVs with positive linear-light filter.
  Do not run authored pigment through decimation; no negative-colour clamp or weakened pigment
  gate. Record neutral pre/post and final sampled statistics; verify actual exported COLOR_0
  by exact POSITION+UV correspondence. Other creature utility is not claimed fully proven.
- Runtime sources under `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3`:
  production_common_01.py, bake_01.py, atlas_pigment_01.py, rig_actions_01.py, candidate_01.py,
  export_patch_01.py, render_candidate_01.py, check_candidate_01.py, metadata_seed_01.json.
  Static checker: check_production_source_01.py. Existing local utility conventions were reused;
  Coccosteus proportions/weights/motion are authored for this specimen. Prior files are immutable.
- Frozen manifest `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/frozen-candidate-01.json` SHA `136479902de636c03a4807bc755bef638f67aaebc20568012e4c15328df1439d`
  binds 15 absolute input paths with bytes/SHA (runtime/static sources, prior oral checker/clay04,
  and accepted material04 blend/report/render-manifest). All input and handoff hashes rechecked.
- Exact commands, outputs, stop criteria: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/HANDOFF-CANDIDATE-01.md`
  SHA `dc762ce297a01350c34849d474bbb57716ea692367507184c6720988894b6ab0`. CWD `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.
- SOURCE-ONLY PASS: AST/JSON, 20 bones, 18 distinct dynamic signatures at 101 phases, stable root,
  no scale authored, closed loops/recoveries and held death; 300 normalized axial weights;
  independent PNG comparison, all five PNG filter modes, bilinear/linear conversion and positive
  LOD-filter bounds. No bpy import or Blender execution. Static evidence:
  `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/production-01-static-report.json` SHA `0482bec92d389dfc086808931a80fa64dbf6b5c6900c7da335ce11919cc4fbb6`.
- Planned outputs only `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/baked-01` (27 PNG maps/blend/report), then
  `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/candidate-01` (production blend, full/LOD GLB, metadata, reports,
  four portraits, 17 actual exported review views/manifests). Both directories are absent now.
- Resource: bounded authoring complete. Parent assigns Terra medium; five groups budgeted at
  40/30/5/20/35 minutes (130 total), CPU2 Blender, --python-exit-code 1. One state entry per group.
- Stop: errors, changed inputs, failed bake/pigment/geometry/gape/GLB check, unexpected output or
  art decision return to Astra with exact evidence. No source/threshold/camera fixes by executor.
- Resume: verify manifest SHA and all 15 input hashes, then HANDOFF-CANDIDATE-01.md Group 1 bake.
  Continue only after expected group success and recorded generated hashes. Return all actual
  exported images to Astra. Browser playback, final eye/oral/general audits, palette/packaging/
  public integration are later gates. No Blender/public/shared/Git work by this author.

## 2026-09-08 — candidate-02 all-actions LOD amendment frozen

- Owner/model: Astra high. Status: candidate-ready source-only amendment, not executed.
- Parent clarified that all 18 required dynamic game actions must remain meaningful at both
  detail levels. Original candidate-01 sources, frozen manifest and handoff remain byte-for-byte
  unchanged. New version removes LOD clip pruning; no geometry/material/rig/weight/motion edits.
- New sources: production_common_02.py, candidate_02.py, export_patch_02.py,
  check_candidate_02.py, render_candidate_02.py. Full and LOD now require all 18 clip names,
  durations and dynamic action checks; jaw/skull checks apply to Bite/Eat/Ability in both.
  Added actual LOD Attack/Eat views (19 total review images) to expose distant-action regressions.
- Unchanged bake_01.py / baked-01 remains usable with the exact original frozen dependencies.
  Verified versioned common helper accepts an original-source bake report without rewriting it.
  If bake already succeeded, verify its recorded hashes and skip Group 1; do not rerun it.
- Manifest `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/frozen-candidate-02.json` SHA `a2cf3f2ff14f2124032882b885d46db5c05e1a3c5a47f1aef5f5ac9d71772bfd`
  binds 22 absolute inputs: all original 15, five versioned sources and both original frozen
  documents. All verified. Original manifest remains `136479902de636c03a4807bc755bef638f67aaebc20568012e4c15328df1439d`.
- Exact handoff `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/HANDOFF-CANDIDATE-02.md` SHA `1f961fd25bcb96425928bc52c15e86d13ff8e55aa392821841451ba0fb4e4caa`.
  New output directory `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/candidate-02` is absent. Candidate-01 is not reused.
- Static PASS: new Python AST; pure minimal-GLB policy test preserves all 18 ordered actions for
  both full/LOD branches; complete frozen-input validation and original bake-report compatibility.
  Record `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/production-02-static-report.json` SHA `c72e967285bd56ead248af030e374e712f0ece54a660bd8ee1bae931df06a5b6`.
  No Blender/API/export/render execution by author. Original production static checks still apply
  to the unchanged rig, anatomy, atlas sampler and motion source.
- Resume: use HANDOFF-CANDIDATE-02.md. Group 1 is unchanged bake if not completed; then candidate_02,
  structural checker02, renderer02 portraits/review. CPU2, prior group budgets unchanged; all output
  hashes and actual images still require Astra review. No final approval/public/shared/Git edits.

## 2026-09-08 — actual candidate02 hold; shading diagnostic frozen

- Owner Astra high. Independently inspected all four actual portraits and all 19 pose/LOD views.
  Verified all 23 image hashes against complete manifests. Parent independently agrees new white
  cranial/thoracic suture quads/triangles are absent in accepted material04. Actual candidate02
  execution/structural PASS and all18/all18 actions do not override this appearance HOLD.
- Detailed actual verdict: review-candidate02-actual-01.md. Full new seam tiles and secondary oral
  lip/corner pixels remain unresolved. LOD bars/rays are substantially weakened and not accepted.
- Pure actual-GLB atlas audit ran via inspect_atlas_01.py without Blender: 404 nearest triangle
  centroids sample roughness below .2 including zero; exterior median UV area .616 roughness pixels.
  No white albedo samples; exterior normal blue >=.980, with 13 suspect oral samples. Source exterior
  roughness ~.46–.79 makes empty atlas sampling a concrete suspect; causal render proof pending.
  Immutable authoring result candidate-02-atlas-audit-01.json SHA
  9b6859c923e777ee519a865823ad66063b2977d57f98b5f99986e692b2c8365f.
- Frozen new diagnostic_shading_01.py SHA
  57d934d7fa63d13f66b4b0f2c84775251a714e12b9a8ef67e73e0f307672c34d.
  frozen-diagnostic-shading-01.json SHA
  5e7212133be66854eaf517e46a4be88642ec9d7090760d40bbe1a55e84ba987f binds 14 inputs, all reverified.
  Exact CPU2/20-minute handoff HANDOFF-DIAGNOSTIC-SHADING-01.md. Twelve actual images isolate normal,
  roughness, albedo and pre-export bake vs accepted material at fixed close cameras. Destination
  ../devonian-authoring/coccosteus/rework-v3/diagnostic-shading-01 is absent and exclusive.
- Static AST and frozen hash PASS. No Blender executed by author. No original source, candidate,
  bake, GLB, public/shared doc or Git edit. No production repair frozen until ablation evidence.
- Resume: parent assigns Terra execution; return all 12 diagnostic images and complete result.json.
  Astra/root identifies causal issue, authors smallest versioned UV/map repair, then rechecks actual
  full/LOD finish and oral/eye evidence. Material04 anatomy/sutures remain accepted and immutable.

## 2026-09-08 — actual shading cause confirmed; candidate03 repair frozen

- Owner Astra high. Independently inspected all12 actual diagnostic images and verified hashes.
  White/brown seam tiles persist without normals, disappear with fixed roughness, do not appear
  in albedo, and already exist in baked01 before export. Accepted material04 remains clean.
  Causal verdict: inadequate roughness coverage in fragmented smart-projected body atlas.
  Exact visual review is review-diagnostic-shading-01.md. Candidate02 remains HOLD.
- New body_uv_02.py creates two continuous padded exterior/oral strips from the exact immutable
  clay04 ring topology, with ventral angular seam and per-face pole UVs. No geometry/weight/oral
  topology change. bake_02.py rebakes original material04 fields; body roughness2048, normal2048,
  albedo4096. No constant production roughness, pixel clamp/fill or added texture/noise.
- Complete-strip plus bilinear-border bake coverage gates reject uncovered pixels and require
  exterior roughness variation. New check_export_atlas_03.py independently verifies actual GLB
  map pixel equality and coverage. Equality convention was also measured on all9 old actual
  candidate02 body map uses: exact decoded equality PASS.
- candidate_03.py preserves same20 bones/all18 full+LOD actions/anchors and deform checks. LOD
  broad9-tap pigment filter removed; final UV samples after neutral decimation remain strict.
  Body25%/eyes70% unchanged; fin retention rises24%->45% for ray sample density. Predicted ratio
  .3223; actual marking fidelity still requires all23 final images.
- Source-only PASS report ../devonian-authoring/coccosteus/rework-v3/production-03-static-report.json
  SHA31b4f64fc1bab7e9982b792767428fa1cce48d53b410656be509f694dbf8c64c. Verified original22 inputs,
  all12 diagnostic image hashes, AST, immutable48514 vertices/48640 faces,194304 UVloops, every
  body roughness triangle>=32.77 pixels, alteredrole and singlemissingroughnesstexel rejection.
- Frozen-candidate-03.json binds60 exact input paths/SHA/bytes; SHA
  1f21e13cd943a74c9837c2951c4992edaa37b9043aa3bc3805e7c2f406412bf5. All reverified.
  Exact HANDOFF-CANDIDATE-03.md defines CPU2 groups40/30/5/20/35 minutes (130 total): freshbake02,
  buildcandidate03, structural+actualatlaschecks, fourportraits,19reviewimages. New baked-02 and
  candidate-03 authoring destinations are absent/exclusive.
- No Blender executed by author; no original source/candidate/bake/diagnostic/public/shared/Git
  mutation. Only new versioned sources/review/handoff and this own state entry.
- Resume: parent assigns Terra with frozen manifest+handoff; stop on any mismatch/failure, no
  executor tuning. Author/root review actualall23 for clean seams, livingroughness, full/LOD
  markings, oral lip/corner and eye appearance before acceptance. Runtime/finalaudits later.
