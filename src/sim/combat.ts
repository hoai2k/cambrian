import { clamp, dot, heading, norm, sub, type Vec3 } from '../shared/math';
import { creature, type MoveDef } from './creatures';
import { bandOf, isInvulnerable, lengthOf, massOf } from './actors';
import type { Actor, WorldEvent } from './types';

export interface HitContext {
  events: WorldEvent[];
  byId: (id: number) => Actor | undefined;
  time: number;
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
  if (victim.state === 'parry' && victim.brain && Math.random() > victim.brain.parrySkill) { victim.state = 'guard'; }
  if (victim.state === 'parry' || (victim.abilityActive && vdef.ability === 'bristleFlare' && move.damage < 15)) {
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
  if (victim.abilityActive && victim.state === 'ability' && (vdef.ability === 'adhesiveGlide' || vdef.ability === 'combCruise')) dmg *= vdef.ability === 'adhesiveGlide' ? .55 : .7;
  let result: HitResult = 'hit';

  const guarding = victim.state === 'guard' && vdef.canGuard;
  if (guarding && !(move.guardBreak && move.damage >= 20 && sf >= 0.8)) {
    dmg *= 0.45;
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
  victim.hitFlash = 0.42;
  victim.sinceHit = 0; victim.lastHitBy = attacker.id;
  // Courage: being bitten by something smaller than you is alarming. Enough of it and you run.
  if (victim.brain && lengthOf(attacker) < lengthOf(victim)) {
    victim.brain.courage -= dmg / (victim.hpMax * 0.08) + 0.05;
    if (victim.brain.courage <= 0 && victim.brain.goal !== 'flee') ctx.events.push({ kind: 'routed', pos: { ...victim.pos }, actor: victim.id, other: attacker.id, player: attacker.player });
  }
  victim.hitDir = { x: -dir.x, y: -dir.y, z: -dir.z };
  victim.hitStop = result === 'hit' ? 0.06 : 0.03;
  attacker.hitStop = 0.06;
  victim.seen = Math.max(victim.seen, 1);
  // Canadia reflect
  if (vdef.ability === 'bristleFlare' && !move.sweep) { attacker.hp -= dmg * 0.25 * sizeFactor(victim, attacker); attacker.hitFlash = 0.3; }
  ctx.events.push({ kind: 'hit', pos: { ...victim.pos }, actor: attacker.id, other: victim.id, strength: clamp(dmg / Math.max(20, victim.hpMax * 0.25), 0.2, 2), player: victim.player });

  // Grab
  if (move.grab && result === 'hit' && bandOf(attacker, victim) !== 'giant' && bandOf(attacker, victim) !== 'threat' && !anchored) {
    attacker.state = 'grabbing'; attacker.stateT = 0; attacker.stateDur = 1.6; attacker.grabbing = victim.id;
    victim.state = 'grabbed'; victim.stateT = 0; victim.grabbedBy = attacker.id; victim.grabT = 1.6;
    ctx.events.push({ kind: 'grab', pos: { ...victim.pos }, actor: attacker.id, other: victim.id, player: victim.player });
  }

  if (victim.hp <= 0) {
    // A clearly bigger predator swallows what it just killed; peers leave a corpse.
    if (lengthOf(attacker) >= lengthOf(victim) * 1.35 && attacker.state !== 'dead') startSwallow(ctx, attacker, victim);
    else kill(ctx, victim, attacker);
  }
  if (attacker.hp <= 0) kill(ctx, attacker, victim);
  return result;
}

/** The victim is taken into the predator's mouth and gulped down over ~1.5 s, then it is gone. */
export function startSwallow(ctx: HitContext, predator: Actor, victim: Actor) {
  victim.hp = 0;
  victim.state = 'swallowed'; victim.stateT = 0; victim.stateDur = 1.6;
  victim.swallowedBy = predator.id; victim.lockTarget = -1; victim.abilityActive = false; victim.vel = { x: 0, y: 0, z: 0 };
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
  victim.tumble = { x: (Math.random() - 0.5) * 2.2, y: (Math.random() - 0.5) * 1.2, z: (Math.random() - 0.5) * 2.2 };
  victim.lockTarget = -1; victim.abilityActive = false;
  if (victim.grabbing >= 0) { const g = ctx.byId(victim.grabbing); if (g && g.state === 'grabbed') { g.state = 'free'; g.grabbedBy = -1; } victim.grabbing = -1; }
  if (victim.grabbedBy >= 0) { const g = ctx.byId(victim.grabbedBy); if (g && g.state === 'grabbing') { g.state = 'free'; g.grabbing = -1; } victim.grabbedBy = -1; }
  if (killer) {
    killer.kills++;
    if (killer.lockTarget === victim.id) killer.lockTarget = -1;
  }
  ctx.events.push({ kind: 'kill', pos: { ...victim.pos }, actor: killer?.id ?? -1, other: victim.id, player: killer?.player, strength: victim.scale });
  ctx.events.push({ kind: 'death', pos: { ...victim.pos }, actor: victim.id, other: killer?.id, player: victim.player });
}
