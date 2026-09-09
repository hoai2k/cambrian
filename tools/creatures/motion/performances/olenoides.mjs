/**
 * Olenoides — articulated attack and feeding pass.
 *
 * An armoured trilobite: the cephalon is body_00 and leads every hit, nine independent body
 * plates (body_00..08 are siblings), fifteen pairs of two-jointed legs (leg_NN_L/R + _tip, L at
 * -X), a pair of antennae ahead and a pair of cerci behind. There are no grasping limbs: the
 * head shield butts, the legs drive and brace, and the mouth under body_01 is fed by the front
 * legs working food back and forward beneath the head. A bite is a short head-butt with the
 * legs bracing, the heavy is the body lowering and the legs coiling before a full ramming thrust
 * with the cephalon tilted down, then a skid with the antennae trailing.
 */
import { ss, arc, hold, UP, DOWN, FWD, BACK } from '../lib.mjs';
import { pad, range } from '../common.mjs';

const ROWS = [['L', -1], ['R', 1]], SIDES = [1, -1];
const inward = (sx) => [-sx, 0, 0];
const BODY = range(9).map((i) => `body_${pad(i)}`);

function legs(P, t, env, { amp = .16, coil = 0, drive = 0, brace = 0, loopU } = {}) {
  const ph = loopU === undefined ? 2 * Math.PI * t / 1.2 : 2 * Math.PI * loopU;
  for (const [row, sx] of ROWS) for (let i = 0; i < 15; i++) {
    const b = `leg_${pad(i)}_${row}`, tip = `${b}_tip`, phase = ph - i * .55 + (sx < 0 ? Math.PI : 0);
    P.bend(b, FWD, .08 * amp * env * Math.sin(phase) + .25 * coil - .35 * drive * (1 - i * .02));
    P.bend(tip, DOWN, .06 * amp * env * Math.cos(phase + .5) + .2 * coil + .25 * brace);
    P.bend(b, DOWN, .12 * brace);
  }
}
function feelers(P, { sweep = 0, trail = 0, ph = 0 }) {
  for (const s of SIDES) {
    P.bend(`antenna_${s}`, inward(s), .2 * sweep * Math.sin(ph + (s < 0 ? Math.PI : 0))).bend(`antenna_${s}`, BACK, .35 * trail);
    P.bend(`antenna_${s}_tip`, DOWN, .18 * sweep * Math.sin(ph - .9)).bend(`antenna_${s}_tip`, BACK, .3 * trail);
    P.bend(`cercus_${s}`, UP, .15 * trail).bend(`cercus_${s}_tip`, UP, .1 * trail);
  }
}
/** Plates are siblings: `low` drops them all, `butt` pitches the cephalon down and shoves it forward, `fwd` moves the whole body. */
function body(P, { low = 0, butt = 0, fwd = 0, bob = 0 }) {
  for (const b of BODY) if (low || fwd) P.shift(b, [0, -.07 * low, fwd]);
  P.bend('body_00', UP, .18 * butt + .06 * bob); P.shift('body_00', [0, -.03 * butt, .08 * butt]);
  P.bend('body_01', UP, .06 * butt + .03 * bob);
}

export const clips = [
  {
    name: 'Bite', duration: 0.5, loop: false,
    // A short forward head-butt with the cephalon, the front legs bracing.
    pose(u, P, t) {
      const A = arc(0, .24, u), S = hold(.12, .28, .38, .86, u);
      body(P, { butt: 1.2 * S, fwd: .05 * S - .02 * A });
      feelers(P, { sweep: .5 * A, trail: .4 * S, ph: 2 * Math.PI * u * 2 });
      legs(P, t, Math.sin(Math.PI * u) ** 2, { brace: .8 * S });
    },
  },
  {
    name: 'Heavy', duration: 1.1, loop: false,
    // Shield charge: the body lowers and the legs coil back over the wind-up, then a full-body
    // ramming thrust with the cephalon tilted down and every leg driving; recovery is a skid
    // with the antennae trailing.
    pose(u, P, t) {
      const W = hold(0, .3, .36, .5, u), S = hold(.36, .46, .62, .95, u), skid = hold(.5, .62, .8, 1, u);
      body(P, { low: 1.0 * W + .4 * S, butt: -.2 * W + 1.6 * S, fwd: -.05 * W + .14 * S });
      feelers(P, { sweep: .3 * W, trail: .9 * S + .5 * skid, ph: 2 * Math.PI * u * 3 });
      legs(P, t, Math.sin(Math.PI * u) ** 2 * (1 - .8 * S), { coil: W, drive: S, brace: .5 * skid });
    },
  },
  {
    name: 'Attack', duration: 1.0, loop: false,
    // A shove: the cephalon comes down and forward and the front legs drive it, then it backs off.
    pose(u, P, t) {
      const R = hold(.05, .3, .55, .9, u), D = hold(.36, .5, .6, .9, u);
      body(P, { butt: 1.0 * R, fwd: .08 * R, low: .3 * R });
      feelers(P, { sweep: .4 * (1 - R) * Math.sin(Math.PI * u) ** 2, trail: .6 * D, ph: 2 * Math.PI * u * 2 });
      legs(P, t, Math.sin(Math.PI * u) ** 2 * (1 - .6 * R), { drive: .8 * R, brace: .4 * D });
    },
  },
  {
    name: 'Eat', duration: 1.0, loop: true,
    // Scrubbed by consumption progress: head down over the food, the front legs work it back
    // toward the mouth under the cephalon, which bobs with each pass; the legs let go at the end.
    pose(u, P, t) {
      const rel = 1 - ss(.9, 1, u);
      const R = ss(0, .2, u) * rel, Cy = ss(.24, .66, u) * rel;
      const chew = hold(.45, .55, .86, .94, u) * rel, pulse = Math.sin(2 * Math.PI * 3 * u);
      body(P, { butt: .6 * R + .3 * Cy, bob: .5 * chew * pulse, low: .5 * Cy });
      for (const [row, sx] of ROWS) for (let i = 0; i < 4; i++) {
        const b = `leg_${pad(i)}_${row}`, w = Math.sin(2 * Math.PI * 3 * u - i * 1.3 + (sx < 0 ? Math.PI : 0));
        P.bend(b, FWD, .3 * R * (1 - Cy) + .3 * chew * w).bend(b, inward(sx), .2 * Cy + .15 * chew * w).bend(`${b}_tip`, inward(sx), .25 * Cy + .1 * chew * w);
      }
      feelers(P, { sweep: .6, ph: 2 * Math.PI * u * 2 });
      legs(P, t, 1, { amp: .12, loopU: u });
    },
  },
];
