# Environment assets

Review all assets at `/workbench/?edit=environment`. The seven GLBs are in
`public/assets/props/`, the nine 1024 × 576 paintings in `public/assets/biomes/`,
and the five 24 × 24 SVG marks in `public/assets/ui/radar-*.svg`.

## Rigging and motion

**No prop needs rigging.** Every GLB contains one node, one mesh, one triangle
primitive and one opaque material with vertex colours. There are no bones,
skins, clips, textures or alpha blending. Units are world units, +Y is up,
and the origin is at the base centre. Geometry remains anchored at y = 0
while the existing sea shader displaces vertices higher up the plant.

| Prop | Triangles / budget | Width × height | Motion |
| --- | ---: | --- | --- |
| cushion-sponge | 480 / 500 | 0.9 × 0.6 | Small contact bend |
| lettuce-tuft | 336 / 400 | 0.5 × 0.45 | Soft current sway and contact bend |
| pebble-cluster | 294 / 300 | 0.6 × 0.15 | Static |
| blade-spire | 30 / 600 | 1.2 × 4 | Static |
| talus-shard | 12 / 300 | 1.5 × 0.8 | Static |
| spine-sponge | 476 / 800 | 0.8 × 2.6 | Stiff contact bend |
| glass-fan | 900 / 900 | 1.6 × 1.4 | Gentle sway and contact bend |

The lettuce uses opaque, two-sided green-gold frond surfaces for soft tissue; the glass fan's
openings are geometric lattice holes. Neither requires transparency sorting.
Detailed dimensions and byte counts are in `public/assets/props/manifest.json`.

## Game integration

All seven models are used in the streamed ocean. `generateChunk` first creates
its deterministic legacy placements, then replaces the requested slots by
biome. This consumes no extra placement randomness. The four standard reef
biomes retain their established scenery and atmosphere; channel flanks get
the requested spires.

| Asset | Placement |
| --- | --- |
| cushion-sponge | Sac replacement in shallows and nursery clearing edges |
| lettuce-tuft | Half of the shallows' filament tuft slots |
| pebble-cluster | Shallows and nursery floor scatter |
| blade-spire | Channel flanks, some escarpment rocks, 2–3× basin landmarks |
| talus-shard | Remaining escarpment/basin boulders |
| spine-sponge | Stalked and sac sponge slots in escarpment/basin |
| glass-fan | Low sponge/algal slots in basin, facing the local current |

The four new `FloraKind`s are `cushion`, `lettuce`, `spine`, and `glass`.
Their contact bounds and bend springs use the delivered geometry dimensions.
Rock variants use a base on the seabed, a containing footprint radius and
the authored height. Full and distant chunk views both show the new rocks.

`src/render/props.ts` loads GLBs and returns owned geometry. The sea renderer
loads each needed model once per sea, sharing its geometry across streamed
cells. Vertex colours retain the existing underwater detail and caustics.
Bend attributes stay per cell; unloading a cell disposes its cloned geometry.
A lightweight procedural shape remains visible if a file fails to load, and
late loads cannot attach to an unloaded cell or a disposed sea.

`BIOME_ART` and `biomeArtPath` from `src/shared/environment-assets.ts` provide
all nine text-free paintings behind the existing biome-entry announcements.
The image remains faint and the announcement retains a strong text shadow.
The optional discovery-results page can reuse these assets when implemented.

`RADAR_GLYPHS` and `radarGlyphPath` provide all five radar marks. Each SVG
exposes `#glyph` for an external SVG `<use>` and inherits the contact colour.
The HUD retains hunting blink and uses an alpha outline filter for hollow
out-of-range contacts. Each split-screen radar has its own filter ID.
The environment workbench also demonstrates CSS-mask use at 24 and 8 pixels.

## Sources and validation

- `node tools/art/make-props.mjs` regenerates all GLBs and their manifest.
- `node tools/art/make-radar-glyphs.mjs` regenerates the five SVGs.
- `tools/art/biome-prompts.json` stores the exact built-in imagegen prompts
  and original PNG filenames. Preserve the original generation outputs.
- `python3 tools/art/export-biomes.py <source-directory>` encodes the nine
  final WebPs using Pillow; every image is under 250 KB.
- `tools/environment-test.ts` checks biome placement, collision bounds and deterministic regeneration.
- `node tools/art/check-environment-assets.mjs` checks triangle budgets,
  dimensions, pivot, normals, single-mesh structure, material opacity and
  absence of rigs/clips/textures.

The delivery was reviewed in desktop and mobile workbench layouts and in the
actual instanced sea renderer. Build, TypeScript and the flora physics suite
and the streamed-world suite pass. Full briefs are retained in [image-requests-history.md](image-requests-history.md).
