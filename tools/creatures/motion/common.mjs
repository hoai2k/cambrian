/** Helpers shared by the performance files: chains, waves, whip lag, index padding. */
import { lag, ss } from './lib.mjs';
export const pad = (i) => String(i).padStart(2, '0');
export const range = (n) => Array.from({ length: n }, (_, i) => i);
/** Bend every bone of a chain toward `dir`, `perSeg * profile(i, n)` each; angles accumulate down the chain. */
export function chain(P, names, dir, perSeg, profile = () => 1) {
  if (!perSeg) return;
  names.forEach((b, i) => P.bend(b, dir, perSeg * profile(i, names.length)));
}
/** A travelling sine wave along a chain (metachronal beat, undulation). */
export function wave(P, names, dir, amp, phase, step = .5, from = 0) {
  if (!amp) return;
  names.forEach((b, i) => P.bend(b, dir, amp * Math.sin(phase - (i + from) * step)));
}
/**
 * Passive whip: each segment bends by the lagged velocity of `env`, so the distal part moves
 * after the proximal one and against the direction of travel, then rings down. `kill` must reach
 * zero before a one-shot ends, since a lagged envelope is still moving after its parent stops.
 */
export function whip(P, names, env, u, { delay = .03, width = .08, amp = .4, dir, dir2, amp2 = 0, kill = 1, taper = 1 }) {
  names.forEach((b, k) => {
    const v = lag(env, u, delay * k, width) * amp * kill * (1 - taper * k / (names.length + 2));
    P.bend(b, dir, v); if (dir2) P.bend(b, dir2, v * amp2);
  });
}
/** Profiles for `chain`: weight toward the tip, toward the root, or the middle. */
export const distal = (i, n) => .4 + .6 * i / (n - 1);
export const proximal = (i, n) => 1 - .6 * i / (n - 1);
export const mid = (i, n) => Math.sin(Math.PI * (i + .5) / n);

/**
 * Locomotor envelope for a one-shot: full amplitude all the way across, tapering only in the
 * first and last few frames, where the clip has to meet the rest pose. Use it instead of a sine
 * hump — a hump is smallest exactly where an attack needs the body driving hardest — and never
 * scale it down during a strike. Fins, flaps and leg trains carry the attack; they do not pause
 * for it.
 */
export const alive = (u, rise = .07, fall = .12) => ss(0, rise, u) * (1 - ss(1 - fall, 1, u));

/**
 * Phase for a travelling wave through a strike: the cruising rate plus `beats` extra cycles
 * pushed through while `ramp` runs from 0 to 1, so the appendage train visibly powers up into
 * the contact and rides out the recovery. `loopU` (a loop's normalized time) overrides both, so
 * a looping clip still closes on itself.
 */
export const beatPhase = (t, { period = 1.2, beats = 0, ramp = 0, loopU } = {}) =>
  loopU === undefined ? 2 * Math.PI * (t / period + beats * ramp) : 2 * Math.PI * loopU;
