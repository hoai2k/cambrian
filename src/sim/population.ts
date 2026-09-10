import { clamp, hash2, type Rng } from '../shared/math';
import { biomeWeights, nurseryFactor, SURFACE_Y } from './world';

/**
 * What lives where.
 *
 * The sea used to be one population that followed the players about: every wild animal was rolled
 * from the same distribution wherever you were, so one stretch of seabed was much like the next
 * and there was nothing to swim towards. An area has a character now — a hash of where it is, bent
 * by the biome — and it holds to it: a shelf of nothing but small things, a channel with grown
 * animals passing through it, a nursery of hatchlings. That is what makes moving on worth doing,
 * and what makes the sea feel inhabited rather than generated around you.
 *
 * Nothing here reads the clock or the game's rng state to decide *where* an area's character comes
 * from — it is a pure function of the place and the world seed, so the same stretch of sea is the
 * same stretch of sea every time you swim back to it, and a replay of a seed sees what the match
 * saw. The rng is only used to draw one animal out of the distribution the place already has.
 */

/** How big an area of one character is, in units. About a minute's swim across for a small body. */
export const AREA_CELL = 210;

/** The three sizes an ambient animal comes in, as scale ranges. */
export const SIZE_BANDS = { small: [0.28, 0.7], mid: [0.7, 1.3], large: [1.3, 2.4] } as const;
export type SizeBand = keyof typeof SIZE_BANDS;

export interface AreaProfile {
  /** Draw weights over the three bands; they sum to one. */
  small: number; mid: number; large: number;
  /** How many wild animals this area carries, as a multiplier on the base density. */
  density: number;
}

/**
 * The character of the area around a point.
 *
 * The biome sets the floor and the ceiling — a nursery is a nursery, the deep water off the
 * escarpment is never a hatchery — and a per-area hash decides where between them this particular
 * stretch sits. Neighbouring cells draw independently, so a bare shelf with nothing on it but
 * fingerlings always has something else within a few hundred units: there is no way to be stranded
 * in an area that cannot feed you, only a swim to somewhere gentler.
 */
export function areaProfile(x: number, z: number, seed: number): AreaProfile {
  const w = biomeWeights(x, z);
  const cx = Math.floor(x / AREA_CELL), cz = Math.floor(z / AREA_CELL);
  const h = hash2(cx * 1.37 + (seed % 977) * 0.013, cz * 2.11 + (seed % 641) * 0.017);
  const d = hash2(cz * 3.7 + 11.3, cx * 1.9 + (seed % 313) * 0.021);
  // How far the biome itself leans towards grown animals: the nursery and the shallows are a
  // hatchery, the channel, escarpment and basin are where the big bodies are.
  const deep = w.channel * 0.7 + w.escarpment * 0.9 + w.basin + w.boulders * 0.25;
  const young = Math.max(nurseryFactor(x, z), w.shallows * 0.8 + w.nursery);
  const lean = clamp(0.5 + deep * 0.55 - young * 0.75 + (h - 0.5) * 0.8, 0.02, 0.98);
  // The lean spreads over the three bands: at 0 an area is all fingerlings, at 1 it is all adults,
  // and the middle is a working mixture rather than a flat third each.
  const large = clamp(lean * lean * 0.85, 0.01, 0.72);
  const small = clamp((1 - lean) * (1 - lean) * 0.95, 0.02, 0.9);
  const mid = Math.max(0.08, 1 - large - small);
  const sum = large + small + mid;
  // Density has its own roll: a rich shelf and a thin one are both worth finding, and the thin one
  // is never empty — the floor is a third of the usual, not nothing.
  const density = 0.35 + d * 1.15 + (1 - young) * 0.15;
  return { small: small / sum, mid: mid / sum, large: large / sum, density };
}

/** Draw one band out of a profile. */
export function drawBand(rng: Rng, p: AreaProfile): SizeBand {
  const r = rng();
  return r < p.small ? 'small' : r < p.small + p.mid ? 'mid' : 'large';
}

/** A scale inside a band. The large band leans small within itself: an adult is rarer the bigger it is. */
export function bandScale(rng: Rng, band: SizeBand): number {
  const [lo, hi] = SIZE_BANDS[band];
  const f = band === 'large' ? rng() * rng() : rng();
  return clamp(lo + f * (hi - lo), 0.28, 2.4);
}

/**
 * How much of the water above a point is open water, 0 at the surface and 1 in the deep. Used to
 * decide whether a passing adult has room to pass: there is no room for a big animal overhead in
 * three units of water.
 */
export const headroom = (ground: number) => clamp((SURFACE_Y - ground) / 30, 0, 1);

/**
 * The odds that a spawn ignores the area's character and is simply something big going past,
 * placed up in the water. Whatever the seabed under you holds, swimming up finds bigger animals —
 * that is where the big ones are, and it should always be a way out of a nursery shelf that has
 * nothing on it worth eating.
 */
export const PASSER_BY = 0.22;
