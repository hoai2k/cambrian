/**
 * Sidneyia — articulated attack and feeding pass.
 *
 * Nine pairs of three-jointed walking legs (leg_s_NN_0..2, NN = 00 front … 08 rear) under a
 * broad body, the front four pairs carrying enlarged toothed gnathobases at their bases: the
 * crushing happens at the leg roots, not the feet. So a bite is the front pairs' bases swinging
 * inward together, the heavy is all four crushing pairs clamping in sequence with the body
 * pressing down onto the catch, and eating is the front pairs alternately reaching forward and
 * drawing food back and inward under the head to the mouth. The antennae sweep throughout.
 */
import { ss, arc, hold, UP, DOWN, FWD, BACK } from '../lib.mjs';
import { chain, wave, pad, range, alive, beatPhase } from '../common.mjs';

const SIDES = [1, -1], FRONT = [0, 1, 2, 3];
const leg = (s, i) => range(3).map((k) => `leg_${s}_${pad(i)}_${k}`);
const inward = (s) => [-s, 0, 0], outward = (s) => [s, 0, 0];
const SEG = range(12).map((i) => `segment_${pad(i)}`);
const ANT = (s) => range(12).map((i) => `antenna_${s}_${pad(i)}`);

function trunk(P, t, env, { power = 0, beats = 0, ramp = 0, amp = .16, loopU } = {}) {
  const ph = beatPhase(t, { period: 1.2, beats, ramp, loopU });
  const A = amp * env * (1 + power);
  for (const s of SIDES) for (let i = 0; i < 9; i++) {
    const phase = ph - i * .75 + (s < 0 ? Math.PI : 0);
    for (let k = 0; k < 3; k++) P.bend(`leg_${s}_${pad(i)}_${k}`, FWD, (k === 0 ? .09 : .045) * A * Math.sin(phase));
    if (i > 3) P.bend(`paddle_${s}_${pad(i)}`, FWD, .1 * A * Math.sin(phase + .4));
  }
  for (const s of SIDES) P.bend(`tail_${s}`, UP, .12 * A * Math.sin(ph - 5));
  wave(P, SEG, UP, .025 * A, (loopU === undefined ? ph / 2 : ph), .45);
}
/** A crushing leg: `clamp` swings the base in (the gnathobase bite), `reach` swings the leg forward and down, `draw` pulls it back and in, `brace` plants it. */
function crusher(P, s, i, a) {
  const [l0, l1, l2] = leg(s, i);
  P.bend(l0, inward(s), (a.clamp ?? 0) * .35).bend(l0, DOWN, (a.clamp ?? 0) * .1);
  P.bend(l1, inward(s), (a.clamp ?? 0) * .2).bend(l2, inward(s), (a.clamp ?? 0) * .15);
  P.bend(l0, FWD, (a.reach ?? 0) * .35).bend(l1, FWD, (a.reach ?? 0) * .2).bend(l1, DOWN, (a.reach ?? 0) * .15);
  P.bend(l0, BACK, (a.draw ?? 0) * .3).bend(l0, inward(s), (a.draw ?? 0) * .25).bend(l1, inward(s), (a.draw ?? 0) * .2);
  P.bend(l0, DOWN, (a.brace ?? 0) * .15).bend(l1, DOWN, (a.brace ?? 0) * .12);
}
function antennae(P, k, ph) {
  for (const s of SIDES) ANT(s).forEach((b, i) => P.bend(b, inward(s), .03 * k * Math.sin(ph - i * .4 + (s < 0 ? Math.PI : 0))).bend(b, DOWN, .02 * k * Math.sin(ph - i * .5 - 1)));
}
const head = (P, { noseDown = 0, fwd = 0, down = 0 }) => { P.bend('body', UP, noseDown); if (fwd || down) P.shift('body', [0, -down, fwd]); };
const eyes = (P, k) => { P.bend('eye_1', FWD, .06 * k); P.bend('eye_-1', FWD, .06 * k); };

/**
 * Bones this performance authors. The four crushing leg pairs and the antennae are the performance; the walking legs behind them,
 * the paddles, tail and trunk keep the shipped motion.
 */
export const authored = (n) => /^(leg_-?1_0[0-3]_|antenna_)/.test(n);

export const clips = [
  {
    name: 'Bite', duration: 0.5, loop: false,
    // Gnathobase pinch: the front two crushing pairs swing their bases in and release.
    pose(u, P, t) {
      const A = arc(0, .26, u), S = hold(.14, .3, .4, .86, u);
      for (const s of SIDES) for (const i of FRONT) crusher(P, s, i, { clamp: (i < 2 ? 1.2 : .5) * hold(.14 + i * .03, .3 + i * .03, .4, .86, u), reach: .3 * A * (1 - S), brace: i > 1 ? .4 * S : 0 });
      head(P, { noseDown: .04 * S, fwd: .03 * S }); eyes(P, S);
      antennae(P, 1.0 * alive(u), 2 * Math.PI * u * 2);
      trunk(P, t, alive(u), { amp: .8, power: .9 * S, beats: 1.3, ramp: ss(.1, .55, u) });
    },
  },
  {
    name: 'Heavy', duration: 1.1, loop: false,
    // Crushing clamp: the front pairs spread and lift over the wind-up, the body rises, then it
    // drops onto the catch as all four crushing pairs clamp in one after another from the front.
    pose(u, P, t) {
      const W = hold(0, .3, .36, .5, u), S = hold(.36, .46, .62, .95, u);
      for (const s of SIDES) for (const i of FRONT) {
        const C = hold(.4 + i * .04, .5 + i * .04, .66, .92, u);
        crusher(P, s, i, { clamp: -.5 * W + 1.4 * C, reach: .5 * W, brace: .6 * S });
      }
      head(P, { noseDown: -.02 * W + .1 * S, fwd: -.03 * W + .06 * S, down: -.05 * W + .1 * S }); eyes(P, W + S);
      antennae(P, 1.2 * alive(u), 2 * Math.PI * u * 3);
      trunk(P, t, alive(u), { amp: .9, power: .3 * W + 1.1 * S, beats: 1.8, ramp: ss(.3, .66, u) });
    },
  },
  {
    name: 'Attack', duration: 1.1, loop: false,
    // Reach forward with the front pairs, clamp, and draw the catch back under the head.
    pose(u, P, t) {
      const R = hold(.05, .3, .55, .9, u), C = hold(.3, .4, .64, .9, u), D = hold(.42, .58, .68, .92, u);
      for (const s of SIDES) for (const i of FRONT) crusher(P, s, i, { reach: (1 - i * .2) * R, clamp: 1.1 * C, draw: (1 - i * .15) * D, brace: i > 1 ? .3 * C : 0 });
      head(P, { noseDown: .05 * R, fwd: .04 * R - .02 * D }); eyes(P, R);
      antennae(P, 1.0 * alive(u), 2 * Math.PI * u * 2);
      trunk(P, t, alive(u), { amp: .8, power: .8 * R, beats: 1.5, ramp: ss(.1, .62, u) });
    },
  },
  {
    name: 'Eat', duration: 1.0, loop: true,
    // Scrubbed by consumption progress: the front pairs reach, clamp, draw the food back and in
    // under the head to the mouth and work it there in alternating beats, then release.
    pose(u, P, t) {
      const rel = 1 - ss(.9, 1, u);
      const R = ss(0, .18, u) * rel, G = ss(.17, .28, u) * rel, Cy = ss(.26, .68, u) * rel;
      const chew = hold(.5, .6, .86, .94, u) * rel;
      for (const s of SIDES) for (const i of FRONT) {
        const pulse = Math.sin(2 * Math.PI * 3 * u - i * 1.6 + (s < 0 ? Math.PI : 0));
        crusher(P, s, i, { reach: (1 - i * .2) * R * (1 - .6 * Cy) + .15 * chew * pulse, clamp: 1.0 * G + .25 * chew * pulse, draw: (1 - i * .15) * Cy });
      }
      head(P, { noseDown: .06 * Cy + .01 * chew * Math.sin(2 * Math.PI * 3 * u), fwd: .02 * R - .02 * Cy, down: .03 * Cy });
      antennae(P, .6, 2 * Math.PI * u);
      trunk(P, t, 1, { amp: .45, loopU: u });
    },
  },
];
