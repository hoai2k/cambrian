/**
 * Birgeria — Flop (src/sim/beach.ts): stranded, the fish lashes its tail at the sand. The hop and the twist are the simulation's.
 */
import { flopClip } from '../gaits.mjs';

export const clips = [
  flopClip({ tail: ['tail_00','tail_01','tail_02','tail_03','tail_04','tail_05','tail_06'], pectorals: ['pec_upper_L','pec_upper_R'], skull: 'skull', jaw: 'jaw', amp: 0.3 }),
];
