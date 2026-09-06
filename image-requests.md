# Image, prop and music requests — Cambrian Explosion

Open requests for the endless sea (see [docs/redesign/04-infinite-ocean.md](docs/redesign/04-infinite-ocean.md)).
Completed briefs and delivered asset paths are in [image-requests-history.md](image-requests-history.md). Keep this document limited to current requests; move each request to history after its assets are delivered and integrated.

## Requirements for new requests

- Include destination path, dimensions, visual brief, and the UI or placeholder it replaces.
- Prefer text-free artwork for localisation.
- Palette: teal ink `#06161c`, foam `#eefaf6`, ember `#ffb36b`, coral `#ff5b6e`, lagoon `#61f2d5`.
- Use WebP for paintings, SVG for marks, and PNG where transparency and fine detail are needed. Keep each delivered file under 600 KB.
- **3D props** (new): glTF binary (`.glb`), +Y up, pivot at the base centre where the prop meets the seabed, 1 glTF unit = 1 world unit, authored at the "scale 1" size given in the brief (the game scales instances 0.4–2.5×). Vertex colours or a single ≤ 512² texture; no transparency; ≤ 1 000 triangles unless stated. Each prop is drawn as an instanced mesh thousands of times, so one mesh per file, no hierarchy, no animation (the game sways and bends plants in the shader). Drop them in `public/assets/props/`; they are wired up as new `FloraKind`s / boulder variants in `src/sim/world.ts` and `src/render/sea.ts`.

## The brief in one paragraph

Nine biomes now band out from a shoreline. The middle of the danger scale (Open Shelf, Sponge Forest, Boulder Field, Microbial Flats) keeps the existing reef look exactly as it is: **do not restyle it**. Two ends get a look of their own. The **relaxing** end (Sunlit Shallows, Nursery Reef; danger < 0.2) is *smaller and rounder*: bulbs, cushions, pebbles, soft fronds, pale sand, bright turquoise water. The **extreme** end (The Channels, The Escarpment, Deep Basin; danger > 0.7) is *larger and angular*: blades, spires, shards, spines, dark desaturated colour, cold blue-black water. Everything reads as Cambrian (sponges, algae, microbial mats, mud and rock), nothing modern (no kelp, no coral heads, no fish).

## 1. Relaxing props (Shallows and Nursery) — 3 GLBs

| File | Scale-1 size | Brief | Slots in as |
| --- | --- | --- | --- |
| `public/assets/props/cushion-sponge.glb` | 0.9 wide × 0.6 tall | A cluster of three to five rounded sponge bulbs fused at the base, like a pile of buns, smooth, with a few small oscula on top. Warm pale ochre to peach. ≤ 500 tris. | Replaces the sac sponge in the shallows density table; also scattered in nursery clearings' edges. |
| `public/assets/props/lettuce-tuft.glb` | 0.5 wide × 0.45 tall | A soft rosette of six to eight broad rounded fronds curling outward, slightly translucent green-gold. Fronds must bend from the base (the shader leans the top). ≤ 400 tris. | New `FloraKind` for the shallows meadow, replacing half the filament tufts there. |
| `public/assets/props/pebble-cluster.glb` | 0.6 wide × 0.15 tall | Seven to twelve smooth rounded pebbles half-sunk in sand, pale grey and pink. ≤ 300 tris. | Shallows and nursery floor scatter (replaces the angular rock fragments there). |

## 2. Extreme props (Channels, Escarpment, Basin) — 4 GLBs

| File | Scale-1 size | Brief | Slots in as |
| --- | --- | --- | --- |
| `public/assets/props/blade-spire.glb` | 1.2 wide × 4 tall | A tall, thin, faceted rock spire leaning a few degrees, sharp edges, like a shard of slate stood on end. Dark blue-grey with paler fracture faces. ≤ 600 tris. | Boulder variant for the escarpment foot and the channel walls; big instances (2–3×) as landmarks in the basin. |
| `public/assets/props/talus-shard.glb` | 1.5 wide × 0.8 tall | An angular broken block, flat faces, one sharp corner up. Same slate palette. ≤ 300 tris. | Replaces the rounded boulders in escarpment and basin chunks (the mid biomes keep the round ones). |
| `public/assets/props/spine-sponge.glb` | 0.8 wide × 2.6 tall | A tall, narrow, angular sponge: a stiff central stalk with rings of straight spines pointing up and out, like a bottle-brush of needles. Bone white on a dark base so it reads in near-dark water. ≤ 800 tris. | New `FloraKind` for the deep sponge gardens (basin) and the escarpment. |
| `public/assets/props/glass-fan.glb` | 1.6 wide × 1.4 tall | A deep-water fan: a flat, fine, angular lattice on a short stalk, edges serrated, pale ice-blue. Should bend a little in the shader (thin at the stalk). ≤ 900 tris. | Basin sponge gardens, facing the channel current. |

## 3. Music themes — 2 loops

The soundtrack (`src/audio/music.ts`) rotates tracks and cues a track when you enter a biome it is tagged for. The reef tracks exist (*Tide of First Bones*, *First Tide*). Two more, same instrumentation family so the crossfades feel like one score; each is tagged for its biomes so entering them cues it (tags are already in `music.ts`, so dropping the files in is the whole integration):

| File | Brief |
| --- | --- |
| `public/music/theme-calm.mp3` | The shallows and nurseries. 2–3 minutes, seamless loop, slow (60–70 bpm), major or lydian, warm pads, soft mallets, gentle water-like arpeggios, no percussion beyond a soft pulse. Should sit under sunlit caustics and let the player relax; it also plays over most of the early game. −16 LUFS integrated, under 6 MB. |
| `public/music/theme-danger.mp3` | Channels, escarpment, basin. 2–3 minutes, seamless loop, slow and low (50–60 bpm), minor or phrygian, sub bass, bowed metal, distant slow drums, long dissonant swells; tense but not a chase (the giant drone and heartbeat layer on top when one is actually hunting you). −16 LUFS, under 6 MB. |

Both are optional: the rotation plays the reef tracks while a file is missing.

## 4. Biome cards — 9 WebP paintings (optional, for the codex and the banner)

- **Files:** `public/assets/biomes/<id>.webp` for `shallows`, `nursery`, `shelf`, `forest`, `boulders`, `flats`, `channel`, `escarpment`, `basin`; 1024 × 576 each, under 250 KB.
- **Replaces:** nothing yet. Planned for a "biomes discovered" page on the results screen and as a faint backdrop behind the biome banner when you enter one.
- **Brief:** one painted underwater vista per biome from the descriptions in the design doc's table, at the creature's eye level, no creatures in shot, no text. Match the game's fog colour for each biome (`ATMOS` in `src/render/sea.ts`): shallows bright turquoise over pale sand; nursery warm teal with dense ochre sponges; shelf the standard reef; forest tall stalked sponges in green-dark water; boulders grey-green rocks and crevices; flats green-grey mats to the horizon; channel a dark cut with visible current streaks; escarpment a cliff dropping into blackness with shards at its foot; basin near-black blue with pale spine sponges catching the last light.

## 5. Radar and menu glyphs — 5 SVGs (optional)

- **Files:** `public/assets/ui/radar-player.svg`, `radar-threat.svg`, `radar-giant.svg`, `radar-home.svg`, `radar-shore.svg`; 24 × 24 viewBox, single colour (`currentColor`), no text.
- **Replaces:** the inline shapes drawn by `Radar` in `src/app/Hud.tsx` (dot, diamond, big diamond, house, coastline arc).
- **Brief:** minimal marks that read at 8 px on a dark disc: a dot with a thin ring for a player; a diamond for a threat; a diamond with a small jaw notch for a giant; a sponge-dome silhouette for home; a short wavy coastline for the shore.
