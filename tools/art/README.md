# Art delivery tools

Painted assets were generated with the built-in image generator using the exact briefs in `generation-prompts.json`. Source filenames identify the generation outputs; supply their directory to `python3 tools/art/export-images.py <source-directory>` (Pillow required). Final WebPs are committed; original generation PNGs are not required at runtime.

Creature portraits: run `node tools/art/decode-models.mjs`, then `Blender -b --python tools/art/render-creatures.py`. This decodes temporary GLBs in `/tmp/cambrian-art-models` and renders separate `.select.png` files without modifying models or earlier portraits. Export-images also compresses these transparent portraits.

Native vectors: `python3 tools/art/make-vectors.py` requires fonttools and Arial Black. Lettering is outlined, so the runtime does not require that font. `node tools/art/export-vectors.mjs` exports the PNG logo and icons using Chrome (adjust the executable path for other platforms).

Review: `node tools/art/review-assets.mjs` makes a contact sheet in `/tmp`. `check-ui.mjs` checks a local Vite server on port 5174 with desktop and portrait viewports. Both use playwright-core and Chrome.

## Validation on 2026-09-06

Build, TypeScript and creature intake checks pass. All delivered raster dimensions and alpha channels were checked, all new files are below 600 KB, and desktop/mobile title plus selection artwork were visually reviewed. The UI smoke check reports an existing `Engine.frame` undefined `x` error when switching modes, also reproduced on the unchanged starting commit `2ca01a7`; it is not an image-loading error. The smoke script intentionally retains a nonzero exit for runtime errors.
