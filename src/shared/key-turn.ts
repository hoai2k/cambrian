/**
 * How hard a held turn key turns, by how long it has been held.
 *
 * A and D used to be the stick pushed all the way over from the first frame, so the shortest tap a
 * hand can make swung the body most of the way round and past whatever it was meant to face. A key
 * has no "a little", so time stands in for it: a tap is a nudge (`TURN_TAP` of a full push), and
 * the push grows to full over `TURN_RAMP` seconds of holding — a held key still turns as hard as it
 * always did, it just gets there rather than starting there.
 *
 * Pure, so `npm run key-turn` holds it.
 */

/** The share of a full turn a key gives the moment it goes down. */
export const TURN_TAP = 0.22;
/** Seconds of holding to reach a full turn. */
export const TURN_RAMP = 0.5;

/** The turn axis's size for a key held this many seconds (0 when it is not held). */
export function turnAxis(held: number): number {
  if (!(held >= 0)) return 0;
  const k = Math.min(1, held / TURN_RAMP);
  return TURN_TAP + (1 - TURN_TAP) * k * k * (3 - 2 * k);
}
