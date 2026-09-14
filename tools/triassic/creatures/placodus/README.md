# Placodus — paired authored body and procedural volume puppet

The delivered Tripo body and its procedural twin share one 26-joint skeleton, the same three
mouth/attack sockets and **25 byte-for-byte equivalent decoded animation performances**. The twin is
also the runtime LOD, with every clip retained so either model can perform the same gameplay. The
body keeps the source's barrel trunk, five-toed splayed manus and pes, procumbent chisel incisors
and pale gastral panel; its hooked tail is straightened by a measured intake correction (below).

| Delivery | Triangles | Packaged bytes |
| --- | ---: | ---: |
| `placodus.glb` — authored Tripo body | 21,701 | 2,111,872 |
| `placodus.puppet.glb` — procedural twin | 8,446 | 793,848 |
| `placodus.lod1.glb` — identical puppet alias | 8,446 | 793,848 |

The reduced model is **38.9 %** of the authored triangles, inside the contract's 40 %. Files are in
`public/assets/triassic/creatures/`, with studio, 1600 × 1200 transparent select, card and thumbnail
portraits and metadata. Meshopt packaging preserves mesh attributes and animation sample values
exactly; textures are embedded. The model is **5.577 engine authoring units** long, faces +Z in glTF
and uses +Y up; the runtime normalises by the bounding box and applies the species' natural size.
The research registry gives 2.5 m as the representative length.

## Source and reconstruction

The preserved source is `tools/triassic/creatures/placodus/tripo-raw/placodus.raw.glb`, SHA-256
`da0e59fb34fee098f9fdd2da12b95ce1a48de640db1b34428c9b1575508eed84`, from Tripo task
`29cee7a9-c253-42f0-8149-d238b9273d2a` using
`docs/triassic/canonical/model-inputs/placodus/input.png`. The raw file is never changed.

Intake welds coincident texture-seam vertices (11,515 loose-UV vertices collapse to 9,578; eighteen
degenerate triangles go with them) and finds a **single** connected component, so no detached flake
is removed. A true separate lower-jaw shell is cut along the **measured** mouth line and rigidly
skinned to its hinge, with a lined oral cavity and a seated hinge envelope closing the interior
(below). The design's
**ventral armour as a separate rigid part** is the gastral basket: a flat-sided superellipse
footprint measured off the pale plated panel in the source albedo (raw x −0.12…0.25, half-width
0.135, below z −0.045) cut out as its own object on its own `gastralia` bone, which is a child of
`body` and carries **no animation channel in any of the 25 clips**. The skin it is cut from is put
on the trunk bone alone in a ring around the seam, so the cut cannot open however the body moves.

### The tail: a measured step-4 correction

The generated tail is hooked **0.262 of a body length** out of the midline. The greenlit pose and
its four-view sheet both show a straight, symmetric tail, so by the pipeline's own rule the model is
the thing that is wrong. `build.py` unbends it as a bounded intake correction: every caudal
cross-section is carried rigidly from its own measured centreline frame onto a straightened axis
built from the *same segment lengths*, so nothing is stretched, sheared or thinned and the caudal
arc length, depth and width survive exactly. Largest vertex move 0.309 raw units; the mean lateral
offset of the tip drops from **0.2618 to 0.0011** (0.1 % of body length). Because the hook is
unfolded, the body measures 1.1154 raw units nose to tail instead of 1.0, and the tail becomes 42 %
of total length — which is what the canonical pose shows and what the hooked body did not. Nothing
else in the mesh is touched, and `STRAIGHTEN = False` at the top of `build.py` rebuilds the raw
hooked tail for comparison.

### The mouth: a measured cut, and a cavity that is lined

The first delivery cut the lower jaw along a plane — `seam(x) = -0.041 - 0.20*(x - 0.420)`, a
straight tilted ramp — and lined the inside with two narrow ribbons. A reviewer looking at
`CrushBite` mid-gape found three things, all of them true:

1. the cut ran through the front teeth,
2. it ran through the lips rather than along them,
3. the open mouth showed through to nothing.

The source models a **real mouth**, not a line painted on the skin: a slit with an interior. Intake
now finds it rather than guessing at it. Every head vertex casts its own outward normal back into
the mesh over 0.030 raw units; a vertex that hits is looking across the slit at the lip opposite, so
the 193 that answer are the oral cavity. Per station (0.0025 wide, six-thousandths of overlap,
6th/94th percentiles, lightly blurred) that gives the mouth's mid height, half-width and half-depth,
and the mid height **is** the seam. It is a curve: −0.0392 at the hinge, steepening to about
−0.45 through the middle of the jaw and easing to −0.0590 at the front. The shipped ramp was the
tangent to it at the corner and nothing else — it ran up to **0.0060 raw (0.54 % of body length)
high of the real line**, 0.0034 on average, which is the band of upper lip it was taking down with
the jaw.

A curve cannot be a bisection plane, so the head is sheared vertically by −seam(x) first, which
carries the curve exactly onto the plane *z* = 0; the cut is taken there and the shear undone, so
every vertex the cut adds lands on the seam itself and every vertex that was already there returns
to where it was. Only head faces are offered to that pass, so the rest of the body keeps its
topology.

**The chisels.** A tooth is measured the same way: a connected patch of snout standing proud of the
same surface smoothed, further out than a voxel. Nine patches of six vertices or more are found on
the snout and three of them clear the tooth threshold (0.0060 raw) — the pair of big procumbent
chisels at raw x 0.474–0.489, and the tooth pad at the tip, 0.484–0.500. All three hang from the
**premaxilla**, over the outside of the mandible, and the
mouth cavity itself stops at x ≈ 0.478. So the jaw is cut off square at `JAW_FRONT_X`, derived as
0.0009 behind the rearmost chisel vertex (0.4731), instead of being carried on to the snout tip.
`build.py` asserts that no measured tooth is on the jaw side of the cut; the full patch table, with
how each one fell, is in `validation.json` under `mouth.snoutPatches`. **Nothing straddles**: three
patches (the two lip ridges and a chin knob) go whole to the jaw and six whole to the skull.

Measured against the ramp it replaces: the shipped cut carried both big chisels **whole onto the
lower jaw**, away from the premaxilla they grow out of, and left the tooth pad at the tip on the
skull — which is exactly the reviewer's "teeth on the upper jaw and teeth on the lower with a thin
dark seam running between them across the snout". Dropped to a threshold fine enough to pick up the
lips as well (0.0022), the shipped ramp clipped one chisel 13-of-14 and sawed the upper lip ridge
33/20; the new cut puts both chisels 14-of-14 and 13-of-13 on the skull and leaves the lip ridge
split where a mouth line is meant to split a lip.

**The lining.** The old oral floor and palate were two ribbons 0.031 raw wide at their widest, up
the middle of a mouth measured at 0.042, starting 0.004 forward of the hinge and stopping short of
the mandible's front — so an open jaw showed unlined gape at exactly the places a gape is seen
from. And the source material **culls its backfaces**, which is right for a closed shell and wrong
for one that has been cut in half, so unlined did not mean dark, it meant seeing out through the
far side of the head. (Nothosaurus culls the same way and does not show it because its lining runs
almost the whole length of a long narrow snout. It is the reach, not the culling.)

There is now one **closed lining** on the cavity's own measured section — 22 stations by 14, from
0.022 behind the hinge to 0.004 past the mandible's front, at 95 % of the measured half-width and
half-depth — and it is *skinned* rather than split: the floor follows the jaw, the roof follows the
skull, and the wall between them stretches, so no opening the clips reach can part it. It is wound
**inwards** and is the one material here that culls, because what an open mouth shows is the far
wall of the lumen and the near wall has to be got out of the way; the crushing bosses sit inside it
and are seen. The skin does the opposite — `Placodus body pigmentation` is now double-sided, as the
backstop under the lining rather than in place of it. The hinge envelope was enlarged to cover the
jaw's own rear face, the square the cut leaves at x = 0.420 from the seam down to the chin, which
swings into view the moment the mouth opens; the old one reached only to z −0.048 and left the
lower half of it bare.

Measured on the same frame from the same camera, the gape at `CrushBite` 0.25 s went from **20.4 %
see-through to 0.2 %**. See [the before/after sheet](mouth-fix-sheet.jpg). It reads *dark* in those
renders rather than pink: CYCLES path-traces, and almost no light reaches the inside of a closed
sac through a 0.02-unit gape, so what closed the hole is nearly black in a review shot even at the
lightened colour. The engine lights a surface by ambient without occluding it, so in play it will
not be. The measurement, not the shot, is what says the hole is gone.

CYCLES ignores `use_backface_culling`, so `render.py` and `mouth-views.py` emulate it (backfacing
shading points go transparent). Without that a review render shows the near wall the runtime throws
away, and cannot be used to judge either fault.

### The twin

The twin is a procedural **volume resurfacing**, not a decimation of the authored faces: Blender
regenerates topology from a 0.0055 raw-unit voxel occupancy field, relaxes it once and reduces the
new topology to the puppet budget. No source vertex or face is reused. A coarser field was tried
first and rejected by measurement — at 0.007 the remesh itself swallowed a hind foot and the section
envelope failed at 13.7 %. Puppet pigment is sampled through each nearest source triangle's
interpolated UV. The authored body keeps the full embedded original albedo with white vertex colors,
restrained normal relief (0.15) and explicitly nonmetallic skin at roughness 0.7.

## Measurements

`placodus-profile.json` records **21 exact plane-intersection envelopes** of both actual meshes
(body, lower jaw and ventral armour together).

| Measure | Value | As % of the 5.577-unit body | Tolerance |
| --- | ---: | ---: | --- |
| Maximum dorsal/ventral/width envelope difference | 0.01115 | **0.20 %** | 4 % |
| Nearest twin-surface distance, 95th percentile | 0.01401 | 0.25 % | — |
| Nearest twin-surface distance, maximum | 0.21310 | 3.82 % | — |
| Appendage roots seated inside the intake surface | 0.024–0.060 raw | 2.1–5.4 % deep | inside |
| Jaw hinge seated inside the head | 0.0241 raw | 2.2 % deep | inside |
| Measured mouth seam vs. the shipped straight ramp | 0.0060 raw max | 0.54 % of body | now on the curve |
| Measured chisels on the jaw side of the cut | 0 of 3 | was 2 of 3 | 0 |
| Lining section against the measured cavity | 95 % wide, 95 % deep | — | ≥ 90 % / 85 % |
| Gape see-through, `CrushBite` 0.25 s, side view | 0.2 % of the aperture | was 20.4 % | — |

The 71 authored vertices (0.68 % of 10,393) further than 0.15 from the twin are all the floor of the
source's own lip crease at raw x ≈ 0.42, a fold finer than one voxel: the twin is smooth and very
slightly fuller there. Everything else — flanks, tail, toes, armour — agrees to a fifth of a percent.
Joint and socket coordinates are shared, so their parity error is exactly zero. These are generated
measurements, not a claimed human anatomical sign-off.

## Rig and motion

The shared rig is root, body, chest, neck, skull, jaw, the rigid gastralia bone, seven caudal
controls and three controls per limb. Skinning is parameterised by **arc length along measured
polylines** rather than by a body axis: the axial chain projects each vertex onto the centreline
polyline so weight bands stay square to the body, and each limb projects onto its own root → elbow →
wrist → toe polyline with a radius that widens toward the splayed foot. A limb's influence is gated
by how far along that limb the vertex sits, so a seated root blends radially onto the trunk bones
under it. Every vertex has normalised nonzero weights and at most four influences (mean 1.96).

The action set is Idle, Swim, Sprint, TurnLeft, TurnRight, Dive, Rise, Attack, Bite, Heavy, Hit,
Death, Guard, Parry, Dodge, Eat, Stagger, Ability, Grab, Breath, Growth plus this animal's own
**Crawl, Pry, CrushBite and Breathe**. Idle, Swim, Sprint, Guard, Eat, Crawl, Pry and Breathe loop
exactly. Root motion and scale animation are absent, and so is any channel on the armour bone.

**Swim and Sprint are tail-driven.** A travelling wave runs down the seven caudal joints — each
joint's authored yaw peaks 0.074–0.083 of a cycle after the one in front of it — while the limbs
fold back against the flanks and only steer. The tail tip sweeps 1.223 units (Sprint 1.713) against
0.150 (0.217) of skull travel, a ratio of 8.2 (7.9); the fore paddles' lateral travel is a quarter of
the tip's. This is not a paddler that happens to be in water.

**Crawl is a bounding punt, not a lizard's trudge.** At near-neutral buoyancy the animal shoves once
and springs. The fore pair is rearmost at phase 0.083 and the hind pair at 0.233; the body rises
0.380 units off the floor and spends **70 %** of the cycle above the midpoint of that rise; the reach
for the next contact comes at 0.70 (fore) and 0.84 (hind), after the float. The hind paddle travels
0.688 vertically in Crawl against 0.165 in Swim. The roster's `punt` and `sink` say the same thing.

Pry holds the incisors under a shell and levers with the skull while the forelimbs brace, twisting a
little on each stroke, as a loop. CrushBite is the feeding crush: seize, haul back, six grinding
closures against the palate, then a swallow. Ability is the roster's crush bite at its own 0.9 s
duration — a short forward clamp with a head shake — and is deliberately a different performance from
CrushBite, not the same clip twice. Breath is the contract's one-shot surface gesture; Breathe is the
settled surface loop the era's air-stamina economy asks for, nose up with the ribs working and the
limbs sculling. Turns bank the torso and propagate a caudal steering curve; Guard settles the
armoured belly onto the floor with the limbs braced and the head tucked; Death rolls the body and
relaxes the appendages. These clips supply body performance; world travel remains engine-owned.

## Verification

`node tools/triassic/creatures/placodus/audit.mjs --package --decode` binds the checks to the final
packaged hashes. It asserts exact paired joint names, hierarchy, local rest transforms, inverse bind
arrays, socket transforms and metadata, clip names, timing and every sample array; normalised
weights; finite attributes; unique dynamic clips; loop seams; no root or scale channels; no channel
at all on the rigid armour bone; and that the reduced model is at most 40 % of the triangles. It then
plays **61 phases of every clip on both models** through the Three.js GLTFLoader and AnimationMixer,
evaluating actual skinned vertices, and runs the Swim/Sprint and Crawl gait assertions above over 121
phases. The Blender build additionally checks every vertex of both bodies at 13 phases of all 25
clips, and the loop seams close to 1e-17. The build also asserts, from its own measurements, that no
measured tooth falls on the jaw side of the cut and that the lining carries at least 90 % of the
mouth's measured width and 85 % of its depth at every station the cavity was measured at.

`delivery-files.json` records the size, hash and pixel dimensions of every delivered file.

Sheets, rendered from the decoded packaged files through identical cameras and lights for both
models:

- [Side, top, front, belly and mouth comparison](paired-volume-sheet.jpg)
- [Paired deformation: Idle, Swim, turns, Attack, Bite, Heavy, Dodge](paired-deformation-sheet.jpg)
- [Remaining actions: Sprint, Dive, Rise, Hit, Stagger, Guard, Parry, Eat, Death, Ability, Grab, Breath, Growth](paired-actions-sheet.jpg)
- [This animal's own clips: Crawl, Pry, CrushBite, Breathe](paired-era-clips-sheet.jpg)
- [The Crawl contact cycle from the side and from above](paired-gait-sheet.jpg)
- [The mouth before and after this correction, same views, same frame](mouth-fix-sheet.jpg)

No independent human review is invented by this automated QA record.

## Reproduction

From the repository root with Blender 5.2 and the project's Node dependencies installed:

```sh
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/placodus/build.py
node tools/triassic/creatures/placodus/audit.mjs --package --decode
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/placodus/render.py -- --decoded
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/placodus/render.py -- --decoded --puppet
python3 tools/triassic/creatures/placodus/contact-sheets.py
node tools/triassic/creatures/placodus/delivery-record.mjs
```

The before/after mouth sheet is made by rendering `mouth-views.py` into two folders — once against
a decoded copy of the delivery being replaced (`--glb <name>.glb`), once against the rebuild — and
composing them:

```sh
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/placodus/mouth-views.py -- local/triassic-authoring/placodus/mouth-after
python3 tools/triassic/creatures/placodus/mouth-sheet.py
```

The paired editable Blender project, decoded review GLBs and individual frames live in
`local/triassic-authoring/placodus/`. `build.py` authors both geometry and performance and writes
only this species' asset family; it touches no shared registry and performs no git operation.

## What is still open

- Placodus is **not** in `tools/triassic/shipped.json` and its preview badge is **not** cleared.
  That is the reviewer's call after looking at the sheets. Until then the roster still borrows a
  Devonian body through `TRIASSIC_STAND_INS` and the four portraits in
  `public/assets/triassic/creatures/` are now model renders rather than the crops
  `tools/triassic/placeholder-portraits.mjs` writes; re-running that tool would put the crops back.
- The lower jaw now ends at raw x 0.4731 rather than at the snout tip, because that is where the
  modelled mouth ends and where the premaxillary chisels begin. `anchor_mouth` is still on the jaw
  bone at raw x 0.497 — it now sits a little ahead of the jaw's own front edge, between the upper
  chisels and the mandible, which is arguably where a mouthful belongs but is a change of reading a
  reviewer should look at. The rig, the anchors and the clip set were not touched.
- The gape reads slightly shorter than it did, for the same reason: the jaw is 0.027 raw shorter, so
  at maximum opening (0.30 rad) its front edge drops 0.020 raw instead of 0.028. The clip amplitudes
  were deliberately left alone — a crusher's gape is short by design — but whether the shorter jaw
  now under-reads is a judgement for the review, not a measurement.
- The mouth interior colour was lightened from 0.085 to 0.26 red so that a lined mouth and an
  unlined one do not photograph the same. That is a presentation choice, not a measurement — and it
  is not enough to make the cavity read as pink under path tracing, only enough to keep it from
  being black. If a reviewer wants the mouth to *read* in a still, the answer is fill light in
  `render.py` or a little emission on the lining, and both are decisions to take deliberately.
- The tail straightening is a deliberate departure from the raw generated surface. It is bounded,
  measured and reversible from one constant, but it is the one place this delivery changes the shape
  Tripo returned, and a reviewer who would rather keep the hook can rebuild with `STRAIGHTEN = False`.
- Surface and tooth detail remain limited by the Tripo reconstruction: the palate's bean-shaped
  crushing teeth are authored geometry in the mouth interior, not source detail, and the gastral
  basket is the source's painted panel rather than modelled ribs.
- Living colours, soft tissues and movements are artistic reconstruction.
