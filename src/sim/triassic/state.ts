import type { Game } from '../game';
import type { Actor } from '../types';

/**
 * Per-actor Triassic state, kept beside the shared Actor. Growth (stage and standing) reuses the
 * Devonian's side table (src/sim/devonian/state.ts): the five geometric stages are the same ladder
 * under the same names, and nothing about them is Devonian. What is kept here is the era's own:
 * air, the pod, the mother, the specials' timers.
 */
export interface TriActor {
  /** Air-breathers: whether the last step found this body at the surface, breathing. */
  atSurface: boolean;
  /** Seconds since the last winded heartbeat under water, reset by a breath. */
  windT: number;
  /** Seconds this body has been held under by something that will not let it up. */
  heldT: number;
  /** Seconds of pod shield left (Shonisaurus' call). */
  podShield: number;
  /** Pod-mates' actor ids (Shonisaurus). */
  pod: number[];
  /** The mother that stays beside a live-born calf for its first minute, and how long is left. */
  mother: number; calfT: number;
  /** Seconds of power-stroke shove left (Rhaeticosaurus). */
  strokeT: number;
  /** 0..1 while a shore animal is winding up on this player; for the HUD. */
  shoreWarn: number;
  /** Seconds the whorl has been sawing the current catch (Helicoprion). */
  sawT: number;
}

export interface TriGame {
  actors: Map<number, TriActor>;
  tick: number;
}

const games = new WeakMap<Game, TriGame>();
export function triState(g: Game): TriGame {
  let s = games.get(g);
  if (!s) { s = { actors: new Map(), tick: 0 }; games.set(g, s); }
  return s;
}
export function triActor(g: Game, a: Actor): TriActor {
  const s = triState(g);
  let t = s.actors.get(a.id);
  if (!t) {
    t = { atSurface: false, windT: 0, heldT: 0, podShield: 0, pod: [], mother: -1, calfT: 0, strokeT: 0, shoreWarn: 0, sawT: 0 };
    s.actors.set(a.id, t);
  }
  return t;
}
