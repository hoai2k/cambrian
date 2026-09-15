# Mosasaurus

**Off the roster on purpose.** Mosasaurus is Late Cretaceous, not Triassic, and where it belongs is
the open question in [`docs/triassic/05-mesozoic-expansion.md`](../../../../docs/triassic/05-mesozoic-expansion.md)
— widen this game, or build a fourth one. Being on `TRIASSIC_CREATURES` is what puts an animal in
the sea, in the population tables and on the pick screen, so it is listed in
`src/content/triassic/expansion.json` instead. It reaches a match as a **standing visitor**
(`src/content/triassic/guests.ts`, `standingVisitors` in `src/content/visitors.ts`): admitted to all
three games unconditionally rather than earned in one, and gated only on this body having shipped.

Full grown it measures **22.1 units**, which is longer than anything on any of the three rosters —
the Triassic's own Cymbospondylus tops out at 19.4. That is the reward rather than a balance problem.

## What it is

`build.py` rebuilds the pair: the authored Tripo skin and a measured voxel-volume twin on one shared
24-joint rig, 22 clips, three anchors. Everything below is measured by the build.

| | |
|---|---|
| authored / twin triangles | 22,124 / 7,872 (**0.356**, the contract is under 0.40) |
| joints · max influences | 24 · 4 (mean 3.12) |
| envelope, authored against twin | max **0.065** of 5.00 units (**1.3 %** of body length; the tolerance is 4 %) |
| surface distance, authored to twin | max 0.108, p95 0.017 |
| skin tears (`skin-tears.mjs`) | **2.54x** — the era's second cleanest, behind Shonisaurus' 1.44 and ahead of Nothosaurus' 2.98 |
| gape proof (`gape-solid.py`) | **PASS at 3 px** of 378,000, tolerance 12 |
| idle bones | every joint owns skin |
| paddle sweep, Sprint / TurnLeft | fore 49.8–60.1° / 40.4–67.1°, hind 32.8–41.8° / 56.7–63.8° |
| paired-limb asymmetry | mean 0.025, max 0.041 of body length |

## Which end is the head, and why that is the first thing this file decides

`T.measure_frame` takes the body's long axis from the first principal component, **whose sign is
arbitrary**, and the caller supplies it. Eleven of the era's twelve builders pass
`head_is_positive_pca=True`. Told that, this generation comes out backwards — and it comes out
backwards *plausibly*, which is the dangerous part. Both ends of a mosasaur are thin and deep: the
snout measures 0.021 half-width against 0.115 half-depth, and the caudal fluke 0.021 against 0.115
as well.

Everything downstream then measured the tail and reported it confidently:

- `T.mouth_cavity` returned **zero** cavity vertices at every gap out to 0.16 — "the generation
  models no mouth", which is a real state other bodies in this era are in.
- The jaws' own fork measured as a notch **0.055 of a body long** at the very tip: "the gape is a
  tiny parting, closing it is nothing" — which would have shipped a mosasaur that cannot open its
  mouth.
- `T.painted_line` fed inverted luminance, looking for the painted tooth row as a bright line, gave a
  coherent curve with a roughness of 0.022 and a flank disagreement of 0.118 — better numbers than
  Rhaeticosaurus' accepted read. It was the **pale ventral keel of the tail**.
- Four side renders of "the head" are a perfectly convincing pair of gaping jaws.

What settles it is **the flippers**. A mosasaur's forelimb is the larger pair and sits behind the
skull: the two thin clusters reaching 0.30 from the axis are at y −0.147 to −0.059 and the two
reaching 0.19 are at +0.164 to +0.254, so the end the big pair is nearest is the head. The build
asserts that (`FORE_REACH > HIND_REACH * 1.25`) rather than assuming it, which is what makes the
wrong sign fail loudly instead of quietly. Birgeria decides the same question off its caudal fin.

## The mouth: authored gaping, closed in the neutral pose

The source sheet showed a gape in every panel, so the generation carries one — **a pose, not the
animal**. The jaw is shut in `Idle`, `Swim`, `Sprint`, the turns, `Dive` and `Rise`, and opens only
for `Bite`, `Attack`, `Heavy` and `Eat`. `audit.mjs` measures the jaw angle against the bind pose on
every clip in the file and requires the locomotion set to be **negative** — shut — rather than merely
small, because a clip that forgot to close would look completely normal beside the rest.

### Finding the mouth line without reading any pigment

A **vertical line through an open mouth crosses the surface four times and through a shut head
twice**. The station where that count drops from four to two is the jaw hinge (y −0.210), and the
middle of the widest empty interval is the mouth line. That is a purely geometric reading of the
animal's own lip contour and it is the right one here, because the teeth on this body are *painted*:
`T.protrusions` finds five patches on the entire head and the largest is 27 vertices.

**The mouth is the largest empty interval, not the first one.** Six crossings turn up wherever the
modelled tongue rises into the lumen, and there the first interval is the sliver between the mandible
and the tongue — 0.014 tall against the mouth's own 0.095. Read that way the seam dived into the jaw
for a third of the tooth row, and the oral lining built on it turned inside out when the jaw shut and
came through the top of the snout as a pink slab the length of the head.

### What closing it cost

The closing rotation is defined as the one that carries the mandible's dorsal margin at the snout
onto the palate's ventral margin at the same station: **32.55°**.

| | |
|---|---|
| closing rotation | 32.55° |
| mandible vertices measured | 1,275 |
| inside the skull's surface, by normal sign | 346 (27 %), max 0.224 units = **4.5 %** of body length |
| **outside the head's own measured section** | 170, max 0.036 units = **0.72 %** of body length |

The two rows measure different things and the second is the one that matters. A `find_nearest` sign
test beside a modelled oral cavity counts a mouth floor *correctly* inside the mouth as inside the
skull, so the first row is an upper bound; what the question actually is — does the shut jaw push out
through the outside of the head — uses no normals at all and answers **0.72 % of a body length, on
13 % of the mandible**. At gameplay scale that is a lip fold, and it is visible as one small pink
sliver at the corner of the mouth in the `Idle` mouth sheet.

That is the price. It is much smaller than the rule warns it can be, and the reason is that this
generation's gape is a third of the one its reference draws: the jaws part over 0.176 of a body and
the rotation needed is 33°, not the 80° the silhouette suggests. The three other costs the rule names
were all paid too — the oral cavity had to fold rather than be built, the lining had to be rebuilt
three times to stop it inverting at the shut pose, and the pose the animal spends nearly all its time
in is now its most deformed one.

### The lining, and the one weight that is forced rather than chosen

At the snout the closing rotation carries the mandible's margin **exactly** onto the palate's, so a
lining floor riding the jaw at weight 1 arrives exactly where its own roof already is: the sac is
degenerate at the shut pose and rounding decides which side of the roof each vertex lands on. That is
a pink shard through the top of the snout. The floor is held at **0.93** instead, so it arrives a
fifth of the local gape below the roof and the sac closes rather than crossing.

The tube is also built a fourteenth of the local gape **below** the mouth line (`lining_axis`), so
its floor starts inside the jaw's flesh and its roof finishes inside the skull's, rather than both
sitting level with a surface. And it is sized on the **measured gape** rather than on
`T.cavity_profile`: a cast over the front quarter of a body whose forelimbs sit just behind the skull
mostly finds the gap between a paddle and the flank, reaching x ±0.24 where the head is 0.03 to 0.08
across. Sized on that, the lining came out as wide as the head and hung out of the mouth.

## The performance

A **tail swimmer, not a rower**. Mosasaurus hoffmannii carried a lunate fluke and swam carangiform,
so the thrust is a travelling wave growing towards the tail and the four paddles are control
surfaces. That is the opposite reading from Archelon's, and the era's "a limbed swimmer's dash has to
paddle" rule is answered here by a *measured* swept angle at each paddle root rather than by making
them row: the build refuses a paddle that does not sweep 25° in Sprint or 35° in the turn, and the
audit requires the fluke to out-swing the trunk fourfold and the wave to travel rather than stand.

`Ability` is the ram: a C-start coil and one straight charge. `Eat` is a **ratchet** — mosasaurs
carried a second tooth row on the pterygoids and worked prey backwards with it rather than chewing —
so the clip opens, drives the head forward over the carcass and draws it back, three times.

## Reproducing it

    npm run blender                                     # Blender 5.2.1 to /opt/blender
    /opt/blender/blender -b --factory-startup --python tools/triassic/creatures/mosasaurus/build.py
    node tools/triassic/creatures/mosasaurus/audit.mjs --package --decode
    node tools/triassic/skin-tears.mjs public/assets/triassic/creatures/mosasaurus.glb
    node tools/triassic/idle-bones.mjs public/assets/triassic/creatures/mosasaurus.glb
    /opt/blender/blender -b --factory-startup --python tools/triassic/gape-solid.py -- \
        mosasaurus Bite@0.12 Heavy@0.5 Eat@0.3 Attack@0.4 Idle@0
    /opt/blender/blender -b --factory-startup --python tools/triassic/creatures/mosasaurus/render.py -- --decoded
    python3 tools/triassic/creatures/mosasaurus/contact-sheets.py

The generation is not deterministic; the one that shipped is preserved unchanged in
`tripo-raw/mosasaurus.raw.glb`, with the single view it was made from beside it as `input.png`.

## Portraits

`render.py --portraits` writes into `portraits/` here rather than into `public/`, because a roster
animal keeps the placeholder card cut from its canonical pose until a human says its model ships.
Mosasaurus has no canonical pose and no placeholder: it is off the roster, and the pick screen draws
a visitor's tile from `assets/triassic/creatures/<id>.<kind>.png`. So the four renders are **copied
into `public/assets/triassic/creatures/`** when the body ships, and `npm run triassic` checks they
are there.

## Still open

- The generation's own gape is **a third of the one its reference draws**, and the reference is a
  Late Cretaceous mosasaur with its mouth wide. A mouth-closed regeneration would remove the 33° of
  forced deformation entirely and is the route the era's rules name; this body is good enough to ship
  without one, and the numbers above are what a future decision should be taken against.
- The mandible's own tooth row and the palate's are painted rather than modelled, so the closed mouth
  reads as a lipped seam rather than as interlocking teeth. That is the generation, not the build.
