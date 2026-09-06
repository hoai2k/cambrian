# Image request history — Cambrian Explosion

Completed briefs are archived here. Open requests belong in [image-requests.md](image-requests.md).

## Delivery — 2026-09-06

All eight request groups, including the optional assets, were fulfilled. Painted scenes were generated with the built-in image generator; exact prompts are in [tools/art/generation-prompts.json](tools/art/generation-prompts.json). Creature portraits were rendered from repository models in Blender; marks and glyphs are native SVG. Every delivered image is under 600 KB.

## 1. Logo (primary)

**Completed 2026-09-06.** Delivered `public/assets/brand/logo.svg` (outlined vector lettering) and `logo.png` (2400×900, transparent). Integrated into title, loading, and selection headers.

- **File:** `public/assets/brand/logo.svg` (also `logo.png` at 2400×900 for social/store use)
- **Replaces:** the CSS text logo on the title screen (`.title-logo` in `src/app/styles.css`) and the small wordmark on the creature-select header.
- **Brief:** "CAMBRIAN EXPLOSION" as a two-line wordmark. Energetic, not academic: heavy geometric display letterforms, slight forward lean, a "burst" motif breaking out of the second word. Palette: foam white `#eefaf6` for CAMBRIAN, a hot gradient from ember `#ffb36b` through coral `#ff5b6e` to pink `#ff9ac2` for EXPLOSION, on deep teal `#06161c`. Should read at 200 px wide and at 2000 px. Leave a transparent background. Optional: a one-line horizontal lockup for the in-game header.

## 2. Emblem / favicon

**Completed 2026-09-06.** Delivered the shared `public/favicon.svg` emblem, 192px and 512px PNGs, and 180px Apple touch icon; registered the icons in `index.html` and reused the emblem component.

- **Files:** `public/favicon.svg` (replace), `public/favicon-192.png`, `public/favicon-512.png`, `public/apple-touch-icon.png` (180×180)
- **Replaces:** the procedural sixteen-point burst with an eye in `public/favicon.svg` and the `Emblem` component in `src/app/icons.tsx`.
- **Brief:** a single mark that works at 16 px: a radial burst (the "explosion") with a compound eye or an Anomalocaris eye-stalk silhouette at the centre. Same palette as the logo. Rounded-square background `#07202a` for the PNGs, transparent for the SVG.

## 3. Title screen key art

**Completed 2026-09-06.** Delivered desktop 2560×1440 and mobile 1080×1920 WebP key art. Title and loading screens select the portrait source on portrait displays.

- **File:** `public/assets/brand/keyart.webp` (2560×1440) and `keyart-mobile.webp` (1080×1920)
- **Replaces:** the loading screen's backdrop (currently the live 3D reef behind a dark gradient). The loading screen already tries to load `assets/brand/keyart.webp` and silently falls back if it is missing, so dropping the file in is the whole integration.
- **Brief:** a low-angle underwater shot: a small Waptia in the foreground bolting through a sponge thicket, a huge Anomalocaris silhouette above against the light window. Warm caustics, deep teal water, coral rim-light on the predator. Painterly but sharp. Leave the upper-centre third quiet for the logo.

## 4. Creature select renders (upgrade)

**Completed 2026-09-06.** Delivered all eight 1600×1200 transparent Blender renders at `public/assets/creatures/<id>.select.png` and updated selection to use them. The original `.png`, `.card.png`, and GLB files are preserved per repository policy. All models use the same camera direction, TurnLeft animation frame 17, coral rim light, and teal fill; PNG palettes preserve alpha. The previous `.card.png` files were already background-removed, but were not the requested render upgrade.

- **Files:** `public/assets/creatures/<id>.png` for all eight creatures (existing 1000×750 renders are usable placeholders)
- **Replaces:** the current flat studio renders on dark grey.
- **Brief:** re-render each model at 1600×1200 on a **transparent** background, three-quarter front view, dynamic pose (mid-turn, appendages open), rim-lit with coral from behind and cool teal fill. The select screen shows them with `mix-blend-mode: screen`, which is a workaround for the grey backdrop; transparent PNGs let us drop that. Same camera angle for all eight so the roster flips cleanly.

## 5. Size-tier glyphs

**Completed 2026-09-06.** Delivered five 64×64 SVGs and integrated them as current-colour masks in the growth ring with accessible tier labels.

- **Files:** `public/assets/ui/tier-1.svg` … `tier-5.svg` (64×64, single colour, currentColor)
- **Replaces:** the Roman numerals I–V inside the growth ring on the HUD (`.tier-num` in `src/app/Hud.tsx`).
- **Brief:** five silhouettes of the same simple creature growing: egg/larva → juvenile → adult → giant (bigger, spikier) → apex (crowned by the burst motif). Must read at 28 px.

## 6. Band icons (optional)

**Completed 2026-09-06.** Delivered all five optional 24×24 band SVGs and integrated them as tinted HUD masks.

- **Files:** `public/assets/ui/band-snack.svg`, `band-prey.svg`, `band-rival.svg`, `band-threat.svg`, `band-giant.svg`
- **Replaces:** the plain rotated-square markers over creatures on the HUD (`.marker` in `src/app/styles.css`).
- **Brief:** five tiny (24×24) glyphs: a morsel, a fleeing fish, crossed appendages, a warning fang, a skull-ish eye. Single colour; the game tints them green / teal / amber / orange / red.

## 7. Mode cards

**Completed 2026-09-06.** Delivered all four 640×360 WebP mode panels and integrated them behind the existing mode labels and player counts.

- **Files:** `public/assets/ui/mode-rise.webp`, `mode-frenzy.webp`, `mode-hunted.webp`, `mode-reef.webp` (640×360)
- **Replaces:** the text-only mode chips on the creature-select header.
- **Brief:** four small illustrated panels in the key-art style: Rise (a larva under a giant's shadow), Feeding Frenzy (four creatures converging on one kill), Hunter & Hunted (one huge silhouette, three small ones hiding), Reef (a calm wide shot of the sponge forest).

## 8. Loading spinner / progress motif (optional)

**Completed 2026-09-06.** Delivered the optional animated emblem spinner and used it on the loading screen. Progress text remains accessible; the SVG respects reduced-motion preferences.

- **File:** `public/assets/ui/loading.svg` (animated SVG ok)
- **Replaces:** the "WAKING THE REEF…" text on the title screen while the eight GLBs load.
- **Brief:** the emblem's burst rotating slowly, or a trilobite enrolling and unrolling.

