# Nothosaurus — paired authored body and procedural volume puppet

The delivered Tripo body and procedural puppet preserve the canonical model's curved tail, asymmetric spread feet, deep torso and elevated snout. Both use one 27-joint skeleton, the same three mouth/attack sockets, and **21 byte-for-byte equivalent decoded animation performances**. The puppet is also the runtime LOD, with all actions retained so either model can perform the same gameplay.

| Delivery | Triangles | Packaged bytes |
| --- | ---: | ---: |
| `nothosaurus.glb` — authored Tripo body | 21,208 | 1,794,048 |
| `nothosaurus.puppet.glb` — procedural twin | 9,004 | 686,620 |
| `nothosaurus.lod1.glb` — identical puppet alias | 9,004 | 686,620 |

Files are in `public/assets/triassic/creatures/`, with matching studio, 1600 × 1200 transparent select, card and thumbnail portraits, plus metadata. Meshopt packaging preserves mesh attributes and animation sample values exactly. Textures are embedded. The model is 5 engine authoring units long, faces +Z in glTF and uses +Y up; runtime applies the species' natural size. The research registry supplies the 6 m representative length.

## Source and reconstruction

The preserved source is `tools/triassic/creatures/nothosaurus/tripo-raw/nothosaurus.raw.glb`, SHA-256 `5cb48becbdcbbc3863519bca8a2bb99c5129c6a0e5b1affb6252e15e01c49604`. It came from Tripo task `ea4528e3-1f9a-42f4-b0c4-2b84b879ff7c`, using `docs/triassic/canonical/model-inputs/nothosaurus/input.png` (the intake metadata records the image hash). The raw file is never changed.

The twin is a procedural **volume resurfacing**, rather than a generic anatomical substitute or a decimation of the authored faces. Blender regenerates topology from a 0.007 raw-unit voxel occupancy field, relaxes that surface twice, and reduces the new topology to the puppet budget. Source vertices and faces are not reused. This preserves the asymmetric tail sweep and individual paddle silhouettes that a symmetrical ellipsoid proxy would lose. Puppet pigment is sampled through each nearest source triangle’s interpolated UV. The authored body retains the full embedded original albedo with white vertex colors, restrained normal relief (0.15) and explicitly nonmetallic skin at roughness 0.7.

Intake welds coincident texture-seam vertices and removes ten collapsed triangles; the detached-flake threshold removed no vertices. Connected foot webbing is retained. A true, separate lower-jaw shell is cut along the mouth seam and rigidly skinned to its hinge. Curved oral floor, palate and seated hinge tissue close the interior and prevent a stretched membrane across the open gape. The source's fine surface and tooth detail remains limited by the Tripo reconstruction.

`nothosaurus-profile.json` records **21 exact plane-intersection envelopes** of both actual meshes. Maximum width/dorsal/ventral envelope difference is **0.05646 units (1.13% of body length)**; the tolerance is 0.2 units (4%). Nearest puppet-surface distance over authored body vertices has maximum **0.11304 (2.26%)** and 95th percentile **0.01020 (0.20%)**. The joint and socket coordinates are shared, so their parity error is zero. These are generated measurements, not a claimed new human anatomical sign-off.

## Rig and motion

The shared rig has root, body, chest, three cervical controls, skull, jaw, seven caudal controls, and three controls per limb. Trunk weights blend longitudinally. Limbs use anatomical regions and smooth radial weights beginning inside the torso, then blend upper limb, lower limb and paddle controls. The jaw is rigid; oral and hinge tissues have explicit jaw/skull weights. Every vertex has normalized nonzero weights and at most four influences.

The complete shared action set is Idle, Swim, Sprint, TurnLeft, TurnRight, Dive, Rise, Attack, Bite, Heavy, Hit, Death, Guard, Parry, Dodge, Eat, Stagger, Ability, Grab, Breath and Growth. Idle, Swim, Sprint, Guard and Eat loop exactly. Root motion and scale animation are absent.

Swim coordinates alternating fore/hind rowing, feathered paddle recovery and a travelling tail wave; Sprint increases the tail/limb amplitudes and cadence. Turns bank the torso, bend the cervical chain and propagate a caudal steering curve. Attack and Heavy have anticipation, jaw opening, strike, recoil and recovery; Bite is a short gape/snap. Dodge uses an asymmetric paddle stroke and bank, whereas Hit and Stagger use distinct impact/recovery oscillations. Ability is the roster's fang-trap clamp; Grab braces and tugs with the cervical chain. Breath separately raises and lowers the head/torso for a surface cycle. Death relaxes the appendages and holds a rolled terminal pose. These clips supply body performance; world travel and capture rules remain engine-owned.

## Verification

`paired-audit.json` binds the checks to the final packaged file hashes. It asserts exact paired joint names, hierarchy, local rest transforms, inverse bind arrays, socket transforms/metadata, clip names, timing and all sample arrays. It checks normalized weights, finite attributes, unique dynamic clips, loop seams, no root/scale channels and the reduced geometry budget. The Three.js GLTFLoader/AnimationMixer then plays **61 phases of every clip for both models**, evaluating sampled actual skinned vertices. The Blender build also checks every vertex at 13 phases per clip.

Visual QA inspected the exported models through the same side, top, mouth and action cameras. The first jaw studies exposed a false lip and stretched seam; the delivered separate jaw and explicit hinge boundary correct those defects. Final sheets show seated limbs, matching swept-tail volume, articulated rowing and steering, open/closed attacks and terminal Death:

- [Paired deformation sheet](paired-deformation-sheet.jpg)
- [Remaining actions, including Sprint / Fang Trap / Grab / Breath](paired-actions-sheet.jpg)
- [Side, top and mouth comparison](paired-volume-sheet.jpg)

The current portraits and action sheets are rendered from decoded packaged files after the material correction. Packing assertions establish unchanged geometry and animation values. No independent human review is invented by this automated QA record.

## Reproduction

Run from the repository root with Blender 5.2 and installed project Node dependencies:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b -t 2 --python tools/triassic/creatures/nothosaurus/build.py
node tools/triassic/creatures/nothosaurus/audit.mjs --package --decode
/Applications/Blender.app/Contents/MacOS/Blender -b -t 2 --python tools/triassic/creatures/nothosaurus/render.py -- --decoded
/Applications/Blender.app/Contents/MacOS/Blender -b -t 2 --python tools/triassic/creatures/nothosaurus/render.py -- --decoded --puppet
python3 tools/triassic/creatures/nothosaurus/contact-sheets.py
```

The paired editable Blender project, decoded review GLBs, logs and individual frames live in `local/triassic-authoring/nothosaurus/`. `build.py` authors both geometry and performance and writes only this species' asset family. It does not modify shared registries or perform git operations. The macOS sandbox may block Metal initialization even for background work; the same Blender command succeeds with its normal approved desktop permissions.


## Material investigation and correction — 13 September 2026

The reported black/white crumpled appearance was reproduced under identical lights in Blender and the live viewer. The main cause was the Tripo tangent-space normal texture at full strength, amplified by its linked ORM shading. The initial conversion also discarded the 2048² original albedo in favor of sparse vertex pigment, losing fine markings and averaging color across atlas seams. Setting Principled roughness/metallic defaults had not overridden the linked texture.

The corrected authored skin embeds the **exact original albedo bytes**, uses white COLOR_0 so runtime recoloring remains available without multiplying the albedo by itself, reduces normal strength from 1 to 0.15, and explicitly disconnects ORM roughness/metallic inputs before setting roughness 0.7 and metallic 0. The puppet samples the nearest triangle’s interpolated UV with bilinear texture lookup; it no longer averages unrelated seam corners or copies the nearest vertex’s color. Its reduced, texture-free material remains matte. The jaw-hinge material now sets its actual shader color and roughness, correcting the exporter’s previous default-gray fallback.

[Controlled material comparison](material-comparison.jpg) shows the old processed material, corrected material, and original Tripo geometry with the same corrected material. The remaining broad grey/white painted streaks are present on the original model and its albedo; this change does not redraw them. The raw model and all its textures remain preserved.

This was **not double gamma, reversed normals or a corrupted UV atlas**. Encoded source-image samples were checked against their PNG bytes, confirming exactly one sRGB-to-linear conversion for puppet colors. Source and processed geometric-normal alignment remained comparable. Of 11,542 matched original surface vertices, all but one UV matched within 1e-5; the sole larger difference was 0.000192, under 0.4 pixel at 2048², far too small to explain the broad paint streaks. New jaw-cut vertices are reported separately.

`material-audit.mjs` verifies the retained source-albedo hash, white authored color attributes, material settings and original UV correspondence. Against the preserved pre-fix exports it proves **exactly unchanged positions, normals, UV arrays, skin weights, inverse bind matrices, skeletons and all 21 animation arrays** for the authored model, puppet and LOD. `material-audit.json` records this evidence against final packaged hashes. The paired playback audit was rerun, and all four portraits and three pose sheets were regenerated. An independent check of the corrected material in the live viewer confirmed the crumpled highlight artifacts were gone while all 21 clips remained available.

The before-files and full-sized comparison renders are preserved under `local/triassic-authoring/nothosaurus/material-fix/`. `material-review.py` reproduces the matched-light study when its preserved `before/nothosaurus.unpacked.glb` is available. Run `node tools/triassic/creatures/nothosaurus/material-audit.mjs` to validate the delivered material; before/after equivalence checks run when the preserved baseline files are present.
