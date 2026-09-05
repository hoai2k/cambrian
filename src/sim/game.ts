import { add, clamp, damp, dist, distXZ, dot, heading, len3, lerp, makeRng, norm, scale as vscale, sub, TAU, v3, wrapAngle, yawOf, type Rng, type Vec3 } from '../shared/math';
import { applyScaleStats, bandOf, bodyRadius, canAct, clearanceOf, isAlive, isHidden, isInvulnerable, lengthOf, makeActor, massOf, speedFactor, staminaCost } from './actors';
import { makeBrain, think, type AiWorld } from './ai';
import { applyHit, kill, type HitContext } from './combat';
import { creature, CREATURE_IDS, type CreatureId, type MoveDef } from './creatures';
import { SpatialHash } from './spatial';
import { emptyInput, TIER_NEED, TIER_SCALE, type Actor, type InputFrame, type Mode, type PlayerSetup, type Prompt, type SiltCloud, type Tier, type WorldEvent } from './types';
import { biomeAt, channelDistance, coverAt, generateWorld, groundHeight, LIGHT_WINDOW_Y, microbialAt, NURSERIES, nurseryFactor, resolveStatic, sampleCurrent, sampleHeight, SURFACE_Y, WORLD_RADIUS, type Boulder, type Cover, type WorldData } from './world';

export interface PlayerProgress {
  prompts: Prompt[];
  flags: Set<string>;
  deaths: number;
  apexT: number;
  message: string;
}

export interface GameState {
  status: 'playing' | 'won' | 'lost';
  winner: number;
  message: string;
}

const SNACK_SCHOOLS: { creature: CreatureId; scale: number; count: number }[] = [
  // first eight live in the four nurseries: one swimmer school and one ground school each
  { creature: 'waptia', scale: 0.085, count: 16 }, { creature: 'canadia', scale: 0.09, count: 12 },
  { creature: 'waptia', scale: 0.09, count: 14 }, { creature: 'opabinia', scale: 0.09, count: 10 },
  { creature: 'marrella', scale: 0.085, count: 14 }, { creature: 'olenoides', scale: 0.075, count: 12 },
  { creature: 'hallucigenia', scale: 0.085, count: 10 }, { creature: 'marrella', scale: 0.08, count: 14 },
  // open reef
  { creature: 'waptia', scale: 0.1, count: 12 }, { creature: 'canadia', scale: 0.095, count: 10 },
  { creature: 'olenoides', scale: 0.08, count: 10 }, { creature: 'marrella', scale: 0.09, count: 12 },
  { creature: 'waptia', scale: 0.16, count: 8 }, { creature: 'marrella', scale: 0.15, count: 8 },
  { creature: 'canadia', scale: 0.17, count: 7 }, { creature: 'olenoides', scale: 0.14, count: 8 },
];

export class Game implements AiWorld {
  world: WorldData;
  actors: Actor[] = [];
  private idMap = new Map<number, Actor>();
  hash = new SpatialHash<Actor>(10);
  events: WorldEvent[] = [];
  silt: SiltCloud[] = [];
  time = 0;
  rng: Rng;
  nextId = 1;
  mode: Mode;
  players: Actor[] = [];
  progress: PlayerProgress[] = [];
  state: GameState = { status: 'playing', winner: -1, message: '' };
  private scratchActors: Actor[] = [];
  private scratchBoulders: Boulder[] = [];
  private scratchCover: Cover[] = [];
  private ambientTimer = 0;
  private schoolCount = 0;
  private hitCtx: HitContext;
  setups: PlayerSetup[];

  constructor(mode: Mode, setups: PlayerSetup[], seed = 5052026) {
    this.mode = mode;
    this.setups = setups;
    this.rng = makeRng(seed ^ 0x9e37);
    this.world = generateWorld(seed);
    this.hitCtx = { events: this.events, byId: (id) => this.idMap.get(id), time: 0 };
    setups.forEach((s, i) => {
      const startScale = mode === 'rise' ? TIER_SCALE[0] : mode === 'hunted' ? (i === 0 ? 3.0 : TIER_SCALE[1]) : mode === 'reef' ? TIER_SCALE[2] : TIER_SCALE[1];
      const nursery = NURSERIES[i % NURSERIES.length];
      const a = this.spawn(s.creature, 'player', this.spawnPoint(nursery, s.creature, startScale, i), startScale, i);
      a.yaw = Math.atan2(-nursery.x, -nursery.z);
      this.players.push(a);
      this.progress.push({ prompts: [], flags: new Set(), deaths: 0, apexT: 0, message: '' });
    });
    if (mode === 'frenzy' || mode === 'hunted') {
      // Fill to 4 with bots
      for (let i = setups.length; i < 4; i++) {
        const c = CREATURE_IDS[Math.floor(this.rng() * CREATURE_IDS.length)];
        const nursery = NURSERIES[i % NURSERIES.length];
        const bot = this.spawn(c, 'bot', this.spawnPoint(nursery, c, TIER_SCALE[1], i), TIER_SCALE[1]);
        bot.brain = makeBrain('needs', nursery, this.rng, { aggression: 0.9, reaction: 0.2, parrySkill: 0.55 });
      }
    }
    this.populate();
  }

  byId(id: number) { return this.idMap.get(id); }
  nearby(pos: Vec3, r: number) {
    const out = this.hash.query(pos.x, pos.z, r, this.scratchActors);
    return out.filter((a) => dist(a.pos, pos) <= r);
  }
  nearestCover(pos: Vec3, length: number, r: number) {
    let best: Cover | undefined, bd = Infinity;
    for (const c of this.world.coverHash.query(pos.x, pos.z, r, this.scratchCover)) {
      if (c.maxLength < length) continue;
      const d = dist(pos, c.pos);
      if (d < bd && d < r) { bd = d; best = c; }
    }
    return best;
  }

  private spawnPoint(center: Vec3, c: CreatureId, s: number, index = 0): Vec3 {
    const def = creature(c);
    const ang = index * 1.7 + this.rng() * 0.8, d = 3 + this.rng() * 6;
    const x = center.x + Math.cos(ang) * d, z = center.z + Math.sin(ang) * d;
    const g = groundHeight(this.world, x, z, this.scratchBoulders);
    const L = def.adultLength * s;
    return { x, y: def.ground ? g + L * 0.13 : g + 1.2 + L * 0.5, z };
  }

  spawn(c: CreatureId, controller: Actor['controller'], pos: Vec3, scale: number, player = -1): Actor {
    const a = makeActor(this.nextId++, c, controller, pos, scale, player);
    this.actors.push(a);
    this.idMap.set(a.id, a);
    return a;
  }

  private remove(a: Actor) {
    const i = this.actors.indexOf(a);
    if (i >= 0) this.actors.splice(i, 1);
    this.idMap.delete(a.id);
  }

  /** Initial ecosystem. */
  private populate() {
    // Snack schools
    SNACK_SCHOOLS.forEach((s, i) => this.spawnSchool(s.creature, s.scale, s.count, i));
    // Ambient adults
    for (let i = 0; i < 26; i++) this.spawnAmbient(true);
    // Giants
    const chanA = Math.atan2(Math.sin(0.62), Math.cos(0.62));
    const route = (cx: number, cz: number, r: number, n: number, y: number, tilt = 0) =>
      Array.from({ length: n }, (_, i) => { const a = (i / n) * TAU + tilt; return { x: cx + Math.cos(a) * r, y, z: cz + Math.sin(a) * r }; });
    const chanRoute = Array.from({ length: 8 }, (_, i) => {
      const t = (i / 8) * 2 - 1; const along = t * (WORLD_RADIUS - 50);
      const side = Math.sin(i * 2.4) * 8;
      return { x: Math.cos(chanA) * along - Math.sin(chanA) * side, y: 4 + Math.abs(Math.sin(i)) * 6, z: Math.sin(chanA) * along + Math.cos(chanA) * side };
    });
    const g1 = this.spawn('anomalocaris', 'giant', { ...chanRoute[0] }, 3.5);
    g1.brain = makeBrain('giant', chanRoute[0], this.rng, { patrol: chanRoute });
    const bRoute = route(110, 100, 45, 6, 3);
    const g2 = this.spawn('olenoides', 'giant', { x: 110, y: sampleHeight(110, 55) + 1.5, z: 55 }, 3.0);
    g2.brain = makeBrain('giant', bRoute[0], this.rng, { patrol: bRoute });
    const fRoute = route(-100, 100, 40, 6, 5, 1);
    const g3 = this.spawn('opabinia', 'giant', { ...fRoute[0] }, 2.8);
    g3.brain = makeBrain('giant', fRoute[0], this.rng, { patrol: fRoute });
    const sRoute = route(0, 0, WORLD_RADIUS - 70, 10, SURFACE_Y - 3);
    const shadow = this.spawn('anomalocaris', 'shadow', { ...sRoute[0] }, 6.0);
    shadow.brain = makeBrain('giant', sRoute[0], this.rng, { patrol: sRoute });
  }

  private spawnSchool(c: CreatureId, s: number, count: number, i: number) {
    const def = creature(c);
    let home: Vec3;
    if (i < 8) home = { ...NURSERIES[i % NURSERIES.length] };
    else {
      const a = this.rng() * TAU, d = 30 + Math.sqrt(this.rng()) * (WORLD_RADIUS - 70);
      home = { x: Math.cos(a) * d, y: 0, z: Math.sin(a) * d };
    }
    const g = sampleHeight(home.x, home.z);
    home.y = def.ground ? g : (i % 4 === 1 ? LIGHT_WINDOW_Y : g + 2.5 + this.rng() * 5);
    const schoolId = this.schoolCount++;
    for (let k = 0; k < count; k++) {
      const p = { x: home.x + (this.rng() - 0.5) * 6, y: home.y + (this.rng() - 0.5) * 2, z: home.z + (this.rng() - 0.5) * 6 };
      if (def.ground) p.y = groundHeight(this.world, p.x, p.z, this.scratchBoulders) + 0.1;
      const a = this.spawn(c, 'swarm', p, s);
      a.brain = makeBrain('swarm', home, this.rng, { schoolId });
    }
  }

  private maxPlayerTier(): Tier {
    let t: Tier = 0;
    for (const p of this.players) if (p.tier > t) t = p.tier;
    return t;
  }

  private spawnAmbient(initial = false) {
    const c = CREATURE_IDS[Math.floor(this.rng() * CREATURE_IDS.length)];
    const def = creature(c);
    const tierBias = this.maxPlayerTier();
    // ambient scale spread widens as the players grow
    const base = 0.28 + this.rng() * (0.5 + tierBias * 0.5);
    const s = clamp(base * (this.rng() < 0.15 ? 1.6 : 1), 0.28, 2.4);
    let pos: Vec3 | undefined;
    for (let tries = 0; tries < 20 && !pos; tries++) {
      const a = this.rng() * TAU, d = 20 + Math.sqrt(this.rng()) * (WORLD_RADIUS - 45);
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (!initial && this.players.some((p) => distXZ(p.pos, { x, y: 0, z }) < 55)) continue;
      if (nurseryFactor(x, z) > 0.2 && s > 0.45) continue;
      if (biomeAt(x, z) === 'nursery' && s > 0.6) continue;
      const g = groundHeight(this.world, x, z, this.scratchBoulders);
      pos = { x, y: def.ground ? g + def.adultLength * s * 0.13 : g + 1.5 + this.rng() * 8, z };
    }
    if (!pos) return;
    const a = this.spawn(c, 'ambient', pos, s);
    a.brain = makeBrain('needs', pos, this.rng);
  }

  /** Cover (0..1) for an actor including temporary silt. */
  coverFor(a: Actor): number {
    let c = coverAt(this.world, a.pos, lengthOf(a), this.scratchCover);
    for (const s of this.silt) if (dist(s.pos, a.pos) < s.radius) c = Math.max(c, 0.75);
    if (isHidden(a)) c = 1;
    return c;
  }

  /** Main fixed step. `inputs` maps player index → InputFrame. */
  step(dt: number, inputs: Map<number, InputFrame>) {
    if (this.state.status !== 'playing') return;
    this.time += dt; this.hitCtx.time = this.time;
    this.hash.rebuild(this.actors);

    for (const a of this.actors) {
      if (a.state === 'dead') { this.updateCorpse(a, dt); continue; }
      const input = a.controller === 'player' ? (inputs.get(a.player) ?? emptyInput()) : think(this, a, dt);
      this.updateActor(a, input, dt);
    }
    this.resolveActorOverlap();
    this.updateSilt(dt);
    this.updatePopulation(dt);
    this.updateModes(dt);
    for (const a of this.actors) if (a.state === 'dead' && a.corpseT > 45 && a.controller !== 'player' && a.controller !== 'bot') this.remove(a);
    for (const a of this.actors) if (a.state === 'dead' && a.eaten >= 1 && a.controller !== 'player' && a.controller !== 'bot') this.remove(a);
  }

  private updateCorpse(a: Actor, dt: number) {
    a.corpseT += dt; a.stateT += dt;
    const def = creature(a.creature);
    const floor = groundHeight(this.world, a.pos.x, a.pos.z, this.scratchBoulders) + clearanceOf(a) * 0.5;
    const cur = sampleCurrent(v3(), a.pos.x, a.pos.y, a.pos.z, this.time);
    a.vel.x = damp(a.vel.x, cur.x * 0.5, 1.5, dt); a.vel.z = damp(a.vel.z, cur.z * 0.5, 1.5, dt);
    a.vel.y = damp(a.vel.y, a.pos.y > floor ? -0.8 : 0, 1.2, dt);
    a.pos.x += a.vel.x * dt; a.pos.y = Math.max(floor, a.pos.y + a.vel.y * dt); a.pos.z += a.vel.z * dt;
    a.bank = damp(a.bank, def.ground ? 0 : Math.PI * 0.9, 1.5, dt);
    a.hitFlash = Math.max(0, a.hitFlash - dt);
    if ((a.controller === 'player' || a.controller === 'bot')) {
      a.respawnT += dt;
      if (a.respawnT > (a.controller === 'player' ? 4.5 : 8)) this.respawn(a);
    }
  }

  private respawn(a: Actor) {
    const def = creature(a.creature);
    // death penalty: lose a tier, keep half progress
    if (a.tier > 0 && this.mode !== 'reef') {
      const frac = a.nutrition / TIER_NEED[a.tier];
      a.tier = (a.tier - 1) as Tier; a.scale = TIER_SCALE[a.tier];
      a.nutrition = TIER_NEED[a.tier] * clamp(frac * 0.5 + 0.35, 0, 0.9);
    } else a.nutrition *= 0.5;
    if (this.mode === 'hunted' && a.player === 0) { a.scale = 3.0; a.tier = 3; }
    applyScaleStats(a, false);
    a.stamina = a.staminaMax; a.poise = a.poiseMax;
    let nursery = NURSERIES[0], bd = Infinity;
    for (const n of NURSERIES) {
      // prefer a nursery with no giant nearby and not too far
      let danger = 0;
      for (const g of this.actors) if ((g.controller === 'giant') && isAlive(g) && distXZ(g.pos, n) < 60) danger += 1;
      const score = danger * 100 + distXZ(a.pos, n) * 0.2;
      if (score < bd) { bd = score; nursery = n; }
    }
    a.pos = this.spawnPoint(nursery, a.creature, a.scale, a.player);
    a.vel = v3(); a.state = 'free'; a.stateT = 0; a.respawnT = 0; a.corpseT = 0; a.eaten = 0;
    a.spawnProtect = 3; a.hitFlash = 0; a.abilityActive = false; a.abilityCd = 0; a.lockTarget = -1; a.hunted = 0; a.hunterId = -1;
    a.yaw = Math.atan2(-nursery.x, -nursery.z);
    void def;
  }

  private updateActor(a: Actor, input: InputFrame, dt: number) {
    const def = creature(a.creature);
    const L = lengthOf(a);
    const sf = speedFactor(a.scale);
    const justLight = input.light && !a.prev.light, justHeavy = input.heavy && !a.prev.heavy, justAbility = input.ability && !a.prev.ability;
    const justDodge = input.dodge && !a.prev.dodge, justGuard = input.guard && !a.prev.guard, justLock = input.lock && !a.prev.lock;
    const justSense = input.sense && !a.prev.sense, justRise = input.rise && !a.prev.rise;

    // Timers
    a.stateT += dt;
    a.iframes = Math.max(0, a.iframes - dt);
    a.spawnProtect = Math.max(0, a.spawnProtect - dt);
    a.hitFlash = Math.max(0, a.hitFlash - dt);
    a.hitStop = Math.max(0, a.hitStop - dt);
    a.abilityCd = Math.max(0, a.abilityCd - dt);
    a.senseCd = Math.max(0, a.senseCd - dt);
    a.senseT = Math.max(0, a.senseT - dt);
    a.burstT = Math.max(0, a.burstT - dt);
    a.comboT = Math.max(0, a.comboT - dt);
    a.dodgeTapT = Math.max(0, a.dodgeTapT - dt);
    a.exhausted = Math.max(0, a.exhausted - dt);
    if (a.comboT === 0) a.combo = 0;
    a.seen = Math.max(0, a.seen - dt);
    if (a.poise < a.poiseMax && a.state !== 'stagger') a.poise = Math.min(a.poiseMax, a.poise + a.poiseMax * dt / 3);
    a.cover = this.coverFor(a);

    // Stamina
    const speed = len3(a.vel);
    const bursting = input.burst > 0.1 && a.stamina > 0 && a.state !== 'guard' && a.exhausted === 0;
    const freeBurst = a.burstT > 0;
    if (bursting && !freeBurst) a.stamina -= 22 * input.burst * dt;
    else if (a.state === 'guard') a.stamina -= 3 * dt;
    else a.stamina = Math.min(a.staminaMax, a.stamina + (speed < 0.4 ? 24 : 14) * dt * (a.state === 'free' ? 1 : 0.5));
    if (a.stamina <= 0) { a.stamina = 0; if (a.exhausted === 0) a.exhausted = 1.6; }

    // Movement: desired direction
    let dir: Vec3 = v3();
    let mag = 0;
    const locked = a.lockTarget >= 0 ? this.idMap.get(a.lockTarget) : undefined;
    if (input.worldMove) { dir = { ...input.worldMove }; mag = clamp(len3(dir), 0, 1); if (mag > 0) dir = vscale(dir, 1 / mag); }
    else {
      const sx = input.mx, sy = input.my;
      mag = clamp(Math.hypot(sx, sy), 0, 1);
      if (mag > 0) {
        let fwd: Vec3, right: Vec3;
        if (locked && isAlive(locked)) {
          const to = norm(sub(locked.pos, a.pos));
          fwd = def.ground ? norm({ x: to.x, y: 0, z: to.z }) : to;
          right = norm({ x: fwd.z, y: 0, z: -fwd.x });
        } else {
          const cy = input.camYaw, cp = def.ground ? 0 : input.camPitch;
          fwd = { x: Math.sin(cy) * Math.cos(cp), y: -Math.sin(cp), z: Math.cos(cy) * Math.cos(cp) };
          right = { x: Math.cos(cy), y: 0, z: -Math.sin(cy) };
        }
        dir = norm({ x: fwd.x * sy + right.x * sx, y: fwd.y * sy, z: fwd.z * sy + right.z * sx });
      }
    }
    if (def.ground) dir.y = 0;
    const controllable = a.state === 'free' || a.state === 'guard' || (a.state === 'ability' && (def.ability === 'shellUp' || def.ability === 'bristleFlare' || def.ability === 'ambushSurge'));
    const slowMult = a.state === 'guard' ? 0.45 : (a.abilityActive && def.ability === 'shellUp') ? 0.35 : a.exhausted > 0 ? 0.7 : 1;
    const burstMult = controllable && (bursting || freeBurst) ? (1 + (def.burst - 1) * (freeBurst ? 1.25 : input.burst) * (a.controller === 'swarm' ? 0.55 : 1)) : 1;
    const cruise = def.speed * sf * slowMult * (a.controller === 'swarm' ? 0.62 : 1);
    const cur = sampleCurrent(v3(), a.pos.x, a.pos.y, a.pos.z, this.time);
    const curK = def.ground ? 0.08 : 0.55;
    let desired: Vec3 = v3(cur.x * curK, cur.y * curK, cur.z * curK);
    if (controllable && mag > 0) {
      desired.x += dir.x * mag * cruise * burstMult;
      desired.y += dir.y * mag * cruise * burstMult;
      desired.z += dir.z * mag * cruise * burstMult;
    }
    if (controllable && !def.ground) {
      if (input.rise) desired.y += 2.6 * sf;
      if (input.sink) desired.y -= 2.6 * sf;
    }
    let rate = def.agility;
    if (mag === 0 && controllable) rate = def.glide; // glide out
    if (a.state === 'stagger' || a.state === 'grabbed') { desired = v3(); rate = 2.5; }
    if (a.state === 'dodge' || a.state === 'attack' || a.state === 'eating' || a.state === 'moult' || a.state === 'grabbing' || a.state === 'parry') rate = a.state === 'dodge' ? 1.8 : 3;
    if (a.state === 'ability' && (def.ability === 'burrow' || def.ability === 'anchor')) { desired = v3(); rate = 8; }
    if (a.hitStop > 0) rate = 0;
    a.vel.x = damp(a.vel.x, desired.x, rate, dt);
    a.vel.y = damp(a.vel.y, desired.y, rate, dt);
    a.vel.z = damp(a.vel.z, desired.z, rate, dt);

    // Lunge during attacks
    if (a.state === 'attack' && a.move) {
      const m = a.move; const wa = m.windup + m.active;
      if (a.stateT < wa && a.hitStop === 0) {
        const lungeSpeed = (m.lunge * L) / wa;
        const h = heading(a.yaw);
        const pitchDir = def.ground ? 0 : -Math.sin(a.pitch);
        a.pos.x += h.x * lungeSpeed * dt; a.pos.z += h.z * lungeSpeed * dt; a.pos.y += pitchDir * lungeSpeed * dt * 0.6;
      }
    }
    if (a.state === 'ability' && def.ability === 'enroll' && def.ground) {
      // roll downhill and with the current
      const gx = sampleHeight(a.pos.x + 0.5, a.pos.z) - sampleHeight(a.pos.x - 0.5, a.pos.z);
      const gz = sampleHeight(a.pos.x, a.pos.z + 0.5) - sampleHeight(a.pos.x, a.pos.z - 0.5);
      a.vel.x += (-gx * 6 + cur.x * 2 + dir.x * 3 * mag) * dt; a.vel.z += (-gz * 6 + cur.z * 2 + dir.z * 3 * mag) * dt;
      a.roll += len3(a.vel) * dt / (L * 0.25);
    } else a.roll = damp(a.roll, 0, 6, dt);

    // Integrate
    if (a.hitStop === 0) {
      a.pos.x += a.vel.x * dt; a.pos.y += a.vel.y * dt; a.pos.z += a.vel.z * dt;
    }

    // Hop (crawlers)
    if (def.ground) {
      if (justRise && a.grounded && controllable && a.stamina > 8) { a.hopVel = 5.5 * Math.sqrt(sf); a.grounded = false; a.stamina -= 8; a.iframes = Math.max(a.iframes, 0.12); }
      if (!a.grounded) { a.pos.y += a.hopVel * dt; a.hopVel -= 16 * dt; }
    }

    // Static collision
    const hitWall = resolveStatic(this.world, a.pos, bodyRadius(a), this.scratchBoulders);
    if (hitWall && !def.ground) { a.vel.x *= 0.6; a.vel.z *= 0.6; }
    const floor = groundHeight(this.world, a.pos.x, a.pos.z, this.scratchBoulders) + clearanceOf(a);
    if (def.ground) {
      if (a.grounded || a.pos.y <= floor) { a.pos.y = a.grounded ? damp(a.pos.y, floor, 18, dt) : floor; if (!a.grounded && a.hopVel < 0) { a.grounded = true; a.hopVel = 0; } }
      if (a.pos.y < floor) a.pos.y = floor;
    } else {
      if (a.pos.y < floor) { a.pos.y = floor; if (a.vel.y < 0) a.vel.y *= -0.2; }
      const ceiling = SURFACE_Y - 0.8 - L * 0.2;
      if (a.pos.y > ceiling) { a.pos.y = ceiling; if (a.vel.y > 0) a.vel.y = 0; }
    }

    // Orientation
    const hv = Math.hypot(a.vel.x, a.vel.z);
    let targetYaw = a.yaw;
    if (locked && isAlive(locked) && (a.state === 'free' || a.state === 'guard' || a.state === 'attack')) targetYaw = yawOf(sub(locked.pos, a.pos));
    else if (hv > 0.35 && a.state !== 'grabbed') targetYaw = yawOf(a.vel);
    const dy = wrapAngle(targetYaw - a.yaw);
    const turn = clamp(dy * 6, -def.turnRate * (a.state === 'attack' ? 0.5 : 1) * (1 + hv * 0.05), def.turnRate * (a.state === 'attack' ? 0.5 : 1) * (1 + hv * 0.05));
    const prevYaw = a.yaw;
    a.yaw = wrapAngle(a.yaw + turn * dt);
    const turnRate = wrapAngle(a.yaw - prevYaw) / Math.max(dt, 1e-4);
    a.bank = damp(a.bank, def.ground ? 0 : clamp(-turnRate * 0.16, -0.7, 0.7), 4, dt);
    if (def.ground) {
      const ahead = groundHeight(this.world, a.pos.x + Math.sin(a.yaw) * L * 0.4, a.pos.z + Math.cos(a.yaw) * L * 0.4, this.scratchBoulders);
      const behind = groundHeight(this.world, a.pos.x - Math.sin(a.yaw) * L * 0.4, a.pos.z - Math.cos(a.yaw) * L * 0.4, this.scratchBoulders);
      a.pitch = damp(a.pitch, -Math.atan2(ahead - behind, L * 0.8), 8, dt);
    } else {
      const sp = Math.max(len3(a.vel), 0.5);
      a.pitch = damp(a.pitch, clamp(-Math.asin(clamp(a.vel.y / sp, -1, 1)) * 0.8, -0.9, 0.9), 4, dt);
    }

    // Noise / stillness
    a.noise = a.state === 'attack' ? 1.5 : (bursting && !freeBurst) ? 2.5 : speed > 0.4 ? 1 : 0.5;
    a.stillness = speed < 0.3 ? Math.min(3, a.stillness + dt) : 0;

    // --- Actions ---
    if (a.state === 'free' || a.state === 'guard') {
      // Lock-on
      if (justLock) {
        if (a.lockTarget >= 0) a.lockTarget = -1;
        else a.lockTarget = this.pickLockTarget(a)?.id ?? -1;
      }
      if (a.lockTarget >= 0 && Math.abs(input.lookX) > 0.75 && a.comboT === 0) {
        const nt = this.pickLockTarget(a, input.lookX > 0 ? 1 : -1, a.lockTarget);
        if (nt) { a.lockTarget = nt.id; a.comboT = 0.4; }
      }
      // Sense
      if (justSense && a.senseCd === 0) { a.senseT = 2.2; a.senseCd = def.ability === 'burrow' ? 3 : 6; this.flag(a, 'sense'); }
      // Ability
      if (justAbility && a.abilityCd === 0 && a.tier >= 2 || (justAbility && a.abilityCd === 0 && a.controller !== 'player')) this.startAbility(a, def);
      // Dodge
      else if (justDodge && a.stamina >= 10 && a.exhausted === 0) this.startDodge(a, def, dir, mag, L, sf);
      // Guard / parry
      else if (justGuard && def.canGuard && a.stamina > 5) { a.state = 'parry'; a.stateT = 0; a.stateDur = 0.15; this.flag(a, 'guard'); }
      else if (justGuard && !def.canGuard && a.stamina >= 10) this.startDodge(a, def, dir, mag, L, sf);
      else if (input.guard && def.canGuard && a.state === 'free' && a.stamina > 0 && a.stateT > 0.05) { a.state = 'guard'; a.stateT = 0; }
      else if (!input.guard && a.state === 'guard') { a.state = 'free'; a.stateT = 0; }
      // Attacks (also start eating on corpses)
      else if (justLight || justHeavy) {
        const corpse = justLight ? this.corpseInReach(a) : undefined;
        if (corpse) this.startEating(a, corpse);
        else {
          const m = justHeavy ? def.heavy : (a.combo === 2 ? { ...def.light, damage: def.light.damage * 1.6, poise: def.light.poise * 1.8, knockback: def.light.knockback * 2, recovery: def.light.recovery + 0.12 } : def.light);
          if (a.stamina >= staminaCost(a, m.stamina) * 0.5 && a.exhausted === 0) {
            a.state = 'attack'; a.stateT = 0; a.move = m; a.moveKind = justHeavy ? 'heavy' : 'light'; a.hitDone.clear();
            a.stamina -= staminaCost(a, m.stamina);
            if (!justHeavy) { a.combo = (a.combo + 1) % 3; a.comboT = 0.9; } else a.combo = 0;
            this.flag(a, justHeavy ? 'heavy' : 'light');
          }
        }
      }
    } else if (a.state === 'parry') {
      if (a.stateT >= a.stateDur) { a.state = input.guard && def.canGuard ? 'guard' : 'free'; a.stateT = 0; }
    } else if (a.state === 'attack' && a.move) {
      const m = a.move;
      const total = m.windup + m.active + m.recovery;
      if (a.stateT >= m.windup && a.stateT < m.windup + m.active) this.attackHits(a, m, L);
      // cancel recovery into dodge, or chain lights
      if (a.stateT > m.windup + m.active + m.recovery * 0.45 && justDodge && a.stamina >= 10) this.startDodge(a, def, dir, mag, L, sf);
      else if (a.stateT >= total) { a.state = 'free'; a.stateT = 0; a.move = undefined; }
      else if (a.moveKind === 'light' && justLight && a.stateT > m.windup + m.active + m.recovery * 0.35 && a.stamina >= 6) {
        const nm = a.combo === 2 ? { ...def.light, damage: def.light.damage * 1.6, poise: def.light.poise * 1.8, knockback: def.light.knockback * 2, recovery: def.light.recovery + 0.12 } : def.light;
        a.stateT = 0; a.move = nm; a.hitDone.clear(); a.stamina -= staminaCost(a, nm.stamina); a.combo = (a.combo + 1) % 3; a.comboT = 0.9;
      }
    } else if (a.state === 'dodge') {
      if (a.stateT >= a.stateDur) { a.state = 'free'; a.stateT = 0; }
    } else if (a.state === 'stagger') {
      if (a.stateT >= a.stateDur) { a.state = 'free'; a.stateT = 0; a.poise = a.poiseMax * 0.6; }
    } else if (a.state === 'grabbed') {
      const g = a.grabbedBy >= 0 ? this.idMap.get(a.grabbedBy) : undefined;
      if (!g || g.state !== 'grabbing' || g.grabbing !== a.id) { a.state = 'free'; a.stateT = 0; a.grabbedBy = -1; }
      else {
        if (justLight || justHeavy || justDodge) a.grabT -= 0.28;
        const gh = heading(g.yaw);
        const gl = lengthOf(g);
        a.pos.x = damp(a.pos.x, g.pos.x + gh.x * gl * 0.45, 14, dt); a.pos.y = damp(a.pos.y, g.pos.y - gl * 0.05, 14, dt); a.pos.z = damp(a.pos.z, g.pos.z + gh.z * gl * 0.45, 14, dt);
        a.vel = v3();
        if (a.grabT <= 0) { a.state = 'free'; a.stateT = 0; a.grabbedBy = -1; g.state = 'free'; g.stateT = 0; g.grabbing = -1; a.iframes = 0.4; }
      }
    } else if (a.state === 'grabbing') {
      const v = a.grabbing >= 0 ? this.idMap.get(a.grabbing) : undefined;
      if (!v || v.state !== 'grabbed') { a.state = 'free'; a.stateT = 0; a.grabbing = -1; }
      else {
        v.grabT -= dt;
        // crush ticks
        if (Math.floor(a.stateT * 2.5) !== Math.floor((a.stateT - dt) * 2.5)) {
          v.hp -= 6 * clamp(Math.pow(L / lengthOf(v), 1.6), 0.2, 4); v.hitFlash = 0.3;
          this.events.push({ kind: 'hit', pos: { ...v.pos }, actor: a.id, other: v.id, strength: 0.4, player: v.player });
          if (v.hp <= 0) { kill(this.hitCtx, v, a); a.state = 'free'; a.grabbing = -1; }
        }
        if (a.stateT >= a.stateDur && v.state === 'grabbed') {
          // throw
          const h = heading(a.yaw);
          v.state = 'free'; v.grabbedBy = -1; v.stateT = 0; v.vel = { x: h.x * 9, y: 2, z: h.z * 9 };
          v.state = 'stagger'; v.stateDur = 0.7;
          a.state = 'free'; a.stateT = 0; a.grabbing = -1;
        }
      }
    } else if (a.state === 'eating') {
      const c = a.eatingTarget >= 0 ? this.idMap.get(a.eatingTarget) : undefined;
      if (!c || c.state !== 'dead' || c.eaten >= 1 || dist(a.pos, c.pos) > L * 0.8 + lengthOf(c) * 0.6 || (a.controller === 'player' && !input.light && a.stateT > 0.3)) {
        a.state = 'free'; a.stateT = 0; a.eatingTarget = -1;
      } else {
        const ratio = lengthOf(c) / L;
        const dur = clamp(6 * ratio * ratio, 0.5, 4.5);
        const bite = dt / dur;
        const before = c.eaten;
        c.eaten = Math.min(1, c.eaten + bite);
        this.gainNutrition(a, c, (c.eaten - before) * this.nutritionValue(a, c));
        a.hp = Math.min(a.hpMax, a.hp + a.hpMax * (c.eaten - before) * 0.35 * Math.min(1, ratio * 2));
        if (Math.floor(a.stateT * 3) !== Math.floor((a.stateT - dt) * 3)) this.events.push({ kind: 'eat', pos: { ...c.pos }, actor: a.id, other: c.id, strength: ratio, player: a.player });
        if (c.eaten >= 1) { a.eats++; a.state = 'free'; a.stateT = 0; a.eatingTarget = -1; this.flag(a, 'ate'); }
      }
    } else if (a.state === 'ability') {
      this.updateAbility(a, def, dt, input, L, sf);
    } else if (a.state === 'moult') {
      const t = clamp(a.stateT / a.stateDur, 0, 1);
      const from = TIER_SCALE[Math.max(0, a.tier - 1) as Tier], to = TIER_SCALE[a.tier];
      a.scale = lerp(from, to, t * t * (3 - 2 * t));
      if (a.stateT >= a.stateDur) { a.state = 'free'; a.stateT = 0; a.scale = to; applyScaleStats(a, true); a.hp = a.hpMax; }
    }

    // Snacks: swim-through consume
    if (a.state !== 'moult' && a.state !== 'grabbed' && a.controller !== 'swarm') this.consumeSnacks(a, L, def);
    // Plankton & grazing
    if (a.controller === 'player' || a.controller === 'bot') {
      for (const b of this.world.blooms) if (dist(a.pos, b.pos) < b.radius && L < 2.4) { this.gainNutrition(a, undefined, dt * 2.2 * clamp(1 - L / 2.4, 0, 1)); if (Math.random() < dt * 2) this.events.push({ kind: 'eat', pos: { ...a.pos }, actor: a.id, strength: 0.1, player: a.player }); }
      if (def.id === 'wiwaxia' && a.stillness > 0.5) { const m = microbialAt(a.pos.x, a.pos.z); if (m > 0.2) this.gainNutrition(a, undefined, dt * 1.6 * m); }
    }

    // Lock target validity
    if (a.lockTarget >= 0) {
      const t = this.idMap.get(a.lockTarget);
      if (!t || !isAlive(t) || isHidden(t) || dist(a.pos, t.pos) > 16 + L * 8) a.lockTarget = -1;
    }
    // Hunted meter (for players)
    if (a.controller === 'player' || a.controller === 'bot') this.updateHunted(a);

    a.prev = { light: input.light, heavy: input.heavy, ability: input.ability, dodge: input.dodge, guard: input.guard, lock: input.lock, sense: input.sense, rise: input.rise };
    // onboarding flags
    if (a.controller === 'player') {
      if (mag > 0.2) this.flag(a, 'moved');
      if (bursting) this.flag(a, 'burst');
    }
  }

  private startDodge(a: Actor, def: ReturnType<typeof creature>, dir: Vec3, mag: number, L: number, sf: number) {
    const retreat = a.dodgeTapT > 0;
    let d: Vec3 = mag > 0.2 ? { ...dir } : vscale(heading(a.yaw), -1);
    if (def.ground) d.y = 0;
    d = norm(d);
    a.state = 'dodge'; a.stateT = 0; a.stateDur = retreat ? 0.5 : 0.32;
    a.iframes = retreat ? 0 : 0.28;
    a.stamina -= retreat ? 14 : 10;
    const power = (retreat ? 9 : 7.5) * Math.sqrt(sf) * (def.id === 'waptia' ? 1.25 : 1);
    a.vel.x = d.x * power; a.vel.y = def.ground ? a.vel.y : d.y * power * 0.7; a.vel.z = d.z * power;
    a.dodgeDir = d; a.dodgeTapT = retreat ? 0 : 0.35;
    if (retreat) this.silt.push({ pos: { ...a.pos }, radius: 2.2 + L * 0.7, t: 4 });
    if (a.state === 'dodge') this.events.push({ kind: retreat ? 'silt' : 'dodge', pos: { ...a.pos }, actor: a.id, player: a.player, strength: L });
    this.flag(a, 'dodge');
  }

  private startAbility(a: Actor, def: ReturnType<typeof creature>) {
    a.abilityCd = def.abilityCooldown;
    a.abilityT = 0; a.abilityActive = true; a.state = 'ability'; a.stateT = 0;
    const L = lengthOf(a);
    switch (def.ability) {
      case 'ambushSurge': a.stateDur = 0.1; a.burstT = 2.2; a.abilityActive = false; a.state = 'free'; break;
      case 'snatch': a.stateDur = 0.55; break;
      case 'tailFlick': {
        const back = vscale(heading(a.yaw), -1);
        a.stateDur = 0.42; a.iframes = 0.45; a.vel = { x: back.x * 12, y: 1.2, z: back.z * 12 };
        this.silt.push({ pos: { ...a.pos }, radius: 2.5 + L * 0.8, t: 4.5 });
        for (const o of this.actors) if (o.lockTarget === a.id) o.lockTarget = -1;
        this.events.push({ kind: 'silt', pos: { ...a.pos }, actor: a.id, player: a.player, strength: L });
        break;
      }
      case 'bristleFlare': a.stateDur = 3; break;
      case 'anchor': a.stateDur = 4; break;
      case 'shellUp': a.stateDur = 3; break;
      case 'burrow': a.stateDur = 8; a.lockTarget = -1; for (const o of this.actors) if (o.lockTarget === a.id) o.lockTarget = -1; break;
      case 'enroll': a.stateDur = 5; break;
    }
    this.events.push({ kind: 'ability', pos: { ...a.pos }, actor: a.id, player: a.player, strength: L });
    this.flag(a, 'ability');
  }

  private updateAbility(a: Actor, def: ReturnType<typeof creature>, dt: number, input: InputFrame, L: number, sf: number) {
    a.abilityT += dt;
    const done = a.stateT >= a.stateDur;
    switch (def.ability) {
      case 'snatch': {
        if (a.stateT >= 0.2 && a.stateT < 0.35 && a.hitDone.size === 0) {
          const h = heading(a.yaw);
          let best: Actor | undefined, bd = Infinity;
          for (const o of this.nearby(a.pos, L * 2.4)) {
            if (o.id === a.id || !isAlive(o) || isHidden(o)) continue;
            const to = sub(o.pos, a.pos); const d = len3(to);
            if (d > L * 2.4 || dot(norm(to), h) < 0.72) continue;
            if (d < bd) { bd = d; best = o; }
          }
          if (best) {
            a.hitDone.add(best.id);
            const heavier = massOf(best) > massOf(a) * 1.3;
            const pull = norm(sub(heavier ? best.pos : a.pos, heavier ? a.pos : best.pos));
            if (heavier) { a.vel = vscale(pull, 14); }
            else { best.vel = vscale(pull, 16); best.iframes = 0; }
            applyHit(this.hitCtx, a, best, { ...def.light, damage: 12, poise: 30, knockback: 0 }, 0);
            this.events.push({ kind: 'grab', pos: { ...best.pos }, actor: a.id, other: best.id, player: a.player });
          }
        }
        break;
      }
      case 'shellUp': {
        if (done) for (const o of this.nearby(a.pos, L * 1.3)) if (o.id !== a.id && isAlive(o) && bandOf(a, o) !== 'giant' && o.state !== 'stagger') { o.state = 'stagger'; o.stateT = 0; o.stateDur = 1.0; o.vel = add(o.vel, vscale(norm(sub(o.pos, a.pos)), 5)); this.events.push({ kind: 'stagger', pos: { ...o.pos }, actor: a.id, other: o.id }); }
        break;
      }
      case 'burrow': {
        if (input.ability && !a.prev.ability && a.stateT > 0.6) { a.stateT = a.stateDur; }
        break;
      }
      case 'enroll': {
        if (input.ability && !a.prev.ability && a.stateT > 0.5) a.stateT = a.stateDur;
        // stagger rivals rolled into
        if (len3(a.vel) > 3) for (const o of this.nearby(a.pos, L * 0.9)) if (o.id !== a.id && isAlive(o) && !a.hitDone.has(o.id) && bandOf(a, o) !== 'giant') { a.hitDone.add(o.id); applyHit(this.hitCtx, a, o, { ...def.light, damage: 12, poise: 60, knockback: 5 }, 1); }
        break;
      }
    }
    if (done) {
      a.abilityActive = false; a.state = 'free'; a.stateT = 0; a.hitDone.clear();
      if (def.ability === 'burrow') { a.iframes = 0.3; /* free heavy: no stamina cost */ a.stamina = Math.min(a.staminaMax, a.stamina + 25); }
    }
  }

  private attackHits(a: Actor, m: MoveDef, L: number) {
    const h = heading(a.yaw);
    const mouth = m.sweep ? a.pos : { x: a.pos.x + h.x * L * 0.42, y: a.pos.y - Math.sin(a.pitch) * L * 0.3, z: a.pos.z + h.z * L * 0.42 };
    const reach = m.sweep ? L * 0.85 : L * 0.4;
    for (const o of this.nearby(a.pos, L * 1.5 + 4)) {
      if (o.id === a.id || !isAlive(o) || a.hitDone.has(o.id) || isHidden(o)) continue;
      if (o.controller === 'swarm' && a.controller === 'swarm') continue;
      if (this.mode === 'rise' && a.controller === 'player' && o.controller === 'player') continue; // co-op: allies can't hurt each other
      const d = dist(mouth, o.pos);
      if (d < reach + bodyRadius(o) * 1.1) {
        a.hitDone.add(o.id);
        const closing = clamp(dot(sub(a.vel, o.vel), norm(sub(o.pos, a.pos))) / (creature(a.creature).speed * speedFactor(a.scale) * 1.8), 0, 1.5);
        const band = bandOf(a, o);
        if (band === 'snack') { this.consume(a, o); continue; }
        const r = applyHit(this.hitCtx, a, o, m, closing);
        if (o.controller === 'player' && (band === 'rival')) this.flag(o, 'fought');
        void r;
      }
    }
  }

  private corpseInReach(a: Actor): Actor | undefined {
    const L = lengthOf(a);
    let best: Actor | undefined, bd = Infinity;
    for (const o of this.nearby(a.pos, L * 1.2 + 3)) {
      if (o.state !== 'dead' || o.eaten >= 1 || o.id === a.id) continue;
      if (this.mode === 'rise' && o.controller === 'player') continue;
      const d = dist(a.pos, o.pos);
      if (d < L * 0.7 + lengthOf(o) * 0.5 && d < bd) { bd = d; best = o; }
    }
    return best;
  }

  private startEating(a: Actor, c: Actor) {
    a.state = 'eating'; a.stateT = 0; a.eatingTarget = c.id;
    a.lockTarget = -1;
  }

  private consumeSnacks(a: Actor, L: number, def: ReturnType<typeof creature>) {
    if (a.state === 'dead') return;
    const moving = len3(a.vel) > 0.5 || def.id === 'waptia';
    for (const o of this.nearby(a.pos, L * 0.6 + 1)) {
      if (o.id === a.id || !isAlive(o)) continue;
      if (o.controller === 'player' && a.controller === 'player' && this.mode === 'rise') continue;
      if (bandOf(a, o) !== 'snack') continue;
      if (o.controller !== 'swarm' && o.controller !== 'ambient' && !(a.controller === 'player' || a.controller === 'bot' || a.controller === 'giant' || a.controller === 'shadow')) continue;
      if (dist(a.pos, o.pos) < L * 0.4 + bodyRadius(o) && (moving || a.state === 'attack')) this.consume(a, o);
    }
  }

  private consume(a: Actor, o: Actor) {
    kill(this.hitCtx, o, a);
    o.eaten = 1;
    const val = this.nutritionValue(a, o);
    this.gainNutrition(a, o, val);
    a.eats++;
    a.hp = Math.min(a.hpMax, a.hp + val * 0.4);
    this.events.push({ kind: 'eat', pos: { ...o.pos }, actor: a.id, other: o.id, strength: lengthOf(o) / lengthOf(a), player: a.player });
    this.flag(a, 'ate');
    this.remove(o);
  }

  nutritionValue(eater: Actor, food: Actor) {
    const ratio = lengthOf(food) / lengthOf(eater);
    let v = 20 * ratio * ratio;
    if (ratio >= 0.7 && ratio < 1.4) v *= 2.5;
    else if (ratio >= 1.4) v *= 3.5;
    else if (ratio < 0.2) v *= 0.3;
    return clamp(v, 0.3, 120);
  }

  private gainNutrition(a: Actor, food: Actor | undefined, amount: number) {
    if (a.controller !== 'player' && a.controller !== 'bot') { a.hp = Math.min(a.hpMax, a.hp + amount * 0.5); return; }
    if (this.mode === 'reef' && a.tier >= 4) return;
    a.nutrition += amount;
    // co-op share
    if (this.mode === 'rise' && food && amount > 2) for (const p of this.players) if (p !== a && isAlive(p) && dist(p.pos, a.pos) < 25) p.nutrition += amount * 0.3;
    if (this.mode === 'frenzy' && food && (food.controller === 'player' || food.controller === 'bot')) a.nutrition += 12;
    this.checkTierUp(a);
    for (const p of this.players) if (p !== a) this.checkTierUp(p);
  }

  private checkTierUp(a: Actor) {
    if (a.tier >= 4 || a.state === 'moult' || a.state === 'dead') return;
    if (a.nutrition >= TIER_NEED[a.tier]) {
      a.nutrition -= TIER_NEED[a.tier];
      a.tier = (a.tier + 1) as Tier;
      a.state = 'moult'; a.stateT = 0; a.stateDur = 1.5; a.lockTarget = -1; a.abilityActive = false;
      if (a.grabbing >= 0) { const v = this.idMap.get(a.grabbing); if (v) { v.state = 'free'; v.grabbedBy = -1; } a.grabbing = -1; }
      this.events.push({ kind: 'tierUp', pos: { ...a.pos }, actor: a.id, strength: a.tier, player: a.player });
      this.flag(a, 'tier');
      // scatter small creatures
      for (const o of this.nearby(a.pos, 20)) if (o.brain && o.controller !== 'giant') { o.brain.goalT = 0; if (o.brain.kind === 'needs') { o.brain.goal = 'flee'; o.brain.target = a.id; } }
    }
  }

  private pickLockTarget(a: Actor, cycle = 0, currentId = -1): Actor | undefined {
    const L = lengthOf(a);
    const h = heading(a.yaw);
    const cands: { a: Actor; score: number }[] = [];
    for (const o of this.nearby(a.pos, 14 + L * 7)) {
      if (o.id === a.id || !isAlive(o) || isHidden(o) || o.controller === 'swarm') continue;
      if (this.mode === 'rise' && o.controller === 'player') continue;
      const to = sub(o.pos, a.pos); const d = len3(to);
      const facing = dot(norm(to), h);
      const band = bandOf(a, o);
      if (band === 'snack') continue;
      const score = d * (1.6 - facing) * (band === 'rival' ? 0.6 : 1);
      cands.push({ a: o, score });
    }
    if (!cands.length) return undefined;
    cands.sort((x, y) => x.score - y.score);
    if (cycle === 0 || currentId < 0) return cands[0].a;
    const idx = cands.findIndex((c) => c.a.id === currentId);
    if (idx < 0) return cands[0].a;
    // cycle by side
    const cur = cands[idx].a;
    const side = (o: Actor) => { const to = norm(sub(o.pos, a.pos)); return to.x * h.z - to.z * h.x; };
    const sorted = cands.filter((c) => c.a.id !== currentId).sort((x, y) => (side(x.a) - side(cur)) * cycle - (side(y.a) - side(cur)) * cycle);
    return sorted.find((c) => (side(c.a) - side(cur)) * cycle > 0)?.a ?? cands[(idx + 1) % cands.length].a;
  }

  private updateHunted(a: Actor) {
    let best = 0, hunter = -1;
    for (const o of this.actors) {
      if (!o.brain || !isAlive(o)) continue;
      const band = bandOf(a, o);
      if (band !== 'giant' && band !== 'threat') continue;
      const v = o.brain.detection.get(a.id) ?? 0;
      const hunting = o.brain.target === a.id && o.brain.goal === 'hunt';
      const d = dist(a.pos, o.pos);
      const range = Math.min(creature(o.creature).sense * lengthOf(o) + 6, o.brain.kind === 'giant' ? 70 : 40);
      // giants ramp with their detection score; smaller predators ramp with distance while actively chasing
      const score = clamp(o.brain.kind === 'giant' ? Math.max(v / 2, hunting ? clamp(1.3 - d / range, 0.5, 1) : 0) : hunting ? clamp(1.1 - d / (range * 0.8), 0, 1) : 0, 0, 1);
      if (score > best) { best = score; hunter = o.id; }
    }
    const wasHunted = a.hunted >= 0.98 || a.wasHunted;
    if (best >= 0.98 && !a.wasHunted) { a.wasHunted = true; this.events.push({ kind: 'hunted', pos: { ...a.pos }, actor: a.id, other: hunter, player: a.player }); this.flag(a, 'hunted'); }
    if (wasHunted && best < 0.25 && a.wasHunted) { a.wasHunted = false; a.escapes++; this.events.push({ kind: 'escape', pos: { ...a.pos }, actor: a.id, other: hunter, player: a.player }); this.flag(a, 'escaped'); }
    a.hunted = best; a.hunterId = hunter;
  }

  private resolveActorOverlap() {
    for (const a of this.actors) {
      if (!isAlive(a)) continue;
      const ra = bodyRadius(a);
      for (const o of this.hash.query(a.pos.x, a.pos.z, ra + 6, this.scratchActors)) {
        if (o.id <= a.id || !isAlive(o)) continue;
        if (a.state === 'grabbed' || o.state === 'grabbed') continue;
        const min = ra + bodyRadius(o);
        const dx = o.pos.x - a.pos.x, dy = o.pos.y - a.pos.y, dz = o.pos.z - a.pos.z;
        const d = Math.hypot(dx, dy, dz);
        if (d < min && d > 1e-4) {
          const ma = massOf(a), mo = massOf(o);
          const push = (min - d) * 0.5;
          const wa = mo / (ma + mo), wo = ma / (ma + mo);
          const nx = dx / d, ny = dy / d, nz = dz / d;
          a.pos.x -= nx * push * wa; a.pos.y -= ny * push * wa * 0.5; a.pos.z -= nz * push * wa;
          o.pos.x += nx * push * wo; o.pos.y += ny * push * wo * 0.5; o.pos.z += nz * push * wo;
        }
      }
    }
  }

  private updateSilt(dt: number) {
    for (const s of this.silt) s.t -= dt;
    this.silt = this.silt.filter((s) => s.t > 0);
  }

  private updatePopulation(dt: number) {
    this.ambientTimer -= dt;
    if (this.ambientTimer > 0) return;
    this.ambientTimer = 1.5;
    let ambient = 0, swarm = 0;
    const schools = new Map<number, number>();
    for (const a of this.actors) {
      if (!isAlive(a)) continue;
      if (a.controller === 'ambient') ambient++;
      if (a.controller === 'swarm') { swarm++; if (a.brain?.schoolId != null) schools.set(a.brain.schoolId, (schools.get(a.brain.schoolId) ?? 0) + 1); }
    }
    const wantAmbient = 26 + this.maxPlayerTier() * 3;
    if (ambient < wantAmbient) this.spawnAmbient(false);
    if (swarm < 160) {
      const i = Math.floor(this.rng() * SNACK_SCHOOLS.length);
      const s = SNACK_SCHOOLS[i];
      this.spawnSchool(s.creature, s.scale, s.count, i + Math.floor(this.time));
    }
    // giants respawn if somehow killed
    for (const c of ['anomalocaris', 'olenoides', 'opabinia'] as CreatureId[]) {
      if (!this.actors.some((a) => a.controller === 'giant' && a.creature === c)) {
        const home = c === 'anomalocaris' ? { x: 0, y: 5, z: 0 } : c === 'olenoides' ? { x: 110, y: sampleHeight(110, 100) + 1.5, z: 100 } : { x: -100, y: 5, z: 100 };
        const g = this.spawn(c, 'giant', home, c === 'anomalocaris' ? 3.5 : c === 'olenoides' ? 3 : 2.8);
        g.brain = makeBrain('giant', home, this.rng, { patrol: [home, { x: home.x + 30, y: home.y, z: home.z + 20 }, { x: home.x - 25, y: home.y, z: home.z + 30 }] });
      }
    }
  }

  private updateModes(dt: number) {
    switch (this.mode) {
      case 'rise': {
        this.players.forEach((p, i) => {
          const pr = this.progress[i];
          if (p.tier >= 4 && isAlive(p)) { pr.apexT += dt; if (pr.apexT > 90 && this.state.status === 'playing') { this.state = { status: 'won', winner: i, message: `${creature(p.creature).name} rules the reef.` }; } }
          else pr.apexT = 0;
        });
        break;
      }
      case 'frenzy': {
        const contenders = this.actors.filter((a) => a.controller === 'player' || a.controller === 'bot');
        const apex = contenders.find((a) => a.tier >= 4 && isAlive(a));
        if (apex) this.state = { status: 'won', winner: apex.player, message: apex.player >= 0 ? `Player ${apex.player + 1} hits Apex first.` : `A rival ${creature(apex.creature).name} hits Apex first.` };
        else if (this.time > 12 * 60) {
          const best = [...contenders].sort((a, b) => (b.tier + b.nutrition / TIER_NEED[b.tier]) - (a.tier + a.nutrition / TIER_NEED[a.tier]))[0];
          this.state = { status: best.player >= 0 ? 'won' : 'lost', winner: best.player, message: best.player >= 0 ? `Player ${best.player + 1} is the biggest thing in the sea.` : `A rival ${creature(best.creature).name} outgrew everyone.` };
        }
        break;
      }
      case 'hunted': {
        const smalls = this.actors.filter((a) => (a.controller === 'player' || a.controller === 'bot') && a.player !== 0);
        if (smalls.length && smalls.every((s) => s.tier >= 2)) this.state = { status: 'won', winner: -2, message: 'The small ones grew up. The giant goes hungry.' };
        else if (this.time > 6 * 60) this.state = { status: 'won', winner: 0, message: 'The giant kept the reef small.' };
        break;
      }
    }
  }

  private flag(a: Actor, f: string) {
    if (a.controller !== 'player') return;
    const pr = this.progress[a.player];
    if (!pr || pr.flags.has(f)) return;
    pr.flags.add(f);
  }

  /** Onboarding: returns the current hint for a player, if any. */
  hintFor(i: number): string | undefined {
    const p = this.players[i]; const pr = this.progress[i];
    if (!p || !pr || this.mode === 'reef') return undefined;
    const f = pr.flags;
    if (!isAlive(p)) return undefined;
    if (p.hunted > 0.5 && !f.has('escaped')) return p.cover > 0.3 ? 'Stay still. Let it pass.' : 'Something big has your scent. Break line of sight. Find cover. Hold still.';
    if (!f.has('moved')) return 'Push the left stick to swim.';
    if (!f.has('burst')) return 'Hold RT to burst. Catch the school.';
    if (!f.has('ate')) return 'Swim through the small fry to eat them.';
    if (!f.has('sense') && this.time > 20) return 'Tap D-pad up: sense pulse shows what is near.';
    if (p.tier === 0 && !f.has('tier')) return 'Eat. Grow. The ring fills toward your next moult.';
    if (p.tier >= 1 && !f.has('light')) return 'RB bites. Hunt something your own size.';
    if (p.tier >= 1 && !f.has('dodge')) return 'B dodges through an attack.';
    if (p.tier >= 1 && !f.has('guard') && creature(p.creature).canGuard) return 'Hold LB to guard. Tap it as a hit lands to parry.';
    if (p.tier >= 2 && !f.has('ability')) return `Y: ${creature(p.creature).abilityName}. Your signature move is unlocked.`;
    if (p.tier >= 2 && !f.has('lock')) { if (p.lockTarget >= 0) f.add('lock'); else return 'LT locks on. Circle your rival with the stick.'; }
    return undefined;
  }
}

export { channelDistance };
