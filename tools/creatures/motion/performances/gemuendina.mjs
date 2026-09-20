/**
 * Gemuendina — Grab: the rhenanid placoderm's biting plates clamp shut on the catch and hold,
 * the flattened head braced back, the leading wing edges and tail ticking over quietly underneath.
 */
import { UP, DOWN } from '../lib.mjs';
import { wave, beatPhase } from '../common.mjs';
import { flopClip } from '../gaits.mjs';

const TAIL = ['tail0', 'tail1', 'tail2', 'tail3', 'tail4', 'tail5', 'tail6'];

export const authored = (n) => /^(jaw|skull|pectoral0[LR]|tail[0-6]$)/.test(n);

export const clips = [
  {
    name: 'Grab', duration: 1.0, loop: true,
    // Held pose: biting plates clamped shut on the catch, a small squeeze pulsing on top; the
    // ray-like body never stops its light wing-edge flutter while it holds on. `jaw` is a leaf
    // (restDir well-defined), so `bend` closes it toward UP; `skull` is a hub with the branchial
    // plates, jaw and throat as unrelated children, so its brace is a `spin` (nose down) rather
    // than a `bend`.
    pose(u, P, t) {
      const ph = beatPhase(t, { loopU: u });
      const press = 0.03 * Math.sin(ph);
      P.bend('jaw', UP, 0.1 + press);
      P.spin('skull', [1, 0, 0], 0.02 + 0.4 * press);
      wave(P, TAIL, [1, 0, 0], 0.04, ph, .5);
      P.bend('pectoral0L', DOWN, 0.03 * Math.sin(ph - 1));
      P.bend('pectoral0R', DOWN, 0.03 * Math.sin(ph - 1));
    },
  },
];

// The flop (src/sim/beach.ts): a ray on the sand slaps with its whole margin.
clips.push(flopClip({ tail: ['tail0','tail1','tail2','tail3','tail4','tail5','tail6'], pectorals: ['pectoral0L','pectoral0R','pectoral1L','pectoral1R','pectoral2L','pectoral2R'], skull: 'skull', jaw: 'jaw', amp: 0.2 }));
