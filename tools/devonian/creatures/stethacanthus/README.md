# Stethacanthus — independently reconstructed V2

Original Blender reconstruction of **Stethacanthus sp.**, anchored to CMNH 8988 from the upper Famennian Cleveland Shale of Ohio. The fossil preserves a spine-brush complex and associated teeth; the whole animal is a carefully labelled comparative reconstruction. It is not a complete specimen scan, and it is not the Carboniferous Akmonistion zangerli presented as a Devonian animal.

V2 replaces the first procedural specimen's tubular head, external eye hoops, wire-like gills, mechanically repeated oversized denticles, flat fin membranes and shallow mouth. Public V1 assets are deliberately untouched by this author; integration publishes the reviewed local candidate.

## Anatomy and uncertainty

The short terminal head, substantial orbital tissue, tapering trunk, paired fins with long metapterygial extensions, small spineless posterior dorsal and externally balanced caudal outline are comparative symmoriiform features. The caudal axis itself bends dorsally into the upper lobe: external balance does not turn it into a homocercal modern fish tail. No Cladoselache-style caudal keels were added.

The first dorsal structure has a narrower supported fan and a widened, rounded crown. Smaller cranial denticles point backward; enlarged crown denticles point forward. Their size and placement vary within constrained fields instead of identical rows of spikes. The surface is living covering over a supported structure, not exposed rods, hair or plywood ribs. Exact crown width and living tissue contours are reconstructed. Coates et al. (1998) describe a mineralized keel, hollow rods and baseplate in later Bearsden specimens and reject the earlier erectile hypothesis; those specimens inform the support concept, not this animal's species or complete body outline. The animation does not inflate the brush or articulate its denticles.

This complex-bearing male configuration is comparative. It does not establish CMNH 8988's sex or suggest that every individual bore the same mature structure. Pigmentation, exact fin-whip length, fine dermal texture, soft oral/branchial tissue and action timings are artistic interpretations. `lengthMeters: 0.7` represents an illustrative small individual, not a measured CMNH 8988 length or a species maximum.

Ginter & Sun (2007, p.710) question the older S. altonensis assignment and compare the specimen's teeth with relatively slender five-cusped forms. The model therefore uses small grasping cusps with substantial lateral cusps, not serrated cutting teeth or the exaggerated central cusp of later true S. altonensis comparisons. Williams (1985) plate15 fig1 is cited through their explicit specimen discussion; the original plate could not be directly retrieved during this pass.

## Geometry, materials and oral structure

One continuously closed head/trunk envelope contains the real eye-surrounding volume. Globes are closed semantic meshes `eye_globe_L` and `eye_globe_R`; no decorative rim contributes to the embedding measurements. A subtle orbital brow is part of the main head surface. Deterministic actual-GLB polyhedron volume reports, including conservative confidence bounds and asset hashes, are preserved locally and summarized in `review-evidence.json`.

The mouth is a curved negative volume sculpted into that envelope. Its actual inner faces form palate, cheeks, floor and pharynx. There is no exterior head cap behind the opening or detached oral floor. The lower skin, inner floor and lower dentition follow the real `jaw` bone; upper dentition follows `skull`, and a small deeper tissue component follows `throat`. Commissural weights blend continuously about the hinge. Upper/lower teeth remain rigid to their appropriate jaw bones. The posterior lumen curves down into a narrowed soft pharynx; its precise soft anatomy is an interpretation.

Five paired branchial recesses are shorter curved cavities with varied lengths, subdued tissue colour, and small local motion. They are not raised cords or painted dark rectangles. Fins have thickness at the roots, thin margins, chord-limited camber and restrained buried normal-map striation, without raised outer rays. Metapterygial extensions remain attached through independent base/tip follow-through.

Original imagegen pigment is preserved in `imagegen-skin-source.png` and documented with its exact built-in-tool prompt in `imagegen-provenance.md`. `materials_v2.py` bakes this source into regional UV albedo maps and authors separate normal/roughness channels. Full `COLOR_0` is neutral white to avoid multiplying pigment twice; `BakedPigment` stores the linear-space albedo bake for the genuinely reduced texture-free LOD. LOD meshes use one vertex-colour material each to avoid the Blender multi-material colour-export mapping issue.

## Rig and authored actions

24 matching full/LOD bones, identity stable root, no animation scale tracks. Required v1 extras are attached to real anatomical parents for `anchor_mouth` (jaw), `anchor_mouth_inside` (skull), and `anchor_attack_primary` (skull). These compatibility labels do not specify Devonian gameplay.

| Clip | Seconds | Authored motion |
|---|---:|---|
| Idle | 2.4 | Gentle posterior wave, independent fin trim and branchial motion |
| Swim | 2.4 | Accelerating paired tail strokes, effort modulation, delayed fin-whip response |
| TurnLeft / TurnRight | 1.6 each | Counter-bend, bank, distal tail catch-up and controlled recovery |
| Dive / Rise | 1.4 each | Body pitch with opposing fin trim and delayed caudal correction |
| Attack | 1.0 | Drawback, jaw preparation, short forward thrust, closure and recovery |
| Bite | 0.5 | Fast articulated gape with upper-head counter-motion and closure |
| Heavy | 1.1 | Stronger coil, banked thrust, maximum gape, secondary tail motion, recovery |
| Hit | 0.6 | Brief impact recoil with decaying posterior response |
| Death | 1.6 | Declining tail kick, bank, fin relaxation and held terminal pose |
| Guard | 1.0 | Stationary fin spread and low-amplitude corrective tail movement |
| Parry | 11/30 | Quick bank and counter-flick followed by delayed tail recovery |
| Dodge | 0.4 | Rapid lateral bank, counter-bend and distal recovery |
| Eat | 1.6 | Repeated unequal articulated grasps, throat motion and gentle holding swim |
| Stagger | 1.2 | Damped alternating recoil with asymmetric trim |
| Ability | 2.4 | Fin-spread presentation of the supported brush with modest body banking |
| Growth | 1.5 | Relaxed extension and breath/trim display; no scaling or shedding |

Idle, Swim, Guard and Eat are seamless loops. Other one-shots return to neutral except Death. Root stays fixed while the body bone supplies small local dynamic offsets.

## Reproduction

Run from the repository root, using Blender 5.2 plus Python NumPy/Pillow. On this macOS host use Blender with `--threads 2`; sandboxed Metal initialization may require the authorized escalated process.

```sh
python3 tools/devonian/creatures/stethacanthus/materials_v2.py
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/stethacanthus/build.py
python3 tools/devonian/creatures/stethacanthus/validate_v2.py
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/stethacanthus/check_pose_v2.py
STETH_RENDER=all /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/stethacanthus/render_v2.py
STETH_RENDER=motion /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/stethacanthus/render_v2.py
python3 tools/devonian/creatures/stethacanthus/review_motion.py
STETH_IMPORT=full STETH_RENDER=oral-lit /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/stethacanthus/render_v2.py
STETH_IMPORT=lod STETH_RENDER=lod /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/stethacanthus/render_v2.py
node tools/devonian/creatures/stethacanthus/export_audit.mjs
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/eye-audit.py -- ../devonian-authoring/stethacanthus/v2/audit-full tools/devonian/creatures/stethacanthus/audit-selectors.json
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/eye-audit.py -- ../devonian-authoring/stethacanthus/v2/audit-lod tools/devonian/creatures/stethacanthus/audit-selectors.json
python3 tools/devonian/creatures/stethacanthus/review.py
```

All builders write only to `../devonian-authoring/stethacanthus/v2/candidate/`. Editable packed source: `../devonian-authoring/stethacanthus/v2/stethacanthus-v2.blend`. Original V1 source, Blender file, GLBs and portraits: `../devonian-authoring/stethacanthus/v1/`. Final source snapshot and visual evidence remain beside the candidate. Integration is responsible for lossless packaging, independent viewer checks and committing to main.

## Review evidence

`validation.json` binds geometry, sizes, durations, distinct motion digests, normalized weights, seamless loops, anchor alignment and jaw-motion evidence to the exported files. `pose-validation.json` checks all source weights and nine phases of every clip, including rigid dentition and fin-whip attachment. `review-evidence.json` records final hashes, eye results and visual review coverage.

Visual review includes front, side, dorsal and three-quarter silhouettes; eye and oral close-ups; all eighteen action poses; sequential Swim, TurnLeft, Heavy, Dodge, Eat, Death and Ability frames; directly lit actual full-GLB opening/maximum-gape/closing views; and actual texture-free LOD imports. Source-only rendering is not treated as sufficient export validation.

## Primary references

- [Ginter & Sun 2007, p.710, CMNH8988 and tooth comparison](https://www.app.pan.pl/archive/published/app52/app52-705.pdf).
- Williams 1985, The “cladodont level” sharks of the Pennsylvanian black shales of central North America, Palaeontographica A190:83–158, plate15 fig1; indirect access as noted above.
- [Ginter 2018, symmoriiform comparative anatomy and sparse Devonian record](https://repozytorium.uw.edu.pl/bitstreams/5cc9e710-1bcb-4353-a08d-f1f56bde31ec/download).
- [Zangerl 1984, spine-brush microscopic anatomy and opposing denticle fields](https://doi.org/10.1080/02724634.1984.10012016).
- [Coates et al. 1998, mineralized brush support](https://www.nature.com/articles/25467), with [author-uploaded full text](https://www.researchgate.net/publication/31987338_Spines_and_tissues_of_ancient_sharks_2).
- [Lund 1984, comparative stethacanthid morphology](https://doi.org/10.1016/S0016-6995(84)80095-9).

## Frozen candidate measurements

- Full: 262,784 triangles, 22,666,540 bytes. LOD: 78,220 triangles, 4,052,520 bytes (29.77% of full triangles).
- Both actual continuous head meshes are closed, with zero nonmanifold edges and no artificial boundary caps. Full eye embedding: 79.78% / 79.71%; LOD: 79.76% / 79.69%. Every conservative 95% lower bound exceeds 79.3%.
- 24 matched bones; 18 full clips and Idle/Swim/Death in LOD; 3 verified anatomical sockets.
- Final all-action grid and high-resolution portrait reviewed after the fin-root fix. 119 sequential frames across seven actions were also inspected for timing and follow-through.

Final GLB SHA-256: `1a5db57c8e55a4a1bbdf7f72c52f30b3277e517eb7c3a26a2858aa576b436fab`. LOD SHA-256: `9bfd6fb1a3a7c360e4ef4bd457813764a87ae2450c6b1d9155a2e96226f01ae4`.

## Published package review

The final losslessly packaged model is 15,733,048 bytes full and 2,352,376 bytes reduced, with decoded geometry, weights and animation samples unchanged. Independent `eye-packaged-review.json` reports bind the actual shipped hashes to approximately 80% embedding in both detail levels. The built viewer loaded all 18 actions; paused selection and one-frame stepping passed for each, and the articulated feeding gape was visually inspected without browser errors (`main-viewer-review.json`). Combined main-branch validation passed 416 Devonian checks and all world tests.
