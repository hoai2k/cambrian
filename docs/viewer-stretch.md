# The neck stretcher

**Where:** the specimen viewer, on any Triassic animal still showing a raw generated body —
*Stretch*, or `/viewer/?specimen=triassic:<id>&mode=stretch`.
**Checks:** `npm run stretch` (the maths), `node tools/stretch-browser.mjs <outdir>` (the editor).
**Bake:** `npm run triassic:stretch -- <id>-stretch.json --write`.

## What it is for

A Tripo generation gets one thing wrong more often than anything else, and it is the one thing the
sculpt tool cannot fix: the **length** of a run of body. Dinocephalosaurus comes back with the neck
of an ordinary lizard. No amount of moving a silhouette's stations up or down makes a short neck a
long one — sculpt reshapes the body it is given, station by station; this lengthens a stretch of it.

So the two tools are separate and the viewer offers exactly one of them at a time:

| | Sculpt | Stretch |
| --- | --- | --- |
| On | a built, rigged body | any of an animal's own bodies |
| Changes | proportions, station by station | the length of one run of body |

Sculpt is offered only on a body the animal actually owns: exported off an unrigged generation it
would name a model nobody ships. Stretch is offered on both, but means something different on each,
and the exported file says which:

- **On a raw generation** it is an edit. `npm run triassic:stretch` bakes it into the GLB, before
  anything is cleaned, rigged or animated. `appliesTo: "generated-glb"`.
- **On a built body** it is a *measurement*. The editor holds the rig at rest, where the warp is
  exact, so a length can be chosen by eye on the real animal; the numbers then go to that animal's
  builder. `appliesTo: "builder"`, and the bake refuses the file by name.

The reason a built body cannot be baked is in its clips, not in the warp. Every clip these files
carry re-specifies each joint's translation on every frame — Nothosaurus is 27 joints across 21
clips — so a warped bind pose shows correctly at rest and is then both overridden and deformed,
swinging about joints left where they were, the moment anything plays. Making it stick would mean
re-authoring every clip outside Blender, which is the one thing this project's notes say not to do.
The editor puts the warp back when you leave, so a stretched bind pose never reaches a playing
animation.

## The edit

Four numbers, and the whole of it:

- **from** — where the neck leaves the body.
- **to** — where the head begins.
- **direction** — the angle the lengthening is aimed at, as a lean in the side view and a lean in
  the top view. A neck that leaves the shoulders rising and to the left is lengthened rising and to
  the left, rather than straight down the body axis.
- **factor** — how much longer the part between the cuts should be. 2 is twice the neck; below 1
  shortens, which a generated neck needs about as often.

Both cuts are square to that one direction — they share it rather than each carrying an orientation
of their own. Two independently angled cuts would let the region be wedge-shaped, which is a
different and much fiddlier edit; what is wanted is to aim the lengthening, and one direction aims
it. It also makes the map exact: between two parallel cuts, "how far through the region" is plain
distance over length, so the stretch is a true uniform scale of that region along the direction.

What that does to a vertex:

- on the body side of **from** — nothing at all, to the last decimal;
- past **to** — carried rigidly, so the skull keeps its shape and its size;
- between them — moved in proportion to how far through it sits.

The blend is linear, not eased. An eased one would pile the new length into the middle of the neck
and leave it pinched at both cuts.

**The seam is real.** The surface stays continuous across a cut but its slope does not, so a cut
through the middle of a smooth flank shows as a faint crease at a large factor. That is why the
cuts are yours to place: put them where the body already changes — the shoulder, the base of the
skull — and there is nothing to see.

## Which way the body lies

Everything else is meaningless if this is wrong, and getting it wrong is easy: a *bounding box*
says Rhaeticosaurus runs across its own flippers, because its paddles span further than it is long.
A tool that believes the box draws the "side view" from the front and lays its cuts along the wings.

So the frame is taken from the best statement available, and the panel says which was used:

| Source | What it is |
| --- | --- |
| `mouth` | The body's own `anchor_mouth`. A built body says where its head is; nothing beats that. |
| `yaw` | The generation's authored turn (`preview-orientation.json`) — how far about +y brings its head round to +z, so it says where the head was before that. Exact for a quarter turn; an off-cardinal estimate is refused rather than rounded. |
| `bounds` | The box. Only when a body carries no other signal, and the one that can be wrong. |
| `manual` | Someone set it. |

The **Orientation** controls override any of them: *Body along X / Z* re-frames both drawings (and
starts the cuts again, because a coordinate on the old axis means nothing on the new one), and
*Head left / right* turns the lengthening round while leaving the cut lines exactly where they are
drawn. An override is recorded as `manual` in the export, so a frame a human chose never reads as
one the tool worked out.

The yaws are estimates, and their own file says a wrong one "costs a preview that faces the wrong
way, never a shipped asset". Rhaeticosaurus is currently one of those: its side view is a true
profile with the head at +z, which is not what its stored yaw of 180 claims. Set the orientation by
hand there until the estimate is corrected.

No third view is needed. Side and top are the two that matter for aiming a length — up-and-down and
left-and-right — and a front view would add a picture without adding a control.

## Using it

Open the animal and press **Stretch**. For one still borrowing a body that also switches *Body* to
the generated mesh, which is what the stretch applies to.

1. **Check the orientation panel.** If it says the frame was guessed from the bounding box, look at
   the drawings before trusting them.
2. **Place the cuts.** Drag a line along the body. The two may not cross; they stop a hundredth of
   the body apart.
3. **Aim it.** Drag either handle on either cut. Both cuts turn together, in that view only — the
   side view sets the side lean and the top view the top lean, independently. Double-click a handle
   to square them again, or press *Level*.
4. **Stretch.** The slider, or one of the preset factors. The dashed line shows where the far cut
   is going and the arrow which way; the preview on the right is the real mesh, warped.
5. **Check it against the generation.** The *Stretched / Generated* toggle, or press **O**.
6. **Export stretch.** That writes `<id>-stretch.json`.

Undo and redo are ⌘/Ctrl+Z and ⇧⌘/Ctrl+Z. Nothing is saved: reloading returns to the mesh as
generated, and an edit becomes real only when it is baked.

## Baking it

```sh
npm run triassic:stretch -- ~/Downloads/dinocephalosaurus-stretch.json          # what it would do
npm run triassic:stretch -- ~/Downloads/dinocephalosaurus-stretch.json --write  # do it
node tools/update-asset-sizes.mjs && npm run triassic:previews                  # republish
```

It applies to `tools/triassic/creatures/<id>/<id>.preview.glb`, the working copy of the generation,
and never to `<id>/tripo-raw/<id>.raw.glb` — that is the thing every later artefact is checked
against, and a baked GLB that had quietly overwritten it could not be. The stretch file is copied
in beside the body it changed, so a folder with a longer-necked GLB in it says what was done and by
how much.

Three things it refuses or checks rather than trusting:

- **A stretch measured on a different mesh.** The file records the vertex count it was drawn on. A
  body regenerated since means the cuts are no longer where they were put — which would not fail,
  it would silently stretch the wrong part of a different animal.
- **A file that is not a stretch**, or one missing what the warp needs. `fromExport` names what is
  wrong.
- **Its own output.** After writing, it reads the file back and checks every vertex against the
  warp. It overwrites a generation that cost real money to make, and between the edit and the disk
  sit an encoder and a quantizer; a wrong file would look perfectly plausible, because a body with
  a longer neck always does.

Positions move, normals follow the inverse transpose of the map and tangents the map itself, so the
generated mesh keeps its own shading instead of being reshaded wholesale by a
`computeVertexNormals` it never asked for. Textures, materials and the node graph pass through
untouched.

## Worked example: the Nothosaurus neck

The animal this tool was wanted for, and a good illustration of both what it can and cannot do.

*Nothosaurus giganteus* should carry a neck about a fifth of its length; the shipped body carries
the head almost on the shoulders. Measured on `nothosaurus.glb`, the local half-width steps from
0.808 to 0.223 in one 0.075 slice at z ≈ 1.61 — a shoulder, then a head, with a short neck between
them.

Cuts at z 1.500 (in the shoulder) and 1.790 (the base of the skull) take a region of 0.290, which
is 5.8% of the body. At 2× that becomes 11.6%, at 3× 17.4% — the genus's defining proportion,
nearly. It reads well in the viewer at both.

That is a better result than the earlier study reached
(`tools/triassic/creatures/nothosaurus/neck-study.py`, and its render beside it), and the
difference is entirely in where the cuts went. That study stretched the *visible* neck alone — a
band of 0.17 — so reaching the same proportion needed a factor of five to seven, and at that factor
the UVs smear into a blank untextured sock. Spreading the same lengthening over a region that
includes textured shoulder costs a 2–3× smear instead, which the mottled hide carries.

It still cannot be baked, for the reason above: Nothosaurus is rigged and every clip re-specifies
every joint. What the export gives you is the instruction —  region, direction and factor — for
`tools/triassic/creatures/nothosaurus/build.py`. And for the full one-fifth the honest route is
still the one already queued in
`docs/triassic/canonical/prompts-2026-09-13-nothosaurus-neck.json`: back to the pose, because a
stretch can lengthen a neck but cannot invent the cervical anatomy to fill it.

## Files

| File | What it is |
| --- | --- |
| `src/viewer/stretch/stretch.ts` | The document and the maths. Pure — no DOM, no three.js. |
| `src/viewer/stretch/StretchEditor.tsx` | The drawings, the drags and the panel. |
| `src/viewer/stretch/store.ts` | The session's documents, in memory only. |
| `tools/stretch-test.ts` | `npm run stretch` — the body held still, the head rigid, the region uniform, the export enough to rebuild the warp. |
| `tools/stretch-browser.mjs` | The editor in a real browser: two cuts on both views, one shared direction, the slider, the export, undo. |
| `tools/triassic/stretch.ts` | The bake. Imports the viewer's own warp rather than keeping a second copy. |

The viewer previews with `warp()` and the bake applies `warp()` — one implementation, not two that
agree by inspection. `npm run stretch` holds the other half of that: the exported file is enough to
rebuild the same warp, since the file is the whole of what leaves the browser.
