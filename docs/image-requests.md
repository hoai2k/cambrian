# Image and prop requests — Cambrian Explosion

**Nothing is outstanding.** Every requested brand asset, UI glyph, biome painting,
radar mark and 3D prop has been delivered and integrated. Completed briefs and
their delivered paths are in [image-requests-history.md](image-requests-history.md);
how the environment art is wired into the game is in
[environment-assets.md](environment-assets.md).

Sound and music requests live in [audio-requests.md](audio-requests.md) — one
music brief is still open there.

Keep this document limited to current image, glyph and prop requests. Move each
brief to the history file once its assets are delivered and integrated.

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
