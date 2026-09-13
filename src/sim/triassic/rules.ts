import { clamp, distXZ, heading, type Vec3 } from '../../shared/math';
import { makeBrain } from '../ai';
import type { EraHud, EraRules } from '../era-rules';
import { applyScaleStats, isAlive, lengthOf, speedFactor } from '../actors';
import type { HitContext } from '../combat';
import { creature } from '../creatures';
import type { CreatureId } from '../../content/ids';
import type { Game } from '../game';
import type { Actor, InputFrame } from '../types';
import { biomeWeights, coverAt, groundHeight, nurseryAt, RISE_RATE, SURFACE_Y } from '../world';
import { DEVONIAN_RULES } from '../devonian/rules';
import { ADULT_STAGE, devActor, PRIME_STAGE, RUNG_NAMES, STAGE_AT, STAGES, stageForScale, stageProgress, stageScale } from '../devonian/state';
import { botNursery, canBreach as devCanBreach, sanctuary, spawnInCover, spawnProtect, spawnY, swim as devSwim, wanderY } from '../devonian/swim';
import { camoDrain, installTriassicSpecials, stepAbility, useAbility, ySpecial } from './specials';
import { stepShore } from './shore';
import { triActor, triState } from './state';

/**
 * The Triassic era rules (docs/triassic/01-triassic-design.md).
 *
 * The era plays the same three modes and grows through the Devonian's five stages on what it
 * eats; that machinery is reused wholesale (src/sim/devonian/state.ts, the feeding weights in its
 * rules) because none of it is Devonian. What is the Triassic's own hangs off the flags on the
 * creature definitions and the hooks in src/sim/era-rules.ts:
 *
 * - **Air.** An air-breather's stamina recovers nothing under water and everything at the surface,
 *   with a blow. No meter, no drowning; nothing on the roster leaves the water.
 * - **Depth.** The floor sinks by biome (`floorDepth`), so the climb for air is what a biome costs.
 * - **The shore that reaches in.** Shore animals stand on the beach and strike (./shore.ts).
 * - **Armour with a facing**, the pod, live birth beside a mother, heat on the flats and cold in
 *   the deep, a held animal's lost air, and the specials in ./specials.ts.
 */
const RUNG_NAMES_TRI = ['', 'Floor', 'Shelf', 'Hunters', 'Giants'] as const;
/** The stamina left, under water, at which the body starts to sound winded — a quarter bar. */
const WINDED_BELOW = 0.25;
/** How often the winded heartbeat sounds at a quarter bar, closing to a shade under two seconds when the bar is gone. */
const WINDED_EVERY = 3.4;
/** Heat on the gypsum flats: stamina per second for anything that is not built for the salt. */
const HEAT_DRAIN = 1.5;
/** Cold in the deep: the share of recovery an ectotherm keeps there. */
const COLD_REGEN = 0.5;
const MOTHER_T = 60, POD_SIZE = 2;
/**
 * The least of its full-grown climb an air-breather keeps, however small it is. At 0.7 a hatchling
 * crosses the shelf's twelve units in about eight seconds instead of nineteen, and the deepest
 * water stays a long climb without being an impossible one.
 */
const AIR_CLIMB_FLOOR = 0.7;

const isPlayerish = (a: Actor) => a.controller === 'player' || a.controller === 'bot';
/** The game whose step is running, for the hooks that are not handed it (armour). */
let lastGame: Game | undefined;
const players = (g: Game) => g.actors.filter(isPlayerish);
const rungOf = (a: Actor) => creature(a.creature).rung ?? 2;
const breathesAir = (a: Actor) => creature(a.creature).breathing === 'air';
/** At the surface: the top few units, scaled a little by the body. */
const atSurface = (a: Actor) => a.pos.y > SURFACE_Y - 3 - lengthOf(a) * 0.3;

// ---- the hit context the era's own strikes use (the game's is private; these are its public parts) ----
const hitCtxFor = (g: Game): HitContext => ({ events: g.events, byId: (id) => g.byId(id), time: g.time, rng: g.rng, armour: (att, vic, dir) => TRIASSIC_RULES.armour(att, vic, dir) });

// ---- air ----
function updateAir(g: Game, a: Actor, dt: number) {
  const t = triActor(g, a);
  if (!breathesAir(a)) return;
  const up = atSurface(a) && a.grabbedBy < 0;
  if (up && !t.atSurface) {
    // the blow: the bar comes back whole, and the radar hears it — unless the head comes up alone
    a.stamina = a.staminaMax;
    if (a.controller === 'player') g.events.push({ kind: 'gulp', pos: { ...a.pos }, actor: a.id, player: a.player, strength: creature(a.creature).ability === 'neckStrike' ? 0 : 1 });
  }
  if (up) a.stamina = Math.max(a.stamina, a.staminaMax * 0.98);
  t.atSurface = up;
  // winded: a quiet heartbeat under a quarter bar that quickens as the rest goes
  t.windT += dt;
  const left = clamp(a.stamina / Math.max(1, a.staminaMax), 0, 1);
  if (!up && a.controller === 'player' && isAlive(a) && left < WINDED_BELOW) {
    const hard = clamp(1 - left / WINDED_BELOW, 0, 1);
    // A heartbeat, not an alarm. At full spentness this used to fire every second for as long as a
    // player stayed down — a hundred and forty times in three minutes of swimming out to sea, each
    // one a loud cue and a puff of bubbles across the camera. The bar's own mark says the state
    // continuously and silently; the sound is only there to make you feel it, so it stays slow.
    if (t.windT >= WINDED_EVERY - 1.4 * hard) { t.windT = 0; g.events.push({ kind: 'winded', pos: { ...a.pos }, actor: a.id, player: a.player, strength: hard }); }
  } else if (up) t.windT = 0;
  // held under: whatever holds it keeps it from the air, and an exhaustion hold wears it faster
  if (a.grabbedBy >= 0) {
    t.heldT += dt;
    const holder = g.byId(a.grabbedBy);
    if (holder && creature(holder.creature).ability === 'exhaustionHold') a.stamina = Math.max(0, a.stamina - 6 * dt);
  } else t.heldT = 0;
}

// ---- heat and cold ----
function updateClimate(g: Game, a: Actor, dt: number) {
  const def = creature(a.creature);
  const w = biomeWeights(a.pos.x, a.pos.z);
  const heat = w.shallows;
  if (heat > 0.3 && !def.shell && def.id !== 'henodus' && isAlive(a)) a.stamina = Math.max(0, a.stamina - HEAT_DRAIN * heat * dt);
}
const coldAt = (a: Actor) => { const w = biomeWeights(a.pos.x, a.pos.z); return w.basin + w.escarpment * 0.6; };

/**
 * Where the shell can actually be seen.
 *
 * `spawnInCover` picks the spot that hides the body *best*, which is right for a hatchling that
 * has to survive its first minute and wrong for the five seconds before that: the egg is the
 * series' opening beat, and players were watching it happen behind a log or inside a crowd of
 * other animals. So the cover spot is the starting point, not the answer — the egg steps out of
 * the thickest of it into the nearest pocket that still has shelter *around* it, and away from
 * whatever else is standing there.
 *
 * Cheap and bounded: one ring of candidates at a fixed radius, scored and the best taken. Pure in
 * the world and the rng, and it draws nothing from the rng at all, so a match still replays.
 */
function clearTheView(g: Game, at: Vec3, id: CreatureId, scale: number): Vec3 {
  const L = creature(id).adultLength * scale;
  const reach = Math.max(1.2, L * 3);
  /** Shelter worth keeping, and burial to get out of: the band the egg wants to sit in. */
  const WANT = 0.35;
  const crowd = (p: Vec3) => {
    let worst = 0;
    for (const o of g.actors) {
      if (!isAlive(o) || o.controller === 'player') continue;
      const d = Math.hypot(o.pos.x - p.x, o.pos.z - p.z) - lengthOf(o) * 0.5;
      // Anything big enough to stand in front of the shell, near enough to do it.
      if (lengthOf(o) > L * 0.8 && d < reach) worst = Math.max(worst, 1 - clamp(d / reach, 0, 1));
    }
    return worst;
  };
  const score = (p: Vec3) => {
    const c = coverAt(g.world, p, L, []);
    // Distance from the shelter the egg wants, plus whatever is standing in the way.
    return Math.abs(c - WANT) + crowd(p) * 1.5;
  };
  let best = at, bestScore = score(at);
  const N = 8;
  for (let i = 0; i < N; i++) {
    const ang = (i / N) * Math.PI * 2;
    const x = at.x + Math.cos(ang) * reach, z = at.z + Math.sin(ang) * reach;
    const p = { x, y: groundHeight(g.world, x, z, []) + L * 0.13, z };
    const sc = score(p);
    if (sc < bestScore) { bestScore = sc; best = p; }
  }
  return best;
}

// ---- birth: the mother beside the calf ----
function updateMother(g: Game, a: Actor, dt: number) {
  const t = triActor(g, a), def = creature(a.creature);
  if (t.calfT <= 0) { if (t.mother >= 0) { const m = g.byId(t.mother); if (m?.brain) m.brain.home = { ...m.pos }; t.mother = -1; } return; }
  t.calfT -= dt;
  let m = t.mother >= 0 ? g.byId(t.mother) : undefined;
  if (!m || !isAlive(m)) {
    if (t.mother >= 0) { t.mother = -1; return; }              // the mother died: no second one
    const h = heading(a.yaw);
    m = g.spawn(a.creature, 'ambient', { x: a.pos.x - h.x * lengthOf(a) * 2, y: a.pos.y, z: a.pos.z - h.z * lengthOf(a) * 2 }, stageScale(def.adultLength, ADULT_STAGE));
    m.brain = makeBrain('needs', a.pos, g.rng, { aggression: 0.9, courage: 2, temper: 0.6 });
    m.spawnProtect = 3;
    t.mother = m.id;
  }
  if (m.brain) { m.brain.home = { ...a.pos }; if (m.brain.goal === 'wander' && distXZ(m.pos, a.pos) > 10) m.brain.wanderTo = { ...a.pos }; }
  // the mother answers what comes for the calf
  if (a.hunterId >= 0 && m.brain && m.brain.goal !== 'fight' && m.brain.goal !== 'hunt') { m.brain.goal = 'fight'; m.brain.target = a.hunterId; m.brain.goalT = 0; }
}

// ---- the pod ----
function updatePod(g: Game, a: Actor, dt: number) {
  const t = triActor(g, a), def = creature(a.creature);
  if (!def.pod) return;
  t.podShield = Math.max(0, t.podShield - dt);
  t.pod = t.pod.filter((id) => { const m = g.byId(id); return m && isAlive(m); });
  while (t.pod.length < POD_SIZE && isAlive(a)) {
    const ang = g.rng() * Math.PI * 2, r = lengthOf(a) * 1.5;
    const m = g.spawn(a.creature, 'ambient', { x: a.pos.x + Math.cos(ang) * r, y: a.pos.y, z: a.pos.z + Math.sin(ang) * r }, a.scale);
    m.brain = makeBrain('needs', a.pos, g.rng, { aggression: 0.7, courage: 1.5 });
    t.pod.push(m.id);
  }
  for (const id of t.pod) {
    const m = g.byId(id)!;
    if (Math.abs(m.scale - a.scale) > 1e-3) { m.scale = a.scale; applyScaleStats(m, true); }
    if (m.brain) { m.brain.home = { ...a.pos }; if (a.hunterId >= 0 && m.brain.goal !== 'fight') { m.brain.goal = 'fight'; m.brain.target = a.hunterId; m.brain.goalT = 0; } }
  }
}

// ---- the power stroke's shove ----
function updateStroke(g: Game, a: Actor, dt: number) {
  const t = triActor(g, a);
  if (t.strokeT <= 0) return;
  t.strokeT -= dt;
  const L = lengthOf(a), h = heading(a.yaw);
  for (const o of g.nearby(a.pos, L)) {
    if (o.id === a.id || !isAlive(o) || (creature(o.creature).rung ?? 1) > 2) continue;
    const dx = o.pos.x - a.pos.x, dz = o.pos.z - a.pos.z;
    if (dx * h.x + dz * h.z < 0) continue;
    const side = { x: h.z, z: -h.x }, s = Math.sign(dx * side.x + dz * side.z) || 1;
    o.vel.x += side.x * s * 4 * dt * 10; o.vel.z += side.z * s * 4 * dt * 10;
  }
}

// ---- the whorl ----
function updateSaw(g: Game, a: Actor, dt: number) {
  const t = triActor(g, a);
  if (creature(a.creature).ability !== 'whorlSaw' || a.grabbing < 0) { t.sawT = 0; return; }
  const v = g.byId(a.grabbing);
  if (!v || !isAlive(v)) { t.sawT = 0; return; }
  t.sawT += dt;
  v.hp = Math.max(1, v.hp - 4 * dt * (1 - 0.5 * (creature(v.creature).armour ?? 0)));
  v.stamina = Math.max(0, v.stamina - 4 * dt);             // every second held is a second off its escape
  v.sinceHit = 0;
}

/** Feeding grows the animal exactly as in the Devonian: the same weights, the same stages. */
const onNutrition: EraRules['onNutrition'] = (g, a, amount, food) => DEVONIAN_RULES.onNutrition(g, a, amount, food);

export const TRIASSIC_RULES: EraRules = {
  growthByNutrition: false,
  startScale: DEVONIAN_RULES.startScale,
  ladderNames: STAGES,
  ladderRung: DEVONIAN_RULES.ladderRung,
  ladderScale: DEVONIAN_RULES.ladderScale,
  ladderFill: DEVONIAN_RULES.ladderFill,
  ladderFillOf: DEVONIAN_RULES.ladderFillOf,
  onSwap: DEVONIAN_RULES.onSwap,
  install() { installTriassicSpecials(); },
  ySpecial,
  init(g) {
    lastGame = g;
    installTriassicSpecials();
    for (const a of players(g)) {
      const d = devActor(g, a);
      d.stage = stageForScale(creature(a.creature).adultLength, a.scale);
      d.standing = g.mode === 'reef' ? STAGE_AT[ADULT_STAGE] + 5 : STAGE_AT[d.stage];
      const t = triActor(g, a);
      if (creature(a.creature).birth === 'live' && d.stage === 0) t.calfT = MOTHER_T;
    }
  },

  step(g, dt) {
    lastGame = g;
    const s = triState(g);
    s.tick += dt;
    const ctx = hitCtxFor(g);
    for (const a of players(g)) {
      const t = triActor(g, a), def = creature(a.creature);
      t.shoreWarn = 0;                                        // the shore module raises it again this step if it is still winding up
      updateAir(g, a, dt);
      updateClimate(g, a, dt);
      updateMother(g, a, dt);
      updatePod(g, a, dt);
      updateStroke(g, a, dt);
      updateSaw(g, a, dt);
      // the sinkers settle when the stick is still
      if (def.sink && a.state === 'free' && Math.hypot(a.vel.x, a.vel.z) < 0.3 && !a.grabbedBy) {
        const floor = groundHeight(g.world, a.pos.x, a.pos.z, []) + lengthOf(a) * 0.15;
        if (a.pos.y > floor + 0.2) a.vel.y = Math.min(a.vel.y, -1.2);
      }
      // a giant with no bite never hunts; a grazer never hunts
      if ((def.noBite || def.peaceful) && a.brain && (a.brain.goal === 'hunt' || a.brain.goal === 'notice')) { a.brain.goal = 'patrol'; a.brain.target = -1; }
    }
    for (const a of g.actors) if (a.controller === 'shadow' || a.controller === 'giant') { const def = creature(a.creature); if ((def.noBite || def.peaceful) && a.brain && (a.brain.goal === 'hunt' || a.brain.goal === 'notice')) { a.brain.goal = 'patrol'; a.brain.target = -1; } }
    stepShore(g, ctx, dt);
    // a stage the food already paid for is taken as soon as the last ceremony is over: the Devonian's own step does this
    // through checkStage; here the same happens through onNutrition's gain on the next meal, so nudge it along
    for (const a of players(g)) { const d = devActor(g, a); if (d.stage < PRIME_STAGE && d.standing >= STAGE_AT[d.stage + 1] && a.state !== 'moult' && isAlive(a)) DEVONIAN_RULES.onNutrition(g, a, 0.0001, undefined); }
  },

  onNutrition,

  /**
   * Armour with a facing. `all` is a shell or a full carapace; `dorsal` plates on the back are hit
   * from above; a `ventral` plastron is hit from below, and a turtle rolling its belly toward the
   * attacker (`bellyTurn`, while guarding) counts as all. Without a facing the Devonian's
   * snout-to-tail fraction applies. Pierce reads exactly as it does there.
   */
  armour(attacker, victim, dir) {
    void dir;
    const vdef = creature(victim.creature);
    // The pod's shield: for eight seconds after the call, a hit on the calf lands on the nearest
    // pod-mate instead. The multiplier is all this hook returns, so the mate takes the attacker's
    // light bite here and the calf takes almost nothing.
    const g = lastGame;
    if (g && isPlayerish(victim)) {
      const t = triActor(g, victim);
      if (t.podShield > 0) {
        let mate: Actor | undefined, best = 12;
        for (const id of t.pod) { const m = g.byId(id); if (m && isAlive(m)) { const d = distXZ(m.pos, victim.pos); if (d < best) { best = d; mate = m; } } }
        if (mate) { mate.hp = Math.max(1, mate.hp - creature(attacker.creature).light.damage); mate.sinceHit = 0; mate.lastHitBy = attacker.id; return 0.05; }
      }
    }
    let f = vdef.armour ?? 0;
    const guarding = victim.state === 'guard';
    if (guarding && vdef.shell) f = 0.85;
    if (f <= 0) return 1;
    const dy = attacker.pos.y - victim.pos.y, L = Math.max(lengthOf(victim), 1e-3);
    const h = heading(victim.yaw);
    const rel = ((attacker.pos.x - victim.pos.x) * h.x + (attacker.pos.z - victim.pos.z) * h.z) / L;
    const along = clamp(0.5 - rel, 0, 1);                      // 0 = snout, 1 = tail
    let onArmour: boolean;
    if (vdef.shell) onArmour = along > 0.15 || guarding;          // a shell is soft only at the aperture
    else switch (vdef.armourFacing) {
      case 'all': onArmour = true; break;
      case 'dorsal': onArmour = dy > L * 0.12; break;
      case 'ventral': onArmour = dy < -L * 0.12 || (guarding && vdef.ability === 'bellyTurn'); break;
      default: onArmour = along < f;
    }
    if (!onArmour) return 1;
    const pierce = creature(attacker.creature).armourPierce ?? 0;
    return 0.25 + 0.75 * clamp(pierce, 0, 1);
  },

  /** Nobody leaves the water; the shore animals are pinned on the bank and the wall must not push them. */
  shoreReach(a) { return creature(a.creature).shore ? 80 : 0; },
  jet(a) { return !!creature(a.creature).shell; },

  useAbility, stepAbility, camoDrain,

  /**
   * How a body swims: the Devonian's fish model (reverse slow, turn sharp when slow, a fast-start
   * on sprint) with the era's own bodies on top. Flight has no reverse and a wide turn; a
   * thunniform body turns wide at speed; a paddle-rower is slow along the bottom and quick off it.
   */
  swim(g, a, dir, mag, cruise, burstPressed) {
    const def = creature(a.creature);
    if (def.shore) return { speed: 0, turn: 0, impulse: 0 };
    const base = devSwim(g, a, dir, mag, cruise, burstPressed);
    if (def.flight) { const h = heading(a.yaw); const along = mag > 0 ? dir.x * h.x + dir.z * h.z : 1; return { speed: along < -0.2 ? 0.15 : base.speed, turn: base.turn * 0.7, impulse: base.impulse * 1.3 }; }
    if (def.thunniform) { const sp = Math.hypot(a.vel.x, a.vel.z); return { ...base, turn: base.turn * (sp > cruise * 0.6 ? 0.75 : 1) }; }
    if (def.paddleRow) { const floor = groundHeight(g.world, a.pos.x, a.pos.z, []); const low = a.pos.y < floor + lengthOf(a) * 0.5; return { ...base, speed: base.speed * (low ? 0.6 : 1), turn: base.turn * (low ? 1.3 : 1) }; }
    return base;
  },

  /**
   * The vertical assist: the shared rate times the body's own, and an air-breather's sprint carries
   * into its climb.
   *
   * The shared rate is scaled by the body — but the water is not. The surface is the same twelve
   * units above the shelf and the same seventy-eight above the basin whether you hatched this
   * minute or own the sea, so scaling the climb by size made the one animal that *must* reach air
   * the one that could not: a hatchling Nothosaurus climbed at 0.65 units a second against an
   * adult's 2.15, nineteen seconds from the shelf floor and over a minute from the deep, with no
   * stamina coming back the whole way. So an air-breather's climb has a floor under it. It is not
   * a bonus — a grown animal still climbs faster, and everything else in the sea is unchanged —
   * it is the difference between the era's central act being possible and not.
   */
  rise(g, a, input, base, burst) {
    void g;
    const def = creature(a.creature);
    const k = def.riseRate ?? 1;
    if (input.rise) {
      const air = breathesAir(a);
      // `base` already carries the body's speed factor, so the floor is expressed against it. It
      // replaces the body's own rate rather than multiplying it: a Placodus climbs badly on purpose
      // (0.6) and is a small animal besides, and the two together put air out of reach — but it
      // still has lungs, and the one thing the era may never do is leave a lung with no way up.
      const lift = air ? Math.max(k, AIR_CLIMB_FLOOR / Math.max(speedFactor(a.scale), 0.05)) : k;
      return base * lift * (air ? Math.max(1, burst) : 1);
    }
    if (input.sink) return -base * (def.sink ? 1.4 : 1);
    return 0;
  },

  /** Stamina recovery: nothing under water for an air-breather, halved in the cold for anything not warm-blooded. */
  staminaRegen(g, a) {
    const def = creature(a.creature);
    let k = 1;
    if (def.breathing === 'air') k = triActor(g, a).atSurface ? 1 : 0;
    if (!def.warmBlooded && def.breathing !== 'gill') k *= 1 - (1 - COLD_REGEN) * clamp(coldAt(a), 0, 1);
    return k;
  },

  /** The climb is free for an air-breather: there is always a way back to the surface, however spent. */
  climbRelief(a, input, dir, mag) {
    if (!breathesAir(a)) return 0;
    const def = creature(a.creature), sf = speedFactor(a.scale), cruise = def.speed * sf;
    const up = Math.max(0, dir.y) * mag * cruise + (input.rise ? RISE_RATE * (def.riseRate ?? 1) * sf : 0);
    const along = Math.hypot(dir.x, dir.z) * mag * cruise + (input.sink ? RISE_RATE * sf : 0);
    return up <= 0 ? 0 : clamp(up / (up + along), 0, 1);
  },
  canBreach(a) { return !creature(a.creature).shore && devCanBreach(a); },
  spawnY, wanderY,

  /**
   * Everything hatches in cover on the sea floor, the way it does in the other two eras.
   *
   * The live-bearers were briefly born at the surface instead — which is what the fossils say, and
   * Keichousaurus and Dinocephalosaurus have the embryos to prove it — but it cost the series' one
   * opening beat: you come out of an egg, on the bottom, held still while the shell gives. Dropping
   * a player into open midwater instead is a worse first ten seconds than the biology is worth. The
   * research is kept where it still pays: the same species get a grown adult of their own kind
   * beside them for the first minute, which reads as the parental care viviparity implies.
   */
  spawnPoint(g, center, id, scale, index) {
    const at = spawnInCover(g, center, id, scale, index);
    return at ? clearTheView(g, at, id, scale) : at;
  },
  botNursery, spawnProtect, sanctuary,

  moultScale: DEVONIAN_RULES.moultScale,

  onRespawn(g, a) {
    DEVONIAN_RULES.onRespawn(g, a);
    const t = triActor(g, a);
    t.atSurface = false; t.windT = 0; t.heldT = 0; t.podShield = 0; t.strokeT = 0; t.shoreWarn = 0; t.sawT = 0;
    if (creature(a.creature).birth === 'live' && devActor(g, a).stage === 0) { t.calfT = MOTHER_T; t.mother = -1; }
  },

  updateModes: DEVONIAN_RULES.updateModes,
  continueMatch: DEVONIAN_RULES.continueMatch,
  scoreLine(g, a) { const d = devActor(g, a); return { rank: `${STAGES[d.stage]} · ${RUNG_NAMES_TRI[rungOf(a)]}`, progress: stageProgress(d) }; },

  hud(g, i): EraHud | undefined {
    const p = g.players[i]; if (!p) return undefined;
    const d = devActor(g, p), t = triActor(g, p), def = creature(p.creature);
    void RUNG_NAMES; void nurseryAt;
    return {
      standing: d.standing, stageProgress: stageProgress(d), rung: rungOf(p), rungName: RUNG_NAMES_TRI[rungOf(p)], stage: STAGES[d.stage],
      bimodal: def.breathing === 'bimodal', air: def.breathing === 'air', atSurface: t.atSurface, shoreWarn: t.shoreWarn, heldUnder: def.breathing === 'air' && p.grabbedBy >= 0,
      beached: false, primeT: d.primeT, inDeadZone: false, deadZones: [],
    };
  },

  hint(g, i) {
    const p = g.players[i]; if (!p || !isAlive(p)) return undefined;
    const t = triActor(g, p), def = creature(p.creature), rung = rungOf(p);
    if (t.shoreWarn > 0) return 'Something on the shore is fishing. Get deeper.';
    if (g.time < 12) return def.birth === 'live' ? 'Out of the shell, and a parent of your own kind is with you for a minute. Breathe, dive, feed.' : rung === 1 ? 'Feed, hide, moult. Everything out there is bigger than you are today.' : rung === 2 ? 'Feed and keep near the top. Air is what effort costs.' : rung === 3 ? 'Hunt the shelf. Five stages between you and Prime, and every fight ends at the surface.' : 'Stay fed. The deep is yours; the flats are closed to you.';
    if (def.shell && g.time < 40) return 'Your funnel makes rise and sink free, and no direction is slow. Block withdraws into the shell.';
    if (def.sink && g.time < 40) return 'You settle when you stop. The floor is where you feed.';
    return undefined;
  },
};

export { WINDED_BELOW, HEAT_DRAIN, COLD_REGEN, MOTHER_T, POD_SIZE };
