# Creature intake

Everything a creature needs to ship, and the check that enforces it. Run `npm run check`
before merging; CI runs it too.

## Adding a creature

1. **Model.** `public/assets/creatures/<id>.glb`, meshopt-compressed, with the clip set in
   `docs/animation-brief.md` (Idle, Swim/Crawl, Attack, Hit, Death, Turn/Dive/Rise, Bite, Heavy,
   Guard, Parry, Dodge, Eat, Stagger, Ability, Moult; Grab if it grabs). Colour comes from vertex
   colours and material factors; the only texture is a normal map.
2. **Data.** Add an entry to `src/sim/creatures.ts` (stats, moves, ability, copy). The roster
   grid on the pick screen lays itself out from this list: three rows, `ceil(n / 3)` columns,
   so 21 creatures sit in 7 × 3 without scrolling.
3. **Render.** A studio render at `public/assets/creatures/<id>.png`, 1000–1200 px wide,
   three-quarter front view on the flat dark backdrop the existing eight use (the cutout is
   keyed from the corner pixel). Same framing and lighting as the others so the grid reads
   as one set.
4. **Images.** `node tools/make-cards.mjs <id>` writes the hero cutout (`<id>.card.png`),
   the 256 × 192 grid thumbnail (`<id>.thumb.png`) and records the model's appearance
   fingerprint in `images.json`.
5. **LOD.** `node tools/make-lods.mjs` writes `<id>.lod1.glb` (about 15% of the triangles, no
   textures, locomotion clips only) for distant rendering.
6. **Check.** `node tools/check-creature-assets.mjs` must report no errors.

## Changing a creature's appearance

Colours, textures or materials live in the GLB, so a change there makes the hero card and
thumbnail wrong. `images.json` stores a fingerprint of the model's materials, textures and
material assignments; when the GLB no longer matches it, the check prints

    STALE   waptia: model appearance (materials/textures) changed since its images were made ...

Re-render `<id>.png` from the updated model, then `node tools/make-cards.mjs <id>`. Geometry- or
clip-only changes are noted but do not invalidate the images. An LOD older than its model is
also flagged; rerun `node tools/make-lods.mjs`.

## Loading behaviour

The pick screen never waits for 3D models. Thumbnails and hero cards are small images loaded
first; models stream in the background in priority order (committed creatures, then the ones
players are hovering, then their grid neighbours, then the rest). A match starts the moment
everyone has locked in; a creature whose model is still arriving plays as a glow until it
appears, usually within a second or two.
