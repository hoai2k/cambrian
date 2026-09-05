import { clamp, fbm2, makeRng, noise2, smoothstep, TAU, type Vec3 } from '../shared/math';
import { SpatialHash } from './spatial';

export type Biome = 'nursery' | 'shelf' | 'boulders' | 'forest' | 'channel' | 'flats';
export type FloraKind = 'vauxia' | 'sac' | 'choia' | 'thalli' | 'tuft';

export interface Boulder { pos: Vec3; radius: number; height: number; sx: number; sy: number; sz: number; rot: number; shade: number; }
export interface Flora { pos: Vec3; kind: FloraKind; scale: number; sy: number; rot: number; shade: number; }
export interface Cover { pos: Vec3; radius: number; maxLength: number; strength: number; temp?: boolean; t?: number; }
export interface Bloom { pos: Vec3; radius: number; drift: number; }

export const WORLD_RADIUS = 190;
export const SURFACE_Y = 40;
export const LIGHT_WINDOW_Y = SURFACE_Y - 9;

/** Channel runs along this direction through the origin. */
const CH = { x: Math.cos(0.62), z: Math.sin(0.62) };
export const channelDistance = (x: number, z: number) => Math.abs(-CH.z * x + CH.x * z);
export const alongChannel = (x: number, z: number) => CH.x * x + CH.z * z;

export const NURSERIES: Vec3[] = [
  { x: -38, y: 0, z: -72 }, { x: 84, y: 0, z: -18 }, { x: -96, y: 0, z: 22 }, { x: 22, y: 0, z: 96 },
];
const NURSERY_R = 24;

export function nurseryFactor(x: number, z: number) {
  let f = 0;
  for (const n of NURSERIES) f = Math.max(f, 1 - smoothstep(NURSERY_R * 0.6, NURSERY_R, Math.hypot(x - n.x, z - n.z)));
  return f;
}

export function biomeAt(x: number, z: number): Biome {
  if (nurseryFactor(x, z) > 0.35) return 'nursery';
  if (channelDistance(x, z) < 15) return 'channel';
  if (x > 45 && z > 30) return 'boulders';
  if (x < -40 && z > 40) return 'forest';
  if (x > 30 && z < -50) return 'flats';
  return 'shelf';
}

/** Seabed height. Roughly -1..3 on the shelf, -7 in the channel, walls at the rim. */
export function sampleHeight(x: number, z: number) {
  const r = Math.hypot(x, z);
  let h = -0.55
    + 0.9 * Math.sin(x * 0.045 + 0.7) * Math.cos(z * 0.039)
    + 0.45 * Math.sin(x * 0.093 + z * 0.037)
    + 0.18 * Math.sin(z * 0.2 + x * 0.107)
    + (fbm2(x * 0.02 + 7, z * 0.02 + 3) - 0.5) * 3.2;
  // channel carve
  const cd = channelDistance(x, z);
  h -= 6.5 * Math.exp(-((cd / 14) ** 2));
  // boulder field: rougher, higher
  if (x > 45 && z > 30) h += 1.6 * smoothstep(45, 70, x) * smoothstep(30, 55, z) * (0.6 + fbm2(x * 0.06, z * 0.06));
  // forest: gentle rise
  if (x < -40 && z > 40) h += 1.1 * smoothstep(-40, -70, x) * smoothstep(40, 70, z);
  // flats: very flat
  const flat = smoothstep(30, 55, x) * smoothstep(-50, -80, z);
  h = h * (1 - flat * 0.8) + flat * 0.2;
  // rim walls
  h += 26 * smoothstep(WORLD_RADIUS - 32, WORLD_RADIUS + 6, r);
  return h;
}

export function sampleCurrent(out: Vec3, x: number, y: number, z: number, t: number) {
  const cd = channelDistance(x, z);
  const channel = Math.exp(-((cd / 18) ** 2));
  const pulse = 0.8 + 0.2 * Math.sin(t * 0.065);
  const depthFade = clamp(1 - (y + 4) / (SURFACE_Y + 4), 0.15, 1);
  const dx = 0.14 + 0.16 * Math.sin(z * 0.03 + t * 0.085) + 0.08 * Math.cos(y * 0.3);
  const dz = 0.1 + 0.08 * Math.cos(x * 0.04 - t * 0.07);
  out.x = (dx + CH.x * channel * 2.4 * depthFade) * pulse;
  out.y = 0.035 * Math.sin(x * 0.14 + z * 0.08 + t * 0.12);
  out.z = (dz + CH.z * channel * 2.4 * depthFade) * pulse;
  return out;
}

export interface WorldData {
  boulders: Boulder[];
  flora: Flora[];
  cover: Cover[];
  blooms: Bloom[];
  boulderHash: SpatialHash<Boulder>;
  coverHash: SpatialHash<Cover>;
  seed: number;
}

export function generateWorld(seed = 5052026): WorldData {
  const rng = makeRng(seed);
  const boulders: Boulder[] = [];
  const flora: Flora[] = [];
  const cover: Cover[] = [];
  const blooms: Bloom[] = [];

  // Boulders
  const boulderCount = 520;
  for (let i = 0; i < boulderCount; i++) {
    let x: number, z: number, tries = 0;
    do {
      const a = rng() * TAU;
      const inField = i % 3 === 0;
      if (inField) { x = 60 + rng() * 110; z = 45 + rng() * 110; }
      else { const d = Math.sqrt(rng()) * (WORLD_RADIUS - 20); x = Math.cos(a) * d; z = Math.sin(a) * d; }
      tries++;
    } while ((channelDistance(x, z) < 12 || nurseryFactor(x, z) > 0.5 || Math.hypot(x, z) > WORLD_RADIUS - 12) && tries < 12);
    if (tries >= 12) continue;
    const big = rng() < 0.18;
    const sx = (big ? 2.4 : 0.8) + rng() * (big ? 4 : 2.4);
    const sy = sx * (0.3 + rng() * 0.5);
    const sz = sx * (0.65 + rng() * 0.4);
    const y = sampleHeight(x, z) + sy * 0.25;
    boulders.push({ pos: { x, y, z }, radius: Math.max(sx, sz) * 1.02, height: y + sy * 1.05, sx, sy, sz, rot: rng() * TAU, shade: 0.68 + rng() * 0.21 });
    if (big) cover.push({ pos: { x, y: y + sy * 0.4, z }, radius: Math.max(sx, sz) * 1.5, maxLength: sx * 0.9, strength: 0.45 });
  }

  // Flora by biome density
  const density: Record<Biome, Partial<Record<FloraKind, number>>> = {
    nursery: { vauxia: 30, sac: 22, choia: 14, thalli: 16, tuft: 40 },
    shelf: { vauxia: 2.2, sac: 2.5, choia: 3, thalli: 2, tuft: 5 },
    boulders: { vauxia: 3, sac: 2, choia: 4, thalli: 1, tuft: 3 },
    forest: { vauxia: 26, sac: 16, choia: 6, thalli: 18, tuft: 8 },
    channel: { vauxia: 0.2, sac: 0.3, choia: 0.5, thalli: 0, tuft: 1.5 },
    flats: { vauxia: 0.5, sac: 0.8, choia: 2, thalli: 0.4, tuft: 3 },
  };
  const kinds: FloraKind[] = ['vauxia', 'sac', 'choia', 'thalli', 'tuft'];
  const cellSize = 12;
  for (let cx = -WORLD_RADIUS; cx < WORLD_RADIUS; cx += cellSize)
    for (let cz = -WORLD_RADIUS; cz < WORLD_RADIUS; cz += cellSize) {
      const mx = cx + cellSize / 2, mz = cz + cellSize / 2;
      if (Math.hypot(mx, mz) > WORLD_RADIUS - 8) continue;
      const biome = biomeAt(mx, mz);
      for (const kind of kinds) {
        const expected = (density[biome][kind] ?? 0) * (cellSize * cellSize) / 144;
        let n = Math.floor(expected) + (rng() < expected - Math.floor(expected) ? 1 : 0);
        for (let i = 0; i < n; i++) {
          const x = cx + rng() * cellSize, z = cz + rng() * cellSize;
          if (Math.hypot(x, z) > WORLD_RADIUS - 8) continue;
          let blocked = false;
          for (const b of boulders) if (Math.hypot(x - b.pos.x, z - b.pos.z) < b.radius + 0.4) { blocked = true; break; }
          if (blocked) continue;
          const forest = biome === 'forest' ? 1.6 : 1;
          const s = (kind === 'vauxia' ? 0.6 + rng() * 1.6 : kind === 'tuft' ? 0.35 + rng() * 0.6 : 0.45 + rng() * 1.0) * forest;
          const y = sampleHeight(x, z) - 0.03;
          flora.push({ pos: { x, y, z }, kind, scale: s, sy: s * (0.85 + rng() * 0.4), rot: rng() * TAU, shade: 0.7 + rng() * 0.28 });
          if (kind === 'vauxia' || kind === 'sac' || kind === 'thalli')
            cover.push({ pos: { x, y: y + s * 0.6, z }, radius: s * 1.25, maxLength: s * 1.7, strength: 0.7 });
          else if (kind === 'tuft')
            cover.push({ pos: { x, y: y + s * 0.3, z }, radius: s * 0.9, maxLength: s * 1.4, strength: 0.8 });
        }
      }
    }

  // Plankton blooms up in the light window
  for (let i = 0; i < 9; i++) {
    const a = rng() * TAU, d = 20 + Math.sqrt(rng()) * (WORLD_RADIUS - 60);
    blooms.push({ pos: { x: Math.cos(a) * d, y: LIGHT_WINDOW_Y + 2 + rng() * 5, z: Math.sin(a) * d }, radius: 9 + rng() * 6, drift: rng() * TAU });
  }

  const boulderHash = new SpatialHash<Boulder>(12);
  boulderHash.rebuild(boulders);
  const coverHash = new SpatialHash<Cover>(8);
  coverHash.rebuild(cover);
  return { boulders, flora, cover, blooms, boulderHash, coverHash, seed };
}

/** Amount of cover (0..1) an actor of `length` gets at `pos`. */
export function coverAt(world: WorldData, pos: Vec3, length: number, scratch: Cover[]): number {
  let best = 0;
  for (const c of world.coverHash.query(pos.x, pos.z, 4, scratch)) {
    if (length > c.maxLength) continue;
    const d = Math.hypot(pos.x - c.pos.x, pos.y - c.pos.y, pos.z - c.pos.z);
    if (d < c.radius) best = Math.max(best, c.strength * (1 - d / c.radius * 0.4));
  }
  return best;
}

/** Push (x,z) out of boulders and inside the rim. Returns whether a collision happened. */
export function resolveStatic(world: WorldData, pos: Vec3, radius: number, scratch: Boulder[]): boolean {
  let hit = false;
  const r = Math.hypot(pos.x, pos.z);
  const lim = WORLD_RADIUS - 6;
  if (r > lim) { pos.x *= lim / r; pos.z *= lim / r; hit = true; }
  for (const b of world.boulderHash.query(pos.x, pos.z, radius + 8, scratch)) {
    if (pos.y > b.height + radius * 0.5) continue;
    const dx = pos.x - b.pos.x, dz = pos.z - b.pos.z;
    const d = Math.hypot(dx, dz), min = b.radius + radius;
    if (d < min) {
      const nx = d > 1e-3 ? dx / d : 1, nz = d > 1e-3 ? dz / d : 0;
      pos.x = b.pos.x + nx * min; pos.z = b.pos.z + nz * min; hit = true;
    }
  }
  return hit;
}

/** Ground height including boulder tops, for crawlers. */
export function groundHeight(world: WorldData, x: number, z: number, scratch: Boulder[]): number {
  let h = sampleHeight(x, z);
  for (const b of world.boulderHash.query(x, z, 8, scratch)) {
    const dx = x - b.pos.x, dz = z - b.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < b.radius) {
      const dome = Math.sqrt(Math.max(0, 1 - (d / b.radius) ** 2));
      h = Math.max(h, b.pos.y + b.sy * dome * 0.95);
    }
  }
  return h;
}

export const microbialAt = (x: number, z: number) =>
  biomeAt(x, z) === 'flats' ? smoothstep(0.42, 0.7, fbm2(x * 0.25 * 0.2 + 9, z * 0.25 * 0.2 + 9)) : smoothstep(0.55, 0.75, noise2(x * 0.05, z * 0.05)) * 0.4;
