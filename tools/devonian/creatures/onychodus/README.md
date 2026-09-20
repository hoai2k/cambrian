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

## V2 shipped — 12 September 2026

`build_v2.py` ports the approved head study off the user reference (`docs/reference/Onychodus.jpg`):
a nose station at y=−2.56 closing a blunt, deep snout; a lip ridge along the long gape; the dermal
cranial bones mapped as suture grooves on the skull roof and cheek (`groove()` over a segment list
in (y, angle) space); the paired tusk whorls brought forward to y=−2.28 with longer tusks whose tips
sit at the upper lip when closed and show in Bite and Attack; the eye larger and higher at
(±.30, −2.10, .265), audited at 73.6% / 73.3% inside the head (full) and 73.3% / 73.5% (reduced);
anchors moved to the new snout tip. Packaging exact round-trip PASS at 139,544 / 39,064 triangles;
intake PASS; portraits from the V2 build. `build.py` still reproduces V1. The user accepted the
study on 12 September; badge cleared.

## Front dentition and a taller snout — 15 September 2026

The four large tusks a side stood on a narrow crescent tube arching through the mouth, and it held
their bases .07 above the mouth line. Read from outside that was teeth on a connector rather than
teeth in a jaw; read with the mouth shut, three of the four came out through the roof of the
snout, ivory tips standing where a nose would be. They are now the lower jaw's own front teeth:
`TUSKS` seats each one on the jaw's own inner surface (`jawInner`, the same expression the oral
grid uses, so a tooth seated there is in the tissue rather than beside it) inside the marginal
row, with the crowns unchanged in height and lean and the first tube sample buried so the crown
grows out of the gum. The crescent is gone, and with it the two `whorl` bones and the interpreted
4° adjustment they carried — the tusks are rigid with the jaw, which is all the evidence supports
(whorl movement during feeding is disputed within Andrews et al.).

Making room was two changes. The palate's paired receiving recesses either side of the median
ridge (Campbell & Barwick figure 8) carry forward and out to cover the new stations (`palate`),
and its ceiling now follows the snout's own skin `ORAL_WALL` below it rather than a flat `z+up`: a
recess this deep measured against a flat ceiling walks out through the side of the rostrum, where
the skin has already curved away — tried, and it put the palate 0.11 outside the snout at
y=−2.47. The snout's roof rose .055 over the rostrum and .035 at the brow (`HEAD`'s third column),
which `docs/reference/Onychodus.jpg` shows over the tusks anyway.

That the closed mouth actually holds them is an assertion in the builder, not a look: each crown
is swept at twelve points against the palate directly over it and against the palate's lateral
reach at that station. `validation.json` records the result — `oralClearanceClosed` 0.0460 and
`tuskLateralRoom` 0.1122. Packaging exact round-trip PASS at 136,624 / 38,246 triangles; 23 bones.

The eyes were not moved, and the roof that rose over them seats them deeper: the shared eye audit
reads **82.33% / 82.07% inside (full)** and **82.22% / 82.34% (reduced)**, against 73.57 / 73.26
and 73.30 / 73.53 before, every one a PASS on the 50% criterion and over the 65% target, with the
head envelope closed and no non-manifold edges either side. Both globes still stand proud and
still read as eyes — inspected at rest, at full gape, and in Heavy, TurnLeft and Death, where the
socket neither tears nor opens (the globes and the skin around them are both skull-weighted, so
they move rigidly together).

`audit-selectors.json` is new and is why those numbers exist at all: without it the audit falls
back to the mesh whose material ends in *body*, which for this animal is the trunk rather than the
skull, and every globe measures 0% inside. One file serves both models, selecting by mesh name —
the reduced model's materials carry a `.001` suffix, so a material-suffix selector matches nothing
there. Reports in `eye-audit-full-v2.json` and `eye-audit-lod-v2.json`.
