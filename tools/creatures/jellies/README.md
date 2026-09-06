# Four new pelagic creature sources

`build.py` creates original, skinned, articulated Blender meshes for Burgessomedusa, Ctenorhabdotus, Cambroraster and Tamisiocaris. Run from the repository root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b -t 4 --python tools/creatures/jellies/build.py
node tools/creatures/jellies/compress.mjs
```

Editable `.blend`, build logs, per-specimen records, and uncompressed final/LOD GLBs are kept in `../expansion-authoring/jellies` (override with `CAMBRIAN_AUTHORING`). Runtime GLBs, actual decimated LODs and two specimen renders are emitted into `public/assets/creatures`.

All 18 actions are supplied: Idle, Swim, Attack, Hit, Death, TurnLeft, TurnRight, Dive, Rise, Bite, Heavy, Guard, Parry, Dodge, Eat, Stagger, Ability, Moult. Their durations/frame counts are in the per-creature JSON. Parry uses the animation brief's 10 frames (0.333 s at 30 fps); other newly requested actions have exact requested durations. Ability is a 1.2-second loop for every new creature. All one-shot actions return to neutral except Death. Root is fixed at identity, and scale is never animated. Five deformation samples per action are checked for finite coordinates. LOD reduces topology to approximately 42–51% while retaining the complete rig and action library.

Geometry has explicit UVs, naturally varied vertex pigment, fine packed normal texture and sculpted ridges/veins. Radiodont cuticle additionally uses the shared imagegen chitin albedo; glTF natively multiplies its base-color texture by vertex colors. Jellyfish use pearlescent tissue with modest transparency (88% body / 92% membrane opacity), rose/amber medusa canals and oral fringes, and thin rounded teal/violet ctenophore lamellae. This treatment balances soft tissue appearance with legibility through the game's fog. Pigmentation and combat choreography are artistic reconstruction.

## Anatomy and movement

- **Burgessomedusa:** domed bell with sculpted radial canals, dense short marginal tentacles, and short central mouth lobes. Sixteen bell sectors pulse together while each two-bone tentacle trails with delayed motion. Attack and Heavy contract the bell and corral the tentacle fringe; Guard draws it inward; Ability repeatedly gathers and relaxes the fringe. Four oral lobes pulse while feeding. The tentacle count is simplified for game scale. [ROM discovery](https://www.rom.on.ca/news-releases/royal-ontario-museum-researchers-identify-oldest-known-species-swimming-jellyfish).
- **Ctenorhabdotus:** lantern-like body with **24 comb rows in eight triplets**, shortened central rows, flattened poles, aboral capsule and undulating oral margin. No tentacles invented. Comb paddles and sectors move delicately in phase-offset waves; Ability quickens the comb shimmer, Dodge banks and tilts, feeding uses the oral fringe. Its actual feeding ecology is uncertain, so recovery effects are game fiction. [ROM fossil account](https://burgess-shale.rom.on.ca/fossils/ctenorhabdotus-capulus/).
- **Cambroraster:** broad curved head shield with posterior horns, recessed lateral eyes, compact flap-bearing trunk, ventral oral cone, and jointed rake basket with hooked endites and subsidiary spines. Flaps ripple while cruising; attack closes the basket, Heavy winds up before the broad sweep, and Ability continuously works the basket. Guard tucks the rakes behind the shield. [ROM research](https://www.rom.on.ca/news-releases/voracious-cambrian-predator-cambroraster-new-species-burgess-shale-discovered-rom).
- **Tamisiocaris:** elongated frontal appendages with fine filtering combs are the fossil-grounded centerpiece. **The full trunk, flap arrangement, eyes, oral cone and tail are an explicitly conjectural generalized radiodont reconstruction**, because the taxon is known chiefly from its frontal appendages. Ability spreads the filters; Guard folds them inward; attack sweeps them without turning them into crushing jaws. A phased swimming wave moves trunk, flaps and tail. [Primary suspension-feeding paper](https://www.nature.com/articles/nature13010).

The source mesh is Blender Z-up and -Y forward; exported glTF is +Y-up and +Z forward. Radial jellies have a designated gameplay heading even though their biological anatomy is radial. No ground, lighting or camera is exported in the GLBs.

## Anatomical contact sockets (Cambrian anchor contract v1)

`anchors.json` contains per-creature append-only socket specifications. Regenerate it with `python3 tools/creatures/jellies/generate_anchors.py`; the generator verifies every parent/effector name and every contiguous CCD chain against both full and LOD GLBs. Coordinates are **Blender world rest space**, exactly matching `build.py`. The packager converts `(x,y,z)` to glTF `(x,z,-y)`, then applies the inverse parent rest transform. Sockets inherit orientation from their parent. Metadata uses `extras.cambrianAnchor` version 1; `anchor_mouth_inside` has role `swallow`, as required by the shared runtime contract.

Every specimen supplies `anchor_mouth`, `anchor_mouth_inside`, and `anchor_attack_primary`. The mouth sockets lie at the actual ventral/oral opening, and the inside socket lies just inward along the alimentary direction. They are body-parented positional sockets with **no CCD chain**.

- Burgessomedusa has 48 terminal tentacle attack sockets and canonical front/left/right grasp sockets. The designated front contact is tentacle 36 (-Y in Blender). Each solve uses only that tentacle's two bones; umbrella sectors, body, and root stay outside CCD.
- Ctenorhabdotus supplies the eight scalloped oral-rim contacts, with the front oral margin as primary. No grasp or CCD metadata is invented for its comb rows or gelatinous body.
- Cambroraster uses the distal **hooked endite on podomere 4** as each basket's main functional grasp contact. Its short terminal podomere 5 is unhooked, so solving that shaft endpoint would miss the actual capture surface. Additional attack sockets mark every hooked endite; each chain ends at its owning podomere and begins at the dedicated rake root.
- Tamisiocaris has paired terminal feeding-appendage grasp/attack sockets and inner/outer distal comb contacts. Its 13-bone filter chains are independent of trunk and locomotor flap bones. Grasp means collection/positioning of small food here; it does not assert a crushing claw. Complete-body anatomical uncertainty still applies.

Canonical `anchor_grasp`/`anchor_attack_primary` aliases on the radiodonts select the left feeding appendage; `_L` and `_R` sockets support paired interactions. Mouth coordinates are not generic bounding-box centers. This authoring step does not regenerate or alter meshes, skin, animation clips, or existing skeleton nodes.
