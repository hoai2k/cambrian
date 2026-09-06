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
| lettuce-tuft | 392 / 400 | 0.5 × 0.45 | Soft current sway and contact bend |
| pebble-cluster | 294 / 300 | 0.6 × 0.15 | Static |
| blade-spire | 30 / 600 | 1.2 × 4 | Static |
| talus-shard | 12 / 300 | 1.5 × 0.8 | Static |
| spine-sponge | 476 / 800 | 0.8 × 2.6 | Stiff contact bend |
| glass-fan | 900 / 900 | 1.6 × 1.4 | Gentle sway and contact bend |

The lettuce uses opaque green-gold shading for soft tissue; the glass fan's
openings are geometric lattice holes. Neither requires transparency sorting.
Detailed dimensions and byte counts are in `public/assets/props/manifest.json`.

## Current game integration

Main's current runtime is a bounded six-biome arena. The nine-biome endless
sea described in `docs/redesign/04-infinite-ocean.md` has not been implemented
here. This delivery does not introduce that separate world-system redesign.

- Nursery sac sponges become `cushion` flora; their contact bounds use the
  delivered 0.6 height and 0.45 radius.
- Nursery rock fragments become instanced pebble clusters.
- Existing channel-wall boulders become blade spires. Their base, collision
  radius and top height follow the delivered geometry.
- Shelf, forest, boulder field and microbial flats keep their established
  scenery and atmosphere. Legacy placement RNG consumption is retained.

`src/render/props.ts` loads GLBs and returns owned geometry. The sea renderer
uses vertex colours with its existing underwater surface detail and caustics.
Each cell remains instanced; bend attributes stay per cell. A lightweight
procedural shape remains visible if an asset fails to load. Disposing a sea
also prevents a delayed load from attaching new geometry.

## Handoff for the endless sea

| Asset | Intended placement when the biome exists |
| --- | --- |
| cushion-sponge | Replace sac sponges in shallows; nursery clearing edges |
| lettuce-tuft | `lettuce` FloraKind; replace half of shallows filament tufts |
| pebble-cluster | Shallows and nursery floor scatter |
| blade-spire | Channel walls, escarpment foot, 2–3× basin landmarks |
| talus-shard | Escarpment/basin boulder variant; keep middle-biome round rocks |
| spine-sponge | `spine` FloraKind; escarpment and basin sponge gardens |
| glass-fan | `glass` FloraKind; basin gardens, orient toward current |

All four new plant kinds already have geometry bindings and `FLORA_PHYS`
profiles. Their density entries are intentionally absent for biomes that
main does not yet have. Talus is supplied through `loadPropGeometry` and the
workbench; add it to the future boulder-variant generator when integrating
escarpment and basin. Keep its collision envelope aligned with its scale.

Use `BIOME_ART` and `biomeArtPath` from `src/shared/environment-assets.ts`
for discovery cards and banner backdrops. These functions return paths
relative to the app asset base. There is no discovery-results page or biome
banner on main yet.

Use `RADAR_GLYPHS` and `radarGlyphPath` for the future radar. The marks are
monochrome `currentColor` SVGs. Apply them as CSS masks with the contact colour,
as the workbench demonstrates; an external `<img>` does not inherit the
parent's `currentColor`. Hollow off-range contacts remain a radar rendering
state, separate from these filled silhouettes.

## Sources and validation

- `node tools/art/make-props.mjs` regenerates all GLBs and their manifest.
- `node tools/art/make-radar-glyphs.mjs` regenerates the five SVGs.
- `tools/art/biome-prompts.json` stores the exact built-in imagegen prompts
  and original PNG filenames. Preserve the original generation outputs.
- `python3 tools/art/export-biomes.py <source-directory>` encodes the nine
  final WebPs using Pillow; every image is under 250 KB.
- `node tools/art/check-environment-assets.mjs` checks triangle budgets,
  dimensions, pivot, normals, single-mesh structure, material opacity and
  absence of rigs/clips/textures.

The delivery was reviewed in desktop and mobile workbench layouts and in the
actual instanced sea renderer. Build, TypeScript and the flora physics suite
also pass. Full briefs are retained in `image-requests-history.md`.
