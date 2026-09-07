import { dist, dot, heading, norm, scale, sub, yawOf } from '../../shared/math';
import { isAlive, isHidden, lengthOf } from '../actors';
import { applyHit } from '../combat';
import { BURROWERS, DEFENSIVE_SPECIALS, HEAVY_SPECIALS } from '../concealment';
import { creature, type CreatureId } from '../creatures';
import type { ExpansionContext } from '../expansion-abilities';
import type { Game } from '../game';
import type { Actor } from '../types';
import { groundHeight } from '../world';
import { devActor, type DevActor } from './state';
import { DEVONIAN_RULES } from './rules';

/**
 * The per-creature specials of docs/redesign/08 "Grasp, tusks, tridents, brushes". They ride the
 * shared ability machinery (heavy specials go through Game.startAbility / updateAbility, guard
 * specials through the guard state, Y through useAbility) and only the effects live here.
 *
 * Heavy specials: the heavy button starts a timed 'ability' state; `stepAbility` applies the hit
 * inside its window, once per target. Guard specials: `brushDisplay` bluffs while guarding, `enroll`
 * is the shared Cambrian enrolment. Y specials: a burst, a jet, a hover, a sweep; anything not
 * listed keeps the shared hide (camouflage, or the burrow for Gemuendina).
 */
const HEAVY = ['jawShear', 'runThrough', 'tuskLunge', 'crushBite', 'neckSnap', 'cheliceraeGrab', 'tridentShove', 'shieldPush', 'armourFlank'] as const;
const GUARD = ['brushDisplay'] as const;
const Y = ['shoalDart', 'shellJet', 'shellHover', 'limbHaul', 'floorSweep', 'filterGulp'] as const;

let installed = false;
/** Registers the Devonian ids with the shared special tables (idempotent; ids never collide). */
export function installDevonianSpecials() {
  if (installed) return; installed = true;
  for (const id of HEAVY) HEAVY_SPECIALS.add(id);
  for (const id of GUARD) DEFENSIVE_SPECIALS.add(id);
  BURROWERS.add('gemuendina');                   // sand ambush: the shared burrow with its emergence strike
}

/** The Y specials by name, for the HUD and the select card; undefined keeps the shared hide copy. */
export function ySpecial(id: CreatureId): { name: string; desc: string } | undefined {
  const def = creature(id);
  if (!(Y as readonly string[]).includes(def.ability)) return undefined;
  return { name: def.abilityName, desc: def.abilityDesc };
}

/** Camouflage is nearly free for the slow benthos; everyone else pays the shared drain. */
export function camoDrain(a: Actor): number {
  const ab = creature(a.creature).ability;
  return ab === 'armSpread' || ab === 'stiltWalk' ? 0.25 : 1;
}

/** Y pressed while free or guarding, not hidden. Returns true when a Devonian special took it. */
export function useAbility(g: Game, a: Actor, ctx: ExpansionContext): boolean {
  const def = creature(a.creature);
  if (!(Y as readonly string[]).includes(def.ability) || a.abilityCd > 0) return false;
  const L = lengthOf(a);
  const start = (dur: number) => { a.state = 'ability'; a.stateT = 0; a.stateDur = dur; a.abilityT = 0; a.abilityActive = true; a.hitDone.clear(); };
  switch (def.ability) {
    case 'shoalDart':                            // the everyman's cheap dash
      if (a.stamina < 6) return false;
      a.stamina -= 6; a.burstT = 1.4; a.abilityCd = def.abilityCooldown; break;
    case 'limbHaul':                             // a lunge of the limbs: strongest where the water is thin
      if (a.stamina < 8) return false;
      a.stamina -= 8; a.burstT = devActor(g, a).beached ? 2.2 : 1.5; a.abilityCd = def.abilityCooldown; break;
    case 'shellJet': {                           // the big jet: a backward blast with a moment of cover
      if (a.stamina < 10) return false;
      a.stamina -= 10; a.burstT = 1.8; a.iframes = 0.25; a.abilityCd = def.abilityCooldown;
      ctx.silt.push({ pos: { ...a.pos }, radius: L * 0.9, t: 2 });
      break;
    }
    case 'shellHover':                           // hang in the water: still, quiet, hard to notice
      start(def.abilityDuration ?? 2.5); a.abilityCd = def.abilityCooldown; a.vel.y = 0; a.seen = 0; break;
    case 'floorSweep':                           // sweep the sediment: standing from the floor
    case 'filterGulp':                           // gape and strain: standing from the water column
      start(def.abilityDuration ?? 2.5); a.abilityCd = def.abilityCooldown; break;
    default: return false;
  }
  g.events.push({ kind: 'ability', pos: { ...a.pos }, actor: a.id, player: a.player, strength: L });
  return true;
}

/** A heavy special just started (Game.startAbility). */
export function beginAbility(g: Game, a: Actor): void {
  const def = creature(a.creature);
  if (def.ability === 'runThrough' || def.ability === 'tuskLunge') a.dodgeDir = heading(a.yaw);
  if (def.ability === 'neckSnap' && a.lockTarget >= 0) {
    // the neck: the bite turns faster than the body can
    const t = g.byId(a.lockTarget);
    if (t && isAlive(t)) { a.yaw = yawOf(norm(sub(t.pos, a.pos))); a.prevT.yaw = a.yaw; }
  }
}

/** Every step of an 'ability' state (heavy specials and the timed Y specials). */
export function stepAbility(g: Game, a: Actor, ctx: ExpansionContext, dt: number): void {
  const def = creature(a.creature);
  const L = lengthOf(a), h = heading(a.yaw), t = a.stateT;
  const d = devActor(g, a);
  switch (def.ability) {
    case 'runThrough':                           // the fastest straight line in the sea
      if (t > 0.15 && t < 0.8) a.vel = scale(a.dodgeDir, def.speed * Math.pow(a.scale, 0.45) * 2.6);
      break;
    case 'tuskLunge':                            // long, committed
      if (t > 0.2 && t < 0.6) a.vel = scale(a.dodgeDir, def.speed * Math.pow(a.scale, 0.45) * 2.2);
      break;
    case 'shellHover':
      a.vel.x *= 0.9; a.vel.z *= 0.9; a.vel.y = 0; a.seen = Math.min(a.seen, 0.2);
      return;
    case 'floorSweep': {
      const floor = groundHeight(g.world, a.pos.x, a.pos.z, []);
      if (a.pos.y < floor + L * 0.8) DEVONIAN_RULES.onNutrition(g, a, 1.6 * dt, undefined);
      return;
    }
    case 'filterGulp':
      DEVONIAN_RULES.onNutrition(g, a, 1.2 * dt, undefined);
      for (const o of ctx.nearby(a.pos, L * 2)) {
        if (o.id === a.id || !isAlive(o) || o.controller !== 'swarm') continue;
        const direction = norm(sub(o.pos, a.pos));
        if (dot(direction, h) > 0.45) { const pull = 12 * dt; o.vel.x -= direction.x * pull; o.vel.y -= direction.y * pull; o.vel.z -= direction.z * pull; }
      }
      return;
  }
  if (!(HEAVY as readonly string[]).includes(def.ability)) return;
  for (const o of ctx.nearby(a.pos, L * 1.6)) {
    if (o.id === a.id || !isAlive(o) || isHidden(o) || ctx.allies(a, o) || a.hitDone.has(o.id)) continue;
    const dd = dist(a.pos, o.pos), direction = norm(sub(o.pos, a.pos)), forward = dot(direction, h);
    let damage = 0, poise = 0, kb = 0, grab = false, armorPierce = 0, guardBreak = false, shellCrush = false;
    switch (def.ability) {
      case 'jawShear':      if (t >= 0.35 && t <= 0.6 && forward > 0.5 && dd < L * 0.95) { damage = 40; poise = 70; armorPierce = 1; guardBreak = true; } break;
      case 'runThrough':    if (t >= 0.2 && t <= 0.8 && forward > 0.3 && dd < L * 0.9) { damage = 22; poise = 30; kb = 4; } break;
      case 'tuskLunge':     if (t >= 0.3 && t <= 0.7 && forward > 0.5 && dd < L * 1.1) { damage = 26; poise = 55; guardBreak = true; armorPierce = 0.5; } break;
      case 'crushBite': {
        if (t >= 0.3 && t <= 0.55 && forward > 0.5 && dd < L * 0.9) {
          const shell = !!creature(o.creature).shell;
          damage = shell ? 40 : 20; poise = shell ? 80 : 45; shellCrush = shell;
        }
        break;
      }
      case 'neckSnap':      if (t >= 0.15 && t <= 0.4 && forward > 0.3 && dd < L * 1.0) { damage = 24; poise = 40; } break;
      case 'cheliceraeGrab':if (t >= 0.3 && t <= 0.6 && forward > 0.5 && dd < L * 1.4) { damage = 14; poise = 30; grab = true; } break;
      case 'tridentShove':  if (t >= 0.2 && t <= 0.5 && forward > 0.4 && dd < L * 1.2) { damage = 5; poise = 55; kb = 10; } break;
      case 'shieldPush':    if (t >= 0.2 && t <= 0.5 && forward > 0.4 && dd < L * 1.1) { damage = 8; poise = 45; kb = 8; } break;
      case 'armourFlank': {
        if (t >= 0.25 && t <= 0.5 && forward > 0.4 && dd < L * 1.0) {
          // the small arthrodire's bite is meant for the soft half of a rival: from behind or the side
          const behind = dot(heading(o.yaw), direction) > 0.3;
          damage = behind ? 26 : 16; poise = 40;
        }
        break;
      }
    }
    if (damage <= 0) continue;
    a.hitDone.add(o.id);
    const result = applyHit(ctx.hit, a, o, { ...def.light, damage, poise, knockback: kb, grab, armorPierce, guardBreak }, 0);
    if (result === 'hit' && shellCrush) g.events.push({ kind: 'shellCrush', pos: { ...o.pos }, actor: a.id, other: o.id, player: a.player });
    if (result === 'hit' && grab && isAlive(o) && def.ground) o.vel.y -= 3;   // dragged toward the floor
    if (a.state !== 'ability') { a.abilityActive = false; break; }
  }
  void d;
}

/**
 * Stethacanthus' brush: held guard near a rival is a display. An AI rival hunting or fighting it
 * backs off, once per encounter (the bluff wears thin), and hunters lose a little of the scent.
 */
export function stepGuardSpecial(g: Game, a: Actor, d: DevActor, dt: number): void {
  const def = creature(a.creature);
  if (def.ability !== 'brushDisplay') return;
  for (const [id, t] of d.bluffed) {
    if (t + 20 < g.time) { d.bluffed.delete(id); continue; }
    // the bluff holds for six seconds even on a bot, which the shared brain never lets rout
    const o = g.byId(id);
    if (o && o.brain && isAlive(o) && t + 6 > g.time) { o.brain.goal = 'flee'; o.brain.target = a.id; }
  }
  if (a.state !== 'guard' || !isAlive(a)) return;
  a.seen = Math.max(0, a.seen - 0.6 * dt);
  const L = lengthOf(a);
  for (const o of g.nearby(a.pos, L * 4)) {
    if (o.id === a.id || !o.brain || !isAlive(o) || d.bluffed.has(o.id)) continue;
    if (o.brain.target !== a.id || (o.brain.goal !== 'hunt' && o.brain.goal !== 'fight' && o.brain.goal !== 'notice')) continue;
    d.bluffed.set(o.id, g.time);
    // the shared rout: no courage left and a remembered attacker sends an animal running
    o.brain.courage = 0; o.lastHitBy = a.id; o.brain.detection.delete(a.id);
    o.brain.goal = 'flee'; o.brain.target = a.id; o.brain.goalT = 0;
    const away = norm(sub(o.pos, a.pos));
    o.vel.x += away.x * 4; o.vel.z += away.z * 4;
    g.events.push({ kind: 'routed', pos: { ...o.pos }, actor: o.id, other: a.id, player: a.player });
  }
}
