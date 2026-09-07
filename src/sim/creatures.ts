import { ACTIVE_ERA } from '../content';
import type { CreatureId } from '../content/creature-types';
export type { CreatureId, AbilityId, CreatureDef, MoveDef } from '../content/creature-types';

// Shared systems consume only the selected build's roster.
export const CREATURES = ACTIVE_ERA.creatures;
export const CREATURE_IDS = CREATURES.map((c) => c.id);
const byId = new Map(CREATURES.map((c) => [c.id, c]));
export const creature = (id: CreatureId) => byId.get(id)!;
