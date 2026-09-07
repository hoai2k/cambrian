import { ACTIVE_ERA } from '../content';
import { BURROWERS, HEAVY_SPECIALS, DEFENSIVE_SPECIALS, CAMOUFLAGE_DRAIN, camouflageMatch, clearPursuit, stopHiding } from './concealment';
import { abilitySpeed, beginExpansionAbility, stepExpansionAbility, bloomRate, grazeRate } from './expansion-abilities';
import { add, clamp, damp, dist, distXZ, dot, heading, len3, lerp, makeRng, norm, scale as vscale, sub, TAU, v3, wrapAngle, yawOf, type Rng, type Vec3 } from '../shared/math';
import { applyScaleStats, bandOf, bodyRadius, canAct, clearanceOf, isAlive, isHidden, isInvulnerable, lengthOf, makeActor, massOf, speedFactor, staminaCost } from './actors';
import { makeBrain, think, type AiWorld } from './ai';
import { applyHit, kill, startSwallow, type HitContext } from './combat';
import { creature, CREATURE_IDS, type CreatureId, type MoveDef } from './creatures';
import { resolveFlora, stepFlora } from './flora';
import { SpatialHash } from './spatial';
import { emptyInput, TIER_NAMES, TIER_NEED, TIER_SCALE, type Actor, type InputFrame, type Mode, type PlayerSetup, type Prompt, type SiltCloud, type Tier, type WorldEvent } from './types';
import { biomeAt, biomeWeights, coverAt, groundHeight, LIGHT_WINDOW_Y, microbialAt, nearestNursery, nurseryAt, nurseryFactor, resolveStatic, sampleCurrent, sampleHeight, shoreDistance, shoreZ, SURFACE_Y, World, type Biome, type Boulder, type Cover, type Flora, type WorldData } from './world';

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

/** Where a player may teleport: home nursery, or alongside another player. */
export type TeleportDest = 'home' | number;
export interface TeleportOption { dest: TeleportDest; label: string; detail: string; distance: number; }
/** One radar contact, in world offsets from the viewer (the renderer rotates it into the camera frame). */
export interface RadarBlip {
  kind: 'player' | 'threat' | 'giant' | 'home' | 'shore';
  dx: number; dz: number; distance: number;
  /** Player index for `player` blips, actor id otherwise. */
  id: number;
  /** This contact is currently after the viewer. */
  hunting: boolean;
}

const { schools: SNACK_SCHOOLS, giants: GIANTS } = ACTIVE_ERA.ecology;

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
  private scratchFlora: Flora[] = [];
  private ambientTimer = 0;
  private stepIndex = 0;
  private schoolCount = 0;
  private hitCtx: HitContext;
  setups: PlayerSetup[];

  constructor(mode: Mode, setups: PlayerSetup[], seed = 5052026) {
    this.mode = mode;
    this.setups = setups;
    this.rng = makeRng(seed ^ 0x9e37);
    // Everyone hatches in the origin nursery, just off the shore: the one fixed point in an endless sea.
    this.world = new World(seed);
    const nursery = nurseryAt(0);
    this.world.loadAround(nursery);
    this.hitCtx = { events: this.events, byId: (id) => this.idMap.get(id), time: 0, rng: this.rng };
    setups.forEach((s, i) => {
      const startScale = mode === 'rise' ? TIER_SCALE[0] : mode === 'hunted' ? (i === 0 ? 3.0 : TIER_SCALE[1]) : mode === 'reef' ? TIER_SCALE[2] : TIER_SCALE[1];
      const a = this.spawn(s.creature, 'player', this.spawnPoint(nursery, s.creature, startScale, i), startScale, i);
      a.home = { ...nursery };
      a.yaw = Math.PI;                                   // facing out to sea
      this.players.push(a);
      this.progress.push({ prompts: [], flags: new Set(), deaths: 0, apexT: 0, message: '' });
    });
    if (mode === 'frenzy' || mode === 'hunted') {
      // Fill to 4 with bots
      for (let i = setups.length; i < 4; i++) {
        const c = CREATURE_IDS[Math.floor(this.rng() * CREATURE_IDS.length)];
        const bot = this.spawn(c, 'bot', this.spawnPoint(nursery, c, TIER_SCALE[1], i), TIER_SCALE[1]);
        bot.home = { ...nursery };
        bot.brain = makeBrain('needs', nursery, this.rng, { aggression: 0.9, reaction: 0.2, parrySkill: 0.55 });
      }
    }
    this.populate();
  }

  /** The points the world streams around and the ecosystem is kept alive near: every player and bot. */
  anchors(): Vec3[] {
    const out: Vec3[] = [];
    for (const a of this.actors) if (a.controller === 'player' || a.controller === 'bot') out.push(a.pos);
    if (!out.length) out.push(nurseryAt(0));
    return out;
  }
  private randomAnchor() { const an = this.anchors(); return an[Math.floor(this.rng() * an.length)]; }
  /** Distance from the closest player or bot. */
  private anchorDistance(p: Vec3) { let d = Infinity; for (const a of this.anchors()) d = Math.min(d, distXZ(a, p)); return d; }

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
    a.yaw = this.rng() * TAU; a.prevT.yaw = a.yaw;
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
    // Giants: one of each kind lives in the region around the players and moves with them.
    for (const c of GIANTS) this.placeGiant(this.spawn(c.creature, 'giant', { ...nurseryAt(0) }, c.scale));
    const shadow = this.spawn(ACTIVE_ERA.ecology.shadow.creature, 'shadow', { ...nurseryAt(0) }, ACTIVE_ERA.ecology.shadow.scale);
    this.placeGiant(shadow);
  }

  /**
   * Give a giant a home and patrol loop 130–210 units from a player, in the biome it belongs to
   * (channels and deep water for Anomalocaris, boulders for Olenoides, sponge forest for
   * Opabinia), never in a nursery and never on the beach. Used at start and whenever a giant has
   * been left far behind by every player.
   */
  private placeGiant(g: Actor) {
    const def = GIANTS.find((c) => c.creature === g.creature) ?? GIANTS[0];
    const shadow = g.controller === 'shadow';
    const anchor = this.randomAnchor();
    let best: Vec3 = { x: anchor.x, y: 0, z: anchor.z - 160 }, bestScore = -Infinity;
    for (let i = 0; i < 14; i++) {
      const ang = this.rng() * TAU, d = shadow ? 60 + this.rng() * 40 : 130 + this.rng() * 80;
      const x = anchor.x + Math.cos(ang) * d, z = anchor.z + Math.sin(ang) * d;
      if (shoreDistance(x, z) < 45 || nurseryFactor(x, z) > 0.1) continue;
      const w = biomeWeights(x, z);
      let score = this.rng() * 0.3;
      for (const b of def.biomes) score += w[b];
      if (score > bestScore) { bestScore = score; best = { x, y: 0, z }; }
    }
    const r = shadow ? 70 : 35 + this.rng() * 15;
    const y = shadow ? SURFACE_Y - 3 : def.ground ? 0 : 22;
    const n = shadow ? 10 : 6;
    const route = Array.from({ length: n }, (_, i) => {
      const a = (i / n) * TAU;
      const x = best.x + Math.cos(a) * r, z = best.z + Math.sin(a) * r;
      return { x, y: def.ground ? sampleHeight(x, z) + 1.5 : y + Math.abs(Math.sin(i * 1.7)) * 5, z };
    });
    g.pos = { ...route[0] };
    g.vel = v3();
    g.brain = makeBrain('giant', route[0], this.rng, { patrol: route });
  }

  /** A school sized to be prey for this player, spawned just out of sight. */
  private spawnPreyFor(p: Actor) {
    const L = lengthOf(p);
    const def = creature(p.creature);
    const pool = CREATURE_IDS.filter((id) => creature(id).ground === def.ground || !creature(id).ground);
    const c = pool[Math.floor(this.rng() * pool.length)];
    const cd = creature(c);
    const ratio = 0.28 + this.rng() * 0.32;            // snack to small prey relative to the player
    const s = clamp((L * ratio) / cd.adultLength, 0.06, 2.2);
    const count = s < 0.2 ? 12 : s < 0.6 ? 8 : 5;
    const ang = this.rng() * TAU, d = 24 + this.rng() * 18 + L * 2;
    const home = this.offshore({ x: p.pos.x + Math.cos(ang) * d, y: 0, z: p.pos.z + Math.sin(ang) * d });
    const g = sampleHeight(home.x, home.z);
    home.y = cd.ground ? g : clamp(p.pos.y + (this.rng() - 0.5) * 6, g + 1.5, SURFACE_Y - 3);
    const schoolId = this.schoolCount++;
    for (let k = 0; k < count; k++) {
      const pos = { x: home.x + (this.rng() - 0.5) * 5, y: home.y + (this.rng() - 0.5) * 2, z: home.z + (this.rng() - 0.5) * 5 };
      if (cd.ground) pos.y = groundHeight(this.world, pos.x, pos.z, this.scratchBoulders) + cd.adultLength * s * 0.13;
      const a = this.spawn(c, 'swarm', pos, s);
      a.brain = makeBrain('swarm', home, this.rng, { schoolId });
    }
  }

  /** Keep a point in swimmable water: at least 20 units off the beach. */
  private offshore(p: Vec3): Vec3 {
    const s = shoreDistance(p.x, p.z);
    if (s < 20) p.z -= 20 - s;
    return p;
  }

  private spawnSchool(c: CreatureId, s: number, count: number, i: number) {
    const def = creature(c);
    const anchor = this.randomAnchor();
    let home: Vec3;
    if (i < 8) { const n = nearestNursery(anchor.x, anchor.z).pos; const a = i * 0.8; home = { x: n.x + Math.cos(a) * 8, y: 0, z: n.z + Math.sin(a) * 8 }; }
    else {
      const a = this.rng() * TAU, d = 30 + Math.sqrt(this.rng()) * 90;
      home = this.offshore({ x: anchor.x + Math.cos(a) * d, y: 0, z: anchor.z + Math.sin(a) * d });
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

  private spawnAmbient(initial = false, near?: Vec3) {
    const c = CREATURE_IDS[Math.floor(this.rng() * CREATURE_IDS.length)];
    const def = creature(c);
    const tierBias = this.maxPlayerTier();
    // ambient scale spread widens as the players grow
    const base = 0.28 + this.rng() * (0.5 + tierBias * 0.5);
    const s = clamp(base * (this.rng() < 0.15 ? 1.6 : 1), 0.28, 2.4);
    const anchor = near ?? this.randomAnchor();
    let pos: Vec3 | undefined;
    for (let tries = 0; tries < 20 && !pos; tries++) {
      const a = this.rng() * TAU, d = initial ? 20 + Math.sqrt(this.rng()) * 110 : 60 + Math.sqrt(this.rng()) * 90;
      const x = anchor.x + Math.cos(a) * d, z = anchor.z + Math.sin(a) * d;
      if (shoreDistance(x, z) < 20) continue;
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

  /** Cover (0..1) for an actor including temporary silt. Plants are queried every fourth step (staggered) since cover changes slowly. */
  coverFor(a: Actor): number {
    let c = ((a.id + this.stepIndex) & 3) === 0 || a.controller === 'player' ? coverAt(this.world, a.pos, lengthOf(a), this.scratchCover) : a.cover;
    for (const s of this.silt) if (dist(s.pos, a.pos) < s.radius) c = Math.max(c, 0.75);
    if (isHidden(a)) c = 1;
    return c;
  }

  /** Main fixed step. `inputs` maps player index → InputFrame. */
  step(dt: number, inputs: Map<number, InputFrame>) {
    if (this.state.status !== 'playing') return;
    this.time += dt; this.hitCtx.time = this.time;
    this.stepIndex++;
    // Snapshot every transform so the renderer can interpolate across this step.
    for (const a of this.actors) {
      const t = a.prevT;
      t.x = a.pos.x; t.y = a.pos.y; t.z = a.pos.z; t.yaw = a.yaw; t.pitch = a.pitch; t.bank = a.bank;
    }
    // The sea streams in around whoever is in it, a couple of chunks a step so nothing hitches.
    this.world.stream(this.anchors(), 2);
    this.hash.rebuild(this.actors);

    for (const a of this.actors) {
      if (a.state === 'dead') { this.updateCorpse(a, dt); continue; }
      if (a.state === 'swallowed') { this.updateSwallowed(a, dt); continue; }
      const input = a.controller === 'player' ? (inputs.get(a.player) ?? emptyInput()) : a.brain ? think(this, a, dt) : emptyInput();
      this.updateActor(a, input, dt);
    }
    this.resolveActorOverlap();
    stepFlora(this.world, dt);
    this.updateSilt(dt);
    this.updatePopulation(dt);
    this.updateModes(dt);
    for (const a of this.actors) if (a.state === 'dead' && a.corpseT > 45 && a.controller !== 'player' && a.controller !== 'bot') this.remove(a);
    for (const a of this.actors) if (a.state === 'dead' && a.eaten >= 1 && a.controller !== 'player' && a.controller !== 'bot') this.remove(a);
  }

  /** In a predator's mouth: slide in, shrink, and after the gulp become a consumed corpse. */
  private updateSwallowed(a: Actor, dt: number) {
    a.stateT += dt;
    const pred = a.swallowedBy >= 0 ? this.idMap.get(a.swallowedBy) : undefined;
    if (!pred || !isAlive(pred)) { kill(this.hitCtx, a, pred); a.swallowedBy = -1; return; }
    const h = heading(pred.yaw); const PL = lengthOf(pred);
    const t = clamp(a.stateT / a.stateDur, 0, 1);
    const depth = 0.42 - t * 0.25;                         // slides from the mouth toward the gut
    const tx = pred.pos.x + h.x * PL * depth, ty = pred.pos.y - Math.sin(pred.pitch) * PL * depth * 0.6, tz = pred.pos.z + h.z * PL * depth;
    a.pos.x = damp(a.pos.x, tx, 16, dt); a.pos.y = damp(a.pos.y, ty, 16, dt); a.pos.z = damp(a.pos.z, tz, 16, dt);
    a.yaw = pred.yaw; a.pitch = pred.pitch; a.bank = damp(a.bank, Math.PI * 0.5, 4, dt);
    a.hitFlash = 0.2;
    if (a.stateT >= a.stateDur) {
      kill(this.hitCtx, a, pred);
      a.eaten = 1;                                        // nothing left to scavenge
      const val = this.nutritionValue(pred, a);
      this.gainNutrition(pred, a, val); pred.eats++; pred.hp = Math.min(pred.hpMax, pred.hp + val * 0.5);
      if (a.controller === 'player' || a.controller === 'bot') a.respawnT = a.stateDur; else this.remove(a);
    }
  }

  /**
   * Corpses go limp, roll belly-up and drift slowly upward with the current, so a dead thing reads as
   * dead at a glance. Players and bots dissolve into sparkles after three seconds and respawn.
   */
  private updateCorpse(a: Actor, dt: number) {
    a.corpseT += dt; a.stateT += dt;
    const def = creature(a.creature);
    const inMouth = a.eaten >= 1 && a.swallowedBy >= 0;
    if (!inMouth) {
      const floor = groundHeight(this.world, a.pos.x, a.pos.z, this.scratchBoulders) + clearanceOf(a) * 0.6;
      const cur = sampleCurrent(v3(), a.pos.x, a.pos.y, a.pos.z, this.time);
      const ceiling = Math.min(SURFACE_Y - 2, a.deathY + 4 + lengthOf(a));
      a.vel.x = damp(a.vel.x, cur.x * 0.8, 1.2, dt); a.vel.z = damp(a.vel.z, cur.z * 0.8, 1.2, dt);
      a.vel.y = damp(a.vel.y, a.pos.y < ceiling ? 0.45 : 0, 0.9, dt);
      a.pos.x += a.vel.x * dt; a.pos.y = Math.max(floor, a.pos.y + a.vel.y * dt); a.pos.z += a.vel.z * dt;
      // roll over, then keep a lazy tumble that dies away
      const k = Math.exp(-a.corpseT * 0.6);
      a.bank = damp(a.bank, Math.PI + a.tumble.z * 0.5 * k, 2.2, dt);
      a.pitch = damp(a.pitch, a.tumble.x * 0.45 * k, 2, dt);
      a.yaw = wrapAngle(a.yaw + a.tumble.y * k * dt);
      void def;
    }
    a.hitFlash = Math.max(0, a.hitFlash - dt);
    if (a.controller === 'player' || a.controller === 'bot') {
      a.respawnT += dt;
      // three seconds of corpse (or of being digested), a puff of sparkles, then back in
      const total = 3.0;
      if (!a.sparkled && a.respawnT > total - 0.4) {
        a.sparkled = true;
        const pred = inMouth ? this.idMap.get(a.swallowedBy) : undefined;
        const at = pred ? { x: pred.pos.x - Math.sin(pred.yaw) * lengthOf(pred) * 0.1, y: pred.pos.y - lengthOf(pred) * 0.05, z: pred.pos.z - Math.cos(pred.yaw) * lengthOf(pred) * 0.1 } : { ...a.pos };
        this.events.push({ kind: 'disintegrate', pos: at, actor: a.id, other: pred?.id, player: a.player, strength: lengthOf(a) });
        if (!inMouth) a.eaten = 1;     // body dissolves
      }
      if (a.respawnT > total) this.respawn(a);
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
    a.eaten = 0;
    a.stamina = a.staminaMax; a.poise = a.poiseMax;
    // Back to a nursery near another player (the party stays together in an endless sea), or
    // failing that the nearest one to where you died; never one a giant is loitering in.
    let ref = a.pos, refD = Infinity;
    for (const o of this.players) if (o !== a && isAlive(o)) { const d = distXZ(o.pos, a.pos); if (d < refD) { refD = d; ref = o.pos; } }
    const near = nearestNursery(ref.x, ref.z);
    let nursery = near.pos, bd = Infinity;
    for (let i = near.index - 1; i <= near.index + 1; i++) {
      const n = nurseryAt(i);
      let danger = 0;
      for (const g of this.actors) if ((g.controller === 'giant') && isAlive(g) && distXZ(g.pos, n) < 60) danger += 1;
      const score = danger * 100 + distXZ(ref, n) * 0.2;
      if (score < bd) { bd = score; nursery = n; }
    }
    a.home = { ...nursery };
    this.world.loadAround(nursery);
    a.pos = this.spawnPoint(nursery, a.creature, a.scale, a.player);
    a.vel = v3(); a.state = 'free'; a.stateT = 0; a.respawnT = 0; a.corpseT = 0; a.eaten = 0;
    stopHiding(a); a.camoStrength = 0; a.hideCd = 0; a.emergenceHeavy = false; a.spawnProtect = 3.5; a.hitFlash = 0; a.abilityActive = false; a.abilityCd = 0; a.lockTarget = -1; a.hunted = 0; a.hunterId = -1; a.wasHunted = false; a.swallowedBy = -1; a.bank = 0; a.pitch = 0;
    a.yaw = Math.PI;
    // hatch-in: grow from a speck over a second (reuses the moult state with a smaller start scale)
    a.hatching = true; a.state = 'moult'; a.stateT = 0; a.stateDur = 1.0;
    this.events.push({ kind: 'moult', pos: { ...a.pos }, actor: a.id, player: a.player, strength: 0.5 });
    void def;
  }

  private updateActor(a: Actor, input: InputFrame, dt: number) {
    const def = creature(a.creature);
    const L = lengthOf(a);
    const sf = speedFactor(a.scale);
    const giantish = a.controller === 'giant' || a.controller === 'shadow';
    const justLight = input.light && !a.prev.light, justHeavy = input.heavy && !a.prev.heavy, justAbility = input.ability && !a.prev.ability;
    const justDodge = input.dodge && !a.prev.dodge, justGuard = input.guard && !a.prev.guard, justLock = input.lock && !a.prev.lock;
    const justSense = input.sense && !a.prev.sense, justRise = input.rise && !a.prev.rise;
    const justDash = input.dash && !a.prev.dash;
    if (input.dash) a.dashHoldT += dt; else { a.dashHoldT = 0; a.dashUsed = false; a.dashQueued = false; }
    a.pounceCd = Math.max(0, a.pounceCd - dt);
    a.dashCd = Math.max(0, a.dashCd - dt);
    a.teleportCd = Math.max(0, a.teleportCd - dt);
    a.holdT = Math.max(0, a.holdT - dt);
    a.sinceHit += dt;
    // Out of the fight for a few seconds and health comes back: run, hide, recover, return.
    if (a.sinceHit > 6 && a.hp < a.hpMax && a.state !== 'dead') a.hp = Math.min(a.hpMax, a.hp + a.hpMax * (a.controller === 'player' || a.controller === 'bot' ? 0.035 : 0.02) * dt);
    if (a.brain) a.brain.courage = Math.min(1, a.brain.courage + 0.05 * dt);

    if (a.state !== 'ability') a.abilityActive = (a.state === 'guard' || a.state === 'parry') && DEFENSIVE_SPECIALS.has(def.ability);

    // Timers
    a.stateT += dt;
    a.iframes = Math.max(0, a.iframes - dt);
    a.spawnProtect = Math.max(0, a.spawnProtect - dt);
    a.hitFlash = Math.max(0, a.hitFlash - dt);
    a.hitStop = Math.max(0, a.hitStop - dt);
    a.abilityCd = Math.max(0, a.abilityCd - dt);
    a.senseCd = Math.max(0, a.senseCd - dt);
    a.senseT = Math.max(0, a.senseT - dt);
    if (def.ability === 'whipSearch' && a.senseT > 0) stepExpansionAbility(this.expansionContext(), a, def, dt);
    a.burstT = Math.max(0, a.burstT - dt);
    a.comboT = Math.max(0, a.comboT - dt);
    a.dodgeTapT = Math.max(0, a.dodgeTapT - dt);
    a.exhausted = Math.max(0, a.exhausted - dt);
    if (a.comboT === 0) a.combo = 0;
    a.seen = Math.max(0, a.seen - dt);
    if (a.poise < a.poiseMax && a.state !== 'stagger') a.poise = Math.min(a.poiseMax, a.poise + a.poiseMax * dt / 3);
    a.cover = this.coverFor(a);

    // Hiding is independent of defensive/combat states and available at every growth tier.
    a.hideCd = Math.max(0, a.hideCd - dt);
    if (a.hideMode !== 'none' && (!isAlive(a) || ['grabbed', 'grabbing', 'stagger', 'swallowed', 'moult'].includes(a.state))) stopHiding(a);
    if (justAbility && (a.state === 'free' || a.state === 'guard')) {
      if (a.hideMode !== 'none') {
        const buried = a.hideMode === 'burrowed'; stopHiding(a);
        if (buried) { a.emergenceHeavy = true; this.emergeStrike(a, def); }
      } else if (a.hideCd === 0 && (BURROWERS.has(a.creature) || a.stamina >= 8)) {
        a.state = 'free'; a.abilityActive = false; a.hideT = 0; a.seen = 0;
        if (BURROWERS.has(a.creature)) a.hideMode = 'descending';
        else {
          a.hideMode = 'camouflage'; a.stamina -= 3;
          const match = camouflageMatch(a, this.world, this.nearby(a.pos, 80));
          a.camoColors = match.colors; a.camoScheme = match.scheme; a.camoLabel = match.label; a.camoSource = match.actor;
        }
        clearPursuit(a, this.actors); this.flag(a, 'ability');
      }
    }
    if (a.hideMode !== 'none' && (justLight || justHeavy || input.guard || input.burst > .1 || justDash)) {
      const buried = a.hideMode === 'burrowed'; stopHiding(a);
      a.emergenceHeavy = false;
      if (buried && (justLight || justHeavy)) this.emergeStrike(a, def);
    }
    if (a.hideMode !== 'none') a.hideT += dt;
    if (a.hideMode === 'descending' && a.hideT > 10 && a.grounded && a.pos.y > sampleHeight(a.pos.x,a.pos.z) + clearanceOf(a) + .3) stopHiding(a);
    if (a.hideMode === 'descending' && a.pos.y <= sampleHeight(a.pos.x, a.pos.z) + clearanceOf(a) + .15) {
      a.hideMode = 'burrowed'; a.hideT = 0; a.seen = 0; a.vel = v3();
      clearPursuit(a, this.actors);
      this.silt.push({pos:{...a.pos}, radius:L*.7, t:1.5});
    }
    a.camoStrength = damp(a.camoStrength, a.hideMode === 'camouflage' ? 1 : 0, 3, dt);
    if (a.hideMode === 'camouflage') {
      a.stamina = Math.max(0, a.stamina - CAMOUFLAGE_DRAIN * dt);
      if (a.stamina === 0) stopHiding(a);
    }
    if (a.state === 'guard' || a.state === 'parry') a.guardHeld += dt;
    else a.guardHeld = 0;
    // Stamina
    const speed = len3(a.vel);
    const burstIn = input.burst;
    const bursting = burstIn > 0.1 && a.stamina > 0 && a.state !== 'guard' && a.exhausted === 0;
    if (def.ability === 'ambushSurge' && input.burst > .1 && !a.prev.burst && a.abilityCd <= 0) { a.burstT = 2.2; a.abilityCd = 10; }
    const freeBurst = a.burstT > 0;
    if (bursting && !freeBurst) a.stamina -= 22 * burstIn * dt;
    else if (a.state === 'guard') a.stamina -= 3 * dt;
    else if (a.hideMode !== 'camouflage') a.stamina = Math.min(a.staminaMax, a.stamina + (speed < 0.4 ? 24 : 14) * dt * (a.state === 'free' ? 1 : 0.5));
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
        // right = forward × up. With heading(yaw) = (sin, 0, cos) that is (-cos, 0, sin):
        // getting this backwards makes the strafe axis mirror-image (verified against the camera).
        if (locked && isAlive(locked) && !a.aiming) {
          const to = norm(sub(locked.pos, a.pos));
          fwd = def.ground ? norm({ x: to.x, y: 0, z: to.z }) : to;
          right = norm({ x: -fwd.z, y: 0, z: fwd.x });
        } else {
          const cy = input.camYaw, cp = def.ground ? 0 : input.camPitch;
          fwd = { x: Math.sin(cy) * Math.cos(cp), y: -Math.sin(cp), z: Math.cos(cy) * Math.cos(cp) };
          right = { x: -Math.cos(cy), y: 0, z: Math.sin(cy) };
        }
        dir = norm({ x: fwd.x * sy + right.x * sx, y: fwd.y * sy, z: fwd.z * sy + right.z * sx });
      }
    }
    if (def.ground) dir.y = 0;
    const controllable = a.holdT === 0 && (a.state === 'free' || a.state === 'guard' || (a.state === 'ability' && (def.mobileAbility || def.ability === 'shellUp' || def.ability === 'bristleFlare' || def.ability === 'ambushSurge')));
    const slowMult = abilitySpeed(a) * (a.state === 'guard' ? (def.ability === 'anchor' ? 0 : def.ability === 'enroll' ? .8 : .45) : (a.abilityActive && def.ability === 'shellUp') ? 0.35 : a.exhausted > 0 ? 0.7 : 1);
    const burstMult = controllable && (bursting || freeBurst) ? (1 + (def.burst - 1) * (freeBurst ? 1.25 : burstIn) * (a.controller === 'swarm' ? 0.55 : giantish ? 0.35 : 1)) : 1;
    const cruise = def.speed * sf * slowMult * (a.controller === 'swarm' ? 0.62 : giantish ? 0.55 : 1);
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
    if (a.state === 'dodge' || a.state === 'attack' || a.state === 'eating' || a.state === 'moult' || a.state === 'grabbing' || a.state === 'parry') rate = a.state === 'dodge' ? 1.4 : 3;
    if (a.state === 'pounce') rate = 0;
    if (a.holdT > 0) { desired = v3(); rate = 5; }
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
    if (a.state === 'guard' && def.ability === 'enroll' && def.ground) {
      // roll downhill and with the current
      const gx = sampleHeight(a.pos.x + 0.5, a.pos.z) - sampleHeight(a.pos.x - 0.5, a.pos.z);
      const gz = sampleHeight(a.pos.x, a.pos.z + 0.5) - sampleHeight(a.pos.x, a.pos.z - 0.5);
      a.vel.x += (-gx * 6 + cur.x * 2 + dir.x * 3 * mag) * dt; a.vel.z += (-gz * 6 + cur.z * 2 + dir.z * 3 * mag) * dt;
      a.roll += len3(a.vel) * dt / (L * 0.25);
      if (len3(a.vel)>3) for(const o of this.nearby(a.pos,L*.9)) {
        if(o.id===a.id || !isAlive(o) || a.hitDone.has(o.id) || this.expansionContext().allies(a,o)) continue;
        a.hitDone.add(o.id); applyHit(this.hitCtx,a,o,{...def.light,damage:10,poise:40,knockback:4},.5);
      }
    } else a.roll = damp(a.roll, 0, 6, dt);

    // Idle camouflage sinks gently; any explicit translation cancels that extra descent.
    const explicitMotion = Math.abs(input.mx) + Math.abs(input.my) > .08 || !!input.rise || !!input.sink || !!(input.worldMove && len3(input.worldMove) > .08);
    if (a.hideMode === 'camouflage' && !explicitMotion && !def.ground) a.vel.y = damp(a.vel.y, -.32, 2, dt);
    if (a.hideMode === 'descending') { a.vel.x *= Math.exp(-6*dt); a.vel.z *= Math.exp(-6*dt); a.vel.y = -Math.max(.8, L*.5); a.hopVel = Math.min(a.hopVel, -1); }
    if (a.hideMode === 'burrowed') { a.vel = v3(); a.pos.y = sampleHeight(a.pos.x,a.pos.z) + clearanceOf(a); a.hopVel = 0; }
    // Integrate
    if (a.hitStop === 0) {
      a.pos.x += a.vel.x * dt; a.pos.y += a.vel.y * dt; a.pos.z += a.vel.z * dt;
    }

    // Hop (crawlers)
    if (def.ground) {
      if (a.hideMode === 'none' && justRise && a.grounded && controllable && a.stamina > 8) { a.hopVel = 5.5 * Math.sqrt(sf); a.grounded = false; a.stamina -= 8; a.iframes = Math.max(a.iframes, 0.12); }
      if (!a.grounded) { a.pos.y += a.hopVel * dt; a.hopVel -= 16 * dt; }
    }

    // Static collision
    const hitWall = resolveStatic(this.world, a.pos, bodyRadius(a), this.scratchBoulders);
    if (hitWall && !def.ground) { a.vel.x *= 0.6; a.vel.z *= 0.6; }
    // Plants: swarm snacks are numerous and tiny, so they take turns on alternate steps.
    if (!isHidden(a) && a.state !== 'grabbed') {
      resolveFlora(this.world, a, dt, this.scratchFlora);
    }
    const floor = groundHeight(this.world, a.pos.x, a.pos.z, this.scratchBoulders) + clearanceOf(a);
    if (def.ground) {
      if (a.grounded || a.pos.y <= floor) { a.pos.y = a.grounded ? damp(a.pos.y, floor, 18, dt) : floor; if (!a.grounded && a.hopVel < 0) { a.grounded = true; a.hopVel = 0; } }
      if (a.pos.y < floor) a.pos.y = floor;
    } else {
      if (a.pos.y < floor) { a.pos.y = floor; if (a.vel.y < 0) a.vel.y *= -0.2; }
      const ceiling = SURFACE_Y - 0.8 - clearanceOf(a);
      if (a.pos.y > ceiling) { a.pos.y = ceiling; if (a.vel.y > 0) a.vel.y = 0; }
    }

    // Orientation
    const hv = Math.hypot(a.vel.x, a.vel.z);
    let targetYaw = a.yaw;
    if (a.aiming && a.controller === 'player' && (a.state === 'free' || a.state === 'guard')) targetYaw = hv > 0.35 ? yawOf(a.vel) : input.camYaw;
    else if (locked && isAlive(locked) && (a.state === 'free' || a.state === 'guard' || a.state === 'attack')) targetYaw = yawOf(sub(locked.pos, a.pos));
    else if (hv > 0.35 && a.state !== 'grabbed') targetYaw = yawOf(a.vel);
    const dy = wrapAngle(targetYaw - a.yaw);
    const tr = def.turnRate * (a.state === 'attack' ? 0.5 : 1) * (1 + hv * 0.05) * (giantish ? 0.45 : 1);
    const turn = clamp(dy * 6, -tr, tr);
    const prevYaw = a.yaw;
    a.yaw = wrapAngle(a.yaw + turn * dt);
    const turnRate = wrapAngle(a.yaw - prevYaw) / Math.max(dt, 1e-4);
    if (a.state === 'ability' && def.ability === 'spineIntercept') a.yaw = yawOf(a.dodgeDir);
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
    a.noise = a.hideMode !== 'none' ? .1 : a.state === 'attack' ? 1.5 : (bursting && !freeBurst) ? 2.5 : speed > 0.4 ? 1 : 0.5;
    a.stillness = speed < 0.3 ? Math.min(3, a.stillness + dt) : 0;

    // --- Actions ---
    if ((a.state === 'free' || a.state === 'guard') && a.hideMode !== 'burrowed' && a.hideMode !== 'descending') {
      // Aim (LT held): the camera owns the crosshair; whatever it reports is the target. Bots toggle lock.
      if (a.controller === 'player') {
        a.aiming = input.aim;
        a.lockTarget = input.aim ? input.aimTarget : -1;
        if (input.aim) this.flag(a, 'lock');
      } else if (justLock) {
        if (a.lockTarget >= 0) a.lockTarget = -1;
        else a.lockTarget = this.pickLockTarget(a)?.id ?? -1;
      }
      if (a.lockTarget >= 0 && Math.abs(input.lookX) > 0.75 && a.comboT === 0) {
        const nt = this.pickLockTarget(a, input.lookX > 0 ? 1 : -1, a.lockTarget);
        if (nt) { a.lockTarget = nt.id; a.comboT = 0.4; }
      }
      // Sense
      if (justSense && a.senseCd === 0) { a.senseT = def.ability === 'whipSearch' ? 3.6 : 2.2; a.senseCd = def.ability === 'burrow' ? 3 : 6; this.flag(a, 'sense'); this.events.push({ kind: 'sense', pos: { ...a.pos }, actor: a.id, player: a.player }); }
      // Ability
      if (justHeavy && a.emergenceHeavy) this.emergeStrike(a, def);
      else if (justHeavy && HEAVY_SPECIALS.has(def.ability) && a.abilityCd <= 0 && a.stamina >= 18) {
        a.stamina -= 18; this.startAbility(a, def); a.abilityCd = Math.max(2, a.stateDur + .6); this.flag(a, 'heavy');
      }
      // Dash (LB): with a stick direction it fires at once; with a neutral stick it is queued for the
      // moment the stick moves. Fast and long enough to clear a predator's bite.
      else if (justDash && mag <= 0.3 && !input.worldMove) { a.dashQueued = true; }
      else if ((justDash || a.dashQueued) && mag > 0.3 && a.stamina >= 10 && a.exhausted === 0 && a.dashCd === 0 && !a.dashUsed) { a.dashUsed = true; a.dashQueued = false; this.startDash(a, def, dir, L, sf); }
      // Pounce (RT): at the aimed target when in range, else at whatever prey is in front, else a forward lunge
      else if (justHeavy && !HEAVY_SPECIALS.has(def.ability) && a.controller === 'player' && a.pounceCd === 0 && a.stamina >= 12 && a.exhausted === 0) {
        const t = a.aiming && locked && isAlive(locked) ? (a.aimInRange ? locked : undefined) : this.pounceTargetAhead(a);
        if (t) this.startPounce(a, t, L, sf);
        else { const m = { ...def.heavy, lunge: def.heavy.lunge + 1.0 }; a.state = 'attack'; a.stateT = 0; a.move = m; a.moveKind = 'heavy'; a.hitDone.clear(); a.stamina -= staminaCost(a, m.stamina); a.combo = 0; a.pounceCd = 0.8; this.flag(a, 'heavy'); }
      }
      // Dodge (B for creatures that cannot guard, bots)
      else if (justDodge && a.controller !== 'player' && a.stamina >= 10 && a.exhausted === 0) this.startDodge(a, def, dir, mag, L, sf);
      // Guard / parry
      else if (justGuard && def.canGuard && a.stamina > 5) { a.state = 'parry'; a.stateT = 0; a.hitDone.clear(); a.stateDur = def.ability === 'anchor' || def.ability === 'bristleFlare' ? .28 : .15; a.abilityActive = DEFENSIVE_SPECIALS.has(def.ability); this.blockPulse(a, def); if (['ribbonSlip','combCruise'].includes(def.ability) && a.abilityCd <= 0 && a.stamina >= 10) { a.stamina -= 8; a.abilityCd = 4; this.evadeSpecial(a, def, L); } this.flag(a, 'guard'); }
      else if (justGuard && !def.canGuard && a.stamina >= 10 && a.exhausted === 0) this.startDodge(a, def, dir, mag, L, sf);
      else if (input.guard && def.canGuard && a.state === 'free' && a.stamina > 0 && a.stateT > 0.05) { a.state = 'guard'; a.stateT = 0; }
      else if (!input.guard && a.state === 'guard') { if (def.ability === 'shellUp' && a.guardHeld > .6) this.blockPulse(a, def); a.state = 'free'; a.stateT = 0; a.abilityActive = false; }
      // Attacks (also start eating on corpses)
      else if (justLight || (justHeavy && a.controller !== 'player' && !HEAVY_SPECIALS.has(def.ability))) {
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
      if (a.stateT > m.windup + m.active + m.recovery * 0.45 && (justDodge || (justDash && mag > 0.3)) && a.stamina >= 10) { a.dashUsed = true; this.startDodge(a, def, dir, mag, L, sf); }
      else if (a.stateT >= total) { a.state = 'free'; a.stateT = 0; a.move = undefined; }
      else if (a.moveKind === 'light' && justLight && a.stateT > m.windup + m.active + m.recovery * 0.35 && a.stamina >= 6) {
        const nm = a.combo === 2 ? { ...def.light, damage: def.light.damage * 1.6, poise: def.light.poise * 1.8, knockback: def.light.knockback * 2, recovery: def.light.recovery + 0.12 } : def.light;
        a.stateT = 0; a.move = nm; a.hitDone.clear(); a.stamina -= staminaCost(a, nm.stamina); a.combo = (a.combo + 1) % 3; a.comboT = 0.9;
      }
    } else if (a.state === 'pounce') {
      const t = a.lockTarget >= 0 ? this.idMap.get(a.lockTarget) : undefined;
      if (t && isAlive(t) && a.stateT < a.stateDur) {
        // home in hard on the target; impact when the mouth reaches it
        const to = sub(t.pos, a.pos); const d = len3(to);
        const speed = Math.max(def.speed * sf * 3.2, 9 * Math.sqrt(sf));
        const dirTo = norm(to);
        a.vel = vscale(dirTo, speed);
        a.yaw = yawOf(dirTo); a.pitch = def.ground ? a.pitch : clamp(-Math.asin(clamp(dirTo.y, -1, 1)) * 0.8, -0.9, 0.9);
        if (d < L * 0.45 + bodyRadius(t) * 1.2) {
          const band = bandOf(a, t);
          if (band === 'snack' && (t.controller === 'swarm' || (t.controller === 'ambient' && lengthOf(t) < L * 0.3))) this.consume(a, t);
          else { const m = { ...def.heavy, name: 'Pounce', damage: def.heavy.damage * 1.35, poise: def.heavy.poise * 1.2, knockback: def.heavy.knockback * 0.8, lunge: 0 }; applyHit(this.hitCtx, a, t, m, 1.2); }
          this.events.push({ kind: 'pounce', pos: { ...a.pos }, actor: a.id, other: t.id, player: a.player, strength: L });
          a.state = 'free'; a.stateT = 0; a.vel = vscale(a.vel, 0.25); a.iframes = 0.1;
        }
      } else { a.state = 'free'; a.stateT = 0; a.vel = vscale(a.vel, 0.3); }
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
          if (v.hp <= 0) { a.state = 'free'; a.grabbing = -1; if (lengthOf(a) >= lengthOf(v) * 1.35) startSwallow(this.hitCtx, a, v); else kill(this.hitCtx, v, a); }
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
      const to = this.mode === 'hunted' && a.player === 0 ? a.scale : TIER_SCALE[a.tier];
      const from = a.hatching ? to * 0.3 : TIER_SCALE[Math.max(0, a.tier - 1) as Tier];
      if (!(this.mode === 'hunted' && a.player === 0)) a.scale = lerp(from, to, t * t * (3 - 2 * t));
      if (a.stateT >= a.stateDur) { a.state = 'free'; a.stateT = 0; a.scale = to; applyScaleStats(a, true); a.hp = a.hpMax; a.hatching = false; }
    }

    // Snacks: swim-through consume
    if (a.state !== 'moult' && a.state !== 'grabbed' && a.controller !== 'swarm') this.consumeSnacks(a, L, def);
    // Mobile suspension feeders can grow in blooms at every tier. Depositors must be near the bottom.
    if (isAlive(a) && a.state !== 'moult' && a.controller !== 'swarm') {
      for (const b of this.world.blooms) if (dist(a.pos, b.pos) < b.radius) {
        const food = bloomRate(a, def) * dt;
        if (food > 0) this.gainNutrition(a, undefined, food);
        if (food > 0 && this.rng() < dt * 2) this.events.push({ kind: 'eat', pos: { ...a.pos }, actor: a.id, strength: .1, player: a.player });
        break;
      }
      const rate = grazeRate(a, def);
      if (rate > 0 && a.pos.y < sampleHeight(a.pos.x, a.pos.z) + clearanceOf(a) + .8) {
        const m = microbialAt(a.pos.x, a.pos.z);
        if (m > .2) this.gainNutrition(a, undefined, dt * rate * m);
      }
    }

    // Aim range: the crosshair fills when a pounce would connect
    a.aimInRange = false;
    if (a.lockTarget >= 0) { const t = this.idMap.get(a.lockTarget); if (t && isAlive(t)) a.aimInRange = dist(a.pos, t.pos) < this.pounceRange(a); }
    // Lock target validity
    if (a.lockTarget >= 0) {
      const t = this.idMap.get(a.lockTarget);
      if (!t || !isAlive(t) || isHidden(t) || (!a.aiming && dist(a.pos, t.pos) > 16 + L * 8)) a.lockTarget = -1;
    }
    // Hunted meter (for players)
    if (a.controller === 'player' || a.controller === 'bot') this.updateHunted(a);

    if (bursting && !a.prev.burst && a.controller === 'player') this.events.push({ kind: 'burst', pos: { ...a.pos }, actor: a.id, player: a.player });
    a.prev = { light: input.light, heavy: input.heavy, ability: input.ability, dodge: input.dodge, guard: input.guard, lock: input.lock, sense: input.sense, rise: input.rise, burst: bursting, dash: input.dash, aim: input.aim };
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
    this.evadeSpecial(a, def, L);
    if (retreat) this.silt.push({ pos: { ...a.pos }, radius: 2.2 + L * 0.7, t: 4 });
    if (a.state === 'dodge') this.events.push({ kind: retreat ? 'silt' : 'dodge', pos: { ...a.pos }, actor: a.id, player: a.player, strength: L });
    this.flag(a, 'dodge');
  }

  pounceRange(a: Actor) { return lengthOf(a) * 3.6 + 3; }

  /** Nearest thing in front worth pouncing on when RT is pressed without aiming. */
  private pounceTargetAhead(a: Actor): Actor | undefined {
    const L = lengthOf(a); const h = heading(a.yaw);
    let best: Actor | undefined, bd = Infinity;
    for (const o of this.nearby(a.pos, this.pounceRange(a))) {
      if (o.id === a.id || !isAlive(o) || isHidden(o)) continue;
      if (this.mode === 'rise' && o.controller === 'player') continue;
      const band = bandOf(a, o); if (band === 'giant') continue;
      const to = sub(o.pos, a.pos); const d = len3(to);
      if (dot(norm(to), h) < 0.6) continue;
      const score = d * (band === 'threat' ? 1.6 : 1);
      if (score < bd) { bd = score; best = o; }
    }
    return best;
  }

  /** LB: a burst of speed in the stick direction with invulnerability, covering a few body lengths. */
  private emergeStrike(a: Actor, def: ReturnType<typeof creature>) {
    a.emergenceHeavy = false; a.state = 'attack'; a.stateT = 0;
    a.move = { ...def.heavy, name: 'Emergence strike', stamina: 0, poise: def.heavy.poise + 12 };
    a.moveKind = 'heavy'; a.hitDone.clear(); a.seen = 1;
    this.silt.push({pos:{...a.pos}, radius:lengthOf(a)*.7, t:1.5});
    this.flag(a, 'heavy');
  }

  private blockPulse(a: Actor, def: ReturnType<typeof creature>) {
    if (!['bellCorral', 'shellUp'].includes(def.ability) || a.abilityCd > 0 || a.stamina < 10) return;
    if (def.ability === 'shellUp' && a.guardHeld < .6) return;
    a.stamina -= 10; a.abilityCd = 4;
    for (const o of this.nearby(a.pos, lengthOf(a)*1.15)) {
      if (o.id === a.id || !isAlive(o) || this.expansionContext().allies(a,o)) continue;
      applyHit(this.hitCtx,a,o,{...def.light,damage:def.ability==='bellCorral'?7:0,poise:35,knockback:5,sweep:true},0);
    }
  }

  private evadeSpecial(a: Actor, def: ReturnType<typeof creature>, L: number) {
    if (['tailFlick','ribbonSlip'].includes(def.ability)) {
      this.silt.push({pos:{...a.pos},radius:L,t:2}); clearPursuit(a,this.actors);
    }
    if (def.ability === 'combCruise') { a.burstT = 1; a.stamina = Math.min(a.staminaMax,a.stamina+4); }
  }

  private startDash(a: Actor, def: ReturnType<typeof creature>, dir: Vec3, L: number, sf: number) {
    let d: Vec3 = { ...dir }; if (def.ground) d.y = 0; d = norm(d);
    a.state = 'dodge'; a.stateT = 0; a.stateDur = 0.42;
    a.iframes = 0.42; a.stamina -= 12; a.dashCd = 0.55;
    const power = (L * 9.5 + 7) * (def.id === 'waptia' ? 1.2 : 1);
    a.vel.x = d.x * power; a.vel.y = def.ground ? a.vel.y : d.y * power * 0.7; a.vel.z = d.z * power;
    a.dodgeDir = d;
    this.evadeSpecial(a, def, L);
    this.events.push({ kind: 'dodge', pos: { ...a.pos }, actor: a.id, player: a.player, strength: L });
    this.flag(a, 'dodge');
  }

  private startPounce(a: Actor, target: Actor, L: number, sf: number) {
    a.state = 'pounce'; a.stateT = 0; a.stateDur = clamp(dist(a.pos, target.pos) / Math.max(6, L * 3), 0.25, 0.9) + 0.15;
    a.stamina -= 12; a.pounceCd = 1.4; a.combo = 0;
    a.move = { ...creature(a.creature).heavy, name: 'Pounce' }; a.moveKind = 'heavy';
    this.events.push({ kind: 'dodge', pos: { ...a.pos }, actor: a.id, player: a.player, strength: L });
    this.flag(a, 'heavy');
    void sf;
  }

  private expansionContext() {
    return { hit: this.hitCtx, nearby: (pos: Vec3, radius: number) => this.nearby(pos, radius), silt: this.silt,
      allies: (a: Actor, b: Actor) => this.mode === 'rise' && a.controller === 'player' && b.controller === 'player' };
  }

  /** Internal animation state for native heavy specials; Y never calls this. */
  private startAbility(a: Actor, def: ReturnType<typeof creature>) {
    if (!HEAVY_SPECIALS.has(def.ability)) return;
    a.abilityCd = Math.max(2, (def.abilityDuration ?? .55) + .6);
    a.abilityT = 0; a.abilityActive = true; a.state = 'ability'; a.stateT = 0;
    a.stateDur = def.abilityDuration ?? .55; a.hitDone.clear();
    beginExpansionAbility(this.expansionContext(), a, def);
    this.events.push({kind:'ability',pos:{...a.pos},actor:a.id,player:a.player,strength:lengthOf(a)});
    this.flag(a, 'heavy');
  }

  private updateAbility(a: Actor, def: ReturnType<typeof creature>, dt: number, input: InputFrame, L: number, sf: number) {
    a.abilityT += dt;
    const done = a.stateT >= a.stateDur;
    stepExpansionAbility(this.expansionContext(), a, def, dt);
    if (a.state !== 'ability') return;
    switch (def.ability) {
      case 'snatch': {
        if (a.stateT >= 0.2 && a.stateT < 0.35 && a.hitDone.size === 0) {
          const h = heading(a.yaw);
          let best: Actor | undefined, bd = Infinity;
          for (const o of this.nearby(a.pos, L * 2.4)) {
            if (o.id === a.id || !isAlive(o) || isHidden(o) || this.expansionContext().allies(a,o)) continue;
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
    }
    if (done) {
      a.abilityActive = false; a.state = 'free'; a.stateT = 0; a.hitDone.clear();
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
        if (band === 'snack' && (o.controller === 'swarm' || (o.controller === 'ambient' && lengthOf(o) < lengthOf(a) * 0.3))) { this.consume(a, o); continue; }
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
      // Only small wild things go down in one gulp. Players and bots always get a fight (three bites from a giant).
      if (o.controller !== 'swarm' && o.controller !== 'ambient') continue;
      if (o.controller === 'ambient' && lengthOf(o) > lengthOf(a) * 0.3) continue;
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
    if (o.controller === 'player' || o.controller === 'bot') { o.respawnT = 1.2; return; } // swallowed: corpse logic respawns them
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

  private pickLockTarget(a: Actor, cycle = 0, currentId = -1, aim = false): Actor | undefined {
    const L = lengthOf(a);
    const h = heading(a.yaw);
    const cands: { a: Actor; score: number }[] = [];
    for (const o of this.nearby(a.pos, aim ? 10 + L * 6 : 14 + L * 7)) {
      if (o.id === a.id || !isAlive(o) || isHidden(o)) continue;
      if (this.mode === 'rise' && o.controller === 'player') continue;
      const to = sub(o.pos, a.pos); const d = len3(to);
      const facing = dot(norm(to), h);
      const band = bandOf(a, o);
      if (!aim && (band === 'snack' || o.controller === 'swarm')) continue;
      if (aim && (band === 'giant' || band === 'threat')) continue;
      // Aiming is for hunting: prey and snacks in front of you come first, rivals after.
      const bandW = aim ? (band === 'prey' ? 0.55 : band === 'snack' ? 0.8 : 1.1) : (band === 'rival' ? 0.6 : 1);
      const score = d * (1.6 - facing) * bandW;
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
      const noticing = o.brain.target === a.id && o.brain.goal === 'notice';
      const score = clamp(o.brain.kind === 'giant' ? Math.max(noticing ? 0.35 : 0, hunting ? Math.max(0.6, clamp(1.3 - d / range, 0.5, 1)) : Math.min(v / 4, 0.45)) : hunting ? clamp(1.1 - d / (range * 0.8), 0, 1) : 0, 0, 1);
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
        if (a.state === 'grabbed' || o.state === 'grabbed' || a.state === 'swallowed' || o.state === 'swallowed') continue;
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
    // The ecosystem lives around the players. Wild things left far behind are dropped, and every
    // player keeps a local population of adults, prey and something big enough to fear.
    const anchors = this.anchors();
    for (const a of this.actors) {
      if (a.controller !== 'ambient' && a.controller !== 'swarm') continue;
      let d = Infinity;
      for (const p of anchors) d = Math.min(d, distXZ(a.pos, p));
      if (d > (a.controller === 'swarm' ? 240 : 290)) this.remove(a);
    }
    for (const p of anchors) {
      let local = 0;
      for (const a of this.nearby(p, 170)) if (a.controller === 'ambient' && isAlive(a)) local++;
      if (local < 12 + this.maxPlayerTier() * 2) { this.spawnAmbient(false, p); break; }
    }
    void ambient;
    // Every player, at every size, should have plenty of things smaller than them within reach.
    for (const p of this.players) {
      if (!isAlive(p)) continue;
      const L = lengthOf(p);
      let small = 0;
      for (const o of this.nearby(p.pos, 45 + L * 4)) { if (o.id !== p.id && isAlive(o)) { const b = bandOf(p, o); if (b === 'snack' || b === 'prey') small++; } }
      if (small < 14) this.spawnPreyFor(p);
    }
    if (swarm < 200) {
      const i = Math.floor(this.rng() * SNACK_SCHOOLS.length);
      const s = SNACK_SCHOOLS[i];
      this.spawnSchool(s.creature, s.scale, s.count, i + Math.floor(this.time));
    }
    // Giants follow the players across the sea: one left far behind is moved to a new lair ahead
    // of them (out of sight), and one that somehow died is replaced.
    for (const c of GIANTS) {
      const g = this.actors.find((a) => a.controller === 'giant' && a.creature === c.creature);
      if (!g) { this.placeGiant(this.spawn(c.creature, 'giant', { ...anchors[0] }, c.scale)); continue; }
      if (isAlive(g) && g.brain?.goal !== 'hunt' && this.anchorDistance(g.pos) > 420) this.placeGiant(g);
    }
    const shadow = this.actors.find((a) => a.controller === 'shadow');
    if (shadow && isAlive(shadow) && shadow.brain?.goal !== 'hunt' && this.anchorDistance(shadow.pos) > 300) this.placeGiant(shadow);
  }

  /** Where this player could teleport right now. */
  teleportOptions(i: number): TeleportOption[] {
    const p = this.players[i]; if (!p) return [];
    const out: TeleportOption[] = [{ dest: 'home', label: 'Your nursery', detail: 'Back to where you hatched', distance: distXZ(p.pos, p.home) }];
    this.players.forEach((o, j) => {
      if (j === i) return;
      out.push({ dest: j, label: `Player ${j + 1} · ${creature(o.creature).name}`, detail: isAlive(o) ? TIER_NAMES[o.tier] : 'respawning', distance: distXZ(p.pos, o.pos) });
    });
    return out;
  }

  /**
   * Move a player home or alongside another player. The sea is endless, so this is how a party
   * regroups. Not while dead, mid-move or on cooldown; arrival comes with a few seconds of
   * protection and a burst of sparkles at both ends.
   */
  teleport(i: number, dest: TeleportDest): boolean {
    const a = this.players[i];
    if (!a || !isAlive(a) || (a.state !== 'free' && a.state !== 'guard') || a.teleportCd > 0 || a.grabbedBy >= 0) return false;
    let pos: Vec3, yaw: number;
    if (dest === 'home') { pos = this.spawnPoint(a.home, a.creature, a.scale, i); yaw = Math.PI; }
    else {
      const o = this.players[dest];
      if (!o || o === a) return false;
      const h = heading(o.yaw), L = lengthOf(o);
      pos = { x: o.pos.x - h.x * (L * 2 + 3), y: o.pos.y, z: o.pos.z - h.z * (L * 2 + 3) };
      yaw = o.yaw;
    }
    this.world.loadAround(pos);
    const g = groundHeight(this.world, pos.x, pos.z, this.scratchBoulders);
    pos.y = clamp(pos.y, g + clearanceOf(a) + 0.2, SURFACE_Y - 1 - clearanceOf(a));
    this.events.push({ kind: 'teleport', pos: { ...a.pos }, actor: a.id, player: i, strength: 0 });
    stopHiding(a); a.camoStrength = 0; a.emergenceHeavy = false; a.pos = pos; a.vel = v3(); a.yaw = yaw; a.pitch = 0; a.bank = 0;
    a.lockTarget = -1; a.hunted = 0; a.hunterId = -1; a.wasHunted = false; a.aiming = false;
    a.spawnProtect = Math.max(a.spawnProtect, 2.5); a.teleportCd = 20; a.hitFlash = 0;
    this.events.push({ kind: 'teleport', pos: { ...pos }, actor: a.id, player: i, strength: 1 });
    this.flag(a, 'teleport');
    return true;
  }

  /**
   * Radar contacts for a player: other players wherever they are, anything big enough to be a
   * threat within about twice the radar's reach (further contacts clamp to the rim), whatever is
   * hunting them regardless of size, plus home and the shore as bearings.
   */
  radarFor(i: number, range: number): RadarBlip[] {
    const p = this.players[i]; if (!p) return [];
    const out: RadarBlip[] = [];
    this.players.forEach((o, j) => { if (j !== i) out.push({ kind: 'player', dx: o.pos.x - p.pos.x, dz: o.pos.z - p.pos.z, distance: distXZ(o.pos, p.pos), id: j, hunting: false }); });
    for (const a of this.actors) {
      if (a.controller === 'player' || !isAlive(a) || isHidden(a)) continue;
      const hunting = !!a.brain && a.brain.target === p.id && (a.brain.goal === 'hunt' || a.brain.goal === 'notice');
      const band = bandOf(p, a);
      if (band !== 'threat' && band !== 'giant' && !hunting) continue;
      const d = distXZ(a.pos, p.pos);
      if (d > range * 2.2 && !hunting) continue;
      out.push({ kind: band === 'giant' ? 'giant' : 'threat', dx: a.pos.x - p.pos.x, dz: a.pos.z - p.pos.z, distance: d, id: a.id, hunting });
    }
    out.push({ kind: 'home', dx: p.home.x - p.pos.x, dz: p.home.z - p.pos.z, distance: distXZ(p.home, p.pos), id: -1, hunting: false });
    const sz = shoreZ(p.pos.x);
    out.push({ kind: 'shore', dx: 0, dz: sz - p.pos.z, distance: Math.abs(sz - p.pos.z), id: -1, hunting: false });
    return out;
  }

  /** The dominant biome under a player, for the HUD banner. */
  biomeOf(i: number): Biome | undefined { const p = this.players[i]; return p ? biomeAt(p.pos.x, p.pos.z) : undefined; }

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
    if (p.hunted >= 0.5) return p.cover > 0.3 ? (len3(p.vel) < 0.3 ? 'Hold still. It is losing you.' : 'You are in cover. Now hold still.') : 'It is coming for you. Get under the sponges, then hold still.';
    if (p.hunted > 0.2) return p.cover > 0.3 ? 'It is looking your way. Stay in cover and freeze.' : 'Something big is looking your way. Stop moving or slip into cover.';
    if (!f.has('moved')) return 'Push the left stick to swim.';
    if (!f.has('burst')) return 'Hold A to sprint. Catch the school.';
    if (!f.has('ate')) return 'Swim through the small fry to eat them.';
    if (!f.has('sense') && this.time > 20) return 'Tap D-pad up: sense pulse shows what is near.';
    if (p.tier === 0 && !f.has('tier')) return 'Eat. Grow. The ring fills toward your next moult.';
    if (p.tier >= 1 && !f.has('light')) return 'X bites. RT pounces. Hunt something your own size.';
    if (p.tier >= 1 && !f.has('dodge')) return 'LB with a stick direction dashes clear of a bite. A sprints.';
    if (p.tier >= 1 && !f.has('guard') && creature(p.creature).canGuard) return 'Hold B to guard. Tap it as a hit lands to parry.';
    if (!f.has('ability')) return `Y: hide. Burrowers bury for free; camouflage copies nearby colours and uses stamina.`;
    if (!f.has('lock') && this.time > 30) return 'Hold LT to aim at prey. When the crosshair fills, RT pounces.';
    if (!f.has('teleport') && this.time > 60 && (this.players.length > 1 || distXZ(p.pos, p.home) > 150)) return 'D-pad down: teleport home, or to another player.';
    return undefined;
  }
}

export { biomeAt };
