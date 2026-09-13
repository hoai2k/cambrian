/**
 * Hallucigenia — the grip, and the dash.
 *
 * Two clips this rig never had. The grip is the interesting one: this animal takes hold with its
 * **feet**. Seven pairs of clawed lobopods (`leg_00..06_L/R`, each with a `_tip`) hang under a
 * trunk (`body_00..08`, front at +Z, each bone's axis pointing tail-ward) whose back carries the
 * seven pairs of dorsal spines (`spine_00..06_L/R`). The spines are not hands and the mouth is at
 * the front underside (`anchor_mouth`), so a hold is: the trunk curls ventrally around what it has
 * caught, every pair of feet clamps inward onto it, and the three pairs of anterior tentacles
 * steady it toward the mouth. The spines are left alone — they stay clear of the thing being held,
 * which is the whole reason the feet do this job.
 *
 * `Grab` is authored as a loop because the game uses it twice: as a one-shot when the grip closes
 * (crossfaded in over 0.06 s, so starting in the held pose is right) and as a slow loop while the
 * animal is clinging to something far bigger than itself (`rideHost`). So it is a *held* pose that
 * breathes rather than a snatch: nothing in it opens again.
 *
 * `Dash` is the drive the engine has been borrowing `Dodge` for. A dodge is a 0.32 s jink; a dash
 * is 0.42 s of committed travel. For a legged animal on the seabed that is a shove: gather the
 * feet under the body, sweep them back in one wave, straighten the trunk along the line of travel
 * and hold that shape through the glide.
 *
 * Frame: +Z forward, +Y up. This rig's `_L` legs sit at −X, so `IN` is toward the midline for the
 * left row and the sign flips for the right.
 */
import { ss, arc, hold, lag, ring, UP, DOWN, FWD, BACK } from '../lib.mjs';

const PAIRS = [0, 1, 2, 3, 4, 5, 6];
const ROWS = [['L', -1], ['R', 1]];
const TENT = [0, 1, 2];
const TSIDE = [1, -1];
const pad = (i) => String(i).padStart(2, '0');

/** Toward the midline for a row of legs, and away from it. */
const inward = (sx) => [-sx, 0, 0];
const outward = (sx) => [sx, 0, 0];

/**
 * The trunk, as a ventral curl. Each segment bends its tip down by the same small angle, which
 * accumulates along the chain into a body cupped under whatever is being held. `nose` pitches the
 * front down on its own, `stretch` straightens the whole thing out again.
 */
function trunk(P, { curl = 0, nose = 0, wave = 0, waveT = 0 }) {
  for (let i = 0; i <= 8; i++) {
    const b = `body_${pad(i)}`;
    const along = i / 8;
    P.bend(b, DOWN, curl * (0.6 + 0.6 * along));
    if (wave) P.bend(b, UP, wave * Math.sin(waveT - i * 0.5));
  }
  P.bend('body_00', DOWN, nose);
  for (const n of [0, 1, 2]) P.bend(`neck_${pad(n)}`, DOWN, nose * 0.5);
}

/**
 * One row of feet. `clamp` folds them in toward the midline, `curl` closes the claw joint on top
 * of that, `sweep` swings the whole leg fore-and-aft (positive = forward), and `spread` opens the
 * row out of the way. Every angle is per pair so a wave can run down the body.
 */
function feet(P, at) {
  for (const [row, sx] of ROWS) {
    for (const i of PAIRS) {
      const leg = `leg_${pad(i)}_${row}`, tip = `${leg}_tip`;
      const k = at(i);
      P.bend(leg, inward(sx), k.clamp).bend(leg, outward(sx), k.spread);
      P.bend(leg, FWD, k.sweep).bend(tip, FWD, k.sweep * 0.55);
      P.bend(tip, inward(sx), k.clamp * 0.8 + k.curl).bend(tip, UP, k.curl * 0.45);
    }
  }
}

/** The anterior tentacles: `gather` brings them in and down over the mouth, `back` lays them along the body. */
function tentacles(P, { gather = 0, back = 0, sway = 0, swayT = 0 }) {
  for (const i of TENT) {
    for (const s of TSIDE) {
      const b = `tentacle_${i}_${s}`, tip = `${b}_tip`;
      P.bend(b, inward(s), gather * 0.55).bend(b, DOWN, gather * 0.5 + back * 0.15);
      P.bend(b, BACK, back * 0.7);
      P.bend(tip, DOWN, gather * 0.7 + back * 0.2).bend(tip, inward(s), gather * 0.4);
      if (sway) P.bend(tip, UP, sway * Math.sin(swayT - i * 0.8 + (s < 0 ? Math.PI : 0)));
    }
  }
}

/** The dorsal spines. They only ever tilt: nothing is held with them. */
function spines(P, { back = 0, flare = 0 }) {
  for (const [row, sx] of ROWS) for (const i of PAIRS) {
    const b = `spine_${pad(i)}_${row}`;
    P.bend(b, BACK, back * (0.7 + 0.4 * (i / 6)));
    P.bend(b, outward(sx), flare);
  }
}

export const clips = [
  {
    name: 'Grab',
    duration: 1.4,
    loop: true,
    /**
     * A settled hold. The clamp is constant; what moves is the load shifting through it — the feet
     * flex a little in a slow wave, the trunk breathes against the body it has caught, and the
     * tentacles keep working at it. Loops on itself: one full cycle of that wave over the clip.
     */
    pose(u, P) {
      const ph = 2 * Math.PI * u;
      const clamp = 0.62, curl = 0.5;
      feet(P, (i) => {
        const w = Math.sin(ph - i * 0.42);
        return {
          clamp: clamp + 0.05 * w,
          curl: curl + 0.06 * Math.sin(ph - i * 0.42 - 0.6),
          sweep: 0.05 * Math.sin(ph - i * 0.5 + 1.1),
          spread: 0,
        };
      });
      trunk(P, { curl: 0.055 + 0.006 * Math.sin(ph), nose: 0.06, wave: 0.008, waveT: ph });
      tentacles(P, { gather: 0.7, sway: 0.09, swayT: ph });
      spines(P, { back: 0.05 + 0.01 * Math.sin(ph) });
    },
  },
  {
    name: 'Dash',
    duration: 0.45,
    loop: false,
    /**
     * Gather, shove, glide. The feet load forward under the body, sweep back together in a wave
     * that runs front to back, and recover; the trunk shortens into the load and then straightens
     * along the line of travel; the spines lay back for it. Starts and ends at rest, as a one-shot
     * must, with the tail of the clip easing the streamlined shape back down.
     */
    pose(u, P) {
      const load = arc(0, 0.34, u);                       // gather under the body
      const push = ss(0.16, 0.42, u) * (1 - ss(0.62, 1, u));   // the shove, held through the glide
      // The wave down the row is the velocity of the shove, delayed per pair, and killed before
      // the clip ends: a lagged envelope is still moving when its parent has stopped.
      const kick = (i) => lag((x) => ss(0.16, 0.42, x) * (1 - ss(0.62, 1, x)), u, i * 0.02, 0.08) * 6 * (1 - ss(0.72, 0.95, u));
      const glide = hold(0.2, 0.44, 0.7, 1, u);
      // Stubby lobopod legs, so the swing is small: enough to read as a shove, nowhere near enough
      // to fold a leg over the animal's own back (the tips stay under the trunk throughout).
      feet(P, (i) => ({
        clamp: 0,
        curl: 0.12 * load,
        sweep: 0.26 * load - 0.34 * push - 0.16 * kick(i),
        spread: 0.06 * push,
      }));
      trunk(P, { curl: 0.03 * load - 0.012 * glide, nose: 0.05 * glide, wave: 0.01 * push, waveT: 2 * Math.PI * u });
      tentacles(P, { back: 0.75 * glide, sway: 0.04 * push, swayT: 6 * u });
      spines(P, { back: 0.3 * glide, flare: 0.05 * load });
    },
  },
];
