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
| On | a shipped, rigged body | a raw generated body (`*.preview.glb`) |
| Changes | proportions, station by station | the length of one run of body |
| Hand-off | into a builder's profile rows | baked into the GLB, before rigging |

The split is a gate, not a convention: a sculpt exported off a body with no rig would name a model
nobody ships, and a stretch of a shipped body would be a change no builder could reproduce.

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

## Using it

Open a Triassic animal that is still borrowing a body, switch *Body* to **Generated mesh**, and
press **Stretch**. (Pressing *Stretch* from the roster does both.)

1. **Check which end the head is at.** A raw generation carries no mouth socket, so the tool
   assumes the head faces +axis — true of our exporters, not necessarily of a generation whose
   orientation has not been normalized. The button says which end it is assuming; one click flips
   it. Flipping reverses the direction exactly and leaves both cut lines drawn where they are.
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
