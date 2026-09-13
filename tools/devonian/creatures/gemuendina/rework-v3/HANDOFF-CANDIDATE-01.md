# Gemuendina candidate-01 — frozen Terra execution

Creative owner: Astra high. Executor: Terra medium. Material-03 is accepted for
this local animated candidate only. Preserve all frozen sources and all earlier
outputs. No public overwrite, catalogue/status, runtime edits or Git mutations.

Input manifest SHA: `68206254ff31837a44e681ade4d687cb7ce397be7801f1ef6b85124d736cdcf0`.
Verify the manifest digest first, then every bound input. Approved material
blend SHA: `810031c3e18a2f9bc5ea820007a460aebdd7e8fdf7c96879ef398a16ab080ada`.
The manifest binds five executable/specification sources, that packed blend,
its report and the read-only original metadata. Root-owned review-playback-01.mjs
is deliberately excluded and must not be run by this handoff.

CWD: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.

## Group 1 — build rig, actions, full and LOD

```sh
shasum -a 256 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/gemuendina/rework-v3/frozen-candidate-01.sha256
shasum -a 256 -c /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/gemuendina/rework-v3/frozen-candidate-01.sha256
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/gemuendina/rework-v3/candidate_01.py
```

Fresh output only: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/gemuendina/rework-v3/candidate-01/`.
Expected: gemuendina-production-01.blend, gemuendina.glb,
gemuendina.lod1.glb, gemuendina.json, candidate-report.json.
Success marker: `GEMUENDINA_CANDIDATE_GROUP_OK`.
Budget 15 minutes; report progress before extending. CPU Cycles one-sample
vertex-colour bake, then rig/export. The accepted body vertex coordinates are
asserted unchanged. New denticles are separate attached geometry. Actual
mouth/eye clearance is not established by coordinate preservation.

## Group 2 — inspect actual exported structure

Only after Group 1 succeeds:

```sh
python3 -B /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/gemuendina/rework-v3/check_candidate_01.py
```

Expected: export-structural-review.json and `GEMUENDINA_EXPORT_STRUCTURE_PASS`.
Budget two minutes. Checks exact 18 full/3 LOD action sets and durations,
dynamic/finite channels, loops, stable root/no scale, finite meshes/normalized
weights, matching 28-bone hierarchy/inverse binds and three versioned anchor
parents, matching palette slots, full UV/white vertex multipliers, texture-free
LOD pigment, under 25 MiB per GLB, and LOD below 40% of full triangles.

## Group 3 — fresh portraits and targeted source poses

Only after Group 2 passes:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/gemuendina/rework-v3/render_candidate_01.py
```

Budget 15 minutes, CPU Cycles 32 samples. Expected four fresh portraits:
- gemuendina.select.png 1600×1200, transparent;
- gemuendina.card.png 800×600, transparent;
- gemuendina.thumb.png 256×192, transparent;
- gemuendina.png 1200×900, neutral background.

Four 1100×850 source-pose images:
- Swim-side.png, quarter phase: travelling tail and supple axial/fin transitions;
- Heavy-oral.png, 45% phase: lip opening, cavity/denticles, jaw/cheek continuity;
- TurnLeft-oblique.png, half phase: bank and asymmetric trim;
- Death-oblique.png, final phase: stable terminal shape without collapse.

Expected portrait-pose-manifest.json and `GEMUENDINA_PORTRAIT_GROUP_OK`.
These are source-blend pose images, not proof of actual GLB playback. Parent
reviews these before dispatching its separately frozen full/LOD runtime viewer,
18-clip capture, default-palette evidence and post-rework audits.

## Stop conditions / return

Stop on hash mismatch, existing output collision, Python/Blender/export error,
failed check, changed accepted base coordinates, or missing expected outputs.
Preserve the log and partial evidence; do not modify frozen scripts to pass,
delete the candidate, retry into it, or run public intake on old assets. Return
compact status, exact output hashes, elapsed time, and the four targeted poses
plus one representative portrait. Report any visible oral tearing, detached
geometry, tail pinching, excessively flapping fins or framed-out body parts.

Eye globes are already flagged for post-rework correction/containment review.
This local candidate, even after execution PASS, is not a final approved model.
See candidate-design-review-01.md for the acceptance limits and motion design.
