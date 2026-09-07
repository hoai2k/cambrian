# Bothriolepis canadensis — V2 anatomical revision

This creature is an independently authored Blender reconstruction. The V1 release remains preserved under `cambrian/local/devonian-authoring/bothriolepis/v1/` together with its source, GLBs, portraits and original Blender file.

## Anatomical decisions

The principal reference is Béchard, Arsenault, Cloutier & Kerr (2014), [The Devonian placoderm fish Bothriolepis canadensis revisited with three-dimensional digital imagery](https://doi.org/10.26879/417), particularly figures 2–3 and the pectoral articulation discussion. The locally preserved paper is `reference-417.pdf`; rendered figure pages are research intermediates, not distributable game textures.

The revised adult has a steep cephalic roof, flat ventral floor, angular shoulders and a posterior median dorsal crest. Armour occupies approximately 36% of the reconstructed length. The head and thoracic shield remain one rigid anatomical unit. A longer muscular posterior supports a small rounded dorsal fin and a strongly asymmetrical caudal outline. The pectoral appendages are flattened, jointed dermal fins with small marginal denticles and restricted articulation. They do not walk, row or serve as anchors. The representative scale is 0.40 m, rather than a species maximum. Living pigmentation, oral soft tissues, eye volume and fine surface relief remain artistic reconstructions.

The main mesh `head_envelope_closed` is a continuous densely sampled Catmull-interpolated surface, with subtly depressed anatomical seam paths. It replaces the previous round loft and raised plate islands. Pectoral roots start inside the shield and use overlapping flattened shoulder/segment surfaces, without visible spherical joint primitives.

`eye_globe_L` and `eye_globe_R` are complete closed oval solids oriented to the actual head normal. Their centers are recessed into the continuous head, with no eye pad or decorative hoop. The first V2 exported-volume audit measured approximately 79% embedding on both sides, against less than 1% in V1. The final packaged model after the oral-aperture correction has a separate hash-bound report in `eye-packaged-review.json`. The delivery's exact model hashes and final measurements are recorded in `eye-validation-v2.json`; do not reuse that report after geometry changes.

The ventral mouth contains a curved vestibule with palate, lateral walls, floor and recessed throat. A Boolean recess in the continuous head envelope gives that vestibule an actual opening; close underside review caught the older solid front cap concealing the mouth. The front cap uses matching authored pigmentation without collapsed longitudinal UV detail, preventing comb-like normal-map streaks. The toothless lower lip is a weighted U-shaped fold, attached at the commissures and driven by the `oral` bone. It replaces a separate oval lower lip that looked detached at maximum opening. Mouth motion is small and appropriate to an antiarch, rather than a large predatory jaw.

## Materials and authored images

The original `dermal-source-v2.png` was generated with the built-in image-generation tool and retained as a material source. It is not used as scientific evidence. The prompt requested a seamless, evenly lit muted olive/umber living dermal armour swatch with minute rounded tubercles, pores and irregular fine organic microstructure; it excluded fish silhouettes, plate outlines, lettering, large blotches, metallic armour, hard cracks and repetitive tiles.

The builder derives three UV images:

- `armour-detail-v2.png`: subdued image-derived microcolour modulation and authored plate seam paths.
- `armour-normal-v2.png`: fine dermal relief and narrow seam normals.
- `armour-roughness-v2.png`: restrained variation in wet bony surface roughness.

Authored vertex pigmentation supplies broad countershading. The generated swatch is deliberately subdued so it does not replace the anatomical form with noise. Fin rays use fine pigmentation instead of thick applied cords. The exporter repairs Blender 5.2 secondary material primitives that otherwise lose their vertex pigmentation. The LOD bakes the textured outer armour modulation into vertex colours while preserving untextured cap and oral pigment, disconnects all texture inputs and physically reduces geometry while retaining the complete rig and sockets.

## Rig and motion

The skeleton has 12 exported joints including its non-deforming root (the exact exported joint list is in `validation.json`). Armour and eyes follow `body`; they are never influenced by tail or oral deformation. Four posterior bones distribute swimming curvature. Paired proximal/distal pectoral bones retain small, separately timed adjustments; the dorsal fin and oral tissues have their own bones. Root identity is preserved, and identity scale tracks inserted by the exporter are removed without changing the binary buffer.

| Clip | Duration | Performance |
| --- | ---: | --- |
| Idle | 2.4 s | Low tail drift, breathing and delayed fin settling. |
| Swim | 2.4 s | Two traveling tail cycles, restrained body roll and fin trim. |
| TurnLeft / TurnRight | 1.6 s each | Load, bank and curved posterior follow-through, then recovery. |
| Dive / Rise | 1.4 s each | Small preparatory pitch, vertical attitude change and delayed caudal correction. |
| Attack | 1.0 s | Short shield-led contact gesture with preparation and a tail-powered push. |
| Bite | 0.5 s | Ventral oral opening/compression with attached mouth corners. |
| Heavy | 1.1 s | Stronger shield brace and posterior drive, followed by settling. |
| Hit | 0.6 s | Fast impact, opposing recoil and delayed tail response. |
| Death | 1.6 s | Diminishing posterior motion, partial roll and a held terminal pose. |
| Guard | 1.0 s | Restrained fin deployment with breathing and balancing motion. |
| Parry | 0.367 s | Rapid shield attitude adjustment and tail correction. |
| Dodge | 0.4 s | Coil, lateral displacement, bank and delayed caudal whip. |
| Eat | 1.2 s | Two unequal oral pulses with a low feeding posture. |
| Stagger | 1.2 s | Successively smaller, opposing recovery efforts. |
| Ability | 1.8 s | Controlled paired-fin deployment, slight asymmetric trim and release. |
| Growth | 1.5 s | Relaxed fin extension and breathing, without moulting or scale animation. |

Idle, Swim, Guard and Eat loop exactly. Other actions recover to neutral except Death. Compatibility action names do not establish Devonian gameplay abilities. No head hinge or leg-like fin action has been added.

## Reproduction and delivery

From the repository root, with Blender 5.2 and the repository's Node dependencies:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/bothriolepis/build.py
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/bothriolepis/finalize.py
node tools/devonian/creatures/bothriolepis/audit-export.mjs
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/eye-audit.py -- ../devonian-authoring/bothriolepis/v2-eye-audit ../devonian-authoring/bothriolepis/v2-eye-audit/selectors.json
node tools/devonian/creatures/bothriolepis/motion-review.mjs
```

The builder writes **local candidates**, not public assets. Its source is `../devonian-authoring/bothriolepis/bothriolepis-v2.blend`; final GLBs and four matching portraits are in the sibling `v2-candidate/` directory. `--preview` lowers preview image resolution; never ship its 1200×900 selection render. `--skip-renders` is only for geometry-identical export/LOD maintenance; any visible change requires the full render pass.

After reviewing all outputs, copy the candidate's `bothriolepis*` files into `public/assets/devonian/creatures/`. The integration owner performs lossless packaging, shared intake validation and commits. Raw candidate GLBs are already under 25 MB. Do not run the older Cambrian card/LOD writers against these Devonian paths.

## Review evidence

All new stills are rendered by importing the actual exported GLB back into Blender. Local evidence includes:

- `Idle-v2.png`, `Swim-v2.png`, `Bite-v2.png`, `Eat-v2.png`, `Heavy-v2.png`, `Ability-v2.png`, `Guard-v2.png`, `Dodge-v2.png`, `Death-v2.png`, `TurnLeft-v2.png`.
- `eyes-front-v2.png`, `eyes-side-v2.png`, `eyes-dorsal-v2.png`, `eyes-threequarter-v2.png`.
- `v2-eye-audit/report.json` and central cross-section SVGs, calculated from the exported globe polyhedra and continuous head.
- `webgl-<clip>-v2.png` for every clip, `motion-review-v2.webm`, and `playback-validation-v2.json`, produced by actual Three.js animation playback.
- `validation.json` for normalized skin weights, finite transforms, root stability, unique clip motion, looping endpoints, socket bind alignment, full/LOD skeleton agreement, texture-free LOD and actual reduction.

The screenshots and volume measurement address different quality requirements. An eye can pass the volume threshold and still have a poor orbital silhouette; both are reviewed. Likewise, structural animation tests do not replace watching timing and checking the mouth/fin attachments through their poses.

The integration review also includes `parent-fixed-Bite.png` and `parent-fixed-Eat.png`: directly lit, close underside views imported from the corrected actual GLB. The four portraits and full action/eye render suite were regenerated after the mouth correction.

Final packaged runtime review loaded the production viewer and selected all 18 clips without browser errors. Paused Swim, Bite, Eat, Heavy and terminal Death frames were inspected alongside the corrected close underside Blender views. The exact packaged eye-volume samples are 78.69% / 78.64% in the full model and 78.67% / 78.62% in the reduced model; both continuous heads are closed with no temporary caps or ray disagreements. Local viewer evidence is in `../devonian-authoring/viewer-release-review/`.
