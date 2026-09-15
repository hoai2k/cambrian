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
| `hybodus.glb` — worked Tripo body | 22,335 | 13,307 | 1,843,828 |
| `hybodus.puppet.glb` — procedural twin | 8,194 | 4,186 | 1,323,784 |
| `hybodus.lod1.glb` — byte-identical twin alias | 8,194 | 4,186 | 1,323,784 |

The reduced model is **36.7 %** of the authored triangles, inside the contract's 40 %. The model is
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

### The lining, and proving the gape is not a hole

One lining, not two tubes. The roof follows the skull, the floor follows the jaw and the wall
between them stretches, so no opening the clips reach can part it; it is wound inwards and culls,
with the skin double-sided behind it as the backstop. It is the one authored surface on this body
and it is the simple kind — a closed tube that fills a hole — and it **wears the creature's own
texture**: every ring vertex takes its UVs from the nearest point on the intake surface and the
material is a copy of the body's own, so it is not a flat-shaded island in a pored hide.

Getting it right took five measured corrections, each found by the number rather than by eye:

- **Wound the wrong way**, the near wall survived the cull and the far wall did not: 7.4 %
  see-through at Attack's widest, against 0.3 % the other way round.
- **Cut to the head's own section** it was far thicker than the modelled mouth and stood proud of
  the lip with the jaw shut — a pale bulge along the closed mouth in every frame. Depth now follows
  the slit.
- **Cut to the slit's own width** it was narrower than the cut, and the jaw's cut edge and the
  skull's separate right across the head: at full gape the corners of the mouth opened onto nothing,
  9.0 % of the aperture. Width now follows the cut, flush to it.
- **The mandible was an open shell.** A cut part is open along the seam and its inside faces away
  from anyone looking into the gape, so under a single-sided draw the open mouth showed straight out
  through the bottom of the jaw. Filling the cut's own boundary loop closed it: no new shape, no new
  vertices, the ring's own UVs.
- **The wedge at the pivot** is closed by one blunt plug seated inside the head at the hinge, rigid
  on the skull. Split half and half with the jaw it sheared with every degree the joint turned and
  read as the worst tear on the animal at 48.9×; rigid it cannot tear at all. It is also *fitted*
  rather than sized: shaped like the head's own section at the pivot rather than like a ball, and
  then pulled in vertex by vertex until every one of them is inside the head's silhouette, which
  took 1,606 inward steps and leaves 0.0040 raw of clearance. Sized only to close the wedge it
  came out nearly as big as the head and stood out of the snout as a pale ball in every
  three-quarter review render, on the twin as well as the authored body, and invisible in the tight
  mouth cameras that were being used to judge it. Scaled down *as a whole* until it fitted, it
  shrank to a third of the head and stopped covering the wedge; pulled in only where it actually
  breaks the surface, it fills the head everywhere it can and can show nowhere.

The proof is the shared tool, not one of my own:

```
blender -b --python tools/triassic/gape-solid.py -- hybodus Heavy@0.50 Attack@0.43 Bite@0.17
```

It renders at full gape against a saturated magenta backdrop twice, once with every backface culled
and once without, and counts backdrop pixels enclosed by the silhouette. **1 pixel of 378,000**
at the worst of the three shots (tolerance 12) — `PASS`. The trap it exists to avoid is comparing a
gape render against the plain background, which measures the backdrop and passes whatever the mesh
does; the comparison here is between the two passes.

| shot | differing pixels | opened by culling | seen through the body |
| --- | ---: | ---: | ---: |
| `Heavy` @ 0.50 | 114 | 0 | **0** |
| `Attack` @ 0.43 | 99 | 0 | 0 |
| `Bite` @ 0.17 | 25,153 | 35 | 1 |

`Bite` differs from the other two because it is the widest gape of the three and the culled pass
throws away the whole near wall of the lining, which is 25,000 pixels of difference and none of it a
hole: the 35 pixels the cull *opens* are along the lip, and one of them is enclosed by the body.

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
