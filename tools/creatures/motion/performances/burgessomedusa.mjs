/**
 * Burgessomedusa — a bell that actually pulses.
 *
 * The rig is radial: `body` at the centre, sixteen `bell_NN` running from near the apex down and
 * out to the rim at radius 1, three `tentacle_NN` (+ `tentacle_tip_NN`) hanging from each rim
 * segment, and four `mouth_N` oral arms under the apex inside the bell. The mouth itself is at
 * the bottom centre (`anchor_mouth`), which is where food has to end up.
 *
 * **The pulse is the engine's pulse.** The simulation swims this animal in surges: `pulseThrust`
 * in `src/sim/locomotion.ts` gives a smooth contraction over the first `PULSE_THRUST` (38%) of a
 * `PULSE_CYCLE` (1.15 s) and nothing through the refill. So `Swim` is exactly 1.15 s long and its
 * contraction fills exactly that first 38%, and the renderer scrubs the clip by the actor's own
 * `pulseT` (`src/render/creature.ts`), which makes the bell squeeze *be* the thrust rather than a
 * loop that happens nearby. The bell's displacement is the integral of the thrust — fastest at
 * the peak of the surge — so the two cannot drift apart.
 *
 * Everything else is the same shape at a different size: `Idle` a small slow pulse, `Rise` a hard
 * one, `Dive` almost none (a sinking medusa relaxes and drifts), the dash and the corral the
 * biggest in the set. Tentacles trail the bell, streaming up and in as it jets and flaring as it
 * refills, one beat behind.
 *
 * Frame: +Y is the apex, the mouth is below, +Z forward.
 */
import { ss, arc, hold, UP, DOWN, FWD, BACK } from '../lib.mjs';
import { chain, pad, range, alive } from '../common.mjs';

const BELLS = range(16).map((i) => `bell_${pad(i)}`);
const TENTS = range(48).map((i) => `tentacle_${pad(i)}`);
const TIPS = range(48).map((i) => `tentacle_tip_${pad(i)}`);
const ARMS = range(4).map((i) => `mouth_${i}`);

/** Contraction of the bell over one cycle, matching `pulseThrust`. */
const PULSE_THRUST = 0.38;
/**
 * How far the bell is squeezed at normalized cycle time `u`: nothing at the start of the beat,
 * fully closed at the end of the thrust window, and eased open again through the refill with a
 * small elastic flare past rest — the displacement whose *rate* is the engine's thrust curve.
 */
export function squeeze(u) {
  const closing = u < PULSE_THRUST ? (1 - Math.cos(Math.PI * u / PULSE_THRUST)) / 2 : 1 - ss(PULSE_THRUST, .95, u);
  return closing - .16 * arc(.44, .82, u);
}

/** Where each rim segment sits around the bell, worked out from the rest pose rather than assumed. */
function radial(P, name) {
  const p = P.rig.restWorldPos(P.rig.joint(name));
  const r = Math.hypot(p.x, p.z) || 1;
  return { inward: [-p.x / r, 0, -p.z / r], outward: [p.x / r, 0, p.z / r], azimuth: Math.atan2(p.z, p.x) };
}
/**
 * One frame of the bell. `close` squeezes every segment in and up (1 is a full contraction),
 * `ripple` runs a small wave around the rim so it is not a rigid iris, and `lean` tips the whole
 * bell toward one side — the swimming lean, and what a turn looks like on a body with no front.
 */
function bell(P, { close = 0, ripple = 0, rippleT = 0, lean = 0, leanDir = FWD, trail = 0, spread = 0 }) {
  BELLS.forEach((b, i) => {
    const { inward, azimuth } = radial(P, b);
    const k = close + ripple * Math.sin(rippleT - azimuth * 2);
    P.bend(b, inward, k * 1.25).bend(b, UP, k * .8);
    if (spread) P.bend(b, inward, -spread * .5);
    if (lean) P.bend(b, leanDir, lean * .22);
  });
  // The fringe is dragged: it streams up and in behind a contraction and flares as the bell refills.
  TENTS.forEach((t, i) => {
    const { inward } = radial(P, t);
    P.bend(t, UP, trail * .8).bend(t, inward, trail * .5);
    if (spread) P.bend(t, inward, -spread * .45);
    if (lean) P.bend(t, leanDir, lean * .3);
  });
  TIPS.forEach((t, i) => {
    const { inward } = radial(P, t);
    P.bend(t, UP, trail * 1.0).bend(t, inward, trail * .6);
    if (spread) P.bend(t, inward, -spread * .5);
    if (lean) P.bend(t, leanDir, lean * .35);
  });
}
/** The oral arms under the apex: `work` swings them down toward the mouth, `sway` keeps them alive. */
function arms(P, { work = 0, sway = 0, swayT = 0 }) {
  ARMS.forEach((a, i) => {
    P.bend(a, DOWN, work * .35);
    if (sway) P.bend(a, i % 2 ? FWD : BACK, sway * .12 * Math.sin(swayT - i * 1.6));
  });
}
/** Tentacles reaching in under the bell to the mouth at the bottom centre, and holding there. */
function gather(P, k, pulse = 0) {
  TENTS.forEach((t) => { const { inward } = radial(P, t); P.bend(t, inward, k * .5).bend(t, UP, k * .25); });
  TIPS.forEach((t) => { const { inward } = radial(P, t); P.bend(t, inward, (k + pulse) * .75).bend(t, UP, (k + pulse) * .35); });
}

/** Bones this performance authors: the bell is the whole animal. */
export const authored = () => true;

/**
 * One beat of the bell, with the fringe trailing a tenth of a cycle behind the squeeze. A looping
 * clip wraps that lag so the seam closes; a one-shot tapers it instead, since it has to arrive at
 * the rest pose.
 */
const beat = (u, size, { loop = false, taper = 1 } = {}) => ({
  close: size * squeeze(u),
  trail: size * .9 * taper * (loop ? squeeze((u + .91) % 1) : squeeze(Math.max(0, u - .09))),
});

export const clips = [
  {
    name: 'Swim', duration: 1.15, loop: true,
    // Exactly one pulse cycle, scrubbed by the actor's pulse phase in the game: contraction
    // through the first 38%, refill and glide through the rest.
    pose(u, P) {
      bell(P, { ...beat(u, 1, { loop: true }), ripple: .05, rippleT: 2 * Math.PI * u });
      arms(P, { sway: 1, swayT: 2 * Math.PI * u, work: .12 * squeeze(u) });
    },
  },
  {
    name: 'Idle', duration: 2.3, loop: true,
    // Hanging in the water: the same beat at a third of the size, and half the rate, because
    // nothing is being asked of it. The renderer free-runs this one rather than locking it.
    pose(u, P) {
      const k = (2 * u) % 1;
      bell(P, { ...beat(k, .34, { loop: true }), ripple: .045, rippleT: 2 * Math.PI * u });
      arms(P, { sway: .8, swayT: 2 * Math.PI * u });
    },
  },
  {
    name: 'Rise', duration: 1.15, loop: false,
    // Climbing is what a bell is for: the additive pose the engine holds while rising is a hard,
    // fully closed contraction.
    pose(u, P) {
      bell(P, { ...beat(u, 1.25, { taper: 1 - ss(.9, 1, u) }), ripple: .04 * alive(u), rippleT: 2 * Math.PI * u });
      arms(P, { work: .3 * squeeze(u), sway: .6 * alive(u), swayT: 2 * Math.PI * u });
    },
  },
  {
    name: 'Dive', duration: 1.15, loop: false,
    // Sinking: a medusa going down does not swim down, it stops swimming. The bell relaxes wide
    // open and the fringe streams up past it, which is what the additive pose should read as.
    pose(u, P) {
      const k = arc(0, 1, u);
      bell(P, { close: -.12 * k, spread: .55 * k, trail: -.35 * k, ripple: .03 * alive(u), rippleT: 2 * Math.PI * u });
      arms(P, { sway: .5 * alive(u), swayT: 2 * Math.PI * u });
    },
  },
  {
    name: 'TurnLeft', duration: 1.0, loop: false,
    // A body with no front turns by leaning: the whole bell tips and the fringe swings behind it.
    pose(u, P) {
      const k = arc(0, 1, u);
      bell(P, { ...beat((2 * u) % 1, .4), lean: k, leanDir: [1, 0, 0] });
      arms(P, { sway: .5 * alive(u), swayT: 2 * Math.PI * u });
    },
  },
  {
    name: 'TurnRight', duration: 1.0, loop: false,
    pose(u, P) {
      const k = arc(0, 1, u);
      bell(P, { ...beat((2 * u) % 1, .4), lean: k, leanDir: [-1, 0, 0] });
      arms(P, { sway: .5 * alive(u), swayT: 2 * Math.PI * u });
    },
  },
  {
    name: 'Dodge', duration: 0.4, loop: false,
    // The escape beat: everything a bell has, in one snap, and the fringe cracks after it.
    pose(u, P) {
      bell(P, { close: 1.5 * arc(0, .62, u), trail: 1.3 * arc(.1, .8, u), lean: .5 * arc(0, 1, u), leanDir: [1, 0, 0] });
      arms(P, { work: .6 * arc(0, .7, u) });
    },
  },
  {
    name: 'Ability', duration: 1.6, loop: true,
    // Bell corral: the fringe held spread wide and the bell working in slow deep beats, so the
    // ring of tentacles is presented at its widest all the way round.
    pose(u, P) {
      const k = (u * 2) % 1;
      bell(P, { ...beat(k, .7, { loop: true }), spread: .85, ripple: .08, rippleT: 2 * Math.PI * u * 2 });
      arms(P, { sway: 1, swayT: 2 * Math.PI * u });
    },
  },
  {
    name: 'Bite', duration: 0.5, loop: false,
    // Tentacle brush: the fringe sweeps in around the rim with a small beat behind it.
    pose(u, P) {
      const S = hold(.1, .3, .45, .9, u);
      bell(P, { ...beat(u / .5 % 1, .5 * alive(u)), ripple: .1 * alive(u), rippleT: 2 * Math.PI * u * 2 });
      gather(P, .5 * S);
      arms(P, { work: .3 * S, sway: .5 * alive(u), swayT: 2 * Math.PI * u });
    },
  },
  {
    name: 'Heavy', duration: 1.1, loop: false,
    // Bell recoil: the fringe flares wide over the wind-up, then the bell slams shut and throws
    // the water — the strongest contraction in the set — and reopens slowly.
    pose(u, P) {
      const W = hold(0, .3, .34, .46, u), S = hold(.34, .5, .62, .95, u);
      bell(P, { close: 1.6 * S - .3 * W, spread: .9 * W, trail: 1.3 * hold(.4, .58, .7, .98, u) - .3 * W, ripple: .05 * alive(u), rippleT: 2 * Math.PI * u });
      gather(P, .4 * S);
      arms(P, { work: .5 * S, sway: .6 * alive(u), swayT: 2 * Math.PI * u });
    },
  },
  {
    name: 'Attack', duration: 1.1, loop: false,
    // Reach the fringe out, close it around what it caught, and draw it in under the bell.
    pose(u, P) {
      const R = hold(.05, .28, .4, .55, u), C = hold(.3, .45, .68, .92, u);
      bell(P, { ...beat((u / .55) % 1, .55 * alive(u)), spread: .7 * R, ripple: .05 * alive(u), rippleT: 2 * Math.PI * u });
      gather(P, 1.0 * C);
      arms(P, { work: .6 * C, sway: .5 * alive(u), swayT: 2 * Math.PI * u });
    },
  },
  {
    name: 'Eat', duration: 1.15, loop: true,
    // Feeding: the bell keeps beating — it has to, or the animal sinks — while the fringe holds
    // the catch in under the centre and the oral arms work it into the mouth at the bottom.
    pose(u, P) {
      bell(P, { ...beat(u, .55, { loop: true }), ripple: .04, rippleT: 2 * Math.PI * u });
      gather(P, .9, .12 * Math.sin(2 * Math.PI * u * 2));
      arms(P, { work: .85 + .15 * Math.sin(2 * Math.PI * u * 2), sway: .5, swayT: 2 * Math.PI * u });
    },
  },
];
