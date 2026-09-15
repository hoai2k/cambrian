# Ancient Seas title and ground artwork

Original PNGs were generated with the built-in imagegen tool, using the three shipped era paintings and Cambrian engraved wordmark as references. Exact prompts, including seabed correction attempts, are in `prompts.json`. Selected originals are preserved in `sources/`.

Run from repository root: `node tools/art/ancientseas/titles/package.mjs` and `node tools/art/ancientseas/titles/favicons.mjs`.

Five wordmarks and fleuron retain generated alpha. Parchment is opaque. The seabed's transparency attempts contained a baked checkerboard, so a clean white source was generated and converted using the saturation-aware white extraction and edge unmixing algorithm from `tools/brand-intake.mjs`. No checkerboard source is shipped. All eight WebPs match requested dimensions and stay below 600,000 bytes; `verification.json` records checks.

The v2 titles were inspected over parchment in `qa-contact.jpg`: their thin pale cream rims read as paper outlines, matching the paintings' lettering. The v1 logo has the warmer gold rim requested for its dark ground. The favicon shell was isolated with imagegen from the fleuron reference because a rectangular crop retained visibly clipped fronds; `favicons.mjs` scales the clean shell over the requested rounded-square #070402 backing.
