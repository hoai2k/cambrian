# Doryaspis nathorsti — V2 reconstruction

A separately authored Blender reconstruction of the Early Devonian pteraspidiform jawless fish. V2 replaces the initial triangular silhouette, floating eyes, thick pale edging and manufactured longitudinal ribs. The candidate remains local for integrator packaging and actual-viewer review; the published V1 files are preserved separately.

## Evidence and anatomical decisions

The primary reference is the D. nathorsti reconstruction in supplementary figure 1b of [Botella, Fariña and Huera-Huarte (2024)](https://www.nature.com/articles/s42003-024-06837-8), including its dorsal and lateral views. The short fixed ventral pseudorostrum, broad flat dorsal shield, deep ventral shield, posterior cornual roots, forward-curved lateral tips and long tapered posterior were reconstructed from these views. The pseudorostrum is approximately 13% of the complete depicted outline; that is an approximate image proportion, not a fossil measurement. The dorsal spine in figure 1a belongs to Panamintaspis and is deliberately absent here.

[Pernègre (2002), the primary genus revision](https://doi.org/10.1671/0272-4634(2002)022%5B0735:TGDWHF%5D2.0.CO;2) revises D. nathorsti and describes a complete caudal fin; only its abstract was accessible during production. [Tarlo (1962)](https://www.app.pan.pl/archive/published/app07/app07-249.pdf) describes a characteristic network of stellate ridges. Accordingly, the surface uses restrained irregular stellate dermal relief rather than uniformly extruded cables. The fine marginal denticles are integument ornament, not functional jaw teeth.

The cephalic shield and ventral pseudorostrum form one closed, supported surface. Thin anterior cross-sections use thickness-limited edge curvature so their top and bottom cannot fold across each other. Subdivided cornual surfaces are united with the body of the shield at their roots, rather than being hinged appendages. Small dorsolateral globes intersect that actual envelope. There are no external orbital hoops or artificial eye pads. Two small single branchial recesses sit near the cornual bases. The mouth faces upward above the fixed ventral projection. It is a genuine recessed cavity cut into the closed shield with a curved mucosal wall and pharyngeal termination. The living inner lining has modest local movement; the armour, aperture boundary and pseudorostrum stay rigid. No jaws, teeth for biting, mammalian tongue, dorsal spine, paired fins or leg joints were invented.

The scaled body axis continues downward through the caudal fin, making the tail hypocercal. The fin and the adjacent scaled axis share interpolated weights at the attachment. The visible outline of a hypocercal fin does not by itself require its lower membranous lobe to be the larger one. The posterior has shallow lozenge squamation and a small smoothly curved caudal membrane.

Pigmentation, exact integument thickness, detailed soft oral anatomy, branchial recess depth and all action timing are artistic interpretations. Feeding mode, pseudorostrum function and benthic versus water-column habits remain uncertain. The 2024 hydrodynamic work informs a plausible fixed-shield/flexible-tail contrast, not a claim that these animations reproduce observed behaviour. A 0.20 m individual is an illustrative ecological scale, not a proposed species maximum.

## Materials and source

`build_v2.py` is the complete independent geometry/rig/animation authoring source. `materials_v2.py` creates seven UV material sets: shield, posterior, pseudorostral margin, caudal membrane, eye, oral tissue and curved flank armour. Each has an albedo, tangent-space normal and roughness image. The full GLB has neutral white `COLOR_0`, so the base-colour map is not multiplied by duplicate pigmentation. The LOD has sampled UV pigmentation, converted from sRGB to linear, in `COLOR_0` and uses no texture maps. Each reduced mesh uses one vertex-colour material so all original tissue regions retain their pigment. `export_all_vertex_colors=False` is explicit: Blender 5.2 otherwise exports the unused colour layer and can remap the intended layer to white. Reduced specular response keeps the quiet bronze/olive colouring visible under the review lights.

`pigment-source.png` is an original imagegen pigment swatch, not generated anatomical geometry. It was inspected, softened and combined with separately authored regional pigmentation, sutures, stellate ornament, posterior scales and fin rays. The generated colour is speculative. Prompt:

> Use case: scientific-educational. Asset type: original speculative diffuse skin pigment atlas for a carefully researched Doryaspis nathorsti 3D reconstruction. Create landscape 2:1 seamless-wrap albedo texture, completely flat unlit material swatch, no animal, no objects, no scene, no labels. Horizontal left-to-right runs anterior armoured shield to posterior scaled skin. Vertical top and bottom edges are a muted warm grey-beige belly, grading through quiet brown olive flanks at quarter and three-quarter height, into dark peat charcoal and subdued rusty bronze along the middle dorsal band. Organic sparse dark branching camouflage islands, low contrast rust-olive undertones, very fine irregular dermal granulation. Think small ancient aquatic animal, restrained living integument over dermal armour. Anterior left half calmer with delicate mottled regional pigmentation; posterior right half slightly darker with elongated muted pigment flecks. Avoid generic rock texture, thick scaly tiles, coarse random noise, stripes, metallic sheen, lighting gradients, glints, highlights, visible armour seams or ribs. Anatomical sculpted relief and scales will be authored separately. Diffuse colour only, natural low contrast microtexture, readable broad regional pigment. All pixels are pigment material and the top and bottom edges match seamlessly.

Editable source: `../devonian-authoring/doryaspis/v2/doryaspis-v2.blend`. Candidate exports and portraits: `../devonian-authoring/doryaspis/v2/candidate/`. Local scientific reference PDF and its rendered pages are study-only and are not shipped as game art. V1 source, Blender files, GLBs and portraits are preserved in `../devonian-authoring/doryaspis/v1/`.

## Rig and motion

Twelve bones: identity root, body, rigid shield, four small oral controls, and five sequential posterior/caudal bones. There is no jaw bone because this animal was jawless. The inner mucosal vertices blend between the shield and their segment-local oral control; the mouth boundary stays attached. All three sockets retain the required nested `cambrianAnchor` extras and bone-local transforms. Mouth and swallowing sockets refer to the actual dorsal oral recess; the primary attack/contact socket refers to the fixed pseudorostral tip.

| Clip | Seconds | Authored motion |
| --- | ---: | --- |
| Idle | 2.4 | Gentle posterior waves, small bank and alternating oral pulses |
| Swim | 2.4 | Accelerating tailbeats with burst/coast modulation and delayed distal motion |
| TurnLeft / TurnRight | 1.6 | Directed shield bank, proximal counter-curve and delayed caudal recovery |
| Dive / Rise | 1.4 | Pitch anticipation and independent posterior vertical trim |
| Attack | 1.0 | Rearward anticipation, approach/contact impulse and withdrawal |
| Bite | 0.5 | Compatibility name for an oral intake pulse and small shield tilt; no biting jaw |
| Heavy | 1.1 | Longer preparation, banked body impulse and stronger tail counter-motion |
| Hit | 0.6 | Short lateral recoil and decaying correction |
| Death | 1.6 | Brief diminishing tail kicks, restrained roll and held terminal posture |
| Guard | 1.0 | Repeating station-holding trim |
| Parry | 11/30 | Brisk shield bank with delayed tail response |
| Dodge | 0.4 | Rapid bank and lateral body displacement with opposed posterior curvature |
| Eat | 1.6 | Three oral lining pulses with gentle tail station holding |
| Stagger | 1.2 | Several diminishing lateral corrections |
| Ability | 2.4 | Rising inspection posture, directed bank and two separated intake gestures |
| Growth | 1.5 | Relaxed stretch/trim and return without scale animation |

Idle, Swim, Guard and Eat are seamless loops. Death holds its terminal pose; the other non-looping actions recover. The root remains fixed and there are no scale channels. Action names support the runtime contract and do not specify Devonian gameplay.

## Reproduction and review

Run from the repository root. Blender on this host requires an unsandboxed invocation for its Metal initialization; `--threads 2` is intentional.

```sh
python3 tools/devonian/creatures/doryaspis/materials_v2.py
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/doryaspis/build.py
python3 tools/devonian/creatures/doryaspis/validate_v2.py
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/doryaspis/check_pose_v2.py
DORY_RENDER=all /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/doryaspis/render_v2.py
DORY_RENDER=oral-lit /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/doryaspis/render_v2.py
DORY_RENDER=motion /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/doryaspis/render_v2.py
python3 tools/devonian/creatures/doryaspis/review.py
node tools/devonian/creatures/doryaspis/export_audit.mjs
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/eye-audit.py -- ../devonian-authoring/doryaspis/v2/audit-full tools/devonian/creatures/doryaspis/audit-selectors.json
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/eye-audit.py -- ../devonian-authoring/doryaspis/v2/audit-lod tools/devonian/creatures/doryaspis/audit-selectors.json
```

Build, validation and portrait preparation default to the local candidate directory. `DORY_PUBLISH=1` is an explicit publication override for the integrator after independent review. Do not rebuild over parent-packaged exports. The packager handles final lossless compression.

`validation.json` records actual decoded geometry counts, clip signatures, seamless loop checks, normalized weights, root/scale checks, exact socket alignment and oral-control deltas for all feeding actions. `eyes-v2.json` records authoring coordinates and a deterministic placement estimate. The independent exported-polyhedron parity reports under `v2/audit-full/` and `v2/audit-lod/` bind their measurements to exact GLB SHA-256 hashes and exclude artificial rims. Final review results are recorded in `review-evidence.json`.

## Final quantitative candidate checks

The raw full GLB has 177,248 triangles; the actual LOD has 60,064 (33.9%). Both contain the same twelve-bone skeleton and all three sockets. Full retains all eighteen clips; LOD retains Idle, Swim and Death. The full export is approximately 22.45 MB before parent lossless packaging.

Independent actual-volume audit: full left/right eyes **80.97% / 81.00%** embedded; LOD **80.94% / 80.95%**. Every conservative 95% lower bound exceeds 80.6%. Both head envelopes are closed without added caps or nonmanifold edges. `eyes-export-verified.json` records both final candidate hashes and complete reports. A few numerical ray-direction disagreements (0–4 of approximately 61,000 accepted samples per eye) are included conservatively in those bounds.

`pose-validation.json` checks all eighteen clips at nine exact poses each. Every source vertex has normalized named-bone weights. Over 60,000 rigid shield vertices follow their bone transform to floating-point tolerance; only the actual inner mucosal vertices depart by less than 0.01 authoring units. The posterior remains rigid through y=0.65, beyond the shield's y=0.615 rear edge, so the overlapping neck insertion is maintained before tail bending begins.


The completed review includes all eighteen final action portraits and seven sequential pose sheets with sampled playback GIFs (Swim, TurnLeft, Heavy, Dodge, Eat, Death and Ability). `review_motion.py` assembles these from the saved rendered frames. Full and LOD GLBs were re-imported and rendered separately, including strong banking poses and the retained LOD clips. The final four PNGs all derive from the same approved 1600×1200 Blender portrait. The parent integrator performs packaging, main-viewer checks and the main merge.

## Integrated release review

The parent independently checked the final losslessly packaged full and reduced GLBs; `eye-packaged-review.json` records their exact hashes and containment results. Both specimens passed the shared asset/anchor checks and the built main viewer loaded all eighteen actions without browser errors. Paused action selection, frame stepping, feeding and terminal Death poses were inspected. Final matching portraits and the refreshed specimen catalogue accompany these assets. Editable Blender sources and extended visual recordings remain under `cambrian/local/devonian-authoring/`.
