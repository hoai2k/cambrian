# Gemuendina stuertzi

Dedicated reconstruction for the Devonian specimen collection. This is an art asset with compatibility animation names; it does not prescribe gameplay.

## Anatomy and reconstruction

The low head and trunk, broad pectoral fans and narrow posterior silhouette follow the rhenanid body plan. Eyes and the recessed oral aperture face dorsally. Small individual tesserae cover the upper body and fins, with dark flexible seams between them; there is no arthrodire-style cuirass. Orbital rims and oral margins have larger reinforcing elements. Paired posterior fins and small median fins distinguish this from a modern stingray. No ventral ray mouth, spiracles or sting is present.

The surface uses bespoke lofts, projected tesserae and closed fin surfaces with vertex pigmentation. A reproducible seeded 512-pixel normal map supplies fine skin relief; it is an authored texture rather than fossil colour evidence. Teal and olive mottling, pale ventral skin and dark reflective eyes are artistic decisions. Fin struts, tail details, tessera size regularity, soft oral tissues and movement are reconstructions. The representative length is 0.30 m, not a species maximum.

Sources consulted:

- [Wilkin (2023), The Hunsrück Slate Konservat-Lagerstätte](https://onlinelibrary.wiley.com/doi/full/10.1111/gto.12426), for locality, flattened body, pectoral form and upward eye/oral orientation. Its unrelated general evolutionary statements are not used.
- [AMNH specimen cast ptc-5860](https://digitalcollections.amnh.org/archive/Gemuendina-stuertzi--rhenanid-placoderm-from-the-Early-Devonian-of-Hunsruck--Budenbach--Germany--cast---about-400-million-years-old-2URM1THI7W9X.html), museum fossil record and occurrence.

## Rig and motion

The root remains at identity. A subordinate body bone carries local gestures. Skull, jaw, throat and paired branchial margins move independently. Three longitudinal rows of paired pectoral bones, each with a distal bone, transmit a front-to-rear undulation while the tail's four bones contribute a smaller travelling wave. Pelvic, dorsal and caudal fin bones supply secondary motion. The three exported anchor objects have nested `cambrianAnchor` metadata and anatomical bone parents. Their exact local transforms are patched using inverse exported bind matrices, preserving the binary buffer.

| Clip | Seconds | Intent |
| --- | ---: | --- |
| Idle | 2.4 | Gentle fin-edge ripple and branchial ventilation |
| Swim | 2.4 | Travelling pectoral undulation with delayed tail follow-through |
| TurnLeft / TurnRight | 1.6 | Asymmetric pectoral banking and curved tail |
| Dive / Rise | 1.4 | Coordinated pitch and fin steering |
| Attack | 1.0 | Depress, lift toward overhead target, then settle |
| Bite | 0.5 | Dorsal oral aperture opening and posterior lip closing |
| Heavy | 1.1 | Stronger anticipatory crouch, upward oral lift and fin recovery |
| Hit | 0.6 | Single brief recoil |
| Death | 1.6 | Fin activity fades and the animal settles into a held sideways slump |
| Guard | 1.0 | Low posture with cupped fin margins and ventilation |
| Parry | 0.35 | Short bank and lateral deflection |
| Dodge | 0.4 | Asymmetric fin push and lateral body slip |
| Eat | 1.6 | Repeated upward oral and throat cycle |
| Stagger | 1.2 | Two diminishing corrective body movements |
| Ability | 2.4 | Sustained upward feeding lift with spread fins |
| Growth | 1.5 | Relaxed fin extension and ventilation, without scaling or moulting |

Idle, Swim, Guard and Eat are seamless loops. Other clips recover their starting pose, apart from Death, which holds the terminal pose. No action animates scale.

## Reproduce

From the repository root, with Blender installed:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/gemuendina/build.py
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/gemuendina/detail-review.py
python3 tools/devonian/creatures/gemuendina/review.py
node tools/devonian/check.mjs gemuendina
```

The builder saves original Blender source and review intermediates to `../devonian-authoring/gemuendina/`; `DEVONIAN_AUTHORING` can override that directory. It exports full and reduced geometry with matching skeletons and sockets, followed by four matching portraits. Its locally included infrastructure is adapted from the Titanichthys authoring utility; it never imports another creature builder or writes another creature's files.

The LOD is decimated by material to 28% before export and retains Idle, Swim and Death. Integration may compress both GLBs losslessly. `validation.json` records geometry counts, finite sampled deformation bounds, root/channel invariants and loop seam differences. `action-review.jpg` presents nine action/angle renders, and the original PNGs remain beside the Blender source.

Structural intake passed: 94,320 full triangles, 26,404 LOD triangles (28.0%), 28 matching skeleton joints, 18 unique dynamic clips, three valid matching bone-parented sockets, normalized skin weights, stable root and no animated scale. Portrait dimensions and alpha passed. The intake report was directed to the creature’s local authoring directory to avoid changing the shared integration report.

Visual review corrected angular fin outlines and narrowed the distal tail tesserae to fit the taper. Additional dorsal, ventral and mouth/armour views are saved with the source; the dorsal review uses a wider frame to include the complete animal.
