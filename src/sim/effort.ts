import type { Actor, Mode } from './types';

/**
 * How fast health comes back out of the fight, in every mode.
 *
 * Stamina prices effort as it always did; health recovery is its own thing, paused while a body
 * sprints or dashes (`stepUpkeep` in game.ts) and quicker beside a plant, because cover is
 * somewhere to get better. Survival heals at half the rate, since health is what that mode is about.
 */

/** Share of full health recovered per second out of the fight, for a player. */
export const HEAL_PLAYER = 0.035;
/** ...and for everything else in the sea. */
export const HEAL_WILD = 0.02;
/** Survival heals at this share of those rates. */
export const SURVIVAL_HEAL = 0.5;
/** Beside a plant the recovery runs this many times faster. */
export const PLANT_HEAL = 2;

export const healRate = (a: Actor, mode: Mode) =>
  (a.controller === 'player' ? HEAL_PLAYER : HEAL_WILD) * (mode === 'survival' ? SURVIVAL_HEAL : 1);

/**
 * A steered body's dash (a player's) costs this many times its base price: doubled, so
 * the dash is a decision rather than a way of getting about, and its invulnerability is paid for.
 */
export const DASH_STAMINA_MULT = 2;

/**
 * The sea's own animals get **one** escape, and it takes everything. A wild body may only dodge or
 * dash on a bar at least this full, and doing it empties the bar — so it cannot chain escapes, and
 * after the one it has it is spent and cannot sprint either until it has got its breath back.
 */
export const WILD_ESCAPE_READY = 0.95;
export const steered = (a: Actor) => a.controller === 'player';
/** Whether a wild body has the escape in it right now. Steered bodies are priced per dash instead. */
export const escapeReady = (a: Actor) => steered(a) || a.stamina >= a.staminaMax * WILD_ESCAPE_READY;
