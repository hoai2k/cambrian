/**
 * Tanystropheus — Fish (src/sim/triassic/shore.ts): the watch at the water's edge, the boom pitched down from the shoulders as one stiff beam with the head angled at the water, and the smallest of sways so it reads as alive.
 */
import { peerClip } from '../gaits.mjs';

const NECK = ['neck_00','neck_01','neck_02','neck_03','neck_04','neck_05','neck_06','neck_07','neck_08','neck_09','neck_10','neck_11','neck_12'];
export const clips = [
  peerClip({ neck: NECK, skull: 'skull', drop: 0.55, headUp: 0.35, sway: 0.06, name: 'Fish', duration: 4 }),
];
