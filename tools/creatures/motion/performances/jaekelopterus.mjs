/**
 * Jaekelopterus — articulated attack and feeding pass (Devonian sea scorpion).
 *
 * Two three-jointed chelicerae (cheliceraL0..2 + fingerL at +X, R at -X) reach forward and out
 * from under the carapace; the finger is the movable jaw of each pincer and closes back against
 * the fixed one. The mouth is on the underside between their bases, with a pair of gnathobases
 * beside it. Four pairs of three-jointed walking legs (legS{0..3}_{0..2}), a pair of three-part
 * swimming paddles and twelve trunk rings ending in the telson do the rest. Every strike is a
 * jointed preparation — draw back, open — a directed reach with the pincers closing at the
 * moment of contact, then recoil and recovery, with the legs bracing and the paddles beating
 * once. Feeding brings the closed pincers back and down to the mouth, where the gnathobases work.
 */
import { ss, arc, hold, UP, DOWN, FWD, BACK } from '../lib.mjs';
import { chain, wave, pad, range } from '../common.mjs';

const SIDES = [['L', 1], ['R', -1]];
const inward = (sx) => [-sx, 0, 0], outward = (sx) => [sx, 0, 0];
const SEG = range(12).map((i) => `segment${pad(i)}`);

function trunk(P, t, env, { beat = 0, brace = 0, amp = .16, loopU } = {}) {
  const ph = loopU === undefined ? 2 * Math.PI * t / 1.2 : 2 * Math.PI * loopU;
  for (const [s, sx] of SIDES) {
    for (let l = 0; l < 4; l++) for (let k = 0; k < 3; k++) {
      const b = `leg${s}${l}_${k}`, phase = ph - l * .8 + (sx < 0 ? Math.PI : 0);
      P.bend(b, FWD, (k ? .03 : .06) * amp * env * Math.sin(phase)).bend(b, DOWN, (k ? .1 : .06) * brace);
    }
    for (let k = 0; k < 3; k++) P.bend(`paddle${s}${k}`, DOWN, .06 * amp * env * Math.sin(ph - 1) + .5 * beat * (1 - k * .2)).bend(`paddle${s}${k}`, BACK, .3 * beat);
  }
  wave(P, SEG, UP, .008 * amp * env, (loopU === undefined ? ph / 2 : ph), .45);
  P.bend('telson', UP, .05 * amp * env * Math.sin(ph - 5) + .2 * beat);
}
/** One pincer: `draw` pulls the whole limb back and out, `reach` swings it forward and in, `open` lifts the finger, `close` clamps it, `fold` brings the pincer down and back to the mouth. */
function pincer(P, s, sx, a) {
  const c = [0, 1, 2].map((i) => `chelicera${s}${i}`), f = `finger${s}`;
  chain(P, c.slice(0, 2), BACK, (a.draw ?? 0) * .3); chain(P, c.slice(0, 2), outward(sx), (a.draw ?? 0) * .2); P.bend(c[0], UP, (a.draw ?? 0) * .15);
  chain(P, c.slice(0, 2), FWD, (a.reach ?? 0) * .3); chain(P, c, inward(sx), (a.reach ?? 0) * .15); P.bend(c[0], DOWN, (a.reach ?? 0) * .1);
  P.bend(f, outward(sx), (a.open ?? 0) * .7).bend(f, UP, (a.open ?? 0) * .1);
  P.bend(f, inward(sx), (a.close ?? 0) * .35); P.bend(c[2], inward(sx), (a.close ?? 0) * .15);
  chain(P, c.slice(0, 2), DOWN, (a.fold ?? 0) * .35); chain(P, c.slice(0, 2), BACK, (a.fold ?? 0) * .3); chain(P, c.slice(0, 2), inward(sx), (a.fold ?? 0) * .3);
}
const gnath = (P, k) => { for (const [s, sx] of SIDES) P.bend(`gnathobase${s}`, inward(sx), .3 * k); };
const body = (P, { noseDown = 0, fwd = 0, down = 0 }) => { P.spin('body', [1, 0, 0], noseDown); if (fwd || down) P.shift('body', [0, -down, fwd]); };

/**
 * Bones this performance authors. The chelicerae and gnathobases are the performance; the walking legs, paddles and trunk keep the
 * shipped motion.
 */
export const authored = (n) => /^(chelicera|finger|gnathobase)/.test(n);

export const clips = [
  {
    name: 'Bite', duration: 0.5, loop: false,
    // A quick pincer snap: fingers open on the way forward and clamp shut, the limbs recoil.
    pose(u, P, t) {
      const A = arc(0, .28, u), S = hold(.14, .3, .42, .86, u), C = hold(.22, .32, .46, .86, u);
      for (const [s, sx] of SIDES) pincer(P, s, sx, { open: .9 * A * (1 - C), reach: .8 * S, close: 1.0 * C });
      body(P, { noseDown: .03 * S, fwd: .03 * S });
      trunk(P, t, Math.sin(Math.PI * u) ** 2, { brace: .5 * S });
    },
  },
  {
    name: 'Heavy', duration: 1.1, loop: false,
    // Chelicerae grab: the pincers draw back and open wide over a long wind-up while the body
    // sets itself, then both reach forward and clamp at contact with one beat of the paddles,
    // hold the clamp through the recoil and let go.
    pose(u, P, t) {
      const W = hold(0, .3, .36, .5, u), S = hold(.36, .46, .64, .95, u), C = hold(.44, .52, .72, .95, u);
      for (const [s, sx] of SIDES) pincer(P, s, sx, { draw: 1.2 * W, open: 1.2 * W + .6 * S * (1 - C), reach: 1.3 * S, close: 1.2 * C });
      body(P, { noseDown: -.03 * W + .07 * S, fwd: -.05 * W + .1 * S, down: -.03 * W + .04 * S });
      trunk(P, t, Math.sin(Math.PI * u) ** 2, { beat: hold(.36, .44, .58, .8, u), brace: .8 * W + .5 * S });
    },
  },
  {
    name: 'Attack', duration: 1.1, loop: false,
    // Reach, clamp, and draw the catch back toward the mouth before releasing.
    pose(u, P, t) {
      const R = hold(.05, .3, .55, .9, u), O = hold(.05, .22, .3, .42, u), C = hold(.3, .4, .66, .9, u), D = hold(.42, .58, .7, .92, u);
      for (const [s, sx] of SIDES) pincer(P, s, sx, { open: .9 * O, reach: 1.0 * R, close: 1.1 * C, fold: .7 * D });
      body(P, { noseDown: .04 * R, fwd: .04 * R - .02 * D });
      gnath(P, .5 * D);
      trunk(P, t, Math.sin(Math.PI * u) ** 2, { brace: .4 * C });
    },
  },
  {
    name: 'Eat', duration: 1.2, loop: true,
    // Pincers reach down and forward, close, fold back and down to bring the catch under the
    // head to the mouth, the gnathobases work it, then release; loops as a feeding cycle.
    pose(u, P, t) {
      const rel = 1 - ss(.9, 1, u);
      const R = ss(0, .18, u) * rel, O = hold(0, .1, .14, .24, u) * rel, G = ss(.16, .26, u) * rel, Cy = ss(.26, .62, u) * rel;
      const chew = hold(.55, .65, .86, .94, u) * rel, pulse = Math.sin(2 * Math.PI * 4 * u);
      for (const [s, sx] of SIDES) pincer(P, s, sx, { open: .8 * O, reach: 1.0 * R * (1 - .6 * Cy), close: 1.0 * G + .1 * chew * pulse, fold: 1.2 * Cy });
      for (const [s] of SIDES) chain(P, [`chelicera${s}0`, `chelicera${s}1`], DOWN, .15 * R * (1 - Cy));
      gnath(P, .6 * chew * (.5 + .5 * pulse));
      body(P, { noseDown: .05 * Cy + .01 * chew * pulse, down: .03 * Cy });
      trunk(P, t, 1, { amp: .12, loopU: u });
    },
  },
];
