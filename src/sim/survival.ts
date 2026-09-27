import { TIER_NEED } from './types';

/**
 * Survival's numbers, in one place so they can be tuned and checked together.
 *
 * Survival grows a body with time rather than with meals, and makes it eat to stay alive. Every
 * figure here is priced against the others, so they live side by side: how fast hunger runs down
 * decides what a meal has to be worth, and how long the ladder takes decides what a fight adds.
 */

/** Hunger a body loses per second. Full to empty in four hundred seconds, a shade under seven minutes. */
export const HUNGER_DRAIN = 0.25;

/** Below this the bar warns. A minute and a half of food left at the drain above. */
export const HUNGER_LOW = 25;

/**
 * Seconds of starving it takes to kill a body at full health. Empty is not death on the frame the
 * bar meets zero — the game gives drowning seconds of visibly going under, and starving is the same
 * kind of thing — so an empty stomach eats the body instead, and a meal in time stops it.
 */
export const STARVE_TIME = 20;

/**
 * Seconds from hatching to the top of the ladder on time alone, in every game. A fraction of the
 * whole ladder per second rather than a quantity of nutrition, because the three games keep their
 * ladders in different units — the Cambrian in nutrition per tier, the other two in standing
 * weighted by the animal's rung in the food chain — and a flat rate through either of those made a
 * rung-4 predator in the Devonian or the Triassic take six times as long as a rung-1 snack.
 */
export const SURVIVAL_TOP_SECONDS = 600;

/** The Cambrian's whole ladder in nutrition: every tier's need, hatchling to apex. */
export const CAMBRIAN_LADDER = TIER_NEED.filter(Number.isFinite).reduce((s, n) => s + n, 0);

/**
 * What a hit is worth, as seconds of that same clock, per unit of the hit event's own strength
 * (0.2 to 2, set by the damage done against the victim's size). A good bite on a peer is a few
 * seconds of growing; the same bite on something half as big again is twice that. Strength is
 * used as it is, never floored, so a ping off a shell that did nothing pays nothing.
 */
export const HIT_SECONDS_PEER = 4;
export const HIT_SECONDS_BIGGER = 8;
/** A victim at least this fraction of the attacker's length is a fight worth growing from. */
export const PEER_RATIO = 0.8;
/** ...and one at least this much bigger pays the larger rate. */
export const BIGGER_RATIO = 1.35;

/**
 * Seconds of growing a hit is worth: the hit's strength times the rate for how big the victim is
 * against the attacker, and nothing for something smaller than a peer or for a team-mate. Survival
 * is co-op, and two players trading bites for growth would be farming each other.
 */
export function hitSeconds(strength: number, ratio: number, teamMate: boolean): number {
  if (teamMate || ratio < PEER_RATIO) return 0;
  return Math.max(0, strength) * (ratio >= BIGGER_RATIO ? HIT_SECONDS_BIGGER : HIT_SECONDS_PEER);
}

/** Rungs a death costs in Survival, measured from where on the ladder you stood. Rise charges half. */
export const SURVIVAL_DEATH_COST = 1;

/**
 * Hunger a meal restores, given what the ordinary nutrition formula makes of it.
 *
 * That formula is the square of the size ratio, which is right for growth — a mouthful a third of
 * your length should not grow you much — and wrong for hunger, because it made the prey a hatchling
 * actually meets (a quarter to three fifths of its own length) worth a second or two of food each,
 * so a young animal had to kill every few seconds just to stand still. Hunger is paid on the ratio
 * itself instead, and never less than the growth formula gives, so a big kill is still a big meal.
 */
export function hungerWorth(ratio: number, nutrition: number): number {
  return Math.max(nutrition, 20 * Math.max(0, ratio));
}
