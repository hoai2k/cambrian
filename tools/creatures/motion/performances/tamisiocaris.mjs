/**
 * Tamisiocaris — articulated attack and feeding pass, plus the Grab the hold needs.
 *
 * A filter feeder: the frontal appendages are two long thirteen-segment combs (filter_1_00..12
 * at +X, filter_-1_00..12 at -X) that sweep plankton toward the mouth under the head. Nothing
 * here is a predatory strike. The light "bite" is one comb stroke inward across the front, the
 * heavy is a sweep of the lateral flaps with the combs spread out of the way, and eating is the
 * combs closing on what they gathered and folding back to deliver it to the mouth. The combs
 * always move as a wave from base to tip, the way a long flexible appendage must.
 */
import { ss, arc, hold, UP, DOWN, FWD, BACK } from '../lib.mjs';
import { chain, wave, whip, pad, range, distal, proximal, alive, beatPhase } from '../common.mjs';

const SIDES = [1, -1];
const comb = (s) => range(13).map((i) => `filter_${s}_${pad(i)}`);
const inward = (s) => [-s, 0, 0], outward = (s) => [s, 0, 0];
const SEG = range(12).map((i) => `segment_${pad(i)}`);

function trunk(P, t, env, { power = 0, beats = 0, ramp = 0, beat = 0, amp = .16, loopU } = {}) {
  const ph = beatPhase(t, { period: 1.2, beats, ramp, loopU });
  const A = amp * env * (1 + power);
  for (const s of SIDES) for (let i = 0; i < 12; i++) P.bend(`flap_${s}_${pad(i)}`, DOWN, .3 * A * Math.sin(ph - i * .5) + .6 * beat * Math.sin(Math.PI * Math.min(1, Math.max(0, 1 - i * .06))));
  for (const s of SIDES) for (let i = 0; i < 3; i++) P.bend(`tail_${s}_${i}`, UP, .12 * A * Math.sin(ph - 5) + .25 * beat);
  wave(P, SEG, UP, .03 * A, (loopU === undefined ? ph / 2 : ph), .5);
}
/**
 * `spread` opens the combs out and up, `stroke(i)` is the inward comb stroke arriving segment by
 * segment, `close` folds them together, `curl` brings the distal half under, `draw` folds the
 * bases back toward the mouth.
 */
function combs(P, s, a, u) {
  const names = comb(s), prox = names.slice(0, 5), dist = names.slice(5);
  chain(P, prox, outward(s), (a.spread ?? 0) * .1, proximal);
  chain(P, prox, UP, (a.spread ?? 0) * .06);
  if (a.stroke) names.forEach((b, i) => P.bend(b, inward(s), .07 * a.stroke(i)));
  chain(P, names, inward(s), (a.close ?? 0) * .06, (i, n) => .5 + .6 * i / n);
  chain(P, dist, DOWN, (a.curl ?? 0) * .1, distal);
  chain(P, dist, BACK, (a.curl ?? 0) * .05, distal);
  chain(P, prox, BACK, (a.draw ?? 0) * .26, proximal);
  chain(P, prox, DOWN, (a.draw ?? 0) * .04);
  if (a.whip) whip(P, dist, a.whip.env, u, { delay: .025, amp: a.whip.amp, dir: UP, dir2: outward(s), amp2: .5, kill: a.whip.kill ?? 1 });
}
const head = (P, { noseDown = 0, fwd = 0 }) => { P.bend('body', UP, noseDown); if (fwd) P.shift('body', [0, 0, fwd]); };

/**
 * Bones this performance authors. The feeding combs are the performance; the flap train and tail keep the shipped motion.
 */
export const authored = (n) => /^filter_/.test(n);

export const clips = [
  {
    name: 'Bite', duration: 0.5, loop: false,
    // Filter brush: one comb stroke inward across the front, base first, tips trailing.
    pose(u, P, t) {
      const A = arc(0, .28, u), env = (x) => hold(.14, .34, .44, .88, x), S = env(u);
      for (const s of SIDES) combs(P, s, { spread: .6 * A * (1 - S), stroke: (i) => 1.0 * env(u - .02 * i) * (1 - ss(.86, 1, u)), curl: .4 * S, whip: { env, amp: .3, kill: 1 - ss(.86, 1, u) } }, u);
      head(P, { noseDown: .03 * S, fwd: .02 * S });
      trunk(P, t, alive(u), { amp: .8, power: .8 * S, beats: 1.3, ramp: ss(.1, .55, u) });
    },
  },
  {
    name: 'Heavy', duration: 1.1, loop: false,
    // Flap sweep: the combs spread wide out of the way and the whole flap train beats once,
    // hard, with the tail fan; the body pitches into it and the combs trail behind the stroke.
    pose(u, P, t) {
      const W = hold(0, .3, .36, .5, u), env = (x) => hold(.36, .48, .6, .95, x), S = env(u);
      for (const s of SIDES) combs(P, s, { spread: 1.2 * W + 1.0 * S, whip: { env, amp: .4, kill: 1 - ss(.86, 1, u) } }, u);
      head(P, { noseDown: -.05 * W + .1 * S, fwd: -.04 * W + .08 * S });
      trunk(P, t, alive(u), { amp: 1.0, power: .3 * W + 1.5 * S, beats: 2.2, ramp: ss(.28, .7, u), beat: hold(.36, .46, .62, .85, u) });
    },
  },
  {
    name: 'Attack', duration: 1.1, loop: false,
    // A full gathering stroke: combs open and sweep inward together, close on the water in front,
    // and draw back toward the mouth before spreading again.
    pose(u, P, t) {
      const env = (x) => hold(.05, .3, .55, .9, x), R = env(u), C = hold(.3, .42, .64, .9, u), D = hold(.42, .58, .68, .92, u);
      for (const s of SIDES) combs(P, s, { spread: .8 * hold(.05, .22, .3, .42, u), stroke: (i) => 1.2 * hold(.28, .42, .64, .9, u - .02 * i) * (1 - ss(.86, 1, u)), close: .6 * C, curl: .7 * C, draw: .8 * D, whip: { env, amp: .3, kill: 1 - ss(.86, 1, u) } }, u);
      head(P, { noseDown: .04 * R, fwd: .03 * R });
      trunk(P, t, alive(u), { amp: .8, power: .9 * R, beats: 1.6, ramp: ss(.1, .62, u) });
    },
  },
  {
    name: 'Eat', duration: 1.0, loop: true,
    // Scrubbed by consumption progress: combs spread and sweep forward, close on what they
    // gathered, fold back under the head to the mouth, work it there, then release.
    pose(u, P, t) {
      const rel = 1 - ss(.9, 1, u);
      const R = ss(0, .18, u) * rel, G = ss(.17, .28, u) * rel, Cy = ss(.26, .68, u) * rel;
      const chew = hold(.66, .74, .86, .94, u) * rel, pulse = Math.sin(2 * Math.PI * 4 * (u - .66));
      for (const s of SIDES) combs(P, s, { spread: .8 * hold(0, .12, .16, .26, u) * rel, stroke: (i) => 1.0 * G * (1 - .4 * Cy), close: .8 * G + .1 * chew * pulse, curl: .8 * G + .1 * chew * pulse, draw: 1.4 * Cy, whip: { env: (x) => ss(0, .18, x), amp: .2, kill: rel } }, u);
      head(P, { noseDown: .07 * Cy + .012 * chew * pulse, fwd: .02 * R - .02 * Cy });
      trunk(P, t, 1, { amp: .45, loopU: u });
    },
  },
  {
    name: 'Grab', duration: 1.2, loop: true,
    // The hold: combs closed around the catch in front of the mouth, breathing; never opens.
    pose(u, P, t) {
      const ph = 2 * Math.PI * u;
      for (const s of SIDES) combs(P, s, { close: 1.0 + .05 * Math.sin(ph), curl: .9 + .06 * Math.sin(ph - .7), draw: .7 }, u);
      head(P, { noseDown: .05 + .008 * Math.sin(ph) });
      trunk(P, t, 1, { amp: .45, loopU: u });
    },
  },
];
