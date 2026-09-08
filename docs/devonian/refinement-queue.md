# Devonian refining pass queue

## Eye-audit scope — user clarification

The quantitative 50% eye-globe embedding/containment audit applies only to fish-like creatures. Do not apply it to arthropods, cephalopods or other creatures with naturally exposed or stalked eyes; in particular, do not force Odaraia or nautiloid eyes into their bodies to meet this threshold. Their eyes should follow the creature-specific anatomy and references. Ordinary visual checks for unintended gaps, attachment errors and animation defects still apply. This clarification supersedes broader eye-audit wording in older plans and handoffs. Work remains paused.


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

Titanichthys, Doryaspis, Gemuendina, Coccosteus, Bothriolepis and Stethacanthus require total model reworks, not cosmetic edits to the current geometry. Reconsider reference-based proportions and continuous volumes, sculpt new Blender geometry where needed, rebuild materials and rig deformation, then author dynamic actions and matching portraits. Preserve existing versions locally. Each remains a playable preview until its individual rework review passes. Gemuendina V3 has passed its structural review. Titanichthys V3 candidate08 has also passed its focused structural/art review and is published on mainbc5a2d0; broader polish remains pending. The other four total reworks remain pending.

The machine-readable pending queue is `tools/devonian/pending-refinements.json`. Catalogue validation requires every pending creature to remain `preview`; remove a pending entry only after its actual work and review are complete.

## New reference-led redesign briefs — 8 September 2026

The three existing individual refinements below now have specific structural redesign targets.
Keep their current models as preview, preserve their originals, and finish the earlier six
remaining full reworks first. Do not spend general/eye audits on geometry about to be replaced.
User images are locally preserved appearance references, not instructions or fossil proof.

### Tiktaalik

Reference: `../devonian-authoring/tiktaalik/user-reference/tiktaalik-user-reference-2026-09-08.jpg`
(SHA256 `813d181bb875abb63c349659ca94b62ead15c685d87f14f08e30f9746dde19ed`).
The current model is too flat. Sculpt a fuller, rounded rib-supported trunk with convincing
shoulder and pelvic volumes, a shallow broad head distinct from that fuller body, and a rounded
arrow-shaped snout rather than a thin spear point. Preserve a substantial rounded anterior tip,
cheek width and three-dimensional jaw/throat depth, using side/dorsal/front/oblique comparisons.
Reconcile the illustrated outline with the primary anatomy in `tools/devonian/creatures/tiktaalik/anatomy-notes.md`;
not every illustrated fin or detail is automatically a sourced anatomical feature. Refit oral
lining and jointed fins to the new volumes; maintain mobile neck and nuanced aquatic actions.

### Onychodus

Reference: `../devonian-authoring/onychodus/user-reference/onychodus-user-reference-2026-09-08.jpg`
(SHA256 `8ff998cb69c01f6bab2a81f3eadba82e60fe3399c71fa4221102c12d9d2bdae1`).
Make the distinctive lower tooth apparatus conspicuous in the head silhouette and open-mouth
poses, separately from ordinary marginal teeth. Sculpt readable dermal cranial bone boundaries,
cheek/gill-cover volumes, supported fish eyes and fine surface relief, avoiding an undifferentiated
head. Verify the paired tusk-whorl arrangement, its bony base and palatal clearance from primary
oral anatomy rather than copying the illustration's visible tooth count or assuming a known
retraction mechanism. Model the interior, lower jaw and tooth supports together for coherent rest,
gape and feeding poses. Brief: `tools/devonian/creatures/onychodus/rework-v3/ANATOMY_REFERENCE_BRIEF.md`.

### Rhinodipterus

Reference: `../devonian-authoring/rhinodipterus/user-reference/rhinodipterus-user-reference-2026-09-08.webp`
(SHA256 `9e3c0b35890e53f71616be7d4ea6edfdeb34727b1b3097b5a365758122aca1d8`).
Use the supplied long-head profile and fuller cheek region as redesign targets. Eyes should read
as natural fish eyes seated in cranial volume. Give the face readable anatomical bone boundaries
and the body individually legible overlapping scales with subtle relief and a continuous flexible
surface. Avoid smooth featureless skin, detached armor tiles or rows of floating scales.
Check illustration/species correspondence against the saved primary description before treating
its full body and fins as established anatomy: the existing README explicitly distinguishes
preserved Gogo head material from comparative body reconstruction. Preserve the lungfish oral
tooth-plate design rather than borrowing Onychodus fangs. Animate scale-bearing skin smoothly,
with a coherent jaw/throat and restrained fin and tail motion appropriate to the revised shape.

All three original public families and current source/maps are copy/hash-verified in
`../devonian-authoring/backups/<id>-pre-reference-rework-2026-09-08/`. Old editable sources stay
local and untouched. These directives refine the existing pending entries, not final approval.

### Cheirolepis — reopened from final

User supplied `/Users/hoai/Downloads/Cheirolepis.jpg`; preserved locally under
`../devonian-authoring/cheirolepis/user-reference/cheirolepis-user-reference-2026-09-08.jpg`.
Reference SHA256: `3f8db7eab698bfbd7bbaebdd329a9a1ddffe1c203783f6f44a271656ed0fed78`.
Redesign the specific face shape: skull-to-snout transition, rounded anterior tip, oblique
cheek/gill-cover region and long jaw contour. Reassess the eye's anterior/lateral placement
relative to the snout, roof and jaw; seat it in actual cranial volume. Rebuild fin base positions,
swept leading/trailing edges and angular outlines from side, front and oblique views, with
credible three-dimensional incidence rather than flat generic paddles. Preserve coherent
heterocercal tail/axial motion and supported fin attachment while checking proportions against
primary anatomy in the existing source README. Do not transplant every illustrated detail
without that check. Sculpt first, then update jaw/fin actions and full/LOD portraits, and audit
only the completed new geometry. Previous final approval applies only to the backed-up model.

Reopened as **preview** and added to the machine-readable pending queue. The original final
public family and source/maps are copy/hash-verified under
`../devonian-authoring/backups/cheirolepis-final-pre-reference-rework-2026-09-08/`.
This adds one individual redesign after the earlier full-rework priorities.

### Cladoselache — reopened from final

User supplied `/Users/hoai/Downloads/Chondrichthyes.webp` explicitly for **Cladoselache**.
Preserved at `../devonian-authoring/cladoselache/user-reference/cladoselache-user-reference-2026-09-08.webp`,
SHA256 `21dea136c93722f5a6c997a6724d05b144a6f0ae2fcb1128e68edda868753b2c`. The image credits Encyclopaedia Britannica2012; keep it local for study.
Reassess the distinctive fin system: broad swept pectoral outline and attachment/incidence,
separated angular dorsal fins, posterior fin profiles and asymmetrical tail outline. Show the
whole arrangement in side/front/dorsal/oblique views instead of copying a single flat silhouette.
Use the subtle dark dorsal/light ventral pattern and fin-edge regional variation as appearance
targets, with restrained original pigment and anatomically authored surface response. Verify
fine fin proportions, tail skeleton and dentition with the existing primary sources before
locking the new geometry; the image alone is not anatomical proof.

Reopened as preview and pending; preserve the old finalized family/source under
`../devonian-authoring/backups/cladoselache-final-pre-reference-rework-2026-09-08/` (hash manifest).
Fin/jaw animations, full/LOD/portraits and new audits follow completed redesign.

### Nahecaris — shrimp-like body and appendage proportions

User reference `/Users/hoai/Downloads/Nahecaris.jpg` preserved at
`../devonian-authoring/nahecaris/user-reference/nahecaris-user-reference-2026-09-08.jpg`,
SHA256 `d5640abf84805adf6b4f6df335dc5b3bceda09931d426b2039089391ffb85cb3`. Rework the natural shrimp-like curves and relations of the body,
shell and leg positions: curved layered valve profile with thin shaped margin, articulated
posterior arch/taper, legs folding/reaching from appropriate positions beneath the shell,
and proportionate eyes/antennal bases/long slender antennae. Avoid a rigid cylinder, straight
stack of body segments, uniformly splayed legs or oversized eyes and feelers. Compare reference
angle, side/dorsal/front views and reconcile phyllocarid anatomy with the existing primary
sources before locking geometry. Preserve originals, model/source backup and reference.
Coordinate this structural redesign with the separately requested attack/feeding pass in
`docs/attack-feeding-refinement.md`; limb motion must follow the new anatomy, and audits follow
the completed replacement. Existing model remains preview.

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

Titanichthys V3 candidate08 is published on mainbc5a2d0 as a refined **preview**: deep armored form, long fins, continuous articulated oral interior, inset eyes,18 actions in both full/LOD and five anchors. Final combined render review passed; actual full/LOD eye containment lower bounds exceed60%, and58 oral poses pass. Full package21,955,988 bytes, LOD2,365,892 bytes. See `tools/devonian/creatures/titanichthys/rework-v3/RELEASE-CANDIDATE08-EXECUTION.md` and `RELEASE08-ART-VERDICT.md`. LOD surface/eye-rim polish and broader controller review remain pending. Historical V2 approval does not cover the replacement. The L01 lighting concept currently depicts
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

## Separate articulated attack and feeding pass

See `docs/attack-feeding-refinement.md`: nautiloid/cephalopod tentacle flare and whipping,
articulated sea-scorpion/spider strikes, and multi-arm grasp-to-underside-mouth feeding for
Furcaster. Coordinate with pending body redesigns, including Nahecaris; audit only completed
new geometry. This overlaps eight current individual refinements, not eight new creature IDs.

## Reopened face refinements — 8 September 2026

### Gemuendina

User likes the improved V3 but requests a focused correction against the existing
Gemuendina.webp reference: mouth at the leading front, visibly bulging eyes immediately
above it (near what could be mistaken for nostrils), and dorsal motifs treated as markings,
not additional eyes. Preserve the accepted body, broad pectoral volumes, tapering tail and
materials. Inspect the actual reference and V3 front/side/oblique views before changing the
cranial mesh; do not move whole eye objects without reshaping their support and orbital skin.
The previous research describes an upward mouth/dorsal eyes, so the new author must explicitly
reconcile position versus opening direction and separate the user's visual target from fossil
certainty. Do not silently claim a disputed reconstruction is settled.

V3 is reopened to **preview**; its previous final art/eye reports remain historical evidence
for the preserved version, not approval of a modified face. Backup with public family, source
and production Blend: `../devonian-authoring/backups/gemuendina-final-pre-face-refinement-2026-09-08/`.
After new sculpt: mouth/skull/jaw/anchor alignment, closed and open oral continuity, supported
bulging eyes with at least 50% globe volume inside, full/LOD action poses and fresh portraits.

Historical focused face preview main0b639d0 (8 September), subsequently rejected by user: two supported
anterior globes, preserved posterior,18/18actions and refreshed portraits. Ten actual exported
pose audits exceed50%; minimum conservative interior77.04%. All11 full/LOD face views
inspected and built viewer verified. Remaining broad final art/LOD cleanup and controller
playtest keep the caution badge. See face-v4/WORKING_STATE.md and release-review-02.json.

Latest clarification supersedes that mouth interpretation: the FRONT FLAP itself is the
mouth, upper and lower terminal lips define the leading snout; no preoral apron or dorsal
opening. Eyes closer together above it, near nostril positions. Root study03/04 failed
ventral-fold review. Dedicated Astra terminal-snout author now preparing study05+; previous
interior audits apply only to their preserved meshes. New face must pass side-profile review
before production export.

### Dunkleosteus

New reference `/Users/hoai/Downloads/Dunkleosteus-1.jpg` copied with hash/provenance to
`../devonian-authoring/dunkleosteus/user-reference/dunkleosteus-face-user-reference-2026-09-08.jpg`.
Focus on the strong facial profile, sculpted brow, large angular cheek plates and sharp shaped
cutting structures. The target is a distinctive head and gnathal silhouette, not rows of generic
cone teeth. Use the reference as art direction; confirm cutting-plate anatomy independently
rather than copying every illustrated cusp. Preserve modeled throat, mouth lining and independently
movable jaws. Sculpt coherent plate roots, tapered edges and receiving clearance, then examine
closed rest, mid bite, maximal gape, eating and recovery from front/side/three-quarter views.

Reopened to **preview**. Backup includes public family, full authoring source and V2 Blend at
`../devonian-authoring/backups/dunkleosteus-final-pre-face-refinement-2026-09-08/`. Recheck eye
containment after brow/head edits, mouth contacts across jaw poses, actual anchors and full/LOD
parity; regenerate portraits before publishing the revised face.


8 September focused Dunkleosteus face preview: V4 candidate03 with pigment04
LOD binding correction preserves the jaw rig, mouth lining and all18full/LODclips.
Actual173feeding-pose checks show zero opposing-shell/gnathal failures, eyes pass.
Full face/portraits and correctedLODposes individually reviewed; selectedintake,
build/typecheck and viewerIdle/Heavy pass. Remaining broadpreview: LOD is paler
and smoother; investigate albedo-to-vertex colourspace and materialpolish.


Closing Gemuendina correction: candidate05 replaces the rejected candidate02 face.
The front upper/lower lips form the terminal snout and the smaller eyes are close
together above it; body and pigmentation remain. All12 actual export poses plus
4portraits pass focused review,18full/LODactions retained;10pose eye/oral checks
pass and builtviewer Idle/Heavy verified. This focused correction is delivered as
a preview; small LOD crease/pigment and broader controller/art polish remain.

## Closing checkpoint — 8 September 2026

Titanichthys V3 is on mainbc5a2d0 and Dunkleosteus linear-color LOD05 on mainff9a853, both retained as previews. Coccosteus candidate07 passes its full/reduced surface review but awaits final oral/eye/motion/runtime/package checks before replacement. Bothriolepis M04 remains held for nuchal/rostral shading and coarse relief after the mouth improvement. Odaraia material02 direction is accepted and production-plan03 is saved; rig/baking/game transparency/actions/export remain. No general audit of an obsolete model should precede its complete rework. Resume details and exact evidence are in `docs/devonian/current-state.md`. Work paused at the user's request.
