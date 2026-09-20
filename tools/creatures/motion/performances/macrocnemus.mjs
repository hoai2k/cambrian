/**
 * Macrocnemus — Peer (src/sim/triassic/shore.ts): the runner at the edge looking in, the raised neck brought down and forward over the water.
 */
import { peerClip } from '../gaits.mjs';

const NECK = ['neck_00','neck_01','neck_02','neck_03','neck_04','neck_05'];
export const clips = [
  peerClip({ neck: NECK, skull: 'skull', drop: 0.9, forward: 0.5, headUp: 0.2, sway: 0.04, name: 'Peer', duration: 4 }),
];
