# Stethacanthus sp. — Devonian specimen asset

This is a new authored whole-animal reconstruction around a demonstrably Devonian fossil occurrence. It is not a scan or a complete preserved individual. The occurrence anchor is **CMNH 8988**, the spine-brush and associated dentition from the **upper Famennian Cleveland Shale, Ohio**, explicitly discussed by Ginter and Sun (2007, p.710). They question Williams's assignment to *S. altonensis*, so the asset deliberately retains *Stethacanthus sp.*. Carboniferous *Akmonistion zangerli* has not been substituted.

## Anatomy and visual decisions

The trunk is a continuous shaped loft with a real recessed oral opening and integrated flexible lower jaw. Five-cusped cladodont teeth are small gripping crowns, not serrated modern shark blades. The dark eyes are nestled inside modeled orbit rims. Five paired branchial slits, countershading and a fine sensory line provide readable detail at closer inspection distances.

The anterior dorsal complex has a narrow leading spine, a continuous expanding membranous body and a broad denticle-bearing crown. The brush is **not hair**. Seven authored rows of enlarged crowns face anteriorly, while the cranial field faces posteriorly. Parallel flank ridges are restrained artistic tissue detail. A dedicated basal bone moves the whole complex rigidly; skin deformation does not bend the spine or its crown.

Paired fins have curved membranes and restrained internal support relief. The pectoral metapterygial extensions continue into long whips, each with two delayed-motion bones. The small rear dorsal is spineless. A broad sweeping epicercal tail differs from the crescent tail of Cladoselache; the model has no Cladoselache-style broad peduncular keel plates.

Soft-body proportions, fin-whip extent, colors, microrelief and movement are comparative artistic reconstruction. The 0.7 m representative presentation length is an illustrative individual, **not a measured total length of CMNH 8988 or a species maximum**. The Devonian anchor is partial; fin and body detail uses comparative stethacanthid anatomy with that limitation disclosed.

The brush-bearing state does not establish the sex or stage of the selected fossil, or imply that all individuals had this structure. Possible inflation, threat display and courtship remain hypotheses. The model does not animate inflation or claim a demonstrated function. Its `Ability` is simply a restrained presentation posture.

## Reproduce

Run from the repository root with Blender 4.5+ (authored with Blender 5.x):

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/stethacanthus/build.py
node tools/devonian/check.mjs stethacanthus
```

The builder is standalone, with the shared Devonian shark mesh/export scaffolding adapted from the Cladoselache authoring script. The Stethacanthus body proportions, fins, whips, brush, denticles, pigmentation and display motion are specifically authored. No other species file is imported or executed. Python and NumPy are bundled with Blender. Blender GPU access can require running outside the filesystem sandbox on macOS.

Source, local renders and log: `cambrian/local/devonian-authoring/stethacanthus/`. Set `DEVONIAN_AUTHORING` to override that directory. A full source `stethacanthus.blend` is saved there. `skin-normal.png` is deterministically generated microrelief, embedded in the model; vertex pigmentation remains available in the LOD. No external image or imagegen output was used. `anchors.json` records intended Blender-world bind locations, while the exported GLBs already contain corrected bone-local sockets.

## Rig and clips

Blender -Y forward/+Z up exports glTF +Z forward/+Y up. `root` stays identity. Body motion is subordinate to root. Jaw, throat, head, six trunk/tail links, pectorals, distal pectorals, four whip links, pelvics, branchial regions, posterior dorsal and caudal have independent motion. Export removes only provably constant root and scale channels. Skin weights are normalized. The three mandatory anchors are bone-parented, use nested `cambrianAnchor` extras, and are identical in full and LOD.

| Clip | Seconds | Authored motion |
|---|---:|---|
| Idle | 2.4 | Quiet tail wave, breath, fin trim and delayed whip settling; seamless |
| Swim | 2.4 | Stronger twice-cycle travelling tail wave, independent fins and trailing whips; seamless |
| TurnLeft / TurnRight | 1.6 each | Opposite local bank/yaw with distributed tail curvature and recovery |
| Dive / Rise | 1.4 each | Controlled pitch with secondary tail and fin trim |
| Attack | 1.0 | Jaw anticipation, short body-local strike and recovery |
| Bite | 0.5 | Brief cladodont grip with lower-jaw/throat articulation |
| Heavy | 1.1 | Winding posture, jaw opening, weighted sweep and settling |
| Hit | 0.6 | Short roll/recoil pulse |
| Death | 1.6 | Loss of propulsion, slack fins/whips and held lateral terminal pose |
| Guard | 1.0 | Fin spread and modest brush presentation; seamless |
| Parry | 0.35 | Quick oblique deflection and return |
| Dodge | 0.4 | Compact lateral body shift/bank with C-curve and whip lag |
| Eat | 1.6 | Repeated restrained oral pumping and throat motion; seamless |
| Stagger | 1.2 | Longer two-pulse imbalance with recovery |
| Ability | 2.4 | Head/rigid brush presentation with paired-fin and whip extension |
| Growth | 1.5 | Relaxed breathing and fin extension, without scaling or moulting |

All non-Death one-shots return to neutral. These are asset compatibility clip names and define no gameplay rules. The reduced mesh retains Idle, Swim and Death and the complete same skeleton and socket set.

## Review

The builder creates four final matching portraits plus nine local review renders: Idle lateral, Swim lateral, Eat frontal, Bite lateral, Heavy three-quarter, Ability frontal, Guard three-quarter, Dodge lateral and Death three-quarter. `validation.json` records topology counts, export sizes, sampled pose bounds, weight normalization, loop endpoint differences and root/channel checks. Final visual review and intake results are recorded below after inspection.

## Sources

- [Ginter & Sun (2007), p.710](https://www.app.pan.pl/archive/published/app52/app52-705.pdf): Devonian CMNH 8988 occurrence and taxonomic caution; use the Devonian comparison, not the paper's Carboniferous Muhua teeth as the target specimen.
- [Zangerl (1984)](https://doi.org/10.1080/02724634.1984.10012016): spine-brush tissue anatomy and opposed denticle fields. Functional explanations are hypotheses.
- [Lund (1984)](https://doi.org/10.1016/S0016-6995(84)80095-9): comparative stethacanthid spine, dentition and pectoral characters; Carboniferous comparisons are clearly distinguished from the Devonian occurrence.
- [Ginter (2018)](https://repozytorium.uw.edu.pl/bitstreams/5cc9e710-1bcb-4353-a08d-f1f56bde31ec/download): symmoriiform record and comparative body characters.

Final author review (2026-09-06): all nine generated poses and the final studio portrait were inspected. The frontal views preserve paired fin/whip symmetry, an open oral lumen and separated head/brush silhouettes. Lateral Bite retains a connected lower jaw and throat; Dodge distributes bending through the tail; the Death endpoint keeps a slack held posture. The spine-brush stays rigid and clears the head during its presentation posture. The fine surface ridges and tooth-like crown fields remain readable at the final portrait size. No detached meshes, fin inversions or gross self-intersections were observed in these views.

`node tools/devonian/check.mjs stethacanthus` passed: **104,076 full triangles / 29,135 LOD triangles (27.99%)**, 26 rig bones, **18 distinct clips**, three valid sockets, finite geometry, normalized weights, root/channel safety and matching skeletons. Idle, Swim, Guard and Eat are seamless. Full and LOD are approximately 5.8 MB and 2.3 MB before integration compression. Transparent selection is 1600×1200; thumbnail is 256×192. Parent integration will perform final lossless packaging and browser inspection.
