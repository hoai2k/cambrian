import { clamp, v3, type Vec3 } from '../shared/math';
import { creature, type CreatureId } from './creatures';
import { TIER_SCALE, type Actor, type Band, type Controller, type Tier } from './types';

export const lengthOf = (a: Actor) => creature(a.creature).adultLength * a.scale;
export const massOf = (a: Actor) => a.scale ** 3;
/** Bigger creatures move faster in absolute terms but slower in body lengths. */
export const speedFactor = (scale: number) => Math.pow(scale, 0.45);
export const clearanceOf = (a: Actor) => lengthOf(a) * (creature(a.creature).ground ? 0.13 : 0.2);
export const bodyRadius = (a: Actor) => lengthOf(a) * 0.22;

export function bandRatio(r: number): Band {
  if (r < 0.45) return 'snack';
  if (r < 0.7) return 'prey';
  if (r < 1.4) return 'rival';
  if (r < 2.2) return 'threat';
  return 'giant';
}
/** How `other` looks from `me`'s point of view. */
export const bandOf = (me: Actor, other: Actor): Band => bandRatio(lengthOf(other) / lengthOf(me));

export function applyScaleStats(a: Actor, keepFraction = true) {
  const def = creature(a.creature);
  const hpFrac = a.hpMax > 0 ? a.hp / a.hpMax : 1;
  const k = Math.pow(a.scale, 1.3);
  a.hpMax = Math.round(def.hp * k);
  a.poiseMax = Math.round(def.poise * k);
  a.staminaMax = Math.round(def.stamina * (0.7 + 0.3 * Math.min(a.scale, 2.6)));
  a.hp = keepFraction ? a.hpMax * hpFrac : a.hpMax;
  a.poise = a.poiseMax;
  a.stamina = Math.min(a.stamina || a.staminaMax, a.staminaMax);
}

export function tierForScale(s: number): Tier {
  let best: Tier = 0;
  for (let i = 0; i < TIER_SCALE.length; i++) if (s >= TIER_SCALE[i] * 0.98) best = i as Tier;
  return best;
}

export function makeActor(id: number, creatureId: CreatureId, controller: Controller, pos: Vec3, scale: number, player = -1): Actor {
  const a: Actor = {
    id, creature: creatureId, controller, player,
    pos: { ...pos }, vel: v3(), yaw: Math.random() * 6.283, pitch: 0, bank: 0, roll: 0,
    scale, tier: tierForScale(scale), nutrition: 0, ageGrowth: 0,
    hp: 0, hpMax: 0, stamina: 0, staminaMax: 0, exhausted: 0, poise: 0, poiseMax: 0,
    state: 'free', stateT: 0, stateDur: 0, combo: 0, comboT: 0, hitDone: new Set(),
    iframes: 0, lockTarget: -1, guardHeld: 0,
    abilityCd: 0, abilityT: 0, abilityActive: false, senseCd: 0, senseT: 0, burstT: 0,
    hitFlash: 0, hitDir: v3(), hitStop: 0,
    grabbedBy: -1, grabbing: -1, grabT: 0, eatingTarget: -1, eatProgress: 0,
    corpseT: 0, eaten: 0, killer: -1, noise: 0.5, cover: 0, stillness: 0,
    dodgeDir: v3(0, 0, 1), dodgeTapT: 0, hopVel: 0, grounded: true,
    prev: { light: false, heavy: false, ability: false, dodge: false, guard: false, lock: false, sense: false, rise: false, burst: false },
    respawnT: 0, hatching: false, kills: 0, eats: 0, escapes: 0, hunted: 0, hunterId: -1, wasHunted: false, seen: 0, bubbles: 0,
    spawnProtect: controller === 'player' ? 3 : 0,
  };
  applyScaleStats(a, false);
  a.stamina = a.staminaMax;
  return a;
}

export const isAlive = (a: Actor) => a.state !== 'dead';
export const canAct = (a: Actor) => a.state === 'free' || a.state === 'guard';
export const isHidden = (a: Actor) => a.abilityActive && (creature(a.creature).ability === 'burrow');
export const isInvulnerable = (a: Actor) =>
  a.iframes > 0 || a.spawnProtect > 0 || a.state === 'moult' ||
  (a.abilityActive && (creature(a.creature).ability === 'enroll' || creature(a.creature).ability === 'shellUp' || creature(a.creature).ability === 'burrow'));

export const staminaCost = (a: Actor, base: number) => base * clamp(0.6 + a.scale * 0.25, 0.6, 1.3);
