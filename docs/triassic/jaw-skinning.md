# Jaw skinning — every jaw into the head it was cut from (T3D-15)

The owner's words: "a lot of jaws are not skinning correctly as they break the geometry at the
connection with the body, such as Saurichthys and Hybodus", and "with all creatures we should
ensure their jaw motions don't break the geometry but instead are correctly skinned to smoothly
transition between jaw and body/head". This is the record of that pass: what the fault was, the
instrument that measures it, the one repair applied across the roster, and the before/after
numbers for every shipped body.

## The fault

Every jawed Triassic body cuts its mandible off the head as a **separate shell** — the cut is a
plane at the hinge (or, on the two fish, the label boundary of "the surface each vertex grows
below the mouth line") — and every one of them then weighted that shell to `jaw` at 1 while the
body it came from stayed on whatever `weights()` said, the skull with or without a throat share.
The two share a rim: the cut duplicates each vertex along it, one copy on each part. When the jaw
swings, the shell's copy of a rim point turns about the hinge by its depth below the hinge times
the gape, and the body's copy stays where it was. The junction opens by exactly that.

At `Heavy` that was **6.05 % of a body on Hybodus**, 3.89 % on Mystriosuchus, 3.19 % on
Saurichthys, 2.34 % on Atopodentatus, 2.19 % on Nothosaurus and 2.02 % on Cartorhynchus — a slot
under the corner of the mouth, the mandible swinging down as a slab with the throat behind it
exposed, and on Hybodus a serrated tear where the labelled rim runs along the generation's own
edges (`throat-repairs/hybodus-jaw-before.png`). The seated hinge tissue used to hide some of it
and is hidden in play since the mouth rule; what a player sees is the gap.

None of the era's guards could see it. `skin-tears.mjs` measures the edges a mesh has, and no
edge crosses the seam between two shells; `idle-bones.mjs` counts weight, and both parts had
plenty; the paired audits check parity between the authored body and its twin, which both had the
same gap. The two bodies the owner named were simply the two with the deepest mandibles.

## The instrument: `tools/triassic/lag.mjs`

Promoted from the 15 September worktree's `local/diag/` and rewritten in the style of
`skin-tears.mjs`: gltf-transform-free, `GLTFLoader` with the meshopt decoder, 17 phases of every
clip, `--all` over `tools/triassic/shipped.json`, `--json` for a table, `--verbose` to name the
worst pair. It runs inside `npm run triassic`. Per joint, with the skin inside a ball round the
joint's head (its radius from the neighbouring joints, never less than twice the distance to the
nearest skin so a hinge deep in a broad head owns a ball at all):

- **lag** — the ball's mean travel over the joint's own travel, on the clip that carries the head
  furthest. This is the 15 September figure: 1.0 is skin that goes where its joint goes; 0.45 was
  Aphaneramma's foot cut into the jaw shell. A hinge that turns in place carries its head nowhere,
  so a jaw is measured on the clip that moves the whole head.
- **follows** — over the vertices the joint itself owns, how far each travelled *along the
  direction the joint would have carried it rigidly*, over how far it would have carried it. This
  is the hinge's own number: a mandible whose rear half is weighted to the skull reads well under
  1 in `Bite`. Every jaw on the roster reads 0.98–1.02 in `Bite`, before and after — the mandibles
  were never held; they were detached.
- **share** — what fraction of the ball's weight is the joint's own and who holds the rest. The
  Aphaneramma tell; descriptive, since a hinge is always surrounded by the bone it hinges on.

And per body, the **seam**: every pair of vertices on different skin meshes that coincide at rest,
the mandible a party to each. The pairs at the **cut** — at or behind the hinge's own station (or
the rim's own rearmost point, where a kit seats the hinge behind its cut, as the shore kit does) —
must stay together in every pose; their worst separation over every clip, in body lengths, is the
figure. The pairs on the **lip** part by design and are reported for scale (the gape). A cut
opening past 0.5 % of a body along more than 8 % of its rim fails the run; a point or two parting
at the corner of the mouth, which is one vertex on both the lip and the cut, is the lip.

Four readings of "which shared points are the cut" were tried before that one, and each took
something else for it — worth knowing when the tool's number surprises: a band of stations behind
the hinge took the first 0.03 of the lip (Mixosaurus, 0.34 % "open" on a closed cut); the
direction of the rim's edges took the lip where it curves round the corner (Mystriosuchus, 0.4 of
a body ahead of the hinge, 3.9 %) and missed a labelled rim that zigzags along the generation's
own edges (Hybodus, 10 of 99 points found); anything within a few hundredths ahead of the hinge
took the seam's cut through the generation's own oral cavity, where the floor parts from the roof
at the back of the mouth (Cymbospondylus, 12 midline points at 1 % — a hole into the throat, which
is the mouth rule's business, `T.cap_cut`, and not the junction's); and pairing every skin mesh
took Placodus' gastral armour against its belly (1.6 % in Crawl, a different question).

`skin-tears.mjs` gained the other half: `--all`, `--json`, and a **per-bone mouth figure** — the
worst skin edge dominated by `jaw` and by `skull`, with the clip — because the body's worst edge is
a paddle or a fluke and a jaw tearing the cheek at 3x sat invisibly under a paddle at 5x.

`tools/triassic/jaw-views.py` renders the junction at a posed frame (`Clip@1.2` seconds or
`Clip@44%` of the clip, what `lag.mjs` prints): the head from the animal's right below the lip,
and from below and behind the hinge, with the oral parts the runtime hides hidden, on a flat grey
the animals never produce. CYCLES on the CPU. A before/after pair compares the same pixels.

## The repair: `T.jaw_junction`

One shared helper in `tools/triassic/creatures/_pipeline/tripo.py` (exported through `shorekit`
for the shore kit, imported into the two self-contained fish builders as the shells were). It is
**one weight field over both parts, evaluated on position**, so the two copies of a rim point
cannot disagree — and it asserts that they do not, to the last influence, before returning.

Its jaw share is:

- on the body, `throat` (1.0) below the hinge's height, falling off with distance from the cut
  rim (`back`, 0.06 of a body, along the body and round it) and with transverse distance from the
  hinge past the rim's own measured reach; zero on the upper jaw. The throat follows the jaw,
  bounded radially about the hinge as well as along the body.
- on the shell, the greater of that and a ramp from the cut rim to full jaw over `band`. The
  mandible is rigid on its bone from `band` forward of the cut and full at the mouth line, and
  blends to the body's own field at the rim.

The remainder of every vertex is the body's relaxed field at the nearest body vertex, which at a
rim vertex is its own twin. `below` ramps from the hinge's height to a third of the rim's measured
depth under it, so the cheek behind the corner stays with the skull and the throat under the hinge
goes with the jaw.

**`band` is 0.015 of a body and short on purpose.** At 0.05 Mixosaurus' jaw bowed — its
dorsal-rear corner held by the skull while its chin dropped — and a mouth that opens by bending
its lower jaw is worse than one with a slot behind it. The shell only has to agree with the body
*at the rim*, and where the two fields differ (the upper part of the cut, within `dz` of the
hinge's height) a point turns about the hinge on a short radius, so a short band confines the
shear to a strip that barely moves and leaves the rest of the mandible rigid. The throat is what
stretches, on the body's side, over `back`.

**The rim is found, not assumed**, and which shared points are *the* rim is the builder's word:
`rear(p)`. For a plane cut it is the hinge plane; for the two fish it is every shared vertex in
the rear half of the mandible that the seam cut did not make, because the label window runs 0.04
of a body *behind* the hinge and the first attempt, a band ahead of the hinge, found 30 of 109 rim
points with a negative depth and closed nothing. The mouth line and a **front cut** (where a
builder takes the mandible off an overhanging snout: Mixosaurus, Placodus' chisels) part by
design — the moment the front cut was taken for the junction, Mixosaurus' mandible tip was glued
to the snout's own tip at 7.6x.

Everything the mouth rule landed survives: the separate palate and floor shells, the caps on the
cut sections, the folded rims, the sealed opercular seams, the seam fitted to the lip. The helper
touches weights and nothing else, and the paired audits prove rig, clip and anchor parity on every
rebuilt triplet exactly as before.

## Before and after

Measured on the packaged files: the "before" column from every body's GLB at `5bd0eea` (the
commit this branch started from), the "after" from the rebuilt files. *Jaw cut* is `lag.mjs`'s
worst cut-pair separation over every clip; *jaw lag* its lag figure with `follows` in `Bite` in
brackets; the three skin columns are `skin-tears.mjs` — the body's worst skin edge and the worst
edge dominated by `jaw` and by `skull`.

<!-- TABLE -->

## Per body

<!-- PERBODY -->

## What was not repaired, and why

- **Ceratites, Phragmoteuthis, Helicoprion** carry no mandible shell (the two cephalopods have no
  mouth drawn at all; Helicoprion's jaw is skinned into one body), so there is no cut to open.
  Helicoprion's 14.33x skin figure (3.76x on `jaw`, 4.21x on `skull`, both in `Eat`) is its known
  outstanding repair from the skinning notes, untouched here.
- **Shonisaurus** (0.00 %, 67 rim points, none open) and **Hupehsuchus** (0.00 %, T3D-02b's
  attachment) measure closed on every clip. Neither is rebuilt.
- **Coelophysis** (0.02 %) and **Macrocnemus** (0.28 %) on the shore kit have T3D-09's exact
  posterior attachment; **Askeptosaurus** (0.49 %) copies the body's weights onto its rim and
  blends over 0.014. All three sit under the threshold, and what opens on them is the corner
  point. They keep their own attachments; the shared helper is available to them through
  `shorekit` (Tanystropheus uses it) if a later pass wants one implementation.
- **Hybodus' opercular crack** (T3D-12A's finding: the generation's first opercular slit into a
  hollow head, 343/497 px behind the corner of the mouth at `Heavy`/`Attack` under strict cull) is
  a generation defect and is not modelled over; the junction repair does not touch it. Its
  `Shake` clip's 5.93x on `skull` is that region and is unchanged.
- **Placodus' gastral armour** is a second separate shell, rigid on `gastralia` against a belly on
  `body`, and its rim opens 1.61 % of a body in `Crawl`. It is not a jaw and is out of this pass;
  the same helper would close it with a `gastralia` field, and it is recorded here so the number
  is not mistaken for the mouth's when `lag.mjs` is run without the jaw-mesh filter.
- **The corner of the mouth** on every repaired body: one vertex on both the lip and the cut, and
  the shared vertices just ahead of the hinge plane on the lip (within a hundredth of a body)
  part by the gape times their short radius — Keichousaurus 3 of 38 points at 0.33 %,
  Cartorhynchus 4 of 69 at 0.55 %, Saurichthys 1 of 151 at 0.45 %. That is the mouth opening,
  and the helper is deliberately not asked to hold it: a shell point taken for the rim there
  would be glued to the upper lip.

## Verification

<!-- VERIFY -->
