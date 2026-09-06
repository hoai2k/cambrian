import { add, clamp, dist, dot, heading, len3, norm, scale, sub, type Vec3 } from '../shared/math';
import { bandOf, isAlive, isHidden, lengthOf, massOf } from './actors';
import { applyHit, type HitContext } from './combat';
import { creature, type CreatureDef } from './creatures';
import type { Actor, SiltCloud } from './types';

export interface ExpansionContext {
  hit: HitContext;
  nearby(pos: Vec3, radius: number): Actor[];
  silt: SiltCloud[];
  allies(a: Actor, b: Actor): boolean;
}

export const abilitySpeed = (a: Actor): number => {
  if (!a.abilityActive || a.state !== 'ability') return 1;
  switch (creature(a.creature).ability) {
    case 'ribbonSlip': return 1.55;
    case 'sedimentDive': return .85;
    case 'combCruise': return 1.35;
    case 'pharyngealPump': return 1.3;
    case 'adhesiveGlide': return .85;
    case 'collectorWake': case 'planktonComb': return .7;
    default: return 1;
  }
};

export function beginExpansionAbility(ctx: ExpansionContext, a: Actor, def: CreatureDef): boolean {
  if (!def.abilityDuration) return false;
  a.stateDur = def.abilityDuration;
  a.hitDone.clear();
  if (def.ability === 'ribbonSlip' || def.ability === 'sedimentDive') {
    a.iframes = .3;
    a.seen = 0;
    a.lockTarget = -1;
    for (const o of ctx.nearby(a.pos, 100)) {
      if (o.lockTarget === a.id) o.lockTarget = -1;
      if (o.brain) {
        o.brain.detection.delete(a.id);
        if (o.brain.target === a.id) { o.brain.target = -1; o.brain.goal = 'search'; o.brain.goalT = 0; }
      }
    }
    if (def.ability === 'sedimentDive') ctx.silt.push({ pos: { ...a.pos }, radius: lengthOf(a) * .8, t: 3 });
  }
  if (def.ability === 'spineIntercept') a.dodgeDir = heading(a.yaw);
  if (def.ability === 'whipSearch') { a.senseT = a.stateDur; a.senseCd = Math.max(a.senseCd, 6); }
  return true;
}

/** An ability never applies damage more than once per target per activation. */
export function stepExpansionAbility(ctx: ExpansionContext, a: Actor, def: CreatureDef, dt: number) {
  if (!def.abilityDuration) return;
  const L = lengthOf(a), h = heading(a.yaw), t = a.stateT;
  if (def.ability === 'combCruise') a.stamina = Math.min(a.staminaMax, a.stamina + 18 * dt);
  if (def.ability === 'spineIntercept') {
    // Use the heading committed at activation; movement controls do not steer this pass.
    if (t > .2 && t < .85) a.vel = scale(a.dodgeDir, def.speed * Math.pow(a.scale, .45) * 2.8);
  }
  const radius = def.ability === 'whipSearch' ? L * 5 : def.ability === 'basketRake' ? L * 2 : L * 1.6;
  for (const o of ctx.nearby(a.pos, radius)) {
    if (o.id === a.id || !isAlive(o) || ctx.allies(a, o)) continue;
    const d = dist(a.pos, o.pos), direction = norm(sub(o.pos, a.pos)), forward = dot(direction, h);
    if (def.ability === 'whipSearch' || def.ability === 'basketRake') {
      o.seen = Math.max(o.seen, 2.5);
      // Reveal burrowing creatures without stripping their unrelated defensive effects.
      if (isHidden(o)) o.senseT = Math.max(o.senseT, 1);
    }
    if (isHidden(o) && def.ability !== 'basketRake') continue;
    const snack = bandOf(a, o) === 'snack' && (o.controller === 'swarm' || o.controller === 'ambient');
    const collect = def.ability === 'collectorWake' || def.ability === 'whipSearch' || def.ability === 'planktonComb';
    if (collect && snack && (def.ability !== 'planktonComb' || forward > .45)) {
      const pull = clamp(1 - d / radius, .15, 1) * 14 * dt;
      o.vel = add(o.vel, scale(direction, -pull));
    }
    if (a.hitDone.has(o.id)) continue;
    let damage = 0, poise = 0, kb = 0, grab = false, armorPierce = 0;
    switch (def.ability) {
      case 'tentacleSeize':
        if (t >= .35 && t <= .65 && forward > .6 && d < L * 1.5) { damage = 15; poise = 28; grab = true; }
        break;
      case 'bellCorral':
        if (t >= .3 && d < L * 1.15) { damage = 12; poise = 28; kb = 6; }
        break;
      case 'sedimentDive':
        if (t >= a.stateDur - .3 && forward > .3 && d < L * 1.3) { damage = 22; poise = 48; kb = 3; }
        break;
      case 'basketRake':
        if (t >= .4 && t <= .8 && forward > .15) { damage = 15; poise = 38; }
        break;
      case 'shellCrush':
        if (t >= .4 && t <= .7 && forward > .5 && d < L * .95) { damage = 29; poise = 60; armorPierce = .75; }
        break;
      case 'spineIntercept':
        if (t >= .2 && t <= .85 && forward > .3 && d < L * .9) { damage = 20; poise = 36; kb = 5; }
        break;
    }
    if (damage > 0) {
      a.hitDone.add(o.id);
      const result = applyHit(ctx.hit, a, o, { ...def.light, damage, poise, knockback: kb, grab, armorPierce, guardBreak: def.ability === 'shellCrush' }, 0);
      if (result === 'hit' && isAlive(o) && (def.ability === 'basketRake' || def.ability === 'tentacleSeize') && massOf(o) < massOf(a) * 1.3) o.vel = scale(direction, -7);
      if (a.state !== 'ability') { a.abilityActive = false; break; }
    }
  }
}

export const bloomRate = (a: Actor, def: CreatureDef) => {
  if (def.diet !== 'filter') return 2.2 * clamp(1 - lengthOf(a) / 2.4, 0, 1);
  let rate = 1.3;
  if (a.abilityActive && a.state === 'ability') {
    if (def.ability === 'collectorWake') rate *= 3;
    if (def.ability === 'pharyngealPump') rate *= 4;
    if (def.ability === 'planktonComb') rate *= 5;
  }
  // Scale food intake gently: bloom growth remains viable after becoming a giant.
  return rate * Math.pow(a.scale, .25);
};

export const grazeRate = (a: Actor, def: CreatureDef) => {
  if (def.id === 'wiwaxia') return a.stillness > .5 ? 1.6 : 0;
  if (def.diet !== 'grazer' && def.diet !== 'deposit') return 0;
  return (def.diet === 'deposit' ? 1.1 : 1.6) * (a.abilityActive && def.ability === 'adhesiveGlide' ? 3 : 1);
};
