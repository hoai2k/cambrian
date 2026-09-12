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
 * The roster plays at the animals' natural sizes; *Equivalent sizing* is the option that flattens
 * them back.
 *
 * The Cambrian was authored at one size — every animal growing to within a third of every other —
 * so in a game where size decides who eats whom, an Apex Marrella finished a match the size of an
 * Apex Anomalocaris. It now plays at lengths derived from what the animals actually measured
 * (`docs/research/cambrian-sizes.md`, `npm run cambrian:sizes`), spread either side of the size the
 * sea already held: an Apex Anomalocaris stands clear of the reef at 14.8 units, an adult Marrella
 * lives among the stalks. Speed, health and poise come with the length, so a body of a given length
 * fights exactly as it always did — what changed is which animals *are* that length — and the
 * growth ladder comes with it too (`tierScale` in ./tiers): everything hatches the same length
 * rather than the same fraction of itself, so the roster starts level and size is earned rather
 * than picked.
 *
 * Turning the option on puts the authored lengths in `creatures.ts` back, for comparison. An era
 * with no `naturalSizes` table — the Devonian, already generated from real lengths — is unaffected
 * either way, and does not offer the setting.
 *
 * Every consumer goes through `creature()`, so the swap happens once, here. It is part of the match
 * setup like the era and the seed, not something to change mid-match: `src/sim` has to replay the
 * same way from the same inputs, and body length is an input to almost everything.
 */
const flat = new Map(CREATURES.map((c) => [c.id, c]));
const natural = new Map(CREATURES.map((c) => {
  const s = ACTIVE_ERA.naturalSizes?.[c.id];
  return [c.id, s ? { ...c, adultLength: s.adultLength, speed: s.speed, hp: s.hp, poise: s.poise } : c];
}));
let byId = natural;
/** True when this era has natural sizes to turn off, and so offers the option at all. */
export const hasEquivalentSizing = () => !!ACTIVE_ERA.naturalSizes;
/** True when the option is on: the roster has been flattened back to one size. */
export const equivalentSizing = () => byId === flat;
/**
 * True when the lengths in play are this roster's *own*, spread over the real animals' proportions.
 *
 * Not simply the opposite of `equivalentSizing`: an era with no table of its own — the Devonian,
 * whose `creatures.ts` is already generated from real lengths — has nothing to swap either way, and
 * everything keyed off this must leave it exactly as it was. This is the question to ask before
 * treating scale and length as different things.
 */
export const naturalSizing = () => !!ACTIVE_ERA.naturalSizes && byId === natural;
export function setEquivalentSizing(on: boolean) { byId = on ? flat : natural; }
/**
 * The def as it is authored in `creatures.ts`, whatever the sizing option is set to.
 *
 * For the one thing that must not move with the option: the selection card's stat bars. Sizing
 * changes how big an animal is, not how it fights at a given size — speed, health and poise move
 * with the length precisely so a body of a given length is the body it always was — so a bar drawn
 * from the resized numbers would report the size a second time and tell the player Marrella was
 * slow, when what it is is small.
 */
export const authoredCreature = (id: CreatureId) => flat.get(id)!;
/** The animal's own length in centimetres, where the era knows it. */
export const realCm = (id: CreatureId) => ACTIVE_ERA.naturalSizes?.[id]?.realCm;
export const creature = (id: CreatureId) => byId.get(id)!;
