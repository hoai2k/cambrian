# Five soft-bodied creature models

Original analytic mesh construction, anatomical skinning, procedural pigmentation,
and tissue micro-normal textures. No downloaded model or third-party image is used.
Geometry, color variation, normal map, rigs, actions, and specimen renders are
reproducible from `build.py` with Blender 5.2. These are game reconstructions:
color, movement cadence, and combat behavior are artistic interpretations.

Run from the repository root:

```sh
CAMBRIAN_SOFT_AUTHOR=/path/to/cambrian/local/expansion-authoring/soft \
  blender -b -t 4 --factory-startup --python tools/creatures/soft/build.py -- \
  pikaia nectocaris ottoia odontogriphus vetulicola
node tools/creatures/soft/validate.mjs
```

The authoring folder contains the five editable `.blend` files, packed normal
texture, build reports, and action inspection renders. Public game exports are
`public/assets/creatures/<id>.glb`, `<id>.lod1.glb`, `<id>.png`, and
`<id>.card.png`. The 1120×840 previews and 768×768 cards have transparent alpha.
The LODs are actual 38% geometry decimations with preserved skinning and all
clips. Initial exports are uncompressed; the repository's meshopt pipeline may
compress them for delivery.

| Creature | Full triangles | LOD triangles | Bones | Clips | Distinguishing anatomy |
| --- | ---: | ---: | ---: | ---: | --- |
| Pikaia | 23,828 | 9,054 | 40 | 18 | Laterally compressed ribbon, sigmoidal myomeres, two cephalic tentacles, small dorsal anterior gills, integrated posterior dorsal fin, long ventral keel |
| Nectocaris | 48,284 | 18,347 | 56 | 19 | Continuous broad fins with 24 fin controls and fine fibers, two 8-bone tentacles, large stalked eyes |
| Ottoia | 66,030 | 25,090 | 22 | 18 | Annulated trunk, four-part telescoping introvert, 28 rows of backward hooks, recessed toothed mouth, two posterior rings of four hooks |
| Odontogriphus | 38,972 | 14,809 | 109 | 18 | Smooth unarmored mantle, broad muscular foot, fine marginal gills, two-row ventral radula |
| Vetulicola | 40,490 | 15,386 | 19 | 18 | Firm pharyngeal chamber, five paired recessed gill openings, dorsal point and ventral keel, seven-segment tail |

## Motion contract

Blender +Z up / −Y anterior becomes glTF +Y up / +Z anterior. The root stays
fixed. Only rotations and non-root translations are animated; there are no
scale animation channels. Continuous surfaces blend neighboring bone weights.

All creatures contain `Idle`, `Swim` (or `Crawl` for Ottoia and Odontogriphus),
`Attack`, `Hit`, `Death`, `TurnLeft`, `TurnRight`, `Dive`, `Rise`, `Bite`, `Heavy`,
`Guard`, `Parry`, `Dodge`, `Eat`, `Stagger`, `Ability`, and `Moult`. Nectocaris
also has `Grab` at 0.9 seconds. Combat durations follow the game's animation
brief. `Ability` loops in 1.2 seconds for all five. Parry samples its final
neutral pose before its exported timeline is normalized to exactly 0.35 seconds.

Loops have matching first/last positions and velocities. One-shots return to
neutral with eased endpoints; Death settles into a persistent collapsed pose.
The game should not add another procedural spine wave on top of these clips.

| Creature | Locomotion | Combat / feeding | Ability performance |
| --- | --- | --- | --- |
| Pikaia | Lateral wave travels through 18 weighted body controls; tentacles and gills follow | Front ribbon whips; guard curves body; dodge makes a stronger C bend | A faster, narrow traveling wave for Ribbon slip |
| Nectocaris | Continuous fin crests travel from front to rear; a small body wave and trailing tentacles | Tentacles open on wind-up, sweep inward on strike; Grab curls and pulls before releasing; fins brace and flare | Alternating tentacle gathering with fin stabilization for Tentacle seize |
| Ottoia | Longitudinal translation and arch waves mimic muscular peristalsis | Introvert retracts on wind-up, then extends its hook crown; posterior body braces | Curled burrowing posture, slow body waves, retracted introvert, short periodic extension for Sediment dive; engine controls sinking/emergence |
| Odontogriphus | Foot and mantle share a low traveling contraction wave; marginal gills respond | The anterior foot and radula rasp, brace, and shove; dodge is a soft lateral lurch | Low adhesive posture with a stronger locomotor foot wave for Adhesive glide |
| Vetulicola | Seven tail sections undulate behind a firm chamber | Tail and chamber coordinate a body shove; mouth/gill lappets pulse for feeding | Quick lappet ventilation pulses and a steady tail wave for Pump |

These animations give low-predation animals readable defensive contact actions;
they do not imply fossil evidence for predatory teeth in Pikaia or Vetulicola.

## Anatomical references

- Pikaia follows the **2024 dorsoventral reinterpretation**, including anteriorly
  inflected dorsal myomere boundaries and dorsally directed anterior gills.
  [Mussini et al., Current Biology](https://doi.org/10.1016/j.cub.2024.05.026).
- Nectocaris uses the **2025 nectocaridid chaetognath interpretation**. No squid
  siphon, jet propulsion, suckers, or invented beak is modeled.
  [University of Bristol research summary](https://www.bristol.ac.uk/news/2025/july/ancient-squid-mystery-solved.html),
  [ROM species account](https://burgess-shale.rom.on.ca/fossils/nectocaris-pteryx/).
- Ottoia's hook arrangement, retractile introvert, annulated trunk, and rear
  hooks follow the [ROM species account](https://burgess-shale.rom.on.ca/fossils/ottoia-prolifica/)
  and [Smith et al.](https://doi.org/10.1111/pala.12168).
- Odontogriphus has no shell, dorsal plates, eyes, or invented tentacles. Its
  broad foot, marginal gills, and two-row radula follow the
  [ROM species account](https://burgess-shale.rom.on.ca/fossils/odontogriphus-omalus/)
  and [Smith's radula analysis](https://pmc.ncbi.nlm.nih.gov/articles/PMC3441091/).
- Vetulicola's anterior groove, five gill pairs, and segmented tail follow
  [Ou et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC3517509/). Its dorsal point
  and ventral keel follow the [Cambrian chordate review](https://www.mdpi.com/2076-3263/9/8/354).

## Verification

`build.py` checks exported names, vertex color ranges, skin attributes, finite
posed geometry at five times in every clip, exact source loop endpoints, absence
of scale tracks, and a static root. It strips only exporter-generated constant
scale/root channels after proving they are constant. Material-separated export
avoids the Blender 5.2 white-vertex-color issue on later material slots.

`validate.mjs` independently loads the actual full and LOD GLBs using the game's
Three.js GLTFLoader, samples skinned vertex positions across every clip, and
checks that every action deforms geometry, all coordinates remain finite,
durations match, and non-death exported endpoints meet. Its JSON report lives
in `reports/exported-skin-validation.json`.

`render_actions.py` produces representative action stills from the editable
sources. Specimen previews and action stills were visually reviewed; Pikaia's
head/tail contour, Nectocaris fin rotation axis, and Vetulicola's open oral
funnel were refined after that review.

## Anchor authoring data

`anchors.json` supplies v1 socket authoring data in Blender-world bind coordinates.
The final asset integrator converts each point to glTF coordinates `[x, z, -y]`
and applies the parent bone's bind inverse before attaching the anchor node.
Every creature has mouth, mouth-inside, and primary-contact sockets. Nectocaris
adds left/right tentacle contacts and a terminal-tentacle grasp target. Its CCD
chains contain only the corresponding eight tentacle bones. Ottoia's contact
chain contains only the four introvert bones. Fixed body and radula sockets have
no IK chain. Root and trunk locomotion bones are never part of an IK chain.
The same source data must be applied to both full and LOD exports.
