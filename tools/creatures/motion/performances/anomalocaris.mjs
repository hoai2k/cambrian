/**
 * Anomalocaris — articulated attack and feeding pass.
 *
 * The frontal appendages are two 14-segment chains (claw_L_00..13, claw_R_00..13) hanging from
 * the head, curled forward and down at rest with their tips a body-width ahead of the mouth,
 * which is on the underside of body_00. A strike is proximal-to-distal: the base segments swing,
 * the distal segments curl a beat later, and the two close on the midline. Feeding folds the
 * chains back under the head so the tips meet at the mouth. The lateral flaps pause for a strike
 * and beat once on the heavy; the tail fan flares on every hard move.
 *
 * Frame: +Z forward, +Y up. claw_L sits at -X, so "in" is +X for L and -X for R.
 */
import { ss, arc, hold, lag, ring, UP, DOWN, FWD, BACK } from '../lib.mjs';
import { chain, wave, whip, pad, range, distal, proximal } from '../common.mjs';

const SIDES = [['L', -1], ['R', 1]];
const claws = (s) => range(14).map((i) => `claw_${s}_${pad(i)}`);
const PROX = (s) => claws(s).slice(0, 6), DIST = (s) => claws(s).slice(6);
const inward = (sx) => [-sx, 0, 0], outward = (sx) => [sx, 0, 0];
const BODY = range(8).map((i) => `body_${pad(i)}`);

/** Flaps and tail kept alive under a one-shot; `beat` is one hard stroke of every flap. */
function trunk(P, u, t, env, { beat = 0, flare = 0, arch = 0, amp = .16, loopU } = {}) {
  const ph = loopU === undefined ? 2 * Math.PI * t / 1.2 : 2 * Math.PI * loopU;
  for (const [s] of SIDES) {
    for (let i = 0; i < 16; i++) {
      const f = `flap_${s}_${pad(i)}`;
      P.bend(f, DOWN, .2 * amp * env * Math.sin(ph - i * .5) + .55 * beat * Math.sin(Math.PI * Math.min(1, Math.max(0, u * 2.2 - i * .04))));
    }
    for (let i = 0; i < 3; i++) P.bend(`tail_${s}_${i}`, UP, .06 * amp * env * Math.sin(ph - 5) + .35 * flare * (1 - i * .2));
  }
  wave(P, BODY.slice(1), UP, .012 * amp * env, (loopU === undefined ? ph / 2 : ph), .5);
  BODY.slice(1, 5).forEach((b, i) => P.bend(b, DOWN, arch * (.06 - i * .01)));
}
/**
 * One appendage: `swing` moves the whole arm forward/back at the base (positive = forward and
 * down, the strike direction), `lift` raises the base segments, `close` folds the chain in
 * toward the midline, `curl` tightens the distal segments under, `open` uncurls and spreads.
 */
function arm(P, s, sx, a) {
  const prox = PROX(s), dist = DIST(s);
  chain(P, prox, FWD, (a.swing ?? 0) * .16, proximal);
  chain(P, prox, DOWN, (a.swing ?? 0) * .1, proximal);
  chain(P, prox, UP, (a.lift ?? 0) * .2, proximal);
  chain(P, prox, BACK, (a.lift ?? 0) * .08, proximal);
  // The base segments point almost straight forward, so a fold is a rotation down and under,
  // past vertical, not a bend "backward" (parallel to the bone, which would do nothing).
  chain(P, prox, DOWN, (a.fold ?? 0) * .32, proximal);
  chain(P, prox, inward(sx), (a.fold ?? 0) * .06);
  chain(P, claws(s), inward(sx), (a.close ?? 0) * .09, (i, n) => .5 + i / n);
  chain(P, dist, DOWN, (a.curl ?? 0) * .17, distal);
  chain(P, dist, inward(sx), (a.curl ?? 0) * .06);
  chain(P, dist, UP, (a.open ?? 0) * .1, distal);
  chain(P, claws(s), outward(sx), (a.open ?? 0) * .05);
  if (a.whip) whip(P, dist, a.whip.env, a.whip.u, { delay: .02, amp: a.whip.amp, dir: UP, dir2: outward(sx), amp2: .5, kill: a.whip.kill ?? 1 });
}
const head = (P, { noseDown = 0, fwd = 0 }) => { P.bend('body_00', UP, noseDown); if (fwd) P.shift('body_00', [0, 0, fwd]); };
const eyes = (P, k) => { P.bend('eye_1', FWD, .08 * k); P.bend('eye_-1', FWD, .08 * k); };

export const clips = [
  {
    name: 'Bite', duration: 0.5, loop: false,
    // Both appendages snap from a loose cocked position to closed in front of the mouth.
    pose(u, P, t) {
      const A = arc(0, .28, u), S = hold(.14, .34, .42, .88, u), env = (x) => hold(.14, .34, .42, .88, x);
      for (const [s, sx] of SIDES) arm(P, s, sx, { open: .5 * A * (1 - S), lift: .25 * A, swing: .55 * S, close: 1.1 * S, curl: .8 * S, whip: { env, u, amp: .3, kill: 1 - ss(.86, 1, u) } });
      head(P, { noseDown: .05 * S, fwd: .04 * S }); eyes(P, S);
      trunk(P, u, t, Math.sin(Math.PI * u) ** 2 * (1 - .8 * S), { flare: .3 * S });
    },
  },
  {
    name: 'Heavy', duration: 1.1, loop: false,
    // Appendages draw back and up over the head — the read — then slam down and inward with the
    // body arching forward and the tail fan flared; long recovery as the arms reopen.
    pose(u, P, t) {
      const W = hold(0, .3, .35, .5, u), S = hold(.35, .48, .6, .95, u), C = hold(.44, .54, .66, .92, u);
      const env = (x) => hold(.35, .48, .6, .95, x);
      for (const [s, sx] of SIDES) arm(P, s, sx, { lift: 1.6 * W, open: .9 * W, swing: 1.3 * S, close: 1.3 * C, curl: 1.1 * C, whip: { env, u, amp: .45, kill: 1 - ss(.86, 1, u) } });
      head(P, { noseDown: -.04 * W + .12 * S, fwd: -.05 * W + .08 * S }); eyes(P, W + S);
      trunk(P, u, t, Math.sin(Math.PI * u) ** 2 * (1 - .7 * S), { beat: hold(.36, .46, .6, .8, u), flare: .5 * S + .2 * W, arch: .8 * S });
    },
  },
  {
    name: 'Attack', duration: 1.1, loop: false,
    // Reach, seize, and pull back toward the mouth before letting go.
    pose(u, P, t) {
      const R = hold(.05, .3, .55, .9, u), O = hold(.05, .22, .28, .4, u), C = hold(.3, .4, .62, .9, u), D = hold(.4, .56, .64, .9, u);
      const env = (x) => hold(.05, .3, .55, .9, x);
      for (const [s, sx] of SIDES) arm(P, s, sx, { swing: .9 * R, open: .8 * O, close: 1.2 * C, curl: .9 * C, fold: .7 * D, whip: { env, u, amp: .3, kill: 1 - ss(.86, 1, u) } });
      head(P, { noseDown: .06 * R, fwd: .05 * R - .02 * D }); eyes(P, R);
      trunk(P, u, t, Math.sin(Math.PI * u) ** 2 * (1 - .6 * R), { flare: .25 * C });
    },
  },
  {
    name: 'Eat', duration: 1.0, loop: true,
    // Scrubbed by consumption progress: reach forward and down, close, fold the chains back under
    // the head so the tips meet at the mouth, work the food there, then let go and return.
    pose(u, P, t) {
      const rel = 1 - ss(.9, 1, u);
      const R = ss(0, .18, u) * rel, O = hold(0, .12, .16, .26, u) * rel, G = ss(.17, .28, u) * rel, Cy = ss(.26, .68, u) * rel;
      const chew = hold(.66, .74, .86, .94, u) * rel, pulse = Math.sin(2 * Math.PI * 4 * (u - .66));
      for (const [s, sx] of SIDES) arm(P, s, sx, { swing: .9 * R - .4 * Cy, open: .8 * O, close: 1.1 * G + .12 * chew * pulse, curl: 1.0 * G + .15 * chew * pulse, fold: 1.0 * Cy,
        whip: { env: (x) => ss(0, .18, x), u, amp: .2, kill: rel } });
      head(P, { noseDown: .1 * Cy + .02 * chew * pulse, fwd: .03 * R - .03 * Cy });
      trunk(P, u, t, 1, { amp: .12, loopU: u });
      wave(P, BODY.slice(1), UP, .006 * chew, 2 * Math.PI * 4 * u, .6);
    },
  },
];
