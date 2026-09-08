# Gemuendina candidate-02 — frozen correction and actual-mesh audit

Astra high creative owner; Terra medium executor. New output only, preserve all
candidate01/clay/material/public files. Details and distinct observed/pending
findings: `candidate-review-02.md`.

Manifest SHA: `46694693186ee4a95226d6cd9736951f9a7ef2165e2f8c4cf72d68d57bffaceb`. CWD `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.
Verify the manifest digest then every input:

```sh
shasum -a 256 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/gemuendina/rework-v3/frozen-candidate-02.sha256
shasum -a 256 -c /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/gemuendina/rework-v3/frozen-candidate-02.sha256
```

## 1. Canonical actual candidate01 baseline — 5 minute budget

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/gemuendina/rework-v3/audit_candidate_02.py -- candidate-01
```

Writes only `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/gemuendina/rework-v3/audit-candidate-01-02/`: audit.json and four central
cross-section SVGs. It records candidate01's actual bind full/LOD eye volume
and oral attachments; baseline is observational, not a candidate02 pass gate.
Success marker `GEMUENDINA_ACTUAL_EYE_ATTACHMENT_AUDIT_OK`.

## 2. Fresh correction, rig/export and structural checks — 15 + 2 minutes

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/gemuendina/rework-v3/candidate_02.py
python3 -B /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/gemuendina/rework-v3/check_candidate_02.py
```

Run the second command only after the first succeeds. All output under
`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/gemuendina/rework-v3/candidate-02/`: production-02 blend, full/LOD GLBs, local metadata,
candidate-report.json, export-structural-review.json. Markers:
`GEMUENDINA_CANDIDATE_02_GROUP_OK`, `GEMUENDINA_EXPORT_STRUCTURE_PASS`.
Accepted material03 is bound. Body changes are restricted to the orbital field;
full colour maps, anatomical rig and all exact action names are retained.
Filtered dense pigment feeds the reduced export. Full/LOD skeleton, inverse
bind matrices, nested anchors, palette inputs and action checks must pass.

## 3. Actual visual evidence — 15 minute budget

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/gemuendina/rework-v3/render_candidate_02.py
```

Writes a fresh four-portrait family, the four comparable selected action poses,
three new Orbit-oblique/dorsal/front closeups, and actual imported-export
LOD-oblique.png plus LOD-neutral-geometry.png. Thirteen images total, manifest
portrait-pose-manifest.json; `GEMUENDINA_PORTRAIT_02_GROUP_OK`.
Return orbital/Heavy/LOD images and representative portrait to root/Astra now.
The neutral LOD view tests geometry independently of pigment. Root owns actual
game-palette/playback review and its scripts; do not edit or run them here.

## 4. Candidate02 quantitative eye/attachment extrema — 20 minute budget

After root/Astra sees the correction views and permits advancing the evidence
batch, use the same frozen audit source:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/gemuendina/rework-v3/audit_candidate_02.py -- candidate-02
```

Writes `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/gemuendina/rework-v3/audit-candidate-02-02/` audit.json plus four central SVGs.
Actual full/LOD bind and selected extrema from every available action are
measured. Conservative eye-volume lower bounds must all exceed 65%; report
minimum50 and target65 separately. Body/globe closure requires no caps. Oral
contact distances and anchor/tissue votes are recorded for human judgment.
The JSON checkpoints after every measured pose. Report progress before budget
extension; do not lower sample counts or change thresholds. Marker:
`GEMUENDINA_ACTUAL_EYE_ATTACHMENT_AUDIT_OK`.

## Stop conditions

Stop and preserve logs/partial output on hash mismatch, output collision, error,
missing output, changed source outside the specified orbital field, failed
structural check, or candidate02 audit target/contact failure. Do not edit
frozen code to pass, replace candidate01, delete evidence or retry into existing
output. Return hashes, elapsed time and status. No heavy Blender execution was
performed by Astra; static AST and bounded pure-field checks passed. Candidate02
is not yet rendered or measured, and no final/public approval is claimed.
