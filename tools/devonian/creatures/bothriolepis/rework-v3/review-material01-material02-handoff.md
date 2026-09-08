# Bothriolepis MATERIAL01 verdict and MATERIAL02 source handoff

Astra high inspected all eight actual MATERIAL01 views, the root's review and
the user's appearance reference. **Return MATERIAL01 for bounded correction.**

Reviewed source blend SHA-256:
`d25049d96a664ed359597daa8fbb9d44f4c0ca14c5922c7308437abaae52ffaf`.
Reviewed output inventory SHA-256:
`35b997ea6ccdd489af32d83f2d0a492ae7c49f2a33301f47b28af68586b0cacb`.
These outputs remain preserved under local `rework-v3/material01/`.

## Findings and diagnosis

The plate hierarchy and restrained grain are a useful advance. The accepted
bulky shield, broad lateral pectoral blades, restricted joint geometry, square
rayless dorsal and actual recessed ventral mouth remain intact. Fine texture
does not erase the plate paths. Those shapes and the fourteen suture paths
should be preserved for this correction.

The pale pectoral root blocks, circular nose badge, exterior rectangular oral
patch and pale uniform posterior are unacceptable. Their shared cause is a
color-encoding mismatch between native linear vertex colors and texture color.
The MATERIAL01 image writer put the intended linear pigment values directly
into the sRGB PNG bytes, so Blender's sRGB decode darkened textured regions a
second time while vertex-colored regions stayed at their intended brightness.
For a representative shield flank point U=.4/V=.25:

- intended linear pigment: [0.1187, 0.1580, 0.0900];
- actual PNG RGB bytes /255: [0.1176, 0.1529, 0.0863];
- decoded linear texture pigment: [0.0130, 0.0203, 0.0080].

Thus the texture's channels were only about 9–13% of the intended nearby
linear values. At the ventral sample, the corresponding ratio was 13–20%.
Changing only the nominal RGB values of one collar would conceal the common
encoding bug rather than restore continuous pigmentation.

The sharp forehead divide coincides with the angular UV chart seam. MATERIAL01
used one-sided height derivatives at the two ends of a wrapped normal atlas.
At U=.10, the normal-map edge green values differ approximately .576 versus
.427; at U=.20 they differ .361 versus .620. These discontinuities are visible
on a smooth lit forehead and do not establish an anatomical median crease.

The posterior has almost no skin-scale roughness or normal variation, producing
the smooth pale plastic reading. Its scaleless anatomy should remain; it needs
a quieter but perceptible living-skin response, not invented scale or fin-ray
patterns.

## Frozen MATERIAL02 correction

`build_material02.py` opens the exact reviewed MATERIAL01 blend. It hashes all
mesh coordinates, polygon indices and every shape-key coordinate before and
after authoring. These data must remain identical: this revision changes only
UVs, materials and color attributes. It does not re-sculpt the roots, mouth or
accepted shield, nor does it repeat the physical suture displacement.

The new image writer explicitly encodes linear basecolor fields into sRGB PNG
bytes using the standard transfer function, then loads those files as sRGB.
Normal and roughness maps remain unconverted Non-Color data. A round-trip check
measures linear error against the intended pigment, preventing the previous
texture/native mismatch. The overall pigment field is reduced uniformly to
70% of the original intended linear values to retain a restrained brown-olive
family under the existing review lights, rather than making the corrected
colors overly bright.

The angular UV wrap moves to the underside; the forehead is now inside the
atlas at V=.5. Wrapped normal derivatives use periodic central differences.
Pixel-centered sampling and explicit U-edge clamping avoid accidental
snout/posterior column wrapping. Original anatomical paths remain unchanged.

The existing rostral, oral-rim and pectoral-root patches receive harmonic color
continuation from their real, fixed surrounding shield/pectoral boundary
vertices. There is no independently colored construction rectangle or collar.
Mucosa is assigned only to internal cavity polygons. The narrow existing
pectoral articulation uses the same linear pigment family, not a pale band.
A shared very small rest-space pore response crosses all exterior material
boundaries so cap/root/rim surfaces do not abruptly become polished plastic.

The posterior receives its own basecolor/normal/roughness maps: a subdued olive
dorsum, warmer quiet underside, small broad pigment variation and minute skin
response. Its anterior color initially matches the shield boundary and then
transitions over the proximal flexible body. No scales, granular armor plates
or dorsal fin rays are added. The original dermal source is reused at a much
smaller posterior normal amplitude; no new ImageGen call is needed.

## Exact Terra execution group

CWD: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.

```sh
/usr/bin/python3 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/bothriolepis/rework-v3/execute_material02.py --run-frozen-material02
```

The executor verifies every input in `frozen-inputs-material02.json`, launches
Blender with two CPU threads and writes only new local `rework-v3/material02/`:
the new blend, eight matching review images, nine packed/standalone maps,
source check, output inventory and log. Astra has not run Blender. Stop on a
hash mismatch, existing candidate, coordinate/shape-key hash change, unexpected
error or missing output inventory; preserve evidence and return to the author.

## Required actual review and downstream dependency

Inspect all eight images. Require continuous exterior pigmentation and texture
response across the rostral closure, oral annulus and pectoral roots; clear
recessed mouth with mucosa only inside; no broad pale joint bands; no sharp
manufactured forehead divide; a quiet but living scaleless posterior that
belongs to the shield's olive family; and retained plate hierarchy and fine
tuberculation. Keep the square dorsal and blade/rigid joint anatomy intact.
The normal grain must remain subordinate to the plates.

The source checks do not constitute art acceptance. A new blend/inventory-bound
verdict is required before the rig or general eye/attachment/action audits.
The new common tiny Object-space pore Bump must later be baked into the final
export normal maps before GLB delivery; it must not silently disappear in glTF.
No such bake, rig, animation, export, public or Git step belongs to this group.
