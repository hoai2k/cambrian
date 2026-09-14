/**
 * Odontogriphus — the grip it does not have.
 *
 * A soft-bodied mollusc: fourteen body plates in a chain (`body`, `body_00`..`body_13`) carrying
 * mirrored rows of gills (`gill_1_NN` / `gill_-1_NN`) down the flanks, and a single `radula` at
 * the head. There are no arms, so the hold is the radula and the foot: the radula keeps rasping
 * at the catch, held against it rather than sweeping past, while the body settles low and a slow
 * press-wave runs back along the plates like the adhesive foot bearing down; the gills breathe
 * quietly through it.
 */
import { DOWN, FWD } from '../lib.mjs';
import { pad, range } from '../common.mjs';

const SIDES = [1, -1];
const inward = (s) => [-s, 0, 0];
const BODY = range(14).map((i) => `body_${pad(i)}`);
const GILLS = (s) => range(46).map((i) => `gill_${s}_${pad(i)}`);

/** Bones this performance authors: the radula, the body plates and the gills. */
export const authored = (n) => /^(radula|body_|gill_)/.test(n);

export const clips = [
  {
    name: 'Grab', duration: 1.0, loop: true,
    // The radula keeps working at the hold in small strokes rather than sweeping past it, the
    // foot presses down with a slow wave running tail-ward, and the gills sway at a low amplitude.
    pose(u, P) {
      const ph = 2 * Math.PI * u;
      P.bend('radula', FWD, 0.16 + 0.05 * Math.sin(ph * 2));
      P.bend('body_00', DOWN, 0.1 + 0.02 * Math.sin(ph));
      BODY.forEach((b, i) => P.bend(b, DOWN, 0.05 + 0.015 * Math.sin(ph - i * 0.35)));
      for (const s of SIDES) GILLS(s).forEach((b, i) => P.bend(b, inward(s), 0.03 + 0.02 * Math.sin(ph - i * 0.22)));
    },
  },
];
