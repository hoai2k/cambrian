# Review — Doryaspis V3 materials, 12 September 2026

Five studies on the approved clay, nine views each, under
`<authoring>/doryaspis/rework-v3/material0{1..5}/`. Source of truth is
`../materials_v3.py`, which the production builder imports unchanged.

## Design

Pigment is per-vertex and ships as `COLOR_0` on **both** levels; there is no
base-colour texture anywhere, so nothing is multiplied twice and the reduced
model is the same colour as the full one. The only maps are one tiled
microrelief pair — normal and roughness, 512 square, 14 repeats around the
body — authored in UV space so the granulation cannot organise into rows along
the mesh's own rings, domain-warped, isotropic, peak height-field slope 0.08.

Counter-shading is read off the **surface normal**, not off an absolute height.
Olive-brown roof, warmer flank, pale grey-buff belly; the plate sutures carry
their own dark pigment in the troughs the geometry already cuts, from the same
suture distance field, so pigment and relief cannot disagree; saw and cornual
plates stay in the body's colour family and pale toward their worn tips; quiet
two-scale mottling and sparse darker islands; dull mucosa in the oral chamber.

## What each study answered

**material01** — near-black and mirror-glossy. Two faults. The pigment anchors
had been written as if the clay's linear base colour were sRGB, so everything
was about five times too dark; and the generated normal and roughness maps were
black, because an image created only in memory does not survive a blend save
and never reaches the renderer or the exporter. Roughness 0 is a mirror.

**material02** — anchors brightened; still black. Proved the first fault was
not the whole story: the vertex colours read back correct (linear mean 0.365)
and the node graph was correct, so the maps were the problem.

**material03** — maps written to `v3-bake/` as PNGs and reloaded. Renders
correctly, but bone-white everywhere: the vertical ramp used absolute y, and
the saw, the cornual plates and the whole tail sit low in the animal's y range,
so every one of them was painted belly-pale.

**material04** — counter-shading moved onto the surface normal. Correct
structure: dark roof, dark sutures, pale belly, pale worn tips. Too light and
too yellow against the reference, and the tips read as bleached bone rather
than as part of the animal.

**material05** — accepted. Roof and posterior darkened toward olive, sutures
darkened and narrowed, mottling raised, the bony-tip mix pulled back from 0.62
to 0.46 so the saw and cornua stay in the family. This is what
`build_v3.py` ships.

## Honest limits

The colour is speculative: no pigment survives in these fossils. The relief is
restrained by intent and is close to invisible at whole-body distance, which is
the point of a 0.08 slope; it reads in the snout close-ups. The reference image
is private appearance direction of unknown attribution, not evidence.
