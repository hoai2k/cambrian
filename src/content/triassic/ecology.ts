import type { CreatureId } from '../creature-types';
import type { Biome } from '../../sim/world';

/** The crowds and schools the world keeps around players: pachypleurosaur crowds, needle-fish and coleoid schools, ammonoid drifts. */
export const SNACK_SCHOOLS: { creature: CreatureId; scale: number; count: number }[] = [
  { creature: 'keichousaurus', scale: 0.5, count: 16 }, { creature: 'saurichthys', scale: 0.14, count: 12 },
  { creature: 'phragmoteuthis', scale: 0.4, count: 14 }, { creature: 'ceratites', scale: 0.6, count: 10 },
  { creature: 'mixosaurus', scale: 0.16, count: 10 }, { creature: 'keichousaurus', scale: 0.6, count: 12 },
  { creature: 'birgeria', scale: 0.12, count: 10 }, { creature: 'cartorhynchus', scale: 0.5, count: 8 },
  { creature: 'phragmoteuthis', scale: 0.5, count: 10 }, { creature: 'odontochelys', scale: 0.5, count: 6 },
];

/**
 * The resident giants and where they lair: the first giant in the deep, a nothosaur scaled up to a
 * giant's role in the channels and on the reef, the whorl over the front. The shadow over the light
 * window is a Shonisaurus, which has teeth but is busy with its pod.
 */
export const GIANTS: { creature: CreatureId; scale: number; ground: boolean; biomes: Biome[] }[] = [
  { creature: 'cymbospondylus', scale: 1.0, ground: false, biomes: ['basin', 'escarpment', 'channel'] },
  { creature: 'nothosaurus', scale: 1.3, ground: false, biomes: ['channel', 'boulders'] },
  { creature: 'helicoprion', scale: 1.2, ground: false, biomes: ['escarpment', 'basin'] },
];
