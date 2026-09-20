/**
 * Tiktaalik — Grab: the jaws clamp shut on the catch while the wrist-jointed pectoral fins
 * plant down and prop against the ground, tail idling underneath.
 */
import { UP, DOWN } from '../lib.mjs';
import { wave, beatPhase } from '../common.mjs';
import { walkClip } from '../gaits.mjs';

const TAIL = ['tail0', 'tail1', 'tail2', 'tail3', 'tail4', 'tail5'];
const SIDES = [['L', 1], ['R', -1]];

export const authored = (n) => /^(jaw|skull|pectoral[LR]$|elbow[LR]$|distal[LR]$|tail[0-5]$)/.test(n);

export const clips = [
  {
    name: 'Grab', duration: 1.1, loop: true,
    // Held pose: jaw clamped shut with a small squeeze pulsing on top, and the wrist-jointed
    // pectoral fins pressed down flat to prop the front of the body rather than paddling.
    // `jaw` is a leaf (restDir well-defined), so `bend` closes it toward UP; `skull` is a hub
    // with the cheeks, jaw and throat as unrelated children, so its brace is a `spin` (nose
    // down) rather than a `bend`. Each fin segment's rest direction runs outward along the fin
    // toward its child, so bending every segment toward DOWN presses the fin flat to plant it.
    pose(u, P, t) {
      const ph = beatPhase(t, { loopU: u });
      const press = 0.03 * Math.sin(ph);
      P.bend('jaw', UP, 0.11 + press);
      P.spin('skull', [1, 0, 0], 0.02 + 0.4 * press);
      wave(P, TAIL, [1, 0, 0], 0.04, ph, .5);
      for (const [s, sx] of SIDES) {
        const settle = 0.02 * Math.sin(ph - sx);
        P.bend(`pectoral${s}`, DOWN, 0.14 + settle);
        P.bend(`elbow${s}`, DOWN, 0.17 + settle);
        P.bend(`distal${s}`, DOWN, 0.12 + 0.5 * settle);
      }
    },
  },
];

// The walk (src/sim/beach.ts): up the beach on its elbows, the lobe fins planting and drawing back, the tail sweeping against them.
clips.push(walkClip({ limbs: [[['pectoralL','elbowL','distalL'], 1], [['pectoralR','elbowR','distalR'], -1], [['pelvicL','pelvicDistalL'], 1], [['pelvicR','pelvicDistalR'], -1]], tail: ['tail0','tail1','tail2','tail3','tail4','tail5'], body: 'body', duration: 1.6, reach: 0.3, lift: 0.22, fold: 0.28, tailAmp: 0.08 }));
