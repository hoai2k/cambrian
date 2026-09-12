/**
 * Canadia — the grip it does not have.
 *
 * A bristle worm: 21 body segments in a single chain, each carrying a mirrored pair of bristled
 * parapodia (`parapodium_1_NN` / `parapodium_-1_NN`, the sweeping weapon in Bristle brush and
 * Bristle sweep) and a short forward-reaching proboscis with two anterior tentacles
 * (`tentacle_1`/`tentacle_-1` + tips) either side of the mouth. Nothing here is a claw, so the
 * hold is the head: the first few segments curl in around the catch, the two head tentacles
 * clasp it against the proboscis, and the parapodia stay drawn in along the flanks in a quiet
 * held quiver — never the swept-out flare of a fight.
 */
import { DOWN } from '../lib.mjs';
import { pad, range } from '../common.mjs';

const SIDES = [1, -1];
const inward = (s) => [-s, 0, 0];
const SEG = range(21).map((i) => `segment_${pad(i)}`);
const PARA = (s) => range(21).map((i) => `parapodium_${s}_${pad(i)}`);

/** Bones this performance authors: the head curl, the head tentacles and the parapodial quiver. */
export const authored = (n) => /^(proboscis|segment_0[0-5]$|parapodium_|tentacle_)/.test(n);

export const clips = [
  {
    name: 'Grab', duration: 1.0, loop: true,
    // Held, not bitten: the front six segments curl down around whatever it caught, the head
    // tentacles clasp it against the proboscis, and the parapodia along the whole length are
    // drawn in toward the body rather than swept out — a slow breathing squeeze, never opening.
    pose(u, P) {
      const ph = 2 * Math.PI * u;
      const curl = 0.5 + 0.05 * Math.sin(ph);
      for (let i = 0; i < 6; i++) P.bend(SEG[i], DOWN, curl * (0.11 - i * 0.012));
      P.bend('proboscis', DOWN, 0.14 + 0.02 * Math.sin(ph));
      for (const s of SIDES) {
        P.bend(`tentacle_${s}`, inward(s), 0.38 + 0.03 * Math.sin(ph));
        P.bend(`tentacle_tip_${s}`, inward(s), 0.32 + 0.04 * Math.sin(ph - 0.5));
      }
      for (const s of SIDES) PARA(s).forEach((b, i) => P.bend(b, inward(s), 0.09 + 0.02 * Math.sin(ph - i * 0.3)));
    },
  },
];
