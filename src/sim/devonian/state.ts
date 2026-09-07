import type { Vec3 } from '../../shared/math';
import type { Game } from '../game';
import type { Actor } from '../types';

/**
 * Life stages. Nobody leaves their rung: a Hatchling Dunkleosteus is a small fish that grows, with
 * each moult, into the giant; Prime is the standing reward past adult size. Growth is geometric —
 * every moult multiplies the body by the same factor — from a hatchling no shorter than
 * MIN_HATCH_LENGTH (the engine's smallest playable body) to the adult, then a third again for Prime.
 */
export const STAGES = ['Hatchling', 'Juvenile', 'Young', 'Adult', 'Prime'] as const;
export const ADULT_STAGE = 3, PRIME_STAGE = 4;
export const PRIME_SCALE = 1.35;
export const MIN_HATCH_LENGTH = 0.6, HATCH_FRACTION = 0.2;
/** Standing at which each stage is reached. */
export const STAGE_AT = [0, 12, 30, 55, 85] as const;
/** Body scale (of adult length) at `stage` for a creature of adult length `adultLength`. */
export function stageScale(adultLength: number, stage: number): number {
  if (stage >= PRIME_STAGE) return PRIME_SCALE;
  const s0 = Math.min(0.75, Math.max(HATCH_FRACTION, MIN_HATCH_LENGTH / adultLength));
  return Math.pow(s0, 1 - Math.max(0, stage) / ADULT_STAGE);          // s0 → 1 over the four moults to adult
}
/** The stage a body of `scale` is in (the largest stage whose scale it has reached). */
export function stageForScale(adultLength: number, scale: number): number {
  let best = 0;
  for (let i = 0; i <= PRIME_STAGE; i++) if (scale >= stageScale(adultLength, i) - 1e-6) best = i;
  return best;
}
export const RUNG_NAMES = ['', 'Floor', 'Shoal', 'Hunters', 'Giants'] as const;
export const DOMINANT = 100;
export const HOLD_TO_WIN = 90;

export interface DeadZone { pos: Vec3; r: number; age: number; life: number; drift: Vec3; }

/** Per-actor Devonian state, kept beside the shared Actor rather than on it. */
export interface DevActor {
  standing: number;
  stage: number;               // index into STAGES
  air: number;                 // 0..1 for air breathers
  gulpT: number;               // seconds since the last gulp
  inRange: boolean; rangeT: number;
  beached: boolean;
  deadT: number;               // seconds spent inside a dead zone this visit
  deadZoneIn: boolean;
  moultSoft: number;           // seconds of post-moult softness left
  exuvia: number;              // actor id of the shed shell, or -1
  exuviaT: number;             // seconds the exuvia has been protecting us
  followers: number;
  sinceGain: number;           // seconds since standing last rose
  sinceEat: number;
  dominantT: number;
  /** Seconds held at Prime, for Survival's win. Domination's equivalent is dominantT. */
  primeT: number;
  recent: string[];
  openT: number;               // rung I benthos: time alive in the open
  bluffed: Map<number, number>; // brush display: actor id → time it was last bluffed
  dartCd: number;              // seconds until the next fast-start
}

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
    d = { standing: 0, stage: 0, air: 1, gulpT: 0, inRange: false, rangeT: 0, beached: false, deadT: 0, deadZoneIn: false, moultSoft: 0, exuvia: -1, exuviaT: 0, followers: 0, sinceGain: 0, sinceEat: 0, dominantT: 0, primeT: 0, recent: [], openT: 0, bluffed: new Map(), dartCd: 0 };
    s.actors.set(a.id, d);
  }
  return d;
}
