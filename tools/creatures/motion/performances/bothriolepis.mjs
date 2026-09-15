/**
 * Bothriolepis — Grab: the oral plates press shut on the catch while the bony pectoral
 * appendages press in on either side of it, tail idling underneath.
 */
import { DOWN } from '../lib.mjs';
import { wave, beatPhase } from '../common.mjs';

const TAIL = ['tail_base', 'tail_mid', 'tail_tip'];
const inward = (sx) => [-sx, 0, 0];

export const authored = (n) => /^(oral|pectoral_[LR]$|tail_(base|mid|tip)$)/.test(n);

export const clips = [
  {
    name: 'Grab', duration: 1.1, loop: true,
    // Held pose: the antiarch has no hinged jaw, just the small oral plates at the snout, so
    // they press down onto the catch with a small squeeze pulsing on top while the long, jointed
    // pectoral appendages fold in and press against it from either side; the body keeps a light
    // idle beat while it holds on.
    pose(u, P, t) {
      const ph = beatPhase(t, { loopU: u });
      const press = 0.03 * Math.sin(ph);
      P.bend('oral', DOWN, 0.1 + press);
      wave(P, TAIL, [1, 0, 0], 0.04, ph, .5);
      for (const [s, sx] of [['L', 1], ['R', -1]]) {
        P.bend(`pectoral_${s}`, DOWN, 0.22 + 0.5 * press);
        P.bend(`pectoral_${s}`, inward(sx), 0.16 + 0.3 * press);
      }
    },
  },
];
