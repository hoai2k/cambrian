# Sculpt mode in the specimen viewer

`/viewer/?specimen=<key>&mode=sculpt` — or the **Edit sculpt** button on any creature — turns the
viewer into a proportions editor: two drawings, a preview, and a panel. The point is to make a
body change the way the builders think about one, so a change made by eye here is a change a
builder can be given.

## What you see

- **Side** (top left): the body from the side, with its *dorsal* line (highest point at every
  station) and *ventral* line (lowest point).
- **Top** (bottom left): the body from above, with its *width* (half-extent from the midline,
  mirrored).
- **Preview** (right): the model itself, orbitable, warped live to the drawings.
- **Panel**: regions, the active station's numbers, undo/redo, reset, export.

Both drawings scroll to zoom about the cursor and drag on empty space to pan; **Fit** reframes.
The dashed grey line is what ships; the solid line is the edit.

## Regions and stations

The body is measured at twenty **stations** along its length and grouped into five regions from
the nose back: Head, Fore body, Mid body, Hind body, Tail. Pick a region and its stations appear
as points on the curves in both drawings.

- Drag a point **across** the body (up/down on the side, out/in on the top) to change that value
  at that station.
- Drag it **along** the body to move the station — a proportion change. A station never passes
  its neighbours.
- The last point you touched is the **active** station: it shows two tangent handles. Pull one to
  bend the curve into or out of the station (the handles stay symmetric); double-click a handle to
  give the tangent back to the automatic Catmull-Rom slope. Until a handle is pulled the spline is
  the same kind the builders use, so an untouched curve is the builder's own.
- The panel repeats the active station's numbers as fields (along the body, dorsal, ventral,
  width) with the shipped value and the percentage change beside each, and the slope in use.

Undo and redo: ⌘/Ctrl+Z and ⇧⌘/Ctrl+Z (or Ctrl+Y); one drag is one step. **Reset region** and
**Reset all** put stations back to what was measured.

Nothing is saved. The edit lives in the page for the session — go back to **View** and every
animation plays on the edited body; switch to the reduced model and the same edit is applied to
it — but reloading returns to what the codebase ships. The URL keeps only which specimen (and
whether sculpt mode) is open, so a reload or a shared link lands on the same creature.

## How the model is warped

`src/viewer/sculpt/profile.ts` measures the silhouette envelope of the loaded geometry in the
model's root frame and warps vertices against it: height above the base midline scales to the
edited dorsal line, depth below it to the edited ventral line, lateral offset by the width ratio,
and the axial coordinate follows the shifted stations. Vertices move; bones, skin weights and
clips do not, so animations keep playing on the new shape (joints stay where they were, which is
the "some changes" you will see on a big proportion move). Fins and appendages are part of the
envelope, so they scale with the station they stand on. `npm run sculpt` guards the maths;
`tools/sculpt-browser.mjs` drives the mode in a browser against a served build.

## The export

**Export sculpt** downloads `<id>-sculpt.json`:

```json
{
  "format": "cambrian-sculpt", "version": 1,
  "creature": { "key": "devonian:creature:cheirolepis", "id": "cheirolepis", "collection": "devonian", "model": "assets/devonian/creatures/cheirolepis.glb" },
  "frame": { "axis": "z", "forward": 1, "up": "y", "note": "…" },
  "bounds": { "length": 4.8, "height": 1.2, "width": 0.9, "lateralMid": 0, "axisMin": -2.4, "axisMax": 2.4 },
  "regions": [{ "name": "Head", "from": 17, "to": 19 }, …],
  "changed": true,
  "stations": [{
    "index": 18, "headFraction": 0.05, "axis": 2.1, "shift": 0, "editedAxis": 2.1,
    "dorsal":  { "base": 0.283, "edit": 0.35, "percent": 23.7, "tangent": null },
    "ventral": { "base": -0.253, "edit": -0.253, "percent": 0, "tangent": null },
    "width":   { "base": 0.274, "edit": 0.274, "percent": 0, "tangent": null },
    "height":  { "base": 0.536, "edit": 0.603 }
  }, …]
}
```

Everything is in the model's own root frame, unscaled — the same frame the GLB is exported in.
`frame` says which axis the body runs along, which end the head is at (`forward: 1` means the
high end) and what is up. Each station carries the shipped and edited dorsal, ventral and width,
the change as a percentage, its axial position and shift, and an explicit tangent only where one
was pulled.

## Porting a sculpt into a builder

Give the file to the assistant with the creature named. The port is a change to the builder's
profile table — the rows of station, width, height above and below the axis that every builder
lofts from — never to the shipped GLB: a `percent` on `dorsal` is a scale on that station's upper
half-height, on `ventral` its lower, on `width` its half-width; a `shift` moves the station along
the body; a pulled `tangent` becomes the spline's tangent at that row. The builder's own
coordinate frame differs from the GLB's (Blender is z-up and its exporter maps y to −z), so the
port converts through `frame`, and the rebuilt creature goes through the usual pipeline
(`docs/creature-intake.md`, or the Devonian package/check/audit path) and back into the viewer to
compare against the sculpt that asked for it.
