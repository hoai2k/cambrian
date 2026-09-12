/**
 * The sculpt document: a creature's silhouette as the kind of table its builder is made of.
 *
 * Every creature builder in `tools/` lofts a body from a profile table — rows of (station along
 * the body, width, height above the axis, depth below it) with a spline through them. The viewer's
 * sculpt mode measures that table off the shipped mesh (`measure`), lets the user move the rows and
 * pull the spline's tangents, and warps the mesh to match (`warp`) so the change can be judged on
 * the real model and in its animations. What leaves the viewer (`exportDoc`) is that table with
 * base and edited values side by side, which is what a builder port needs and nothing a builder
 * cannot express: proportions and angles, never new topology.
 *
 * Coordinates are the model's own root frame (the GLB's, unscaled): `axis` runs along the body
 * (`frame.axis`, x or z), `up` is +y, `lateral` is the remaining horizontal axis. Three curves per
 * station: `dorsal` (highest point), `ventral` (lowest point) and `width` (widest half-extent
 * from the midline). Stations are ordered by ascending axis coordinate; `frame.forward` says
 * which end the head is at, and `headFraction` gives each station's place from nose (0) to tail
 * (1) so regions read the same way for every creature.
 *
 * Pure: no DOM, no three.js, so `npm run sculpt` can exercise it headlessly.
 */

export type CurveName = 'dorsal' | 'ventral' | 'width';
export const CURVES: readonly CurveName[] = ['dorsal', 'ventral', 'width'];

export interface StationValues { dorsal: number; ventral: number; width: number }

export interface Station {
  /** Axial coordinate of the station in the base model. */
  axis: number;
  /** 0 at the nose, 1 at the tail tip. */
  headFraction: number;
  base: StationValues;
  edit: StationValues;
  /** Edited axial position is `axis + shift`; the axis map stays monotone. */
  shift: number;
  /** Explicit spline slopes (value per unit axis) for the edited curves; absent means automatic. */
  tangent: Partial<Record<CurveName, number>>;
}

export interface Region { name: string; from: number; to: number }

export interface SculptFrame { axis: 'x' | 'z'; forward: 1 | -1; up: 'y' }

/** A point in the body's own terms: along the axis, up, and lateral (the raw lateral coordinate). */
export interface FeaturePoint { axis: number; up: number; lateral: number }

/**
 * The eyes as one feature: the centre of the eye on the positive-lateral side at rest and as
 * edited; the other eye mirrors it about the midline. The skin around each eye (its socket, an
 * orbital rim) follows with a smooth falloff out to `reach` radii, so a moved or resized eye takes
 * its indent with it. `depthLateral` and `depthTop` are how far the centre sits inside the flank
 * and below the crown at rest — what "on the surface in the same way" means when it is moved.
 */
export interface EyeFeature {
  base: FeaturePoint;
  edit: FeaturePoint;
  radius: number;
  scale: number;
  depthLateral: number;
  depthTop: number;
  reach: number;
  mirrored: boolean;
}

/**
 * The mouth as a region around the mouth socket: a falloff sphere of `radius` whose contents can
 * be widened (lateral scale), deepened (vertical scale) and moved. What it changes is whatever the
 * model has there — a terminal slit, a jaw line, a beak — which is as much as a mesh can say about
 * a mouth without knowing how it was built.
 */
export interface MouthFeature {
  base: FeaturePoint;
  edit: FeaturePoint;
  radius: number;
  width: number;
  height: number;
  reach: number;
}

export interface SculptDoc {
  version: 1;
  key: string;
  id: string;
  collection: string;
  model: string;
  frame: SculptFrame;
  /** Extents in the root frame; `lateralMid` is the midline the widths are measured from. */
  bounds: { length: number; height: number; width: number; lateralMid: number; axisMin: number; axisMax: number };
  stations: Station[];
  regions: Region[];
  eyes?: EyeFeature;
  mouth?: MouthFeature;
}

export const EYE_REACH = 2.2;
export const MOUTH_REACH = 1.0;

/** Default number of stations: enough for five regions of four, few enough to grab by hand. */
export const STATION_COUNT = 20;

const REGION_NAMES: readonly [string, number][] = [
  ['Head', .15], ['Fore body', .40], ['Mid body', .65], ['Hind body', .85], ['Tail', 1.01],
];

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);

// ---------------------------------------------------------------------------------------------
// Measuring
// ---------------------------------------------------------------------------------------------

/** Positions in the root frame as flat xyz triples, in any number of chunks. */
export interface MeasureInput {
  chunks: ArrayLike<number>[];
  /** The mouth socket in the root frame, when the model has one: it says which end is the head. */
  mouth?: [number, number, number];
  /** Positions of the eye geometry alone (meshes or materials named for the eye), same frame. */
  eyes?: ArrayLike<number>[];
}

export function measure(input: MeasureInput, meta: { key: string; id: string; collection: string; model: string }, count = STATION_COUNT): SculptDoc {
  // The silhouette is the whole animal, eyes included; the surface the eyes are seated against is
  // the body without them.
  const all = [...input.chunks, ...(input.eyes ?? [])];
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const c of all) for (let i = 0; i + 2 < c.length; i += 3) for (let k = 0; k < 3; k++) {
    const v = c[i + k];
    if (v < lo[k]) lo[k] = v;
    if (v > hi[k]) hi[k] = v;
  }
  if (!Number.isFinite(lo[0])) throw new Error('measure: no vertices');
  const size = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
  const axis: 'x' | 'z' = size[0] > size[2] ? 'x' : 'z';
  const A = axis === 'x' ? 0 : 2, L = axis === 'x' ? 2 : 0;
  const length = Math.max(size[A], 1e-6);
  // The head is the end nearer the mouth; without a socket assume the head faces +axis, which is
  // what both eras' exporters produce.
  let forward: 1 | -1 = 1;
  if (input.mouth) forward = input.mouth[A] - (lo[A] + hi[A]) / 2 >= 0 ? 1 : -1;

  const n = Math.max(2, count);
  const h = length / (n - 1);
  const dorsal = new Array(n).fill(-Infinity), ventral = new Array(n).fill(Infinity), width = new Array(n).fill(0);
  for (const c of all) for (let i = 0; i + 2 < c.length; i += 3) {
    const a = c[i + A], y = c[i + 1], l = Math.abs(c[i + L] - (lo[L] + hi[L]) / 2);
    // A vertex informs every station whose window (±h/2, so windows tile the length) holds it.
    const t = (a - lo[A]) / h;
    const j0 = Math.max(0, Math.ceil(t - .5)), j1 = Math.min(n - 1, Math.floor(t + .5));
    for (let j = j0; j <= j1; j++) {
      if (y > dorsal[j]) dorsal[j] = y;
      if (y < ventral[j]) ventral[j] = y;
      if (l > width[j]) width[j] = l;
    }
  }
  // Empty windows (a gap in a fin-only band) borrow their nearest measured neighbour.
  for (let j = 0; j < n; j++) if (!Number.isFinite(dorsal[j]) || !Number.isFinite(ventral[j])) {
    let k = 1;
    while (k < n && !(Number.isFinite(dorsal[j - k] ?? NaN) || Number.isFinite(dorsal[j + k] ?? NaN))) k++;
    const src = Number.isFinite(dorsal[j - k] ?? NaN) ? j - k : j + k;
    dorsal[j] = dorsal[src]; ventral[j] = ventral[src]; width[j] = width[src];
  }
  const stations: Station[] = [];
  for (let j = 0; j < n; j++) {
    const a = lo[A] + j * h;
    const u = (a - lo[A]) / length;
    const base = { dorsal: dorsal[j], ventral: ventral[j], width: width[j] };
    stations.push({ axis: a, headFraction: forward === 1 ? 1 - u : u, base, edit: { ...base }, shift: 0, tangent: {} });
  }
  const doc: SculptDoc = {
    version: 1, ...meta,
    frame: { axis, forward, up: 'y' },
    bounds: { length, height: size[1], width: size[L], lateralMid: (lo[L] + hi[L]) / 2, axisMin: lo[A], axisMax: hi[A] },
    stations,
    regions: defaultRegions(stations),
  };
  const probe = makeProbe(input.chunks, doc.frame, doc.bounds.lateralMid);
  const eye = measureEyes(input.eyes ?? [], doc, probe);
  if (eye) doc.eyes = eye;
  if (input.mouth) {
    const m = input.mouth;
    const base = { axis: m[A], up: m[1], lateral: m[L] };
    const h = evaluate(stations, 'dorsal', 'base', base.axis) - evaluate(stations, 'ventral', 'base', base.axis);
    doc.mouth = { base, edit: { ...base }, radius: Math.max(h * .5, length * .01), width: 1, height: 1, reach: MOUTH_REACH };
  }
  return doc;
}

/**
 * The body surface near a point, from the vertices themselves: the flank's half-extent at a
 * given station and height, and the crown's height at a given station and lateral offset. What
 * an eye is seated against, so moving it can keep the same seat.
 */
export interface SurfaceProbe {
  width(axis: number, up: number, tol: number): number;
  top(axis: number, lateral: number, tol: number): number;
}

export function makeProbe(chunks: ArrayLike<number>[], frame: SculptFrame, lateralMid: number): SurfaceProbe {
  const A = frame.axis === 'x' ? 0 : 2, L = frame.axis === 'x' ? 2 : 0;
  // A sparse mesh may have no vertex inside the first window; widen it until one turns up.
  const widen = <T>(tol: number, find: (t: number) => T, found: (v: T) => boolean): T => {
    let t = tol, v = find(t);
    for (let k = 0; k < 4 && !found(v); k++) { t *= 2; v = find(t); }
    return v;
  };
  return {
    width(axis, up, tol) {
      return widen(tol, (t) => {
        let best = 0;
        for (const c of chunks) for (let i = 0; i + 2 < c.length; i += 3) {
          if (Math.abs(c[i + A] - axis) > t || Math.abs(c[i + 1] - up) > t) continue;
          const l = Math.abs(c[i + L] - lateralMid);
          if (l > best) best = l;
        }
        return best;
      }, (v) => v > 0);
    },
    top(axis, lateral, tol) {
      const want = Math.abs(lateral - lateralMid);
      return widen(tol, (t) => {
        let best = -Infinity;
        for (const c of chunks) for (let i = 0; i + 2 < c.length; i += 3) {
          if (Math.abs(c[i + A] - axis) > t || Math.abs(Math.abs(c[i + L] - lateralMid) - want) > t) continue;
          if (c[i + 1] > best) best = c[i + 1];
        }
        return best;
      }, (v) => Number.isFinite(v));
    },
  };
}

function measureEyes(eyeChunks: ArrayLike<number>[], doc: SculptDoc, probe: SurfaceProbe): EyeFeature | undefined {
  const A = doc.frame.axis === 'x' ? 0 : 2, L = doc.frame.axis === 'x' ? 2 : 0;
  const mid = doc.bounds.lateralMid;
  // Each side's eye is the bounding box of the eye vertices on that side of the midline.
  const box = (sign: 1 | -1) => {
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    let count = 0;
    for (const c of eyeChunks) for (let i = 0; i + 2 < c.length; i += 3) {
      const side = c[i + L] - mid;
      if (sign === 1 ? side < 0 : side >= 0) continue;
      count++;
      for (let k = 0; k < 3; k++) { if (c[i + k] < lo[k]) lo[k] = c[i + k]; if (c[i + k] > hi[k]) hi[k] = c[i + k]; }
    }
    return count ? { lo, hi, count } : undefined;
  };
  const right = box(1), left = box(-1);
  const pick = right ?? left;
  if (!pick) return undefined;
  const centre = [(pick.lo[0] + pick.hi[0]) / 2, (pick.lo[1] + pick.hi[1]) / 2, (pick.lo[2] + pick.hi[2]) / 2];
  const radius = Math.max(pick.hi[0] - pick.lo[0], pick.hi[1] - pick.lo[1], pick.hi[2] - pick.lo[2]) / 2;
  const base: FeaturePoint = { axis: centre[A], up: centre[1], lateral: centre[L] };
  const tol = Math.max(radius * .6, doc.bounds.length * .004);
  const flank = probe.width(base.axis, base.up, tol);
  const crown = probe.top(base.axis, base.lateral, tol);
  return {
    base, edit: { ...base }, radius, scale: 1,
    depthLateral: flank - Math.abs(base.lateral - mid),
    depthTop: Number.isFinite(crown) ? crown - base.up : 0,
    reach: EYE_REACH,
    mirrored: !!(right && left),
  };
}

/** Five bands from nose to tail, each a contiguous run of station indices. */
export function defaultRegions(stations: readonly Station[]): Region[] {
  const order = [...stations.keys()].sort((i, j) => stations[i].headFraction - stations[j].headFraction);
  const regions: Region[] = [];
  let start = 0;
  for (const [name, limit] of REGION_NAMES) {
    let end = start;
    while (end < order.length && stations[order[end]].headFraction < limit) end++;
    if (end > start) {
      const idx = order.slice(start, end);
      regions.push({ name, from: Math.min(...idx), to: Math.max(...idx) });
    }
    start = end;
  }
  return regions;
}

// ---------------------------------------------------------------------------------------------
// Curves
// ---------------------------------------------------------------------------------------------

/** Catmull-Rom slope at station `i`, one-sided at the ends. */
export function autoSlope(stations: readonly Station[], i: number, curve: CurveName, which: 'base' | 'edit'): number {
  const v = (k: number) => stations[k][which][curve];
  const n = stations.length;
  if (n < 2) return 0;
  const p = Math.max(0, i - 1), q = Math.min(n - 1, i + 1);
  const da = stations[q].axis - stations[p].axis;
  return da > 0 ? (v(q) - v(p)) / da : 0;
}

/** The slope actually used for the edited curve: explicit if set, else automatic. */
export function slope(stations: readonly Station[], i: number, curve: CurveName, which: 'base' | 'edit'): number {
  const t = which === 'edit' ? stations[i].tangent[curve] : undefined;
  return t ?? autoSlope(stations, i, curve, which);
}

/** Cubic Hermite through the stations, clamped to the end values beyond them. */
export function evaluate(stations: readonly Station[], curve: CurveName, which: 'base' | 'edit', a: number): number {
  const n = stations.length;
  if (n === 0) return 0;
  if (a <= stations[0].axis) return stations[0][which][curve];
  if (a >= stations[n - 1].axis) return stations[n - 1][which][curve];
  let i = 0;
  while (i < n - 2 && stations[i + 1].axis <= a) i++;
  const s0 = stations[i], s1 = stations[i + 1];
  const da = s1.axis - s0.axis;
  if (da <= 0) return s0[which][curve];
  const t = (a - s0.axis) / da, t2 = t * t, t3 = t2 * t;
  const p0 = s0[which][curve], p1 = s1[which][curve];
  const m0 = slope(stations, i, curve, which) * da, m1 = slope(stations, i + 1, curve, which) * da;
  return (2 * t3 - 3 * t2 + 1) * p0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * p1 + (t3 - t2) * m1;
}

/** Edited axial position of a base axial coordinate: piecewise linear through the shifted stations. */
export function remapAxis(stations: readonly Station[], a: number): number {
  const n = stations.length;
  if (n === 0) return a;
  const pos = (i: number) => stations[i].axis + stations[i].shift;
  if (a <= stations[0].axis) return a + stations[0].shift;
  if (a >= stations[n - 1].axis) return a + stations[n - 1].shift;
  let i = 0;
  while (i < n - 2 && stations[i + 1].axis <= a) i++;
  const da = stations[i + 1].axis - stations[i].axis;
  const t = da > 0 ? (a - stations[i].axis) / da : 0;
  return pos(i) + (pos(i + 1) - pos(i)) * t;
}

/** The furthest a station may be shifted either way while the axis map stays monotone. */
export function shiftRange(stations: readonly Station[], i: number): [number, number] {
  const n = stations.length;
  const gap = n > 1 ? (stations[n - 1].axis - stations[0].axis) / (n - 1) : 1;
  const margin = gap * .15;
  const lo = i > 0 ? stations[i - 1].axis + stations[i - 1].shift + margin : -Infinity;
  const hi = i < n - 1 ? stations[i + 1].axis + stations[i + 1].shift - margin : Infinity;
  return [lo - stations[i].axis, hi - stations[i].axis];
}

// ---------------------------------------------------------------------------------------------
// Warping
// ---------------------------------------------------------------------------------------------

const EPS = 1e-6;

/**
 * A function from a base root-frame point to its edited position. Height above the base
 * midline scales to the edited dorsal line, depth below it to the edited ventral line, the
 * lateral offset by the width ratio, and the axial coordinate follows the shifted stations.
 */
export type WarpFn = (x: number, y: number, z: number, out: [number, number, number], eye?: boolean) => void;

const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/**
 * The feature edits as a displacement in base space: each eye (and the skin within its reach)
 * moves and scales about its base centre, and the mouth region widens, deepens and moves about
 * the socket. Applied before the profile warp so features ride the body's own change.
 */
export function featureWarp(doc: SculptDoc): WarpFn | null {
  const A = doc.frame.axis === 'x' ? 0 : 2, L = doc.frame.axis === 'x' ? 2 : 0;
  const mid = doc.bounds.lateralMid;
  const ops: { c: number[]; d: number[]; r: number; sx: number; sy: number; sl: number; globe: boolean }[] = [];
  const eye = doc.eyes;
  if (eye && (eye.scale !== 1 || eye.edit.axis !== eye.base.axis || eye.edit.up !== eye.base.up || eye.edit.lateral !== eye.base.lateral)) {
    for (const sign of eye.mirrored ? [1, -1] : [Math.sign(eye.base.lateral - mid) || 1]) {
      const c = [0, 0, 0], d = [0, 0, 0];
      c[A] = eye.base.axis; c[1] = eye.base.up; c[L] = mid + sign * (eye.base.lateral - mid);
      d[A] = eye.edit.axis - eye.base.axis; d[1] = eye.edit.up - eye.base.up; d[L] = sign * (eye.edit.lateral - eye.base.lateral);
      ops.push({ c, d, r: eye.radius * eye.reach, sx: eye.scale, sy: eye.scale, sl: eye.scale, globe: true });
    }
  }
  const mouth = doc.mouth;
  if (mouth && (mouth.width !== 1 || mouth.height !== 1 || mouth.edit.axis !== mouth.base.axis || mouth.edit.up !== mouth.base.up || mouth.edit.lateral !== mouth.base.lateral)) {
    const c = [0, 0, 0], d = [0, 0, 0];
    c[A] = mouth.base.axis; c[1] = mouth.base.up; c[L] = mouth.base.lateral;
    d[A] = mouth.edit.axis - mouth.base.axis; d[1] = mouth.edit.up - mouth.base.up; d[L] = mouth.edit.lateral - mouth.base.lateral;
    const s = [1, 1, 1]; s[1] = mouth.height; s[L] = mouth.width;
    ops.push({ c, d, r: mouth.radius * mouth.reach, sx: s[0], sy: s[1], sl: s[2], globe: false });
  }
  if (!ops.length) return null;
  const p = [0, 0, 0];
  return (x, y, z, out, isEye) => {
    p[0] = x; p[1] = y; p[2] = z;
    for (const o of ops) {
      const dx = p[0] - o.c[0], dy = p[1] - o.c[1], dz = p[2] - o.c[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      // The eye's own vertices belong to it wholly; the skin fades out over the reach.
      const w = o.globe && isEye && dist <= o.r ? 1 : 1 - smooth(dist / o.r);
      if (w <= 0) continue;
      const kx = 1 + (o.sx - 1) * w, ky = 1 + (o.sy - 1) * w, kz = 1 + (o.sl - 1) * w;
      p[0] = o.c[0] + o.d[0] * w + dx * kx;
      p[1] = o.c[1] + o.d[1] * w + dy * ky;
      p[2] = o.c[2] + o.d[2] * w + dz * kz;
    }
    out[0] = p[0]; out[1] = p[1]; out[2] = p[2];
  };
}

export function warp(doc: SculptDoc, subdivisions = 48): WarpFn {
  const profile = profileWarp(doc, subdivisions);
  const features = featureWarp(doc);
  if (!features) return profile;
  const tmp: [number, number, number] = [0, 0, 0];
  return (x, y, z, out, isEye) => {
    features(x, y, z, tmp, isEye);
    profile(tmp[0], tmp[1], tmp[2], out);
  };
}

function profileWarp(doc: SculptDoc, subdivisions = 48): WarpFn {
  const { stations } = doc;
  const A = doc.frame.axis === 'x' ? 0 : 2, L = doc.frame.axis === 'x' ? 2 : 0;
  // Width is measured from the model's lateral midline, which is not necessarily zero.
  const mid = doc.bounds.lateralMid;
  const n = stations.length;
  if (n === 0) return (x, y, z, out) => { out[0] = x; out[1] = y; out[2] = z; };
  // The curves are tabulated once — every station exactly, `subdivisions` samples per span — and
  // read back by linear interpolation, so a hundred-thousand-vertex body warps in a few
  // milliseconds while a point is dragged, and a vertex at a station gets the station's own value.
  const K = Math.max(1, subdivisions);
  const spans = Math.max(1, n - 1);
  const count = spans * K + 1;
  const table = new Float64Array(count * 6);
  const sample = (a: number, o: number) => {
    const db = evaluate(stations, 'dorsal', 'base', a), vb = evaluate(stations, 'ventral', 'base', a);
    const de = evaluate(stations, 'dorsal', 'edit', a), ve = evaluate(stations, 'ventral', 'edit', a);
    const wb = evaluate(stations, 'width', 'base', a), we = evaluate(stations, 'width', 'edit', a);
    const cb = (db + vb) / 2, ce = (de + ve) / 2;
    table[o] = cb; table[o + 1] = ce;
    table[o + 2] = (de - ce) / Math.max(db - cb, EPS);
    table[o + 3] = (ce - ve) / Math.max(cb - vb, EPS);
    table[o + 4] = we / Math.max(wb, EPS);
    table[o + 5] = remapAxis(stations, a);
  };
  for (let i = 0; i < spans; i++) {
    const s0 = stations[i].axis, s1 = stations[Math.min(i + 1, n - 1)].axis;
    for (let k = 0; k < K; k++) sample(s0 + (s1 - s0) * (k / K), (i * K + k) * 6);
  }
  sample(stations[n - 1].axis, (count - 1) * 6);
  const a0 = stations[0].axis, a1 = stations[n - 1].axis;
  const firstShift = stations[0].shift, lastShift = stations[n - 1].shift;
  const p = [0, 0, 0];
  return (x, y, z, out) => {
    p[0] = x; p[1] = y; p[2] = z;
    const a = p[A];
    // Locate the span (stations are few: a linear scan is cheaper than it looks), then the sample.
    let i = 0;
    if (a >= a1) i = spans - 1;
    else if (a > a0) while (i < spans - 1 && stations[i + 1].axis <= a) i++;
    const s0 = stations[i].axis, s1 = stations[Math.min(i + 1, n - 1)].axis;
    const u = s1 > s0 ? clamp((a - s0) / (s1 - s0), 0, 1) : 0;
    const t = i * K + u * K;
    const j = Math.min(count - 2, Math.floor(t)), f = t - j;
    const o = j * 6, q = o + 6;
    const lerp = (k: number) => table[o + k] + (table[q + k] - table[o + k]) * f;
    const cb = lerp(0), ce = lerp(1);
    const yy = y >= cb ? ce + (y - cb) * lerp(2) : ce + (y - cb) * lerp(3);
    const ll = mid + (p[L] - mid) * lerp(4);
    // Beyond the first or last station the axis keeps that station's shift.
    const aa = a <= a0 ? a + firstShift : a >= a1 ? a + lastShift : lerp(5);
    p[1] = yy; p[L] = ll; p[A] = aa;
    out[0] = p[0]; out[1] = p[1]; out[2] = p[2];
  };
}

/** True when nothing in the document departs from what was measured. */
export function isIdentity(doc: SculptDoc): boolean {
  return doc.stations.every((s) => s.shift === 0 && CURVES.every((c) => s.edit[c] === s.base[c] && s.tangent[c] === undefined))
    && !featureWarp(doc);
}

const samePoint = (a: FeaturePoint, b: FeaturePoint) => a.axis === b.axis && a.up === b.up && a.lateral === b.lateral;
export const eyesChanged = (doc: SculptDoc) => !!doc.eyes && (doc.eyes.scale !== 1 || !samePoint(doc.eyes.base, doc.eyes.edit));
export const mouthChanged = (doc: SculptDoc) => !!doc.mouth && (doc.mouth.width !== 1 || doc.mouth.height !== 1 || !samePoint(doc.mouth.base, doc.mouth.edit));

// ---------------------------------------------------------------------------------------------
// Editing helpers (each returns a new document; the history keeps the old one)
// ---------------------------------------------------------------------------------------------

export function cloneDoc(doc: SculptDoc): SculptDoc {
  return {
    ...doc,
    bounds: { ...doc.bounds },
    stations: doc.stations.map((s) => ({ ...s, base: { ...s.base }, edit: { ...s.edit }, tangent: { ...s.tangent } })),
    regions: doc.regions.map((r) => ({ ...r })),
    eyes: doc.eyes ? { ...doc.eyes, base: { ...doc.eyes.base }, edit: { ...doc.eyes.edit } } : undefined,
    mouth: doc.mouth ? { ...doc.mouth, base: { ...doc.mouth.base }, edit: { ...doc.mouth.edit } } : undefined,
  };
}

/**
 * Moves the eyes on the flank: the new station and height are given, and the lateral seat is
 * solved so the centre keeps its depth inside the surface it was measured against.
 */
export function moveEyesOnFlank(doc: SculptDoc, probe: SurfaceProbe, axis: number, up: number): SculptDoc {
  const next = cloneDoc(doc);
  const e = next.eyes;
  if (!e) return next;
  const mid = next.bounds.lateralMid;
  const tol = Math.max(e.radius * .6, next.bounds.length * .004);
  const flank = probe.width(axis, up, tol);
  const sign = Math.sign(e.base.lateral - mid) || 1;
  const seat = flank > 0 ? Math.max(0, flank - e.depthLateral) : Math.abs(e.edit.lateral - mid);
  e.edit = { axis, up, lateral: mid + sign * seat };
  return next;
}

/** Moves the eyes across the crown: station and lateral offset given, height solved to keep the top seat. */
export function moveEyesOnCrown(doc: SculptDoc, probe: SurfaceProbe, axis: number, lateral: number): SculptDoc {
  const next = cloneDoc(doc);
  const e = next.eyes;
  if (!e) return next;
  const mid = next.bounds.lateralMid;
  const sign = Math.sign(e.base.lateral - mid) || 1;
  const off = Math.abs(lateral - mid);
  const tol = Math.max(e.radius * .6, next.bounds.length * .004);
  const crown = probe.top(axis, mid + off, tol);
  const up = Number.isFinite(crown) ? crown - e.depthTop : e.edit.up;
  e.edit = { axis, up, lateral: mid + sign * off };
  return next;
}

export function setEyeScale(doc: SculptDoc, scale: number): SculptDoc {
  const next = cloneDoc(doc);
  if (next.eyes) next.eyes.scale = Math.max(.2, Math.min(4, scale));
  return next;
}

export function setEyeReach(doc: SculptDoc, reach: number): SculptDoc {
  const next = cloneDoc(doc);
  if (next.eyes) next.eyes.reach = Math.max(1, Math.min(6, reach));
  return next;
}

export function setMouth(doc: SculptDoc, patch: Partial<Pick<MouthFeature, 'width' | 'height' | 'reach' | 'radius'>> & { edit?: Partial<FeaturePoint> }): SculptDoc {
  const next = cloneDoc(doc);
  const m = next.mouth;
  if (!m) return next;
  if (patch.width !== undefined) m.width = Math.max(.2, Math.min(4, patch.width));
  if (patch.height !== undefined) m.height = Math.max(.2, Math.min(4, patch.height));
  if (patch.reach !== undefined) m.reach = Math.max(.3, Math.min(4, patch.reach));
  if (patch.radius !== undefined) m.radius = Math.max(1e-4, patch.radius);
  if (patch.edit) m.edit = { ...m.edit, ...patch.edit };
  return next;
}

export function resetFeatures(doc: SculptDoc, which: 'eyes' | 'mouth' | 'both' = 'both'): SculptDoc {
  const next = cloneDoc(doc);
  if (next.eyes && which !== 'mouth') { next.eyes.edit = { ...next.eyes.base }; next.eyes.scale = 1; next.eyes.reach = EYE_REACH; }
  if (next.mouth && which !== 'eyes') { next.mouth.edit = { ...next.mouth.base }; next.mouth.width = 1; next.mouth.height = 1; next.mouth.reach = MOUTH_REACH; }
  return next;
}

export function setValue(doc: SculptDoc, i: number, curve: CurveName, value: number): SculptDoc {
  const next = cloneDoc(doc);
  const s = next.stations[i];
  if (curve === 'width') s.edit.width = Math.max(value, 0);
  else if (curve === 'dorsal') s.edit.dorsal = Math.max(value, s.edit.ventral);
  else s.edit.ventral = Math.min(value, s.edit.dorsal);
  return next;
}

export function setShift(doc: SculptDoc, i: number, shift: number): SculptDoc {
  const next = cloneDoc(doc);
  const [lo, hi] = shiftRange(next.stations, i);
  next.stations[i].shift = clamp(shift, lo, hi);
  return next;
}

export function setTangent(doc: SculptDoc, i: number, curve: CurveName, slopeValue: number | undefined): SculptDoc {
  const next = cloneDoc(doc);
  if (slopeValue === undefined) delete next.stations[i].tangent[curve];
  else next.stations[i].tangent[curve] = slopeValue;
  return next;
}

/** Puts a region (or everything) back to what was measured. */
export function resetStations(doc: SculptDoc, from = 0, to = doc.stations.length - 1): SculptDoc {
  const whole = from === 0 && to === doc.stations.length - 1;
  const next = whole ? resetFeatures(doc) : cloneDoc(doc);
  for (let i = from; i <= to; i++) {
    const s = next.stations[i];
    s.edit = { ...s.base }; s.shift = 0; s.tangent = {};
  }
  return next;
}

// ---------------------------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------------------------

/** The document as handed over: the table, with each station's change spelled out beside it. */
export function exportDoc(doc: SculptDoc) {
  const pct = (b: number, e: number) => (Math.abs(b) < EPS ? null : Math.round((e / b - 1) * 1000) / 10);
  return {
    format: 'cambrian-sculpt',
    version: doc.version,
    generated: new Date().toISOString(),
    creature: { key: doc.key, id: doc.id, collection: doc.collection, model: doc.model },
    frame: {
      ...doc.frame,
      note: `Model root frame, unscaled. Stations run along ${doc.frame.axis} in ascending order; the head is at the ${doc.frame.forward === 1 ? 'high' : 'low'} end. dorsal/ventral are ${doc.frame.up} extremes at the station, width the half-extent from the lateral midline. A tangent is the curve's slope (value per unit axis) where one was pulled by hand; otherwise the spline is Catmull-Rom through the stations.`,
    },
    bounds: doc.bounds,
    regions: doc.regions,
    changed: !isIdentity(doc),
    features: {
      eyes: doc.eyes ? {
        changed: eyesChanged(doc),
        mirrored: doc.eyes.mirrored,
        note: 'Centre of the eye on the positive-lateral side, root frame (axis/up/lateral as in `frame`); the other eye mirrors it. `delta` is edit − base. `scale` multiplies the eye radius; the surrounding skin follows out to `reach` radii.',
        base: doc.eyes.base, edit: doc.eyes.edit,
        delta: { axis: doc.eyes.edit.axis - doc.eyes.base.axis, up: doc.eyes.edit.up - doc.eyes.base.up, lateral: doc.eyes.edit.lateral - doc.eyes.base.lateral },
        radius: doc.eyes.radius, scale: doc.eyes.scale, reach: doc.eyes.reach,
        depthLateral: doc.eyes.depthLateral, depthTop: doc.eyes.depthTop,
      } : null,
      mouth: doc.mouth ? {
        changed: mouthChanged(doc),
        note: 'The mouth socket in the root frame and the region of `radius` × `reach` around it; `width` scales that region laterally, `height` vertically, `delta` moves it.',
        base: doc.mouth.base, edit: doc.mouth.edit,
        delta: { axis: doc.mouth.edit.axis - doc.mouth.base.axis, up: doc.mouth.edit.up - doc.mouth.base.up, lateral: doc.mouth.edit.lateral - doc.mouth.base.lateral },
        radius: doc.mouth.radius, reach: doc.mouth.reach, width: doc.mouth.width, height: doc.mouth.height,
      } : null,
    },
    stations: doc.stations.map((s, i) => ({
      index: i,
      headFraction: Math.round(s.headFraction * 1000) / 1000,
      axis: s.axis,
      shift: s.shift,
      editedAxis: s.axis + s.shift,
      dorsal: { base: s.base.dorsal, edit: s.edit.dorsal, percent: pct(s.base.dorsal, s.edit.dorsal), tangent: s.tangent.dorsal ?? null },
      ventral: { base: s.base.ventral, edit: s.edit.ventral, percent: pct(s.base.ventral, s.edit.ventral), tangent: s.tangent.ventral ?? null },
      width: { base: s.base.width, edit: s.edit.width, percent: pct(s.base.width, s.edit.width), tangent: s.tangent.width ?? null },
      height: { base: s.base.dorsal - s.base.ventral, edit: s.edit.dorsal - s.edit.ventral },
    })),
  };
}
