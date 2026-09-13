# Triassic approved-image / Tripo tests — 2026-09-13

Current human decisions are authoritative in canonical/manifest.json and canonical/review.md: 18 greenlit creatures, six requested replacements. Old `canonical: approved` placeholders without human greenlight do not authorize downstream generation.

## Priority
1. Nothosaurus giganteus and Shonisaurus popularis: canonical-derived `canonical/model-inputs/<id>/input.png` visually checked, full tail and four appendages. Nothosaurus corrected to expose far hind leg. These single images are intended for initial Tripo tests.
2. Other 16 greenlit creatures: canonical-derived modeling sheets and dedicated single inputs delivered. Preserve large Ceratites tentacles and Helicoprion lower jaw whorl.
3. Six candidate02 replacements await HUMAN review: Aphaneramma, Cymbospondylus, Odontochelys, Mystriosuchus, Rhaeticosaurus, Tanystropheus. Original canonicals and backups preserved. Sources/prompts/licenses in canonical/references and canonical/prompts.json. Do not generate models from replacements until greenlit.

## Tripo route
Use API wallet, not Studio. User supplied an API key privately; never commit it. API wallet showed 715 credits before tests. Studio is a separate limited account (20 model slots, export upgrade gate). An initial Studio Nothosaurus generation consumed 55 Studio credits and exists as task `56e8fe68-7a8c-4e4b-a635-54d580243eae`, but export was blocked. No GLB was downloaded from Studio. Do not duplicate that UI attempt or purchase a subscription.

API tests will be preserved as raw initial models, not final rigged game creatures. Do not mark shipped/clear preview badges before the complete asset contract is met. Preserve task IDs and downloaded source so cleanup/rigging can follow without regeneration.

## Modeling references
Four-view sheets are qualitative illustration guides, not measured orthographic blueprints. Root's Nothosaurus sheet retains a posed bend in its three-quarter panel; Shonisaurus top-tail perspective drifts. Use their verified single inputs for Tripo; the approved canonical remains the visual authority. Old untracked intake/triassic sheets predate approval and must not be reused or accidentally committed.

## API result
Both API jobs completed and downloaded (30 credits each; 60 total). Raw GLBs, task IDs, source hashes, Blender audits and renders are in `tools/triassic/creatures/<id>/tripo-raw/`. Nothosaurus 19,250 triangles; Shonisaurus 18,992. Follow-on cleanup/rig/anchor/animation work is explicitly pending there. No further generation needed to resume these tests.

## Active paired-rig work
User requested authored Tripo plus procedural volume-matched puppet for both tests, identical skeleton/anchors/action clips, realistic dynamic animal motion and game integration. Separate agents own each species; root owns shared registration. Raw tests are already on main at eb103ca. New inputs and six candidate02 options are in the review viewer; replacements remain unapproved.

## Paired rigs delivered (2026-09-13)
- Nothosaurus: authored 1,756,604 bytes, puppet/LOD 686,488 bytes, 27 identical joints, 21 identical clips, 3 identical anchors. Profile maximum envelope deviation 1.13% of body length.
- Shonisaurus: authored 4,387,380 bytes, puppet/LOD 586,100 bytes, 21 identical joints, 19 identical clips, 3 identical anchors. Profile maximum envelope deviation 0.884% of body length.
- Sources and reproducible Blender builders/audits are committed under `tools/triassic/creatures/<id>/`. Editable `.blend` and per-frame intermediates live in `local/triassic-authoring/<id>/` (not committed). Raw inputs remain in `tools/triassic/creatures/<id>/tripo-raw/`.
- Both authored files are registered for gameplay; each puppet is independently selectable in the Triassic specimen collection and also supplies LOD1. Models stay PREVIEW pending human visual review. Default runtime procedural undulation is disabled for these baked performers.
- All 18 greenlit modeling image sets and SIX candidate02 replacements were pushed to main at 9c0f086. Candidate decisions remain unchanged; use the reference viewer to greenlight them.
- Verification: exact decoded skeleton/inverse-bind/animation/anchor parity, finite normalized skinning, volume profiles, Blender multi-pose inspection, exported GLB playback, typecheck, build and Triassic tests. Future refinement may improve the original Tripo surface detail; do not call these human-finalized.

Runtime verification also confirmed Idle/Swim/Sprint selection and fallback using actual CreatureView loads of both GLBs. Sprint enters above 1.2× cruise and exits at 1.1× to avoid flicker; its authored cadence is preserved. Local specimen viewer successfully loaded all four full/puppet selections with 21 and 19 clips, preview badges and working playback.
