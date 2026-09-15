/**
 * Wiwaxia — the grip it does not have.
 *
 * Nine armoured body plates (`body_00`..`body_08`), no legs and no arms under the sclerites. So
 * the hold is the whole body: it hunkers down onto the catch, the head plate over the mouth
 * pitching down hardest, and a slow ripple runs back along the row of plates like a held breath
 * — the same idea as the mucous foot bearing down while grazing, just closed around something
 * instead of the sediment.
 */
import { DOWN } from '../lib.mjs';
import { range } from '../common.mjs';

const BODY = range(9).map((i) => `body_0${i}`);

/** Bones this performance authors: the whole plated body. */
export const authored = (n) => /^body_/.test(n);

export const clips = [
  {
    name: 'Grab', duration: 1.0, loop: true,
    // Hunkered down onto the hold: the plates settle low with a slow tail-ward ripple, the head
    // plate over the mouth pitching down the hardest.
    pose(u, P) {
      const ph = 2 * Math.PI * u;
      BODY.forEach((b, i) => P.shift(b, [0, -(0.045 + 0.012 * Math.sin(ph - i * 0.5)), 0]));
      P.bend('body_00', DOWN, 0.12 + 0.02 * Math.sin(ph));
      P.bend('body_01', DOWN, 0.06 + 0.012 * Math.sin(ph - 0.4));
    },
  },
];
