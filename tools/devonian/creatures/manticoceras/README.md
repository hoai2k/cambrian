# Manticoceras regulare — initial preview

An independent Blender reconstruction of the Frasnian Iowa ammonoid. The shell is the best-constrained anatomy: compressed embracing whorls, a narrow rounded venter, visible umbilical inner coils, biconvex fine growth increments, and a genuinely open thickened aperture continuing into a recessed body chamber. Exposed fossil sutures are not painted on the living exterior.

The compact head, ten similarly sized flexible arms, small paired beak elements, mantle folds and open funnel are **editable comparative reconstruction choices**. They are not directly preserved Manticoceras soft anatomy. There are no asserted suckers/hooks, long squid feeding clubs, or modern Nautilus arm count. Exact soft-part proportions, pigmentation, skin texture and motion remain uncertain. The model is a preview, with further art refinement deferred until all initial subjects are delivered.

## Evidence and scale

- [Baker, Glenister & Levorson1986, Devonian Ammonoid Manticoceras From Iowa](https://scholarworks.uni.edu/pias/vol93/iss1/4/). The accessible author abstract identifies M.regulare's narrow discoidal shell, roughly11cm mature diameter in their sample, and occurrences in the Amana Beds/Independence Shale and Cerro Gordo Member. The full PDF could not be fetched; no claim is made to have read it.
- [Preslicka, Newsom & Blume2013, Ammonoids from the Devonian of Iowa, Iowa Geological Survey Guidebook29](https://igs.iihr.uiowa.edu/igs/publications/uploads/GB-29.pdf), pp63–72. Actual Figure5/6 photographs on printedp68 were inspected. SUI62376 is16.5cm across; SUI62349 is12.5cm. Their proposed dimorphism is tentative. The figures constrain coiling and umbilical form; shell loss exposes septal patterns that are not surface ornament. PDF and local rendered reference page are retained only in the authoring folder.
- [Korn & Klug2002, Ammoneae Devonicae chapter4, author upload](https://www.researchgate.net/publication/262810016_Korn_and_Klug_2002_Ammoneae_Devonicae_chapter_4). The indexed genus comparison lists compressed adult whorls, biconvex growth lines and no ribs, constrictions or grooves. This supplies generic ornament constraints, rather than precise individual-shell measurements.
- [Klug & Korn2004, The origin of ammonoid locomotion](https://www.app.pan.pl/archive/published/app49/app49-235.pdf). The study supports a jet-producing hyponome and discusses hydrostatic orientation of early coiled shells. It does not measure M.regulare specifically, and its soft-body figures are explicitly speculative. Thus the model's mild rocking and funnel-directed pulses are interpretations, not measured swimming performance.
- [Peterman et al.2020, The balancing act of Nipponites mirabilis](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0235180). The comparative virtual-body method uses a compact ten-arm reconstruction from phylogenetic bracketing. It is a much later ammonoid; only the cautious soft-body approach is relevant here.

The selected representative shell diameter is0.11m. Metadata's0.16m overall living length includes artistically reconstructed soft parts and is not a measured species maximum. The shell construction approximates the narrow Iowa morphology; it is not a fitted photogrammetric specimen. Display proportions remain suitable for further fossil-calibrated refinement.

## Original and materials

Original editable Blender: `cambrian/local/devonian-authoring/manticoceras/manticoceras-initial.blend`. No pre-existing Manticoceras model existed; earlier local candidates are preserved. The candidate-only seven-file family is under `initial-candidate/` in that directory. Parent integration owns packaging/public assets/catalogues/main commits.

The original imagegen swatch and provenance are preserved as `shell-source.png` and `texture-provenance.json`. Generated fine microtexture is deliberately subdued. Shell UV coordinates follow growth and whorl section; deterministic biconvex increments define the visible material pattern. Soft skin and arms have their own pigment and roughness hierarchy. All colours are conjectural. Full vertex pigment multiplies near-neutral albedo once. The physical LOD bakes that same factor to vertex colour and removes all texture nodes, avoiding double darkening.

Shell outer whorls, inner body chamber and aperture lip are rigidly weighted to the body bone. The head, mantle, funnel and49-joint arm/beak skeleton are separate. Three socket nodes use the shared nested metadata and exact bind positions: mouth, swallowing point and primary beak-contact point. No empty CCD chains are emitted.

## Actions

All action names are compatibility gestures, not new gameplay rules. Root is static and scale channels are removed only after verifying identity values. Rigid shell geometry never stretches.

| Action | Seconds | Anatomical interpretation |
|---|---:|---|
| Idle |2.4|Low funnel pulse and staggered arm-tip drift.|
| Swim |2.4|Two short mantle/funnel pulses, slight shell rocking and trailing crown contraction.|
| TurnLeft/TurnRight |1.6|Directed funnel angle, asymmetric arm drag and small coherent shell yaw.|
| Dive/Rise |1.2|Restrained trim change and one directed jet pulse.|
| Attack |1.0|Crown extension with feeding anticipation, small beak opening and recovery.|
| Bite |0.5|Paired beak movement with delayed arm gathering.|
| Heavy |1.1|Stronger gathered-arm feeding/contact gesture and pulse.|
| Hit |0.6|Quick withdrawal, coherent shell recoil and recovery.|
| Death |1.6|Damped withdrawal, drooping crown and a held final tilted pose.|
| Guard |1.0|Seamless compact retracted crown and weak ventilation.|
| Parry |0.35|Brief crown contraction and mantle withdrawal.|
| Dodge |0.4|Strong funnel pulse, asymmetric trim and arm gathering.|
| Eat |1.2|Looped small beak cycles with independent nearby arms.|
| Stagger |1.2|Damped shell recoil, delayed soft-body withdrawal.|
| Ability |1.8|Two deliberately separated jets with delayed arm response.|
| Growth |1.5|Relaxed extension/recovery; no moult or scale change.|
| Grab |1.2|Conservative arm-gathering and recovery; no invented hooks.|

Idle, Swim, Guard and Eat are seamless loops. One-shots return to neutral except Death's terminal hold. Parry is sampled on the30fps frame grid. Exact exported durations are in validation.json.

## Reproduction and review

From the repository root, run Blender with host Metal initialization permission (the actual render uses CPU Cycles):

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/manticoceras/build.py
python3 tools/devonian/creatures/manticoceras/finalize.py
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/manticoceras/render.py
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/manticoceras/render.py -- --lod
python3 tools/devonian/creatures/manticoceras/portraits.py
node tools/devonian/creatures/manticoceras/motion-review.mjs
node tools/devonian/creatures/manticoceras/audit-export.mjs
node tools/devonian/creatures/manticoceras/audit-export.mjs --lod
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/eye-audit.py -- ../devonian-authoring/manticoceras/v2-eye-audit ../devonian-authoring/manticoceras/v2-eye-audit/selectors.json
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/eye-audit.py -- ../devonian-authoring/manticoceras/v2-eye-audit-lod ../devonian-authoring/manticoceras/v2-eye-audit-lod/selectors.json
node tools/devonian/creatures/manticoceras/rigid-shell-check.mjs
node tools/devonian/creatures/manticoceras/check-candidate.mjs manticoceras
python3 tools/devonian/creatures/manticoceras/delivery.py
```

The local intake-layout/creatures symlink points to ../initial-candidate. Structural intake is an exact snapshot of the shared checker with only input/output paths redirected. Actual Three.js playback samples all19clips, records them and saves poses. Hash-bound Blender views inspect lateral shell, eye angles, oral attachment and shell aperture; reduced-model poses and four portraits follow the same source. Eye audits sample actual closed globe volume against the continuous head, including physical LOD. Final pass values/hashes will be recorded in WORKING_STATE.md and delivery.json.

## Frozen first delivery

The seven-file family, source hash and every report are in delivery.json/WORKING_STATE.md. Full122,346 triangles (8.103MB); LOD29,336 (23.978%,1.355MB). 49matching bones,19fullactions,3LODclips,3anchors; all structural/actualplayback/rigid-shell checks pass. Eye volumes full85.139/85.537%,LOD85.033/85.472%, both heads closed without boundary caps. Full/LODposes and final eye/oral/aperture close-ups inspected; four portraits match final GLB. The initial review corrected isolated mantle strips, a tiny open protoconch centre and a smoothed-normal/texture-wrap head seam. Fine skin/arm and shell-section refinement remains deferred.
