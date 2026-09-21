# Hybodus — the S taken out of a generated shark, on a twenty-four joint rig

**Status: built, measured and rendered; not shipped.** `hybodus` is deliberately *not* in
`tools/triassic/shipped.json` and its preview badge in
`src/content/triassic/pending-refinements.json` is untouched, so nothing in the game has changed.
The animal still borrows its Devonian stand-in in play. This directory is the candidate and the
evidence for it; a human decides whether it ships.

The delivered pair keeps the generation's fusiform trunk, its two spined dorsal fins, its broad
pectorals, its pelvics and anal fin and its heterocercal tail, on one 24-joint skeleton with the
same three sockets and **23 byte-for-byte identical decoded animation performances**. The twin is
also the runtime LOD.

| Delivery | Triangles | Vertices | Packaged bytes |
| --- | ---: | ---: | ---: |
| `hybodus.glb` — worked Tripo body | 22,161 | 13,223 | 1,836,388 |
| `hybodus.puppet.glb` — procedural twin | 7,984 | 4,027 | 1,314,436 |
| `hybodus.lod1.glb` — byte-identical twin alias | 7,984 | 4,027 | 1,314,436 |

The reduced model is **36.0 %** of the authored triangles, inside the contract's 40 %. The model is
5.000 engine authoring units long, faces +Z in glTF and uses +Y up; the research registry
(`docs/research/triassic-swimming.json`) gives the animal 2 m.

---

## The generation arrived folded, and unbending it is the whole of intake

The body Tripo returned is a gentle S with its tail swung a quarter of a body length out of the
midline — visible in `tripo-raw/review/top.png` and measurable. Nothing here resculpts it. Intake
measures the animal's own centreline off its own surface and carries every cross-section **rigidly**
onto a straight axis: same section, same spacing, same roll, different place.

| | |
| --- | ---: |
| centreline arc | 0.7913 of the finished body |
| total turning of that centreline | **87.6°** |
| median section radius | 0.0546 |
| mean curvature radius ÷ section radius | **14.5** |
| largest vertex move | 0.3322 raw, 28 % of the finished length |
| tail tip's distance from its own chord, before | 0.0658 |
| tail tip's distance from the midline, after | **0.0067** |
| body length, before → after | 1.000 → **1.1848** |

That last row is the honest price: an animal folded into an S measures shorter in a box than it is,
and straightening it makes it 18 % longer. The snout finishes 0.009 off the midline and 0.021 above
the centreline, which is the check that the carry landed square.

**Four things had to be measured rather than assumed**, and each of them was got wrong first:

1. **Which end is the head.** A tail tapers to a blade and a head does not, so the head is the end
   whose first fifth carries the thicker shell — 0.0945 against 0.0206 here, a decisive margin, and
   the builder asserts the margin rather than trusting a constant. (Saurichthys is the animal this
   rule fails on; see its README.)
2. **The centreline has to be smoothed hard.** Band-to-band centroid noise on a finned body is a few
   thousandths across — invisible in a plot and catastrophic in an arc length. Raw, this shark
   measured **1,710°** of total turning and an arc a quarter longer than its own chord, and
   straightening it onto that arc would have stretched the animal by a quarter.
3. **The roll comes off the countershading.** A roughly circular section is rotationally ambiguous,
   so the first circular harmonic of the darkness round each station is taken as dorsal. Mean
   harmonic strength **0.614** over 57 of 60 stations, with the measured dorsal drifting 33.2° along
   the body. An earlier version rolled an angle measured in the *source's* transport frame onto the
   *target's*, which is a different frame, and took 24° out of the pectoral span; choosing each
   target frame so that that station's own measured dorsal lands on the target's up is exact.
4. **The head is carried rigidly, and the boundary must not be a switch.** A skull is not a tube and
   re-spacing its rings squashes the snout, so the head's own stations are straightened and their
   frames frozen to the one at the head/trunk junction — the single carry is then a rigid transform
   over the whole head *and* continuous with the trunk behind it. Blending between two maps at a
   threshold instead showed as a step in the flank and cost 0.116 of a body length of pectoral span.

**How far from neutral the rest pose is**, region by region, which is what decides whether a curve
can be straightened on the rig or has to come out of the mesh first:

| Region | arc | turning | section radius | mean curvature radius ÷ section |
| --- | ---: | ---: | ---: | ---: |
| whole spine | 1.192 | 87.6° | 0.0567 | **13.75** |
| head and trunk | 0.566 | 35.8° | 0.0952 | 9.52 |
| tail | 0.465 | 41.1° | 0.0267 | 24.26 |

There is no neck to measure separately. For comparison, Dinocephalosaurus' neck came out at 2.8 and
had to be unbent in the mesh; its tail at 9.0 was the easy half. Nothing on this animal is tighter
than 9.5, so a rig could in principle have carried the curve — the mesh unbend is here because the
bind pose should be straight, not because the rig could not cope.

**Left–right asymmetry of the paired fins.** The rig's own joints are mirrored exactly
(0.0000 of a body length), because `seat()` pulled both roots in by the same amount. The
generation's own asymmetry is not zero: mirroring the intake surface in x and asking every
paired-fin vertex how far it is from its reflection gives a mean of **1.03 %** of body length and a
95th percentile of **4.20 %**. No rig corrects that; it is the shape Tripo returned.

---

## The mouth

**The cavity is modelled, so it was measured rather than guessed at.** Casting every head vertex's
own outward normal back into the mesh finds 190 vertices that look across the slit at the lip
opposite — Placodus' method, and it reaches this animal where it found nothing at all on
Dinocephalosaurus. The sweep is fenced to the inside of the head (inside 60 % of the local half
width and 75 % of the local half depth); without the fence the armpit of a pectoral fin and the
notch behind a gill flap pulled the measured mouth line 0.085 of a body length out of the animal.

| | |
| --- | ---: |
| method | geometric (normals cast back into the mesh) |
| cavity vertices found | 190 over 7 stations |
| the mouth's extent | raw y −0.5464 … −0.4753, 6 % of body length |
| how far the measured lip line departs from a straight line | 0.00153 raw, **0.13 % of body length** |
| **the cut's own deviation from that lip line** | **0, by construction** |

A fish mouth is often genuinely straight and this is the easy case: the measured line departs from a
straight fit by an eighth of a percent of body length. The cut follows the measured curve anyway —
the head is sheared vertically by −seam(y), which carries the curve exactly onto the plane z = 0,
the cut is taken there and the shear undone, so every vertex the cut adds lands on the measured line
itself and every vertex that was already there returns to where it was.

**The generation arrived with its jaws parted, and they are closed in the neutral pose.** The slit
is 0.0167 of a body length thick on average, which on this short deep jaw is a closing rotation of
**18.7°**. Per the era's rule the open mouth is a pose rather than the animal, so the jaw rests shut
in `Idle`, `Swim`, `Sprint`, both turns, `Dive`, `Rise` and everything else that is not a strike,
and only `Bite`, `Attack`, `Heavy`, `Eat` and this animal's own `Shake`, `Grab` and `Ability` open
it. **It is not free, and the cost is measured:** posed shut, **638 of 849** mandible vertices lie
inside the skull's own surface, to a maximum of **4.7 %** of body length and a mean of 1.0 %. That
is the generation's two tooth rows, modelled apart, meeting for the first time. It is interior — it
does not show from outside at any angle in the sheets — but it is real, and **this animal wants a
mouth-closed regeneration** before it ships.

**The teeth are the generation's own.** They were measured before anything was decided about them:
543 vertices in the oral zone, 110 of them standing proud of their own neighbourhood, the tallest by
0.0070 raw — 0.7 of the mouth's own half depth. That is a modelled dentition, not a hint of one, so
nothing is authored here and 504 tooth-bearing vertices go whole onto the mandible.

**Which jaw a tooth belongs to is decided by the surface it grows out of, not by its own height.**
A height test on the vertex splits interlocking teeth down the middle, and a graded one stretches
each half between two bones. Taking the height of the *smoothed* surface instead — the tooth's own
base — sends every tooth whole to its own jaw. Flood-filling labels from the skin was tried first
and is worse: on a slender rostrum the seeds are sparse and the label boundary wanders through the
snout. The labels are looked up by **position**, never by index: the bisect adds vertices and
deletes faces, so a post-cut index means nothing to an array built before it, and read by the wrong
index the mandible's weight scatters at random through the head.

### The mouth's interior, and proving the gape is not a hole

**A palate and a floor, not one sac.** What stood here was one lining on the mouth's own measured
section, *skinned* so its roof followed the skull, its floor the jaw and the wall between them
stretched. It could not part, and it was still wrong: it photographed as a mouth webbed shut, and
the black cavity in every strict-cull render was its own inward-wound near wall. It is now the
era's contract, imported from `_pipeline/tripo.py` rather than copied — `T.oral_shells`: a
**palate** rigid on `skull` and a **floor** rigid on `jaw`, each a closed shell wound outwards, each
filling its own jaw's interior to a room cast inwards from outside on the closed intake surface,
overlapping behind the hinge where the jaw's rotation is zero and joined nowhere.
`tools/triassic/oral-shell-audit.mjs` reads the packaged files and proves it: one unit bone weight
per vertex, no triangle bridging the jaws, every edge shared by two faces, both closed halves on the
authored body, the twin and the LOD; `throat-audit.mjs` reports 0 mixed jaw/skull vertices in the
lining (320 of its 336 were mixed before).

Four things about this generation had to be measured before that contract fitted it, and each is
recorded in `validation.json` under `oralShells`:

- **It arrived gaping, so each shell is built about its own jaw's edge of the lumen.** Built about
  the mouth line — the mid-height of the modelled cavity — both shells hang in open water on a body
  whose jaws are parted in the bind pose. The palate is built about the roof of the mouth and the
  floor about the top of the mandible, each read as the **largest empty interval** on the vertical
  line through the mouth's own axis (not the first surface a cast finds — at the front of the mouth
  the cavity's median sits inside the lower jaw and a cast from there called the lower jaw's top
  the roof), never further than 0.0015 of a body from the jaw's actual surface, and each with a
  room measured from *that* line with its width taken in the jaw's flesh. The floor ends where
  there is mandible under the axis (`floorFrontY` −0.5413 against the mouth's front −0.544): a
  gaping mandible's rami reach the front while its symphysis has swung back, and a floor carried to
  the palate's front ended in the water ahead of the jaw it is rigid on.
- **The mouth's lateral centre is measured** (`lateralAxisAtStations`), 0.004–0.015 raw off the
  midline here; a lining on x = 0 is where the first build stood beside the jaws.
- **Every shell vertex is seated inside the head's silhouette** by rays that cannot clamp — from
  the point, to either side and up and down against the closed intake surface, with the two
  exceptions a gaping mouth needs written out: a point the measured gape contains may look out
  through the parted lips, and a palate point may look down through the gape at nothing. 125
  vertices were pulled in, the furthest by 0.069 raw (the throat bowl's corners). This replaces
  the old `np.interp` clearance, which is recorded but no longer the thing asserted.
- **The throat is half the mouth's length** (`throatFraction` 0.50, kit default 0.18) and the
  shells fill 97 % of the measured room: with the jaw at its widest the mandible swings clear of the
  corner of the mouth, and a line of sight entering under it met nothing until the inside of the
  far cheek — every one of the 613 pixels a first port left at `Bite` was one back-facing body
  surface and nothing else, traced pixel by pixel. A bowl over the rear half of the mouth is what
  stands across that line; when the jaw shuts the floor rises into it unseen.

**Three more faults were in the cut itself, and none of them was the lining's.** The hinge
cross-section the plane cut leaves through the skull was open — the back wall of the mouth was
simply absent — and is now capped with its own cut vertices (`T.cap_cut`, over the rear band of the
window rather than the plane alone, because this body's mandible is labelled by the surface each
vertex grows from and the window's rear edge does not lie on the plane; 17 faces on the authored
body). The seam's rim is folded in by 0.0035 raw (`T.rim_flange`, 88 vertices, running out before
the snout where the two rims meet), because a boundary edge is one polygon thick and at a grazing
angle *is* the silhouette. And **the mandible's normals were inward**: `holes_fill` had closed the
cut boundary as the earlier note says, but the `recalc_face_normals` after it chose one consistent
sense for a shell it could not close, and on this body that sense was inward — 1,330 of 1,641 faces
pointed into the jaw in the shipped file (measured on `main`'s GLB), so a single-sided pass drew the
lower jaw transparent and the black sac showed through it from every side. The part's faces are
now put to a vote against the intake surface's normals and flipped when the vote is against them
(`mandibleNormalVoteAgainstTheIntakeSurface`: −1292 on the authored body, +212 on the twin, which
was already right).

The proof is the shared tool, not one of my own:

```
blender -b --python tools/triassic/gape-solid.py -- hybodus Heavy@0.50 Attack@0.43 Bite@0.17
```

| shot | seen through the body, before this port | now | of which coincide with pixels the shipped body already opened |
| --- | ---: | ---: | ---: |
| `Heavy` @ 0.50 | 498 | **346** | 343 |
| `Attack` @ 0.43 | 667 | **517** | 497 |
| `Bite` @ 0.17 | 222 | **6** | — |

`Bite` is the widest gape of the three and is where the mouth is judged: 6 px, the silhouette's own
antialiasing where the mandible is one polygon thick, against a tolerance of 12. **The tool still
fails this body at `Heavy` and `Attack`, and what it fails on is not the mouth.** The remaining
pixels are one vertical strip behind the corner of the mouth (x 523–546 in the 700-wide frame in
both shots), within a pixel of the strip the shipped body opened before anything here was touched;
a ray cast through each of them meets **one back-facing skin surface and no front face**, exiting
under the throat 0.06 of a body *behind* the hinge, further back than anything in the mouth
reaches. That is an open seam of the generation itself — the first opercular slit into a hollow
head — and it was there under the sac too, hidden in the side view by the sac's wall and the
inward mandible. Saurichthys' equivalent seams sealed as closed loops (`T.seal_seams`, 12 faces
there); on this body 178 boundary edges on the head are not loops and the sealer closes 8. Filling
a non-manifold crack is inventing geometry across it, so it is recorded as a generation defect
rather than modelled over, and the shipped body material is double-sided so none of it arises at
runtime. `gape-solid.json` beside this file carries all of it, with the pixel classification, and
the builder folds it into `validation.json`.

---

## Rig

24 joints: `root`, `body`, `chest`, `skull`, `jaw`; `tail_00…tail_06`; `caudal_upper` and
`caudal_lower`; `dorsal_1` and `dorsal_2`; `pec_upper/pec_mid/pec_tip` per side; `pelvic` per side.
Both dorsals get a bone because both are large and spined enough for a lag to read.

Skinning is by station along the measured centreline for the axial chain and by measured **shell
thickness** for the fins — a blade is thin and a trunk is not, which separates a fin from the flank
it grows out of without guessing a boundary. The thickness is the *neighbourhood minimum*: a vertex
on a blade's rim has a normal lying almost in the plane of the blade, so its own ray runs the length
of the fin instead of across it, and uncorrected that weights the rim to the body and tears a fan of
spikes out of the fin on the first roll. Every vertex on both bodies has normalised non-zero weights
and at most **four** influences.

**Three corrections took the worst edge stretch on this body from 56.0× to 5.9×**, and each of them
was found by a number rather than by eye:

1. **Every fin's region gate is feathered.** They were hard tests — `F(.19) < y < F(.34)` and the
   like — and a blade runs past the end of its window: at the distal edge of the pectoral that put
   `pec_tip_L: 1.000` on one vertex and pure skull-and-chest on the vertex a hundredth of a unit
   away from it, and `skin-tears.mjs` read the edge between the two as 56× through the shake. Each
   fin now *bids* for a point as a product of slopes and the strongest bid wins, so no vertex is
   ever a step away from its neighbour.
2. **The weights are relaxed over the mesh's own graph** afterwards — ten passes, each keeping 45 %
   of a vertex's own weights and sharing the rest equally among its edge-neighbours. The formula
   reads a *measured* shell thickness and that measurement is noisy at a fin's base, so two vertices
   a hundredth of a unit apart could still land either side of the blade mask. Averaging cannot
   invent an influence that was not already next to a vertex; it removes the step instead of moving
   it.
3. **A fin's radial ramp is measured, not named.** The caudal lobes were gated on the same thinness
   rule as the paired fins, and a heterocercal tail's long lobe carries the end of the vertebral
   column and measures as trunk: `caudal_upper` came out owning **no vertices at all**, so the lobe
   lag the clips animate was moving a bone that drove nothing. The ramp now runs from the quartile
   of how far out that stretch's thin vertices actually lie to the 80th percentile — 0.0027 to
   0.0177 of the body here — and both lobes own their own blade (241 and 284 vertices). All 22 of
   the joints the body is skinned by now own geometry, `jaw` carries the mandible and the lining,
   and only `root` is unskinned, which is what `validation.json`'s `verticesPerBone` says;
   `bladeVerticesByStation` beside it is the measurement that settled it.

Every fin root is seated inside the trunk's own cross-section, which the builder asserts:

| root | depth inside the skin (raw) |
| --- | ---: |
| `pec_upper_L` / `pec_upper_R` | 0.0257 / 0.0323 |
| `pelvic_L` / `pelvic_R` | 0.0289 / 0.0195 |
| `jaw` (the hinge) | 0.0261 |

## The twin

A voxel volume resurfacing at 0.0060 raw units, relaxed and reduced. No source vertex or face
survives it; pigment is sampled through the nearest source triangle's own interpolated UV with a
bilinear lookup, so nothing averages unrelated atlas islands at a welded seam. The blades — and only
the blades, by their own measured thickness — are dilated 0.006 along their normals **on the twin's
copy** before the field is sampled, because an occupancy field stops two or three voxels short of a
trailing tip; the authored body is never touched by it. The relaxation that takes the voxel
staircase off the trunk is masked by the twin's own thickness, because two unmasked passes of
smoothing simply eat a blade two voxels thick.

| | Measured | Fraction of the 5.000 body | Tolerance |
| --- | ---: | ---: | ---: |
| maximum width/dorsal/ventral envelope difference over 21 stations | **0.0605** | **1.21 %** | 4 % |
| nearest-twin-surface distance, max | 0.0745 | 1.49 % | — |
| the same, 95th percentile | 0.0264 | 0.53 % | — |
| `anchor_mouth` to the nearest authored surface | 0.0138 | 0.28 % | 2 % |
| `anchor_mouth_inside` | 0.0118 | 0.24 % | 2 % |
| `anchor_attack_primary` | 0.0172 | 0.34 % | 2 % |

`anchor_mouth` (role mouth) is on the **jaw**, `anchor_mouth_inside` (role swallow) on the **skull**
at the measured throat, and `anchor_attack_primary` (role attack) on the **skull** — this animal's
light and heavy attacks are both a bite, so the bone that delivers the blow is the one that carries
the jaws. (`tools/creatures/motion/pose-check.mjs` does not apply here: it reads a
`performances/<id>.mjs` in the Cambrian and Devonian motion format, and this body's clips are
authored in Blender. The equivalent check is `audit.mjs`, which plays the packed file and measures
the mouth socket's travel in the skull's own frame.)

## Motion

21 contract clips plus this animal's own **Shake** and **SpineBrace**.

| Clip | s | | Clip | s | | Clip | s |
| --- | ---: | --- | --- | ---: | --- | --- | ---: |
| Idle\* | 2.6 | | Attack | 1.0 | | Stagger | 1.2 |
| Swim\* | 1.8 | | Bite | 0.5 | | Ability | 1.0 |
| Sprint\* | 1.1 | | Heavy | 1.2 | | **Grab\*** | **1.1** |
| TurnLeft | 1.6 | | Hit | 0.6 | | Breath | 2.4 |
| TurnRight | 1.6 | | Death | 1.8 | | Growth | 1.5 |
| Dive | 1.4 | | Guard\* | 1.2 | | **Shake** | **1.4** |
| Rise | 1.4 | | Parry | 0.4 | | **SpineBrace\*** | **1.2** |
| | | | Dodge | 0.5 | | Eat\* | 1.6 |

`*` loops exactly — the loop seam is 0.0 to the float on all seven. Grab is a held loop at 1.1 s,
inside the 0.9–1.2 s the contract asks for, and the audit checks both the duration and the seam.
Root motion and scale animation are absent. `locomotion` is **Swim**: this animal has gills, never
surfaces and has no land clip at all.

**Locomotion is carangiform undulation and nothing else.** One travelling wave down the axial chain,
amplitude growing backwards, the head the quiet end. Measured off the packed GLB played through
Three.js at 121 phases:

| | Swim | Sprint |
| --- | ---: | ---: |
| skull lateral travel | 0.016 | 0.025 |
| `tail_00` | 0.011 | 0.018 |
| `tail_03` | 0.217 | 0.343 |
| `tail_06` | 0.678 | 0.974 |
| caudal lobe tip | **1.317** | **1.782** |
| caudal lobe lag behind the peduncle | 0.039 of a beat | 0.042 |

The node of the wave sits between the skull and the first caudal joint — both are all but still, and
which of the two is stiller is noise — so the audit checks that the head is quieter than the *middle*
of the tail, which is what "the head is the quiet end" means. `body` is the pivot, so its own sway is
taken back out by the two bones in front of it or the snout would swing further than the tail does.

**The lunge reads.** Anticipation, a fast committed strike, follow-through, recovery — four beats
built out of narrowed bumps rather than one sine, so the drive arrives rather than swells:

| | skull reach | peak forward speed | fastest frame at | peak gape | gape peaks at |
| --- | ---: | ---: | ---: | ---: | ---: |
| `Attack` (1.0 s) | 0.574 | 6.78 u/s | phase 0.375 | 0.80 rad | 0.43 |
| `Heavy` (1.2 s) | 0.694 | 7.92 u/s | phase 0.375 | 0.87 rad | 0.42 |
| `Bite` (0.5 s) | 0.099 | — | — | 0.84 rad | 0.33 |

The tail cocks into a C over the wind-up and unloads into the drive; the pectorals clamp back
against the flank for it. Attack's peak speed is 11.8× its own average, so it is a fast start rather
than a slide, and the gape is widest as the strike lands rather than before it. Bite is half a
second of snap with the body staying where it is and is judged on the gape instead, which is the
right standard for what it is.

**Shake is the shark's own move**: clamp, roll the trunk hard one way and the other, worry the hold
loose. Measured: roll amplitude **0.645 rad** with **6** reversals, the head swinging 0.249 units
with it. **SpineBrace** is the roster's spine brace — both dorsals pitch forward and the back arches
under them and holds.

**The paired fins work the dash rather than hanging off it.** They are control surfaces and take no
propulsive stroke, but they sweep with the beat and trim the body through it; the swept angle at
each root over the whole Sprint clip, which holds two beats, is
**0.95 rad** at each pectoral and **1.27 rad** at each pelvic. Every one of the 21 skinned joints
owns geometry, so each of those numbers is about a fin rather than about a bone.

## Verification

```sh
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/hybodus/build.py
node tools/triassic/creatures/hybodus/audit.mjs --package --decode
/opt/blender/blender -b --factory-startup --python tools/triassic/gape-solid.py -- hybodus Heavy@0.50 Attack@0.43 Bite@0.17
node tools/triassic/skin-tears.mjs public/assets/triassic/creatures/hybodus.glb
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/hybodus/render.py -- --decoded
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/hybodus/render.py -- --decoded --twin   # the twin's portrait only
python3 tools/triassic/creatures/hybodus/contact-sheets.py
node tools/triassic/review-bodies.mjs
```

`build.py` authors both geometry and performance and writes only this species' asset family. It
touches no shared registry and performs no git operations. It installs an excepthook that kills the
process with a non-zero status on any exception, because **Blender exits 0 when a script raises** and
a build that failed halfway otherwise reports success and leaves yesterday's GLB looking fresh —
which happened once here, to a one-line name collision.

`audit.mjs --package --decode` meshopt-compresses the three files, asserts that packing changed no
animation sample and no mesh attribute, and then asserts exact paired joint names, hierarchy, local
rest transforms, inverse-bind arrays, socket transforms and metadata, per-clip SHA-256 of every
sample array, normalised weights, no duplicate clips, no root or scale channel, loop seams under
1e-4 on all seven looping clips, and the twin under 40 % of the authored triangles. It also sweeps
every edge of every clip and **asserts the skin's own worst stretch is under 8×**, split by surface
so the oral lining — which is built to stretch — cannot mask a weight fault in the skin. It then plays
**61 phases of every clip on both models** through the real `GLTFLoader`/`AnimationMixer`, evaluating
actual skinned vertices, and runs the gait, lunge, shake, spine-brace and jaw assertions above over
121 phases. Measurements are written to `paired-audit.json` *before* they are judged, so a failure
leaves its numbers behind.

Repository checks run green with these files present: `npm run triassic`, `npm run typecheck`,
`npm run build`, `npm run eras`, `npm run props`. `node tools/update-asset-sizes.mjs` is a no-op, as
it should be: it records only ids listed in `shipped.json`, and this one deliberately is not.

Sheets, rendered from the decoded packaged file. They are the **authored body alone** — the second
column used to be the same frame on the twin, and that comparison almost never earned its cost: a
twin has no fin rays and no lip corners, so a clip that reads perfectly on it can be tearing the
shipping body to ribbons, which is exactly what was happening here at 56× and was invisible in the
paired pictures. The pairing is still checked, by measurement rather than by eye — the envelope and
nearest-surface numbers above, and the rig, clip and anchor parity assertions in `audit.mjs` — and
`render.py --twin` still renders the twin's delivered portrait and then stops. (The files keep the
`paired-` prefix the rest of the era uses.)

- [Side, top and front](paired-volume-sheet.jpg) — the two silhouettes against each other.
- [Deformation](paired-deformation-sheet.jpg) — Idle, the Swim cycle, both turns, Dive and Rise.
- [The lunge](paired-lunge-sheet.jpg) — Attack, Bite and Heavy at their own beats, side and top.
- [Remaining actions](paired-actions-sheet.jpg) — Sprint, Hit, Stagger, Guard, Parry, Dodge, Eat,
  Death, Ability, Grab, Breath, Growth.
- [The beat from above](paired-beat-sheet.jpg) — four phases each of Swim and Sprint from the top,
  which is where a travelling wave either reads or does not.
- [This animal's own clips](paired-era-clips-sheet.jpg) — Shake at three phases, SpineBrace.
- [The mouth](paired-mouth-sheet.jpg) — closed, and at Bite, Attack and Heavy's widest, from the
  side and the front. These are the hardest frames on this animal to read: the generation's mouth is
  a small ventral crescent under a rostrum a third of the body long, so a camera close enough to see
  it is inside the snout. The cameras were re-aimed for this pass (they had been pointing half a
  body behind the mouth, at a height where the snout hides it) and it is still a poor view. The
  evidence that the gape is a gape is the `gape-solid` pass above, where the open mouth renders as a
  solid black cavity against a magenta backdrop with every backface culled.

## What I actually looked at, and what is weak

I rendered every clip and looked at the sheets; there was no human reviewer and none is claimed.

What I saw, on the authored body, which is the one that ships and the only one the sheets now draw:
the trunk and fins deform cleanly through the whole set; the beat runs back from a still
head with the caudal lobe trailing the peduncle; the two dorsals and their spines hold their shape;
the turns bank and the bank is flown on the pectorals; the gape opens as a real dark cavity with the
tooth rows on their own jaws and closes to a clean lip line. Death rolls the animal belly-up and
nothing tears out of it.

Honest limitations, worst first:

1. **Skinning tears — fixed, and here is what is left.** `node tools/triassic/skin-tears.mjs` now
   reports a worst edge stretch of **5.93×** (Shake; an edge 0.017 units long at rest reaching
   0.099) with **8** of 23 clips tearing something past 2×, against **56.03×** and 21 of 23 before
   the three corrections in the Rig section. Nothosaurus' 2.98× is the era reference and Placodus'
   12.4× is the figure the sweep called broken, so this now sits between the two and nearer the good
   end — but it is not as clean as Nothosaurus and that is the honest state.

   The shared tool names the **bone** an edge follows, not the surface it is in, which on both fish
   in this batch reads the wrong way round: the second, third and fourth worst clips in the table
   are all the **oral lining**, a sac whose whole job is to stretch from a shut mouth to a full
   gape. `audit.mjs` splits the same measurement by surface so the two cannot be confused, records
   it as `skinTearsPerSurface`, and **asserts the skin's own worst is under 8×** so the fix cannot
   quietly rot:

   | surface | worst | clip | grew from → to | edges over 2× |
   | --- | ---: | --- | ---: | ---: |
   | `Hybodus_authored_body` (the skin) | **5.93×** | Shake | 0.017 → 0.099 | 336 |
   | `Mouth_lining` (built to stretch) | 5.19× | Heavy | 0.023 → 0.118 | 48 |
   | `Seated_jaw_hinge_tissue` | 1.00× | — | — | 0 |
   | `Hybodus_authored_body_lower_jaw` | 1.00× | — | — | 0 |

   What is left is `skull` against `pec_tip` at the pectoral root under Shake's roll, where the two
   bones genuinely go opposite ways and a tenth of a unit of weight difference across a 0.017 edge
   is enough. Full per-clip table in [`skin-tears.txt`](skin-tears.txt).
2. **The generation's jaws were modelled apart** and closing them costs 638 of 849 mandible vertices
   inside the skull surface, to 4.7 % of body length. Interior and not visible in any sheet, but it
   is the reason this animal **wants a mouth-closed regeneration**.
3. **The unbend is a real departure from the generated pose.** It is bounded, measured and comes out
   of one constant, but it moves a vertex as much as 0.33 raw units and makes the animal 18 % longer
   than its own bounding box said it was.
4. **The paired fins are asymmetric in the generation** — 1.03 % of body length on average between a
   fin and its mirror, 4.20 % at the 95th percentile. The rig is built symmetric and deforms them
   correctly; they simply do not match each other at rest. That is a fresh generation, not a Blender
   push-and-pull.
5. **No eye globes.** The generated head has sculpted eyes in its surface and albedo and this build
   does not cut and seat separate globes, as Nothosaurus, Placodus and Dinocephalosaurus do not. The
   pipeline contract asks for them; it is outstanding on all of them.
6. **The lining takes its UVs from the skin it is sewn into**, which means its pigment is that skin's
   pigment stretched across the inside of the mouth. It reads as flesh at swimming distance and as a
   smear in a close-up.
7. **The male's cephalic claspers are not modelled**, because the generation does not carry them. The
   research lists them as a headline hybodont feature; they are absent from the pose as well, so that
   is a redraw question rather than a mesh one.
8. Living colours, soft tissue and movement are artistic reconstruction. Travel and the grip rules
   remain engine-owned.

## T3D-32A — the head is not cut at all

`T.cut_rim` and a pre-cut `T.seal_seams` between them settled what the cut on this fish was worth,
and the answer is that it should not be there.

**The generation's head is a closed surface.** `T.seal_seams` run over the whole head *before*
anything was cut fills **nothing** — zero boundary edges, on the authored body and on the twin
alike. So every boundary edge either half had afterwards was made by the cut, and `T.cut_rim` says
what that came to on the skull: 271 boundary edges in the head in one component of 218 vertices, 94
of them on the measured seam and the rest the rear of the labelled mandible window, which is not a
plane at the hinge but a curve running 0.04 of a body *behind* it and dipping from the mouth line
down under the gills — the same fact `T.jaw_junction`'s `rear` had already been widened for.

**That rim was closed three ways and never closed.** A hinge cap, a rim fold, a post-cut seal and
two oral shells stood at it, and measured **`--as-drawn`** — which hides everything
`src/shared/oral-geometry.ts` matches, and is therefore the body a player sees — this fish still
read **1,346 px of backdrop through its head** at `Heavy`, 1,261 at `Bite` and 875 at `Attack`.
Every one of those parts closes a hole *next to* the rim rather than spanning it.

**And spanning it is refused here, correctly.** `T.cap_mouth` closes by construction because it
spans a closed curve; this lip rim **pinches**. Sixteen of its vertices carry four boundary edges
rather than two, where the interlocking tooth roots bring two runs of the rim to a point, so it is
not a set of closed curves and nothing spanning it would close anything. The helper declines rather
than filling, which is its whole contract.

So the head stays **one surface** (`T.jaw_field_uncut`, Mosasaurus' construction). The mouth
opening is a bone turning inside skin, which is what every other joint on this animal already is:
full `jaw` below the measured mouth line and forward of the hinge, full skull above it, and the
commissure a band between them that stretches. Nothing is cut, so nothing can part. The
generation's `restingGape` verdict — "arrived GAPING" — is about the *pose*: the jaws are modelled
parted, but the slit is 0.006 to 0.015 thick on a body of 1.0 and its walls are a fold of the same
closed shell.

**The band, swept** (fraction of the head's half depth at the hinge):

| band | worst skin | mandible follows its own joint (`Bite`/`Attack`/`Heavy`/`Eat`) |
| ---: | ---: | --- |
| 0.20 | 6.76× | 0.98 / 0.99 / 0.99 / 0.98 |
| 0.30 | 5.93× | 0.98 / 0.99 / 0.99 / 0.98 |
| 0.38 | 5.93× | 0.98 / 0.99 / 0.99 / 0.98 |
| **0.50** | **5.93×** | 0.98 / 0.99 / 0.99 / 0.97 |

**After.** `--as-drawn`: **0 through and 0 opened at every clip that moves the jaw** — `Heavy`,
`Bite`, `Attack`, `Eat`, `Shake`, `Grab`, `Flop` and the shut clips. Plain run 0 as well. Skin
**5.93× unchanged** (`Shake`, `skull` — the recorded opercular crack). `lag.mjs` has no seam to
measure and says so. `idle-bones` every joint owns skin. `oral-shell-audit` reports no lining on
authored, twin or LOD. `Flop` re-applied with `apply.mjs`.

**A hidden part that wears the skin is freight on the twin.** The lining took a *copy of the body
pigmentation material* — the right rule for an authored patch, and it carries the 2048² albedo and
normal maps — and it was exported with the twin group as well. Retiring it took
`hybodus.lod1.glb` (= the twin, byte for byte) from **1,315,816 to 672,796 bytes, −48.9 %**, on a
body whose twin is vertex-coloured and needs no texture at all.

**Known, and not this row's:** `audit.mjs --package --decode` cannot complete on this body once the
`Flop` is applied. The shore gait is written to the authored body only, so authored/twin clip parity
fails (24 against 23) before anything is audited; `_pipeline/paired-audit.mjs` also asserts that a
`root` channel does not *exist* where `rig.mjs` only requires it not to move. Five Triassic bodies
are affected and the fix is central. The audit was run and passed on the rebuilt triplet **before**
the gait was re-applied.
