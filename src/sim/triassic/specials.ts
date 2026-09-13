import { dist, dot, heading, norm, sub } from '../../shared/math';
import { isAlive, isHidden, lengthOf, bandOf } from '../actors';
import { applyHit } from '../combat';
import { DEFENSIVE_SPECIALS, HEAVY_SPECIALS } from '../concealment';
import { creature, type CreatureId } from '../creatures';
import { HEAVY_STRIKE, specialHit, type ExpansionContext, type HeavyStrike } from '../expansion-abilities';
import type { Game } from '../game';
import type { Actor } from '../types';
import { biomeAt, groundHeight } from '../world';
import { DEVONIAN_RULES } from '../devonian/rules';
import { installDevonianSpecials, stepAbility as devStepAbility, useAbility as devUseAbility, ySpecial as devYSpecial } from '../devonian/specials';
import { triActor } from './state';

/**
 * The Triassic's own specials (docs/triassic/01-triassic-design.md · New effects). They ride the
 * shared ability machinery exactly as the Devonian's do, and anything a kit asked for by a
 * Devonian or Cambrian id — crush bite, run-through, shoal dart, filter gulp, shell hover, the
 * hook latch, snatch, the spine brace, ambush surge — is handed to that era's routine by id, since
 * the tables are global and the ids never collide.
 */
const HEAVY = ['exhaustionHold', 'fangTrap', 'neckStrike', 'whorlSaw', 'sideSwipe'] as const;
const GUARD = ['bellyTurn'] as const;
const Y = ['podCall', 'powerStroke', 'scrapeSieve', 'coil', 'comb', 'suctionSnap', 'ink'] as const;

const STRIKES: Record<string, HeavyStrike> = {
  exhaustionHold: { reach: 0.95, lunge: 1.4 }, fangTrap: { reach: 1.0, lunge: 1.3 },
  neckStrike: { reach: 2.0, lunge: 0.6, snap: true }, whorlSaw: { reach: 1.0, lunge: 1.2 }, sideSwipe: { reach: 1.1, lunge: 0.3 },
};

let installed = false;
/** Registers the Triassic ids with the shared special tables, and the Devonian's beside them. */
export function installTriassicSpecials() {
  installDevonianSpecials();
  if (installed) return; installed = true;
  for (const id of HEAVY) HEAVY_SPECIALS.add(id);
  for (const [id, strike] of Object.entries(STRIKES)) HEAVY_STRIKE[id] = strike;
  for (const id of GUARD) DEFENSIVE_SPECIALS.add(id);
}

const isTriY = (id: string) => (Y as readonly string[]).includes(id);
const isTriHeavy = (id: string) => (HEAVY as readonly string[]).includes(id);

export function ySpecial(id: CreatureId): { name: string; desc: string } | undefined {
  const def = creature(id);
  if (isTriY(def.ability)) return { name: def.abilityName, desc: def.abilityDesc };
  return devYSpecial(id);
}

/** Camouflage is the shared drain; nothing here hides for less. */
export function camoDrain(): number { return 1; }

/** Where the floor feeds: the algal meadows and the reef's biofilm for the grazer, the mats of the flats for the comb. */
const MEADOW = new Set(['shelf', 'boulders', 'forest']);
const MATS = new Set(['shallows', 'nursery']);

export function useAbility(g: Game, a: Actor, ctx: ExpansionContext): boolean {
  const def = creature(a.creature);
  if (!isTriY(def.ability)) return devUseAbility(g, a, ctx);
  if (a.abilityCd > 0) return false;
  const L = lengthOf(a), t = triActor(g, a);
  const start = (dur: number) => { a.state = 'ability'; a.stateT = 0; a.stateDur = dur; a.abilityT = 0; a.abilityActive = true; a.hitDone.clear(); };
  switch (def.ability) {
    case 'podCall':                                 // the pod converges and takes the calf's hits
      if (!t.pod.length) return false;
      t.podShield = 8; a.abilityCd = def.abilityCooldown;
      for (const id of t.pod) { const m = g.byId(id); if (m?.brain) { m.brain.home = { ...a.pos }; m.brain.goal = 'wander'; m.brain.wanderTo = { ...a.pos }; } }
      break;
    case 'powerStroke':                             // four flippers at once: a long shoulders-first dash
      if (a.stamina < 10) return false;
      a.stamina -= 10; a.burstT = 1.6; t.strokeT = 0.9; a.abilityCd = def.abilityCooldown;
      { const h = heading(a.yaw); const v = def.speed * 2.2; a.vel.x += h.x * v; a.vel.z += h.z * v; }
      break;
    case 'coil':                                    // the head goes where the tail was
      if (a.stamina < 5) return false;
      a.stamina -= 5; a.yaw += Math.PI; a.prevT.yaw = a.yaw; a.vel.x *= -0.4; a.vel.z *= -0.4; a.abilityCd = def.abilityCooldown; break;
    case 'scrapeSieve':                             // graze the meadow
    case 'comb':                                    // strain the mats
      start(def.abilityDuration ?? 2.5); a.abilityCd = def.abilityCooldown; break;
    case 'suctionSnap': {                           // pull a snack in and bite it
      if (a.stamina < 6) return false;
      let best: Actor | undefined, bestD = Infinity;
      for (const o of ctx.nearby(a.pos, L * 0.6)) {
        if (o.id === a.id || !isAlive(o) || bandOf(a, o) !== 'snack') continue;
        const d = dist(a.pos, o.pos); if (d < bestD) { bestD = d; best = o; }
      }
      if (!best) return false;
      a.stamina -= 6; a.abilityCd = def.abilityCooldown;
      const pull = norm(sub(a.pos, best.pos)); best.pos.x += pull.x * bestD * 0.7; best.pos.y += pull.y * bestD * 0.7; best.pos.z += pull.z * bestD * 0.7;
      applyHit(ctx.hit, a, best, { ...def.light, name: 'Suction snap', damage: def.light.damage * 1.5, lunge: 0 }, 0);
      break;
    }
    case 'ink': {                                   // a cloud that breaks every lock inside it
      if (a.stamina < a.staminaMax * 0.25) return false;
      a.stamina -= a.staminaMax * 0.25; a.abilityCd = def.abilityCooldown; a.seen = 0; a.iframes = 0.2;
      ctx.silt.push({ pos: { ...a.pos }, radius: L * 2, t: 6 });
      for (const o of ctx.nearby(a.pos, L * 2.5)) {
        if (o.id === a.id) continue;
        if (o.lockTarget === a.id) o.lockTarget = -1;
        o.brain?.detection.delete(a.id);
        if (o.brain && o.brain.target === a.id && (o.brain.goal === 'hunt' || o.brain.goal === 'notice')) { o.brain.goal = 'search'; o.brain.lastSeen = { ...a.pos }; }
      }
      // a jet away from where it was
      { const h = heading(a.yaw); a.vel.x -= h.x * def.speed * 1.6; a.vel.z -= h.z * def.speed * 1.6; a.burstT = 0.8; }
      break;
    }
    default: return false;
  }
  g.events.push({ kind: 'ability', pos: { ...a.pos }, actor: a.id, player: a.player, strength: L });
  return true;
}

export function stepAbility(g: Game, a: Actor, ctx: ExpansionContext, dt: number): void {
  const def = creature(a.creature);
  if (!isTriY(def.ability) && !isTriHeavy(def.ability)) { devStepAbility(g, a, ctx, dt); return; }
  const L = lengthOf(a), h = heading(a.yaw), t = a.stateT;
  switch (def.ability) {
    case 'scrapeSieve': {
      const floor = groundHeight(g.world, a.pos.x, a.pos.z, []);
      if (a.pos.y < floor + L * 0.8 && MEADOW.has(biomeAt(a.pos.x, a.pos.z))) DEVONIAN_RULES.onNutrition(g, a, 1.5 * dt, undefined);
      a.vel.x *= 0.95; a.vel.z *= 0.95;
      return;
    }
    case 'comb': {
      const floor = groundHeight(g.world, a.pos.x, a.pos.z, []);
      const b = biomeAt(a.pos.x, a.pos.z);
      if (a.pos.y < floor + L * 0.8) DEVONIAN_RULES.onNutrition(g, a, (MATS.has(b) ? 1.4 : MEADOW.has(b) ? 0.7 : 0) * dt, undefined);
      return;
    }
  }
  if (!isTriHeavy(def.ability)) return;
  for (const o of ctx.nearby(a.pos, L * 2.4)) {
    if (o.id === a.id || !isAlive(o) || isHidden(o) || ctx.allies(a, o) || a.hitDone.has(o.id)) continue;
    const dd = dist(a.pos, o.pos), direction = norm(sub(o.pos, a.pos)), forward = dot(direction, h);
    let damage = 0, poise = 0, kb = 0, grab = false, armorPierce = 0, guardBreak = false;
    switch (def.ability) {
      case 'exhaustionHold': if (t >= 0.35 && t <= 0.65 && forward > 0.5 && dd < L * 0.95) { damage = 30; poise = 60; grab = true; guardBreak = true; } break;
      case 'fangTrap':       if (t >= 0.3 && t <= 0.6 && forward > 0.5 && dd < L * 1.0) { damage = 22; poise = 45; grab = true; } break;
      case 'neckStrike':     if (t >= 0.15 && t <= 0.45 && forward > 0.2 && dd < L * 2.0) { damage = 26; poise = 40; } break;
      case 'whorlSaw':       if (t >= 0.3 && t <= 0.6 && forward > 0.5 && dd < L * 1.0 && !creature(o.creature).shell) { damage = 20; poise = 40; grab = true; armorPierce = 0.5; } break;
      case 'sideSwipe': {
        // a sweep to one side: the side the body is turned to, a half arc out to the flank
        const side = { x: h.z, y: 0, z: -h.x };
        const s = dot(direction, side);
        if (t >= 0.2 && t <= 0.5 && dd < L * 1.1 && forward > -0.2 && Math.abs(s) > 0.3) { damage = 18; poise = 35; kb = 3; }
        break;
      }
    }
    if (damage <= 0) continue;
    a.hitDone.add(o.id);
    applyHit(ctx.hit, a, o, specialHit(def, { damage, poise, knockback: kb, grab, armorPierce, guardBreak }), 0);
    if (a.state !== 'ability') { a.abilityActive = false; break; }
  }
}
