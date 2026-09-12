/**
 * Vetulicola — the grip it does not have.
 *
 * A chamber and a tail: seven tail segments (`body_00`..`body_06`) hang off the pumping chamber
 * (`body`), which also carries five pharyngeal pouches a side (`pouch_1_0`..`4` /
 * `pouch_-1_0`..`4`). No jaws and no arms, so the hold is the tail and the pump: the tail curls
 * forward and under the chamber to cup and pin the catch near the mouth, the pouches keep a slow
 * breathing pulse — the pump never fully stops — and the chamber presses gently down onto it.
 */
import { DOWN, FWD } from '../lib.mjs';
import { range } from '../common.mjs';

const SIDES = [1, -1];
const inward = (s) => [-s, 0, 0];
const TAIL = range(7).map((i) => `body_0${i}`);
const POUCH = (s) => range(5).map((i) => `pouch_${s}_${i}`);

/** Bones this performance authors: the tail curl, the chamber press and the pouches. */
export const authored = (n) => /^(body|body_|pouch_)/.test(n);

export const clips = [
  {
    name: 'Grab', duration: 1.0, loop: true,
    // The tail curls forward and under the chamber to hold the catch there, the chamber presses
    // down a little onto it, and the pouches keep pulsing at a fraction of their swimming beat.
    pose(u, P) {
      const ph = 2 * Math.PI * u;
      const curl = 0.55 + 0.05 * Math.sin(ph);
      TAIL.forEach((b, i) => P.bend(b, FWD, curl * (0.09 + 0.05 * (i / (TAIL.length - 1)))).bend(b, DOWN, curl * 0.03));
      P.bend('body', DOWN, 0.06 + 0.015 * Math.sin(ph));
      for (const s of SIDES) POUCH(s).forEach((b, i) => P.bend(b, inward(s), 0.05 + 0.03 * Math.sin(ph - i * 0.5)));
    },
  },
];
