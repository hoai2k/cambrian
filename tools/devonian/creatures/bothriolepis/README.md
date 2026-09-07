# Bothriolepis canadensis

Original living reconstruction for the Devonian specimen collection. Source script: `build.py`.
The editable full-resolution source is `cambrian/local/devonian-authoring/bothriolepis/bothriolepis.blend`,
with action review renders in that directory. This is an artistic reconstruction, not a specimen scan.

## Evidence and anatomical choices

[Béchard, Arsenault, Cloutier & Kerr (2014), *The Devonian placoderm fish Bothriolepis canadensis revisited with three-dimensional digital imagery*](https://www.palaeo-electronica.org/content/2014/647-3d-bothriolepis)
is the principal reference. It documents rigid cephalic–thoracic armour, a posteriorly raised dorsal
crest, paired narrow armoured pectoral fins, single dorsal fin and heterocercal tail. The reconstruction
therefore avoids an arthrodire-like mobile neck, shark jaws, broad flexible pectoral fins, or limbs
walking on land. The dorsal eyes occupy a shared dark orbital recess; the oral opening is small and
ventral, with a restrained lower-lip deformation. Paired lateral gill recesses sit behind the cheek.

The pectoral fins have proximal and distal rigid dermal segments on separate bones. Motions are small
trim/display gestures, consistent with the study's constrained joint ranges, rather than powerful
rowing or substrate anchoring. The soft posterior tail provides most visible swimming motion.
The cuirass consists of a continuous shaped shell with fitted living plate surfaces, narrow sutures
and fine low dermal tubercles. Vertex pigmentation is ochre/olive with a pale ventral surface and
subtle fine normal texture. Black glossy eyes are separate material; armour remains nonmetallic.

[Québec's Miguasha fish collection record](https://www.patrimoine-culturel.gouv.qc.ca/rpcq/detail.do?id=93118&methode=consulter&type=bien)
anchors the Late Devonian Miguasha provenance. The 0.40 m representative size is an art scale selection,
not a maximum. Exact pigmentation, living suture visibility, soft oral detail and action meanings are
reconstruction choices. The model does not establish diet or Devonian gameplay rules.

## Reproduce

From the repository root (Blender 5.x and Python 3 with NumPy):

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/bothriolepis/build.py
python3 tools/devonian/creatures/bothriolepis/finalize.py
node tools/devonian/check.mjs bothriolepis
```

Blender exports full GLB and a decimated LOD, then restores the untouched full source for the four
matching PNGs and nine review views. `finalize.py` removes only exporter-generated identity scale
tracks (asserting their values first), verifies geometry/skin/animation/socket invariants and records
actual bounds and validation data. The integration agent performs lossless packaging afterward.
The builder generates its own small normal bitmap deterministically; no externally licensed model,
photo or generated concept is embedded. Generic loft/mesh/export utility code was adapted from the
project's original Dunkleosteus authoring script; anatomy, meshes, rig and animation choreography are
specific to Bothriolepis.

## Animation inventory

All animations use 30 fps; root remains fixed and no animated scaling is exported. Armour is weighted
rigidly to `body`, oral soft tissue to `oral`, each dermal appendage segment to its own bone, and the
posterior soft body blends weights down the tail. Required sockets use nested `cambrianAnchor` extras
and are parented to the anatomical oral/body bones. `anchor_attack_primary` references the shield front
for contact; it is not a claim of predation. No CCD chain is needed.

| Clip | Seconds | Intended visible movement |
| --- | --- | --- |
| Idle | 2.4 | Small tail undulation, independent trim and oral ventilation |
| Swim | 2.4 | Two propagating tail beats with constrained appendage trim |
| TurnLeft / TurnRight | 1.6 each | Body yaw and roll, opposed caudal bend, asymmetric trim |
| Dive / Rise | 1.4 each | Whole rigid shield pitches, fins adjust and tail counters |
| Attack | 1.0 | Anticipation, forward shield contact gesture, recovery |
| Bite | 0.5 | Small ventral oral compression and body settling |
| Heavy | 1.1 | Cuirass bracing, appendage deployment and strong tail recovery |
| Hit | 0.6 | Brief body recoil with delayed tail response |
| Death | 1.6 | Progressive roll, relaxed appendages, bent tail; terminal pose holds |
| Guard | 1.0 | Moderately deployed dermal fins, gentle ventilation and tail trim |
| Parry | 0.35 nominal | Quick shield deflection and asymmetric trim (11 frames) |
| Dodge | 0.4 | Short lateral displacement under fixed root, S-bent tail, recovery |
| Eat | 1.2 | Cyclic ventral oral opening and small downward settling |
| Stagger | 1.2 | Damped repeated body recoil with tail counter-motion |
| Ability | 1.8 | Paired articulated-fin display, dorsal flex and oral recovery |
| Growth | 1.5 | Relaxed symmetric fin extension and ventilation, never moulting |

Idle, Swim, Guard and Eat have seamless endpoint transforms. Other actions recover to neutral except
Death. Reduced geometry retains Idle, Swim and Death with the same skeleton and anchors.

## Review

`validation.json` contains decoded counts, bounds, checksums, anchor world positions and per-clip
motion digests. The Blender review set covers lateral Idle, oblique Swim, Bite, frontal Eat, Heavy,
Ability, frontal Guard, Dodge and terminal Death. `action-review.jpg` collects these views.
