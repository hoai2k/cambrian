/**
 * The match recorder, armed by `?debug=game`.
 *
 * A bug report about an action that "does not work" is a description of a frame nobody can see.
 * This records the frames instead: what the player pressed, where their body was, what was near it,
 * and — the part that matters — the simulation's own account of why the thing they were trying to
 * do did or did not happen, taken from inside the code that decides rather than reconstructed
 * beside it (`Game.graspReason`).
 *
 * It is off unless the parameter is present, it never touches simulation state, and nothing else in
 * the game knows it exists. The pause menu grows one button; everything else is unchanged.
 *
 * Sampling is every other step — thirty a second, which is finer than any input a hand makes — and
 * the buffer is capped so a recording left running cannot eat the tab. What comes out is JSON, and
 * it is meant to be read by someone debugging, so the numbers are rounded to something a person can
 * scan and the reasons are sentences.
 */
import { bandOf, bodyGap, isInvulnerable, lengthOf } from '../sim/actors';
import { creature } from '../sim/creatures';
import type { Game } from '../sim/game';
import type { Actor, InputFrame, WorldEvent } from '../sim/types';

/** Every other step: thirty samples a second. */
const EVERY = 2;
/** About five minutes at that rate. A recording that hits this stops itself and says so. */
const MAX_SAMPLES = 9000;
/** How many bodies around the player to write down each sample, nearest first. */
const NEIGHBOURS = 4;
/** How far out to look for them, in the player's own body lengths. */
const NEIGHBOUR_RANGE = 6;

const r2 = (n: number) => Math.round(n * 100) / 100;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** One body near the player, as it looked to the player's own reckoning. */
interface Near {
  id: number; what: string; controller: string; state: string;
  /** How the player's body reads this one: snack, prey, rival, threat, giant. */
  band: string;
  len: number;
  /** Centre to centre, and surface to surface — the second is what every reach test uses. */
  dist: number; gap: number;
  /** How far off dead ahead it is, in degrees, measured in the yaw plane as the grip measures it. */
  offAim: number;
  /** Things that take a body out of the running for a grip before anything else is considered. */
  invulnerable?: boolean; held?: boolean; ridden?: boolean;
}

interface Sample {
  t: number; step: number;
  /** What the pad or keyboard reported this step; only the parts that are not at rest. */
  input: Record<string, number | boolean>;
  pos: [number, number, number]; vel: [number, number, number];
  yaw: number; pitch: number;
  state: string; stateT: number;
  scale: number; len: number; tier: number;
  hp: number; stamina: number; exhausted: number;
  /** The grip: armed, how long for, whether it is spent, and what it has hold of. */
  graspHold: boolean; graspT: number; graspSpent: boolean;
  grabbing: number; grabbedBy: number; rideHost: number; riddenBy: number; rideT: number;
  /** Aiming and the lunge, which is the other half of how a grip is reached. */
  aiming: boolean; aimTarget: number; aimInRange: boolean; lockTarget: number;
  pounceCd: number; dashCd: number; hitStop: number; iframes: number;
  grounded: boolean;
  /** The simulation's own account of the grip this frame. */
  why: string;
  near: Near[];
}

interface Recording {
  version: number;
  startedAt: string;
  era: string;
  build: { href: string; userAgent: string };
  /** Set when the cap stopped it early, so a short recording is never mistaken for a short attempt. */
  truncated?: boolean;
  seconds: number;
  samples: Sample[];
  /** Everything the match announced while recording, for the player's own body. */
  events: { t: number; kind: string; other?: number; strength?: number }[];
}

type Phase = 'idle' | 'recording' | 'ready';

let phase: Phase = 'idle';
let samples: Sample[] = [];
let events: Recording['events'] = [];
let startTime = 0;
let startedAt = '';
let steps = 0;
let truncated = false;
let finished: Recording | undefined;
let lastWhy = '';
/** Events this recording has already written down. Weak, so nothing is kept alive by it. */
let seen = new WeakSet<WorldEvent>();

export const recordingPhase = (): Phase => phase;

export function startRecording() {
  phase = 'recording';
  samples = []; events = []; steps = 0; truncated = false; finished = undefined; lastWhy = ''; seen = new WeakSet();
  startTime = -1;                       // set from the first sample's own clock
  startedAt = new Date().toISOString();
}

export function stopRecording() {
  if (phase !== 'recording') return;
  phase = 'ready';
  finished = {
    version: 1,
    startedAt,
    era: typeof location === 'undefined' ? '' : location.pathname,
    build: {
      href: typeof location === 'undefined' ? '' : location.href,
      userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent,
    },
    ...(truncated ? { truncated: true } : {}),
    seconds: r2(samples.length ? samples[samples.length - 1].t : 0),
    samples,
    events,
  };
}

/** Throw the recording away and go back to armed-but-idle. */
export function resetRecording() { phase = 'idle'; samples = []; events = []; finished = undefined; }

/**
 * Hand the recording to the player's machine as a file. A download is the whole point of the
 * feature — the data has to get out of the browser and into a conversation — so this is a plain
 * anchor with a blob behind it rather than anything cleverer.
 */
export function exportRecording(): boolean {
  if (!finished || typeof document === 'undefined') return false;
  const json = JSON.stringify(finished);
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `cambrian-debug-${startedAt.replace(/[:.]/g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}

/** The parts of an input frame that are not at rest, so a sample is readable rather than complete. */
function pressed(f: InputFrame): Record<string, number | boolean> {
  const out: Record<string, number | boolean> = {};
  if (Math.abs(f.mx) > 0.01) out.mx = r2(f.mx);
  if (Math.abs(f.my) > 0.01) out.my = r2(f.my);
  if (f.burst > 0.01) out.burst = r2(f.burst);
  for (const k of ['rise', 'sink', 'light', 'heavy', 'ability', 'dodge', 'guard', 'lock', 'sense', 'dash', 'aim'] as const) {
    if (f[k]) out[k] = true;
  }
  if (f.aimTarget >= 0) out.aimTarget = f.aimTarget;
  out.camYaw = r2(f.camYaw); out.camPitch = r2(f.camPitch);
  return out;
}

function near(g: Game, a: Actor): Near[] {
  const L = lengthOf(a), h = { x: Math.sin(a.yaw), z: Math.cos(a.yaw) };
  const list: Near[] = [];
  for (const o of g.nearby(a.pos, L * NEIGHBOUR_RANGE)) {
    if (o.id === a.id) continue;
    const dx = o.pos.x - a.pos.x, dy = o.pos.y - a.pos.y, dz = o.pos.z - a.pos.z;
    const flat = Math.hypot(dx, dz);
    const cos = flat > 1e-6 ? (dx * h.x + dz * h.z) / flat : 1;
    list.push({
      id: o.id,
      what: creature(o.creature).name,
      controller: o.controller,
      state: o.state,
      band: bandOf(a, o),
      len: r2(lengthOf(o)),
      dist: r2(Math.hypot(dx, dy, dz)),
      gap: r2(bodyGap(o, a)),
      offAim: Math.round((Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI),
      ...(isInvulnerable(o) ? { invulnerable: true } : {}),
      ...(o.state === 'grabbed' || o.state === 'swallowed' ? { held: true } : {}),
      ...(o.riddenBy >= 0 || o.rideHost >= 0 ? { ridden: true } : {}),
    });
  }
  return list.sort((p, q) => p.gap - q.gap).slice(0, NEIGHBOURS);
}

/**
 * Called once per simulation step while a recording is running. `a` is the body this machine's
 * first player is driving; `input` is what it was given this step.
 */
export function recordStep(g: Game, a: Actor, input: InputFrame, evs: readonly WorldEvent[]) {
  if (phase !== 'recording') return;
  if (startTime < 0) startTime = g.time;
  const t = r2(g.time - startTime);
  // The engine clears the event list once a *frame*, not once a step, so on a frame that ran two or
  // three sub-steps the list still holds what the earlier ones put there — and a recorder counting
  // positions would write the same grab down three times. Each event is a fresh object, so
  // remembering the ones already taken is exact whatever cadence anything else clears the list at.
  for (const e of evs) {
    if (seen.has(e)) continue;
    seen.add(e);
    if (e.actor !== a.id && e.other !== a.id) continue;
    events.push({ t, kind: e.kind, ...(e.other !== undefined ? { other: e.other } : {}), ...(e.strength !== undefined ? { strength: r2(e.strength) } : {}) });
  }
  // Every other step, *and* every step on which the grip's account of itself changed: a decision
  // that lasts one frame is exactly the decision worth having, and a fixed stride can step over it.
  const why = g.graspReason(a.id);
  const changed = why !== lastWhy;
  lastWhy = why;
  if (steps++ % EVERY && !changed) return;
  if (samples.length >= MAX_SAMPLES) { truncated = true; stopRecording(); return; }
  samples.push({
    t, step: steps,
    input: pressed(input),
    pos: [r2(a.pos.x), r2(a.pos.y), r2(a.pos.z)],
    vel: [r2(a.vel.x), r2(a.vel.y), r2(a.vel.z)],
    yaw: r3(a.yaw), pitch: r3(a.pitch),
    state: a.state, stateT: r2(a.stateT),
    scale: r2(a.scale), len: r2(lengthOf(a)), tier: a.tier,
    hp: Math.round(a.hp), stamina: Math.round(a.stamina), exhausted: r2(a.exhausted),
    graspHold: a.graspHold, graspT: r2(a.graspT), graspSpent: a.graspSpent,
    grabbing: a.grabbing, grabbedBy: a.grabbedBy, rideHost: a.rideHost, riddenBy: a.riddenBy, rideT: r2(a.rideT),
    aiming: a.aiming, aimTarget: input.aimTarget, aimInRange: a.aimInRange, lockTarget: a.lockTarget,
    pounceCd: r2(a.pounceCd), dashCd: r2(a.dashCd), hitStop: r2(a.hitStop), iframes: r2(a.iframes),
    grounded: a.grounded,
    why,
    near: near(g, a),
  });
}
