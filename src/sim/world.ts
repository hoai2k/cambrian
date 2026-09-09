import { ACTIVE_ERA } from '../content';
import { clamp, fbm2, makeRng, noise2, smoothstep, TAU, type Vec3 } from '../shared/math';
import { floraSize } from './flora';
import { footprintOf, propShape, rockPropId } from '../content/prop-shapes';
import { fpMax, fpReach, ROUND, type Footprint, type Reach } from './footprint';
import { SpatialHash } from './spatial';

/**
 * The sea is a half-plane. A shoreline runs along +x near where players first spawn; the seabed
 * climbs out of the water there, so it is the one edge of an otherwise endless field. Everything
 * else is a function of `(x, z)` (no stored state), so any chunk can be generated on demand from
 * the seed and thrown away again: distance from the shore picks the biome band, an along-shore
 * mosaic picks which of the band's biomes you are in, and low-frequency noise warps all of it so
 * nothing is a straight line. See docs/redesign/04-infinite-ocean.md.
 */
export type Biome = 'shallows' | 'nursery' | 'shelf' | 'forest' | 'boulders' | 'flats' | 'channel' | 'escarpment' | 'basin';
export const BIOMES: readonly Biome[] = ['shallows', 'nursery', 'shelf', 'forest', 'boulders', 'flats', 'channel', 'escarpment', 'basin'];
export const BIOME_NAMES = ACTIVE_ERA.environment.biomeNames;
export const BIOME_DANGER = ACTIVE_ERA.environment.biomeDanger;
/**
 * Plant and colony kinds. The first nine are the Cambrian's; the rest are the Devonian's procedural
 * stand-ins (crinoid stalks, stromatoporoid mounds, tabulate plates, rugose horn corals, bryozoan
 * fans, river-mouth reeds and driftwood logs) until its scenery GLBs land. Which kinds a chunk
 * places comes from the era's density table (`EraDefinition.environment.flora`).
 */
export type FloraKind = 'vauxia' | 'sac' | 'choia' | 'thalli' | 'tuft' | 'cushion' | 'lettuce' | 'spine' | 'glass'
  | 'crinoid' | 'stromatoporoid' | 'tabulate' | 'rugose' | 'bryozoan' | 'reed' | 'log'
  // tall Devonian kinds that reach up into the water column: a giant sea lily and an algal frond tower
  | 'lilyColumn' | 'frondTower';
/** Driftwood only washes out this far from the shore. */
export const LOG_SHORE_RANGE = 120;

export interface Boulder {
  variant?: 'blade-spire' | 'talus-shard'; pos: Vec3; radius: number; height: number;
  sx: number; sy: number; sz: number; rot: number; shade: number;
  /**
   * Collision floor. A rock sitting on the seabed has none and blocks everything below its top;
   * a landmark's raised span (an arch's lintel, a rib of a skeleton) sets this so a creature swims
   * *under* it and only bumps into it from this height up. `groundHeight` still puts its top
   * underfoot, so a raised piece stays something a crawler can climb onto.
   */
  floor?: number;
}
export interface Flora {
  pos: Vec3; kind: FloraKind; scale: number; sy: number; rot: number; shade: number;
  /** World-space height, base radius, and the furthest the top may be displaced. */
  H: number; R: number; maxB: number;
  /** Top displacement (world units) and its velocity: the plant's bend spring. */
  bx: number; bz: number; bvx: number; bvz: number;
  /** In `World.activeFlora`. */
  active: boolean;
}
export interface Cover { pos: Vec3; radius: number; maxLength: number; strength: number; temp?: boolean; t?: number; }
export interface Bloom { pos: Vec3; radius: number; drift: number; }

/** The water surface. Era-driven: a pelagic roster (the Devonian) asks for a deeper column. */
export const SURFACE_Y = ACTIVE_ERA.environment.surfaceY ?? 40;
export const LIGHT_WINDOW_Y = SURFACE_Y - 9;
/**
 * What RB and LB are worth to a swimmer: units per second at scale 1, before the current.
 *
 * 2.6 was measured against the Cambrian's forty-unit column, where holding rise off the seabed
 * puts you at the surface in about fifteen seconds. The Devonian's sea is sixty-four units deep
 * because its roster is pelagic, and the same number there is a different button — half a minute
 * of holding it, and a hatchling never getting there at all. So the rate is a property of the
 * sea's depth rather than a constant: the button means the same thing in both of them.
 */
export const RISE_RATE = 2.6 * (SURFACE_Y / 40);
/** Chunk edge in world units. Matches the renderer's scenery cells. */
export const CHUNK = 64;
/** Chunks are simulated (flora, cover, collision) this far from any player; the renderer draws terrain further out. */
export const SIM_RADIUS = 192;
/** Distance from the waterline where the water gets too shallow to swim: the shore is a wall here. */
export const SHORE_WALL = 5;
/** Nurseries sit this far off the shore, spaced this far apart along it. Nursery 0 is at the origin. */
export const NURSERY_OFF = 88;
export const NURSERY_SPACING = 260;
export const NURSERY_R = 24;

// ---------------------------------------------------------------------------------------------
// Fields

/** z of the waterline at this x. The shore wanders by ±40 units so it is a coast, not a ruler. */
export function shoreZ(x: number) {
  return NURSERY_OFF + (noise2(x / 520 + 3.1, 0.7) - 0.5) * 70 + (noise2(x / 210 + 5.5, 1.9) - 0.5) * 30 + (noise2(x / 140 + 9, 2.3) - 0.5) * 16;
}
/** Distance from the shore into the sea (negative on land). The sea lies toward -z. */
export const shoreDistance = (x: number, z: number) => shoreZ(x) - z;

/** Ridge noise whose 0.5-contour is a channel. Channels drain away from the shore. */
const channelField = (x: number, z: number) => noise2(x / 380 + 17, z / 240 + 5) * 0.8 + noise2(x / 120 + 4, z / 95 + 8) * 0.2;
/** 0..1 channel presence: 1 in the middle of a channel, 0 on the flanks. Only beyond the nursery band. */
export function channelFactor(x: number, z: number, s = shoreDistance(x, z)) {
  const n = channelField(x, z) - 0.5;
  const w = 0.028 + 0.012 * noise2(x / 60, z / 60);          // channels widen and narrow
  return Math.exp(-((n / w) ** 2)) * smoothstep(170, 260, s);
}
/** Unit direction of flow in a channel: along the contour, away from the shore. */
export function channelFlow(x: number, z: number, out: Vec3) {
  const e = 1.5;
  const gx = channelField(x + e, z) - channelField(x - e, z), gz = channelField(x, z + e) - channelField(x, z - e);
  const l = Math.hypot(gx, gz);
  if (l < 1e-6) { out.x = 0; out.z = -1; return out; }
  // perpendicular to the gradient; sign chosen so it runs toward -z (into the basin)
  let fx = -gz / l, fz = gx / l;
  if (fz > 0) { fx = -fx; fz = -fz; }
  out.x = fx; out.y = 0; out.z = fz;
  return out;
}

/** Along-shore mosaic noises that pick the biome inside a band. */
const forestNoise = (x: number, z: number) => fbm2(x / 300 + 41, z / 300 + 7);
const rockNoise = (x: number, z: number) => noise2(x / 230 + 13, z / 230 + 29);
const flatsNoise = (x: number, z: number) => noise2(x / 260 + 71, z / 190 + 3);
/** 0..1 presence of the microbial flats, cheap enough to sample every step. */
export const flatsFactor = (x: number, z: number, s = shoreDistance(x, z)) =>
  smoothstep(0.62, 0.72, flatsNoise(x, z)) * smoothstep(120, 165, s) * (1 - smoothstep(380, 520, s));

/** Nearest nursery centre to (x, z). Nurseries are a jittered row along the shore; index 0 is at the origin. */
export function nurseryAt(index: number): Vec3 {
  const h = makeRng(0x5ab7 ^ (index * 2654435761 >>> 0));
  const jx = index === 0 ? 0 : (h() - 0.5) * 90, jz = index === 0 ? 0 : (h() - 0.5) * 26;
  const x = index * NURSERY_SPACING + jx;
  return { x, y: 0, z: shoreZ(x) - NURSERY_OFF - jz };
}
export function nurseryIndexNear(x: number) { return Math.round(x / NURSERY_SPACING); }
export function nearestNursery(x: number, z: number): { index: number; pos: Vec3; d: number } {
  const i0 = nurseryIndexNear(x);
  let best = { index: i0, pos: nurseryAt(i0), d: Infinity };
  for (let i = i0 - 1; i <= i0 + 1; i++) { const p = nurseryAt(i); const d = Math.hypot(p.x - x, p.z - z); if (d < best.d) best = { index: i, pos: p, d }; }
  return best;
}
export function nurseryFactor(x: number, z: number) {
  const n = nearestNursery(x, z);
  return 1 - smoothstep(NURSERY_R * 0.6, NURSERY_R, n.d);
}

export interface BiomeWeights { shallows: number; nursery: number; shelf: number; forest: number; boulders: number; flats: number; channel: number; escarpment: number; basin: number; }
const scratchW: BiomeWeights = { shallows: 0, nursery: 0, shelf: 0, forest: 0, boulders: 0, flats: 0, channel: 0, escarpment: 0, basin: 0 };

/**
 * Soft membership of every biome at a point, summing to one. Bands by distance from shore:
 * shallows (to ~130) · nursery pockets (~90) · shelf mosaic of forest / boulders / flats (130–660)
 * · channels cut through from 200 on · the escarpment drops away at ~700 · basin beyond, with
 * deep sponge gardens and boulder mounds as the mosaic continues at lower density.
 */
export function biomeWeights(x: number, z: number, out: BiomeWeights = scratchW): BiomeWeights {
  const s = shoreDistance(x, z);
  const rag = (noise2(x / 90 + 5, z / 90 + 5) - 0.5) * 70;   // ragged band edges
  let rest = 1;
  const take = (w: number) => { w = clamp(w, 0, rest); rest -= w; return w; };
  out.nursery = take(nurseryFactor(x, z));
  out.shallows = take(1 - smoothstep(95, 135, s + rag * 0.4));
  out.channel = take(channelFactor(x, z, s) * 0.9);
  const esc = smoothstep(650, 700, s + rag) * (1 - smoothstep(740, 800, s + rag));
  out.escarpment = take(esc);
  const deep = smoothstep(760, 830, s + rag);
  const f = forestNoise(x, z), r = rockNoise(x, z), fl = flatsNoise(x, z);
  const forest = smoothstep(0.56, 0.66, f) * (1 - deep * 0.55);
  const rocks = smoothstep(0.6, 0.72, r) * (0.55 + 0.45 * smoothstep(450, 650, s)) * (1 - deep * 0.4);
  const flats = smoothstep(0.62, 0.72, fl) * (1 - smoothstep(380, 520, s)) * (1 - forest);
  const mosaic = smoothstep(120, 165, s);
  out.forest = take(forest * mosaic);
  out.boulders = take(rocks * mosaic);
  out.flats = take(flats * mosaic);
  out.basin = take(deep);
  out.shelf = rest;
  return out;
}
/** Blended danger (0..1) at a point, for the music and the HUD. */
export function dangerAt(x: number, z: number) {
  const w = biomeWeights(x, z);
  let d = 0;
  for (const b of BIOMES) d += w[b] * BIOME_DANGER[b];
  return d;
}
/** The dominant biome at a point. */
export function biomeAt(x: number, z: number): Biome {
  const w = biomeWeights(x, z);
  let best: Biome = 'shelf', bw = -1;
  for (const b of BIOMES) if (w[b] > bw) { bw = w[b]; best = b; }
  return best;
}

/**
 * Seabed height. The shore climbs to the surface at s = 0; the shallows sit high and bright,
 * the shelf undulates around zero, channels carve 7 deep, the escarpment drops 13 into the basin.
 */
export function sampleHeight(x: number, z: number) {
  const s = shoreDistance(x, z);
  const rag = (noise2(x / 90 + 5, z / 90 + 5) - 0.5) * 70;
  let h = -0.55
    + 0.9 * Math.sin(x * 0.045 + 0.7) * Math.cos(z * 0.039)
    + 0.45 * Math.sin(x * 0.093 + z * 0.037)
    + 0.18 * Math.sin(z * 0.2 + x * 0.107)
    + (fbm2(x * 0.02 + 7, z * 0.02 + 3) - 0.5) * 3.2;
  // shore: the shallows sit a few units high, then the beach climbs to the waterline over the last 48 units
  h += 8 * (1 - smoothstep(40, 140, s));
  if (s < 48) h += (SURFACE_Y + 1 - 8) * Math.pow(1 - smoothstep(0, 48, s), 1.7);
  // channel carve
  if (s > 165) h -= 7 * channelFactor(x, z, s);
  // boulder field: rougher, higher
  if (s > 120) {
    const rocks = smoothstep(0.6, 0.72, rockNoise(x, z)) * smoothstep(120, 165, s);
    if (rocks > 0.01) h += rocks * 1.6 * (0.6 + fbm2(x * 0.06, z * 0.06));
    // flats: very flat (only near the shore where the mats form)
    const flat = flatsFactor(x, z, s);
    if (flat > 0.01) h = h * (1 - flat * 0.8) + flat * 0.2;
  }
  // escarpment and basin
  h -= 13 * smoothstep(690, 760, s + rag);
  h -= 6 * smoothstep(1100, 1700, s);
  return h;
}

export function sampleCurrent(out: Vec3, x: number, y: number, z: number, t: number) {
  const chan = channelFactor(x, z);
  const pulse = 0.8 + 0.2 * Math.sin(t * 0.065);
  const depthFade = clamp(1 - (y + 4) / (SURFACE_Y + 4), 0.15, 1);
  // gentle along-shore drift everywhere
  const dx = 0.14 + 0.16 * Math.sin(z * 0.03 + t * 0.085) + 0.08 * Math.cos(y * 0.3);
  const dz = 0.1 + 0.08 * Math.cos(x * 0.04 - t * 0.07);
  out.x = dx * pulse; out.y = 0.035 * Math.sin(x * 0.14 + z * 0.08 + t * 0.12); out.z = dz * pulse;
  if (chan > 0.05) {
    channelFlow(x, z, scratchFlow);
    out.x += scratchFlow.x * chan * 2.4 * depthFade * pulse;
    out.z += scratchFlow.z * chan * 2.4 * depthFade * pulse;
  }
  return out;
}
const scratchFlow: Vec3 = { x: 0, y: 0, z: 0 };

export function microbialAt(x: number, z: number) {
  const flat = flatsFactor(x, z);
  const mats = flat > 0.5 ? smoothstep(0.42, 0.7, fbm2(x * 0.25 * 0.2 + 9, z * 0.25 * 0.2 + 9)) : 0;
  const patches = smoothstep(0.55, 0.75, noise2(x * 0.05, z * 0.05)) * 0.4;
  return Math.max(mats, patches);
}

// ---------------------------------------------------------------------------------------------
// Chunks

export interface Chunk {
  cx: number; cz: number; key: number;
  /** Chunk centre. */
  x: number; z: number;
  boulders: Boulder[]; flora: Flora[]; cover: Cover[]; blooms: Bloom[];
  /** The one landmark this chunk owns, if any. */
  landmarks: Landmark[];
  /** Dominant biome at the centre, for the renderer's decor choices. */
  biome: Biome;
}
export const chunkKey = (cx: number, cz: number) => (cx + 33554432) * 67108864 + (cz + 33554432);
export const chunkCoord = (v: number) => Math.floor(v / CHUNK);
/** Per-chunk RNG seed: every chunk is the same whatever order it is generated in. */
export const chunkSeed = (seed: number, cx: number, cz: number, salt = 0) => (Math.imul(cx, 73856093) ^ Math.imul(cz, 19349663) ^ Math.imul(seed + salt, 83492791)) >>> 0;

/** Cambrian plants per 144 square units of each biome: the default when the era pack has no table of its own. */
const CAMBRIAN_DENSITY: Record<Biome, Partial<Record<FloraKind, number>>> = {
  shallows: { vauxia: 0.6, sac: 1.2, choia: 1.5, thalli: 3, tuft: 22 },
  nursery: { vauxia: 24, sac: 20, choia: 14, thalli: 16, tuft: 40 },
  shelf: { vauxia: 2.2, sac: 2.5, choia: 3, thalli: 2, tuft: 5 },
  boulders: { vauxia: 3, sac: 2, choia: 4, thalli: 1, tuft: 3 },
  forest: { vauxia: 26, sac: 16, choia: 6, thalli: 18, tuft: 8 },
  channel: { vauxia: 0.2, sac: 0.3, choia: 0.5, thalli: 0, tuft: 1.5 },
  flats: { vauxia: 0.5, sac: 0.8, choia: 2, thalli: 0.4, tuft: 3 },
  escarpment: { vauxia: 1.5, sac: 3, choia: 3, thalli: 0.5, tuft: 1 },
  basin: { vauxia: 0.9, sac: 0.7, choia: 1.2, thalli: 0.1, tuft: 0.4 },
};
const density: Record<Biome, Partial<Record<FloraKind, number>>> = ACTIVE_ERA.environment.flora ?? CAMBRIAN_DENSITY;
/** Every kind the table in use places, in first-seen order (the order the placement RNG is consumed in). */
const KINDS: FloraKind[] = [];
for (const b of BIOMES) for (const k of Object.keys(density[b]) as FloraKind[]) if (!KINDS.includes(k)) KINDS.push(k);
const w2: BiomeWeights = { ...scratchW };

// ---------------------------------------------------------------------------------------------
// Landmarks

/**
 * The three things in an endless procedural sea that are worth swimming toward. Everything else
 * is scatter; a landmark is a structure you recognise, can navigate by, and can use.
 */
export type LandmarkKind = 'arch' | 'stack' | 'bones';
export interface Landmark {
  kind: LandmarkKind;
  /** Stable across loads: derived from the cell, so the same landmark is always the same landmark. */
  id: number;
  pos: Vec3;
  /** Footprint, for the radar, the discovery check and the bones' feeding volume. */
  radius: number;
  rot: number;
  scale: number;
}

/**
 * Landmarks are placed on their own coarse grid — one candidate per cell, so they are spread out
 * rather than clumping — and the chunk that contains the candidate builds it. Like everything else
 * in the world this is a pure function of the seed and the cell, so both split-screen players and
 * every reload agree on where they are.
 */
export const LANDMARK_CELL = CHUNK * 5;
/** How much of the sea has one. Below 1 the empty cells are what make the occupied ones read as rare. */
const LANDMARK_CHANCE = 0.55;
/** Nothing is built inside this of the shore or of a nursery clearing. */
const LANDMARK_CLEAR = 70;

export const landmarkCell = (v: number) => Math.floor(v / LANDMARK_CELL);

/**
 * The landmark for one cell, or undefined where the cell's candidate site is unsuitable (too close
 * to the shore or a nursery, or the cell simply drew a blank). Pure; call it as often as you like.
 */
export function landmarkAt(seed: number, lx: number, lz: number): Landmark | undefined {
  const rng = makeRng(chunkSeed(seed, lx, lz, 0x1a2d));
  if (rng() > LANDMARK_CHANCE) return undefined;
  // Inset from the cell edge so a landmark's own scenery never spills into the next cell.
  const margin = LANDMARK_CELL * 0.2;
  const x = lx * LANDMARK_CELL + margin + rng() * (LANDMARK_CELL - margin * 2);
  const z = lz * LANDMARK_CELL + margin + rng() * (LANDMARK_CELL - margin * 2);
  const s = shoreDistance(x, z);
  if (s < LANDMARK_CLEAR) return undefined;
  if (nearestNursery(x, z).d < NURSERY_R + 24) return undefined;
  const biome = biomeAt(x, z);
  // Each kind belongs somewhere: an arch needs standing water and growth, a stack needs rock,
  // a skeleton is what the deep does with the giants that live there.
  // The bones are the rare one: a whole dead giant on the floor, and the deep would stop reading
  // as dangerous if it were paved with them.
  const deep = biome === 'basin' || biome === 'channel';
  const kind: LandmarkKind =
    deep ? (rng() < 0.3 ? 'bones' : 'stack')
    : biome === 'boulders' || biome === 'escarpment' ? (rng() < 0.12 ? 'bones' : 'stack')
    : biome === 'flats' ? (rng() < 0.15 ? 'bones' : 'stack')
    : 'arch';
  const scale = 0.85 + rng() * 0.7;
  // Big enough to see across open water and to hold a clearing of its own: a landmark that reads
  // as one more sponge is not a landmark.
  const radius = (kind === 'arch' ? 17 : kind === 'stack' ? 12 : 19) * scale;
  return { kind, id: chunkSeed(seed, lx, lz, 0x1a2d), pos: { x, y: sampleHeight(x, z), z }, radius, rot: rng() * TAU, scale };
}

/** Build one landmark's scenery into a chunk. `far` keeps the silhouette and drops the detail. */
function buildLandmark(chunk: Chunk, m: Landmark, far: boolean) {
  const rng = makeRng(m.id ^ 0x51ed);
  const { x: cxp, z: czp } = m.pos;
  const rock = (x: number, z: number, sx: number, sy: number, sz: number, y: number, floor?: number) => {
    chunk.boulders.push({
      pos: { x, y, z }, radius: rockRadius(undefined, sx, sz), height: y + rockRise(undefined, sy) * 1.05,
      sx, sy, sz, rot: rng() * TAU, shade: 0.62 + rng() * 0.22, floor,
    });
  };
  const S = m.scale;
  const ca = Math.cos(m.rot), sa = Math.sin(m.rot);
  /** Local (along, across) offsets rotated into the world, so the whole structure faces one way. */
  const at = (along: number, across: number) => ({ x: cxp + ca * along - sa * across, z: czp + sa * along + ca * across });

  if (m.kind === 'arch') {
    // Two piers and a span you swim under: the one piece of scenery with a hole in it.
    const half = 9.5 * S, pierR = 2.9 * S, top = 14 * S;
    for (const side of [-1, 1]) {
      const p = at(0, side * half);
      const g = sampleHeight(p.x, p.z);
      rock(p.x, p.z, pierR, top * 0.5, pierR * 0.9, g + top * 0.16);
    }
    // The lintel: three blocks across the gap, raised so only the top of a jump touches them.
    const springY = sampleHeight(cxp, czp) + top * 0.62;
    for (let i = -1; i <= 1; i++) {
      const p = at(0, i * half * 0.62);
      rock(p.x, p.z, 3.6 * S, 1.9 * S, 3.2 * S, springY + Math.abs(i) * -0.6 * S, springY - 2.2 * S);
    }
    // Under the span is shelter: shaded, enclosed, and big enough for a mid-size animal.
    chunk.cover.push({ pos: { x: cxp, y: sampleHeight(cxp, czp) + top * 0.3, z: czp }, radius: half * 1.15, maxLength: 5.5 * S, strength: 0.6 });
    if (!far) for (let i = 0; i < 7; i++) {
      const p = at((rng() - 0.5) * 11 * S, (rng() - 0.5) * 20 * S);
      rock(p.x, p.z, (0.4 + rng() * 0.7) * S, (0.3 + rng() * 0.4) * S, (0.4 + rng() * 0.6) * S, sampleHeight(p.x, p.z));
    }
  } else if (m.kind === 'stack') {
    // Boulders piled into a tower: steps for a crawler, a perch, and crevices at the foot.
    let y = sampleHeight(cxp, czp);
    let r = 5.6 * S;
    const n = 5 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const p = at((rng() - 0.5) * r * 0.7, (rng() - 0.5) * r * 0.7);
      const sy = r * (0.45 + rng() * 0.25);
      rock(p.x, p.z, r, sy, r * (0.8 + rng() * 0.3), y + sy * 0.2);
      if (i === 0 || i === 1) chunk.cover.push({ pos: { x: p.x, y: y + sy * 0.5, z: p.z }, radius: r * 1.5, maxLength: r * 0.8, strength: 0.5 });
      y += sy * 1.25;                       // each block sits on the one below
      r *= 0.76 + rng() * 0.08;             // and is smaller, so the tower tapers
    }
  } else {
    // A dead giant on the floor: a spine of vertebrae with ribs arching off it. Food, and the
    // reason something bigger keeps coming back (see Game.bonesNear).
    const len = 24 * S;
    const spineN = 9;
    for (let i = 0; i < spineN; i++) {
      const t = i / (spineN - 1) - 0.5;
      const p = at(t * len, 0);
      const g = sampleHeight(p.x, p.z);
      const w = (2.6 - Math.abs(t) * 2.3) * S;
      rock(p.x, p.z, w, w * 0.7, w * 0.9, g + w * 0.2);
    }
    const ribs = far ? 3 : 6;
    for (let i = 0; i < ribs; i++) {
      const t = (i / (ribs - 1) - 0.5) * 0.7;
      for (const side of [-1, 1]) {
        const p = at(t * len, side * 5.2 * S);
        const g = sampleHeight(p.x, p.z);
        // The ribs arch clear of the floor, so the ribcage is a space you can get inside.
        rock(p.x, p.z, 1.1 * S, 4.6 * S, 0.9 * S, g + 2.6 * S, g + 1.6 * S);
      }
    }
    // Inside the ribcage is the best cover in the deep, and it is exactly where the danger is.
    chunk.cover.push({ pos: { x: cxp, y: sampleHeight(cxp, czp) + 2.8 * S, z: czp }, radius: 7.5 * S, maxLength: 5 * S, strength: 0.75 });
  }
}

/** The landmark this chunk owns, if the cell's candidate site falls inside it. */
function chunkLandmark(seed: number, cx: number, cz: number): Landmark | undefined {
  const m = landmarkAt(seed, landmarkCell(cx * CHUNK), landmarkCell(cz * CHUNK));
  if (!m) return undefined;
  return chunkCoord(m.pos.x) === cx && chunkCoord(m.pos.z) === cz ? m : undefined;
}

/** Everything in one chunk, from the seed alone. `detail: 'far'` skips flora and small rocks (renderer-only distant tiles). */
export function generateChunk(seed: number, cx: number, cz: number, detail: 'full' | 'far' = 'full'): Chunk {
  const rng = makeRng(chunkSeed(seed, cx, cz));
  const x0 = cx * CHUNK, z0 = cz * CHUNK;
  const boulders: Boulder[] = [], flora: Flora[] = [], cover: Cover[] = [], blooms: Bloom[] = [], landmarks: Landmark[] = [];
  const cw = biomeWeights(x0 + CHUNK / 2, z0 + CHUNK / 2, w2);
  const chunk: Chunk = { cx, cz, key: chunkKey(cx, cz), x: x0 + CHUNK / 2, z: z0 + CHUNK / 2, boulders, flora, cover, blooms, landmarks, biome: biomeAt(x0 + CHUNK / 2, z0 + CHUNK / 2) };
  const mark = chunkLandmark(seed, cx, cz);

  // Boulders: a base scatter everywhere, a dense field in the boulder biome, talus under the escarpment.
  const rockDensity = 0.0035 + cw.boulders * 0.04 + cw.escarpment * 0.012 + cw.basin * 0.002 + cw.shallows * 0.002;
  const rockCount = Math.round(rockDensity * CHUNK * CHUNK * (0.7 + rng() * 0.6));
  for (let i = 0; i < rockCount; i++) {
    const x = x0 + rng() * CHUNK, z = z0 + rng() * CHUNK;
    const s = shoreDistance(x, z);
    if (s < SHORE_WALL + 4 || channelFactor(x, z, s) > 0.35 || nurseryFactor(x, z) > 0.5) continue;
    if (mark && Math.hypot(x - mark.pos.x, z - mark.pos.z) < mark.radius) continue;   // the landmark owns its ground
    const big = rng() < 0.18;
    if (detail === 'far' && !big && rng() < 0.6) continue;
    const sx = (big ? 2.4 : 0.8) + rng() * (big ? 4 : 2.4);
    const sy = sx * (0.3 + rng() * 0.5);
    const sz = sx * (0.65 + rng() * 0.4);
    const y = sampleHeight(x, z) + sy * 0.25;
    boulders.push({ pos: { x, y, z }, radius: rockRadius(undefined, sx, sz), height: y + rockRise(undefined, sy) * 1.05, sx, sy, sz, rot: rng() * TAU, shade: 0.68 + rng() * 0.21 });
    if (big) cover.push({ pos: { x, y: y + sy * 0.4, z }, radius: Math.max(sx, sz) * 1.5, maxLength: sx * 0.9, strength: 0.45 });
  }
  if (detail === 'far') { applyBiomeProps(chunk); addLandmark(chunk, mark, true); return chunk; }

  // Flora by blended biome density, per cell (five to a chunk edge), so biomes morph into each other.
  const cellSize = CHUNK / 5;
  const w: BiomeWeights = { ...scratchW };
  for (let cxx = x0; cxx < x0 + CHUNK - 1e-6; cxx += cellSize)
    for (let czz = z0; czz < z0 + CHUNK - 1e-6; czz += cellSize) {
      const mx = cxx + cellSize / 2, mz = czz + cellSize / 2;
      if (shoreDistance(mx, mz) < SHORE_WALL) continue;
      biomeWeights(mx, mz, w);
      const forestF = 1 + 0.6 * w.forest;
      // every nursery has a clearing at its heart where creatures hatch, ringed by the dense growth
      const clearing = smoothstep(4, 10, nearestNursery(mx, mz).d);
      for (const kind of KINDS) {
        let d = 0;
        for (const b of BIOMES) d += (density[b][kind] ?? 0) * w[b];
        const expected = d * clearing * (cellSize * cellSize) / 144;
        const n = Math.floor(expected) + (rng() < expected - Math.floor(expected) ? 1 : 0);
        for (let i = 0; i < n; i++) {
          const x = cxx + rng() * cellSize, z = czz + rng() * cellSize;
          if (shoreDistance(x, z) < SHORE_WALL + 1) continue;
          if (mark && Math.hypot(x - mark.pos.x, z - mark.pos.z) < mark.radius) continue;
          if (kind === 'log' && shoreDistance(x, z) >= LOG_SHORE_RANGE) continue;
          let blocked = false;
          for (const b of boulders) if (Math.hypot(x - b.pos.x, z - b.pos.z) < b.radius + 0.4) { blocked = true; break; }
          if (blocked) continue;
          const s = (kind === 'vauxia' ? 0.6 + rng() * 1.6 : kind === 'tuft' ? 0.35 + rng() * 0.6
            : kind === 'crinoid' ? 0.7 + rng() * 0.65 : kind === 'stromatoporoid' ? 0.5 + rng() * 1.0
            : kind === 'reed' ? 0.7 + rng() * 0.8 : kind === 'log' ? 0.6 + rng() * 0.8
            : kind === 'lilyColumn' ? 0.8 + rng() * 0.7 : kind === 'frondTower' ? 0.7 + rng() * 0.8 : 0.45 + rng() * 1.0) * forestF;
          const y = sampleHeight(x, z) - 0.03;
          const sy = s * (0.85 + rng() * 0.4);
          flora.push({ pos: { x, y, z }, kind, scale: s, sy, rot: rng() * TAU, shade: 0.7 + rng() * 0.28, ...floraSize(kind, s, sy), bx: 0, bz: 0, bvx: 0, bvz: 0, active: false });
          if (kind === 'vauxia' || kind === 'sac' || kind === 'thalli')
            cover.push({ pos: { x, y: y + s * 0.6, z }, radius: s * 1.25, maxLength: s * 1.7, strength: 0.7 });
          else if (kind === 'tuft')
            cover.push({ pos: { x, y: y + s * 0.3, z }, radius: s * 0.9, maxLength: s * 1.4, strength: 0.8 });
          else if (kind === 'crinoid')  // a tall stalk with a feathery crown: cover like a branching sponge, a little higher up
            cover.push({ pos: { x, y: y + sy * 1.1, z }, radius: s * 1.2, maxLength: s * 1.8, strength: 0.65 });
          else if (kind === 'reed')     // thin swaying stems: cover like a tuft for anything that fits between them
            cover.push({ pos: { x, y: y + sy * 0.7, z }, radius: s * 0.9, maxLength: s * 1.6, strength: 0.75 });
          else if (kind === 'lilyColumn')   // a crown high in the column: shelter for anything mid-water, and a landmark
            cover.push({ pos: { x, y: y + sy * 8.2, z }, radius: s * 1.8, maxLength: s * 3.2, strength: 0.6 });
          else if (kind === 'frondTower')   // a soft tower of fronds: cover the whole way up
            cover.push({ pos: { x, y: y + sy * 2.8, z }, radius: s * 1.3, maxLength: s * 2.6, strength: 0.7 });
          else if (kind === 'stromatoporoid') {
            // a firm mound: the same cover a big boulder of its size gives (radius 1.5x, length 0.9x, strength 0.45)
            const rx = s * 0.65, ry = sy * 0.7;
            cover.push({ pos: { x, y: y + ry * 0.4, z }, radius: rx * 1.5, maxLength: rx * 0.9, strength: 0.45 });
          }
        }
      }
    }

  // Plankton blooms up in the light window; thick over the shallows, thin over the basin.
  const bloomChance = 0.28 + cw.shallows * 0.5 + cw.nursery * 0.2 - cw.basin * 0.2;
  if (rng() < bloomChance) {
    const x = x0 + 10 + rng() * (CHUNK - 20), z = z0 + 10 + rng() * (CHUNK - 20);
    if (shoreDistance(x, z) > 30) blooms.push({ pos: { x, y: LIGHT_WINDOW_Y + 2 + rng() * 5, z }, radius: 9 + rng() * 6, drift: rng() * TAU });
  }
  applyBiomeProps(chunk);
  addLandmark(chunk, mark, false);
  return chunk;
}

/**
 * Landmarks are added after `applyBiomeProps` on purpose: the biome prop pass restyles loose rocks
 * into spires and talus by position, and a structure that has been deliberately shaped must not be
 * taken apart by it.
 */
function addLandmark(chunk: Chunk, mark: Landmark | undefined, far: boolean) {
  if (!mark) return;
  chunk.landmarks.push(mark);
  buildLandmark(chunk, mark, far);
}

/** Replace the brief's scenery slots after generation, without consuming the placement RNG. */
function applyBiomeProps(chunk: Chunk) {
  for (const b of chunk.boulders) {
    const biome = biomeAt(b.pos.x, b.pos.z);
    const wall = channelFactor(b.pos.x, b.pos.z);
    const blade = biome === 'channel' || (wall > .20 && wall <= .35 && shoreDistance(b.pos.x, b.pos.z) > 200)
      || (biome === 'escarpment' && b.rot / TAU < .32) || (biome === 'basin' && b.rot / TAU < .14);
    if (!blade && biome !== 'escarpment' && biome !== 'basin') continue;
    b.variant = blade ? 'blade-spire' : 'talus-shard';
    const scale = blade && biome === 'basin' ? 2 + b.shade : clamp(b.sx * (blade ? .55 : .9), .6, 2.5);
    b.pos.y = sampleHeight(b.pos.x, b.pos.z);
    b.sx = b.sy = b.sz = scale;
    b.radius = rockRadius(b.variant, scale, scale);
    b.height = b.pos.y + rockRise(b.variant, scale);
  }
  const flow = { x: 0, y: 0, z: 0 };
  // These swaps are Cambrian-specific (sac→cushion, tuft→lettuce, vauxia/sac→spine, choia/thalli→glass) and
  // test the original kind by name, so the Devonian kinds (crinoid, stromatoporoid, ...) pass through untouched.
  for (const f of chunk.flora) {
    const biome = biomeAt(f.pos.x, f.pos.z), original = f.kind;
    if ((biome === 'shallows' || biome === 'nursery') && original === 'sac') f.kind = 'cushion';
    if (biome === 'shallows' && original === 'tuft' && f.rot < Math.PI) f.kind = 'lettuce';
    if ((biome === 'escarpment' || biome === 'basin') && (original === 'vauxia' || original === 'sac')) f.kind = 'spine';
    if (biome === 'basin' && (original === 'choia' || original === 'thalli')) {
      f.kind = 'glass'; channelFlow(f.pos.x, f.pos.z, flow);
      // The fan lies in local XY; its normal faces into the current.
      f.rot = Math.atan2(flow.x, flow.z);
    }
    if (f.kind !== original) Object.assign(f, floraSize(f.kind, f.scale, f.sy));
  }
}

/**
 * The streamed world. Chunks within `SIM_RADIUS` of every anchor (players, bots) are generated
 * and indexed; chunks further than that plus a margin are dropped. Flat arrays and hashes are
 * rebuilt whenever the loaded set changes, so the rest of the sim never sees chunks at all.
 */
export class World {
  readonly chunks = new Map<number, Chunk>();
  boulders: Boulder[] = [];
  flora: Flora[] = [];
  cover: Cover[] = [];
  blooms: Bloom[] = [];
  landmarks: Landmark[] = [];
  boulderHash = new SpatialHash<Boulder>(12);
  coverHash = new SpatialHash<Cover>(4);
  floraHash = new SpatialHash<Flora>(6);
  /** Plants currently bent away from rest; the sim springs them back and the renderer leans them. */
  activeFlora: Flora[] = [];
  /** Largest radius-plus-lean of any plant: the broad-phase query margin. */
  floraReach = 0;
  /** Bumped whenever chunks load or unload; the renderer diffs against it. */
  version = 0;
  /** Tests freeze the world so hand-placed scenery is not streamed away. */
  frozen = false;
  private wanted: { cx: number; cz: number; d: number }[] = [];

  constructor(readonly seed = 5052026) {}

  has(cx: number, cz: number) { return this.chunks.has(chunkKey(cx, cz)); }

  /**
   * Load what the anchors need (nearest first, at most `budget` new chunks) and drop what nobody is
   * near. Returns true when the loaded set changed.
   */
  stream(anchors: readonly Vec3[], budget = 2, radius = SIM_RADIUS): boolean {
    if (this.frozen || !anchors.length) return false;
    const r = radius + CHUNK * 0.71;
    const span = Math.ceil(radius / CHUNK) + 1;
    this.wanted.length = 0;
    const seen = new Set<number>();
    for (const a of anchors) {
      const acx = chunkCoord(a.x), acz = chunkCoord(a.z);
      for (let cx = acx - span; cx <= acx + span; cx++)
        for (let cz = acz - span; cz <= acz + span; cz++) {
          const k = chunkKey(cx, cz);
          if (seen.has(k) || this.chunks.has(k)) continue;
          const d = Math.hypot(a.x - (cx + 0.5) * CHUNK, a.z - (cz + 0.5) * CHUNK);
          if (d > r) continue;
          seen.add(k); this.wanted.push({ cx, cz, d });
        }
    }
    let changed = false;
    if (this.wanted.length) {
      this.wanted.sort((p, q) => p.d - q.d);
      for (let i = 0; i < Math.min(budget, this.wanted.length); i++) {
        const w = this.wanted[i];
        const c = generateChunk(this.seed, w.cx, w.cz);
        this.chunks.set(c.key, c); changed = true;
      }
    }
    // unload with hysteresis so a player pacing a boundary does not churn
    const drop = r + CHUNK * 1.5;
    for (const c of this.chunks.values()) {
      let near = false;
      for (const a of anchors) if (Math.hypot(a.x - c.x, a.z - c.z) < drop) { near = true; break; }
      if (!near) { this.chunks.delete(c.key); changed = true; }
    }
    if (changed) this.rebuild();
    return changed;
  }

  /** Load everything within `radius` of a point at once (match start, teleport). */
  loadAround(p: Vec3, radius = SIM_RADIUS) { this.stream([p], 1e6, radius); }

  /** Re-index after the loaded set (or a test's hand edits) changed. */
  rebuild() {
    this.boulders = []; this.flora = []; this.cover = []; this.blooms = []; this.landmarks = [];
    for (const c of this.chunks.values()) {
      for (const b of c.boulders) this.boulders.push(b);
      for (const f of c.flora) this.flora.push(f);
      for (const v of c.cover) this.cover.push(v);
      for (const b of c.blooms) this.blooms.push(b);
      for (const m of c.landmarks) this.landmarks.push(m);
    }
    this.boulderHash.rebuild(this.boulders);
    this.coverHash.rebuild(this.cover);
    this.floraHash.rebuild(this.flora);
    this.activeFlora = this.activeFlora.filter((f) => this.flora.includes(f));
    let reach = 0;
    for (const f of this.flora) reach = Math.max(reach, f.R + f.maxB);
    this.floraReach = reach;
    this.version++;
  }
}
/** Older name for the world, kept so call sites read the same. */
export type WorldData = World;

/** Build a world with the origin nursery loaded, for tests and the attract mode. */
export function generateWorld(seed = 5052026, around: Vec3 = { x: 0, y: 0, z: 0 }): World {
  const w = new World(seed);
  w.loadAround(around);
  return w;
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

/**
 * A rock collides as the shape it is drawn with.
 *
 * Its footprint is the prop's own silhouette (`src/sim/footprint.ts`), turned by `rot` and scaled
 * the way the mesh is — not the circle around it, which on a long rock stands a couple of units
 * out into open water on the narrow side and reads as an invisible wall, and not an ellipse fitted
 * to that circle, which a blocky boulder pokes its corners straight out of. `radius` is the
 * furthest that footprint reaches, for the broad phase and for the cover a rock gives.
 *
 * `q` is the distance to the centre in units of the footprint: below 1 is inside the rock, and the
 * same number gives the height of its dome, so what you can see is what you collide with and what
 * you can stand on.
 */
const ROCK_SHAPE = {
  boulder: { fp: footprintOf(rockPropId()), top: propShape(rockPropId())?.y1 ?? 1 },
  'blade-spire': { fp: footprintOf(rockPropId('blade-spire')), top: propShape(rockPropId('blade-spire'))?.y1 ?? 4 },
  'talus-shard': { fp: footprintOf(rockPropId('talus-shard')), top: propShape(rockPropId('talus-shard'))?.y1 ?? 0.8 },
} as const;
const rockShape = (b: Boulder) => ROCK_SHAPE[b.variant ?? 'boulder'];
/** The radius a rock of this shape and scale needs around it. */
export const rockRadius = (variant: Boulder['variant'], sx: number, sz: number) =>
  fpMax(ROCK_SHAPE[variant ?? 'boulder'].fp, sx, sz) * 1.02;
/** The top of a rock of this shape above the point it is placed at. */
export const rockRise = (variant: Boulder['variant'], sy: number) => ROCK_SHAPE[variant ?? 'boulder'].top * sy;

export function boulderFootprint(b: Boulder): Footprint { return rockShape(b).fp; }
const scratchReach: Reach = { d: 0, reach: 0, nx: 0, nz: 1 };
const staticReach: Reach = { d: 0, reach: 0, nx: 0, nz: 1 };
export function boulderReach(b: Boulder, x: number, z: number, out: Reach = scratchReach): Reach {
  return fpReach(rockShape(b).fp, b.pos.x, b.pos.z, b.rot, b.sx, b.sz, x, z, out);
}
export function boulderQ(b: Boulder, x: number, z: number, pad = 0): number {
  const r = boulderReach(b, x, z, scratchReach);
  return r.d / Math.max(r.reach + pad, 1e-6);
}
/** Height of a rock's dome above its own centre at `q` (0 outside it). */
const domeRise = (b: Boulder, q: number) =>
  q >= 1 ? 0 : rockRise(b.variant, b.sy) * Math.sqrt(Math.max(0, 1 - q * q)) * .95;
/** The top of a rock directly above (x,z), or undefined where the rock is not underneath. */
export function boulderTop(b: Boulder, x: number, z: number): number | undefined {
  const q = boulderQ(b, x, z);
  return q >= 1 ? undefined : b.pos.y + domeRise(b, q);
}

/** What a body found when it was pushed out of the scenery. */
export interface StaticContact {
  /** Something pushed the body this step. */
  hit: boolean;
  /**
   * The height the body has to reach to get over the tallest rock it is pressed against, or
   * -Infinity when there is nothing to climb (open water, or a face too tall to be worth trying).
   */
  climbTo: number;
  /**
   * The top of the tallest rock that actually blocked, however tall it is. A cliff is not offered
   * as a climb, but a body with legs that keeps pushing into one gets over it in the end.
   */
  wallTop: number;
}

/**
 * Push (x,z) out of boulders and off the beach. Returns whether a collision happened.
 *
 * Rocks come in three kinds, by how they stand relative to the body:
 *
 * - **Shallow enough to glide over.** The rock's surface at this column is within `glide` (see
 *   `glideOver`), so it does not block at all: the floor under the body carries it up and across.
 *   Sand-scale bumps, domes and the flanks of anything rounded end up here.
 * - **Steep, but not a cliff.** The rock's top is within `climb` of the body (see `climbHeight`).
 *   It blocks the way through — the body never enters the rock — but reports the height to get
 *   over it in `out.climbTo`, and the caller lifts the body up the face until it is clear. This is
 *   how a boulder taller than you is still something you go over rather than around.
 * - **A wall.** Anything standing higher than that above you blocks, and nothing else happens.
 *
 * A landmark's raised span (`floor`) is none of these: it is something you swim under.
 */
export function resolveStatic(world: WorldData, pos: Vec3, radius: number, scratch: Boulder[], reach = 0, glide = 0, climb = 0, out?: StaticContact): boolean {
  let hit = false;
  if (out) { out.hit = false; out.climbTo = -Infinity; out.wallTop = -Infinity; }
  // The shore is the one wall in the sea. Push straight back along -z; the coast wanders gently
  // enough that the local normal is close to that. `reach` lets a limbed body push that far past it.
  const s = shoreDistance(pos.x, pos.z), wall = Math.max(radius, SHORE_WALL + radius * 3 - reach);
  if (s < wall) { pos.z -= wall - s; hit = true; }
  for (const b of world.boulderHash.query(pos.x, pos.z, radius + 8, scratch)) {
    if (pos.y > b.height + radius * 0.5) continue;
    if (b.floor !== undefined && pos.y < b.floor - radius * 0.5) continue;   // pass under a raised span
    const rr = boulderReach(b, pos.x, pos.z, staticReach);
    if (rr.d >= rr.reach + radius) continue;
    if (b.floor === undefined) {
      // Angled and low: let the floor carry the body over rather than stopping it here.
      if (glide > 0 && b.pos.y + domeRise(b, rr.d / Math.max(rr.reach, 1e-6)) <= pos.y + glide) continue;
      // Too steep to glide: block, and say how high the top is. Within `climb` that is an offer to
      // go over; higher, it is only what it would take, for a body stubborn enough to want it.
      if (out) {
        const top = b.height + radius * 0.6;
        out.wallTop = Math.max(out.wallTop, top);
        if (climb > 0 && b.height <= pos.y + climb) out.climbTo = Math.max(out.climbTo, top);
      }
    }
    // Straight out along the ray from the centre, to where the footprint crosses it.
    const want = rr.reach + radius;
    pos.x = b.pos.x + rr.nx * want;
    pos.z = b.pos.z + rr.nz * want;
    hit = true;
  }
  if (out) out.hit = hit;
  return hit;
}

/** Ground height including boulder tops. Only where a rock actually is: its drawn ellipse, not a circle around it. */
export function groundHeight(world: WorldData, x: number, z: number, scratch: Boulder[]): number {
  let h = sampleHeight(x, z);
  for (const b of world.boulderHash.query(x, z, 8, scratch)) {
    const top = boulderTop(b, x, z);
    if (top !== undefined && top > h) h = top;
  }
  return h;
}
