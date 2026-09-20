/**
 * Nothosaurus — Walk (src/sim/beach.ts): rowing its paddles up the sand like a sea lion, the trunk swaying against them.
 */
import { walkClip } from '../gaits.mjs';

export const clips = [
  walkClip({ limbs: [[['fore_upper_L','fore_lower_L','fore_paddle_L'], 1], [['fore_upper_R','fore_lower_R','fore_paddle_R'], -1], [['hind_upper_L','hind_lower_L','hind_paddle_L'], 1], [['hind_upper_R','hind_lower_R','hind_paddle_R'], -1]], tail: ['tail_00','tail_01','tail_02','tail_03','tail_04','tail_05','tail_06'], body: 'body', duration: 1.6, reach: 0.4, lift: 0.2, fold: 0.15, tailAmp: 0.06, roll: 0.06 }),
];
