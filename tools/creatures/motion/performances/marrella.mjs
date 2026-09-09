/**
 * Marrella — articulated attack and feeding pass.
 *
 * The head carries two long sweeping paddles (paddle_1 at +X, paddle_-1 at -X; one bone each)
 * and a pair of two-jointed antennae; 26 pairs of two-jointed legs (leg_NN_L/R + _tip, L at -X)
 * run under nine independent body plates (body_00..08 are siblings, not a chain). The mouth is
 * under body_01, just behind the paddle roots. So a bite is both paddles sweeping forward and
 * in across the front, the heavy is a crouch and three surges of the legs with the paddles
 * thrusting on each, and eating is the paddles raking in toward the mouth while the front legs
 * work the food and the antennae twitch. The legs never stop.
 */
import { ss, arc, hold, UP, DOWN, FWD, BACK } from '../lib.mjs';
import { pad, range } from '../common.mjs';

const ROWS = [['L', -1], ['R', 1]], SIDES = [1, -1];
const inward = (sx) => [-sx, 0, 0], outward = (sx) => [sx, 0, 0];
const BODY = range(9).map((i) => `body_${pad(i)}`);

function legs(P, t, env, { amp = .16, surge = 0, coil = 0, loopU } = {}) {
  const ph = loopU === undefined ? 2 * Math.PI * t / 1.2 : 2 * Math.PI * loopU;
  for (const [row, sx] of ROWS) for (let i = 0; i < 26; i++) {
    const b = `leg_${pad(i)}_${row}`, tip = `${b}_tip`, phase = ph - i * .5 + (sx < 0 ? Math.PI : 0);
    P.bend(b, FWD, .07 * amp * env * Math.sin(phase) + .22 * coil - .3 * surge * (1 - i * .015));
    P.bend(tip, DOWN, .05 * amp * env * Math.cos(phase + .5) + .15 * coil);
  }
}
function paddles(P, { sweep = 0, lift = 0, rake = 0, thrust = 0 }) {
  for (const s of SIDES) {
    const b = `paddle_${s}`;
    P.bend(b, FWD, .3 * sweep + .25 * thrust).bend(b, inward(s), .4 * sweep + .35 * rake);
    P.bend(b, UP, .3 * lift).bend(b, BACK, .3 * rake).bend(b, DOWN, .15 * rake);
  }
}
function antennae(P, k, ph) {
  for (const s of SIDES) { P.bend(`antenna_${s}`, inward(s), .2 * k * Math.sin(ph + (s < 0 ? Math.PI : 0))); P.bend(`antenna_${s}_tip`, DOWN, .18 * k * Math.sin(ph - .9)); }
}
/** The plates are siblings, so a crouch lowers each and a nod pitches the head plate alone. */
function body(P, { crouch = 0, nod = 0, fwd = 0 }) {
  for (const b of BODY) if (crouch || fwd) P.shift(b, [0, -.06 * crouch, fwd]);
  P.bend('body_00', UP, nod); P.bend('body_01', UP, nod * .5);
}

export const clips = [
  {
    name: 'Bite', duration: 0.5, loop: false,
    // A quick sweep of both paddles forward and inward, and back.
    pose(u, P, t) {
      const A = arc(0, .26, u), S = hold(.14, .3, .4, .86, u);
      paddles(P, { lift: .6 * A * (1 - S), sweep: 1.2 * S });
      body(P, { nod: .05 * S, fwd: .02 * S });
      antennae(P, Math.sin(Math.PI * u) ** 2, 2 * Math.PI * u * 2);
      legs(P, t, Math.sin(Math.PI * u) ** 2);
    },
  },
  {
    name: 'Heavy', duration: 1.1, loop: false,
    // Scuttle rush: the body drops and the legs coil back over the wind-up, then three surges,
    // the legs sweeping back and the paddles thrusting forward on each pulse.
    pose(u, P, t) {
      const W = hold(0, .28, .34, .46, u);
      const pulses = [hold(.34, .4, .46, .54, u), hold(.5, .56, .62, .7, u), hold(.66, .72, .8, .92, u)];
      const S = Math.max(...pulses);
      paddles(P, { lift: .8 * W, thrust: 1.3 * S, sweep: .3 * S });
      body(P, { crouch: 1.0 * W + .5 * hold(.34, .4, .8, .95, u), nod: -.03 * W + .06 * S, fwd: .06 * S });
      antennae(P, Math.sin(Math.PI * u) ** 2 * .5, 2 * Math.PI * u * 3);
      legs(P, t, Math.sin(Math.PI * u) ** 2, { coil: W, surge: S });
    },
  },
  {
    name: 'Attack', duration: 1.1, loop: false,
    // Sweep the paddles forward, close them in, and rake back toward the mouth.
    pose(u, P, t) {
      const R = hold(.05, .3, .55, .9, u), C = hold(.3, .42, .64, .9, u), D = hold(.42, .58, .68, .92, u);
      paddles(P, { lift: .5 * hold(.05, .2, .28, .4, u), sweep: 1.0 * R, rake: 1.0 * D * (1 - .3 * C) });
      body(P, { nod: .05 * R, fwd: .03 * R });
      antennae(P, Math.sin(Math.PI * u) ** 2, 2 * Math.PI * u * 2);
      legs(P, t, Math.sin(Math.PI * u) ** 2);
    },
  },
  {
    name: 'Eat', duration: 1.0, loop: true,
    // Scrubbed by consumption progress: head down, paddles sweep out and rake food in toward the
    // mouth, the front legs work it, antennae twitching; the paddles let go at the end.
    pose(u, P, t) {
      const rel = 1 - ss(.9, 1, u);
      const R = ss(0, .18, u) * rel, G = ss(.17, .28, u) * rel, Cy = ss(.26, .68, u) * rel;
      const chew = hold(.5, .6, .86, .94, u) * rel, pulse = Math.sin(2 * Math.PI * 3 * u);
      paddles(P, { lift: .4 * hold(0, .12, .16, .26, u) * rel, sweep: 1.0 * R * (1 - .5 * Cy) + .1 * chew * pulse, rake: .6 * G + .7 * Cy + .15 * chew * pulse });
      body(P, { nod: .08 * Cy + .02 * chew * pulse, crouch: .3 * Cy });
      for (const [row] of ROWS) for (let i = 0; i < 4; i++) P.bend(`leg_${pad(i)}_${row}`, FWD, .25 * chew * Math.sin(2 * Math.PI * 3 * u - i * 1.2));
      antennae(P, .7, 2 * Math.PI * u * 2);
      legs(P, t, 1, { amp: .12, loopU: u });
    },
  },
];
