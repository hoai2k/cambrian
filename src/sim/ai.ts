import { add, clamp, dist, distXZ, dot, heading, len3, norm, scale as vscale, sub, TAU, v3, type Rng, type Vec3 } from '../shared/math';
import { bandOf, isAlive, isHidden, lengthOf } from './actors';
import { RULES } from './era-rules';
import { creature } from './creatures';
import type { Actor, BrainState, InputFrame, WorldEvent } from './types';
import { emptyInput } from './types';
import { biomeAt, LIGHT_WINDOW_Y, microbialAt, nurseryFactor, sampleHeight, shoreDistance, SURFACE_Y, type Cover, type WorldData } from './world';
import { huntInterval, huntingPressure } from './daynight';

export interface AiWorld {
  actors: Actor[];
  byId(id: number): Actor | undefined;
  nearby(pos: Vec3, r: number): Actor[];
  world: WorldData;
  time: number;
  rng: Rng;
  nearestCover(pos: Vec3, length: number, r: number): Cover | undefined;
  players: Actor[];
  events: WorldEvent[];
}

export function makeBrain(kind: BrainState['kind'], home: Vec3, rng: Rng, opts: Partial<BrainState> = {}): BrainState {
  return {
    kind, goal: kind === 'giant' ? 'patrol' : 'wander', target: -1, goalT: 0, thinkT: rng() * 0.3,
    wanderTo: { ...home }, home: { ...home }, patrolIndex: 0, detection: new Map(), hunger: 3, lastEats: 0, parrySkill: 0.3, courage: 1,
    aggression: rng(), temper: 0, appetite: rng(), territoryR: 0, reaction: 0.15 + rng() * 0.25, reactT: 0, ...opts,
  };
}

const scratchDir = v3();

/**
 * How far past the edge of its patch an animal will take an argument, as a multiple of the patch
 * radius. A little, so an intruder hovering on the line does not make it flicker between charging
 * and turning back — and no further, whatever it has left in the tank.
 */
const TERRITORY_LEASH = 1.15;
/** The goals that chase something. Fleeing and feeding are not leashed to the patch. */
const PURSUITS = new Set<BrainState['goal']>(['defend', 'fight', 'hunt']);

function steerToward(a: Actor, target: Vec3, out: InputFrame, speedWanted = 1) {
  const d = sub(target, a.pos);
  if (!creature(a.creature).ground) {
    out.worldMove = vscale(norm(d), speedWanted);
  } else {
    d.y = 0;
    out.worldMove = vscale(norm(d), speedWanted);
  }
}

function pickWander(a: Actor, b: BrainState, rng: Rng, radius: number) {
  const ang = rng() * TAU, d = Math.sqrt(rng()) * radius;
  const x = b.home.x + Math.cos(ang) * d;
  let z = b.home.z + Math.sin(ang) * d;
  // the sea has one edge: nothing wanders up the beach
  const shore = shoreDistance(x, z);
  if (shore < 28) z -= 28 - shore;
  const ground = sampleHeight(x, z);
  const y = RULES ? RULES.wanderY(a, ground, rng) : creature(a.creature).ground ? ground : clamp(ground + 1.5 + rng() * (a.scale > 2 ? 12 : 6) * lengthOf(a) * 0.5, ground + 1, SURFACE_Y - 2);
  b.wanderTo = { x, y, z };
}

/**
 * The nurseries keep the young alive by keeping the peace, not by keeping the animals small. An
 * animal standing in one starts nothing there and nothing there is hunted — whatever size either
 * of them is — but a nursery is not a spell: anything that gets bitten still answers, because
 * nothing in the sea does otherwise.
 */
const peaceful = (p: Vec3) => nurseryFactor(p.x, p.z) > 0.35;

/** Detection score update for hunters (giants, predators). 10 Hz. */
export function updateDetection(g: AiWorld, hunter: Actor, b: BrainState, dt: number) {
  const def = creature(hunter.creature);
  const L = lengthOf(hunter);
  const range = Math.min(def.sense * L * (b.kind === 'giant' ? 1.4 : 1) + 6, b.kind === 'giant' ? 70 : 40);
  const head = heading(hunter.yaw);
  const seenIds = new Set<number>();
  for (const t of g.nearby(hunter.pos, range)) {
    if (t.id === hunter.id || !isAlive(t)) continue;
    const band = bandOf(hunter, t);
    if (band === 'giant' || band === 'threat') continue;
    if (t.controller === 'swarm') continue;
    if (hunter.controller === 'shadow' && t.pos.y < LIGHT_WINDOW_Y - 3) continue;
    const d = dist(hunter.pos, t.pos);
    if (d > range) continue;
    seenIds.add(t.id);
    const to = norm(sub(t.pos, hunter.pos));
    const inCone = dot(head, to) > 0.2 || def.id === 'opabinia';
    const sight = inCone ? 1 : (d < range * 0.5 ? 0.15 : 0);
    const sizeF = clamp(lengthOf(t) / L * 2.5, 0.25, 1.5);
    const speed = len3(t.vel);
    const motion = t.state === 'attack' ? 1.5 : speed > 0.3 ? (t.burstT > 0 || t.noise > 2 ? 2.5 : 1) : 0.5;
    const camo = t.hideMode === 'camouflage' ? 1 - t.camoStrength * (speed < .4 ? .88 : .70) : 1;
    const coverF = camo * (isHidden(t) ? 0.03 : 1 - t.cover * 0.95) * (peaceful(t.pos) ? 0.12 : 1);
    const distF = clamp(1.6 - d / range, 0.2, 1.6);
    // Only clear signals grow the score: a still or covered target decays out of attention.
    const rate = sight * sizeF * motion * coverF * distF * 1.1 - 0.35;
    const prev = b.detection.get(t.id) ?? 0;
    const next = clamp(prev + rate * dt, 0, 3);
    b.detection.set(t.id, next);
    if (prev < 1 && next >= 1 && t.controller === 'player') g.events.push({ kind: 'noticed', pos: { ...hunter.pos }, actor: hunter.id, other: t.id, player: t.player });
  }
  for (const [id, v] of b.detection) {
    if (!seenIds.has(id)) {
      const nv = v - 0.5 * dt;
      if (nv <= 0) b.detection.delete(id); else b.detection.set(id, nv);
    }
  }
}

function bestDetected(b: BrainState, threshold: number, g: AiWorld): Actor | undefined {
  let best: Actor | undefined, bestV = threshold;
  for (const [id, v] of b.detection) {
    if (v >= bestV) { const a = g.byId(id); if (a && isAlive(a)) { best = a; bestV = v; } }
  }
  return best;
}

export function thinkSwarm(g: AiWorld, a: Actor, b: BrainState, dt: number): InputFrame {
  const out = emptyInput();
  const L = lengthOf(a);
  const cohesion = v3(), align = v3(), sep = v3(), flee = v3();
  let n = 0, threat = 0;
  for (const o of g.nearby(a.pos, 6 + L * 8)) {
    if (o.id === a.id || !isAlive(o)) continue;
    if (o.brain?.schoolId === b.schoolId) {
      const d = dist(a.pos, o.pos);
      cohesion.x += o.pos.x; cohesion.y += o.pos.y; cohesion.z += o.pos.z;
      align.x += o.vel.x; align.y += o.vel.y; align.z += o.vel.z; n++;
      if (d < L * 1.6 && d > 1e-3) { const k = (L * 1.6 - d) / d; sep.x += (a.pos.x - o.pos.x) * k; sep.y += (a.pos.y - o.pos.y) * k; sep.z += (a.pos.z - o.pos.z) * k; }
    } else if (lengthOf(o) > L * 1.8 && o.controller !== 'swarm') {
      const d = dist(a.pos, o.pos);
      const alarm = 5 + L * 6 + o.noise * 3 + (o.burstT > 0 ? -4 : 0);
      if (d < alarm && d > 1e-3) {
        const k = (alarm - d) / d;
        flee.x += (a.pos.x - o.pos.x) * k; flee.y += (a.pos.y - o.pos.y) * k * 0.5; flee.z += (a.pos.z - o.pos.z) * k;
        threat = Math.max(threat, clamp(1 - d / alarm, 0, 1));
      }
    }
  }
  // Something has just bitten it. A school does not fight back, but it does not carry on schooling
  // either: whatever the size of the thing, being bitten scatters the fish away from it at once.
  // The alarm above only sees bodies nearly twice their length, so a predator their own size — a
  // hatchling player, most often — could eat through a school without any of it reacting.
  const biter = a.sinceHit < 1.5 && a.lastHitBy >= 0 ? g.byId(a.lastHitBy) : undefined;
  if (biter && isAlive(biter)) {
    const d = Math.max(dist(a.pos, biter.pos), 1e-3);
    const k = 6 / d;
    flee.x += (a.pos.x - biter.pos.x) * k; flee.y += (a.pos.y - biter.pos.y) * k * 0.5; flee.z += (a.pos.z - biter.pos.z) * k;
    threat = 1;
  }
  const move = v3();
  if (n > 0) {
    cohesion.x = cohesion.x / n - a.pos.x; cohesion.y = cohesion.y / n - a.pos.y; cohesion.z = cohesion.z / n - a.pos.z;
    const c = norm(cohesion), al = norm(align);
    move.x += c.x * 0.7 + al.x * 0.5; move.y += c.y * 0.7 + al.y * 0.5; move.z += c.z * 0.7 + al.z * 0.5;
  }
  const s = norm(sep); if (len3(sep) > 0) { move.x += s.x * 1.1; move.y += s.y * 1.1; move.z += s.z * 1.1; }
  // home pull
  const toHome = sub(b.home, a.pos);
  const hd = len3(toHome);
  if (hd > 14) { const h = norm(toHome); move.x += h.x * 0.9; move.y += h.y * 0.4; move.z += h.z * 0.9; }
  // gentle wander
  const wobble = Math.sin(g.time * 0.7 + a.id * 1.7) * 0.4;
  move.x += Math.cos(a.id + g.time * 0.15) * 0.3; move.z += Math.sin(a.id * 1.3 + g.time * 0.13) * 0.3; move.y += wobble * 0.15;
  if (threat > 0) { const f = norm(flee); move.x = f.x * 3 + move.x * 0.3; move.y = f.y * 1.2; move.z = f.z * 3 + move.z * 0.3; out.burst = threat > 0.3 ? 1 : 0; }
  // keep swimmers above the floor and below the surface
  const floor = sampleHeight(a.pos.x, a.pos.z);
  if (!creature(a.creature).ground) {
    if (a.pos.y < floor + 1.2) move.y += 1.5;
    if (a.pos.y > SURFACE_Y - 3) move.y -= 1.5;
  }
  out.worldMove = vscale(norm(move), clamp(len3(move), 0.35, 1));
  return out;
}

/** Whether there is a microbial mat worth grazing under this animal or a short crawl away. */
function matsNear(a: Actor): boolean {
  if (microbialAt(a.pos.x, a.pos.z) > .15) return true;
  const step = 26;
  for (let k = 0; k < 4; k++) {
    const ang = (k / 4) * TAU;
    if (microbialAt(a.pos.x + Math.cos(ang) * step, a.pos.z + Math.sin(ang) * step) > .25) return true;
  }
  return false;
}

export function thinkNeeds(g: AiWorld, a: Actor, b: BrainState, dt: number): InputFrame {
  const out = emptyInput();
  const def = creature(a.creature);
  const L = lengthOf(a);
  b.goalT += dt; b.thinkT -= dt; b.reactT -= dt; b.hunger += dt;
  /**
   * A brain standing in for a player — a versus bot, or the balance harness driving a creature
   * through a match — is a competitor in a game, not an animal in an ecosystem. The hour governs
   * what the wildlife does; it must not decide how hard a rival plays.
   */
  const competitor = a.controller === 'bot' || a.controller === 'player';
  if (a.eats !== b.lastEats) { b.lastEats = a.eats; b.hunger = competitor ? 2 : 0; }

  if (b.thinkT <= 0) {
    b.thinkT = 0.25 + g.rng() * 0.15;
    // Threat scan
    let worst: Actor | undefined, worstD = Infinity;
    let prey: Actor | undefined, preyD = Infinity;
    let rival: Actor | undefined, rivalD = Infinity;
    let intruder: Actor | undefined;
    /** The nearest body worth eating: scavengers live on these, opportunists take them when offered. */
    let carrion: Actor | undefined, carrionD = Infinity;
    const senseR = Math.min(def.sense * L + 6, 40);
    // An animal that holds ground knows its own ground: it notices an intruder anywhere in the
    // patch, not only within the range it can see prey at. Everything else still works off
    // `senseR`, so widening the sweep does not make it hunt or pick fights from further away.
    const scanR = Math.max(senseR, b.territoryR > 0 ? b.territoryR + L : 0);
    for (const o of g.nearby(a.pos, scanR)) {
      if (o.id === a.id) continue;
      // Bodies are looked for before the living are, and are the one thing here that is *not*
      // skipped for being dead. A carcass is worth crossing more ground for than a live meal is
      // worth chasing, so it is seen from further out than anything else.
      if (o.state === 'dead') {
        if (o.eaten < 1 && (def.diet === 'scavenger' || !def.diet)) {
          const dd = dist(a.pos, o.pos);
          if (dd < senseR * 1.6 && dd < carrionD && lengthOf(o) > L * 0.2) { carrion = o; carrionD = dd; }
        }
        continue;
      }
      if (!isAlive(o) || isHidden(o)) continue;
      const d = dist(a.pos, o.pos);
      const band = bandOf(a, o);
      if (d > senseR) {
        // Out of sight: only its own territory is still its business.
        if (b.territory && b.territoryR > 0 && !intruder && distXZ(o.pos, b.territory) < b.territoryR
          && (o.controller === 'player' || o.controller === 'bot' || o.controller === 'ambient')
          && lengthOf(o) > L * 0.5 && band !== 'giant' && band !== 'threat') intruder = o;
        continue;
      }
      if (band === 'giant' || band === 'threat') {
        const hunting = o.brain ? (o.brain.detection.get(a.id) ?? 0) > 1 || o.brain.target === a.id : o.controller === 'player' || o.controller === 'bot';
        const r = band === 'giant' ? senseR : senseR * 0.6;
        if (d < r && (hunting || d < r * 0.5) && d < worstD) { worst = o; worstD = d; }
      } else if (band === 'snack' || band === 'prey') {
        if (o.controller === 'swarm' && d > senseR * 0.8) continue;
        if (RULES?.sanctuary(a, o) && a.lastHitBy !== o.id) continue;            // the young in a nursery are left alone
        if (peaceful(o.pos) && a.lastHitBy !== o.id) continue;                   // and so is anything else in one
        if (d < preyD) { prey = o; preyD = d; }
      } else if (band === 'rival') {
        const provoked = o.lockTarget === a.id || (o.state === 'attack' && d < L * 2) || (o.brain?.target === a.id) || a.hitFlash > 0 || a.lastHitBy === o.id;
        if (!provoked && (RULES?.sanctuary(a, o) || peaceful(o.pos) || peaceful(a.pos))) continue;
        // A grumpy animal has a personal space and does not like it crossed: anything its own size
        // that comes inside it gets seen off, hungry or not, dawn or noon.
        const crowded = b.temper > 0 && d < L * (1.1 + b.temper * 1.3);
        // Picking a fight for no reason is a twilight thing too. An animal squaring up to a
        // neighbour at midday, unprovoked and not hungry, is exactly the restlessness that made
        // the old reef tiring, so the odds of it scale with the hour like everything else.
        const spoiling = b.aggression > 0.7 && d < senseR * 0.35 && g.rng() < 0.3 * huntingPressure(g.time);
        const wants = competitor ? (o.controller === 'player' || o.controller === 'bot') : crowded || provoked || spoiling;
        if (wants && d < rivalD) { rival = o; rivalD = d; }
      }
      // Anything of consequence standing in the patch this animal holds, whatever size it is.
      if (b.territory && b.territoryR > 0 && !intruder) {
        const inside = distXZ(o.pos, b.territory) < b.territoryR;
        const worthChasing = (o.controller === 'player' || o.controller === 'bot' || o.controller === 'ambient') && lengthOf(o) > L * 0.5;
        if (inside && worthChasing && band !== 'giant' && band !== 'threat') intruder = o;
      }
    }
    // How long this animal will go after a meal before it looks for another. Short through the
    // twilight, when the whole reef is hunting at once; long through the middle of the day, when
    // a fed animal simply gets on with its life. Bots are competitors in a versus match rather
    // than wildlife, so they are always hungry.
    const hungry = competitor || b.hunger > huntInterval(g.time) * (0.7 + b.appetite * 0.6) || a.hp < a.hpMax * 0.45;
    const predatory = !def.diet || (competitor && def.diet !== 'filter');
    const attacker = a.lastHitBy >= 0 ? g.byId(a.lastHitBy) : undefined;
    // Whatever else it was doing, something that just bit it has its attention — whatever size it
    // is, and however badly hurt the animal already is. Fight or flight, always one of the two:
    // there is nothing in the sea that carries on grazing while something eats it. This is the one
    // rule the hour never softens.
    const struck = !!attacker && isAlive(attacker) && a.sinceHit < 4;
    // Which of the two it picks. Anything much bigger is run from, and so is anything at all once
    // the animal has been beaten down or has no fight left in it.
    const outmatched = struck && (bandOf(a, attacker!) === 'giant' || a.hp <= a.hpMax * 0.3 || b.courage <= 0);
    // Running away is only an answer if it works. An animal that has been swimming from something
    // for a couple of seconds and is *still* being bitten by it has not got away, and nothing in
    // the sea keeps holding its line while something chews on it: it turns and fights, whatever
    // the thing is. Without this a routed animal swims in a straight line and takes the whole
    // beating without once answering, which is the one thing a real animal never does.
    const cornered = struck && b.goal === 'flee' && b.target === attacker!.id && b.goalT > 2
      && dist(a.pos, attacker!.pos) < L * 1.6 + lengthOf(attacker!) * 0.6;
    if (cornered) { if (b.goal !== 'fight' || b.target !== attacker!.id) b.goalT = 0; b.goal = 'fight'; b.target = attacker!.id; }
    else if (outmatched && a.controller !== 'bot') { if (b.goal !== 'flee' || b.target !== attacker!.id) b.goalT = 0; b.goal = 'flee'; b.target = attacker!.id; }
    else if (struck) { if (b.goal !== 'fight' || b.target !== attacker!.id) b.goalT = 0; b.goal = 'fight'; b.target = attacker!.id; }
    else if (worst) { if (b.goal !== 'flee') b.goalT = 0; b.goal = 'flee'; b.target = worst.id; }
    // Its own ground comes before a squabble with a neighbour and before feeding. Without this an
    // animal would wander off its patch to bicker and leave the intruder standing in it.
    else if (intruder) { if (b.goal !== 'defend' || b.target !== intruder.id) b.goalT = 0; b.goal = 'defend'; b.target = intruder.id; }
    else if (rival && (a.hp > a.hpMax * 0.35 || a.controller === 'bot')) { if (b.goal !== 'fight') b.goalT = 0; b.goal = 'fight'; b.target = rival.id; }
    // A scavenger goes to the dead rather than making its own. It looks whenever it is hungry,
    // and falls through to wandering when there is nothing to find, which is most of the time.
    else if (def.diet === 'scavenger' && hungry && carrion) { if (b.goal !== 'scavenge') b.goalT = 0; b.goal = 'scavenge'; b.target = carrion.id; }
    // Everything without a diet of its own hunts, and so does anything standing in for a player:
    // a bot picking Wiwaxia still has to compete, and a human in that shell can always bite. Only
    // suspension feeders are left out — their whole living is the bloom, and chasing loses it.
    // Opportunists take a free meal first: a body on the floor is a better proposition than a
    // chase, and a trilobite is in no position to be proud.
    else if (carrion && predatory && hungry && g.rng() < 0.7) { if (b.goal !== 'scavenge') b.goalT = 0; b.goal = 'scavenge'; b.target = carrion.id; }
    else if (prey && hungry && predatory) { if (b.goal !== 'hunt') b.goalT = 0; b.goal = 'hunt'; b.target = prey.id; }
    // Mat feeders used to be allowed to graze only inside the Microbial Flats, which is a fraction
    // of the ground that actually has mats on it — so a grazer that spawned anywhere else simply
    // never ate. They now graze wherever the mats are, and go looking when they are not underfoot.
    else if (def.diet && def.diet !== 'scavenger' && (def.diet === 'filter' || matsNear(a)) && g.rng() < .8) { b.goal = 'graze'; b.target = -1; }
    else if (b.goal !== 'wander' || distXZ(a.pos, b.wanderTo) < 3 || b.goalT > 14) {
      b.goal = 'wander'; b.target = -1; b.goalT = 0;
      // An animal with a patch wanders inside it; everything else roams.
      if (b.territory && b.territoryR > 0) {
        const ang = g.rng() * TAU, r = Math.sqrt(g.rng()) * b.territoryR * 0.75;
        b.wanderTo = { x: b.territory.x + Math.cos(ang) * r, y: a.pos.y, z: b.territory.z + Math.sin(ang) * r };
      } else pickWander(a, b, g.rng, a.controller === 'bot' ? 60 : 32);
    }
  }

  // Holding ground is a leash on every pursuit, not only on driving an intruder out. An animal
  // with a patch goes a little past its edge and no further: once the argument leaves the patch it
  // turns for home whatever its stamina, because an animal that chased across the reef would not
  // be holding anything. Fleeing is never leashed — running off your own ground is the point.
  if (b.territory && b.territoryR > 0 && PURSUITS.has(b.goal)) {
    const leash = b.territoryR * TERRITORY_LEASH;
    const quarry = b.target >= 0 ? g.byId(b.target) : undefined;
    if (!quarry || !isAlive(quarry) || distXZ(quarry.pos, b.territory) > leash) {
      b.goal = 'wander'; b.target = -1; b.goalT = 0; b.wanderTo = { ...b.territory };
    }
  }

  const t = b.target >= 0 ? g.byId(b.target) : undefined;
  if(a.hideMode === 'burrowed' && b.goal !== 'flee') out.ability = true;
  switch (b.goal) {
    case 'flee': {
      if (!t || !isAlive(t) || (b.courage > 0.6 && b.goalT > 12)) { b.goal = 'wander'; b.goalT = 0; break; }
      const away = norm(sub(a.pos, t.pos));
      let dir: Vec3 = { ...away };
      const cover = g.nearestCover(a.pos, L, 30);
      if (cover && dot(norm(sub(cover.pos, a.pos)), away) > -0.3) {
        const tc = norm(sub(cover.pos, a.pos));
        dir = norm({ x: away.x + tc.x * 1.4, y: away.y * 0.4 + tc.y, z: away.z + tc.z * 1.4 });
        // Hide and hold still — but only while hiding is still worth anything. Sitting motionless
        // in a plant with something already biting you is not cover, it is standing there taking it.
        if (dist(a.pos, cover.pos) < cover.radius * 0.5 && a.sinceHit > 2) { out.worldMove = v3(); out.burst = 0; return out; }
      }
      out.worldMove = dir; out.burst = a.stamina > 25 ? 1 : 0;
      if (a.hideMode === 'none' && a.hideCd <= 0 && a.stamina > 10 && (def.ability === 'tailFlick' || def.ability === 'burrow' || def.ability === 'enroll' || def.ability === 'shellUp' || ['ribbonSlip', 'sedimentDive', 'combCruise', 'adhesiveGlide', 'bellCorral'].includes(def.ability)) && dist(a.pos, t.pos) < L * 3) out.ability = true;
      if(out.ability) out.burst = 0;
      if(a.hideMode === 'burrowed') { out.worldMove = v3(); out.burst = 0; }
      else if(a.hideMode !== 'none') out.burst = 0;
      break;
    }
    case 'hunt': {
      if (!t || !isAlive(t) || isHidden(t)) { b.goal = 'wander'; b.target = -1; break; }
      if ((peaceful(t.pos) && a.lastHitBy !== t.id) || (RULES?.sanctuary(a, t) && a.lastHitBy !== t.id)) { b.goal = 'wander'; b.target = -1; b.goalT = 0; pickWander(a, b, g.rng, 30); break; }
      if (b.goalT > 9 || (t.cover > 0.45 && t.stillness > 0.8 && lengthOf(t) < L * 0.7)) { b.goal = 'wander'; b.target = -1; b.goalT = 0; b.hunger = 0; pickWander(a, b, g.rng, 30); break; }
      const d = dist(a.pos, t.pos);
      const predicted = add(t.pos, vscale(t.vel, clamp(d / 8, 0, 0.6)));
      steerToward(a, predicted, out);
      out.burst = d > L * 2.5 && a.stamina > 20 ? 1 : 0;
      if (d < L * 0.9 + lengthOf(t) * 0.4) { if (lengthOf(t) > L * 0.45 && a.state === 'free') out.heavy = true; else out.light = true; }
      if (a.controller === 'bot' && d < L * 3 && def.ability === 'ambushSurge') out.burst = 1;
      break;
    }
    case 'defend': {
      // Driving something off its ground. The animal closes, threatens, and fights if the
      // intruder stays — but the edge of the patch is the edge of the argument. Step outside it
      // and it turns around and goes home, every time, so walking away is always an answer and
      // going in is always the player's own decision.
      const home = b.territory;
      if (!t || !isAlive(t) || !home) { b.goal = 'wander'; b.target = -1; b.goalT = 0; break; }
      // The intruder leaving the patch is handled by the shared leash above; this is the animal
      // simply running out of patience with one that will not leave.
      if (b.goalT > 22) { b.goal = 'wander'; b.target = -1; b.goalT = 0; b.wanderTo = { ...home }; break; }
      const d = dist(a.pos, t.pos);
      const reach = L * 0.7 + lengthOf(t) * 0.35;
      const to = norm(sub(t.pos, a.pos));
      out.lock = true;
      if (d > reach * 1.05) {
        // Close it down, but never far from the middle of the patch: this is a warning-off, not
        // a pursuit, and an animal that abandoned its ground to chase would not be holding it.
        const leash = distXZ(a.pos, home) > b.territoryR ? norm(sub(home, a.pos)) : to;
        out.worldMove = leash;
        out.burst = d > L * 3 && a.stamina > 40 ? 1 : 0;
      } else if (b.reactT <= 0 && a.state === 'free') {
        // In reach: a real fight, but it opens with a shove rather than a killing blow.
        out.worldMove = vscale(to, 0.35);
        out.light = g.rng() < 0.7;
        out.heavy = !out.light && a.stamina > 30;
        b.reactT = b.reaction * 1.6;
      } else out.worldMove = vscale(to, 0.3);
      if (t.state === 'attack' && d < reach * 1.6 && def.canGuard && g.rng() < 0.5) out.guard = true;
      // Losing badly on your own ground is still losing.
      if (a.hp < a.hpMax * 0.3 && a.controller !== 'bot') { b.goal = 'flee'; b.goalT = 0; }
      break;
    }
    case 'fight': {
      // A squabble is between peers, but answering for yourself is not: whatever has its teeth in
      // you is worth biting whether or not it is your own size. Without the second clause an
      // animal struck by something far smaller picked `fight`, failed the band test on the very
      // next tick and went back to wandering — which is what "it just let me hit it" looks like.
      const answering = !!t && a.lastHitBy === t.id && a.sinceHit < 4;
      if (!t || !isAlive(t) || (bandOf(a, t) !== 'rival' && !answering)) { b.goal = 'wander'; b.target = -1; break; }
      // A grumpy animal is defending its personal space, not prosecuting a war. Once whatever
      // crowded it has backed off — and as long as it has not been hit — it lets the matter drop.
      // Without this, being approached once turns an animal into a permanent enemy.
      if (b.temper > 0 && !competitor && a.lastHitBy !== t.id && a.hitFlash <= 0
        && dist(a.pos, t.pos) > L * (2.2 + b.temper * 2.6)) { b.goal = 'wander'; b.target = -1; b.goalT = 0; break; }
      if ((RULES?.sanctuary(a, t) || peaceful(t.pos) || peaceful(a.pos)) && a.lastHitBy !== t.id && a.hitFlash <= 0) { b.goal = 'wander'; b.target = -1; b.goalT = 0; pickWander(a, b, g.rng, 30); break; }
      // An animal that holds ground stops at the edge of it, whoever the quarrel is with. The
      // leash was on `defend` only, so a rolling brawl with a neighbour could still walk a
      // territorial animal clean off its patch — the one thing the whole idea promises it will not do.
      if (b.territory && b.territoryR > 0 && !competitor
        && distXZ(a.pos, b.territory) > b.territoryR * 1.05) { b.goal = 'wander'; b.target = -1; b.goalT = 0; pickWander(a, b, g.rng, 20); break; }
      const d = dist(a.pos, t.pos);
      const reach = L * 0.7 + lengthOf(t) * 0.35;
      out.lock = true;
      // spacing: approach to just inside reach, orbit otherwise
      const to = norm(sub(t.pos, a.pos));
      const side = { x: -to.z, y: 0, z: to.x };
      const orbit = Math.sin(g.time * 0.6 + a.id) > 0 ? 1 : -1;
      if (d > reach * 1.05) { out.worldMove = norm({ x: to.x + side.x * 0.25 * orbit, y: to.y, z: to.z + side.z * 0.25 * orbit }); out.burst = d > L * 3 && a.stamina > 30 ? 1 : 0; }
      else if (a.stamina < a.staminaMax * 0.25) { out.worldMove = vscale(to, -0.8); }
      else out.worldMove = vscale(side, orbit * 0.6);
      // react to enemy wind-ups
      if (t.state === 'attack' && t.stateT < (t.move?.windup ?? 0.3) && d < reach * 1.6 && b.reactT <= 0) {
        const roll = g.rng();
        const skill = a.controller === 'bot' ? 0.7 : 0.4;
        if (roll < skill * 0.3) out.dodge = true;
        else if (roll < skill * 0.8 && def.canGuard) out.guard = true;
        b.reactT = b.reaction * (1.2 + g.rng());
      } else if (t.state === 'attack') {
        if (def.canGuard && g.rng() < 0.5 && t.stateT < 0.4) out.guard = true;
      }
      if (t.state === 'stagger' && d < reach * 1.3) out.heavy = true;
      else if (d < reach && b.reactT <= 0 && a.state === 'free') {
        const roll = g.rng();
        if (roll < 0.55) out.light = true;
        else if (roll < 0.8 && a.stamina > 30) out.heavy = true;
        else if (a.abilityCd <= 0) out.heavy = true;
        b.reactT = b.reaction * 1.5;
      }
      if (a.hp < a.hpMax * 0.3 && a.controller !== 'bot') { b.goal = 'flee'; b.goalT = 0; }
      break;
    }
    case 'scavenge': {
      // Going to a body. Nothing here is a fight: the animal walks up to the carcass and feeds,
      // and gives up the moment somebody else has finished it or it has drifted out of reach.
      if (!t || t.state !== 'dead' || t.eaten >= 1 || b.goalT > 20) { b.goal = 'wander'; b.target = -1; b.goalT = 0; break; }
      const d = dist(a.pos, t.pos);
      const reach = L * 0.6 + lengthOf(t) * 0.4;
      if (d > reach) {
        steerToward(a, t.pos, out, 0.7);
        out.burst = d > L * 5 && a.stamina > 45 ? 1 : 0;
        // A body goes limp and drifts up off the floor, so a bottom-crawler has to leave the
        // bottom to reach one. Crawlers can paddle (see the rise handling in Game.updateActor);
        // it costs stamina, which is the price of a free meal.
        if (t.pos.y > a.pos.y + L * 0.35) out.rise = true;
      } else {
        // In reach: the light attack is what starts eating a corpse (see Game.corpseInReach).
        out.worldMove = vscale(norm(sub(t.pos, a.pos)), 0.15);
        if (a.state === 'free' && b.reactT <= 0) { out.light = true; b.reactT = b.reaction * 2; }
      }
      break;
    }
    case 'graze': {
      if (def.diet === 'filter') {
        const bloom = g.world.blooms.reduce<(typeof g.world.blooms)[number] | undefined>((best, v) => !best || dist(a.pos, v.pos) < dist(a.pos, best.pos) ? v : best, undefined);
        if (bloom) {
          steerToward(a, bloom.pos, out, dist(a.pos, bloom.pos) < bloom.radius * .7 ? .25 : .65);
          if (a.abilityCd <= 0 && dist(a.pos, bloom.pos) < bloom.radius) out.heavy = true;
        }
      } else {
        // Follow the mat uphill. Grazing pays by how thick the mat underneath is, so an animal
        // that just crawls in a straight line starves on bare mud however long it grazes for.
        const here = microbialAt(a.pos.x, a.pos.z);
        if (here > .45) out.worldMove = vscale(heading(a.yaw), .12);       // good ground: stay on it
        else {
          const step = 14 + lengthOf(a) * 3;
          let bestDir: Vec3 | undefined, best = here;
          for (let k = 0; k < 6; k++) {
            const ang = (k / 6) * TAU + a.yaw;
            const m = microbialAt(a.pos.x + Math.cos(ang) * step, a.pos.z + Math.sin(ang) * step);
            if (m > best) { best = m; bestDir = { x: Math.cos(ang), y: 0, z: Math.sin(ang) }; }
          }
          out.worldMove = bestDir ? vscale(bestDir, .55) : vscale(heading(a.yaw), .25);
        }
        if (def.diet === 'deposit') out.sink = true;
        if (def.ability === 'adhesiveGlide') out.guard = true;
      }
      if (b.goalT > (def.diet === 'filter' ? 6 : 12)) { b.goal = 'wander'; pickWander(a, b, g.rng, 20); }
      break;
    }
    default: {
      steerToward(a, b.wanderTo, out, 0.55);
      break;
    }
  }
  // ...and the same leash on the steering, so no goal can walk the animal off its ground by
  // degrees. Past the edge it heads home at a cruise; a sprint is for crossing your own water.
  if (b.territory && b.territoryR > 0 && PURSUITS.has(b.goal) && distXZ(a.pos, b.territory) > b.territoryR * TERRITORY_LEASH) {
    const home = norm(sub(b.territory, a.pos));
    out.worldMove = { x: home.x, y: 0, z: home.z };
    out.burst = 0;
  }
  return out;
}

/** The bones a hungry giant would head for: the nearest set it could reach without leaving the area. */
function nearestBones(g: AiWorld, a: Actor) {
  let best: { pos: Vec3; radius: number } | undefined, bd = 260;
  for (const m of g.world.landmarks) {
    if (m.kind !== 'bones') continue;
    const d = distXZ(a.pos, m.pos);
    if (d < bd) { bd = d; best = m; }
  }
  return best;
}

export function thinkGiant(g: AiWorld, a: Actor, b: BrainState, dt: number): InputFrame {
  const out = emptyInput();
  const def = creature(a.creature);
  const L = lengthOf(a);
  b.goalT += dt; b.thinkT -= dt; b.hunger += dt;
  if (a.eats !== b.lastEats) { b.lastEats = a.eats; b.hunger = 0; }
  if (b.thinkT <= 0) { b.thinkT = 0.1; updateDetection(g, a, b, 0.1); }
  const cur = b.target >= 0 ? g.byId(b.target) : undefined;
  const curScore = cur ? (b.detection.get(cur.id) ?? 0) : 0;
  // Giants cruise high and only come down when hungry, or when something practically swims into
  // their mouth. Noticing is telegraphed before any dive.
  //
  // How often that is follows the hour, like everything else in the reef — and because giants are
  // what "something is hunting me" actually means to a player, this is the setting that decides
  // how the day *feels*. Through the middle of the day one comes down about as rarely as it always
  // did; at dusk and dawn it is every twenty seconds or so, and the whole sea knows it.
  const hungry = b.hunger > (14 + (a.id % 6)) / Math.max(0.12, huntingPressure(g.time));
  const shadow = a.controller === 'shadow';

  // Routed: enough bites from something smaller and even a giant backs off for a while.
  if (b.courage <= 0 && b.goal !== 'flee' && a.lastHitBy >= 0) { b.goal = 'flee'; b.goalT = 0; b.target = a.lastHitBy; }
  if (b.goal !== 'hunt' && b.goal !== 'sleep' && b.goal !== 'notice' && b.goal !== 'flee') {
    const found = bestDetected(b, 1, g);
    if (found) {
      const score = b.detection.get(found.id) ?? 0;
      if (score >= 2.8 || (hungry && score >= 2)) { b.goal = 'hunt'; b.target = found.id; b.goalT = 0; b.lastSeen = { ...found.pos }; }
      else if (b.goal !== 'search') { b.goal = 'notice'; b.target = found.id; b.goalT = 0; }
    }
  }
  switch (b.goal) {
    case 'notice': {
      // Turn toward it and hang in the water: the player sees the head swing round and the eye fill.
      if (cur && isAlive(cur)) { const to = norm(sub(cur.pos, a.pos)); out.worldMove = vscale({ x: to.x, y: 0, z: to.z }, 0.18); }
      if (cur && isAlive(cur) && (curScore >= 2.8 || (hungry && curScore >= 2))) { b.goal = 'hunt'; b.goalT = 0; b.lastSeen = { ...cur.pos }; break; }
      if (b.goalT > 3 || !cur || !isAlive(cur) || curScore < 0.6) {
        b.goal = 'patrol'; b.goalT = 0; b.target = -1;
        if (cur) b.detection.set(cur.id, Math.min(curScore, 0.8)); // it looked, it lost interest; do not re-notice instantly
      }
      break;
    }
    case 'hunt': {
      if (!cur || !isAlive(cur) || curScore < 0.5 || isHidden(cur) || (peaceful(cur.pos) && !shadow)) {
        b.goal = 'search'; b.goalT = 0; b.target = -1; if (cur) b.detection.set(cur.id, Math.min(curScore, 0.4)); break;
      }
      b.lastSeen = { ...cur.pos };
      const d = dist(a.pos, cur.pos);
      // cannot get its head into dense cover: circles, then gives up
      if (cur.cover > 0.45 && d < L * 1.2) { b.goalT += dt * 2; const side = { x: -(cur.pos.z - a.pos.z), y: 0, z: cur.pos.x - a.pos.x }; out.worldMove = vscale(norm(side), 0.5); if (b.goalT > 14) { b.goal = 'search'; b.goalT = 0; b.target = -1; b.detection.set(cur.id, 0.3); } break; }
      const predicted = add(cur.pos, vscale(cur.vel, clamp(d / 10, 0, 0.6)));
      if (shadow) predicted.y = Math.max(predicted.y, LIGHT_WINDOW_Y - 1);
      steerToward(a, predicted, out);
      out.burst = d > L * 1.5 ? 1 : 0;
      // A giant's bite is the heavy: a visible wind-up you can dash out of.
      if (d < L * 0.8 + lengthOf(cur) * 0.4 && a.state === 'free') out.heavy = true;
      if (b.goalT > 18) { b.goal = 'patrol'; b.target = -1; b.goalT = 0; b.hunger = 20; }
      break;
    }
    case 'flee': {
      const from = b.target >= 0 ? g.byId(b.target) : undefined;
      if (from && isAlive(from)) { const away = norm(sub(a.pos, from.pos)); out.worldMove = { x: away.x, y: 0.25, z: away.z }; out.burst = 1; }
      if (b.goalT > 16 || !from || !isAlive(from)) { b.goal = 'patrol'; b.goalT = 0; b.target = -1; b.courage = 0.7; b.hunger = 0; }
      break;
    }
    case 'search': {
      const found = bestDetected(b, 1.6, g);
      if (found && (hungry || (b.detection.get(found.id) ?? 0) >= 2.8)) { b.goal = 'hunt'; b.target = found.id; b.goalT = 0; break; }
      if (b.lastSeen) steerToward(a, add(b.lastSeen, { x: Math.sin(g.time * 0.8) * 6, y: 2, z: Math.cos(g.time * 0.7) * 6 }), out, 0.5);
      if (b.goalT > 5) { b.goal = 'patrol'; b.goalT = 0; b.hunger = Math.min(b.hunger, 40); }
      break;
    }
    case 'sleep': {
      out.worldMove = v3();
      if (b.goalT > 25) { b.goal = 'patrol'; b.goalT = 0; }
      break;
    }
    default: {
      // A dead giant on the floor is the one thing that pulls a live one off its route. It is why
      // the bones are worth finding and why standing on them is a bad idea.
      const carrion = hungry && !shadow ? nearestBones(g, a) : undefined;
      if (carrion) {
        steerToward(a, { x: carrion.pos.x, y: carrion.pos.y + L * 0.4, z: carrion.pos.z }, out, 0.6);
        if (distXZ(a.pos, carrion.pos) < carrion.radius + L * 0.5) { b.hunger = 25; b.goal = 'sleep'; b.goalT = 0; }
        break;
      }
      const route = b.patrol ?? [b.home];
      const wp = route[b.patrolIndex % route.length];
      steerToward(a, wp, out, 0.45);
      if (distXZ(a.pos, wp) < L * 1.2) { b.patrolIndex = (b.patrolIndex + 1) % route.length; if (b.patrolIndex === 0 && g.rng() < 0.35 && !shadow) { b.goal = 'sleep'; b.goalT = 0; } }
      break;
    }
  }
  if (shadow && out.worldMove) out.worldMove.y = clamp((SURFACE_Y - 3 - a.pos.y) * 0.5, -0.4, 0.4);
  return out;
}

export function think(g: AiWorld, a: Actor, dt: number): InputFrame {
  const b = a.brain!;
  scratchDir.x = 0;
  switch (b.kind) {
    case 'swarm': {
      // Boids only need ~12 Hz; cache the frame in between (staggered by id).
      b.thinkT -= dt;
      if (b.cached && b.thinkT > 0) return b.cached;
      b.thinkT = 1 / 12;
      b.cached = thinkSwarm(g, a, b, dt);
      return b.cached;
    }
    case 'giant': return thinkGiant(g, a, b, dt);
    default: return thinkNeeds(g, a, b, dt);
  }
}
