# Shonisaurus: shared-rig authored body and measured puppet

The delivered Tripo body and the procedural volume puppet use one armature and one performance source. No retargeting is involved. The puppet also serves as the gameplay LOD, and keeps every action so the two bodies can be compared clip for clip.

## Delivered files

- `public/assets/triassic/creatures/shonisaurus.glb`: 117,442 triangles, 4,387,380 bytes, vertex pigmentation and source normal detail.
- `shonisaurus.puppet.glb`: 10,874 triangles, 586,100 bytes, measured procedural body, rostrum branches, four flipper lofts and crescent caudal loft.
- `shonisaurus.lod1.glb`: byte-identical to the procedural puppet.
- `shonisaurus.json`: physical scale, clip and socket metadata.
- Studio, select, card, thumbnail and puppet portraits are rendered from the final meshes.

Both exports face glTF +Z, use +Y up, and have a six-unit source length. The metadata records a 14 m animal; the existing game sizing system applies the runtime scale.

## Anatomy and provenance

The immutable input is `intake/triassic-tests/shonisaurus/shonisaurus.raw.glb`, SHA-256 `576114e5d8e4b3eabfd97148a515cc8f9f4567788478791a4441eb85606b6330`. Its canonical image is `docs/triassic/canonical/shonisaurus.png`.

The authored mesh is welded at coincident texture seams, given extra pigment sampling density without subdivision shrinkage, and skinned anatomically. A bounded intake correction seats 23 ventral rostral outlier vertices onto the measured chin profile; the largest correction is 0.116% of body length. The raw source remains untouched.

The puppet is rebuilt from measured profiles rather than decimation. Interior radial sections describe the deep trunk. Separate spanwise sections preserve the four long ventrolateral flippers and the caudal crescent, whose concave trailing edge cannot be represented faithfully by an axial tube. The upper and lower rostrum remain separate volumes around the mouth gap. `measured-profile.json` records the sampled rings and their centers.

The thin projection beneath the snout in the three-quarter hero is the far right pectoral flipper seen edge-on. A visibility isolation in `chin-projection-review.jpg` confirms that hiding only `Puppet pectoral R` removes it; the isolated mouth underside has no hanging geometry.

The mouth has a hinged lower jaw, upper palate, mandibular floor, throat and cheeks, with separate upper and lower tooth rows. The original lip rims and small source tooth forms remain. The seated eye globes have dark pupils and muted bronze irises. Soft tissue, pigment and motion are artistic/inferred features of this reconstruction.

## Rig and performance

The exact shared 21-joint armature is recorded in `rig.json`: root, inertial body/chest, skull and jaw, six axial joints, caudal, dorsal, and two controls for each paired flipper. Flipper roots blend onto their underlying chest/spine weights before the distal flipper joints take over. No vertex has more than four influences.

`performance.py` authors 19 dynamic actions: Idle, Swim, Sprint, TurnLeft, TurnRight, Dive, Rise, Attack, Bite, Heavy, Hit, Death, Guard, Parry, Dodge, Eat, Stagger, Ability and Growth. Idle, Swim, Sprint, Guard and Eat loop exactly. Root motion and animated scale are absent.

Swimming is a traveling lateral wave with increasing caudal amplitude and restrained trunk motion. Sprint uses a 1.1 s cycle and stronger caudal effort than the 1.8 s Swim. Flippers trim, steer and brake. Bites and heavy strikes have separate loading, contact, follow-through and recovery; pod-call Ability, defensive reactions, turning, diving and terminal death have distinct performances.

Three bone-parented sockets are identical in both files: `anchor_mouth`, `anchor_mouth_inside` and `anchor_attack_primary`.

## Verification

`validation.json` checks the delivered compressed files after decoding: exact joint names/hierarchy/rest transforms/inverse-bind matrices, exact action key times and values, identical socket transforms and metadata, finite geometry, normalized nonzero weights, unique dynamic clips, looping seams, static identity scale, stationary root, and the reduced geometry budget. Compression preserves every decoded mesh attribute and animation value.

`deformation-validation.json` records:

- Maximum dorsal/ventral/width error across twenty sections: **0.0530 units, 0.884% of length**, under the 4% contract tolerance.
- Signed surface volume: **3.3027 full / 3.0805 puppet**, a 6.7% difference.
- Full-to-puppet surface distance: median 0.00418, 95th percentile 0.0382 units.
- All four flipper root joints inside the source trunk.
- Sampled globe volume inside the head: **69.8% left / 61.7% right** (619 samples per globe).
- Every action sampled at six phases with finite skinned positions and per-edge stretch measurements; no edge exceeds five times its rest length. The highest local stretch is a small oral web edge at maximum Heavy gape; swimming's 99th-percentile stretch is about 3.4%, Sprint's about 5.2%.

Codex visually reviewed paired side/three-quarter views, close mouth views and multi-frame swimming, sprint, heavy strike, dodge and death sheets on 2026-09-12. `exported-motion-review.jpg` is rendered from the shipped GLBs after meshopt decode, viewed from above to expose the lateral tail wave and steering. `action-review.jpg` shows matching side-view action phases, and `volume-review.jpg` compares the bodies from three views.

## Reproduction

Run from the repository root with Blender 5.2 (the local application is `/Applications/Blender.app/Contents/MacOS/Blender`):

```sh
Blender -b --python tools/triassic/creatures/shonisaurus/build.py
node tools/triassic/creatures/shonisaurus/package-audit.mjs
Blender -b --python tools/triassic/creatures/shonisaurus/deformation-audit.py
Blender -b --python tools/triassic/creatures/shonisaurus/review.py
Blender -b --python tools/triassic/creatures/shonisaurus/exported-review.py
node tools/triassic/creatures/shonisaurus/portraits.mjs
```

The source blend, decoded/uncompressed intermediates and individual review renders are local authoring outputs under `local/triassic-authoring/shonisaurus/`. Commit the public asset family and this tooling/report directory; the original intake and local `.blend` remain preserved locally.
