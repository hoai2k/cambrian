# The mouth editor

**Where:** the specimen viewer, on any creature — *Mouth*, or `/viewer/?specimen=<key>&mode=mouth`.
**Checks:** `npm run mouth` (the maths), `node tools/mouth-browser.mjs <outdir>` (the editor).
**Consumer:** `npm run triassic:mouth -- <id>-mouth.json` (reads a file back, refuses a stale one).

## What it is for

Every Tripo-derived builder finds the mouth by *measurement*: cast the head's vertex normals back
into the mesh and fit a curve to the hits, or read the lip line off the albedo, or take the darkest
row of the pale flank. Each of those has been fooled at least once and plausibly — Keichousaurus'
countershading read as its lip, a cephalopod's neighbouring arms read as a slit, Mosasaurus' tail
read as a gaping head (the mouth rule in `CLAUDE.md` has the whole list). What none of them offered
was a way for a person to look at the animal, say *the hinge is here and the mouth runs like this*,
and hand that over as numbers a builder can read.

This is that. A **cut plane** and a **hinge**, aimed on the body on stage with three handles, with
every vertex the cut would take onto the mandible lit as you go, and exported in the model's own
frame with the hash of the exact file it was aimed on. It is for two uses, and the file serves both:

- **Exact.** A builder reads `hinge.centre`, `hinge.axis`, `plane.point` and `plane.normal` and
  seats its jaw bone and cuts its mandible from them, instead of measuring. The file also carries
  the vertex counts either side, so the builder can prove it read the same cut.
- **Guidance.** A reviewer aims the cut, exports it, and hands the file to the builder's author:
  "the hinge belongs this far back, the line rises four degrees". The numbers are the review.

Unlike sculpt mode it works on **whatever body is on stage** — the raw generation, its preview,
the original pose, the built body, the twin — because the file it is most wanted on is the one no
builder has measured yet. The export says which kind of body it was aimed on (`appliesTo`), and
since a cut is aimed on one file rather than on "the animal", the *Model* control starts a fresh
document. Props are the only thing it refuses.

## The edit

Six numbers on top of the body's frame:

| Number | What it is |
| --- | --- |
| **Depth** | How far back from the nose the hinge sits, along the body axis, in model units. This is *how deep the cut goes*: pull it back and the jaw pivots further behind the head. |
| **Height** | Where the mouth line sits up and down, at the hinge. |
| **Seat** | Where it sits across the head — left or right of the midline. |
| **Pitch** | The angle of the mouth line in profile. Positive lifts the line towards the nose. |
| **Yaw** | The hinge turned in plan, so one side's pivot sits further back than the other. |
| **Roll** | The plane tipped about the mouth line, so one corner of the mouth is higher. |

From those, one orthonormal basis: **forward** runs from the hinge along the mouth line to the
nose, **hinge** runs across the head along the pivot, and **normal** is up out of the mouth — the
skull's side. The *cut plane* is through the hinge centre with that normal, and the *mandible* is
everything **below the plane and ahead of the hinge**:

```
mandible(v)  ⇔  (v − point) · normal < 0   and   (v − point) · forward > 0
```

The second half-space is what stops the cut running back through the neck, and its wall is square
to the cut plane. The stage draws both: the cut plane in lagoon from the hinge to the nose, and the
hinge wall in amber. Nothing here is a mesh operation — the document is a test a vertex passes or
fails, which is what the stage lights and what the counts in the export are.

That is also the editor's honest limit. Two half-spaces cannot tell a mandible from a paddle tucked
forward under the snout: on Placodus the rig's own seat lights the near forelimb along with the
jaw, exactly as Aphaneramma's forelimb was cut into the lower-jaw shell by a builder's own band
cut (the CLAUDE.md note on parts cut onto another bone's shell). The lit vertices and the count say
so rather than the tool hiding it. What the editor settles is *where the hinge and the plane are*;
which vertices near a limb belong to the jaw is still the builder's polyline question, and a builder
reading the file should keep asking it.

The three angles compose yaw, then pitch, then roll (about the up axis, then the turned lateral,
then the tilted forward), so with the other two at zero each reads exactly as its own view shows
it: pitch is the angle in the side view, yaw the angle from above, roll the angle from the front.
With all three set they interact — the price of three angles — which is why the export carries the
basis vectors as well as the angles: a consumer never recomposes them. The angles are held to ±60°,
past any real mouth and safely short of a plane lying along the body.

## The gape

The cut is a test, and a test is hard to look at. **Gape** swings it: every vertex the document
takes onto the mandible, rotated rigidly about the hinge, live on the body on stage. That is the
preview, and the whole reason the editor has one is that *is the hinge in the right place* is a
question about a mouth opening, which no count answers.

**The body's own clips cannot show it, and this is why there is a slider rather than a play button.**
A built body's `Bite` opens the jaw the file was *built* with — a cut somebody measured before this
one, baked into the rig's weights — and the cut being aimed is nowhere in that rig. Playing a clip
after moving the hinge would therefore show exactly the same mouth as before it, which is worse
than showing nothing: it would look like an answer. The slider swings the document instead, so what
moves is what the hinge and the plane say moves.

- **Holding it clears the screen.** While the slider is held — dragged, or nudged with the arrow
  keys — the handles, the planes, the lit vertices, the panel and the specimen list all come off,
  so what is on screen while the jaw moves is the animal. Letting go brings it all back.
- **The jaw stays where it is left.** The gape does not snap shut on release, so the hinge can be
  dragged and the fields typed with the mouth open, and the change is seen as it is made. The lit
  vertices ride the open jaw rather than staying behind in the shut mouth.
- **Open the jaw / Shut the jaw** is the same control without the hold, for when the screen should
  stay as it is.
- It is **rigid on purpose.** The document's test is a vertex in or out, so the preview is that
  test moved, tear and all: where the mandible parts from the head along the cut is exactly the
  slot a builder's rigid shell opens there (CLAUDE.md, the jaw junction). A feathered preview would
  smooth over a hinge in the wrong place, which is the one thing this is for.
- It is **not the document.** The gape is not in the export, is not an undo step, and shutting the
  jaw puts the body back exactly — positions *and* the file's own normals, which is why clearing a
  warp restores the shipped normals rather than recomputing them.
- The ceiling is 60° and a gape past it is held there, for the reason the angles are: past that,
  what is being looked at is the rotation rather than the cut.

One measured thing worth keeping: the axis the jaw turns about is `normal × forward`, not `hinge`.
`hinge` is the pivot to within a sign, and which sign *opens* is right-handed in only two of the
four frames a document can be in — along z with the head high it is +hinge, along x with the head
high it is −hinge, and flipping the head end turns each round again. Turning about `hinge` itself
would have shut the mouth on half the bodies, and since shut is where the slider starts, that reads
as a control that does nothing rather than as a bug.

## The handles

Three spheres on the stage, sized to the head so a hatchling's and a shonisaur's grab alike, drawn
without a depth test because a cut through a head is inside the head:

- **Hinge** (amber), at the pivot. Drag it and the whole cut goes with it: along the body that is
  the depth, up and down the height, across the seat — whichever the camera happens to show. The
  drag runs in the plane facing the camera through the handle, so it goes where the pointer goes.
- **Front** (lagoon), out at the nose end of the mouth line. Drag it to aim the line: pitch in
  profile, yaw in plan. Dragged behind the hinge it says nothing about the mouth and is refused.
- **Side** (magenta), out on the pivot. Drag it up or down to tip the plane: roll, and only roll.

**Right-drag orbits**, shift+right-drag pans, scroll zooms — as in mark mode, because a mode where
left-drag moves a handle has to leave the model turnable without a modifier nobody would find. The
legend along the top edge names the handles and lights the one under the pointer.

The rig goes to its **bind pose** while the cut is aimed: a swimming body is drawn somewhere its
vertex positions are not, and a plane aimed on the swimming pose would cut the bind pose somewhere
else. A raw generation has no rig and never moves anyway.

The panel's **numeric fields** set the same six numbers exactly, with the angles in degrees.
**Square** levels all three angles and leaves the hinge where it is. Undo and redo are ⌘/Ctrl+Z
and ⇧⌘/Ctrl+Z (or Ctrl+Y); one drag is one step.

## The first guess

Best statement first, and the panel says which was used:

| Frame from | Seat from | What it means |
| --- | --- | --- |
| `mouth` | `jaw` | A built body. The `anchor_mouth` socket says where the head is; the `jaw` bone's head *is* the rig's hinge, and the line from it to the socket is the mouth line, so its pitch is read off the rig. Nothing beats that. |
| `mouth` | `socket` | A body with the socket and no jaw bone: the line is seated at the socket's height and the depth is a guess. |
| `yaw` | `guess` | A raw generation with an authored `previewYaw`: the frame is exact for a quarter turn, the seat is the head's own section. |
| `bounds` | `guess` | Nothing on the body says. The frame is the box — the one that can be wrong, and the panel flags it — and the hinge is a head's worth back from the nose (`DEFAULT_DEPTH`, 12 % of the body), a little below the middle of the head's section. Somewhere to start dragging from. |
| `manual` | `manual` | A human set it, which is the expected end state on every body. |

The **Orientation** controls override the frame: *Body along X / Z* re-measures the body on the
new axis and re-seats the hinge as a guess (a depth on the old axis means nothing on the new one);
*Head at high / low* keeps the plane and the hinge line exactly where they are drawn and turns
round which side of the hinge is the jaw — the correction is to the frame, and the cut a human had
aimed must not move under them. An override is recorded as `manual` in the export.

## The file

**Export mouth** writes `<id>-mouth.json`:

```json
{
  "schema": "mouth-cut/1",
  "id": "placodus",
  "model": "assets/triassic/creatures/placodus.glb",
  "sha256": "3f1c…",
  "sha256Source": "measured",
  "appliesTo": "built",
  "authoredAt": "2026-09-20T10:12:44.120Z",
  "note": "the hinge a fifth of a head further back",
  "creature": { "key": "triassic:placodus", "id": "placodus", "collection": "triassic", "vertices": 12406, "rigged": true },
  "frame": { "axis": "z", "forward": 1, "up": "y", "source": "mouth", "note": "Model root frame, unscaled …" },
  "seat": { "source": "manual" },
  "hinge": { "depth": 0.62, "headFraction": 0.111, "centre": [0, -0.19, 2.17], "axis": [1, 0, 0] },
  "plane": {
    "point": [0, -0.19, 2.17], "normal": [0, 0.99, 0.12], "forward": [0, -0.12, 0.99],
    "pitch": -0.122, "yaw": 0, "roll": 0, "pitchDegrees": -7, "yawDegrees": 0, "rollDegrees": 0
  },
  "sides": { "mandible": 1204, "skull": 11202, "total": 12406 },
  "bounds": { "length": 5.58, "…": "…" },
  "head": { "height": 0.71, "width": 0.66, "upMid": -0.02, "lateralMid": 0 },
  "rule": "A vertex is on the mandible when …",
  "mouth": { "…": "the document itself" }
}
```

- Everything is in the **model's root frame, unscaled**: the file's own coordinates with the scene
  graph flattened, which is the frame a builder measures in. The viewer's display scale and a
  generation's preview turn are never in it.
- `sha256` is the hash of the exact file on stage, **measured in the page** (`crypto.subtle` over
  the bytes the browser already has) and equal to `sha256sum` of that file on disk. Where the page
  cannot hash — a plain-http deployment is not a secure context — it falls back to a manifest's
  hash where one knows the body (`sha256Source: "manifest"`) and otherwise to `null`, and the panel
  says so. The consumer then has only the vertex count to go on.
- `appliesTo` is what was on stage: `generation` (the untouched Tripo mesh — an original-pose copy
  of it), `preview` (a generation's published preview), `built` (the authored body) or `twin` (the
  procedural puppet).
- `hinge.axis` and `plane.normal` are unit vectors; `plane.forward` is the third. `hinge.centre`
  and `plane.point` are the same point, named twice for the two things it is.
- `sides` is the count the panel showed, over every vertex of every mesh in the file.
- `mouth` is the document. `fromExport` reads it back, and it is the whole of what a consumer
  needs; the rest is for the person reading the file.

## Reading it back

```
npm run triassic:mouth -- ~/Downloads/placodus-mouth.json
```

It hashes the GLB the file names under `public/`, counts its vertices, and refuses the file if
either has changed since the cut was aimed — a hinge depth measured on one body means nothing on
another, and applying it would not fail, it would silently put the jaw somewhere else. On a file
that matches it prints the hinge and the plane, re-runs the mandible test over the actual mesh and
compares the count with the one the viewer recorded. It changes nothing; what a builder does with
the numbers is that builder's business, and Blender work the numbers imply goes in
`docs/triassic/builder-requests.md`.

Every consumer goes through `fromExport(payload, { sha256, vertices })` in
`src/viewer/mouth/mouth.ts`, so "the export is enough to rebuild the test, and is refused on the
wrong body" is one claim in one place, and `npm run mouth` holds it.

## Files

| File | What it is |
| --- | --- |
| `src/viewer/mouth/mouth.ts` | The document, the basis, the test, the gape and the file. Pure — no DOM, no three.js. |
| `src/viewer/mouth/MouthEditor.tsx` | The handles, the drags, the hashing and the panel. |
| `src/viewer/mouth/store.ts` | The session's documents, in memory only. |
| `src/viewer/scene.ts` | `showMouthCut`, `mouthPick`, `setMouthGape` and the shared `dragPoint`: the helpers, the lit mandible, the swing and the pointer's ray. |
| `tools/mouth-test.ts` | `npm run mouth` — the guess, the basis, the test, the three handles, flipping, the gape, the file and its refusals. |
| `tools/mouth-browser.mjs` | The editor in a real browser: seated on the jaw bone, a handle found by hover and dragged, the fields, the gape measured as pixels that moved in the rendered frame, the measured hash, the consumer's acceptance and refusal, the original pose. |
| `tools/triassic/mouth-check.ts` | `npm run triassic:mouth` — the consumer. |

Nothing is saved. The document lives in the session so a trip through view mode does not lose it,
and a reload starts from the body's own guess. What leaves the viewer is the mouth file.

Files that have been aimed and handed over live in `docs/triassic/mouths/`, with their numbers in a
table beside them.
