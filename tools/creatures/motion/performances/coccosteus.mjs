/**
 * Coccosteus — Grab: the arthrodire's shearing gnathal plates clamp shut on the catch and hold,
 * the armoured head braced back, tail and pectorals ticking over quietly underneath.
 */
import { UP, DOWN } from '../lib.mjs';
import { wave, beatPhase } from '../common.mjs';

const TAIL = ['tail0', 'tail1', 'tail2', 'tail3'];

export const authored = (n) => /^(jaw|skull|pectoral[LR]|tail[0-3]$)/.test(n);

export const clips = [
  {
    name: 'Grab', duration: 1.0, loop: true,
    // Shearing plates held shut on the catch with a firm little squeeze; the armoured head
    // stays braced and the tail keeps a low idling beat rather than going rigid. `jaw` is a
    // leaf (restDir well-defined), so `bend` closes it toward UP; `skull` is a hub with gills,
    // jaw and throat as unrelated children, so its brace is a `spin` (nose down) not a `bend`.
    pose(u, P, t) {
      const ph = beatPhase(t, { loopU: u });
      const press = 0.03 * Math.sin(ph);
      P.bend('jaw', UP, 0.1 + press);
      P.spin('skull', [1, 0, 0], 0.03 + 0.4 * press);
      wave(P, TAIL, [1, 0, 0], 0.05, ph, .6);
      P.bend('pectoralL', DOWN, 0.03 * Math.sin(ph - 1));
      P.bend('pectoralR', DOWN, 0.03 * Math.sin(ph - 1));
    },
  },
];
