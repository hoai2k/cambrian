# The bend editor

**Where:** the specimen viewer, on any creature's own body or raw generation — *Bend*, or
`/viewer/?specimen=<key>&mode=bend`.
**Checks:** `npm run bend` (the maths), `node tools/bend-browser.mjs <outdir>` (the editor).
**Consumer:** `npm run triassic:bend -- <id>-bend.json` (reads a file back, refuses a stale one).

## What it is for

The stretcher lengthens a run of body between two cuts. This turns one. It is the same shape with
rotation in place of scale, and it exists because of a diagnosis that went wrong three times on one
animal.

Askeptosaurus' head stood **67.7°** off its trunk. A coordinator first derived 78.6° by adding a
chain's *absolute* per-joint turn to its takeoff — but that chain was an S whose signed turn was
three degrees, so it barely deflected the head at all and almost the whole fault was takeoff. And
underneath both of those, three defensible readings of "the trunk" disagreed with each other by up
to 43°: the `body`→`chest` chord, the hip-to-shoulder run, and the measured axis' tangent at the
shoulder (`tools/triassic/creatures/askeptosaurus/validation.json`, the `axis.front` block). Every
number in that argument was a measurement somebody had to take on trust, and none of them was ever
looked at.

So **the readout is the tool**, not the warp. Put the span on the animal by hand, see what it
currently measures, turn it, and see what it measures then — with the definition being measured
named on the screen, and, where the body is rigged, the geometry's answer and the bone chain's
answer side by side, because those are the two that disagreed.

Like mark and mouth mode it works on **whatever body is on stage**, and like the stretcher it means
something different on each:

- **On a raw generation** it is an edit. The mesh on stage is warped live, so what the turn does to
  the surface is seen rather than imagined.
- **On a built body** it is a *measurement*. The editor holds the rig at rest, where the warp is
  exact, so a turn can be chosen by eye on the real animal; the numbers then go to that animal's
  builder. `use: "builder-measurement"`.

## Which body the numbers describe

The panel says it in as many words, above everything else, and `appliesTo` carries it into the file.
That matters more here than in any of the other editors, and on the animal this mode was built for
it is the difference between measuring the fault and measuring the repair.

Askeptosaurus' shipped body **rests in a shape the generation never held**. T3D-26 put the whole aim
of its head into the bind (`carry` in its `validation.json`: `restHeadVsTrunkRunDegrees` 4.17 against
`headVsTrunkRunDegreesUncorrected` 67.68), so bend mode on the shipped body — which holds the rig at
rest, as it must — shows a head that has already been corrected. There is nothing there to aim.

The pre-carry body is reached by the route that already existed rather than by a new artefact.
`tools/triassic/base-poses.mjs` republishes the untouched generation of every body whose builder
moved the mesh before binding, and the viewer's Model control offers it as *Original pose (no rig)*.
A rest-pose **carry** is such a move — it is not a mesh unbending, which is why it carries no
`applied` flag and is told instead by there being bones in `carriedBones` with some share of the aim
in them — so Askeptosaurus now publishes `askeptosaurus.origpose.glb` beside the other six, and that
file is the geometry T3D-26's correction was measured from.

So the panel, on a body like that, says what was moved and points at the original pose by the name
the Model control gives it; on the original pose itself it says it is the untouched generation. The
export's `appliesTo` is `origpose` rather than `generation`, because `built` and `origpose` on this
animal are opposite claims about the same creature and a consumer must be able to tell them apart.
An `origpose` body carries no rig and is still `use: "builder-measurement"`: the file on stage is a
published *copy* of the generation in `tripo-raw/`, so an edit to it would be an edit to a copy, and
what the numbers are for is the builder that turns that generation into the body.

There is **no bake** either way. A rigged body cannot have one — every clip in these files
re-specifies each joint's translation on every frame, so a bent bind pose would show correctly at
rest and then be both overridden and deformed the moment anything played — and a generation's bend
belongs further upstream than a GLB rewrite, at the pose or the regeneration. What leaves the viewer
is the file.

## The span is two points

`base` and `tip` are **places on the animal**: where the neck leaves the shoulder, where the head
begins. Everything else follows from them — both cuts are square to the line between them, that
line is the span's direction, and its length is the distance between them.

That is not tidiness. The stretcher aims its lengthening with two tilt angles because its cuts are
placed as *coordinates on the body axis*; placing them as points instead makes the aim the same act
as the placement, and it is the only thing that works on a curled animal. **Askeptosaurus' neck
leaves its shoulder at 61° to its own long axis** — the frame's axis is the bounding box's, not the
neck's — so cuts square to that axis would cover half the neck's length and a bend about them would
swing the head rather than bend the neck.

Each end is also where its own **trace** starts, and the base end is where the bend is **anchored**.
A bend hinged out in the water beside the animal treats the whole body as an outer fibre and
stretches it rather than bending it, so an end is seated on the body — automatically at first, by
hand when the automatic seat lands on a limb.

## The two planes

Each end of the span is a **plane with its own orientation**, and a plane's normal is the direction
the creature's axis line runs through it. That is the whole control.

| | What it is |
| --- | --- |
| **Base plane** | Where the axis line runs **in**. A pure reference: nothing behind the base cut moves under any bend, so aiming it never moves the body. What a reviewer aiming it is saying is *which direction they are calling the trunk* — which is the argument this tool was built out of, made into a thing you can point at. |
| **Tip plane, at rest** | Where the axis line ran **out** when the plane was seated on the body. Measured, never typed, and re-measured whenever the span moves: it is the animal's own heading there and the pivot every turn is taken from. |
| **Tip plane, as aimed** | Where the axis line is **to** run out. Seated equal to the rest, so the editor opens on the body as it stands. |

The bend is the rotation carrying the tip plane's rest onto its aim, spread linearly across the
span. So **aim both planes the same way and the run between them comes straight**: with the tip
plane set to the base plane, the head's own heading is turned onto the trunk's, which is exactly
what straightening a curve is. *Straighten it* is that one press.

The panel's headline is how far apart the two planes are aimed — nought is straight — with the
animal's own curve across that span beside it and the turn that closes the difference under both.

This replaced a pair of turn **rates**, one at each end of the span, and it keeps what those were
for. The rates existed because the obvious reading of two *angles* — "the base angle is the angle
already turned at the first cut" — puts a kink at the base cut, the rotation jumping from nothing to
that angle across it. An orientation per plane cannot do that at all: the rotation at the base cut
is the rotation carrying the tip plane's rest onto itself, which is identity by construction however
far apart the two planes are aimed. What is given up is the rates' one extra shape — a bend that
starts straight and tightens — and two orientations are a circular arc. That is the shape
straightening wants, and a distribution nobody can measure was never the thing being argued over.

What that does to a vertex:

- on the body side of the base cut — **nothing at all**, to the last decimal;
- past the tip cut — carried **rigidly**, so the head is moved without being deformed;
- between them — bent, turning progressively along its own length.

The map bends rather than sweeps: a point at fraction `s` is carried to the bent centreline at `s`
and then rotated by the rotation accumulated up to `s`, so the span keeps its own length. Rotating
everything about one fixed pivot instead would put the span on a spiral and make it longer as it
turned, which is not what bending a body does.

**Pinch** is the panel's other number: how far the inside of the bend is squeezed, as a fraction of
its own length. 1 is no squeeze; below 0 the turn is tighter than the body is thick and the surface
has folded through itself.

**Seating the planes.** They are measured from the same two traced runs the geometry reading is
taken over, so a freshly seated pair says the same number that reading does — on purpose, and the
panel prints both. *Seat the planes on the body* takes them back off a reviewer and re-measures;
*Seat them on the bone chords* takes them from the two chords the bone reading is between instead,
which is the answer on a body whose trace wandered. An aim a person has given survives the span
moving under it, and the tip plane's *rest* never does: it is not an opinion.

**The span is a slab, and that is the editor's honest limit.** Everything between the two cut
planes is turned, so an oblique span across a curled body takes in whatever else happens to lie
between them: on Askeptosaurus' neck the lit vertices include the near forelimb, because a plane
square to that neck cuts the shoulder as well. The stage lights exactly what the turn would carry
rather than hiding it, in the same way the mouth editor's two half-spaces cannot tell a mandible
from a paddle tucked under the snout. What the editor settles is *where the span is and how far it
turns*; which vertices near a limb belong to the run is still the builder's polyline question.

**The axle is derived, not dialled.** It is whatever the two plane normals imply — the shortest
rotation carrying the tip plane's rest onto its aim — so there is no bend-plane control and no
*Aim the plane* button any more. There used to be both, and the control a reviewer grabbed swept
round the creature's own long axis, which is a twist, while the body it bent went ninety degrees the
other way: the handle's motion was not the bend it produced. A plane's is.

Where the aim is oblique the hinge can carry a little of itself **along** the span, which is a twist
of the span about its own length. That is the honest consequence of the aim rather than something to
clamp away — clamping it would mean the turn no longer carried the tip plane where it was aimed — so
the panel says so past a degree and the file records it as `axis.twistDegrees`.

## The two readings

This is the point of the mode. Both are on screen at all times, each with the two references it is
taken between written underneath it, before the edit and after it.

### Geometry

The body's own centre line, traced outward from each end of the span and fitted to a straight line.
The angle is between the run behind the base cut and the run ahead of the tip cut — so it never
measures the span itself, which is the thing being changed.

The trace **follows the body rather than a coordinate**. Each step predicts where the centre will
be, takes the surface within `reach` of that prediction and within half a step of the plane through
it, and turns towards where that surface actually is. The obvious method — bin an axial slab and
take each bin's centroid — is the one that fails, and it fails on this very animal: Askeptosaurus'
left paddle reaches *further forward than its own snout*, so a slab ahead of the neck averages the
head together with a flipper and reports the head running backwards.

Two knobs, both in the document and both exported, because they are part of the definition:

- **Window** — how much of the body each trace runs over, as a percentage of its length.
- **Reach** — how far off the trace a vertex may sit and still count. It is the limb-rejecting
  threshold. It never starves the trace: a body is a shell, so the surface at a station stands at
  that station's own radius and there is nothing at the centre, and each step therefore takes the
  nearest surface plus a third whatever `reach` says.

And a third number the trace gives about itself: the **residual**, how far its points sit off their
own fitted line. A run of body is nearly a line, so a small figure means the trace followed one
thing; past about 0.05 the panel says it wandered, and the angle it reports is between two
directions nothing in the animal actually runs in. *Read the residual before believing the angle.*

### Bone chain

Where the body is rigged, the same question asked of the rig: the chord the chain runs on into the
span, against the chord it runs on out of it. Two dropdowns per chord, so **which two** is a choice
a person makes and a number the file records — that is the whole lesson.

A third control names the **chain** itself, as its first and last bone: the path between them
through the tree is unique, and the per-joint table is about that path. It has to be a control,
because a limb hanging off a joint inside the span is not part of the run being bent, and no rule
can tell them apart by name (bones are whatever their builder called them).

Both the chain and the chords are **guessed** from where the span is — the root-to-leaf path with
the most joints inside it, and the chords at either end of that — and the guess is made again
whenever the span moves, because a stale one is worse than no default: left alone while the span was
dragged onto a neck, the tip chord stayed `skull → jaw`, which points down at the chin and read that
head as ninety-seven degrees off its trunk. A chord a *person* has named is never guessed again;
*Re-guess the references* hands it back on purpose.

A reference that sits **inside** the span moves when the span bends, and the panel says so. That is
not a fault — a rig has nothing past its last joint to measure a head's own direction with — but it
is why "after minus before" is not the turn you dialled, and can be larger than it where that
reference sits well off the span's own line.

### The three ways every angle is said

`+54.6° in the bend plane · 12.1° out of it · 56.0° in all`

Each hides the other two. The **in-plane** figure is the one an edit changes and the one a target is
dialled to; the **out-of-plane** figure is the tell that the axle is aimed wrong rather than that the
bend is small; the **total** is the number everybody quotes, which is exactly why it must not be the
only one shown. The out-of-plane figure is measured rather than subtracted — turn the base direction
by the in-plane angle and see what is left — because projecting onto a plane can make an angle
*larger* than it is in space, and the subtraction then silently reads zero.

## The handles

Four spheres on the stage, drawn without a depth test because a span through a neck is inside the
neck:

- **Base** (amber) and **tip** (lagoon), the two ends of the span. Drag either one anywhere on the
  animal: the cuts, the direction and the length all follow. The drag runs in the plane facing the
  camera through the handle, so it goes where the pointer goes.
- **Base plane** (pale amber) and **tip plane** (magenta), each standing out from its own end along
  that plane's normal. Drag one and the plane goes where the pointer took it; drag the **tip**
  plane's and the body follows it, because the plane's motion *is* the bend.

Every vertex inside the span is **lit**, and both traced centrelines are **drawn on the body** — so
a trace that has set off down a flipper is seen rather than believed. That is the single most
useful thing on the screen.

**Right-drag orbits**, shift+right-drag pans, scroll zooms, as in mark and mouth mode. The rig goes
to its **bind pose**: a swimming body is drawn somewhere its vertex positions are not.

The panel's numeric fields set every number exactly. A plane's three are the components of a
direction, and the document keeps a plane as a unit vector — so setting one component re-normalises
it with the other two, and typing a whole direction in takes a pass or two to land. The pointer,
which drags the whole direction at once, has no such problem.

**Straighten it** aims the tip plane at the base plane, which is the whole act; the result is then
*measured* and shown, so a base plane aimed somewhere the body's own centre line does not run
straightens the body onto that and says what it got. **No bend** puts the tip plane back on the
body's own heading there. **Seat the planes on the body** and **Seat them on the bone chords**
re-measure both. **Re-seat on the body** puts both *ends* back where the body's own centre is near
them. Undo and redo are ⌘/Ctrl+Z and ⇧⌘/Ctrl+Z; one drag is one step.

## The first guess

Best statement first, and the panel says which was used — the stretcher's own precedence, for its
own reason:

| Frame from | What it means |
| --- | --- |
| `mouth` | The body's own `anchor_mouth`. A built body says where its head is; nothing beats that. |
| `yaw` | The generation's authored turn (`preview-orientation.json`). Exact for a quarter turn; an off-cardinal estimate is refused rather than rounded. |
| `bounds` | The box. Only when a body carries no other signal, and the one that can be wrong — Rhaeticosaurus' flippers span further than it is long, so its box says the animal runs across itself. |
| `manual` | Someone set it. |

The frame is **not** the span. It decides what "up", "lateral" and "how far back from the nose"
mean; the span is two points and may run anywhere.

## The file

**Export bend** writes `<id>-bend.json`:

```json
{
  "schema": "bend-span/2",
  "id": "askeptosaurus",
  "model": "assets/triassic/creatures/askeptosaurus.glb",
  "sha256": "29e62d2f…", "sha256Source": "measured",
  "appliesTo": "built", "use": "builder-measurement",
  "span": {
    "base": [-0.118, 0.066, -1.249], "tip": [-0.511, 0.16, -0.543],
    "baseSource": "manual", "tipSource": "manual",
    "direction": [-0.4831, 0.1156, 0.8679], "length": 0.8135, "percentOfBody": 9.43
  },
  "planes": {
    "baseNormal": [0.6284, -0.1919, 0.7538], "baseSource": "trace",
    "tipRest": [0.9285, -0.2835, 0.2404], "tipNormal": [0.6284, -0.1919, 0.7538], "tipSource": "manual",
    "apartDegrees": 0, "apartBeforeDegrees": 41.4
  },
  "axis": { "vector": [-0.8737, 0, -0.4864], "vectorBlenderZUp": [-0.8737, 0.4864, 0], "twistDegrees": 5.7 },
  "turn": { "totalDegrees": 41.4 },
  "reading": {
    "window": 0.12, "reach": 0.05,
    "geometry": { "baseReference": "…", "tipReference": "…", "baseResidual": 0.062, "before": { "…": "…" }, "after": { "…": "…" } },
    "bones": { "chain": "root → jaw", "baseReference": "tail_00 → chest", "tipReference": "neck_03 → skull",
               "tipMovesWithTheBend": true, "before": { "…": "…" }, "after": { "…": "…" } }
  },
  "joints": [ { "bone": "neck_00", "spanFraction": 0.2, "localDegrees": 3.9, "accumulatedDegrees": 3.9 } ],
  "pinch": { "worst": 0.872 },
  "bend": { "…": "the document itself" }
}
```

- Everything is in the **model's root frame, unscaled**: the file's own coordinates with the scene
  graph flattened, which is the frame a builder measures in. The viewer's display scale and a
  generation's preview turn are never in it.
- `sha256` is the hash of the exact file on stage, **measured in the page** (`crypto.subtle` over
  the bytes the browser already has) and equal to `sha256sum` of that file on disk.
- `axis.vectorBlenderZUp` is the axle in a Z-up armature frame (`[x, −z, y]`), because the creature
  builders work in Blender and a number a builder has to re-derive is the failure this tool is about.
  Both plane normals are given that way too.
- `schema` is `bend-span/2`. A `bend-span/1` file is **refused by name**: it carries turn rates and a
  bend-plane roll, which no longer describe a bend at all, and half-reading one would silently ignore
  its turn.
- `joints` is the shape a builder consumes: a **local** rotation per joint whose product down the
  chain is the accumulated one, in chain order. That is exactly what `uncurl` returns and
  `carry_rest` takes in `tools/triassic/creatures/askeptosaurus/build.py` — a list of bone names and
  a list of local rotations, posed into the rig with the skin following its own weights.
- `bend` is the document. `fromExport` reads it back, and it is the whole of what a consumer needs;
  the rest is for the person reading the file.

## Reading it back

```
npm run triassic:bend -- ~/Downloads/askeptosaurus-bend.json
```

It hashes the GLB the file names under `public/`, counts its vertices, and refuses the file if
either has changed — a pair of points measured on one body means nothing on another, and applying it
would not fail, it would silently bend a different part of a different animal. On a file that
matches it **re-measures everything**: the span, the axle, the turn, the per-joint table over the
real rig, and both readings over the real mesh, before and after — and fails loudly if any of them
disagrees with what the viewer recorded. That last part is the point: a bend file is only worth
anything if a second program can take the numbers again and get the same answers.

It changes nothing. Blender work the numbers imply goes in `docs/triassic/builder-requests.md`.

## Worked example: Askeptosaurus' neck

The animal the mode was built for, measured on the shipped body (`askeptosaurus.glb`, sha256
`29e62d2f…`, 11,604 vertices) with the span placed on the two joints T3D-26's correction ran
between — `chest` at `(-0.118, 0.066, -1.249)` and `skull` at `(-0.511, 0.160, -0.543)`, a span of
0.814, which is 9.4 % of the body and runs 61° off the frame's own axis.

Against the *same* tip chord (`neck_03 → skull`), three defensible readings of "the trunk":

| Base reference | Reading |
| --- | --- |
| `body → chest` | −0.5° in the plane · 2.8° out · **2.8° in all** |
| `tail_00 → chest` (hip to shoulder) | +5.2° in the plane · 13.4° out · **14.3° in all** |
| `chest → neck_00` (the takeoff chord) | +1.2° in the plane · 32.0° out · **32.0° in all** |

**29.1° apart**, on one span, on one screen, each labelled with what it is between. That is the
whole argument of T3D-25/T3D-26 reproduced in a tool, and it is why the panel never shows an angle
without its references.

Renders: [the default span](triassic/verification/askeptosaurus-bend-opened.png), [the span on the
neck](triassic/verification/askeptosaurus-bend-neck.png), the three trunk readings
([`body`](triassic/verification/askeptosaurus-bend-trunk-body.png),
[`tail_00`](triassic/verification/askeptosaurus-bend-trunk-tail_00.png),
[`chest`](triassic/verification/askeptosaurus-bend-trunk-chest.png)), and [the tip plane aimed off
the body's own heading](triassic/verification/askeptosaurus-bend-turned.png).

The per-joint table that span asks for is
[`askeptosaurus-bend-joints.txt`](triassic/verification/askeptosaurus-bend-joints.txt) — `chest`,
`neck_00`…`neck_03`, `skull` in chain order with a local rotation each, summing to the whole turn,
which is the same six bones and the same shape as `carry.frontCarryPerJointDegrees` in that animal's
`validation.json` and is what `carry_rest` takes.

### The headline: straightening the neck on the body that still has the fault

On the **original pose**, `askeptosaurus.origpose.glb` — the generation before T3D-26 carried the
head's aim into the bind — with the span on its neck, `(0.101, −0.007, 0.263)` to
`(0.347, −0.082, 0.422)`:

| | |
| --- | --- |
| at the default window and reach | both traces wander on this curled generation and the panel says so in orange, which is the warning doing its job |
| at a **26 %** window and a **2 %** reach | residuals 0.035 behind and 0.047 ahead, both under the bar |
| the two planes, seated | **41.40° apart** — the animal's own curve across this span, and the geometry reading says the same 41.4° because they are seated on the same two runs |
| *Straighten it* | 0.00° apart, a turn of 41.40° |
| the geometry reading, re-measured over the warped mesh | **1.05° in the plane** |

[Before](triassic/verification/askeptosaurus-bend-origpose-seated.png) and
[after](triassic/verification/askeptosaurus-bend-straightened.png), same camera; the numbers are
[`askeptosaurus-bend-straightening.txt`](triassic/verification/askeptosaurus-bend-straightening.txt),
and [the default seat](triassic/verification/askeptosaurus-bend-origpose.png) is the one the panel
refuses to report a confident angle for.

The 1.05° left over is the trace's own noise, not a failure of the warp: past the tip cut the body
is carried by one rigid rotation, so the tip trace after the bend is the tip trace before it turned
by exactly that rotation, and the rotation is by construction the one carrying that heading onto the
base plane's. Nothing at the base cut moves at all, to the last decimal, whatever the planes are
aimed at.

### Where it agrees with the builder, and where it does not

The builder records `axis.carry.restHeadVsTrunkRunDegrees` **4.17°** — the head against the trunk's
run at rest, after T3D-26's correction. Read here between the same two references (`tail_00 → chest`
against the skull's own axis out to its snout landmark) the tool reads **6.93°**. The difference is
neither reading being wrong: it is *which point on the skull is the snout*. The builder measures to
its own measured snout landmark carried through the carry map; the nearest thing a viewer can name
is an anchor, and `anchor_attack_primary` sits a little off that landmark — enough, over a head
0.42 long, to move the angle by about three degrees. Measured to `anchor_mouth` instead it reads
9.03°. **Three references, three answers, all of them defensible**, which is the finding rather than
a failure, and the reason the export names the two it used.

Two things the tool says that the ticket could not:

- The chord the rig actually leaves the span on, `neck_03 → skull`, is **14.3°** off the hip-to-
  shoulder run — not 4°. The 4° figure is about the *head's own axis*, which reaches past the last
  joint; the last joint's own segment still points somewhere else. Both are true and they are not
  the same number.
- The **geometry reading is unreliable at this animal's trunk end and excellent at its head end**:
  residual 0.009 ahead of the span and 0.062 behind it. The trunk is short, fat, curled, and
  crossed by both forelimbs, so a "centreline" of it traced from the shoulder is not a line, and the
  panel says so in orange rather than reporting a confident number. On this body, read the bone
  chain. That is exactly the judgement the tool is meant to let a person make instead of taking one
  number on trust.

## Where it sits among the other editors

| | Sculpt | Stretch | Bend | Mouth | Mark |
| --- | --- | --- | --- | --- | --- |
| Changes | proportions, station by station | the length of one run | the direction one run leaves on | nothing — it aims a cut | nothing — it names vertices |
| On | a built body, Cambrian and Devonian | a generation or a built body | a generation or a built body | any body | any body |

Bend sits exactly where stretch does, because it asks the same kind of question about the same run
of body — stretch changes a span's length and bend changes its direction — and neither can be baked
into a rigged body. It refuses the comparison twin and props for stretch's own reason: a measurement
exported off the twin would name the right creature and describe the wrong mesh.

## Files

| File | What it is |
| --- | --- |
| `src/viewer/bend/bend.ts` | The document, the warp, the traces, the readings and the file. Pure — no DOM, no three.js. |
| `src/viewer/bend/BendEditor.tsx` | The handles, the drags, the hashing and the panel. |
| `src/viewer/bend/store.ts` | The session's documents, in memory only. |
| `src/viewer/scene.ts` | `showBend`, `bendPick` and the shared `dragPoint`: the two oriented planes, the derived axle, the traces, the lit span and the pointer's ray. |
| `tools/triassic/base-poses.mjs` | Publishes each untouched generation, which is how the pre-carry body is on the stage at all. |
| `tools/bend-test.ts` | `npm run bend` — the span, the two planes, the warp, the traces, the readings, the joint table, the file and its refusals. |
| `tools/bend-browser.mjs` | The editor in a real browser, on Askeptosaurus: the body note, the handles, the fields, the references, the joint table, the export, the consumer, the three trunk readings and the straightening on the original pose. |
| `tools/triassic/bend-check.ts` | `npm run triassic:bend` — the consumer, which re-measures rather than reprinting. |

Nothing is saved. The document lives in the session so a trip through view mode does not lose it,
and a reload starts from the body's own guess. What leaves the viewer is the bend file.
