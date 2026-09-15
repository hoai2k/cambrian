# Mark mode in the specimen viewer

`/viewer/?specimen=<key>&mode=mark` — or the **Mark region** button on any creature — lets a human
paint the geometry that should not be there and export it, so a script can cut exactly that away.

It exists for one situation. The raw Tripo preview bodies carry extra fins and spare tails, and
after welding **19 of the 21 are a single connected surface**
(`docs/triassic/preview-mesh-defects.md`): the unwanted fin shares vertices with the body, so no
automatic rule can separate it and only a reviewer knows which fin is wanted. Mark mode is how they
point; `tools/triassic/cut-region.py` is what acts on the pointing.

Unlike sculpt mode, it works on **whatever body is on stage**, the *Generated mesh* above all —
that raw surface is the one carrying the fins nobody asked for. Props are the only thing it
refuses. Marks are indices into one exact file, so the *Model* control starts a fresh region.

## Marking

- **Left-drag on the body paints.** The brush is a sphere in world space: every vertex inside it is
  marked, wherever it is — including the far side of a thin fin, which is what you want when the
  thing being cut is a sheet.
- **Right-drag orbits**, shift+right-drag pans, scroll zooms. The stage says so along its top edge,
  because a mode where dragging paints has to leave the model turnable without a modifier nobody
  would find.
- The **ring** under the pointer is the brush at the size it actually catches, drawn at the depth of
  the surface under it. Off the body it goes grey and is drawn at the body's own depth.
- **Brush** slider, or `[` and `]`. It is a share of the body's own radius, so it means the same
  thing on a hatchling and a shonisaur.
- **Erase** paints the other way round (`E` toggles). **Clear all** starts over.
- Undo/redo: ⌘/Ctrl+Z and ⇧⌘/Ctrl+Z (or Ctrl+Y). One pointer-down to pointer-up is one step, and a
  stroke that caught nothing is not a step at all.
- The panel counts what is marked and what share of the mesh that is.
- The **note** says what the region is ("the three ventral fins") and travels in the file.
- The rig goes to its **bind pose** while marking. A swimming body is drawn somewhere its vertex
  positions are not, and a brush that marks the bind pose while you paint the swimming one marks the
  wrong fin. A generated mesh has no rig and never moves anyway.

Nothing is saved. The marks live in the session so a trip through view mode does not lose them, and
a reload starts clean. What leaves the viewer is the region file.

## The region file

**Export region** writes `<id>-region.json`:

```json
{
  "schema": "mesh-region/1",
  "id": "atopodentatus",
  "model": "assets/triassic/creatures/atopodentatus.preview.glb",
  "sha256": "569badc2…",
  "markedAt": "2026-09-13T23:58:10.412Z",
  "note": "the three ventral fins",
  "vertexCount": 12059,
  "markedCount": 518,
  "meshes": [
    {
      "index": 0,
      "name": "tripo_node_c8b7e07d…",
      "vertexCount": 12059,
      "bounds": { "min": [-0.06, -0.15, 0.02], "max": [0.21, -0.04, 0.19] },
      "vertices": [17, 18, 42, …]
    }
  ],
  "vertices": [17, 18, 42, …]
}
```

- `vertices` are **indices into the mesh as it loads from that exact file** — the glTF accessor's
  own vertex order, which Blender's importer preserves (checked against the accessor on the preview
  bodies), and which is why nothing in the cutting script may weld or re-index before the delete.
- A body with more than one mesh is addressed **per mesh** in `meshes`, by `index` — its place in
  load order, because names survive neither exporters nor Blender's uniquifying. `vertexCount` and
  `bounds` are what a script checks that address against.
- The top-level `vertices` is a convenience and appears **only** when the body is a single mesh
  (every Tripo preview is). With two it would be a lie by omission, so it is left out.
- `bounds` is the box the marked vertices occupy in the mesh's own coordinates, as the file stores
  them. It is the check that catches indices meaning something else in another file.
- `sha256` is the hash from `src/content/triassic/preview-bodies.json` where the manifest knows the
  body, and `null` otherwise — the panel says so when it will be.
- Only meshes with something marked appear; `vertexCount` at the top is the whole body, because the
  share cut is the number the cut is judged by.

## Cutting

```
/opt/blender/blender --background --factory-startup --python tools/triassic/cut-region.py \
    -- <id>-region.json [--out DIR] [--renders DIR] [--no-fill] [--no-stitch] [--no-render] [--unhashed]
```

It refuses to run if the model's hash is not the one the region was marked on, if the mesh no longer
has the vertex count it had, or if the marked vertices no longer sit in the box the region quotes —
a region applied to the wrong mesh deletes arbitrary geometry. It renders the body in side and top
view before and after plus a close-up of the region itself, because a cut of a few hundred vertices
can sit on the far flank and be invisible in both whole-body views.

The cut lands in `local/triassic/cuts/<id>.cut.glb` — the workbench, which is gitignored — and never
over the source. Not beside it either, and that is not fussiness: everything under `public/` is
published with the site, and `tools/triassic/review-bodies.mjs` reads every `.glb` in the creature
folder that is not a preview, puppet or LOD as an animal's own body awaiting review, so a cut
dropped there would announce itself as a delivered model and fail `npm run triassic`.

The hole is closed where a plain fill can close it. On a raw generated body the rim is usually a set
of arcs rather than a loop — the body arrives as unstitched patches, and every seam crossing the rim
holds two copies of the same point — so the rim alone is welded and filled again. Beyond that it
leaves the hole open and says so: reconstructing what a fin was attached to is sculpting, and a
clean cut with an honest report beats a clever guess. The report gives vertex and triangle counts
before and after, and how many pieces the surface is in *welded* (the number that means anything:
counting components on an unwelded body measures the generator's triangulation, not the animal).

Installing a cut mesh is a separate human decision. This pair of tools marks and cuts to a copy.

## Checks

- `npm run mark` — the brush's arithmetic, the stroke history and the region file's addressing,
  with no browser (`src/viewer/mark/region.ts` is pure).
- `node tools/mark-browser.mjs <outdir>` — the mode driven in a real browser against a preview
  build: paint, undo/redo, erase, export, and the indices read back out of the file.
