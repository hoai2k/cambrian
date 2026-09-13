/**
 * Cheirolepis — Grab: an early ray-fin's small jaws close around the catch and stay shut,
 * pressing with a light rhythmic bite while the tail and pectorals keep a quiet shoaling flutter.
 */
import { UP, DOWN } from '../lib.mjs';
import { wave, beatPhase } from '../common.mjs';

const TAIL = ['tail0', 'tail1', 'tail2', 'tail3', 'tail4', 'tail5'];

export const authored = (n) => /^(jaw|skull|pectoral[LR]|tail[0-5]$)/.test(n);

export const clips = [
  {
    name: 'Grab', duration: 1.0, loop: true,
    // Held pose: jaw clamped shut on the catch, a small squeeze pulsing on top; body never
    // stops its light finning while it holds on. `jaw` is a leaf (restDir well-defined), so
    // `bend` closes it toward UP; `skull` is a hub with gills, jaw and throat as unrelated
    // children, so its brace is a `spin` (nose down) rather than a `bend`.
    pose(u, P, t) {
      const ph = beatPhase(t, { loopU: u });
      const press = 0.03 * Math.sin(ph);
      P.bend('jaw', UP, 0.11 + press);
      P.spin('skull', [1, 0, 0], 0.02 + 0.4 * press);
      wave(P, TAIL, [1, 0, 0], 0.05, ph, .5);
      P.bend('pectoralL', DOWN, 0.04 * Math.sin(ph - 1));
      P.bend('pectoralR', DOWN, 0.04 * Math.sin(ph - 1));
    },
  },
];
