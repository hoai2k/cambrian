# Bothriolepis V3 — M03 HOLD, bounded M04 execution handoff

Owner: Astra high. Executor: Terra medium. Frozen source study; **not visual approval**.

## Evidence and diagnosis

Independently inspected the actual user reference, all eight M03 views, the primary-source anatomy brief and root M03 review. M03's broad raised armor, narrow flexible posterior, and outward/back bowed two-segment pectorals remain useful. Preserve their proportions and outline. The finish is too uniformly pale, the forehead has a median shading divide, and the mouth exposes a rectangular four-sided transition around its small oval aperture.

The rectangular oral surround has both geometric and shading causes. Four linear annulus rows joined a rectangular removed patch to the oval. At its sides, the outer patch is only about .02 units beyond the lip; simply smoothing inside it leaves a slope change at the construction boundary. M03 also gave this exterior a flat vertex-color material while the neighboring shield had an atlas normal/roughness response.

The remaining cephalic divide includes a mirrored height-field derivative. Six roof probes away from the authored transverse margin give M03 a maximum opposing derivative jump of .3060123155. The prior geometric cusp cancellation also faded out before the anterior rostrum. This is separate from the intentionally retained posterior thoracic crest.

M03's ten frozen inputs and every member of its output inventory were reverified. Actual M03 blend SHA-256: `6521d66e5ed42a8706dbfe6329db230bad75cbed43694ac57d85e782c6b2d751`. Output inventory SHA-256: `6601fd8dd8a0c6cd6faa397a6760ccc9517abde3ad446d72acd093b79fc9ad25`.

## M04 authored change

- A single smooth elliptic lip field continues through the annulus and 108 surrounding ventral shield vertices. Its outer value and slope fade to zero independently of the rectangular topology. Exactly 324 non-aperture annulus vertices change. The aperture and all cavity/throat vertices remain fixed. Maximum annulus displacement .0127275793; neighboring shield displacement .0164404159 units.
- The exterior oral annulus gets an inverse-section anatomical UV chart and the **same shield basecolor, normal and roughness**. There is no flat rectangular shader region. The true inner aperture still transitions to oral mucosa.
- Finish the bounded cephalic transverse tangent correction toward the rostrum, max .004304126 units, with the existing posterior fade. The thoracic crest stays. Continuous circumferential pigment and C1 roof/floor ornament avoid a mirrored normal-map cusp.
- Richer umber/ochre bone with subdued olive flanks, interrupted growth ornament and fine rounded irregular tubercles; stronger roughness/normal differentiation. Original ImageGen dermal source remains a small detail input. No random new cracks or mosaic plates. The original fourteen authored suture paths are retained exactly.
- A single additional physical plate-relief field, gated below .009 units, strengthens rounded bone edges while protecting the eyes, oral region, pectoral roots and posterior transition. Pectoral ornament remains dermal armor, never membrane rays. Posterior/dorsal remain scaleless and rayless.

Topology, semantic groups, pectoral/root geometry, posterior geometry, aperture and interior geometry, eye meshes/transforms and original oral-study motion are explicitly preserved. Five actual loaded-mesh oral poses are checked during execution. Shape-key subtraction may differ only by float32 roundoff below 1.3e-7.

**Production state clarification:** this V3 study has no production rig, 18-action library, GLB or LOD yet. It contains the oral study key and anatomical vertex groups. After the art gate, the required dynamic eighteen actions, correctly parented anchors, meaningful full/LOD motion, palette/PBR retention, portraits and final actual eye audit must be authored and checked. No old-model audit transfers to this mesh.

## Source-only validation already completed

`source-check-material04-02.json` is the current report; `-01` and the first UV preview preserve the earlier source iteration. The first UV preview made the growth ornament too ring-like; the final source breaks it into quieter interrupted marks. The final UV preview was inspected, but it is not a rendered-model approval.

- 55,802 vertices / 56,104 faces / 111,600 triangles; one connected closed surface, every edge used twice, Euler characteristic 2. Five oral study poses pass; appendage root minimum quad triangle normal dot remains .7886552910.
- The 108 old mouth-boundary edges: median face-normal difference 14.5050057° → 2.6931563°; p90 32.0620775° → 9.4153262°; maximum 46.6707063° → 20.6713964°. These are source geometry measurements, not proof of final shading or self-intersection absence.
- Finite physical pigment/roughness fields and explicit linear/sRGB roundtrip checks pass. Current exact ranges and six dorsal derivative measurements are in the final report. The source preview omits original swatch detail; execution uses it.
- AST checks pass. No Blender was run by the author. New loaded-mesh plate relief and nine actual rendered images remain unexecuted.

## Frozen execution

CWD: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`

```sh
/usr/bin/python3 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/bothriolepis/rework-v3/execute_material04.py --run-frozen-material04
```

The executor verifies `frozen-inputs-material04.json` before and after execution, refuses an existing material04 directory, and invokes Blender CPU **2 threads**, 32 samples, 1100×880. Root schedules it around the other creature work. One packed blend, nine maps, nine actual images, source-check and output inventory are expected only under:

`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/bothriolepis/rework-v3/material04/`

Views: front, side, dorsal, oblique, underside, open mouth, mouth-depth oblique, armor detail, and new symmetric forehead continuity close-up. Lighting remains the M03 comparison rig. The saved editable blend has neutral oral shape.

Stop on any input mismatch, existing directory, geometry/pigment failure, Blender error or missing output inventory. Preserve all partial evidence. No retry, altered threshold, new directory, rig/export phase, public write or Git action is authorized by this handoff.

## Actual art gate

Inspect all nine output images against M03 and the preserved user reference. The bulky bony front and long curved appendages must remain; armor should read as living textured bone with readable authored plates, not pale rubber, tree rings or random cobblestone. The cephalic median divide must be gone without removing the thoracic crest. The mouth should have a continuous small ventral lip and recess without a rectangular platform or new hard crease. Keep HOLD if these are not visibly resolved. Only then advance to bespoke production rig/action authoring.
