# Gemuendina stuertzi — V2 source

Dedicated Early Devonian rhenanid reconstruction for the specimen collection. Compatibility action names describe animation gestures; they do not prescribe gameplay. V2 candidates remain in the local authoring directory until visual approval.

## Anatomy and evidence

This rebuild uses a continuous low cranial wedge and axial trunk, broad fleshy pectoral lobes, smaller paired pelvic lobes, dorsal eyes and an upward, broad shallow oral aperture with a continuous attached margin. The long posterior tapers without a median or caudal fin. There are no external fin spokes, decorative eye pads, orbital hoops, separate ventral gill rows or sting. Small irregular tessera boundaries are integrated into the continuous body surface; cranial fields and fin ornament differ from the trunk rather than repeating identical hexagons everywhere.

The oral basin has actual walls, a floor sloping into a narrow posterior throat, a weighted anterior lower-jaw arc and attached low-relief lower-jaw denticles. Exact soft tissue and denticle arrangement are reconstruction choices. The eyes penetrate the real continuous head; independent exported-geometry volume reports exclude oral lining, branchial lips and ornament from the head enclosure.

Primary and specimen references:

- [Johanson & Smith (2005), Origin and evolution of gnathostome dentitions](https://doi.org/10.1017/S1464793104006682), figure 13 and associated specimen discussion: Gemuendina infragnathals bear small denticles with some transverse organization. No arthrodire cutting blades are added. The coauthor-hosted figure caption/article context was accessible; publisher full text was restricted.
- [Südkamp (2021), Ikonen des Hunsrückschiefers](https://www.bundenbach-fossilien.de/Literatur/2021_S%C3%BCdkamp_Ikonen.pdf), pp.17–18 and figures 18–19: illustrated dorsal and newly prepared ventral specimens; tapering finless tail, trunk tubercles and comparatively weak/absent pectoral tubercles. The account follows Gross for upward mouth and dorsal branchial exits. Phosphatic coatings limit fine surface interpretation.
- [Westoll (1967), Radotina and other tesserate fishes](https://doi.org/10.1111/j.1096-3642.1967.tb01397.x), comparative interpretation of retained cranial elements amongst tesserae. Historical homology proposals do not establish an exact armour map here. Accessible abstract/indexed text was read, not unavailable full-resolution plates.

Gross (1963), the original detailed redescription, was not directly accessible and is cited only through the inspected later authors. See `anatomy-notes-v2.md` for specimen identifiers, access limits and inference boundaries. Representative length 0.30 m follows the illustrated 304 mm animal; it is not a claimed species maximum. Living thickness, pigmentation, fin stiffness, oral tissues and all movement remain artistic inference.

## Materials

Original imagegen pigment art supplies warm umber/olive mottling, not anatomical evidence. Bespoke UV maps combine that art with coherent regional colour, fine variable tessera relief, restrained fin pattern and differing roughness. The head/body use planar dorsal/ventral islands and a separate side strip in the same atlas to avoid snout pole streaks and sidewall stretching. No glossy coat is applied to body, fins or mouth; the globes retain a wet reflection. All mapped materials have albedo, normal and roughness textures. Full GLB vertex multipliers are neutral white; the texture-free LOD receives baked linear pigment. This explicitly avoids multiplying pigment twice in Three.js.

`material-provenance.md` preserves the exact prompt and original image location. `integument-source.png` is the saved original; the nine baked PNG maps are reproducible using `materials_v2.py`.

## Rig and motion

A stable identity root contains the subordinate body, skull, jaw, throat, four sequential tail bones and the final tail-tip bone (historically named `caudal`, with no caudal fin geometry). Each pectoral has three longitudinal proximal/distal pairs. Pelvic and branchial margins move independently. Pectoral waves travel rearward with delayed tips, while fin roots blend into body weighting. Asymmetric banking, anticipation, contact and recovery distinguish the one-shot clips.

| Clip | Seconds | Specimen gesture |
| --- | ---: | --- |
| Idle | 2.4 | Gentle pectoral-edge ripple, tail follow-through and ventilation |
| Swim | 2.4 | Stronger travelling pectoral wave with delayed tail |
| TurnLeft / TurnRight | 1.6 | Asymmetric pectoral banking and curved posterior |
| Dive / Rise | 1.4 | Coordinated pitch and fin steering |
| Attack | 1.0 | Anticipatory lowering, upward oral reach, recovery |
| Bite | 0.5 | Brief lower-jaw opening and closing |
| Heavy | 1.1 | Deeper crouch, stronger upward oral lift and fin recovery |
| Hit | 0.6 | Brief lateral recoil and correction |
| Death | 1.6 | Activity fades into a held sideways slump |
| Guard | 1.0 | Low posture, cupped margins and ventilation |
| Parry | 0.3333 | Short bank and lateral deflection; quantized to 10 frames at 30 fps |
| Dodge | 0.4 | Asymmetric fin push and lateral slip |
| Eat | 1.6 | Repeated upward oral and throat cycle |
| Stagger | 1.2 | Two diminishing corrective movements |
| Ability | 2.4 | Sustained upward feeding lift with spread fins |
| Growth | 1.5 | Fin extension and ventilation without scaling or moulting |

Idle, Swim, Guard and Eat loop seamlessly. Other clips recover their start pose except Death, whose terminal pose is held. No scale or root channels are exported. The three bone-parented sockets are `anchor_mouth`, `anchor_mouth_inside`, and `anchor_attack_primary`, with nested versioned `cambrianAnchor` metadata. Full/LOD skeleton and anchor graphs match.

## Reproduce and inspect

Run from the repository root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/gemuendina/build.py
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/gemuendina/review-source.py
node tools/devonian/creatures/gemuendina/audit-candidate.mjs
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/eye-audit.py -- ../devonian-authoring/gemuendina/eye-audit-full
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/eye-audit.py -- ../devonian-authoring/gemuendina/eye-audit-lod
python3 tools/devonian/creatures/gemuendina/check-export.py
node tools/devonian/creatures/gemuendina/review-viewer.mjs
```

The builder defaults to `../devonian-authoring/gemuendina/candidate/`; it does not replace public files. Set `GEMUENDINA_OUTPUT` explicitly to change the export destination. `DEVONIAN_AUTHORING` changes the editable-source/review directory. `GEMUENDINA_EXPORT_ONLY=1` skips portrait rendering while iterating. The normal build saves an editable `.blend`, full/LOD GLBs, metadata and four matching PNG portraits. V1 assets and source remain preserved under the local `v1/` directory.

The actual Three.js reviewer requires the repository dev server, defaults to port 5173, and intercepts only Gemuendina GLB requests with local candidate bytes. It reviews all 18 clips, extra action phases, neutral front/side/dorsal/eye/oral views and LOD, while invoking the shared runtime socket/rig audit. `QA_BASE_URL` can override the server. `validation.json` reports geometry/weights/seams/bounds. `export-review-v2.json` verifies exported colour multiplication, constant root/scale and distinct animations. Final visual approval is reported separately; structural validity alone is not art approval.

## Frozen V2 handoff

The final local candidate contains 137,612 full triangles and 38,525 LOD triangles, 26 matching bones, three matching sockets, 18 full actions and three LOD actions. All four loop seams pass; root and scale remain stable. Full GLB is 15,288,252 bytes; LOD is 2,210,844 bytes before parent packaging.

Independent full-eye penetration is 82.350% / 82.334%, with conservative lower 95% bounds 82.047% / 82.031%. LOD penetration is 82.425% / 82.721%, with lower bounds 82.118% / 82.414%. All four eyes receive unambiguous PASS, valid closed-head topology and positive mouth-cap clearance greater than 0.0204 model units. The final globes were moved laterally 0.03 units for clearance while retaining the same seated cheek contour; no orbital geometry was added.

`final-review-v2.json` and the local `frozen-v2-manifest.json` identify exact asset hashes, audit results, source Blender file and actual-GLB playback. `eye-audit-full-v2.json`, `eye-audit-lod-v2.json`, `runtime-review-v2.json`, and `export-review-v2.json` preserve the independent checks. Eye/oral/side source close-ups are committed with this authoring source. The local `viewer-v2/` folder contains 48 final actual-GLB pose renders and an all 18-action WebM recording. Public V1 assets were hash-verified unchanged at handoff; the parent handles packaging, main-viewer inspection and integration.

## Integrated release review

The parent independently checked the final losslessly packaged full and reduced GLBs; `eye-packaged-review.json` records their exact hashes and containment results. Both specimens passed the shared asset/anchor checks and the built main viewer loaded all eighteen actions without browser errors. Paused action selection, frame stepping, feeding and terminal Death poses were inspected. Final matching portraits and the refreshed specimen catalogue accompany these assets. Editable Blender sources and extended visual recordings remain under `cambrian/local/devonian-authoring/`.
