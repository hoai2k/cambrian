# Coccosteus LOD07 — bounded pigment/features correction

Astra source handoff; actual art HOLD. Six completed field ablations confirm pigment aliasing
and disconnected feature interpolation, documented in review-lod05-fields-actual.md. Preserve all
previous sources/attempts. Exclusive new output: ../devonian-authoring/coccosteus/rework-v3/candidate-07.
No author Blender/public/Git operation. Run only in root-assigned CPU2 slot.

Frozen-lod-07.json binds207 verified inputs. SHA256:
58a67b430259bd10a73e0079101318b6e83d81b8b827818b4744fbecc8247b56.

| New source | SHA256 |
|---|---|
| lod_common_07.py | 8ba998caae71c33f6642b771a991ba35e9be8a6811009b0803fcab1ce017e3a9 |
| lod_plan_07.py | 86ab4aa464a992bcde45cd710191be58097b85c4be31bbd7ae3b8547f0556665 |
| inspect_lod_plan_08.py | e3a7fe20bd595559680d0135994464548239ad8204558c28cce4945bfcd71e91 |
| build_lod_07.py | 11926e99e6d45b32b676ec802f3f565f29e7bdd16491f4e2bc628bad0150d57f |
| lip_basis_07.py | bead492cd282324f10bb7d9b999dfbad9f051d458d332cba244b7b87c81f133e |
| check_candidate_07.py | 77de7419cc444a566b26aae89b607fe12d0425a4bc16395636d97158c12455f6 |
| render_lod_07.py | 9713077c5e840be61ab166c3c4d08da5eee9c6eab732f7b2aaaf1ba79144dd4f |

The completed pure plan lives at:
`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/lod-plan-07/plan-report.json`
and `mesh-plan.npz`. Do not rerun or overwrite. Correct field reconstruction and exact mouth
check are in `plan-validation-08.json` and `field-plots-08`; the earlier field-plots are explicitly
marked invalid because their 2D rasterizer did not unfold the angular UV seam.
Static report: ../devonian-authoring/coccosteus/rework-v3/lod-07-static-report.json.

## Scope and evidence

- Accepted full GLB/bake03/production04 rig remain immutable. Full GLB and metadata copied exactly.
  All18 actions and three anchors remain. LOD remains vertex-color only, white base factor, no
  metallic/textures. Existing roughness policy unchanged. No full rebake or global decimation.
- Armor colors are49 positive atlas samples over a physical footprint; narrow across sutures and
  longer along accepted suture paths. Plate/ray/bar path identities guide actual triangle edges.
  Colors are sampled accepted atlas values, not newly painted or regenerated pigment.
-59,194 triangles,38.964% of full151,920, within unchanged40% gate. Only1.24% above05; feature
  placement/connectivity and filtering drive the repair. All positions are interpolated from the
  accepted dense surface; no arbitrary shape edits. Exact4,096 dense lip/commissure triangles and
  full eyes retained. Mouth position error0; weight max2.385e-8. All meshes manifold and weights/
  pigments valid. Interior surface deviation must remain<.010 model units; max actual pure probe
  .008973 caudal, armor .007307, posterior .002260. Fin feature matching is limited to A/32 angular
  shift; extreme root/crossing anchors are skipped to preserve shape, counted in plan report.
- Corrected2D field inspection shows coherent plate seams without broad grain wrinkles. Main
  posterior bars remain connected; small lower flecks still lose detail. No3D art approval yet.
  Scalar interior metrics alone are insufficient; actual six-view gate below is required.
- Build restores512 body ventral right-edge UV corners from folded .02 to accepted .98. This
  changes no geometry/color. At one protected ventral lip coordinate, all4 accepted full normals
  agree, while05 exported(0,1,0). lip_basis_07 copies only those4 exact full NORMAL/TANGENT rows;
  read-only actual05 fixture passes and proves all non-basis bytes unchanged. Actual07 checker
  verifies the same exact source basis. No broader normal smoothing or normal-map changes.

## Group1 — new LOD build (15-minute budget)

```sh
OPENBLAS_NUM_THREADS=2 OMP_NUM_THREADS=2 /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/build_lod_07.py
```

Expected exit0 and `COCCOSTEUS_LOD_07_COMPLETE`. Produces new LOD, exact copied full/metadata,
candidate-report.json (including strict pigment transfer, corrected UV count and local basis
repair evidence). No new production blend. Existing COLOR_0 correspondence gates remain.

## Group2 — actual structural/basis checks (5-minute budget)

Use the bundled Python below: the new exact basis checker uses NumPy.

```sh
OPENBLAS_NUM_THREADS=2 OMP_NUM_THREADS=2 /Users/hoai/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/check_candidate_07.py
```

Expected exit0 and `COCCOSTEUS_EXPORT_STRUCTURE_PASS`. Previous gates retained: all18 dynamic
clips, exact full/LOD sampled channel signatures, duration/recovery/Death hold, jaw/skull motion,
weights, strict pigment/palette, full/LOD identical skeleton/binds/anchors, exact full/metadata
copy and triangle budget. Adds exact4 lip basis rows from accepted full. No checker relaxation.

## Group3 — six new actual LOD comparisons (18-minute budget)

```sh
OPENBLAS_NUM_THREADS=2 OMP_NUM_THREADS=2 /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/render_lod_07.py
```

Expected exit0 and `COCCOSTEUS_LOD_07_MATCHED_COMPLETE`, six PNGs and complete
candidate-07/matched-evidence/manifest.json. Lit: side, oblique, fin close and Attack .32
(Cycles48). Emission: oblique and fin close (Cycles24). Every new image has a fullReference row
pointing to the existing immutable actual full render, matched clip/phase/camera/target/scale
and identical full GLB hash. No need to rerender unchanged full. NLA action_slot, no-action guard,
frame0 before import, pose/frame reset and CLIPS duration checks follow executed root06 renderer.

Return all6 new images plus their six full references, manifest and reports. Require quiet armor,
readable seams, coherent fin rays and transverse bars, and a protected lip no worse than full.
Small flecks and ray-root transitions remain specific art risks. Stop on any failure and preserve
new partial output/logs; do not edit frozen source, lower gates, or reuse candidate05 filenames.
Oral/eye/motion/playback/packaging/final integration remain separate unapproved gates.
