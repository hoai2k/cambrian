/**
 * Waptia — articulated attack and feeding pass.
 *
 * Three pairs of nine-jointed raptorial legs (raptor_s_j_0..8, j = 0 front … 2 rear) hang under
 * the head shield: the base runs out and down, the middle joints rise to an elbow, and the last
 * four fold back inward and forward like a mantis forearm. A strike is the forearm snapping
 * open and shut on the midline while the base thrusts; the three pairs work in sequence, front
 * first. The mouth is on the underside between the front bases. Feeding is quick nibbling: the
 * pairs alternate reaching down and folding back to the mouth while the antennae sweep.
 */
import { ss, arc, hold, UP, DOWN, FWD, BACK } from '../lib.mjs';
import { chain, wave, pad, range } from '../common.mjs';

const SIDES = [1, -1], PAIRS = [0, 1, 2];
const leg = (s, j) => range(9).map((i) => `raptor_${s}_${j}_${i}`);
const inward = (s) => [-s, 0, 0], outward = (s) => [s, 0, 0];
const SEG = range(12).map((i) => `segment_${pad(i)}`);

function trunk(P, t, env, { amp = .16, loopU } = {}) {
  const ph = loopU === undefined ? 2 * Math.PI * t / 1.2 : 2 * Math.PI * loopU;
  for (const s of SIDES) for (let i = 0; i < 6; i++) P.bend(`swimmer_${s}_${i}`, FWD, .12 * amp * env * Math.sin(ph - i * .6 + (s < 0 ? Math.PI : 0)));
  for (const s of SIDES) P.bend(`tail_${s}`, UP, .06 * amp * env * Math.sin(ph - 5));
  wave(P, SEG, UP, .008 * amp * env, (loopU === undefined ? ph / 2 : ph), .45);
}
/** `cock` opens the forearm out and up, `thrust` drives the base forward, `snap` folds the forearm in, `reach` lowers the whole leg. */
function raptor(P, s, j, a) {
  const L = leg(s, j), base = L.slice(0, 3), arm = L.slice(5);
  chain(P, arm, outward(s), (a.cock ?? 0) * .2);
  chain(P, arm, UP, (a.cock ?? 0) * .08);
  chain(P, base, FWD, (a.thrust ?? 0) * .22);
  chain(P, arm, inward(s), (a.snap ?? 0) * .22, (i) => .7 + .15 * i);
  chain(P, base, DOWN, (a.reach ?? 0) * .18);
  chain(P, base, FWD, (a.reach ?? 0) * .1);
  chain(P, base, BACK, (a.fold ?? 0) * .2);
  chain(P, arm, DOWN, (a.fold ?? 0) * .1);
}
function antennae(P, sweep, ph) {
  for (const s of SIDES) { P.bend(`antenna_${s}`, inward(s), .25 * sweep * Math.sin(ph + (s < 0 ? Math.PI : 0))); P.bend(`antenna_tip_${s}`, DOWN, .15 * sweep * Math.sin(ph - .8)); }
}
const head = (P, { noseDown = 0, fwd = 0 }) => { P.bend('body', UP, noseDown); if (fwd) P.shift('body', [0, 0, fwd]); };
const eyes = (P, k) => { P.bend('eye_1', FWD, .06 * k); P.bend('eye_-1', FWD, .06 * k); };

export const clips = [
  {
    name: 'Bite', duration: 0.5, loop: false,
    // Rapid pinch: the front pair snaps, the others follow a beat behind, swimmers pause.
    pose(u, P, t) {
      for (const s of SIDES) for (const j of PAIRS) {
        const d = j * .06, A = arc(d, .26 + d, u), S = hold(.12 + d, .28 + d, .38 + d, .8 + d, u);
        raptor(P, s, j, { cock: .7 * A * (1 - S), thrust: .5 * S, snap: 1.2 * S });
      }
      const S = hold(.12, .28, .38, .8, u);
      head(P, { noseDown: .03 * S, fwd: .03 * S }); eyes(P, S);
      antennae(P, Math.sin(Math.PI * u) ** 2, 2 * Math.PI * u * 2);
      trunk(P, t, Math.sin(Math.PI * u) ** 2 * (1 - .8 * S));
    },
  },
  {
    name: 'Heavy', duration: 1.1, loop: false,
    // Raptorial strike: all three pairs cock open and back over the wind-up, then thrust forward
    // together with the forearms extended, snap shut at contact, and shake back to rest.
    pose(u, P, t) {
      const W = hold(0, .28, .34, .48, u), S = hold(.34, .46, .6, .95, u), C = hold(.44, .52, .66, .92, u);
      for (const s of SIDES) for (const j of PAIRS) raptor(P, s, j, { cock: 1.4 * W + .5 * S * (1 - C), fold: .4 * W, thrust: 1.3 * S, snap: 1.3 * C });
      head(P, { noseDown: -.03 * W + .08 * S, fwd: -.04 * W + .1 * S }); eyes(P, W + S);
      antennae(P, Math.sin(Math.PI * u) ** 2 * .6, 2 * Math.PI * u * 3);
      trunk(P, t, Math.sin(Math.PI * u) ** 2 * (1 - .6 * S) + .3 * W);
    },
  },
  {
    name: 'Attack', duration: 1.0, loop: false,
    // Reach with the front two pairs, snap, and draw the catch back under the head.
    pose(u, P, t) {
      for (const s of SIDES) for (const j of PAIRS) {
        const d = j * .05;
        raptor(P, s, j, { cock: .8 * hold(.05 + d, .22 + d, .28 + d, .4 + d, u), thrust: 1.0 * hold(.05 + d, .3 + d, .55, .9, u), snap: 1.2 * hold(.3 + d, .4 + d, .64, .9, u), fold: .8 * hold(.42, .58, .66, .9, u) });
      }
      const R = hold(.05, .3, .55, .9, u);
      head(P, { noseDown: .05 * R, fwd: .04 * R }); eyes(P, R);
      antennae(P, Math.sin(Math.PI * u) ** 2, 2 * Math.PI * u * 2);
      trunk(P, t, Math.sin(Math.PI * u) ** 2);
    },
  },
  {
    name: 'Eat', duration: 1.0, loop: true,
    // Nibbling, scrubbed by consumption progress: the front pair reaches down, closes and folds
    // back to the mouth, the other pairs work in turn, antennae sweeping the food; releases at the end.
    pose(u, P, t) {
      const rel = 1 - ss(.9, 1, u);
      const R = ss(0, .18, u) * rel, G = ss(.17, .28, u) * rel, Cy = ss(.26, .68, u) * rel;
      const chew = hold(.5, .6, .86, .94, u) * rel;
      for (const s of SIDES) for (const j of PAIRS) {
        const pulse = Math.sin(2 * Math.PI * 3 * u - j * 2.1 + (s < 0 ? 1 : 0));
        raptor(P, s, j, { reach: 1.0 * R * (1 - .5 * Cy) + .2 * chew * pulse, snap: 1.1 * G + .2 * chew * pulse, fold: 1.0 * Cy + .15 * chew * pulse, thrust: .3 * R });
      }
      head(P, { noseDown: .06 * Cy + .01 * chew * Math.sin(2 * Math.PI * 3 * u), fwd: .02 * R - .02 * Cy });
      antennae(P, .6, 2 * Math.PI * u);
      trunk(P, t, 1, { amp: .12, loopU: u });
    },
  },
];
