/**
 * Pulling the camera back to show what is hunting you.
 *
 * The hunt warning says something is coming and from which way, but the body itself is usually off
 * the edge of the picture — behind the camera, or beside it — so the warning was a thing to be read
 * rather than a thing to be seen. While a hunt is on (`HUNT_ON`), the camera's arm is lengthened
 * along the view it already has, just far enough that the hunter stands inside the frame with a
 * margin, and eased back in once the hunt lapses (`HUNT_OFF`) or the hunter is further off than a
 * reasonable zoom can reach (`THREAT_ZOOM_MAX`). Only the arm's length changes: the view is not
 * turned, because the hand steering the animal owns the direction, and a camera that swung itself
 * round to look at the danger would take the steering with it.
 *
 * Pure, with no Three.js, so `npm run threat-frame` holds it headless.
 */

/** The hunt score (`Actor.hunted`) at which the camera starts framing the hunter: the HUD's "hunting". */
export const HUNT_ON = 0.5;
/** ...and the one below which it lets go. Lower, so a score hovering at the line does not flicker. */
export const HUNT_OFF = 0.35;
/** The longest the arm is ever made, as a multiple of its ordinary length. */
export const THREAT_ZOOM_MAX = 3;
/** Once framing, the reach is allowed this much further before giving up, for the same reason. */
export const THREAT_ZOOM_HOLD = 3.5;
/** How much of the half-angle of the view the hunter may use: the rest is margin at the edge. */
export const THREAT_MARGIN = 0.8;
/** Easing rates (per second) out to the hunter and back in, the way back slower so it settles. */
export const THREAT_OUT = 1.6, THREAT_IN = 0.8;

export interface V3 { x: number; y: number; z: number }

/**
 * The multiple of the ordinary arm length that puts `hunter` (a sphere of `radius`) inside the view,
 * or 1 when no multiple up to `maxMul` does.
 *
 * The camera sits `dist` back from `look` along the view, which is set by `yaw` and `pitch` the way
 * the rig sets them (forward is `(sin yaw cos pitch, -sin pitch, cos yaw cos pitch)`); `vfov` is the
 * vertical field of view in radians and `aspect` the viewport's width over height.
 */
export function threatZoom(look: V3, yaw: number, pitch: number, dist: number, hunter: V3, radius: number,
  vfov: number, aspect: number, maxMul = THREAT_ZOOM_MAX): number {
  const f = { x: Math.sin(yaw) * Math.cos(pitch), y: -Math.sin(pitch), z: Math.cos(yaw) * Math.cos(pitch) };
  const r = { x: -Math.cos(yaw), y: 0, z: Math.sin(yaw) };
  // up = r × f
  const u = { x: r.y * f.z - r.z * f.y, y: r.z * f.x - r.x * f.z, z: r.x * f.y - r.y * f.x };
  const tv = Math.tan(vfov / 2) * THREAT_MARGIN, th = tv * aspect;
  for (let m = 1; m <= maxMul + 1e-9; m += 0.05) {
    const d = dist * m;
    const vx = hunter.x - (look.x - f.x * d), vy = hunter.y - (look.y - f.y * d), vz = hunter.z - (look.z - f.z * d);
    const z = vx * f.x + vy * f.y + vz * f.z;
    if (z <= radius) continue;
    const x = Math.abs(vx * r.x + vy * r.y + vz * r.z) + radius;
    const y = Math.abs(vx * u.x + vy * u.y + vz * u.z) + radius;
    if (x / z <= th && y / z <= tv) return m;
  }
  return 1;
}

/** Whether a hunt is being framed this frame, given whether it was last frame. */
export function framingHunt(was: boolean, hunted: number): boolean {
  return was ? hunted >= HUNT_OFF : hunted >= HUNT_ON;
}
