import type { Vec3 } from '../shared/math';
import type { CreatureId, MoveDef } from './creatures';

export type Tier = 0 | 1 | 2 | 3 | 4;
export const TIER_NAMES = ['Larva', 'Juvenile', 'Adult', 'Giant', 'Apex'] as const;
/**
 * The rungs' scales, as multiples of the creature's adult length. Ask `tierScale` in
 * src/sim/tiers.ts rather than indexing this: with equivalent sizing on the two rungs below Adult
 * are per-creature, because everything hatches the same *length* rather than the same fraction of
 * its eventual self, and an Anomalocaris then has far further to grow than a Marrella.
 */
export const TIER_SCALE = [0.25, 0.5, 1.0, 1.7, 2.6] as const;
/** Nutrition needed to leave each tier. */
export const TIER_NEED = [30, 60, 85, 120, Infinity] as const;

export type Band = 'snack' | 'prey' | 'rival' | 'threat' | 'giant';
export const BAND_COLOR: Record<Band, string> = {
  snack: '#7ef0a8', prey: '#5fd9d1', rival: '#ffc45c', threat: '#ff8a3d', giant: '#ff4b5c',
};

export type Controller = 'player' | 'bot' | 'ambient' | 'giant' | 'swarm' | 'shadow';

export type ActorState =
  | 'free' | 'attack' | 'dodge' | 'guard' | 'parry' | 'stagger'
  | 'grabbed' | 'grabbing' | 'eating' | 'ability' | 'moult' | 'dead' | 'pounce' | 'swallowed';

export interface InputFrame {
  /** Left stick, -1..1, y is forward. */
  mx: number; my: number;
  /** Camera orientation used to make the stick camera-relative (players) */
  camYaw: number; camPitch: number;
  /** If set, `mx/my` are already a world-space direction (bots). */
  worldMove?: Vec3;
  burst: number;   // 0..1 analog
  rise: boolean; sink: boolean;
  light: boolean; heavy: boolean; ability: boolean; dodge: boolean; guard: boolean;
  lock: boolean; sense: boolean;
  /** LB: a sidestep dash in the stick direction, or along the body's own axis with a neutral stick. */
  dash: boolean;
  /** LT held: aim mode. The renderer decides what the centred crosshair is over and passes it here. */
  aim: boolean; aimTarget: number;
  lookX: number; lookY: number;
}

export const emptyInput = (): InputFrame => ({
  mx: 0, my: 0, camYaw: 0, camPitch: 0, burst: 0, rise: false, sink: false,
  light: false, heavy: false, ability: false, dodge: false, guard: false, lock: false, sense: false,
  dash: false, aim: false, aimTarget: -1,
  lookX: 0, lookY: 0,
});

export interface BrainState {
  kind: 'swarm' | 'needs' | 'giant';
  goal: 'wander' | 'hunt' | 'flee' | 'hide' | 'fight' | 'patrol' | 'search' | 'sleep' | 'graze' | 'notice' | 'defend' | 'scavenge';
  target: number;          // actor id or -1
  goalT: number;           // time in goal
  thinkT: number;          // countdown to next decision
  wanderTo: Vec3;
  home: Vec3;
  patrol?: Vec3[]; patrolIndex: number;
  lastSeen?: Vec3;
  detection: Map<number, number>;
  schoolId?: number;
  hunger: number; lastEats: number;
  parrySkill: number;      // chance a well-timed guard becomes a parry (players always 1)
  courage: number;         // drops when hit by something smaller; below zero the creature runs
  cached?: InputFrame;
  aggression: number;      // 0..1
  /**
   * How little it takes to start a fight, 0..1. A grumpy animal (high temper) squares up to
   * anything its own size that comes inside its personal space, whatever the hour and whether or
   * not it is hungry. A placid one has to be attacked first.
   */
  temper: number;
  /** Personal variation in how soon this animal gets hungry, 0..1, so a shoal does not turn as one. */
  appetite: number;
  /**
   * The patch this animal holds, if it holds one. It drives an intruder of comparable size out of
   * `territoryR` and then goes home; it never follows beyond the edge, so walking away always
   * works and the decision to go in is the player's to make.
   */
  territory?: Vec3;
  territoryR: number;
  reaction: number;        // seconds of reaction delay
  reactT: number;
  pendingAction?: 'light' | 'heavy' | 'dodge' | 'guard' | 'ability';
}

export interface Actor {
  id: number;
  creature: CreatureId;
  controller: Controller;
  player: number;          // -1 for AI
  pos: Vec3; vel: Vec3;
  yaw: number; pitch: number; bank: number;
  roll: number;            // extra roll for enroll
  scale: number;           // × adult model
  tier: Tier; nutrition: number; ageGrowth: number;
  hp: number; hpMax: number;
  stamina: number; staminaMax: number; exhausted: number;
  poise: number; poiseMax: number;
  state: ActorState; stateT: number; stateDur: number;
  move?: MoveDef; moveKind?: 'light' | 'heavy'; combo: number; comboT: number;
  hitDone: Set<number>;
  iframes: number;
  lockTarget: number;
  guardHeld: number;
  abilityCd: number; abilityT: number; abilityActive: boolean;
  hideMode: 'none' | 'descending' | 'burrowed' | 'camouflage';
  hideT: number; hideCd: number; camoStrength: number;
  camoColors?: import('./concealment').CamoColors; camoScheme: string; camoLabel: string; camoSource: number;
  emergenceHeavy: boolean;
  /**
   * Sense: a display mode the player holds on or off, not a pulse. On (the default) the band
   * glyphs and the radar are drawn; off, the screen carries nothing but the animal and the HUD,
   * which is the immersive way to play. Display only — nothing in the simulation reads it.
   */
  senseMode: boolean;
  /** Where a pulse swimmer's bell is in its cycle, seconds. Unused by everything else. */
  pulseT: number;
  /** How long this body still reads as revealed: the whip search, and a hidden body found by one. */
  senseT: number;
  burstT: number;          // free burst timer (ambush surge)
  hitFlash: number; hitDir: Vec3; hitStop: number;
  grabbedBy: number; grabbing: number; grabT: number;
  /**
   * Where the grip landed on this body, as a unit direction in its own frame (right, up, forward).
   * Held prey used to be parked at a fixed point off the grabber's nose, sized by the *grabber*,
   * so a big mouthful sat half inside its captor and a small one hung in front of it; this is the
   * spot on the victim that the grip actually has, so the two stay joined whatever their sizes.
   * Meaningless unless `grabbedBy >= 0`.
   */
  grabOff: Vec3;
  eatingTarget: number; eatProgress: number;
  corpseT: number;         // seconds since death for corpses
  eaten: number;           // 0..1 fraction of corpse consumed, in whole bites once it is being torn
  /** Bites this body is taking to finish, set by whoever is eating it; 1 means swallowed whole. */
  eatBites: number;
  killer: number;
  noise: number; cover: number; stillness: number;
  dodgeDir: Vec3; dodgeTapT: number;
  hopVel: number; grounded: boolean;
  /**
   * Seconds spent pushing into something solid that will not simply be glided over (up to a second,
   * and it drains twice as fast as it fills). A body that keeps leaning on an obstacle means to get
   * over it; one that brushes it while turning does not, so the climb waits for the press to be
   * held — and once it is going, a step or two of lost contact does not call it off.
   */
  climbPush: number;
  /**
   * The height this body is currently climbing to, or -Infinity when it is not climbing. Going over
   * something is a commitment that outlives the contact that started it: rocks fall away under you
   * as you rise, and a climb that stopped the moment they did would just bounce at the foot.
   */
  climbTo: number;
  /** Out of the water: a leap in flight, gravity only, until the splash. */
  airborne: boolean;
  prev: { light: boolean; heavy: boolean; ability: boolean; dodge: boolean; guard: boolean; lock: boolean; sense: boolean; rise: boolean; burst: boolean; dash: boolean; aim: boolean };
  brain?: BrainState;
  respawnT: number; hatching: boolean;
  /** Co-op: how long a team-mate has been holding station beside this downed body. */
  reviveT: number;
  /**
   * This player hatched on the top rung of the growth ladder, by carrying a finished run in.
   *
   * Rise's goal is to reach the top and hold it, and they arrived there — so the goal is already
   * behind them and its clock never runs for them: the sea is simply open, exactly as it is after
   * pressing "keep playing". It is per player, not per match, so somebody else in the same co-op
   * game who is still growing keeps their clock and can still win it.
   */
  carriedTop: boolean;
  dashHoldT: number; dashUsed: boolean; pounceCd: number; aimInRange: boolean; aiming: boolean;
  dashCd: number; sinceHit: number; lastHitBy: number; swallowedBy: number; holdT: number;
  /**
   * A grasping creature is holding its attack button down, so what lands takes hold instead of
   * striking through. Set from the input every step; false for anything that cannot grasp.
   */
  graspHold: boolean;
  /**
   * How long the grip has been armed, seconds. A grip closes on something too big to bite the
   * moment the button is down — there is nothing else that press could usefully mean, and the
   * point of it is to get hold without bothering the animal — but on a mouthful it waits for
   * `GRASP_HOLD`, so a tap is still the bite it has always been and only a deliberate hold takes
   * hold. Reset whenever the button comes up.
   */
  graspT: number;
  /**
   * A grip that ended on its own — the ride ran out, or the arms gave — stays ended until the
   * button comes up. Without it a hold that had just expired was retaken on the very next frame by
   * the button still being held, so nothing could ever run out.
   */
  graspSpent: boolean;
  /**
   * Riding: the animal this one is clinging to (-1 when not riding), how long it has held on, and
   * where it took hold in the host's own frame — sideways, up and forward, in host body lengths —
   * so the grip follows the host as it turns. `riddenBy` is the same hold from the host's side.
   *
   * A ride is a field rather than a state on purpose: the rider keeps its own state machine, which
   * is what lets it bite the thing it is holding on to.
   */
  rideHost: number; rideT: number; rideOff: Vec3; riddenBy: number;
  deathY: number; sparkled: boolean; tumble: Vec3;
  kills: number; eats: number; escapes: number;
  hunted: number;          // 0..1 highest detection score against this actor (HUD)
  hunterId: number;
  wasHunted: boolean;
  seen: number;            // seconds of being visible to a hunter
  bubbles: number;
  spawnProtect: number;
  /** Where this creature last hatched: the nursery it teleports home to. */
  home: Vec3;
  teleportCd: number;
  /**
   * The transform at the start of the current sim step. The simulation is a fixed 60 Hz but the
   * screen refreshes at its own rate, so the renderer interpolates between this and the current
   * transform; without it every creature holds still for two or three frames and then jumps.
   * Write-only as far as the simulation is concerned.
   */
  prevT: { x: number; y: number; z: number; yaw: number; pitch: number; bank: number };
}

export interface Corpse { id: number; }

export interface SiltCloud { pos: Vec3; radius: number; t: number; }

export interface PlayerSetup {
  creature: CreatureId;
  device: number | 'keyboard' | 'keyboard2';
  ready: boolean;
  /**
   * Rise only: the rung of the growth ladder to hatch on, instead of rung 0. This is how a player
   * carries on from the furthest they have taken this creature before rather than starting again
   * as a hatchling. Absent or 0 means the usual start; the other modes hand out their own bodies
   * and ignore it. See src/sim/ladder.ts.
   */
  startRung?: number;
}

/** The three modes, shared by both eras: an era changes the sea and the animals, not the match. */
export type Mode = 'rise' | 'hunted' | 'reef';
export const MODE_IDS: readonly Mode[] = ['rise', 'hunted', 'reef'];
/**
 * Modes that are not a contest between players. Their goal is a milestone rather than a win over
 * somebody, so meeting it need not take the sea away: these matches can carry on afterwards as a
 * free swim (`Game.continueMatch`). The versus mode — hunted — ends for good.
 */
export const COOP_MODES: readonly Mode[] = ['rise', 'reef'];
export const isCoop = (m: Mode) => COOP_MODES.includes(m);

export interface Prompt { text: string; t: number; }

export interface WorldEvent {
  kind: 'hit' | 'kill' | 'eat' | 'tierUp' | 'parry' | 'guardBreak' | 'burst' | 'escape' | 'noticed' | 'hunted' | 'dodge' | 'ability' | 'grab' | 'moult' | 'death' | 'silt' | 'stagger' | 'sense' | 'pounce' | 'swallow' | 'routed' | 'disintegrate' | 'teleport' | 'gulp' | 'winded' | 'anoxia' | 'beach' | 'shoalJoin' | 'shellCrush' | 'breach' | 'splash' | 'hatch';
  pos: Vec3; actor: number; other?: number; strength?: number; player?: number;
}
