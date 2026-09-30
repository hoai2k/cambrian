/**
 * Death and coming back: the swallowed, the corpse, the co-op revive, the respawn and where it
 * lands, and the hatch out of an egg. Split out of src/sim/game.ts; every function takes the Game.
 */
import { RULES } from './era-rules';
import { stopHiding } from './concealment';
import { clamp, damp, dist, distXZ, heading, TAU, v3, wrapAngle, type Vec3 } from '../shared/math';
import { applyScaleStats, clearanceOf, isAlive, lengthOf } from './actors';
import { tierScale } from './tiers';
import { kill } from './combat';
import { creature } from './creatures';
import { clampMark, deathMark, ladderMark, ladderRung, placeOnLadder } from './ladder';
import { type Actor } from './types';
import { coverAt, groundHeight, nearestNursery, nurseryAt, sampleCurrent, shoreDistance, SURFACE_Y, type Cover } from './world';
import { SURVIVAL_DEATH_COST } from './survival';
import { TEXT } from '../shared/text';
import { CORPSE_WINDOW, HATCH_HOLD, HATCH_TIME, type Game } from './game';
import { canEat, gainNutrition, MOUTH_AHEAD, nutritionValue } from './game-feeding';
import { clearRide } from './game-grip';

/** Everything the simulation says out loud; the words are in `src/content/strings.ts`. */
const SAY = TEXT.sim;

/**
 * Co-op revive. A downed player in Rise lies on the floor for this long instead of dissolving
 * after the usual three seconds, and any living team-mate who swims into them brings them back
 * where they fell with no tier lost. Solo, and in every other mode, death is unchanged: the
 * window only opens when there is somebody who could actually reach you.
 */
const DOWNED_WINDOW = 10;

/**
 * How close a team-mate has to be when you go down for the window to open at all. Roughly what a
 * sprint covers in the window itself, so a rescue is always a real race and never a formality —
 * and so a partner on the far side of an endless sea does not leave you lying there for ten
 * seconds waiting for somebody who was never coming.
 */
const REVIVE_REACH = 90;

/** Seconds a rescuer must hold station beside a downed team-mate. */
const REVIVE_HOLD = 0.6;

/**
 * How far out a death still counts as inshore, so the nursery is the right place to come back to.
 * The nurseries sit 88 units off the beach and the shallows run out to about 135, so this covers
 * the shore band and nothing beyond it: past here you are living somewhere, and `respawnAt` brings
 * you back to it rather than to the beach.
 */
const RESPAWN_INSHORE = 170;

/** In a predator's mouth: slide in, shrink, and after the gulp become a consumed corpse. */
export function updateSwallowed(game: Game, a: Actor, dt: number) {
  a.stateT += dt;
  const pred = a.swallowedBy >= 0 ? game.idMap.get(a.swallowedBy) : undefined;
  if (!pred || !isAlive(pred)) { kill(game.hitCtx, a, pred); a.swallowedBy = -1; return; }
  const h = heading(pred.yaw); const PL = lengthOf(pred);
  const t = clamp(a.stateT / a.stateDur, 0, 1);
  const depth = MOUTH_AHEAD - t * 0.25;                  // slides from the mouth toward the gut
  const tx = pred.pos.x + h.x * PL * depth, ty = pred.pos.y - Math.sin(pred.pitch) * PL * depth * 0.6, tz = pred.pos.z + h.z * PL * depth;
  a.pos.x = damp(a.pos.x, tx, 16, dt); a.pos.y = damp(a.pos.y, ty, 16, dt); a.pos.z = damp(a.pos.z, tz, 16, dt);
  a.yaw = pred.yaw; a.pitch = pred.pitch; a.bank = damp(a.bank, Math.PI * 0.5, 4, dt);
  a.hitFlash = 0.2;
  if (a.stateT >= a.stateDur) {
    kill(game.hitCtx, a, pred);
    a.eaten = 1;                                        // nothing left to scavenge
    const val = nutritionValue(game, pred, a);
    if (canEat(game, pred, a)) { gainNutrition(game, pred, a, val); pred.eats++; pred.hp = Math.min(pred.hpMax, pred.hp + val * 0.5); }
    if (a.controller === 'player') a.respawnT = a.stateDur; else game.remove(a);
  }
}

/**
 * Corpses go limp, roll belly-up and drift slowly upward with the current, so a dead thing reads as
 * dead at a glance. Players and bots dissolve into sparkles after three seconds and respawn.
 */
export function updateCorpse(game: Game, a: Actor, dt: number) {
  a.corpseT += dt; a.stateT += dt;
  const def = creature(a.creature);
  const inMouth = a.eaten >= 1 && a.swallowedBy >= 0;
  // A downed team-mate is not a corpse yet: they settle where they fell and stay there. A body
  // that drifted up with the current the way a dead one does would float out of reach of the
  // ally swimming down to it, and the rescue would be a matter of luck rather than of speed.
  const downed = revivable(game, a);
  if (downed) {
    const floor = groundHeight(game.world, a.pos.x, a.pos.z, game.scratchBoulders) + clearanceOf(a) * 0.6;
    a.vel.x = damp(a.vel.x, 0, 3, dt); a.vel.z = damp(a.vel.z, 0, 3, dt);
    a.pos.x += a.vel.x * dt; a.pos.z += a.vel.z * dt;
    a.pos.y = Math.max(floor, damp(a.pos.y, floor, 2.5, dt));
    a.vel.y = 0;
    a.bank = damp(a.bank, Math.PI * 0.75, 1.6, dt);       // rolled over, but not adrift
    a.pitch = damp(a.pitch, 0, 2, dt);
  } else if (!inMouth) {
    const floor = groundHeight(game.world, a.pos.x, a.pos.z, game.scratchBoulders) + clearanceOf(a) * 0.6;
    const cur = sampleCurrent(v3(), a.pos.x, a.pos.y, a.pos.z, game.time);
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
  if (a.controller === 'player') {
    a.respawnT += dt;
    // three seconds of corpse (or of being digested), a puff of sparkles, then back in — or, for
    // a downed team-mate somebody could still reach, ten, and a revive ends it early.
    const total = downed ? DOWNED_WINDOW : CORPSE_WINDOW;
    if (downed && tryRevive(game, a, dt)) return;
    if (!a.sparkled && a.respawnT > total - 0.4) {
      a.sparkled = true;
      const pred = inMouth ? game.idMap.get(a.swallowedBy) : undefined;
      const at = pred ? { x: pred.pos.x - Math.sin(pred.yaw) * lengthOf(pred) * 0.1, y: pred.pos.y - lengthOf(pred) * 0.05, z: pred.pos.z - Math.cos(pred.yaw) * lengthOf(pred) * 0.1 } : { ...a.pos };
      game.events.push({ kind: 'disintegrate', pos: at, actor: a.id, other: pred?.id, player: a.player, strength: lengthOf(a) });
      if (!inMouth) a.eaten = 1;     // body dissolves
    }
    if (a.respawnT > total) respawn(game, a);
  }
}

/**
 * Whether this body is a downed team-mate rather than a corpse: co-op only, with at least one
 * other player alive to come and get them, and still lying where they fell (not in a mouth).
 */
export function revivable(game: Game, a: Actor): boolean {
  if (game.mode !== 'rise' || a.controller !== 'player' || a.swallowedBy >= 0 || a.eaten >= 1) return false;
  return game.players.some((o) => o !== a && isAlive(o) && distXZ(o.pos, a.pos) < REVIVE_REACH);
}

/** How far through the rescue dwell a downed player is, 0..1, for the HUD. */
export function reviveProgress(game: Game, a: Actor): number { return a.state === 'dead' ? clamp(a.reviveT / REVIVE_HOLD, 0, 1) : 0; }

export function reviveWindow(game: Game, a: Actor): number {
  return a.state === 'dead' && revivable(game, a) ? Math.max(0, DOWNED_WINDOW - a.respawnT) : 0;
}

/**
 * A downed team-mate is brought back by a rescuer who holds station beside them for
 * `REVIVE_HOLD` seconds. The dwell is what makes it a choice: a body on the floor is also a
 * meal, and biting it feeds you instead. Swim up and wait and you get your ally back; press the
 * attack and you get their nutrition. The button you press decides which, and the pause is what
 * costs you — half a second stationary over a corpse, in the open, is the price of the rescue.
 */
export function tryRevive(game: Game, a: Actor, dt: number): boolean {
  const L = lengthOf(a);
  let helper: Actor | undefined;
  for (const o of game.players) {
    if (o === a || !isAlive(o) || o.state === 'moult') continue;
    if (dist(o.pos, a.pos) > lengthOf(o) * 0.8 + L * 0.6 + 2) continue;
    // Somebody eating this body has made the other choice; the dwell does not run for them.
    if (o.state === 'eating' && o.eatingTarget === a.id) continue;
    helper = o; break;
  }
  if (!helper) { a.reviveT = 0; return false; }
  a.reviveT += dt;
  if (a.reviveT < REVIVE_HOLD) return false;
  // Back up, where you fell, with the tier you had. The cost of dying in co-op is the time your
  // ally spent coming to get you, and the pair of you standing still in the open to do it.
  a.state = 'free'; a.stateT = 0; a.respawnT = 0; a.corpseT = 0; a.eaten = 0; a.sparkled = false; a.reviveT = 0;
  a.hp = a.hpMax * 0.45; a.stamina = a.staminaMax * 0.5; a.poise = a.poiseMax;
  a.vel = v3(); a.bank = 0; a.pitch = 0; a.hitFlash = 0; a.tumble = v3(); a.climbTo = -Infinity; a.climbPush = 0; clearRide(game, a);
  a.spawnProtect = RULES.spawnProtect?.(a) ?? 2.5; a.hunted = 0; a.hunterId = -1; a.lastHitBy = -1; a.killer = -1;
  a.pos.y = groundHeight(game.world, a.pos.x, a.pos.z, game.scratchBoulders) + clearanceOf(a) + 0.2;
  game.events.push({ kind: 'moult', pos: { ...a.pos }, actor: a.id, player: a.player, strength: 0.7 });
  game.progress[a.player]?.prompts.push({ text: SAY.revivedBy(creature(helper.creature).name), t: 3 });
  game.flag(helper, 'revive');
  return true;
}

export function respawn(game: Game, a: Actor) {
  const def = creature(a.creature);
  // Death costs half of the rung you are standing on (`DEATH_COST`), not the whole rung you had
  // climbed — so it demotes only when you were less than halfway through, and costs the same
  // wherever in a rung it lands. The era hook still runs first for everything else a respawn
  // resets; the ladder itself is settled here so all three games price a death the same way.
  RULES.onRespawn(game, a);
  if (game.mode === 'survival') placeOnLadder(game, a, clampMark(ladderMark(game, a) - SURVIVAL_DEATH_COST));
  else if (game.mode !== 'reef') placeOnLadder(game, a, deathMark(ladderMark(game, a)));
  applyScaleStats(a, false);
  a.eaten = 0;
  a.stamina = a.staminaMax; a.poise = a.poiseMax;
  a.hunger = 100;
  // Back near another player (the party stays together in an endless sea), or failing that where
  // you died.
  let ref = a.pos, refD = Infinity;
  for (const o of game.players) if (o !== a && isAlive(o)) { const d = distXZ(o.pos, a.pos); if (d < refD) { refD = d; ref = o.pos; } }
  const near = nearestNursery(ref.x, ref.z);
  let nursery = near.pos, bd = Infinity;
  for (let i = near.index - 1; i <= near.index + 1; i++) {
    const n = nurseryAt(i);
    let danger = 0;
    for (const g of game.actors) if ((g.controller === 'giant') && isAlive(g) && distXZ(g.pos, n) < 60) danger += 1;
    const score = danger * 100 + distXZ(ref, n) * 0.2;
    if (score < bd) { bd = score; nursery = n; }
  }
  // `home` is still the nursery: it is where this animal hatched and what the teleport means.
  // Where it comes *back* is a different question, and the answer is the water it was living in.
  a.home = { ...nursery };
  const at = respawnAt(game, ref, nursery);
  game.world.loadAround(at);
  a.pos = game.spawnPoint(at, a.creature, a.scale, a.player);
  a.vel = v3(); a.state = 'free'; a.stateT = 0; a.respawnT = 0; a.corpseT = 0; a.eaten = 0; a.eatBites = 0;
  a.airborne = false; a.wade = 0; a.ashore = false; a.strandT = 0; a.flopT = 0;
  stopHiding(a); a.camoStrength = 0; a.hideCd = 0; a.emergenceHeavy = false; a.spawnProtect = RULES.spawnProtect?.(a) ?? 3.5; a.hitFlash = 0; a.abilityActive = false; a.abilityCd = 0; a.lockTarget = -1; a.hunted = 0; a.hunterId = -1; a.wasHunted = false; a.swallowedBy = -1; a.bank = 0; a.pitch = 0; a.climbTo = -Infinity; a.climbPush = 0; clearRide(game, a);
  a.yaw = Math.PI;
  beginHatch(game, a);
  void def;
}

/**
 * Where a body comes back, given where it was and the nursery it hatched in.
 *
 * Dying used to send a player to the nearest nursery, and every nursery sits a fixed eighty-eight
 * units off the beach — so an animal that had spent the whole match working its way out to the
 * open sea was returned to the shallows every time something killed it, and had to swim the
 * distance again. In a sea whose depth is the biome's own that is a longer walk back than it
 * used to be, and it undoes the one thing the player was doing.
 *
 * So: come back in the water you were living in. Inshore that is still the nursery — it is the
 * hatchery, it is safe by non-aggression, and it is in the shore band anyway, so nothing is
 * gained by inventing a second answer for it. Further out, pick a spot around where you were at
 * the same distance from shore, which is the same biome and the same depth, and away from
 * whatever giant is in the area. A death still costs a rung and half the progress toward the
 * next one; it does not also cost the swim.
 */
export function respawnAt(game: Game, ref: Vec3, nursery: Vec3): Vec3 {
  const s = shoreDistance(ref.x, ref.z);
  if (s <= RESPAWN_INSHORE) return nursery;
  let best = ref, bd = Infinity;
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * TAU + game.rng() * 0.6;
    const r = 30 + game.rng() * 70;
    const p = { x: ref.x + Math.cos(ang) * r, y: 0, z: ref.z + Math.sin(ang) * r };
    let danger = 0;
    for (const g of game.actors) if (g.controller === 'giant' && isAlive(g) && distXZ(g.pos, p) < 70) danger += 1;
    // Drifting in or out of the band you died in is what this is here to prevent, so it is
    // scored heavily against; a giant in the area outweighs it anyway.
    const score = danger * 100 + Math.abs(shoreDistance(p.x, p.z) - s) * 0.6;
    if (score < bd) { bd = score; best = p; }
  }
  return best;
}

/**
 * Hatch this body in. On the bottom rung that is the egg: five seconds of the shell taking a
 * poke from inside, splitting, and the animal wriggling out of it (the shell itself is drawn by
 * `src/render/eggs.ts`, which reads `hatching` and the state clock). Anything already grown is
 * the old second-long swell out of nothing, because it did not come from an egg.
 */
export function beginHatch(game: Game, a: Actor) {
  const egg = ladderRung(game, a) === 0;
  a.hatching = true; a.state = 'moult'; a.stateT = 0; a.stateDur = egg ? HATCH_HOLD : 1.0;
  a.vel = v3();
  if (egg) layEgg(game, a);
  // Nothing may eat a body that cannot yet move: the shell is protection until it is out of it.
  if (egg) a.spawnProtect = Math.max(a.spawnProtect, HATCH_TIME + 1.5);
  if (!egg) game.events.push({ kind: 'moult', pos: { ...a.pos }, actor: a.id, player: a.player, strength: 0.5 });
}

/**
 * End any hatch in progress, as if the shell had already been left behind. Headless harnesses
 * that set up a situation and drive it use this: five seconds of egg at the top of every match
 * is the experience, not something each test wants to sit through.
 */
export function skipHatch(game: Game) {
  for (const a of game.players) {
    if (!a.hatching || a.state !== 'moult') continue;
    const era = RULES.moultScale?.(game, a);
    a.scale = era ? era.to : tierScale(a.creature, a.tier);
    a.state = 'free'; a.stateT = 0; a.stateDur = 0; a.hatching = false; game.eggAt.delete(a.id);
    applyScaleStats(a, true); a.hp = a.hpMax;
  }
}

/**
 * Where an egg is: on the sand, tucked against the nearest rock or plant. An egg does not float
 * in open water, and the spawn point the body was handed is a point in the water, so the body
 * is moved to the foot of the closest cover before the hatch starts (a jump, but the shell has
 * not been drawn yet). With nothing to lean on it still goes down onto the floor.
 */
export function layEgg(game: Game, a: Actor) {
  const L = lengthOf(a);                              // full hatched length: the moult has not started
  let best: Cover | undefined, bd = Infinity;
  for (const c of game.world.coverHash.query(a.pos.x, a.pos.z, 16, game.scratchCover)) {
    const d = distXZ(a.pos, c.pos);
    if (d < bd) { bd = d; best = c; }
  }
  let x = a.pos.x, z = a.pos.z;
  // An era that picks the patch itself (the Devonian hatches inside plant cover, `spawnInCover`)
  // has already chosen better than this can: keep where it put the body and only settle it onto
  // the sand. Everything else is handed a point in open water and has to be laid against
  // something.
  const hidden = coverAt(game.world, a.pos, L, game.scratchCover) > 0.2;
  if (best && !hidden) {
    // On the open side of it — the clearing at the heart of the nursery, where nothing grows —
    // rather than the side that happens to face the spawn point, which in a ring of sponges is
    // usually deeper into the ring.
    let dx = a.home.x - best.pos.x, dz = a.home.z - best.pos.z;
    if (Math.hypot(dx, dz) < 0.5) { dx = a.pos.x - best.pos.x; dz = a.pos.z - best.pos.z; }
    const d = Math.max(Math.hypot(dx, dz), 1e-3);
    const off = best.radius + L * 0.7;                // beside it, clear of the growth itself
    x = best.pos.x + (dx / d) * off; z = best.pos.z + (dz / d) * off;
    // Nose to the rock: the camera hangs behind the body, so the growth stands behind the egg
    // and the camera has the clearing to sit in.
    a.yaw = Math.atan2(-dx, -dz);
  }
  const g = groundHeight(game.world, x, z, game.scratchBoulders);
  // Down *into* the sand — an egg is not balanced on the seabed, it is settled into it, so the
  // shell stands a little under half buried and the body inside sits at the same height. Never so
  // far down that it drops out of the patch that was hiding it, though: a plant's cover is a ball
  // centred over its own base, and the last few inches to the floor can cost a hatchling the
  // growth it was laid in.
  const rest = g + L * 0.13;                          // the shell's radius is about 0.22 of this
  a.pos = { x, y: best && hidden ? Math.max(rest, best.pos.y - best.radius * 0.75) : rest, z };
  a.prevT = { ...a.pos, yaw: a.yaw, pitch: a.pitch, bank: a.bank };
  game.eggAt.set(a.id, { ...a.pos });
}

/** True while the body is still inside its shell: it cannot swim and nothing it presses counts. */
export function inShell(game: Game, a: Actor) { return a.hatching && a.state === 'moult' && a.stateDur > 1.5; }
