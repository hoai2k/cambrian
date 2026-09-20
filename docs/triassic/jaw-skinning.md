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

| Body | Repaired | Jaw cut opens, before → after | Jaw lag (follows in Bite) before → after | Skin worst before → after | `jaw` skin before → after | `skull` skin before → after |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| aphaneramma | yes | 1.65 % → 0.00 % | 1.05 (1.00) → 1.05 (0.99) | 4.43x → 4.43x | 2.82x → 4.02x | 2.02x → 2.02x |
| archelon | yes | 0.24 % → 0.00 % | 1.01 (1.00) → 1.01 (1.00) | 3.86x → 3.86x | 1.19x → 1.44x | 1.26x → 1.26x |
| askeptosaurus | no | 0.00 % → 0.00 % | 1.00 (1.02) → 1.00 (1.02) | 1.10x → 1.10x | 1.00x → 1.00x | 1.01x → 1.01x |
| atopodentatus | yes | 0.26 % → 0.00 % | 1.12 (1.00) → 1.12 (1.00) | 3.90x → 3.90x | 3.90x → 3.90x | 1.62x → 1.62x |
| birgeria | yes | 0.07 % → 0.00 % | 1.00 (0.99) → 1.00 (0.99) | 3.46x → 3.46x | 1.45x → 1.80x | 1.31x → 1.31x |
| cartorhynchus | yes | 2.02 % → 0.00 % | 1.04 (1.00) → 1.04 (1.00) | 3.72x → 3.72x | 1.00x → 1.46x | 1.27x → 1.29x |
| ceratites | no | no shell → no shell | 1.03 (nan) → 1.03 (nan) | 7.73x → 7.73x | 1.36x → 1.36x | 1.61x → 1.61x |
| coelophysis | no | 0.01 % → 0.01 % | 0.99 (0.99) → 0.99 (0.99) | 7.74x → 7.74x | 3.56x → 3.56x | 7.74x → 7.74x |
| cymbospondylus | yes | 1.14 % → 0.01 % | 1.03 (1.00) → 1.03 (1.00) | 2.48x → 2.48x | 1.00x → 1.15x | 1.15x → 1.15x |
| dinocephalosaurus | yes | 0.67 % → 0.01 % | 1.01 (1.00) → 1.01 (1.00) | 7.00x → 7.00x | 1.00x → 1.00x | 1.00x → 1.00x |
| helicoprion | no | no shell → no shell | 1.01 (0.99) → 1.01 (0.99) | 14.33x → 14.33x | 3.76x → 3.76x | 4.21x → 4.21x |
| henodus | yes | 0.00 % → 0.00 % | 1.02 (1.00) → 1.02 (1.00) | 4.81x → 4.81x | 1.04x → 1.21x | 1.22x → 1.22x |
| hupehsuchus | no | 0.00 % → 0.00 % | 0.93 (0.98) → 0.93 (0.98) | 3.47x → 3.47x | 2.70x → 2.70x | 2.81x → 2.81x |
| hybodus | yes | 6.05 % → 0.00 % | 1.10 (1.00) → 1.10 (1.00) | 5.93x → 5.93x | 1.00x → 2.55x | 5.93x → 5.93x |
| keichousaurus | yes | 0.54 % → 0.33 % | 0.99 (1.00) → 0.99 (1.00) | 2.34x → 2.34x | 1.00x → 1.14x | 1.07x → 1.08x |
| macrocnemus | no | 0.00 % → 0.00 % | 1.01 (1.02) → 1.01 (1.02) | 3.41x → 3.41x | 2.39x → 2.39x | 3.41x → 3.41x |
| mixosaurus | yes | 1.64 % → 0.00 % | 1.01 (1.00) → 1.02 (1.00) | 3.62x → 3.62x | 1.00x → 1.88x | 1.65x → 1.81x |
| mosasaurus | yes | 0.04 % → 0.00 % | 1.00 (1.00) → 1.00 (1.00) | 2.54x → 2.54x | 1.45x → 1.83x | 1.28x → 1.28x |
| mystriosuchus | yes | 1.80 % → 0.00 % | 0.99 (1.00) → 0.98 (1.00) | 4.48x → 4.48x | 1.66x → 2.21x | 1.33x → 1.33x |
| nothosaurus | yes | 2.19 % → 0.28 % | 1.02 (1.00) → 1.02 (0.96) | 2.99x → 2.99x | 1.00x → 1.05x | 1.00x → 1.00x |
| odontochelys | yes | 0.28 % → 0.00 % | 1.01 (0.99) → 1.02 (0.98) | 5.12x → 5.12x | 1.41x → 1.56x | 1.18x → 1.18x |
| phragmoteuthis | no | no shell → no shell | 1.01 (1.00) → 1.01 (1.00) | 5.37x → 5.37x | 1.42x → 1.42x | 1.34x → 1.34x |
| placodus | yes | 1.72 % → 0.00 % | 1.07 (1.00) → 1.07 (1.04) | 12.36x → 12.36x | 1.00x → 1.79x | 1.14x → 1.49x |
| rhaeticosaurus | yes | 0.22 % → 0.00 % | 1.02 (1.00) → 1.02 (0.99) | 2.81x → 2.81x | 1.40x → 1.52x | 1.26x → 1.26x |
| saurichthys | yes | 3.51 % → 0.03 % | 1.04 (1.00) → 1.04 (1.00) | 3.61x → 3.61x | 1.00x → 3.00x | 1.12x → 3.16x |
| shonisaurus | no | 0.00 % → 0.00 % | 1.05 (0.98) → 1.05 (0.98) | 1.44x → 1.44x | 1.00x → 1.00x | 1.00x → 1.00x |
| tanystropheus | yes | 0.44 % → 0.00 % | 1.00 (1.00) → 1.00 (1.00) | 3.00x → 3.00x | 1.00x → 1.00x | 1.01x → 1.01x |

Read the `jaw` column with the repair in mind: a rigid shell reads 1.00x on its own edges by
construction, and the junction *is* a stretch — the short band from the rim to full jaw is where
the shell agrees with the body, so the jaw-dominated edges there now read 1.1–3.2x at full gape
(Hybodus 2.55x, Saurichthys 3.00x, Aphaneramma 4.02x on the edges the tucked forelimb shares with
the throat). None of it reaches the body's own worst figure, which is the bar the task set and is
unchanged on every repaired body; where the first build did push it up (Saurichthys 5.61x,
Aphaneramma 4.57x, Atopodentatus 4.31x) the cause was found and the figure brought back exactly.
The `skull` column moves on three bodies (Saurichthys 1.12 → 3.16x at the rim it shares with the
rostrum's tooth roots, Placodus 1.14 → 1.49x, Mixosaurus 1.65 → 1.81x), the throat behind the
hinge following the jaw, and on none of them past the body's figure.

## Per body

Every repaired body was rebuilt as its full authored/puppet/LOD triplet, packaged with its own
`audit.mjs --package --decode` (exact rig, clip and anchor parity between the authored body and
its twin on every one), and measured on the packaged files. Where a builder appends a gait with
`tools/creatures/motion/apply.mjs` (Nothosaurus `Walk`, Hybodus and Saurichthys `Flop`) that
tool was re-run on the rebuilt body and the clip re-listed in the creature's json. Renders are
`throat-repairs/<id>-jaw-before.png` / `-after.png`, both at the clip and phase `lag.mjs` named
as the worst before the repair.

- **Hybodus** (the owner's example): 6.05 → 0.00 %, 99 rim points closed. The rim is labelled,
  not planar — the mandible is the faces whose surface grows below the mouth line, in a window
  that runs 0.04 of a body *behind* the hinge — so `rear` is every shared vertex from a hair ahead
  of the hinge back that the seam cut did not make, at `band` and `back` in raw units
  (0.0178, 0.0711). Skin 5.93x unchanged (`Shake`, the recorded opercular crack); the jaw's own
  edge goes 1.00x → 2.55x in `Heavy`, which is the shear strip at the rim doing the closing.
  `Flop` re-applied. Before, the render showed a serrated tear the length of the rim with the
  throat exposed behind it; after, the throat is continuous under the mandible.
- **Saurichthys** (the owner's other example): 3.51 → 0.03 %. Same kit and predicate as Hybodus.
  The first port took every shared vertex in the rear half of the mandible, which included the
  label boundary round the interlocking tooth roots forward of the hinge, and pinned the mandible
  to the upper tooth row at 5.61x; with the predicate at the hinge the skin is back to exactly
  3.61x. `Flop` re-applied.
- **Nothosaurus**: 2.19 → 0.28 % (one corner point of 89). Plane cut at `JAWCUT`, throat follows
  under the fitted lip plane. Skin 2.98x unchanged, the T3D-14 bound. `Walk` re-applied. The
  before render is the clearest of the set: a pale wedge open under the corner at `Heavy`.
- **Cartorhynchus**: 2.02 → 0.00 %. Skin 3.72x unchanged. The notch under the corner of the mouth
  at `Heavy` is gone.
- **Mystriosuchus**: 1.80 → 0.00 %. Skin 4.48x unchanged. Its right forelimb is tucked under the
  snout; the limb term keeps the throat share off it.
- **Placodus**: 1.72 → 0.00 % (303 rim points; the hinge plane at `HINGE_X`, the front cut behind
  the chisels left to part). Skin 12.36x unchanged (`Pry`, a paddle). Built after the merge of
  T3D-17, so the triplet carries `Upper crushing teeth`; `hidden-parts.mjs --check` passes on it.
- **Aphaneramma**: 1.65 → 0.00 %. The first build read 4.57x on `jaw` in `Ability`, the throat
  share reaching the right forelimb tucked under the snout; with the share scaled by the vertex's
  non-limb weight it is back to exactly 4.43x.
- **Mixosaurus**: 1.64 → 0.00 %. The worked example for `band` (0.05 bowed the mandible; 0.015
  does not) and for `rear` (the front cut under the overhanging snout must part). Skin 3.62x
  unchanged, torn clips past 2x down from 9 to 4.
- **Cymbospondylus**: 1.14 → 0.03 %. Skin 2.48x unchanged. Rebuilt a second time on the final
  helper (its first build preceded the limb term by a minute; the figures did not move).
- **Dinocephalosaurus**: 0.67 → 0.01 %. Head-frame planes (`HINGE_A` along `HEAD_DIR`). Skin
  7.00x unchanged. Its builder imports the helper directly, as Nothosaurus' does.
- **Keichousaurus**: 0.54 → 0.33 % (3 corner points of 38). Skin 2.34x unchanged; the slot
  under the corner at `Bite` is closed in the render.
- **Tanystropheus**: 0.44 → 0.00 % (31 of 45 points were open at `Severed`). Through
  `K.jaw_junction` on the shore kit, with `K.relax_weights` run first and the parts bound by hand
  since `K.bind` relaxes and writes in one go. Skin 3.00x unchanged.
- **Odontochelys** 0.28 → 0.00 %, **Atopodentatus** 0.26 → 0.00 % (see below), **Archelon**
  0.24 → 0.01 %, **Rhaeticosaurus** 0.22 → 0.00 %, **Birgeria** 0.07 → 0.00 %, **Mosasaurus**
  0.04 → 0.00 %, **Henodus** 0.00 → 0.00 % (its 0.018 blend already closed the rim; now the
  throat follows too). Skin figures unchanged on all seven.
- **Atopodentatus** is the one body whose skin figure moved: 3.90x → 4.31x on the first
  rebuild, on `neck_02` in `Heavy` — that clip pulls the neck back a third of a body while the
  jaw opens, and at a full throat share the gradient of jaw weight across the throat behind the
  corner tore the neck skin harder than its own jaw edge had. Rebuilt with `throat=.6` the cut
  is still closed (0.00 %, 80 rim points) and the skin is back to exactly 3.90x, so the throat
  share is a builder parameter rather than a constant — a neck that swings while the jaw opens
  wants less of the jaw in it.

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

- `node tools/triassic/lag.mjs --all`: every jaw cut closed or open only at corner points under
  the threshold; no limb joint lags. It runs in `npm run triassic` after `idle-bones.mjs`.
- `node tools/triassic/skin-tears.mjs --all --json`: no rebuilt body's skin figure above its
  pre-repair figure (the table); Saurichthys and Aphaneramma came back to theirs exactly once their
  first-build faults were corrected.
- `node tools/triassic/idle-bones.mjs --all`: every joint owns skin on every body.
- `node tools/triassic/oral-shell-audit.mjs <id>`: separate closed rigid palate/floor (or none, by
  verdict) on authored, puppet and LOD of every rebuilt body — the shells are untouched by the
  junction, which writes weights only.
- `node tools/triassic/hidden-parts.mjs --check`: nothing the game hides is named as anatomy
  (Placodus' rename carried through its rebuild).
- Each body's `audit.mjs --package --decode`: exact rig, clip and anchor parity.
- Portraits re-rendered from the packaged files and `publish-portraits.mjs --check` current;
  `node tools/update-asset-sizes.mjs` run; `npx tsc --noEmit`, `npm run build`, `npm run triassic`.
