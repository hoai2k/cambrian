# Cladoselache

An independently shaped Cleveland Shale early chondrichthyan for the Devonian specimen collection.
The genus-level reconstruction represents a 1.5 m individual, not a claimed species maximum.
It has a blunt rounded head, conspicuous lateral eyes, small terminal mouth with cladodont teeth,
five paired gill slits, broad winglike paired fins, two dorsal fins, one curved anterior dorsal
spine, a narrow keeled peduncle and a high-aspect-ratio crescent tail. There is no anal fin.

## Evidence and uncertainties

[Frey et al. (2023)](https://link.springer.com/article/10.1186/s13358-023-00266-6)
compare Cladoselache with Maghriboselache. Their comparison supports broad paired fins and a
lunate tail. They explicitly identify the posterior dorsal spine of Cladoselache as hypothetical;
this model omits it and retains the anterior curved spine. The model does not copy
Maghriboselache's broad nasal specialisation or its reconstructed tail.

The [2022 pelvic skeleton study](https://pmc.ncbi.nlm.nih.gov/articles/PMC9782884/)
examines the relatively well-preserved pelvis of Cladoselache kepleri NHMUK PV P9269.
[Case Western Reserve University's Hyde Collection](https://caslabs.case.edu/hyde-collection/historical-geology/)
records Cleveland Shale examples, including CMNH5135 and food remains in another specimen.
The [CMNH casting program](https://gsa.confex.com/gsa/2006NC/webprogram/Paper103585.html)
describes the skin outline and soft-anatomy preservation of CMNH5371. These establish the
Cleveland marine context; the asset is a synthesis, not a measurement or scan of any one fossil.

Exact soft-tissue volume, colour and fin thickness are reconstructed. The cool blue-green
countershading, sparse irregular mottling and subtle sensory line are artistic. Skin has fine
low-amplitude relief without a fabricated dense covering of large modern shark denticles.
Fin supports appear as fine covered ridges, not exposed bones. Teeth use small central cusps
and accessory cusplets rather than serrated cutting blades. The visible details are an
interpretation for a small rendered model, not a scientific restoration with diagnostic fidelity.
No externally sourced or generated image is used as anatomical evidence. The packed 512 px
normal bitmap is deterministically generated from numerical noise by the builder.

## Build and assets

Run from the repository root (tested with the installed Blender 5.2):

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/cladoselache/build.py
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/cladoselache/render-all.py
python3 tools/devonian/creatures/cladoselache/review.py
node tools/devonian/check.mjs cladoselache
```

Only this creature's paths are written. The reusable rig/export/render plumbing is adapted
from the Coccosteus builder; body cross-sections, fins, mouth, eyes, branchial details, skin,
spine and caudal silhouette are authored specifically here. The source .blend, build log and
individual pose renders are preserved in `../devonian-authoring/cladoselache/`; override that
location with `DEVONIAN_AUTHORING`. Source geometry uses a continuous smooth loft, an oral
pocket, shaped double-sided membranes, fitted oral rims and detailed covered fin supports.

The full and reduced GLBs share the same 22-bone graph. Six serial posterior bones propagate
a travelling propulsion wave; the caudal fin, two dorsal fins, paired pectorals and tips,
pelvic fins, skull, jaw, throat and branchial controls move independently. The LOD is
geometrically decimated to approximately 28% of the full triangles, retaining colour attributes.
Parent integration applies lossless GLB compression and final cross-asset checks.

The three version-1 nested `cambrianAnchor` extras are attached to real bones:
`anchor_mouth` → jaw, `anchor_mouth_inside` → skull, `anchor_attack_primary` → skull.
Their points are provided in `anchors.json`. The exporter patch calculates exact bone-local
coordinates from world bind positions and gives full/LOD the identical socket graph.
The source uses +Z up, -Y forward and exports glTF +Y up, +Z forward. Root remains fixed.

## Animation vocabulary

| Clip | Duration | Gesture |
|---|---:|---|
| Idle | 2.4 s | Soft caudal drift, breathing and balancing fin motion |
| Swim | 2.4 s | Two travelling tail beats, delayed caudal response and fin adjustments |
| TurnLeft / TurnRight | 1.6 s | Directional body bank and progressive tail bend |
| Dive / Rise | 1.4 s | Smooth pitch with continuing propulsion and fin corrections |
| Attack | 1.0 s | Preparatory pullback, opening mouth, forward impulse and recovery |
| Bite | 0.5 s | Quick jaw gape and closure with skull/throat counter-motion |
| Heavy | 1.1 s | Larger anticipatory gape and lateral strike with tail bracing |
| Hit | 0.6 s | Short recoil and disturbed balance |
| Death | 1.6 s | Diminishing undulation, relaxed fins and a held sideways terminal pose |
| Guard | 1.0 s | Broad pectoral bracing, small pitch and breathing |
| Parry | 0.35 s | Fast oblique deflection and return |
| Dodge | 0.4 s | Side slip and strong asymmetric fin/tail correction |
| Eat | 1.6 s | Repeated small oral cycles with restrained station holding |
| Stagger | 1.2 s | Two balance disturbances with recovery |
| Ability | 2.4 s | Acceleration and alternating bank display with spreading fins |
| Growth | 1.5 s | Relaxed extension and breathing without scaling or moulting |

Idle, Swim, Guard and Eat are seamless loops. All other actions return to neutral except Death,
which holds its terminal pose. Keys are sampled at 30 fps (the 0.35 s action rounds to 10 frames).
No animated scale or root-motion channels are exported. The vocabulary provides asset
compatibility; it does not prescribe Devonian gameplay or claim that these behaviours are fossil evidence.

## Review

The builder checks normalized weights, finite posed geometry at five phases per clip,
loop endpoints, constant roots and absence of animated scale. Four final portraits match
the model, including 1600×1200 RGBA selection art and a 256×192 thumbnail.
Local renders cover lateral Idle and Swim, frontal Eat, lateral Bite, oblique Heavy,
frontal Ability, oblique Guard, lateral Dodge and held Death. `review.py` composes those
renders into the committed `action-review.jpg` contact sheet. See `validation.json` for exact
triangle counts, rig size and numerical checks. Final visual review results are appended below.

The final geometry has **89,336 full triangles / 25,008 LOD triangles** (27.99%), 22 bones,
18 distinct clips and three sockets. Before integration compression the exports are 5,224,400
and 2,062,116 bytes. Shared structural intake passes normalized weights, finite geometry and
poses, matching full/LOD skeletons and socket metadata, distinct motion, loop continuity,
fixed roots, no animated scale, and portrait sizes/transparency. Review prompted fully closed
fin membrane edges and a lower studio bounce light so reversed fins remain visible during
the held terminal roll. Oral reviews sample the actual Eat and Heavy gape peaks.

Final nine-pose contact-sheet inspection passed on 2026-09-06: the continuous mouth and
cheeks remain attached through the gape, fins retain their silhouettes during banking, and
the terminal pose holds without root drift. Reverse dorsal surfaces are intact and shaded
by the body in the rolled pose; the lower bounce preserves their surface detail.
