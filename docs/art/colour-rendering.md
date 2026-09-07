# Creature palette images

The approved 2026-09-06 mappings are archived in `colour-schemes-2026-09-06.json`.
`CREATURE_SCHEMES` in `src/shared/palettes.ts` selects each creature's game scheme; its current six slot colours come from `SCHEMES` in that same file. Game models (including LODs) and fresh viewer sessions use
these picks. Existing viewer session overrides still take precedence.

Both of those read `ACTIVE_ERA` **at module load**, so they are the active era's pack — the
Cambrian's on `/`, the Devonian's on `/devonian/`, which selects its era before importing the app.
The specimen viewer is the exception: it shows both eras' creatures on one page, so it resolves a
specimen's list and default from its own pack (`paletteFor` in `src/viewer/catalogue.ts`) and
registers the other pack's schemes with `registerSchemes` so a pick from either resolves in
`src/render/recolor.ts`. `tools/viewer-smoke.mjs` checks a Devonian specimen is offered the
Devonian palette.

## Image matching and fallbacks

- `public/assets/creatures/defaults/` contains byte-identical copies of the original select,
  card, and thumbnail images for all 21 creatures. `defaults/manifest.json` records their hashes.
  Original root image paths remain intact for older consumers and the authored-model intake tools.
- `public/assets/creatures/schemes/` contains 1600×1200 portraits, 1200×900 cards, and 256×192
  thumbnails for the 12 non-default picks. Each new file is below 600 KB and has real transparency.
- `schemes/manifest.json` snapshots the scheme ID, exact slot values, recolouring version,
  source model hash, image hashes, and paths. It is delivery metadata, **not** the current palette.
- The resolver compares the current scheme ID **and all six colours** to the snapshot. A missing
  render, changed scheme, changed colour under the same ID, or unknown ID uses the preserved
  default image. JSON property order and hex letter case do not cause false mismatches.
- React portraits and the streaming image preloader also recover from an unavailable variant by
  requesting the default once. Viewer thumbnails follow the viewer's current per-creature choice.
- Scheme filenames include a palette revision hash so a later palette revision gets a fresh URL.
  Keep defaults intact when making more schemes. Bump `PORTRAIT_RECOLOR_VERSION` when changing
  `slotFor()` or the shader's recolouring formula, then regenerate affected variants.

This is an **image** fallback: the live model can still show the new palette when no matching
portrait exists. It deliberately avoids showing a stale render as though it were current.

## Regeneration

No shipped GLBs, LODs, original renders, or authored-image fingerprints are changed. Temporary
GLBs bake the viewer formula in linear space: slot tint × min(vertex luminance / mean luminance, 4),
including material RGB factors and preserving vertex/material alpha. Normal maps and geometry
remain unchanged. Blender renders the same camera and TurnLeft frame 17 with a neutral key and
subtle teal fill/coral rim so illumination does not hide the new palettes.

1. Update the picks in `CREATURE_SCHEMES` and, if needed, scheme colours in `src/shared/palettes.ts`.
2. Run `node tools/art/prepare-palette-renders.mjs`. It validates the supplied JSON against the
   current palette values. For a later approved mapping set `CAMBRIAN_SCHEME_MAPPING` to that JSON.
3. Render the changed IDs (the temporary manifest lists them):

   ```sh
   CAMBRIAN_ART_MODELS=/tmp/cambrian-palette-models \
   CAMBRIAN_ART_OUTPUT=/tmp/cambrian-palette-renders \
   CAMBRIAN_ART_PALETTE_LIGHTING=1 \
   Blender -b --python tools/art/render-creatures.py -- <ids...>
   ```

4. Run `python3 tools/art/export-palette-renders.py` (Pillow). This writes the variants and their
   immutable metadata together. Do not manually update the snapshot to make a mismatch disappear.
5. Run `npm run portraits`, `npm run palettes`, `npm run typecheck`, `npm run build`, and
   `node tools/check-creature-assets.mjs --strict`. Palette mismatches remain valid intentional
   fallbacks; portrait tests check both matching and mismatching paths.
6. Review with `node tools/art/review-palette-renders.mjs`. With Vite on port 5176,
   `node tools/art/check-palette-ui.mjs` verifies real image errors and viewer scheme switches.

The authored GLB intake workflow (`cards` / `lods`) remains for changes to models themselves;
these runtime palette variants have their own delivery manifest and do not replace authored art.
