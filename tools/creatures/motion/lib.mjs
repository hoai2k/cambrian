/** Envelope helpers shared by the performance files. All take a normalized clip time u in [0, 1]. */
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
/** Smooth 0→1 between a and b. */
export const ss = (a, b, u) => { const t = clamp01((u - a) / (b - a)); return t * t * (3 - 2 * t); };
/** Rise to 1 at the middle of [a, b] and fall back to 0. */
export const arc = (a, b, u) => { const t = clamp01((u - a) / (b - a)); const s = Math.sin(Math.PI * t); return s * s; };
/** Rise over [a, b], hold at 1, fall over [c, d]. */
export const hold = (a, b, c, d, u) => ss(a, b, u) * (1 - ss(c, d, u));
/** Lagged, finite-difference "velocity" of an envelope: what a trailing whip feels. */
export const lag = (env, u, delay, width = 0.06) => env(u - delay) - env(u - delay - width);
/** Damped ring-down after time a, killed smoothly before the clip ends. */
export const ring = (a, u, hz, decay, kill = 0.85) => (u <= a ? 0 : Math.sin(2 * Math.PI * hz * (u - a)) * Math.exp(-decay * (u - a)) * (1 - ss(kill, 1, u)));
export const UP = [0, 1, 0], DOWN = [0, -1, 0], FWD = [0, 0, 1], BACK = [0, 0, -1];
export const side = (s) => ({ in: [-s, 0, 0], out: [s, 0, 0] });
export const V = (a) => ({ x: a[0], y: a[1], z: a[2] });
