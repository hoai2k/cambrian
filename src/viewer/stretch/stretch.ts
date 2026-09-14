/**
 * The stretch document: two cuts across a body, a direction, and how much longer the part between
 * them should be.
 *
 * A Tripo generation gets one thing wrong more often than anything else, and it is the thing a
 * profile table cannot fix: the *length* of a run of body. Dinocephalosaurus comes back with the
 * neck of an ordinary lizard, and no amount of moving the silhouette's stations up or down makes a
 * short neck a long one — sculpt reshapes the body it is given, station by station, and this
 * lengthens a stretch of it. So the two tools are separate and stay separate: sculpt for a shipped
 * body's proportions, this for a raw generation's segment lengths, before it is cleaned, rigged
 * and animated.
 *
 * The whole edit is four numbers:
 *
 *   - `from` is where the neck leaves the body and `to` where the head begins, each a place along
 *     the body axis.
 *   - `tiltSide` and `tiltTop` angle the direction the neck is drawn out in — in the side view and
 *     in the top view. A neck that leaves the shoulders rising and to the left is lengthened
 *     rising and to the left, rather than straight down the body axis.
 *   - `factor` is how much longer that part should be. 2 is twice the neck.
 *
 * Both cuts are square to that one direction — they share it rather than each carrying an
 * orientation of their own. Two independently angled cuts would let the region be wedge-shaped,
 * which is a different and much fiddlier edit; what is actually wanted is to aim the lengthening,
 * and one direction aims it. It also makes the map exact: between two parallel cuts, "how far
 * through the region" is plain distance over length, so the stretch is a true uniform scale of
 * that region along the direction, and nothing else in the animal moves except rigidly.
 *
 * What that does to a vertex: everything on the body side of `from` stays exactly where it is,
 * everything on the head side of `to` is carried rigidly away from the body, and the part between
 * is taken along in proportion to how far through it the vertex sits. The head keeps its shape and
 * the body keeps its shape; only the run between them is drawn out. The blend is linear, not
 * eased, because an eased one would pile the new length into the middle of the neck and leave it
 * pinched at both cuts.
 *
 * The seam this leaves is real and is the reason the cuts are yours to place: the surface is
 * continuous across a cut but its slope is not, so a cut through the middle of a smooth flank
 * shows as a faint crease at a large factor. Put them where the body already changes — the
 * shoulder, the base of the skull — and there is nothing to see.
 *
 * `factor` below 1 shortens. The tool is named for the job it was built for, but a generated neck
 * can as easily come back too long, and nothing here assumes the region is a neck at all: the same
 * two cuts stretch a tail, a torso or a snout.
 *
 * Pure: no DOM, no three.js. `npm run stretch` exercises it headlessly, and
 * `tools/triassic/stretch.mjs` bakes the same warp into a GLB, so what the viewer previews and
 * what lands in the file are one implementation rather than two that agree by inspection.
 */
import { frameFor, type SculptFrame } from '../sculpt/profile';

export type Vec3 = [number, number, number];
/** The same shape the scene's warp takes, so a stretch can be previewed exactly like a sculpt. */
export type WarpFn = (x: number, y: number, z: number, out: Vec3) => void;

/** Which way the body lies. Shared with the sculpt editor so both draw the same "side view". */
export type StretchFrame = SculptFrame;

export interface StretchDoc {
  version: 1;
  key: string;
  id: string;
  collection: string;
  model: string;
  frame: StretchFrame;
  /** Where the frame came from, so a wrong guess can be seen and said. */
  frameSource: FrameSource;
  /** The measured box in the root frame, which is what a change of frame re-derives `bounds` from. */
  box: { lo: Vec3; hi: Vec3 };
  bounds: {
    length: number; height: number; width: number;
    axisMin: number; axisMax: number; lateralMid: number; upMid: number;
  };
  /** How many vertices the measured mesh had, so a stretch cannot be applied to a different body. */
  vertices: number;
  /**
   * Whether the body carries a skeleton. A generated mesh does not, and a stretch of it is baked
   * into the GLB; a built body does, and every clip in these files re-specifies each joint's
   * translation on every frame, so a warped bind pose would show at rest and be overridden — and
   * deformed about joints left behind — the moment anything played. There the stretch is a
   * measurement to hand a builder, and the bake refuses it by name.
   */
  rigged: boolean;
  /** Where the cuts sit along the body axis: `from` nearer the tail, `to` nearer the head. */
  from: number;
  to: number;
  /**
   * The direction the region is drawn out in, as *the angles you see*: the cut lines lean by
   * `tiltSide` in the side view and by `tiltTop` in the top view, and neither drag moves the
   * other view's line. That is why the direction is built from tangents rather than as a
   * spherical (pitch, yaw) pair — with a spherical pair the side view's apparent angle depends on
   * the yaw, so tilting in the top view would shift a line the user had already set in the side
   * view, and a direction aimed in two passes would never settle.
   */
  tiltSide: number;
  tiltTop: number;
  /** The region's new length as a multiple of its own. 1 changes nothing. */
  factor: number;
}

/**
 * How a body's frame was decided, best first.
 *
 * The bounding box is last for a reason, and the reason has a name: Rhaeticosaurus. Its flipper
 * span is wider than the animal is long, so the longest side of its box runs *across* it, and a
 * tool that trusts the box draws the "side view" from the front and lays its cuts along the wings.
 * The box is a guess about a shape; the other three are statements about this body.
 */
export type FrameSource = 'mouth' | 'yaw' | 'bounds' | 'manual';

/**
 * The frame a generated body's authored yaw implies.
 *
 * `previewYaw` is how many degrees about +y turn this generation's head round to +z, which is
 * where every built body keeps it — so it says exactly where the head was before the turn: 0 is
 * already +z, 180 is −z, −90 is +x and +90 is −x. An off-cardinal estimate says nothing about a
 * cardinal axis and is refused rather than rounded into a wrong answer.
 */
export function frameFromYaw(yaw: number): StretchFrame | null {
  if (!Number.isFinite(yaw)) return null;
  const quarter = yaw / 90;
  if (Math.abs(quarter - Math.round(quarter)) > 1e-6) return null;
  switch (((Math.round(quarter) % 4) + 4) % 4) {
    case 0: return { axis: 'z', forward: 1, up: 'y' };
    case 2: return { axis: 'z', forward: -1, up: 'y' };
    case 3: return { axis: 'x', forward: 1, up: 'y' };   // −90
    default: return { axis: 'x', forward: -1, up: 'y' }; // +90
  }
}

/**
 * The frame a mouth socket implies: the head is where the mouth is, on whichever horizontal axis
 * it sits furthest along. `frameFor` uses the socket only to pick the *sign* after the box has
 * picked the axis, which is right for bodies the exporters lay out and wrong for anything else.
 */
export function frameFromMouth(lo: readonly number[], hi: readonly number[], mouth: readonly number[]): StretchFrame | null {
  const dx = mouth[0] - (lo[0] + hi[0]) / 2, dz = mouth[2] - (lo[2] + hi[2]) / 2;
  if (Math.abs(dx) < 1e-6 && Math.abs(dz) < 1e-6) return null;
  return Math.abs(dx) > Math.abs(dz)
    ? { axis: 'x', forward: dx >= 0 ? 1 : -1, up: 'y' }
    : { axis: 'z', forward: dz >= 0 ? 1 : -1, up: 'y' };
}

/**
 * The cuts may lean a long way but never lie down: at 90° they contain the body axis, the two
 * sides of a cut stop meaning front and back, and the region between them turns inside out. 70° is
 * past any real shoulder line and still safely short of that.
 */
export const MAX_TILT = 70 * Math.PI / 180;
export const MIN_FACTOR = 0.25, MAX_FACTOR = 4;
const EPS = 1e-9;

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);

// ---------------------------------------------------------------------------------------------
// Frame arithmetic
// ---------------------------------------------------------------------------------------------

/** Index of the body axis, the lateral axis and up, in root-frame xyz order. */
export const axes = (frame: StretchFrame) => ({ A: frame.axis === 'x' ? 0 : 2, L: frame.axis === 'x' ? 2 : 0, U: 1 });

/** The unit vector along the body towards the head. */
export function forwardVector(frame: StretchFrame): Vec3 {
  const { A } = axes(frame);
  const v: Vec3 = [0, 0, 0];
  v[A] = frame.forward;
  return v;
}

/**
 * The direction the region is drawn out in, and the normal both cuts share.
 *
 * Built as `forward + tan(tiltSide)·up + tan(tiltTop)·lateral` and normalized: projected into the
 * side view that is (1, tan tiltSide), whose angle is exactly `tiltSide`, and into the top view
 * (1, tan tiltTop). Each view therefore reads back the angle it set, which is the property the
 * editor's two independent drags depend on.
 */
export function stretchDirection(doc: Pick<StretchDoc, 'frame' | 'tiltSide' | 'tiltTop'>): Vec3 {
  const { A, L, U } = axes(doc.frame);
  const n: Vec3 = [0, 0, 0];
  n[A] = doc.frame.forward;
  n[U] = Math.tan(clamp(doc.tiltSide, -MAX_TILT, MAX_TILT));
  n[L] = Math.tan(clamp(doc.tiltTop, -MAX_TILT, MAX_TILT));
  const len = Math.hypot(n[0], n[1], n[2]) || 1;
  return [n[0] / len, n[1] / len, n[2] / len];
}

/** A cut's centre: where it crosses the body's own centre line. */
export function planeCentre(doc: StretchDoc, at: number): Vec3 {
  const { A, L, U } = axes(doc.frame);
  const c: Vec3 = [0, 0, 0];
  c[A] = at;
  c[U] = doc.bounds.upMid;
  c[L] = doc.bounds.lateralMid;
  return c;
}

/**
 * How long the region is now, measured along the direction it will stretch in.
 *
 * Always positive: the cuts are kept apart and in order, and `to` is the one nearer the head,
 * which is the direction's own side.
 */
export function regionLength(doc: StretchDoc): number {
  const d = stretchDirection(doc);
  const { A } = axes(doc.frame);
  // The two centres differ only along the body axis, so the projection is one term.
  return (doc.to - doc.from) * d[A];
}

/** How far the head end moves: the new length less the old one. */
export const shiftOf = (doc: StretchDoc): number => regionLength(doc) * (doc.factor - 1);

export const isIdentity = (doc: StretchDoc): boolean => Math.abs(doc.factor - 1) < 1e-6;

// ---------------------------------------------------------------------------------------------
// The warp
// ---------------------------------------------------------------------------------------------

/** The two cuts as (origin, shared normal) and the region's length, gathered once per warp. */
function geometry(doc: StretchDoc) {
  const d = stretchDirection(doc);
  const a = planeCentre(doc, doc.from), b = planeCentre(doc, doc.to);
  const base = a[0] * d[0] + a[1] * d[1] + a[2] * d[2];
  const span = (b[0] * d[0] + b[1] * d[1] + b[2] * d[2]) - base;
  return { d, base, span: Math.abs(span) < EPS ? EPS : span, shift: shiftOf(doc) };
}

/** The warp this document describes, ready for the scene or for a bake. */
export function warp(doc: StretchDoc): WarpFn {
  const { d, base, span, shift } = geometry(doc);
  return (x, y, z, out) => {
    // How far through the region: the point's distance along the direction, from the first cut,
    // over the region's length. Clamped, so the body behind is untouched and the head ahead is
    // carried rigidly.
    const s = (x * d[0] + y * d[1] + z * d[2] - base) / span;
    const t = s <= 0 ? 0 : s >= 1 ? 1 : s;
    out[0] = x + d[0] * shift * t;
    out[1] = y + d[1] * shift * t;
    out[2] = z + d[2] * shift * t;
  };
}

/**
 * How a normal is carried by the warp.
 *
 * Inside the region the map is a uniform scale by `factor` along `d` and nothing at all across it,
 * so its Jacobian is `I + (factor − 1)·d dᵀ`; a normal follows the inverse transpose, which for
 * that symmetric rank-one update is `I − (1 − 1/factor)·d dᵀ`. Outside, the map is a translation
 * and a normal passes through untouched.
 *
 * Worth having rather than recomputing normals from the triangles: a Tripo mesh's shading comes
 * with it, and a mesh-wide `computeVertexNormals` would throw that away and reshade every face of
 * the animal — including all the parts this edit does not touch — to pay for a change in the neck.
 */
export function normalWarp(doc: StretchDoc): (x: number, y: number, z: number, nx: number, ny: number, nz: number, out: Vec3) => void {
  const { d, base, span } = geometry(doc);
  const k = 1 - 1 / doc.factor;
  return (x, y, z, nx, ny, nz, out) => {
    const s = (x * d[0] + y * d[1] + z * d[2] - base) / span;
    if (s <= 0 || s >= 1 || k === 0) { out[0] = nx; out[1] = ny; out[2] = nz; return; }
    const dn = (d[0] * nx + d[1] * ny + d[2] * nz) * k;
    let ox = nx - d[0] * dn, oy = ny - d[1] * dn, oz = nz - d[2] * dn;
    const len = Math.hypot(ox, oy, oz);
    if (len > EPS) { ox /= len; oy /= len; oz /= len; }
    out[0] = ox; out[1] = oy; out[2] = oz;
  };
}

// ---------------------------------------------------------------------------------------------
// Measuring
// ---------------------------------------------------------------------------------------------

export interface StretchInput {
  /** Positions in the root frame as flat xyz triples, in any number of chunks. */
  chunks: ArrayLike<number>[];
  /** The mouth socket, when the model has one: the best statement of where the head is. */
  mouth?: [number, number, number];
  /** A generated body's authored yaw (`previewYaw`), when it has one. */
  yaw?: number;
  /** Whether the body carries a skeleton. */
  rigged?: boolean;
}

/**
 * Where the cuts start: a neck's worth of body behind the nose.
 *
 * A generation has no neck marked on it, so these are simply somewhere sensible to grab — the
 * front third of the animal, which is where a neck is on everything this tool is for. They are
 * meant to be dragged.
 */
export const DEFAULT_FROM = 0.34, DEFAULT_TO = 0.13;

/** The axial coordinate a fraction of the way back from the nose. */
export function axisAt(doc: StretchDoc, headFraction: number): number {
  const { axisMin, axisMax, length } = doc.bounds;
  return doc.frame.forward === 1 ? axisMax - headFraction * length : axisMin + headFraction * length;
}

/** How far back from the nose an axial coordinate is, as a fraction of the body. */
export function headFractionAt(doc: StretchDoc, at: number): number {
  const { axisMin, axisMax, length } = doc.bounds;
  return doc.frame.forward === 1 ? (axisMax - at) / length : (at - axisMin) / length;
}

export function measureStretch(input: StretchInput, meta: { key: string; id: string; collection: string; model: string }): StretchDoc {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  let vertices = 0;
  for (const c of input.chunks) for (let i = 0; i + 2 < c.length; i += 3) {
    vertices++;
    for (let k = 0; k < 3; k++) {
      const v = c[i + k];
      if (v < lo[k]) lo[k] = v;
      if (v > hi[k]) hi[k] = v;
    }
  }
  if (!Number.isFinite(lo[0])) throw new Error('measureStretch: no vertices');
  // Best statement first: the model's own landmark, then what the pipeline authored about this
  // generation, then — only if neither exists — the shape of the box.
  const byMouth = input.mouth ? frameFromMouth(lo, hi, input.mouth) : null;
  const byYaw = input.yaw === undefined ? null : frameFromYaw(input.yaw);
  const frame = byMouth ?? byYaw ?? frameFor(lo, hi, input.mouth);
  const frameSource: FrameSource = byMouth ? 'mouth' : byYaw ? 'yaw' : 'bounds';
  const doc: StretchDoc = {
    version: 1, ...meta, frame, frameSource, vertices, rigged: !!input.rigged,
    box: { lo: [lo[0], lo[1], lo[2]], hi: [hi[0], hi[1], hi[2]] },
    bounds: { length: 0, height: 0, width: 0, axisMin: 0, axisMax: 0, lateralMid: 0, upMid: 0 },
    from: 0, to: 0, tiltSide: 0, tiltTop: 0, factor: 1,
  };
  return reframe(doc, frame, frameSource);
}

/**
 * Put the body in a different frame: re-derive the bounds from the measured box and start the cuts
 * again at the defaults.
 *
 * The cuts cannot be carried across. They are coordinates on one axis, and the whole point of
 * changing the frame is that it was the wrong axis — a number that meant "a third of the way down
 * the body" would land somewhere across the flippers.
 */
export function reframe(doc: StretchDoc, frame: StretchFrame, frameSource: FrameSource = 'manual'): StretchDoc {
  const { A, L } = axes(frame);
  const { lo, hi } = doc.box;
  const next: StretchDoc = {
    ...doc, frame, frameSource,
    box: { lo: [...lo] as Vec3, hi: [...hi] as Vec3 },
    bounds: {
      length: Math.max(hi[A] - lo[A], 1e-6), height: hi[1] - lo[1], width: hi[L] - lo[L],
      axisMin: lo[A], axisMax: hi[A],
      lateralMid: (lo[L] + hi[L]) / 2, upMid: (lo[1] + hi[1]) / 2,
    },
    tiltSide: 0, tiltTop: 0,
    from: 0, to: 0,
  };
  next.from = axisAt(next, DEFAULT_FROM);
  next.to = axisAt(next, DEFAULT_TO);
  return next;
}

/** Which way the body runs. Changing it re-derives everything the old axis decided. */
export const setAxis = (doc: StretchDoc, axis: 'x' | 'z'): StretchDoc =>
  axis === doc.frame.axis ? doc : reframe(doc, { ...doc.frame, axis });

// ---------------------------------------------------------------------------------------------
// Edits
// ---------------------------------------------------------------------------------------------

export type PlaneName = 'from' | 'to';

export const cloneDoc = (doc: StretchDoc): StretchDoc => ({
  ...doc, bounds: { ...doc.bounds }, frame: { ...doc.frame },
  box: { lo: [...doc.box.lo] as Vec3, hi: [...doc.box.hi] as Vec3 },
});

/**
 * Slide a cut along the body.
 *
 * The two may not cross or meet: a region of no length has no length to be a multiple of, and one
 * turned inside out would fold the head back through the shoulders. They are kept a hundredth of
 * the body apart — close enough to butt them together, far enough that the length never divides
 * through zero.
 */
export function setPlaneAt(doc: StretchDoc, which: PlaneName, at: number): StretchDoc {
  const gap = doc.bounds.length * 0.01;
  const f = doc.frame.forward;
  // `to` is always nearer the head, which is the high end of the axis when forward is +1.
  const limited = which === 'from'
    ? (f === 1 ? Math.min(at, doc.to - gap) : Math.max(at, doc.to + gap))
    : (f === 1 ? Math.max(at, doc.from + gap) : Math.min(at, doc.from - gap));
  const next = cloneDoc(doc);
  next[which] = clamp(limited, doc.bounds.axisMin - doc.bounds.length, doc.bounds.axisMax + doc.bounds.length);
  return next;
}

/** Aim the lengthening. Both cuts stay square to it, so this re-angles them together. */
export function setTilt(doc: StretchDoc, view: 'side' | 'top', radians: number): StretchDoc {
  const next = cloneDoc(doc);
  const t = clamp(Number.isFinite(radians) ? radians : 0, -MAX_TILT, MAX_TILT);
  if (view === 'side') next.tiltSide = t; else next.tiltTop = t;
  return next;
}

export function setFactor(doc: StretchDoc, factor: number): StretchDoc {
  const next = cloneDoc(doc);
  next.factor = clamp(Number.isFinite(factor) ? factor : 1, MIN_FACTOR, MAX_FACTOR);
  return next;
}

/** Aim the lengthening straight down the body again, without moving the cuts. */
export function levelTilt(doc: StretchDoc): StretchDoc {
  const next = cloneDoc(doc);
  next.tiltSide = 0; next.tiltTop = 0;
  return next;
}

/** Back to no stretch, with the cuts and the direction left where they were put. */
export const resetFactor = (doc: StretchDoc): StretchDoc => setFactor(doc, 1);

/** Back to the defaults: no stretch, square down the body, cuts at the front third. */
export function resetAll(doc: StretchDoc): StretchDoc {
  const next = cloneDoc(doc);
  next.factor = 1; next.tiltSide = 0; next.tiltTop = 0;
  next.from = axisAt(doc, DEFAULT_FROM);
  next.to = axisAt(doc, DEFAULT_TO);
  return next;
}

/**
 * Which end the head is at.
 *
 * A raw generation carries no mouth socket to say, and `frameFor` then assumes the head faces
 * +axis — true of the exporters, not of a generation whose orientation has not been normalized
 * yet. So the editor asks, and the cuts keep their places on the body while swapping which of
 * them is the one nearer the tail.
 *
 * The tilts flip with it, which makes the direction the exact negation of what it was. That is
 * deliberate and is what keeps the edit steady on screen: a plane with a reversed normal is the
 * same plane, so the two cut lines stay drawn exactly where they were put, and all that turns
 * round is which way the region is drawn out — which is the whole of what was being corrected.
 */
export function flipForward(doc: StretchDoc): StretchDoc {
  const next = cloneDoc(doc);
  next.frame = { ...doc.frame, forward: doc.frame.forward === 1 ? -1 : 1 };
  next.frameSource = 'manual';
  next.from = doc.to; next.to = doc.from;
  next.tiltSide = -doc.tiltSide; next.tiltTop = -doc.tiltTop;
  return next;
}

// ---------------------------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------------------------

const round = (v: number, places = 6) => Math.round(v * 10 ** places) / 10 ** places;
const deg = (r: number) => round(r * 180 / Math.PI, 3);

/**
 * The document as handed over.
 *
 * Two audiences, so it says everything twice. `stretch` is the document itself, and is what
 * `tools/triassic/stretch.mjs` reads to reproduce this warp vertex for vertex — nothing is
 * inferred there and nothing rounded here that the maths depends on. Everything beside it is for
 * the person reading the file: the cuts as points and planes, the direction as a vector and as
 * angles, and what the region measures before and after, so a review can be "the neck goes from
 * 0.21 to 0.53 of the body" rather than a pair of tangents.
 */
export function exportDoc(doc: StretchDoc) {
  const d = stretchDirection(doc);
  const base = regionLength(doc);
  const plane = (which: PlaneName) => ({
    at: doc[which],
    headFraction: round(headFractionAt(doc, doc[which]), 4),
    centre: planeCentre(doc, doc[which]).map((v) => round(v)),
  });
  return {
    format: 'cambrian-stretch',
    version: doc.version,
    generated: new Date().toISOString(),
    creature: { key: doc.key, id: doc.id, collection: doc.collection, model: doc.model, vertices: doc.vertices, rigged: doc.rigged },
    /**
     * What this file is for. A generated body's stretch is baked into its GLB; a built body's is a
     * measurement, because every clip in a built file re-specifies each joint's translation on
     * every frame and a warped bind pose would be overridden the moment anything played.
     */
    appliesTo: doc.rigged ? 'builder' : 'generated-glb',
    frame: {
      ...doc.frame, source: doc.frameSource,
      note: `Model root frame, unscaled. The body runs along ${doc.frame.axis}; the head is at the ${doc.frame.forward === 1 ? 'high' : 'low'} end. Both cuts are square to \`direction\`, which is the unit vector below; tiltSide is the angle its line makes in the side view and tiltTop the angle in the top view, in radians from straight down the body.`,
    },
    bounds: doc.bounds,
    planes: { from: plane('from'), to: plane('to') },
    direction: {
      vector: d.map((v) => round(v)),
      tiltSide: doc.tiltSide, tiltTop: doc.tiltTop,
      tiltSideDegrees: deg(doc.tiltSide), tiltTopDegrees: deg(doc.tiltTop),
    },
    region: {
      length: round(base),
      stretched: round(base * doc.factor),
      factor: doc.factor,
      shift: round(shiftOf(doc)),
      percentOfBody: round(base / doc.bounds.length * 100, 2),
    },
    changed: !isIdentity(doc),
    note: 'Vertices on the body side of `from` are unchanged; vertices on the head side of `to` move by direction.vector × region.shift; between the cuts a vertex moves by that times its own fraction through the region, measured along the direction. Normals follow the inverse transpose of that map. See docs/viewer-stretch.md.'
      + (doc.rigged
        ? ' This body is rigged, so nothing here can be baked into its GLB: `npm run triassic:stretch` refuses it. The numbers are the measurement to take to the builder — and, for a large factor, to the canonical pose.'
        : ' `npm run triassic:stretch -- <this file> --write` applies it.'),
    stretch: doc,
  };
}

export type StretchExport = ReturnType<typeof exportDoc>;

/**
 * Read a document back out of an exported file.
 *
 * The bake tool and the test both go through here rather than reaching into the payload, so "the
 * export is enough to reproduce the warp" is one claim in one place and a test can hold it.
 */
export function fromExport(payload: unknown): StretchDoc {
  const p = payload as Partial<StretchExport> | null;
  if (!p || typeof p !== 'object') throw new Error('not a stretch file');
  if (p.format !== 'cambrian-stretch') throw new Error(`not a stretch file (format "${String(p.format)}")`);
  const doc = p.stretch as StretchDoc | undefined;
  if (!doc || typeof doc !== 'object') throw new Error('stretch file has no document');
  for (const k of ['from', 'to', 'tiltSide', 'tiltTop', 'factor'] as const) {
    if (!Number.isFinite(doc[k])) throw new Error(`stretch file has no usable "${k}"`);
  }
  if (!doc.frame || (doc.frame.axis !== 'x' && doc.frame.axis !== 'z')) throw new Error('stretch file has no usable frame');
  if (!doc.bounds || !Number.isFinite(doc.bounds.length)) throw new Error('stretch file has no usable bounds');
  return doc;
}
