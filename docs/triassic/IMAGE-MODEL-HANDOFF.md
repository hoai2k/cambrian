# Triassic approved-image / Tripo tests — 2026-09-13

Current human decisions are authoritative in canonical/manifest.json and canonical/review.md: 18 greenlit creatures, three requested replacements. Old `canonical: approved` placeholders without human greenlight do not authorize downstream generation.

## Priority
1. Nothosaurus giganteus and Shonisaurus popularis: canonical-derived `canonical/model-inputs/<id>/input.png` visually checked, full tail and four appendages. Nothosaurus corrected to expose far hind leg. These single images are intended for initial Tripo tests.
2. Other 16 greenlit creatures: canonical-derived modeling sheets in progress. Preserve large Ceratites tentacles and Helicoprion lower jaw whorl.
3. Three candidate02 replacements await HUMAN review: Aphaneramma, Cymbospondylus, Odontochelys. Original canonicals and backups preserved. Sources/prompts/licenses in canonical/references and canonical/prompts.json. Do not generate models from replacements until greenlit.

## Tripo route
Use API wallet, not Studio. User supplied an API key privately; never commit it. API wallet showed 715 credits before tests. Studio is a separate limited account (20 model slots, export upgrade gate). An initial Studio Nothosaurus generation consumed 55 Studio credits and exists as task `56e8fe68-7a8c-4e4b-a635-54d580243eae`, but export was blocked. No GLB was downloaded from Studio. Do not duplicate that UI attempt or purchase a subscription.

API tests will be preserved as raw initial models, not final rigged game creatures. Do not mark shipped/clear preview badges before the complete asset contract is met. Preserve task IDs and downloaded source so cleanup/rigging can follow without regeneration.

## Modeling references
Four-view sheets are qualitative illustration guides, not measured orthographic blueprints. Root's Nothosaurus sheet retains a posed bend in its three-quarter panel; Shonisaurus top-tail perspective drifts. Use their verified single inputs for Tripo; the approved canonical remains the visual authority. Old untracked intake/triassic sheets predate approval and must not be reused or accidentally committed.

## API result
Both API jobs completed and downloaded (30 credits each; 60 total). Raw GLBs, task IDs, source hashes, Blender audits and renders are in `intake/triassic-tests/`. Nothosaurus 19,250 triangles; Shonisaurus 18,992. Follow-on cleanup/rig/anchor/animation work is explicitly pending there. No further generation needed to resume these tests.
