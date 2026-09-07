# Coccosteus cuspidatus

A separate small Middle Devonian arthrodire reconstruction for the Devonian specimen collection.
The 0.35 m representative individual is an illustrative scale, not a claimed maximum.
The full model has a compact shallow head, an articulated trunk shield, short oral opening,
conspicuous dorsal-lateral eyes, forward pelvic fins, muscular posterior body and a heterocercal tail.
Its anatomy and plate contours are independently authored; only neutral export/rig plumbing is
adapted from the other Devonian builders.

## Anatomical basis and uncertainty

[Miles and Westoll (1968)](https://www.cambridge.org/core/journals/earth-and-environmental-science-transactions-of-royal-society-of-edinburgh/article/abs/ixthe-placoderm-fish-coccosteus-cuspidatus-miller-ex-agassiz-from-the-middle-old-red-sandstone-of-scotland-part-i-descriptive-morphology/97AA5B04F2B9E00AA1FA5FC3D41627C7)
is the foundational descriptive account of Coccosteus skull, trunk armour and posterior anatomy.
[Engelman (2024), Coccosteus discussion and Figure 7](https://palaeo-electronica.org/content/2024/5307-dunkleosteus-reconstruction)
revisits complete specimens and supports a shorter abdomen and caudal region and a more anterior
pelvic position than the classic reconstruction. It also discusses the deep peduncle and uncertain
outer caudal-fin outline. The model uses those broad constraints, a moderate lower tail lobe,
small cusps along the gnathal margins, and restrained microrelief rather than large overlapping scales.
[National Museums Scotland's fossil collection review](https://files.nms.ac.uk/production/Documents/Our-Impact/Collections-reviews/Fossil-collections/fossil-review-complete-_review-of-fossil-collections-in-scotland.pdf)
provides the Scottish assemblage context.

Plate boundaries are an art interpretation of anatomical regions, not a specimen scan.
Colour, exact unpreserved soft tissues, tiny ornament distribution and all motion are reconstructions.
The olive/umber pigment, countershading, posterior mottling and fine surface texture are artistic.
Texture is generated deterministically from authored numerical noise; no external images or
AI anatomy were used as evidence. The 512 px packed normal map is reproduced by the builder.

## Reproduction

Run from repository root with Blender 4.5+ (tested on installed Blender 5.2):

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/coccosteus/build.py
node tools/devonian/check.mjs coccosteus
```

The builder writes only this creature's files. It recreates the normal map, geometry, rig, clips,
GLBs, metadata and all portraits. The original `.blend`, build log and action renders are preserved
at `../devonian-authoring/coccosteus/`. Override that location with `DEVONIAN_AUTHORING` if needed.
The integration agent can run the shared lossless packaging command after author handoff.

The full geometry uses a continuous weighted loft, recessed oral pocket, fitted irregular shield
panels, sculpted ornament, reflective inset eyes and closed two-sided fin membranes with rays.
Armour stays rigid on the skull/body bones; four caudal chain bones and independent fin bones
provide locomotion. The LOD is independently decimated to approximately 28% of the full triangles,
with the identical 19-bone skeleton and socket metadata. Vertex pigmentation remains without textures.

Three sockets are attached to their actual anatomical bones: `anchor_mouth` on `jaw`,
`anchor_mouth_inside` on `skull`, and `anchor_attack_primary` on `skull`. Their nested
`cambrianAnchor` extras use version 1. Exported bone-local positions are corrected from exact
world bind points in `anchors.json`; no whole-body CCD chain is invented.

## Clips

| Clip | Seconds | Authored motion |
|---|---:|---|
| Idle | 2.4 | Gentle posterior undulation with gill and pectoral adjustments |
| Swim | 2.4 | Travelling tail wave, delayed caudal flex and balancing fins |
| TurnLeft / TurnRight | 1.6 | Directional body bank, asymmetric tail curve and recovery |
| Dive / Rise | 1.4 | Pitched body with continuing tail and fin corrections |
| Attack | 1.0 | Backward preparation, opening gnathal, short forward strike and settle |
| Bite | 0.5 | Quick lower-jaw opening and closing, with skull/throat counter-motion |
| Heavy | 1.1 | Wider jaw preparation, lateral forceful strike, tail brace and recovery |
| Hit | 0.6 | Brief body recoil and fin disturbance |
| Death | 1.6 | Diminishing undulation, lateral roll and relaxed fins; held terminal pose |
| Guard | 1.0 | Raised pectorals with a guarded body pitch and subtle breathing |
| Parry | 0.35 | Quick oblique head/body deflection and return |
| Dodge | 0.4 | Side-slip, sharp asymmetric fin correction and caudal flex |
| Eat | 1.6 | Two small oral cycles with restrained station-holding tail motion |
| Stagger | 1.2 | Two diminishing balance disturbances and recovery |
| Ability | 2.4 | Alert lateral inspection, throat pulse and broad fin-bracing display |
| Growth | 1.5 | Relaxed fin extension and breathing, with no scaling or moulting |

Idle, Swim, Guard and Eat loop seamlessly. Other actions return to the bind pose except Death.
All sampled at 30 fps, no root motion and no scale channels. Ability and combat names are
compatibility labels; this delivery specifies no Devonian gameplay rules.

## Review

The builder records triangle counts, normalized weights, five-phase finite deformation bounds,
root/scale assertions and loop seam values in `validation.json`.
The `.select.png` is 1600×1200 RGBA; `.thumb.png` is 256×192; card and studio images show
this exact final model. Dedicated local renders cover lateral Idle and Swim, frontal Eat,
lateral Bite, oblique Heavy, frontal Ability, oblique Guard, lateral Dodge and terminal Death.

First-pass inspection led to a narrower resting mouth, smoother fin contours, more inset eyes
a branchial seam conforming to the skin, and lower-lip/gnathal weights that remain attached through a full jaw opening. Final validation and contact-sheet inspection are
recorded after the final build below.

Final inspection passed on 2026-09-06: **68,977 full triangles / 19,307 LOD triangles**
(27.99%), 19 bones, 18 distinct clips and three sockets. Shared structural intake passed
finite geometry, normalized weights, matching full/LOD skeletons and sockets, distinct nonstatic clips,
loop continuity, stable root, absence of animated scale, size bounds and PNG dimensions/transparency.
Full and LOD source exports are 4,195,564 and 1,770,556 bytes before integration compression.
The final nine-pose contact sheet is [action-review.jpg](action-review.jpg); recreate it with
`python3 tools/devonian/creatures/coccosteus/review.py` after the builder finishes.
