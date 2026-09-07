# Devonian model production contract

The 21 subjects and 29 scenery families are in [the natural-history brief](../redesign/07-devonian-design.md).
This production adds assets and specimen inspection, not Devonian gameplay rules. Cambrian stays the active game era.

## Ownership and delivery

Each creature has a dedicated author agent. Only that agent edits its `tools/devonian/creatures/<id>/`
source directory and `public/assets/devonian/creatures/<id>*` files. The scenery author owns
`tools/devonian/props/` and `public/assets/devonian/props/`. The integration agent owns shared tools,
catalogues, viewer, tests and commits. Authors must not switch git branches, commit, merge, or edit
Cambrian assets/shared code. All agents share the same checkout.

Local high-resolution `.blend` sources, concept images, renders and intermediate files belong in
`cambrian/local/devonian-authoring/<id>/` (relative to the outer workspace, outside this checkout).
Commit reproducible builder scripts, modest texture inputs and source notes with references.
No external model download or image is a substitute for anatomical review. Use imagegen where a
concept or bitmap texture improves the result; inspect it and preserve prompts/provenance.

For every creature deliver:

- `<id>.glb`: detailed original skinned model with all applicable clips, below 25 MB.
- `<id>.lod1.glb`: genuinely reduced geometry, same skeleton and sockets, retaining Idle,
  Swim/Crawl and Death. Aim for at most 40% of full triangles while preserving the silhouette.
- `<id>.png` studio view and `<id>.select.png` transparent 1600×1200 three-quarter portrait.
  `<id>.card.png` and 256×192 `<id>.thumb.png` must match the final model.
- `<id>.json`: metadata `{id,name,species,provenance,description,lengthMeters,modelLength,
  locomotion,clips,looping,anchors,sources,notes}`. `lengthMeters` is the reviewed representative
  scale, not an invented species maximum. `modelLength` is the exported bounding length along +Z.
  `anchors` is the exported socket name list. `clips` and `looping` are exact names.
- `tools/devonian/creatures/<id>/README.md`: anatomy, uncertainties, original source location,
  complete reproduction commands, clip meanings/timings, review renders and validation results.

Agents may deliver raw GLBs; integration will compress losslessly. Do not import legacy build
modules in a way that runs their main routines or overwrites their hardcoded asset paths.

## Geometry and appearance

Model convincing contiguous anatomy, not intersecting stock spheres used as the finished body.
Use shaped lofted surfaces, accurate plates, fin rays/membranes, real oral openings and detailed
appendages appropriate to the species. Preserve natural asymmetry only where justified.
Mottled pigmentation, material transitions and fine normals should read under neutral studio light.
Use black/dark reflective eyes, not bright painted eyeballs; avoid metallic cuticle by default.
Vertex pigmentation plus embedded normal maps supports the existing recolouring machinery;
embedded albedo is allowed where necessary. Name material families clearly (body/eyes/fins/legs/
accent/underside). Model dimensions and hidden anatomy require cited reference and honest uncertainty.

## Coordinates, skeleton and sockets

Export glTF +Z forward, +Y up, +X anatomical left. Blender +Z up / -Y forward naturally converts.
Root remains identity in all clips; no animation scale channels. Use a body bone under root for
local dynamic posing; fins/jaws/limbs must be weighted to appropriate bones. Rigged meshes must
have normalized nonzero weights and no movement of rigid armour or shell by unrelated bones.

Required non-deforming socket objects parented to real anatomical bones:
`anchor_mouth` role `mouth`, `anchor_mouth_inside` role `swallow`,
`anchor_attack_primary` role `attack`. For jawless/filtering animals the last is a body/contact
reference, not a claim of biting or predation. Add meaningful paired grasp/attack/support/jet
sockets where anatomy needs them. Retain the compatible extras structure on full and LOD:

```
{"cambrianAnchor":{"version":1,"role":"mouth","parentBone":"jaw"}}
```

For CCD feeding chains only, add `chain` (proximal→distal), `effectorBone` and `solver:"CCD"`.
Never include root/body/locomotor chain bones merely to make CCD metadata nonempty. A fixed mouth
socket is valid. Socket position must be parent-local and match the actual feeding opening after
Blender→glTF axis conversion. Inspect exported JSON; Blender custom properties must retain the
nested object, not encode a JSON string. Parent can add socket JSON from an `anchors.json` manifest
if needed: `{id:[{name,bone,point:[Blender world bind x,y,z],role,chain?,effectorBone?}]}`.

## Animation and visual checks

At 30 fps, author distinct Idle (2.4s), Swim and/or Crawl (2.4s), TurnLeft/TurnRight (1–2.4s),
Dive/Rise (1–2.4s), Attack (1s), Bite (.5s), Heavy (1.1s), Hit (.6s), Death (1.6s),
Guard (1s), Parry (.35s), Dodge (.4s), Eat (.8–1.6s), Stagger (1.2s), Ability (1.2–2.4s).
Add Moult (1.5s) only to arthropods; Growth (1.5s relaxed maturation display without scaling)
for others. Grab is required for actual grasping appendages. These action names maintain model
compatibility; jawless/particle feeders use oral/contact/withdrawal gestures, not invented teeth.

Each action must have intentional anticipation, contact/peak and recovery, with independent
appendage/jaw/fin dynamics. Locomotion/Idle/Guard/Eat loop seamlessly. One-shots return to neutral
except Death, which holds a natural terminal pose. Avoid copying one sine wave into every action.
No whole-model spins standing in for anatomical animation. Ground animals may Dive/Rise as
lower/raise body gestures; shells must remain rigid. Fish never shed an exoskeleton.

Render and inspect at least Idle, locomotion, Bite/Eat, Heavy/Ability, Guard, Dodge and Death,
including lateral and frontal views. Validate all exported clips have nonzero duration, finite
transforms, distinct motion, stable root and no scale channels. Check deformation and appendage
clearance, LOD reduction and socket alignment. Report deficiencies and fix them before delivery.

## Art review required after the initial specimen releases

The first eight published specimens are integration examples undergoing a further art pass.
A complete file set or structural test pass does not establish finished visual quality.
Give every subject its own anatomical and material decisions and review time; do not reuse a
fish outline, eye treatment, armour pattern or action curve merely to increase roster throughput.

For bulging oval eyes, at least **50% of globe volume** must lie inside the continuous surrounding
head/body envelope. Aim for **65% or more** to leave a practical margin. Report deterministic
volume sampling against the actual body surface or an equivalent verified geometric calculation;
counting visible surface vertices is not a volume measurement. Fit lids to the actual skin/globe
intersection. An exterior hoop or the concave backside of an eye must not remain exposed. Inspect
front, side, dorsal and three-quarter close-ups; measure both eyes independently.

Refine major silhouettes before surface detail. Head profiles, jaw hinges, muscular body transitions,
fin roots and armour should form a coherent animal. Additional triangles, protruding patches or
noise do not compensate for weak anatomy. Use Blender modelling, subdivision, bevels, sculpt-style
surface refinement, UV work and baking as appropriate. Image-generated concept/material art can help,
but must follow anatomical constraints and must not be treated as scientific evidence. Full models
need deliberate natural material structure and roughness; use UV albedo/normal/roughness maps where
these improve the result, with baked vertex pigmentation for distant LODs.

Model the mouth's palate, walls, floor and throat. Jaw-bearing creatures need actual articulated jaw
bones used in their feeding/attack clips. Lining and teeth must remain coherent throughout opening,
maximum gape and closing, without clipping, detached parts, inverted faces or a flat black endcap.

Animations need convincing changes in speed, anticipation, effort, recovery and delayed secondary
motion. Review actual playback, including turns and transitions, rather than approving a set of
nearly identical static poses. Preserve rigid bones/armour and stable roots; increase expressiveness
through anatomically appropriate body, jaw, fin and appendage motion rather than deformation errors.
