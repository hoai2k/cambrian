# Triassic Triumph engraved branding — 2026-09-12

Replaces the rejected plain-font/blue-underwater title treatment with the visual
language of Devonian's `title.webp` and `emblem.webp`: hand-coloured natural-history
engraving, black stippled ink, muted ochre/verdigris, fine gold outlines and aged
parchment. The landscape title was generated first from the Devonian title;
the mobile title and wordmark follow that new master. The emblem uses Devonian's
engraving treatment but, at the user's request, depicts a complete long-necked
plesiosaur. Its initial extra dorsal appendage was removed: four flippers remain.

## Delivered and wired

`public/assets/triassic/brand/` contains `title.webp`, `title-mobile.webp`,
`logo-engraved.webp`, `emblem.webp`, favicon PNGs (16/32/192/512), a real
16/32/48 ICO, and the 180px Apple touch icon. All icons derive from the corrected
full-body emblem. Wordmark and emblem PNG masters have real alpha, verified by
the exporter. Both title plates include lettering; do not overlay a second title.

`src/content/triassic/brand.ts` now selects the engraved wordmark. Earlier
`logo-triassic*` PNG/SVG paths are compatibility exports of the same artwork.
SVG files embed raster art; they are not editable vector approximations.
Earlier text-free blue `keyart*` files remain supplementary scenery and are not
the engraved title source or the active title-screen artwork.

## Sources and resumption

Four selected PNG masters are in `tools/art/triassic/sources/`; the actual
Devonian references are copied under `sources/references/` for inspection.
Exact prompts are in `tools/art/triassic/prompts.json`. Built-in ImageGen was
used throughout. These are stylized brand illustrations, not model-input or
anatomical reference images. An opaque-checkerboard wordmark attempt was rejected;
the delivered replacement has genuine transparency.

Run `npm run triassic:brand` to reproduce exports and their hash manifest.
The former placeholder command forwards to this exporter, preventing the old
generic emblem from being restored over delivered art. Final verification covers
alpha, dimensions, ICO entries, build and typecheck.

Separate handoff: reviewed Coccosteus candidate07 files are now in
`intake/coccosteus-candidate07/`, including full/LOD, Blender rig source, portraits,
12 review views and frozen reports. Its final creature audits remain pending;
this upload does not replace the runtime Coccosteus model.
