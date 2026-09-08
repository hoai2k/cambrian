import { ACTIVE_ERA } from '../content';
import type { Vec3 } from '../shared/math';
import type { Game } from './game';
import type { Actor, Mode, WorldEvent } from './types';
import type { CreatureId } from './creatures';
import type { ExpansionContext } from './expansion-abilities';
import { DEVONIAN_RULES } from './devonian/rules';

/**
 * The seams where an era changes how the shared simulation behaves. Every hook is optional in
 * effect: when RULES is undefined (the Cambrian build) the Game takes exactly the paths it always
 * took. The Devonian implementation lives in src/sim/devonian/ and reaches the game only through
 * these calls, so the two eras never share gameplay code paths they do not both want.
 */
export interface EraHud {
  /** 0..100 growth meter: what this animal has eaten, which is what moults it up a stage. */
  standing: number;
  /**
   * 0..1 toward the *next* moult, which is what the HUD ring reads. The whole meter would answer a
   * different question ("how grown am I overall") and leave the ring nowhere near full at the
   * moment the body moults — in both eras a full ring means the next stage, and nothing else.
   */
  stageProgress: number;
  rung: number; rungName: string; stage: string;
  /** 0..1 air remaining, for air breathers only. */
  air?: number;
  beached: boolean;
  /** Dead zones as world offsets from the player and radii, for the radar. */
  deadZones: { dx: number; dz: number; r: number }[];
  /** Seconds this player has held Prime, for Rise's win countdown. */
  primeT: number;
  inDeadZone: boolean;
}

export interface EraRules {
  /** Once, when the era is chosen: registers its specials with the shared tables. */
  install(): void;
  /** The Y button's own special for this creature, when the era gives it one instead of the shared hide. */
  ySpecial(id: CreatureId): { name: string; desc: string } | undefined;
  /** Starting body scale for the player or bot at `index` in `mode`, for creature `id`. */
  startScale(mode: Mode, index: number, id: CreatureId): number;
  /**
   * Where a player or bot hatches, given the nursery centre; undefined leaves the shared placement.
   * The Devonian puts every hatchling inside plant cover, on the floor or up a column.
   */
  spawnPoint(g: Game, center: Vec3, id: CreatureId, scale: number, index: number): Vec3 | undefined;
  /** The nursery a bot hatches in; undefined puts it with the players. */
  botNursery(index: number): Vec3 | undefined;
  /** Seconds of protection a body gets when it hatches or comes back. */
  spawnProtect(a: Actor): number;
  /**
   * True when `hunter` (an AI body) must leave `target` alone unless provoked: the era's nursery
   * sanctuary. The caller has already established the hunter is not provoked.
   */
  sanctuary(hunter: Actor, target: Actor): boolean;
  init(g: Game): void;
  /** After every fixed step, before the events are drained by the renderer. */
  step(g: Game, dt: number): void;
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
  /** The body scales a moult ceremony grows between; undefined leaves the shared tier scales in charge. */
  moultScale(g: Game, a: Actor): { from: number; to: number } | undefined;
  /** Y pressed while free or guarding and not hidden: true when the era's own special took it (the shared hide is skipped). */
  useAbility(g: Game, a: Actor, ctx: ExpansionContext): boolean;
  /** A heavy special started (after the shared begin): the era may aim and commit it. */
  /** Optional: the shared code aims and carries every heavy strike (`HEAVY_STRIKE`); this is for
   *  anything an era needs on top of that. */
  beginAbility?(g: Game, a: Actor, ctx: ExpansionContext): void;
  /** Every step in the 'ability' state (after the shared step). */
  stepAbility(g: Game, a: Actor, ctx: ExpansionContext, dt: number): void;
  /** Multiplier on the camouflage stamina drain. */
  camoDrain(a: Actor): number;
  /**
   * How this body swims where it wants to go: `speed` scales cruise for the direction asked
   * (relative to the heading), `turn` scales the turn rate, `impulse` is an instant velocity along
   * the heading (a fast-start) on the sprint press. `dir` is the unit direction asked for, `mag`
   * the stick magnitude, `cruise` the speed the shared rules would give.
   */
  swim(g: Game, a: Actor, dir: Vec3, mag: number, cruise: number, burstPressed: boolean): { speed: number; turn: number; impulse: number };
  /** May this body leave the water when it drives hard at the surface? */
  canBreach(a: Actor): boolean;
  /** Height a body hatches at, given the floor under it and its length. */
  spawnY(ground: number, L: number, isGround: boolean): number;
  /** Height an AI body wanders to, given the floor there. */
  wanderY(a: Actor, ground: number, rng: () => number): number;
  /** Replaces the death penalty. */
  onRespawn(g: Game, a: Actor): void;
  /** Win checks for the era's own modes; the shared ones (reef, hunted) run as before. */
  updateModes(g: Game, dt: number): void;
  /**
   * A finished co-op match is being carried on (`Game.continueMatch`): clear whatever the era was
   * counting towards its win so the goal is not met again the instant play resumes.
   */
  continueMatch(g: Game): void;
  hud(g: Game, i: number): EraHud | undefined;
  hint(g: Game, i: number): string | undefined;
  /**
   * How this contender reads on the scoreboard, when the era ranks its players by something of
   * its own (the Devonian's stages and standing) rather than by tier. Optional: without it the
   * shared tier name and nutrition ring are used.
   */
  scoreLine?(g: Game, a: Actor): { rank: string; progress: number } | undefined;
}

export const RULES: EraRules | undefined = ACTIVE_ERA.id === 'devonian' ? DEVONIAN_RULES : undefined;
RULES?.install();
