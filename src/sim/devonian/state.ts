import type { Vec3 } from '../../shared/math';
import type { Game } from '../game';
import type { Actor } from '../types';

/** Life stages. Nobody leaves their rung; Prime is a standing reward, not a size class. */
export const STAGES = ['Young', 'Adult', 'Prime'] as const;
export const STAGE_SCALE = [0.6, 1.0, 1.2] as const;
/** Standing at which each stage is reached. */
export const STAGE_AT = [0, 25, 60] as const;
export const RUNG_NAMES = ['', 'Floor', 'Shoal', 'Hunters', 'Giants'] as const;
export const DOMINANT = 100;
export const HOLD_TO_WIN = 90;

export interface DeadZone { pos: Vec3; r: number; age: number; life: number; drift: Vec3; }

/** Per-actor Devonian state, kept beside the shared Actor rather than on it. */
export interface DevActor {
  standing: number;
  stage: 0 | 1 | 2;
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
  recent: string[];
  openT: number;               // rung I benthos: time alive in the open
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
    d = { standing: 0, stage: 0, air: 1, gulpT: 0, inRange: false, rangeT: 0, beached: false, deadT: 0, deadZoneIn: false, moultSoft: 0, exuvia: -1, exuviaT: 0, followers: 0, sinceGain: 0, sinceEat: 0, dominantT: 0, recent: [], openT: 0 };
    s.actors.set(a.id, d);
  }
  return d;
}
