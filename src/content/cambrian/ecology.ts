import type { CreatureId } from '../creature-types';
import type { Biome } from '../../sim/world';

export const SNACK_SCHOOLS: { creature: CreatureId; scale: number; count: number }[] = [
  // first eight live in the nursery the players hatch in: swimmer and ground schools
  { creature: 'waptia', scale: 0.085, count: 16 }, { creature: 'canadia', scale: 0.09, count: 12 },
  { creature: 'waptia', scale: 0.09, count: 14 }, { creature: 'opabinia', scale: 0.09, count: 10 },
  { creature: 'marrella', scale: 0.085, count: 14 }, { creature: 'olenoides', scale: 0.075, count: 12 },
  { creature: 'hallucigenia', scale: 0.085, count: 10 }, { creature: 'marrella', scale: 0.08, count: 14 },
  // open reef
  { creature: 'pikaia', scale: 0.1, count: 12 }, { creature: 'ctenorhabdotus', scale: 0.095, count: 10 },
  { creature: 'odontogriphus', scale: 0.08, count: 10 }, { creature: 'odaraia', scale: 0.09, count: 12 },
  { creature: 'isoxys', scale: 0.16, count: 8 }, { creature: 'leanchoilia', scale: 0.15, count: 8 },
  { creature: 'vetulicola', scale: 0.17, count: 7 }, { creature: 'ottoia', scale: 0.14, count: 8 },
];

/** The resident giants and the biomes they lair in. */
export const GIANTS: { creature: CreatureId; scale: number; ground: boolean; biomes: Biome[] }[] = [
  { creature: 'anomalocaris', scale: 3.5, ground: false, biomes: ['channel', 'basin', 'escarpment'] },
  { creature: 'olenoides', scale: 3.0, ground: true, biomes: ['boulders', 'escarpment'] },
  { creature: 'opabinia', scale: 2.8, ground: false, biomes: ['forest', 'shelf'] },
];

