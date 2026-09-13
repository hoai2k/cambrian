import type { InstancedScenery } from '../era';

const path = (id: string) => `assets/devonian/props-instanced/${id}.glb`;

/** Game-space proxies baked from shipped specimens; all original metric models stay available. */
export const DEVONIAN_SCENERY: InstancedScenery = {
  props: {
    'devonian-crinoid': { path: path('devonian-crinoid'), material: 'algae', sway: true, bend: true },
    'devonian-stromatoporoid': { path: path('devonian-stromatoporoid'), material: 'rock', bend: true },
    'devonian-tabulate': { path: path('devonian-tabulate'), material: 'rock', bend: true },
    'devonian-rugose': { path: path('devonian-rugose'), material: 'sponge', bend: true },
    'devonian-bryozoan': { path: path('devonian-bryozoan'), material: 'sponge', sway: true, bend: true, doubleSided: true },
    'devonian-algal-clump': { path: path('devonian-algal-clump'), material: 'algae', sway: true, bend: true, doubleSided: true },
    'devonian-log': { path: path('devonian-log'), material: 'rock', bend: true },
    'devonian-boulder': { path: path('devonian-boulder'), material: 'rock' },
    'devonian-outcrop': { path: path('devonian-outcrop'), material: 'rock' },
    'devonian-talus': { path: path('devonian-talus'), material: 'rock' },
    'devonian-pebbles': { path: path('devonian-pebbles'), material: 'rock' },
  },
  minimumFloraQuality: 'high',
  flora: {
    crinoid: 'devonian-crinoid', stromatoporoid: 'devonian-stromatoporoid', tabulate: 'devonian-tabulate',
    rugose: 'devonian-rugose', bryozoan: 'devonian-bryozoan', reed: 'devonian-algal-clump', log: 'devonian-log',
    // The giant column/tower retain their existing procedural silhouettes pending supported
    // framework-and-colony compositions. Do not stretch small fossil thalli or land plants here.
  },
  rocks: {
    boulder: 'devonian-boulder', 'blade-spire': 'devonian-outcrop', 'talus-shard': 'devonian-talus', 'pebble-cluster': 'devonian-pebbles',
  },
};
