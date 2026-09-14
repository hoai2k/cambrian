# 04 · The Tripo pipeline: generated bodies, procedural rigs, authored motion

**Status:** active production pipeline, updated 13 September 2026. Nothosaurus and Shonisaurus
already ship as paired authored Tripo bodies and measured procedural twins on exact shared rigs;
the rest of the roster is not thereby claimed complete. The Cambrian and Devonian rosters were
sculpted in Blender by hand and by builder script; the Triassic is the first era using generated
image-to-3D bodies as preserved source surfaces. This document records the established process and
the checks an author follows per creature.

## The proposal, as stated

1. Generate the 3D model from Tripo.
2. Build a rigged procedural model based on the shape of the Tripo model.
3. Verify by eye that the procedural model matches the Tripo model closely.
4. Create a matching rig for the Tripo model.
5. Author the animations on the procedural model.
6. Apply those animations to the Tripo model, which is what ships.

The goal: Tripo's surface quality in the shipped game, with animation as strong as the procedural
rigs have given the earlier eras.

## Established approach

The goal is right and the order is nearly right. Tripo is good at what the builders are worst
at, a convincing, continuous, textured skin with fine surface detail, and poor at exactly what the
builders are best at, a body whose joints are where the animal's are, whose flippers are seated in
the trunk, and which deforms without candy-wrapper twists. Splitting the work along that line is the
correct split. Three amendments make it work in this repository rather than in the abstract:

**1. One skeleton, not two rigs.** Step 4 as written, "a matching rig for the Tripo model", means a
second rig built to resemble the first, and then step 6 is a *retarget* between two rigs. Retargeting
is where animation quality dies: rest-pose differences, bone-roll differences and proportion drift
each cost a little, and a flipper stroke that reads as a wingbeat on the proxy arrives as a shrug.
The change: the procedural build **is** the skeleton. Its profile table places the joints, and the
Tripo mesh is skinned to that same armature, same bone names, same hierarchy, same rest
orientations. Clips authored against the skeleton are then *applied*, not retargeted; the shipped
`tools/creatures/motion/apply.mjs` already does exactly this against a GLB's own bones and
sockets, and works for any body with that skeleton. There is nothing to match, because there is
only one rig.

**2. Verify by measurement first, then by eye.** "Matches closely" needs a number as well as a
human. The viewer's sculpt mode already measures a body as twenty stations of dorsal, ventral and
width, and `npm run sculpt:measure -- <glb> [sculpt.json]` reports how far a candidate is from a
target (`docs/viewer-sculpt.md`). Run it both ways: measure the Tripo mesh into a profile table,
build the procedural twin from that table, and measure the twin back against the Tripo mesh. The
human check then looks at what the number cannot see: where the flippers root, where the jaw
hinges, whether the neck's joints fall between the vertebrae the reference shows. A tolerance is
proposed below; a body outside it goes back to the profile rows, never to the Tripo mesh.

**3. The procedural twin is not thrown away: it ships as the distant model.** The contract wants a
reduced model with the same skeleton, sockets and locomotion clips (`<id>.lod1.glb`, at most 40 %
of the triangles). The twin is exactly that, already rigged and already animated, and it is a
better LOD than an unrelated decimation because its volume and silhouette are verified against the
Tripo mesh. The first two deliveries establish two valid construction methods. Shonisaurus uses
measured axial and spanwise lofts where those describe its trunk, rostra, flippers and caudal
crescent well. Nothosaurus uses a fresh voxel-occupancy volume resurfacing where lofting would erase
the canonical curved tail, asymmetry and individual paddle silhouettes. The voxel twin reuses no
source vertices or faces. Both methods must meet the same envelope, surface-distance, rig, clip and
anchor checks. The twin is also the **fallback** when the authored surface cannot be made to deform
cleanly without losing identity.

**4. One image is greenlit first, and everything is built from that image.** The pipeline has a
gate before it has a generation. Each subject gets one **canonical pose** — the approved picture of
that animal — and a human says yes to it before any modelling sheet, any Tripo job or any Blender
work happens. Everything downstream is derived from that single image and from nothing else, so
there is one place where the animal is decided and one thing to argue about. A pose that is not
greenlit is regenerated, not worked around: fixing a body at the mesh stage means the picture and
the model disagree from then on, and nobody can say which is the animal.

The review is [the reference viewer](https://games.hoai.net/cambrian/research/triassic/). It puts
each pose beside reference art from Wikimedia Commons, flips between them in place on **C**, and
takes a decision per subject: choose our own pose and it is greenlit; choose a reference instead
and the pose is regenerated steered toward that picture. *Export selections* writes the decisions
out, and `node tools/triassic/apply-selections.mjs <file>` records them in
`docs/triassic/canonical/manifest.json` and writes the rework brief to
`docs/triassic/canonical/review.md`. Nothing reaches step 3 below without a `greenlit` state.

Two risks require explicit handling:

- **Tripo bodies are closed shells.** There is no mouth interior, no separate jaw, no eye globe,
  and paired limbs are sometimes fused to the flank or to each other. The production contract
  requires an articulated jaw with palate, walls, floor and throat, eyes at least half inside the
  head, and fins seated inside the trunk. Every Tripo creature needs a Blender surgery pass (cut the
  jaw, build the mouth, set the eyes, free the flippers) *before* skinning, and the step list budgets
  it. For the long-necked animals, Tanystropheus and Dinocephalosaurus, the final neck topology is
  better rebuilt procedurally as a lofted tube on the skeleton than taken directly from Tripo,
  whose necks come out as lumpy cylinders with no vertebral rhythm. Their modeling inputs still
  show the complete approved neck: it is the mandatory length and silhouette reference for that
  rebuild, never permission to generate a short-necked body.
- **Preserve the source texture before simplifying materials.** Controlled Nothosaurus and
  Shonisaurus comparisons showed that baking Tripo albedo into sparse `COLOR_0`, especially across
  UV seams, discarded markings and helped produce the crumpled light/dark appearance when combined
  with full-strength normal and ORM inputs. The established authored-body material retains the
  original UV albedo, sets `COLOR_0` to white as a neutral runtime multiplier, uses explicitly
  nonmetallic rough skin, and keeps only restrained normal relief (0.15 in both delivered builds).
  Preserve the raw textures and UVs and verify them under identical neutral lights. A texture-free
  twin may sample pigment from the nearest source triangle's interpolated UV, as Nothosaurus does;
  it must not average unrelated atlas-seam vertices. Do not prefer a vertex bake when the original
  UV albedo is cleaner evidence.

## Current production order

Generation and body authoring are separate bounded phases. First, `run-batch.mjs` completes or
resumes only the human-greenlit jobs in the saved plan. Then `process-batch.mjs --process` verifies
the plan image and downloaded artifact hashes, preserves every untouched raw GLB and sanitized
metadata under `tools/triassic/creatures/<id>/tripo-raw/`, and runs `tools/triassic/tripo/review.py`.
All completed raw source packages and their audits are reviewed and committed before another rig is
started. Rigging then proceeds **one creature at a time** through anatomy, deformation, motion,
material, packaging and visual QA, so a finding on one body changes the next build rather than
being repeated across a parallel batch.

## The step list, per creature

Every step names what it produces and what checks it. Steps 1 to 3 are the Tier 1 image and model
requests in [03 · Image and model requests](03-image-and-model-requests.md); steps 4 onward are
in-house.

| # | Step | Produces | Check |
| --- | --- | --- | --- |
| 1 | **Reference board** from the sources in [01](01-triassic-design.md): skeletal, size, the anatomy that must be right. | `docs/triassic/boards/<id>.md` with cited images | Reviewed once; uncertainties labelled supported / inferred / artistic. |
| 1b | **The canonical pose**, generated from the board: one picture of the whole animal — silhouette, species-defining anatomy, the complete tail, every limb and fin — in the rest pose the rig wants (flippers half-spread, neck straight, mouth closed). **This is the thing that gets greenlit**, and every later step reads it. | `docs/triassic/canonical/<id>.png` | A human chooses it in the viewer against the reference art; `manifest.json` reads `greenlit`. Not greenlit means regenerate toward the chosen reference and review again — never carry on. |
| 2 | **The four-view modelling sheet**, generated *from the greenlit pose* and never from prose: left, top, front and three-quarter of that same animal on a pale neutral studio grey. | `intake/triassic/<id>/turnaround.png` and `source-*.png` | The views agree with each other and with the pose (the top view's width matches the side view's height at every station, within a tenth) — a disagreement here becomes a warped body. The sheet shows in the viewer beside its pose as *3D views*. |
| 3 | **Tripo generation and raw preservation.** `tools/triassic/tripo/run-batch.mjs` resumes bounded jobs from the saved plan; `process-batch.mjs` independently verifies the input and artifact hashes, preserves the exact raw file, sanitizes API metadata and runs the unchanged static `review.py`. | Working download in `local/triassic-authoring/<id>/tripo/`; immutable source, audit and three review renders in `tools/triassic/creatures/<id>/tripo-raw/`; `<id>.preview.glb` | GLB signature and hashes agree with the plan and metadata; full silhouette and appendages survive generation; connected components, materials, textures and bounds are recorded. Reject a generation whose anatomical identity or fused/missing appendages cannot be corrected without redesigning it. |
| 4 | **Intake surgery** in Blender, kept reproducible in `tools/triassic/creatures/<id>/build.py`: scale and orient +Z forward/+Y up, weld only coincident seam vertices, remove proven debris, cut and hinge the jaw, model the mouth interior, seat eye globes, separate rigid parts and correct paired appendage roots. Preserve the raw GLB unchanged. | Local authoring `.blend` and reproducible per-creature build tooling | Per-creature eye containment, appendage-root seating, mouth closure and mesh-integrity audits. Any correction is bounded and measured against body length. |
| 5 | **Measure** the intake mesh into a profile table. | `<id>-profile.json` (the sculpt-export format) | Twenty stations, both drawings, eyes and mouth as features. |
| 6 | **Procedural twin and shared armature.** The per-creature builder chooses measured lofts, a new voxel-volume resurfacing, or a combination according to the body. It generates the twin on the same armature, joint rest transforms and sockets that the authored body will use. | `<id>.puppet.glb` and byte-identical `<id>.lod1.glb`, rigged and weighted; measured profile/volume record | Section envelopes remain within **4 % of body length** in dorsal, ventral and width; appendage roots and jaw hinge within **2 %**. Record surface-distance and volume comparisons where applicable. Exact skeleton, inverse-bind, socket and anchor parity is mandatory. |
| 7 | **Measured and visual QA:** compare authored body and twin from side, top, front/three-quarter, mouth closeups and diagnostic overlays. Record what automation proves and what remains inferred. Human approval of the canonical image remains mandatory; authorized production completion does not wait solely for a newly named human model approval after these checks pass. Never describe Codex or automated QA as independent human sign-off. | Per-creature README, validation JSON and review sheets | Measurements beside the visual findings; explicit limitations; no fabricated reviewer or approval claim. A material anatomical uncertainty stays visible as a preview limitation or returns to the canonical/generation stage. |
| 8 | **Skin the Tripo mesh to the twin's armature.** Weights transferred from the twin by nearest surface, then the rigid parts locked to their single bone, the flipper roots re-blended onto the trunk bones under them, and paired fins weighted radially so a seated root follows the flank. | `<id>.skinned.blend` | Normalised non-zero weights; rigid armour moves with one bone only; the deformation sheet in step 10 is where bad weights show. |
| 9 | **Author the clips** as a performance in code against the skeleton (`performances/<id>.mjs`, the `Pose` grammar in `tools/creatures/motion/rig.mjs`), sampled first onto the **twin**. The twin deforms cleanly and renders fast, so the contact sheets iterate in minutes. Locomotion is the era's own set: flipper flight, paddle rowing, thunniform tail beat, jet, and the breath cycle (surface, blow, dive). | `performances/<id>.mjs`; the twin with clips | `pose-check.mjs` for socket travel; contact sheets from `review.py`; the contract's timing and loop checks. |
| 10 | **Apply the exact same sampled performance to the authored body.** Both exports carry identical joint names, hierarchy, rest transforms, inverse binds, action sample times/values and anchors. This is a shared rig, not retargeting. Render the same contact sheets. | `<id>.glb` | Package audits compare decoded animation arrays, rigs and sockets exactly; side-by-side deformation differences go back to weights or geometry, never to a second clip set. |
| 11 | **Material and portraits:** retain the original UV albedo on the authored surface, use white `COLOR_0`, explicit roughness/metallic values and restrained source-normal relief. Build the twin's reduced material from verified UV sampling where needed. Render studio, select, card, thumbnail and diagnostic material comparisons. | Embedded authored textures/material, reduced twin material, portraits and comparison sheets | Same-camera/same-light comparisons; UV and source-albedo hashes; neutral-light and live single-sided viewer inspection. Do not hide source markings or known defects behind a new procedural paint job. |
| 12 | **Package and validate:** meshopt-compress the full model, keep the twin as the puppet and byte-identical LOD where the contract allows, append metadata, and document exact reproduction commands. | Public creature asset family plus `tools/triassic/creatures/<id>/` reports and tooling | Per-creature audits such as `nothosaurus/audit.mjs`, `nothosaurus/material-audit.mjs`, `shonisaurus/package-audit.mjs`, `shonisaurus/deformation-audit.py` and `shonisaurus/material-audit.mjs`; then the repository's Triassic and creature-asset checks. Future creatures add equivalent checks rather than claiming these two species' scripts validate them. |

Two rules that follow from the steps:

- **The canonical pose is the animal.** Steps 2 onward are derivations of it, so a change of shape
  goes back to the pose, a fresh generation and another greenlight — never into a later artefact.
  A model that no longer matches its greenlit pose is the model that is wrong.
- **The Tripo mesh is never edited after step 4.** Everything downstream reads it. A change of
  shape goes back to the source images and a fresh generation, so the provenance chain stays whole.
- **The profile table is the hand-off**, exactly as the viewer's sculpt export is for the Cambrian:
  a reviewer who wants the belly deeper edits rows, rebuilds the twin, and the measure tells them
  whether the Tripo body still matches. If it does not, that is a new generation, not a Blender
  push-and-pull.
- **A discovered implementation defect follows the correction route already authorized for the
  production run.** Preserve the raw source and a controlled before state, isolate geometry,
  material, skinning or animation as the cause, make the smallest bounded correction, rerun the
  affected measured and visual audits, and update the README honestly. Return to the canonical
  review only when the proposed correction would change the approved animal rather than repair the
  existing model. Do not stop solely to manufacture a new approval gate, and do not call a fix
  approved until the evidence actually supports it.

## Which steps need a judgement and which are mechanical

A body is twelve steps, and they are not the same kind of work. The distinction matters when the
build is handed to somebody — or something — other than whoever wrote this page, because half the
list is a decision that cannot be checked by a script and the other half is a command with a
verifiable result. Splitting a build along that line is how several bodies get built at once
without each of them needing the care of the first.

**Judgement.** Steps 4, 6 and 9, and the reading in 7 and 11. Which way a generation is actually
lying (its bounding box lies — Rhaeticosaurus' flippers span further than it is long — so the frame
comes off the mouth socket, the authored `previewYaw`, or the albedo's countershading, in that
order). Where the jaw hinge is and what shape the mouth cut takes, which differs per animal:
Placodus' slit is modelled and can be measured by casting head normals back into the mesh;
Dinocephalosaurus has no modelled mouth at all, so the line is read off the albedo and the same
method finds nothing. Whether a run of body is the wrong *length* rather than the wrong shape, and
where the two stretch cuts go. Whether a clip **reads** — a neck strike that is merely correct is
not the same as one that is exciting — and whether a collapsed appendage has left a bump.

**Mechanical.** Steps 3, 5, 8, 10 and 12, and the running of every check. Sending a builder to
`/opt/blender/blender --background`, re-running it after an edit, packaging, `node
tools/update-asset-sizes.mjs`, `npm run triassic`, publishing previews, refreshing a manifest,
producing contact sheets. Each of these either succeeds with a number that can be compared against
the tolerances in the step list or fails with a traceback, and neither outcome is a matter of
opinion.

The practical consequence: a build that is following an established per-creature pattern is
mechanical almost end to end and wants the cheapest hands that can run a command and read a
traceback; the first body of a new *kind* — the first shore animal, the first cephalopod — is
mostly judgement and wants the most capable. Anything that ends in "does this look right" is
judgement whatever step it sits in.

## What Tripo is asked for, and what it is not

Tripo is asked for **bodies**: every creature in the roster and the shore animals, plus the
handful of scenery pieces whose value is a convincing organic surface (the log rafts with their
crinoid colonies, the big coral heads, the calcisponge mounds, the shore trees) — the Tier 1 list.
It is not asked for anything instanced by the thousand (a sea-lily, a reed, a shell on the sand,
a rock), because those want a few hundred clean triangles with a single material and a base pivot,
which a builder script produces better and reproducibly — the Tier 2 list.

Before each paid batch, confirm and record that the Tripo plan in use permits the intended use and
how its outputs are licensed. The current runner submits the one dedicated input image recorded in
the batch plan. If a later plan enables a true multi-view request, record that capability and the
exact submitted views rather than retroactively describing a single-image body as multi-view.

## How this changes the intake documents

`docs/creature-intake.md` stays the delivery contract for clips, anchors, portraits and runtime
materials. The Triassic adds the bounded generation/review tools in `tools/triassic/tripo/` and a
self-contained source/report directory at `tools/triassic/creatures/<id>/`. Each creature's
builder produces the cleaned authored body, the shared skeleton, the measured twin and the sampled
performances; per-creature audits prove exact parity after packaging. Nothosaurus and Shonisaurus
are the established examples. Their implementation choices are evidence for the contract, not a
claim that every later anatomy should use identical topology or that the remaining models exist.
