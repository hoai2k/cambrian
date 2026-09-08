# Titanichthys production candidate01 — rig and action design

Astra high, authored on accepted clay04/material02. The rest surface, topology, UVs, stored zero-valued clay gape study and object transforms are preserved and fingerprinted. No added teeth, denticles, rakers, panels, eye changes or fin reshaping. Only export duplicates remove the unused clay shape key; all production movement comes from real bones.

## Anatomy and weights

Twenty-five bones: identity root; local dynamic body; separate skull and jaw; oral floor and paired commissures; six sequential muscular posterior segments; caudal and dorsal trim; three segments per long pectoral and two per pelvic. Skull and jaw are siblings under body so upper cranial lift does not incorrectly drag the jaw pivot. The jaw hinge and cranial pivot are the approved clay landmarks. All rest bone axes align with Blender axes, making rotation signs explicit.

The frozen semantic correspondence covers every one of the 90,430 body vertices. It is checked against the approved 24-degree shape-study coordinates before binding. Outer and inner oral surfaces use exactly the same parameter-based weights, with the tip carried rigidly by jaw, upper crown/socket carried by skull, and graded soft floor/commissures behind. Oral-floor motion uses only otherwise unclaimed soft-tissue weight. The fixed thoracic shield remains on body; axial bends start posteriorly. Eyes use skull exclusively and retain their current positions pending final audit.

Pectoral bones follow the actual curved section-centre spine, with root, mid and distal controls and smooth shared span weights. The buried root blends to body. Pelvics follow the corresponding axial segment. Median fin weights share local axial movement, avoiding a rigid tail plate pulling away from the upper stalk. Caudal trim is subordinate to a sequential travelling body wave. No bone scaling or root motion channels are authored.

Five nested anchors: mouth on jaw at the edentulous margin; swallowing reference on oral floor inside the cavity; contact attack on skull; paired support references on proximal pectorals. These are compatible nested dictionaries with actual bone parents. No false CCD chain or predatory tooth claim. The exporter patches parent-local coordinates through the actual glTF bone transforms; full and LOD anchor graphs and inverse bind matrices must match.

## Eighteen action intentions

| Action | Duration | Authored intent |
| --- | ---: | --- |
| Idle | 2.4 s | Quiet axial drift, minute oral ventilation, restrained fin trim. |
| Swim | 2.4 s | Propulsive posterior wave increasing and delaying rearward, caudal follow-through; fins stabilize. |
| TurnLeft / TurnRight | 1.8 s | Preparatory counter-load, body bank, sustained curvature and asymmetric fin trim, recovery. |
| Dive / Rise | 1.6 s | Gradual pitch and depth gesture, paired-fin trim, settle. |
| Attack | 1 s | Shield-led load, quick forward contact, damped recovery; modest oral opening. |
| Bite | 0.5 s | Gentle toothless oral opening/closing, with skull and floor articulation. |
| Heavy | 1.1 s | More deliberate whole-body load and shield contact with delayed tail/fins. |
| Hit | 0.6 s | Brief recoil, asymmetric roll/yaw, secondary oral and tail movement. |
| Death | 1.6 s | Decaying activity, relaxed jaw and fins, modest roll/sink, exact terminal hold from phase 0.84. |
| Guard | 1 s | Braced fin trim and shallow pitch with continuing quiet ventilation; seamless loop. |
| Parry | 10/30 s | Short shield deflection with counter-trim and recovery. |
| Dodge | 0.4 s | Quick lateral effort, asymmetric long-fin trim, delayed tail curl and recovery. |
| Eat | 1.6 s | Seamless sustained filtering gape cycle; coherent oral floor and corners. |
| Stagger | 1.2 s | Damped two-part body loss/recovery with secondary tail response. |
| Ability | 2.4 s | Slow full 24-degree ram-feeding gape, sustained middle phase, controlled close. |
| Growth | 1.5 s | Relaxed maturation stretch through pitch and fins, no scaling. |

Idle, Swim, Guard and Eat loop. Every other action recovers to its starting pose except Death. Keys are authored at 30 fps with LINEAR interpolation, including Blender's layered-action F-curves when present. Static pure checks cover finite transforms, identical loop/recovery endpoints, 18 distinct trajectories, identity root and held Death. Blender deformation, actual exported playback and attachments remain to be checked from results.

## Material, LOD and resource boundary

Source maps remain immutable. Candidate copies keep albedo resolution (body4096; pectoral/caudal2048; pelvic/dorsal1024; eyes512). Body normal becomes2048 and roughness1024; fin normal at most1024 and roughness512. All texture changes are recorded with before/after dimensions and hashes. Candidate portraits use these exact export materials, not the earlier larger study maps.

Mapped body materials expose body, underside and oral/accent roles using the same PBR maps; fins and eyes retain their roles. Full COLOR_0 is white. LOD bakes exact candidate albedo into dense linear corner colour, filters body pigment by surface area within region/compatible normals, then decimates. Body ratio0.26, fins0.22, eyes0.66; total must be below40% of full. LOD materials are texture-free white factors preserving the same palette slots. LOD retains Idle, Swim and Death and the full skeleton/sockets. Base geometry is not decimated in the production source or full export.

Raw GLB bytes are reported; lossless packaging must still meet the25MB delivery gate. No lossy geometry compression or automatic texture tuning. Structural checks validate maps/slots, weights, skeleton/binds, nested sockets, durations, distinct motion, loops/recovery, held Death and root/scale policy. They are not final anatomical or visual approval.

The bounded renderer produces four portraits, eleven action/whole-form views, four orbital directions and two actual imported LOD views:21 PNGs total. Oral lighting matches the approved inspection setup. Whole-action playback and quantitative eye/general audits are separate post-candidate gates; root owns their dispatch. No public/Git changes are part of this handoff.
