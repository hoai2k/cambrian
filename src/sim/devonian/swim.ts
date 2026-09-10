import { clamp, dot, heading, type Vec3 } from '../../shared/math';
import { isAlive, lengthOf } from '../actors';
import { creature, type CreatureId } from '../creatures';
import { DIP_CHANCE } from '../locomotion';
import type { Game } from '../game';
import type { Actor } from '../types';
import { coverAt, groundHeight, nurseryAt, nurseryFactor, NURSERY_R, SURFACE_Y } from '../world';
import { ADULT_STAGE, devActor, stageForScale } from './state';

/**
 * How a fish moves, as the shared simulation asks about it through the `swim`, `canBreach`,
 * `spawnY` and `wanderY` hooks (docs/research/devonian-swimming.md has the sources):
 *
 * - Forward is the fast direction. A fish backs up by sculling its paired fins at a fraction of
 *   cruise, and swims sideways little better, so the natural escape is to ease back, turn, and
 *   dart: reverse is slow, the turn while slow or reversing is sharp, and the first press of
 *   sprint from rest is a fast-start (a C-start) that throws the body forward before the tail
 *   has built up speed.
 * - Shells jet, so no direction is the slow one for them: no reverse penalty, and a smaller
 *   fast-start. Their sprint still goes where the stick points, like every other body's — the
 *   funnel buys them free rise and sink, not a reversed control. A shell also swims both ways
 *   round: it leads with whichever end it is already pointing rather than turning round first
 *   (the heading rule is in `Game.updateActor`).
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

/**
 * Where a hatchling is placed: inside plant cover near the nursery centre, never in open water. A
 * swimmer takes a crown up a column when one is near (a lily's crown, a frond tower's top), else a
 * floor plant; a crawler always a floor plant. Nothing hatches floating by itself; when there is no
 * cover at all within reach the shared placement is used. Deterministic: the game's rng picks.
 */
export function spawnInCover(g: Game, center: Vec3, id: CreatureId, scale: number, index: number): Vec3 | undefined {
  const def = creature(id);
  const L = def.adultLength * scale;
  const all = g.world.coverHash.query(center.x, center.z, 48, []).filter((c) => !c.temp && c.maxLength >= L * 0.9 && dist2D(c.pos, center) < 48);
  // inside the nursery proper first, where the sanctuary holds; the fringe only when it has to be
  const inner = all.filter((c) => dist2D(c.pos, center) < NURSERY_R * 0.85);
  const options = inner.length ? inner : all;
  if (!options.length) return undefined;
  const ground = (c: Vec3) => groundHeight(g.world, c.x, c.z, []);
  const high = options.filter((c) => c.pos.y > ground(c.pos) + 4);
  // A crawler hatches down on the sand, so the patch has to reach the sand: a crinoid crown three
  // units up is cover for a swimmer and open floor for a trilobite.
  const pool = def.ground ? options.filter((c) => c.pos.y - ground(c.pos) <= c.radius * 0.8) : (high.length && g.rng() < 0.6 ? high : options);
  const from = pool.length ? pool : options;
  // Bots carry player index -1 when respawning; never use a negative array remainder.
  const c = from[(Math.max(0, index) * 7 + Math.floor(g.rng() * from.length)) % from.length];
  // Four draws inside the patch, keeping the one that actually hides the body. A crawler sits down
  // on the sand while the cover offered to it may be centred a body-length above, so the first
  // point in the disc is not reliably inside the thing that was meant to hide it. Always four
  // draws, whatever the answer, so the match still replays from the seed.
  let best: Vec3 | undefined, bestCover = -1;
  for (let i = 0; i < 4; i++) {
    const ang = g.rng() * Math.PI * 2, r = g.rng() * c.radius * 0.4;
    const x = c.pos.x + Math.cos(ang) * r, z = c.pos.z + Math.sin(ang) * r;
    const gr = groundHeight(g.world, x, z, []);
    const y = def.ground ? gr + L * 0.13 : clamp(c.pos.y, gr + 0.6 + L * 0.3, SURFACE_Y - 3);
    const at = { x, y, z };
    const hidden = coverAt(g.world, at, L, []);
    if (hidden > bestCover) { bestCover = hidden; best = at; }
  }
  return best;
}
const dist2D = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.z - b.z);

/**
 * Nurseries are sanctuaries for the young. Bots hatch in the next nurseries along the shore rather
 * than beside the players; a body that has not reached adult size cannot be hunted or fought
 * inside a nursery by an AI body unless it started the fight; and a hatchling keeps its spawn
 * protection for eight seconds, a juvenile five.
 */
export function botNursery(index: number): Vec3 { return nurseryAt(1 + (index % 2)); }
export function spawnProtect(a: Actor): number {
  const def = creature(a.creature);
  const stage = stageForScale(def.adultLength, a.scale);
  return stage === 0 ? 8 : stage === 1 ? 5 : 3.5;
}
export function sanctuary(hunter: Actor, target: Actor): boolean {
  if (target.controller !== 'player' && target.controller !== 'bot') return false;
  if (nurseryFactor(target.pos.x, target.pos.z) < 0.05) return false;           // anywhere inside the nursery ring
  const def = creature(target.creature);
  return stageForScale(def.adultLength, target.scale) < ADULT_STAGE || hunter.controller === 'bot';
}

/** Where a swimmer hatches when there is no cover to hatch in: mid-column, with more water over it than under. */
export function spawnY(ground: number, L: number, isGround: boolean): number {
  if (isGround) return ground + L * 0.13;
  return ground + clamp((SURFACE_Y - ground) * 0.45, 1.2 + L * 0.5, SURFACE_Y - ground - 4);
}

/**
 * Where an AI swimmer wanders to: anywhere in the column, biased up for the open-water bodies and
 * further up the bigger the body is. A bottom-feeder stays down whatever its size; anything else
 * large keeps to the higher water, apart from the occasional pass over the floor (`DIP_CHANCE`),
 * because a big fish is something you see go by overhead and not something lying on the sand.
 */
export function wanderY(a: Actor, ground: number, rng: () => number): number {
  const def = creature(a.creature);
  if (def.ground) return ground;
  const L = lengthOf(a);
  const benthic = def.diet === 'deposit' || def.diet === 'grazer' || def.ability === 'sandAmbush' || def.ability === 'floorSweep';
  const column = SURFACE_Y - 2 - (ground + 1 + L * 0.3);
  const dip = !benthic && L > 2.5 && rng() < DIP_CHANCE;
  const lo = benthic || dip ? 0 : clamp(0.15 + Math.max(0, L - 2.5) * 0.1, 0.15, 0.6);
  const f = benthic ? rng() * 0.25 : dip ? rng() * 0.2 : lo + rng() * (0.95 - lo);
  return clamp(ground + 1 + L * 0.3 + column * f, ground + 1, SURFACE_Y - 2);
}
