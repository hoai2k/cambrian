/**
 * Cladoselache — Grab: the cladodont bite closes on a torn mouthful and holds it, jaw shut
 * short of fully closed around the catch, the long pectorals coasting and the tail idling underneath.
 */
import { UP, DOWN } from '../lib.mjs';
import { wave, beatPhase } from '../common.mjs';
import { flopClip } from '../gaits.mjs';

const TAIL = ['tail0', 'tail1', 'tail2', 'tail3', 'tail4', 'tail5'];

export const authored = (n) => /^(jaw|skull|pectoral[LR]|tail[0-5]$)/.test(n);

export const clips = [
  {
    name: 'Grab', duration: 1.0, loop: true,
    // Jaw clamped on the catch with a hard little squeeze; the pectorals hold their coasting
    // set and the tail keeps a slow idling beat rather than freezing mid-hunt. `jaw` is a leaf
    // (restDir well-defined), so `bend` closes it toward UP; `skull` is a hub with gills, jaw
    // and throat as unrelated children, so its brace is a `spin` (nose down) rather than a `bend`.
    pose(u, P, t) {
      const ph = beatPhase(t, { loopU: u });
      const press = 0.035 * Math.sin(ph);
      P.bend('jaw', UP, 0.14 + press);
      P.spin('skull', [1, 0, 0], 0.025 + 0.4 * press);
      wave(P, TAIL, [1, 0, 0], 0.06, ph, .5);
      P.bend('pectoralL', DOWN, 0.03 * Math.sin(ph - 1));
      P.bend('pectoralR', DOWN, 0.03 * Math.sin(ph - 1));
    },
  },
];

// The flop (src/sim/beach.ts).
clips.push(flopClip({ tail: ['tail0','tail1','tail2','tail3','tail4','tail5'], pectorals: ['pectoralL','pectoralR'], skull: 'skull', jaw: 'jaw', amp: 0.3 }));
