/**
 * The follow camera: where each seat's view sits and what it looks at, and the pure maths under it.
 *
 * Everything here reads the simulation and writes only the camera's own state (`CamState`), so the
 * shaping functions can be tested headless (`npm run swim`, `tools/immersive-test.ts`) without a
 * renderer, and `updateCamera` is handed the one thing it cannot work out for itself — where the
 * renderer is drawing a body this frame (`renderPos`, interpolated across the step).
 */
import * as THREE from 'three';
import { splitAxis } from '../shared/small-screen';
import { clamp, damp, wrapAngle } from '../shared/math';
import type { ViewportRect } from '../shared/hud-types';
import { isAlive, lengthOf } from '../sim/actors';
import { creature } from '../sim/creatures';
import { CORPSE_WINDOW, DEATH_FADE, type Game } from '../sim/game';
import { TIER_NEED, type Actor } from '../sim/types';
import { coverAt, sampleHeight, SURFACE_Y } from '../sim/world';
import type { TeleMenu } from './player-input';

/** Follow-camera distance for a body length: about two body lengths back plus a floor so larvae are still readable. */
import { magnificationDistance } from '../shared/view-reach';
export { magnificationDistance };

/**
 * How much of the camera's pitch the stick's forward should follow.
 *
 * A follow camera normally sits a little above the creature looking slightly down, and taking
 * that pitch literally means "forward" is partly "down" — hold forward from a resting view and
 * you swim into the seabed. Nothing is lost by ignoring it, because rising and sinking are their
 * own buttons: within FLAT_PITCH of level, forward is parallel to the seafloor. Past that the
 * camera is being aimed deliberately up or down, so its pitch eases in and takes over completely
 * by FULL_PITCH.
 */
/**
 * How far the camera may be aimed. Up is what matters for a swimmer: the water above you is where
 * the thing that eats you comes from, so the view has to reach it. Down goes almost overhead, which
 * is how you read the floor for prey while swimming over it.
 */
/**
 * How close to the sand the camera may sit, and the shortest arm it will pull in to, in body
 * lengths — short enough to clear the floor at a steep angle, long enough to stay outside the
 * animal rather than inside its own ribs.
 */
const CAMERA_SAND = 0.45, CAMERA_CLOSE = 0.9;
/** Keep the closer seafloor framing until the player has been clear of the bottom for ten seconds. */
export const FLOOR_CLOSE_HOLD = 10;
export const seafloorCloseHold = (hold: number, floorGap: number, length: number, dt: number): number =>
  floorGap < Math.max(2, length * 1.5) ? FLOOR_CLOSE_HOLD : Math.max(0, hold - dt);

/** Cap an upward shot so the creature's upper body remains inside the bottom of the view. */
export function keepCreatureInFrame(cameraY: number, lookY: number, lookRange: number, creatureY: number, creatureRange: number, fov: number): number {
  const creatureAngle = Math.atan2(creatureY - cameraY, Math.max(0.01, creatureRange));
  const highestLookAngle = creatureAngle + fov * Math.PI / 360 * 0.88;
  const lookAngle = Math.atan2(lookY - cameraY, Math.max(0.01, lookRange));
  return lookAngle > highestLookAngle ? cameraY + Math.tan(highestLookAngle) * lookRange : lookY;
}

/**
 * Fit the camera onto its arm with the seabed in the way.
 *
 * Aiming up from the floor asks for a camera below the creature, which is under the sand. Two
 * answers, in order: shorten the arm, which clears the floor at the same angle and only brings the
 * creature closer; and, when even the shortest arm is still buried, lift the whole rig. `lift` is
 * how far it had to go, and the caller moves the look point by the same amount, so the view keeps
 * the angle the player gave it instead of being levelled off into the seabed.
 *
 * `sandAt` returns the height the camera may not go below for an arm of that length (it moves the
 * camera as a side effect in the renderer, which is why the fit is written against a callback).
 */
export function fitCameraArm(baseY: number, pitch: number, dist: number, minDist: number, sandAt: (d: number) => number, ceiling: number): { dist: number; y: number; lift: number } {
  const rise = -Math.sin(pitch);
  let d = dist, y = baseY + Math.sin(pitch) * d;
  if (rise > 0.05) for (let i = 0; i < 4; i++) {
    const floor = sandAt(d);
    if (y >= floor) break;
    d = Math.max(minDist, d - (floor - y) / rise);
    y = baseY + Math.sin(pitch) * d;
  }
  const clamped = clamp(y, sandAt(d), ceiling);
  return { dist: d, y: clamped, lift: clamped - y };
}
/**
 * How long the camera rides above the waterline after a blow. Long enough to see the spray land —
 * the droplets live about a second — and short enough that it reads as part of the breath rather
 * than the camera having changed its mind about where it lives.
 */
export const BREATH_PEEK = 1.1;
/**
 * Aim mode's framing: how far in the camera comes, and how far the specimen is pushed aside.
 *
 * The shoulder shift is what makes room for the crosshair at screen centre, and it is measured in
 * *body lengths*, which is right — but the room it needs is measured across the **viewport**, and
 * a split screen has half of one. Two players side by side gave a view about as tall as it is wide,
 * and three quarters of a body length shoved the animal off the edge of it. `aimRoom` scales the
 * shift by how wide the view actually is, so one player gets the framing it was drawn for and a
 * narrow view keeps the animal on screen; the camera also comes in a little further than it did,
 * which is what was asked for and helps at every width.
 */
const AIM_CLOSER = 0.42, AIM_SHOULDER = 0.75;
/**
 * The follow camera, for mouse play: how fast it comes round behind the body, and how long it
 * stands aside after the player has moved it themselves.
 *
 * A pad has a second stick and the view is the player's the whole time. A mouse with no pointer
 * lock has nothing holding the camera, so it has to hold itself: it eases round behind the
 * creature and back to the resting pitch, which is what a follow camera is for. The hold is what
 * makes looking somewhere on purpose stick — without it, letting go of a drag would swing the view
 * straight back and the drag would have been pointless.
 */
export const FOLLOW_RATE = 1.6, FOLLOW_HOLD = 1.2;
/**
 * The cursor's *height* nudges the camera's pitch, in mouse play.
 *
 * A mouse has one hand and two jobs — point at an animal, and look where you are going — and with
 * the pointer free the second one only happened on a drag. So the top and bottom of the screen
 * steer: carry the cursor up and the view tilts up with it, carry it down and it tilts down, and
 * the middle `EDGE_DEAD` of the screen does nothing at all, which is the band a player aims in.
 * That is the whole trade — the dead zone is what keeps pointing and looking from being the same
 * gesture — so it is generous, and the push ramps in from its edge rather than starting at full
 * rate, so there is no line the view jumps at.
 *
 * It is a *rate*, not a position: holding the cursor near the top keeps tilting, the way an
 * edge-scroll does, because a screen's top edge is not a camera angle and cannot be mapped to one.
 */
const EDGE_DEAD = 0.38, EDGE_RATE = 0.85;
/** Radians per second of pitch the cursor at `ndcY` is asking for. Positive tilts the view down. */
export function edgePitch(ndcY: number): number {
  const over = Math.abs(ndcY) - EDGE_DEAD;
  if (over <= 0) return 0;
  const k = Math.min(1, over / (1 - EDGE_DEAD));
  // Squared, so the first part of the push past the dead zone is gentle and the corner is quick.
  return -Math.sign(ndcY) * k * k * EDGE_RATE;
}
/** 1 at a full-width view, falling off for a narrow one; never less than a third of the shift. */
const aimRoom = (aspect: number) => clamp(aspect / 1.6, 0.34, 1);
export const PITCH_UP = -0.95;   // ~54° above the horizon
export const PITCH_DOWN = 1.32;  // ~76° below it, near enough straight down at the seabed
/**
 * How much of the camera's tilt the body swims along.
 *
 * The camera is not a joystick. A follow camera at rest already sits 11-25° below the horizon, so
 * reading its pitch straight off would have every body drifting at the seabed whenever the player
 * did nothing but hold forward. That is what the flat slice around level is for.
 *
 * It only ever needed to be on the *downward* side, though: nobody's camera rests above the
 * horizon, so looking up is always deliberate. Ignoring 26° of it in both directions and then
 * squashing what was left through a smoothstep that clamped at 40° meant aiming up at something
 * and swimming went almost nowhere — 26° of camera bought 0°, 34° bought 6° — and the top of the
 * camera's own travel could not be reached at any tilt. Past its own slice each side is linear
 * onto the camera's real angle now, so the end of the camera's travel is the angle you are looking
 * along, and pointing at prey and swimming goes at it.
 */
const FLAT_DOWN = 0.45;   // ~26°, comfortably below a resting follow camera (which sits at ~11-25°)
const FLAT_UP = 0.10;     // ~6°: nothing rests above the horizon, so only the noise comes out

export function swimPitch(pitch: number): number {
  const up = pitch < 0;
  const flat = up ? FLAT_UP : FLAT_DOWN;
  const mag = Math.abs(pitch);
  if (mag <= flat) return 0;
  const limit = up ? -PITCH_UP : PITCH_DOWN;
  // Past the end of the ordinary travel — which only a camera that loops can reach, a finger's — the
  // body swims the angle it is looking along, up to straight up or down: looking over the top of
  // your own animal and holding swim goes over the top.
  if (mag >= limit) return Math.sign(pitch) * Math.min(mag, Math.PI / 2);
  return Math.sign(pitch) * limit * ((mag - flat) / (limit - flat));
}

/**
 * The camera can loop, and a loop is carried in the pitch alone.
 *
 * A finger's vertical swipe used to stop at `PITCH_UP`, so looking up ran into a wall at 54°; now it
 * wraps, and pitch runs all the way round (-π..π). Past ±π/2 the camera has gone over the top — or
 * under the bottom — and is **upside down**, which is exactly what the view should be doing half way
 * round a loop. Only touch loops: a mouse and a pad keep their clamp, because neither has a gesture
 * that means "keep going round".
 */
export const inverted = (pitch: number) => Math.cos(pitch) < 0;
/**
 * How long a looped camera is left upside down with nobody turning it before it rights itself, and
 * how fast the righting turns. It is a roll about the view axis — the direction you are looking stays
 * exactly where it was and the picture turns the right way up round it — so a player who meant to be
 * upside down has a second and a bit to carry on swiping, and one who did not is set right.
 */
export const RIGHT_AFTER = 1.2;
export const RIGHT_RATE = 3.2;
/**
 * The same view direction as `(yaw, pitch)`, described from the right way up: turned half round and
 * pitched back across the pole, with the half-turn of roll that makes the picture identical at the
 * moment of the swap. Easing that roll to nothing is the righting.
 */
export function rightSideUp(yaw: number, pitch: number): { yaw: number; pitch: number; roll: number } {
  return { yaw: wrapAngle(yaw + Math.PI), pitch: pitch > 0 ? Math.PI - pitch : -Math.PI - pitch, roll: Math.PI };
}
/**
 * Which way is up for a camera at `yaw`, `pitch` with `roll` about its view axis. Continuous through
 * both poles, which `lookAt` with a fixed world up is not: at straight up or straight down it has no
 * answer, and past them it flips the picture over on a single frame.
 */
export function cameraUp(yaw: number, pitch: number, roll: number, out: THREE.Vector3): THREE.Vector3 {
  const sy = Math.sin(yaw), cy = Math.cos(yaw), sp = Math.sin(pitch), cp = Math.cos(pitch);
  // Forward is (sy·cp, -sp, cy·cp); this is the one perpendicular to it that is world up at level.
  const ux = sy * sp, uy = cp, uz = cy * sp;
  if (!roll) return out.set(ux, uy, uz);
  const fx = sy * cp, fy = -sp, fz = cy * cp;
  // Rodrigues about the forward axis, with up already perpendicular to it.
  const c = Math.cos(roll), s = Math.sin(roll);
  const cx = fy * uz - fz * uy, cyy = fz * ux - fx * uz, cz = fx * uy - fy * ux;
  return out.set(ux * c + cx * s, uy * c + cyy * s, uz * c + cz * s);
}

/**
 * How long a climbing aim outlives the dash it fired, past the dash's own cooldown.
 *
 * Reaction time and nothing more: the hold below already lasts as long as the simulation's
 * cooldown does, so this is only the gap between the button coming back and a player noticing
 * that it has.
 */
export const DASH_AIM_GRACE = 0.25;

/**
 * A dash aimed up holds its aim until the next dash is ready.
 *
 * The pad's pitch drifts back to level whenever the stick is let go, which is what makes it feel
 * like it is swimming for you — and it is also what made a *series* of upward dashes unusable. A
 * dash lasts 0.42 s and its cooldown 0.55 s, and the drift ran through both, so by the time the
 * button came back the aim had flattened and the second dash went along the surface rather than
 * through it. Climbing out of the water is what a chain of dashes is for, so the aim has to
 * outlast the wait: while a dash fired above the horizon is still on cooldown the drift is
 * suspended, and for `DASH_AIM_GRACE` past that. Only the drift is held — the stick is untouched,
 * so a player who wants to level off still does it the moment they ask.
 *
 * Upward only. Aiming down and drifting back to level is the drift doing its job: the flat slice
 * on the downward side (`FLAT_DOWN`) is there precisely so a resting view is not a dive into the
 * seabed, and a held dive would be the camera swimming a body into the sand.
 *
 * `dashCd` is the simulation's own countdown, so this follows whatever that cooldown is (a tail
 * flip's is longer) rather than naming a number `src/sim` owns.
 */
export function climbAimHold(hold: number, pitch: number, dashCd: number, dt: number): number {
  const armed = dashCd > 0 && pitch < -FLAT_UP ? dashCd + DASH_AIM_GRACE : 0;
  return Math.max(0, Math.max(hold, armed) - dt);
}

/**
 * Where each seat's view goes.
 *
 * Two players are halved across the **longer** axis rather than always left and right
 * (`splitAxis`): on a tablet held upright, two windows 400 across and 1100 down are two slots and
 * not two views, and every HUD panel in them hangs off a corner that is now a long way from the
 * middle. Four are a grid either way, and one takes the window, so two is the only case with a
 * choice to make. The HUD follows these rects by percentage, so it needs no telling.
 */
export function layoutRects(n: number, w: number, h: number): ViewportRect[] {
  if (n <= 1) return [{ x: 0, y: 0, w, h }];
  if (n === 2) {
    return splitAxis(w, h) === 'down'
      ? [{ x: 0, y: 0, w, h: h / 2 }, { x: 0, y: h / 2, w, h: h / 2 }]
      : [{ x: 0, y: 0, w: w / 2, h }, { x: w / 2, y: 0, w: w / 2, h }];
  }
  return Array.from({ length: n }, (_, i) => ({ x: (i % 2) * w / 2, y: Math.floor(i / 2) * h / 2, w: w / 2, h: h / 2 }));
}

/** One seat's camera rig: where it is, where it looks, and every eased blend that frames it. */
export interface CamState { showBoard: boolean; hatchShot: number; breathT: number; rideBlend: number; yaw: number; pitch: number;
  /** A turn about the view axis, left over from righting a looped camera (`rightSideUp`); eases to nothing. */
  roll: number;
  /** Seconds since a finger last turned this camera, for the righting. */
  lookIdle: number; zoom: number; fade: number; aimBlend: number; aimTarget: number; aimSnapT: number; climbHold: number; followHold: number; floorCloseT: number; floorCloseBlend: number; pos: THREE.Vector3; look: THREE.Vector3; shake: number; camera: THREE.PerspectiveCamera; lockBlend: number; lastPos: THREE.Vector3; frustum: THREE.Frustum; projScreen: THREE.Matrix4; tele: TeleMenu; }

/** Scratch, so a frame's camera work allocates nothing. */
const tmpV = new THREE.Vector3(), tmpLook = new THREE.Vector3(), tmpRide = new THREE.Vector3(), tmpDesired = new THREE.Vector3();
const tmpPos = new THREE.Vector3(), tmpPred = new THREE.Vector3();

/**
 * Who a dead player's camera follows. Only in Survival, which has no revive to wait on (Rise
 * does, and Reef has nothing to race), and never when you are inside something — being eaten is its own shot. The leader is whoever
 * is furthest along, so the viewport shows the thing you are about to respawn behind.
 */
export function spectatorTarget(game: Game, i: number): Actor | undefined {
  const p = game.players[i];
  if (!p || p.state !== 'dead' || p.swallowedBy >= 0) return undefined;
  if (game.mode === 'rise' || game.mode === 'reef') return undefined;      // co-op: stay on your own body to be revived
  let best: Actor | undefined, score = -Infinity;
  for (const a of game.actors) {
    if (a === p || a.player < 0 || !isAlive(a)) continue;
    if (a.controller !== 'player') continue;
    const s = a.tier + a.nutrition / Math.max(1, TIER_NEED[a.tier]);
    if (s > score) { score = s; best = a; }
  }
  return best;
}

export function updateCamera(cs: CamState, p0: Actor, dt: number, game: Game, renderPos: (a: Actor, out: THREE.Vector3) => THREE.Vector3) {
  // While spectating, everything below frames the watched player instead. The dead player's own
  // camera state (yaw, zoom, shake) is reused, so the handover is a cut, not a new rig.
  const p = spectatorTarget(game, p0.player) ?? p0;
  const L = lengthOf(p);
  // Follow where the creature is drawn, not where the simulation last put it.
  const pp = renderPos(p, tmpPos);
  const def = creature(p.creature);
  const floorGap = pp.y - sampleHeight(pp.x, pp.z);
  cs.floorCloseT = seafloorCloseHold(cs.floorCloseT, floorGap, L, dt);
  cs.floorCloseBlend = damp(cs.floorCloseBlend, cs.floorCloseT > 0 ? 1 : 0, 2, dt);
  const target = p.lockTarget >= 0 ? game.byId(p.lockTarget) : undefined;
  const locked = !!target && isAlive(target) && !p.aiming;
  cs.lockBlend = damp(cs.lockBlend, locked ? 1 : 0, 5, dt);
  // Magnification: camera distance and framing scale with body length so the world re-reads at every tier.
  let dist = magnificationDistance(L) * cs.zoom * (1 - AIM_CLOSER * cs.aimBlend) * (1 - 0.22 * cs.floorCloseBlend);
  if (p.state === 'dead') dist *= 1.5;
  // In the egg the animal is a fraction of its hatched size and the camera would be pressed
  // against the shell. Frame the egg instead, and ease back in as the body comes out of it.
  if (p.hatching && p.state === 'moult' && p.stateDur > 1.5) dist *= 1 + 0.9 * (1 - Math.min(1, p.stateT / p.stateDur / 0.85));
  if (p.hunted > 0.5) dist *= 0.85;
  // Snap in behind the creature when it teleports (respawn), otherwise keep the player's framing.
  const jumped = cs.lastPos.distanceTo(pp) > 20;
  cs.lastPos.copy(pp);
  if (jumped) { cs.yaw = p.yaw; cs.fade = 1; }
  // The opening shot. A hatch is five seconds the player cannot act in, and it is the one thing
  // every match opens on — so the camera picks the side the shell can actually be seen from
  // rather than simply sitting behind the animal, which is as likely to be behind a log or a
  // Tanystropheus' flank as not. Chosen once, on the frame the egg appears, and then left alone:
  // a camera that kept re-deciding would swing about while the player watched.
  const inShell = p.hatching && p.state === 'moult' && p.stateDur > 1.5;
  if (inShell && cs.hatchShot !== p.id) {
    cs.hatchShot = p.id;
    let bestYaw = cs.yaw, bestSeen = -Infinity;
    for (let i = 0; i < 8; i++) {
      const yaw = (i / 8) * Math.PI * 2;
      // Where the arm would put the camera at this yaw, at the egg's own height.
      const cx = pp.x - Math.sin(yaw) * dist, cz = pp.z - Math.cos(yaw) * dist;
      const cy = Math.max(pp.y + L * 0.6, sampleHeight(cx, cz) + L * CAMERA_SAND);
      // Least covered camera spot wins: what hides a body there is what would stand in the way.
      const seen = -coverAt(game.world, { x: cx, y: cy, z: cz }, L, []);
      if (seen > bestSeen) { bestSeen = seen; bestYaw = yaw; }
    }
    cs.yaw = bestYaw;
  } else if (!inShell && cs.hatchShot === p.id) cs.hatchShot = -1;
  // Eaten: ride along with the predator, from the same angle, until the respawn — you are inside
  // it, so it is where you are. Killed any other way, the shot stays on your own body drifting
  // up: whatever landed the blow has moved on, and following it would be a camera nobody asked
  // for. The line of text still names it either way.
  const pred = p.state === 'swallowed' || (p.state === 'dead' && p.swallowedBy >= 0) ? game.byId(p.swallowedBy) : undefined;
  const lookAt = pred
    ? renderPos(pred, tmpLook).setY(tmpLook.y + lengthOf(pred) * 0.1)
    : tmpLook.set(pp.x, pp.y + L * 0.15, pp.z);
  if (pred) dist = magnificationDistance(lengthOf(pred)) * cs.zoom * 0.85;
  // Riding: the shot is the animal you are on, not the one you are.
  //
  // Framed on a hatchling clinging to a giant, the camera sits a body length or two off a very
  // small animal, and the giant is a wall filling the screen with no way to tell what you are
  // holding or where it is taking you. Framing the host puts both in shot at a distance that
  // suits the big one — and it takes the camera off the rider, which is the body carrying the
  // per-frame correction that seats the grip on moving geometry, so the shot stops inheriting
  // that animation's jitter. Eased in and out, because letting go should not be a cut.
  const host = p.rideHost >= 0 ? game.byId(p.rideHost) : undefined;
  const riding = !!host && isAlive(host) && host.riddenBy === p.id && !pred;
  cs.rideBlend = damp(cs.rideBlend, riding ? 1 : 0, 3.5, dt);
  if (host && cs.rideBlend > 0.001) {
    const hl = lengthOf(host);
    renderPos(host, tmpRide).y += hl * 0.15;
    lookAt.lerp(tmpRide, cs.rideBlend);
    dist += (magnificationDistance(hl) * cs.zoom - dist) * cs.rideBlend;
  }
  // Fade to black just before the respawn, and in again just after. Always the real player's
  // own death, never the spectated one's: this viewport's owner is the one coming back.
  // Fade to black over the last moment before the respawn, and in again slowly on the new body:
  // the watch is the point, so the black is a curtain at the end of it rather than a cut. Always
  // the real player's own death, never the spectated one's: this viewport's owner is coming back.
  const dying = p0.state === 'dead' || p0.state === 'swallowed';
  const respawnAt = game.reviveWindow(p0) ? Infinity : CORPSE_WINDOW - DEATH_FADE;   // a downed player waiting on an ally never fades out
  const fadeTarget = dying && (p0.state === 'dead' ? p0.respawnT : p0.stateT) > (p0.state === 'dead' ? respawnAt : 99) ? 1 : 0;
  cs.fade = damp(cs.fade, fadeTarget, fadeTarget > cs.fade ? 4 : 1.5, dt);
  if (locked && target) {
    const tp = renderPos(target, tmpPred);
    const dx = tp.x - pp.x, dz = tp.z - pp.z;
    const ty = Math.atan2(dx, dz);
    // Lock-on eases the camera behind the player relative to the target; the stick still works.
    cs.yaw = wrapAngle(cs.yaw + wrapAngle(ty - cs.yaw) * (1 - Math.exp(-2.5 * dt)));
    const d = Math.hypot(dx, dz, tp.y - pp.y);
    lookAt.lerp(tp, 0.42 * cs.lockBlend);
    dist += Math.min(d * 0.35, L * 3) * cs.lockBlend;
  }
  const yaw = cs.yaw;
  // Aim mode: over-the-shoulder. Shift both the camera and its look point sideways so the
  // specimen sits to the left and the crosshair (screen centre) is free to be steered onto prey.
  if (cs.aimBlend > 0.001) {
    const k = L * AIM_SHOULDER * aimRoom(cs.camera.aspect) * cs.aimBlend;  // right = (-cos yaw, 0, sin yaw)
    lookAt.x += -Math.cos(yaw) * k; lookAt.z += Math.sin(yaw) * k;
    lookAt.y += L * 0.1 * cs.aimBlend;
  }
  const pitch = cs.pitch + (locked ? 0.1 : 0) + (def.ground ? 0.12 : 0);
  const place = (d: number) => tmpDesired.set(
    lookAt.x - Math.sin(yaw) * Math.cos(pitch) * d,
    lookAt.y + Math.sin(pitch) * d + L * 0.18,
    lookAt.z - Math.cos(yaw) * Math.cos(pitch) * d,
  );
  const desired = place(dist);
  // The sand is the only thing the camera cannot be inside. A rock is not: shoving the camera
  // sideways out of a boulder, or lifting it onto one, throws the shot away for scenery, and a
  // camera *inside* a rock simply sees out of it — the far side of a closed mesh is not drawn —
  // so it passes through and keeps looking at the creature. Hence the sand itself here, and not
  // `groundHeight`, which counts boulder tops as floor.
  // The camera lives under the water: its ceiling is just below the waterline, and only a breach
  // lifts it. That is why a breath read as not having happened — the one moment the animal is at
  // the top, the view is still the water. So a blow lifts it too, briefly, on `breathT`: up over
  // the surface to see the spray and the animal's back in it, and back under. Eased both ways,
  // faster up than down, because a cut to the sky and back is a flinch rather than a breath.
  cs.breathT = Math.max(0, cs.breathT - dt);
  const peek = cs.breathT <= 0 ? 0 : Math.sin(Math.min(1, cs.breathT / BREATH_PEEK) * Math.PI) ** 0.6;
  // And the sand lifts it: a body wading up the beach takes the camera up out of the water with
  // it, by its wade, which is continuous in where it stands, so the view comes up as the animal
  // does rather than cutting to the sky when a rule says it is ashore.
  const ceiling = p.airborne ? SURFACE_Y + 40 : (SURFACE_Y - 0.4) + Math.max(peek * (L * 0.5 + 1.6), p.wade * (L * 0.8 + 6));
  const fit = fitCameraArm(lookAt.y + L * 0.18, pitch, dist, L * CAMERA_CLOSE,
    (d) => { place(d); return sampleHeight(desired.x, desired.z) + CAMERA_SAND; },
    ceiling);
  if (fit.dist < dist - 0.05 || fit.lift > 0.05) cs.floorCloseT = FLOOR_CLOSE_HOLD;
  place(fit.dist);
  desired.y = fit.y;
  // The rig had to be lifted off its arm, so the look point goes with it rather than the view
  // tipping flat: you see *past* your own creature into the water above, which is the whole point
  // of aiming up from the floor. Not while locked on — there the target is the shot.
  if (!locked) lookAt.y += clamp(fit.lift, -L * 1.5, L * 1.5);
  if (!locked && !pred && cs.pitch < -0.2 && cs.pitch > -Math.PI / 2) {
    const range = Math.hypot(lookAt.x - desired.x, lookAt.z - desired.z);
    const bodyRange = Math.hypot(pp.x - desired.x, pp.z - desired.z);
    lookAt.y = keepCreatureInFrame(desired.y, lookAt.y, range, pp.y + L * 0.3, bodyRange, cs.camera.fov);
  }
  const k = jumped ? 1 : p.state === 'dodge' ? 5 : 7;
  if (jumped) { cs.pos.copy(desired); cs.look.copy(lookAt); }
  else { cs.pos.lerp(desired, 1 - Math.exp(-k * dt)); cs.look.lerp(lookAt, 1 - Math.exp(-10 * dt)); }
  if (!locked && !pred && cs.pitch < -0.2 && cs.pitch > -Math.PI / 2) {
    const range = Math.hypot(cs.look.x - cs.pos.x, cs.look.z - cs.pos.z);
    const bodyRange = Math.hypot(pp.x - cs.pos.x, pp.z - cs.pos.z);
    cs.look.y = keepCreatureInFrame(cs.pos.y, cs.look.y, range, pp.y + L * 0.3, bodyRange, cs.camera.fov);
  }
  cs.shake = Math.max(0, cs.shake - dt * 2.2);
  const sh = cs.shake * cs.shake * 0.35;
  cs.camera.position.copy(cs.pos).add(tmpV.set((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh));
  // Up follows the camera round a loop and turns with the righting roll, instead of being the world's
  // up — which has no answer at the poles and flips the picture over past them.
  cameraUp(yaw, pitch, cs.roll, cs.camera.up);
  cs.camera.lookAt(cs.look);
  const baseFov = 64 - 9 * clamp(Math.log(L + 0.3) / Math.log(11), 0, 1);
  cs.camera.fov = damp(cs.camera.fov, baseFov + (p.burstT > 0 || (Math.hypot(p.vel.x, p.vel.z) > def.speed * Math.pow(p.scale, 0.45) * 1.25) ? 8 : 0) + p.hunted * 4, 4, dt);
  cs.camera.near = clamp(L * 0.06, 0.04, 0.5);
}
