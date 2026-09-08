# Devonian refining pass queue

Complete the carefully authored initial creature and non-creature library first. Commit and push
those previews to main promptly. Then address this queue individually; preserve sources and rerender
portraits whenever appearance changes. Preview status remains visible until each review is complete.

## Audit order — latest user instruction

Finish and commit the initial creature roster, then prioritize the full reworks below. Do not run
eye audits or other general creature quality-audit suites on an old model that is awaiting a
complete rework. Complete its rework first; then audit eyes, oral/appendage attachment, dynamic
actions, sockets and exports on that new geometry. Earlier valid reports describe only the old
files. Basic build/export checks during authoring are not a substitute for the post-rework review.

## Full reworks requested by the user

Titanichthys, Doryaspis, Gemuendina, Coccosteus, Bothriolepis and Stethacanthus require total model reworks, not cosmetic edits to the current geometry. Reconsider reference-based proportions and continuous volumes, sculpt new Blender geometry where needed, rebuild materials and rig deformation, then author dynamic actions and matching portraits. Preserve existing versions locally. Each remains a playable preview until its individual rework review passes. Gemuendina V3 has now passed; the other five remain pending.

The machine-readable pending queue is `tools/devonian/pending-refinements.json`. Catalogue validation requires every pending creature to remain `preview`; remove a pending entry only after its actual work and review are complete.

## Stethacanthus — user reference, 7 September 2026

User supplied `/Users/hoai/Downloads/Stethacanthus.jpg`, preserved as
`local/devonian-authoring/stethacanthus/user-reference/stethacanthus-user-reference-2026-09-07.jpg`.
Rework the animal to read clearly as shark-like: nuanced muscular head and trunk, gill region,
shark-like pectoral sweep and posterior/tail profile. Reassess the full sculpt instead of retaining
a generic rounded fish body under a conspicuous ornament. The dorsal spine-brush should share
the body's material colour family, including in the default game palette; distinguish its fine
surface anatomy through geometry, relief and subtle roughness rather than an unrelated bright cap.
Preserve sourced denticle fields and supported appendage anatomy. The image is an appearance
reference; verify fine proportions and dentition from primary specimens rather than copying every
illustrated detail as fact. Full rework first, then eye/oral/animation/socket/export audits.

## Bothriolepis — user reference, 7 September 2026

User supplied `/Users/hoai/Downloads/Bothriolepis.jpeg`, preserved as
`local/devonian-authoring/bothriolepis/user-reference/bothriolepis-user-reference-2026-09-07.jpeg`.
Rework the sculpt around a bulky, heavily armoured and textured anterior body, with nuanced
angular plate transitions and a convincing narrower flexible posterior. The long pectoral
appendages should project outward and backward with natural curvature and/or a slightly downward
attitude, not simply point straight back. Reconcile the image direction with antiarch pectoral
armour, joints and preserved specimen proportions. Preserve the true ventral mouth, embedded
small dorsal eyes and separate rigid versus flexible structures; do not replace its armoured
pectoral anatomy with unsupported generic fish fins.

The user emphasizes that subtle sculpted shape gives fish their identity. Prioritize continuous
three-dimensional volumes and silhouettes from front, side, dorsal and oblique views, then
fine surface relief/materials and dynamic appendage/tail motion. Keep existing source versions
as backups. Bothriolepis is preview until the full rework and subsequent quality audit are done.

## Coccosteus — user reference, 7 September 2026

User supplied `/Users/hoai/Downloads/Coccosteus.jpg`, preserved as
`local/devonian-authoring/coccosteus/user-reference/coccosteus-user-reference-2026-09-07.jpg`.
The reference is labelled TUG 1817-152; confirm its identity/provenance independently before
using it as anatomical evidence. The desired art direction is clear: a visibly differentiated,
angular armoured cranial/thoracic front, a strong transition into the flexible fish body, and a
more angular posterior/dorsal/tail silhouette. Preserve natural volume and rich restrained
pigmentation; do not merely add drawn plate seams to the old rounded form.

The user considers the current model usable and explicitly wants it as a fallback. Its complete
published family, builder/material sources and all local Blender versions are preserved under
`local/devonian-authoring/backups/coccosteus-pre-rework-2026-09-07/`, with a hash manifest.
Keep the original backup intact while authoring a separate rework version. Coccosteus is now
preview. Complete the rework before its eye/general audit suite. The L02 lighting board and
scale plate based on old geometry will also require refreshing after replacement.

## Titanichthys — user reference, 7 September 2026

User supplied `/Users/hoai/Downloads/Titanichthys.webp`, preserved as
`local/devonian-authoring/titanichthys/user-reference/titanichthys-user-reference-2026-09-07.webp`.
The user rejects the flat-fish reading of the current model. Rebuild a deep, substantial armoured
fish with a large articulated jaw and long, flowing fins, following the reference silhouette and
strong cranial/thoracic volume. Reassess the entire head/body transition and tail rather than
stretching the old shield. Keep the reference as an appearance direction; independently reconcile
its cutting-looking jaw edges with Titanichthys fossil-supported slender edentulous jaws and
feeding reconstruction. Do not turn it into a toothed Dunkleosteus. Complete body/fin outline and
colour remain interpretations. Model the oral interior and jaw mechanism anew as needed, and
repeat eyes, sockets, animation and full/LOD visual checks.

Titanichthys is reopened as preview. Historical V2 review evidence describes the unchanged old
files and no longer signifies final visual approval. The L01 lighting concept currently depicts
that old preview silhouette and must be refreshed after the full rework. User art stays local.

## Doryaspis — user reference, 7 September 2026

User supplied `/Users/hoai/Downloads/doryaspis.png`, preserved at
`local/devonian-authoring/doryaspis/user-reference/doryaspis-user-reference-2026-09-07.png`.
This is a user-provided appearance reference, not fossil evidence; no attribution was supplied and
it is kept locally rather than redistributed with the game.

Requested direction:
- Revisit the opening: the user wants the mouth immediately below the sawtooth snout, not a conspicuous opening on top.
- Richer, turtle-like patterned dorsal shield surface, with coherent plate/pigment boundaries and fine relief.
- More characterful tapered tail, strong posterior surface pattern and graceful curving motion.
- Overall silhouette and natural olive material treatment closer to the supplied reference.

The current model's top opening **is its mouth**, deliberately modeled as a recessed upward-facing
oral cavity above the fixed ventral pseudorostrum (`tools/devonian/creatures/doryaspis/README.md`,
`build_v2.py`). During refinement, explicitly resolve the requested below/above relationship against
the reference orientation and primary dorsal/lateral anatomical evidence before changing the mesh.
Do not mistake a nasal or branchial recess for the mouth, invent a biting jaw, or move sockets
without updating the oral geometry/animations. The original 2024 source reconstruction remains
linked in the builder README. Keep biological interpretation separate from desired art treatment.

Doryaspis is reopened as **preview** in `src/content/devonian/model-status.json`; existing eye checks
remain valid for the unchanged files, but final art approval is pending this new direction.

## Gemuendina — user reference, 7 September 2026

User supplied `/Users/hoai/Downloads/Gemuendina.webp`, preserved at
`local/devonian-authoring/gemuendina/user-reference/gemuendina-user-reference-2026-09-07.webp`.
The supplied paleoart is an appearance reference, not anatomical evidence; preserve it locally.

Requested direction: the current model reads as a flat toy. Sculpt a substantially more natural
ray-like animal: fuller three-dimensional cranial/central volume, smooth continuous cheek and
pectoral transitions, broad swept flexible fin margins, a slender flowing tail with a convincing
root, and differentiated granular/mosaic surface detail. The reference shows rich olive texture,
contrasting dorsal eye/orbit regions and a curved rather than slab-like outer silhouette.

Review the anatomy independently: this is Gemuendina, a rhenanid placoderm, rather than a modern
manta with cephalic lobes. Keep its upward-facing mouth/eyes and evidence-supported armour;
use manta-like flow as a sculpting/animation direction, not as a replacement anatomical template.
Inspect front, side and oblique contours in Blender, then flowing pectoral waves and tail curves
through the full required actions. Repeat eye containment/socket checks after changing the head.

Gemuendina V3 candidate02 completed this rework and its individual review on 7 September 2026.
The new continuous sculpt, original ImageGen-supported PBR pigment, articulated oral interior,
28-bone rig,18actions,full/LOD and four portraits are integrated. All54sampled action frames
were independently inspected;56measured full/LOD poses passed the conservative eye-volume
and denticle-contact checks. Smallest eye containment bound86.87% exceeds the requested50%.
Three.js playback/anchors, apparent-size LOD comparisons, structural intake and interactive
viewer review passed. Default uses the authored olive material; selectable schemes remain.
See `tools/devonian/creatures/gemuendina/rework-v3/final-art-verdict.md` and
`preview-delivery-02.md` for exact evidence, version hashes and earlier integration checkpoint.
Old public family is preserved in the named local pre-rework-v3 backup. Status is now **final**;
this closes Gemuendina's queue entry and does not approve any other queued model.

## Other initial-model refinement

Use each creature's README, WORKING_STATE and preview-delivery report for its exact pending work.
Onychodus: revisit tusk/palatal-pocket closing clearance, then final oral/action art review.
Eldredgeops: enrollment coaptation, exposed antenna tips and finer underside articulation.
Acanthostega: wrist/palm transitions, orbital contour and oral-material polish.
Rhinodipterus, Tiktaalik, Jaekelopterus and later previews: individual surface, attachment and motion
reviews as recorded by their authors. Do not run a generic anatomy replacement across the roster.

## Non-creature milestone requested by user

Give the user a **separate explicit update once every non-creature initial asset has reached main**.
Do not report that milestone for only the 47 scenery models or nine runtime paintings. It also
includes the promised remaining material sets, regional and lighting boards, particle/decal atlases,
scale-comparison plates and initial runtime scenery integration. Check the library inventory and
Git state first. Continued refinement may follow that initial-delivery notification.

## Related Cambrian rework

Odaraia was also reopened by the user on 7 September. See
[the Cambrian queue](../cambrian/refinement-queue.md). Its named backup, translucent wrapping
carapace and distinct limb/eye/tail requirements are separate from the Devonian roster.
It follows the same individual authoring, preview and post-rework audit workflow.
