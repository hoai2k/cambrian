/**
 * Prop footprints: the shape a piece of scenery blocks, as the shape it is drawn with.
 *
 * Everything on the seabed used to collide as a circle (a plant) or an ellipse fitted to its
 * drawing scale (a rock). That is right for a sponge and wrong for everything else: a driftwood
 * log two and a half units long and one wide blocked a disc two and a half units across, so there
 * was an arm's length of invisible wall off each side of it; a blade spire and a talus shard did
 * the same; and the Devonian's boulder, whose corners reach a third further than its axes, could
 * be swum straight through. Neither error mattered much to a three-metre placoderm and both are
 * impassable to a hatchling, which is the size everything now starts at.
 *
 * A footprint is sixteen radii around the compass, measured off the prop's own mesh by
 * `npm run shapes` and checked in (`src/content/prop-shapes.json`) because `src/sim` is
 * deterministic and never loads a GLB. Index 0 points along the prop's local +z and they turn
 * toward +x, so a footprint rotates with the thing it belongs to.
 */

/** Sixteen local radii, starting at +z and turning toward +x. */
export type Footprint = readonly number[];
export const FOOTPRINT_BINS = 16;
/** The shape everything used to have: a unit circle. */
export const ROUND: Footprint = Object.freeze(new Array(FOOTPRINT_BINS).fill(1));

const TAU = Math.PI * 2;

/** Footprint radius in a local direction, interpolated between the two spokes it falls between. */
export function fpRadius(fp: Footprint, ang: number): number {
  const t = ((ang / TAU) * FOOTPRINT_BINS % FOOTPRINT_BINS + FOOTPRINT_BINS) % FOOTPRINT_BINS;
  const i = Math.floor(t), f = t - i;
  return fp[i % FOOTPRINT_BINS] * (1 - f) + fp[(i + 1) % FOOTPRINT_BINS] * f;
}

/** Where the edge of a footprint is, seen from (x, z). Reused; never held. */
export interface Reach {
  /** Distance from the prop's centre to (x, z). */
  d: number;
  /** Distance from the centre to the footprint's edge in that direction. */
  reach: number;
  /** Unit vector from the centre toward (x, z): the direction a body is pushed out. */
  nx: number; nz: number;
}

/**
 * Measure a footprint from (x, z). `rot` turns it, `sx`/`sz` scale it the way the mesh is drawn.
 * Inside is `d < reach`; `d / reach` is the same `q` a circular collider always used.
 */
export function fpReach(fp: Footprint, px: number, pz: number, rot: number, sx: number, sz: number, x: number, z: number, out: Reach): Reach {
  const dx = x - px, dz = z - pz;
  const d = Math.hypot(dx, dz);
  const c = Math.cos(rot), s = Math.sin(rot);
  // Into the prop's own frame, then into the units its footprint was measured in.
  const ux = (c * dx + s * dz) / sx, uz = (-s * dx + c * dz) / sz;
  const ul = Math.hypot(ux, uz);
  out.d = d;
  if (ul < 1e-9) {
    out.reach = fpRadius(fp, 0) * Math.min(sx, sz);
    out.nx = s; out.nz = c;
    return out;
  }
  const r = fpRadius(fp, Math.atan2(ux, uz)) / ul;
  // The edge along this ray, back in world units.
  out.reach = Math.hypot(ux * r * sx, uz * r * sz);
  out.nx = d > 1e-9 ? dx / d : s;
  out.nz = d > 1e-9 ? dz / d : c;
  return out;
}

/** Five height bands, bottom to top: the footprint measured again at each height. */
export const FOOTPRINT_BANDS = 5;

/**
 * Footprint radius at a height fraction, across the bands. Band centres, linearly between them, so
 * a crinoid's stalk widens into its crown rather than stepping.
 */
export function fpRadiusAt(bands: readonly Footprint[], fr: number, ang: number): number {
  const t = Math.min(1, Math.max(0, fr)) * bands.length - 0.5;
  const i = Math.floor(t);
  if (i < 0) return fpRadius(bands[0], ang);
  if (i >= bands.length - 1) return fpRadius(bands[bands.length - 1], ang);
  const f = t - i;
  return fpRadius(bands[i], ang) * (1 - f) + fpRadius(bands[i + 1], ang) * f;
}

/** `fpReach` against the band at height fraction `fr`. */
export function fpReachAt(bands: readonly Footprint[], fr: number, px: number, pz: number, rot: number, sx: number, sz: number, x: number, z: number, out: Reach): Reach {
  const dx = x - px, dz = z - pz;
  const d = Math.hypot(dx, dz);
  const c = Math.cos(rot), s = Math.sin(rot);
  const ux = (c * dx + s * dz) / sx, uz = (-s * dx + c * dz) / sz;
  const ul = Math.hypot(ux, uz);
  out.d = d;
  if (ul < 1e-9) {
    out.reach = fpRadiusAt(bands, fr, 0) * Math.min(sx, sz);
    out.nx = s; out.nz = c;
    return out;
  }
  const r = fpRadiusAt(bands, fr, Math.atan2(ux, uz)) / ul;
  out.reach = Math.hypot(ux * r * sx, uz * r * sz);
  out.nx = d > 1e-9 ? dx / d : s;
  out.nz = d > 1e-9 ? dz / d : c;
  return out;
}

/** The furthest a footprint reaches once scaled: the radius a broad phase has to use. */
export function fpMax(fp: Footprint, sx = 1, sz = 1): number {
  let m = 0;
  for (let i = 0; i < FOOTPRINT_BINS; i++) {
    const ang = (i / FOOTPRINT_BINS) * TAU;
    m = Math.max(m, Math.hypot(Math.sin(ang) * fp[i] * sx, Math.cos(ang) * fp[i] * sz));
  }
  return m;
}
