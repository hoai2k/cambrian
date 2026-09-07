import type { Biome, FloraKind } from '../../sim/world';

/**
 * The Devonian coast, in the nine shared biome slots (docs/redesign/08-devonian-domination.md ·
 * The world). River mouths take the nursery slot, the stromatoporoid reef the boulder slot, and
 * so on, so the terrain algorithm and renderer need no structural change.
 */
export const BIOME_NAMES: Record<Biome, string> = {
  shallows: 'Sandy Shallows', nursery: 'River Mouth', shelf: 'Mud Shelf', forest: 'Crinoid Meadow', boulders: 'Stromatoporoid Reef',
  flats: 'Carbonate Pavement', channel: 'Tidal Channels', escarpment: 'Reef Front', basin: 'Open Sea',
};
export const BIOME_DANGER: Record<Biome, number> = {
  shallows: 0.10, nursery: 0.06, shelf: 0.40, forest: 0.45, boulders: 0.50, flats: 0.35, channel: 0.72, escarpment: 0.80, basin: 0.92,
};
/** Sediment-brown river water at the shore, clear reef water on the shelf, cold slate blue offshore. */
export const ATMOS: Record<Biome, { fog: string; density: number; sky: number; sun: number; sand: string }> = {
  shallows: { fog: '#2a8a86', density: 0.84, sky: 2.1, sun: 3.5, sand: '#cfc2a0' },
  nursery: { fog: '#4f6a4a', density: 1.15, sky: 1.6, sun: 2.8, sand: '#8a7a5c' },
  shelf: { fog: '#1d5a63', density: 1.0, sky: 1.7, sun: 3.0, sand: '#8e8b74' },
  forest: { fog: '#1a5a5c', density: 1.05, sky: 1.6, sun: 2.8, sand: '#8b8f78' },
  boulders: { fog: '#1e6068', density: 0.95, sky: 1.8, sun: 3.1, sand: '#b9b39c' },
  flats: { fog: '#237078', density: 0.92, sky: 1.9, sun: 3.2, sand: '#c9c3ae' },
  channel: { fog: '#0d3f4d', density: 1.12, sky: 1.4, sun: 2.4, sand: '#6f766c' },
  escarpment: { fog: '#0b3646', density: 1.18, sky: 1.3, sun: 2.1, sand: '#727a74' },
  basin: { fog: '#071a2a', density: 1.45, sky: 0.85, sun: 1.4, sand: '#4d5a62' },
};
export const SAND_COLORS: Record<Biome, string> = Object.fromEntries(Object.entries(ATMOS).map(([k, v]) => [k, v.sand])) as Record<Biome, string>;
/**
 * Base colours of the Devonian stand-in kinds (`FloraKind` in src/sim/world.ts): crinoid greys and
 * olive, pale tan stromatoporoid, grey-green tabulate plates, rust rugose horns, pale bryozoan
 * fans, green reeds, brown driftwood. The Cambrian keys stay, re-tinted, so a Cambrian kind ever
 * placed here still has a colour.
 */
export const FLORA_BASE: Record<string, string> = {
  crinoid: '#8c9078', stromatoporoid: '#cbb994', tabulate: '#7d8f7c', rugose: '#9c5c3b', bryozoan: '#d4cdb6', reed: '#5e8a40', log: '#6a4a2e',
  vauxia: '#9c8f72', sac: '#a89a80', choia: '#8f8a6a', thalli: '#6b6a3a', tuft: '#5e7a45',
};
/**
 * Plants per 144 square units of each biome, on the Cambrian table's scale (the nursery dense, the
 * open sea near-empty). Reeds and driftwood crowd the river mouth and the shallows, crinoids carpet
 * the meadow, the reef is stromatoporoids with tabulate plates, horn corals and fans between them,
 * the pavement is bare but for plates, and the reef front is corals and fans on the drop.
 */
export const FLORA_DENSITY: Record<Biome, Partial<Record<FloraKind, number>>> = {
  shallows: { reed: 16, crinoid: 1.2, log: 2.5, bryozoan: 0.8, tabulate: 0.6 },
  nursery: { reed: 55, crinoid: 14, log: 7, bryozoan: 5, rugose: 3 },
  shelf: { crinoid: 3, bryozoan: 1.5, rugose: 1.2, tabulate: 0.8, reed: 0.6 },
  forest: { crinoid: 30, bryozoan: 6, rugose: 3, tabulate: 2, stromatoporoid: 1 },
  boulders: { stromatoporoid: 9, tabulate: 6, rugose: 6, bryozoan: 4, crinoid: 2 },
  flats: { tabulate: 2.5, rugose: 0.6, bryozoan: 0.5, crinoid: 0.3 },
  channel: { reed: 3, log: 1.5, rugose: 1, bryozoan: 0.4 },
  escarpment: { rugose: 4, bryozoan: 3, crinoid: 1.5, tabulate: 1 },
  basin: { bryozoan: 0.6, crinoid: 0.1 },
};
