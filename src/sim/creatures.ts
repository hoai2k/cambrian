import { ACTIVE_ERA } from '../content';
import type { CreatureId } from '../content/creature-types';
export type { CreatureId, AbilityId, CreatureDef, MoveDef } from '../content/creature-types';

// Shared systems consume only the selected build's roster.
export const CREATURES = ACTIVE_ERA.creatures;
export const CREATURE_IDS = CREATURES.map((c) => c.id);
/**
 * The creatures a player may pick. An era whose models arrive in batches lets the rest of the
 * roster borrow a delivered body in the world (ACTIVE_ERA.assets.standIns), but a borrowed body
 * has no portrait of its own, so those creatures stay off the selection screen until their own
 * model lands. Ecology, bots and the simulation still use the whole roster.
 */
export const PLAYABLE = CREATURES.filter((c) => !ACTIVE_ERA.assets.standIns?.[c.id]);
export const PLAYABLE_IDS = PLAYABLE.map((c) => c.id);
const byId = new Map(CREATURES.map((c) => [c.id, c]));
export const creature = (id: CreatureId) => byId.get(id)!;
