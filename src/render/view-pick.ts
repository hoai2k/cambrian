/**
 * Which bodies get a mesh, as pure decisions (`syncViews` in engine.ts applies them).
 *
 * A body is drawn by apparent size — length over distance — within how far the water lets you
 * see, and everything already on screen gets slack on every threshold so nothing sitting on one is
 * drawn and dropped on alternate frames. Pure so `npm run views` can drive it frame by frame.
 */

import { SHOWN_SLACK, SIZE_FLOOR } from '../shared/view-reach';
export { SIZE_FLOOR };
/** ...and outranks a new body of the same size by this much, so the two do not trade places. */
const SHOWN_RANK = 1.3;
/** Fog density times distance at which exponential fog has hidden 95 % of a body: sqrt(ln 20). */
export const FOG_GONE = Math.sqrt(Math.log(20));
/** Past the head-count cap, this many times the cap are still drawn, at reduced detail. */
export const OVERFLOW = 1.5;
/** The near field is weighted up in the ranking by this much (see `nearAlways` in engine.ts). */
const NEAR_RANK = 3;

/**
 * How far a body can be drawn: where the fog has taken 95 % of it. It was a flat 130 units (90 with
 * three or four players), and the fog thins as the animal you play grows, so playing a big Triassic
 * reptile a seventeen-unit ichthyosaur at 135 was still two thirds through the haze and large on
 * screen when it popped out of existence.
 */
export function drawDistance(fogDensity: number, players: number): number {
  const d = fogDensity > 0 ? FOG_GONE / fogDensity : 130;
  return Math.min(400, Math.max(90, d)) * (players > 2 ? 0.75 : 1);
}

/** Whether a body is a candidate for a mesh this frame. `shown`: it has one already. */
export function drawable(d: number, size: number, seeTo: number, nearAlways: number, shown: boolean, player: boolean): boolean {
  if (player || d < nearAlways) return true;
  const floor = shown ? SIZE_FLOOR * SHOWN_SLACK : SIZE_FLOOR;
  const far = shown ? seeTo / SHOWN_SLACK : seeTo;
  return d < far && size > floor;
}

/** Where a candidate stands in the queue for the head-count cap. Higher is drawn first. */
export const viewRank = (size: number, d: number, nearAlways: number, shown: boolean) =>
  size * (d < nearAlways ? NEAR_RANK : 1) * (shown ? SHOWN_RANK : 1);
