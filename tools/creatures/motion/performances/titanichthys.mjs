/**
 * Titanichthys — Grab: the huge gape closes shut on the catch and holds, the body kept steady
 * rather than driving, tail and pectorals ticking over quietly underneath.
 */
import { UP, DOWN } from '../lib.mjs';
import { wave, beatPhase } from '../common.mjs';

const TAIL = ['tail0', 'tail1', 'tail2', 'tail3', 'tail4', 'tail5'];
const inward = (sx) => [-sx, 0, 0];

export const authored = (n) => /^(jaw|commissure[LR]$|pectoral0[LR]$|tail[0-5]$)/.test(n);

export const clips = [
  {
    name: 'Grab', duration: 1.1, loop: true,
    // Held pose: the gape closed with a small squeeze pulsing on top and the mouth corners
    // (the commissures) pinching in with it; the body stays steady rather than bracing hard,
    // just a light tail and pectoral tick-over underneath. `jaw` and `commissureL/R` are leaves
    // off `body` (restDir well-defined), so they `bend` shut toward UP / inward.
    pose(u, P, t) {
      const ph = beatPhase(t, { loopU: u });
      const press = 0.025 * Math.sin(ph);
      P.bend('jaw', UP, 0.09 + press);
      P.bend('commissureL', inward(1), 0.05 + 0.5 * press);
      P.bend('commissureR', inward(-1), 0.05 + 0.5 * press);
      wave(P, TAIL, [1, 0, 0], 0.035, ph, .5);
      P.bend('pectoral0L', DOWN, 0.02 * Math.sin(ph - 1));
      P.bend('pectoral0R', DOWN, 0.02 * Math.sin(ph - 1));
    },
  },
];
