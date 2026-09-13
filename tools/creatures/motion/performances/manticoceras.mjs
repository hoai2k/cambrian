/**
 * Manticoceras — articulated attack and feeding pass (Devonian ammonoid).
 *
 * Ten four-jointed arms (arm{0..9}_{0..3}) ring the head around the beak, whose upper and lower
 * halves are the mouth; a funnel and two mantle flaps sit below. This is its own interpretation,
 * not the nautiloid waveform: the arms open as a crown (every arm flaring away from the axis)
 * during anticipation, then close base-first toward the axis with a delay down each arm, the
 * beak snapping when the crown shuts. Feeding closes several arms around the food and draws
 * them in to the beak while the rest keep the crown open. "Inward" for an arm is toward the
 * head's axis, worked out from where the arm's base sits around it.
 */
import { ss, arc, hold, UP, DOWN, FWD, BACK } from '../lib.mjs';
import { chain, range } from '../common.mjs';
import { Vector3 } from 'three';

const ARMS = range(10);
const arm = (k) => range(4).map((i) => `arm${k}_${i}`);
/** Unit vector from an arm's base toward the head axis, in the XY plane around +Z. */
function axisward(P, k) {
  const p = P.rig.restWorldPos(P.rig.joint(`arm${k}_0`));
  const v = new Vector3(-p.x, -p.y, 0);
  return v.lengthSq() < 1e-6 ? [0, -1, 0] : v.normalize().toArray();
}
/** `flare` opens every arm away from the axis, `close(k)` folds arm k toward it base-first, `curl` tightens the tips. */
function crown(P, a) {
  for (const k of ARMS) {
    const inw = axisward(P, k), outw = [-inw[0], -inw[1], 0], names = arm(k);
    chain(P, names, outw, (a.flare?.(k) ?? a.flareAll ?? 0) * .16, (i) => 1 - .2 * i);
    chain(P, names, inw, (a.close?.(k) ?? 0) * .22, (i) => .9 + .1 * i);
    chain(P, names.slice(2), inw, (a.curl?.(k) ?? 0) * .3);
    chain(P, names.slice(0, 2), BACK, (a.retract?.(k) ?? 0) * .25);
  }
}
const beak = (P, gape) => { P.spin('beak_upper', [1, 0, 0], -.4 * gape); P.spin('beak_lower', [1, 0, 0], .5 * gape); };
const mantle = (P, k, t) => { P.bend('mantleL', DOWN, .1 * k); P.bend('mantleR', DOWN, .1 * k); P.bend('funnel', DOWN, .08 * k); P.bend('funnelTip', BACK, .1 * k); };
const head = (P, { noseDown = 0, fwd = 0 }) => { P.spin('head', [1, 0, 0], noseDown); if (fwd) P.shift('head', [0, 0, fwd]); };
const breathe = (P, u, amp = 1) => { const ph = 2 * Math.PI * u; mantle(P, .3 * amp * (1 + Math.sin(ph)) / 2); for (const k of ARMS) chain(P, arm(k).slice(2), UP, .015 * amp * Math.sin(ph - k * .6)); };

/**
 * Bones this performance authors. The arm crown and beak are the performance; the head, funnel and mantle keep the shipped motion.
 */
export const authored = (n) => /^(arm|beak)/.test(n);

export const clips = [
  {
    name: 'Bite', duration: 0.5, loop: false,
    // Beak snap: the crown twitches open, the arm tips flick in around the beak as it bites.
    pose(u, P, t) {
      const A = arc(0, .26, u), S = hold(.14, .3, .42, .86, u), G = hold(.08, .22, .3, .5, u);
      crown(P, { flareAll: .5 * A * (1 - S), close: () => .5 * S, curl: () => .7 * S });
      beak(P, .8 * G);
      head(P, { noseDown: .04 * S, fwd: .03 * S });
      breathe(P, u, Math.sin(Math.PI * u) ** 2);
    },
  },
  {
    name: 'Heavy', duration: 1.1, loop: false,
    // The crown flares fully open over the wind-up with the beak agape, then the arms close
    // toward the axis base-first with a delay around the ring and down each arm, the beak
    // shutting as the crown does; a slow reopening.
    pose(u, P, t) {
      const W = hold(0, .3, .36, .5, u), C = (k) => hold(.36 + k * .012, .48 + k * .012, .66, .95, u), kill = 1 - ss(.9, 1, u);
      crown(P, { flareAll: 1.4 * W, close: (k) => 1.3 * C(k) * kill, curl: (k) => 1.1 * hold(.46, .56, .7, .95, u), retract: () => .3 * hold(.5, .6, .72, .95, u) });
      beak(P, 1.0 * hold(.1, .3, .48, .62, u));
      head(P, { noseDown: -.03 * W + .06 * hold(.36, .48, .66, .95, u), fwd: -.04 * W + .08 * hold(.36, .48, .66, .95, u) });
      breathe(P, u, Math.sin(Math.PI * u) ** 2);
    },
  },
  {
    name: 'Attack', duration: 1.0, loop: false,
    // Reach with the crown open, close it around the target and draw in to the beak.
    pose(u, P, t) {
      const R = hold(.05, .3, .55, .9, u), C = (k) => hold(.3 + k * .01, .42 + k * .01, .66, .9, u), D = hold(.44, .6, .7, .92, u), kill = 1 - ss(.9, 1, u);
      crown(P, { flareAll: .9 * hold(.05, .22, .3, .45, u), close: (k) => 1.1 * C(k) * kill, curl: () => .9 * hold(.4, .5, .68, .9, u), retract: () => .8 * D });
      beak(P, .7 * hold(.3, .45, .6, .85, u));
      head(P, { noseDown: .04 * R, fwd: .03 * R });
      breathe(P, u, Math.sin(Math.PI * u) ** 2);
    },
  },
  {
    name: 'Eat', duration: 1.2, loop: true,
    // Four arms (alternating around the ring) close on the food and draw it in to the beak,
    // which works it, while the other six hold the crown open; release at the end and loop.
    pose(u, P, t) {
      const rel = 1 - ss(.9, 1, u);
      const G = ss(.05, .25, u) * rel, D = ss(.25, .55, u) * rel, chew = hold(.5, .6, .86, .94, u) * rel, pulse = Math.sin(2 * Math.PI * 4 * u);
      const holding = (k) => k % 3 === 0 || k === 5;
      crown(P, { flareAll: .5, close: (k) => holding(k) ? 1.2 * G + .1 * chew * pulse : 0, curl: (k) => holding(k) ? 1.0 * G : .2, retract: (k) => holding(k) ? 1.0 * D : 0 });
      beak(P, .5 * chew * (.5 + .5 * pulse) + .3 * G * (1 - D));
      head(P, { noseDown: .03 * D + .01 * chew * pulse });
      breathe(P, u, 1);
    },
  },
];
