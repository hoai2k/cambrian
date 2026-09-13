# Candidate06 — measured oral defect, unresolved parity, texture budget

Final art remains HOLD. The frozen 221-input validation manifest was independently reverified after root's V1/P1/V2 execution. All old sources, failed audit and exact packaged outputs remain preserved. No Blender work was run by Astra.

## Mouth: actual local inversion

V1 is a successful measurement, not a mouth PASS. Full Bite/Eat have 340/340 oral-first rays. Full Ability has 80 underside-first and 260 oral-first; LOD Ability has 94 underside-first and 246 oral-first. The pale patches are actual underside material triangles occluding the lining.

Both full Ability sagittal sections have two strict interior underside/oral segment crossings; both LOD sections also have two. Bite/Eat sections have zero. These counts were calculated from the saved numerical section SVG segments (0.001 plotting-unit rounding), so a future acceptance check should use unrounded triangles. Together with actual opposing triangle normals and near reversal depths, this is adequate evidence of local tissue inversion, rather than a color-only defect.

46 full rays have an underside hit followed immediately by oral lining within 0.01 model units; depth reversal is 0.0000777245–0.0021276474. Larger separations elsewhere in the ray grid are different branches of the folded floor and must not be reported as penetration depth. At pixel (937,550), underside triangle76288 lies at depth2.45066118, before oral triangle119554 at2.45058346. Their normals face opposite ways.

Decoded actual bind corner weights explain why sharing parameter names did not guarantee thickness preservation: this underside triangle has jaw weights0.563–0.614, body0.233–0.248, floor0.153–0.189; the adjacent crossing oral triangle has jaw0.799–0.838, body0.128–0.152, floor0.033–0.049. The two layers meet spatially after their different points along the cage's steep jaw/body transition fold. `head_weights(t,a)` is shared, but the lining's inset geometry means local nearest surfaces have different t. Ability opens24 degrees, versus17/18 for clear Eat/Bite.

Bounded corrective design for the next authored candidate: preserve the24-degree filter-feeding gape and accepted rest shape, and rebuild only lower-floor deformation across the jaw/body transition. Use a common physical section coordinate for the paired layers and a broader smooth jaw-to-floor transition, so local tissue thickness is transported coherently. Test the full maximum-gape sweep and exact paired sections before another full export/render run. Do not paint the underside pink, inflate the floor blindly, globally smooth the head, shrink the action to hide the defect, or change all18 clip contracts. Exact new weights are not frozen here: the eye failure may reveal another local surface issue, so this handoff first gathers that bounded evidence.

## Eye: no containment verdict yet

The failed audit's saved first record is full Bind, with valid edge topology, zero nonmanifold edges and **zero boundary caps**. Failure occurs in body parity while classifying accepted actual left-eye volume samples. Thus a distant-cap clearance cannot explain or certify this failure. Closed edge topology alone does not exclude self-intersections or numerical repeated hits.

The canonical routine allows64 intersections and advances2e-6 after each hit. The next diagnostic reproduces the same full Bind left-eye seed719061 and120000 bounding-box candidates. At its first exception, it records every ray origin/hit/triangle, global progression, and all unique triangle IDs. An independent float64 direct all-triangle ray intersection calculation at three barycentric tolerances, plus the reverse ray, distinguishes repeated BVH hits from many genuine surface crossings. Actual arrays and the eye/head section are preserved. No maximum is raised and no containment classification is substituted. Eye minimum50/target65 and final visual orbital review remain unchanged.

## Packaging: exact equality passed; working size budget missed

P1 preserved exact decoded geometry, oriented triangles, materials/images, transforms, skins, anchors and all18 animations in full and LOD. Full36,046,104 bytes; LOD2,343,984 bytes. The25MiB value is a working delivery budget, not a user-permission gate.

| Actual full payload | Raw bytes | Lossless meshopt bytes |
| --- | ---: | ---: |
| 18 embedded PNG images | 30,324,633 | 30,324,633 |
| Geometry accessor payload | 12,561,924 | 5,288,894 |
| Animation accessor payload | 297,236 | 204,421 |
| All other content and padding | 225,615 | 228,156 |
| Total | 43,409,408 | 36,046,104 |

Image bytes alone exceed25MiB. Body normal4096² is11,792,939 bytes, body albedo4096²7,133,674; pectoral normal2048²3,473,332 and albedo1,897,391. All images are already RGB, so removing an opaque alpha channel offers nothing. Exact dimensions/extrema and payload measurements are in candidate06-measured-diagnosis-02.json.

After art is resolved: first study lossless PNG recompression with exact decoded RGB equality and unchanged dimensions/sampling, or a supported lossless image codec after checking the existing runtime loader. Keep original PNGs locally. Expect no guaranteed25MiB result: current package needs9,831,704 bytes reduction. If lossless texture storage is insufficient, author a separately reviewed texture-only study: keep body albedo4096 and fin ray detail, test normal4096→2048 with vector renormalization and/or a high-quality normal-safe texture codec. This is lossy and requires actual close orbital/armor/fin comparison plus runtime palette/PBR checks; it is not authorized as an automatic fallback. Keep geometry/weights and all18/18 actions exact. No geometry simplification or clip stripping proposed.

Raw and packaged candidates remain local previews. No packaging rerun, model rebuild or public integration is part of the next diagnostic.
