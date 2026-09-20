import { clamp, wrapAngle } from '../shared/math';
import { floorClearance, isAlive, lengthOf, swimCeiling } from './actors';
import { kill, type HitContext } from './combat';
import { creature } from './creatures';
import type { Actor, InputFrame, WorldEvent } from './types';
import { SURFACE_Y } from './world';

/**
 * The shore, from the water's side: what happens to a body that ends up out of the sea.
 *
 * The beach is real terrain — the seabed climbs to a unit above the waterline over the last 48
 * units of `shoreDistance` — and until now a wall in `resolveStatic` kept every swimmer where the
 * water was still deep enough to swim. That wall stands. What changes is that it stands only for
 * a body *swimming* at it: a leap goes over it, because nothing in the air is pushed by water, and
 * an animal with legs and lungs (`amphibious`) walks up through it. So a body can get onto the
 * sand, and this module is what the sand does to it.
 *
 * Two numbers on the actor say where a body is in that. `wade` is 0..1 — how much of the depth it
 * needs to swim the water under it is short by, 0 afloat and 1 with the sand at the waterline —
 * and is continuous in position, which is what lets a walker's swim hand over to its walk without
 * a seam and the camera come up out of the water as the body does. `ashore` is the rule: past
 * `ASHORE_WADE` the body is out of the water for every purpose that has one, and stays pinned to
 * the sand rather than to the swim ceiling.
 *
 * What being ashore means depends on what the animal breathes.
 *
 * - **A water-breather is stranded.** It has `STRAND_BREATH` seconds, and one way of moving: the
 *   flop, a hop thrown down the beach at the sea, the only direction it can go. The stick or the
 *   dash asks for one and the body throws itself; nothing steers it. The gauge the HUD shows for
 *   it is that clock, and it is shown only here — under water a gill has nothing to count.
 * - **An air-breather walks.** No clock, and it can go where it likes along the shore at a walk
 *   (`LAND_WALK` of its cruise; `LAND_WALK_LEGS` for a body that actually has legs), but not far
 *   inland — `LAND_REACH` in world.ts is the wall on that side. A Triassic lung fills on the sand
 *   as it does at the surface, because it is at the surface.
 * - **An amphibious body does both ends smoothly.** Its speed ramps from swim to walk over the
 *   wade, so pushing onto the sand is a slowing rather than a stop, and sliding back in is the
 *   same ramp the other way; the renderer picks the walking clip over the swim at the same point
 *   the rule does.
 *
 * Everything here is deterministic: no clock but `dt`, no randomness at all. The AI never plans to
 * be here, so a brainless answer is enough for it (`ashoreInput`): head for the water.
 */

/** Seconds a water-breather lasts out of the water. A minute: long enough to flop back from a bad leap, short enough to be a mistake. */
export const STRAND_BREATH = 60;
/** The last of that minute, where the gauge flashes. */
export const STRAND_LOW = 15;
/** How far short of its swimming depth the water has to be before a body is out of it. */
export const ASHORE_WADE = 0.5;
/**
 * Where the water holds a swimmer: past this much of its swimming depth gone, a body that is
 * neither ashore nor a walker is eased back out to sea. This is the shore wall measured in the
 * body's own draught rather than in distance from the waterline (`SHORE_WALL`, which stands as
 * well): the beach is a different slope in every era and at some of them the fixed wall stands on
 * dry sand for a hatchling, which is exactly where a swimmer must never be by swimming.
 */
export const WALL_WADE = 0.3;
/** How fast the water takes back a body it is holding out of the shallows, units/s at the least. */
export const WALL_EASE = 3;
/** A flop: how long one takes, how far it throws the body (in body lengths, with a floor), and how high. */
export const FLOP_PERIOD = 0.8;
export const FLOP_HOP = 0.3;
export const FLOP_MIN = 0.6;
export const FLOP_RISE = 0.12;
/** How far the body twists on a flop, radians of bank at the top of the hop, and how far the nose comes up. */
export const FLOP_TWIST = 0.55;
export const FLOP_PITCH = 0.35;
/** How fast a stranded body turns to face the sea between and through its flops, rad/s. */
const FLOP_TURN = 1.4;
/** An air-breather's walk, as a fraction of its cruise, and a legged one's. */
export const LAND_WALK = 0.3;
export const LAND_WALK_LEGS = 0.55;

/** Lungs of any kind: an obligate air-breather, or a body with both. */
export const breathesAir = (id: Actor['creature']) => { const b = creature(id).breathing; return b === 'air' || b === 'bimodal'; };
/** Legs and lungs: walks up out of the water and back in. */
export const amphibious = (id: Actor['creature']) => !!creature(id).amphibious;

/**
 * The depth of water this body needs to swim with its back at the surface and nothing under it:
 * the swim ceiling's draught plus its floor clearance.
 */
export const swimDepth = (a: Actor) => SURFACE_Y - swimCeiling(a) + floorClearance(a);

/**
 * How far out of the water the sand under this body puts it, 0..1. `sand` is the seabed height at
 * its column — the sand, not a boulder top: a rock is something you sit on, not a shore.
 */
export function wadeAt(a: Actor, sand: number): number {
  const need = swimDepth(a);
  return clamp((need - (SURFACE_Y - sand)) / need, 0, 1);
}

/**
 * What the wade does to this body's cruise. A walker slows to its walk over the wade and a
 * stranded swimmer loses its swim altogether — it flops, and that is not a speed.
 */
export function landSpeed(a: Actor): number {
  if (a.wade <= 0) return 1;
  if (amphibious(a.creature)) return 1 + (LAND_WALK_LEGS - 1) * a.wade;
  if (!a.ashore) return 1;
  return breathesAir(a.creature) ? LAND_WALK : 0;
}

/** A brainless body ashore has one idea: the sea, which lies toward -z. */
export function ashoreInput(a: Actor, input: InputFrame): InputFrame {
  if (!a.ashore) return input;
  return { ...input, worldMove: { x: 0, y: 0, z: -1 }, mx: 0, my: 0, rise: false, sink: false, burst: 0, dash: !breathesAir(a.creature) && a.flopT <= 0 };
}

export interface BeachContext { events: WorldEvent[]; hitCtx: HitContext; }

/**
 * One step of the sand's rules for a body whose `wade` has already been measured this step.
 * `floor` is where the body sits on the ground here (sand or rock, plus its clearance). Returns
 * nothing; it pins the body, runs the clock, and throws the flop.
 */
export function stepBeach(ctx: BeachContext, a: Actor, input: InputFrame, dt: number, floor: number, controllable: boolean, mag: number) {
  // Whose wade counts: a walker's from the first step up the beach, and anything else's only once
  // it is ashore — which a swimmer can only become by *landing* there (game.ts sets it on the
  // frame a leap comes down). The water between is the shallows, and the shallows hold a swimmer
  // (`WALL_WADE`) rather than ruling it, so nothing strands itself by swimming, or by lunging.
  const wading = a.wade > 0 && !a.airborne && (a.ashore || amphibious(a.creature));
  if (!wading) {
    if (a.ashore) { a.ashore = false; if (a.controller === 'player') ctx.events.push({ kind: 'beach', pos: { ...a.pos }, actor: a.id, player: a.player, strength: 0 }); }
    a.strandT = 0; a.flopT = 0;
    return;
  }
  const ashore = a.wade >= ASHORE_WADE;
  if (ashore !== a.ashore) {
    a.ashore = ashore;
    if (a.controller === 'player') ctx.events.push({ kind: 'beach', pos: { ...a.pos }, actor: a.id, player: a.player, strength: ashore ? 1 : 0 });
  }
  // The sand is under the body and the water is not over it: it sits on the one, whatever the
  // swim ceiling says, and nothing about the column is a place it can be.
  a.pos.y = floor; a.vel.y = 0; a.hopVel = 0; a.climbTo = -Infinity;
  if (!ashore || breathesAir(a.creature)) { a.strandT = 0; a.flopT = 0; return; }

  // Stranded. The clock, and then the flop.
  if (isAlive(a)) {
    a.strandT += dt;
    if (a.strandT >= STRAND_BREATH) { a.strandT = STRAND_BREATH; kill(ctx.hitCtx, a); return; }
  } else return;
  const asked = controllable && (mag > 0.2 || input.dash);
  if (a.flopT <= 0 && asked) a.flopT = FLOP_PERIOD;
  if (a.flopT > 0) {
    const L = lengthOf(a);
    const step = Math.min(dt, a.flopT);
    a.flopT -= dt;
    const phase = 1 - Math.max(0, a.flopT) / FLOP_PERIOD;      // 0 at the throw, 1 at the landing
    const hop = Math.max(FLOP_MIN, FLOP_HOP * L);
    // A bell-shaped push seaward that integrates to one hop over the period, and an arc under it.
    a.pos.z -= hop * (step / FLOP_PERIOD) * (Math.PI / 2) * Math.sin(Math.PI * phase);
    a.pos.y = floor + FLOP_RISE * L * Math.sin(Math.PI * phase);
    a.bank = FLOP_TWIST * Math.sin(2 * Math.PI * phase);
    a.pitch = -FLOP_PITCH * Math.sin(Math.PI * phase);
    a.vel.x = 0; a.vel.z = 0;
  } else { a.bank = 0; a.pitch = 0; }
  // Each flop brings the body round to face the water, which is where every flop goes.
  a.yaw = wrapAngle(a.yaw + clamp(wrapAngle(Math.PI - a.yaw), -1, 1) * FLOP_TURN * dt);
}
