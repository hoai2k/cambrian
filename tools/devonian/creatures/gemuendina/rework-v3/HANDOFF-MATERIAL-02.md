# Gemuendina material-02 — deeper organic olive, reduced crackle

Astra high inspected material-01's actual oblique and cranial images. Reject
that finish for final use: it is too pale/chalky and the fine mosaic edge network
reads as cracked stone. UV coverage, quiet fin differentiation and regional
control are useful. Its geometry hashes match accepted clay-02. Preserve all
material-01 artifacts and sources.

Reviewed material-01 blend SHA:
`af0b5ab285fb1d7770c9689aa7671c210adee79209f76b7e3694ac5216310210`.
The eye remains visually bead-like in close view. Its geometry is unchanged in
this material-only phase; final eye containment/housing review is reserved for
the completed rework audit. Do not mark the rework final before resolving it.

Material-02 retains accepted geometry and the same bake/UV workflow. It deepens
the palette toward green olive and ochre, increases nonperiodic broad pigment
contrast, adds a separate subtle pale-mottle scale, gives cell tops more variable
pigment, weakens dark tessera edges, and favours granular relief over grooves.
Roughness remains restrained and slightly wet. No external or generated art
pixels, major turtle-like plates, isolated eye pads or colour bands are added.

Frozen input:
`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/gemuendina/rework-v3/clay-02/gemuendina-clay-02.blend`
SHA `c4e65d1b0a37c9c034aaa6800bba8ad0b396d0547a4bf08faa276c62848c805f`.

Frozen new script:
`/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/gemuendina/rework-v3/materials_02.py`
SHA `8c3fd547afc63579b06572810e78eeec38688e80cd0a7e303d485ce3f67b4731`.

After verifying both hashes, Terra executes from repository CWD:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/gemuendina/rework-v3/materials_02.py
```

All outputs go to the new local directory
`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/gemuendina/rework-v3/material-02/`:
editable procedural and baked material blends, body 2048² and eye 512²
albedo/normal/roughness maps, comparable `material-oblique.png` and
`material-cranial.png`, and a source/geometry/output hash report.

Expected final marker: `GEMUENDINA_MATERIAL_GROUP_OK`. Geometry hashes must remain
unchanged. Budget 20 minutes; report progress before extending. Stop on error,
input mismatch, geometry mismatch or output collision; preserve all evidence
and return to Astra. Do not edit frozen inputs/settings or write public assets.

Return the two actual images for Astra judgement. Rig/action source development
is independent, but its eventual export must bind the actual reviewed material
blend. No full/LOD/art approval follows merely from this bake succeeding.
