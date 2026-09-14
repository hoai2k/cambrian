/**
 * Dunkleosteus — Grab: the self-sharpening gnathal blades clamp shut on the catch and hold,
 * the huge armoured head braced back and level, tail and pectorals ticking over underneath.
 */
import { UP, DOWN } from '../lib.mjs';
import { wave, beatPhase } from '../common.mjs';

const TAIL = ['tail_base', 'tail_mid', 'tail_tip'];

export const authored = (n) => /^(jaw|head|pectoral_[LR]|tail_(base|mid|tip)$)/.test(n);

export const clips = [
  {
    name: 'Grab', duration: 1.1, loop: true,
    // Shearing plates held shut on the catch with a slow, heavy squeeze; the armoured head
    // stays braced and the tail keeps a low idling beat rather than going rigid. `jaw` is a
    // leaf hung off `head` (restDir well-defined from the hinge), so `bend` closes it toward
    // UP; `head` itself has only `jaw` as a child, so it is not a hub and takes the same brace
    // `bend` the other fish give their skull.
    pose(u, P, t) {
      const ph = beatPhase(t, { loopU: u, period: 1.4 });
      const press = 0.025 * Math.sin(ph);
      P.bend('jaw', UP, 0.08 + press);
      P.bend('head', DOWN, 0.02 + 0.4 * press);
      wave(P, TAIL, [1, 0, 0], 0.04, ph, .55);
      P.bend('pectoral_L', DOWN, 0.025 * Math.sin(ph - 1));
      P.bend('pectoral_R', DOWN, 0.025 * Math.sin(ph - 1));
    },
  },
];
