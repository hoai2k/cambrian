# Placodus — paired authored body and procedural volume puppet

The delivered Tripo body and its procedural twin share one 26-joint skeleton, the same three
mouth/attack sockets and **25 byte-for-byte equivalent decoded animation performances**. The twin is
also the runtime LOD, with every clip retained so either model can perform the same gameplay. The
body keeps the source's barrel trunk, five-toed splayed manus and pes, procumbent chisel incisors
and pale gastral panel; its hooked tail is straightened by a measured intake correction (below).

| Delivery | Triangles | Packaged bytes |
| --- | ---: | ---: |
| `placodus.glb` — authored Tripo body | 22,119 | 2,117,264 |
| `placodus.puppet.glb` — procedural twin | 8,314 | 787,388 |
| `placodus.lod1.glb` — identical puppet alias | 8,314 | 787,388 |

The reduced model is **37.6 %** of the authored triangles, inside the contract's 40 %. Files are in
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
skinned to its hinge, with the cut's own cross-sections capped, its rims folded, and a palate and
a floor closing the two halves of the mouth separately (below). The design's
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

What replaced the ribbons was one **closed sac** on the cavity's own measured section, *skinned*
rather than split — the floor following the jaw, the roof the skull, and the wall between them
stretching so no opening could part it. It could not part, and it was still wrong: the wall
photographed as a mouth webbed shut, and this animal is where that form was written. It is now the
era's contract (`T.oral_shells`, shared with every body on the kit): a **palate** rigid on the
skull and a **floor** rigid on the jaw, each a closed shell of its own, each filling its own jaw's
interior out to the head's *measured room* — cast inwards from outside on the closed intake surface
(`T.mouth_room`), never a nearest-surface probe, which beside this modelled slit answers about the
lumen's own wall — and overlapping rather than joining behind the hinge, where the jaw's rotation
is zero. There is no wall between them to stretch, and `tools/triassic/oral-shell-audit.mjs` reads
the packaged files to prove it: one unit bone weight per vertex, no triangle bridging the jaws,
every edge shared by two faces, both closed halves present, on the authored body, the twin and the
LOD. The shells run 22 stations by 14 from 0.022 behind the hinge to 0.002 *inside* the mandible's
front (the sac ran 0.004 past it, and its front cap then stood in the open water between the
chisels and the mandible), and every shell vertex is seated inside the head's silhouette by rays
that cannot clamp — from the point, to either side and up and down, each must meet the intake
surface, a point the measured cavity itself contains passing by being in the mouth. Thirteen were
pulled in, the furthest by 0.0117 raw. The crushing bosses still sit between the two.

**There is no hinge envelope any more.** The sphere that stood behind the hinge was blended half to
the jaw and half to the skull — the stretching-wall fault in another shape — and its `depth()`
seating test could not be trusted beside a modelled mouth. What it stood in for, the jaw's own rear
face at x = 0.420 and the skull's open section behind it, is closed with the cut's own vertices:
`T.cap_cut` fans each run of a cross-section to its centroid (64 faces at the hinge and 36 at the
mandible's front on each half of the authored body), wearing the rim's UVs and vertex colour. And
both halves of the cut get a lip: `T.rim_flange` folds the seam's rim in towards the mouth line by
0.0035 raw (150 skull and 125 jaw vertices on the authored body), because a boundary edge is one
polygon thick and at a grazing angle *is* the silhouette. The skin stays double-sided as the
backstop under all of it.

The proof is the shared tool, `tools/triassic/gape-solid.py`, at `CrushBite@0.25 Bite@0.25
Heavy@0.15`: the body rendered at full gape against a saturated backdrop with and without a
backface-cull shim, and the backdrop the cull *opens* inside the silhouette counted.

| shot | before this port (sac + blended hinge envelope) | now (palate, floor, caps, folded rims) |
| --- | ---: | ---: |
| `CrushBite` @ 0.25 | 0 | 10 |
| `Bite` @ 0.25 | 0 | 10 |
| `Heavy` @ 0.15 | 0 | 0 |

Tolerance is 12. The ten pixels are the silhouette of the mandible's front cap at its corner, where
a surface one polygon thick loses its back face at a grazing angle; the marked images beside
`gape-solid.json` put every one of them on that edge and none in the mouth. The shipped body
material is double-sided, so none of them arise at runtime. The honest gape — backdrop present in
*both* passes, between the chisels and the mandible's front — is 418 and 571 px in the two bite
shots, and the sac had 0: a mouth webbed shut has no daylight in it, which is the whole point.
`before-after` plates: `docs/triassic/throat-repairs/placodus-CrushBite-before.png` and `-after.png`.

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
| Backdrop opened by a backface cull, worst of three gape shots | 10 px | was 0 with the sac; tolerance 12 | strict-cull render |
| Oral shell vertices with an open direction to the outside | 0 of 308 | — | 0 |

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

**Swim is tail-driven; Sprint paddles over the same tail.** A travelling wave runs down the seven
caudal joints — each joint's authored yaw peaks 0.074–0.083 of a cycle after the one in front of
it — and in `Swim` the limbs trail and only steer, which is the research's reading of a ballasted
bottom-walker with a laterally flattened tail and short, unmodified, probably webbed feet
(`docs/research/triassic-swimming.json`: "a slow tail scull"). The tail tip sweeps 1.223 units
(Sprint 1.713) against 0.150 (0.217) of skull travel, a ratio of 8.2 (7.9). `Sprint` is the burst,
and the era's rule is that a limbed swimmer's dash has to paddle: measured at the limb roots the
shipped Sprint swept **35°** per cycle where every paddler in the roster sweeps 120–580°, with the
feet hanging under the body while the tail worked (T3D-22). So the stroke was authored over the
unchanged tail wave — from stretched forward to swept back along the flank on the power half,
feathered on the recovery, both sides together and the hind pair a third of a beat behind, as the
same animal's `Crawl` shoves — and now sweeps **155° at every limb root** (`Swim` stays at 24°);
`validation.json` records the number per clip under `limbSweepDegrees` and the decision under
`locomotionDecision`. The paired audit still requires the tail tip to out-travel the paddles. The
root's arc is held inside what `Crawl` and `Pry` already ask of this skin: `Sprint`'s worst edge
went from 9.42× to 11.33× (`fore_paddle_L`, the same edge `Pry` tears to 12.36×, which stays the
body's worst).

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
measured tooth falls on the jaw side of the cut, that the lining carries at least 90 % of the
mouth's measured width and 85 % of its depth at every station the cavity was measured at, that
every cut cross-section capped and every cut half had a rim to fold, and that no oral shell vertex
has an open direction to the outside. `node tools/triassic/oral-shell-audit.mjs placodus` proves the
separate rigid shells in the packaged files, and `gape-solid.json` (folded into `validation.json`)
carries the strict-cull counts.

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
