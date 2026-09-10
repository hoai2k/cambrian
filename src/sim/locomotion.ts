import { clamp } from '../shared/math';
import { lengthOf, speedFactor } from './actors';
import { creature } from './creatures';
import { dayFraction } from './daynight';
import type { Actor } from './types';

/**
 * How a body gets about, where that is something other than swimming forward.
 *
 * The roster is full of animals that did not move the way a fish does, and the shared movement code
 * only knew one way to travel until now. These are the exceptions, kept together and keyed off the
 * creature's own traits rather than its era, because the same trait turns up in both: a shrimp's
 * tail-flip is Waptia's and Nahecaris', and hauling through weed is a trilobite's and a tetrapod's.
 * `docs/research/locomotion-ideas.md` has the animals and how well each is actually attested.
 *
 * Nothing here reads the clock or the world directly, and nothing calls `Math.random`: the
 * simulation still replays from its seed.
 */

// ---- the tail-flip: the caridoid escape reaction ----

/** Stamina a flip costs. It is a whole-body contraction, not a fin beat. */
export const FLIP_STAMINA = 18;

/**
 * A tail-flip goes straight back along the body's own axis whatever the stick says, because the
 * reflex fires before the animal has decided anything. It is violent — harder than the same body's
 * dash — and it fades: the launch is scaled by what is left in the tail, so a third flip in a row
 * barely clears the ground and the animal has to swim out of trouble instead.
 */
export function flipLaunch(a: Actor): number {
  const left = clamp(a.stamina / Math.max(1, a.staminaMax), 0.25, 1);
  return (lengthOf(a) * 11 + 8) * speedFactor(a.scale) * left;
}

// ---- the medusa's bell ----

/** One contraction and the coast after it. Long enough to read as a pulse rather than a stutter. */
export const PULSE_CYCLE = 1.15;
/** The fraction of the cycle the bell is actually contracting. The rest is refill and free glide. */
const PULSE_THRUST = 0.38;

/**
 * Thrust from a bell at this point in its cycle: a smooth contraction over the first third and
 * nothing at all through the refill, so the animal surges and then coasts. Scaled so the average
 * over a whole cycle is 1 — a pulse swimmer's cruise is its cruise, it just arrives in lumps.
 */
export function pulseThrust(phase: number): number {
  const t = phase / PULSE_CYCLE;
  if (t >= PULSE_THRUST) return 0;
  return Math.sin((t / PULSE_THRUST) * Math.PI) * (Math.PI / 2) / PULSE_THRUST;
}

/**
 * The bell is refilling: the quiet part of the cycle, where a contraction can be started early.
 * Pressing sprint here fires the pulse now instead of waiting for the beat to come round, which is
 * the one place in the game where rhythm is worth more than pressure.
 */
export const pulseRefilling = (phase: number) => phase / PULSE_CYCLE > PULSE_THRUST + 0.15;

/**
 * Where in its `Swim` clip a bell should be, for a body at this point in its cycle. The clip is
 * one cycle long with the squeeze filling exactly the thrust window, so scrubbing it here makes
 * the contraction the player watches the water actually being thrown (`src/render/creature.ts`).
 * Returned as a fraction of the clip so a frame of rounding in the export costs nothing.
 */
export const bellPhase = (pulseT: number) => pulseT / PULSE_CYCLE;

/** How far over a bell tips at full tilt: apex well into the direction of travel, fringe trailing. */
export const BELL_TILT = 1.15;

/**
 * How far from upright a bell should be tipped. A jellyfish going somewhere turns its apex into
 * the direction of travel and trails its fringe behind it; one sinking or holding station relaxes
 * and hangs upright. So this follows the *horizontal* part of the journey — climbing needs no
 * tilt, because upright already points where it is going — and only while the animal is beating.
 * The renderer eases toward it, which is the drift back to upright once nothing is being asked.
 */
export function bellTilt(flatSpeed: number, cruise: number, pulseT: number): number {
  if (pulseT <= 0) return 0;                       // drifting, sinking, or holding station
  return clamp(flatSpeed / Math.max(cruise, 0.1), 0, 1) * BELL_TILT;
}

// ---- drifting with the sea ----

/**
 * A drifter does not swim anywhere much: it holds a depth and lets the water take it. On a neutral
 * stick the sea moves it several times harder than it moves a swimmer, and it rises through the
 * night and sinks through the day, which is what most of the plankton in any ocean is doing.
 *
 * A swimmer's 0.55 is already a fudge — a body with no way on is advected at the speed of the water
 * around it, not at half of it — so this is not so much a bonus as the drifter being the one animal
 * the fudge does not apply to.
 */
export const DRIFT_CURRENT = 3;
/** The middle of the night, in the day's own units: the top of the climb. Noon is half a day away. */
const DRIFT_PEAK = 0.84;
export function driftRise(time: number): number {
  // Deepest at midday, highest in the middle of the night, crossing through dawn and dusk.
  return Math.cos((dayFraction(time) - DRIFT_PEAK) * Math.PI * 2) * 0.55;
}

// ---- everything else ----

/**
 * A body that hauls through the plants is carried by them; one that swims past them is dragged.
 * The carry is an acceleration rather than a multiplier, so it settles against the same damping
 * every body already has instead of compounding step on step, and it is worth the same whether the
 * animal is strolling or sprinting — the stems give you a pull, not a percentage.
 */
export const WEED_PULL = 24;
/** ...and it has the leverage of something several times its size against a stem it can grip. */
export const WEED_LEVERAGE = 3;

/** A punt needs the floor: this far above it, there is nothing to push off. */
export const PUNT_REACH = 1.4;

/** What a punt is worth against an ordinary dash, with the bottom in reach and without it. */
export const punting = (a: Actor, floorGap: number) =>
  creature(a.creature).punt ? (floorGap <= PUNT_REACH * lengthOf(a) ? 1.5 : 0.45) : 1;

/**
 * Two gaits, and the current tells them apart. A eurypterid up in the water is rowing with its
 * paddles and goes where the water goes; the same animal down on its legs is walking, and the flow
 * barely reaches it. Everything else keeps the coefficient its body plan already had.
 */
export const rowWalkCurrent = (a: Actor, grounded: boolean) =>
  creature(a.creature).rowWalk ? (grounded ? 0.08 : 0.55) : undefined;

// ---- how high in the water a body keeps itself ----

/**
 * How often a big animal's next wander is a run down over the bottom anyway. Roughly one in six: a
 * large body feeds down there and passes through, it just does not live there.
 */
export const DIP_CHANCE = 0.18;

/**
 * Where in the water column a swimmer of length `L` puts itself. Small bodies use the whole of it,
 * the sand included — that is where most of the reef lives, and at every age. A large swimmer does
 * not lie on the bottom: the floor of its range rises with its length, so the biggest animals read
 * as things that pass overhead rather than furniture on the seabed. It is a preference and not a
 * ceiling — pass `dip` (see `DIP_CHANCE`) and a big body goes right down over the sand, which is
 * where it feeds and where you actually get to meet one.
 */
export function columnY(ground: number, surface: number, L: number, rng: () => number, dip = false) {
  const floor = ground + 1.5;
  const column = Math.max(surface - 2 - floor, 0.5);
  const lo = dip ? 0 : clamp(((L - 2.5) * 1.8) / column, 0, 0.55);
  // A small body is drawn towards the bottom of whatever is left to it: the floor, the weed and
  // the cover are where it lives, at every age. A big one spreads evenly through the water above
  // its own floor, which is most of the column by the time it is grown.
  const r = rng();
  return clamp(floor + column * (lo + (lo > 0.05 ? r : r * r) * (1 - lo) * 0.9), ground + 1, surface - 2);
}

/**
 * How much water a swimming body of length `L` keeps under it when it can. Nothing for a small
 * animal — the sand is where most of the reef lives — and a body length or so for a big one, which
 * is what keeps the largest animals reading as things that pass overhead. It is a preference the
 * body acts on while it is getting on with something else, not a floor it cannot cross: a hunt, a
 * carcass or a bolt for cover all take it down, and `columnY` sends it down there on its own
 * account now and then.
 */
export const keepClear = (L: number) => Math.max(0, (L - 2.5) * 1.1);
