import { clamp, heading, wrapAngle, yawOf } from '../shared/math';
import { floorClearance, isAlive, lengthOf, speedFactor, swimCeiling } from './actors';
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
/**
 * Where the wade *begins*, as a multiple of the body's own swimming depth.
 *
 * It used to begin exactly where the body stopped fitting, and that knife edge was a trap: the
 * floor clamp and the swim ceiling close on a body at exactly that depth, so an animal driving at
 * the beach was wedged between the two with `wade` still reading 0 — the beach rules had not
 * engaged, and `followFloor` was trading every unit of its travel for height it was not allowed to
 * keep. A full-grown Nothosaurus stalled sixteen units out at a hundredth of a unit a second and
 * never reached the sand at all. Starting the ramp well before the squeeze gives the walk somewhere
 * to take over, and gives a swimmer somewhere to be eased back out of (`WALL_WADE`), so neither
 * ever meets the wedge.
 */
export const WADE_START = 1.8;
/**
 * Where the wade becomes *ashore*, and it is not a taste: it is exactly the wade at which the
 * water stops being deep enough to swim in, so the sand's own pin takes over on the very step the
 * swim ceiling would otherwise have to. Set by hand it was a hair out, and the gap showed as a
 * drop — a body walking back down the beach stopped being ashore while still standing above the
 * waterline, and the ceiling clamp pulled it down to the water in one step, which the renderer is
 * entitled to read as a teleport (`tools/motion-test.ts`).
 */
export const ASHORE_WADE = 1 - 1 / WADE_START;
/**
 * Where the water holds a swimmer: past this much of its swimming depth gone, a body that is
 * neither ashore nor a walker is eased back out to sea. This is the shore wall measured in the
 * body's own draught rather than in distance from the waterline (`SHORE_WALL`, which stands as
 * well): the beach is a different slope in every era and at some of them the fixed wall stands on
 * dry sand for a hatchling, which is exactly where a swimmer must never be by swimming.
 *
 * It is written as the *depth* it means rather than as a number on the wade scale, because the
 * wade scale is `WADE_START`'s to set and the wall is not: seven tenths of what the body needs to
 * swim is the water it cannot be in, and pushing `WADE_START` out to 1.8 silently moved a bare
 * 0.3 from that depth to 1.26 times it — the water a body swims in perfectly well. The shore
 * animals found it first: a player holding still at the edge of the water, which is the whole of
 * what they hunt, was being quietly pushed back out to sea and so was never still.
 */
export const WALL_WADE = 1 - 0.7 / WADE_START;
/** How fast the water takes back a body it is holding out of the shallows, units/s at the least. */
export const WALL_EASE = 3;
/**
 * The hop on the sand, which the dash asks for and which is a different animal's move either way:
 * a water-breather's awkward flip toward the sea, and an air-breather's jump in the direction it
 * is facing. Both are the one timer (`flopT`) and the one bell-shaped arc; what differs is where
 * they go, how far, and what the body does in the air.
 *
 * The jump is what makes land worth walking on. A walk is `LAND_WALK_LEGS` of a cruise that was
 * already slow, so crossing any distance on the sand at a walk is a chore; a bound covers about a
 * body length a throw and can be held down, at a little stamina each, so an animal that means to
 * get somewhere on the beach bounds there.
 */
export const JUMP_PERIOD = 0.55;
/**
 * What a bound is worth, as a multiple of the ground the same body would have walked in the same
 * time. Measured against the *walk* rather than set in body lengths because that is the promise —
 * a jump is the fast way along a beach — and a length-based throw is not: a hatchling's walk is
 * quicker than a hatchling-sized bound, so the jump was a way of going slower for a small animal
 * and a twenty-unit-a-second bolt for a big one.
 */
export const JUMP_GAIN = 1.7;
export const JUMP_UP = 0.22;
/**
 * What a bound costs. Small on purpose: bounding *is* the land gait of a legged animal rather than
 * a sprint it can hold for a moment, so the price has to sit under what a body recovers while it
 * is doing it. At six a stride ran an animal out inside four seconds and dropped it back to the
 * walk, which is the opposite of the point.
 */
export const JUMP_STAMINA = 3;
/** A flop the dash threw goes this much further than one the stick merely asked for. */
export const FLOP_DASH_BOOST = 1.6;
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

/**
 * The ground this body covers in a second at the walk it is *actually* walking: its own cruise
 * through whatever the sand is currently taking off it. Reading the fully-ashore figure instead
 * left a bound slower than the walk at the water's edge, where a walker is only part slowed.
 */
export const walkPace = (a: Actor) => creature(a.creature).speed * speedFactor(a.scale) * landSpeed(a);
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
  const start = swimDepth(a) * WADE_START;
  return clamp((start - (SURFACE_Y - sand)) / start, 0, 1);
}

/**
 * This body is on the beach's own terms rather than the water's: far enough up the ramp for the
 * wade to have begun, and either already ashore or an animal that may walk there. What it buys is
 * that the swim-climb machinery stands down — a body walking up a slope is walking, not swimming
 * up a rock face, and `followFloor` would otherwise spend its travel on height.
 */
export const onFoot = (a: Actor) => a.wade > 0 && !a.airborne && (a.ashore || amphibious(a.creature));

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

/** A brainless body ashore has one idea: the sea, which lies toward -z — and it hops there, because the hop is what moves on sand. */
export function ashoreInput(a: Actor, input: InputFrame): InputFrame {
  if (!a.ashore) return input;
  return { ...input, worldMove: { x: 0, y: 0, z: -1 }, mx: 0, my: 0, rise: false, sink: false, burst: 0, dash: a.flopT <= 0 };
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
  if (!onFoot(a)) {
    if (a.ashore) { a.ashore = false; if (a.controller === 'player') ctx.events.push({ kind: 'beach', pos: { ...a.pos }, actor: a.id, player: a.player, strength: 0 }); }
    a.strandT = 0; a.flopT = 0;
    return;
  }
  const ashore = a.wade >= ASHORE_WADE;
  if (ashore !== a.ashore) {
    a.ashore = ashore;
    if (a.controller === 'player') ctx.events.push({ kind: 'beach', pos: { ...a.pos }, actor: a.id, player: a.player, strength: ashore ? 1 : 0 });
  }
  // Still wading in: the water is shallow enough to slow the body and to have taken the swim-climb
  // away from it, but not so shallow that it is out. The ordinary floor clamp carries it up the
  // ramp; the sand only takes over once it is properly ashore. A hop already thrown finishes
  // either way — it is committed at the throw like every other launch here, and cancelling it on
  // a step that grazed the line left a body bounding on the spot.
  if (!ashore && a.flopT <= 0) { a.strandT = 0; return; }
  // The sand is under the body and the water is not over it: it sits on the one, whatever the
  // swim ceiling says, and nothing about the column is a place it can be.
  a.pos.y = floor; a.vel.y = 0; a.hopVel = 0; a.climbTo = -Infinity;
  if (!isAlive(a)) return;

  const lungs = breathesAir(a.creature);
  // The clock, for a body that cannot breathe here. An air-breather has none.
  if (lungs) a.strandT = 0;
  else {
    a.strandT += dt;
    if (a.strandT >= STRAND_BREATH) { a.strandT = STRAND_BREATH; kill(ctx.hitCtx, a); return; }
  }

  // The hop. A dash asks for one outright; for a stranded body so does any push of the stick,
  // because a fish on the sand has no other way to move at all and should not have to find the
  // button. An air-breather can walk, so its jump is the dash and only the dash.
  const dashed = controllable && input.dash;
  const asked = dashed || (!lungs && controllable && mag > 0.2);
  if (a.flopT <= 0 && asked && (!lungs ? true : a.stamina >= JUMP_STAMINA)) {
    a.flopT = lungs ? JUMP_PERIOD : FLOP_PERIOD;
    if (lungs) {
      a.stamina = Math.max(0, a.stamina - JUMP_STAMINA);
      // Committed at the throw and not steered after it, like every other launch in the game. The
      // stick's own direction if it asked for one, else straight ahead.
      const d = a.drive, flat = Math.hypot(d.x, d.z);
      const h = heading(a.yaw);
      a.dodgeDir = flat > 1e-3 ? { x: d.x / flat, y: 0, z: d.z / flat } : { x: h.x, y: 0, z: h.z };
    }
    ctx.events.push({ kind: 'beach', pos: { ...a.pos }, actor: a.id, player: a.player, strength: lungs ? 0.6 : 0.4 });
  }
  if (a.flopT > 0) {
    const L = lengthOf(a);
    const period = lungs ? JUMP_PERIOD : FLOP_PERIOD;
    const step = Math.min(dt, a.flopT);
    a.flopT -= dt;
    const phase = 1 - Math.max(0, a.flopT) / period;           // 0 at the throw, 1 at the landing
    // A bell-shaped push that integrates to one hop over the period, and an arc under it. The two
    // differ in where they go and in what the body does on the way: a flip throws itself at the
    // sea and lands on its side, a jump goes where it was aimed and lands on its feet.
    const bell = (step / period) * (Math.PI / 2) * Math.sin(Math.PI * phase);
    if (lungs) {
      const reach = Math.max(FLOP_MIN, walkPace(a) * JUMP_PERIOD * JUMP_GAIN) * bell;
      a.pos.x += a.dodgeDir.x * reach; a.pos.z += a.dodgeDir.z * reach;
      a.pos.y = floor + JUMP_UP * L * Math.sin(Math.PI * phase);
      a.pitch = -0.35 * Math.sin(2 * Math.PI * phase);         // nose up off the ground, down into the landing
      a.yaw = yawOf(a.dodgeDir);
    } else {
      const reach = Math.max(FLOP_MIN, FLOP_HOP * L) * (dashed ? FLOP_DASH_BOOST : 1) * bell;
      a.pos.z -= reach;                                        // the sea, whatever the stick said
      a.pos.y = floor + FLOP_RISE * L * Math.sin(Math.PI * phase);
      a.bank = FLOP_TWIST * Math.sin(2 * Math.PI * phase);
      a.pitch = -FLOP_PITCH * Math.sin(Math.PI * phase);
    }
    a.vel.x = 0; a.vel.z = 0;
  } else if (!lungs) { a.bank = 0; a.pitch = 0; }
  // Each flop brings the body round to face the water, which is where every flop goes. A walker
  // keeps its own heading: it is going where it was pointed.
  if (!lungs) a.yaw = wrapAngle(a.yaw + clamp(wrapAngle(Math.PI - a.yaw), -1, 1) * FLOP_TURN * dt);
}
