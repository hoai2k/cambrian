# Actual candidate02 review — hold

Owner: Astra high. Independently viewed every actual local PNG listed below, compared with the
previously reviewed seven accepted material04 views and user's Coccosteus.jpg reconstruction.
All 23 rendered file hashes independently match complete actual portrait/pose manifests.
Execution and structural pass do not establish appearance acceptance. Verdict: HOLD.

| Actual images | Observations |
| --- | --- |
| coccosteus.png, coccosteus.select.png | Framing and overall anatomy hold; white thoracic seam tile newly visible; posterior surface looks more striated than material04. |
| coccosteus.card.png, coccosteus.thumb.png | Overall silhouette/color legible at small sizes; reduced scale hides some defects and is not grounds to waive them. |
| Idle-side | Rest anatomy holds; posterior normal/marking response looks harsher. |
| Idle-front, Idle-dorsal, Idle-oblique | New white/brown face-shaped tiles along cranial/thoracic sutures. Front and dorsal establish failure independent of portrait angle. |
| Armour-close | Pale rectangular seam tile and small brown tiles; accepted plate hierarchy still readable beneath export shading defect. |
| Heavy-gape-oblique, Eat-oral, Bite-closing | Meaningful jaw/skull motion with continuous lining; tiny red comb/black corner pixels and polygonal lip transitions need reassessment after atlas repair. New suture tiles persist. |
| Swim-side, TurnLeft-oblique, Dodge-oblique, Death-oblique | Distinct articulated movement, attached fins and held death visible. Material defect persists across posed views. |
| Orbit-front, Orbit-side | Front clearly exposes white quadrilateral flares and brown wedges. Side iris/pupil detail reads; seam artifacts still present. |
| LOD-oblique, LOD-Swim | Basic anatomy/pigment retained, but posterior bars and fin rays substantially weakened; uniform roughness reduces accepted finish fidelity. Not accepted. |
| LOD-Attack, LOD-Eat | Both meaningful jaw actions retained; continuous oral center, jagged pale lip edge and small dark corner need later close audit. |
| LOD-neutral | No corresponding glaring seam flares; underlying anatomy remains coherent. This points toward shading as first diagnostic target but does not prove cause. |

Read-only actual-GLB analysis (inspect_atlas_01.py) also inspected embedded images, UVs, normals,
tangents and material records. Actual roughness texture green channel has 404 triangle centroids
below .2 across the three body roles: 152 exterior, 227 oral, 25 underside. Some are exactly zero.
Median exterior UV triangle area is .616 pixels at roughness1024; the atlas wastes considerable
area and tiny isolated islands are present. Accepted shader exterior roughness ranges roughly
.46–.79 and does not intentionally contain mirror-polished seam tiles. No white albedo values
were found (body centroid maximum <=.553). Exterior normal blue >=.980 at sampled centroids,
but 13 oral triangles have substantially tilted normal pixels; oral issues may be separate.
Unit exported vertex normals and approximately orthogonal tangents rule out a gross invalid-vector
failure. Nearest-centroid tests are diagnostic probes, not exhaustive raster coverage guarantees.

Likely failure: undersampled atlas islands leave roughness gaps and possibly albedo/normal edge
contamination. Exact per-image causal attribution remains pending. Do not clamp pixels, erase
normal detail, flatten all production roughness or remodel anatomy based only on this inference.
Frozen CPU2 diagnostic compares actual export original/no-normal/fixed-rough/both/emission at two
close cameras, plus accepted material and baked-before-export front views. See
HANDOFF-DIAGNOSTIC-SHADING-01.md. All candidate01/02 and bake01 files remain unchanged.
