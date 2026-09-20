/**
 * Doryaspis — Grab: the jawless oral plates press shut around the catch like a sucker while the
 * head shield braces back, tail idling underneath.
 */
import { UP, DOWN } from '../lib.mjs';
import { wave, beatPhase } from '../common.mjs';
import { flopClip } from '../gaits.mjs';

const TAIL = ['tail_base', 'tail_mid', 'tail_distal', 'tail_tip'];
const inward = (sx) => [-sx, 0, 0];

export const authored = (n) => /^(shield|oral_(L|R|lower|upper)$|tail_(base|mid|distal|tip)$)/.test(n);

export const clips = [
  {
    name: 'Grab', duration: 1.0, loop: true,
    // Held pose: no jaw to close, so the four oral plates ringing the mouth pinch inward on the
    // catch like a sucker, with a small squeeze pulsing on top; the head shield stays braced and
    // the tail keeps a light idling beat. `shield` is a hub with the four oral plates as
    // unrelated children, so its brace is a `spin` (nose down) rather than a `bend`; each oral
    // plate is a leaf (restDir well-defined), so they `bend` shut toward the mouth's centre.
    pose(u, P, t) {
      const ph = beatPhase(t, { loopU: u });
      const press = 0.03 * Math.sin(ph);
      P.spin('shield', [1, 0, 0], 0.02 + 0.4 * press);
      P.bend('oral_upper', DOWN, 0.12 + press);
      P.bend('oral_lower', UP, 0.12 + press);
      P.bend('oral_L', inward(1), 0.1 + press);
      P.bend('oral_R', inward(-1), 0.1 + press);
      wave(P, TAIL, [1, 0, 0], 0.04, ph, .5);
    },
  },
];

// The flop (src/sim/beach.ts): a jawless shield with a tail, so it is all tail.
clips.push(flopClip({ tail: ['tail_base','tail_mid','tail_distal','tail_tip'], skull: 'shield', amp: 0.34 }));
