# Shonisaurus: shared-rig authored body and measured puppet

The delivered Tripo body and the procedural volume puppet use one armature and one performance source. No retargeting is involved. The puppet also serves as the gameplay LOD, and keeps every action so the two bodies can be compared clip for clip.

## Delivered files

- `public/assets/triassic/creatures/shonisaurus.glb`: 117,442 triangles, 7,381,764 bytes, detailed source UV albedo and restrained source normal detail.
- `shonisaurus.puppet.glb`: 10,874 triangles, 572,216 bytes, measured procedural body, rostrum branches, four flipper lofts and crescent caudal loft.
- `shonisaurus.lod1.glb`: byte-identical to the procedural puppet.
- `shonisaurus.json`: physical scale, clip and socket metadata.
- Studio, select, card, thumbnail and puppet portraits are rendered from the final meshes.

Both exports face glTF +Z, use +Y up, and have a six-unit source length. The metadata records a 14 m animal; the existing game sizing system applies the runtime scale.

## Anatomy and provenance

The immutable input is `tools/triassic/creatures/shonisaurus/tripo-raw/shonisaurus.raw.glb`, SHA-256 `576114e5d8e4b3eabfd97148a515cc8f9f4567788478791a4441eb85606b6330`. Its canonical image is `docs/triassic/canonical/shonisaurus.png`.

The authored mesh is welded at coincident texture seams, given extra pigment sampling density without subdivision shrinkage, and skinned anatomically. A bounded intake correction seats 23 ventral rostral outlier vertices onto the measured chin profile; the largest correction is 0.116% of body length. The raw source remains untouched.

The puppet is rebuilt from measured profiles rather than decimation. Interior radial sections describe the deep trunk. Separate spanwise sections preserve the four long ventrolateral flippers and the caudal crescent, whose concave trailing edge cannot be represented faithfully by an axial tube. The upper and lower rostrum remain separate volumes around the mouth gap. `measured-profile.json` records the sampled rings and their centers.

The thin projection beneath the snout in the three-quarter hero is the far right pectoral flipper seen edge-on. A visibility isolation in `chin-projection-review.jpg` confirms that hiding only `Puppet pectoral R` removes it; the isolated mouth underside has no hanging geometry.

The mouth has a hinged lower jaw and no authored geometry inside it (see the 20 September note below): the original lip rims and small source tooth forms are what is drawn. The seated eye globes have dark pupils and muted bronze irises, placed where the albedo paints the eyes. Soft tissue, pigment and motion are artistic/inferred features of this reconstruction.

## Rig and performance

The exact shared 21-joint armature is recorded in `rig.json`: root, inertial body/chest, skull and jaw, six axial joints, caudal, dorsal, and two controls for each paired flipper. Flipper roots blend onto their underlying chest/spine weights before the distal flipper joints take over. No vertex has more than four influences.

`performance.py` authors 19 dynamic actions: Idle, Swim, Sprint, TurnLeft, TurnRight, Dive, Rise, Attack, Bite, Heavy, Hit, Death, Guard, Parry, Dodge, Eat, Stagger, Ability and Growth. Idle, Swim, Sprint, Guard and Eat loop exactly. Root motion and animated scale are absent.

Swimming is a traveling lateral wave with increasing caudal amplitude and restrained trunk motion. Sprint uses a 1.1 s cycle and stronger caudal effort than the 1.8 s Swim. Flippers trim, steer and brake. Bites and heavy strikes have separate loading, contact, follow-through and recovery; pod-call Ability, defensive reactions, turning, diving and terminal death have distinct performances.

Three bone-parented sockets are identical in both files: `anchor_mouth`, `anchor_mouth_inside` and `anchor_attack_primary`.

## Verification

`validation.json` checks the delivered compressed files after decoding: exact joint names/hierarchy/rest transforms/inverse-bind matrices, exact action key times and values, identical socket transforms and metadata, finite geometry, normalized nonzero weights, unique dynamic clips, looping seams, static identity scale, stationary root, and the reduced geometry budget. Compression preserves every decoded mesh attribute and animation value. Every closed procedural shell must also have positive signed volume with the intended single-sided material; this enforces outward winding for trunk, both rostra, caudal and all four flippers.

`deformation-validation.json` records:

- Maximum dorsal/ventral/width error across twenty sections: **0.0530 units, 0.884% of length**, under the 4% contract tolerance.
- Signed surface volume: **3.3276 full / 3.2453 puppet**, a 2.5% difference (signed surface integral; the articulated cutaneous split is not a single closed solid).
- Full-to-puppet surface distance: median 0.00424, 95th percentile 0.0384 units.
- All four flipper root joints inside the source trunk.
- Sampled globe volume inside the head: **69.8% left / 61.7% right** (619 samples per globe).
- Every action sampled at six phases with finite skinned positions and per-edge stretch measurements. The current external cutaneous maximum is 3.27× on a small source edge during Parry. A separate fractional-frame lip audit covers the feeding phases specifically; see below. This remains a PREVIEW reconstruction.

Codex visually reviewed paired side/three-quarter views, close mouth views and multi-frame swimming, sprint, heavy strike, dodge and death sheets on 2026-09-13. `exported-motion-review.jpg` is rendered from the shipped GLBs after meshopt decode, viewed from above to expose the lateral tail wave and steering. `action-review.jpg` shows matching side-view action phases, and `volume-review.jpg` compares the bodies from three views.

## Closed-mouth revision — 2026-09-13

The jaw's zero pose is closed in the actual mesh. The builder seats the imported lower jaw by −0.155 radians, applies a small smooth middle-rostrum lip correction, and fits the procedural lower lip against the upper-rostrum underside. Opposite-jaw ray contamination at the procedural tip is removed. Palate and floor ends are retracted inside the rostrum, and mouth sockets follow the revised bind geometry.

Only **Bite, Attack, Heavy and Eat** open the mouth. Idle, Swim, Sprint, turning, diving/rising, defensive reactions, Ability, Growth and Death keep a constant closed jaw. Attack phases return to closed contact without the former negative closing overshoot. The package audit enforces no jaw motion in the other fifteen clips and exact rig/clip/socket parity between bodies.

`mouth-closure-validation.json` proves geometric closure with oral fillers and teeth excluded: 14,400 lateral rays across 60 rostral sections detect **zero through-apertures in either body**. The same scan on the preserved former-open control detects 3,128 full / 3,736 puppet misses and maximum openings of 0.126 / 0.130 units. Thus the puppet's dark lip wedge is a sealed, shadowed surface, not a lumen left open by the rest pose. `closed-mouth-review.jpg` shows Idle and Ability beside a feeding strike for both bodies.

A live Three.js review exposed a separate winding defect that two-sided Blender rendering and geometric aperture scans did not reveal: axial rostra/trunk and mirrored left flippers had inward faces while the skin material was single-sided. The builder now recalculates consistent outward winding on every closed procedural shell; the actual packaged meshes are checked for positive signed volume without enabling double-sided skin. Upper tooth winding is corrected as well. The interior throat material remains deliberately double-sided. A fresh live viewer load verified an opaque, closed procedural snout with no pink interior during Idle and correct trunk/flipper shading. Public portraits were refreshed after this correction.

The prior open `.blend` is preserved locally as `shonisaurus.before-mouth-closure.blend`. Raw source data and PREVIEW status are preserved.


## Lip and material correction — 2026-09-13

The closed-rest revision exposed a real skinning regression: thin lip triangles crossed soft skull/jaw ownership and folded inside out when the jaw opened. The authored mandible is now a separate cutaneous mesh. Its front is owned by the jaw, its rear blends smoothly to the skull at the hinge, and the upper lip stays with the skull. The existing triangles and UVs are preserved; the split duplicates boundary vertices without adding or removing faces. Rigid anterior ownership removes the folding while the rear blend avoids an artificial vertical seam. Both closed mouths still pass the filler-excluded aperture scan.

`lip-validation.json` evaluates fractional frames in Idle, Bite, Attack, Heavy and Eat, including Heavy at exactly 0.35 seconds. Across 54 distinct samples, **zero mouth faces invert**. The identical geometric-normal metric reports **259** inverted faces in the preserved prior closed build at Heavy 0.35 seconds and **one** in the former neutral/open build. The earlier independent runtime review reported 286 using its own metric; counts are not interchangeable. `material-audit.json` records this controlled comparison and proves that all prior skeleton transforms and animation values are unchanged, as well as exact parity with the procedural twin. The puppet and LOD files remain byte-identical to the prior corrected winding version.

The triangular starbursts came from interpolating the source albedo through vertex pigment, amplified by full-strength normal relief. Controlled same-camera/same-geometry renders isolate this from geometry shading. The authored material now uses the original detailed UV albedo, a white COLOR_0 multiplier, roughness 0.7, metallic 0, and normal strength 0.15. `maps/source-albedo.png` preserves the source map; the exported pixels match it exactly. This replaces the faulty vertex-color bake with its clean source texture rather than repainting the source markings. `material-comparison.jpg` shows the controlled variants. No texture change is applied to the procedural twin.

`packaged-mouth-review.jpg` is rendered from the decoded shipped GLBs, with backface transparency explicitly enforcing the skin's single-sided culling. It includes both sides in closed Idle and open Heavy, plus Bite/Eat closeups locally. Root independently reviewed the live viewer with its normal single-sided display: authored Idle at 0.5 seconds and Heavy at exactly 0.35 seconds, zoomed flank plus side and frontal mouth. No disappearing or inverted lip triangles were seen; the oral interior remained present and the pigmentation was smooth without the previous starbursts.

Source lip/teeth irregularity and the inferred oral meshes remain visible at extreme close range; this work does not claim a new oral anatomy reconstruction. The external inversion regression is resolved. The earlier source, bad closed baseline, and controlled material frames remain under `local/triassic-authoring/shonisaurus/lip-material-fix/`.

## No oral geometry, and the eyes seated where they are painted — 20 September 2026

The owner's two notes on this animal were that the eyes should move slightly forward and slightly
up, and that it needs no mouth geometry added. Both are now in `build.py`.

**No oral geometry.** The palate, floor, throat-and-cheeks tube and two rows of conical teeth that
used to be authored inside the mouth are gone. They were invented shape inside a Tripo body whose
mouth is closed at rest, and the mouth rule's first question is whether a mouth needs filling at
all: this one does not. `tools/triassic/gape-solid.py` at full gape (Heavy@0.35, Bite@0.3,
Attack@0.5), against a saturated backdrop with every backface culled, counts **4 px** of backdrop
seen through the body with the old oral parts present and **6 px** without them, against a
tolerance of 12; the other two shots are 0 both ways. What did change is the count of backdrop
pixels the cull *opens* that are not enclosed by the silhouette — 129 to 1,863 on Heavy — which is
the roof of the open mouth seen from above the lip line: its normals face down into the mouth, so
from above-and-side a single-sided renderer culls it and the top of the skull behind it. The
runtime already showed exactly that, because `Oral palate` was the one part the oral classifier
hid in the game, so nothing a player sees has got worse; the floor, throat and teeth the game *was*
drawing were the mouthful the rule is about. `package-audit.mjs` now refuses any node, mesh or
material `src/shared/oral-geometry.ts` would match, and `validation.json` records
`oralGeometry: "none"`. `anchor_mouth`, `anchor_mouth_inside` and `anchor_attack_primary` are
unchanged, and so are all 21 clips: the paired audit reports exact rig, clip and socket parity.

**The eyes.** The globes were typed at raw (±0.0512, 0.337, 0.014). The albedo paints the eye
elsewhere: the darkest patch of each flank *above* the lip line — the lip is darker still, and the
first read of this albedo found the mouth — sits at (−0.0498, 0.3417, 0.0237) and
(0.0466, 0.3460, 0.0235), so the globes were 0.011 and 0.014 raw behind and below their own
sockets. Each globe is now placed at the nearest skin point to its painted centre, inset
`EYE_INSET` = 0.0025 under the skin along the area-averaged skin normal, with the iris and pupil
facing that normal; the seat follows the surface rather than the old seat's x. The move is
**+2.1 % / +4.1 % of head length forward and +5.3 % / +5.2 % up** (left / right), and 1.5 % / 3.3 %
inboard because the head narrows there. Seat before and after, from `build-report.json` and
`validation.json` (`eyes`): centre-to-skin −0.0027 / −0.0021 raw (inside) before, −0.0022 / −0.0022
after; fraction of the globe's surface under the skin 67 % / 59 % before, 77 % / 81 % after;
`deformation-validation.json` samples the globe's volume inside the head as well. Distance from the
globe centre to the painted centre: 0.0108 / 0.0139 before, 0.0017 / 0.0022 after. Both moves are
bounded by assertions in the builder (forward and up by 0.002–0.012 raw, centre 0.0015–0.004 inside
the skin, at least half the surface under it), so a redelivered albedo that puts the eye somewhere
else fails the build rather than moving the eye somewhere odd.
`docs/triassic/throat-repairs/shonisaurus-eyes-before.png` and `-after.png` are the same two
cameras on the shipped file before and after (`tools/triassic/head-views.py`).

Skin: 1.44x before and after (`skin-tears.mjs`, 0 of 21 clips past 2x); every joint owns skin.

## Reproduction

Run from the repository root with Blender 5.2 (the local application is `/Applications/Blender.app/Contents/MacOS/Blender`):

```sh
Blender -b --python tools/triassic/creatures/shonisaurus/build.py
node tools/triassic/creatures/shonisaurus/package-audit.mjs
Blender -b --python tools/triassic/creatures/shonisaurus/deformation-audit.py
Blender -b --python tools/triassic/creatures/shonisaurus/review.py
Blender -b --python tools/triassic/creatures/shonisaurus/review.py -- --mouth-only
Blender -b --python tools/triassic/creatures/shonisaurus/mouth-closure-audit.py
Blender -b --python tools/triassic/creatures/shonisaurus/exported-review.py
Blender -b --python tools/triassic/creatures/shonisaurus/exported-review.py -- --mouth-only
Blender -b --python tools/triassic/creatures/shonisaurus/lip-audit.py
node tools/triassic/creatures/shonisaurus/material-audit.mjs
node tools/triassic/creatures/shonisaurus/portraits.mjs
node tools/triassic/creatures/shonisaurus/correction-sheets.mjs
```

The source blend, decoded/uncompressed intermediates and individual review renders are local authoring outputs under `local/triassic-authoring/shonisaurus/`. Commit the public asset family and this tooling/report directory; the original intake and local `.blend` remain preserved locally.
