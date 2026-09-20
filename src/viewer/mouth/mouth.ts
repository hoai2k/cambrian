/**
 * The mouth document: a cut plane and a hinge, aimed by hand on the body on stage.
 *
 * Every Tripo-derived builder decides where the mouth is by *measurement* — cast head normals
 * back into the mesh and fit the hits, read the lip line off the albedo, take the darkest row of
 * the pale flank — and each of those methods has been fooled at least once: Keichousaurus'
 * countershading, a cephalopod's neighbouring arms, Mosasaurus' tail read as a gaping head
 * (CLAUDE.md, the mouth rule). What none of them offered was a way for a person to *look* at the
 * animal, say "the hinge is here, the mouth runs like this", and hand that over as numbers. This
 * is that: the cut as a human aims it, in the model's own frame, exportable either for exact use
 * (a builder reads the hinge and the plane straight off the file) or for guidance (a reviewer
 * hands the file to the builder's author and says "this far back, this angle").
 *
 * The whole edit is six numbers on top of the body's frame:
 *
 *   - `depth` — how far back from the nose the hinge sits, along the body axis. This is the one
 *     the project owner asked for first: how deep the cut goes, which is where the jaw pivots.
 *   - `up`, `lateral` — where the hinge sits in the head's section: the mouth line's height and
 *     its seat left or right of the midline. Together with `depth` they *reposition* the mouth.
 *   - `pitch` — the angle of the mouth line in profile: positive lifts the line towards the nose.
 *   - `yaw` — the hinge line turned in plan, so one side's hinge sits further back than the other.
 *   - `roll` — the plane tipped about the mouth line, so one corner of the mouth sits higher.
 *
 * From those, one orthonormal basis: `forward` runs from the hinge along the mouth line to the
 * nose, `hinge` runs across the head along the pivot, and `normal` is up out of the mouth, the
 * skull's side. The **cut plane** is through the hinge centre with that normal; the **mandible**
 * is everything below it *and* ahead of the hinge — the second half-space is what stops the cut
 * running back through the neck, and its normal is `forward`, so the two are square to each
 * other. Nothing here is a mesh operation: the document is a test a vertex passes or fails, which
 * is what the stage lights and what the counts in the export are made of.
 *
 * The angles compose yaw, then pitch, then roll (about the up axis, then the turned lateral, then
 * the tilted forward), so with the other two at zero each reads exactly as its own view shows it:
 * pitch is the angle in the side view, yaw the angle in the top view, roll the angle seen from the
 * front. With all three set they interact — that is the price of three angles — and the export
 * therefore carries the basis vectors as well as the angles, so a consumer never recomposes them.
 *
 * The first guess follows the stretcher's precedence, best statement first. A rigged body carries
 * a `jaw` bone whose head *is* its hinge, and an `anchor_mouth` socket out at the lips that sets
 * the line's pitch; a body with only the socket seats the line at the socket's height; a raw
 * generation has neither and gets the front of the body's own section, a fraction of its length
 * back — a place to start dragging from, and the panel says so.
 *
 * Pure: no DOM, no three.js. `npm run mouth` exercises it headlessly, and
 * `tools/triassic/mouth-check.ts` reads an export back with `fromExport`, so what the viewer
 * measured and what a consumer refuses are one contract in one place.
 */
import { frameFor, type SculptFrame } from '../sculpt/profile';
import { axes, forwardVector, frameFromMouth, frameFromYaw, type FrameSource } from '../stretch/stretch';

export type Vec3 = [number, number, number];
export type MouthFrame = SculptFrame;

/**
 * Where the hinge and the mouth line were first put, best first.
 *
 *   - `jaw`: the body's own `jaw` bone is the hinge, and `anchor_mouth` set the pitch.
 *   - `socket`: no jaw bone, but `anchor_mouth` said how high the mouth is.
 *   - `guess`: nothing on the body says; the front of the section a fraction of the length back.
 *   - `manual`: a human has moved it, which is the expected end state on every body.
 */
export type SeatSource = 'jaw' | 'socket' | 'guess' | 'manual';

export interface MouthDoc {
  version: 1;
  key: string;
  id: string;
  collection: string;
  model: string;
  frame: MouthFrame;
  frameSource: FrameSource;
  /** The measured box in the root frame, which a change of frame re-derives `bounds` from. */
  box: { lo: Vec3; hi: Vec3 };
  bounds: {
    length: number; height: number; width: number;
    axisMin: number; axisMax: number; lateralMid: number; upMid: number;
  };
  /**
   * The head's own section — the front `HEAD_SHARE` of the body — so the helpers on stage are
   * sized to the head rather than to the animal, and a guessed mouth line starts inside it.
   */
  head: { height: number; width: number; upMid: number; lateralMid: number };
  /** How many vertices the measured mesh had, so a cut cannot be applied to a different body. */
  vertices: number;
  rigged: boolean;
  seatSource: SeatSource;
  /** How far back from the nose the hinge sits, along the body axis, in model units. */
  depth: number;
  /** The hinge's height and lateral seat, in root-frame coordinates. */
  up: number;
  lateral: number;
  /** Radians. See the file comment for what each one turns. */
  pitch: number;
  yaw: number;
  roll: number;
}

/**
 * The angles may go a long way but not so far that the plane lies along the body: at 90° pitch
 * the "mandible side" is the whole front of the animal and the hinge line is vertical. 60° is past
 * any real mouth line and still safely short of that.
 */
export const MAX_ANGLE = 60 * Math.PI / 180;
/** Where a guessed hinge starts: a head's worth back from the nose, on everything this is for. */
export const DEFAULT_DEPTH = 0.12;
/**
 * The front share of the body measured as "the head" for sizing the helpers and seating a guess.
 * Short on purpose: at a fifth of the body the box on Placodus took in the forelimb paddles and
 * drew a plane three units wide over a head two thirds of a unit across.
 */
export const HEAD_SHARE = 0.15;

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (v: Vec3): Vec3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const add = (a: Vec3, b: Vec3, s = 1): Vec3 => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];

// ---------------------------------------------------------------------------------------------
// Frame arithmetic
// ---------------------------------------------------------------------------------------------

/** The axial coordinate a distance back from the nose. */
export function axisBack(doc: Pick<MouthDoc, 'frame' | 'bounds'>, back: number): number {
  return doc.frame.forward === 1 ? doc.bounds.axisMax - back : doc.bounds.axisMin + back;
}

/** How far back from the nose an axial coordinate is. */
export function backOf(doc: Pick<MouthDoc, 'frame' | 'bounds'>, at: number): number {
  return doc.frame.forward === 1 ? doc.bounds.axisMax - at : at - doc.bounds.axisMin;
}

/** The unit vector across the body, towards +lateral. */
function lateralVector(frame: MouthFrame): Vec3 {
  const { L } = axes(frame);
  const v: Vec3 = [0, 0, 0];
  v[L] = 1;
  return v;
}

/** The cut, as the three directions and the point they meet at. All unit, all root frame. */
export interface CutBasis {
  centre: Vec3;
  /** From the hinge along the mouth line to the nose. The mandible is ahead of the hinge along this. */
  forward: Vec3;
  /** Along the pivot, across the head. */
  hinge: Vec3;
  /** Up out of the mouth: the skull's side of the cut plane. */
  normal: Vec3;
}

/**
 * The basis the document describes: yaw about up, pitch about the turned lateral, roll about the
 * tilted forward. Composed in that order so each angle reads as its own view's angle when the
 * others are zero, which is the property the numeric fields are named for.
 */
export function cutBasis(doc: Pick<MouthDoc, 'frame' | 'bounds' | 'depth' | 'up' | 'lateral' | 'pitch' | 'yaw' | 'roll'>): CutBasis {
  const f = forwardVector(doc.frame), l = lateralVector(doc.frame), u: Vec3 = [0, 1, 0];
  const cy = Math.cos(doc.yaw), sy = Math.sin(doc.yaw);
  const f1: Vec3 = add([f[0] * cy, f[1] * cy, f[2] * cy], l, sy);
  const l1: Vec3 = add([l[0] * cy, l[1] * cy, l[2] * cy], f, -sy);
  const cp = Math.cos(doc.pitch), sp = Math.sin(doc.pitch);
  const f2: Vec3 = add([f1[0] * cp, f1[1] * cp, f1[2] * cp], u, sp);
  const u2: Vec3 = add([u[0] * cp, u[1] * cp, u[2] * cp], f1, -sp);
  const cr = Math.cos(doc.roll), sr = Math.sin(doc.roll);
  const l3: Vec3 = add([l1[0] * cr, l1[1] * cr, l1[2] * cr], u2, sr);
  const u3: Vec3 = add([u2[0] * cr, u2[1] * cr, u2[2] * cr], l1, -sr);
  const { A, L, U } = axes(doc.frame);
  const centre: Vec3 = [0, 0, 0];
  centre[A] = axisBack(doc, doc.depth);
  centre[U] = doc.up;
  centre[L] = doc.lateral;
  return { centre, forward: norm(f2), hinge: norm(l3), normal: norm(u3) };
}

/**
 * The test itself: below the cut plane and ahead of the hinge. Returned as a closure over the
 * basis so the stage can run it over a hundred thousand vertices without rebuilding it.
 */
export function mandibleTest(doc: MouthDoc): (x: number, y: number, z: number) => boolean {
  const { centre, forward, normal } = cutBasis(doc);
  const [cx, cy, cz] = centre;
  return (x, y, z) => {
    const dx = x - cx, dy = y - cy, dz = z - cz;
    return dx * normal[0] + dy * normal[1] + dz * normal[2] < 0
      && dx * forward[0] + dy * forward[1] + dz * forward[2] > 0;
  };
}

export interface SideCounts { mandible: number; skull: number; total: number }

/** How many vertices the cut takes onto the mandible, and how many it leaves. */
export function countSides(chunks: readonly ArrayLike<number>[], doc: MouthDoc): SideCounts {
  const test = mandibleTest(doc);
  let mandible = 0, total = 0;
  for (const c of chunks) for (let i = 0; i + 2 < c.length; i += 3) {
    total++;
    if (test(c[i], c[i + 1], c[i + 2])) mandible++;
  }
  return { mandible, skull: total - mandible, total };
}

// ---------------------------------------------------------------------------------------------
// Measuring
// ---------------------------------------------------------------------------------------------

export interface MouthInput {
  /** Positions in the root frame as flat xyz triples, in any number of chunks. */
  chunks: readonly ArrayLike<number>[];
  /** The `anchor_mouth` socket, root frame, when the body has one: where the lips are. */
  mouth?: Vec3;
  /** The `anchor_mouth_inside` socket, when the body has one. Recorded; the hinge does not read it. */
  mouthInside?: Vec3;
  /** The `jaw` bone's head, root frame, when the body has one: the rig's own hinge. */
  jaw?: Vec3;
  /** A generated body's authored yaw (`previewYaw`), when it has one. */
  yaw?: number;
  rigged?: boolean;
}

export function measureMouth(input: MouthInput, meta: { key: string; id: string; collection: string; model: string }): MouthDoc {
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
  if (!Number.isFinite(lo[0])) throw new Error('measureMouth: no vertices');
  // Best statement first: the model's own landmark, then what the pipeline authored about this
  // generation, then — only if neither exists — the shape of the box. The same order the
  // stretcher uses, for the same reason (Rhaeticosaurus' box runs across its flippers).
  const byMouth = input.mouth ? frameFromMouth(lo, hi, input.mouth) : null;
  const byYaw = input.yaw === undefined ? null : frameFromYaw(input.yaw);
  const frame = byMouth ?? byYaw ?? frameFor(lo, hi, input.mouth);
  const frameSource: FrameSource = byMouth ? 'mouth' : byYaw ? 'yaw' : 'bounds';
  const doc: MouthDoc = {
    version: 1, ...meta, frame, frameSource, vertices, rigged: !!input.rigged,
    box: { lo: [lo[0], lo[1], lo[2]], hi: [hi[0], hi[1], hi[2]] },
    bounds: { length: 0, height: 0, width: 0, axisMin: 0, axisMax: 0, lateralMid: 0, upMid: 0 },
    head: { height: 0, width: 0, upMid: 0, lateralMid: 0 },
    seatSource: 'guess', depth: 0, up: 0, lateral: 0, pitch: 0, yaw: 0, roll: 0,
  };
  return reframe(doc, frame, frameSource, input);
}

/** The head's section: the box of every vertex in the front `HEAD_SHARE` of the body. */
export function measureHead(chunks: readonly ArrayLike<number>[], doc: Pick<MouthDoc, 'frame' | 'bounds'>): MouthDoc['head'] {
  const { A, L, U } = axes(doc.frame);
  const back = doc.bounds.length * HEAD_SHARE;
  let uLo = Infinity, uHi = -Infinity, lLo = Infinity, lHi = -Infinity;
  for (const c of chunks) for (let i = 0; i + 2 < c.length; i += 3) {
    if (backOf(doc, c[i + A]) > back) continue;
    const u = c[i + U], l = c[i + L];
    if (u < uLo) uLo = u; if (u > uHi) uHi = u;
    if (l < lLo) lLo = l; if (l > lHi) lHi = l;
  }
  if (!Number.isFinite(uLo)) return { height: doc.bounds.height, width: doc.bounds.width, upMid: doc.bounds.upMid, lateralMid: doc.bounds.lateralMid };
  return { height: Math.max(uHi - uLo, 1e-6), width: Math.max(lHi - lLo, 1e-6), upMid: (uLo + uHi) / 2, lateralMid: (lLo + lHi) / 2 };
}

/**
 * Put the body in a different frame: re-derive the bounds and the head from the measured box and
 * seat the hinge again from whatever the body says about it.
 *
 * The hinge cannot be carried across a change of axis: it is a depth along one axis, and the
 * whole point of changing the frame is that it was the wrong axis. With `input` the seat is
 * re-derived from the rig; without it (a manual re-frame in the panel) it is the guess.
 */
export function reframe(doc: MouthDoc, frame: MouthFrame, frameSource: FrameSource = 'manual', input?: MouthInput): MouthDoc {
  const { A, L } = axes(frame);
  const { lo, hi } = doc.box;
  const next: MouthDoc = {
    ...doc, frame, frameSource,
    box: { lo: [...lo] as Vec3, hi: [...hi] as Vec3 },
    bounds: {
      length: Math.max(hi[A] - lo[A], 1e-6), height: hi[1] - lo[1], width: hi[L] - lo[L],
      axisMin: lo[A], axisMax: hi[A],
      lateralMid: (lo[L] + hi[L]) / 2, upMid: (lo[1] + hi[1]) / 2,
    },
    pitch: 0, yaw: 0, roll: 0,
  };
  next.head = input ? measureHead(input.chunks, next) : { ...doc.head };
  return seat(next, input);
}

/**
 * The first guess at the hinge and the mouth line, from the best thing the body says.
 *
 * A `jaw` bone's head is the rig's own hinge, so it is taken whole: depth, height and seat. The
 * `anchor_mouth` socket sits out at the lips, so the line from the hinge to it is the mouth line
 * and its angle in profile is the pitch. A body with only the socket gets the socket's height and
 * a guessed depth. A raw generation gets the head's own section, a little below its middle —
 * where a mouth is on most of these animals — and the panel says it is a guess.
 */
export function seat(doc: MouthDoc, input?: MouthInput): MouthDoc {
  const { A, L, U } = axes(doc.frame);
  const next: MouthDoc = { ...doc, head: { ...doc.head } };
  const jaw = input?.jaw, mouth = input?.mouth;
  if (jaw) {
    next.seatSource = 'jaw';
    next.depth = backOf(doc, jaw[A]);
    next.up = jaw[U];
    next.lateral = jaw[L];
    if (mouth) {
      const along = doc.frame.forward * (mouth[A] - jaw[A]), rise = mouth[U] - jaw[U];
      next.pitch = along > 1e-9 ? clamp(Math.atan2(rise, along), -MAX_ANGLE, MAX_ANGLE) : 0;
    }
  } else if (mouth) {
    next.seatSource = 'socket';
    next.depth = doc.bounds.length * DEFAULT_DEPTH;
    next.up = mouth[U];
    next.lateral = mouth[L];
  } else {
    next.seatSource = 'guess';
    next.depth = doc.bounds.length * DEFAULT_DEPTH;
    next.up = doc.head.upMid - doc.head.height * 0.1;
    next.lateral = doc.head.lateralMid;
  }
  return next;
}

/** Which way the body runs. Changing it re-derives everything the old axis decided. */
export const setAxis = (doc: MouthDoc, axis: 'x' | 'z'): MouthDoc =>
  axis === doc.frame.axis ? doc : reframe(doc, { ...doc.frame, axis });

/**
 * Which end the head is at. The hinge keeps its place on the body — its depth is measured from
 * the other nose now — and pitch and yaw are negated, which keeps the plane and the hinge line
 * exactly where they were drawn while turning round which side of the hinge the mandible is.
 * A human corrected the frame; the cut they had aimed should not move under them.
 */
export function flipForward(doc: MouthDoc): MouthDoc {
  const next = cloneDoc(doc);
  next.frame = { ...doc.frame, forward: doc.frame.forward === 1 ? -1 : 1 };
  next.frameSource = 'manual';
  next.depth = doc.bounds.length - doc.depth;
  next.pitch = -doc.pitch; next.yaw = -doc.yaw;
  return next;
}

// ---------------------------------------------------------------------------------------------
// Edits
// ---------------------------------------------------------------------------------------------

export const cloneDoc = (doc: MouthDoc): MouthDoc => ({
  ...doc, bounds: { ...doc.bounds }, head: { ...doc.head }, frame: { ...doc.frame },
  box: { lo: [...doc.box.lo] as Vec3, hi: [...doc.box.hi] as Vec3 },
});

const edited = (doc: MouthDoc): MouthDoc => { const next = cloneDoc(doc); next.seatSource = 'manual'; return next; };

/** How far back the hinge goes. Kept on the body: never ahead of the nose or behind the tail. */
export function setDepth(doc: MouthDoc, depth: number): MouthDoc {
  const next = edited(doc);
  next.depth = clamp(Number.isFinite(depth) ? depth : doc.depth, 0, doc.bounds.length);
  return next;
}

export function setUp(doc: MouthDoc, up: number): MouthDoc {
  const next = edited(doc);
  next.up = Number.isFinite(up) ? clamp(up, doc.box.lo[1] - doc.bounds.height, doc.box.hi[1] + doc.bounds.height) : doc.up;
  return next;
}

export function setLateral(doc: MouthDoc, lateral: number): MouthDoc {
  const { L } = axes(doc.frame);
  const next = edited(doc);
  next.lateral = Number.isFinite(lateral) ? clamp(lateral, doc.box.lo[L] - doc.bounds.width, doc.box.hi[L] + doc.bounds.width) : doc.lateral;
  return next;
}

export type AngleName = 'pitch' | 'yaw' | 'roll';

export function setAngle(doc: MouthDoc, which: AngleName, radians: number): MouthDoc {
  const next = edited(doc);
  next[which] = clamp(Number.isFinite(radians) ? radians : 0, -MAX_ANGLE, MAX_ANGLE);
  return next;
}

/**
 * Carry the hinge by a root-frame displacement — what a drag on the hinge handle asks for. Along
 * the body it changes the depth, up and down the height, across the seat; whichever of the three
 * the camera happens to show.
 */
export function moveHinge(doc: MouthDoc, delta: Vec3): MouthDoc {
  const { A, L, U } = axes(doc.frame);
  let next = setDepth(doc, doc.depth - doc.frame.forward * delta[A]);
  next = setUp(next, doc.up + delta[U]);
  return setLateral(next, doc.lateral + delta[L]);
}

/**
 * Aim the mouth line at a root-frame direction from the hinge — what a drag on the front handle
 * asks for. Only pitch and yaw answer: the basis composes them so that `forward` is
 * `(cos p cos y, sin p, cos p sin y)` in the (body, up, lateral) frame, which inverts cleanly.
 * Behind the hinge the direction says nothing about the mouth, so it is refused rather than
 * turned into a yaw past ninety degrees.
 */
export function aimForward(doc: MouthDoc, dir: Vec3): MouthDoc {
  const d = norm(dir);
  const along = dot(d, forwardVector(doc.frame)), across = dot(d, lateralVector(doc.frame)), rise = d[1];
  if (along <= 1e-6) return doc;
  let next = setAngle(doc, 'yaw', Math.atan2(across, along));
  next = setAngle(next, 'pitch', Math.asin(clamp(rise, -1, 1)));
  return next;
}

/**
 * Turn the hinge line towards a root-frame direction from the centre — what a drag on the side
 * handle asks for. Only roll answers: the direction is projected onto the plane the hinge turns
 * in (across the tilted forward), and roll is its angle there from the level hinge.
 */
export function aimHinge(doc: MouthDoc, dir: Vec3): MouthDoc {
  const level = cutBasis({ ...doc, roll: 0 });
  const across = dot(dir, level.hinge), rise = dot(dir, level.normal);
  if (Math.abs(across) + Math.abs(rise) < 1e-9) return doc;
  // The handle is on the +hinge side; dragging it round the far side would ask for a roll past
  // ninety degrees, which the clamp refuses, so the sign is taken from the near side.
  const a = across >= 0 ? Math.atan2(rise, across) : Math.atan2(-rise, -across);
  return setAngle(doc, 'roll', a);
}

/** Square the cut again: level in profile, straight across, flat. The hinge stays where it is. */
export function levelCut(doc: MouthDoc): MouthDoc {
  const next = edited(doc);
  next.pitch = 0; next.yaw = 0; next.roll = 0;
  return next;
}

// ---------------------------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------------------------

/**
 * What the body on stage is, so a consumer knows which file the cut describes. A raw generation
 * (the untouched Tripo mesh, or a builder's original-pose copy of it), the generation's preview,
 * a built body, or its procedural twin.
 */
export type AppliesTo = 'generation' | 'preview' | 'built' | 'twin';

export interface MouthExportInput {
  /** The hash of the exact file on stage, and where it came from: measured in the browser, or the manifest's. */
  sha256: string | null;
  sha256Source: 'measured' | 'manifest' | null;
  appliesTo: AppliesTo;
  sides: SideCounts;
  note: string;
  authoredAt: string;
}

const round = (v: number, places = 6) => Math.round(v * 10 ** places) / 10 ** places;
const deg = (r: number) => round(r * 180 / Math.PI, 3);
const r3 = (v: Vec3) => v.map((x) => round(x)) as Vec3;

/**
 * The document as handed over.
 *
 * Two audiences, so it says everything twice. `mouth` is the document itself, and is what
 * `fromExport` reads to rebuild the same test vertex for vertex. Everything beside it is for the
 * person reading the file: the hinge as a point and a line, the plane as a point and a normal,
 * the angles in degrees, and how many vertices fall each side — so a review can be "the hinge is
 * 0.61 back, the line rises four degrees" rather than a set of radians. The hash is the contract:
 * a consumer measures the file it is about to act on and refuses a cut aimed at another one.
 */
export function exportDoc(doc: MouthDoc, input: MouthExportInput) {
  const basis = cutBasis(doc);
  return {
    schema: 'mouth-cut/1' as const,
    id: doc.id,
    model: doc.model,
    sha256: input.sha256,
    sha256Source: input.sha256Source,
    appliesTo: input.appliesTo,
    authoredAt: input.authoredAt,
    note: input.note,
    creature: { key: doc.key, id: doc.id, collection: doc.collection, vertices: doc.vertices, rigged: doc.rigged },
    frame: {
      ...doc.frame, source: doc.frameSource,
      note: `Model root frame, unscaled: the file's own coordinates with the scene graph flattened. The body runs along ${doc.frame.axis}; the head is at the ${doc.frame.forward === 1 ? 'high' : 'low'} end.`,
    },
    seat: { source: doc.seatSource },
    hinge: {
      depth: round(doc.depth),
      headFraction: round(doc.depth / doc.bounds.length, 4),
      centre: r3(basis.centre),
      axis: r3(basis.hinge),
    },
    plane: {
      point: r3(basis.centre),
      normal: r3(basis.normal),
      forward: r3(basis.forward),
      pitch: doc.pitch, yaw: doc.yaw, roll: doc.roll,
      pitchDegrees: deg(doc.pitch), yawDegrees: deg(doc.yaw), rollDegrees: deg(doc.roll),
    },
    sides: input.sides,
    bounds: doc.bounds,
    head: doc.head,
    rule: 'A vertex is on the mandible when (v − plane.point) · plane.normal < 0 and (v − plane.point) · plane.forward > 0: below the cut plane and ahead of the hinge. hinge.axis is the pivot the jaw swings about, through hinge.centre. See docs/viewer-mouth.md.',
    mouth: doc,
  };
}

export type MouthExport = ReturnType<typeof exportDoc>;

/**
 * Read a document back out of an exported file, refusing one aimed at a different mesh.
 *
 * Every consumer goes through here rather than reaching into the payload, so "the export is enough
 * to rebuild the same test, and is refused on the wrong body" is one claim in one place. `actual`
 * is what the consumer measured on the file it is about to act on; a hash that does not match is
 * a cut aimed at a mesh that has since changed, and a vertex count that does not match is the
 * same thing said by a file that carried no hash.
 */
export function fromExport(payload: unknown, actual?: { sha256?: string | null; vertices?: number }): MouthDoc {
  const p = payload as Partial<MouthExport> | null;
  if (!p || typeof p !== 'object') throw new Error('not a mouth file');
  if (p.schema !== 'mouth-cut/1') throw new Error(`not a mouth file (schema "${String(p.schema)}")`);
  const doc = p.mouth as MouthDoc | undefined;
  if (!doc || typeof doc !== 'object') throw new Error('mouth file has no document');
  for (const k of ['depth', 'up', 'lateral', 'pitch', 'yaw', 'roll'] as const) {
    if (!Number.isFinite(doc[k])) throw new Error(`mouth file has no usable "${k}"`);
  }
  if (!doc.frame || (doc.frame.axis !== 'x' && doc.frame.axis !== 'z')) throw new Error('mouth file has no usable frame');
  if (!doc.bounds || !Number.isFinite(doc.bounds.length)) throw new Error('mouth file has no usable bounds');
  if (actual) {
    if (p.sha256 && actual.sha256 && p.sha256 !== actual.sha256) {
      throw new Error(`mouth file was authored on ${p.model} at sha256 ${p.sha256.slice(0, 12)}… but the file is now ${actual.sha256.slice(0, 12)}…: the body has changed since the cut was aimed`);
    }
    if (actual.vertices !== undefined && doc.vertices && doc.vertices !== actual.vertices) {
      throw new Error(`mouth file was measured on ${doc.vertices} vertices but the body has ${actual.vertices}: the body has changed since the cut was aimed`);
    }
  }
  return doc;
}

/** "1,204 of 12,059 vertices on the mandible · 10.0%" — the live readout. */
export function describeSides(sides: SideCounts): string {
  const share = sides.total > 0 ? (sides.mandible / sides.total) * 100 : 0;
  return `${sides.mandible.toLocaleString('en')} of ${sides.total.toLocaleString('en')} vertices on the mandible · ${share.toFixed(share < 1 ? 2 : 1)}%`;
}
