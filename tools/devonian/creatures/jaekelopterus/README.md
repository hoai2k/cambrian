# Jaekelopterus rhenaniae — initial preview specimen

Dedicated Blender reconstruction for the Devonian roster. This is a complete initial asset family intended for the **⚠ Preview model** stage; later anatomical/material refinement remains possible. No pre-existing Jaekelopterus model or authoring folder existed when this work began.

## Anatomy and evidence

The carapace is broad and low with rounded anterior corners and lateral oval compound eyes. A pair of small median ocelli is represented flush with the roof. Twelve articulated opisthosomal rings taper toward a posteriorly expanded pretelson and triangular, low-keeled telson. The telson is a rudder; no sting or venom apparatus is invented.

Six pairs of prosomal appendages are distinguished: enlarged chelicerae (I), four pairs of slender non-spiniferous walking limbs (II–V), and one pair of expanded swimming appendages (VI). The two claws have a reinforced manus/fixed ramus and separately hinged free ramus, with inclined large denticles alternating with smaller ones. They are chelicerae, not the pedipalps of a modern scorpion. The non-chelate walking legs end in small terminal tips. Their visible cuticular divisions are simplified into three animated sections each for the initial rig.

Ventral mouth anatomy includes a recessed vestibule, paired animated gnathobasic coxae and small denticles, and a metastomal plate. It has no vertebrate jaw. Shells are rigidly weighted to their own anatomical bone, with darker overlap membranes between segments. Exact cuticle thickness, internal soft tissues, pigmentation and movement are reconstruction decisions. The eyes are full closed globes embedded in the unpadded, continuous carapace; there are no ornamental hoops or eye pads.

Primary references, accessed 7 September 2026:

- [Braddy, Poschmann & Tetlie, Giant claw reveals the largest ever arthropod](https://doi.org/10.1098/rsbl.2007.0491), 2007/2008: J. rhenaniae giant chelicera, enlarged toothed claws, non-spiniferous II–V, expanded pretelson and dorsal telson carina. The approximately 2.5 m giant estimate extrapolates from an isolated roughly 46 cm claw; it is not a complete preserved giant. **1.8 m display length here is a representative art assumption**, not a specimen measurement or revised maximum. Model bounds include forward chelicerae.
- [McCoy et al., All the better to see you with](https://pmc.ncbi.nlm.nih.gov/articles/PMC4571687/), 2015: high visual acuity of J. rhenaniae and robust Jaekelopterus chelicerae. Compound-eye dark cuticular lenses receive restrained wet gloss, not white eyeballs.
- [Bicknell et al., Biomechanical analyses of pterygotid sea scorpion chelicerae](https://pmc.ncbi.nlm.nih.gov/articles/PMC9745958/), 2022: separate fixed/free rami and hinge, reinforced J. rhenaniae chela morphology, possible hard-prey specialization. Motions do not claim a measured pinch force.
- [Lamsdell & Selden, Babes in the wood](https://pmc.ncbi.nlm.nih.gov/articles/PMC3679797/), 2013, Jaekelopterus section and Figs 17–22: comparative J. howelli appendage VI, coxae, metastoma, trunk and triangular telson. This is explicitly comparative support, not evidence that every represented postcranial detail is preserved in J. rhenaniae. The massively enlarged second intermediate denticle of older J. howelli is not copied into rhenaniae.

The Early Devonian Rhineland provenance is retained. This animal is not silently assigned to a Late Devonian Cleveland ecosystem. Colour is a plausible aquatic cuticle palette, not fossil colour evidence. Fine imagegen ornament is an artistic material source, never anatomical evidence.

## Original and game sources

- Original editable source: `cambrian/local/devonian-authoring/jaekelopterus/jaekelopterus-initial.blend`.
- Candidate family: `cambrian/local/devonian-authoring/jaekelopterus/initial-candidate/`.
- Reproducible anatomy: `build.py`; region-specific UV/PBR: `materials.py`; actions: `motion.py`; full/physical LOD: `export.py`.
- Imagegen source: `cuticle-source.png`, complete prompt/provenance in `texture-provenance.json`. The source is normalized to a very low contrast near-neutral UV factor and complemented by deterministic normal/roughness maps and spatial vertex pigmentation. It is not used as an unreviewed animal design.
- Full colour is vertex pigment × near-neutral UV albedo exactly once. LOD bakes that albedo factor once into the vertex pigment, removes all texture links and decimates geometry to approximately 27%. Both have the same skeleton and sockets.

## Actions (30 fps, in-place)

| Action | Seconds | Intent |
|---|---:|---|
| Idle | 2.4 | Restrained paddle/chelicera exploration, tiny body settling |
| Swim | 2.4 | Paddle rowing with delayed distal pitch and low trunk/telson response |
| Crawl | 2.4 | Alternating walking-limb phases with articulated distal lift |
| TurnLeft / TurnRight | 1.6 | Asymmetric paddle braking and successive trunk yaw |
| Dive / Rise | 1.2 | Small body pitch with paddle angle change and delayed tail |
| Attack | 1.0 | Short cheliceral anticipation, forward effort and recovery |
| Bite | 0.5 | Compatibility name for short cheliceral closure/gnathobasic response |
| Heavy | 1.1 | Stronger braced two-claw capture motion |
| Grab | 1.2 | Paired cheliceral capture with slight left/right timing separation |
| Hit | 0.6 | Recoil and appendage withdrawal |
| Guard | 1.0 | Seamless ready posture with open chelicerae |
| Parry | 0.35 | Brief predominantly left cheliceral interception |
| Dodge | 0.4 | Local lateral body shift and paddle push |
| Eat | 1.2 | Seamless small claw manipulations and alternating gnathobases |
| Stagger | 1.2 | Decaying multi-phase body/joint disturbance |
| Ability | 1.8 | Broader cheliceral display with paddle bracing |
| Moult | 1.5 | Preparatory segment/leg extension without scale channels or shell rupture |
| Death | 1.6 | Settling, partial leg flexion and held terminal posture |

Idle, Swim, Crawl, Guard and Eat close seamlessly. One-shots return to neutral except Death, which holds. Moult represents a preparation gesture, not a claim to simulate full ecdysis. Locomotor timing is an inferred artistic reconstruction. Root is unanimated identity; all movement occurs under body or anatomical joints.

## Anchors

`anchor_mouth` and `anchor_mouth_inside` lie at/inside the actual ventral oral aperture. `anchor_attack_primary` follows the left fixed chelicera. Paired `anchor_grasp_left` / `anchor_grasp_right` follow real chelicera bones. Extras retain nested `cambrianAnchor` version 1, role and parentBone. These initial grasp sockets deliberately omit CCD rather than falsely adding locomotor/body chains.

## Reproduction and review

From repository root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/jaekelopterus/build.py
python3 tools/devonian/creatures/jaekelopterus/finalize.py
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/jaekelopterus/render.py
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/jaekelopterus/render.py -- --lod
node tools/devonian/creatures/jaekelopterus/motion-review.mjs
node tools/devonian/creatures/jaekelopterus/audit-export.mjs
node tools/devonian/creatures/jaekelopterus/audit-export.mjs --lod
```

Run `tools/devonian/eye-audit.py` in Blender against each emitted geometry folder and its `selectors.json`; this samples actual globe volume against the actual closed carapace and excludes eye ornaments. The audit is frozen shared tooling, not an authoring import.

`validation.json` records exact full/LOD hashes, finite vertices, normalized weights, stable root/no scale tracks, unique motion, seamless loops, socket bind positions, matching skeleton and true LOD ratio. Actual GLB renders are stored under a source-hash review directory with image hashes. The renderer imports the exported GLB at 30 fps before posing. `motion-review.mjs` uses actual Three GLTFLoader/AnimationMixer playback, checks 91 phases per action and writes a local video/contact frames. CPU Cycles avoids the host's stalled Metal shader compiler.

Initial handoff evidence is recorded in `WORKING_STATE.md` and `delivery.json` once the basic checks complete. The integration agent owns lossless packaging, publishing, viewer checks and main commits.

Initial preview rendering uses one actual 1600×1200 GLB cutout, with `portraits.py` deriving the studio background and the two UI sizes from that same frame. The extended Blender action suite is deferred under the user’s initial-delivery priority; all twenty actions have actual Three playback frames/video, and basic Blender lateral, eye, lit oral and LOD views are retained. `check-candidate.mjs` is a snapshot of shared intake with only its input/output paths changed; it passed with all five sockets.
