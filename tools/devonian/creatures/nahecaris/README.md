# Nahecaris stuertzi — initial preview specimen

Independent Blender phyllocarid reconstruction for the Devonian roster. This is a complete **initial preview**, with uncertainty and later refinement separated from basic export/eye validity. No previous Nahecaris source or model was overwritten.

## Anatomy and evidence

Two deep carapace valves shelter the thorax while leaving a wide ventral opening. Each has a subdued continuous mesolateral carina and fine interrupted striae; the dorsal plate and short rostral plate complete the shield. No long serrated shrimp rostrum or conspicuous posterodorsal spine is added. The head carries compact reconstructed eyes beneath the rostral plate, finer branching antennules, stout biramous second antennae and paired mandibles/maxillary lobes.

Eight pairs of biramous thoracic appendages form the distinctive underside: slender inner branches become shorter posteriorly, while outer branches bear finger-like lobes. Their medial fringes describe a basket open toward the head. Seven abdominal rings lead into a narrow telson and two long furcal rami; this is not a modern decapod tail fan. Modest abdominal appendages follow the comparative archaeostracan arrangement.

The original species study's accessible abstract supplies the major feeding-limb and carapace constraints. Exact ocular bases, appendage proportions, setal density and oral soft anatomy remain inferred. The compact eye treatment follows the historical reconstruction beneath the rostrum, while meeting the user's minimum embedding requirement against an actual continuous head. It is not presented as newly established fossil anatomy.

Primary and academic references, accessed 7 September 2026:

- [Bergström, Briggs, Dahl, Rolfe & Stürmer (1987), species redescription](https://doi.org/10.1007/BF02985909): carapace variation, attachment to head, ventral gape, interrupted or marginally parallel ornament; eight biramous thoracopods with finger-like exopod lobes and progressively reducing endopods. Authors interpret a benthic animal that resuspended substrate and could manipulate larger fragments with mandibles. Stout second antennae may have supported/propelled it. The full subscription article was not accessed; claims are limited to the accessible primary abstract.
- [Early Devonian non-trilobite arthropods from the Iberian Chains (2025)](https://doi.org/10.1080/08912963.2025.2492356): comparative Nahecaris diagnosis, single mesolateral carina, nearly trapezoidal carapace section, dorsal plate and lack of posterodorsal spine. The discussion distinguishes N. stuertzi's often interrupted ornament and subdued anterior tubercle from the new Spanish species. The new species is not copied wholesale.
- [Siveter et al. (2017), Cascolus and malacostracan evolution](https://pmc.ncbi.nlm.nih.gov/articles/PMC5378094/): discussion explicitly notes the biramous antenna of Nahecaris and Oryctocaris. Cascolus's nine-segment thorax and epipods are not transplanted into this model.
- [Rust et al. (2016), Hunsrück arthropod ecology](https://doi.org/10.1016/j.asd.2016.01.004): Early Devonian Hunsrück context and limits of functional interpretations from exceptionally preserved anatomy. Roster animation names do not define its scientific feeding behaviour.
- [Fossil Crustacea of China, academic UvA chapter, Figure 1a](https://pure.uva.nl/ws/files/3311324/6535_UBA003000261_010.pdf): the historical Nahecaris whole-animal reconstruction reproduced from Brooks et al. (1969) was inspected for broad shield, rostrum, compact ocular region and posterior outline. This historical comparison does not supersede the later species redescription. PDF and rendered source figure remain local in `devonian-authoring/nahecaris/references/`.

The **0.12 m representative length is an art/display assumption**, not a measured maximum or a newly measured fossil. Model bounds include the antennae. Pigment, cuticle thickness, fine setae and all movement timing are artistic reconstructions. The model retains Early Devonian Hunsrück provenance.

## Materials and source

Original editable Blender file: `cambrian/local/devonian-authoring/nahecaris/nahecaris-initial.blend`. Candidate family: `cambrian/local/devonian-authoring/nahecaris/initial-candidate/`.

`build.py` contains the individual anatomy. `geometry.py` contains only species-neutral mesh, UV and skinning helpers, copied as function definitions without executing any other creature builder. `materials.py` applies warm regional pigment, deterministic interrupted striae and a restrained original imagegen microtexture (`cuticle-source.png`; full prompt/provenance in `texture-provenance.json`). No generated animal image defines the anatomy.

Full material = regional linear vertex pigment multiplied once by near-neutral UV albedo, with normal and roughness maps. `export.py` bakes that albedo factor once into vertex colour before creating a truly reduced, texture-free LOD. Shell plates remain rigid; flexible-looking movement comes from articulation. Full and LOD retain the same anatomical skeleton and three sockets.

## Nineteen actions at 30 fps

| Action | Seconds | Anatomical intent |
|---|---:|---|
| Idle | 2.4 | Small antennal sensing and low-amplitude basket circulation |
| Swim | 2.4 | Metachronal thoracic/abdominal strokes with delayed abdomen/furca response |
| Crawl | 2.4 | Restrained stout-antenna substrate support/rowing gesture |
| TurnLeft / TurnRight | 1.6 | Asymmetric appendage braking and sequential abdomen yaw |
| Dive / Rise | 1.2 | Body pitch, antennal counterpose and abdominal paddle angle change |
| Attack | 1.0 | Compatibility contact gesture with antenna bracing and mandibular response |
| Bite | 0.5 | Short small-mandible closure, not a giant predatory gape |
| Heavy | 1.1 | Stronger braced mandibular/feeding-basket contact |
| Hit | 0.6 | Recoil and appendage withdrawal |
| Guard | 1.0 | Seamless compact shield and antenna ready posture |
| Parry | 0.35 | Brief left-antenna interception with compact body |
| Dodge | 0.4 | Local lateral recoil and abdominal flexion |
| Eat | 1.2 | Repeating basket strokes, alternating mandibles and slight valve relief |
| Stagger | 1.2 | Decaying multi-phase disturbance |
| Ability | 1.8 | Basket-driven substrate agitation display |
| Moult | 1.5 | Preparatory limb/rim extension without shell rupture or scaling |
| Death | 1.6 | Settled body, relaxed antennae, flexed limbs and held terminal pose |

Idle, Swim, Crawl, Guard and Eat loop seamlessly. One-shots recover to neutral except Death. Root stays identity and has no animated scale. Swimming is an asset compatibility action, not a claim that the species was a pelagic modern shrimp. Full ecdysis is deferred; Moult does not shed the shell. No Grab clip is invented for absent chelate limbs.

## Anchors and validation

`anchor_mouth` and `anchor_mouth_inside` lie at/inside the actual ventral opening. `anchor_attack_primary` follows the left mandible. All have nested `cambrianAnchor` version1/role/parentBone metadata and matching full/LOD bind positions. No empty or locomotor CCD chain is added.

`finalize.py` checks exact bounds, normalized weights, finite geometry, matching skeleton, socket alignment, loop closure, unique motion and root/no-scale constraints. `audit-export.mjs` exports raw candidate geometry for the shared actual-volume eye audit. Both full and LOD must pass >=50% globe volume inside the valid continuous head, with target >=65%; there are no decorative eye pads/hoops. `motion-review.mjs` uses actual Three GLTFLoader/AnimationMixer, audits 91 phases per clip and saves a local playback video plus all-action frames. Essential Blender review includes actual exported full/LOD, eye and lit oral/basket views.

## Reproduce

From repository root (Blender needs host graphics initialization; CPU Cycles is used):

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/nahecaris/build.py
python3 tools/devonian/creatures/nahecaris/finalize.py
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/nahecaris/render.py
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/nahecaris/render.py -- --lod
python3 tools/devonian/creatures/nahecaris/portraits.py
node tools/devonian/creatures/nahecaris/audit-export.mjs
node tools/devonian/creatures/nahecaris/audit-export.mjs --lod
node tools/devonian/creatures/nahecaris/motion-review.mjs
node tools/devonian/creatures/nahecaris/check-candidate.mjs nahecaris
python3 tools/devonian/creatures/nahecaris/delivery.py
```

Run shared `tools/devonian/eye-audit.py` in Blender against each generated geometry directory plus its selectors.json. This uses deterministic uniform volume sampling against actual exported triangles, not eye surface-vertex counts. `portraits.py` derives the studio image and UI sizes from the same 1600×1200 actual-GLB cutout. Final candidate hashes and reports are bound in `delivery.json` after all basic checks. Parent owns lossless packaging, viewer integration and main commits. Later refinement can improve ocular reconstruction confidence, finer limb/setal articulation and material readability; it is not a reason to defer this complete initial specimen.

## Frozen initial delivery

Full/LOD hashes and exact seven-file family are in `delivery.json` and `WORKING_STATE.md`. Full177,975 triangles; LOD54,288 (30.50%); 82matching joints; 19full actions; fourLODclips; threeanchors. Both actual eye-volume audits pass around80% with closed uncapped head. Shared intake and actualThree19clip playback pass. Four final portraits, seven basic close/side/full views and threeLODposes match the final exports. Final lit oral review corrected exterior pigment on the recessed roof. Further fine appendage, oral-surface and material refinement is deferred under the initial-delivery priority.

## V2 shipped — 12 September 2026

`build_v2.py` (with `export_v2.py`, `finalize_v2.py`, `render_v2.py`, `portraits_v2.py`) ports the
approved study off the user reference (`docs/reference/Nahecaris.jpg`): an elongate valve with a
straight dorsal hinge and a flatter flank (`valverows` rewritten, flank exponent .55), extending
to y=1.05; the abdomen's seven somites spaced .28 with overlapping spans so the chain reads
continuous, the telson and furcal rami longer; the eyes larger and standing proud under the
rostrum as the drawing's stalked eyes do (they are arthropod eyes and exempt from the fish-globe
threshold; the audit reports 34%); the antennal rami 1.3× longer. Packaging exact round-trip PASS
at 177,975 / 54,288 triangles; intake PASS; portraits derived from the V2 render. `build.py` still
reproduces V1. The user accepted the study on 12 September; badge cleared.
