# Devonian specimen art review

The eight first-release models were integration examples. An independent audit of `1e43197` found all sixteen eye globes below the requested 50% containment. Each subject is being revised separately in Blender, with source projects and older versions retained under `cambrian/local/devonian-authoring/`.

## Reviewed revisions

| Creature | Changes | Full / reduced eye containment | Evidence |
| --- | --- | --- | --- |
| Dunkleosteus | Shorter cranial wedge and muscular trunk; continuous anatomical armour surfaces, UV integument and curved fin membranes; fully modelled palate, cheeks, movable mandibular floor and recessed throat. Separate head and jaw bones drive feeding and attack actions. | About 84% / 84%, both eyes | [Source and visual review](../../tools/devonian/creatures/dunkleosteus/README.md), [final packaged eye report](../../tools/devonian/creatures/dunkleosteus/eye-packaged-review.json) |
| Titanichthys | Broad flattened shield with integrated sutures, closed fin membranes and seated eyes; toothless oral cavity with attached cheeks, floor, palate and a downturned lumen. Independently delayed tail and fin motion. | About 88% / 88%, both eyes | [Visual and motion review](../../tools/devonian/creatures/titanichthys/review.md), [final packaged eye report](../../tools/devonian/creatures/titanichthys/eye-packaged-review.json) |
| Bothriolepis | Steep, angular continuous head and thoracic armour; longer flexible posterior; restrained jointed dermal pectoral fins. Embedded dorsal eyes and a real ventral oral recess with attached, gently animated toothless tissues. | About 79% / 79%, both eyes | [Source and motion review](../../tools/devonian/creatures/bothriolepis/README.md), [final packaged eye report](../../tools/devonian/creatures/bothriolepis/eye-packaged-review.json) |
| Gemuendina | Low broad cranial wedge, broad undulating pectoral fins and a slender finless tail; upward-facing mouth with a shallow articulated lower jaw, continuous mottled integument and inset dorsal eyes. | About 82% / 82–83%, both eyes | [Source and motion review](../../tools/devonian/creatures/gemuendina/README.md), [final packaged eye report](../../tools/devonian/creatures/gemuendina/eye-packaged-review.json) |
| Doryaspis | Flat dorsal and deep ventral headshield, short rigid pseudorostrum and continuous lateral cornual plates; fine denticles, embedded dorsal eyes, toothless oral tissues and a flexible hypocercal posterior. | About 81% / 81%, both eyes | [Source and motion review](../../tools/devonian/creatures/doryaspis/README.md), [final packaged eye report](../../tools/devonian/creatures/doryaspis/eye-packaged-review.json) |
| Coccosteus | Rounded continuous cranial and thoracic armour, compact articulated jaw, recessed oral cavity, seated eyes and independently posed rounded pectorals; subdued UV surface detail and a heterocercal tail. | About 82% / 82%, both eyes | [Source and visual review](../../tools/devonian/creatures/coccosteus/README.md), [final packaged eye report](../../tools/devonian/creatures/coccosteus/eye-packaged-review.json) |
| Cheirolepis | Scottish C. trailli with a smooth long jaw, real oral tissues, mobile gill covers, fine rhombic scale relief and ray-supported fins; propagated tail bends and asymmetric fin recovery. | About 80% / 80%, both eyes | [Source and visual review](../../tools/devonian/creatures/cheirolepis/README.md), [final packaged eye report](../../tools/devonian/creatures/cheirolepis/eye-packaged-review.json) |
| Cladoselache | Blunt continuous head and lined articulated mouth, attached cladodont teeth, softly recessed gills, broad cambered fins, curved anterior dorsal spine and keeled crescent tail; traveling tail waves and delayed fin recovery. | About 77% / 77%, both eyes | [Source and visual review](../../tools/devonian/creatures/cladoselache/README.md), [final packaged eye report](../../tools/devonian/creatures/cladoselache/eye-packaged-review.json) |
| Stethacanthus | Short continuous head, tooth-bearing articulated oral cavity, opposing cranial/crown denticle fields and widened supported spine-brush; cambered fins, independent metapterygial extensions, propagated posterior motion and corrected swimming fin-root weights. | About 80% / 80%, both eyes | [Source and visual review](../../tools/devonian/creatures/stethacanthus/README.md), [final packaged eye report](../../tools/devonian/creatures/stethacanthus/eye-packaged-review.json) |

The reports measure actual exported eye solids against the continuous head, excluding decorative orbital pieces. Full and reduced exports are tested separately. Each report identifies the exact packaged GLB hash; source-export reports have different hashes after lossless compression. No geometry, weights or animation samples are quantized during packaging.

Dunkleosteus's widest action gape was inspected with additional light aimed into the mouth. That exposed and led to removal of a skull cap crossing the oral aperture. The mandibular floor follows the jaw completely; local cheek folds blend at the commissures. Jaw excursions range from approximately 37° in Bite to 57° in Heavy, with separate skull elevation. This is real skinned geometry and bone motion. Oral soft tissues and living pigmentation remain interpreted.

Each revised full model retains the eighteen action clips and three version-1 specimen anchors. The lower-detail model retains the identical skeleton and anchors with Idle, Swim and Death. Mouth geometry, socket alignment and eye seating are also inspected in posed views; bind-space volume checks cannot establish animated attachment on their own.

## Initial deliveries awaiting the refining pass

The original eight specimens and Cheirolepis have reviewed models. Six additional models are
now delivered as **previews**: Onychodus (eyes ~86–87% embedded), Rhinodipterus (~83%) and Tiktaalik
(~71%), Acanthostega (~73%), Jaekelopterus (~77%) and Eldredgeops (all individual lenses ~74% or more). Each was independently authored in Blender, with real oral geometry, the full shared
action set, matching LOD locomotion/death clips, three anchors and four matching portraits. Exact source and
packaged hashes and deferred polish are recorded in each builder folder's `preview-delivery.json`.

At the user's request, initial delivery of the remaining six creatures and all scenery/images
precedes further full art-refining passes. Preview does not waive the 50% eye minimum or basic
export/animation validity; it identifies the unfinished visual and detailed motion review.

The viewer uses balanced, camera-side inspection light so rotating a specimen reveals shaded texture and oral geometry. This is viewer lighting only.

Use the viewer's Pause and timeline controls for open-mouth, closing, banking and terminal Death poses. Check both detail levels. The original Cambrian assets remain byte-identical to the pre-Devonian set.
