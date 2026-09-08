import { clamp, dist, distXZ, heading, type Vec3 } from '../../shared/math';
import type { EraHud, EraRules } from '../era-rules';
import { applyScaleStats, bandOf, isAlive, isHidden, lengthOf } from '../actors';
import { creature } from '../creatures';
import type { Game } from '../game';
import type { Actor, Mode, WorldEvent } from '../types';
import { BIOME_DANGER, biomeAt, groundHeight, sampleCurrent, shoreDistance, SHORE_WALL, SURFACE_Y } from '../world';
import { bodyRadius } from '../actors';
import { ADULT_STAGE, devActor, GROWN, HOLD_TO_WIN, PRIME_STAGE, RUNG_NAMES, STAGE_AT, STAGES, stageForScale, stageProgress, stageScale, stateFor, type DeadZone, type DevActor } from './state';
import { camoDrain, installDevonianSpecials, stepAbility, stepGuardSpecial, useAbility, ySpecial } from './specials';
import { botNursery, canBreach, sanctuary, spawnInCover, spawnProtect, spawnY, swim, wanderY } from './swim';

/**
 * The Devonian era rules (docs/redesign/08-devonian-domination.md).
 *
 * The era plays the same three modes as the Cambrian; what it changes is the sea and the animals
 * in it. You grow on what you eat, as everywhere else — the meter behind the five stages is fed
 * by feeding and nothing else — and around that: armour has a soft side; air breathers must
 * surface and dead zones punish gills; the limbed animals can climb the shore; shells jet and
 * hover; the arthropods moult and leave a decoy behind; the rung II fish lead shoals. All of it
 * hangs off the flags on the creature definitions and the hooks in src/sim/era-rules.ts; nothing
 * here runs in the Cambrian build.
 */

/**
 * What a meal is worth, per rung, so a hatchling of every rung fills its five stages at about the
 * same pace on the food its size can actually catch. This is the era's whole growth economy: a
 * Cambrian larva grows on nutrition and so does a Devonian hatchling.
 */
const FEED = [0, 0.55, 0.28, 0.14, 0.09] as const;   // standing per unit of nutrition
const AIR_SECONDS = 60, AIR_LOW = 0.25;
const ZONE_R = 35, ZONE_LIFE = 120, ZONE_EVERY = 150;
const EXUVIA_COVER = 8;

const rungOf = (a: Actor) => creature(a.creature).rung ?? 2;
const isPlayerish = (a: Actor) => a.controller === 'player' || a.controller === 'bot';
const players = (g: Game) => g.actors.filter(isPlayerish);

/** Feeding is the only thing that grows an animal here, exactly as nutrition is in the Cambrian. */
function gain(g: Game, a: Actor, d: DevActor, amount: number) {
  if (amount <= 0 || !isAlive(a) || d.beached) return;
  const before = d.standing;
  d.standing = clamp(d.standing + amount, 0, GROWN);
  if (d.standing > before) {
    // Rise shares the feast: anyone close by gets a little of a decent meal, as in the Cambrian.
    if (g.mode === 'rise' && amount > 0.5) for (const p of g.players) if (p !== a && isAlive(p) && dist(p.pos, a.pos) < 30) { const pd = devActor(g, p); pd.standing = clamp(pd.standing + amount * 0.3, 0, GROWN); }
    checkStage(g, a, d);
  }
}

/** Standing reaches a stage threshold: grow to it with the moult ceremony; arthropods shed a shell. */
function checkStage(g: Game, a: Actor, d: DevActor) {
  const next = d.stage + 1;
  if (d.stage >= PRIME_STAGE || d.standing < STAGE_AT[next] || a.state === 'moult' || !isAlive(a)) return;
  const def = creature(a.creature);
  const prevScale = a.scale;
  d.stage = next; a.scale = stageScale(def.adultLength, next);
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
  void dt;
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
  startScale(mode: Mode, index: number, id) {
    const L = creature(id).adultLength;
    return stageScale(L, mode === 'reef' ? ADULT_STAGE : mode === 'hunted' && index === 0 ? PRIME_STAGE : 0);
  },
  // The Devonian grows in five life stages, which is the shared ladder under its own names.
  ladderNames: STAGES,
  ladderRung: (g, a) => devActor(g, a).stage,
  ladderScale: (id, rung) => stageScale(creature(id).adultLength, rung),
  install() { installDevonianSpecials(); },
  ySpecial,
  init(g) { installDevonianSpecials(); for (const a of players(g)) { const d = devActor(g, a); d.stage = stageForScale(creature(a.creature).adultLength, a.scale); d.standing = g.mode === 'reef' ? STAGE_AT[ADULT_STAGE] + 5 : STAGE_AT[d.stage]; } },

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
      updateShoal(g, a, d, dt);
      updateExuvia(g, a, d, dt);
      stepGuardSpecial(g, a, d, dt);
      d.sinceEat += dt;
      // a stage the food already paid for is taken as soon as the last ceremony is over
      checkStage(g, a, d);
      // a giant with no bite never hunts
      if (def.noBite && a.brain && (a.brain.goal === 'hunt' || a.brain.goal === 'notice')) { a.brain.goal = 'patrol'; a.brain.target = -1; }
    }
    // the same for the AI-controlled harmless giant
    for (const a of g.actors) if (a.controller === 'shadow' || a.controller === 'giant') { if (creature(a.creature).noBite && a.brain && (a.brain.goal === 'hunt' || a.brain.goal === 'notice')) { a.brain.goal = 'patrol'; a.brain.target = -1; } }
    // corpses that died in dead water are not safe to eat
    for (const a of g.actors) if (a.state === 'dead' && a.corpseT < dt * 2 && a.eaten < 1) for (const z of s.deadZones) if (distXZ(a.pos, z.pos) < z.r) a.eaten = 1;
  },

  onNutrition(g, a, amount, food) {
    const d = devActor(g, a);
    d.sinceEat = 0;
    const def = creature(a.creature);
    let k = FEED[rungOf(a)] * amount;
    if (food && food.state === 'dead' && def.ability === 'scavenge') k *= 2;
    gain(g, a, d, k);
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

  useAbility, stepAbility, camoDrain,
  swim, canBreach, spawnY, wanderY,
  spawnPoint: spawnInCover, botNursery, spawnProtect, sanctuary,

  moultScale(g, a) {
    const d = devActor(g, a);
    const L = creature(a.creature).adultLength;
    return { from: stageScale(L, Math.max(0, d.stage - 1)), to: stageScale(L, d.stage) };
  },

  onRespawn(g, a) {
    const d = devActor(g, a);
    d.standing *= 0.8;
    // death costs a moult: one stage back (never below hatchling), and the standing to match
    if (g.mode !== 'reef' && d.stage > 0) d.stage -= 1;
    a.scale = stageScale(creature(a.creature).adultLength, d.stage);
    d.standing = Math.min(d.standing, d.stage + 1 <= PRIME_STAGE ? STAGE_AT[d.stage + 1] - 1 : d.standing);
    d.air = 1; d.deadT = 0; d.deadZoneIn = false; d.moultSoft = 0; d.exuvia = -1; d.followers = 0; d.primeT = 0; d.beached = false;
  },

  updateModes(g, dt) {
    // Rise: grow through the five stages on what you catch, then hold Prime. The shared `rise`
    // case in game.ts wins on tier, which the Devonian never advances — it grows in stages — so
    // it never fires there and the era decides this one.
    if (g.mode !== 'rise') return;
    for (const a of players(g)) {
      const d = devActor(g, a);
      if (d.stage >= PRIME_STAGE && isAlive(a)) {
        d.primeT += dt;
        if (d.primeT >= HOLD_TO_WIN && g.state.status === 'playing' && !g.endless) {
          const name = creature(a.creature).name;
          g.state = { status: a.player >= 0 ? 'won' : 'lost', winner: a.player,
            message: a.player >= 0 ? `${name} grew up and held the sea.` : `A rival ${name} grew up first.` };
        }
      } else d.primeT = 0;
    }
  },

  /** Rise wins on a held timer; zero it so play resumes with the sea open. */
  continueMatch(g) {
    for (const a of players(g)) devActor(g, a).primeT = 0;
  },

  /**
   * The Devonian ranks its animals by stage and standing rather than by tier, so the scoreboard
   * shows those: "Adult · Apex predator" against the standing bar, for bots as well as players.
   */
  scoreLine(g, a) {
    const d = devActor(g, a);
    return { rank: `${STAGES[d.stage]} · ${RUNG_NAMES[rungOf(a)]}`, progress: stageProgress(d) };
  },

  hud(g, i): EraHud | undefined {
    const p = g.players[i]; if (!p) return undefined;
    const d = devActor(g, p), def = creature(p.creature), s = stateFor(g);
    return {
      standing: d.standing, rung: rungOf(p), rungName: RUNG_NAMES[rungOf(p)], stage: STAGES[d.stage],
      air: def.breathing === 'air' ? d.air : undefined,
      beached: d.beached, primeT: d.primeT, inDeadZone: d.deadZoneIn,
      deadZones: s.deadZones.filter((z) => distXZ(z.pos, p.pos) < 400).map((z) => ({ dx: z.pos.x - p.pos.x, dz: z.pos.z - p.pos.z, r: z.r })),
    };
  },

  hint(g, i) {
    const p = g.players[i]; if (!p || !isAlive(p)) return undefined;
    const d = devActor(g, p), def = creature(p.creature), rung = rungOf(p);
    if (d.deadZoneIn && def.breathing !== 'air') return 'Dead water. Get out of it, or up to the surface if you can breathe.';
    if (def.breathing === 'air' && d.air < AIR_LOW) return 'Air is low. {rise} to the surface and gulp.';
    if (g.time < 12) return rung === 1 ? 'Feed, hide, moult. Everything out there is bigger than you are today.' : rung === 2 ? 'Feed and keep your shoal. You grow on what you catch.' : rung === 3 ? 'Hunt the shoals. Five stages between you and Prime.' : 'Stay fed. The sea is hiding from you.';
    if (def.shell && g.time < 40) return 'Sprint jets you backward. Rise and sink are free. Block withdraws into the shell.';
    if ((def.shoreReach ?? 0) > 0 && g.time < 40) return 'You can push into water nothing with gills can follow you into.';
    return undefined;
  },
};

/** Exposed for tests. */
export { FEED as FEED_WEIGHTS, AIR_SECONDS, ZONE_R };
export type { DeadZone };
