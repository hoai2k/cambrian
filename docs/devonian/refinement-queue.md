# Devonian refining pass queue

Complete the carefully authored initial creature and non-creature library first. Commit and push
those previews to main promptly. Then address this queue individually; preserve sources and rerender
portraits whenever appearance changes. Preview status remains visible until each review is complete.

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

Gemuendina is reopened as **preview** until this user-requested sculpting pass is reviewed.

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
