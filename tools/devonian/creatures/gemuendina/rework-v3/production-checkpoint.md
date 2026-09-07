# Gemuendina current production checkpoint — 2026-09-07T22:39:03+00:00

**Ready now:** `HANDOFF-CANDIDATE-01.md`, manifest SHA
`68206254ff31837a44e681ade4d687cb7ce397be7801f1ef6b85124d736cdcf0`. Terra runs build → structural checks → portraits/targeted poses.
No candidate Blender execution has been performed by Astra.

Material-03's actual oblique/cranial views were independently reviewed and
accepted by parent and Astra for this animated local candidate. Packed blend
SHA `810031c3e18a2f9bc5ea820007a460aebdd7e8fdf7c96879ef398a16ab080ada`.
`candidate-design-review-01.md` records the precise decision and motion design.
Candidate builder now binds this approved hash and the original metadata hash.

Frozen sources: candidate_01.py, rig_actions_01.py, sculpt_spec_02.py,
check_candidate_01.py, render_candidate_01.py. Do not edit after this freeze.
All output is local under `../devonian-authoring/gemuendina/rework-v3/candidate-01/`.
Full exact 18 actions; LOD Idle/Swim/Death; matching 28-bone skeleton and three
nested anchors. White full vertex multipliers and textured UV pigment;
texture-free LOD linear pigment with matching body/eyes/accent palette slots.

Next gate is actual source-pose and exported GLB/palette playback review.
Parent owns review-playback-01.mjs; it is untouched and excluded from this
manifest. Existing eye-bead appearance remains unresolved and needs completed
rework correction/audit. Final approval/public replacement remains pending.
All clay01/02 and material01/02/03 evidence and public V2 are preserved.
