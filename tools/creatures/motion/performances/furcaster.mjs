/**
 * Furcaster — articulated attack and feeding pass, plus the Grab the hold needs (Devonian
 * brittle star).
 *
 * Five 36-jointed arms (arm_{0..4}_{01..35}) radiate from a central disc whose mouth is on the
 * underside (anchor_mouth below body), with the oral angles and pump around it. Everything an
 * arm does is a curl: down and toward the disc's axis to cup, up and out to lift. A strike is one
 * or two arms whipping down and inward across the front; the heavy raises every arm and slams
 * them down together. Feeding is the thing the design asks for: several arms cup a target and
 * bring it under the disc to the central mouth while the remaining arms stabilise. Nothing is
 * poked forward with a single arm and nothing goes in through the top of the disc.
 */
import { ss, arc, hold, UP, DOWN } from '../lib.mjs';
import { chain, pad, range } from '../common.mjs';
import { Vector3 } from 'three';

const ARMS = range(5);
const arm = (k) => range(35).map((i) => `arm_${k}_${pad(i + 1)}`);
/** Unit vector along arm k in the disc plane, from its first joint. */
function outward(P, k) {
  const a = P.rig.restWorldPos(P.rig.joint(`arm_${k}_01`)), b = P.rig.restWorldPos(P.rig.joint(`arm_${k}_06`));
  return new Vector3(b.x - a.x, 0, b.z - a.z).normalize().toArray();
}
/**
 * `cup(k)` curls arm k down and under toward the mouth (weighted to the inner half so the tip
 * comes beneath the disc), `lift(k)` raises it, `lash(k)` whips it down with a base-to-tip
 * delay, `wave` keeps the tips alive.
 */
function arms(P, u, a) {
  for (const k of ARMS) {
    const names = arm(k), out = outward(P, k), inw = [-out[0], 0, -out[2]];
    const cup = a.cup?.(k) ?? 0, lift = a.lift?.(k) ?? 0, lash = a.lash?.(k) ?? 0, w = a.wave ?? 0;
    chain(P, names.slice(0, 18), DOWN, cup * .13, (i) => 1 - .4 * i / 17);
    chain(P, names.slice(6, 30), inw, cup * .05);
    chain(P, names.slice(0, 12), UP, lift * .1);
    if (lash) names.forEach((b, i) => P.bend(b, DOWN, .05 * lash * (i < 20 ? 1 : .4) * (a.lashEnv ? a.lashEnv(u - .012 * i) : 1)));
    if (w) names.forEach((b, i) => P.bend(b, UP, w * .012 * Math.sin(a.waveT - i * .35 - k * 1.2)));
  }
}
const disc = (P, { down = 0, pump = 0, angles = 0 }) => {
  if (down) P.shift('body', [0, -.04 * down, 0]);
  P.shift('oral_pump', [0, .03 * pump, 0]);
  for (let i = 0; i < 5; i++) P.bend(`oral_angle_${i}`, DOWN, .3 * angles);
};

/**
 * Bones this performance authors. The five arms and the oral frame are the performance; the disc keeps the shipped motion.
 */
export const authored = (n) => /^(arm_|oral_)/.test(n);

export const clips = [
  {
    name: 'Bite', duration: 0.5, loop: false,
    // Two neighbouring arms whip down and in across the front, base first.
    pose(u, P, t) {
      const env = (x) => hold(.12, .3, .4, .86, x), S = env(u), kill = 1 - ss(.86, 1, u);
      arms(P, u, { lift: (k) => (k < 2 ? .8 : .2) * arc(0, .26, u) * (1 - S), lash: (k) => (k < 2 ? 1.3 : 0) * kill, lashEnv: env, wave: Math.sin(Math.PI * u) ** 2, waveT: 2 * Math.PI * t / 1.2 });
      disc(P, { down: .3 * S, angles: .5 * S });
    },
  },
  {
    name: 'Heavy', duration: 1.1, loop: false,
    // Every arm rises over the wind-up, then all five slam down together in a wave from the
    // disc outward, the disc pressing down; a slow relaxation.
    pose(u, P, t) {
      const W = hold(0, .3, .36, .5, u), env = (x) => hold(.36, .46, .66, .95, x), S = env(u), kill = 1 - ss(.86, 1, u);
      arms(P, u, { lift: () => 1.6 * W, lash: () => 1.4 * kill, lashEnv: env, wave: Math.sin(Math.PI * u) ** 2, waveT: 2 * Math.PI * t / 1.2 });
      disc(P, { down: -.5 * W + .8 * S, angles: .6 * S });
    },
  },
  {
    name: 'Attack', duration: 1.1, loop: false,
    // Three arms lift and come down around the target, cupping it in toward the disc, then let go.
    pose(u, P, t) {
      const env = (x) => hold(.2, .36, .5, .9, x), C = hold(.32, .5, .68, .92, u), kill = 1 - ss(.86, 1, u);
      const pick = (k) => k === 0 || k === 1 || k === 4;
      arms(P, u, { lift: (k) => (pick(k) ? 1.0 : .2) * hold(0, .2, .3, .45, u), lash: (k) => pick(k) ? .8 * kill : 0, lashEnv: env, cup: (k) => pick(k) ? 1.0 * C : 0, wave: Math.sin(Math.PI * u) ** 2, waveT: 2 * Math.PI * t / 1.2 });
      disc(P, { down: .4 * C, angles: .5 * C });
    },
  },
  {
    name: 'Eat', duration: 1.4, loop: true,
    // Three arms cup the food and curl it under the disc to the central mouth, tightening and
    // easing in a slow rhythm while the other two arms hold the animal steady; the oral pump
    // works; the hold relaxes at the end so the clip loops.
    pose(u, P, t) {
      const rel = 1 - ss(.9, 1, u);
      const G = ss(0, .3, u) * rel, chew = hold(.35, .5, .86, .94, u) * rel, pulse = Math.sin(2 * Math.PI * 3 * u);
      const pick = (k) => k === 0 || k === 1 || k === 4;
      arms(P, u, { cup: (k) => pick(k) ? 1.3 * G + .15 * chew * pulse : .15 * G, lift: (k) => pick(k) ? 0 : .3 * G, wave: 1, waveT: 2 * Math.PI * u });
      disc(P, { down: .3 * G, pump: .5 * chew * (.5 + .5 * pulse), angles: .6 * G + .2 * chew * pulse });
    },
  },
  {
    name: 'Grab', duration: 1.2, loop: true,
    // The hold: three arms curled under the disc on the catch, two braced out, breathing.
    pose(u, P, t) {
      const ph = 2 * Math.PI * u;
      const pick = (k) => k === 0 || k === 1 || k === 4;
      arms(P, u, { cup: (k) => pick(k) ? 1.3 + .06 * Math.sin(ph - k) : .2, lift: (k) => pick(k) ? 0 : .3, wave: 1, waveT: ph });
      disc(P, { down: .3, angles: .6 + .05 * Math.sin(ph) });
    },
  },
];
