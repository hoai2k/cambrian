/**
 * Nectocaris — articulated attack and feeding pass.
 *
 * Two eight-segment grasping tentacles (tentacle_1_00..07 at +X, tentacle_-1_00..07 at -X) spring
 * from the head just ahead of the mouth, which sits between their bases. Everything here is a
 * wave that runs from base to tip: the base swings, each segment follows the one before it, and
 * the tips curl last. Feeding wraps the tips around the catch and folds the tentacles back on
 * themselves so the wrapped tips arrive at the mouth at their own bases. The lateral fin ripples
 * along the body under all of it. Included for the grasping appendages the game gives it, not as
 * a claim that it was a cephalopod.
 */
import { ss, arc, hold, ring, UP, DOWN, FWD, BACK } from '../lib.mjs';
import { chain, wave, whip, pad, range, distal, proximal } from '../common.mjs';

const SIDES = [1, -1];
const tent = (s) => range(8).map((i) => `tentacle_${s}_${pad(i)}`);
const inward = (s) => [-s, 0, 0], outward = (s) => [s, 0, 0];
const BODY = range(12).map((i) => `body_${pad(i)}`);

function fins(P, t, env, amp = .16, loopU) {
  const ph = loopU === undefined ? 2 * Math.PI * t / 1.2 : 2 * Math.PI * loopU;
  for (const s of SIDES) for (let i = 0; i < 12; i++) P.bend(`fin_${s}_${pad(i)}`, DOWN, .22 * amp * env * Math.sin(ph - i * .55));
  wave(P, BODY, UP, .01 * amp * env, (loopU === undefined ? ph / 2 : ph), .45);
}
/**
 * `reach` extends the tentacle forward (uncurls it), `spread` opens the pair, `sweep` swings the
 * whole tentacle in toward the midline with a base-to-tip delay, `wrap` curls the distal half in
 * and under around a catch, `fold` bends the base back so the tip comes home to the mouth.
 */
function tentacle(P, s, a, u) {
  const names = tent(s), prox = names.slice(0, 4), dist = names.slice(4);
  chain(P, names, UP, (a.reach ?? 0) * .04, distal);
  chain(P, prox, outward(s), (a.spread ?? 0) * .14, proximal);
  chain(P, prox, UP, (a.spread ?? 0) * .05);
  if (a.sweep) names.forEach((b, i) => P.bend(b, inward(s), .12 * a.sweep(i)));
  chain(P, dist, inward(s), (a.wrapIn ?? (a.wrap ?? 0)) * .1, distal);
  chain(P, dist, DOWN, (a.wrap ?? 0) * .45, distal);
  // Fold = the whole tentacle coils down and under (a bend on every segment: the lever arms near
  // the tip are short, so a coil that brings the tip home needs most of its angle early on).
  chain(P, names, DOWN, (a.fold ?? 0) * .3);
  chain(P, prox, inward(s), (a.foldIn ?? 0) * .08);
  if (a.whip) whip(P, dist, a.whip.env, u, { delay: .025, amp: a.whip.amp, dir: UP, dir2: outward(s), amp2: .6, kill: a.whip.kill ?? 1 });
}
const head = (P, { noseDown = 0, fwd = 0 }) => { P.bend('body', UP, noseDown); if (fwd) P.shift('body', [0, 0, fwd]); };
const eyes = (P, k) => { P.bend('eye_1', FWD, .08 * k); P.bend('eye_-1', FWD, .08 * k); };
/** A sweep whose segments arrive one after another. */
const delayed = (env, u, per = .03) => (i) => env(u - per * i);

export const clips = [
  {
    name: 'Bite', duration: 0.5, loop: false,
    // A pinch: both tentacles whip inward, tips curling, and spring back.
    pose(u, P, t) {
      const A = arc(0, .26, u), env = (x) => hold(.14, .32, .4, .86, x), S = env(u);
      for (const s of SIDES) tentacle(P, s, { spread: .5 * A * (1 - S), reach: .4 * A, sweep: (i) => 1.1 * env(u - .025 * i) * (1 - ss(.86, 1, u)), wrap: .7 * S, whip: { env, amp: .3, kill: 1 - ss(.86, 1, u) } }, u);
      head(P, { noseDown: .04 * S, fwd: .03 * S }); eyes(P, S);
      fins(P, t, Math.sin(Math.PI * u) ** 2);
    },
  },
  {
    name: 'Heavy', duration: 1.1, loop: false,
    // Paired seize: the tentacles spread wide and back over a long wind-up, then sweep in from
    // both sides base-first and wrap; the wrap is held through the recovery before releasing.
    pose(u, P, t) {
      const W = hold(0, .3, .36, .5, u), env = (x) => hold(.36, .48, .62, .95, x), S = env(u), C = hold(.44, .54, .7, .95, u);
      for (const s of SIDES) tentacle(P, s, { spread: 1.4 * W, reach: .6 * W, sweep: (i) => 1.5 * env(u - .03 * i) * (1 - ss(.86, 1, u)), wrap: 1.3 * C, foldIn: .5 * C, whip: { env, amp: .5, kill: 1 - ss(.86, 1, u) } }, u);
      head(P, { noseDown: -.03 * W + .08 * S, fwd: -.04 * W + .07 * S }); eyes(P, W + S);
      fins(P, t, Math.sin(Math.PI * u) ** 2, .16 + .4 * S);
    },
  },
  {
    name: 'Attack', duration: 1.0, loop: false,
    // Reach out, wrap, and draw the catch back toward the mouth before letting go.
    pose(u, P, t) {
      const env = (x) => hold(.05, .3, .55, .9, x), R = env(u), C = hold(.3, .4, .64, .9, u), D = hold(.42, .58, .66, .9, u);
      for (const s of SIDES) tentacle(P, s, { reach: 1.2 * R, spread: .4 * hold(.05, .2, .28, .4, u), sweep: (i) => .9 * hold(.3, .4, .64, .9, u - .02 * i) * (1 - ss(.86, 1, u)), wrap: 1.1 * C, fold: .5 * D, foldIn: .6 * D, whip: { env, amp: .3, kill: 1 - ss(.86, 1, u) } }, u);
      head(P, { noseDown: .05 * R, fwd: .04 * R }); eyes(P, R);
      fins(P, t, Math.sin(Math.PI * u) ** 2);
    },
  },
  {
    name: 'Eat', duration: 1.0, loop: true,
    // Scrubbed by consumption progress: reach forward and down, wrap, fold the tentacles back so
    // the wrapped tips arrive at the mouth between their bases, hold and work, then release.
    pose(u, P, t) {
      const rel = 1 - ss(.9, 1, u);
      const R = ss(0, .18, u) * rel, G = ss(.17, .28, u) * rel, Cy = ss(.26, .68, u) * rel;
      const chew = hold(.66, .74, .86, .94, u) * rel, pulse = Math.sin(2 * Math.PI * 4 * (u - .66));
      for (const s of SIDES) tentacle(P, s, { reach: 1.2 * R - .6 * Cy, spread: .4 * hold(0, .12, .16, .26, u) * rel, sweep: (i) => .4 * G * (1 - Cy), wrap: 1.0 * G + .15 * chew * pulse, wrapIn: .4 * G * (1 - Cy), fold: 1.3 * Cy, whip: { env: (x) => ss(0, .18, x), amp: .2, kill: rel } }, u);
      for (const s of SIDES) chain(P, tent(s).slice(0, 4), DOWN, .1 * R * (1 - Cy));
      head(P, { noseDown: .07 * Cy + .015 * chew * pulse, fwd: .03 * R - .02 * Cy });
      fins(P, t, 1, .12, u);
    },
  },
];
