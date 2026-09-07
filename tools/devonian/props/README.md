# Devonian scenery source library

This original library implements all **29 scenery families** in the natural-history brief, with **47 separately exported specimens/variants**. It adds content for specimen inspection and future environment assembly; it does not place those organisms into an invented common ecosystem or define gameplay.

The portable catalogue is `public/assets/devonian/props/manifest.json`. Every entry contains its family, taxon or explicit comparative identity, provenance, uncertainty, model/LOD/image paths, dimensions in metres, animation names and references. Individual metadata files repeat that record. A model metre is a real metre: centimetre-scale shells and columnals have not been enlarged to match trees or fish armour. The viewer should frame each subject independently.

## Initial preview delivery

All 47 variants ship as **preview** models. Basic full/LOD geometry, scale, ambient-loop and portrait checks pass, and every model loads in the viewer. Further individual sculpture/material/motion refinements remain pending. The six revised outputs and older first-pass outputs intentionally coexist; no claim is made that all variants already use the latest material code. Runtime instanced placement exports remain separate work.

## Reproduction

Run from the repository root, using Blender 5.2 (the build also uses ordinary Python and NumPy bundled in Blender):

```sh
node tools/devonian/props/decode-source.mjs
/Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python tools/devonian/props/build.py
python3 tools/devonian/props/finalize.py
python3 tools/devonian/props/validate.py --raw-authoring
```

Pass one or more primary IDs after `--` to rebuild only selected families:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python tools/devonian/props/build.py -- stalked-crinoid archaeopteris organic-remains
```

Blender requires unsandboxed graphics initialization on the production Mac, even though Cycles renders on CPU. Do not run parallel Blender batches for this library: the script uses two CPU threads and authors its own named destinations. The builder does not import or run any legacy Cambrian authorship tool, and never writes a creature asset. G12 reads the reviewed Dunkleosteus GLB as an explicit source dependency.

Source projects and review files are outside the checkout at `../devonian-authoring/props/<id>/`: an editable `.blend`, neutral lateral render and an annotated `reference-board.jpg` made from the original final-model render. The board is a morphology/appearance guide with uncertainty labels, **not a photograph of a fossil**. Source references are linked in the metadata. `build.log`, `validation.json` and the numbered contact sheets remain in the same local authoring root. No museum image or external model is redistributed by this library.

## Geometry, surfaces and motion

Anatomical constructors are separate: hexagonal tabulate colonies, large septate rugose calices, pinnulate crinoid crowns, perforated columnals, ribbed brachiopod valves, elongate modiomorphid valves, logarithmically coiled gastropod shells, early leafless sporophytes, lycophyte shoots, leafless cladoxylopsid crowns and woody Archaeopteris branches. Shared routines construct continuous lofts, surface sheets, tubes and valve surfaces; they do not relabel one organism mesh as another taxon.

All meshes have vertex pigmentation, UVs and an embedded normal texture. The source normal texture is an original, numerically authored tangent-space normal map. The V2 builder uses `microrelief-normal-v2.png`, generated from seeded isotropic stochastic fields in `normalmap()`, to avoid directional moiré bands. It adds small-scale surface breakup, not claimed fossil tissue detail. All pigmentation is interpretation, with no baked light or metallic pyrite treatment. Colour, grain frequency and normal strength remain editable in `PALETTE`, `vertex()` and `materials()`.

Blender 5.2 can replace vertex colours with white on secondary material primitives in a joined mesh. The exporter explicitly selects the `Color` attribute, then `restore_vertex_colors()` repairs affected primitives from their matching source material and source vertex positions. It preserves the authored pigments at the export accessor's precision. Validation rejects any accidentally white material primitive. `reexport.py` repeats the full and reduced exports from the editable saved sources without rerendering portraits; run `finalize.py` afterwards to clean constant animation channels and refresh metadata.

Full and LOD exports use identical coordinates and, where applicable, bone hierarchies. LOD geometry is genuinely decimated to approximately 30% of the full triangle count. Tree source projects retain the higher resolution authoring geometry; a first game-detail decimation is applied before the full tree export, followed by a separate LOD reduction. No scale animation is used.

Crinoid arms, Rhynia terminal shoots, Asteroxylon leafy axes, tree boughs and algal thalli have a restrained **4-second `Idle` loop**, sampled at 30 fps. Motion is anchored to the proper axis/calyx/bough attachment, with independent phase differences and a stationary root. Mineral frameworks, dead shells, wood, geological modules and disarticulated remains are static. These are scenery motions, not creature action sets.

## Family review and reconstruction limits

| Family | Model IDs | Anatomical/material review |
| --- | --- | --- |
| B01 | `massive-stromatoporoid` | Two contiguous skeletal domes with integrated mamelons and shallow astrorhizal grooves. Surface remains distinct from a cut fossil section. |
| B02 | `branching-stromatoporoid` | Two colony densities; Amphipora-type small calcified branching architecture, no coral polyps. Complete colony arrangement is inferred from fragmentary material. |
| B03 | `encrusting-stromatoporoid` | Two thin irregular layered patches; not a stromatolite. |
| B04 | `massive-tabulate-coral` | Two compact Favosites-type colonies; polygonal corallites under 1 cm across, not giant modern coral cups. |
| B05 | `branching-tabulate-coral` | Two Striatopora-informed bifurcation patterns with repeated branch apertures. |
| B06 | `solitary-rugose-coral` | Two curved horn skeletons with correctly aligned open calices, radial septa and growth relief. Exposed skeletal subjects, not asserted living polyps. |
| B07 | `colonial-rugose-coral` | Compact connected colony with conspicuously larger septate calices than B04. Genus-level comparative form. |
| B08 | `stalked-crinoid` | Two heights; perforated columnals, holdfast, calyx, five bifurcating rays and pinnules. Generalized pinnulate camerate reconstruction, explicitly not a Taxocrinus/Hunsrück species claim. |
| B09 | `brachiopod-bed` | Sparse/dense beds with 3–5 cm shells, spiriferid hinge wings and rounded atrypide comparative shells; dorsal/ventral valves and radial sculpture. |
| B10 | `bryozoan-colony` | Fine fenestrate mesh with repeated zooid-bearing branches and crossbars. Exact species unresolved; fine apertures simplified. |
| B11 | `gastropod-shells` | Low- and high-spired comparative shells with coherent whorl contact, closed embryonic apex and genuine open adult apertures. No invented living soft body. |
| B12 | `small-bivalves` | Elongate modiomorphid comparative shells with an offset umbo and concentric growth; includes an open empty shell. Radial scallop-like ribs were rejected in visual review. |
| P01 | `rhynia` | Two sparse sporophyte groups, with leafless dichotomous axes and terminal spindle-shaped sporangia. No grass, roots with caps or mixed life stages. |
| P02 | `asteroxylon` | Two groups of leafy shoots, separate root-bearing axes and downward rooting axes, following the 2021 reconstruction. |
| P03 | `cladoxylopsid-tree` | Two Gilboa architectural proportions, bulbous base and many fine unbranched rootlets, terminal divided **leafless** branch systems. No modern palm crown. |
| P04 | `archaeopteris` | Two woody proportions, hierarchical lateral boughs, divided leafy axes with approximately 2 cm fan-shaped pinnules and branching roots. No flowers, fruit or seeds. |
| P05 | `marine-algae` | Two bifurcating flattened thallus patterns informed by Yeaia/Hungerfordia material from Waterloo Farm. Attachment, full length and living posture are interpretive. |
| G01 | `carbonate-outcrop` | Two fractured/weathered coherent carbonate masses. |
| G02 | `reef-framework` | Layered intergrown carbonate framework with crevices and overhanging relief. |
| G03 | `carbonate-rubble` | Two arrangements of centimetre-scale fragments using geological fracture geometry. |
| G04 | `fine-sediment-bed` | Rippled and subdued fine-sediment modules with closed lower/edge geometry. |
| G05 | `sand-pebble-bed` | Two grain-size/density treatments with actual centimetre-scale pebbles. |
| G06 | `eroded-bank` | A sloping unrooted channel margin; separate from G11. |
| G07 | `large-boulder` | Two irregular silicate boulders with restrained mineral pigmentation. |
| G08 | `shell-hash` | Broken B09/B12 valve geometry, preserving coherent sculpture and scale. |
| G09 | `crinoid-debris` | B08 columnals and short stem sections; central lumina retained. |
| G10 | `submerged-log` | P04-derived tapering wood, attached woody branches and exposed axial fibres at a broken end. |
| G11 | `root-bearing-bank` | P04-type branching lateral roots embedded in a bank; no mangrove pneumatophores. |
| G12 | `organic-remains` | Four actual plate meshes extracted from the reviewed Dunkleosteus terrelli model: central cranial, anterior dorsolateral, suborbital cheek and inferognathal blade. Geometry is rigidly reoriented and placed at source scale. No invented long bones. Source SHA and element names are recorded. |

## Validation

`validate.py` reads the real GLB JSON and binary accessors, checking finite geometry and animation values, embedded normal material, authored vertex pigmentation on every primitive, normalized skin weights, compatible full/LOD nodes, root stability, absence of scale tracks, exact looping endpoints, real triangle reduction and a 25 MB per-file ceiling by default. `--raw-authoring` permits larger uncompressed intermediate exports while retaining every structural, material, skin, loop and image check. The two fine-leaved Archaeopteris full exports are about 26.7 MB before lossless packaging; they must pass the final 25 MB budget after the integration packager runs. It checks transparent PNG bounds for clipping and generates the contact sheets used for family-wide visual review. The integration task compresses GLBs losslessly with `node tools/devonian/package.mjs --props`, then runs `node tools/devonian/check-props.mjs` to enforce all 29 families and final size/scale/geometry/loop requirements. Packaging strips texture maps from reduced LODs while retaining their vertex pigmentation. For the raw-only validator, regenerate the validation report against the uncompressed author exports or use the integration decoder to audit compressed files.

Visual review covers every family in three-quarter and lateral views. Close inspection led to specific corrections to horn-rim alignment, continuous sponge surface relief, closed gastropod apices/contacting whorls, the bivalve outline, separate brachiopod valve outlines and hinge wings, centimetre-scale Archaeopteris pinnules, source-backed dichotomous algae and non-organic fractured rock geometry. Colour and soft anatomy remain explicitly qualified; detailed species-level diagnostic reconstructions would require a narrower specimen-focused research pass.

## Individual refinement pass

B01 and B04 have been rebuilt with non-directional microrelief and smooth three-dimensional pigment variation. B04 now uses a single connected honeycomb surface: adjacent corallites share outer rim vertices, shallow polygonal calices descend into the colony, and only the outer perimeter extends to the base. It replaces the separate capped tube geometry. The [Paleontological Research Institution morphology guide](https://www.digitalatlasofancientlife.org/learn/cnidaria/anthozoa/tabulata/) supports the polygonal corallite arrangement and distinction from tube colonies; the precise living coloration remains inferred.

`python3 tools/devonian/props/finalize.py massive-stromatoporoid massive-tabulate-coral` finalizes only those families while retaining other manifest entries. Already packaged models are not reparsed as raw geometry or rewritten. Existing G12 source hashes are preserved; new extractions require a provenance snapshot from `decode-source.mjs`. Changing the shared material builder does not update old exports automatically: each remaining family still requires a new export and portrait review before claiming the revised material treatment.
