# Seven ground-free Triassic prop inputs

T3D-10A image milestone, 19 September 2026. Produced with the built-in ImageGen tool and
visually inspected by `/root/prop_canonical_audit`. No Tripo request was submitted and no human
greenlight is claimed by this milestone. The canonical manifest decisions are unchanged.

After generation, `/root` visually reviewed a contact sheet of all seven final inputs and
approved them for Tripo: complete silhouettes, neutral backgrounds, no substrate slab, and
corrected morphology. This is recorded as parent-agent approval, without inventing a separate
human review. No further image generation followed that approval.

The five corrected references are sibling `*-candidate03.png` files in `canonical/` and are
available in the regenerated reference viewer. Bjuvia and Pleuromeia retain their approved
candidate02 designs; their model-input derivatives remove only the substrate and trim the
above-ground stem at its contact level. Every subject has `model-inputs/<id>/input.png`,
`canonical.png` and `metadata.json`. The corrected candidate03 and input are identical for the
five corrected subjects, avoiding a second generative interpretation between them.

## Review evidence

| Subject | Result of inspecting the selected image | Remaining 3D review constraint |
| --- | --- | --- |
| Bjuvia | Entire broad leaves, midribs and short trunk retained; no soil or exposed roots. | Keep thin blades separate; do not model trunk fibres as dense geometry. |
| Pleuromeia | One unbranched trunk, strap leaves and one cone; complete tips and base; no substrate. | Leaf crossings need mesh review; the buried rhizomorph is intentionally absent. |
| Neocalamites | Six jointed stems, free nodal whorls and basal sheaths; highest shoot is now fully in frame. | Fine leaves may disappear in Tripo; all six bases need a common authored contact plane. |
| Coenothyris cluster | Nine smooth rounded biconvex shells, growth lines and stout beaks; radial ribs and median keels removed. | Verify shell volumes and valve seams where shells overlap in projection. |
| Daonella bed | Broad shallow valves with long dorsal hinge edges, fine radial sculpture and dense overlap; no sand slab. | Enforce thin valves and a shallow aggregate; reject a generated mound or terrain plate. |
| Cidaris | Crater-like washer plates removed; narrow pore bands and orderly raised spine bases; entire club-spine silhouette. | One view cannot prove hidden-side fivefold anatomy; verify seated spines and fivefold test organization in 3D. |
| Encrinus litter | Twelve loose columnals and three stems now share circular canals, flat articular faces and short peripheral radial ridges. | Keep a single shallow scatter; avoid terrain underneath disconnected objects or oversized disc thickness. |

The initial Cidaris edit retained the wrong perforated bands and was rejected. Daonella's first
edit was too tightly framed and had unwanted alpha/edge artifacts. Encrinus required both an
opaque-background correction and a second face-ornament correction to remove decorative star
patterns. All 11 native attempts, including rejected intermediates, are preserved in `native/`.
Their exact prompts, source paths, hashes, dimensions and selected-attempt indices are recorded
in [provenance.json](provenance.json); concise reviews are in [reviews.json](reviews.json).

## Resolution and preservation

The tool returned **1254 × 1254** images despite the prompts requesting 2048 square. Delivery
copies are **2048 × 2048 Lanczos3 resamples**, not native 2K detail. No anatomical editing was
performed outside ImageGen. [package.mjs](package.mjs) reproduces the delivery files from the
committed native outputs. The seven pre-edit candidate02 PNGs are preserved byte-for-byte in
`../originals/2026-09-19-prop-candidate02/`; their original working paths were also left intact.

Each selected image was visually inspected for the audit correction, complete silhouette,
base, clean background and absence of a terrain slab. Packaging verifies seven decodable
2048-square inputs, all recorded hashes, byte-identical backups and matching corrected
canonical/input pairs. `npm run triassic:viewer`, `npm run typecheck` and `npm run build` pass.
Viewer regeneration includes its current built-model preview dependencies as well as the five
new candidates. No shipped prop meshes were changed.

## Anatomical basis

The project briefs are `docs/triassic/02-biomes-and-depth.md`,
`docs/triassic/03-image-and-model-requests.md` and `docs/triassic/research.md`.
The audit additionally consulted these primary morphological descriptions (no external image
was supplied to ImageGen):

- [Coenothyris systematics](https://epa.oszk.hu/02900/02989/00041/pdf/EPA02989_geologica_hungarica_ser_paleo_55_2003_139-158.pdf): smooth rounded/oval biconvex shells and stout beaks.
- [Daonella morphology](https://www.researchgate.net/publication/225634724_An_early_Daonella_from_the_Middle_Anisian_of_Guangxi_southwestern_China_and_its_phylogenetical_significance): low convexity, broad outline, extended hinge and radial sculpture.
- [Encrinus columnals](https://journals.bg.agh.edu.pl/GEOLOGIA/2005-02/Geologia_2005_2_06.pdf): circular columnals, circular lumen and short fine crenulation; petaloidal perilumen can occur.
- [Neocalamites morphology](https://www.researchgate.net/publication/236671494_A_reappraisal_of_Neocalamites_and_Schizoneura_fossil_Equisetales_based_on_material_from_the_Triassic_of_East_Antarctica): jointed stems and narrow free leaves borne in nodal whorls.

These are illustrative reconstructions and single-view modeling constraints, not measured
orthographic specimens. The seven remain subject to the instanced-prop contract and downstream
mesh review; photorealistic surface detail does not imply that it should become topology.
