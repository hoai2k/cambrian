export interface Vec3 { x: number; y: number; z: number; }

export const TAU = Math.PI * 2;
export const v3 = (x = 0, y = 0, z = 0): Vec3 => ({ x, y, z });
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
/** Exponential approach: moves `a` toward `b` with rate `k` over `dt`. */
export const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));
export const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
export const dist2 = (a: Vec3, b: Vec3) => {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
};
export const dist = (a: Vec3, b: Vec3) => Math.sqrt(dist2(a, b));
export const distXZ = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.z - b.z);
export const len3 = (v: Vec3) => Math.hypot(v.x, v.y, v.z);
export const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const scale = (a: Vec3, s: number): Vec3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
export const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
export const norm = (a: Vec3): Vec3 => {
  const l = len3(a);
  return l > 1e-6 ? { x: a.x / l, y: a.y / l, z: a.z / l } : { x: 0, y: 0, z: 1 };
};
/** Heading vector for a yaw angle (yaw 0 = +z, matches the shipped game). */
export const heading = (yaw: number): Vec3 => ({ x: Math.sin(yaw), y: 0, z: Math.cos(yaw) });
export const yawOf = (v: Vec3) => Math.atan2(v.x, v.z);

/** Deterministic LCG. */
export function makeRng(seed = 505) {
  let t = seed >>> 0;
  const r = () => ((t = (Math.imul(t, 1664525) + 1013904223) >>> 0) / 4294967296);
  return Object.assign(r, {
    range: (lo: number, hi: number) => lo + r() * (hi - lo),
    pick: <T>(arr: readonly T[]) => arr[Math.floor(r() * arr.length)],
    chance: (p: number) => r() < p,
  });
}
export type Rng = ReturnType<typeof makeRng>;

/** Cheap 2D value noise used by both the sim heightfield and the render shaders. */
export function hash2(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
export function noise2(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y);
  let fx = x - ix, fy = y - iy;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
}
export function fbm2(x: number, y: number) {
  return noise2(x, y) * 0.55 + noise2(x * 2.03, y * 2.03) * 0.27 + noise2(x * 4.1, y * 4.1) * 0.13 + noise2(x * 8.3, y * 8.3) * 0.05;
}
