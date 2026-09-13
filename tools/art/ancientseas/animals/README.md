# Ancient Seas animal cutouts

Twelve separate images authored with built-in imagegen against the actual three era title paintings. `prompts.json` records every original prompt and the background correction prompt. The `*-source.png` files are the untouched selected imagegen source images; the eight `*-initial.png` files retain the first passes that baked a checkerboard into RGB.

The animal generations did not return actual alpha even after a dedicated imagegen transparency correction. Imagegen subsequently replaced the checkerboard with a plain white field, preserving the drawings. `package.mjs` derives transparent WebP using the established `tools/brand-intake.mjs` colourless-white key and unmix, with a connected pale-background pass that infers a dark translucent foreground for the soft shadows. That prevents the original lettering key from leaving a white halo underneath the animals. No creature artwork was drawn procedurally.

Run from repository root:

```
node tools/art/ancientseas/animals/package.mjs
```

Outputs are 1024×768, alpha 0–255, and below 600 KB. `packaging-report.json` records dimensions and byte counts. `review-parchment.jpg` and `review-dark.jpg` show all twelve packaged assets on solid fields for edge inspection. Facing directions match the title-page brief. These are the same deliberately stylized natural-history illustrations as the title paintings, not anatomical modeling references.
