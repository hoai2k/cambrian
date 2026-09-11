import { stopHiding } from './concealment';
import { clamp, dot, heading, norm, sub, type Vec3 } from '../shared/math';
import { creature, type MoveDef } from './creatures';
import { bandOf, bodyRadius, isInvulnerable, lengthOf, massOf } from './actors';
import type { Actor, WorldEvent } from './types';

export interface HitContext {
  events: WorldEvent[];
  byId: (id: number) => Actor | undefined;
  time: number;
  /** The game's seeded RNG. Combat must not use Math.random, or a seed stops reproducing a match. */
  rng: () => number;
  /** An era's damage multiplier for armour plates, enrolment or a withdrawn shell (1 = none). */
  armour?: (attacker: Actor, victim: Actor, dir: Vec3) => number;
}

/** Damage multiplier from relative size. Same size = 1. */
/**
 * Same size = 1. A predator twice your length hits about twice as hard (three good bites kill),
 * and you still chip it: nothing you can reach is immune, which is what makes a giant fightable.
 */
export const sizeFactor = (attacker: Actor, victim: Actor) =>
  clamp(Math.pow(lengthOf(attacker) / lengthOf(victim), 1.15), 0.45, 2.3);

export type HitResult = 'hit' | 'blocked' | 'parried' | 'immune' | 'countered';

export function applyHit(ctx: HitContext, attacker: Actor, victim: Actor, move: MoveDef, momentum: number): HitResult {
  if (victim.state === 'dead') return 'immune';
  const vdef = creature(victim.creature), adef = creature(attacker.creature);
  const toVictim = norm(sub(victim.pos, attacker.pos));
  const dir: Vec3 = { x: toVictim.x, y: toVictim.y, z: toVictim.z };

  // Parry window: victim wins the exchange. AI parries only as often as its skill allows; otherwise the tap is a plain guard.
  if (victim.state === 'parry' && victim.brain && ctx.rng() > victim.brain.parrySkill) { victim.state = 'guard'; }
  if (victim.state === 'parry') {
    if (!(victim.abilityActive && vdef.ability === 'enroll')) {
      attacker.state = 'stagger'; attacker.stateT = 0; attacker.stateDur = 0.8;
      attacker.poise = attacker.poiseMax * 0.5;
      attacker.hitStop = 0.08; victim.hitStop = 0.08;
      victim.state = 'free'; victim.stateT = 0;
      victim.stamina = Math.min(victim.staminaMax, victim.stamina + 15);
      ctx.events.push({ kind: 'parry', pos: { ...victim.pos }, actor: victim.id, other: attacker.id, player: victim.player });
      if (victim.abilityActive && vdef.ability === 'anchor') {
        // Anchor: counter damage
        attacker.hp -= 8 * sizeFactor(victim, attacker); attacker.hitFlash = 0.4;
      }
      return 'parried';
    }
  }
  if (isInvulnerable(victim)) {
    if (victim.abilityActive && (vdef.ability === 'enroll' || vdef.ability === 'shellUp')) {
      // Bounce off the shell: small chip to attacker's stamina, and enrolled trilobites stagger rivals they roll into
      attacker.stamina = Math.max(0, attacker.stamina - 6);
      attacker.vel.x -= dir.x * 3; attacker.vel.z -= dir.z * 3;
      victim.hitFlash = 0.15;
    }
    return 'immune';
  }

  // Directional bonus
  const vHead = heading(victim.yaw);
  const facing = dot(vHead, dir); // >0 hit from behind (dir points from attacker to victim along victim heading)
  let dirBonus = 1;
  const fromAbove = attacker.pos.y > victim.pos.y + lengthOf(victim) * 0.35;
  if (vdef.ability === 'anchor' || vdef.id === 'wiwaxia') {
    if (fromAbove) { dirBonus = 0.6; attacker.hp -= move.damage * 0.5 * sizeFactor(victim, attacker) * 0.5; attacker.hitFlash = 0.3; }
  } else if (facing > 0.45 && vdef.id !== 'opabinia') dirBonus = 1.4;

  const sf = sizeFactor(attacker, victim);
  const base = move.damage * (1 + 0.35 * momentum) * dirBonus * sf;
  let dmg = base * (1 - vdef.defense * (1 - clamp(move.armorPierce ?? 0, 0, 1)));
  if (ctx.armour) {
    const k = ctx.armour(attacker, victim, dir);
    dmg *= k;
    if (k < 0.6) ctx.events.push({ kind: 'parry', pos: { ...victim.pos }, actor: victim.id, other: attacker.id, strength: k < 0.35 ? 0.4 : 0.7, player: victim.player });
  }
  if (victim.abilityActive && (victim.state === 'guard' || victim.state === 'parry') && (vdef.ability === 'adhesiveGlide' || vdef.ability === 'combCruise')) dmg *= vdef.ability === 'adhesiveGlide' ? .55 : .7;
  let result: HitResult = 'hit';

  const guarding = victim.state === 'guard' && vdef.canGuard;
  if (guarding && !(move.guardBreak && move.damage >= 20 && sf >= 0.8)) {
    dmg *= vdef.ability === 'shellUp' || vdef.ability === 'enroll' ? .25 : .45;
    const cost = 10 * sf * (vdef.id === 'olenoides' ? 0.6 : 1) * (victim.abilityActive && vdef.ability === 'anchor' ? 0 : 1);
    victim.stamina -= cost;
    result = 'blocked';
    if (victim.stamina <= 0) {
      victim.stamina = 0; victim.state = 'stagger'; victim.stateT = 0; victim.stateDur = 1.2;
      ctx.events.push({ kind: 'guardBreak', pos: { ...victim.pos }, actor: victim.id, other: attacker.id, player: victim.player });
      result = 'hit';
    }
  } else if (guarding) {
    victim.state = 'stagger'; victim.stateT = 0; victim.stateDur = 1.2;
    ctx.events.push({ kind: 'guardBreak', pos: { ...victim.pos }, actor: victim.id, other: attacker.id, player: victim.player });
  }

  // Poise / stagger
  const anchored = victim.abilityActive && (vdef.ability === 'anchor' || vdef.ability === 'adhesiveGlide');
  if (result === 'hit') {
    victim.poise -= move.poise * sf;
    if (victim.poise <= 0 && victim.state !== 'stagger' && !anchored) {
      victim.poise = victim.poiseMax;
      victim.state = 'stagger'; victim.stateT = 0; victim.stateDur = 1.2;
      if (victim.state === 'stagger') ctx.events.push({ kind: 'stagger', pos: { ...victim.pos }, actor: victim.id, other: attacker.id, player: victim.player });
    } else if (victim.state === 'attack' && sf > 0.9 && move.damage >= 20) {
      // Heavies interrupt lights
      victim.state = 'free'; victim.stateT = 0;
    }
    if (victim.state === 'eating') { victim.state = 'free'; victim.eatingTarget = -1; }
  }

  // Knockback (mass-weighted)
  if (!anchored) {
    const kb = move.knockback * sf * (result === 'blocked' ? 0.3 : 1) / Math.max(0.5, Math.pow(massOf(victim) / massOf(attacker), 0.33));
    victim.vel.x += dir.x * kb; victim.vel.y += dir.y * kb * 0.5; victim.vel.z += dir.z * kb;
  }

  victim.hp -= dmg;
  if (dmg > 0 && victim.hideMode !== 'none') { stopHiding(victim); victim.seen = 2; }
  victim.hitFlash = 0.42;
  victim.sinceHit = 0; victim.lastHitBy = attacker.id;
  // Courage: being bitten by something smaller than you is alarming. Enough of it and you run.
  //
  // How alarming depends on how big the thing biting you is. The cost used to be the fraction of
  // health lost and nothing else, so a hatchling could rout a fish seven times its length in three
  // bites — and a routed animal never answers back, so the whole sea read as indifferent to being
  // attacked. Scaled by the attacker's share of your body length and normalised at a third, so the
  // case the rule was written for — a player routing a giant several times its length — is unchanged.
  if (victim.brain && lengthOf(attacker) < lengthOf(victim)) {
    const menace = clamp(lengthOf(attacker) / lengthOf(victim) / 0.3, 0.15, 1);
    victim.brain.courage = Math.max(-1, victim.brain.courage - (dmg / (victim.hpMax * 0.08) + 0.05) * menace);
    if (victim.brain.courage <= 0 && victim.brain.goal !== 'flee') ctx.events.push({ kind: 'routed', pos: { ...victim.pos }, actor: victim.id, other: attacker.id, player: attacker.player });
  }
  victim.hitDir = { x: -dir.x, y: -dir.y, z: -dir.z };
  victim.hitStop = result === 'hit' ? 0.06 : 0.03;
  attacker.hitStop = 0.06;
  victim.seen = Math.max(victim.seen, 1);
  // Canadia reflect
  if (vdef.ability === 'bristleFlare' && !move.sweep) { attacker.hp -= dmg * 0.25 * sizeFactor(victim, attacker); attacker.hitFlash = 0.3; }
  ctx.events.push({ kind: 'hit', pos: { ...victim.pos }, actor: attacker.id, other: victim.id, strength: clamp(dmg / Math.max(20, victim.hpMax * 0.25), 0.2, 2), player: victim.player });

  // Grab. A move can grab by itself (Anomalocaris' Grasp), and a grasping animal grabs with
  // whatever it lands while it holds the button down — that is what `graspHold` is.
  if (result === 'hit' && !anchored && (move.grab || (attacker.graspHold && adef.grasp))) {
    const band = bandOf(attacker, victim);
    if (band === 'threat' || band === 'giant') takeRide(ctx, attacker, victim);
    else takeHold(ctx, attacker, victim);
  }

  if (victim.hp <= 0) {
    // A clearly bigger predator swallows what it just killed; peers leave a corpse.
    if (lengthOf(attacker) >= lengthOf(victim) * 1.35 && attacker.state !== 'dead') startSwallow(ctx, attacker, victim);
    else kill(ctx, victim, attacker);
  }
  if (attacker.hp <= 0) kill(ctx, attacker, victim);
  return result;
}

/**
 * Close a grip on something small enough to hold, and remember where on it the grip landed.
 *
 * The hold point is a unit direction in the victim's own frame, so it turns with the victim and the
 * pair stay joined however either of them moves. Held prey used to be parked at a fixed distance off
 * the grabber's nose, scaled by the *grabber's* length: a big mouthful ended up half inside its
 * captor and a small one hung in the water in front of it, joined to nothing.
 */
export function takeHold(ctx: HitContext, attacker: Actor, victim: Actor): boolean {
  if (victim.state === 'grabbed' || attacker.grabbing >= 0 || victim.rideHost >= 0 || victim.riddenBy >= 0) return false;
  attacker.state = 'grabbing'; attacker.stateT = 0; attacker.stateDur = 1.6; attacker.grabbing = victim.id;
  victim.state = 'grabbed'; victim.stateT = 0; victim.grabbedBy = attacker.id; victim.grabT = 1.6;
  // Which way the grabber lies from the victim, in the victim's own frame: that is the side the
  // grip has, and the side that has to stay against the grabber's mouth.
  const vh = heading(victim.yaw);
  const d = sub(attacker.pos, victim.pos);
  const dl = Math.hypot(d.x, d.y, d.z);
  if (dl > 1e-6) {
    const right: Vec3 = { x: -vh.z, y: 0, z: vh.x };
    victim.grabOff = { x: dot(d, right) / dl, y: d.y / dl, z: dot(d, vh) / dl };
  } else victim.grabOff = { x: 0, y: 0, z: 1 };
  ctx.events.push({ kind: 'grab', pos: { ...victim.pos }, actor: attacker.id, other: victim.id, player: victim.player });
  return true;
}

/**
 * How far round the head is out of bounds for a grip: past this, dead ahead of the host, is the end
 * that bites, and nothing gets a hold there.
 */
const MOUTH_CONE = 0.55;
/** How long a rider may hang on, and what the grip costs it per second. */
export const RIDE_MAX = 9, RIDE_STAMINA = 4;

/**
 * Take hold of something bigger than you and ride it.
 *
 * Anything over the `rival` band cannot be held in the mouth — it is not a mouthful — but it can be
 * held *on to*, anywhere except the business end of its head: come at the face and there is nothing
 * to grab but jaws. The grip records where it took hold in the host's own frame, so it follows the
 * host around as it turns, and the rider keeps its own state machine, which is how it can bite the
 * thing it is clinging to. Riding does no damage by itself; that is the whole point of it.
 */
export function takeRide(ctx: HitContext, rider: Actor, host: Actor): boolean {
  // Only the animals somebody is steering hold on. The reef's own predators have no use for it —
  // a wild Anomalocaris clinging to a giant for nine seconds is a bug, not behaviour.
  if (rider.controller !== 'player' && rider.controller !== 'bot') return false;
  if (rider.rideHost >= 0 || host.riddenBy >= 0 || rider.riddenBy >= 0 || host.rideHost >= 0) return false;
  if (host.state === 'dead' || host.state === 'grabbed' || rider.state === 'grabbed') return false;
  const h = heading(host.yaw);
  const hl = lengthOf(host), hr = bodyRadius(host);
  // The head end is out of bounds, and the head end is the nose — not a cone opened from the
  // middle of the animal. On a body twenty units long that cone swallowed the whole forward flank,
  // so a rider alongside the shoulder of a giant was told it was trying to grab the jaws.
  const half = Math.max(0, hl * 0.5 - hr);
  const nose = { x: host.pos.x + h.x * half, y: host.pos.y, z: host.pos.z + h.z * half };
  if (dot(norm(sub(rider.pos, nose)), h) > MOUTH_CONE) return false;
  const right: Vec3 = { x: -h.z, y: 0, z: h.x };
  const d = sub(rider.pos, host.pos);
  // Sideways and up, the hold has to be somewhere on the host, so it is bounded by how wide the
  // host actually is. Half a body length either way let the grip sit out in open water off the
  // flank of anything long, which is what made a ride read as floating alongside rather than
  // clinging on. Along the body it may be anywhere behind the jaws.
  const flank = bodyRadius(host) / hl;
  rider.rideHost = host.id; rider.rideT = 0;
  rider.rideOff = {
    x: clamp(dot(d, right) / hl, -flank, flank),
    y: clamp((rider.pos.y - host.pos.y) / hl, -flank, flank),
    z: clamp(dot(d, h) / hl, -0.55, MOUTH_CONE * 0.5),
  };
  host.riddenBy = rider.id;
  if (rider.state === 'attack' || rider.state === 'pounce') { rider.state = 'free'; rider.stateT = 0; }
  ctx.events.push({ kind: 'grab', pos: { ...rider.pos }, actor: rider.id, other: host.id, player: rider.player });
  return true;
}

/**
 * Where a rider's grip sits on its host, in world space. The one definition of it: the simulation
 * puts the rider's body against this point, and the renderer puts the rider's own grasp socket on
 * it, so what is drawn is the animal actually holding on there rather than floating near it.
 */
export function rideHold(rider: Actor, host: Actor): Vec3 {
  const hl = lengthOf(host), h = heading(host.yaw), o = rider.rideOff;
  return {
    x: host.pos.x + -h.z * o.x * hl + h.x * o.z * hl,
    y: host.pos.y + o.y * hl,
    z: host.pos.z + h.x * o.x * hl + h.z * o.z * hl,
  };
}

/** Let go, from either side. `shaken` staggers the rider: it did not choose to come off. */
export function endRide(rider: Actor, host: Actor | undefined, shaken = false) {
  if (host && host.riddenBy === rider.id) host.riddenBy = -1;
  rider.rideHost = -1; rider.rideT = 0;
  if (shaken && rider.state !== 'dead') { rider.state = 'stagger'; rider.stateT = 0; rider.stateDur = 0.5; rider.iframes = Math.max(rider.iframes, 0.2); }
}

/** The victim is taken into the predator's mouth and gulped down over ~1.5 s, then it is gone. */
export function startSwallow(ctx: HitContext, predator: Actor, victim: Actor) {
  victim.hp = 0;
  victim.state = 'swallowed'; victim.stateT = 0; victim.stateDur = 1.6;
  stopHiding(victim); victim.swallowedBy = predator.id; victim.lockTarget = -1; victim.abilityActive = false; victim.vel = { x: 0, y: 0, z: 0 };
  if (victim.grabbedBy >= 0) { const g = ctx.byId(victim.grabbedBy); if (g && g.grabbing === victim.id) { g.state = 'free'; g.grabbing = -1; } victim.grabbedBy = -1; }
  predator.holdT = 1.4;
  if (predator.state === 'attack' || predator.state === 'pounce') { predator.state = 'free'; predator.stateT = 0; }
  ctx.events.push({ kind: 'swallow', pos: { ...victim.pos }, actor: predator.id, other: victim.id, player: victim.player, strength: lengthOf(victim) / lengthOf(predator) });
}

export function kill(ctx: HitContext, victim: Actor, killer?: Actor) {
  if (victim.state === 'dead') return;
  victim.hp = 0;
  victim.state = 'dead'; victim.stateT = 0; victim.corpseT = 0; victim.eaten = 0;
  victim.killer = killer?.id ?? -1;
  victim.deathY = victim.pos.y; victim.sparkled = false;
  // a little random spin so the body tumbles as it goes limp
  victim.tumble = { x: (ctx.rng() - 0.5) * 2.2, y: (ctx.rng() - 0.5) * 1.2, z: (ctx.rng() - 0.5) * 2.2 };
  stopHiding(victim); victim.lockTarget = -1; victim.abilityActive = false;
  if (victim.grabbing >= 0) { const g = ctx.byId(victim.grabbing); if (g && g.state === 'grabbed') { g.state = 'free'; g.grabbedBy = -1; } victim.grabbing = -1; }
  if (victim.grabbedBy >= 0) { const g = ctx.byId(victim.grabbedBy); if (g && g.state === 'grabbing') { g.state = 'free'; g.grabbing = -1; } victim.grabbedBy = -1; }
  // A ride ends with whichever of the two died: the rider is thrown clear, the host loses its passenger.
  if (victim.rideHost >= 0) endRide(victim, ctx.byId(victim.rideHost));
  if (victim.riddenBy >= 0) { const r = ctx.byId(victim.riddenBy); if (r) endRide(r, victim, true); else victim.riddenBy = -1; }
  if (killer) {
    killer.kills++;
    if (killer.lockTarget === victim.id) killer.lockTarget = -1;
  }
  ctx.events.push({ kind: 'kill', pos: { ...victim.pos }, actor: killer?.id ?? -1, other: victim.id, player: killer?.player, strength: victim.scale });
  ctx.events.push({ kind: 'death', pos: { ...victim.pos }, actor: victim.id, other: killer?.id, player: victim.player });
}
