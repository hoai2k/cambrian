/**
 * Taking hold: riding something big, holding something small, and every way out of a grip.
 * See CLAUDE.md on grips. Split out of src/sim/game.ts; every function takes the Game.
 */
import { clamp, damp, heading, sub } from '../shared/math';
import { bandOf, bodyGap, bodyRadius, isAlive, isHidden, isInvulnerable, lengthOf } from './actors';
import { applyHit, endRide, GRIP_BREAK, GRIP_MEAL, GRIP_STRIKE, rideHold, takeHold, takeRide } from './combat';
import { creature, type CreatureDef } from './creatures';
import { type Actor, type InputFrame } from './types';
import { type GraspResult, type GripHud, gripHold, gripReach, type Game } from './game';
import { handedOver } from './game-moves';

/** How far off dead ahead a grip may close, in the yaw plane: roughly the same arc as the bite's aim. */
const GRASP_CONE = 0.35;

/** Both ends of a ride, dropped: whoever this actor was holding on to, and whoever was holding on to it. */
export function clearRide(game: Game, a: Actor) {
  if (a.rideHost >= 0) endRide(a, game.idMap.get(a.rideHost));
  if (a.riddenBy >= 0) { const r = game.idMap.get(a.riddenBy); if (r) endRide(r, a, true); else a.riddenBy = -1; }
}

/**
 * Hold on to something your own size or bigger. The rider is pinned to the spot it took hold of,
 * in the host's own frame, so the host tows it around and through whatever it swims through.
 *
 * The grip does no damage and costs nothing to keep. Not a blow that lingers, not a clock the
 * player is spending, not a bar draining while they hang there: taking hold of an animal is one
 * of the things a body can simply be doing, and it goes on until they let go. It used to end
 * itself after nine seconds and land a strike if it was released inside the first fraction of a
 * second, which made the whole thing an attack wearing a grip's clothes — you could not ride
 * anything without hurting it, and you could not ride it for long. Biting what you are holding on
 * to is a separate decision, and the light attack still works while clinging, which is what makes
 * that possible.
 *
 * It ends when the player lets go, when the host throws itself sideways — a dash or a dodge
 * shakes a rider off, which is the host's own answer to being ridden and the only thing that is
 * not the rider's choice — or when either animal stops being in a state to hold on: dead,
 * grabbed, staggered, hidden or swallowed.
 */
export function updateRide(game: Game, a: Actor, def: CreatureDef, input: InputFrame, dt: number) {
  const host = game.idMap.get(a.rideHost);
  const player = a.controller === 'player';
  if (!host || host.riddenBy !== a.id || !isAlive(host) || !isAlive(a) || isHidden(a) || isHidden(host)
    || a.state === 'grabbed' || a.state === 'swallowed' || a.state === 'stagger' || a.state === 'moult'
    || host.state === 'grabbed' || host.state === 'swallowed') { endRide(a, host); return; }
  if (host.state === 'dodge') { endRide(a, host, true); return; }                 // shaken off
  a.rideT += dt;
  if (a.gripSyncT >= 0) a.gripSyncT += dt;
  // Holding on is free and has no end of its own. `rideT` is the time since the grip closed, and
  // the only thing it is for is the short grace below.
  //
  // That grace is the frame the grip was closed in: a pounce that arrives as a grip does so while
  // the button is still travelling, and without it a hold could be dropped before the player had
  // any chance to keep it.
  if (player && !a.graspHold && a.rideT > 0.35) {
    // Grab and let go and it is the blow the grip stood in for — and the animal comes looking for
    // whoever did it. Hold on past `GRIP_STRIKE` and the grip has stopped being an attack: it
    // does nothing at all, and the host never learns it has a passenger.
    //
    // Judged from contact, so the fraction of a second the bodies spend coming together is not
    // charged to the player as time spent holding on.
    if (a.gripSyncT >= 0 && a.gripSyncT <= GRIP_STRIKE && isAlive(host)) {
      applyHit(game.hitCtx, a, host, { ...def.heavy, name: 'Grip', lunge: 0 }, 1);
    }
    endRide(a, host); return;
  }
  const h = heading(host.yaw);
  // The hold point on the host, then out along the host's surface by the rider's own half-width,
  // so the rider lies *on* the host rather than with its middle buried in it.
  const hold = rideHold(a, host);
  const outX = -h.z * a.rideOff.x, outY = a.rideOff.y, outZ = h.x * a.rideOff.x;
  const ol = Math.hypot(outX, outY, outZ), rr = bodyRadius(a);
  const target = ol > 1e-6
    ? { x: hold.x + (outX / ol) * rr, y: hold.y + (outY / ol) * rr, z: hold.z + (outZ / ol) * rr }
    : { x: hold.x, y: hold.y + rr, z: hold.z };
  a.pos.x = damp(a.pos.x, target.x, 22, dt);
  a.pos.y = damp(a.pos.y, target.y, 22, dt);
  a.pos.z = damp(a.pos.z, target.z, 22, dt);
  // Contact: the grip has stopped closing and the two bodies are together. Everything a grip
  // comes to is timed from this frame, and the renderer takes its bone hold from here too.
  if (Math.hypot(a.pos.x - target.x, a.pos.y - target.y, a.pos.z - target.z) < lengthOf(a) * 0.05) {
    a.pos = { ...target };
    if (a.gripSyncT < 0) a.gripSyncT = 0;
  }
  a.vel = { x: host.vel.x, y: host.vel.y, z: host.vel.z };
  a.grounded = false; a.hopVel = 0; a.climbTo = -Infinity;
  if (player) game.flag(a, 'ride');
  void def; void input;
}

/**
 * Close a grip on whatever is in reach, while the button is held.
 *
 * Two different things depending on what is caught, which is the whole point of one button doing
 * it: something small enough to be a mouthful is *held*, and letting go of the button eats it;
 * anything over the rival band is not a mouthful but is something to hold on *to*, so the grip
 * becomes a ride and the animal being ridden is never touched. Neither costs the far body any
 * health — a grasp is a grip, not a blow — and neither picks another player, who is grabbed only
 * by a deliberate attack that lands.
 *
 * Returns true when it took hold this frame, which is the caller's signal to leave the attack
 * buttons alone: the press bought the grip rather than the strike.
 */
export function tryGrasp(game: Game, a: Actor, def: CreatureDef, L: number, gripButton: boolean): GraspResult {
  // `why` is the recorder's window onto this decision (`?debug=game`). It is written from inside
  // the real gates rather than reconstructed alongside them, so a recording can never disagree
  // with what the game actually did — which is the only way a diagnosis is worth having.
  const why = (r: string) => { if (a.controller === 'player') game.graspReasons.set(a.id, r); };
  if (a.graspT <= 0) { why('no attack button held'); return 'none'; }
  if (a.graspSpent) { why('grip spent — let go of the button before trying again'); return 'none'; }
  if (a.grabbing >= 0 || a.rideHost >= 0 || a.riddenBy >= 0) { why('already holding or held'); return 'none'; }
  if (a.state !== 'free' && a.state !== 'guard') { why(`busy: state=${a.state}`); return 'none'; }
  if (a.hitStop > 0) { why('hit-stopped'); return 'none'; }
  if (isHidden(a) || !isAlive(a)) { why('hidden or dead'); return 'none'; }
  const h = heading(a.yaw), reach = gripReach(def, L);
  let best: Actor | undefined, bd = Infinity;
  let nearestGap = Infinity, nearestWhy = '';
  for (const o of game.nearby(a.pos, reach + L * 2)) {
    if (o.id === a.id || !isAlive(o) || isHidden(o) || isInvulnerable(o)) continue;
    if (o.state === 'grabbed' || o.state === 'swallowed' || o.riddenBy >= 0 || o.rideHost >= 0) continue;
    // Whoever you take hold of stays your decision, exactly as it is for the bite's own aim —
    // and aiming at another player is that decision, so hold RT on one and it takes.
    if (handedOver(game, a, o)) continue;
    // To the body, not to a ball around its middle: pressed against a giant's tail you are ten
    // units from its centre and touching it, and the old test called that out of reach.
    const gap = bodyGap(o, a);
    // In front, measured in the yaw plane so something above or below is still in front of you.
    const to = sub(o.pos, a.pos);
    const flat = Math.hypot(to.x, to.z);
    const ahead = flat <= 1e-6 || (to.x * h.x + to.z * h.z) / flat >= GRASP_CONE;
    if (gap < nearestGap) {
      nearestGap = gap;
      nearestWhy = gap > reach ? `nearest ${creature(o.creature).name} is ${gap.toFixed(2)} from its surface, reach is ${reach.toFixed(2)}`
        : !ahead ? `nearest ${creature(o.creature).name} is in reach but not ahead of you`
        : '';
    }
    if (gap > reach || !ahead) continue;
    if (gap < bd) { bd = gap; best = o; }
  }
  if (!best) { why(nearestWhy || 'nothing within reach to take hold of'); return 'none'; }
  const band = bandOf(a, best);
  // Ridden, or taken into the jaws? Only what this body could actually swallow is a mouthful;
  // its own size and up is something to hold on to. Same rule as `closeGrip`, which is where a
  // grip closed by a lunge or a landing blow decides it.
  const bigger = band !== 'snack' && band !== 'prey';
  const name = `${creature(best.creature).name} (${band}, gap ${bd.toFixed(2)})`;
  if (bigger && gripButton && def.grasp) {
    const took = takeRide(game.hitCtx, a, best);
    why(took ? `took hold of ${name}` : `${name} refused the grip — the head end, or it is already ridden`);
    return took ? 'took' : 'none';
  }
  // Still closing. Reported so the grip button can hold its own strike while it does: pressing it
  // against something already within arm's reach means taking hold of it, and a pounce that fired
  // on the press frame settled the matter before the grip ever shut — on prey the lunge simply
  // swallowed what the player was reaching for. Further off than this the button still pounces,
  // which is where a pounce was always for.
  if (a.graspT < gripHold(def)) {
    why(`closing on ${name}: held ${a.graspT.toFixed(2)}s of ${gripHold(def).toFixed(2)}s`);
    return 'closing';
  }
  const took = bigger ? takeRide(game.hitCtx, a, best) : takeHold(game.hitCtx, a, best);
  why(took ? `took hold of ${name}` : `${name} refused the grip — the head end, or it is already held`);
  return took ? 'took' : 'closing';
}

/**
 * A grip ends with what it was holding simply getting away: not thrown, not hurt, not eaten.
 *
 * Three things arrive here — a release that came too late to be a meal, the grip's own time
 * running out, and (from the other side) a dash that tore it open — and they are the same event
 * from the held animal's point of view, so they are one piece of code. Nothing a grip holds is
 * ever hurt by the holding, and that has to include the moment it stops.
 */
export function breakLoose(game: Game, holder: Actor, held: Actor) {
  held.state = 'free'; held.stateT = 0; held.grabbedBy = -1; held.iframes = 0.4;
  holder.state = 'free'; holder.stateT = 0; holder.grabbing = -1; holder.gripSyncT = -1;
  held.escapes++;
  if (held.brain) { held.brain.goal = 'flee'; held.brain.target = holder.id; held.brain.goalT = 0; }
  game.events.push({ kind: 'escape', pos: { ...held.pos }, actor: held.id, other: holder.id, player: held.player });
}

/** Why this player's grip did or did not close, last time the question was asked. */
export function graspReason(game: Game, id: number): string { return game.graspReasons.get(id) ?? ''; }

/**
 * Close whatever grip suits the far body's size, and say whether one closed. A mouthful is held
 * in the mouth; anything from the animal's own size upwards is held on to. Neither costs it any
 * health — what the grip comes to is settled when the button comes up, not when it shuts, and for
 * anything too big to swallow it comes to nothing at all.
 */
export function closeGrip(game: Game, a: Actor, o: Actor): boolean {
  const band = bandOf(a, o);
  // A grip is for holding on to. Only what this body could actually swallow is taken into the
  // jaws as a mouthful; everything from its own size upwards is ridden. A rival used to be
  // crushed and thrown, which meant the one animal most worth clinging to — something that can
  // fight back and is going somewhere — was the one thing a grip could not hold on to.
  const took = band === 'snack' || band === 'prey' ? takeHold(game.hitCtx, a, o) : takeRide(game.hitCtx, a, o);
  // The other way a grip closes — a lunge or a strike arriving — reports itself to the recorder
  // as the direct reach does, so a recording accounts for every hold however it was got.
  if (a.controller === 'player') {
    const name = `${creature(o.creature).name} (${band})`;
    game.graspReasons.set(a.id, took ? `took hold of ${name} on arriving` : `${name} refused the grip on arriving — the head end, or already held`);
  }
  return took;
}

/**
 * What this player has hold of, for the HUD.
 *
 * A grip was the one thing the game did that it never said it was doing. A recording of a player
 * trying to grab a giant showed the grip closing three times, carrying them for thirteen seconds
 * between them — and the player reporting, in good faith, that grabbing did not work. Nothing on
 * the screen changed when the grip closed, nothing named the button that bites what you are
 * clinging to, and nothing said a mouthful had struggled out and the button had to come up before
 * the grip would close again. All of that is knowable; none of it was shown. So the simulation
 * says it, here, where the struggle clock and the spent flag already live, rather than leaving
 * the HUD to guess at them.
 */
export function gripFor(game: Game, i: number): GripHud | undefined {
  const p = game.players[i];
  if (!p || !isAlive(p)) return undefined;
  if (p.rideHost >= 0) {
    const host = game.idMap.get(p.rideHost);
    if (!host) return undefined;
    const name = creature(host.creature).name, band = bandOf(p, host);
    // Inside the strike window there is something running down and it matters: let go now and it
    // is a blow. Once it has passed, nothing is running — the ride lasts as long as the player
    // wants it to — so there is no bar, because a bar there would be a promise the grip does not
    // make.
    const held = p.gripSyncT;
    if (held >= 0 && held <= GRIP_STRIKE) {
      return { kind: 'ride', name, band, release: 'strike', left: clamp(1 - held / GRIP_STRIKE, 0, 1) };
    }
    return { kind: 'ride', name, band, release: 'nothing' };
  }
  if (p.state === 'grabbing' && p.grabbing >= 0) {
    const v = game.idMap.get(p.grabbing);
    if (!v) return undefined;
    const band = bandOf(p, v);
    // A mouthful is eaten when the button comes up, and until then it is only held — the crush
    // went with everything else that hurt what a grip had hold of. What the bar counts is the
    // window in which it is still a meal: carry it around past `GRIP_MEAL` and it gets away.
    const held = p.gripSyncT;
    const inTime = held >= 0 && held < GRIP_MEAL;
    // Two windows, one after the other: while it is still a meal the bar counts that down, and
    // after it the bar counts what is left before the animal works itself out on its own.
    return {
      kind: 'hold', name: creature(v.creature).name, band,
      release: inTime || held < 0 ? 'eat' : 'escape',
      left: held < 0 ? 1
        : inTime ? clamp(1 - held / GRIP_MEAL, 0, 1)
        : clamp(1 - (held - GRIP_MEAL) / (GRIP_BREAK - GRIP_MEAL), 0, 1),
    };
  }
  // Being held is the other half of a grip, and the half nobody was told anything about. A player
  // in something's jaws could see their own health going and no way out of it; there is a way out
  // of it, and it is one button.
  if (p.state === 'grabbed' && p.grabbedBy >= 0) {
    const by = game.idMap.get(p.grabbedBy);
    if (by) return { kind: 'held', name: creature(by.creature).name, band: bandOf(p, by), release: 'nothing', left: clamp(p.grabT / 1.6, 0, 1) };
  }
  // The arms have given out and the button is still down. Two and a half seconds of pressing
  // harder and nothing happening reads as a broken mechanic; one line saying so reads as a rule.
  if (p.graspSpent && p.graspHold) return { kind: 'spent', name: '', band: 'rival', release: 'nothing' };
  return undefined;
}
