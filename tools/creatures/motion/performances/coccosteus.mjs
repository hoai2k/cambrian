/**
 * Coccosteus — Grab: the arthrodire's shearing gnathal plates clamp shut on the catch and hold,
 * the armoured head braced back, tail and pectorals ticking over quietly underneath.
 */
import { UP, DOWN } from '../lib.mjs';
import { wave, beatPhase } from '../common.mjs';
import { flopClip } from '../gaits.mjs';

const TAIL = ['tail0', 'tail1', 'tail2', 'tail3', 'tail4', 'tail5'];

export const authored = (n) => /^(jaw|skull|pectoral0[LR]|tail[0-5]$)/.test(n);

export const clips = [
  {
    name: 'Grab', duration: 1.0, loop: true,
    // Shearing plates held shut on the catch with a firm little squeeze; the armoured head
    // stays braced and the tail keeps a low idling beat rather than going rigid. In the V3
    // rig `jaw` and `skull` are both leaves hanging off `body`, so `bend` closes the jaw
    // toward UP; the skull's brace stays a `spin` (nose down) because it is a pitch of the
    // whole armoured head about its lateral axis, not a bend toward a child. The tail runs
    // six stages here, so the beat is spread more gently per segment than the old four.
    pose(u, P, t) {
      const ph = beatPhase(t, { loopU: u });
      const press = 0.03 * Math.sin(ph);
      P.bend('jaw', UP, 0.1 + press);
      P.spin('skull', [1, 0, 0], 0.03 + 0.4 * press);
      wave(P, TAIL, [1, 0, 0], 0.05, ph, .45);
      P.bend('pectoral0L', DOWN, 0.03 * Math.sin(ph - 1));
      P.bend('pectoral0R', DOWN, 0.03 * Math.sin(ph - 1));
    },
  },
];

// The flop (src/sim/beach.ts): stranded, the arthrodire lashes its tail at the sand.
clips.push(flopClip({ tail: ['tail0','tail1','tail2','tail3','tail4','tail5'], pectorals: ['pectoral0L','pectoral0R'], skull: 'skull', jaw: 'jaw' }));
