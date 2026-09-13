# Walliserops initial-preview handoff — 2026-09-07

## Ownership and status

Initial preview candidate; parent owns publication, packaging, viewer integration and git. Only this source folder and ../devonian-authoring/walliserops were edited. No prior Walliserops public asset existed at intake. Eldredgeops and all earlier creatures remain frozen (Eldredgeops LOD Swim compatibility fix separately delivered).

Final model geometry is frozen. Final actual-export basic review images and source evidence are in v2/review-export-full and v2/review-export-lod; contact sheets v2/preview-review.jpg and v2/sequence-review.jpg. Original packed Blender v2/walliserops-v2.blend, source snapshot v2/source. Candidate-only files v2/candidate. Do not overwrite after parent packaging without coordination.

## Delivered geometry and rig

- Full 516,414 triangles, 37,985,340 bytes raw. SHA256 `672d7d09cb75c3ca614162719d3b0d5f08780bd4aa00e512653f50a2ff2aae08`.
- LOD 176,873 triangles (34.25%), 11,046,304 bytes raw. SHA256 `ddb9e6f41dfa1a4fe0e54e8c8bc4e82c0c0b825d9730a01bde3930bdd4d2212d`.
- Exact matching 313-bone graph. Twenty full actions; four LOD Idle/Swim/Crawl/Death. Three nested v1 anchors; mouth/inside under cephalon, contact at trident. Root stable, normalized weights, no scale tracks, finite and distinct animations, seamless designated loops. See validation.json/skeleton-graph.json.
- Four matching PNG portraits, metadata preview status, source Blender, original imagegen/PBR maps and executable builder. Full white COLOR_0 + UV textures; LOD texture-free linear pigment. Raw size exceeds 25 MB; parent owns lossless compression.

## Distinct anatomy / verification

W. trifurcatus primary figures 1–3 directly inspected (Gishlick & Fortey 2023, UA13447/HMNS PI1810). Long raised keeled spatulate trident with slightly asymmetric branching; fixed to cephalon. Long genal spines, 11 rigid thoracic plates, axial/pleural spines and five paired plus terminal pygidial processes. Comparative underside/eye utility explicitly reused from our original Eldredgeops source; special_anatomy.py and head reshaping create separate Walliserops form. There is no fake trident or fish jaw joint.

Actual exported full anatomy, eye and ventral oral area, selected locomotion/contact/feeding/defensive poses reviewed, plus 14 sequential Heavy/Ability/Crawl frames. Actual reduced Idle/Crawl/Swim/Death and eyes reviewed. Sequential frames show braced trident contact pitching and recovery with rigid attachment. No claim of exhaustive transition/collision review.

Every one of 164 actual exported closed lens solids passes independently. Full weakest 73.674%, conservative 95% lower 72.390%; LOD weakest 73.653%, lower 72.368%. Both underlying ocular organs 100% inside continuous closed cephalon. No ornamental rim counted. Hash-bound eye-evidence.json and v2/audit-full, v2/audit-lod reports.

## Explicit preview limitations

Further sculpting of spine/trident roots, subtle surface/pigment balance, precise spine arrangement/specimen overlay and complete appendage/spine contact clearance remain refinement work. Primary study knows no enrolled Walliserops specimen, so Ability is modest stance/contact display, not claimed exact closed enrollment. Living colours,82-lens/17-file array and soft-part specifics are illustrative comparative reconstruction. Mouth is a lined ventral arthropod feeding recess with gnathobase/oral-pump motion. Growth does not scale; Moult has no detached shell. Shell 5.5 cm is illustrative, not species maximum.

## Reproduction

README.md has exact commands. Build through build.py (sets WAL_PBR=1/WAL_EXPORT=1), then validate.py, export_audit.mjs, Blender audit.py, render.py WAL_IMPORT=full/lod WAL_RENDER=preview/lod/portrait/sequence, finish.py. Blender executable /Applications/Blender.app/Contents/MacOS/Blender, --background --threads 2; host requires escalation to avoid sandbox Metal crash.

Final completion markers: /tmp/walliserops-final-export.log, /tmp/walliserops-final-eyes.log, /tmp/walliserops-final-preview.log, /tmp/walliserops-final-lod.log, /tmp/walliserops-final-portrait.log, /tmp/walliserops-final-dorsal.log, /tmp/walliserops-final-sequence.log. Historical first-pass views/logs do not supersede final review. All hashes/portrait metadata are in delivery.json.

All final render and eye-audit completion markers confirmed. Frozen initial preview ready for parent integration.
