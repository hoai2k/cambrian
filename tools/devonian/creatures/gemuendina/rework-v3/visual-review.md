# Clay-01 visual decision and clay-02 secondary sculpt

## Reviewed evidence — 2026-09-07T21:34:00Z

Astra high inspected all eight actual 1200×1000 Blender images in
`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/gemuendina/rework-v3/clay-01/`:
threequarter, front, side, dorsal, cranial, oral, rear_oblique and ventral.

- Reviewed blend SHA-256:
  `05b413fecf7e2fe8b68f06543d4b4beb091220ed52ed925d88cce5339c734883`.
- Reviewed render-manifest SHA-256:
  `1edec804e11993510f6e036cbbe3f21de03feba2a889c6ec13ecd1d6a911e570`.
- All original frozen input hashes were checked again and remain unchanged.
- Compared against the locally preserved user Gemuendina image already
  inspected during the first design phase, and the two specimen pages in the
  author-hosted Südkamp reference. The image's plate-like pigment boundaries
  are not proof of a precise cranial armour map.

**Decision: reject as a finished sculpt. Accept the continuous broad core only
as a working foundation for the next sculpt. No material/rig approval.**

## What the actual views establish

| View | Accept | Reject / required change |
| --- | --- | --- |
| Threequarter | Continuous body-to-fin envelope; substantial central volume; long finless tail | Smooth uniform head dome and broad empty fin fields still read as a toy. Need regional cranial planes, organic cheek/brow mass and cambered shoulder structure. |
| Front | Raised core above a lower belly, dorsal eyes/mouth | Oval gape reads as a punched opening; eyes look like exposed beads; lateral fin field is almost horizontal. Shorten the gape, sculpt integrated lips and commissures, seat eyes below broad brow masses. |
| Side | Gradual global head-to-tail height decrease | Snout ends in a thin point, the fin perimeter creates a conspicuous straight mid-height line, and pelvic width changes pinch then swell the axial profile. Add a rounded preoral/chin volume and changing fin camber; separate fin thickness from central trunk thickness. |
| Dorsal | Recognisable broad paired pectoral body plan | Mouth too deep front-to-back; head lacks regional contour; pelvic outline appears as a small disconnected-looking dumbbell. Smooth the pectoral/pelvic/root transitions while retaining smaller paired pelvic lobes. Tail tip was clipped by framing. |
| Cranial / oral | Mouth has real walls and a floor | Rim is razor-like and generic; globe margins emerge from featureless skin; dark branchial curves read as scratches. Add a short continuous lip and shallow oral bed; sculpt the branchial sulci directly into the cheek skin. |
| Rear oblique | Core carries into posterior | Thin appendage fields lack proximal mass and the pelvic/root transition still reads mechanical. |
| Ventral | Closed continuous underside | Uniform lower slab and pelvic pinching need improvement; dorsal/ventral full-length framing needs more margin. |

## Evidence boundary for the new forms

The body-plan constraints remain the same as in `DESIGN.md`:
[Südkamp 2021, pp.17–18, figures 18–19](https://www.bundenbach-fossilien.de/Literatur/2021_S%C3%BCdkamp_Ikonen.pdf)
supports the upward mouth, dorsal branchial exits, large pectorals, smaller
pelvics, finless tail and reduced pectoral mobility relative to modern ray-like
sharks. The surface account distinguishes trunk tubercles from weaker pectoral
ornament. [Johanson & Smith, fig.13](https://www.researchgate.net/figure/Gemuendina-stuertzi-Rhenanida-A-B-KGM-1983-306-C-KGM-1983-308-D-KGM-1983-307_fig7_7820947)
constrains later infragnathal/denticle work.

Neither fossil flattening nor the supplied art establishes living soft-tissue
thickness, exact lip shape, complete armour field boundaries or a detailed
orbital hood. Clay-02's broad cheek fields, low brow contours and tissue banks
are restrained sculpt interpretations of those regions, not asserted new
anatomical discoveries. No modern manta cephalic lobes, ventral mouth/gill rows,
sting or extreme pectoral flapping is introduced.

## Implemented clay-02 changes

The fresh sources are `sculpt_spec_02.py`, `build_clay_02.py` and
`render_clay_02.py`. Original clay-01 files and outputs are untouched.

1. Cranial form: broadly planar cheek/branchial fields grow from the true skin,
   with an open posterior brow contour, shallow socket depression, medial
   saddle and soft posterior cranial break. The cheek bed is larger in relief
   than clay-01's nearly invisible small bumps. No orbital torus or pad object.
2. Oral form: shorten the neutral upturned aperture from approximately
   0.856×0.228 units to 0.697×0.084, move its posterior rim anteriorly, and add
   short integrated lips and commissural tissue. The first three lining rings
   share the clay colour, so depth is shown by form before the interior darkens.
   The raised preoral profile and short chin replace the pointed flat apron.
3. Pectoral form: strengthen the swept proximal ridge and shallow adjacent
   hollow, add thicker lateral tissue, and vary camber along and across the
   margin. This is a modest resting contour compatible with restrained motion.
4. Posterior: reduce and soften the pelvic outline, remove the width-dependent
   contribution to axial thickness, and blend the tail cross-section to a round
   profile. Sampled centre thickness now decreases monotonically from 0.357
   at Y=0.8 to 0.196 at Y=2.2 through the pelvic region.
5. Branchial region: remove the two dark curve objects. Shallow tapered dorsal
   sulci and adjacent tissue banks are sculpted into the continuous skin.
6. Review framing: dorsal/ventral cameras centre at Y=1.05, orthographic scale
   7.8, to include the complete tail. Other fixed views and lighting remain
   unchanged for comparison. Eye landmark roughness is less mirror-like; body
   remains neutral untextured clay.

Mesh density was not increased: clay-02 has 89,098 vertices and 89,488 polygons,
slightly fewer than clay-01. New contours come from deliberate surface changes.
Static checks pass for finite coordinates, closed edge incidence and no unused
vertices. Bounds are X ±1.89993, Y −1.98…4.08, Z −0.17083…0.55158. AST parsing
passes for all three scripts. No Blender job or general eye audit was run by
the creative owner during this revision.

## Next visual gate

Terra executes the separately frozen clay-02 handoff. Astra first inspects four
actual fixed views: threequarter, front, side and dorsal. Add oral/ventral or
other closeups only if these merit advancing or reveal a specific unresolved
issue. No material or rig work precedes this sculpt gate. Reject if cheeks read
as added circular pads, if the short mouth becomes a ventral opening or loses
its cavity, if fin ridges resemble external struts, if the posterior still
pinches, or if the animal remains a featureless domed disk. Structural validity
alone cannot clear this gate. Keep preview status.
