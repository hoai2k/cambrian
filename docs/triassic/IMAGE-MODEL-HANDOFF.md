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

## Nothosaurus paired-rowing correction (2026-09-13)

`Swim` and `Sprint` now use one bilateral forelimb row per clip: a roughly 68% broadside power
sweep followed by a 32% feathered recovery. The hind limbs follow at reduced travel while the
existing travelling tail wave is unchanged. Exported-bone sampling puts both fore paddles at the
same rear phase (0.683 in `Swim`, 0.667 in `Sprint`) and reduces skull lateral travel from
0.100/0.145 units to 0.006/0.009. The temporary renderer-side `steadyHead` correction has been
removed because the motion now lives in the source clips.

Both packaged bodies retain the same 27-joint rig, three anchors and 21 exactly matching clips.
`paired-audit.json` now asserts the locomotion measurements as well as paired playback; the new
`paired-gait-sheet.jpg` shows all power/recovery phases from above for both bodies. The models
remain previews pending human approval of the generated body itself.

## Mouth and material correction checkpoint (2026-09-13)
- Shonisaurus authored and procedural bind geometry now closes the mouth. Only Bite, Attack, Heavy and Eat open it; all other clips, including Ability and Death, keep it shut. Exact 21-joint/19-clip/anchor parity remains. Closure probes exclude internal oral fillers and find no open rays in either rostrum. Evidence: `tools/triassic/creatures/shonisaurus/closed-mouth-review.jpg` and `mouth-closure-validation.json`. A tiny internal oral-web edge still stretches at maximum Heavy; no external tearing was observed. Models remain previews.
- Nothosaurus preserves the original albedo texture, uses white vertex pigment on the authored skin to avoid multiplying colour twice, and reduces excessive normal-map relief to 0.15 with nonmetallic roughness 0.7. The source grey-white streaks remain: controlled original/processed comparisons and UV checks establish they came from Tripo. Meshes, weights, rigs and all 21 clips are unchanged. Evidence: `tools/triassic/creatures/nothosaurus/material-comparison.jpg` and `material-audit.json`.
- Current bytes after the paired-rowing correction: Nothosaurus full 1,794,664 / puppet and LOD 687,232; Shonisaurus full 4,379,136 / puppet and LOD 572,216. Portraits were refreshed. Blender authoring files and detailed frames remain under `local/triassic-authoring/`.
- Synced the upstream viewer Body switch: compare the pair on each animal's single entry, preserving camera and animation. Raw source files are now under each builder's `tripo-raw/` folder; reproduction paths were corrected after the upstream move.
- Scope remaining: human review of these preview pairs, the broader queued creature/image work described above, and any future repaint of inherited source markings. This correction task does not finalize the models or start other creatures.

- Live Three.js review additionally caught inward winding on procedural Shonisaurus shells that Blender had displayed two-sided. Closed shells now face outward, and the packaged-model validator enforces positive signed volume. Upper tooth winding was corrected too. Recheck actual single-sided game rendering after any future topology change.

Validation for this checkpoint: typecheck and production build passed after merging upstream main; 370 Triassic checks and production CreatureView Idle/Swim/Sprint tests passed; both species retain exact paired rigs/clips/anchors. Live viewer confirmed smoother Nothosaurus surface, Shonisaurus closed Idle, and matching authored/procedural open Heavy poses after the winding correction.

## Skinning review — 2026-09-13

Both delivered bodies were skinned the way three.js does it, at 24 frames of every clip, and
measured for stretch, face inversion, collapse and self-intersection. The skinning is sound:
measured against body length the authored bodies deform as much as their procedural twins and no
more (Nothosaurus Sprint 1.40% vs the twin's 1.44%), no faces collapse, and neither animal
self-intersects in any clip. A ratio-based reading suggested otherwise at first and was wrong —
×3 on a 0.035-unit edge and ×1.3 on a 0.224-unit edge are the same absolute movement, so a dense
mesh flatters itself. Duplicated seam vertices were checked too: none carry mismatched weights.

Two defects were reported at this checkpoint; both are resolved in the correction below.

**Shonisaurus' mouth inverts, and this is a regression.** At `Heavy` t=0.35 (and `Attack`, `Bite`)
286 faces along the upper lip turn completely inside out — flip 1.00, the surface exactly
reversed, on the `skull`/`jaw` boundary. The build before the jaw-closure change had **one**
marginally inverted face at the same frame. Closing the jaws outside feeding moved the rest pose
without the lip weights following it, so the lip now folds through itself the moment the jaw
opens. It is plainly visible at any distance where the mouth is on screen.

**Shonisaurus' skin texture is faceted.** The flank, belly and skull are covered in triangular
starbursts. It is in the baked maps, not the mesh: the same geometry with the same vertex normals
and no textures renders perfectly smooth. Nothosaurus' texture is clean, so this is one model's
bake. Both need Blender, which is why they are recorded here rather than fixed in place.

## Lip and texture correction delivered — 13 September 2026

Shonisaurus now preserves the original UV albedo pixel-for-pixel, uses white vertex colour,
normal strength 0.15 and nonmetallic roughness 0.7. This removes the faulty vertex bake's
starburst pattern. The lip has explicit skull/mandible ownership with a seated rear hinge;
54 fractional-frame samples report zero lip inversions, compared with 259 in the prior closed
build under the same audit (the earlier runtime audit above counted 286). Both filler-excluded
mouth-closure scans remain 0/14,400 open rays. Root inspected packaged Idle at 0.5 s and Heavy
at 0.35 s, zoomed side and front, with normal single-sided viewer rendering.

Full GLB is 7,381,764 bytes, SHA-256
`f4a1cc71bfb9920026a51467d5da83c74527be8c7d82c30974f1e15a7473c2f5`.
The 572,216-byte puppet and LOD are unchanged, as are the 21-joint skeleton and 19 clips.
Portraits, paired review sheets and reproducible audits are refreshed. Fine source tooth/rim
irregularity and the reconstructed oral web remain limitations, not new human approval.

**Independently re-audited on the shipped GLB, 13 September 2026.** Skinning every vertex the way
three.js does, at 20 frames of all 19 clips, both defects are gone: `Heavy`, `Attack` and `Bite`
now invert nothing at all, against 286 faces before, and the flank renders as smooth mottled hide
with no trace of the starburst faceting. Nothosaurus is unchanged at 5 hairline faces in `Sprint`.

What remains on Shonisaurus is the *original* finding, untouched by either correction and never
claimed by it: **28 faces invert at the pelvic fin root in `Parry` (t=0.21) and `Dodge`**, with
`pelvic0R` against `spine1`/`spine0`. They are hairline — sub-millimetre on a six-metre animal,
invisible without being painted — so they are worth a smoothed weight falloff across that root
next time the builder is open, and not worth a re-export on their own. The project's own fin rule
already asks for it: a root's weights blend onto the body bones under it, radially, and for paired
fins as much as median ones.

For the ongoing roster batch, resume from `PRODUCTION-SESSION.json`: all requested images are
on main at `237bf24`; the review window ends 2026-09-13 15:20:54 UTC. Sync and reevaluate
greenlights then, generate/process/commit raw Tripo bodies before starting new paired rigs.
