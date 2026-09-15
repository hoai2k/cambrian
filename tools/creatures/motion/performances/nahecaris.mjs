/**
 * Nahecaris — Grab: the mandibles clamp shut on the catch while the frontmost thoracopod pair
 * (the maxillipeds) gathers it in against the mouth, the abdomen idling underneath.
 */
import { UP } from '../lib.mjs';
import { wave, beatPhase } from '../common.mjs';

const ABDOMEN = ['abdomen0', 'abdomen1', 'abdomen2', 'abdomen3', 'abdomen4', 'abdomen5', 'abdomen6'];
const inward = (sx) => [-sx, 0, 0];

export const authored = (n) => /^(mandible[LR]$|thoracopod[LR]0$|endopod[LR]0$|abdomen[0-6]$)/.test(n);

export const clips = [
  {
    name: 'Grab', duration: 1.0, loop: true,
    // Held pose: the mandibles clamp shut with a small squeeze pulsing on top, and the
    // frontmost thoracopod pair (the maxillipeds, closest to the mouth) gathers inward and up
    // against the catch rather than paddling; the abdomen keeps a light idling flex underneath.
    // `mandibleL/R` are leaves (restDir well-defined), so `bend` closes them toward UP.
    pose(u, P, t) {
      const ph = beatPhase(t, { loopU: u });
      const press = 0.03 * Math.sin(ph);
      P.bend('mandibleL', UP, 0.14 + press);
      P.bend('mandibleR', UP, 0.14 + press);
      wave(P, ABDOMEN, [1, 0, 0], 0.03, ph, .5);
      for (const [s, sx] of [['L', 1], ['R', -1]]) {
        P.bend(`thoracopod${s}0`, inward(sx), 0.22 + 0.4 * press);
        P.bend(`thoracopod${s}0`, UP, 0.16 + 0.4 * press);
        P.bend(`endopod${s}0`, inward(sx), 0.14 + 0.4 * press);
      }
    },
  },
];
