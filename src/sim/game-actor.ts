/**
 * One actor's fixed step, in the order it runs: upkeep (timers, stamina, recovery), swimming and
 * the floor, the scenery it meets, and the actions and state machine. `Step` is what the earlier
 * passes worked out about this frame. Split out of src/sim/game.ts; every function takes the Game.
 */
import { RULES } from './era-rules';
import { BURROWERS, HEAVY_SPECIALS, DEFENSIVE_SPECIALS, CAMOUFLAGE_DRAIN, camouflageMatch, clearPursuit, STILL_SETTLE, stillBury, stopHiding } from './concealment';
import { abilitySpeed, stepExpansionAbility, bloomRate, grazeRate } from './expansion-abilities';
import { clamp, damp, dist, dot, heading, len3, lerp, norm, scale as vscale, sub, v3, wrapAngle, yawOf, type Vec3 } from '../shared/math';
import { applyScaleStats, bandOf, bodyGap, bodyRadius, clearanceOf, climbHeight, climbRise, floorClearance, glideOver, isAlive, isHidden, lengthOf, massOf, speedFactor, staminaCost, swimCeiling } from './actors';
import { tierScale } from './tiers';
import { applyHit, GRIP_BREAK, GRIP_MEAL, GRIP_STRAIN, kill, startSwallow } from './combat';
import { creature, type CreatureDef } from './creatures';
import { resolveFlora } from './flora';
import { emptyInput, type Actor, type InputFrame } from './types';
import { groundHeight, microbialAt, resolveStatic, RISE_RATE, sampleCurrent, sampleHeight, shoreDistance, SURFACE_Y } from './world';
import { DRIFT_CURRENT, driftRise, flipLaunch, PULSE_CYCLE, pulseRefilling, pulseThrust, rowWalkCurrent } from './locomotion';
import { amphibious, ASHORE_WADE, landSpeed, onFoot, stepBeach, wadeAt, WALL_EASE, WALL_WADE } from './beach';
import { escapeReady, healRate, PLANT_HEAL } from './effort';
import { TEXT } from '../shared/text';
import { BREACH_GRAVITY, DASH_TAP, DASH_TIME, FLIP_TIME, GRASP_AT, HATCH_TIME, type Step, breachSpeed, dashLaunch, graspPoint, type Game } from './game';
import { attackHits, canEat, consumeSnacks, corpseInReach, gainNutrition, nutritionValue, startEating, takeWhole } from './game-feeding';
import { breakLoose, closeGrip, tryGrasp, updateRide } from './game-grip';
import { inShell } from './game-life';
import { aimNudge, blockPulse, emergeStrike, evadeSpecial, expansionContext, heavyAction, keepReaching, pickLockTarget, startDash, startDodge, startPounce, updateAbility, updateHunted } from './game-moves';
import { feedOnBones } from './game-population';

/** Everything the simulation says out loud; the words are in `src/content/strings.ts`. */
const SAY = TEXT.sim;

// Feeding on a body. How many bites it takes is the body's length against the eater's, so a
// snack goes down whole and a giant is a meal you have to stay for; each bite tears off its
// share of the carcass.
const BITE_TIME = 0.62; 

/** How hard a released dash is reined in, per second. */
const DASH_BRAKE = 16;

/** The least upward speed that gets a fish through the surface, at scale 1: bigger bodies need more. */
const BREACH_MIN_RISE = 3.2;

const PADDLE_SPEED = 0.7; 

const PADDLE_SINK = 1.2; 

/** How fast the settle reaches its terminal speed. Low: the fall eases in rather than switching on. */
const PADDLE_SINK_EASE = 5;

/**
 * Per second while a walker is gaining height, however the height was asked for. Above the 14/s a
 * moving body regenerates, so a climb is a real cost and not a rounding error — which is what
 * keeps open water somewhere a walker crosses rather than somewhere it lives.
 */
const PADDLE_STAMINA = 24;

/**
 * Sprint cost, per second at full trigger. A sprint is meant to be how you cross water and close a
 * gap, not a two-second window: at this rate a full bar runs for most of a minute, and the swim
 * back is still paid for out of the same bar.
 */
const BURST_STAMINA = 7.5;

/**
 * How long a body has to keep pushing into an obstacle before it starts climbing it. Long enough
 * that brushing a rock on the way past is not a climb, short enough that meaning to go over one
 * never feels like an argument with the controls.
 */
const CLIMB_PUSH = 0.35;

/**
 * How little of a step's travel has to survive the climb (see `followFloor`) before the face
 * counts as something to be climbed rather than walked up: at a twentieth, the body has stopped
 * making headway and is going straight up the side of it.
 */
const STALL = 0.05;

/**
 * How a walker moves through the water column: gently, both ways. It is not built for this — the
 * whole point of the animal is that the floor is where it belongs — so it climbs at well under a
 * swimmer's rise and settles back at a drift rather than a drop. The old rates were brisk enough
 * that leaving the bottom and returning to it read as bobbing rather than as labouring.
 */
const PADDLE_RISE = 1.5; 

/** The current at a body, read and spent within its own update: one object, not one per body per step. */
const currentScratch: Vec3 = { x: 0, y: 0, z: 0 };

export function updateActor(game: Game, a: Actor, input: InputFrame, dt: number) {
  // Inside the egg nothing the player presses reaches the water: the body is held where it
  // hatched until it has wriggled out of the shell.
  if (inShell(game, a)) input = { ...emptyInput(), camYaw: input.camYaw, camPitch: input.camPitch };
  const def = creature(a.creature);
  const L = lengthOf(a);
  const sf = speedFactor(a.scale);
  const giantish = a.controller === 'giant' || a.controller === 'shadow';
  const justLight = input.light && !a.prev.light, justHeavy = input.heavy && !a.prev.heavy, justAbility = input.ability && !a.prev.ability;
  const justDodge = input.dodge && !a.prev.dodge, justGuard = input.guard && !a.prev.guard, justLock = input.lock && !a.prev.lock;
  const justSense = input.sense && !a.prev.sense;
  // A grasping animal takes hold with whatever it lands while the button is down. Bots keep to
  // the moves that grab on their own, so nothing about the reef's behaviour changes with this.
  // Every animal can take hold of something: an attack held down is a grip, whatever it attacks
  // with. `grasp` no longer decides *whether* — it decides how easily, through the reach and the
  // hold the grip costs (`gripReach`, `gripHold`), because an animal with arms for it closes on
  // something sooner and from further off than one working with its mouth alone.
  //
  // The grip button — RT, or the ability — is what turns a landed attack into a hold instead of
  // a blow. The bite (Y) never gives its bite up, because that is what you hurt something with
  // while you are hanging off it; held down it still closes a grip on what is already in reach,
  // which is the deliberate hold `graspT` is timing, but it is never a way to stop biting.
  const holder = a.controller === 'player';
  a.graspHold = holder && (input.heavy || input.ability) && !input.pursueDash;
  const gripArmed = holder && (input.light || input.heavy || input.ability);
  a.graspT = gripArmed ? a.graspT + dt : 0;
  if (!gripArmed) a.graspSpent = false;
  const justDash = input.dash && !a.prev.dash;
  if (input.dash) a.dashHoldT += dt; else { a.dashHoldT = 0; a.dashUsed = false; }
  a.pounceCd = Math.max(0, a.pounceCd - dt);
  a.dashCd = Math.max(0, a.dashCd - dt);
  a.teleportCd = Math.max(0, a.teleportCd - dt);
  a.holdT = Math.max(0, a.holdT - dt);
  a.sinceHit += dt;
  // Out of the fight for a few seconds and health comes back: run, hide, recover, return.
  // Out of the fight for a few seconds and health comes back: run, hide, recover, return. Faster
  // beside a plant, paused while sprinting or dashing, and in Survival paused on an empty stomach.
  const resting = a.sinceHit > 6 && a.hp < a.hpMax && a.state !== 'dead' && input.burst <= 0.1 && a.burstT <= 0 && !input.dash && a.state !== 'dodge'
    && !(game.mode === 'survival' && a.hunger <= 0);
  if (resting && (RULES.canRecoverHealth?.(game, a) ?? true)) {
    const nearPlant = game.world.floraHash.query(a.pos.x, a.pos.z, game.world.floraReach + L * 0.5 + 1.5, game.scratchFlora)
      .some((f) => Math.hypot(a.pos.x - f.pos.x, a.pos.z - f.pos.z) <= f.R + L * 0.5 + 1.5 && a.pos.y >= f.pos.y - L * 0.5 && a.pos.y <= f.pos.y + f.H + L * 0.5);
    a.hp = Math.min(a.hpMax, a.hp + a.hpMax * healRate(a, game.mode) * (nearPlant ? PLANT_HEAL : 1) * dt);
  }
  if (a.brain) a.brain.courage = Math.min(1, a.brain.courage + 0.05 * dt);

  if (a.state !== 'ability') a.abilityActive = (a.state === 'guard' || a.state === 'parry') && DEFENSIVE_SPECIALS.has(def.ability);

  // Movement: desired direction
  //
  // A walker with its legs on the floor swims flat, unless it is putting its back into it: a
  // sprint or a dash takes the camera's aim, which is the push that gets a bottom-dweller off
  // the bottom along the line it chose rather than only ever straight up by the button.
  const shoving = input.burst > 0.1 || input.dash || a.state === 'dodge';
  const flatOnFloor = (def.ground && a.grounded && !shoving) || a.ashore;
  let dir: Vec3 = v3();
  let mag = 0;
  const locked = a.lockTarget >= 0 ? game.idMap.get(a.lockTarget) : undefined;
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
        fwd = flatOnFloor ? norm({ x: to.x, y: 0, z: to.z }) : to;
        right = norm({ x: -fwd.z, y: 0, z: fwd.x });
      } else {
        const cy = input.camYaw, cp = flatOnFloor ? 0 : input.camPitch;
        fwd = { x: Math.sin(cy) * Math.cos(cp), y: -Math.sin(cp), z: Math.cos(cy) * Math.cos(cp) };
        right = { x: -Math.cos(cy), y: 0, z: Math.sin(cy) };
      }
      dir = norm({ x: fwd.x * sy + right.x * sx, y: fwd.y * sy, z: fwd.z * sy + right.z * sx });
    }
  }
  // A walker's stick is flat while its legs are on the floor — except when it is putting its
  // back into it. Aim up and sprint or dash and the aim is taken: that is the push that gets a
  // bottom-dweller off the bottom along the line it chose, rather than only ever straight up by
  // the button. Off the floor the camera's pitch steers it like any swimmer's, which is what
  // makes the water somewhere it can go rather than only somewhere it can bob. Height is bought
  // with stamina below, so an empty bar keeps the level and the descent and loses only the climb.
  if ((def.ground && (flatOnFloor || (dir.y > 0 && a.stamina <= 0))) || a.ashore) dir.y = 0;

  // Cooldowns, healing, hiding and the stamina bar: everything that ticks whether or not the
  // animal does anything this frame. It settles what the rest of the frame can afford. The
  // direction is settled first because the bar's price depends on it: an era may give a body the
  // climb for nothing, and what counts as climb is where this frame is pointed.
  const { speed, burstIn, paddling, bursting, freeBurst, relief, emptyClimb, freeClimb } = stepUpkeep(game, a, input, dt, def, L, dir, mag, justLight, justHeavy, justAbility, justDash);

  const controllable = a.holdT === 0 && (a.state === 'free' || a.state === 'guard' || (a.state === 'ability' && (def.mobileAbility || def.ability === 'shellUp' || def.ability === 'bristleFlare' || def.ability === 'ambushSurge')));
  const slowMult = abilitySpeed(a) * (a.state === 'guard' ? (def.ability === 'anchor' ? 0 : def.ability === 'enroll' ? .8 : .45) : (a.abilityActive && def.ability === 'shellUp') ? 0.35 : a.exhausted > 0 ? 0.7 : 1);
  const burstMult = controllable && (bursting || freeBurst) ? (1 + (def.burst - 1) * (freeBurst ? 1.25 : burstIn) * (a.controller === 'swarm' ? 0.55 : giantish ? 0.35 : 1)) : 1;
  const baseCruise = def.speed * sf * slowMult * (a.controller === 'swarm' ? 0.62 : giantish ? 0.55 : 1) * (paddling ? PADDLE_SPEED : 1);
  const sw = controllable ? RULES.swim?.(game, a, dir, mag, baseCruise, burstIn > 0.1 && !a.prev.burst) : undefined;
  // The shore slows a walker to its walk over the wade and takes a stranded swimmer's swim away (src/sim/beach.ts).
  const cruise = baseCruise * (sw?.speed ?? 1) * landSpeed(a);
  // What this body is asking for, whatever its state lets it do about it. Everything below takes
  // the wish away again for a body that is staggered, grabbed or mid-lunge; the tug of war needs
  // the wish itself, from both ends of a grip.
  a.drive = mag > 0
    ? { x: dir.x * mag * cruise, y: dir.y * mag * cruise, z: dir.z * mag * cruise }
    : v3();
  if (!def.ground && !a.ashore) a.drive.y += input.rise ? RISE_RATE * sf : input.sink ? -RISE_RATE * sf : 0;
  const cur = sampleCurrent(currentScratch, a.pos.x, a.pos.y, a.pos.z, game.time);
  // A drifter on a neutral stick gives up steering and takes the whole current; a walking body
  // down on the floor holds station against it. Everything else feels the usual fraction.
  const drifting = !!def.drift && mag < 0.08 && !input.rise && !input.sink;
  const curK = (drifting ? DRIFT_CURRENT : rowWalkCurrent(a, a.grounded) ?? (def.ground ? 0.08 : 0.55)) * (1 - a.wade);   // there is no current on the sand
  let desired: Vec3 = v3(cur.x * curK, cur.y * curK, cur.z * curK);
  if (drifting) desired.y += driftRise(game.time) * sf;   // up through the night, down through the day
  // A shelled jetter's funnel is what makes it fast and what makes rising and sinking free, but
  // the stick is the direction of travel for every body in the sea: swimming, sprinting and
  // dashing all go where they are aimed, and the nose goes with them. The funnel shows up in
  // the free hover and in the backward dash, not in a sprint that turns the animal round.
  const jets = RULES.jet?.(a) ?? false;
  // A bell contracts and then coasts — but only when it is *going* somewhere in a hurry. Cruising
  // used to surge and coast too, which meant a jellyfish never simply swam: every crossing was a
  // stutter, and at low speed the animal read as broken rather than as a medusa. The pulse is
  // what it does under power, so it is what a sprint and a dash look like, and an unhurried bell
  // swims the way everything else does. A sprint pressed while the bell refills throws more water
  // than one held down through the beat, which is the one place rhythm beats pressure.
  const driving = bursting || a.state === 'dodge';
  let pulse = 1;
  if (def.swimStyle === 'pulse') {
    if (controllable && mag > 0 && driving) {
      if (bursting && !a.prev.burst && pulseRefilling(a.pulseT)) a.pulseT = 0;   // contract now
      a.pulseT = (a.pulseT + dt) % PULSE_CYCLE;
      pulse = pulseThrust(a.pulseT);
    } else a.pulseT = 0;
  }
  if (controllable && mag > 0) {
    // On an empty bar a sprint that is only running because the climb is free must buy the climb
    // and nothing else: the vertical takes the sprint, the horizontal swims at its own pace.
    const along = emptyClimb ? 1 : burstMult;
    desired.x += dir.x * mag * cruise * along * pulse;
    desired.y += dir.y * mag * cruise * (emptyClimb && dir.y <= 0 ? 1 : burstMult) * pulse;
    desired.z += dir.z * mag * cruise * along * pulse;
  }
  if (controllable && !def.ground && !a.ashore) {
    const hover = jets ? 1.6 : 1;
    const base = RISE_RATE * sf * hover;
    // What the rise and sink buttons are worth here, and anything the body does for itself: an
    // era may climb faster than the shared rate, carry a sprint into the climb, or head for the
    // surface unasked (a lung that needs air). Holding sink is always the way to stay down.
    desired.y += RULES.rise(game, a, input, base, burstMult);
  }
  // A mouthful is not cargo: it is pulling too. What the pair does is both wishes summed and
  // shared out by weight, so a heavy animal that wants nothing still drags on whatever is
  // carrying it, one that pulls the same way helps, and one that pulls the other way cancels it
  // out. This is the whole of push-and-pull; what it wears out is decided where `grabT` lives.
  if (a.grabbing >= 0) {
    const v = game.idMap.get(a.grabbing);
    if (v && v.state === 'grabbed') {
      const share = clamp(massOf(v) / (massOf(a) + massOf(v)), 0, 0.85);
      desired.x = desired.x * (1 - share) + v.drive.x * share;
      desired.y = desired.y * (1 - share) + v.drive.y * share;
      desired.z = desired.z * (1 - share) + v.drive.z * share;
    }
  }
  let rate = def.agility;
  // Glide is for a body that has been asked for *nothing*. Rise and sink are asks like any other,
  // and leaving them out meant holding the climb button alone put the animal in its slowest
  // acceleration: a hatchling Nothosaurus took four and a half seconds to reach even two thirds
  // of a climb speed that was already too small, which in an era where air is the economy reads
  // as the button not working.
  if (mag === 0 && controllable && !input.rise && !input.sink) rate = def.glide; // glide out
  if (a.state === 'stagger' || a.state === 'grabbed') { desired = v3(); rate = 2.5; }
  // A tail-flip is ballistic: the reflex has fired and there is nothing to steer with until it lands.
  if (a.state === 'dodge' || a.state === 'attack' || a.state === 'eating' || a.state === 'moult' || a.state === 'grabbing' || a.state === 'parry') rate = a.state === 'dodge' ? (def.tailFlip ? 0.25 : 1.4) : 3;
  if (a.state === 'pounce') rate = 0;
  if (a.airborne) rate = 0;                          // in the air nothing steers; gravity does
  if (a.holdT > 0) { desired = v3(); rate = 5; }
  if (a.state === 'ability' && (def.ability === 'burrow' || def.ability === 'anchor')) { desired = v3(); rate = 8; }
  if (a.hitStop > 0) rate = 0;
  a.vel.x = damp(a.vel.x, desired.x, rate, dt);
  a.vel.y = damp(a.vel.y, desired.y, rate, dt);
  a.vel.z = damp(a.vel.z, desired.z, rate, dt);
  // The fast-start, thrown along the body's heading — except for a shell, whose heading is its
  // funnel: it goes where it is steered, not where it happens to be pointing.
  if (sw && sw.impulse > 0) {
    const h0 = jets && mag > 0 ? dir : heading(a.yaw);
    a.vel.x += h0.x * sw.impulse; a.vel.z += h0.z * sw.impulse;
  }
  if (a.airborne) { a.vel.y -= BREACH_GRAVITY * dt; a.vel.x *= 1 - 0.15 * dt; a.vel.z *= 1 - 0.15 * dt; }

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
    if (len3(a.vel)>3) for(const o of game.nearby(a.pos,L*.9)) {
      if(o.id===a.id || !isAlive(o) || a.hitDone.has(o.id) || expansionContext(game).allies(a,o)) continue;
      a.hitDone.add(o.id); applyHit(game.hitCtx,a,o,{...def.light,damage:10,poise:40,knockback:4},.5);
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

  // Hop and paddle (crawlers). RB kicks off the floor, and holding it keeps the crawler
  // climbing at a paddle's pace for as long as its stamina lasts; letting go sinks it back
  // down at a gentle terminal speed rather than dropping it like a stone.
  if (def.ground) {
    const canPaddle = a.hideMode === 'none' && controllable;
    // A climb rides the same channel as the paddle, so going up a rock is one steady rise rather
    // than a fight between the lift and the settle.
    const climbing = a.climbTo > a.pos.y;
    const paddleUp = canPaddle && input.rise && a.stamina > 0;
    const holdingRise = paddleUp || climbing;
    // A walker swims while it is working at it, and comes home when it stops. Off the floor and
    // still asking to go somewhere, the settle is switched off and the body holds its own depth:
    // the stick, through the camera's pitch, is what takes it up or down from there, exactly as
    // it does for anything else in the sea. Ask for nothing and the sink comes back and puts it
    // on the bottom, which is the whole character of the animal — at home down there, a visitor
    // up here. Height is the part that is paid for, at the same price per second however it was
    // asked for, so aiming up is not a way round the button's price — RB is still the dedicated
    // paddle and climbs faster for it, the camera is a steer that happens to point upward.
    const swimming = canPaddle && !a.grounded && mag > 0.08 && !input.sink;
    const lifting = swimming && dir.y > 0.1 && a.stamina > 0;
    // Lifting off is a swim, not a jump. Holding RB eases the body up off the floor and it keeps
    // accelerating to a paddle's pace — the same gradual rise a swimmer gets from the same button
    // — rather than kicking it into a ballistic arc it has no control over.
    // A walker aiming up and putting its back into it leaves the floor along the line it is
    // aimed, rather than only ever going up by the button. It is thrown, not lifted: `vel.y`
    // carries it and nothing holds it there, so it arcs and settles again unless it keeps
    // swimming — which is the whole shape of a bottom-dweller's excursion into open water.
    const launching = canPaddle && a.grounded && dir.y > 0.1 && mag > 0.2
      && (a.state === 'dodge' || (input.burst > 0.1 && a.stamina > 0));
    if ((holdingRise || launching) && a.grounded) { a.grounded = false; a.hopVel = Math.max(a.hopVel, 0); }
    if (holdingRise && !a.grounded) {
      a.hopVel = damp(a.hopVel, Math.max(climbing ? climbRise(a) : 0, PADDLE_RISE * Math.sqrt(sf)), 3, dt);
    } else if (!a.grounded) {
      const sink = swimming ? 0 : -PADDLE_SINK * Math.sqrt(sf) * (input.sink ? 2.4 : 1);
      a.hopVel = Math.max(damp(a.hopVel, sink, PADDLE_SINK_EASE, dt), sink);
    }
    if (paddleUp || lifting) a.stamina = Math.max(0, a.stamina - PADDLE_STAMINA * dt);
    if (!a.grounded) { a.pos.y += a.hopVel * dt; }
  }

  // The seabed and everything standing on it: rocks, plants, what is climbed, what is ridden.
  stepScenery(game, a, input, dt, { def, sf, speed, paddling, mag, controllable });

  // Orientation. Most bodies face where they are going. A shell is the exception, because it
  // jets its funnel either side of itself and so has no wrong end to lead with: it keeps
  // whichever end it is already pointing and turns through the shorter of the two arcs, so
  // travel more behind it than ahead leaves it going shell-first with its head trailing — the
  // escape jet — and it never spins round to chase its own heading. Aiming and striking are the
  // exception to the exception: those face what they are aimed at. Heading only; the stick is
  // the direction of travel for every body, in every gear.
  //
  // A dash with no direction fires along the body's own axis — out behind a jetting shell (see
  // the dash above) — and `backingOff` holds the heading through it for every body, so nothing
  // spins through 180° at the worst possible moment.
  const hv = Math.hypot(a.vel.x, a.vel.z);
  const h = heading(a.yaw);
  const backward = jets && hv > 0.35 && a.state !== 'attack' && !a.aiming
    && h.x * a.vel.x + h.z * a.vel.z < 0;
  const facing = backward ? v3(-a.vel.x, -a.vel.y, -a.vel.z) : a.vel;
  const backingOff = a.state === 'dodge' && dot(a.dodgeDir, h) < -0.3;
  let targetYaw = a.yaw;
  if (backingOff) { /* hold the heading through a backward dash */ }
  else if (a.aiming && a.controller === 'player' && (a.state === 'free' || a.state === 'guard')) targetYaw = hv > 0.35 ? yawOf(facing) : input.camYaw;
  else if (locked && isAlive(locked) && (a.state === 'free' || a.state === 'guard' || a.state === 'attack')) targetYaw = yawOf(sub(locked.pos, a.pos));
  else if (a.rideHost >= 0) targetYaw = game.idMap.get(a.rideHost)?.yaw ?? a.yaw;   // clinging: lie along the host
  // On the sand a walker faces where it is asked to go, however slowly it is going: a walk is
  // under the speed at which a swimmer's heading follows its travel, and a body that never
  // turned would sidle down the beach. A flop turns itself (src/sim/beach.ts).
  else if (a.wade > 0 && !a.airborne && a.flopT <= 0 && a.state !== 'grabbed' && Math.hypot(a.drive.x, a.drive.z) > 1e-3) targetYaw = yawOf(a.drive);
  // A body with no front never turns to travel: a brittle star rows with whichever arm is
  // leading and a ctenophore's combs beat any way at all, so the stick moves them without
  // pointing them. Aiming still does, which is the branch above.
  else if (hv > 0.35 && a.state !== 'grabbed' && def.swimStyle !== 'omnidirectional') targetYaw = yawOf(facing);
  // A turn asked for outright (a touch swipe, `InputFrame.turn`) is the body going round with the
  // camera, exactly and at once, rather than easing after it at the animal's own turn rate. Its
  // travel goes round with it, or the heading would chase the old velocity straight back. Not
  // while something else owns the heading: a lock, a ride, a dash's own line, a grip.
  const asked = input.turn && a.controller === 'player' && !backingOff && !(locked && isAlive(locked)) && a.rideHost < 0
    && (a.state === 'free' || a.state === 'guard' || a.state === 'attack') ? input.turn : 0;
  if (asked) {
    a.yaw = wrapAngle(a.yaw + asked);
    const c = Math.cos(asked), s = Math.sin(asked), vx = a.vel.x, vz = a.vel.z;
    a.vel.x = vx * c + vz * s; a.vel.z = -vx * s + vz * c;
    targetYaw = wrapAngle(targetYaw + asked);
  }
  const dy = wrapAngle(targetYaw - a.yaw);
  const tr = def.turnRate * (a.state === 'attack' ? 0.5 : 1) * (1 + hv * 0.05) * (giantish ? 0.45 : 1) * (sw?.turn ?? 1);
  const turn = clamp(dy * 6, -tr, tr);
  const prevYaw = a.yaw;
  a.yaw = wrapAngle(a.yaw + turn * dt);
  const turnRate = wrapAngle(a.yaw - prevYaw) / Math.max(dt, 1e-4);
  if (a.state === 'ability' && def.ability === 'spineIntercept') a.yaw = yawOf(a.dodgeDir);
  // On the sand a body lies along the slope like a crawler does, and a flop holds the twist and
  // the nose-up the beach rules gave it (src/sim/beach.ts).
  const flopping = a.flopT > 0, onLand = a.wade > 0 && !a.airborne;
  // A swimmer lying on the floor lies along it too — a ray on a slope, a fish settled into a
  // hollow — or the uphill half of a long flat body is under the sand. Only while it is resting
  // there: under way, the pitch follows its travel, which the floor already bends.
  const lying = !def.ground && !a.airborne && !flopping && len3(a.vel) < Math.max(0.3, L * 0.25) && Math.abs(a.vel.y) < 0.3
    && a.pos.y - groundHeight(game.world, a.pos.x, a.pos.z, game.scratchBoulders) <= floorClearance(a) + 0.05 + L * 0.03;
  if (!flopping) a.bank = damp(a.bank, def.ground || onLand ? 0 : clamp(-turnRate * 0.16, -0.7, 0.7), 4, dt);
  if (flopping) { /* set by the flop */ }
  else if (def.ground || onLand || lying) {
    const ahead = groundHeight(game.world, a.pos.x + Math.sin(a.yaw) * L * 0.4, a.pos.z + Math.cos(a.yaw) * L * 0.4, game.scratchBoulders);
    const behind = groundHeight(game.world, a.pos.x - Math.sin(a.yaw) * L * 0.4, a.pos.z - Math.cos(a.yaw) * L * 0.4, game.scratchBoulders);
    a.pitch = damp(a.pitch, -Math.atan2(ahead - behind, L * 0.8), 8, dt);
  } else {
    // Pitch follows the travel too, except through a backward dash, where the body holds the
    // attitude it had rather than tipping to point down its own wake. A rigid shield with no
    // paired fins behind it changes its pitch slowly, so climbing and diving are a commitment.
    const sp = Math.max(len3(a.vel), 0.5);
    const want = clamp(-Math.asin(clamp(facing.y / sp, -1, 1)) * 0.8, -0.9, 0.9);
    if (!backingOff) {
      if (def.pitchRate === undefined) a.pitch = damp(a.pitch, want, 4, dt);
      else a.pitch += clamp(want - a.pitch, -def.pitchRate * dt, def.pitchRate * dt);
    }
  }

  // Noise / stillness
  a.noise = a.hideMode !== 'none' ? .1 : a.state === 'attack' ? 1.5 : (bursting && !freeBurst) ? 2.5 : speed > 0.4 ? 1 : 0.5;
  a.stillness = speed < 0.3 ? Math.min(3, a.stillness + dt) : 0;

  // Everything the animal *decides* — aim, sense, the heavy button, the dash, the guard, the
  // attacks, and the state machine that runs each of them to its end.
  stepActions(game, a, input, dt, { def, L, sf, justLight, justHeavy, justAbility, justDodge, justGuard, justLock, justSense, justDash, paddling, bursting, dir, mag, locked, jets, relief, freeClimb });
}

/**
 * Everything that ticks: cooldowns, the out-of-the-fight heal, hiding and camouflage, and the
 * stamina bar. Runs before anything else in the frame because it settles what the rest of it can
 * afford — whether this body is sprinting, paddling, or out of breath altogether.
 */
export function stepUpkeep(game: Game, a: Actor, input: InputFrame, dt: number, def: CreatureDef, L: number, dir: Vec3, mag: number, justLight: boolean, justHeavy: boolean, justAbility: boolean, justDash: boolean) {
  // Timers
  a.stateT += dt;
  a.iframes = Math.max(0, a.iframes - dt);
  a.spawnProtect = Math.max(0, a.spawnProtect - dt);
  a.hitFlash = Math.max(0, a.hitFlash - dt);
  a.hitStop = Math.max(0, a.hitStop - dt);
  a.abilityCd = Math.max(0, a.abilityCd - dt);
  a.senseT = Math.max(0, a.senseT - dt);
  if (def.ability === 'whipSearch' && a.senseT > 0) stepExpansionAbility(expansionContext(game), a, def, dt);
  a.burstT = Math.max(0, a.burstT - dt);
  a.comboT = Math.max(0, a.comboT - dt);
  a.dodgeTapT = Math.max(0, a.dodgeTapT - dt);
  a.exhausted = Math.max(0, a.exhausted - dt);
  if (a.comboT === 0) a.combo = 0;
  a.seen = Math.max(0, a.seen - dt);
  if (a.poise < a.poiseMax && a.state !== 'stagger') a.poise = Math.min(a.poiseMax, a.poise + a.poiseMax * dt / 3);
  a.cover = game.coverFor(a);

  // Hiding is independent of defensive/combat states and available at every growth tier.
  a.hideCd = Math.max(0, a.hideCd - dt);
  if (a.hideMode !== 'none' && (!isAlive(a) || ['grabbed', 'grabbing', 'stagger', 'swallowed', 'moult'].includes(a.state))) stopHiding(a);
  if (justAbility && (a.state === 'free' || a.state === 'guard')) {
    if (a.hideMode !== 'none') {
      const buried = a.hideMode === 'burrowed'; stopHiding(a);
      if (buried) { a.emergenceHeavy = true; emergeStrike(game, a, def); }
    } else if (RULES.useAbility?.(game, a, expansionContext(game))) {
      game.flag(a, 'ability');                       // the era's own Y special took the press
    } else if (a.hideCd === 0 && (BURROWERS.has(a.creature) || a.stamina >= 8)) {
      a.state = 'free'; a.abilityActive = false; a.hideT = 0; a.seen = 0;
      if (BURROWERS.has(a.creature)) a.hideMode = 'descending';
      else {
        a.hideMode = 'camouflage'; a.stamina -= 3;
        const match = camouflageMatch(a, game.world, game.nearby(a.pos, 80));
        a.camoColors = match.colors; a.camoScheme = match.scheme; a.camoLabel = match.label; a.camoSource = match.actor;
      }
      clearPursuit(a, game.actors); game.flag(a, 'ability');
    }
  }
  if (a.hideMode !== 'none' && (justLight || justHeavy || input.guard || input.burst > .1 || justDash)) {
    const buried = a.hideMode === 'burrowed'; stopHiding(a);
    a.emergenceHeavy = false;
    if (buried && (justLight || justHeavy)) emergeStrike(game, a, def);
  }
  // A still-burrower goes under by lying still on bare sand, and comes up by moving.
  if (def.stillBurrow && isAlive(a) && !justAbility) {
    const moving = Math.abs(input.mx) + Math.abs(input.my) > .08 || !!input.rise || !!input.sink || !!(input.worldMove && len3(input.worldMove) > .08);
    const seabed = sampleHeight(a.pos.x, a.pos.z);
    const resting = a.state === 'free' && !a.airborne && !a.ashore && a.wade === 0 && len3(a.vel) < Math.max(0.15, L * 0.1)
      && a.pos.y - seabed <= floorClearance(a) + L * 0.05 + 0.05
      && groundHeight(game.world, a.pos.x, a.pos.z, game.scratchBoulders) <= seabed + 1e-3;   // sand, not a rock
    if (stillBury(a, resting, moving, dt) === 'buried') clearPursuit(a, game.actors);
  }
  if (a.hideMode !== 'none') a.hideT += dt;
  if (a.hideMode === 'descending' && a.hideT > 10 && a.grounded && a.pos.y > sampleHeight(a.pos.x,a.pos.z) + clearanceOf(a) + .3) stopHiding(a);
  if (a.hideMode === 'descending' && a.pos.y <= sampleHeight(a.pos.x, a.pos.z) + clearanceOf(a) + .15 && (!def.stillBurrow || a.hideT >= STILL_SETTLE)) {
    a.hideMode = 'burrowed'; a.hideT = 0; a.seen = 0; a.vel = v3();
    clearPursuit(a, game.actors);
    game.silt.push({pos:{...a.pos}, radius:L*.7, t:1.5});
  }
  a.camoStrength = damp(a.camoStrength, a.hideMode === 'camouflage' ? 1 : 0, 3, dt);
  if (a.hideMode === 'camouflage') {
    a.stamina = Math.max(0, a.stamina - CAMOUFLAGE_DRAIN * (RULES.camoDrain?.(a) ?? 1) * dt);
    if (a.stamina === 0) stopHiding(a);
  }
  if (a.state === 'guard' || a.state === 'parry') a.guardHeld += dt;
  else a.guardHeld = 0;
  // Stamina
  const speed = len3(a.vel);
  const burstIn = input.burst;
  // A crawler off the seabed is doggy-paddling: it keeps swimming slowly, but it cannot
  // sprint or dash until its legs are back on the floor.
  // A rower is not doggy-paddling when it leaves the floor: the paddles are what it swims with,
  // so it keeps its sprint and its dash out in the water and only the walkers lose them.
  const paddling = def.ground && !a.grounded && !def.rowWalk;
  // How much of this effort is climb, and so given away: an era may hand a body the vertical for
  // nothing. At full relief an empty bar is no longer a reason not to drive — see `emptyClimb`,
  // which keeps that sprint out of the horizontal, where it was never paid for.
  const relief = RULES.climbRelief?.(a, input, dir, mag) ?? 0;
  const freeClimb = relief > 0.5;
  const bursting = burstIn > 0.1 && (a.stamina > 0 || freeClimb) && a.state !== 'guard' && (a.exhausted === 0 || freeClimb);
  const emptyClimb = bursting && a.stamina <= 0;
  if (def.ability === 'ambushSurge' && input.burst > .1 && !a.prev.burst && a.abilityCd <= 0) { a.burstT = 2.2; a.abilityCd = 10; }
  const freeBurst = a.burstT > 0;
  if (bursting && !freeBurst) a.stamina = Math.max(0, a.stamina - BURST_STAMINA * burstIn * dt * (1 - relief));
  else if (a.state === 'guard') a.stamina -= 3 * dt;
  else if (a.hideMode !== 'camouflage') a.stamina = Math.min(a.staminaMax, a.stamina + (speed < 0.4 ? 24 : 14) * dt * (a.state === 'free' ? 1 : 0.5) * (RULES.staminaRegen?.(game, a) ?? 1));
  if (a.stamina <= 0) { a.stamina = 0; if (a.exhausted === 0 && !freeClimb) a.exhausted = 1.6; }
  return { speed, burstIn, paddling, bursting, freeBurst, relief, emptyClimb, freeClimb };
}

/**
 * Follow the floor up instead of being snapped to the top of it.
 *
 * A rock the body is allowed to be carried over (`glideOver`) does not block, and the floor under
 * the body simply takes it up. That is right for the pace of it and wrong for the shape: a dome
 * is `sqrt(1 - q^2)` tall, so its flank is near-vertical at the rim. A body crossing that rim
 * gained a couple of its own lengths of height in one step while it moved a tenth of a unit
 * forward — an anomalocaris pressing toward a boulder went up its side at twenty times its own
 * swimming speed and arrived on top, which reads as jetting rather than as swimming over.
 *
 * So the climb is paid for out of the travel. The body may rise what it could swim up in this
 * step for nothing (`climbRise`); beyond that it gives back the horizontal it was going to cover,
 * one for one along the hypotenuse, so what it actually travels is the distance it was always
 * going to travel and only the direction of it tilts up the face. A gentle dome barely slows
 * anything; a steep one turns most of the step into height and the body climbs it on the diagonal
 * at its own pace. Nothing here moves a body further or faster than it was already moving.
 *
 * The trade is solved by bisection along this step's own path, and only when there is a rise to
 * pay for — the common cases (open water, resting on the sand, going downhill) return at once.
 * `face` is the floor where the body ended up and `clear` how far above it the body rides, both
 * measured by the caller, which needs them anyway. Returns the face if the body is pressed
 * against one rather than walking up it, and -Infinity otherwise.
 */
export function followFloor(game: Game, a: Actor, dt: number, face: number, clear: number): number {
  const free = climbRise(a) * dt;
  if (face - a.pos.y <= free) return -Infinity;
  const dx = a.pos.x - a.prevT.x, dz = a.pos.z - a.prevT.z;
  const d = Math.hypot(dx, dz);
  if (d < 1e-6) return -Infinity;   // standing still: there is no travel to trade for the height
  const at = (x: number, z: number) => groundHeight(game.world, x, z, game.scratchBoulders) + clear;
  // How much rise a fraction `t` of the step may buy: the free swim up, plus the horizontal
  // given back, taken as the other side of a right angle so the total stays this step's own.
  const budget = (t: number) => free + Math.sqrt(Math.max(0, d * d - (t * d) ** 2));
  let lo = 0, hi = 1;
  for (let i = 0; i < 6; i++) {
    const t = (lo + hi) / 2;
    if (at(a.prevT.x + dx * t, a.prevT.z + dz * t) - a.pos.y <= budget(t)) lo = t; else hi = t;
  }
  a.pos.x = a.prevT.x + dx * lo;
  a.pos.z = a.prevT.z + dz * lo;
  // The travel that was not spent going forward is spent going up the face instead, as far as
  // the face itself. On a gentle slope almost all of it is still forward; on a sheer one almost
  // none is, and the body comes up the side at the speed it was swimming at. Either way the
  // floor it now stands on is under it, so the clamp below has nothing left to snap.
  a.pos.y = Math.min(face, a.pos.y + budget(lo));
  // Almost none of it left over means the body is pressed against a face rather than walking up
  // a slope, which is a contact like any other: report it, and the climb the caller already
  // knows how to do takes the body up the side of it.
  return lo < STALL ? face : -Infinity;
}

/**
 * The body against the world: the seabed, boulders, plants, what is worth climbing, and the ride
 * that outranks all of it. Runs after the body has moved and before it is turned, because what
 * it is standing on decides where it can point.
 */
export function stepScenery(game: Game, a: Actor, input: InputFrame, dt: number, s: Pick<Step, 'def' | 'sf' | 'paddling' | 'mag'> & { speed: number; controllable: boolean }) {
  const { def, sf, speed, paddling, mag, controllable } = s;
  // Static collision. A rock you could get over is not a wall: gentle ones are glided across, and
  // a face too steep for that is climbed — held out of the rock and lifted up its side until the
  // top is clear, at the pace the body would swim up. Only what stands more than two bodies above
  // you stops you.
  const contact = game.contact, floraHit = game.floraContact;
  // The shore, first: how far out of the water the sand here puts this body (src/sim/beach.ts).
  // Measured on the sand rather than on a rock top, because a rock is something you sit on and
  // not a shore, and only in the shore band, the one place the sand comes near the surface. A
  // crawler keeps exactly its old paths — the paddling clamp below still holds it in the sea.
  a.wade = !def.ground && !def.shore && shoreDistance(a.pos.x, a.pos.z) < 48 ? wadeAt(a, sampleHeight(a.pos.x, a.pos.z)) : 0;
  // The wall stands for a body swimming at it and for nothing else: a leap is not held by the
  // water, a body on the sand is past it, and a walker goes up through it. Wading is not enough
  // — a small body's wade begins seaward of its wall, and a swimmer that could wade up the beach
  // would strand itself by swimming, which is the one way onto the sand this is not meant to
  // be. So a stranded body that has flopped back to where it is no longer ashore meets the wall
  // again from the inside, and the wall eases it out at the pace it could have moved rather than
  // snapping it: the water taking it back.
  const held = !a.airborne && !a.ashore && !amphibious(a.creature);
  const ease = Math.max(WALL_EASE * dt, len3(a.vel) * dt * 1.5);
  const hitWall = resolveStatic(game.world, a.pos, bodyRadius(a), game.scratchBoulders, held ? RULES.shoreReach?.(a) ?? 0 : Infinity, glideOver(a), climbHeight(a), contact, ease, !a.unseen);
  // And the same wall in the body's own draught: the water holds a swimmer where it can still
  // swim, whatever the fixed wall's distance means on this era's beach (`WALL_WADE`).
  if (held && a.wade > WALL_WADE) { a.pos.z -= ease; }
  if (hitWall && !def.ground) { a.vel.x *= 0.6; a.vel.z *= 0.6; }
  // Plants: swarm snacks are numerous and tiny, so they take turns on alternate steps.
  floraHit.blocked = false; floraHit.headOn = false; floraHit.top = -Infinity;
  if (!isHidden(a) && a.state !== 'grabbed' && !a.unseen) {
    resolveFlora(game.world, a, dt, game.scratchFlora, floraHit);
  }
  // What is worth climbing, and what has to be asked for. A rock inside two bodies is taken on
  // sight. Everything else waits for the body to lean on it: a crawler has legs and gets over
  // whatever it keeps pushing into, however tall, and a plant is a thin thing to go round unless
  // the body is aimed straight at the middle of it.
  // A rock is a slope, not a step: come up its flank at the speed the body is actually going.
  // A face too steep to make any headway on is a contact as much as a wall is, and is climbed.
  const clear = floorClearance(a), px = a.pos.x, pz = a.pos.z;
  // A school fish nobody can see keeps to the seabed and nothing on it (src/sim/sight.ts).
  let floor = (a.unseen ? sampleHeight(a.pos.x, a.pos.z) : groundHeight(game.world, a.pos.x, a.pos.z, game.scratchBoulders)) + clear;
  // A body on the beach's own terms walks up the slope rather than swimming up it, so the climb
  // trade stands down (src/sim/beach.ts `onFoot`). It is a trade of travel for height, and on the
  // last stretch of sand — where the floor rises into a ceiling that is not going anywhere — it
  // spends a walker's whole step on height the beach rules then take back, which is what wedged
  // a grown Nothosaurus sixteen units out and stopped it reaching the sand at all.
  const walking = onFoot(a);
  const stalled = walking || a.unseen ? -Infinity : followFloor(game, a, dt, floor, clear);
  if (a.pos.x !== px || a.pos.z !== pz) floor = groundHeight(game.world, a.pos.x, a.pos.z, game.scratchBoulders) + clear;
  const leaning = controllable && mag > 0.35 && (contact.hit || floraHit.blocked || Number.isFinite(stalled));
  a.climbPush = leaning ? Math.min(1, a.climbPush + dt) : Math.max(0, a.climbPush - dt * 2);
  let offer = Math.max(contact.climbTo, stalled);
  if (a.climbPush > CLIMB_PUSH) {
    if (def.ground) offer = Math.max(offer, contact.wallTop);
    if (floraHit.headOn) offer = Math.max(offer, floraHit.top);
  }
  if (offer > a.pos.y) a.climbTo = Math.max(a.climbTo, offer);
  if (a.climbTo <= a.pos.y || a.climbPush === 0 || !controllable || a.hitStop > 0 || a.state === 'grabbed' || isHidden(a)) a.climbTo = -Infinity;
  else if (!def.ground) a.vel.y = Math.max(a.vel.y, climbRise(a));
  if (def.ground) {
    if (a.grounded || a.pos.y <= floor) { a.pos.y = a.grounded ? damp(a.pos.y, floor, 18, dt) : floor; if (!a.grounded && a.hopVel < 0) { a.grounded = true; a.hopVel = 0; } }
    if (a.pos.y < floor) a.pos.y = floor;
    // a paddling crawler still cannot climb out of the sea
    const ceiling = swimCeiling(a);
    if (a.pos.y > ceiling) { a.pos.y = ceiling; if (a.vel.y > 0) a.vel.y = 0; if (a.hopVel > 0) a.hopVel = 0; }
  } else {
    // Riding the floor: a swimmer skims the sand and is carried up and over rocks rather than
    // stopped by them, so the climb reads as a swim rather than a step.
    // Out of the water the ceiling is the sky: a body already on the sand is not held under a
    // waterline it is standing above.
    const ceiling = a.ashore ? Infinity : swimCeiling(a);
    if (a.pos.y < floor) {
      const fell = a.vel.y;
      a.pos.y = floor; if (a.vel.y < 0) a.vel.y *= -0.2;
      // A leap that comes down on the sand lands there: the beach, not the splash.
      if (a.airborne && floor > swimCeiling(a)) {
        a.airborne = false; a.vel.y = 0; a.vel.x *= 0.35; a.vel.z *= 0.35;
        // Far enough up the beach and it is ashore from this frame — the one way a swimmer
        // gets there (src/sim/beach.ts); short of that it is in the shallows and the water
        // takes it back.
        if (a.wade >= ASHORE_WADE) a.ashore = true;
        game.events.push({ kind: 'beach', pos: { ...a.pos }, actor: a.id, player: a.player, strength: clamp(-fell / 9, 0.5, 1.5) });
      }
    }
    if (a.airborne) {
      // back through the surface: the splash, and the water takes most of the fall out of it
      if (a.pos.y <= ceiling && a.vel.y < 0) {
        a.airborne = false;
        game.events.push({ kind: 'splash', pos: { x: a.pos.x, y: SURFACE_Y, z: a.pos.z }, actor: a.id, player: a.player, strength: clamp(-a.vel.y / 9, 0.3, 1.6) });
        a.vel.y *= 0.45;
      }
    } else if (a.pos.y > ceiling) {
      // Driving hard at the surface, a fish leaves the water; anything else meets the ceiling.
      //
      // What counts as "hard" is relative to the body. BREACH_MIN_RISE was an absolute speed, so
      // a hatchling — which cannot reach it by any means available to it — met a hard, invisible
      // wall a body's length under the surface however it came at it. It scales with size now, as
      // the speeds it is being compared against already do. A dash is allowed through for the
      // same reason: it is the hardest a body can drive at anything, and excluding every state
      // but `free` shut out the one move most likely to launch a fish clear of the water.
      const sp = len3(a.vel);
      const launching = a.state === 'free' || a.state === 'dodge';
      // The Cambrian has no rules object and never breached; it does now, on the Devonian's own
      // terms (a free-swimming body, not a shell, not hidden), because the shore is somewhere a
      // leap can land in every era and nothing else in that sea can reach it.
      const may = RULES.canBreach(a);
      if (may && isAlive(a) && a.vel.y > BREACH_MIN_RISE * sf && sp > def.speed * sf * 0.85 && launching) {
        a.airborne = true;
        // What it leaves the water with is capped to a leap of about its own length; what it was
        // *travelling* at is what the splash is sized on, so a hard breach still reads as one.
        a.vel.y = Math.min(a.vel.y, breachSpeed(lengthOf(a)));
        game.events.push({ kind: 'breach', pos: { x: a.pos.x, y: SURFACE_Y, z: a.pos.z }, actor: a.id, player: a.player, strength: clamp(sp / 12, 0.4, 1.5) });
      } else {
        // The ceiling, unless the sand is higher: in water too shallow to be under, the body
        // sits on the sand with its back out of the water rather than being pressed into the
        // beach, and the shore rules take it from there (src/sim/beach.ts). Coming *down* to it
        // is rate-limited by the pace the body could swim there under its own power, because a
        // body leaving the sand is briefly above a ceiling that has just reappeared under it and
        // must settle onto the water rather than be dropped onto it.
        const cap = Math.max(ceiling, floor);
        if (a.pos.y > cap) { a.pos.y = Math.max(cap, a.pos.y - Math.max(climbRise(a), 2) * dt); if (a.vel.y > 0) a.vel.y = 0; }
      }
    }
    stepBeach(game.beachCtx, a, input, dt, floor, controllable, mag);
  }

  // Riding: the grip wins over swimming. Pinned after the collision so the host carries the rider
  // through the scenery with it rather than the rider being resolved out of the host.
  if (a.rideHost >= 0) updateRide(game, a, def, input, dt);
}

/**
 * What the animal does: the aim, the sense pulse, the heavy button, the dash, the guard and the
 * attacks, and the state machine that carries each of them through to its end.
 *
 * Split out of `updateActor`, which had grown to five hundred lines covering timers, stamina,
 * swimming, collision, climbing, orientation and this. Every gameplay change lands in here, and
 * finding it meant scrolling past four other subjects that share nothing with it but a body.
 * `Step` is what the earlier passes worked out about this frame; nothing here writes back to it.
 */
export function stepActions(game: Game, a: Actor, input: InputFrame, dt: number, s: Step) {
  const { def, L, sf, justLight, justHeavy, justAbility, justDodge, justGuard, justLock, justSense, justDash, paddling, bursting, dir, mag, locked, jets, relief, freeClimb } = s;
  if (input.pursueTarget != null && input.pursueDash) {
    if (a.pursuit?.target !== input.pursueTarget) {
      // Use the same launch speed and duration as a normal dash, including floor resistance.
      const gap = a.pos.y - groundHeight(game.world, a.pos.x, a.pos.z, game.scratchBoulders);
      const dashSpeed = def.tailFlip ? flipLaunch(a) : dashLaunch(a, def, L, gap);
      const dashLength = dashSpeed * (def.tailFlip ? FLIP_TIME : DASH_TIME);
      a.pursuit = { target: input.pursueTarget, last: { ...a.pos }, traveled: 0, max: dashLength, spent: false };
    } else if (!a.pursuit.spent) {
      a.pursuit.traveled += dist(a.pos, a.pursuit.last);
      a.pursuit.last = { ...a.pos };
      if (a.pursuit.traveled >= a.pursuit.max) a.pursuit.spent = true;
    }
  } else a.pursuit = undefined;
  const chaseTarget = a.pursuit?.spent ? undefined : input.pursueTarget;
  if (a.pursuit?.spent && a.state === 'pounce' && a.lockTarget === a.pursuit.target) {
    a.state = 'free'; a.stateT = 0; a.vel = v3();
  }
  // The grip is only ever asked about below, inside the block a free body reaches. Say so first,
  // so a recording of a frame that never got there reads as the reason it did not rather than as
  // whatever the last frame that did happened to say.
  if (a.controller === 'player') {
    game.graspReasons.set(a.id, a.rideHost >= 0 ? 'riding' : a.grabbing >= 0 ? 'holding something'
      : a.state === 'free' || a.state === 'guard' ? 'not asked yet this frame' : `busy: state=${a.state}`);
  }
  // --- Actions ---
  if ((a.state === 'free' || a.state === 'guard') && a.hideMode !== 'burrowed' && a.hideMode !== 'descending') {
    // Aim (LT held): the camera owns the crosshair; whatever it reports is the target. Bots toggle lock.
    if (a.controller === 'player') {
      a.aiming = input.aim;
      a.lockTarget = chaseTarget ?? (input.aim ? input.aimTarget : -1);
      if (input.aim) game.flag(a, 'lock');
    } else if (justLock) {
      if (a.lockTarget >= 0) a.lockTarget = -1;
      else a.lockTarget = pickLockTarget(game, a)?.id ?? -1;
    }
    if (a.lockTarget >= 0 && Math.abs(input.lookX) > 0.75 && a.comboT === 0) {
      const nt = pickLockTarget(game, a, input.lookX > 0 ? 1 : -1, a.lockTarget);
      if (nt) { a.lockTarget = nt.id; a.comboT = 0.4; }
    }
    // Sense: a display mode, held on or off. On, the whole panel is drawn — the gauges, the band
    // glyphs, the radar; off, nothing is drawn over that player's sea at all but a faint line
    // naming this button (`PlayerPanel` in src/app/Hud.tsx). It costs nothing and never runs out:
    // turning it off is for the look of the thing, not a trade.
    if (justSense) {
      a.senseMode = !a.senseMode;
      // The ping is the toggle's own sound, both ways: it is how you know the button took.
      game.flag(a, 'sense');
      game.events.push({ kind: 'sense', pos: { ...a.pos }, actor: a.id, player: a.player });
    }
    // Taking hold. A grasp is arms closing on something, not a blow that happens to stick, so it
    // is tried before the attack buttons and takes them when it lands: hold the button, swim up
    // to an animal, and you have hold of it without having hurt it. It used to be a rider on
    // damage — the grip closed only where an attack had already landed — which made riding
    // something big impossible to do without first biting it, and made a held button read as an
    // attack that sometimes stuck. Nothing in reach and the button does what it always did.
    // A grip that closed takes the button; one still closing does not, because the pounce is the
    // other way of arriving at the same hold — it lunges, and what it lands on it takes hold of.
    const grasped = !input.pursueDash && (tryGrasp(game, a, def, L, input.heavy || input.ability) === 'took');
    // Heavy (RT): the emergence strike, the creature's special, or the pounce — all of it in one
    // place, so a charge out of a sprint (below) or out of a dash reaches exactly the same move.
    // Sprinting makes it a charge: it aims along the line of travel and costs extra stamina.
    if (grasped) { /* the grip took the button */ }
    // A held pursuit springs at the one animal it names. A finger's double-tap has already paid
    // for its dash-length chase, so its pounce is free; the mouse's is an ordinary pounce and is
    // priced and cooled down like one — until it can be afforded, the pointer keeps swimming at it.
    else if (chaseTarget != null && a.controller === 'player' && (input.pursueDash || (a.pounceCd === 0 && a.stamina >= 12 && a.exhausted === 0))) {
      const target = game.idMap.get(chaseTarget);
      if (target && isAlive(target) && !isHidden(target)) startPounce(game, a, target, L, sf, !!input.pursueDash);
    }
    else if (justHeavy && heavyAction(game, a, def, L, sf, locked, bursting)) { /* the button was taken */ }
    // Holding the grip button at something too big to bite keeps swimming at it until it has
    // hold of it. A lunge is one press and lasts about a second, which on a body that size is
    // often not enough to arrive — and the button being held meant no second press ever came, so
    // the animal stopped short of the one thing it was reaching for and simply hung there.
    else if (keepReaching(game, a, def, L, sf)) { /* still going for it */ }
    // Dash (LB): fast and long enough to clear a predator's bite. A stick direction fires it that
    // way. A neutral stick fires it along the body's own axis — ahead of a finned body, and out
    // behind a jetting shell, which is the way a nautiloid escapes and the way it is already
    // pointing while it does, so it leaves without turning first.
    // A dash that is mostly climb is on the same terms as a sprint that is: it costs what is
    // left of it after the relief, and an empty bar does not refuse it — the body just goes up
    // rather than along (see `startDash`). There is always a way back to the surface.
    // Not on the sand: a stranded body's dash is its flop, and a walker has no water to dash through.
    else if (justDash && !a.ashore && (a.stamina >= 10 || freeClimb) && (a.exhausted === 0 || freeClimb) && a.dashCd === 0 && !a.dashUsed && escapeReady(a)) {
      a.dashUsed = true;
      startDash(game, a, def, mag > 0.3 ? dir : vscale(heading(a.yaw), jets || def.tailFlip ? -1 : 1), L, sf, relief);
    }
    // Dodge (B for creatures that cannot guard, bots)
    else if (justDodge && a.controller !== 'player' && a.stamina >= 10 && a.exhausted === 0) startDodge(game, a, def, dir, mag, L, sf);
    // Guard / parry
    else if (justGuard && def.canGuard && a.stamina > 5) { a.state = 'parry'; a.stateT = 0; a.hitDone.clear(); a.stateDur = def.ability === 'anchor' || def.ability === 'bristleFlare' ? .28 : .15; a.abilityActive = DEFENSIVE_SPECIALS.has(def.ability); blockPulse(game, a, def); if (['ribbonSlip','combCruise'].includes(def.ability) && a.abilityCd <= 0 && a.stamina >= 10) { a.stamina -= 8; a.abilityCd = 4; evadeSpecial(game, a, def, L); } game.flag(a, 'guard'); }
    else if (justGuard && !def.canGuard && a.stamina >= 10 && a.exhausted === 0) startDodge(game, a, def, dir, mag, L, sf);
    else if (input.guard && def.canGuard && a.state === 'free' && a.stamina > 0 && a.stateT > 0.05) { a.state = 'guard'; a.stateT = 0; }
    else if (!input.guard && a.state === 'guard') { if (def.ability === 'shellUp' && a.guardHeld > .6) blockPulse(game, a, def); a.state = 'free'; a.stateT = 0; a.abilityActive = false; }
    // Attacks (also start eating on corpses)
    // Bots keep the old split: RT is their special and nothing else, so their behaviour (and every
    // seeded replay that depends on it) is unchanged by the player-side fallback above.
    else if (justLight || (justHeavy && a.controller !== 'player' && !HEAVY_SPECIALS.has(def.ability))) {
      const corpse = justLight ? corpseInReach(game, a) : undefined;
      if (corpse) startEating(game, a, corpse);
      else {
        const m = justHeavy ? def.heavy : (a.combo === 2 ? { ...def.light, damage: def.light.damage * 1.6, poise: def.light.poise * 1.8, knockback: def.light.knockback * 2, recovery: def.light.recovery + 0.12 } : def.light);
        if (a.stamina >= staminaCost(a, m.stamina) * 0.5 && a.exhausted === 0) {
          if (a.controller === 'player') aimNudge(game, a, L * 1.8 + 2);
          a.state = 'attack'; a.stateT = 0; a.move = m; a.moveKind = justHeavy ? 'heavy' : 'light'; a.hitDone.clear();
          a.stamina -= staminaCost(a, m.stamina);
          if (!justHeavy) { a.combo = (a.combo + 1) % 3; a.comboT = 0.9; } else a.combo = 0;
          game.flag(a, justHeavy ? 'heavy' : 'light');
        }
      }
    }
  } else if (a.state === 'parry') {
    if (a.stateT >= a.stateDur) { a.state = input.guard && def.canGuard ? 'guard' : 'free'; a.stateT = 0; }
  } else if (a.state === 'attack' && a.move) {
    const m = a.move;
    const total = m.windup + m.active + m.recovery;
    // The first tap can already be winding up a bite. A creature double-tap commits to its
    // target now, just as a water double-tap takes over immediately for the dash.
    const chase = input.pursueDash && chaseTarget != null ? game.idMap.get(chaseTarget) : undefined;
    if (chase && isAlive(chase) && !isHidden(chase)) {
      a.move = undefined;
      startPounce(game, a, chase, L, sf, true);
    } else if (justDash && input.touchDash && !a.ashore && (a.stamina >= 10 || freeClimb) && (a.exhausted === 0 || freeClimb) && a.dashCd === 0) {
      a.dashUsed = true;
      a.move = undefined;
      startDash(game, a, def, mag > 0.3 ? dir : vscale(heading(a.yaw), jets || def.tailFlip ? -1 : 1), L, sf, relief);
    } else {
      if (a.stateT >= m.windup && a.stateT < m.windup + m.active) attackHits(game, a, m, L);
      // cancel recovery into dodge, or chain lights
      if (a.stateT > m.windup + m.active + m.recovery * 0.45 && (justDodge || (justDash && mag > 0.3)) && a.stamina >= 10) { a.dashUsed = true; startDodge(game, a, def, dir, mag, L, sf); }
      else if (a.stateT >= total) { a.state = 'free'; a.stateT = 0; a.move = undefined; }
      else if (a.moveKind === 'light' && justLight && a.stateT > m.windup + m.active + m.recovery * 0.35 && a.stamina >= 6) {
        const nm = a.combo === 2 ? { ...def.light, damage: def.light.damage * 1.6, poise: def.light.poise * 1.8, knockback: def.light.knockback * 2, recovery: def.light.recovery + 0.12 } : def.light;
        a.stateT = 0; a.move = nm; a.hitDone.clear(); a.stamina -= staminaCost(a, nm.stamina); a.combo = (a.combo + 1) % 3; a.comboT = 0.9;
      }
    }
  } else if (a.state === 'pounce') {
    const t = a.lockTarget >= 0 ? game.idMap.get(a.lockTarget) : undefined;
    // Reaching for a hold on something too big to bite is a pursuit, not a single spring. A
    // lunge lasts about a second, and a body twenty units long can be further off than that
    // covers — and it is patrolling, so the tail a rider is aiming for is being carried away and
    // turned as they close on it. While the button is down the lunge keeps its legs: it re-aims
    // at wherever the animal is now, every frame, until it arrives. Paid for once when it
    // started, because it is one act however long the swim to it takes.
    if (t && isAlive(t) && chaseTarget === t.id) a.stateDur = a.stateT + 0.2;
    if (t && isAlive(t) && a.graspHold && !a.graspSpent && a.grabbing < 0 && a.rideHost < 0
      && (bandOf(a, t) === 'threat' || bandOf(a, t) === 'giant')) a.stateDur = a.stateT + 0.2;
    if (t && isAlive(t) && a.stateT < a.stateDur) {
      // home in hard on the target; impact when the mouth reaches it
      const to = sub(t.pos, a.pos); const d = len3(to);
      const speed = chaseTarget === t.id && a.pursuit
        ? Math.max(def.speed * sf * 3.2, a.pursuit.max / (def.tailFlip ? FLIP_TIME : DASH_TIME))
        : Math.max(def.speed * sf * 3.2, 9 * Math.sqrt(sf));
      const dirTo = norm(to);
      a.vel = vscale(dirTo, speed);
      a.yaw = yawOf(dirTo); a.pitch = def.ground ? a.pitch : clamp(-Math.asin(clamp(dirTo.y, -1, 1)) * 0.8, -0.9, 0.9);
      if (bodyGap(t, a) < L * 0.45) {
        const band = bandOf(a, t);
        const bigger = band === 'threat' || band === 'giant';
        // A pounce made with the grip armed arrives as a grip. Nothing is settled on impact:
        // what it lands is carried, and what happens to it is decided by when the button comes
        // up. A mouthful is held ready and eaten on release; something too big to be a mouthful
        // is held on to, and letting go quickly is the bite that never landed while a longer
        // hold is a ride the animal is never troubled by. The lunge is unchanged — this is only
        // what it does when it gets there.
        const gripped = a.graspHold && closeGrip(game, a, t);
        if (gripped) { /* the pounce closed a grip; the release settles it */ }
        else if (band === 'snack' && (t.controller === 'swarm' || (t.controller === 'ambient' && lengthOf(t) < L * 0.3))) takeWhole(game, a, t);
        else { const m = { ...def.heavy, name: SAY.pounce, damage: def.heavy.damage * 1.35, poise: def.heavy.poise * 1.2, knockback: def.heavy.knockback * 0.8, lunge: 0 }; applyHit(game.hitCtx, a, t, m, 1.2); }
        game.events.push({ kind: 'pounce', pos: { ...a.pos }, actor: a.id, other: t.id, player: a.player, strength: L });
        a.vel = vscale(a.vel, 0.25); a.iframes = 0.1;
        // A grip took over the body's state machine; only a pounce that ended in a blow is free.
        if (!gripped) { a.state = 'free'; a.stateT = 0; }
      }
    } else { a.state = 'free'; a.stateT = 0; a.vel = vscale(a.vel, 0.3); }
  } else if (a.state === 'dodge') {
    // A charge out of a dash: RT cancels the dash into the creature's heavy, thrown at whatever
    // is nearest the line it was travelling along. It costs the dash's remaining invulnerability
    // as well as the extra stamina — you have chosen to commit instead of to escape. It costs
    // the rest of the dash's travel too, since the cancel is immediate: a charge that finds
    // something halfway through leaves the dash covering only the ground it had crossed by then.
    // That is the trade, not a dash cut short by accident.
    if (justHeavy && heavyAction(game, a, def, L, sf, locked, true)) a.iframes = 0;
    else if (a.stateT >= a.stateDur) { a.state = 'free'; a.stateT = 0; a.dashCost = 0; }
    // Held, the dash runs its full length and is billed for it. Let go past `DASH_TAP` and the
    // body is reined in and the rest of the cost is never charged: a tap is a short, cheap shove
    // and a crossing is the whole move at the whole price. A dash the player did not ask for —
    // a bot's, a flip's reflex, one that is over anyway — has no `dashCost` and is untouched.
    else if (a.dashCost > 0) {
      if (input.dash) a.stamina = Math.max(0, a.stamina - a.dashCost * (dt / Math.max(1e-3, a.stateDur)));
      else {
        // The brake starts the moment the button comes up — what `DASH_TAP` protects is the
        // *commitment*, the window the dash cannot be taken back inside, not the braking.
        a.vel = vscale(a.vel, Math.max(0, 1 - DASH_BRAKE * dt));
        if (a.stateT >= DASH_TAP) { a.state = 'free'; a.stateT = 0; a.dashCost = 0; a.iframes = Math.min(a.iframes, 0.15); }
      }
    }
  } else if (a.state === 'stagger') {
    if (a.stateT >= a.stateDur) { a.state = 'free'; a.stateT = 0; a.poise = a.poiseMax * 0.6; }
  } else if (a.state === 'grabbed') {
    const g = a.grabbedBy >= 0 ? game.idMap.get(a.grabbedBy) : undefined;
    if (!g || g.state !== 'grabbing' || g.grabbing !== a.id) { a.state = 'free'; a.stateT = 0; a.grabbedBy = -1; }
    else {
      if (justLight || justHeavy) a.grabT -= 0.28;
      // Pulling against the grip wears it, and only pulling *against* it does. A holder that
      // lets itself drift along with what it has hold of is the hardest to get out of — that is
      // the price of not going anywhere while you hold something — and one that is hauling its
      // catch somewhere is fighting the catch for every unit of it.
      const pull = len3(g.drive), heave = len3(a.drive);
      const opposed = pull > 0.15 && heave > 0.15
        ? Math.max(0, -dot(g.drive, a.drive) / (pull * heave)) * Math.min(1, heave / Math.max(0.3, lengthOf(a)))
        : 0;
      a.grabT -= opposed * GRIP_STRAIN * dt;
      // A dash is the way out, and what it does depends on what the holder is doing. Against one
      // that is pulling, the two forces tear the grip open and the dash is the escape. Against
      // one that has gone slack there is nothing to tear against, so the dash takes the holder
      // with it: you get away with your captor rather than from it, slower by what it weighs.
      if ((justDodge || justDash) && a.stamina >= 10 && a.exhausted === 0) {
        // Uncapped, unlike the blend above: what the blend needs a ceiling for is not letting a
        // heavy catch steer its holder outright, but a *tow* is exactly the case where weight
        // should be allowed to win. Hauling something six times your length off with you should
        // be very nearly futile, and a ceiling here made it merely inconvenient.
        const share = clamp(massOf(g) / (massOf(a) + massOf(g)), 0, 0.995);
        if (pull > 0.15) {
          breakLoose(game, g, a);
          g.graspSpent = true;                          // torn open: the button has to come up
          startDodge(game, a, def, dir, mag, L, sf);
        } else {
          // Towing. The shove goes on the holder, because the holder is what carries the pair —
          // this body is pinned to it — and it is scaled down by the holder's share of the
          // weight, so hauling something big off with you barely moves.
          const d = mag > 0.2 ? dir : vscale(heading(a.yaw), -1);
          const power = 7.5 * Math.sqrt(sf) * (1 - share);
          g.vel.x += d.x * power; g.vel.z += d.z * power;
          if (!creature(g.creature).ground) g.vel.y += d.y * power * 0.7;
          a.stamina -= 10; a.dodgeTapT = 0.35;
          game.events.push({ kind: 'dodge', pos: { ...a.pos }, actor: a.id, player: a.player, strength: L });
        }
      }
      // Held at the point the grip actually has. `grabOff` is that point in this body's own
      // frame, so it turns with the body; the grabber's end of it is its mouth. Sized by both
      // animals rather than only the grabber, a mouthful of any size ends up mouth-to-body
      // instead of half inside its captor or hanging in the water in front of it.
      const gh = heading(g.yaw), gl = lengthOf(g);
      const hold = graspPoint(a);
      const target = {
        x: g.pos.x + gh.x * gl * GRASP_AT - hold.x,
        y: g.pos.y - Math.sin(g.pitch) * gl * GRASP_AT - hold.y,
        z: g.pos.z + gh.z * gl * GRASP_AT - hold.z,
      };
      // Fast enough to read as being carried rather than towed, and snapped once it is there so
      // the pair are rigidly joined and the grip does not visibly slip while the grabber turns.
      a.pos.x = damp(a.pos.x, target.x, 22, dt); a.pos.y = damp(a.pos.y, target.y, 22, dt); a.pos.z = damp(a.pos.z, target.z, 22, dt);
      // Contact, from the mouthful's side: the grip has finished closing and the two are joined.
      // The clock belongs to the grabber, because it is the grabber's release it decides, and it
      // is set here because this is where the coming-together actually happens.
      if (Math.hypot(a.pos.x - target.x, a.pos.y - target.y, a.pos.z - target.z) < lengthOf(a) * 0.05) {
        a.pos = { ...target };
        if (g.gripSyncT < 0) g.gripSyncT = 0;
      }
      a.vel = v3();
      if (a.grabT <= 0) { a.state = 'free'; a.stateT = 0; a.grabbedBy = -1; g.state = 'free'; g.stateT = 0; g.grabbing = -1; g.graspSpent = true; a.iframes = 0.4; }
    }
  } else if (a.state === 'grabbing') {
    const v = a.grabbing >= 0 ? game.idMap.get(a.grabbing) : undefined;
    if (!v || v.state !== 'grabbed') { a.state = 'free'; a.stateT = 0; a.grabbing = -1; }
    else {
      // A player holding the button is *holding*, not crushing: the grip keeps what it caught for
      // as long as the button is down — the grip's own clock stops, though what is in it can
      // still struggle out — and the meal is what happens when the button comes up. Nothing a
      // grip has hold of is hurt by the holding, whatever the body doing it: the grasping
      // appendages make a grip easier to close and further to reach with, and that is the whole
      // of what they change. Everything else, a bot's grasp or a move that grabs on its own,
      // squeezes as it always did — that is an attack, not a grip.
      const holdingOn = a.graspHold && a.controller === 'player';
      if (!holdingOn) v.grabT -= dt;
      if (a.gripSyncT >= 0) a.gripSyncT += dt;
      // Crush ticks — and a player's grip never has them, button down or up.
      //
      // Gating this on the button alone meant the squeeze landed on the *release* frame: the
      // grip spends a moment winding down after the button comes up, and a mouthful was crushed
      // to death in it. Something held harmlessly for five seconds then died as it was let go,
      // which is the one thing a grip is not supposed to be able to do. What is left here is what
      // it was always for: a bot's grasp, and a move that grabs on its own. Those are attacks.
      const crushes = a.controller !== 'player';
      if (crushes && Math.floor(a.stateT * 2.5) !== Math.floor((a.stateT - dt) * 2.5)) {
        v.hp -= 6 * clamp(Math.pow(L / lengthOf(v), 1.6), 0.2, 4); v.hitFlash = 0.3;
        game.events.push({ kind: 'hit', pos: { ...v.pos }, actor: a.id, other: v.id, strength: 0.4, player: v.player });
        if (v.hp <= 0) { a.state = 'free'; a.grabbing = -1; if (lengthOf(a) >= lengthOf(v) * 1.35) startSwallow(game.hitCtx, a, v); else kill(game.hitCtx, v, a); }
      }
      // Nothing stays in a grip it did not agree to for ever. Holding costs the holder nothing,
      // so without this it would cost the held animal everything — carried around indefinitely by
      // something that need not even be paying attention. Past `GRIP_BREAK` from contact it is
      // out, whatever the button is doing.
      if (a.gripSyncT >= GRIP_BREAK && v.state === 'grabbed') {
        breakLoose(game, a, v);
      }
      // A player holds on for as long as the button is down. Letting go of something small is a
      // mouthful — that is what the grip was for — and letting go of a peer is just letting go.
      const holding = a.graspHold && a.state === 'grabbing' && v.state === 'grabbed';
      if (holding) a.stateDur = a.stateT + 0.4;
      else if (a.stateT >= a.stateDur && v.state === 'grabbed') {
        // What you held and could swallow, you eat — if you eat it while it is still worth
        // eating. Past `GRIP_MEAL` the animal has had every chance: carrying prey around in your
        // jaws for five seconds is not a meal you are having, and it works itself loose and goes.
        // Timed from contact, like everything else a grip comes to.
        const swallowable = bandOf(a, v) === 'snack' || bandOf(a, v) === 'prey';
        const inTime = a.gripSyncT >= 0 && a.gripSyncT < GRIP_MEAL;
        if (swallowable && a.controller === 'player' && inTime) {
          v.grabbedBy = -1; a.grabbing = -1;
          startSwallow(game.hitCtx, a, v);
        } else if (swallowable && a.controller === 'player') {
          breakLoose(game, a, v);
        } else {
          // throw
          const h = heading(a.yaw);
          v.state = 'free'; v.grabbedBy = -1; v.stateT = 0; v.vel = { x: h.x * 9, y: 2, z: h.z * 9 };
          v.state = 'stagger'; v.stateDur = 0.7;
          a.state = 'free'; a.stateT = 0; a.grabbing = -1;
        }
      }
    }
  } else if (a.state === 'eating') {
    const c = a.eatingTarget >= 0 ? game.idMap.get(a.eatingTarget) : undefined;
    if (!c || c.state !== 'dead' || c.eaten >= 1 || !canEat(game, a, c) || dist(a.pos, c.pos) > L * 0.8 + lengthOf(c) * 0.6 || (a.controller === 'player' && !input.light && a.stateT > 0.3)) {
      a.state = 'free'; a.stateT = 0; a.eatingTarget = -1;
    } else {
      const ratio = lengthOf(c) / L;
      const before = c.eaten;
      if (c.eatBites <= 1) {
        // Small enough to go down whole: one bite, but let it run so the reach-and-swallow
        // performance has something to scrub against.
        c.eaten = Math.min(1, c.eaten + dt / clamp(6 * ratio * ratio, 0.5, 4.5));
      } else {
        // Torn off in whole mouthfuls, on the chew beat. The first lands a little sooner than
        // a full beat so biting something reads as immediate.
        const phase = a.stateT + BITE_TIME * 0.6;
        if (Math.floor(phase / BITE_TIME) !== Math.floor((phase - dt) / BITE_TIME)) {
          const step = 1 / c.eatBites;
          c.eaten = Math.min(1, Math.round((c.eaten + step) / step) * step);
        }
      }
      const taken = c.eaten - before;
      if (taken > 0) {
        gainNutrition(game, a, c, taken * nutritionValue(game, a, c));
        a.hp = Math.min(a.hpMax, a.hp + a.hpMax * taken * 0.35 * Math.min(1, ratio * 2));
      }
      // One event per mouthful for a torn body; a steady chewing beat for one swallowed whole.
      // `strength` is the share of the body that just came off, which is what the renderer tears.
      if (c.eatBites > 1) { if (taken > 0) game.events.push({ kind: 'eat', pos: { ...c.pos }, actor: a.id, other: c.id, strength: taken, player: a.player }); }
      else if (Math.floor(a.stateT * 3) !== Math.floor((a.stateT - dt) * 3)) game.events.push({ kind: 'eat', pos: { ...c.pos }, actor: a.id, other: c.id, strength: ratio, player: a.player });
      if (c.eaten >= 1) { a.eats++; a.state = 'free'; a.stateT = 0; a.eatingTarget = -1; game.flag(a, 'ate'); }
    }
  } else if (a.state === 'ability') {
    updateAbility(game, a, def, dt, input, L, sf);
  } else if (a.state === 'moult') {
    const t = clamp(a.stateT / a.stateDur, 0, 1);
    const era = RULES.moultScale?.(game, a);
    const to = era ? era.to : tierScale(a.creature, a.tier);
    // In an egg the animal is already most of the size it will be when it comes out — an egg is
    // not a seed. A moult out of nothing (a respawn above the bottom rung) still swells from a
    // speck, which is what that second was always for.
    const inEgg = a.hatching && a.stateDur > 1.5;
    if (inEgg) {
      // Three soft pokes during Eggs' visible deformation phase build toward the seam giving.
      for (const pokeAt of [HATCH_TIME * 0.2, HATCH_TIME * 0.32, HATCH_TIME * 0.43]) {
        if (a.stateT - dt < pokeAt && a.stateT >= pokeAt) game.events.push({ kind: 'eggPoke', pos: { ...a.pos }, actor: a.id, player: a.player });
      }
    }
    const from = a.hatching ? to * (inEgg ? 0.62 : 0.3) : era ? era.from : tierScale(a.creature, Math.max(0, a.tier - 1));
    // Coming out of an egg, the animal is the size of what was in the egg until the shell starts
    // to give: the growth is what opens it, over the last third of the hold.
    const k = inEgg ? clamp((t - 0.62) / 0.38, 0, 1) : t;
    a.scale = lerp(from, to, k * k * (3 - 2 * k));
    // Held where it hatched, working at the shell: the wriggle is the animal, not the water. The
    // position is put back as well as the velocity — an egg does not drift down the current, and
    // a step's worth of drift each step adds up to the shell crawling off its own patch of sand.
    if (inShell(game, a)) {
      const at = game.eggAt.get(a.id);
      if (at) a.pos = { ...at };
      a.vel = v3(); a.yaw += Math.sin(a.stateT * 11) * 0.9 * dt; a.pitch = Math.sin(a.stateT * 7) * 0.12;
    }
    if (a.stateT >= a.stateDur) {
      if (inEgg) game.events.push({ kind: 'hatch', pos: { ...a.pos }, actor: a.id, player: a.player, strength: 1 });
      a.state = 'free'; a.stateT = 0; a.scale = to; applyScaleStats(a, true); a.hp = a.hpMax; a.hatching = false; game.eggAt.delete(a.id);
    }
  }

  // Snacks: swim-through consume
  if (a.state !== 'moult' && a.state !== 'grabbed' && a.controller !== 'swarm') consumeSnacks(game, a, L, def);
  // Mobile suspension feeders can grow in blooms at every tier. Depositors must be near the bottom.
  if (isAlive(a) && a.state !== 'moult' && a.controller !== 'swarm') {
    for (const b of game.world.blooms) if (dist(a.pos, b.pos) < b.radius) {
      const food = bloomRate(a, def) * dt;
      if (food > 0) gainNutrition(game, a, undefined, food);
      if (food > 0 && game.rng() < dt * 2) game.events.push({ kind: 'eat', pos: { ...a.pos }, actor: a.id, strength: .1, player: a.player });
      break;
    }
    const rate = grazeRate(a, def);
    if (rate > 0 && a.pos.y < sampleHeight(a.pos.x, a.pos.z) + clearanceOf(a) + .8) {
      const m = microbialAt(a.pos.x, a.pos.z);
      if (m > .2) gainNutrition(game, a, undefined, dt * rate * m);
    }
    feedOnBones(game, a, L, dt);
  }

  // Aim range: the crosshair fills when whatever RT does for this creature would connect
  a.aimInRange = false;
  // Surface to surface, not centre to centre — the lesson the recorder already learned. A big
  // body's centre is half a length from its mouth and ground prey sits a drop below a swimmer,
  // so measuring middles put the one thing a player was aiming at out of range while the
  // crosshair sat on it.
  if (a.lockTarget >= 0) { const t = game.idMap.get(a.lockTarget); if (t && isAlive(t)) a.aimInRange = bodyGap(t, a) < game.heavyMove(a).reach; }
  // Lock target validity. An unaimed lock is dropped once whatever it is on has got well away —
  // except while the animal is crossing open water to take hold of it. That swim is the whole
  // move, and the distance it covers is the point of it: dropping the lock on range mid-pursuit
  // wiped the target on the first frame and left the animal stopped where it started.
  if (a.lockTarget >= 0) {
    const t = game.idMap.get(a.lockTarget);
    const reaching = (a.state === 'pounce' && chaseTarget === a.lockTarget) || a.state === 'pounce' && a.graspHold && !!t
      && (bandOf(a, t) === 'threat' || bandOf(a, t) === 'giant');
    if (!t || !isAlive(t) || isHidden(t) || (!a.aiming && !reaching && dist(a.pos, t.pos) > 16 + L * 8)) a.lockTarget = -1;
  }
  // Hunted meter (for players)
  if (a.controller === 'player') updateHunted(game, a);

  if (bursting && !a.prev.burst && a.controller === 'player') game.events.push({ kind: 'burst', pos: { ...a.pos }, actor: a.id, player: a.player });
  a.prev = { light: input.light, heavy: input.heavy, ability: input.ability, dodge: input.dodge, guard: input.guard, lock: input.lock, sense: input.sense, rise: input.rise, burst: bursting, dash: input.dash, aim: input.aim };
  // onboarding flags
  if (a.controller === 'player') {
    if (mag > 0.2) game.flag(a, 'moved');
    if (bursting) game.flag(a, 'burst');
  }
}
