import type { Biome, FloraKind } from '../../sim/world';

/**
 * The Triassic sea, in the nine shared biome slots (docs/triassic/02-biomes-and-depth.md): gypsum
 * flats at the shore, a conifer estuary, a dasyclad lagoon and sea-lily gardens on the platform, a
 * sponge–coral reef, a shell pavement, the channels through the platform margin, the reef front
 * and a black anoxic basin. Localities are mixed across the period as the other eras mix theirs.
 */
export const BIOME_NAMES: Record<Biome, string> = {
  shallows: 'Gypsum Flats', nursery: 'Conifer Shore', shelf: 'Dasyclad Lagoon', forest: 'Sea-Lily Garden', boulders: 'Sponge-Coral Reef',
  flats: 'Shell Pavement', channel: 'Margin Channels', escarpment: 'Reef Front', basin: 'Black Basin',
};
/** The delivered plates (public/assets/triassic/biomes/, prompts in tools/triassic/environment-image-prompts.json) are named for the biomes, not the slots. */
export const BIOME_PLATES: Record<Biome, string> = {
  shallows: 'gypsum-flats', nursery: 'conifer-shore', shelf: 'dasyclad-lagoon', forest: 'sea-lily-garden', boulders: 'sponge-coral-reef',
  flats: 'shell-pavement', channel: 'margin-channels', escarpment: 'reef-front', basin: 'black-basin',
};
export const BIOME_DANGER: Record<Biome, number> = {
  shallows: 0.08, nursery: 0.05, shelf: 0.35, forest: 0.42, boulders: 0.50, flats: 0.30, channel: 0.70, escarpment: 0.80, basin: 0.92,
};
/** Milk-turquoise over the flats, silt-olive at the estuary, clear blue on the reef, near-black in the basin. */
export const ATMOS: Record<Biome, { fog: string; density: number; sky: number; sun: number; sand: string }> = {
  shallows: { fog: '#5fbfb0', density: 0.70, sky: 2.6, sun: 4.0, sand: '#e9e2cf' },
  nursery: { fog: '#6a7f55', density: 1.20, sky: 1.5, sun: 2.6, sand: '#a8785a' },
  shelf: { fog: '#3aa39a', density: 0.85, sky: 2.2, sun: 3.6, sand: '#dcd3b3' },
  forest: { fog: '#2d8a86', density: 0.95, sky: 1.9, sun: 3.2, sand: '#c9bfa2' },
  boulders: { fog: '#2b7f8e', density: 0.90, sky: 2.0, sun: 3.4, sand: '#cfc4a8' },
  flats: { fog: '#46a8a0', density: 0.80, sky: 2.3, sun: 3.8, sand: '#e0d9c0' },
  channel: { fog: '#124a5a', density: 1.15, sky: 1.3, sun: 2.3, sand: '#8b8f86' },
  escarpment: { fog: '#0d3b4c', density: 1.25, sky: 1.1, sun: 1.9, sand: '#6f7570' },
  basin: { fog: '#04121c', density: 1.60, sky: 0.6, sun: 1.1, sand: '#2b3136' },
};
export const SAND_COLORS: Record<Biome, string> = Object.fromEntries(Object.entries(ATMOS).map(([k, v]) => [k, v.sand])) as Record<Biome, string>;

/**
 * The water surface, and the floor under it. The shelf floor sits at zero as in the other eras and
 * the surface 30 above it, which is the lagoon's depth; everything else is a target depth per biome
 * that `sampleHeight` blends by the biome weights. The flats are too thin for a giant, the basin is
 * three lagoons deep, and the climb for air is what a biome costs (docs/triassic/02-biomes-and-depth.md).
 */
export const SURFACE_Y = 30;
export const FLOOR_DEPTH: Record<Biome, number> = {
  shallows: 10, nursery: 13, shelf: 30, forest: 32, boulders: 24, flats: 34, channel: 46, escarpment: 52, basin: 88,
};

/**
 * Base colours of the stand-in kinds until the Triassic props land (docs/triassic/03-image-and-
 * model-requests.md): the Devonian's procedural kinds re-tinted to what stands in for what —
 * `crinoid` is Encrinus, `lilyColumn` the Traumatocrinus log-raft stems, `tabulate` a Thecosmilia
 * bush, `rugose` a calcisponge column, `bryozoan` a Diplopora tuft, `stromatoporoid` a sponge
 * mound, `reed` a horsetail stand, `frondTower` a Voltzia, `log` a drift trunk. The Cambrian keys
 * stay so anything ever placed here still has a colour.
 */
export const FLORA_BASE: Record<string, string> = {
  crinoid: '#b9ad8a', lilyColumn: '#a89c7c', tabulate: '#c98a6a', rugose: '#d9cfae', bryozoan: '#7fa66a', stromatoporoid: '#c9b99a',
  reed: '#6f8a3e', frondTower: '#4f6b3a', log: '#6a4a2e',
  vauxia: '#9c8f72', sac: '#a89a80', choia: '#8f8a6a', thalli: '#6b6a3a', tuft: '#5e7a45',
};
/**
 * Plants per 144 square units of each biome, on the shared table's scale. Diplopora carpets the
 * lagoon, sea lilies the garden, the reef is coral bushes and sponge columns with mounds between,
 * the pavement is bare shell, the flats have almost nothing, and the basin's only growth hangs
 * from the rafts overhead.
 */
export const FLORA_DENSITY: Record<Biome, Partial<Record<FloraKind, number>>> = {
  shallows: { stromatoporoid: 4, bryozoan: 1.5, log: 0.4 },
  nursery: { reed: 24, frondTower: 3, log: 5, bryozoan: 6, crinoid: 2 },
  shelf: { bryozoan: 22, crinoid: 2, tabulate: 0.6, rugose: 0.5, log: 0.3 },
  forest: { crinoid: 28, bryozoan: 4, tabulate: 1.2, rugose: 1.5, lilyColumn: 1.5 },
  boulders: { tabulate: 9, rugose: 7, stromatoporoid: 3, bryozoan: 2, crinoid: 1 },
  flats: { bryozoan: 3, crinoid: 0.4, tabulate: 0.3 },
  channel: { rugose: 1.2, tabulate: 0.8, bryozoan: 0.5, log: 1 },
  escarpment: { tabulate: 3, rugose: 3, lilyColumn: 2.5, crinoid: 1 },
  basin: { lilyColumn: 0.6, log: 0.3 },
};
/** No authored Triassic scenery yet: every kind keeps the procedural geometry `src/render/sea.ts` builds. */
export const FLORA_PROPS: Partial<Record<FloraKind, string>> = {};
