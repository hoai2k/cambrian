# Devonian supporting asset inventory

These are initial versions for integration and testing. All scenery and supporting images remain
previews. The regional paintings are interpretations of separate places and times; neither library
membership nor a scale/lighting board asserts that its subjects coexisted.

| Set | Initial deliverable | Manifest / source |
| --- | --- | --- |
| Scenery specimens | 47 full/LOD variants covering 29 families, editable Blender originals, portraits and ambient actions where appropriate | `public/assets/devonian/props/manifest.json` |
| Scenery appearance guides | 29 annotated original-model boards, with morphology, locality and uncertainty | `public/assets/devonian/reference/scenery/manifest.json` |
| Runtime biome paintings | 9 separately painted game-region images | `public/assets/devonian/biomes/manifest.json` |
| Regional environment concepts | E01–E09: establishing view, substrate close-up, light/water study and locality/age | `public/assets/devonian/reference/environments/manifest.json` |
| Lighting concepts | 3 neutral-versus-atmospheric studies using current model portraits | `public/assets/devonian/reference/lighting/manifest.json` |
| Environment material sets | T01–T10, described below | `public/assets/devonian/materials/surface-materials.json`, `source-atlases.json` |
| Particle and decal atlases | 2 transparent 4×4 atlases, 32 padded cells with UV rectangles and scale suggestions | `public/assets/devonian/atmosphere/manifest.json` |
| Static runtime scenery | 11 separate compressed derivatives; seven ordinary flora and four rock slots | `tools/devonian/props-instancing/handoff.json` |
| Scale comparisons | Two completed plates from actual orthographic model projections, all 21 subjects at one main scale | `public/assets/devonian/reference/scale/` |

T01–T05 and T07–T09 each supply an original imagegen albedo and numerically authored height,
normal and roughness data. Heights are 16-bit, normal maps follow conventional UV-up OpenGL
orientation, and the declared material span/amplitude are art settings. Mud has a disturbance
mask; microbial coating has three coverage masks and restrained pigment factors; wood has a
sediment mask and a separate original-model reference for its end/surface. Tile appearance,
relief alignment and wetness still need in-scene refinement. These are not measured scans.

T06 is an atlas from the authored shell-hash model. T10 keeps stromatoporoid, tabulate coral,
rugose coral and bryozoan surface studies separate. Their transparent top-view cells contain
unlit colour, object-space normals, roughness and explicitly **8-bit reference height**; they are
not tangent-space tiles or production displacement maps. Skeleton shape and speculative living
covering must remain distinct. The extra log cell supports T08 and source-derived organic decals.

The particle atlas contains generic fine silt, pale flecks, organic particles and sparse-density
cells, without invented plankton taxonomy. Decals contain sediment drapes, microbial patches,
shell forms and wood fragments derived from our scenery sources. No modern tracks are included.

The runtime proxies preserve placement seeds, density, pivots and physics. Performance mode
retains procedural flora and uses authored rock slots; the measured reference scene adds about
7.9% triangles with unchanged draw calls. High uses the authored ordinary flora and currently
has substantially more geometry, so dense-scatter LOD work remains pending. The two giant
`lilyColumn`/`frondTower` forms keep their procedural initial versions pending appropriately scaled
rock/framework compositions. Terrestrial plants have not been placed underwater.

Reproduction and exact checks are in `tools/devonian/materials/`, `tools/devonian/props-instancing/`
and each manifest. Original imagegen PNGs, full prompts and references are preserved under
`local/devonian-authoring/environment-images` and `environment-materials`; tracked prompt JSONs
live in `tools/devonian/`. Source model projects remain under `local/devonian-authoring/props`.
The independent supporting-asset review checks decoded image data, hashes, normal conventions,
height precision and sprite padding; it does not approve the final scenery art.

The L01/L02 lighting concepts currently show the old Titanichthys/Coccosteus models. Refresh them,
and relevant scale projections, after their user-requested complete reworks. Creature eye/general
audits also follow those completed reworks; do not repeatedly audit geometry queued for replacement.

Every initial set above is committed and pushed to main in **f7b5618**. The user received the
requested separate non-creature completion notification. Subsequent refinements remain pending.
