import type { CreatureId } from '../creature-types';
import type { Biome } from '../../sim/world';

/** Young of the shoaling fishes and small floor animals, as the snack schools the world keeps around players. */
export const SNACK_SCHOOLS: { creature: CreatureId; scale: number; count: number }[] = [
  { creature: 'cheirolepis', scale: 0.12, count: 16 }, { creature: 'doryaspis', scale: 0.12, count: 12 },
  { creature: 'nahecaris', scale: 0.3, count: 14 }, { creature: 'eldredgeops', scale: 0.28, count: 10 },
  { creature: 'cheirolepis', scale: 0.14, count: 14 }, { creature: 'palaeoisopus', scale: 0.28, count: 10 },
  { creature: 'coccosteus', scale: 0.1, count: 8 }, { creature: 'manticoceras', scale: 0.3, count: 10 },
  { creature: 'cheirolepis', scale: 0.16, count: 12 }, { creature: 'michelinoceras', scale: 0.12, count: 8 },
  { creature: 'acanthostega', scale: 0.12, count: 8 }, { creature: 'gemuendina', scale: 0.1, count: 8 },
];

/**
 * The resident giants and where they lair. Dunkleosteus is the apex; Onychodus and Jaekelopterus are
 * rung III animals scaled up to giant roles so the chain has a middle-weight threat in the reef and on
 * the floor; the shadow over the light window is the harmless Titanichthys.
 */
export const GIANTS: { creature: CreatureId; scale: number; ground: boolean; biomes: Biome[] }[] = [
  { creature: 'dunkleosteus', scale: 1.0, ground: false, biomes: ['basin', 'escarpment', 'channel'] },
  { creature: 'onychodus', scale: 1.3, ground: false, biomes: ['escarpment', 'boulders'] },
  { creature: 'jaekelopterus', scale: 1.4, ground: true, biomes: ['channel', 'shelf'] },
];
