/**
 * Cambroraster — articulated attack and feeding pass, plus the Grab the hold needs.
 *
 * The frontal appendages are two six-segment rakes (rake_1_0..5 at +X, rake_-1_0..5 at -X)
 * angled forward, down and out from under the head shield; their inner edges carry the endites.
 * The animal feeds by sweeping them through the sediment and closing them into a basket under the
 * mouth (anchor_mouth, beneath the head). So a bite is the basket snapping shut, the heavy is a
 * wide scooping sweep with one beat of the flaps, and eating is rake → close → draw back under the
 * head. Nothing here turns the whole body; the shield stays put and the rakes do the work.
 */
import { ss, arc, hold, UP, DOWN, FWD, BACK } from '../lib.mjs';
import { chain, wave, whip, pad, range, distal, proximal, alive, beatPhase } from '../common.mjs';

const SIDES = [1, -1];
const rake = (s) => range(6).map((i) => `rake_${s}_${i}`);
const inward = (s) => [-s, 0, 0], outward = (s) => [s, 0, 0];
const SEG = range(10).map((i) => `segment_${pad(i)}`);

function trunk(P, t, env, { power = 0, beats = 0, ramp = 0, beat = 0, amp = .16, loopU } = {}) {
  const ph = beatPhase(t, { period: 1.2, beats, ramp, loopU });
  const A = amp * env * (1 + power);
  for (const s of SIDES) for (let i = 0; i < 10; i++) P.bend(`flap_${s}_${pad(i)}`, DOWN, .3 * A * Math.sin(ph - i * .55) + .5 * beat);
  for (const s of SIDES) for (let i = 0; i < 3; i++) P.bend(`tail_${s}_${i}`, UP, .12 * A * Math.sin(ph - 5));
  wave(P, SEG, UP, .03 * A, (loopU === undefined ? ph / 2 : ph), .5);
}
/**
 * `spread` opens the rakes out and up, `sweep` swings them forward (the rake stroke), `close`
 * folds them in toward each other into a basket, `scoop` curls the distal half under, `draw`
 * bends the bases back so the basket comes under the mouth.
 */
function rakes(P, s, a, u) {
  const names = rake(s), prox = names.slice(0, 3), dist = names.slice(3);
  chain(P, prox, outward(s), (a.spread ?? 0) * .16, proximal);
  chain(P, prox, UP, (a.spread ?? 0) * .1);
  chain(P, prox, FWD, (a.sweep ?? 0) * .14, proximal);
  chain(P, prox, DOWN, (a.sweep ?? 0) * .08);
  chain(P, names, inward(s), (a.close ?? 0) * .13, (i, n) => .6 + .5 * i / n);
  chain(P, dist, DOWN, (a.scoop ?? 0) * .12, distal);
  chain(P, dist, BACK, (a.scoop ?? 0) * .08, distal);
  chain(P, prox, BACK, (a.draw ?? 0) * .3, proximal);
  chain(P, prox, UP, (a.draw ?? 0) * .06);
  if (a.whip) whip(P, dist, a.whip.env, u, { delay: .03, amp: a.whip.amp, dir: UP, dir2: outward(s), amp2: .4, kill: a.whip.kill ?? 1 });
}
const head = (P, { noseDown = 0, fwd = 0 }) => { P.bend('body', UP, noseDown); if (fwd) P.shift('body', [0, 0, fwd]); };

/**
 * Bones this performance authors. The rakes are the performance; the flap train, tail and shield keep the shipped motion.
 */
export const authored = (n) => /^rake_/.test(n);

export const clips = [
  {
    name: 'Bite', duration: 0.5, loop: false,
    // The basket snaps shut: rakes flick out, then close hard on the midline and reopen.
    pose(u, P, t) {
      const A = arc(0, .26, u), env = (x) => hold(.14, .32, .42, .86, x), S = env(u);
      for (const s of SIDES) rakes(P, s, { spread: .5 * A * (1 - S), sweep: .4 * S, close: 1.2 * S, scoop: .6 * S, whip: { env, amp: .25, kill: 1 - ss(.86, 1, u) } }, u);
      head(P, { noseDown: .04 * S, fwd: .03 * S });
      trunk(P, t, alive(u), { amp: .8, power: .9 * S, beats: 1.4, ramp: ss(.1, .55, u) });
    },
  },
  {
    name: 'Heavy', duration: 1.1, loop: false,
    // The scoop: rakes lift out and up over the wind-up, then sweep forward, down and inward in
    // one stroke with a single beat of the flaps behind it, closing into a basket at contact.
    pose(u, P, t) {
      const W = hold(0, .3, .36, .5, u), env = (x) => hold(.36, .48, .6, .95, x), S = env(u), C = hold(.45, .54, .66, .92, u);
      for (const s of SIDES) rakes(P, s, { spread: 1.5 * W + .2 * S * (1 - C), sweep: 1.4 * S, close: 1.3 * C, scoop: 1.0 * C, whip: { env, amp: .45, kill: 1 - ss(.86, 1, u) } }, u);
      head(P, { noseDown: -.04 * W + .1 * S, fwd: -.04 * W + .08 * S });
      trunk(P, t, alive(u), { amp: .9, power: .3 * W + 1.2 * S, beats: 1.9, ramp: ss(.28, .66, u), beat: hold(.36, .46, .58, .8, u) });
    },
  },
  {
    name: 'Attack', duration: 1.2, loop: false,
    // Rake forward, close, and draw the basket back under the mouth before opening again.
    pose(u, P, t) {
      const env = (x) => hold(.05, .3, .55, .9, x), R = env(u), C = hold(.3, .4, .64, .9, u), D = hold(.42, .58, .68, .92, u);
      for (const s of SIDES) rakes(P, s, { spread: .5 * hold(.05, .2, .28, .4, u), sweep: 1.0 * R, close: 1.2 * C, scoop: .8 * C, draw: .9 * D, whip: { env, amp: .3, kill: 1 - ss(.86, 1, u) } }, u);
      head(P, { noseDown: .05 * R, fwd: .04 * R - .02 * D });
      trunk(P, t, alive(u), { amp: .8, power: .8 * R + .5 * D, beats: 1.6, ramp: ss(.1, .62, u) });
    },
  },
  {
    name: 'Eat', duration: 1.0, loop: true,
    // Scrubbed by consumption progress: rake forward and down, close the basket, draw it back
    // under the head to the mouth, work it there, then release and return.
    pose(u, P, t) {
      const rel = 1 - ss(.9, 1, u);
      const R = ss(0, .18, u) * rel, G = ss(.17, .28, u) * rel, Cy = ss(.26, .68, u) * rel;
      const chew = hold(.66, .74, .86, .94, u) * rel, pulse = Math.sin(2 * Math.PI * 4 * (u - .66));
      for (const s of SIDES) rakes(P, s, { spread: .5 * hold(0, .12, .16, .26, u) * rel, sweep: 1.0 * R - .3 * Cy, close: 1.2 * G + .15 * chew * pulse, scoop: .9 * G + .1 * chew * pulse, draw: 1.5 * Cy, whip: { env: (x) => ss(0, .18, x), amp: .2, kill: rel } }, u);
      head(P, { noseDown: .08 * Cy + .015 * chew * pulse, fwd: .03 * R - .02 * Cy });
      trunk(P, t, 1, { amp: .45, loopU: u });
    },
  },
  {
    name: 'Grab', duration: 1.2, loop: true,
    // The hold: basket closed under the mouth on whatever it caught, breathing. A held pose that
    // never opens, because the game starts it at the moment the grip closes and loops it while
    // the animal clings to something bigger than itself.
    pose(u, P, t) {
      const ph = 2 * Math.PI * u;
      for (const s of SIDES) rakes(P, s, { sweep: .3, close: 1.2 + .05 * Math.sin(ph), scoop: .9 + .06 * Math.sin(ph - .7), draw: .8 }, u);
      head(P, { noseDown: .06 + .008 * Math.sin(ph) });
      trunk(P, t, 1, { amp: .45, loopU: u });
    },
  },
];
