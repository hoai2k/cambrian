/**
 * Cartorhynchus — Walk (src/sim/beach.ts): the amphibious ichthyosauriform hauling itself up the beach on its flexible flippers.
 */
import { walkClip } from '../gaits.mjs';

export const clips = [
  walkClip({ limbs: [[['fore_upper_L','fore_mid_L','fore_tip_L'], 1], [['fore_upper_R','fore_mid_R','fore_tip_R'], -1], [['hind_upper_L','hind_mid_L','hind_tip_L'], 1], [['hind_upper_R','hind_mid_R','hind_tip_R'], -1]], tail: ['tail_00','tail_01','tail_02','tail_03'], body: 'body', duration: 1.2, reach: 0.35, lift: 0.2, fold: 0.2, tailAmp: 0.08 }),
];
