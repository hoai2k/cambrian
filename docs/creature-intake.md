# Creature intake

Everything a creature needs to ship, and the check that enforces it. Run `node tools/check-creature-assets.mjs --strict`
before merging. CI (`.github/workflows/pages.yml`) runs `npm run check` — the same script without
`--strict`, so it fails on errors but only warns about stale images; run the strict form yourself.

## Adding a creature

1. **Model.** `public/assets/creatures/<id>.glb`, meshopt-compressed, with the clip set in
   `docs/animation-brief.md` (Idle, Swim/Crawl, Attack, Hit, Death, Turn/Dive/Rise, Bite, Heavy,
   Guard, Parry, Dodge, Eat, Stagger, Ability, Moult; Grab if it grabs). Colour comes from vertex
   pigmentation, material factors and embedded albedo/normal maps as appropriate.
2. **Data.** Add an entry to `src/sim/creatures.ts` (or the expansion registry in `src/sim/expansion.ts`) (stats, moves, ability, copy). The roster
   grid on the pick screen lays itself out from this list: three rows, `ceil(n / 3)` columns,
   so 21 creatures sit in 7 × 3 without scrolling.
3. **Render.** A studio render at `public/assets/creatures/<id>.png`, 1000–1200 px wide,
   three-quarter front view on the flat dark backdrop the existing eight use, or an authored transparent background
   (existing alpha is preserved; opaque backdrops are keyed from the corner pixel). Same framing and lighting as the others so the grid reads
   as one set.
4. **Select render.** A transparent 1600 × 1200 portrait at
   `public/assets/creatures/<id>.select.png` — this is what the pick screen actually shows,
   as both the hero and the grid tile. Add the id to the list in
   `tools/art/render-creatures.py` and run `node tools/art/decode-models.mjs` then
   `Blender -b --python tools/art/render-creatures.py`, so the framing, the TurnLeft pose and
   the coral/teal lighting match the other eight.
5. **Images.** `node tools/make-cards.mjs <id>` writes the hero cutout (`<id>.card.png`,
   used by the viewer and the streaming preloader), the 256 × 192 grid thumbnail
   (`<id>.thumb.png`) and records the model's appearance fingerprint — and a hash of the
   select render — in `images.json`.
6. **LOD.** For expansion rigs follow `tools/creatures/README.md`: authored reduced
   meshes preserve small anatomical parts, then package, append anchors and update sizes.
   For legacy models, `node tools/make-lods.mjs` writes `<id>.lod1.glb` (about 15% of the triangles, no
   textures, locomotion clips only) for distant rendering.
7. **Check.** `node tools/check-creature-assets.mjs` must report no errors.

## Changing a creature's appearance

Colours, textures or materials live in the GLB, so a change there makes the select render,
hero card and thumbnail wrong. `images.json` stores a fingerprint of the model's materials, textures and
material assignments; when the GLB no longer matches it, the check prints

    STALE   waptia: model appearance (materials/textures) changed since its images were made ...

Re-render `<id>.png` **and** `<id>.select.png` from the updated model, then
`node tools/make-cards.mjs <id>`. If the select render is not re-made alongside the others the
check says so:

    STALE   waptia: waptia.select.png does not match the one recorded with the other images ...

Geometry- or clip-only changes are noted but do not invalidate the images. An LOD older than its
model is also flagged; rerun `node tools/make-lods.mjs`.

## Colours and schemes

None of the colour is textured. Every creature's GLB carries a white `baseColorFactor` and puts
all of its colour in `COLOR_0` vertex colours, with a normal map as the only texture, so a
creature can be recoloured at runtime with no new art. `src/render/recolor.ts` rebuilds each
pixel as `slot colour x (luminance / the material's mean luminance)`: the mottling, gradients
and baked shading all live in that ratio and survive, and only the hue is replaced. The schemes
themselves are plain data in `src/shared/palettes.ts`.

**`CREATURE_SCHEMES` in that file is what the game draws.** Twelve creatures are assigned a
scheme; the other nine keep the colours authored into their models, which is a deliberate choice
rather than an omission. `CreatureView` applies the creature's scheme when it builds, so it
covers both LODs and every screen that renders a creature in 3D. The viewer starts each specimen
on its game scheme, and its **Export colours** button writes the current picks out as JSON — that
file is the way a new set of defaults comes back into this map.

Palette-aware portraits, cards, and thumbnails use an exact scheme/colour snapshot match and fall back to preserved authored images when no matching render exists. See [art/colour-rendering.md](art/colour-rendering.md) for the separate palette rendering workflow and fallback policy.

**Material names decide the palette slot.** `slotFor()` sorts each material into one of body,
eyes, fins, legs, accent or underside by matching its name — "Dorsal cuticle" is a body,
"Sclerotized tips" are accents, "Thin swimming membranes" are fins. So the names in Blender are
load-bearing: rename a material and its colour slot moves with it. Follow the convention the
eight use and a new creature gets sensible slots for free.

    npm run palettes

checks that every shipped material (models and LODs) still lands in the slot the schemes assume,
and that every scheme covers every slot. Run it after any material rename.

## Loading behaviour

The pick screen never waits for 3D models. The select renders are small images loaded
first; models stream in the background in priority order (committed creatures, then the ones
players are hovering, then their grid neighbours, then the rest). A match starts the moment
everyone has locked in; a creature whose model is still arriving plays as a glow until it
appears, usually within a second or two.
