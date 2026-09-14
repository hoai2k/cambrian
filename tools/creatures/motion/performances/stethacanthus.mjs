/**
 * Stethacanthus — Grab: the cladodont bite closes on the catch and holds, jaw shut short of
 * fully closed around it, the pectorals coasting and the tail idling underneath.
 */
import { UP, DOWN } from '../lib.mjs';
import { wave, beatPhase } from '../common.mjs';

const TAIL = ['tail_base', 'tail_mid', 'tail_distal', 'tail_tip'];

export const authored = (n) => /^(jaw|skull|pectoral_[LR]$|tail_(base|mid|distal|tip)$)/.test(n);

export const clips = [
  {
    name: 'Grab', duration: 1.0, loop: true,
    // Jaw clamped on the catch with a hard little squeeze; the pectorals hold their coasting
    // set and the tail keeps a slow idling beat rather than freezing mid-hunt. `jaw` is a leaf
    // (restDir well-defined), so `bend` closes it toward UP; `skull` is a hub with the gills and
    // jaw as unrelated children, so its brace is a `spin` (nose down) rather than a `bend`.
    pose(u, P, t) {
      const ph = beatPhase(t, { loopU: u });
      const press = 0.035 * Math.sin(ph);
      P.bend('jaw', UP, 0.14 + press);
      P.spin('skull', [1, 0, 0], 0.025 + 0.4 * press);
      wave(P, TAIL, [1, 0, 0], 0.05, ph, .5);
      P.bend('pectoral_L', DOWN, 0.03 * Math.sin(ph - 1));
      P.bend('pectoral_R', DOWN, 0.03 * Math.sin(ph - 1));
    },
  },
];
