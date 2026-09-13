# Michelinoceras — initial preview

Original Blender reconstruction of **Michelinoceras currens** (Barrande), using the Lower Devonian Sardinian shell reference Modena19380, Gnoli1982 Plate2Fig1. This is a complete initial asset, pending a later refinement pass. No public/shared files are written by this author; the integration agent packages and publishes it.

## Anatomical decisions

The intact shell is a smooth circular orthocone with an included taper of approximately7°. It has a real thick aperture edge, continuous internal wall, curved chamber-reference septa and a narrow subcentral siphuncle. Interior reference parts remain inside the living exterior. Neither sutures nor internal septa are depicted as external ribs. All shell parts are rigidly weighted to `body`.

A compact mantle and head project from the open living chamber. Ten individually articulated, continuously skinned arms carry restrained low oral folds; they lack invented modern sucker discs, hooks, squid fins or enlarged capture clubs. The oral recess is lined and blind-ended with depth; two small curved corneous jaw solids have separate bones. A returned-wall funnel has an actual opening and interior reservoir. Paired dark eye solids sit deeply inside the closed continuous head, without rings or counted ornamental pads. These soft parts are editable comparative reconstructions, not preserved anatomy of Modena19380.

**Evidence limits:** Gnoli described four phragmocone fragments, the best28mm. The complete adult outline, living chamber length and .5m working living scale do not follow directly from a complete fossil. Arm number/length, eyes, hyponome, mouthparts, folds, pigment and movement are uncertain. The10-arm crown is a conservative comparative choice, not proof of squid-like differentiated tentacles. See [research.md](research.md) for primary references and distinctions from Silurian/other generic material.

## Original source and materials

Local authoring root: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/michelinoceras/v1/`.

- `michelinoceras.blend`: original full rig, UV surfaces, embedded images and all19 actions.
- `candidate/`: full, reduced GLB, metadata and four matching portraits.
- `references/`: GnoliPDF, extracted text and inspected plate.
- `review-export-full/`, `review-export-lod/`: actual exported model renders.
- `audit-full/`, `audit-lod/`: decoded geometry, hash-bound volume reports and eye cross-sections.
- `source/`: reproducible source/texture snapshot, also tracked in this directory.

Original imagegen shell albedo is preserved unmodified with [provenance](imagegen-provenance.md); derived shell normal/roughness maps are subtle. Soft-skin pigment and relief are independently authored in `materials.py`. No image is used as anatomical proof. UV seam faces are explicitly unwrapped. Full textured meshes export neutral white `Color`; actual pigment is separately baked in linear colour to `BakedPigment` for the texture-free LOD, avoiding texture×vertex-colour darkening.

## Rig, actions and sockets

166 bones: identity `root`, rigid `body`, retracting `head`, independent `funnel`, paired corneous jaws and10 chains of16 arm sections. Full and LOD preserve the same bone graph. The three nested version1 anchor extras attach mouth and swallow to head and primary grasp/contact to arm0. Arm position convention is editable and does not prescribe game damage rules.

| Action | Seconds | Authored interpretation |
|---|---:|---|
| Idle |2.4|Low arm exploration, mantle breathing and funnel pulse; seamless.|
| Swim |2.4|Three restrained jet pulses with delayed arm streaming and modest rigid trim; seamless.|
| TurnLeft/TurnRight |1.6|Opposing funnel deflection, arm asymmetry and small whole-shell heading trim.|
| Dive/Rise |1.6|Funnel/arm compensation and rigid shell pitch.|
| Attack |1.0|Crown preparation, forward gathering, corneous-jaw gesture and recovery.|
| Bite |.5|Distinct upper/lower corneous opening/closure inside the oral chamber.|
| Heavy |1.1|Stronger anticipated crown gather, mantle reach and delayed recovery.|
| Hit |.6|Asymmetric recoil and protective soft-part withdrawal.|
| Death |1.6|Relaxed splayed arms, modest shell list and held terminal pose.|
| Guard |1.0|Protective shallow retraction and breathing; seamless.|
| Parry |.4|Brief asymmetric withdrawal and arm deflection.|
| Dodge |.4|Anticipated funnel-driven escape gesture and trailing arms.|
| Eat |1.4|Repeated jaw cycles and inward arm transfer; seamless.|
| Stagger |1.2|Damped alternating trim with independent arm lag.|
| Ability |2.4|Repeated stronger funnel pulses with restrained orthocone pitch.|
| Growth |1.5|Unscaled mantle/arm extension and relaxed recovery.|
| Grab |1.4|Spreading anticipation, closing crown and recovery.|

The bind pose follows Blender−Y/glTF+Z forward for shared compatibility. That is not a claim of habitual horizontal locomotion; orthocone trim/jet studies motivate restrained motions. No action bends or scales the shell. LOD retains Idle,Swim,Death. Identity-only exporter scale tracks are verified and removed; non-identity scaling would fail validation.

## Reproduction

Run from repo root. Blender on this host needs authorized unsandboxed execution for Metal initialization and `--threads 2`.

```sh
python3 tools/devonian/creatures/michelinoceras/materials.py
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/michelinoceras/build.py
python3 tools/devonian/creatures/michelinoceras/validate.py
/Users/hoai/.local/opt/node/bin/node tools/devonian/creatures/michelinoceras/export_audit.mjs
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/michelinoceras/audit.py
MIC_IMPORT=full MIC_RENDER=preview /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/michelinoceras/render.py
MIC_IMPORT=full MIC_RENDER=sequence /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/michelinoceras/render.py
MIC_IMPORT=full MIC_RENDER=portrait /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/michelinoceras/render.py
MIC_IMPORT=lod MIC_RENDER=lod /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/michelinoceras/render.py
python3 tools/devonian/creatures/michelinoceras/finish.py
```

## Review and remaining work

See machine-readable `validation.json`, `review-evidence.json`, `skeleton-graph.json` and `delivery.json` for final exact counts, geometry/animation checks, source hash and file hashes. Eye audit samples each actual closed eye solid independently, uses actual head triangle parity in3 ray directions, excludes decorative additions, and reports conservative confidence bounds. The head has no artificial audit caps.

Initial checks cover actual GLB side/dorsal/three-quarter, eye, aperture/funnel and oral views, major action extremes, sequential Swim/Heavy/Grab poses, actual reduced Idle/Swim/Death and matching1600×1200 selection/800×600 card/256×192 thumb/1200×900 studio portraits. Precise arm-root sculpt fusion, complete arm-to-arm contact/transition refinement, adhesive-fold coaptation and more resolved soft anatomy remain later art work. Selected fossils cannot establish those soft details; keep uncertainty visible rather than adding confident unsupported anatomy.
