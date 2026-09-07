# Palaeoisopus initial preview

Independent reconstruction of Palaeoisopus problematicus based on Sabroux et al. (2024), *New insights into the Devonian sea spiders of the Hunsrück Slate (Arthropoda: Pycnogonida)*, https://doi.org/10.7717/peerj.17766. Institutional original PDF https://bpb-eu-w2.wpmucdn.com/blogs.bristol.ac.uk/dist/3/589/files/2024/10/Sabroux_et_al_2024.pdf . Local authoring preserves the PDF, extracted text and reviewed figures14–19/appendage details. These are research references, not textures.

The 2024 revision supersedes several older interpretations. The model has a robust four-part trunk with cephalon fused to trunk1, short lateral processes, and a long abdomen with four rectangular elements and a lanceolate fifth/telson complex. The precise homology of this terminal structure remains debated. The massive chelifores use the conservative two-scape interpretation; paired fingers articulate as chelae. Palps lack a terminal claw; ventral ovigers have a small terminal claw and an inferred eleven-article arrangement because no complete uninterrupted oviger is preserved.

The four pairs of swimming/walking legs are individually proportioned. WL1 has nine podomeres including its subchelate terminal claw; the three posterior pairs have ten, including a metatibia. Coxa1 subdivisions are rings within that podomere (four,three,two,two in successive leg pairs), not extra freely jointed legs. Posterior coxa2 articles are more elongated. Distal articles are laterally flattened paddles; sparse geometry setae suggest preserved marginal setation. Exact three-dimensional flesh/cuticle thickness, setal density and pigmentation are inferred.

The broad proboscis is a real tubular oral structure folded ventrally/posteriorly at rest. Its mobility is plausible from comparison in the primary paper but not a measured kinematic reconstruction. The preview has a recessed lumen with attached margins. It has no fish jaw, fish teeth or invented internal filter apparatus. Attack/Bite/Heavy/Eat are shared runtime labels for chela grasping, manipulating and proboscis probing equivalents.

## Ocular uncertainty

Sabroux et al. (2024) reinterpret the prominent rounded cephalic features as cuticular and sensory tubercles, not protruding eyes. Their fossil eye positions cannot be resolved. The preview therefore represents low cuticular features and does **not** invent external eye globes. The globe-volume audit is not applicable; the tubercles must never be counted as audited eyes. This is an explicit anatomical uncertainty, not an assertion that the animal lacked eyes.

## Materials and animation

The individual shaped cuticle shells, flattened limb surfaces, chelae and abdomen are editable Blender geometry. Original baked albedo/normal/roughness atlases use muted copper/plum cuticle, modest light edge pigmentation and darker arthrodial tissue. The first preview uses mathematical cuticle art rather than generated imagery; no external texture or model is embedded. Full COLOR_0 is white, avoiding duplicate pigment darkening; the reduced texture-free asset retains linearized colour.

All 18 required action slots plus Grab are authored. Swim uses asymmetric sequential paddle strokes and delayed distal article rotation. Turns brake one side and advance the other; Rise/Dive change paddle/body pitch. Grasping clips anticipate, close chelifores and recover; probing extends the ventral proboscis. Guard spreads the front legs, Parry deflects them, Dodge banks with a quick asymmetric stroke, Stagger has unstable follow-through, Ability combines paddles and probing, and Moult flexes the pose without scaling the body. The Moult preview gesture represents preparatory flexibility, not a fully simulated exuvium separation. Abdomen, palps and ovigers have distinct secondary movement. Death reaches a held final pose. This is aquatic animation, not a claimed terrestrial spider gait or observed fossil feeding behaviour.

## Reproduce

Run from repo root:

```sh
PALAEOISOPUS_QUICK=1 /Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python tools/devonian/creatures/palaeoisopus/build.py
/Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python tools/devonian/creatures/palaeoisopus/render-portraits.py
python3 tools/devonian/creatures/palaeoisopus/check-export.py
PALAEOISOPUS_QA_QUICK=1 /Users/hoai/.local/opt/node/bin/node tools/devonian/creatures/palaeoisopus/review-viewer.mjs
```

Source utility/export scaffolding derives from the validated pipeline. Taxon geometry, cuticle atlas and arthropod motions are independently authored. Editable source: local/devonian-authoring/palaeoisopus/palaeoisopus-v1.blend. Candidate files remain local until parent integration. No shared code, public assets or git changes are made here. User priority is an initial complete roster; extended joint/sculpt/animation refinement is deferred and recorded in the final preview report.

## Preview validation scope

The source has 138 bones. The full model has261,744 triangles; reduced73,286 triangles(28%). Full19 clips include Moult and Grab; reduced Idle,Swim,Death. The exact3 version1 sockets and full/LOD bone graph are validated directly from the GLBs, along with finite normalized weights, nonzero distinct action tracks, no scale channels and neutral-white full COLOR_0.

`check-articulation.py` verifies eight leg chains with9/10 appropriate article counts over76 source poses, exact joint alignment,440 oral vertices bound to the oral-tip bone, and558 fine setal basal centroids buried inside their actual cuticle. The last correction calculates setal placement from the same shaped and rotated paddle surface with a conservative inset; it is not an unanchored row of decorative lines. Each bristle shares its supporting rigid article bone. This is a targeted attachment check, not a complete mesh-intersection proof.

Local `viewer-v1/` captures the actual exported GLBs in Three.js:19 action midpoints plus two phases each, directional full-body views, cephalic detail, ventral proboscis/lumen and LOD. `all-action-review.jpg` combines the action views. The source checks every sampled action frame for finite bounds, neutral returns/loop seams and Death hold. This preview review uses still frames; extended continuous animation and fine-art refinement remain deferred.

Additional reproduction commands:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python tools/devonian/creatures/palaeoisopus/check-articulation.py
python3 tools/devonian/creatures/palaeoisopus/make-review-sheet.py
python3 tools/devonian/creatures/palaeoisopus/freeze-candidate.py
```

Freeze only after renewed export, portrait and actual GLB review; candidate-manifest.json and final-review-v1.json hold exact hashes and known preview limitations.
