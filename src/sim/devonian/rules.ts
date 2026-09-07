import { clamp, dist, distXZ, heading, type Vec3 } from '../../shared/math';
import type { EraHud, EraRules } from '../era-rules';
import { applyScaleStats, bandOf, isAlive, isHidden, lengthOf } from '../actors';
import { creature } from '../creatures';
import type { Game } from '../game';
import type { Actor, Mode, WorldEvent } from '../types';
import { BIOME_DANGER, biomeAt, groundHeight, sampleCurrent, shoreDistance, SHORE_WALL, SURFACE_Y } from '../world';
import { bodyRadius } from '../actors';
import { devActor, DOMINANT, HOLD_TO_WIN, RUNG_NAMES, STAGE_AT, STAGE_SCALE, STAGES, stateFor, type DeadZone, type DevActor } from './state';
import { beginAbility, camoDrain, installDevonianSpecials, stepAbility, stepGuardSpecial, useAbility } from './specials';

/**
 * Devonian Domination (docs/redesign/08-devonian-domination.md). Progress is standing within a
 * rung, not growth; range is a soft territory; armour has a soft side; air breathers must surface
 * and dead zones punish gills; the limbed animals can climb the shore; shells jet and hover; the
 * arthropods moult and leave a decoy; rung II fish lead shoals. All of it hangs off the flags on
 * the creature definitions and the hooks in src/sim/era-rules.ts; nothing here runs in the
 * Cambrian build.
 */

// ---- standing sources, weighted per rung so every rung fills at about the same pace ----
const W = {
  feed:   [0, 0.55, 0.28, 0.14, 0.09],   // per unit of nutrition
  escape: [0, 9, 6, 3, 0],
  rival:  [0, 6, 6, 12, 5],
  range:  [0, 0.26, 0.4, 0.6, 0.9],      // per second holding range
  shoal:  [0, 0, 0.05, 0, 0],            // per follower per second
  moult:  [0, 6, 0, 0, 0],
  anoxia: [0, 4, 4, 4, 4],
  open:   [0, 0.15, 0, 0, 0],            // benthos: per second alive in the open
} as const;
const RANGE_R = 60;
const DECAY_AFTER = 20, DECAY = 0.15, GIANT_UNFED_AFTER = 40, GIANT_DECAY = 0.35;
const AIR_SECONDS = 60, AIR_LOW = 0.25;
const ZONE_R = 35, ZONE_LIFE = 120, ZONE_EVERY = 150;
const EXUVIA_COVER = 8;

const rungOf = (a: Actor) => creature(a.creature).rung ?? 2;
const isPlayerish = (a: Actor) => a.controller === 'player' || a.controller === 'bot';
const players = (g: Game) => g.actors.filter(isPlayerish);

function gain(g: Game, a: Actor, d: DevActor, amount: number, label: string) {
  if (amount <= 0 || !isAlive(a) || d.beached) return;
  const before = d.standing;
  d.standing = clamp(d.standing + amount, 0, DOMINANT);
  if (d.standing > before) {
    d.sinceGain = 0;
    if (d.recent[d.recent.length - 1] !== label) { d.recent.push(label); if (d.recent.length > 4) d.recent.shift(); }
    // allies near a scoring player share a little of it (co-op)
    if (g.mode === 'domination' && amount > 0.5) for (const p of g.players) if (p !== a && isAlive(p) && dist(p.pos, a.pos) < 30) { const pd = devActor(g, p); pd.standing = clamp(pd.standing + amount * 0.3, 0, DOMINANT); pd.sinceGain = 0; }
    checkStage(g, a, d);
  }
}

/** Standing reaches a stage threshold: grow to it with the moult ceremony; arthropods shed a shell. */
function checkStage(g: Game, a: Actor, d: DevActor) {
  const next = (d.stage + 1) as 1 | 2;
  if (d.stage >= 2 || d.standing < STAGE_AT[next] || a.state === 'moult' || !isAlive(a)) return;
  const def = creature(a.creature);
  const prevScale = a.scale;
  d.stage = next; a.scale = def.adultLength ? STAGE_SCALE[next] : a.scale;
  applyScaleStats(a, true);
  a.state = 'moult'; a.stateT = 0; a.stateDur = 1.5; a.lockTarget = -1; a.abilityActive = false;
  g.events.push({ kind: 'tierUp', pos: { ...a.pos }, actor: a.id, strength: next, player: a.player });
  if (def.moults) {
    d.moultSoft = 3.5;                                   // soft for the ceremony and two seconds after
    // the shed exoskeleton: a corpse-shaped decoy with almost nothing to eat on it
    const ex = g.spawn(a.creature, 'ambient', { x: a.pos.x - Math.sin(a.yaw) * lengthOf(a) * 0.3, y: a.pos.y, z: a.pos.z - Math.cos(a.yaw) * lengthOf(a) * 0.3 }, prevScale);
    ex.yaw = a.yaw; ex.prevT.yaw = a.yaw;
    ex.state = 'dead'; ex.hp = 0; ex.corpseT = 0; ex.eaten = 0.85; ex.deathY = ex.pos.y; ex.sparkled = true;
    d.exuvia = ex.id; d.exuviaT = 0;
    g.events.push({ kind: 'moult', pos: { ...a.pos }, actor: a.id, player: a.player, strength: 1 });
    gain(g, a, d, W.moult[rungOf(a)], 'moult');
  }
}

// ---- range ----
function updateRange(g: Game, a: Actor, d: DevActor, dt: number) {
  if (!isAlive(a) || d.beached) { d.inRange = false; return; }
  const rung = rungOf(a);
  let dominant = true;
  for (const o of players(g)) {
    if (o === a || !isAlive(o) || rungOf(o) !== rung || distXZ(o.pos, a.pos) > RANGE_R) continue;
    if (devActor(g, o).standing >= d.standing) { dominant = false; break; }
  }
  const was = d.inRange;
  d.inRange = dominant;
  if (dominant) { d.rangeT += dt; gain(g, a, d, W.range[rung] * dt, 'range'); }
  else d.rangeT = 0;
  if (was !== d.inRange && a.controller === 'player') g.events.push({ kind: d.inRange ? 'rangeClaim' : 'rangeLost', pos: { ...a.pos }, actor: a.id, player: a.player });
}
/** Wild animals of your rung give way inside your range. Once a second. */
function giveWay(g: Game, a: Actor) {
  const rung = rungOf(a);
  for (const o of g.nearby(a.pos, RANGE_R)) {
    if (o.controller !== 'ambient' || !o.brain || rungOf(o) !== rung) continue;
    if (o.brain.goal === 'wander' || o.brain.goal === 'graze') {
      const dx = o.pos.x - a.pos.x, dz = o.pos.z - a.pos.z, l = Math.hypot(dx, dz) || 1;
      o.brain.wanderTo = { x: a.pos.x + dx / l * (RANGE_R + 20), y: o.pos.y, z: a.pos.z + dz / l * (RANGE_R + 20) };
      o.brain.goal = 'wander'; o.brain.goalT = 0;
    }
  }
}

// ---- air and dead zones ----
function updateAir(g: Game, a: Actor, d: DevActor, dt: number) {
  const def = creature(a.creature);
  if (def.breathing !== 'air') return;
  d.gulpT += dt;
  const atSurface = a.pos.y > SURFACE_Y - 3 - lengthOf(a) * 0.3 || d.beached;
  if (atSurface) {
    if (d.air < 0.999 && d.air + dt / 1.5 >= 0.999 && a.controller === 'player') { g.events.push({ kind: 'gulp', pos: { ...a.pos }, actor: a.id, player: a.player }); a.burstT = Math.max(a.burstT, 1.5); }
    d.air = Math.min(1, d.air + dt / 1.5);
  } else d.air = Math.max(0, d.air - dt / AIR_SECONDS);
  // low air: no sprint to speak of, and slow recovery
  if (d.air < AIR_LOW) a.stamina = Math.min(a.stamina, a.staminaMax * 0.35);
}
function stepDeadZones(g: Game, s: ReturnType<typeof stateFor>, dt: number) {
  s.nextZoneT -= dt;
  if (s.nextZoneT <= 0) {
    s.nextZoneT = ZONE_EVERY * (0.8 + g.rng() * 0.4);
    const anchors = g.anchors();
    const an = anchors[Math.floor(g.rng() * anchors.length)];
    for (let tries = 0; tries < 10; tries++) {
      const ang = g.rng() * Math.PI * 2, dd = 80 + g.rng() * 120;
      const x = an.x + Math.cos(ang) * dd, z = an.z + Math.sin(ang) * dd;
      if (BIOME_DANGER[biomeAt(x, z)] < 0.6 || shoreDistance(x, z) < 200) continue;
      const cur = sampleCurrent({ x: 0, y: 0, z: 0 }, x, 10, z, g.time);
      s.deadZones.push({ pos: { x, y: 12, z }, r: ZONE_R, age: 0, life: ZONE_LIFE, drift: { x: cur.x * 0.3, y: 0, z: cur.z * 0.3 } });
      for (const p of g.players) if (distXZ(p.pos, { x, y: 0, z }) < 160) g.events.push({ kind: 'anoxia', pos: { x, y: 12, z }, actor: -1, player: p.player });
      break;
    }
  }
  for (const z of s.deadZones) { z.age += dt; z.pos.x += z.drift.x * dt; z.pos.z += z.drift.z * dt; }
  s.deadZones = s.deadZones.filter((z) => z.age < z.life);
}
function updateDeadZoneEffects(g: Game, a: Actor, d: DevActor, dt: number) {
  const s = stateFor(g);
  let inside = false;
  for (const z of s.deadZones) if (distXZ(a.pos, z.pos) < z.r * (z.age < 6 ? z.age / 6 : 1) * (z.age > z.life - 10 ? (z.life - z.age) / 10 : 1)) { inside = true; break; }
  const def = creature(a.creature);
  if (inside && def.breathing !== 'air') {
    d.deadT += dt;
    a.stamina = Math.max(0, a.stamina - 30 * dt);                // outpaces the shared regen (24/s at rest): no recovery in dead water
    if (d.deadT > 6 && isAlive(a)) { a.hp = Math.max(1, a.hp - a.hpMax * 0.02 * dt); a.sinceHit = 0; }
  } else if (d.deadZoneIn && !inside) {
    if (d.deadT >= 5 && isAlive(a)) gain(g, a, d, W.anoxia[rungOf(a)], 'survived');
    d.deadT = 0;
  }
  d.deadZoneIn = inside;
}

// ---- shore, shells, shoals, exuvia ----
function updateShore(g: Game, a: Actor, d: DevActor) {
  const def = creature(a.creature);
  const wall = SHORE_WALL + bodyRadius(a) * 3;
  const beached = (def.shoreReach ?? 0) > 0 && shoreDistance(a.pos.x, a.pos.z) < wall;
  if (beached !== d.beached && a.controller === 'player') g.events.push({ kind: 'beach', pos: { ...a.pos }, actor: a.id, player: a.player, strength: beached ? 1 : 0 });
  d.beached = beached;
  if (beached) {
    // slow, out of the water, on the sand: the seabed here is above the game's ceiling clamp
    a.vel.x *= 0.9; a.vel.z *= 0.9;
    const floor = groundHeight(g.world, a.pos.x, a.pos.z, []) + lengthOf(a) * 0.12;
    if (a.pos.y < floor) { a.pos.y = floor; a.prevT.y = Math.max(a.prevT.y, floor - 0.5); }
    a.hunted = 0;
  }
}
function updateShoal(g: Game, a: Actor, d: DevActor, dt: number) {
  const def = creature(a.creature);
  if (!def.shoals || !isAlive(a)) { d.followers = 0; return; }
  const calm = Math.hypot(a.vel.x, a.vel.z) < def.speed * Math.pow(a.scale, 0.45) * 1.2 && a.burstT <= 0;
  let n = 0;
  for (const o of g.nearby(a.pos, 14)) {
    if (o.controller !== 'swarm' || o.creature !== a.creature || !o.brain || !isAlive(o)) continue;
    if (!calm) { continue; }
    if (n < 8) { o.brain.home = { ...a.pos }; n++; }
  }
  if (n > d.followers && a.controller === 'player') g.events.push({ kind: 'shoalJoin', pos: { ...a.pos }, actor: a.id, player: a.player });
  d.followers = n;
  if (n) gain(g, a, d, W.shoal[rungOf(a)] * n * dt, 'shoal');
}
function updateExuvia(g: Game, a: Actor, d: DevActor, dt: number) {
  if (d.moultSoft > 0) d.moultSoft = Math.max(0, d.moultSoft - dt);
  if (d.exuvia < 0) return;
  d.exuviaT += dt;
  const ex = g.byId(d.exuvia);
  if (!ex || d.exuviaT > EXUVIA_COVER || dist(ex.pos, a.pos) > 12) { d.exuvia = -1; return; }
  // the shed shell draws the eye: hunters lose track of the animal that left it
  for (const o of g.nearby(a.pos, 40)) if (o.brain?.detection.has(a.id)) o.brain.detection.set(a.id, (o.brain.detection.get(a.id) ?? 0) * Math.pow(0.5, dt));
}

// ---- the rules object ----
export const DEVONIAN_RULES: EraRules = {
  growthByNutrition: false,
  startScale(mode: Mode, index: number) { return mode === 'reef' ? STAGE_SCALE[1] : mode === 'hunted' && index === 0 ? STAGE_SCALE[2] : STAGE_SCALE[0]; },
  init(g) { installDevonianSpecials(); for (const a of players(g)) { const d = devActor(g, a); d.stage = a.scale >= STAGE_SCALE[2] - 1e-6 ? 2 : a.scale >= STAGE_SCALE[1] - 1e-6 ? 1 : 0; d.standing = g.mode === 'reef' ? 50 : 0; } },

  step(g, dt) {
    const s = stateFor(g);
    s.matchT += dt;
    stepDeadZones(g, s, dt);
    s.tick += dt;
    const second = s.tick >= 1; if (second) s.tick -= 1;
    for (const a of players(g)) {
      const d = devActor(g, a);
      const rung = rungOf(a), def = creature(a.creature);
      updateShore(g, a, d);
      updateAir(g, a, d, dt);
      updateDeadZoneEffects(g, a, d, dt);
      updateRange(g, a, d, dt);
      updateShoal(g, a, d, dt);
      updateExuvia(g, a, d, dt);
      stepGuardSpecial(g, a, d, dt);
      if (second) giveWay(g, a);
      // benthos: being alive in the open is itself an achievement
      if (W.open[rung] && isAlive(a) && !isHidden(a) && a.hideMode === 'none') { d.openT += dt; gain(g, a, d, W.open[rung] * dt, 'alive'); }
      // decay: a standing you do nothing for slips; a giant that does not eat starves
      d.sinceGain += dt; d.sinceEat += dt;
      if (isAlive(a) && d.sinceGain > DECAY_AFTER) d.standing = Math.max(0, d.standing - DECAY * dt);
      if (isAlive(a) && rung === 4 && d.sinceEat > GIANT_UNFED_AFTER) d.standing = Math.max(0, d.standing - GIANT_DECAY * dt);
      // a stage the standing already earned is taken as soon as the last ceremony is over
      checkStage(g, a, d);
      // dominant clock
      if (isAlive(a) && d.standing >= DOMINANT - 1e-6) { if (d.dominantT === 0 && a.controller === 'player') g.events.push({ kind: 'dominant', pos: { ...a.pos }, actor: a.id, player: a.player }); d.dominantT += dt; } else d.dominantT = 0;
      // a giant with no bite never hunts
      if (def.noBite && a.brain && (a.brain.goal === 'hunt' || a.brain.goal === 'notice')) { a.brain.goal = 'patrol'; a.brain.target = -1; }
    }
    // the same for the AI-controlled harmless giant
    for (const a of g.actors) if (a.controller === 'shadow' || a.controller === 'giant') { if (creature(a.creature).noBite && a.brain && (a.brain.goal === 'hunt' || a.brain.goal === 'notice')) { a.brain.goal = 'patrol'; a.brain.target = -1; } }
    // corpses that died in dead water are not safe to eat
    for (const a of g.actors) if (a.state === 'dead' && a.corpseT < dt * 2 && a.eaten < 1) for (const z of s.deadZones) if (distXZ(a.pos, z.pos) < z.r) a.eaten = 1;
  },

  onEvents(g, events) {
    for (const e of events) {
      const actor = e.actor >= 0 ? g.byId(e.actor) : undefined;
      if (!actor || !isPlayerish(actor)) continue;
      const d = devActor(g, actor), rung = rungOf(actor);
      switch (e.kind) {
        case 'escape': gain(g, actor, d, W.escape[rung], 'escape'); break;
        case 'kill': { const v = e.other != null ? g.byId(e.other) : undefined; if (v && rungOf(v) === rung && bandOf(actor, v) === 'rival') gain(g, actor, d, W.rival[rung], 'rival'); break; }
        case 'routed': { // actor is the one routed; `other` drove it off
          const winner = e.other != null ? g.byId(e.other) : undefined;
          if (winner && isPlayerish(winner) && rungOf(winner) === rung) gain(g, winner, devActor(g, winner), W.rival[rungOf(winner)] * 0.6, 'rival');
          break;
        }
      }
    }
  },

  onNutrition(g, a, amount, food) {
    const d = devActor(g, a);
    d.sinceEat = 0;
    const def = creature(a.creature);
    let k = W.feed[rungOf(a)] * amount;
    if (food && food.state === 'dead' && def.ability === 'scavenge') k *= 2;
    gain(g, a, d, k, 'feed');
  },

  armour(attacker, victim, dir) {
    const vdef = creature(victim.creature);
    void dir;
    let f = vdef.armour ?? 0;
    const guarding = victim.state === 'guard';
    if (guarding && vdef.moults) f = 1;                                   // enrolled: all shell
    if (guarding && vdef.shell) f = 0.85;                                 // withdrawn: only the aperture is soft
    if (f <= 0) return 1;
    // where along the body was it struck? 0 = snout, 1 = tail
    const h = heading(victim.yaw);
    const rel = ((attacker.pos.x - victim.pos.x) * h.x + (attacker.pos.z - victim.pos.z) * h.z) / Math.max(lengthOf(victim), 1e-3);
    const t = clamp(0.5 - rel, 0, 1);
    const onArmour = vdef.shell ? t > 0.15 : t < f;
    if (!onArmour) return 1;
    const pierce = creature(attacker.creature).armourPierce ?? 0;
    return 0.25 + 0.75 * clamp(pierce, 0, 1);
  },

  shoreReach(a) { return creature(a.creature).shoreReach ?? 0; },
  jet(a) { return !!creature(a.creature).shell; },

  useAbility, beginAbility, stepAbility, camoDrain,

  moultScale(g, a) {
    const d = devActor(g, a);
    return { from: STAGE_SCALE[Math.max(0, d.stage - 1)], to: STAGE_SCALE[d.stage] };
  },

  onRespawn(g, a) {
    const d = devActor(g, a);
    d.standing *= 0.8;
    if (d.stage === 2) { d.stage = 1; a.scale = STAGE_SCALE[1]; }
    else if (g.mode !== 'reef' && d.stage === 0) a.scale = STAGE_SCALE[0];
    d.air = 1; d.deadT = 0; d.deadZoneIn = false; d.moultSoft = 0; d.exuvia = -1; d.followers = 0; d.dominantT = 0; d.beached = false;
  },

  updateModes(g, dt) {
    void dt;
    if (g.mode !== 'domination' && g.mode !== 'foodchain') return;
    const contenders = players(g);
    for (const a of contenders) {
      const d = devActor(g, a);
      if (d.dominantT >= HOLD_TO_WIN && g.state.status === 'playing') {
        const name = creature(a.creature).name;
        g.state = { status: a.player >= 0 ? 'won' : 'lost', winner: a.player, message: a.player >= 0 ? `${name} dominates the ${RUNG_NAMES[rungOf(a)].toLowerCase()}.` : `A rival ${name} owns its rung.` };
      }
    }
    if (g.mode === 'foodchain' && g.time > 12 * 60 && g.state.status === 'playing') {
      const best = [...contenders].sort((x, y) => devActor(g, y).standing - devActor(g, x).standing)[0];
      if (best) g.state = { status: best.player >= 0 ? 'won' : 'lost', winner: best.player, message: best.player >= 0 ? `Player ${best.player + 1} has the highest standing in the chain.` : `A rival ${creature(best.creature).name} out-stood everyone.` };
    }
  },

  hud(g, i): EraHud | undefined {
    const p = g.players[i]; if (!p) return undefined;
    const d = devActor(g, p), def = creature(p.creature), s = stateFor(g);
    return {
      standing: d.standing, rung: rungOf(p), rungName: RUNG_NAMES[rungOf(p)], stage: STAGES[d.stage],
      air: def.breathing === 'air' ? d.air : undefined,
      inRange: d.inRange, beached: d.beached, dominantT: d.dominantT, recent: [...d.recent], inDeadZone: d.deadZoneIn,
      deadZones: s.deadZones.filter((z) => distXZ(z.pos, p.pos) < 400).map((z) => ({ dx: z.pos.x - p.pos.x, dz: z.pos.z - p.pos.z, r: z.r })),
    };
  },

  hint(g, i) {
    const p = g.players[i]; if (!p || !isAlive(p)) return undefined;
    const d = devActor(g, p), def = creature(p.creature), rung = rungOf(p);
    if (d.deadZoneIn && def.breathing !== 'air') return 'Dead water. Get out of it, or up to the surface if you can breathe.';
    if (def.breathing === 'air' && d.air < AIR_LOW) return 'Air is low. RB to the surface and gulp.';
    if (g.time < 12) return rung === 1 ? 'Feed, hide, moult. Escaping a hunter is worth more than anything you can eat.' : rung === 2 ? 'Feed and keep your shoal. Losing a hunter scores.' : rung === 3 ? 'Hunt the shoal, drive off your rivals, hold your range.' : 'Stay fed. The sea is hiding from you.';
    if (d.standing > 20 && !d.inRange && rung >= 3) return 'Hold ground with nobody of your rung above you: range scores.';
    if (def.shell && g.time < 40) return 'Sprint jets you backward. Rise and sink are free. Block withdraws into the shell.';
    if ((def.shoreReach ?? 0) > 0 && g.time < 40) return 'You can push into water nothing with gills can follow you into.';
    return undefined;
  },
};

/** Exposed for tests. */
export { W as STANDING_WEIGHTS, RANGE_R, AIR_SECONDS, ZONE_R };
export type { DeadZone };
