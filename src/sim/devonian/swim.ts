import { clamp, dot, heading, type Vec3 } from '../../shared/math';
import { isAlive, lengthOf } from '../actors';
import { creature } from '../creatures';
import type { Game } from '../game';
import type { Actor } from '../types';
import { SURFACE_Y } from '../world';
import { devActor } from './state';

/**
 * How a fish moves, as the shared simulation asks about it through the `swim`, `canBreach`,
 * `spawnY` and `wanderY` hooks (docs/research/devonian-swimming.md has the sources):
 *
 * - Forward is the fast direction. A fish backs up by sculling its paired fins at a fraction of
 *   cruise, and swims sideways little better, so the natural escape is to ease back, turn, and
 *   dart: reverse is slow, the turn while slow or reversing is sharp, and the first press of
 *   sprint from rest is a fast-start (a C-start) that throws the body forward before the tail
 *   has built up speed.
 * - Shells jet: their fast direction is backward (the shared sprint already inverts for them),
 *   so they get no reverse penalty and a smaller fast-start.
 * - Crawlers (ground bodies) keep the shared rules.
 * - A fish can leave the water if it is driving hard at the surface: the sim lets it through the
 *   ceiling into a ballistic arc and it splashes back in. Crawlers and shells stay under.
 * - The roster is pelagic: bodies spawn and wander mid-column, not just off the floor.
 */
const REVERSE = 0.3, SIDEWAYS = 0.55;
const DART_CD = 0.9;

export function swim(g: Game, a: Actor, dir: Vec3, mag: number, cruise: number, burstPressed: boolean): { speed: number; turn: number; impulse: number } {
  const def = creature(a.creature);
  if (def.ground) return { speed: 1, turn: 1, impulse: 0 };
  const d = devActor(g, a);
  d.dartCd = Math.max(0, d.dartCd - 1 / 60);
  const h = heading(a.yaw);
  const along = mag > 0 ? dot(dir, h) : 1;                    // +1 forward, -1 straight back
  const sp = Math.hypot(a.vel.x, a.vel.y, a.vel.z);
  const slow = 1 - clamp(sp / Math.max(cruise, 1e-3), 0, 1);
  let speed = 1, turn = 1 + 0.8 * slow;                       // sharper the slower it goes
  if (!def.shell && mag > 0) {
    if (along < -0.2) {                                       // backing up: sideways speed fading to reverse speed straight back
      const back = clamp((-0.2 - along) / 0.8, 0, 1);
      speed = SIDEWAYS + (REVERSE - SIDEWAYS) * back; turn *= 1.4;
    } else if (along < 0.5) speed = SIDEWAYS + (1 - SIDEWAYS) * clamp((along + 0.2) / 0.7, 0, 1);
  }
  let impulse = 0;
  if (burstPressed && d.dartCd === 0 && isAlive(a) && a.stamina > 12 && sp < cruise * 0.6) {
    impulse = (def.shell ? 0.45 : 0.9) * cruise;              // the fast-start, in units of cruise speed
    d.dartCd = DART_CD;
  }
  return { speed, turn, impulse };
}

/** Fish leap; shells, crawlers and anything with legs under the sand do not. */
export function canBreach(a: Actor): boolean {
  const def = creature(a.creature);
  return !def.ground && !def.shell && a.hideMode === 'none';
}

/** Where a swimmer hatches: mid-column, with more water over it than under. */
export function spawnY(ground: number, L: number, isGround: boolean): number {
  if (isGround) return ground + L * 0.13;
  return ground + clamp((SURFACE_Y - ground) * 0.45, 1.2 + L * 0.5, SURFACE_Y - ground - 4);
}

/** Where an AI swimmer wanders to: anywhere in the column, biased up for the open-water bodies. */
export function wanderY(a: Actor, ground: number, rng: () => number): number {
  const def = creature(a.creature);
  if (def.ground) return ground;
  const L = lengthOf(a);
  const benthic = def.diet === 'deposit' || def.diet === 'grazer' || def.ability === 'sandAmbush' || def.ability === 'floorSweep';
  const column = SURFACE_Y - 2 - (ground + 1 + L * 0.3);
  const f = benthic ? rng() * 0.25 : 0.15 + rng() * 0.75;
  return clamp(ground + 1 + L * 0.3 + column * f, ground + 1, SURFACE_Y - 2);
}
