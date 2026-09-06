import type { Vec3 } from '../shared/math';
import type { CreatureId, MoveDef } from './creatures';

export type Tier = 0 | 1 | 2 | 3 | 4;
export const TIER_NAMES = ['Larva', 'Juvenile', 'Adult', 'Giant', 'Apex'] as const;
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
  /** LB: tap with a stick direction = sidestep dash, hold = sprint. */
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
  goal: 'wander' | 'hunt' | 'flee' | 'hide' | 'fight' | 'patrol' | 'search' | 'sleep' | 'graze' | 'notice';
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
  senseCd: number; senseT: number;
  burstT: number;          // free burst timer (ambush surge)
  hitFlash: number; hitDir: Vec3; hitStop: number;
  grabbedBy: number; grabbing: number; grabT: number;
  eatingTarget: number; eatProgress: number;
  corpseT: number;         // seconds since death for corpses
  eaten: number;           // 0..1 fraction of corpse consumed
  killer: number;
  noise: number; cover: number; stillness: number;
  dodgeDir: Vec3; dodgeTapT: number;
  hopVel: number; grounded: boolean;
  prev: { light: boolean; heavy: boolean; ability: boolean; dodge: boolean; guard: boolean; lock: boolean; sense: boolean; rise: boolean; burst: boolean; dash: boolean; aim: boolean };
  brain?: BrainState;
  respawnT: number; hatching: boolean;
  dashHoldT: number; dashUsed: boolean; dashQueued: boolean; pounceCd: number; aimInRange: boolean; aiming: boolean;
  dashCd: number; sinceHit: number; lastHitBy: number; swallowedBy: number; holdT: number;
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
}

export interface Corpse { id: number; }

export interface SiltCloud { pos: Vec3; radius: number; t: number; }

export interface PlayerSetup { creature: CreatureId; device: number | 'keyboard' | 'keyboard2'; ready: boolean; }

export type Mode = 'rise' | 'frenzy' | 'hunted' | 'reef';

export interface Prompt { text: string; t: number; }

export interface WorldEvent {
  kind: 'hit' | 'kill' | 'eat' | 'tierUp' | 'parry' | 'guardBreak' | 'burst' | 'escape' | 'noticed' | 'hunted' | 'dodge' | 'ability' | 'grab' | 'moult' | 'death' | 'silt' | 'stagger' | 'sense' | 'pounce' | 'swallow' | 'routed' | 'disintegrate' | 'teleport';
  pos: Vec3; actor: number; other?: number; strength?: number; player?: number;
}
