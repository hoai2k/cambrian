import { clamp, heading, v3, type Vec3 } from '../shared/math';
import { creature, naturalSizing, type CreatureId } from './creatures';
import { tierForScale } from './tiers';
import type { Actor, Band, Controller } from './types';

export const lengthOf = (a: Actor) => creature(a.creature).adultLength * a.scale;
/**
 * Body mass, in arbitrary units — every use of it is a ratio between two animals.
 *
 * Cubed length where the roster carries its own lengths, cubed scale otherwise. Scale is a fraction
 * of the animal's own adult size, which stands in for mass only while the roster is all one size;
 * spread over the real animals' proportions two creatures at scale 1 are nothing like the same
 * animal, and a knockback weighted by that reads as nonsense. `naturalSizing` and not simply "not
 * flattened", so that an era with no table of its own is left exactly as it was.
 */
export const massOf = (a: Actor) => (naturalSizing() ? lengthOf(a) : a.scale) ** 3;
/** Bigger creatures move faster in absolute terms but slower in body lengths. */
export const speedFactor = (scale: number) => Math.pow(scale, 0.45);
export const clearanceOf = (a: Actor) => lengthOf(a) * (creature(a.creature).clearance ?? (creature(a.creature).ground ? 0.13 : 0.2));
export const bodyRadius = (a: Actor) => lengthOf(a) * (creature(a.creature).bodyRadius ?? .22);
/**
 * How far a body's surface is from a point, treating the animal as a capsule down its own axis
 * rather than as a ball around its middle.
 *
 * A ball is close enough for a body about as wide as it is long, and badly wrong for anything
 * else: an adult Anomalocaris is twenty units from nose to tail and four and a half across, so
 * everything measured against `bodyRadius` from its centre missed the far half of it. You could be
 * pressed against its tail — ten units from the centre of a body whose reach test allowed six —
 * and be told there was nothing there to take hold of.
 *
 * Negative inside the body. Cheap: one dot product and a clamp.
 */
export function surfaceGap(a: Actor, p: Vec3): number {
  const h = heading(a.yaw), r = bodyRadius(a);
  // The spine: the part of the axis that is not already accounted for by the round ends.
  const half = Math.max(0, lengthOf(a) * 0.5 - r);
  const dx = p.x - a.pos.x, dy = p.y - a.pos.y, dz = p.z - a.pos.z;
  const along = clamp(dx * h.x + dz * h.z, -half, half);
  return Math.hypot(dx - h.x * along, dy, dz - h.z * along) - r;
}
/** The gap between two bodies' surfaces, each taken as its own capsule. Negative when they overlap. */
export const bodyGap = (a: Actor, b: Actor) => surfaceGap(a, b.pos) - bodyRadius(b);
/**
 * How close the body may get to the seabed. A crawler rides at its full clearance — that is what
 * the number is for — but a swimmer is allowed to come most of the way down onto the sand, because
 * skimming the floor is how you hunt what lives on it. `clearanceOf` stays the resting height the
 * rest of the sim reasons about (hiding, spawning, the AI's idea of "near the bottom").
 */
export const floorClearance = (a: Actor) => clearanceOf(a) * (creature(a.creature).ground ? 1 : 0.45);
/**
 * How far a body can be lifted in one step and still read as swimming rather than stepping. Rocks
 * are domes: anything shallow enough to be carried over inside this budget is simply not collided
 * with, and the floor under the body takes it up and across.
 */
export const glideOver = (a: Actor) => lengthOf(a) * 0.5 + 0.5;
/**
 * How far above the body a rock's top may stand and still be something to get over rather than a
 * wall: twice the body. Under that, a face too steep to glide up is climbed — the body is held out
 * of the rock and lifted up its side until the top is clear, then swims on over it. Above it, the
 * rock is a cliff and behaves like one.
 */
export const climbHeight = (a: Actor) => creature(a.creature).cling ? Infinity : lengthOf(a) * 2;
/** How fast that climb goes: a swimmer's own rise, so going over a rock is paced like swimming up. */
export const climbRise = (a: Actor) => 2.6 * speedFactor(a.scale);

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
  const k = Math.pow(a.scale, 1.1);
  a.hpMax = Math.round(def.hp * k);
  a.poiseMax = Math.round(def.poise * k);
  a.staminaMax = Math.round(def.stamina * (0.7 + 0.3 * Math.min(a.scale, 2.6)));
  a.hp = keepFraction ? a.hpMax * hpFrac : a.hpMax;
  a.poise = a.poiseMax;
  a.stamina = Math.min(a.stamina || a.staminaMax, a.staminaMax);
}

export function makeActor(id: number, creatureId: CreatureId, controller: Controller, pos: Vec3, scale: number, player = -1): Actor {
  const a: Actor = {
    id, creature: creatureId, controller, player,
    // Yaw is set by the caller from the game's seeded RNG: nothing in the simulation may use
    // Math.random, or the same seed stops reproducing the same match.
    pos: { ...pos }, vel: v3(), yaw: 0, pitch: 0, bank: 0, roll: 0,
    scale, tier: tierForScale(creatureId, scale), nutrition: 0, ageGrowth: 0,
    hp: 0, hpMax: 0, stamina: 0, staminaMax: 0, exhausted: 0, poise: 0, poiseMax: 0,
    state: 'free', stateT: 0, stateDur: 0, combo: 0, comboT: 0, hitDone: new Set(),
    iframes: 0, lockTarget: -1, guardHeld: 0,
    hideMode: 'none', hideT: 0, hideCd: 0, camoStrength: 0, camoScheme: 'default', camoLabel: '', camoSource: -1, emergenceHeavy: false,
    abilityCd: 0, abilityT: 0, abilityActive: false, senseMode: true, senseT: 0, pulseT: 0, burstT: 0,
    hitFlash: 0, hitDir: v3(), hitStop: 0,
    grabbedBy: -1, grabbing: -1, grabT: 0, grabOff: v3(0, 0, 1), eatingTarget: -1, eatProgress: 0,
    corpseT: 0, eaten: 0, eatBites: 0, killer: -1, noise: 0.5, cover: 0, stillness: 0,
    dodgeDir: v3(0, 0, 1), dodgeTapT: 0, hopVel: 0, grounded: true, climbPush: 0, climbTo: -Infinity, airborne: false,
    prev: { light: false, heavy: false, ability: false, dodge: false, guard: false, lock: false, sense: false, rise: false, burst: false, dash: false, aim: false },
    respawnT: 0, reviveT: 0, carriedTop: false, hatching: false, dashHoldT: 0, dashUsed: false, pounceCd: 0, dashCd: 0, sinceHit: 99, lastHitBy: -1, swallowedBy: -1, holdT: 0, graspHold: false, graspT: 0, graspSpent: false, rideHost: -1, rideT: 0, rideOff: v3(), riddenBy: -1, deathY: 0, sparkled: false, tumble: v3(), aimInRange: false, aiming: false, kills: 0, eats: 0, escapes: 0, hunted: 0, hunterId: -1, wasHunted: false, seen: 0, bubbles: 0,
    spawnProtect: controller === 'player' ? 3 : 0,
    home: { ...pos }, teleportCd: 0,
    prevT: { x: pos.x, y: pos.y, z: pos.z, yaw: 0, pitch: 0, bank: 0 },
  };
  applyScaleStats(a, false);
  a.stamina = a.staminaMax;
  a.prevT.yaw = a.yaw;
  return a;
}

export const isAlive = (a: Actor) => a.state !== 'dead' && a.state !== 'swallowed';
export const canAct = (a: Actor) => a.state === 'free' || a.state === 'guard';
export const isHidden = (a: Actor) => a.hideMode === 'burrowed' && a.seen <= 0;
export const isInvulnerable = (a: Actor) => a.iframes > 0 || a.spawnProtect > 0 || a.state === 'moult';

export const staminaCost = (a: Actor, base: number) => base * clamp(0.6 + a.scale * 0.25, 0.6, 1.3);
