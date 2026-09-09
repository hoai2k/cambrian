/**
 * Isoxys — articulated attack and feeding pass, plus the Grab the hold needs.
 *
 * Under the folded carapace a pair of five-part raptorial appendages (raptor_1_0..4 at +X,
 * raptor_-1_0..4 at -X) hang from the head: the base goes out, down and forward, the middle
 * runs forward, and the last three joints hook up and back — a closed hook at rest. The mouth
 * is on the underside just behind the bases. A nip is the two hooks snapping together; the
 * heavy is the intercept: the hooks open wide over the wind-up, the bases thrust forward, and
 * the hooks close on what they meet. Feeding reaches the hooks down and forward, closes them,
 * and folds the bases back so the catch is delivered under the head to the mouth.
 */
import { ss, arc, hold, UP, DOWN, FWD, BACK } from '../lib.mjs';
import { chain, wave, pad, range } from '../common.mjs';

const SIDES = [1, -1];
const raptor = (s) => range(5).map((i) => `raptor_${s}_${i}`);
const inward = (s) => [-s, 0, 0], outward = (s) => [s, 0, 0];
const SEG = range(13).map((i) => `segment_${pad(i)}`);

function trunk(P, t, env, { burst = 0, amp = .16, loopU } = {}) {
  const ph = loopU === undefined ? 2 * Math.PI * t / 1.2 : 2 * Math.PI * loopU;
  for (const s of SIDES) for (let i = 0; i < 13; i++) {
    const phase = ph - i * .55 + (s < 0 ? Math.PI : 0);
    for (let k = 0; k < 3; k++) P.bend(`leg_${s}_${pad(i)}_${k}`, FWD, (k ? .03 : .06) * (amp * env + burst) * Math.sin(phase));
    P.bend(`paddle_${s}_${pad(i)}`, FWD, .08 * (amp * env + burst) * Math.sin(phase + .4));
  }
  for (const s of SIDES) P.bend(`tail_${s}`, UP, .05 * amp * env * Math.sin(ph - 5));
  wave(P, SEG, UP, .008 * amp * env, (loopU === undefined ? ph / 2 : ph), .45);
}
/**
 * `open` unfolds the hook out and up, `thrust` drives the base forward, `close` snaps the hook
 * joints in toward the midline, `fold` swings the base back and down under the head.
 */
function hooks(P, s, a) {
  const [r0, r1, r2, r3, r4] = raptor(s);
  chain(P, [r2, r3, r4], outward(s), (a.open ?? 0) * .18);
  chain(P, [r2, r3, r4], UP, (a.open ?? 0) * .14);
  chain(P, [r0, r1], FWD, (a.thrust ?? 0) * .3);
  chain(P, [r0, r1], UP, (a.thrust ?? 0) * .1);
  chain(P, [r1, r2, r3, r4], inward(s), (a.close ?? 0) * .2, (i) => .6 + .15 * i);
  chain(P, [r3, r4], DOWN, (a.close ?? 0) * .12);
  chain(P, [r0], BACK, (a.fold ?? 0) * .55);
  chain(P, [r0, r1], inward(s), (a.fold ?? 0) * .25);
}
const head = (P, { noseDown = 0, fwd = 0 }) => { P.bend('body', UP, noseDown); if (fwd) P.shift('body', [0, 0, fwd]); };
const eyes = (P, k) => { P.bend('eye_1', FWD, .06 * k); P.bend('eye_-1', FWD, .06 * k); };

export const clips = [
  {
    name: 'Bite', duration: 0.5, loop: false,
    // Raptorial nip: the hooks open a crack and snap together in front of the mouth.
    pose(u, P, t) {
      const A = arc(0, .26, u), S = hold(.14, .3, .4, .86, u);
      for (const s of SIDES) hooks(P, s, { open: .6 * A * (1 - S), thrust: .4 * S, close: 1.2 * S });
      head(P, { noseDown: .04 * S, fwd: .03 * S }); eyes(P, S);
      trunk(P, t, Math.sin(Math.PI * u) ** 2);
    },
  },
  {
    name: 'Heavy', duration: 1.1, loop: false,
    // Spined intercept: hooks opened wide and bases drawn back over the wind-up, then the bases
    // thrust forward as the swimming limbs burst, and the hooks close on contact.
    pose(u, P, t) {
      const W = hold(0, .3, .36, .5, u), S = hold(.36, .48, .62, .95, u), C = hold(.45, .54, .68, .92, u);
      for (const s of SIDES) hooks(P, s, { open: 1.4 * W + .4 * S * (1 - C), fold: .5 * W, thrust: 1.3 * S, close: 1.3 * C });
      head(P, { noseDown: -.03 * W + .08 * S, fwd: -.05 * W + .1 * S }); eyes(P, W + S);
      trunk(P, t, Math.sin(Math.PI * u) ** 2, { burst: .5 * hold(.34, .44, .6, .8, u) });
    },
  },
  {
    name: 'Attack', duration: 1.0, loop: false,
    // Reach, close, and draw the hooks back under the head before opening again.
    pose(u, P, t) {
      const R = hold(.05, .3, .55, .9, u), O = hold(.05, .22, .28, .4, u), C = hold(.3, .4, .64, .9, u), D = hold(.42, .58, .66, .9, u);
      for (const s of SIDES) hooks(P, s, { open: .8 * O, thrust: 1.0 * R, close: 1.2 * C, fold: .8 * D });
      head(P, { noseDown: .05 * R, fwd: .04 * R }); eyes(P, R);
      trunk(P, t, Math.sin(Math.PI * u) ** 2);
    },
  },
  {
    name: 'Eat', duration: 1.0, loop: true,
    // Scrubbed by consumption progress: hooks open and reach down and forward, close, fold back
    // under the head to the mouth, work there, then release and return.
    pose(u, P, t) {
      const rel = 1 - ss(.9, 1, u);
      const R = ss(0, .18, u) * rel, O = hold(0, .12, .16, .26, u) * rel, G = ss(.17, .28, u) * rel, Cy = ss(.26, .68, u) * rel;
      const chew = hold(.66, .74, .86, .94, u) * rel, pulse = Math.sin(2 * Math.PI * 4 * (u - .66));
      for (const s of SIDES) hooks(P, s, { open: .9 * O, thrust: 1.0 * R - .5 * Cy, close: 1.2 * G + .15 * chew * pulse, fold: 1.3 * Cy });
      for (const s of SIDES) chain(P, raptor(s).slice(0, 2), DOWN, .2 * R * (1 - Cy));
      head(P, { noseDown: .06 * Cy + .012 * chew * pulse, fwd: .02 * R - .02 * Cy });
      trunk(P, t, 1, { amp: .12, loopU: u });
    },
  },
  {
    name: 'Grab', duration: 1.2, loop: true,
    // The hold: hooks closed and folded under the head on the catch, breathing; never opens.
    pose(u, P, t) {
      const ph = 2 * Math.PI * u;
      for (const s of SIDES) hooks(P, s, { close: 1.2 + .06 * Math.sin(ph), fold: .9 + .04 * Math.sin(ph - .7), thrust: .2 });
      head(P, { noseDown: .05 + .008 * Math.sin(ph) });
      trunk(P, t, 1, { amp: .12, loopU: u });
    },
  },
];
