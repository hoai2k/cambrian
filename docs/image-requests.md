# Image and prop requests — Cambrian Conquest

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

> **Withdrawn — Devonian mode panels.** This page used to ask for
> `mode-domination.webp` and `mode-foodchain.webp`. Domination and Food Chain
> were dropped when the Devonian took the Cambrian's three modes
> (`7fcb778`, 8 September 2026): both eras now offer Rise, Hunter & Hunted and
> Reef, which already have panels, so nothing draws empty and there is nothing
> to commission. `mode-frenzy.webp` is likewise left over from a mode that was
> folded into Rise and is no longer requested by any pick screen.

## Triassic (third era)

The Triassic's image and model requests are collected in [`docs/triassic/03-image-and-model-requests.md`](triassic/03-image-and-model-requests.md), tiered by whether they go through Tripo or are built in-house, and stay there until the era is built.

The shared air-status glyphs (`air-recovery-off.svg` and `air-surface.svg`) have been delivered under `public/assets/ui/`; their completed brief is recorded in [image-requests-history.md](image-requests-history.md).

## Ancient Seas Trilogy title page — `/ancientseas/`

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
