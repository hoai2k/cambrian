/**
 * What to give up when frames run long, and when to take it back — as pure decisions, so
 * `npm run governor` can drive it with a clock of its own. The engine applies them.
 *
 * Nothing is given up while frames are fine: a machine that keeps up keeps every pixel, the shadow
 * every frame and its antialiasing. Only a sustained run of long frames steps down, one rung at a
 * time and cheapest-to-see first, and a sustained run of short ones steps back up.
 *
 * High quality: 1. the shadow map is redrawn every other frame; 2. the drawing resolution drops to
 * 85 %, then 3. to 72 %. Antialiasing stays.
 *
 * Low quality has no shadow to spare, and its first rung is antialiasing: a browser cannot turn it
 * off on a live renderer, so it costs a new one, and it is therefore taken once and not given back
 * in that session — flapping it would be a hitch every few seconds. Then the resolution, as above.
 */

/** A frame longer than this is slow: under about fifty a second. */
export const SLOW_MS = 21;
/** A frame shorter than this is comfortably fast: over about seventy a second. */
export const FAST_MS = 14;
/** How long frames must stay slow before a rung is given up. */
export const STEP_DOWN_AFTER = 3;
/** How long they must stay fast before one is taken back (longer: a step up that is undone at once is worse than none). */
export const STEP_UP_AFTER = 8;
/** The drawing resolution at rungs 0..3, as a share of the quality's own pixel ratio. */
export const RESOLUTION = [1, 1, 0.85, 0.72] as const;
/** A frame longer than this is a hitch and is not counted (`governFrame`). */
export const HITCH_MS = 150;
/** The last rung. */
export const TOP = 3;

export interface GovernorState {
  /** 0 is everything on; see the rungs above. */
  level: number;
  /** Seconds the smoothed frame time has been past the slow or the fast line. */
  slowFor: number; fastFor: number;
  /** Smoothed frame time, milliseconds. */
  frameMs: number;
  /** Antialiasing has been given up this session and is not coming back (low quality only). */
  aaGone: boolean;
}

export const freshGovernor = (): GovernorState => ({ level: 0, slowFor: 0, fastFor: 0, frameMs: 1000 / 60, aaGone: false });

export interface GovernorPlan { shadowEvery: 1 | 2; resolution: number; antialias: boolean }

/**
 * Advance by one frame of `frameMs` real milliseconds. `active` is false whenever a long frame means
 * nothing — paused, a menu, the tab hidden, the title — and the counters simply wait.
 */
export function governFrame(s: GovernorState, frameMs: number, active: boolean, low: boolean): GovernorState {
  // A single frame this long is a hitch — a model decoding, a tab coming back — not a machine that
  // cannot keep up, and a run of them at the start of a match must not cost the whole match its
  // resolution. A machine that genuinely draws this slowly is past what any rung here would rescue.
  if (!active || frameMs > HITCH_MS) return s;
  const dt = frameMs / 1000;
  const ms = s.frameMs * 0.92 + frameMs * 0.08;
  let { level, slowFor, fastFor, aaGone } = s;
  slowFor = ms > SLOW_MS ? slowFor + dt : 0;
  fastFor = ms < FAST_MS ? fastFor + dt : 0;
  if (slowFor > STEP_DOWN_AFTER && level < TOP) {
    level++; slowFor = 0; fastFor = 0;
    if (low && level === 1) aaGone = true;
  } else if (fastFor > STEP_UP_AFTER && level > 0) {
    // One rung at a time. Climbing back past the first does not bring antialiasing back (`aaGone`).
    level--; slowFor = 0; fastFor = 0;
  }
  return { level, slowFor, fastFor, frameMs: ms, aaGone };
}

/** What a state asks the engine to do. */
export function planFor(s: GovernorState, low: boolean): GovernorPlan {
  return {
    shadowEvery: !low && s.level >= 1 ? 2 : 1,
    resolution: RESOLUTION[Math.min(s.level, TOP)],
    antialias: !s.aaGone,
  };
}
