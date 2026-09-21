/**
 * The shore's gaits, authored once and lent to every rig that needs them (src/sim/beach.ts,
 * src/sim/triassic/shore.ts). Each returns a clip definition for `apply.mjs`.
 *
 * - `flopClip` — a stranded water-breather throwing itself down the beach at the sea. The hop, the
 *   twist and the nose-up are the simulation's own (`FLOP_PERIOD`, `FLOP_TWIST`, `FLOP_PITCH` in
 *   beach.ts drive `pos.y`, `bank` and `pitch`); this is the body's *own* part of it, the lash the
 *   hop is thrown with: the tail whips hard to one side and back, the pectorals splay and press,
 *   the head jerks the other way, the mouth gapes. One `FLOP_PERIOD` long so the loop is the flop.
 * - `walkClip` — a sprawling lateral-sequence walk for a body with four limbs and a tail: each limb
 *   swings forward lifted and is drawn back planted, diagonal pairs a half-cycle apart (LH, LF, RH,
 *   RF a quarter apart), the trunk undulating against them and rolling a little onto the planted
 *   side. The same shape serves a lobe-finned fish on its elbows, a tetrapod on its palms and a
 *   nothosaur rowing its paddles up the sand; only the amplitudes differ.
 * - `peerClip` — a lurker's watch at the water's edge: the neck brought down and forward so the
 *   head hangs over the water, with the smallest of sways so it reads as alive.
 *
 * Every loop is a function of `2π·u` alone, so it closes on itself for every bone (a new clip has
 * no shipped source to carry, so the seam is checked on the whole rig).
 */
import { UP, DOWN, FWD, BACK } from './lib.mjs';
import { wave, chain } from './common.mjs';

const TAU = Math.PI * 2;
const pos = (x) => Math.max(0, x);

/**
 * @param {object} o
 * @param {string[]} o.tail  the tail chain, root to tip
 * @param {string[]} [o.pectorals] the paired fin roots (both sides)
 * @param {string} [o.skull] the head hub (pitched with spin)
 * @param {string} [o.jaw]
 * @param {number} [o.amp] lateral tail amplitude per segment, radians
 * @param {number} [o.duration] seconds; the simulation's FLOP_PERIOD
 */
export function flopClip({ tail, pectorals = [], skull, jaw, amp = 0.28, duration = 0.8, headAxis = [1, 0, 0] } = {}) {
  return {
    name: 'Flop', duration, loop: true,
    pose(u, P) {
      const ph = TAU * u;
      // One hard lash to the left and back to the right across the flop, the tip trailing.
      wave(P, tail, [1, 0, 0], amp, ph, 0.55);
      // The body arches (nose and tail both up) at the top of the throw and flattens on landing.
      const arch = 0.35 * pos(Math.sin(ph));
      chain(P, tail, UP, arch * 0.12, (i, n) => 0.4 + 0.6 * i / (n - 1));
      if (skull) { P.spin(skull, headAxis, -arch * 0.5); P.spin(skull, [0, 1, 0], 0.25 * Math.sin(ph)); }
      if (jaw) P.bend(jaw, DOWN, 0.12 + 0.1 * pos(Math.sin(ph + 0.5)));
      // Fins out and pressing against the sand, then folding as the body leaves it.
      for (const f of pectorals) { P.bend(f, DOWN, 0.35 * pos(-Math.cos(ph)) + 0.08); P.bend(f, BACK, 0.2 * pos(Math.sin(ph))); }
    },
  };
}

/**
 * @param {object} o
 * @param {Array<[string[], number]>} o.limbs  [[upper, lower, foot?], side] × 4 in the order LF, RF, LH, RH; side +1 left, -1 right
 * @param {string[]} [o.tail]
 * @param {string} [o.body]
 * @param {number} [o.duration]
 * @param {number} [o.reach]  protraction/retraction of the upper limb, radians
 * @param {number} [o.lift]   how far the upper limb lifts in the swing
 * @param {number} [o.fold]   how far the lower limb folds in the swing
 * @param {number} [o.tailAmp]
 * @param {number} [o.roll]   trunk roll onto the planted side
 * @param {string} [o.name]
 */
export function walkClip({ limbs, tail = [], body, duration = 1.6, reach = 0.35, lift = 0.28, fold = 0.32, tailAmp = 0.07, roll = 0.05, name = 'Walk' } = {}) {
  // Lateral sequence: LH, LF, RH, RF a quarter cycle apart. `limbs` comes in as LF, RF, LH, RH.
  const offset = [0.25, 0.75, 0, 0.5];
  return {
    name, duration, loop: true,
    pose(u, P) {
      limbs.forEach(([[upper, lower, foot], side], i) => {
        const ph = TAU * (u - offset[i]);
        const swing = pos(Math.cos(ph));                 // lifted and coming forward
        P.bend(upper, FWD, reach * Math.sin(ph));
        P.bend(upper, UP, lift * swing);
        if (lower) { P.bend(lower, UP, fold * swing); P.bend(lower, DOWN, 0.1 * pos(-Math.cos(ph))); }
        if (foot) P.bend(foot, DOWN, 0.15 * pos(-Math.cos(ph)));
        void side;
      });
      // The trunk sways against the limbs and rolls onto whichever side is planted.
      const ph = TAU * u;
      wave(P, tail, [1, 0, 0], tailAmp, ph + Math.PI, 0.45);
      if (body) { P.twist(body, roll * Math.sin(ph)); P.bend(body, [1, 0, 0], 0.03 * Math.sin(ph)); }
    },
  };
}

/**
 * @param {object} o
 * @param {string[]} o.neck   the neck chain, base to last vertebra
 * @param {string} o.skull
 * @param {number} [o.drop]   how far the whole neck comes down, radians spread along the chain
 * @param {number} [o.forward] how far it reaches forward (a bend toward FWD, for a neck that rests raised)
 * @param {number} [o.headUp] the skull angled back up so the eyes are on the water rather than the sand
 * @param {number} [o.sway]   lateral sway amplitude
 * @param {string} [o.name]
 * @param {number} [o.duration]
 */
export function peerClip({ neck, skull, drop = 0.6, forward = 0, headUp = 0.3, sway = 0.05, name = 'Fish', duration = 4 } = {}) {
  return {
    name, duration, loop: true,
    pose(u, P) {
      const ph = TAU * u;
      const n = neck.length;
      chain(P, neck, DOWN, drop / n);
      if (forward) chain(P, neck, FWD, forward / n);
      // The slow sway, and a breath: the neck lifts a hair and settles.
      wave(P, neck, [1, 0, 0], sway / n, ph, 0.15);
      chain(P, neck, UP, 0.02 * Math.sin(ph) / n);
      P.spin(skull, [1, 0, 0], -headUp + 0.03 * Math.sin(ph + 1));
    },
  };
}
