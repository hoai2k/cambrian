# Keichousaurus — paired authored Tripo body and procedural twin

*Keichousaurus hui*, 0.3 m, the male canonical: a pachypleurosaur that rows with an enlarged
forelimb and undulates for the strike. Built to Nothosaurus' pattern, because it is the same animal
an order of magnitude smaller, and Nothosaurus is the era's cleanest body by skin-tear measurement.
Awaiting review: registered in `src/content/triassic/review-bodies.json`, **not** in
`tools/triassic/shipped.json`, so the game still borrows a Devonian body for it and the preview
badge stands.

## Reproduce

```
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/keichousaurus/build.py
node tools/triassic/creatures/keichousaurus/audit.mjs --package --decode
node tools/triassic/skin-tears.mjs public/assets/triassic/creatures/keichousaurus.glb
/opt/blender/blender -b --factory-startup --python tools/triassic/gape-solid.py -- keichousaurus \
    Bite@0.25 Heavy@0.1 Attack@0.1 Eat@0.4 Ability@0.1
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/keichousaurus/render.py
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/keichousaurus/render.py -- --puppet
node tools/triassic/creatures/keichousaurus/delivery-record.mjs
node tools/triassic/review-bodies.mjs
```

`qa.json` holds the two figures that cannot be measured inside the build, and `build.py` folds it
into `validation.json` so a rebuild carries them. CYCLES on CPU throughout: EEVEE and Workbench
want EGL, which this container has not got.

## What was measured, and what it says

| | |
|---|---|
| Source | `tripo-raw/keichousaurus.raw.glb`, 19,020 triangles, one closed shell, sha256 `7396ab10…` |
| Envelope, authored against twin | 20 of 21 stations inside the 4 % tolerance; one recorded exception, below |
| Surface distance, authored to twin | max **0.0084**, p95 **0.0027**, p99 0.0038 on a 5.0 model |
| Joints | **27** — root, body, chest, three cervicals, skull, jaw, seven caudals, four limbs of three |
| Clips | **23** — the 21 contract clips plus Shoal and Breathe |
| Triangles | authored **20,264**, twin **7,732**; LOD fraction 0.38 |
| Skin tears | **2.34×** (Sprint, `chest`), and the same figure including the oral parts — it was 6.57× when the lining was one stretching sac |
| Gape solid | **PASS**, 0 px of 378,000 seen through the body at every shot, tolerance 12, on the sac and on the palate/floor pair alike |
| Limb sweep per cycle | Swim fore 54.9° / hind 30.3°; Sprint 73.8° / 40.8°; Shoal 46.7° / 25.8° |
| Anchors | `anchor_mouth` (jaw), `anchor_mouth_inside` (skull), `anchor_attack_primary` (skull) |

Recorded for the neutral-pose pass: mean curvature radius over mean half-section — tail **49.5**,
spine **19.5**, neck **12.8** — and paired-limb asymmetry, which is the one number this generation
is genuinely lopsided on: the right forelimb's paddle joint sits **0.040 of a body length** further
back than the left's, though both reach the same span (0.281 each side).

## Intake

The generation arrives lying along +Y with the head at +Y, so intake turns it a quarter turn about
Z into the era's raw frame. **It is applied to the mesh data and its split normals by hand**, not
through `transform_apply`: the importer leaves the object at identity in a background session and
the operator then silently does nothing, which the first build discovered by putting every joint
0.08 outside the body. There is an assert on the turn now.

Welding is Nothosaurus' two stages — 1e-6 for the texture seams, 5e-4 for the hairline cracks the
first leaves. Ten open edges before, none after, one connected component, no flakes.

## The mouth

**Placodus' cavity method finds nothing here.** Casting every head vertex's own outward normal back
into the mesh returns *zero* hits at every gap from 0.008 to 0.030, against Placodus' 120-plus: the
snout is one smooth closed tube and the mouth is painted on it. So the lip is read off the albedo,
which is Dinocephalosaurus' technique.

But Dinocephalosaurus' *feature* is the wrong one on this animal, and that is worth writing down.
Its method takes the light/dark **step off the pale belly** as the lip. Run here it returns the
countershading boundary, which on a long-necked swimmer runs from high on the neck down to the
snout, and it put the seam **0.82 of the local radius above** the head axis at the hinge — a
mandible that would have been most of the skull. What this generation actually paints, and what a
head close-up shows plainly, is a thin **dark line on the pale lower flank**, below the eye and
below the countershading boundary. So the lip here is the *darkest row* of each flank within the
pale zone, per side, per station, kept only where it is genuinely a line (0.045 darker than that
side's own median). Eleven of 22 stations measure; the mean contrast is 0.236; the least-squares
ramp over them leaves a residual of 0.058 of the local radius, and the mandible is **0.316** of the
head's depth at the hinge — the check Macrocnemus failed.

The frame's roll is measured, not assumed, by the first circular harmonic of the darkness round
each station. It came out 1.3° off, which is a way of saying the head frame taken from the
centreline was already square — worth confirming rather than hoping, since Dinocephalosaurus' was
rolled most of a right angle and cut the jaw off the side of the snout.

The interior is **a palate and a floor** (`T.oral_shells`, T3D-12B): a palate rigid on the skull
and a floor rigid on the jaw, each a closed shell filling its own jaw's interior out to 0.84 of the
head's measured room, overlapping rather than joining at the corner of the mouth where the jaw's
rotation is zero. The seam they are built on is unchanged — the thin dark lip line within the pale
zone, above, not the countershading boundary. One sac whose wall stretched between the two bones
stood here before, and at `Bite`'s widest it photographed as a flat pink triangle webbing the mouth
shut ([before](../../../../docs/triassic/throat-repairs/keichousaurus-Bite-before.png),
[after](../../../../docs/triassic/throat-repairs/keichousaurus-Bite-after.png)); the shells stretch
nothing, so the body's worst deformer went from 6.57× (the sac) to the skin's own 2.34×. The room the
shells fill is measured by `mouth_extent`, which casts *outwards* from the mouth axis — honest here
and only here, because this generation models no slit for a ray to stop on. Three separate leaks
had to be closed on the sac, each naming a different mistake, and all three stayed closed on the
shells:

1. **The mandible's tip swung out from under it.** The lining's front was pinned entirely to the
   skull by a taper meant to stop tearing. The floor of the mouth at the front *is* the tip of the
   mandible, so the jaw's share now runs all the way to the front cap.
2. **The gape opened onto the backfacing inside of the lower jaw.** A lining drawn as a symmetric
   tube about its own lip line has a floor where a real mouth has a deep one and a shallow palate.
3. **The commissure.** The lining's reach is now *measured* — three rays from each seam station, up,
   down and out to each side — and it takes a fixed share of what they find, rather than a fraction
   of the head's mean radius, which is deep above the lip and shallow below it.

The lining being inside the head **is** asserted on this animal, unlike Placodus, and the
difference is instructive: Placodus' shell folds in through a real modelled slit, so a point in the
lumen is outside the closed shell and a nearest-surface depth there is untrustworthy. This shell has
no slit at all, so the measurement means what it says — and it earns its assert, because the first
pass at closing the gape put a red nub on the snout at rest.

## The gait

The research reads this animal as forelimb-driven rowing with tail-assisted turns, off the enlarged
male humerus and the broad paddle. So Swim, Sprint and Shoal are a fore-pair row against a caudal
travelling wave, with the hind pair at 55 % of the fore pair's throw and half a cycle out of phase.
The audit asserts all of it as numbers: every paddle travels, the fore pair out-travels the hind
pair by at least 1.3×, the fore/hind phase gap sits between 0.3 and 0.7, and every caudal joint
peaks later than the one in front of it. Shoal is the tight schooling cruise and is asserted to hold
the head steadier than Swim (0.044 against 0.091 of lateral skull travel).

## What is weak

- ~~The oral lining is the body's worst deformer at 6.57×~~ **Closed by T3D-12B**: the sac is a
  palate and a floor now, rigid on their own bones, and the figure including the oral parts is the
  skin's own 2.34×. The skin is cleaner than Nothosaurus.
- **One envelope station of 21 is outside the 4 % tolerance**, at raw x −0.198: the twin's right
  hind paddle stops 0.009 of a body length short of the authored blade's knife-edge tip, so the one
  station that lands in that 0.9 % reads the whole paddle as absent rather than displaced. The voxel
  is already at 0.0026 — 160,000 triangles before the LOD budget reduces them to 7,700 — and the tip
  is thinner than any voxel this twin can afford. The surface distance, which a knife edge does not
  defeat, is 0.0084 at its worst.
- **The generation is lopsided at the shoulder**: the right forelimb sits 0.040 of a body length
  further back than the left. The rig follows the generation rather than correcting it, so the two
  paddles row in phase from slightly different stations.
- The glTF exporter warns that the twin's meshes "may be exported wrongly"; the packaging audit
  compares every decoded attribute array by value and finds no difference, so it is noise from the
  voxel remesh rather than a defect in what ships.
