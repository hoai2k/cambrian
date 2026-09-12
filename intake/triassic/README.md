# Triassic image intake

This directory holds the art inputs for the planned Triassic roster.  It is deliberately separate from runtime assets: images here are the canonical visual contract used to make, review, and then pose a 3D model.

## Canonical-first workflow

1. Create and review `canonical/pose-reference.png` for the species' silhouette, species-defining anatomy, complete tail, and all rear limbs or fins.
2. Generate the neutral four-view modeling sheet from that exact canonical image.  Do not create a modeling sheet directly from prose.
3. Save any external image supplied or used as input under `canonical/references/`, together with provenance in the subject's `prompts.json`.
4. Keep modeling references on a pale neutral studio gray unless an asset is explicitly intended for compositing or alpha extraction.  Use a chroma-key background only for that latter case.

No external image files were used for the initial canonical batch.  The written design brief and the generated canonical pose were the inputs, so the `canonical/references/` directories are intentionally empty placeholders.

## Current checkpoint

- 26 canonical pose references are present: the 21 core roster entries, separate male and female Keichousaurus variants, and the four shore-animal subjects.
- Canonical poses are the only approved assets in this first commit.
- Earlier direct turnarounds are local drafts only.  They must be rebuilt from `canonical/pose-reference.png` before they can be committed.
- `Helicoprion` has a canonical lower-jaw tooth whorl; `Ceratites` retains the canonically large tentacles when its final sheet is produced.

The next production pass creates one neutral side, top, front, and three-quarter sheet per canonical pose, followed by the plant, prop, and scenery source-image batch described in `docs/triassic/03-image-and-model-requests.md`.
