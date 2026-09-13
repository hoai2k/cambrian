/**
 * Ctenorhabdotus — the grip it does not have.
 *
 * A comb jelly: eight radial sectors around the body's long axis, each carrying three comb-row
 * bones (`comb_N_0`, `comb_N_1`, `comb_N_-1` — the animal's twenty-four rows) and one oral lobe
 * (`oral_N`) down at the mouth. There are no tentacles and no jaws, so the hold is the oral lobes:
 * all eight fold inward and up, cupping whatever it caught against the mouth at the base, while
 * the comb rows keep a slow beat around the body — the drift never fully stops, or the animal
 * sinks — at a fraction of their swimming amplitude.
 */
import { UP } from '../lib.mjs';
import { range } from '../common.mjs';

const N = 8;
const SECTORS = range(N).map((i) => `sector_${i}`);
const ORAL = range(N).map((i) => `oral_${i}`);
const COMBS = range(N).flatMap((i) => [`comb_${i}_0`, `comb_${i}_1`, `comb_${i}_-1`]);

/** Where a radial bone sits around the body's long (Y) axis, worked out from the rest pose. */
function radial(P, name) {
  const p = P.rig.restWorldPos(P.rig.joint(name));
  const r = Math.hypot(p.x, p.z) || 1;
  return { inward: [-p.x / r, 0, -p.z / r] };
}

/** Bones this performance authors: the oral lobes hold, the sectors and comb rows breathe. */
export const authored = (n) => /^(oral_|sector_|comb_)/.test(n);

export const clips = [
  {
    name: 'Grab', duration: 1.0, loop: true,
    // The eight oral lobes stay folded in and up against the mouth, holding the catch there;
    // the sectors and their comb rows keep a slow, low-amplitude beat rather than going still.
    pose(u, P) {
      const ph = 2 * Math.PI * u;
      ORAL.forEach((o, i) => {
        const { inward } = radial(P, o);
        P.bend(o, inward, 0.5 + 0.06 * Math.sin(ph - i * 0.3));
        P.bend(o, UP, 0.24 + 0.03 * Math.sin(ph - i * 0.3));
      });
      SECTORS.forEach((s, i) => {
        const { inward } = radial(P, s);
        P.bend(s, inward, 0.04 * Math.sin(ph - i * 0.5));
      });
      COMBS.forEach((c, i) => P.bend(c, UP, 0.03 * Math.sin(2 * ph - i * 0.4)));
    },
  },
];
