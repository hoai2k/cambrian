# Bothriolepis V3 clay01 review and bounded clay02 revision

Owner: Astra high. Verdict: **return for source correction**. Main proportions,
shield volume and pectoral deployment are provisionally suitable for the coarse
gate; clay01 as a whole is not accepted for materials or rigging.

Reviewed actual outputs:

- Blend SHA-256: `880c1268ca2a02079bab14288fc4d163e640c1ea10034d0f1cf1aaaf548c3b22`.
- `outputs-sha256.json` SHA-256:
  `ab922e535b869b5597fca6bab7213d77923fa248d745973d85ac264742a7487a`.
- All six actual 1100x880 images in local `rework-v3/clay01/` were opened.
  Old candidate and frozen sources are preserved unchanged.

## Independent visual judgment

The front and oblique images establish meaningful anterior depth, with a steep
cephalic ramp, broad thorax and taller posterior crest. Side view preserves the
primary reference's flat floor, narrower scaleless posterior, square dorsal and
asymmetric caudal outline. The shield is no longer a generic rounded fish.
Pectorals clearly project outward and backward, and their broad lateral blade
face agrees with primary figure 5. Their general dimensions should be retained.
Small eyes remain discreet; final eye geometry review has not yet begun.

Dorsal and underside images cut off the nose/tail. The error is camera framing:
Blender's orthographic scale in the 1100x880 landscape frame controls width; a
5.8-unit width provides only 4.64 units of vertical coverage for a 5-unit animal.
Thus these views cannot pass the full-silhouette gate.

The pectoral roots show sharp triangular/fan creases from below and small
pinches from the front/oblique view. Source analysis finds a real geometric
cause. Clay01 bridges each rectangular shield cutout to a small proximal ring
in one strip, with the worst quad's two triangle normals having dot product
**-0.175521**. This is a twisted quad despite the connected-manifold PASS. The
initial ring is also too close to the surrounding shield. This needs a surface
transition correction, not a smoothing material.

The mouth reads as a convex plug with a rectangular tissue-colored border.
However, source ray/section evidence disproves an exterior cap: a ventral ray
through the opening center first reaches the oral interior at z=-0.253298,
about 0.100 above the lip at z=-0.353. The next hit is the external dorsal roof.
Nearby rays likewise enter the vestibule. The cavity's evenly tapering bowl,
fully illuminated recessed termination and rectangular annulus material mask
produce an ambiguous convex/concave reading. The source-depth diagnosis is in
local `rework-v3/clay01-depth-and-root-diagnosis.json`.

## Frozen clay02 correction

- Preserve supported shield/body/appendage scale and broad blade orientation.
- Narrow the root's local shield cutout and move the first proximal cross-section
  farther outside the local shield. Replace the single bridge with 16 intervals
  of a tangent-matched Hermite surface. Its initial tangent follows the actual
  shield and its terminal tangent follows the pectoral axis. No collars or
  overlapping primitives are added. The new minimum internal quad-normal dot is
  0.788655, and every root transition remains part of the same closed surface.
- Keep the entire outer oral annulus in the surrounding clay material, so its
  rectangular construction boundary is not displayed as anatomy. The actual
  mouth opening retains the same dimensions. Model a short near-vertical entry
  wall and a deeper vestibule bending posteriorly into a narrower throat.
  The throat's termination moves from z=-0.237 to -0.139 and is offset posteriorly;
  the central ventral ray encounters an interior wall at z=-0.239764, not a cap.
- Smooth the onset of caudal transverse compression over 0.25 units. Clay01's
  abrupt switch near y=1.64 left a small transverse shading crease. The supported
  dorsal and ventral tail outlines are unchanged.
- Fit each full-body camera against the actual projected vertex bounds, with
  a 1.16 scale margin in both screen dimensions. The predicted minimum margin
  is greater than 6.5% per frame edge. Recenter the projected bounds.
- Retain front, side, dorsal, oblique and underside full-body views. Add both
  a direct oral-open close view and a separate oblique underside depth view.
  The two close views are intentionally cropped to oral context; the other five
  must contain the entire animal with margin.
- Reduce fill/world illumination to preserve contour and cavity shading, keeping
  enough ventral light to inspect attachments. Darker interior clay distinguishes
  internal tissue; this is a geometry review material, not the final pigment.

## Execution and second coarse gate

Run from `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`:

```sh
/usr/bin/python3 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/bothriolepis/rework-v3/execute_clay02.py --run-frozen-clay02
```

The executor checks `frozen-inputs-clay02.json` and writes only a new local
`rework-v3/clay02/` directory. Expected: `bothriolepis-clay02.blend`, seven PNGs,
source report, output inventory with SHA-256 values, and execution log. Stop on
hash mismatch, an existing clay02 blend, Blender error or missing manifest.

Astra and root must inspect all seven actual outputs. Require complete full-body
framing; smooth root transitions without fan/pinch defects; an unmistakable
ventral recess with attached rims and visible depth from the oblique view; and
preserved shield and appendage proportions. The numerical root check does not
establish self-intersection freedom or accept anatomy on its own. If the root
bulks up into a collar or the mouth remains ambiguous, return for another bounded
source correction. Materials, fine relief, production rig/actions, exports and
general audits remain out of scope until this coarse gate is explicitly accepted.
