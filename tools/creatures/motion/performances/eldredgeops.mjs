/**
 * Eldredgeops and Walliserops — articulated attack and feeding pass (Devonian trilobites).
 *
 * The two share a rig: cephalon (with the hypostome and the oral pump beneath it), eleven thorax
 * rings, a pygidium, four-jointed antennae and 18 pairs of six-jointed limbs (limb_NN_L/R_1..6,
 * L at +X) whose bases carry the spiny gnathobases beside the midline. There are no claws: a
 * trilobite fights with its head shield and feeds by passing food forward along the ventral
 * midline with the limb bases, gnathobase to gnathobase, to the hypostome and mouth. So a bite is
 * a head-butt with the front limb bases snapping in, the heavy is a crouch and a ramming thrust,
 * and eating is the front limbs working inward in a wave that travels forward while the
 * hypostome rocks and the oral pump swallows.
 */
import { ss, arc, hold, UP, DOWN, FWD, BACK } from '../lib.mjs';
import { pad, range } from '../common.mjs';

const SIDES = [['L', 1], ['R', -1]];
const inward = (sx) => [-sx, 0, 0];
const limb = (i, s) => range(6).map((k) => `limb_${pad(i)}_${s}_${k + 1}`);
const THORAX = range(11).map((i) => `thorax_${pad(i + 1)}`);

function limbs(P, t, env, { coil = 0, drive = 0, brace = 0, amp = .16, loopU } = {}) {
  const ph = loopU === undefined ? 2 * Math.PI * t / 1.2 : 2 * Math.PI * loopU;
  for (const [s, sx] of SIDES) for (let i = 0; i < 18; i++) {
    const L = limb(i, s), phase = ph - i * .45 + (sx < 0 ? Math.PI : 0);
    P.bend(L[0], FWD, .06 * amp * env * Math.sin(phase) + .2 * coil - .3 * drive * (1 - i * .015));
    P.bend(L[1], FWD, .03 * amp * env * Math.sin(phase) - .1 * drive);
    L.slice(2, 5).forEach((b) => P.bend(b, DOWN, .04 * amp * env * Math.cos(phase + .5) + .12 * coil + .1 * brace));
  }
  THORAX.forEach((b, i) => P.bend(b, UP, .008 * amp * env * Math.sin((loopU === undefined ? ph / 2 : ph) - i * .5)));
}
/** Feeding wave along the front limbs: bases swing inward in sequence from back to front, passing food forward. */
function feed(P, work, ph) {
  for (const [s, sx] of SIDES) for (let i = 0; i < 8; i++) {
    const L = limb(i, s), w = Math.sin(ph + i * .8 + (sx < 0 ? Math.PI : 0));
    P.bend(L[0], inward(sx), work * (.18 + .12 * w)).bend(L[0], FWD, work * .1 * w);
    P.bend(L[1], inward(sx), work * .1 * w).bend(L[2], inward(sx), work * .08 * w);
  }
}
function antennae(P, k, ph, trail = 0) {
  for (const [s, sx] of SIDES) range(4).forEach((i) => P.bend(`antenna_${s}_${i}`, inward(sx), .12 * k * Math.sin(ph - i * .6 + (sx < 0 ? Math.PI : 0))).bend(`antenna_${s}_${i}`, BACK, .2 * trail));
}
/** `butt` pitches the cephalon down and shoves it forward; `low` drops the body; `pump` rocks the hypostome and works the oral pump. */
function head(P, { butt = 0, low = 0, fwd = 0, pump = 0 }) {
  P.spin('cephalon', [1, 0, 0], .2 * butt); P.shift('cephalon', [0, -.03 * butt, .06 * butt]);
  if (low || fwd) P.shift('body', [0, -.06 * low, fwd]);
  P.spin('hypostome', [1, 0, 0], -.15 * pump); P.shift('oral_pump', [0, .02 * pump, -.03 * pump]);
}

export const clips = [
  {
    name: 'Bite', duration: 0.5, loop: false,
    // A short head-butt, the front limb bases snapping inward under it.
    pose(u, P, t) {
      const A = arc(0, .24, u), S = hold(.12, .28, .38, .86, u);
      head(P, { butt: 1.2 * S, fwd: .04 * S - .02 * A });
      feed(P, .6 * S, 0);
      antennae(P, .5 * A, 2 * Math.PI * u * 2, .4 * S);
      limbs(P, t, Math.sin(Math.PI * u) ** 2, { brace: .8 * S });
    },
  },
  {
    name: 'Heavy', duration: 1.1, loop: false,
    // The body drops and the limbs coil back over the wind-up, then a ramming thrust with the
    // cephalon down and every limb driving, and a skid with the antennae trailing.
    pose(u, P, t) {
      const W = hold(0, .3, .36, .5, u), S = hold(.36, .46, .62, .95, u), skid = hold(.5, .62, .8, 1, u);
      head(P, { low: 1.0 * W + .4 * S, butt: -.2 * W + 1.6 * S, fwd: -.04 * W + .12 * S });
      antennae(P, .3 * W, 2 * Math.PI * u * 3, .9 * S + .5 * skid);
      limbs(P, t, Math.sin(Math.PI * u) ** 2 * (1 - .8 * S), { coil: W, drive: S, brace: .5 * skid });
    },
  },
  {
    name: 'Attack', duration: 1.0, loop: false,
    // A shove with the head shield and the front limbs gathering inward behind it.
    pose(u, P, t) {
      const R = hold(.05, .3, .55, .9, u), D = hold(.36, .5, .62, .9, u);
      head(P, { butt: 1.0 * R, fwd: .07 * R, low: .3 * R });
      feed(P, .7 * D, 2 * Math.PI * u * 2);
      antennae(P, .4 * (1 - R) * Math.sin(Math.PI * u) ** 2, 2 * Math.PI * u * 2, .6 * D);
      limbs(P, t, Math.sin(Math.PI * u) ** 2 * (1 - .6 * R), { drive: .8 * R, brace: .4 * D });
    },
  },
  {
    name: 'Eat', duration: 1.2, loop: true,
    // Head down over the food; the front limb bases work it forward along the midline in a wave
    // while the hypostome rocks and the oral pump swallows; antennae feel the food.
    pose(u, P, t) {
      const ph = 2 * Math.PI * u * 2;
      head(P, { butt: .5, low: .3, pump: .5 + .5 * Math.sin(ph) });
      feed(P, .8, ph);
      antennae(P, .6, 2 * Math.PI * u);
      limbs(P, t, 1, { amp: .12, loopU: u });
    },
  },
  {
    name: 'Grab', duration: 1.2, loop: true,
    // The hold (Walliserops can take hold): the animal clamps down, cephalon pressed forward and
    // low, every front limb base locked inward on the catch, breathing.
    pose(u, P, t) {
      const ph = 2 * Math.PI * u;
      head(P, { butt: .8 + .03 * Math.sin(ph), low: .6 });
      for (const [s, sx] of SIDES) for (let i = 0; i < 10; i++) { const L = limb(i, s); P.bend(L[0], inward(sx), .35 + .03 * Math.sin(ph - i * .4)).bend(L[1], inward(sx), .15).bend(L[2], DOWN, .1); }
      antennae(P, .3, ph, .5);
      limbs(P, t, 1, { amp: .1, loopU: u, brace: .5 });
    },
  },
];
