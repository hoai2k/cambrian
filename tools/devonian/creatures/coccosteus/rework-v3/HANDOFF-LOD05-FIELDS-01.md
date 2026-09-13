# Coccosteus LOD05 field isolation — frozen CPU2 handoff

Actual11-image review HOLD: review-candidate05-actual.md. Accepted full04/bake03/rig unchanged.
Pure actual export correspondence rules out position or pigment transfer corruption. Broad
wrinkles mostly disappear in neutral; likely point-sampled fine grain aliased into triangles.
Fin angular samples form chevrons because corresponding ray trajectories are not connected.
Six matched ablations below isolate pigment from geometry/custom normals before a bounded repair.

Frozen182 inputs: `frozen-lod05-fields-01.json`
SHA c14a5f9634bad5921e35a7856a40e62666829d5770a4ceeb8cfb9ee0c17be973.
Renderer `render_lod05_fields_01.py`
SHA 4973d97eb9ccc89ec6ce71b2f0ea04235f129370015a25c41a53b2067ccd2e7e.
Numeric source `diagnose_lod05_attributes_01.py`
SHA b5733d7226a94dad36d44af70759b1c70a300593b2d4f72aa3f63a7effe87054.
Actual numeric result `candidate-05/attribute-diagnostic-01.json`
SHA 25889cf48a2e958542106d206b4d1ebe2dc8ac58357db36825fff6953e316f50.

Parent-assigned CPU2 only;10-minute budget. No author Blender execution. Output exclusively
`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/diagnostic-lod05-fields-01`.

```sh
OPENBLAS_NUM_THREADS=2 OMP_NUM_THREADS=2 /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/render_lod05_fields_01.py
```

Expected exit0, `COCCOSTEUS_LOD05_FIELDS_01_COMPLETE`,6 PNGs and complete manifest:
- Full/LOD actual base-color signal routed directly to emission, fin-close and oblique (4).
- Full/LOD same neutral lit material, fin-close (2).

All meshes, actual custom normals, weights and clips remain untouched in memory. Only temporary
material output is switched, and no GLB/blend is written. CyclesCPU2/24samples, original1280x960
cameras/studio, imported NLA action+action_slot with no-action guard, frame0 before each import,
pose/frame reset and actual CLIPS duration check. Both original GLB hashes checked.

Stop on failure and preserve all outputs. Return all6 images for Astra/root interpretation:
if wrinkles and chevrons remain in emission but vanish under common neutral, repair pigment
sampling and feature correspondence. If neutral retains the artifacts, inspect local topology/
custom normals before recoloring. A separate four-vertex72.404deg normal discrepancy at the
ventral mouth rim is recorded in review; do not confuse it with the broad armor failure.

No art acceptance, count increase, global decimation, full rebake, public or Git action here.
