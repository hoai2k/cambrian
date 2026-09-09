/**
 * Opabinia — the proboscis as a trunk, not a hammer.
 *
 * The frontal proboscis is a twelve-segment trunk (proboscis_00..11) ending in a pair of claw
 * halves (jaw_1 at +X, jaw_-1 at -X). Every attack here has the same three beats, the way an
 * elephant's trunk works: the trunk **coils** on itself (the tip curls tightest, like a spiral),
 * holds a moment, then **launches** — the coil runs out from the base to the tip so the trunk
 * unrolls forward and the claw arrives last and fastest — and the jaws **snap** shut at full
 * reach, after which the trunk draws back in an S-curve and settles. The three clips differ in
 * how far it coils and which way: Bite curls under, Attack curls to the side, Heavy coils up
 * and over the head. The eyes track the strike; the lobes pause for it.
 *
 * Frame: +Z forward, +Y up, +X left.
 */
import { ss, arc, hold, ring, UP, DOWN, FWD, BACK } from '../lib.mjs';
import { chain, pad, range } from '../common.mjs';

const TRUNK = range(12).map((i) => `proboscis_${pad(i)}`);

/**
 * The resting shape the bind pose lacks: Opabinia is usually shown with the proboscis hanging
 * down from the head, curving up and then reaching forward. Every other clip in the file is
 * re-posed onto this (fading out where a clip's own motion takes the trunk far from bind, so
 * the Snatch and the feeding reach still arrive straight); the attacks below coil from it and
 * straighten it out as they shoot.
 */
const BASE = TRUNK.map((_, i) => (i < 3 ? [DOWN, .34] : i < 8 ? [UP, .36] : [DOWN, .1]));
export function basePose(P, k = 1) { BASE.forEach(([dir, a], i) => P.bend(TRUNK[i], dir, a * k)); }
export const rebase = { fade: [.2, .7] };
const LEFT = [1, 0, 0], RIGHT = [-1, 0, 0];
/** Curl tightens toward the tip, as a trunk's does. */
const spiral = (i, n) => .45 + .85 * i / (n - 1);

/**
 * The trunk. `coil(i)` is the curl of segment i (1 = a full spiral over the trunk) toward `dir`;
 * `launch` straightens it forward and lifts it; `recoil` bends the distal half under in an
 * S-curve on the way back; `stretch` reaches the base forward.
 */
function trunk(P, a) {
  basePose(P, 1 - (a.straighten ?? 0));
  TRUNK.forEach((b, i) => {
    const c = a.coil?.(i) ?? 0;
    if (c) P.bend(b, a.dir, c * .5 * spiral(i, 12));
  });
  chain(P, TRUNK, UP, (a.launch ?? 0) * .03, (i) => i < 6 ? 1 : .3);
  chain(P, TRUNK.slice(0, 4), FWD, (a.launch ?? 0) * .06);
  chain(P, TRUNK.slice(6), DOWN, (a.recoil ?? 0) * .12, (i) => .5 + .5 * i / 5);
  chain(P, TRUNK.slice(0, 5), UP, (a.recoil ?? 0) * .06);
}
/** Claw halves: positive opens them, negative bites past rest. */
function jaws(P, open) {
  P.bend('jaw_1', LEFT, open * .55).bend('jaw_-1', RIGHT, open * .55);
}
function body(P, { noseDown = 0, fwd = 0 }) { P.spin('body', [1, 0, 0], noseDown); if (fwd) P.shift('body', [0, 0, fwd]); }
function eyes(P, k) { for (let i = 0; i < 5; i++) P.bend(`eye_${i}`, FWD, .12 * k); }
function lobes(P, t, env, amp = .16) {
  const ph = 2 * Math.PI * t / 1.2;
  for (const s of [1, -1]) for (let i = 0; i < 15; i++) P.bend(`flap_${s}_${pad(i)}`, DOWN, .2 * amp * env * Math.sin(ph - i * .5));
  for (const s of [1, -1]) for (let i = 0; i < 3; i++) P.bend(`tail_${s}_${i}`, UP, .05 * amp * env * Math.sin(ph - 5));
  for (let i = 0; i < 15; i++) P.bend(`segment_${pad(i)}`, UP, .008 * amp * env * Math.sin(ph / 2 - i * .4));
}

/**
 * The shared strike: coil over [c0, c1], launch (base-first unroll) over [l0, l1] with `delay`
 * per segment, snap at `snap`, hold the bite until `release`, then recoil and settle by the end.
 */
function strike(u, { amount, dir, c0, c1, l0, l1, delay, snap, release, quiver = 0 }) {
  const coilEnv = ss(c0, c1, u);
  const unroll = (i) => ss(l0 + delay * i, l1 + delay * i, u);
  const coil = (i) => amount * coilEnv * (1 - unroll(i)) * (1 + quiver * Math.sin(2 * Math.PI * 9 * u) * hold(c1, c1 + .04, l0 - .04, l0, u));
  const launch = hold(l0, l1, release, release + .25, u);
  const open = hold(l0 - .02, l1, snap - .02, snap, u) - .5 * hold(snap, snap + .03, release, release + .2, u);
  const recoil = hold(release, release + .12, release + .22, 1, u) + .06 * ring(release + .1, u, 3, 4, .85);
  const held = coilEnv * (1 - ss(l0, l1, u));           // still coiled: gone once the launch has run
  const straighten = hold(l0, l1, release + .05, release + .3, u);   // shoot out straight, then settle back into the curve
  return { dir, coil, launch, open, recoil, held, straighten };
}

export const clips = [
  {
    name: 'Bite', base: false, duration: 0.5, loop: false,
    // Proboscis jab: a quick half-coil under, then the trunk unrolls forward and the claw snaps.
    pose(u, P, t) {
      const s = strike(u, { amount: .45, dir: DOWN, c0: 0, c1: .2, l0: .2, l1: .3, delay: .01, snap: .42, release: .56 });
      trunk(P, s); jaws(P, s.open);
      body(P, { noseDown: .03 * s.launch, fwd: .03 * s.launch }); eyes(P, s.launch);
      lobes(P, t, Math.sin(Math.PI * u) ** 2 * (1 - .7 * s.launch));
    },
  },
  {
    name: 'Attack', base: false, duration: 1.1, loop: false,
    // The trunk coils to its left side, holds, unrolls forward and snaps, and comes back.
    pose(u, P, t) {
      const s = strike(u, { amount: .85, dir: LEFT, c0: .02, c1: .28, l0: .34, l1: .46, delay: .012, snap: .56, release: .68, quiver: .03 });
      trunk(P, s); jaws(P, s.open);
      body(P, { noseDown: .04 * s.launch, fwd: -.02 * s.held + .05 * s.launch }); eyes(P, s.launch + .3 * s.held);
      lobes(P, t, Math.sin(Math.PI * u) ** 2 * (1 - .6 * s.launch));
    },
  },
  {
    name: 'Heavy', base: false, duration: 1.1, loop: false,
    // The full coil, up and over the head — the read — held quivering, then the whole trunk
    // unrolls forward in one crack, the claw clamps at full reach, and it draws back slowly.
    pose(u, P, t) {
      const s = strike(u, { amount: 1.0, dir: UP, c0: 0, c1: .3, l0: .38, l1: .5, delay: .014, snap: .6, release: .72, quiver: .04 });
      trunk(P, s); jaws(P, s.open * 1.2);
      body(P, { noseDown: -.03 * s.held + .07 * s.launch, fwd: -.03 * s.held + .08 * s.launch }); eyes(P, s.launch + .5 * s.held);
      lobes(P, t, Math.sin(Math.PI * u) ** 2 * (1 - .7 * s.launch));
    },
  },
];
