/**
 * Rhinodipterus — Grab: the lungfish's crushing tooth plates grind shut on the catch and hold,
 * a slow heavy squeeze, the skull braced back, tail and pectorals ticking over underneath.
 */
import { UP, DOWN } from '../lib.mjs';
import { wave, beatPhase } from '../common.mjs';

const TAIL = ['tail0', 'tail1', 'tail2', 'tail3'];

export const authored = (n) => /^(jaw|skull|pectoral[LR]$|tail[0-3]$)/.test(n);

export const clips = [
  {
    name: 'Grab', duration: 1.2, loop: true,
    // Held pose: the crushing plates clamped shut with a slow, deep grinding squeeze rather than
    // a quick bite-press; the body keeps a light finning while it holds on. `jaw` is a leaf
    // (restDir well-defined), so `bend` closes it toward UP; `skull` is a hub with the gills, jaw
    // and throat as unrelated children, so its brace is a `spin` (nose down) rather than a `bend`.
    pose(u, P, t) {
      const ph = beatPhase(t, { loopU: u });
      const press = 0.04 * Math.sin(ph);
      P.bend('jaw', UP, 0.13 + press);
      P.spin('skull', [1, 0, 0], 0.02 + 0.4 * press);
      wave(P, TAIL, [1, 0, 0], 0.05, ph, .55);
      P.bend('pectoralL', DOWN, 0.035 * Math.sin(ph - 1));
      P.bend('pectoralR', DOWN, 0.035 * Math.sin(ph - 1));
    },
  },
];
