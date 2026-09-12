/**
 * Ottoia — a worm, not a missile.
 *
 * A priapulid: sixteen trunk rings (`body_00` at the head end … `body_15` at the tail, each bone
 * running tailward) behind a four-segment eversible throat (`introvert_00..03`) that carries the
 * mouth at its tip. The shipped clips held the trunk rigid and moved the whole animal, so it read
 * as a torpedo. Everything here runs a travelling wave down the trunk instead: a lateral
 * serpentine with a smaller dorsoventral component so it reads as a worm from any angle, growing
 * toward the tail, and the throat leads or follows it.
 *
 * `TurnLeft`, `TurnRight`, `Dive` and `Rise` are used by the engine as *additive* poses frozen at
 * their midpoint (`src/render/creature.ts`), so what matters in those four is the shape at the
 * middle of the clip, read against the neutral pose at frame 0: a body curved bodily into the
 * turn, or arched down or up. Authoring them as real clips that pass through that shape gives a
 * sensible clip in the viewer and the right additive pose in the game.
 *
 * Frame: +Z forward, +Y up, +X the animal's left.
 */
import { ss, arc, hold, ring, UP, DOWN, FWD, BACK } from '../lib.mjs';
import { chain, pad, range, alive, beatPhase } from '../common.mjs';

const TRUNK = range(16).map((i) => `body_${pad(i)}`);
const THROAT = range(4).map((i) => `introvert_${pad(i)}`);
const LEFT = [1, 0, 0], RIGHT = [-1, 0, 0];

/**
 * The travelling wave. `amp` is the per-ring bend at the tail (it grows from a third of that at
 * the head, so the animal drives from the back like a worm), `step` the phase advance per ring —
 * about a wavelength and a half over the body — and `roll` mixes in the dorsoventral component.
 * `curve` bends the whole trunk one way underneath the wave, which is how it turns.
 */
function undulate(P, { phase, amp = .12, step = .55, roll = .35, curve = 0, curveDir = LEFT, arch = 0, taper = 1 }) {
  TRUNK.forEach((b, i) => {
    const along = .33 + .67 * (i / (TRUNK.length - 1)) * taper;
    const w = Math.sin(phase - i * step);
    P.bend(b, LEFT, amp * along * w);
    if (roll) P.bend(b, UP, amp * along * roll * Math.sin(phase - i * step - 1.4));
    if (curve) P.bend(b, curveDir, curve * (.5 + .5 * along));
    if (arch) P.bend(b, arch > 0 ? UP : DOWN, Math.abs(arch) * (.5 + .5 * along));
  });
}
/**
 * The throat. `evert` pushes it out and opens it, `probe` swings it, `retract` pulls it back in
 * and curls it under — a priapulid turns this out to grip and hauls itself onto it.
 */
function throat(P, { evert = 0, probe = 0, probeDir = LEFT, retract = 0, curl = 0 }) {
  chain(P, THROAT, FWD, evert * .12);
  chain(P, THROAT, probeDir, probe * .18);
  chain(P, THROAT, BACK, retract * .1);
  chain(P, THROAT.slice(2), DOWN, curl * .3);
}
/** The head end leading the wave, so the animal points where it is going. */
const head = (P, { yaw = 0, pitch = 0 }) => {
  chain(P, TRUNK.slice(0, 4), yaw >= 0 ? LEFT : RIGHT, Math.abs(yaw) * .1);
  chain(P, TRUNK.slice(0, 4), pitch >= 0 ? UP : DOWN, Math.abs(pitch) * .1);
};

/** Bones this performance authors: the whole animal is the worm, so all of it. */
export const authored = () => true;

export const clips = [
  {
    name: 'Crawl', duration: 1.4, loop: true,
    // Hauling along the bottom: a full wave passes down the body once per cycle, throat probing.
    pose(u, P) {
      const ph = 2 * Math.PI * u;
      undulate(P, { phase: ph, amp: .19, roll: .45 });
      throat(P, { evert: .35 + .25 * Math.sin(ph * 2), probe: .3 * Math.sin(ph - .8) });
    },
  },
  {
    name: 'Idle', duration: 2.6, loop: true,
    // Holding station: the same wave, slow and small, and the throat barely working.
    pose(u, P) {
      const ph = 2 * Math.PI * u;
      undulate(P, { phase: ph, amp: .09, roll: .55, step: .42 });
      throat(P, { evert: .12 + .1 * Math.sin(ph), probe: .12 * Math.sin(ph - 1.2) });
    },
  },
  {
    name: 'TurnLeft', duration: 1.0, loop: false,
    // The additive pose the engine holds while turning: the whole worm bent into a C to its left,
    // the head leading, with the wave still running under it.
    pose(u, P) {
      const k = arc(0, 1, u), ph = 2 * Math.PI * u * 2;
      undulate(P, { phase: ph, amp: .08 * alive(u), curve: .075 * k, curveDir: LEFT });
      head(P, { yaw: 1.1 * k });
      throat(P, { probe: .8 * k, probeDir: LEFT, evert: .2 * k });
    },
  },
  {
    name: 'TurnRight', duration: 1.0, loop: false,
    pose(u, P) {
      const k = arc(0, 1, u), ph = 2 * Math.PI * u * 2;
      undulate(P, { phase: ph, amp: .08 * alive(u), curve: .075 * k, curveDir: RIGHT });
      head(P, { yaw: -1.1 * k });
      throat(P, { probe: .8 * k, probeDir: RIGHT, evert: .2 * k });
    },
  },
  {
    name: 'Dive', duration: 1.0, loop: false,
    // Nosing down into the sediment: the trunk arches over, tail high, throat reaching down.
    pose(u, P) {
      const k = arc(0, 1, u), ph = 2 * Math.PI * u * 2;
      undulate(P, { phase: ph, amp: .07 * alive(u), roll: .8, arch: -.07 * k });
      head(P, { pitch: -1.2 * k });
      throat(P, { evert: .6 * k, curl: .5 * k });
    },
  },
  {
    name: 'Rise', duration: 1.0, loop: false,
    // Lifting clear of the bottom: the trunk arches the other way and the throat leads upward.
    pose(u, P) {
      const k = arc(0, 1, u), ph = 2 * Math.PI * u * 2;
      undulate(P, { phase: ph, amp: .07 * alive(u), roll: .8, arch: .07 * k });
      head(P, { pitch: 1.2 * k });
      throat(P, { evert: .5 * k });
    },
  },
  {
    name: 'Bite', duration: 0.5, loop: false,
    // Introvert snap: the body gathers into a tight wave and the throat everts hard and shuts.
    pose(u, P) {
      const gather = hold(0, .18, .3, .5, u), S = hold(.18, .34, .46, .9, u);
      undulate(P, { phase: 2 * Math.PI * u * 2, amp: (.1 + .1 * gather) * alive(u), roll: .4 });
      throat(P, { retract: .8 * gather, evert: 1.6 * S, curl: .5 * hold(.34, .44, .6, .95, u) });
      head(P, { pitch: -.2 * S });
    },
  },
  {
    name: 'Heavy', duration: 1.1, loop: false,
    // Hooked thrust: the worm coils back on itself over a long wind-up, then drives the whole body
    // forward as the throat turns out to its full length and the hooks close.
    pose(u, P) {
      const W = hold(0, .3, .36, .5, u), S = hold(.36, .48, .62, .95, u);
      undulate(P, { phase: 2 * Math.PI * u * 2, amp: (.09 + .16 * W) * alive(u), roll: .35, curve: .06 * W, arch: .05 * W - .04 * S });
      throat(P, { retract: 1.3 * W, evert: 2.2 * S, curl: .8 * hold(.5, .58, .74, .95, u) });
      head(P, { pitch: .3 * W - .5 * S });
    },
  },
  {
    name: 'Attack', duration: 1.1, loop: false,
    // Reach, take hold, and haul the body up onto the grip — the worm's own way of moving.
    pose(u, P) {
      const R = hold(.05, .3, .55, .9, u), C = hold(.32, .44, .66, .92, u), haul = hold(.5, .68, .8, 1, u);
      undulate(P, { phase: 2 * Math.PI * u * 2, amp: (.1 + .12 * haul) * alive(u), roll: .4 });
      throat(P, { evert: 1.8 * R, curl: .9 * C, retract: 1.0 * haul });
      head(P, { pitch: -.3 * R });
    },
  },
  {
    name: 'Dodge', duration: 0.4, loop: false,
    // A whole-body flick: the wave collapses into one hard lateral throw and unwinds.
    pose(u, P) {
      const k = arc(0, 1, u);
      undulate(P, { phase: 2 * Math.PI * u * 2, amp: (.1 + .18 * k) * alive(u), roll: .2, curve: .09 * k, curveDir: LEFT, taper: 1 });
      throat(P, { retract: .8 * k });
    },
  },
  {
    name: 'Ability', duration: 1.6, loop: true,
    // Sediment dive: the burrowing gait. A short fast wave with the throat everting on each beat,
    // which is how a priapulid pulls itself through the mud.
    pose(u, P) {
      const ph = 2 * Math.PI * u;
      undulate(P, { phase: ph * 2, amp: .16, step: .42, roll: .25 });
      throat(P, { evert: .8 + .8 * Math.sin(ph * 2 - .6), curl: .3 + .3 * Math.sin(ph * 2 - 1.4) });
      head(P, { pitch: -.35 });
    },
  },
  {
    name: 'Eat', duration: 1.4, loop: true,
    // Feeding: the throat works the food in with slow swallowing waves that run *up* the body,
    // the opposite way to the swimming wave.
    pose(u, P) {
      const ph = 2 * Math.PI * u;
      undulate(P, { phase: -ph, amp: .09, step: .7, roll: .6 });
      throat(P, { evert: .6 + .5 * Math.sin(ph * 2), curl: .5 + .4 * Math.sin(ph * 2 - 1) });
      head(P, { pitch: -.4 });
    },
  },
  {
    name: 'Grab', duration: 1.2, loop: true,
    // The hold: the throat curled down over the catch, the front rings compressed behind it,
    // pulsing as the worm works to swallow. A held pose that never opens.
    pose(u, P) {
      const ph = 2 * Math.PI * u;
      undulate(P, { phase: -ph, amp: .05, step: .8, roll: .7 });
      throat(P, { evert: .5, curl: 1.0 + .1 * Math.sin(ph) });
      chain(P, TRUNK.slice(0, 5), UP, .02 * Math.sin(ph));
      head(P, { pitch: -.5 });
    },
  },
];
