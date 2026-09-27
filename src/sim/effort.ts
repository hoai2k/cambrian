import type { Actor, Mode } from './types';

/**
 * How fast health comes back out of the fight, in every mode.
 *
 * Stamina prices effort as it always did; health recovery is its own thing, paused while a body
 * sprints or dashes (`stepUpkeep` in game.ts) and quicker beside a plant, because cover is
 * somewhere to get better. Survival heals at half the rate, since health is what that mode is about.
 */

/** Share of full health recovered per second out of the fight, for a player or a bot. */
export const HEAL_PLAYER = 0.035;
/** ...and for everything else in the sea. */
export const HEAL_WILD = 0.02;
/** Survival heals at this share of those rates. */
export const SURVIVAL_HEAL = 0.5;
/** Beside a plant the recovery runs this many times faster. */
export const PLANT_HEAL = 2;

export const healRate = (a: Actor, mode: Mode) =>
  (a.controller === 'player' || a.controller === 'bot' ? HEAL_PLAYER : HEAL_WILD) * (mode === 'survival' ? SURVIVAL_HEAL : 1);
