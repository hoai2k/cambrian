# Image request history — Cambrian Conquest

Completed image, glyph and prop briefs are archived here, newest first. Open requests
belong in [image-requests.md](image-requests.md); audio requests are in
[audio-requests.md](audio-requests.md).

## Ancient Seas Trilogy title-page artwork — 2026-09-13

**Completed.** The complete page-art set is delivered under `public/assets/ancientseas/`: twelve animal cutouts, five plant cutouts, five title/wordmark assets, the parchment and seabed grounds, the fleuron, and four favicon sizes. The `/ancientseas/` entry point now uses the trilogy favicon set, and `src/ancientseas/delivered.json` is generated from the files actually present.

Editable and generation sources, exact prompts, packaging scripts, and QA records are retained in `tools/art/ancientseas/animals/`, `tools/art/ancientseas/plants/`, and `tools/art/ancientseas/titles/`. The animal and title READMEs document the transparency recovery used where image generation returned opaque or checkerboard backgrounds. The delivered WebPs remain under the brief's 600 KB ceiling.

### Archived brief


The three games now share a title page at `/ancientseas/`, in two versions the page switches
between with `?version=1` (default) and `?version=2`, so they can be compared side by side
(`src/ancientseas/`, checked by `npm run ancientseas`). Everything below is delivered to
**`public/assets/ancientseas/`**; after dropping files in, run `npm run ancientseas:delivered`
and the page swaps each stand-in for the delivered piece in place. Until then version 1 typesets
the trilogy title and version 2 draws a named wash where each picture will go (the three game
titles borrow their shipped engraved wordmarks and two animals borrow the shipped emblems).

The reference for all of it is the three title paintings themselves — `assets/brand/logo-illustrated.webp`,
`assets/devonian/brand/title.webp`, `assets/triassic/brand/title.webp` — hand-coloured
natural-history engravings on aged parchment: fine cross-hatched line, muted earth pigments
(rust, ochre, slate blue, moss and sage green, a dusty red for the corals), a soft offset shadow
under every subject, and the lettering a heavy Roman serif in black ink with a fine pale rim.
Every piece here should look cut from one of those plates. **Text-free** except the four
wordmarks. Transparent WebP unless the row says otherwise, under 600 KB each.

### Version 1 — the trilogy wordmark on the dark ground

| File | Size | Brief | Replaces |
| --- | --- | --- | --- |
| `logo-engraved.webp` | 1536×512, transparent | "ANCIENT SEAS" over a smaller "TRILOGY", in the exact lettering of the three engraved game wordmarks (`assets/*/brand/logo-engraved.webp`): black stippled ink with the thin gold rim, so it sits on the near-black page above the three paintings. Centred, no ornament. | The typeset serif title at the top of `/ancientseas/` |

### Version 2 — the page as a fourth plate

The page is one composition in the paintings' style: the trilogy title across the top, the three
game titles in a row beneath it with each game's animals round its own title (Cambrian left,
Devonian middle, Triassic right), the plants the three paintings share filling between, a rocky
seabed along the bottom, and the whole plate vignetting to black at the edges. On a phone the
same pieces stack into a tall plate. The arrangement is `SLOTS` in `src/ancientseas/page.ts`; a
piece is placed by its centre and width, so what matters in each picture is that the subject fills
its canvas and faces the way the row says.

**Titles** — ink lettering only, as it appears *inside* the paintings (black with the pale rim and
the paper's soft shadow), with no gold rim: on parchment the gold reads as gilt, on the paintings
it does not exist.

| File | Size | Brief |
| --- | --- | --- |
| `title-trilogy.webp` | 2048×640, transparent | "ANCIENT SEAS" over "TRILOGY", the same lettering, wide enough to run across the top of the plate |
| `title-cambrian.webp` | 1536×640, transparent | "CAMBRIAN CONQUEST" on two lines exactly as lettered in its painting |
| `title-devonian.webp` | 1536×640, transparent | "DEVONIAN DOMINATION" on two lines exactly as lettered in its painting |
| `title-triassic.webp` | 1536×640, transparent | "TRIASSIC TRIUMPH" on two lines exactly as lettered in its painting |

**Ground** — the two pieces that are not transparent.

| File | Size | Brief |
| --- | --- | --- |
| `ground-parchment.webp` | 2048×1280, opaque | Empty aged parchment as the three paintings' backgrounds: warm cream at the centre, mottled, foxed, darkening through umber to black at all four edges with the same heavy vignette. Nothing drawn on it. The page's CSS gradient stands in for it |
| `ground-seabed.webp` | 2048×384, transparent above | The strip of seabed the paintings put along their bottom edge: rock, rubble, small sponges, a scallop or two, sea urchins, encrusting coral, fading to nothing along the top edge so it can lie under the animals. Reads as one continuous shelf across the whole width |

**Ornament**

| File | Size | Brief |
| --- | --- | --- |
| `ornament-fleuron.webp` | 512×384, transparent | The small engraved scallop shell with fronds either side that the Devonian and Triassic paintings put between the title and the animals above it |

**Animals** — each on its own, complete, filling its canvas, with the soft offset shadow, drawn
in the same hand as the animal in its game's painting (they are the same animals). Default
canvas 1024×768; *facing* is where the head points, so the right-hand animal of each row is
seen from its other side.

| File | Era | Brief |
| --- | --- | --- |
| `animal-anomalocaris.webp` | Cambrian | *Anomalocaris* arching from upper left to lower right, frontal appendages curled, as in the Cambrian painting; it hangs over the Cambrian title |
| `animal-opabinia.webp` | Cambrian | *Opabinia*, five eyes and the proboscis, facing left; small, right of the title |
| `animal-trilobite.webp` | Cambrian | *Olenoides* trilobite on the seabed, three-quarter view from above, facing right |
| `animal-hallucigenia.webp` | Cambrian | *Hallucigenia* walking on its stilts, spines up, facing left |
| `animal-dunkleosteus.webp` | Devonian | *Dunkleosteus* diving from upper left, jaws open, as in the Devonian painting; it hangs over the Devonian title. The shipped Devonian emblem (its head) stands in |
| `animal-cladoselache.webp` | Devonian | *Cladoselache* shark swimming left, small, right of the title |
| `animal-ammonoid.webp` | Devonian | Coiled ammonoid with tentacles trailing right, on the seabed |
| `animal-bothriolepis.webp` | Devonian | *Bothriolepis* resting on the seabed, seen from the front-left, facing left |
| `animal-cymbospondylus.webp` | Triassic | *Cymbospondylus* ichthyosaur swimming from upper left to the right, long jaws parted, as in the Triassic painting; it hangs over the Triassic title |
| `animal-mixosaurus.webp` | Triassic | *Mixosaurus*, small, swimming left, right of the title |
| `animal-nautiloid.webp` | Triassic | Coiled nautiloid with tentacles trailing right, on the seabed |
| `animal-placodont.webp` | Triassic | *Placodus* on the seabed, facing left. The shipped Triassic emblem (the plesiosaur) stands in |

**Plants** — the growth the three paintings share. Default canvas 768×1024 (upright); a second
or third of a kind is the same file mirrored, so one drawing per kind. Each should be complete
in itself, on transparency, with no ground under it.

| File | Size | Brief |
| --- | --- | --- |
| `plant-crinoid.webp` | 768×1024 | One crinoid on a tall stalk, feathery crown open, in the Devonian painting's ochre and sage; used mirrored as `plant-crinoid-b` |
| `plant-sea-fern.webp` | 1024×768 | A spray of fine sage-green sea fern, wide and low, the frond that runs behind every title's letters; used three times, mirrored for `plant-sea-fern-b` and `-c` |
| `plant-red-coral.webp` | 768×1024 | The dusty-red branching coral from the paintings' corners; used mirrored as `plant-red-coral-b` |
| `plant-tube-sponge.webp` | 768×1024 | A cluster of three or four ochre tube sponges; used mirrored as `plant-tube-sponge-b` |
| `plant-brain-coral.webp` | 1024×768 | The round grooved brain coral the paintings put front and centre on the seabed |

A trilogy favicon (`favicon-16.png`, `favicon-32.png`, `favicon-192.png`, `apple-touch-icon.png`
at 180×180) would let the page stop borrowing the Cambrian's anomalocaris: a scallop shell in the
engraved style on the rounded-square `#070402`.



## Illustrated logo and favicon — 2026-09-06

**Completed.** Replaced the title/loading wordmark with the user-supplied natural-history illustration, preserved as `docs/art/sources/cambrian-explosion-original.png`. The full composition is delivered as `public/assets/brand/logo-illustrated.webp` (1536×1024); only web compression was applied. Title/loading layouts give the illustration space and remove the competing standalone neon emblem and reef backdrop.

For small UI sizes, created `public/assets/brand/logo-engraved.webp` (1024×384, transparent) and `public/assets/brand/emblem-engraved.webp` (512×512) using the built-in image generator and the supplied illustration as reference. Exact prompts are in [docs/art/engraved-brand-prompts.json](art/engraved-brand-prompts.json). The compact wordmark is used in the selection header; the emblem was shared by the UI until the
Anomalocaris delivery below took that role (2026-09-09), and `emblem-engraved.webp` is now
unreferenced — the wordmark beside it is still the engraved one.

Matching PNG favicons are `public/favicon-engraved-16.png`, `favicon-engraved-32.png`, `favicon-engraved-192.png`, `favicon-engraved-512.png`, and `public/apple-touch-icon-engraved.png` (180×180). Both HTML entry points use the new icons. Prior brand assets remain available at their original paths. Every new runtime asset is below 600 KB; the unmodified source PNG is archived separately.

Validated title layout at 1440×1000 and 390×844, compact header readability, favicon rendering at 16/32/192 px, image loading, build, and TypeScript. No browser errors or mobile horizontal overflow.


## Delivery — 2026-09-06

All eight request groups, including the optional assets, were fulfilled. Painted scenes were generated with the built-in image generator; exact prompts are in [tools/art/generation-prompts.json](../tools/art/generation-prompts.json). Creature portraits were rendered from repository models in Blender; marks and glyphs are native SVG. Every delivered image is under 600 KB.

### 1. Logo (primary)

**Completed 2026-09-06.** Delivered `public/assets/brand/logo.svg` (outlined vector lettering) and `logo.png` (2400×900, transparent). Integrated into title, loading, and selection headers.

- **File:** `public/assets/brand/logo.svg` (also `logo.png` at 2400×900 for social/store use)
- **Replaces:** the CSS text logo on the title screen (`.title-logo` in `src/app/styles.css`) and the small wordmark on the creature-select header.
- **Brief:** "CAMBRIAN EXPLOSION" as a two-line wordmark. Energetic, not academic: heavy geometric display letterforms, slight forward lean, a "burst" motif breaking out of the second word. Palette: foam white `#eefaf6` for CAMBRIAN, a hot gradient from ember `#ffb36b` through coral `#ff5b6e` to pink `#ff9ac2` for EXPLOSION, on deep teal `#06161c`. Should read at 200 px wide and at 2000 px. Leave a transparent background. Optional: a one-line horizontal lockup for the in-game header.

### 2. Emblem / favicon

**Completed 2026-09-06.** Delivered the shared `public/favicon.svg` emblem, 192px and 512px PNGs, and 180px Apple touch icon; registered the icons in `index.html` and reused the emblem component.

- **Files:** `public/favicon.svg` (replace), `public/favicon-192.png`, `public/favicon-512.png`, `public/apple-touch-icon.png` (180×180)
- **Replaces:** the procedural sixteen-point burst with an eye in `public/favicon.svg` and the `Emblem` component in `src/app/icons.tsx`.
- **Brief:** a single mark that works at 16 px: a radial burst (the "explosion") with a compound eye or an Anomalocaris eye-stalk silhouette at the centre. Same palette as the logo. Rounded-square background `#07202a` for the PNGs, transparent for the SVG.

### 3. Title screen key art

**Completed 2026-09-06.** Delivered desktop 2560×1440 and mobile 1080×1920 WebP key art. Title and loading screens select the portrait source on portrait displays.

- **File:** `public/assets/brand/keyart.webp` (2560×1440) and `keyart-mobile.webp` (1080×1920)
- **Replaces:** the loading screen's backdrop (currently the live 3D reef behind a dark gradient). The loading screen already tries to load `assets/brand/keyart.webp` and silently falls back if it is missing, so dropping the file in is the whole integration.
- **Brief:** a low-angle underwater shot: a small Waptia in the foreground bolting through a sponge thicket, a huge Anomalocaris silhouette above against the light window. Warm caustics, deep teal water, coral rim-light on the predator. Painterly but sharp. Leave the upper-centre third quiet for the logo.

### 4. Creature select renders (upgrade)

**Completed 2026-09-06.** Delivered all eight 1600×1200 transparent Blender renders at `public/assets/creatures/<id>.select.png` and updated selection heroes and grid thumbnails to use them. Portraits were refreshed after merging the latest model updates from main. The original `.png`, `.card.png`, and GLB files are preserved per repository policy. All models use the same camera direction, TurnLeft animation frame 17, coral rim light, and teal fill; PNG palettes preserve alpha. The previous `.card.png` files were already background-removed, but were not the requested render upgrade.

- **Files:** `public/assets/creatures/<id>.png` for all eight creatures (existing 1000×750 renders are usable placeholders)
- **Replaces:** the current flat studio renders on dark grey.
- **Brief:** re-render each model at 1600×1200 on a **transparent** background, three-quarter front view, dynamic pose (mid-turn, appendages open), rim-lit with coral from behind and cool teal fill. The select screen shows them with `mix-blend-mode: screen`, which is a workaround for the grey backdrop; transparent PNGs let us drop that. Same camera angle for all eight so the roster flips cleanly.

### 5. Size-tier glyphs

**Completed 2026-09-06.** Delivered five 64×64 SVGs and integrated them as current-colour masks in the growth ring with accessible tier labels.

- **Files:** `public/assets/ui/tier-1.svg` … `tier-5.svg` (64×64, single colour, currentColor)
- **Replaces:** the Roman numerals I–V inside the growth ring on the HUD (`.tier-num` in `src/app/Hud.tsx`).
- **Brief:** five silhouettes of the same simple creature growing: egg/larva → juvenile → adult → giant (bigger, spikier) → apex (crowned by the burst motif). Must read at 28 px.

### 6. Band icons (optional)

**Completed 2026-09-06.** Delivered all five optional 24×24 band SVGs and integrated them as tinted HUD masks.

- **Files:** `public/assets/ui/band-snack.svg`, `band-prey.svg`, `band-rival.svg`, `band-threat.svg`, `band-giant.svg`
- **Replaces:** the plain rotated-square markers over creatures on the HUD (`.marker` in `src/app/styles.css`).
- **Brief:** five tiny (24×24) glyphs: a morsel, a fleeing fish, crossed appendages, a warning fang, a skull-ish eye. Single colour; the game tints them green / teal / amber / orange / red.

### 7. Mode cards

**Completed 2026-09-06.** Delivered all four 640×360 WebP mode panels and integrated them behind the existing mode labels and player counts.

- **Files:** `public/assets/ui/mode-rise.webp`, `mode-frenzy.webp`, `mode-hunted.webp`, `mode-reef.webp` (640×360)
- **Replaces:** the text-only mode chips on the creature-select header.
- **Brief:** four small illustrated panels in the key-art style: Rise (a larva under a giant's shadow), Feeding Frenzy (four creatures converging on one kill), Hunter & Hunted (one huge silhouette, three small ones hiding), Reef (a calm wide shot of the sponge forest).

### 8. Loading spinner / progress motif (optional)

**Completed 2026-09-06.** Delivered the optional animated emblem spinner and used it on the loading screen. Progress text remains accessible; the SVG respects reduced-motion preferences.

- **File:** `public/assets/ui/loading.svg` (animated SVG ok)
- **Replaces:** the "WAKING THE REEF…" text on the title screen while the eight GLBs load.
- **Brief:** the emblem's burst rotating slowly, or a trilobite enrolling and unrolling.



## 2026-09-06 — Endless-sea environment asset delivery

Delivered all seven static prop GLBs, nine biome paintings, and five radar SVGs from the brief below. Music remains open in [audio-requests.md](audio-requests.md). Review every asset at `/workbench/?edit=environment`.

**Rigging: none for all seven props.** One mesh, one primitive, one opaque vertex-colour material, +Y up, base-centred pivot, authored dimensions, no textures, skeletons or animation clips. Plant motion comes from the sea shader and contact spring. The lettuce's soft-tissue look uses opaque green-gold shading, resolving the brief's translucency wording in favour of its explicit no-transparency runtime contract.

**Integration status:** All seven models are integrated into the streamed nine-biome ocean and the environment workbench. Shallows and nursery sacs use cushions; half the shallow tufts become lettuce; shallow/nursery fragments use pebble clusters. Channel-wall and escarpment rocks include blade spires, with 2–3× basin landmarks; escarpment/basin boulders use talus. Escarpment and basin sponges use spine forms, with glass fans facing the basin current. Middle-biome scenery and atmosphere retain their established appearance. Plant and rock collision bounds follow the delivered models. All nine paintings are wired into biome entry banners; all five SVGs replace the radar's inline marks, preserving hollow distant contacts and hunting blink. Typed paths live in `src/shared/environment-assets.ts`. The optional discovery-results page remains a future UI feature; its artwork is already delivered and can be reused there.

**Delivery and editable sources:**

- `public/assets/props/manifest.json`: per-model dimensions, triangle counts, bytes, intended biomes, rigging and movement.
- `tools/art/make-props.mjs`: deterministic mesh sources; `node tools/art/make-props.mjs` regenerates all seven GLBs.
- `tools/art/biome-prompts.json`: exact prompts and source filenames; generated with built-in imagegen. `tools/art/export-biomes.py` encodes delivery WebPs.
- `tools/art/make-radar-glyphs.mjs`: editable native SVG sources.
- `tools/art/check-environment-assets.mjs`: validates delivered model and glyph contracts.
- `docs/environment-assets.md`: runtime consumers and asset contract.

### Original brief and constraints

#### Requirements for new requests

- Include destination path, dimensions, visual brief, and the UI or placeholder it replaces.
- Prefer text-free artwork for localisation.
- Palette: teal ink `#06161c`, foam `#eefaf6`, ember `#ffb36b`, coral `#ff5b6e`, lagoon `#61f2d5`.
- Use WebP for paintings, SVG for marks, and PNG where transparency and fine detail are needed. Keep each delivered file under 600 KB.
- **3D props** (new): glTF binary (`.glb`), +Y up, pivot at the base centre where the prop meets the seabed, 1 glTF unit = 1 world unit, authored at the "scale 1" size given in the brief (the game scales instances 0.4–2.5×). Vertex colours or a single ≤ 512² texture; no transparency; ≤ 1 000 triangles unless stated. Each prop is drawn as an instanced mesh thousands of times, so one mesh per file, no hierarchy, no animation (the game sways and bends plants in the shader). Drop them in `public/assets/props/`; they are wired up as new `FloraKind`s / boulder variants in `src/sim/world.ts` and `src/render/sea.ts`.

#### The brief in one paragraph

Nine biomes now band out from a shoreline. The middle of the danger scale (Open Shelf, Sponge Forest, Boulder Field, Microbial Flats) keeps the existing reef look exactly as it is: **do not restyle it**. Two ends get a look of their own. The **relaxing** end (Sunlit Shallows, Nursery Reef; danger < 0.2) is *smaller and rounder*: bulbs, cushions, pebbles, soft fronds, pale sand, bright turquoise water. The **extreme** end (The Channels, The Escarpment, Deep Basin; danger > 0.7) is *larger and angular*: blades, spires, shards, spines, dark desaturated colour, cold blue-black water. Everything reads as Cambrian (sponges, algae, microbial mats, mud and rock), nothing modern (no kelp, no coral heads, no fish).

#### 1. Relaxing props (Shallows and Nursery) — 3 GLBs

| File | Scale-1 size | Brief | Slots in as |
| --- | --- | --- | --- |
| `public/assets/props/cushion-sponge.glb` | 0.9 wide × 0.6 tall | A cluster of three to five rounded sponge bulbs fused at the base, like a pile of buns, smooth, with a few small oscula on top. Warm pale ochre to peach. ≤ 500 tris. | Replaces the sac sponge in the shallows density table; also scattered in nursery clearings' edges. |
| `public/assets/props/lettuce-tuft.glb` | 0.5 wide × 0.45 tall | A soft rosette of six to eight broad rounded fronds curling outward, slightly translucent green-gold. Fronds must bend from the base (the shader leans the top). ≤ 400 tris. | New `FloraKind` for the shallows meadow, replacing half the filament tufts there. |
| `public/assets/props/pebble-cluster.glb` | 0.6 wide × 0.15 tall | Seven to twelve smooth rounded pebbles half-sunk in sand, pale grey and pink. ≤ 300 tris. | Shallows and nursery floor scatter (replaces the angular rock fragments there). |

#### 2. Extreme props (Channels, Escarpment, Basin) — 4 GLBs

| File | Scale-1 size | Brief | Slots in as |
| --- | --- | --- | --- |
| `public/assets/props/blade-spire.glb` | 1.2 wide × 4 tall | A tall, thin, faceted rock spire leaning a few degrees, sharp edges, like a shard of slate stood on end. Dark blue-grey with paler fracture faces. ≤ 600 tris. | Boulder variant for the escarpment foot and the channel walls; big instances (2–3×) as landmarks in the basin. |
| `public/assets/props/talus-shard.glb` | 1.5 wide × 0.8 tall | An angular broken block, flat faces, one sharp corner up. Same slate palette. ≤ 300 tris. | Replaces the rounded boulders in escarpment and basin chunks (the mid biomes keep the round ones). |
| `public/assets/props/spine-sponge.glb` | 0.8 wide × 2.6 tall | A tall, narrow, angular sponge: a stiff central stalk with rings of straight spines pointing up and out, like a bottle-brush of needles. Bone white on a dark base so it reads in near-dark water. ≤ 800 tris. | New `FloraKind` for the deep sponge gardens (basin) and the escarpment. |
| `public/assets/props/glass-fan.glb` | 1.6 wide × 1.4 tall | A deep-water fan: a flat, fine, angular lattice on a short stalk, edges serrated, pale ice-blue. Should bend a little in the shader (thin at the stalk). ≤ 900 tris. | Basin sponge gardens, facing the channel current. |

#### 4. Biome cards — 9 WebP paintings (optional, for the codex and the banner)

- **Files:** `public/assets/biomes/<id>.webp` for `shallows`, `nursery`, `shelf`, `forest`, `boulders`, `flats`, `channel`, `escarpment`, `basin`; 1024 × 576 each, under 250 KB.
- **Replaces:** nothing yet. Planned for a "biomes discovered" page on the results screen and as a faint backdrop behind the biome banner when you enter one.
- **Brief:** one painted underwater vista per biome from the descriptions in the design doc's table, at the creature's eye level, no creatures in shot, no text. Match the game's fog colour for each biome (`ATMOS` in `src/render/sea.ts`): shallows bright turquoise over pale sand; nursery warm teal with dense ochre sponges; shelf the standard reef; forest tall stalked sponges in green-dark water; boulders grey-green rocks and crevices; flats green-grey mats to the horizon; channel a dark cut with visible current streaks; escarpment a cliff dropping into blackness with shards at its foot; basin near-black blue with pale spine sponges catching the last light.

#### 5. Radar and menu glyphs — 5 SVGs (optional)

- **Files:** `public/assets/ui/radar-player.svg`, `radar-threat.svg`, `radar-giant.svg`, `radar-home.svg`, `radar-shore.svg`; 24 × 24 viewBox, single colour (`currentColor`), no text.
- **Replaces:** the inline shapes drawn by `Radar` in `src/app/Hud.tsx` (dot, diamond, big diamond, house, coastline arc).
- **Brief:** minimal marks that read at 8 px on a dark disc: a dot with a thin ring for a player; a diamond for a threat; a diamond with a small jaw notch for a giant; a sponge-dome silhouette for home; a short wavy coastline for the shore.


## 2026-09-06 — Reddish Anomalocaris favicon

Replaced the game, specimen viewer and workbench favicon links with the approved
reddish Anomalocaris head. Delivered `public/favicon-anomalocaris-{16,32,192,512}.png`,
`public/apple-touch-icon-anomalocaris.png` (180 px), and `public/favicon.ico`
(16/32/48 px). Previous engraved icons remain available.

The approved built-in imagegen illustration is downsampled without restyling;
`tools/art/export-anomalocaris-favicon.py <approved-source.png>` reproduces the
exports. New filenames ensure browsers request the new version.

**2026-09-09:** the same art is now the in-game emblem too, so the browser tab and the mark beside
the title on the pick screen are one animal rather than two. `npm run brand` derives
`public/assets/brand/emblem.webp` (128 px, trimmed to the ink) from the 512 px favicon master.

## Triassic air-status glyphs — 2026-09-13

Delivered `public/assets/ui/air-recovery-off.svg` (barred breath/down-recovery mark) and `air-surface.svg` (upward breath arrow over waterline). Both use 64×64 viewBoxes, currentColor, and the shared breath glyph line weights. They are available for HUD integration.
