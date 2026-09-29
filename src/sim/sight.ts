import type { Actor } from './types';
import { isAlive, lengthOf } from './actors';
import { magnificationDistance, NEAR_MIN, nearAlwaysFor, SHOWN_SLACK, SIZE_FLOOR, ZOOM_MAX } from '../shared/view-reach';

/**
 * Past this, no camera could be drawing a body — so work that exists only to be seen can be spared.
 *
 * The renderer draws a body inside the near field of a camera, or while it is bigger than the size
 * floor on screen (`drawable` in src/render/view-pick.ts, the same constants). Every seat has a
 * camera of its own — two to four of them in local multiplayer — and each sits at most its arm times
 * `ZOOM_MAX` from the player it follows, so a body further than the larger of those reaches plus
 * that arm from *every* seat is off every screen whatever the cameras are doing. It is measured from
 * the players rather than the cameras because the simulation has to reach the same answer on every
 * replay, and the players are all it knows.
 */

/** One seat's camera, as the simulation can know it: the body it follows and how far back it sits. */
export interface Eye { x: number; y: number; z: number; arm: number }

/**
 * Where every seat's camera can be this step. The arm is not always the player's own: a swallowed
 * player's camera frames the predator from the predator's distance, and a rider's eases out to the
 * host's (src/render/camera.ts) and back in over a second or so after letting go. So the arm takes
 * the largest body the camera may be framing and falls back from it no faster than the camera does.
 */
export function updateEyes(players: readonly Actor[], byId: (id: number) => Actor | undefined, dt: number, eyes: Eye[]): Eye[] {
  eyes.length = players.length;
  players.forEach((p, i) => {
    let L = lengthOf(p);
    const pred = p.swallowedBy >= 0 ? byId(p.swallowedBy) : undefined;
    if (pred) L = Math.max(L, lengthOf(pred));
    const host = p.rideHost >= 0 ? byId(p.rideHost) : undefined;
    if (host && isAlive(host)) L = Math.max(L, lengthOf(host));
    const want = magnificationDistance(L);
    const prev = eyes[i]?.arm ?? want;
    const arm = Math.max(want, prev + (want - prev) * (1 - Math.exp(-ARM_EASE * dt)));
    eyes[i] = { x: p.pos.x, y: p.pos.y, z: p.pos.z, arm };
  });
  return eyes;
}

/** Whether any seat's camera could be drawing `a` (see above). No seats, no saving: everything is seen. */
export function withinSight(players: readonly Actor[], eyes: readonly Eye[], a: Actor): boolean {
  if (!players.length) return true;
  let near = NEAR_MIN;
  for (const p of players) near = Math.max(near, nearAlwaysFor(lengthOf(p)));
  const reach = Math.max(near, lengthOf(a) / (SIZE_FLOOR * SHOWN_SLACK));
  for (const e of eyes) {
    const r = reach + e.arm * ZOOM_MAX + SIGHT_MARGIN;
    const dx = a.pos.x - e.x, dy = a.pos.y - e.y, dz = a.pos.z - e.z;
    if (dx * dx + dy * dy + dz * dz < r * r) return true;
  }
  return false;
}

/** How fast the camera eases off a host it has let go of (`rideBlend` in src/render/camera.ts). */
const ARM_EASE = 3.5;
/** Slack for a fish that swims into sight between one step's answer and the next frame. */
const SIGHT_MARGIN = 6;
