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

The reports measure actual exported eye solids against the continuous head, excluding decorative orbital pieces. Full and reduced exports are tested separately. Each report identifies the exact packaged GLB hash; source-export reports have different hashes after lossless compression. No geometry, weights or animation samples are quantized during packaging.

Dunkleosteus's widest action gape was inspected with additional light aimed into the mouth. That exposed and led to removal of a skull cap crossing the oral aperture. The mandibular floor follows the jaw completely; local cheek folds blend at the commissures. Jaw excursions range from approximately 37° in Bite to 57° in Heavy, with separate skull elevation. This is real skinned geometry and bone motion. Oral soft tissues and living pigmentation remain interpreted.

Each revised full model retains the eighteen action clips and three version-1 specimen anchors. The lower-detail model retains the identical skeleton and anchors with Idle, Swim and Death. Mouth geometry, socket alignment and eye seating are also inspected in posed views; bind-space volume checks cannot establish animated attachment on their own.

## Remaining individual review

Coccosteus, Cladoselache and Stethacanthus are being rebuilt independently. Cheirolepis is undergoing its first release review. Unreleased creatures and scenery remain outside the approved shipment list until their own reviews pass.

The viewer uses balanced, camera-side inspection light so rotating a specimen reveals shaded texture and oral geometry. This is viewer lighting only.

Use the viewer's Pause and timeline controls for open-mouth, closing, banking and terminal Death poses. Check both detail levels. The original Cambrian assets remain byte-identical to the pre-Devonian set.
