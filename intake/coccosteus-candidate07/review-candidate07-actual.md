# Candidate07 actual surface review — 2026-09-08

**PASS for the bounded full/LOD surface gate. Final creature acceptance remains pending.** Independently inspected all six new LOD renders and all six full references at native 1280×960. All 12 image hashes, both export hashes and all 207 frozen inputs verified. The complete matched manifest is `3084d54004baa4c46f160beafb6c0604809d900d23de2b75154e3eb3389020ca`.

The correction resolves the defects that blocked LOD05: broad false armor wrinkles disappear, major sutures read as connected anatomical plates, posterior bars remain transverse, and the fin rays form a coherent fan. Emission views confirm the pigment correction itself. The unchanged full remains accepted. This verdict concerns actual exported images, not planner error metrics.

| Actual matched pair | Observation |
|---|---|
| Idle-side | Quiet armor replaces false grain wrinkles; primary seams read. Main posterior bars remain transverse and connected. First bars near armor transition are softer. LOD is smoother and glossier than full. |
| Idle-oblique | Cranial/thoracic plate network is readable, without prior broad false folds. Main bars and fan rays carry through the whole-creature view. Some seam junction tips are angular or softened. |
| Fin-close | Central/distal paired-fin rays connect coherently; root/leading region retains a few short bends and peripheral stepped edges. Full-body read is coherent. |
| Attack | Open lip silhouette remains coherent; no new long rim slit is apparent. Tiny dark commissure dots persist in the full reference too. Local upper cranial crease highlight and internal oral surfaces need the separate oral/temporal audit. |
| albedo-emission-oblique | Emission confirms broad false wrinkles are removed in pigment itself, with readable continuous plate seams and connected major bars. This is actual exported appearance, not planner inference. |
| albedo-emission-finclose | Main rays/bars connect. Minor lower-flank flecks stretch into longer diagonal dashes and bar tips simplify into sharper shapes. Accepted only as reduced minor detail at intended LOD distances; do not claim pixel matching. |

The quieter, slightly glossier LOD and loss of minor fleck/ray detail are accepted for intended LOD viewing. This is not full-resolution parity. A later runtime switching check must confirm the transition at actual game distances. No additional global density increase, full rebake or long LOD iteration is justified for this surface gate.

Full: `b7b929b9978f51f89e0cb1e687dec10d95b90edd3e2b2ba27b12432f58474655`, 22,931,780 bytes. LOD: `eec740e92fcf2187c54eacb2418fc7335cd584fe57b2792e64e8e4f1bbd31756`, 3,236,312 bytes, 59,194 triangles. Structural execution passed all 18 clips in both exports, matching skeleton/anchors, normalized weights, stable root and raw size gates. These checks do not establish temporal art quality.

The four original candidate04 full portraits can be reused if the full export stays byte-identical, which is verified here. Their current hashes and all inspected evidence are in `../devonian-authoring/coccosteus/rework-v3/candidate-07-actual-review.json`. No new portrait render or full export is needed solely for this LOD change.

Stop at this checkpoint for the requested pause. Remaining validation and the smallest finishing sequence are recorded in HANDOFF-CANDIDATE07-PAUSE.md. No Blender, heavy job, public asset or Git action was performed by this review.
