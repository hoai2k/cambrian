/**
 * Acanthostega — Grab: the jaws clamp shut on the catch and hold while all four limbs plant
 * and brace against the ground, tail idling underneath.
 */
import { UP, DOWN } from '../lib.mjs';
import { wave, beatPhase } from '../common.mjs';

const TAIL = ['tail0', 'tail1', 'tail2', 'tail3', 'tail4', 'tail5'];
const SIDES = [['L', 1], ['R', -1]];

export const authored = (n) => /^(jaw|skull|upper(Fore|Hind)[LR]$|lower(Fore|Hind)[LR]$|palm(Fore|Hind)[LR]$|tail[0-5]$)/.test(n);

export const clips = [
  {
    name: 'Grab', duration: 1.1, loop: true,
    // Held pose: jaw clamped shut with a small squeeze pulsing on top, and all four limbs
    // pressed down into a planted brace rather than paddling. `jaw` is a leaf (restDir
    // well-defined), so `bend` closes it toward UP; `skull` is a hub with the jaw and throat as
    // unrelated children, so its brace is a `spin` (nose down) rather than a `bend`. Each limb
    // segment's rest direction runs outward along the limb toward its child, so bending every
    // segment toward DOWN swings the sprawled limb down to plant the foot.
    pose(u, P, t) {
      const ph = beatPhase(t, { loopU: u });
      const press = 0.03 * Math.sin(ph);
      P.bend('jaw', UP, 0.11 + press);
      P.spin('skull', [1, 0, 0], 0.02 + 0.4 * press);
      wave(P, TAIL, [1, 0, 0], 0.04, ph, .5);
      for (const [s, sx] of SIDES) {
        const settle = 0.02 * Math.sin(ph - sx);
        P.bend(`upperFore${s}`, DOWN, 0.13 + settle);
        P.bend(`lowerFore${s}`, DOWN, 0.16 + settle);
        P.bend(`palmFore${s}`, DOWN, 0.1 + 0.5 * settle);
        P.bend(`upperHind${s}`, DOWN, 0.11 + settle);
        P.bend(`lowerHind${s}`, DOWN, 0.14 + settle);
        P.bend(`palmHind${s}`, DOWN, 0.09 + 0.5 * settle);
      }
    },
  },
];
