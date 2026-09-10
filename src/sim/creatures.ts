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
/**
 * Equivalent sizing: the roster at the animals' real relative sizes, offered as a setting.
 *
 * The Cambrian is authored at one size — every animal grows to within a third of every other — so
 * in a game where size decides who eats whom, an Apex Marrella finishes a match the size of an Apex
 * Anomalocaris. Turning this on swaps in lengths derived from what they actually measured
 * (`docs/research/cambrian-sizes.md`, `npm run cambrian:sizes`), keeping the sea the size it is:
 * the largest animal lands exactly where the largest animal is today, and the rest come down to
 * meet it. Speed, health and poise come with the length, so a body of a given length fights exactly
 * as it does now — what changes is which animals *are* that length. The growth ladder changes with
 * it (`tierScale` in ./tiers): everything hatches the same length rather than the same fraction of
 * itself, so the roster starts level and size is earned rather than picked.
 *
 * Every consumer goes through `creature()`, so the swap happens once, here. It is part of the match
 * setup like the era and the seed, not something to change mid-match: `src/sim` has to replay the
 * same way from the same inputs, and body length is an input to almost everything.
 */
const shipped = new Map(CREATURES.map((c) => [c.id, c]));
const resized = new Map(CREATURES.map((c) => {
  const s = ACTIVE_ERA.equivalentSizing?.[c.id];
  return [c.id, s ? { ...c, adultLength: s.adultLength, speed: s.speed, hp: s.hp, poise: s.poise } : c];
}));
let byId = shipped;
/** True when this era offers the option at all. */
export const hasEquivalentSizing = () => !!ACTIVE_ERA.equivalentSizing;
export const equivalentSizing = () => byId === resized;
export function setEquivalentSizing(on: boolean) { byId = on && ACTIVE_ERA.equivalentSizing ? resized : shipped; }
export const creature = (id: CreatureId) => byId.get(id)!;
/**
 * The def as the game ships it, whatever the sizing option is set to.
 *
 * For the one thing that must not move with the option: the selection card's stat bars. Equivalent
 * sizing changes how big an animal is, not how it fights at a given size — speed, health and poise
 * move with the length precisely so a body of a given length is the body it always was — so a bar
 * drawn from the resized numbers would report the size a second time and tell the player Marrella
 * had become slow, when what it has become is small.
 */
export const shippedCreature = (id: CreatureId) => shipped.get(id)!;
/** The animal's own length in centimetres, where the era knows it. */
export const realCm = (id: CreatureId) => ACTIVE_ERA.equivalentSizing?.[id]?.realCm;
