import { ACTIVE_ERA } from '../content';
import type { Vec3 } from '../shared/math';
import type { Game } from './game';
import type { Actor, Mode, WorldEvent } from './types';
import { DEVONIAN_RULES } from './devonian/rules';

/**
 * The seams where an era changes how the shared simulation behaves. Every hook is optional in
 * effect: when RULES is undefined (the Cambrian build) the Game takes exactly the paths it always
 * took. The Devonian implementation lives in src/sim/devonian/ and reaches the game only through
 * these calls, so the two eras never share gameplay code paths they do not both want.
 */
export interface EraHud {
  /** 0..100 standing, the era's progress meter. */
  standing: number;
  rung: number; rungName: string; stage: string;
  /** 0..1 air remaining, for air breathers only. */
  air?: number;
  /** This player currently holds range here. */
  inRange: boolean;
  beached: boolean;
  /** Dead zones as world offsets from the player and radii, for the radar. */
  deadZones: { dx: number; dz: number; r: number }[];
  /** Seconds this player has been Dominant (standing at 100), for the win countdown. */
  dominantT: number;
  /** The last few standing sources, newest last, for the ring's ticks. */
  recent: string[];
  inDeadZone: boolean;
}

export interface EraRules {
  /** Starting body scale for the player or bot at `index` in `mode`. */
  startScale(mode: Mode, index: number): number;
  init(g: Game): void;
  /** After every fixed step, before the events are drained by the renderer. */
  step(g: Game, dt: number): void;
  /** Every event this step produced (the renderer drains them afterwards). */
  onEvents(g: Game, events: readonly WorldEvent[]): void;
  /** Nutrition a player or bot just gained; `food` is the eaten actor when there is one. */
  onNutrition(g: Game, a: Actor, amount: number, food: Actor | undefined): void;
  /** When true the shared nutrition → tier growth runs; when false the era owns growth. */
  growthByNutrition: boolean;
  /** Damage multiplier from armour, enrolment or a withdrawn shell; 1 = none. `dir` points attacker → victim. */
  armour(attacker: Actor, victim: Actor, dir: Vec3): number;
  /** How far past the shore wall this body may push (world units). */
  shoreReach(a: Actor): number;
  /** This body sprints as a backward jet and rises/sinks for free. */
  jet(a: Actor): boolean;
  /** Replaces the death penalty. */
  onRespawn(g: Game, a: Actor): void;
  /** Win checks for the era's own modes; the shared ones (reef, hunted) run as before. */
  updateModes(g: Game, dt: number): void;
  hud(g: Game, i: number): EraHud | undefined;
  hint(g: Game, i: number): string | undefined;
}

export const RULES: EraRules | undefined = ACTIVE_ERA.id === 'devonian' ? DEVONIAN_RULES : undefined;
