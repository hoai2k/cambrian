import type { Vec3 } from '../../shared/math';
import type { Game } from '../game';
import type { Actor } from '../types';

/**
 * Life stages. Nobody leaves their rung: a Hatchling Dunkleosteus is a small fish that grows, with
 * each moult, into the giant; Prime is a third again past adult size.
 *
 * Everything hatches *tiny in absolute terms* — between MIN_HATCH_LENGTH and MAX_HATCH_LENGTH
 * whatever it will grow into — because size is the only thing that decides who eats whom. A
 * newborn Dunkleosteus is three quarters of a unit long, which makes it a meal for a grown
 * trilobite; the same trilobite is a snack to that Dunkleosteus three moults later. Growth is
 * geometric from there: every moult multiplies the body by the same factor, so the animals with
 * further to go grow faster per stage.
 */
export const STAGES = ['Hatchling', 'Juvenile', 'Young', 'Adult', 'Prime'] as const;
export const ADULT_STAGE = 3, PRIME_STAGE = 4;
export const PRIME_SCALE = 1.35;
/** The smallest playable body, and the length nothing hatches longer than. */
export const MIN_HATCH_LENGTH = 0.6, MAX_HATCH_LENGTH = 0.75;
/** Standing at which each stage is reached. */
export const STAGE_AT = [0, 12, 30, 55, 85] as const;
/** Hatchling length for a creature that grows to `adultLength`. */
export const hatchLength = (adultLength: number) => Math.min(adultLength * 0.8, MAX_HATCH_LENGTH);
/** Body scale (of adult length) at `stage` for a creature of adult length `adultLength`. */
export function stageScale(adultLength: number, stage: number): number {
  if (stage >= PRIME_STAGE) return PRIME_SCALE;
  const s0 = hatchLength(adultLength) / adultLength;
  return Math.pow(s0, 1 - Math.max(0, stage) / ADULT_STAGE);          // s0 → 1 over the three moults to adult
}
/** The stage a body of `scale` is in (the largest stage whose scale it has reached). */
export function stageForScale(adultLength: number, scale: number): number {
  let best = 0;
  for (let i = 0; i <= PRIME_STAGE; i++) if (scale >= stageScale(adultLength, i) - 1e-6) best = i;
  return best;
}
export const RUNG_NAMES = ['', 'Floor', 'Shoal', 'Hunters', 'Giants'] as const;
/** Standing needed to be fully grown: the meter the five stages are cut out of. */
export const GROWN = 100;
export const HOLD_TO_WIN = 90;

export interface DeadZone { pos: Vec3; r: number; age: number; life: number; drift: Vec3; }

/** Per-actor Devonian state, kept beside the shared Actor rather than on it. */
export interface DevActor {
  standing: number;
  stage: number;               // index into STAGES
  air: number;                 // 0..1 for air breathers
  airPulseT: number;           // seconds since the last low-air heartbeat (reset by a gulp)
  beached: boolean;
  deadT: number;               // seconds spent inside a dead zone this visit
  deadZoneIn: boolean;
  moultSoft: number;           // seconds of post-moult softness left
  exuvia: number;              // actor id of the shed shell, or -1
  exuviaT: number;             // seconds the exuvia has been protecting us
  followers: number;
  sinceEat: number;
  /** Seconds held at Prime, for Rise's win. */
  primeT: number;
  bluffed: Map<number, number>; // brush display: actor id → time it was last bluffed
  dartCd: number;              // seconds until the next fast-start
}

/** How far along the five stages this animal is, 0..1 — the era's answer to tier progress. */
export const stageProgress = (d: { stage: number; standing: number }) => {
  if (d.stage >= PRIME_STAGE) return 1;
  const from = STAGE_AT[d.stage], to = STAGE_AT[d.stage + 1];
  return Math.max(0, Math.min(1, (d.standing - from) / Math.max(1e-6, to - from)));
};

export interface DevGame {
  actors: Map<number, DevActor>;
  deadZones: DeadZone[];
  nextZoneT: number;
  tick: number;                // 1 Hz bookkeeping accumulator
  matchT: number;
}

const games = new WeakMap<Game, DevGame>();
export function stateFor(g: Game): DevGame {
  let s = games.get(g);
  if (!s) { s = { actors: new Map(), deadZones: [], nextZoneT: 150, tick: 0, matchT: 0 }; games.set(g, s); }
  return s;
}
export function devActor(g: Game, a: Actor): DevActor {
  const s = stateFor(g);
  let d = s.actors.get(a.id);
  if (!d) {
    d = { standing: 0, stage: 0, air: 1, airPulseT: 0, beached: false, deadT: 0, deadZoneIn: false, moultSoft: 0, exuvia: -1, exuviaT: 0, followers: 0, sinceEat: 0, primeT: 0, bluffed: new Map(), dartCd: 0 };
    s.actors.set(a.id, d);
  }
  return d;
}
