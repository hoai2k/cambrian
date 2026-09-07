# Coccosteus cuspidatus — V2

An individually authored small Middle Devonian arthrodire, rebuilt in Blender after the initial specimen review. This representative animal is 0.40 m long; that is an illustrative adult scale, not a species maximum. The original V1 sources, assets and Blender file are preserved in `../devonian-authoring/coccosteus/v1/`.

## Anatomical basis

[Miles and Westoll (1968)](https://www.cambridge.org/core/journals/earth-and-environmental-science-transactions-of-royal-society-of-edinburgh/article/abs/ixthe-placoderm-fish-coccosteus-cuspidatus-miller-ex-agassiz-from-the-middle-old-red-sandstone-of-scotland-part-i-descriptive-morphology/97AA5B04F2B9E00AA1FA5FC3D41627C7) describes the skull, trunk armour and posterior anatomy. [Engelman (2024), Coccosteus discussion](https://palaeo-electronica.org/content/2024/5307-dunkleosteus-reconstruction) and [Figure 7](https://palaeo-electronica.org/content/images/1343/figure7.jpg) revise the older outline using complete ROM VP 52664. Those sources informed the compact abdomen, anterior pelvic fins, deep peduncle, low long-based dorsal fin and asymmetrical caudal outline. The figure is saved locally for comparison only; it is not included as a game texture or model.

This is deliberately a Coccosteus reconstruction: a short broad jaw and cheek, moderate shield depth, rounded downward-projecting pectoral fans, and a long low dorsal fin. It does not inherit Dunkleosteus's body or fin template. Direct side-view comparison during revision led to a lower caudal upper-lobe profile and more ventrally projecting pectoral fins. Skull/body mass uses shaped continuous lofts, subtle cranial planes and authored seam relief rather than applied flat plates, granules, or a tubular snout.

The closed cranial tissue mesh includes its own concave palatal underside. The movable lower jaw is a closed mandibular cup with an oral floor. Flexible cheeks have dermal exteriors and oral interiors; a flexible buccopharyngeal lining joins a true aperture in the thorax and continues into a recessed oral passage. The rear of the rigid mandibular cup ends anterior to its hinge; the flexible throat and leading ventral thorax transition continuously beneath it without a second stationary jaw flange. Oral-side and dermal cheek boundaries share positions and weights. Small gnathal cusps and margins are weighted to the corresponding jaw/skull bones. Exact living soft-tissue thickness, throat anatomy, colour, ornament strength and motion are artistic inferences. Seam polylines interpret anatomical regions; this is not a fossil scan or a claim of exact plate identification.

## Eyes and materials

Both closed oval globes sit in the continuous head mesh. Thin lids are fitted to the actual globe/head intersection and share the cranial material. There are no eye pads or decorative hoops. The final full-volume audit measures **82.40% / 82.18%** inside; the independently simplified LOD measures **82.40% / 82.22%**. The conservative 95% lower bounds exceed 81%, safely above the requested 50% and the production margin. Both head meshes and all four globe meshes are closed, with no audit caps. About 60,000 accepted uniform globe-volume samples per eye are classified against actual exported triangles with three ray directions. Full ray disagreements are 0 / 7; LOD 0 / 11. These small ambiguous counts are included conservatively, not discarded. See [eye-audit-v2.json](eye-audit-v2.json) and [eye-audit-lod-v2.json](eye-audit-lod-v2.json).

Muted umber dermal armour, an olive posterior, green fin membranes with a graded pigmented root and subtle radial striae, lighter ventral tissues and restrained flank pigment establish regional structure. UVs carry five maps: near-neutral dermal albedo detail, normal relief and roughness, plus fin pigment and roughness. Fin variation follows restrained radial striae and grades into the armoured shoulder; it is an artistic soft-tissue reconstruction, not raised ray geometry. The original imagegen micropattern is used only as subdued material input, not anatomical evidence; the builder adds its own head/trunk seam layout. [Texture provenance](texture-provenance-v2.json) preserves the exact prompt and source location. Baked highlights in the generated input are normalized and strongly attenuated before use.

Full GLB colour intentionally equals regional linear vertex pigment multiplied once by the near-neutral albedo factor. Blender's exporter was found to emit white vertex colours for some secondary material primitives, so `restore_export_colours` verifies each exported position against the source and restores its exact linear colour in the BIN. This keeps full GLB and source materials consistent. Eye COLOR_0 is explicitly white because its material already carries the dark base factor. LOD bakes each armour or fin albedo factor once into the corresponding regional vertices, removes all material texture links, welds coincident UV-seam vertices, and physically decimates the mesh. It has **zero textures**.

## Rig and animation

The full and LOD share 19 skin joints, a static identity root, and the three compatible sockets: `anchor_mouth` on jaw; `anchor_mouth_inside` and `anchor_attack_primary` on skull. Their nested `cambrianAnchor` extras retain version, role and anatomical parent. Binding points are verified from `anchors.json` after Blender-to-glTF axis conversion. No unrelated body chain is advertised as a feeding solver.

Rigid armour remains on body/skull bones. The head/jaw linkage coordinates gape with a small skull lift; the posterior wave passes through four caudal-chain bones and a caudal bone. Paired pectoral tips lag their proximal fins; anterior pelvic fins and dorsal fin provide secondary timing. The dorsal base follows the local posterior chain while its distal membrane retains a separate fin contribution, maintaining attachment during the terminal Death curve. There are no scale channels or animated root transforms.

| Action | Authored interval | Intent |
|---|---:|---|
| Idle | 2.4 s | Gentle travelling wave, breathing, independent fin trim |
| Swim | 2.4 s | Three posterior wave cycles with body counterbalance and delayed fins |
| TurnLeft / TurnRight | 1.6 s | Small opposite preparation, directed bank and staggered tail release |
| Dive / Rise | 1.4 s | Preparatory pitch, paired-fin angle change and posterior correction |
| Attack | 1.0 s | Load, gape, short local drive, rapid closure and recovery |
| Bite | 0.5 s | Compact opening/closing with cranial counter-motion |
| Heavy | 1.1 s | Wider gape, stronger load and distinct follow-through |
| Hit | 0.6 s | Fast recoil followed by delayed tail and fin disturbance |
| Death | 1.6 s | Damped struggle, lateral roll and terminal relaxed hold |
| Guard | 1.0 s | Braced paired fins, guarded head and seamless breathing |
| Parry | ~0.35 s | Quick oblique body/fin deflection and counter-tail recovery |
| Dodge | 0.4 s | Coil, lateral drive and delayed caudal whip |
| Eat | 1.6 s | Two unequal oral pulses with station-holding motions |
| Stagger | 1.2 s | Two decreasing disturbances and a smaller final correction |
| Ability | 2.4 s | Alert scan, fin opening and branchial/oral pulse |
| Growth | 1.5 s | Relaxed fin unfurling and gape, without size scaling |

Actions are sampled at 30 fps; the exporter includes the initial frame interval, so runtime durations can exceed the authored interval by one frame. The final validation records exact values. Idle, Swim, Guard and Eat have matching endpoint transforms. One-shots recover to neutral except Death, which holds its last pose. Action names are asset compatibility labels, not Devonian gameplay definitions.

## Reproduction and review

Run from repository root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/coccosteus/build.py
python3 tools/devonian/creatures/coccosteus/finalize.py
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/coccosteus/render-v2.py
node tools/devonian/creatures/coccosteus/audit-export.mjs
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/eye-audit.py -- ../devonian-authoring/coccosteus/v2-eye-audit ../devonian-authoring/coccosteus/v2-eye-audit/selectors.json
node tools/devonian/creatures/coccosteus/audit-export.mjs --lod
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/eye-audit.py -- ../devonian-authoring/coccosteus/v2-eye-audit-lod ../devonian-authoring/coccosteus/v2-eye-audit-lod/selectors.json
node tools/devonian/creatures/coccosteus/motion-review.mjs
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/coccosteus/render-lod-v2.py
python3 tools/devonian/creatures/coccosteus/review.py
python3 tools/devonian/creatures/coccosteus/delivery.py
```

The continuous torso aperture rim shares oral pigmentation with its inward passage. This final local material correction removes a pale skeletal-looking crescent at extreme gape; a soft specular highlight remains on the tissue edge.

The rounded nose and mandibular tip close continuously without a separate cut-face patch. Coincident UV seam vertices share identical boundary pigment, and microdetail fades toward the oral edge and nose pole to prevent stretched comb or radial streak artifacts.

The source Blender file is `../devonian-authoring/coccosteus/coccosteus-v2.blend`; local candidate assets are in `v2-candidate/`. Source scripts do not publish automatically. After review, copy the candidate asset family to `public/assets/devonian/creatures/`; integration handles lossless packaging and commits. Neutral mesh/export/review plumbing is adapted from the existing creature pipeline; Coccosteus anatomy, textures and motion curves are authored separately. Blender may require host Metal access on macOS. Playback requires locally installed Chrome and repository Three/Playwright dependencies.

Final geometry: **149,269 full triangles / 42,082 LOD triangles (28.19%)**, 19 matching joints, three sockets, 18 distinct full clips and Idle/Swim/Death in LOD. Raw full is 10,368,824 bytes; LOD is 1,726,068 bytes. [Structural validation](validation.json) verifies finite geometry/transforms, normalized weights, socket alignment, root/scale stability, distinct motion and loop continuity. [Actual Three playback](playback-validation-v2.json) samples 91 times per clip, and records all 18 clips without browser errors. The local `motion-review-v2.webm` preserves playback.

Four portraits are rendered from the actual full GLB: transparent 1600×1200 select/studio, 800×600 card, and 256×192 thumb. Review images cover ten full-body poses, four eye angles and close frontal-low/oblique mouth views at rest, gape, closing and feeding. Mouth-only inspection adds a fill light so interior attachment can be examined rather than hidden in shadow. See [action review](action-review-v2.jpg), [playback poses](playback-review-v2.jpg), [eye close-ups](eye-review-v2.jpg), and [oral close-ups](mouth-review-v2.jpg).

Final render provenance is recorded in [render-validation-v2.json](render-validation-v2.json). Every review and portrait is first saved in a directory named for the loaded GLB hash; aliases update only while that hash still matches. [Delivery manifest](delivery-v2.json) freezes the asset family and review evidence for independent packaging.

## Final integration

Final full/LOD packaging preserved all geometry, numeric samples, weights, materials and sockets exactly. `eye-packaged-review.json` identifies the packaged hashes and fresh independent measurements. Both detail levels passed structural intake. The built main viewer loaded the specimen, all eighteen action selections retained paused state and accepted frame stepping, feeding poses were inspected, and no browser errors were recorded. The era integration checks and type/build checks passed; original Cambrian assets remain unchanged.
