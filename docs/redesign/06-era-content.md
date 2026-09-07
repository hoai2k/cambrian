# Era content boundary

The game and specimen viewer share one engine. Cambrian is the only shipped era and remains the
selected build. This refactor adds no menu option, changes no asset, and changes no gameplay values.

## Composition

`src/content/index.ts` selects `ACTIVE_ERA` once for the entire build. `EraDefinition` in
`src/content/era.ts` is plain data, safe for the deterministic simulation, browser entrypoints, and
Node tools. It contains:

- Creature definitions and ordered roster; initial player, boot and title priorities.
- Snack schools, resident giants with habitat preferences, and the shadow predator.
- Biome names, danger levels, atmosphere, sand and flora colours.
- Model, portrait, scenery, UI, sound and music paths, plus generated model byte sizes.
- Creature palette choices, preserved portrait metadata, authored camouflage colours and soundtrack.

Cambrian's definitions live in `src/content/cambrian/`. Shared contracts live in
`src/content/creature-types.ts`. The explicit creature and ability ID unions are assembled through
`src/content/ids.ts`; adding content must retain exhaustive type checking rather than widening IDs
to arbitrary strings.

Existing imports from `sim/creatures`, `sim/expansion`, and `shared/palettes` remain compatible.
The game and viewer use the selected roster through these facades. `asset-paths.ts` resolves paths
inside the selected pack; each entrypoint still supplies its deployment base, including the nested
viewer and workbench. Cambrian keeps every existing URL. Portrait manifests contain complete
app-relative paths so generated scheme images may live independently of the default portrait folder.

The content pack has no runtime imports from simulation, rendering or palette helpers. Its shared
type imports are erased. Keep that direction to avoid initialization cycles. Generated Cambrian
byte sizes and authored colours retain their existing output locations and enter the runtime through
the pack; authoring scripts continue to refresh those files.

## Adding Devonian later

1. Add `src/content/devonian/` with its own definitions, ecological populations, palette choices,
   environment presentation and soundtrack. Extend the creature/ability ID unions with globally
   unique IDs. Reuse shared mechanics where their behaviour fits.
2. Author models against the existing animation and anchor contracts, including full/LOD skeletons,
   attack and feeding sockets, portraits and palette metadata. Put public content in a distinct
   namespace such as `public/assets/devonian/`; configure paths instead of editing loaders.
3. Supply a complete `EraDefinition`. Startup validation rejects empty or duplicate rosters,
   out-of-roster spawn/default references, missing model sizes and empty required lists.
4. Wire the pack at the build composition point when it is ready. A later release can add a chooser
   or build separate entrypoints from this repository. There is intentionally no mutable global era
   setter: switching a live match would also require rebuilding its simulation, queues and caches.
5. Run the era, model, portrait, palette, simulation and browser checks with that pack selected.
   `tools/load-content.mjs` lets intake tools consume the actual runtime roster rather than parsing
   TypeScript source. Cambrian-specific authoring and regression scripts remain explicitly scoped.

This is preparation for another era, not a general plugin engine. Shared combat, AI, growth,
terrain generation, animation, anchors, cameras and multiplayer remain in their current modules.
Existing species-specific ability implementations and rig exceptions remain intact. Implement new
mechanics where required; do not duplicate the game or assume that a new ability ID implements its
behaviour. The nine biome IDs describe the current shared terrain algorithm; adding different terrain
behaviour or new biome IDs requires simulation and renderer work. Menu CSS, procedural geometry and
some shader colours remain shared; introduce theme overrides alongside actual Devonian art needs.

## Verification

`npm run eras` validates pack references, shipped model/portrait paths and byte sizes, and independent
asset namespaces using a test-only alternative path configuration. Existing world, motion, expansion,
audio, palette and portrait tests cover the shared consumers. During this refactor, seeded 300-step
matches in Rise, Reef, Frenzy and Hunted produced identical serialized actor/progress/state hashes
before and after the move; the complete creature definitions also matched exactly.

## Devonian natural-history and asset brief

The [Devonian creature and asset brief](07-devonian-design.md) describes 21 mobile animal subjects,
regional environments, plants, attached organisms and geological props, together with the proposed
images and 3D source/export deliverables. It is an art inventory with research notes; it does not
specify gameplay. Subsequent asset authoring uses the separate [Devonian specimen library](../devonian/README.md), which the viewer can inspect without activating a playable Devonian pack.

The [Devonian Domination design](08-devonian-domination.md) specifies the gameplay for that pack:
rungs, standing, range and the era mechanics, with the `EraDefinition` fields they would need.
