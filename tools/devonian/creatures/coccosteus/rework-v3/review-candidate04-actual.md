# Candidate04 actual art review — HOLD for LOD finish

Owner Astra high. Independently viewed all four actual portraits and19 actual pose/LOD images at
adequate scale. All23 hashes match complete image manifests. Compared against previously inspected
candidate02 and accepted material04. Execution, all18/all18 clips and atlas gates pass, but they do
not override the remaining LOD appearance failure.

**Bounded full-resolution surface gate: PASS. Overall candidate: HOLD.** The prior white/brown
cranial/thoracic seam tiles are gone. Accepted anatomical plate hierarchy, restrained dermal grain,
living roughness and clear posterior bars/fin rays survive the actual full export. Do not rebake or
remodel this full surface merely to correct the reduced model. Final oral, eye and motion audits
remain pending; no public/final acceptance is given.

| Actual images inspected | Concrete verdict |
| --- | --- |
| coccosteus.png, coccosteus.select.png | Clean armor seams; restrained ochre grain, posterior blue-gray bars and fin rays retained. Framing and silhouette coherent. |
| coccosteus.card.png, coccosteus.thumb.png | Animal reads at card/thumb scale; distinct head armor and contrasting posterior remain visible. |
| Idle-side, Idle-front, Idle-dorsal, Idle-oblique | No prior seam tiles. Body, paired fins and caudal proportions retained. Closed oral border no longer shows the former red comb. |
| Armour-close | Clean suture intersections; subordinate fine pigment survives. Eye reads with dark pupil/olive iris. |
| Heavy-gape-oblique, Eat-oral, Bite-closing | Meaningful jaw/skull articulation and continuous oral lining; no large crossing sheet. Tiny paired dark commissure dots remain visible in Eat, one in Heavy. Their cause is unresolved and belongs in the later oral audit. |
| Swim-side, TurnLeft-oblique, Dodge-oblique, Death-oblique | Distinct axial bend/bank/held-death poses with attached fins; no renewed surface tiles. Still images do not establish temporal motion quality. |
| Orbit-front, Orbit-side | Prior glaring cranial tiles absent. Pupil/iris and eye surround legible; final eye placement/occlusion across motion remains pending. |
| LOD-oblique, LOD-Swim | HOLD: posterior transverse bars are smeared longitudinally; fin rays become sparse disconnected blotches. Armor pigment is broad and patchy and suture edges are irregular. The full-to-LOD change is conspicuous at these matched comparison sizes. |
| LOD-Attack, LOD-Eat | Required mouth actions remain meaningful, but coarse pale lip transitions and dark commissure slits remain. Large pale/dark armor patches further expose the reduced pigment interpolation. |
| LOD-neutral | Basic reduced shape remains coherent without material. This supports targeting LOD sampling/topology rather than changing accepted full anatomy, although minor lip/plate reduction error is visible. |

Read-only actual-GLB measurement supports a specific reduction problem. For body triangles whose
rest center lies posterior of authoring y=.30, full triangle axial span is uniformly about.017936.
LOD posterior spans: median.077077,90th percentile.180967,99th.254278,max.310194.222 of4111 LOD
posterior triangles span more than.20 authoring units; none of29312 full posterior triangles do.
Long triangles interpolate a few vertex colors across multiple narrow marking features. This is
a supported explanation for smearing, not a proof that it accounts for every LOD pixel defect.

The previous broad-filter removal and higher45% fin retention did not solve marking preservation.
Do not repeat blind ratio increases or weaken color/atlas gates. Freeze the successful full GLB,
bake03, all motion/anchors and current evidence. Tomorrow's bounded source correction should
replace geometry-only LOD reduction with topology/marking-aware sampling, preserving enough axial
stations for transverse bars and structured fin samples for rays. Details are in
HANDOFF-CANDIDATE04-HOLD.md. No new heavy execution or correction source is started today.
