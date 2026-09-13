# Bothriolepis clay02 coarse verdict and MATERIAL01 handoff

Astra high independently inspected all seven actual clay02 images.
**Accept the bounded coarse geometry gate** for this exact source:

- `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/bothriolepis/rework-v3/clay02/bothriolepis-clay02.blend`
  SHA-256 `55ca3b38a1de698a9e788ca9f76ab576476aa28785c84380754d27ebcbecc84b`.
- Clay02 `outputs-sha256.json` SHA-256
  `3d1f7511578f67e4ab1e0bbab5f766e77416f6bc7db0dad9549b9481dfca84e2`.

The complete nose and tail are now visible in the five full-body views. The
bulky anterior and steep head remain convincing, pectorals project outward and
backward with a downward attitude, and their broad lateral blade orientation is
consistent with primary figure 5. The root fan pinch is absent. The mouth reads
as a genuine recess in both direct and oblique underside views, without a
rectangular tissue-colored surround. Its deeper vestibule has attached margins.
The square rayless dorsal and asymmetric tail remain intact. Root normal-dot
and camera-margin source checks agree with the visual improvement.

This is not final art approval. The shield is still broad and smooth in clay;
it needs clear plate relationships and restrained granular dermal detail to
meet the user image's heavily armored brown-olive anterior. Final eye/attachment,
animation, anchor, full/LOD and export reviews have not begun.

## MATERIAL01 authored appearance

The builder opens the exact accepted clay02 blend and verifies its complete
mesh coordinates against the frozen geometry source before making changes.
It does not rebuild an old model or import a previous texture treatment.

Fourteen named, explicitly authored suture paths follow the cephalic/thoracic,
median dorsal, dorsolateral/mixilateral and ventral plate relationships visible
in the preserved 2014 figures 2/3. Their detailed projection is a surface
interpretation, not a claim of metric fossil tracing. They are mirrored by
anatomy, not generated as arbitrary Voronoi polygons or crack noise.

The same paths drive narrow dark sutures, slightly raised adjacent margins,
shallow actual mesh relief and normal/roughness maps. Real displacement is
bounded below 0.0043 model units, with protected mouth, eye and pectoral-root
boundaries. The original continuous topology and oral shape-key motion remain.
The rostral cap receives a matched vertex pigment material without a collapsed
longitudinal UV normal map; the ventral oral annulus keeps a matched continuous
color instead of displaying its construction patch.

Upper armor has warm brown-olive median plates, quieter olive lateral regions
and a muted ochre underside. Broad pigment variation follows those plate regions.
Pectoral plates share the armor family, with fine longitudinal sutures, clear
margins and the existing limited joint recess. Pectoral roots use continuous
vertex pigment interpolation rather than a noisy texture or separate collars.
The narrower posterior has quiet smooth skin, small broad pigment variations,
and no invented scales. No rays are added to the square dorsal.

One original ImageGen swatch supplies only subdued dermal microdetail. Its
bounded contribution is +/-2.5% color and 0.00075 height units, and it fades near
the explicit sutures. Fine rounded tubercle bump relief is also small; neither
texture source can move a plate boundary. The original image and exact prompt
are preserved under `material01-inputs/`. No user art or fossil imagery is used
as a distributable material.

Six 1536x1024 texture maps (shield and pectoral basecolor/normal/roughness) are
generated and packed in the new Blender source. The scaleless body, roots,
rostral closure, oral rim and oral cavity use region-specific native materials.
Fine marginal pectoral denticle silhouette still needs later anatomical detail
review; this material gate does not claim individual spine-count validation.

## Frozen execution

CWD: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.

```sh
/usr/bin/python3 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/bothriolepis/rework-v3/execute_material01.py --run-frozen-material01
```

The executor verifies `frozen-inputs-material01.json`, launches Blender with
two CPU threads, and writes only new local `rework-v3/material01/` outputs:

- `bothriolepis-material01.blend`, with packed authored textures;
- eight PNGs: the five matching full-body views, two oral close/depth views,
  and `08-armour-detail.png`;
- six standalone maps, `source-check.json`, `outputs-sha256.json`, `execution.log`.

No Blender execution was performed by Astra. Stop on an input mismatch, existing
material01 blend, unexpected error, coordinate mismatch or missing inventory.
Preserve the evidence and return without source/threshold/directory changes.

## Acceptance after actual rendering

Require anatomy-readable plate boundaries at normal view size, shallow bony
relief in the close oblique view, and restrained fine texture that does not turn
the shield into gravel or erase the sutures. The front should read as heavy
living armor with warm brown-olive pigment rather than painted cracks on a toy.
The quiet posterior must remain visibly scaleless. Root, eye and mouth geometry
must retain their accepted clay relationship, with no texture streaks at UV
closures, painted oral rectangles or bright unrelated pectoral joint bands.
The square dorsal and broad lateral pectorals must retain the accepted outline.

The author/root must inspect all eight images and bind their verdict to the
new blend/inventory hashes before any production rig/actions, GLB exports,
public integration or general creature audit. Returning for a bounded material
revision is appropriate if the medium-scale armor still fails to read.
