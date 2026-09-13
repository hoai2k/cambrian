import type { InstancedScenery } from '../era';

/**
 * The Triassic's authored instanced scenery. The era's growth — sea lilies, dasyclads, coral
 * bushes, sponges — is still the Devonian's procedural stand-ins; what has been built is the
 * *substrate*, the three families in `tools/triassic/props/` that carpet the floor of the biomes
 * where almost nothing grows (docs/triassic/02-biomes-and-depth.md, the props-and-plants table).
 *
 * Each family names both of its authored variants, which is what the prop table means by "2": the
 * renderer picks one per instance so a gypsum flat is not one crust plate stamped four hundred
 * times, and the collider takes the union of the pair.
 *
 * These are mineral, so none of them sways or bends — the flags are what makes a plant move in the
 * current, and a salt pan that rippled would read as cloth.
 */
const path = (id: string) => `assets/triassic/props-instanced/${id}.glb`;

export const TRIASSIC_SCENERY: InstancedScenery = {
  props: {
    'triassic-stromatolite-1': { path: path('triassic-stromatolite-1'), material: 'rock' },
    'triassic-stromatolite-2': { path: path('triassic-stromatolite-2'), material: 'rock' },
    'triassic-salt-crust-1': { path: path('triassic-salt-crust-1'), material: 'rock' },
    'triassic-salt-crust-2': { path: path('triassic-salt-crust-2'), material: 'rock' },
    'triassic-mud-ripple-1': { path: path('triassic-mud-ripple-1'), material: 'rock' },
    'triassic-mud-ripple-2': { path: path('triassic-mud-ripple-2'), material: 'rock' },
  },
  flora: {
    stromatolite: ['triassic-stromatolite-1', 'triassic-stromatolite-2'],
    saltCrust: ['triassic-salt-crust-1', 'triassic-salt-crust-2'],
    mudRipple: ['triassic-mud-ripple-1', 'triassic-mud-ripple-2'],
    // Everything else keeps the procedural silhouette `src/render/sea.ts` builds until its own
    // model is authored. Do not point a Triassic kind at a Devonian mesh here: the stand-in the
    // game plays with is chosen in environment.ts, and a wrong genus placed by the thousand is
    // worse than a shape that is honestly generic.
  },
};
