/**
 * Eating: a bite's mouthful, a corpse, the snacks a body swims through, what a meal is worth, and
 * growing on it. Split out of src/sim/game.ts; every function takes the Game.
 */
import { RULES } from './era-rules';
import { clamp, dist, dot, heading, len3, norm, sub } from '../shared/math';
import { bandOf, bodyRadius, isAlive, isHidden, lengthOf, mouthReach, speedFactor } from './actors';
import { peaceful } from './ai';
import { applyHit, kill, startSwallow } from './combat';
import { creature, type CreatureDef, type MoveDef } from './creatures';
import { TIER_NEED, type Actor, type Tier } from './types';
import { hungerWorth } from './survival';
import { bitesFor, type Game } from './game';
import { closeGrip } from './game-grip';

/**
 * Where the mouth is: the point a bite reaches from and a swallowed body is carried to
 * (`updateSwallowed` starts it here). Kept in one place so that a catch is decided at the same
 * point the catch is then drawn at, and nothing jumps between the two.
 */
export function mouthPoint(a: Actor, L = lengthOf(a)) {
  const h = heading(a.yaw);
  return { x: a.pos.x + h.x * L * MOUTH_AHEAD, y: a.pos.y - Math.sin(a.pitch) * L * 0.3, z: a.pos.z + h.z * L * MOUTH_AHEAD };
}
/** How far forward of the body's centre the mouth sits, in body lengths. */
export const MOUTH_AHEAD = 0.42;
/** A body is at the mouth when the mouth is inside it, give or take this share of the eater's length. */
export const MOUTH_TOUCH = 0.06;

/**
 * Whether `o` is in the mouth — actually touching it, not merely near the body. A pounce and a
 * player's contact bite take their catch only here, so the animal is caught where it swims rather
 * than snatched across the gap into the jaws.
 */
export function atMouth(a: Actor, o: Actor, L = lengthOf(a)) {
  return dist(mouthPoint(a, L), o.pos) <= bodyRadius(o) + L * MOUTH_TOUCH;
}

export function attackHits(game: Game, a: Actor, m: MoveDef, L: number, dt = 1 / 60) {
  const mouth = m.sweep ? a.pos : mouthPoint(a, L);
  const reach = m.sweep ? L * 0.85 : mouthReach(a, L);
  /**
   * A bite takes **one** mouthful.
   *
   * This loop used to call `takeWhole` for every snack inside the mouth, so a single bite into a
   * prey swarm made three or four animals vanish at once — and the player never saw any of them
   * taken, because a swarm member goes down without ceremony. The nearest one is remembered here
   * and swallowed after the loop, so it is carried in the jaws and eaten where it can be seen;
   * anything else in the way is struck, as a bite that lands on two bodies should.
   * Bulk feeding is untouched: a filter feeder crossing a shoal has its own path, and a reef
   * predator that is not steered still eats the way it always did.
   */
  let mouthful: Actor | undefined, mouthfulD = Infinity;
  let reaching: Actor | undefined, reachingD = Infinity;
  const steered = a.controller === 'player';
  for (const o of game.nearby(a.pos, L * 1.5 + 4)) {
    if (o.id === a.id || !isAlive(o) || a.hitDone.has(o.id) || isHidden(o)) continue;
    if (o.controller === 'swarm' && a.controller === 'swarm') continue;
    const d = dist(mouth, o.pos);
    if (d < reach + bodyRadius(o) * 1.1) {
      a.hitDone.add(o.id);
      // A strike made with the grip button down arrives as a grip rather than a blow: the whole
      // point of holding it is to end up holding something, and a strike that damaged on the way
      // in settled the matter before the grip ever shut — on prey the blow simply killed what
      // was being reached for, and on anything big it meant you could not get hold of it without
      // hurting it first. What the hold comes to is decided when the button comes up.
      if (a.graspHold && a.grabbing < 0 && a.rideHost < 0 && closeGrip(game, a, o)) continue;
      const closing = clamp(dot(sub(a.vel, o.vel), norm(sub(o.pos, a.pos))) / (creature(a.creature).speed * speedFactor(a.scale) * 1.8), 0, 1.5);
      const band = bandOf(a, o);
      if (band === 'snack' && (o.controller === 'swarm' || (o.controller === 'ambient' && lengthOf(o) < lengthOf(a) * 0.3))) {
        if (!steered) { takeWhole(game, a, o); continue; }
        // In reach is not in the mouth. The bite carries the body the rest of the way (below) and
        // takes the animal when the jaws are on it, so nothing is pulled across the gap.
        if (!atMouth(a, o, L)) { a.hitDone.delete(o.id); if (d < reachingD) { reachingD = d; reaching = o; } continue; }
        if (d < mouthfulD) { mouthfulD = d; mouthful = o; }
        continue;
      }
      const r = applyHit(game.hitCtx, a, o, m, closing);
      if (o.controller === 'player' && (band === 'rival')) game.flag(o, 'fought');
      void r;
    }
  }
  if (mouthful && isAlive(mouthful)) takeWhole(game, a, mouthful);
  else if (reaching) {
    // Close on it: the body moves, never the prey, at a lunge's pace and no further than the jaws
    // need to go. Checked again next step, while the bite is still live.
    const mp = mouthPoint(a, L);
    const to = sub(reaching.pos, mp);
    const gap = len3(to) - bodyRadius(reaching);
    const step = Math.min(Math.max(0, gap), L * BITE_CLOSE * dt);
    if (step > 0) { const n = norm(to); a.pos.x += n.x * step; a.pos.y += n.y * step; a.pos.z += n.z * step; }
  }
}

/** Body lengths a second a bite closes the last of the gap to a mouthful at. */
export const BITE_CLOSE = 5;

export function corpseInReach(game: Game, a: Actor): Actor | undefined {
  const L = lengthOf(a);
  let best: Actor | undefined, bd = Infinity;
  for (const o of game.nearby(a.pos, L * 1.2 + 3)) {
    if (o.state !== 'dead' || o.eaten >= 1 || o.id === a.id) continue;
    const d = dist(a.pos, o.pos);
    if (d < L * 0.7 + lengthOf(o) * 0.5 && d < bd) { bd = d; best = o; }
  }
  return best;
}

export function startEating(game: Game, a: Actor, c: Actor) {
  if (!canEat(game, a, c)) return;
  a.state = 'eating'; a.stateT = 0; a.eatingTarget = c.id;
  a.lockTarget = -1;
  // The body's own bite count: whoever takes the first bite sizes it, and a carcass already
  // half eaten keeps the count it was opened with.
  if (c.eatBites < 1 || c.eaten <= 0) c.eatBites = bitesFor(a, c);
}

/**
 * Whether a Survival body has room to eat. Any room at all: the meal tops the bar up to full and
 * the rest is left. It used to ask whether the *whole* meal fitted, and a kill half again your
 * own length is worth the full bar, so it could only be eaten at exactly zero hunger — which is
 * starving — and a peer-sized kill waited until you were half empty.
 */
export function canEat(game: Game, a: Actor, food: Actor): boolean {
  void food;
  return game.mode !== 'survival' || (a.controller !== 'player') || a.hunger < 100;
}

/** Survival growth: `fraction` of the whole ladder, in whichever units this game keeps it. */
export function gainSurvivalXp(game: Game, a: Actor, fraction: number) {
  if (a.state === 'dead' || a.state === 'swallowed' || fraction <= 0) return;
  RULES.survivalGrow(game, a, fraction);
}

export function consumeSnacks(game: Game, a: Actor, L: number, def: CreatureDef) {
  if (a.state === 'dead') return;
  const moving = len3(a.vel) > 0.5 || !!def.snatches;
  for (const o of game.nearby(a.pos, L * 0.6 + 1)) {
    if (o.id === a.id || !isAlive(o)) continue;
    if (bandOf(a, o) !== 'snack') continue;
    // Only small wild things go down in one gulp. Players always get a fight (three bites from a giant).
    if (o.controller !== 'swarm' && o.controller !== 'ambient') continue;
    if (o.controller === 'ambient' && lengthOf(o) > lengthOf(a) * 0.3) continue;
    // Swimming through a cloud of plankton feeds you; swimming *at* an animal does not. For a
    // player an animal is something to be caught — bitten, pounced on, taken in the mouth — and
    // having one vanish as you closed on it was the whole of what made hunting feel like nothing
    // happened. The reef's own predators still take a mouthful in passing.
    if ((a.controller === 'player') && o.controller !== 'swarm' && a.state !== 'attack' && a.state !== 'pounce') continue;
    // A nursery is a peace, and a mouthful taken in passing breaks it as surely as a hunt does.
    if (peaceful(o.pos) && a.lastHitBy !== o.id) continue;
    if (dist(a.pos, o.pos) < L * 0.4 + bodyRadius(o) && (moving || a.state === 'attack')) {
      // A school fish a player merely swims through goes down in passing, with no swallow: a
      // swallow holds the body still for its length, and brushing a shoal must not stop you dead.
      // One met in a bite or a pounce is being *caught*, and is carried in the jaws like any other
      // catch — this path used to eat the fish a pounce was homing on half a body length early,
      // with no swallow, which is the fish vanishing ahead of the chase.
      const striking = a.state === 'attack' || a.state === 'pounce';
      if (a.controller === 'player' && o.controller === 'swarm' && !striking) consume(game, a, o);
      // A player striking takes only what its mouth has reached, so nothing beside the body is
      // pulled across into the jaws.
      else if (a.controller === 'player' && !atMouth(a, o, L)) continue;
      else takeWhole(game, a, o);
    }
  }
}

/**
 * Take a whole mouthful.
 *
 * A wild thing small enough to go down in one gulp is *removed* when wildlife takes it: nobody is
 * watching, and a reef of grazers cannot afford a performance each. When a player takes one it is
 * the whole point of the act, so it goes into the mouth and is eaten there — the body is carried
 * along in front of the jaws and swallowed over the next second (`updateSwallowed`), which is the
 * same performance a bigger kill already had. It used to vanish on contact, which read as prey
 * evaporating as you reached it rather than as being caught.
 */
export function takeWhole(game: Game, a: Actor, o: Actor) {
  if (!canEat(game, a, o)) { kill(game.hitCtx, o, a); return; }
  // Wildlife eats without ceremony. Anything a player *goes for* — a bite, a pounce — is taken in
  // the mouth, school fish included. The school fish used to be the exception here, and a school
  // fish is what a hatchling hunts most, so a double-click chase ended with the fish simply gone.
  // (Swimming *through* a school is still a mouthful in passing: `consumeSnacks` does that itself.)
  if (a.controller !== 'player') { consume(game, a, o); return; }
  const ratio = clamp(lengthOf(o) / Math.max(lengthOf(a), 1e-3), 0.05, 1);
  startSwallow(game.hitCtx, a, o);
  // A mouthful is not a meal: the chew and the pause both follow how big the thing was.
  o.stateDur = clamp(0.45 + ratio * 2.6, 0.45, 1.6);
  a.holdT = clamp(ratio * 3, 0.3, 1.4);
  game.flag(a, 'ate');
}

export function consume(game: Game, a: Actor, o: Actor) {
  if (!canEat(game, a, o)) { kill(game.hitCtx, o, a); return; }
  kill(game.hitCtx, o, a);
  o.eaten = 1;
  const val = nutritionValue(game, a, o);
  gainNutrition(game, a, o, val);
  a.eats++;
  a.hp = Math.min(a.hpMax, a.hp + val * 0.4);
  game.events.push({ kind: 'eat', pos: { ...o.pos }, actor: a.id, other: o.id, strength: lengthOf(o) / lengthOf(a), player: a.player });
  game.flag(a, 'ate');
  if (o.controller === 'player') { o.respawnT = 1.2; return; } // swallowed: corpse logic respawns them
  game.remove(o);
}

export function nutritionValue(game: Game, eater: Actor, food: Actor) {
  const ratio = lengthOf(food) / lengthOf(eater);
  let v = 20 * ratio * ratio;
  if (ratio >= 0.7 && ratio < 1.4) v *= 2.5;
  else if (ratio >= 1.4) v *= 3.5;
  else if (ratio < 0.2) v *= 0.3;
  return clamp(v, 0.3, 120);
}

export function gainNutrition(game: Game, a: Actor, food: Actor | undefined, amount: number) {
  if (a.controller !== 'player') { a.hp = Math.min(a.hpMax, a.hp + amount * 0.5); return; }
  if (game.mode === 'survival') {
    // Every way of feeding fills the stomach — a kill, a carcass, a bloom, a grazed mat, a
    // giant's bones. Only the first two have a body to measure; the rest arrive as an amount
    // already, and leaving them out starved every grazer and filter feeder whatever it did.
    if (food) {
      const whole = Math.max(nutritionValue(game, a, food), 1e-3);
      const ratio = lengthOf(food) / Math.max(lengthOf(a), 1e-3);
      a.hunger = Math.min(100, a.hunger + amount * hungerWorth(ratio, whole) / whole);
    } else a.hunger = Math.min(100, a.hunger + amount);
    return;
  }
  if (game.mode === 'reef' && a.tier >= 4) return;
  a.nutrition += amount;
  // co-op share
  if (game.mode === 'rise' && food && amount > 2) for (const p of game.players) if (p !== a && isAlive(p) && dist(p.pos, a.pos) < 25) p.nutrition += amount * 0.3;
  RULES.onNutrition?.(game, a, amount, food);
  if (!RULES.growthByNutrition) return;
  checkTierUp(game, a);
  for (const p of game.players) if (p !== a) checkTierUp(game, p);
}

/** The Cambrian's moult: nutrition past this tier's need grows the body a tier. */
export function checkTierUp(game: Game, a: Actor) {
  if (a.tier >= 4 || a.state === 'moult' || a.state === 'dead') return;
  if (a.nutrition >= TIER_NEED[a.tier]) {
    a.nutrition -= TIER_NEED[a.tier];
    a.tier = (a.tier + 1) as Tier;
    a.state = 'moult'; a.stateT = 0; a.stateDur = 1.5; a.lockTarget = -1; a.abilityActive = false;
    if (a.grabbing >= 0) { const v = game.idMap.get(a.grabbing); if (v) { v.state = 'free'; v.grabbedBy = -1; } a.grabbing = -1; }
    game.events.push({ kind: 'tierUp', pos: { ...a.pos }, actor: a.id, strength: a.tier, player: a.player });
    game.flag(a, 'tier');
    // scatter small creatures
    for (const o of game.nearby(a.pos, 20)) if (o.brain && o.controller !== 'giant') { o.brain.goalT = 0; if (o.brain.kind === 'needs') { o.brain.goal = 'flee'; o.brain.target = a.id; } }
  }
}
