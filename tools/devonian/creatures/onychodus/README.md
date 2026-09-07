# Onychodus jandemarrai — Gogo reconstruction

Individually authored Blender reconstruction of a Late Devonian lobe-finned fish, currently undergoing visual review. Builds write only to `../devonian-authoring/onychodus/v2-candidate/`; the editable packed project is `../devonian-authoring/onychodus/onychodus.blend`. The candidate directory name does not indicate an earlier published Onychodus. Intermediate reference plates, renders and animation recordings remain in that local authoring directory.

## Evidence and reconstruction choices

[Andrews et al. (2006), original Gogo description](https://doi.org/10.1017/S0263593300001309) describes an oval body section, deep scaled caudal axis and almost diphycercal tail; the axial scales do not extend beyond its rays as in a coelacanth filament. A roughly 47 cm individual has a 10 cm head. The 1.5 m catalogue length represents a proportional estimate from a large isolated tusk, not a measured complete animal. Fin outlines are incompletely preserved: the long posterior dorsal and anal overlap the anterior caudal region; paired-fin outlines remain comparative. Pectoral motion is restrained. The original authors disagree about whether the paired tusk platforms moved during feeding. This model's small four-degree adjustment is explicitly interpreted, not an established feeding mechanism.

[Campbell & Barwick (2006), illustrated oral anatomy](https://ijdb.ehu.eus/article/pdf/052125kc) informs the paired crescent platforms, curved tusks and paired palatal recesses. These are separate from the marginal and inner palatal dentitions. The head contains recessed palatal pockets, a modeled mandibular floor and a narrowing pharyngeal lumen. Living oral soft tissue, precise lip thickness, pigment and action timing are interpretations. The jaw rotates about a real posterior hinge; the tusk platforms are children of it.

## Shape and materials

The robust oval trunk tapers through a deep scaled axis into a nearly symmetrical caudal web. Two separated dorsal fins, a long posterior anal and restrained fleshy paired fins distinguish its silhouette from the shark-like Devonian subjects. The continuous skull has lateral eyes and nasal openings, fine sensory pores and separate mobile gill covers. Fine rounded scale relief and irregular olive/umber countershading stay within the surface; fin rays use buried relief rather than exposed wires.

`scale-source.png` is original imagegen material art. Exact prompt:

> Create an original square seamless albedo texture for a Blender living reconstruction of the Devonian lobe-finned fish Onychodus. Edge-to-edge small overlapping rounded oval scales, subtly irregular fine granular enamel, subdued dark umber, olive and smoky copper pigmentation. Very low contrast finely mottled natural material, each scale thin and flush, not armoured polygons. Orthographic cross-polarized diffuse flat lighting, no highlights, no baked shadows or perspective. No fish silhouette, eyes, fins, writing, watermarks, fantasy embellishments or large repetitive spots. This is a material swatch for authored 3D UVs, not a scientific diagram.

The committed source is sufficient for rebuilding without another imagegen call. The builder derives restrained regional albedo modulation and authors rounded scale and fin-ray normal maps. Imagegen provides pigment variation, not fossil evidence or model geometry.

## Rig and review

Twenty-five anatomical joints include skull, hinged jaw, paired tusk platforms, gill covers, paired fin chains, separate dorsal/anal controls and a six-joint posterior wave. All eighteen shared action names are retained. Idle, Swim, Guard and Eat loop; Death settles and holds. Dynamic motions use asymmetric fin responses, propagated posterior bends and distinct anticipation/closure/recovery. Three nested version-one specimen anchors retain the existing runtime contract. The reduced model keeps the same skeleton and anchors with Idle, Swim and Death.

`review.py` imports the actual exported model into Blender for silhouette and oral inspection. `motion-review.mjs` runs an isolated Three.js playback, checks finite transforms and fixed root across 91 phases of each clip, records the complete action sequence and captures representative frames. `audit-export.mjs` provides decoded geometry for the shared eye-volume audit. Final geometry, eye, socket, action, four-portrait and viewer checks must pass before publication; intermediate reports do not certify later changes.

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python tools/devonian/creatures/onychodus/build.py
/Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python tools/devonian/creatures/onychodus/review.py
node tools/devonian/creatures/onychodus/motion-review.mjs
node tools/devonian/creatures/onychodus/audit-export.mjs
```
