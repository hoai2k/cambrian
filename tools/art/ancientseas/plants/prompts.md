# Ancient Seas plant ImageGen prompts

All five pieces were generated separately with the built-in ImageGen tool. The three shipped title paintings were supplied as style references. Each generation prompt used the following common direction:

> Use case: background-extraction. Asset type: Ancient Seas Trilogy title-page plant cutout. Scene/backdrop: genuinely transparent background; no parchment, water, seabed, ground, frame, or scenery. Style/medium: hand-coloured nineteenth-century natural-history engraving matching the supplied paintings exactly: crisp dark sepia/black etched contours, fine cross-hatching and stippling, restrained flat pigment washes, subtly aged printed texture. Lighting/mood: archival museum plate; include the same subtle warm-grey offset print shadow immediately behind the specimen, with transparent pixels beyond it. Constraints: complete isolated specimen; real alpha transparency; text-free; no labels; no watermark. Avoid: opaque or checkerboard background, parchment rectangle, extra organisms, photorealism, digital 3D rendering, watercolor bloom, modern vector art.

## Crinoid

> Create one complete crinoid on a tall slender segmented stalk, with its feathery crown fully open, matching the crinoids in the supplied Devonian and Triassic title paintings. A single scientifically plausible stalked crinoid, entire holdfast-to-crown silhouette visible, delicate many-branched arms spreading upward and outward. Portrait, upright and tall; subject fills most of a 3:4 canvas with comfortable transparent margin on every side; nothing clipped. Ochre and muted sage/olive green with warm umber ink. Exactly one crinoid; no rock base.

## Sea fern

> Create one complete wide, low spray of fine sea fern, matching the sage-green fernlike growth that runs behind the title lettering in all three supplied paintings. A single coherent botanical-looking marine frond spray arising from one low central base, many elegant branching stems and tiny rounded leaflets, airy enough to place behind lettering. Landscape, wide and low; gently arcing fronds fan left and right and fill most of a 4:3 canvas; whole silhouette visible with comfortable transparent margin; nothing clipped. Muted sage and moss green with warm umber ink and faint ochre highlights. No flowers or terrestrial fern pot.

## Red coral

> Create the complete dusty-red branching coral seen in the corners and seabed borders of the supplied title paintings. One upright coral colony with a compact basal trunk dividing into many organic rounded branches and fine twiglike tips; historically illustrated marine specimen, neither antler coral nor a tree. Portrait, upright; coral fills most of a 3:4 canvas, gently asymmetrical and suitable for mirroring; full base and every branch tip visible with comfortable transparent margin; nothing clipped. Dusty brick red, faded coral red, muted rust and warm umber ink, never bright scarlet. Exactly one connected coral colony; no rock base or seaweed.

## Tube sponge

> Create a complete cluster of four ochre tube sponges like those along the lower borders of the supplied paintings. One connected cluster of exactly four upright tubular sea sponges of varied natural heights, each with a clearly open dark osculum, slightly irregular porous walls, all arising from a compact shared base. Portrait, upright compact cluster; fills most of a 3:4 canvas; full base and every tube rim visible with comfortable transparent margin; nothing clipped; silhouette suitable for mirroring. Aged ochre, muted mustard, raw sienna and warm umber ink. No rock or seabed base.

## Brain coral

> Create one complete round grooved brain coral like the compact front-and-centre seabed coral in the supplied title paintings. A single low hemispherical brain coral colony, viewed from slightly above, with an organic irregular perimeter and continuous maze-like meandering grooves over its whole dome. Landscape, broad and low; centered and filling most of a 4:3 canvas; whole base silhouette visible with comfortable transparent margin; nothing clipped. Muted warm ochre, sandstone, olive-grey shadows and warm umber ink. Exactly one brain coral; no rock or seabed slab; not human brain anatomy.

## Alpha correction

The red coral source arrived with genuine RGBA transparency. The other four first passes and targeted alpha edits contained a baked checkerboard, so each was edited once more with this asset-specific form and preserved as the selected source in `sources/`:

> Use case: precise-object-edit. Asset type: white-matte source for transparent Ancient Seas plant cutout. Replace the entire grey-and-white checkerboard with perfectly pure solid white (#FFFFFF). Preserve the [plant] drawing itself exactly: [defining silhouette and details], muted pigment, all engraved linework, dimensions, and placement. Change only the background to uniform pure white; remove the cast shadow; no checkerboard, paper texture, gray patches, or transparency; keep the outline and fine details crisp; no cropping; no text; no additions.

`package.py` converts those four white-matte sources to alpha with the same thresholds and colour unmixing as `tools/brand-intake.mjs`, then resizes and encodes all five assets with Pillow.
