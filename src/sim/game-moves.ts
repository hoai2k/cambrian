/**
 * The moves a body makes, one press at a time: the dash and the dodge, the pounce and the heavy
 * and what each aims at, the era's specials, the lock-on, and being hunted. Split out of
 * src/sim/game.ts; every function takes the Game.
 */
import { RULES } from './era-rules';
import { HEAVY_SPECIALS, clearPursuit } from './concealment';
import { beginExpansionAbility, beginHeavyStrike, specialHit, stepExpansionAbility, stepHeavyStrike } from './expansion-abilities';
import { clamp, dist, dot, heading, len3, norm, scale as vscale, sub, wrapAngle, yawOf, type Vec3 } from '../shared/math';
import { bandOf, bodyGap, bodyRadius, isAlive, isHidden, lengthOf, massOf, staminaCost } from './actors';
import { applyHit } from './combat';
import { creature, type CreatureDef } from './creatures';
import { type Actor, type InputFrame } from './types';
import { groundHeight } from './world';
import { flipLaunch, FLIP_STAMINA } from './locomotion';
import { DASH_STAMINA_MULT, escapeReady, steered } from './effort';
import { TEXT } from '../shared/text';
import { CHARGE_STAMINA, DARTER_DODGE, DASH_COOLDOWN, DASH_TAP, DASH_TIME, FLIP_COOLDOWN, FLIP_TIME, dashLaunch, gripHold, type Game } from './game';

/** Everything the simulation says out loud; the words are in `src/content/strings.ts`. */
const SAY = TEXT.sim;

/**
 * How far off the line of travel a charge will reach to find something, in body lengths plus a
 * fixed margin so a larva is not left threading a needle, and how much further along that line it
 * looks than a standing pounce would.
 */
const CHARGE_LATERAL = 1.2, CHARGE_REACH = 1.3;

/**
 * Close attacks turn onto what they are nearly pointing at. A bite that misses by five degrees is
 * the player's aim being read too literally, not a decision they made — but the turn is capped so
 * it stays a nudge and never swings the body round onto something behind you.
 */
const AIM_NUDGE = 0.4, AIM_NUDGE_CONE = 0.45;

/**
 * How far past its own pounce range an animal will look for something to take hold of. Wide enough
 * to find a full-grown giant across open water — they are the reason the pursuit exists — and it
 * is only the *search*: the range test that follows still scales with how big what it found is.
 */
const GRAB_SWEEP = 90;

/**
 * How far the same nudge may tip the nose up or down. Larger than the yaw allowance because the
 * two are not aimed with the same instrument: yaw is the stick, which a player points precisely,
 * while elevation comes off the camera's pitch, which is coarse and spends part of its travel on
 * the follow angle. Prey a body length above you sat forty-five degrees off the aim even after
 * the nudge had lined the bite up perfectly in the horizontal.
 */
const AIM_NUDGE_PITCH = 0.7;

export function startDodge(game: Game, a: Actor, def: CreatureDef, dir: Vec3, mag: number, L: number, sf: number) {
  // A wild animal has one escape in it, and only on a near-full bar (`WILD_ESCAPE_READY`).
  if (!escapeReady(a)) return;
  // An animal that escapes by flipping its tail has only that one evasion, whichever button asked.
  if (def.tailFlip) { startDash(game, a, def, mag > 0.2 ? dir : vscale(heading(a.yaw), -1), L, sf); return; }
  const retreat = a.dodgeTapT > 0;
  let d: Vec3 = mag > 0.2 ? { ...dir } : vscale(heading(a.yaw), -1);
  if (def.ground) d.y = 0;
  d = norm(d);
  a.state = 'dodge'; a.stateT = 0; a.stateDur = retreat ? 0.5 : 0.32;
  a.iframes = retreat ? 0 : 0.28;
  a.stamina -= retreat ? 14 : 10;
  if (!steered(a)) a.stamina = 0;   // the one escape a wild animal gets takes everything it has
  const power = (retreat ? 9 : 7.5) * Math.sqrt(sf) * (def.darter ? DARTER_DODGE : 1);
  a.vel.x = d.x * power; a.vel.y = def.ground ? a.vel.y : d.y * power * 0.7; a.vel.z = d.z * power;
  a.dodgeDir = d; a.dodgeTapT = retreat ? 0 : 0.35;
  evadeSpecial(game, a, def, L);
  if (retreat) game.silt.push({ pos: { ...a.pos }, radius: 2.2 + L * 0.7, t: 4 });
  if (a.state === 'dodge') game.events.push({ kind: retreat ? 'silt' : 'dodge', pos: { ...a.pos }, actor: a.id, player: a.player, strength: L });
  game.flag(a, 'dodge');
}

export function pounceRange(game: Game, a: Actor) { return lengthOf(a) * 3.6 + 3; }

/**
 * The heavy button, wherever it is pressed from: standing, sprinting, or out of a dash.
 *
 * Returns whether the press was taken, so the action cascade can fall through to the dash and
 * the plain attacks when it was not — a bot without a special, or a move on cooldown. `charge`
 * is a press made with the body already committed to a direction: it aims along the line of
 * travel rather than the nose, reaches a little further along it, and costs `CHARGE_STAMINA`
 * on top of the move's own price.
 */
export function heavyAction(game: Game, a: Actor, def: CreatureDef, L: number, sf: number, locked: Actor | undefined, charge: boolean): boolean {
  const extra = charge ? CHARGE_STAMINA : 0;
  // A burrowed ambusher's emergence strike takes the button ahead of everything else, and is free.
  if (a.emergenceHeavy) { emergeStrike(game, a, def); return true; }
  // Reaching for a hold on something too big to bite comes before the creature's own special —
  // but only once the button has been *held*, which is the rule everywhere else too. A tap is an
  // attack, and a special is one of the attacks a tap can be; holding is what means "get hold of
  // it". Without the wait this took the press outright and a creature whose special is a crush
  // or a rake simply stopped being able to use it on anything large, which is most of what those
  // moves are for. Held, it is why an Opabinia beside a giant now does something: the button was
  // being spent on a claw strike aimed at an animal it cannot hurt.
  if (a.graspHold && a.graspT >= gripHold(def) && keepReaching(game, a, def, L, sf)) return true;
  // A player's RT is always the pounce: their special is on Y or B (`specialSlot`), and a special
  // here took the one attack every body has away from exactly the bodies that had a special.
  if (a.controller !== 'player' && HEAVY_SPECIALS.has(def.ability) && a.abilityCd <= 0 && a.stamina >= 18 + extra) {
    a.stamina -= 18 + extra; startAbility(game, a, def); a.abilityCd = Math.max(2, a.stateDur + .6); game.flag(a, 'heavy');
    return true;
  }
  // The pounce. Creatures whose special sits on RT reach it too, but only once the special has
  // been ruled out just above (cooling down, or too little stamina): RT is never a dead button.
  // Bots keep the old split — RT is their special and nothing else — so every seeded replay that
  // depends on their behaviour is unchanged.
  if (a.controller !== 'player') return false;
  // RT is never a dead button. A pounce that is refused — cooling down, too little in the bar,
  // winded — used to return false here, and for a *player* nothing below this catches the press
  // (the plain-attack branch is bots only), so the button did literally nothing. Worse, the
  // surcharge for pressing it mid-charge is paid here but not counted in `heavyMove`'s `ready`,
  // so the HUD said POUNCE over a press that would be swallowed. It falls through to the
  // creature's own heavy strike instead: a smaller answer than a pounce, but an answer.
  if (a.pounceCd !== 0 || a.stamina < 12 + extra || a.exhausted > 0) {
    if (a.stamina < staminaCost(a, def.heavy.stamina) * 0.5 || a.exhausted > 0) return false;
    a.state = 'attack'; a.stateT = 0; a.move = def.heavy; a.moveKind = 'heavy'; a.hitDone.clear();
    a.stamina -= staminaCost(a, def.heavy.stamina); a.combo = 0;
    aimNudge(game, a, L * 1.8 + 2); game.flag(a, 'heavy');
    return true;
  }
  a.stamina -= extra;
  // Holding the grip button turns the lunge into a way of getting hold of something: it will
  // pick a body far too big to bite and swim at it until it arrives, where an ordinary pounce
  // would have refused the target and left the button doing nothing at all in front of the one
  // animal a player most wants to grab.
  const grabbing = a.graspHold;
  // A crosshair on something too big to bite, with the grip held, is a target however far off it
  // is: the swim to it is the move. Everything else still has to be in range to be sprung at.
  const bigLock = grabbing && locked && isAlive(locked) && (bandOf(a, locked) === 'threat' || bandOf(a, locked) === 'giant');
  const t = a.aiming && locked && isAlive(locked) ? (a.aimInRange || bigLock ? locked : undefined)
    : charge ? chargeTarget(game, a) ?? pounceTargetAhead(game, a, grabbing) : pounceTargetAhead(game, a, grabbing);
  if (t) startPounce(game, a, t, L, sf);
  else { const m = { ...def.heavy, lunge: def.heavy.lunge + 1.0 }; a.state = 'attack'; a.stateT = 0; a.move = m; a.moveKind = 'heavy'; a.hitDone.clear(); a.stamina -= staminaCost(a, m.stamina); a.combo = 0; a.pounceCd = 0.8; game.flag(a, 'heavy'); }
  return true;
}

/**
 * Whether picking `o` for `a` would be *handing* one player to another.
 *
 * Another player is never chosen for you — that is what keeps turning on a friend deliberate —
 * but a target you are holding the crosshair on is not being chosen for you, it is the choice.
 * So a player the aiming player has actually locked onto is allowed through every automatic
 * pick: the charge, the grip, the bite's own nudge and the lunge. Without this a player could
 * aim squarely at another and find that nothing at all would take, which read as the grab button
 * being broken rather than as a rule.
 */
export function handedOver(game: Game, a: Actor, o: Actor): boolean {
  if (o.controller !== 'player' || a.controller !== 'player') return false;
  return !(a.aiming && a.lockTarget === o.id);
}

/**
 * What a charge snaps onto: the body nearest the line the creature is actually travelling along.
 *
 * A sprint or a dash has already chosen a direction, and at that speed the nose swings around
 * far more slowly than the body crosses ground — so a cone measured off the heading, which is
 * what the standing pounce uses, misses the animal you are about to swim straight past. This
 * measures how far along the line a body sits and how far off it, and takes the nearest thing
 * inside a corridor rather than a wedge.
 */
export function chargeTarget(game: Game, a: Actor): Actor | undefined {
  const L = lengthOf(a);
  const line = len3(a.vel) > 1 ? norm(a.vel) : heading(a.yaw);
  const reach = pounceRange(game, a) * CHARGE_REACH, lateral = L * CHARGE_LATERAL + 2;
  let best: Actor | undefined, bd = Infinity;
  for (const o of game.nearby(a.pos, reach)) {
    if (o.id === a.id || !isAlive(o) || isHidden(o)) continue;
    // Another player is never chosen for you, charging or not: turning on one stays deliberate —
    // and aiming at one *is* deliberate (`handedOver`).
    if (handedOver(game, a, o)) continue;
    if (bandOf(a, o) === 'giant') continue;
    const to = sub(o.pos, a.pos), along = dot(to, line);
    if (along < 0 || along > reach) continue;
    const off = len3(sub(to, vscale(line, along)));
    if (off > lateral + bodyRadius(o)) continue;
    // Prefer what is straight ahead over what is off to the side at the same distance.
    const score = along + off * 2;
    if (score < bd) { bd = score; best = o; }
  }
  return best;
}

/**
 * Turn a close attack onto what it is nearly pointing at, by at most `AIM_NUDGE`.
 *
 * A bite whose mouth reaches four tenths of a body length has no tolerance at all: missing by a
 * few degrees at that range reads as the game ignoring the press rather than as the player's
 * mistake. The cap is what keeps it honest — it will not turn you round, and it never picks
 * another player, so who you attack is still your decision.
 */
export function aimNudge(game: Game, a: Actor, reach: number): void {
  const h = heading(a.yaw);
  let best: Actor | undefined, bd = Infinity;
  for (const o of game.nearby(a.pos, reach)) {
    if (o.id === a.id || !isAlive(o) || isHidden(o)) continue;
    if (handedOver(game, a, o)) continue;
    const to = sub(o.pos, a.pos), d = len3(to);
    if (d > reach) continue;
    // The cone is measured in the yaw plane. Against the full 3-D heading it narrowed with
    // height — a fish directly above the mouth scored zero and was rejected as "behind" — when
    // something overhead is as much in front of you as something level with you is. What it
    // takes to reach up at it is the pitch below, not a wider cone.
    const flat = Math.hypot(to.x, to.z);
    if (flat > 1e-6 && (to.x * h.x + to.z * h.z) / flat < AIM_NUDGE_CONE) continue;
    if (d < bd) { bd = d; best = o; }
  }
  if (!best) return;
  const to = sub(best.pos, a.pos);
  const turn = clamp(wrapAngle(yawOf(to) - a.yaw), -AIM_NUDGE, AIM_NUDGE);
  a.yaw = wrapAngle(a.yaw + turn); a.prevT.yaw = a.yaw;
  // A walker's pitch is the slope it is standing on and is rewritten from the ground every step,
  // so there is nothing to aim with; a swimmer tips its nose at what it is biting.
  if (!creature(a.creature).ground) {
    const want = clamp(-Math.atan2(to.y, Math.hypot(to.x, to.z)), -0.9, 0.9);
    a.pitch += clamp(want - a.pitch, -AIM_NUDGE_PITCH, AIM_NUDGE_PITCH);
    a.prevT.pitch = a.pitch;
  }
}

/** Nearest thing in front worth pouncing on when RT is pressed without aiming. */
export function pounceTargetAhead(game: Game, a: Actor, grabbing = false): Actor | undefined {
  const L = lengthOf(a); const h = heading(a.yaw);
  let best: Actor | undefined, bd = Infinity;
  // The sweep has to be wide enough to see what the range test will accept: a grab pursuit may
  // set out from `lengthOf(target) * 2` past the ordinary pounce range, and a target that is
  // never handed to the loop is never considered however generous the test after it.
  const sweep = pounceRange(game, a) + lengthOf(a) * 4 + (grabbing ? GRAB_SWEEP : 0);
  for (const o of game.nearby(a.pos, sweep)) {
    if (o.id === a.id || !isAlive(o) || isHidden(o)) continue;
    // Another player is never chosen for you. Turning on one is deliberate: aim at them, or
    // simply bite what is in front of your mouth.
    if (handedOver(game, a, o)) continue;
    const band = bandOf(a, o);
    // A lunge that means to take hold is allowed to pick something enormous — that is the only
    // thing it *can* usefully do with one — where a lunge that means to bite is not.
    if (band === 'giant' && !grabbing) continue;
    if (o.riddenBy >= 0 || o.rideHost >= 0 || o.state === 'grabbed') continue;
    const to = sub(o.pos, a.pos);
    // To the far body's surface, so a twenty-unit animal is as reachable as it looks.
    const gap = bodyGap(o, a);
    // How far off you may set out from. A bite has to be sprung from close; setting out to take
    // hold of something is a swim, and how far a swim is worth starting scales with how big the
    // thing is — a giant is visible and worth crossing open water for from a long way off, and
    // its tail is another whole body length past its middle.
    if (gap > pounceRange(game, a) + (grabbing ? lengthOf(o) * 2 : 0)) continue;
    if (dot(norm(to), h) < 0.6) continue;
    const score = Math.max(0, gap) * (band === 'threat' && !grabbing ? 1.6 : 1);
    if (score < bd) { bd = score; best = o; }
  }
  void L;
  return best;
}

/** LB: a burst of speed in the stick direction with invulnerability, covering a few body lengths. */
export function emergeStrike(game: Game, a: Actor, def: CreatureDef) {
  a.emergenceHeavy = false; a.state = 'attack'; a.stateT = 0;
  a.move = { ...def.heavy, name: SAY.emergenceStrike, stamina: 0, poise: def.heavy.poise + 12 };
  a.moveKind = 'heavy'; a.hitDone.clear(); a.seen = 1;
  game.silt.push({pos:{...a.pos}, radius:lengthOf(a)*.7, t:1.5});
  game.flag(a, 'heavy');
}

export function blockPulse(game: Game, a: Actor, def: CreatureDef) {
  if (!['bellCorral', 'shellUp'].includes(def.ability) || a.abilityCd > 0 || a.stamina < 10) return;
  if (def.ability === 'shellUp' && a.guardHeld < .6) return;
  a.stamina -= 10; a.abilityCd = 4;
  for (const o of game.nearby(a.pos, lengthOf(a)*1.15)) {
    if (o.id === a.id || !isAlive(o) || expansionContext(game).allies(a,o)) continue;
    applyHit(game.hitCtx,a,o,{...def.light,damage:def.ability==='bellCorral'?7:0,poise:35,knockback:5,sweep:true},0);
  }
}

export function evadeSpecial(game: Game, a: Actor, def: CreatureDef, L: number) {
  if (def.ability === 'combCruise') { a.burstT = 1; a.stamina = Math.min(a.staminaMax,a.stamina+4); }
}

export function startDash(game: Game, a: Actor, def: CreatureDef, dir: Vec3, L: number, sf: number, relief = 0) {
  // The tail-flip costs the tail rather than a fin beat, and *defaults* backwards: asked for
  // nothing, the reflex throws the body away from whatever touched it, which is what the caridoid
  // escape is. It used to go back along its own axis whatever the stick was asking, so Odaraia
  // swimming forward and dashing went backwards — a stick direction is an instruction and wins
  // here as it does on every other body. The caller resolves a neutral stick (the jetters reverse
  // too); a direction that arrives empty anyway is answered the same way.
  const flip = !!def.tailFlip;
  let d: Vec3 = len3(dir) > 0.01 ? { ...dir } : vscale(heading(a.yaw), flip ? -1 : 1);
  // A walker dashes along what it is aimed at, up out of the sand included. It keeps the
  // vertical it was given — the dash is a shove, and where it goes afterwards is the settle's
  // business — but it never dashes *into* the floor, which is only a way to waste the stamina.
  if (def.ground && d.y < 0) d.y = 0;
  d = norm(d);
  a.state = 'dodge'; a.stateT = 0; a.stateDur = flip ? FLIP_TIME : DASH_TIME;
  // A body dashing on nothing but free climb gets the climb and not the ground: the horizontal
  // half of the burst is what the stamina was for, and it has none. A flip is the exception —
  // the reflex fires whatever is left, it just fires weakly (`flipLaunch`).
  const cost = (flip ? FLIP_STAMINA : 12) * (1 - relief) * (steered(a) ? DASH_STAMINA_MULT : 1);
  const empty = a.stamina < cost;
  // Priced by how far it is actually taken: the tap's share now, the rest billed per second for
  // as long as the button is held (`stepActions`). A flip is not a held move — the reflex fires
  // whole — so it pays in full on the frame it goes off.
  a.dashCost = flip ? 0 : cost;
  const upFront = flip ? cost : cost * (DASH_TAP / DASH_TIME);
  a.iframes = flip ? FLIP_TIME : DASH_TIME; a.stamina = Math.max(0, a.stamina - upFront); a.dashCd = flip ? FLIP_COOLDOWN : DASH_COOLDOWN;
  // A wild animal's one escape takes everything it has (`WILD_ESCAPE_READY`).
  if (!steered(a)) { a.stamina = 0; a.dashCost = 0; }
  // A punt needs the floor under it; out in the water there is nothing to push off.
  const gap = a.pos.y - groundHeight(game.world, a.pos.x, a.pos.z, []);   // own scratch: called mid-update
  const power = flip ? flipLaunch(a) : dashLaunch(a, def, L, gap);
  const along = empty && !flip ? 0 : 1;
  // The vertical used to be cut to seven tenths, which tipped every aimed dash flatter than it
  // was pointed — about ten degrees of it — and made lining one up on prey above or below you
  // harder than lining it up on prey alongside. A dash goes where it was aimed, in all three.
  a.vel.x = d.x * power * along; a.vel.y = def.ground ? Math.max(a.vel.y, d.y * power) : d.y * power; a.vel.z = d.z * power * along;
  if (def.ground && d.y > 0.1) { a.grounded = false; a.hopVel = Math.max(a.hopVel, 0); }
  a.dodgeDir = d;
  evadeSpecial(game, a, def, L);
  game.events.push({ kind: 'dodge', pos: { ...a.pos }, actor: a.id, player: a.player, strength: L });
  game.flag(a, 'dodge');
}

/**
 * Keep going for a hold on something bigger than you, for as long as the grip button is down.
 *
 * Only ever a re-entry into the lunge that the press already started: same target rules, same
 * cost, same cooldown. What it removes is the requirement to let go and press again, which on a
 * body twenty units long is the difference between reaching it and hanging a body's length off
 * it wondering why nothing happened.
 */
export function keepReaching(game: Game, a: Actor, def: CreatureDef, L: number, sf: number): boolean {
  if (!a.graspHold || a.graspSpent || a.controller !== 'player') return false;
  if (a.grabbing >= 0 || a.rideHost >= 0 || a.riddenBy >= 0) return false;
  if (a.state !== 'free' || a.exhausted > 0) return false;
  // Whatever it set out for, it keeps. Re-acquiring through the facing cone every time meant a
  // pursuit that drifted a few degrees off — which it does, with no stick input, once the lunge
  // has spent itself — could never pick its own target up again, and the animal simply stopped
  // in open water halfway to the thing it was reaching for.
  const held = a.lockTarget >= 0 ? game.idMap.get(a.lockTarget) : undefined;
  const usable = (o: Actor | undefined): o is Actor => !!o && isAlive(o) && !isHidden(o)
    && o.riddenBy < 0 && o.rideHost < 0 && o.state !== 'grabbed'
    && (bandOf(a, o) === 'threat' || bandOf(a, o) === 'giant' || (a.aiming && a.lockTarget === o.id))
    && !handedOver(game, a, o);
  const t = usable(held) ? held : pounceTargetAhead(game, a, true);
  if (!usable(t)) return false;
  // Setting out costs; carrying on does not. The swim is one act however far it turns out to be,
  // and charging for every re-entry made a long crossing cost more than the animal ever had.
  if (a.pounceCd > 0) return false;
  const fresh = a.lockTarget !== t.id;
  if (fresh && (a.stamina < 12 || a.pounceCd > 0)) return false;
  if (a.controller === 'player') {
    game.graspReasons.set(a.id, `reaching for ${creature(t.creature).name} (${bandOf(a, t)}), ${bodyGap(t, a).toFixed(1)} away`);
  }
  startPounce(game, a, t, L, sf, !fresh);
  return true;
}

export function startPounce(game: Game, a: Actor, target: Actor, L: number, sf: number, free = false) {
  // The pounce homes on `lockTarget`, so a pounce that picked its own target has to record it.
  // Without this an unaimed press — the common case, since it means not holding LT — entered the
  // state, found nothing to home on and dropped straight back out, having spent the stamina and
  // the cooldown on nothing at all. Safe to write: the block that clears a player's lock runs
  // only while free or guarding, so it cannot reach in and clear this mid-pounce.
  a.lockTarget = target.id;
  a.state = 'pounce'; a.stateT = 0; a.stateDur = clamp(dist(a.pos, target.pos) / Math.max(6, L * 3), 0.25, 0.9) + 0.15;
  if (!free) { a.stamina -= 12; a.pounceCd = 1.4; }
  a.combo = 0;
  a.move = { ...creature(a.creature).heavy, name: SAY.pounce }; a.moveKind = 'heavy';
  game.events.push({ kind: 'dodge', pos: { ...a.pos }, actor: a.id, player: a.player, strength: L });
  game.flag(a, 'heavy');
  void sf;
}

/**
 * Specials that have no way in but a button. They were written as timed abilities and wired to
 * nothing, so they sat unreachable; a player's Y or B is their way in now (`fireSpecial`).
 */
const BUTTON_SPECIALS = new Set(['whipSearch', 'sedimentDive']);

/**
 * A player pressed the button their special is on (`specialSlot`): fire it. The era's own specials
 * (a gulp, a pod call, ink) answer first; a strike or a timed special is started the way RT used to
 * start it, on the same cooldown and price. Returns whether anything took the press, so the button
 * can fall back to what it does for an animal with no special when the special is not ready.
 */
export function fireSpecial(game: Game, a: Actor, def: CreatureDef): boolean {
  if (RULES.useAbility?.(game, a, expansionContext(game))) { game.flag(a, 'ability'); return true; }
  if ((HEAVY_SPECIALS.has(def.ability) || BUTTON_SPECIALS.has(def.ability)) && a.abilityCd <= 0 && a.stamina >= 18) {
    a.stamina -= 18; startAbility(game, a, def); a.abilityCd = Math.max(2, a.stateDur + .6); game.flag(a, 'heavy');
    return true;
  }
  return false;
}

export function expansionContext(game: Game) {
  return { hit: game.hitCtx, nearby: (pos: Vec3, radius: number) => game.nearby(pos, radius), silt: game.silt,
    allies: (a: Actor, b: Actor) => (game.mode === 'rise' || game.mode === 'survival') && a.controller === 'player' && b.controller === 'player' };
}

/** Internal animation state for native heavy specials; Y never calls this. */
export function startAbility(game: Game, a: Actor, def: CreatureDef) {
  if (!HEAVY_SPECIALS.has(def.ability) && !BUTTON_SPECIALS.has(def.ability)) return;
  a.abilityCd = Math.max(2, (def.abilityDuration ?? .55) + .6);
  a.abilityT = 0; a.abilityActive = true; a.state = 'ability'; a.stateT = 0;
  a.stateDur = def.abilityDuration ?? .55; a.hitDone.clear();
  beginHeavyStrike(expansionContext(game), a, def);
  beginExpansionAbility(expansionContext(game), a, def);
  RULES.beginAbility?.(game, a, expansionContext(game));
  game.events.push({kind:'ability',pos:{...a.pos},actor:a.id,player:a.player,strength:lengthOf(a)});
  game.flag(a, 'heavy');
}

export function updateAbility(game: Game, a: Actor, def: CreatureDef, dt: number, input: InputFrame, L: number, sf: number) {
  a.abilityT += dt;
  const done = a.stateT >= a.stateDur;
  stepHeavyStrike(expansionContext(game), a, def);
  stepExpansionAbility(expansionContext(game), a, def, dt);
  RULES.stepAbility?.(game, a, expansionContext(game), dt);
  if (a.state !== 'ability') return;
  switch (def.ability) {
    case 'snatch': {
      if (a.stateT >= 0.2 && a.stateT < 0.35 && a.hitDone.size === 0) {
        const h = heading(a.yaw);
        let best: Actor | undefined, bd = Infinity;
        for (const o of game.nearby(a.pos, L * 2.4)) {
          if (o.id === a.id || !isAlive(o) || isHidden(o) || expansionContext(game).allies(a,o)) continue;
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
          applyHit(game.hitCtx, a, best, specialHit(def, { damage: 12, poise: 30, knockback: 0 }), 0);
          game.events.push({ kind: 'grab', pos: { ...best.pos }, actor: a.id, other: best.id, player: a.player });
        }
      }
      break;
    }
  }
  if (done) {
    a.abilityActive = false; a.state = 'free'; a.stateT = 0; a.hitDone.clear();
  }
}

export function pickLockTarget(game: Game, a: Actor, cycle = 0, currentId = -1, aim = false): Actor | undefined {
  const L = lengthOf(a);
  const h = heading(a.yaw);
  const cands: { a: Actor; score: number }[] = [];
  for (const o of game.nearby(a.pos, aim ? 10 + L * 6 : 14 + L * 7)) {
    if (o.id === a.id || !isAlive(o) || isHidden(o)) continue;
    // Another player is only ever picked up by cycling the stick onto them, never by the snap.
    if (o.controller === 'player' && a.controller === 'player' && cycle === 0) continue;
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

export function updateHunted(game: Game, a: Actor) {
  let best = 0, hunter = -1;
  for (const o of game.actors) {
    if (!o.brain || !isAlive(o)) continue;
    const band = bandOf(a, o);
    if (band !== 'giant' && band !== 'threat') continue;
    const v = o.brain.detection.get(a.id) ?? 0;
    const hunting = o.brain.target === a.id && o.brain.goal === 'hunt';
    const d = dist(a.pos, o.pos);
    // **A giant is a giant to you whatever brain it is carrying.** This used to ask
    // `brain.kind === 'giant'`, which is the *patrol* brain the handful of named giants are
    // given — every other big animal in the sea is ambient and carries an ordinary `needs`
    // brain, so a seventeen-unit Shonisaurus bearing down on a hatchling was scored like a
    // small predator: a range capped at forty units and no floor at all while it hunted, which
    // on a body that size and that fast is about a second of warning before the bite. What
    // decides the ramp is the *band* — what this animal is to the body it is chasing — and the
    // brain kind only ever widens it.
    const huge = band === 'giant' || o.brain.kind === 'giant';
    const range = Math.min(creature(o.creature).sense * lengthOf(o) + 6, huge ? 70 : 40);
    // giants ramp with their detection score; smaller predators ramp with distance while actively chasing
    const noticing = o.brain.target === a.id && o.brain.goal === 'notice';
    // Anything bigger than you that has picked you out is a hunt on the banner from that moment,
    // at any distance — the "hunting" line comes up at 0.5 and this starts at 0.6 — because the
    // tell it then gives (`HUNT_TELL` in ai.ts) is only any use if the player has been told. A
    // bigger predator that was not a giant used to ramp from nothing as it closed and reach the
    // line a body length or two away, which is where it had already decided to bite.
    const score = clamp(huge ? Math.max(noticing ? 0.35 : 0, hunting ? Math.max(0.6, clamp(1.3 - d / range, 0.5, 1)) : Math.min(v / 4, 0.45)) : hunting ? Math.max(0.6, clamp(1.1 - d / (range * 0.8), 0, 1)) : 0, 0, 1);
    if (score > best) { best = score; hunter = o.id; }
  }
  const wasHunted = a.hunted >= 0.98 || a.wasHunted;
  if (best >= 0.98 && !a.wasHunted) { a.wasHunted = true; game.events.push({ kind: 'hunted', pos: { ...a.pos }, actor: a.id, other: hunter, player: a.player }); game.flag(a, 'hunted'); }
  if (wasHunted && best < 0.25 && a.wasHunted) { a.wasHunted = false; a.escapes++; game.events.push({ kind: 'escape', pos: { ...a.pos }, actor: a.id, other: hunter, player: a.player }); game.flag(a, 'escaped'); }
  a.hunted = best; a.hunterId = hunter;
}
