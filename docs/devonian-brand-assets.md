# Devonian Domination brand assets

Prepared 2026-09-06. **Ready but inactive**: no active era, HTML icon links, or
Cambrian assets have been changed. The namespace uses the repo's `devonian` spelling.

## Delivered

All runtime files live in `public/assets/devonian/brand/`:

| Asset | Purpose |
| --- | --- |
| `title.webp` | Full supplied 1536 × 1024 title composition, optimized without cropping |
| `title-mobile.webp` | Generated 941 × 1672 portrait companion for narrow screens |
| `emblem.webp` | Transparent 512 × 512 Dunkleosteus head emblem |
| `favicon-{16,32,192,512}.png` | Browser and app icon sizes, transparent |
| `favicon.ico` | Multi-resolution 16/32/48 px browser fallback |
| `apple-touch-icon.png` | 180 px touch icon |
| `manifest.json` | Paths, dimensions, byte sizes, SHA-256 digests and inactive status |

## Future integration

`src/content/devonian/brand.ts` exports `DEVONIAN_BRAND`, checked against the era
asset contract, plus `DEVONIAN_BRAND_EXTRAS` for responsive art and icons. Spread
the brand fields into the future complete Devonian era's `assets` object. Both
`logo` and `illustration` reference the full title artwork; the lettering is baked
into the image. Avoid displaying a second title over it. Use the portrait companion
for narrow layouts, and keep menu controls clear of the illustrated lettering.
Check framing at the intended viewport sizes before choosing `cover` cropping.

When activating that era, update document favicon links to the corresponding
Devonian paths (respect the deployment base URL). Merely importing these constants
does not activate an era or switch browser icons. No incomplete era is registered.

## Sources and reproduction

`tools/art/devonian/sources/title.png` is the untouched user-supplied
`devonian_domination.png`. The other two PNG masters in that directory were created
with built-in imagegen, using that title image as the visual reference. Exact
generation prompts are saved in `tools/art/devonian/prompts.json`. They are stylized
brand illustrations, not specimen references or anatomical evidence. No rigging
applies to these 2D assets.

Run `python3 tools/art/devonian/export.py` with Pillow installed to regenerate the
runtime exports and manifest. It preserves master compositions and checks the
transparent emblem, square icon source and a 600 KB per-file runtime budget.
Source masters are kept outside `public` so they are not shipped in the site build.

This delivery covers the supplied title and companion branding only. Creature,
environment and other game assets in the Devonian design brief remain separate work.
