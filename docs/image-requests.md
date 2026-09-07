# Image and prop requests — Cambrian Explosion

**Cambrian artwork is complete.** Every requested Cambrian brand asset, UI glyph, biome painting,
radar mark and 3D prop has been delivered and integrated. Completed briefs and
their delivered paths are in [image-requests-history.md](image-requests-history.md);
how the environment art is wired into the game is in
[environment-assets.md](environment-assets.md).

Sound and music requests live in [audio-requests.md](audio-requests.md) — one
music brief is still open there.

Keep this document limited to current image, glyph and prop requests. Move each
brief to the history file once its assets are delivered and integrated.

## Devonian model production

The current request covers 21 individually authored mobile creatures with action animations and the plants, attached organisms and props in the [Devonian brief](redesign/07-devonian-design.md). Deliver to `public/assets/devonian/` under the [separate specimen-library contract](devonian/production-contract.md). The environmental paintings and reference-board inventory in the brief remain future art planning; this model-production request does not activate Devonian gameplay.

## Devonian mode panels — 2 WebP

The pick screen draws a painted panel behind each mode it offers (`mode-art` in
`src/app/Select.tsx`). The Cambrian's four exist; the Devonian shares that folder
and has two modes of its own with nothing behind them, so those two chips draw
empty and the loader logs a miss for each.

| File | Mode | Brief |
| --- | --- | --- |
| `public/assets/ui/mode-domination.webp` | Domination (1–4 co-op) | 640 × 360, in the style of the existing four. Holding a range: a Dunkleosteus square-on in the middle of its own water, smaller fish keeping to the edges of the frame. Dark green-blue water, bone-white armour, silt. |
| `public/assets/ui/mode-foodchain.webp` | Food Chain (2–4 versus) | 640 × 360, same style. A vertical stack that reads as a chain — something small low in the frame, something eating it above, something larger again above that — each in silhouette against a lighter shaft of water. |

The delivered panels are `public/assets/ui/mode-{rise,frenzy,hunted,reef}.webp`;
their original brief is in the history file under *Mode cards*.

## Checking what is outstanding

`run tools/assets-test.ts` walks both eras' own tables — roster, sound library,
modes, brand art — resolves every path the way the runtime does and checks it
against `public/`. Anything it reports as **undelivered** should have a brief
open on this page; `--strict` turns those into failures for the day the list is
meant to be empty. It also fails outright if either era's paths reach into the
other's tree.

## Requirements for new requests

- Include destination path, dimensions, visual brief, and the UI or placeholder it replaces.
- Prefer text-free artwork for localisation.
- Palette: teal ink `#06161c`, foam `#eefaf6`, ember `#ffb36b`, coral `#ff5b6e`, lagoon `#61f2d5`.
- Use WebP for paintings, SVG for marks, and PNG where transparency and fine detail are needed.
  Keep each delivered file under 600 KB.
- **3D props:** glTF binary (`.glb`), +Y up, pivot at the base centre where the prop meets the
  seabed, 1 glTF unit = 1 world unit, authored at the "scale 1" size given in the brief (the game
  scales instances 0.4–2.5×). Vertex colours or a single ≤ 512² texture; no transparency;
  ≤ 1 000 triangles unless stated. Each prop is drawn as an instanced mesh thousands of times, so
  one mesh per file, no hierarchy, no animation (the game sways and bends plants in the shader).
  Drop them in `public/assets/props/`; they are wired up as new `FloraKind`s / boulder variants in
  `src/sim/world.ts` and `src/render/sea.ts`.
- Validate props with `node tools/art/check-environment-assets.mjs`, and creature art with
  `node tools/check-creature-assets.mjs --strict`.


## Devonian initial asset delivery — 7 September 2026

Nine original imagegen biome paintings now replace the procedural banners at `public/assets/devonian/biomes/`. The exact separate prompts are in `tools/devonian/environment-image-prompts.json`; original PNGs are preserved in `local/devonian-authoring/environment-images/`, with shipped hashes and preview status in the biome manifest. They depict the game biome categories, not the nine separate regional E01–E09 reference environments. Those regional boards, material studies, lighting, particle/decal atlases and scale plates are still being authored. Current priority is carefully made initial versions of the complete library, then further art refinement. `devonian:plates` preserves painted assets unless explicit fallback replacement is requested.
