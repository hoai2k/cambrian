# 04 · The Tripo pipeline: generated bodies, procedural rigs, authored motion

**Status:** proposed production strategy, 12 September 2026. Nothing here is built. The
Cambrian and Devonian rosters were sculpted in Blender by hand and by builder script; the Triassic
is the first era planned around a generative image-to-3D model (Tripo) for the bodies. This
document states the strategy as proposed, says where it is agreed with, where it is changed and
why, and lays out the step list an author follows per creature.

## The proposal, as stated

1. Generate the 3D model from Tripo.
2. Build a rigged procedural model based on the shape of the Tripo model.
3. Verify by eye that the procedural model matches the Tripo model closely.
4. Create a matching rig for the Tripo model.
5. Author the animations on the procedural model.
6. Apply those animations to the Tripo model, which is what ships.

The goal: Tripo's surface quality in the shipped game, with animation as strong as the procedural
rigs have given the earlier eras.

## Assessment: agreed, with three changes

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
better LOD than any decimation of the Tripo mesh because its silhouette was verified against the
Tripo mesh. So the twin costs nothing extra; it is a deliverable. It is also the **fallback**: a
Tripo body that fails verification twice ships as its twin, which is the Devonian route and is
known to work.

Two risks the proposal does not mention, and should:

- **Tripo bodies are closed shells.** There is no mouth interior, no separate jaw, no eye globe,
  and paired limbs are sometimes fused to the flank or to each other. The production contract
  requires an articulated jaw with palate, walls, floor and throat, eyes at least half inside the
  head, and fins seated inside the trunk. Every Tripo creature needs a Blender surgery pass (cut the
  jaw, build the mouth, set the eyes, free the flippers) *before* skinning, and the step list budgets
  it. For the long-necked animals, Tanystropheus and Dinocephalosaurus, the neck is better built
  procedurally as a lofted tube on the skeleton and stitched to the Tripo head and trunk than taken
  from Tripo, whose necks come out as lumpy cylinders with no vertebral rhythm.
- **Colour has to become vertex colour.** The game recolours a creature by rebuilding each pixel from
  its vertex colour against a white base colour, with a normal map as the only texture
  (`docs/creature-intake.md`). Tripo gives a PBR albedo with light baked into it. Bake the albedo
  to `COLOR_0` and a normal map, de-light it (divide out the ambient term, which Tripo's studio
  lighting makes fairly uniform), and inspect under the viewer's neutral light. Embedded albedo is
  allowed by the contract where the vertex bake loses something that matters (Henodus' shell
  plates, the ammonoid's ribs).

## The step list, per creature

Every step names what it produces and what checks it. Steps 1 to 3 are the Tier 1 image and model
requests in [03 · Image and model requests](03-image-and-model-requests.md); steps 4 onward are
in-house.

| # | Step | Produces | Check |
| --- | --- | --- | --- |
| 1 | **Reference board** from the sources in [01](01-triassic-design.md): skeletal, size, the anatomy that must be right. | `docs/triassic/boards/<id>.md` with cited images | Reviewed once; uncertainties labelled supported / inferred / artistic. |
| 2 | **Source images for Tripo.** Three orthographic views (left, top, front) and one three-quarter, of the reconstructed animal on a plain mid-grey ground, neutral light, mouth closed, limbs in the rest pose the rig wants (flippers half-spread, neck straight). Generated from the board with the image tool; prompts kept beside them. | `intake/triassic/<id>/source-*.png` | Views agree with each other (the top view's width matches the side view's height at every station, within a tenth) — a disagreement here becomes a warped body. |
| 3 | **Tripo generation**, multi-view where the plan allows it, single-image (the side view) otherwise. Keep the job id, the prompt, the seed and the raw output. | `local/triassic-authoring/<id>/tripo/` | Watertight; symmetric about the sagittal plane to within 2 % of length; no fused limbs. Regenerate rather than repair anything that fails this. |
| 4 | **Intake surgery** in Blender (scripted where possible, `tools/triassic/intake.py`): scale to the board's `lengthMeters` and the era's unit rule, orient +Z forward +Y up, quad-remesh to a deformable density (about 20–40 k faces for a full model), cut and hinge the jaw, model the mouth interior, seat eye globes, separate rigid parts (shell, carapace, tooth plates), free and re-seat paired flippers so their roots sit inside the trunk. | `<id>.intake.blend` | Eye-containment audit (`tools/devonian/eye-audit.py` pattern); the fin-seating assertion from the builders. |
| 5 | **Measure** the intake mesh into a profile table. | `<id>-profile.json` (the sculpt-export format) | Twenty stations, both drawings, eyes and mouth as features. |
| 6 | **Procedural twin**: a Triassic builder (`tools/triassic/creatures/<id>/build.py`, Blender 5.2) takes the profile and the board's joint stations and generates the armature *and* a lofted proxy body on it, with weights seated by the builders' fin rule. This is the skeleton every later step uses. | `<id>.twin.glb` (rigged, weighted, sockets) | `sculpt:measure` twin vs. intake mesh: every station within **4 % of body length** in each of dorsal, ventral and width; flipper root and jaw hinge within **2 %**. Outside that, edit the profile rows and rebuild — never the mesh. |
| 7 | **Human verification** in the viewer: twin and intake mesh overlaid (the sculpt mode's Edited / Original toggle), side, top and front. Sign-off is recorded in the creature's README with the measure output pasted in. | README entry | A named reviewer; the measure numbers beside their note. |
| 8 | **Skin the Tripo mesh to the twin's armature.** Weights transferred from the twin by nearest surface, then the rigid parts locked to their single bone, the flipper roots re-blended onto the trunk bones under them, and paired fins weighted radially so a seated root follows the flank. | `<id>.skinned.blend` | Normalised non-zero weights; rigid armour moves with one bone only; the deformation sheet in step 10 is where bad weights show. |
| 9 | **Author the clips** as a performance in code against the skeleton (`performances/<id>.mjs`, the `Pose` grammar in `tools/creatures/motion/rig.mjs`), sampled first onto the **twin**. The twin deforms cleanly and renders fast, so the contact sheets iterate in minutes. Locomotion is the era's own set: flipper flight, paddle rowing, thunniform tail beat, jet, and the breath cycle (surface, blow, dive). | `performances/<id>.mjs`; the twin with clips | `pose-check.mjs` for socket travel; contact sheets from `review.py`; the contract's timing and loop checks. |
| 10 | **Apply the same performance to the skinned Tripo body** with `apply.mjs`. Same bones, same sockets: this is a write, not a retarget. Render the same contact sheets. | `<id>.glb` | Sheets from the twin and the body side by side; any difference is a weight, never a clip, and goes back to step 8. |
| 11 | **Colour bake**: albedo to `COLOR_0`, de-lit; normal map; optional embedded albedo where the bake loses it. Studio and select portraits from the shipped model. | textures, four portraits | Neutral-light inspection; `npm run cards`; the stale-image check in `npm run check`. |
| 12 | **Package**: full model meshopt-compressed, the twin as `<id>.lod1.glb` with Idle, Swim, Death, anchors appended, metadata JSON, README with the reproduction commands. | the delivered set | `tools/devonian/check.mjs`-style validation ported to `tools/triassic/check.mjs`; `npm run check --strict`. |

Two rules that follow from the steps:

- **The Tripo mesh is never edited after step 4.** Everything downstream reads it. A change of
  shape goes back to the source images and a fresh generation, so the provenance chain stays whole.
- **The profile table is the hand-off**, exactly as the viewer's sculpt export is for the Cambrian:
  a reviewer who wants the belly deeper edits rows, rebuilds the twin, and the measure tells them
  whether the Tripo body still matches. If it does not, that is a new generation, not a Blender
  push-and-pull.

## What Tripo is asked for, and what it is not

Tripo is asked for **bodies**: every creature in the roster and the shore animals, plus the
handful of scenery pieces whose value is a convincing organic surface (the log rafts with their
crinoid colonies, the big coral heads, the calcisponge mounds, the shore trees) — the Tier 1 list.
It is not asked for anything instanced by the thousand (a sea-lily, a reed, a shell on the sand,
a rock), because those want a few hundred clean triangles with a single material and a base pivot,
which a builder script produces better and reproducibly — the Tier 2 list.

Two practical points to settle before the first generation, both of them plan questions rather
than technical ones: whether the Tripo plan in use permits commercial use of the output and
how its outputs are licensed (record the answer in `docs/triassic/README.md` and the per-creature
README), and whether multi-view input is available on it, since the single-image path guesses the
top view and the guess is what step 2's cross-check is there to catch.

## How this changes the intake documents

`docs/creature-intake.md` stays the contract: the clip set, the anchors, the portraits, the
recolour rule. The Triassic adds one directory of tooling (`tools/triassic/`: `intake.py`,
`creatures/<id>/build.py`, `check.mjs`) and one convention: a creature's builder produces a
skeleton and a twin, not a finished body, and the shipped body is the Tripo mesh on that skeleton.
`tools/creatures/motion/apply.mjs` is used as it is; its `--out DIR --review` dry run is the
step 10 sheet.
