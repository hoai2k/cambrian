# Devonian scale-reference plates

Two actual-model orthographic plates cover all21 delivered creature subjects: `fishes.png` and `invertebrates-tetrapods.png`. Both main comparisons have the same native600pixels/metre and4200pixel width. The second plate includes a clearly separated5× detail inset with its own centimetre ruler. No main animal is inflated to thumbnail size.

These are representative reconstructed asset sizes, not species maxima or a community reconstruction. Subjects span different localities and ages. Soft anatomy and some dimensions remain uncertain. The metadata includes working choices: Michelinoceras's0.5m complete-model extent is not measured from its incomplete28mm shell reference; Manticoceras's0.16m overall reconstruction uses an approximately0.11m representative shell. Long appendages and radial arm spreads preserve each model's documented extent convention.

`scale-plates.json` records the public model and size-metadata hashes, decoded/render hashes, sources, camera bases, exact orthographic metres per pixel, uniform placement factors and final image hashes. This is a preview asset set and must be refreshed when models change, especially pending Titanichthys, Coccosteus, Doryaspis and Gemuendina refinements.

The renderer clears imported animation to bind pose, measures evaluated vertices from named source model nodes, and excludes Blender's bone-display Icosphere. Explicit camera bases put the anatomical longitudinal axis horizontally in both lateral and dorsal projections. Neutral clay simplifies shape comparison; only explicitly eye-named material families retain dark pigment. Clay is not reconstructed living colour.

Regenerate from repository root:

```sh
node tools/devonian/materials/decode-scale-models.mjs
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/materials/render-scale-models.py
python3 tools/devonian/materials/compose-scale-plates.py
```

Blender renders use CPU Cycles but require normal host Metal initialization permission. Decoded models and intermediate renders remain in `cambrian/local/devonian-authoring/scale-reference/`. The renderer cache checks public model, decoded data, metadata, renderer and image hashes. Composition rejects missing subjects, stale assets, clipped input renders, unexplained LOD-length differences and nonuniform scaling. Source images have enough native resolution for the600px/m main plate; downsampling and alpha cropping do not alter scale.
