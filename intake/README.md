# Intake

Delivered art, as handed over, before any processing. Files here are **sources**, not assets the
game loads: `npm run brand` reads them and writes the WebP the game actually uses into
`public/assets/`. Keeping the originals means that conversion is repeatable and reviewable rather
than a thing that happened once — if a cutout or a quality setting needs changing, the input is
still here.

| File | Becomes | Processing |
| --- | --- | --- |
| `cambrian-logo-engraved.png` | `public/assets/brand/logo-engraved.webp` | White page removed to transparency, un-blended from white so no pale fringe survives over dark water, trimmed, 1536 wide. |
| `cambrian-logo-illustrated.png` | `public/assets/brand/logo-illustrated.webp` | Format only. It is a full rectangle: the title screen's background and the loading screen's logo. |

Nothing here is served to players — `public/` is the shipped tree — so these stay at full
resolution.
