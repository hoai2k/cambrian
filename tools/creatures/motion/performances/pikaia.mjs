/**
 * Pikaia — the grip it does not have.
 *
 * Just a ribbon: eighteen body segments in a single chain, a few gill bones at the head
 * (`gill_1_0`..`gill_1_5` / `gill_-1_0`..`gill_-1_5`) and two four-jointed sensory cirri
 * (`sensor_1_0..3` / `sensor_-1_0..3`). No jaws, no arms — a basal chordate has nothing to grip
 * with — so the hold is the whole body: the ribbon curls into a loose ventral loop around
 * whatever it caught (or whatever it is clinging to), the head pressed down against the hold,
 * and it breathes with a slow tightening squeeze while the cirri and gills stay quietly alive.
 */
import { DOWN } from '../lib.mjs';
import { pad, range } from '../common.mjs';

const SIDES = [1, -1];
const inward = (s) => [-s, 0, 0];
const BODY = range(18).map((i) => `body_${pad(i)}`);

/** Bones this performance authors: the whole ribbon curls, the cirri and gills settle. */
export const authored = (n) => /^(body|body_|sensor_|gill_)/.test(n);

export const clips = [
  {
    name: 'Grab', duration: 1.0, loop: true,
    // A loose ventral curl held around the catch, tightening and easing in a slow breath; the
    // cirri and gills sway at a low amplitude rather than going still.
    pose(u, P) {
      const ph = 2 * Math.PI * u;
      const squeeze = 0.5 + 0.06 * Math.sin(ph);
      P.bend('body', DOWN, 0.16 + 0.02 * Math.sin(ph));
      BODY.forEach((b, i) => P.bend(b, DOWN, squeeze * (0.045 + 0.05 * (i / (BODY.length - 1)))));
      for (const s of SIDES) {
        P.bend(`sensor_${s}_0`, inward(s), 0.05 * Math.sin(ph));
        P.bend(`sensor_${s}_2`, DOWN, 0.04 * Math.sin(ph - 0.6));
        for (let i = 0; i < 6; i++) P.bend(`gill_${s}_${i}`, inward(s), 0.02 * Math.sin(ph - i * 0.3));
      }
    },
  },
];
