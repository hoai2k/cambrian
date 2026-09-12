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
}

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
}

export function measure(input: MeasureInput, meta: { key: string; id: string; collection: string; model: string }, count = STATION_COUNT): SculptDoc {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const c of input.chunks) for (let i = 0; i + 2 < c.length; i += 3) for (let k = 0; k < 3; k++) {
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
  for (const c of input.chunks) for (let i = 0; i + 2 < c.length; i += 3) {
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
  return {
    version: 1, ...meta,
    frame: { axis, forward, up: 'y' },
    bounds: { length, height: size[1], width: size[L], lateralMid: (lo[L] + hi[L]) / 2, axisMin: lo[A], axisMax: hi[A] },
    stations,
    regions: defaultRegions(stations),
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
export function warp(doc: SculptDoc, subdivisions = 48): (x: number, y: number, z: number, out: [number, number, number]) => void {
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
  return doc.stations.every((s) => s.shift === 0 && CURVES.every((c) => s.edit[c] === s.base[c] && s.tangent[c] === undefined));
}

// ---------------------------------------------------------------------------------------------
// Editing helpers (each returns a new document; the history keeps the old one)
// ---------------------------------------------------------------------------------------------

export function cloneDoc(doc: SculptDoc): SculptDoc {
  return {
    ...doc,
    bounds: { ...doc.bounds },
    stations: doc.stations.map((s) => ({ ...s, base: { ...s.base }, edit: { ...s.edit }, tangent: { ...s.tangent } })),
    regions: doc.regions.map((r) => ({ ...r })),
  };
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
  const next = cloneDoc(doc);
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
