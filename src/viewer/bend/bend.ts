/**
 * The bend document: two **oriented planes** on a body, and the turn that carries the creature's
 * axis line from the one to the other.
 *
 * It exists because of a diagnosis that went wrong three times on the same animal. Askeptosaurus'
 * head stood **67.7°** off its trunk; a coordinator first derived 78.6° by adding a chain's
 * *absolute* per-joint turn to its takeoff, when that chain was an S whose signed turn was three
 * degrees and which therefore barely deflected the head at all; and underneath both, three
 * defensible readings of "the trunk" — the `body`→`chest` chord, the hip-to-shoulder run and the
 * measured axis' tangent at the shoulder — disagreed with each other by up to 43°
 * (`tools/triassic/creatures/askeptosaurus/validation.json`, the `axis.front` block). Every number
 * in that argument was a measurement somebody had to take on trust, and none of them was ever
 * looked at.
 *
 * So the point of this tool is the **readout**, not the warp: put the span on the animal by hand,
 * see what it currently measures, turn it, and see what it measures then — with the definition
 * being measured named on the screen, and, where the body is rigged, the geometry's answer and the
 * bone chain's answer side by side, because those are the two that disagreed.
 *
 * ## The span is two points on the animal
 *
 * `base` and `tip` are places on the body — where the neck leaves the shoulder, where the head
 * begins — and everything else follows from them. The span's direction is the line between them,
 * both cuts are square to it, and its length is the distance between them. There is no third number
 * aiming it and no axis it has to lie along: the stretcher aims its lengthening with two tilts
 * because its cuts are placed as coordinates on the body axis, and placing them as *points*
 * instead makes the aim the same act as the placement.
 *
 * That is not a tidiness. Askeptosaurus' neck leaves its shoulder at **61° to its own long axis** —
 * the animal is curled, and the frame's axis is the box's, not the neck's — so cuts square to that
 * axis would cover half the neck's length and the bend about them would swing the head rather than
 * bend the neck. Two points put the span on the neck.
 *
 * ## The two planes
 *
 * Each end of the span is a **plane with its own orientation**, and a plane's normal is the
 * direction the creature's axis line runs through it. That is the whole control:
 *
 *   - `baseNormal` — where the axis line runs **in**. It is the **reference**, and it never moves
 *     the body: nothing behind the base cut is touched by any bend. What a reviewer aiming it is
 *     saying is *which direction they are calling the trunk* — which is the argument this tool was
 *     built out of, three defensible readings of one animal's trunk 43° apart, made into a thing
 *     you can point at.
 *   - `tipRest` — where the axis line ran **out** when the plane was seated on the body. Measured,
 *     never typed: it is the animal's own heading at that end and the pivot the turn is taken from.
 *   - `tipNormal` — where the axis line is **to** run out. Seated equal to `tipRest`, so the editor
 *     opens on the body as it is.
 *
 * The bend is the rotation that carries `tipRest` onto `tipNormal`, spread linearly across the
 * span. So **aim both planes the same way and the run between them comes straight**: with
 * `tipNormal` set to `baseNormal`, the head's own heading is turned onto the trunk's, which is
 * exactly what straightening a curve is. Nothing else has to be dialled for it.
 *
 * What that does to a vertex: everything on the body side of the base cut stays exactly where it
 * is, everything past the tip cut is carried **rigidly** by the whole rotation — so the head is
 * moved without being deformed — and the part between is bent, turning progressively along its own
 * length. The blend is linear for the stretcher's own stated reason: an eased one would pile the
 * change into the middle of the span and kink both ends.
 *
 * This replaced a pair of turn **rates**, one at each end of the span, and it keeps what those were
 * for. The rates existed because the obvious reading of two *angles* — "the base angle is the angle
 * already turned at the first cut" — puts a kink at the base cut, the rotation jumping from nothing
 * to that angle across it. An orientation per plane cannot do that at all: the rotation at the base
 * cut is the rotation carrying `tipRest` to itself, which is identity by construction however far
 * apart the two planes are aimed. What is given up is the rates' one extra shape — a bend that
 * starts straight and tightens — and two orientations are a circular arc. That is the shape
 * straightening wants, and a distribution nobody can measure was never the thing being argued over.
 *
 * The **axle** is derived rather than dialled, which is the other thing the planes settle. It used
 * to be a roll about the span, so the control a reviewer grabbed swept round the creature's own
 * long axis — a twist — while the body it bent went ninety degrees the other way. Now the hinge is
 * whatever the two plane normals imply, `tipRest × tipNormal`, and the thing a reviewer drags is a
 * plane: tip the tip plane back to front and the body bends back to front, because the plane's
 * motion *is* the bend. Where the aim is oblique the hinge can carry a little of itself along the
 * span, which is a twist of the span about its own length; that is the honest consequence of the
 * aim rather than something to clamp away, and the file reports it as `axis.twistDegrees`.
 *
 * The map bends rather than sweeps. A point at fraction `s` of the span is carried to the bent
 * centreline at `s` and then rotated about the axis by the rotation accumulated up to `s`, so the
 * span's own length is preserved: rotating everything about one fixed pivot instead would put the
 * span on a spiral and make it longer as it turned, which is not what bending a body does.
 *
 * Pure: no DOM, no three.js. `npm run bend` exercises it headlessly and
 * `tools/triassic/bend-check.ts` reads an export back against the real GLB, so what the viewer
 * measured and what a consumer re-measures are one implementation rather than two that agree by
 * inspection.
 */
import { frameFor, type SculptFrame } from '../sculpt/profile';
import { axes, forwardVector, frameFromMouth, frameFromYaw, type FrameSource } from '../stretch/stretch';

export type Vec3 = [number, number, number];
/** The same shape the scene's warp takes, so a bend can be previewed exactly like a sculpt. */
export type WarpFn = (x: number, y: number, z: number, out: Vec3) => void;

export type BendFrame = SculptFrame;
export type { FrameSource };

/**
 * One joint of the rig, in the model's root frame at its bind pose.
 *
 * The chain matters as much as the positions: a bend's per-joint breakdown is a list in chain
 * order, and which bone is "behind the base cut" is a question about the chain and not about a
 * coordinate. `parent` is a bone name, or null for the root of the armature.
 */
export interface BoneNode {
  name: string;
  parent: string | null;
  head: Vec3;
}

/** Two bones naming a direction: the chord from one head to the other. */
export interface BoneRef { from: string; to: string }

/**
 * Which two chords of the rig the bone reading is taken between. Defaulted from the span and
 * changeable by hand, because the whole lesson behind this tool is that "the trunk" is not one
 * thing: on Askeptosaurus the hip→shoulder run, the `body`→`chest` chord and the axis' tangent at
 * the shoulder are three different directions up to 43° apart, and a reading that does not say
 * which one it took is not a reading.
 */
export interface BoneRefs { base: BoneRef; tip: BoneRef }

/** Where one end of the span was put: by the tool, or by a person who looked at it. */
export type EndSource = 'trace' | 'manual';

/**
 * Where a plane's aim came from. `trace` is the body's own centre line at that end, `bones` is the
 * chord the rig runs on there, and `manual` is a reviewer who looked at both and said which — or
 * neither, and aimed it by hand. The distinction is load-bearing in the same way the chain's and
 * the references' is: a guess is re-made whenever the span moves and an answer never is.
 */
export type PlaneSource = 'trace' | 'bones' | 'manual';

/** Which end of the span a plane is at. */
export type PlaneEnd = 'base' | 'tip';

export interface BendDoc {
  version: 1;
  key: string;
  id: string;
  collection: string;
  model: string;
  /**
   * Which way the body lies. The span does not have to follow it — it is two points on the animal —
   * but the frame is still what "up", "lateral" and "how far back from the nose" mean.
   */
  frame: BendFrame;
  /** Where the frame came from, so a wrong guess can be seen and said. */
  frameSource: FrameSource;
  /** The measured box in the root frame, which is what a change of frame re-derives `bounds` from. */
  box: { lo: Vec3; hi: Vec3 };
  bounds: {
    length: number; height: number; width: number;
    axisMin: number; axisMax: number; lateralMid: number; upMid: number;
  };
  /** How many vertices the measured mesh had, so a bend cannot be read back against another body. */
  vertices: number;
  /**
   * Whether the body carries a skeleton. A generation does not, and the warp on stage is the whole
   * of what the bend is; a built body does, and every clip in these files re-specifies each joint's
   * translation on every frame, so a bent bind pose would show at rest and flail the moment
   * anything played. There the warp is held at rest and the export is a measurement for a builder.
   */
  rigged: boolean;
  /** The rig at bind. Empty on a generation. */
  bones: BoneNode[];
  /**
   * Where the span starts and ends, on the body. Three things at once, and deliberately: the two
   * cut planes go through them square to the line between them, that line is the span's direction
   * and its length, and each is where its own window's **trace** starts.
   */
  base: Vec3;
  tip: Vec3;
  /**
   * Where each end was put. `trace` is the automatic seat — the densest part of the body near where
   * the end was asked for — and `manual` is a reviewer who has looked at the trace drawn on the
   * body and put the end back on the animal. The automatic one is a guess and says so: there is no
   * rule that is right at both ends of Askeptosaurus, whose flipper reaches past its own snout.
   */
  baseSource: EndSource;
  tipSource: EndSource;
  /**
   * The base plane's normal: the direction the creature's axis line runs **into** the span.
   *
   * A pure reference. Nothing behind the base cut moves under any bend, so aiming this never moves
   * the body — what it changes is what the tip plane is aimed *at*, and therefore what "straight"
   * means. That is the whole argument this tool was built out of made into a control: on
   * Askeptosaurus the hip-to-shoulder run, the `body`→`chest` chord and the measured axis' tangent
   * at the shoulder are three different directions up to 43° apart, and a reviewer who believes one
   * of them can say so here instead of hoping the trace agreed.
   */
  baseNormal: Vec3;
  /**
   * The tip plane at rest: the direction the axis line ran **out** of the span when the plane was
   * last seated on the body. Measured, never typed, and re-measured whenever the span moves —
   * it is the animal's own heading there and the pivot every turn is taken from, so a `tipRest`
   * a person could set would be a rotation measured from a place the body never was.
   */
  tipRest: Vec3;
  /**
   * The tip plane as aimed: the direction the axis line is **to** run out of the span. Seated equal
   * to `tipRest`, so the editor opens on the body as it stands; set equal to `baseNormal`, the run
   * between the two planes comes straight.
   */
  tipNormal: Vec3;
  /** Where each plane's aim came from, so a guess and an answer are told apart. */
  planeSource: { base: PlaneSource; tip: PlaneSource };
  /**
   * How much body beyond each cut the *geometry* reading traces over, as a fraction of the body's
   * length. It is in the document rather than a constant because it is part of the definition being
   * reported, and a reading whose window nobody can see or change is a reading nobody can check.
   */
  window: number;
  /**
   * How far off the traced centreline a vertex may sit and still count, as a fraction of the body.
   *
   * Not a nicety. Askeptosaurus' left paddle reaches **further forward than its own snout** — the
   * box's front face is the flipper, not the nose — so a reading that took every vertex near the
   * head averaged the head together with a paddle and reported the head running the wrong way
   * entirely. The trace follows the body instead: each step takes only what is within `reach` of
   * where the body was one step back, so a limb that leaves the run is left behind.
   */
  reach: number;
  /**
   * Which run of the rig the joint table follows, as its first and last bone. The path between them
   * through the tree is unique, and everything the table says is about that path — so a forelimb
   * hanging off the chest inside the span is not silently listed as part of the neck.
   */
  chain: BoneRef | null;
  /** Which chords the bone reading is between. Null on a body with no rig. */
  refs: BoneRefs | null;
  /**
   * Whether the chain and the references are still the tool's guess or a person's choice.
   *
   * Both are guessed from where the span is, so moving the span makes an old guess stale — the
   * default tip chord on a neck span is the neck's own last segment, and left alone while the span
   * was dragged onto the neck it stayed `skull → jaw`, which points down at the chin and read the
   * head as ninety-seven degrees off the trunk. A guess is therefore re-made whenever the span
   * moves, and a choice never is: the references are the question this tool exists to make
   * askable, and an answer a person has given must not be taken back off them.
   */
  chainSource: 'auto' | 'manual';
  refsSource: 'auto' | 'manual';
}

/**
 * The most a bend can ever be, and it is a fact rather than a clamp now: the turn is the angle
 * between two unit vectors, so it cannot exceed a half turn and the span can never wrap round on
 * itself. Kept because the panel's fields still need a range to offer.
 */
export const MAX_TURN = Math.PI;
/** Where the span starts: the front third of the animal, which is where a neck is on everything this is for. */
export const DEFAULT_BASE = 0.34, DEFAULT_TIP = 0.06;
/** How much body a centreline is traced over beyond each cut, by default. */
export const DEFAULT_WINDOW = 0.12;
/** How far off the trace a vertex may sit and still count, by default. */
export const DEFAULT_REACH = 0.05;
/** How many steps a trace takes over its window. */
export const TRACE_STEPS = 12;
/** How finely the bent centreline is integrated. The map is exact at these samples and interpolated between. */
export const ARC_SAMPLES = 512;
/** The span may not be shorter than this share of the body: a span of no length has no length to turn over. */
export const MIN_SPAN = 0.01;

const EPS = 1e-9;
const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (v: Vec3) => Math.hypot(v[0], v[1], v[2]);
/**
 * A unit vector, with negative zero folded away.
 *
 * The `+ 0` is not decoration. A plane's normal is stored in the document and the document goes
 * through JSON, which writes `-0` as `0` — so a plane seated by negating a traced direction came
 * back from its own export as a *different* document, and the one thing the file has to promise is
 * that it rebuilds what it described.
 */
const norm = (v: Vec3): Vec3 => { const l = len(v) || 1; return [v[0] / l + 0, v[1] / l + 0, v[2] / l + 0]; };
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const addTo = (a: Vec3, b: Vec3, s: number): Vec3 => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];

// ---------------------------------------------------------------------------------------------
// The span
// ---------------------------------------------------------------------------------------------

/** The unit vector across the body, towards +lateral. */
export function lateralVector(frame: BendFrame): Vec3 {
  const { L } = axes(frame);
  const v: Vec3 = [0, 0, 0];
  v[L] = 1;
  return v;
}

/** The span's own length: the distance between the two ends, never quite zero. */
export const spanLength = (doc: Pick<BendDoc, 'base' | 'tip'>): number => Math.max(len(sub(doc.tip, doc.base)), EPS);

/** The span's own direction: from the base end to the tip end. Both cuts are square to it. */
export function spanDirection(doc: Pick<BendDoc, 'base' | 'tip' | 'frame'>): Vec3 {
  const v = sub(doc.tip, doc.base);
  return len(v) < EPS ? forwardVector(doc.frame) : norm(v);
}

/**
 * The rotation the two planes ask for: the shortest turn carrying `tipRest` onto `tipNormal`.
 *
 * `angle` is never negative and never more than a half turn — it is the angle between two unit
 * vectors — and which way the body goes is carried by `axis` rather than by a sign, so there is no
 * convention for a reader to get wrong. With the two planes aimed the same way `angle` is zero and
 * there is no rotation to take an axis from; `axis` then falls back, in order, to the plane the
 * animal's **own** curve lies in (`tipRest` against `baseNormal`, which is the plane a straightening
 * would happen in and so the right one to read every angle in) and, where even those agree, to the
 * frame's own up squared against the span.
 */
export interface BendRotation { axis: Vec3; angle: number }

/** The axle of the shortest rotation from `a` to `b`, or null where the two are parallel. */
function turnAxis(a: Vec3, b: Vec3): Vec3 | null {
  const c = cross(norm(a), norm(b));
  return len(c) < 1e-9 ? null : norm(c);
}

/**
 * The angle between two directions, as `atan2` of the cross against the dot rather than as an
 * `acos` of the dot.
 *
 * Not a nicety: `acos` loses its precision exactly where this tool spends its time. Two planes
 * aimed the same way have a dot of 1 to within a rounding error, and `acos` turns a rounding error
 * of 1e-16 into an angle of 1e-8 — so a straightened span read back as a tenth of a thousandth of a
 * degree of bend, which is nothing to a reviewer and is not nothing to `isIdentity`.
 */
const between = (a: Vec3, b: Vec3): number => {
  const u = norm(a), v = norm(b);
  return Math.atan2(len(cross(u, v)), dot(u, v));
};

/** The axle the old scheme had at a roll of zero: the frame's own up squared against the span. */
function levelAxis(doc: Pick<BendDoc, 'base' | 'tip' | 'frame'>): Vec3 {
  const forward = spanDirection(doc);
  const u: Vec3 = [0, 1, 0], l = lateralVector(doc.frame);
  let e1 = addTo(u, forward, -dot(u, forward));
  if (len(e1) < 1e-6) e1 = addTo(l, forward, -dot(l, forward));
  return norm(cross(forward, norm(e1)));
}

/** The parts of the document a bend is computed from, which is everything but the readings' knobs. */
export type BendShape = Pick<BendDoc, 'base' | 'tip' | 'frame' | 'baseNormal' | 'tipRest' | 'tipNormal'>;

export function bendRotation(doc: BendShape): BendRotation {
  const rest = norm(doc.tipRest), aim = norm(doc.tipNormal);
  const axis = turnAxis(rest, aim) ?? turnAxis(doc.baseNormal, rest) ?? levelAxis(doc);
  return { axis, angle: between(rest, aim) };
}

/**
 * The bend as three unit vectors: `forward` along the span, `axis` the axle it turns about, and
 * `up` the way a positive turn carries the tip.
 *
 * `axis` comes from the two planes rather than from a roll — that is the whole of what changed when
 * the planes arrived, and it is why there is no bend-plane control any more. `up` is
 * `axis × forward`, the direction a positive rotation about the axle carries the span, and it is
 * what the pinch and the normals are measured against.
 *
 * The axle is **not** forced square to the span. Under the old scheme it was, because a roll about
 * the span cannot produce anything else and a component along the span is a twist rather than a
 * bend; under two aimed planes it is simply whatever they imply, and an oblique aim really does ask
 * for a little twist. Clamping it would mean the warp no longer carried `tipRest` onto `tipNormal`,
 * which is the one promise the planes make, so the twist is reported (`axis.twistDegrees` in the
 * file) rather than taken away.
 */
export interface BendBasis { forward: Vec3; up: Vec3; axis: Vec3 }

export function bendBasis(doc: BendShape): BendBasis {
  const forward = spanDirection(doc);
  const axis = bendRotation(doc).axis;
  let up = cross(axis, forward);
  // An axle along the span names no direction for the span to be carried in; the frame's own up
  // squared against the span is the honest stand-in, and at that point the turn is a pure twist.
  if (len(up) < 1e-6) {
    const u: Vec3 = [0, 1, 0], l = lateralVector(doc.frame);
    let e1 = addTo(u, forward, -dot(u, forward));
    if (len(e1) < 1e-6) e1 = addTo(l, forward, -dot(l, forward));
    up = e1;
  }
  return { forward, up: norm(up), axis };
}

/** How far the axle leans along the span: the share of the aim that is a twist rather than a bend. */
export const twistAngle = (doc: BendShape): number =>
  Math.asin(clamp(Math.abs(dot(bendRotation(doc).axis, spanDirection(doc))), 0, 1));

/** The angle between two directions, plain and unsigned: what "the planes are N° apart" means. */
export const angleOf = (a: Vec3, b: Vec3): number => between(a, b);

/** How far back from the nose a point is, as a fraction of the body: for the panel and the file. */
export function headFractionAt(doc: Pick<BendDoc, 'frame' | 'bounds'>, p: Vec3): number {
  const { A } = axes(doc.frame);
  const { axisMin, axisMax, length } = doc.bounds;
  return doc.frame.forward === 1 ? (axisMax - p[A]) / length : (p[A] - axisMin) / length;
}

/** A point on the body's own centre line a fraction of the way back from the nose, from the box. */
export function pointAtHeadFraction(doc: Pick<BendDoc, 'frame' | 'bounds'>, headFraction: number): Vec3 {
  const { A, L, U } = axes(doc.frame);
  const { axisMin, axisMax, length } = doc.bounds;
  const p: Vec3 = [0, 0, 0];
  p[A] = doc.frame.forward === 1 ? axisMax - headFraction * length : axisMin + headFraction * length;
  p[U] = doc.bounds.upMid;
  p[L] = doc.bounds.lateralMid;
  return p;
}

/** The whole the span turns through: the angle between the tip plane's rest and its aim. */
export const totalTurn = (doc: BendShape): number => bendRotation(doc).angle;

/**
 * No bend at all: the two planes aimed the same way, to within the rounding that normalising a
 * vector twice leaves behind. A ten-millionth of a radian is six ten-thousandths of a degree of
 * arc-second, which is not a bend by any reading; the threshold is loose only against floating
 * point and tight against everything else.
 */
export const isIdentity = (doc: Pick<BendDoc, 'tipRest' | 'tipNormal'>): boolean =>
  between(doc.tipRest, doc.tipNormal) < 1e-7;

/**
 * The rotation accumulated by the fraction `s` of the span.
 *
 * Linear, for the stretcher's own stated reason: an eased distribution would pile the change into
 * the middle of the span and kink both ends. At `s` of 0 it is exactly zero however far apart the
 * two planes are aimed, which is what replaces the old rates' one guarantee — there is no number
 * anywhere that can kink the body where the span begins.
 */
export const turnAt = (doc: BendShape, s: number): number => bendRotation(doc).angle * s;

/** How fast it is turning there — constant across the span, and what pinches the inside of the bend. */
export const turnRateAt = (doc: BendShape, _s?: number): number => bendRotation(doc).angle;

// ---------------------------------------------------------------------------------------------
// The warp
// ---------------------------------------------------------------------------------------------

/** Rodrigues: `v` turned by `angle` about the unit `axis`. */
export function rotateAbout(v: Vec3, axis: Vec3, angle: number, out: Vec3): Vec3 {
  const c = Math.cos(angle), s = Math.sin(angle), k = dot(axis, v) * (1 - c);
  out[0] = v[0] * c + (axis[1] * v[2] - axis[2] * v[1]) * s + axis[0] * k;
  out[1] = v[1] * c + (axis[2] * v[0] - axis[0] * v[2]) * s + axis[1] * k;
  out[2] = v[2] * c + (axis[0] * v[1] - axis[1] * v[0]) * s + axis[2] * k;
  return out;
}

/**
 * Everything the warp shares, gathered once: the basis, the span's base end and length, and the
 * bent centreline.
 *
 * The centreline is the integral of the turned span direction, which for a turn that grows linearly
 * is a Fresnel integral — so it is sampled rather than solved, at `ARC_SAMPLES` steps with the
 * trapezium rule, and read back by linear interpolation. It is integrated as a **vector** rather
 * than as ∫cos and ∫sin against a forward/up pair, because the axle the planes imply need not be
 * square to the span and a rotation about an oblique axle carries `forward` out of that pair's own
 * plane. Both the viewer and the consumer go through this one function, so "sampled" is a property
 * of the definition rather than a difference between two implementations, and the error at these
 * step counts is a millionth of the span.
 */
export interface BendGeometry {
  basis: BendBasis;
  /** The base end: the point the whole bend is anchored at. */
  origin: Vec3;
  span: number;
  /** ∫ of the turned span direction from 0 to each sample, as xyz triples, in units of the span. */
  path: Float64Array;
}

export function bendGeometry(doc: BendDoc): BendGeometry {
  const basis = bendBasis(doc);
  const { forward, axis } = basis;
  const { angle } = bendRotation(doc);
  const span = spanLength(doc);
  const n = ARC_SAMPLES;
  const path = new Float64Array((n + 1) * 3);
  const h = 1 / n;
  const prev: Vec3 = [forward[0], forward[1], forward[2]], here: Vec3 = [0, 0, 0];
  for (let i = 1; i <= n; i++) {
    rotateAbout(forward, axis, angle * i * h, here);
    for (let k = 0; k < 3; k++) path[i * 3 + k] = path[(i - 1) * 3 + k] + (prev[k] + here[k]) * h / 2;
    prev[0] = here[0]; prev[1] = here[1]; prev[2] = here[2];
  }
  return { basis, origin: [...doc.base] as Vec3, span, path };
}

/** The bent centreline at fraction `s` of the span, in the root frame. */
export function centrelineAt(g: BendGeometry, s: number, out: Vec3): Vec3 {
  const n = ARC_SAMPLES;
  const x = clamp(s, 0, 1) * n;
  const i = Math.min(n - 1, Math.floor(x)), u = x - i;
  for (let k = 0; k < 3; k++) {
    const a = g.path[i * 3 + k], b = g.path[(i + 1) * 3 + k];
    out[k] = g.origin[k] + g.span * (a + (b - a) * u);
  }
  return out;
}

/**
 * The warp this document describes, ready for the scene or for a measurement.
 *
 * A vertex is found by where it sits along the span (`s`), carried to the bent centreline there,
 * and turned about the axis by the rotation accumulated to `s`. Behind the base cut `s` is 0, the
 * rotation is identity and the centreline is still the straight one, so nothing moves at all —
 * exactly, to the last decimal. Past the tip cut `s` is 1 and both are constant, so the far part is
 * carried by one rigid transform and keeps its shape.
 */
export function warp(doc: BendDoc): WarpFn {
  const g = bendGeometry(doc);
  const { forward, axis } = g.basis;
  const { origin, span } = g;
  const { angle } = bendRotation(doc);
  const c: Vec3 = [0, 0, 0], r: Vec3 = [0, 0, 0], d: Vec3 = [0, 0, 0];
  return (x, y, z, out) => {
    const u = (x - origin[0]) * forward[0] + (y - origin[1]) * forward[1] + (z - origin[2]) * forward[2];
    const s = clamp(u / span, 0, 1);
    // The straight centreline point at this station, and the offset from it — which carries
    // whatever is left over along the span outside it, so the two ends stay rigid.
    const cx = origin[0] + forward[0] * span * s, cy = origin[1] + forward[1] * span * s, cz = origin[2] + forward[2] * span * s;
    centrelineAt(g, s, c);
    d[0] = x - cx; d[1] = y - cy; d[2] = z - cz;
    rotateAbout(d, axis, angle * s, r);
    out[0] = c[0] + r[0];
    out[1] = c[1] + r[1];
    out[2] = c[2] + r[2];
  };
}

/**
 * How a normal is carried by the warp.
 *
 * Inside the span the map is the rotation `R(Θ(s))` composed with a pure stretch along the span:
 * the fibre a distance `β` out on the `up` side of the centreline is drawn out by the turn and the
 * one on the far side is compressed, by exactly `1 − Θ′(s)·β/span`. A normal follows the inverse
 * transpose, which for a scale along one direction is the reciprocal scale along it, and then the
 * rotation. Outside the span the rate is zero and a normal is only rotated.
 *
 * Worth having rather than recomputing normals from the triangles, for the stretcher's reason: a
 * Tripo mesh's shading comes with it, and a mesh-wide `computeVertexNormals` would reshade every
 * face of the animal — the parts this edit does not touch included — to pay for a turn in the neck.
 */
export function normalWarp(doc: BendDoc): (x: number, y: number, z: number, nx: number, ny: number, nz: number, out: Vec3) => void {
  const g = bendGeometry(doc);
  const { forward, up, axis } = g.basis;
  const { origin, span } = g;
  const { angle } = bendRotation(doc);
  const t: Vec3 = [0, 0, 0];
  return (x, y, z, nx, ny, nz, out) => {
    const dx = x - origin[0], dy = y - origin[1], dz = z - origin[2];
    const u = dx * forward[0] + dy * forward[1] + dz * forward[2];
    const s = clamp(u / span, 0, 1);
    let ox = nx, oy = ny, oz = nz;
    if (s > 0 && s < 1) {
      const beta = dx * up[0] + dy * up[1] + dz * up[2];
      const k = 1 - angle * beta / span;
      if (Math.abs(k) > 1e-6 && Math.abs(k - 1) > 1e-12) {
        const along = (nx * forward[0] + ny * forward[1] + nz * forward[2]) * (1 / k - 1);
        ox += forward[0] * along; oy += forward[1] * along; oz += forward[2] * along;
      }
    }
    rotateAbout(norm([ox, oy, oz]), axis, angle * s, t);
    out[0] = t[0]; out[1] = t[1]; out[2] = t[2];
  };
}

/**
 * How hard the inside of the bend is being squeezed: the smallest `1 − Θ′β/span` over the body,
 * where `β` is how far out on the `up` side a vertex sits.
 *
 * 1 is no squeeze at all. Below 0 the bend has folded the span through itself — the turn is tighter
 * than the body is thick — and the surface crosses itself, which reads on stage as a crease and is
 * worth saying out loud rather than leaving a reviewer to spot.
 */
export function pinch(doc: BendDoc, chunks: readonly ArrayLike<number>[]): number {
  if (isIdentity(doc)) return 1;
  const { forward, up } = bendBasis(doc);
  const { angle } = bendRotation(doc);
  const origin = doc.base, span = spanLength(doc);
  let worst = 1;
  for (const c of chunks) for (let i = 0; i + 2 < c.length; i += 3) {
    const dx = c[i] - origin[0], dy = c[i + 1] - origin[1], dz = c[i + 2] - origin[2];
    const u = dx * forward[0] + dy * forward[1] + dz * forward[2];
    const s = u / span;
    if (s <= 0 || s >= 1) continue;
    const beta = dx * up[0] + dy * up[1] + dz * up[2];
    const k = 1 - angle * beta / span;
    if (k < worst) worst = k;
  }
  return worst;
}

// ---------------------------------------------------------------------------------------------
// The readings
// ---------------------------------------------------------------------------------------------

/**
 * A measured bend: two directions and the angle between them, said three ways.
 *
 * `inPlane` is the part of the turn the chosen bend axis accounts for — the one an edit can undo —
 * and `offPlane` is what is left over, which is the tell that the axis is aimed wrong. `total` is
 * the plain three-dimensional angle, which is the number everybody quotes and the one that hides
 * the other two.
 */
export interface Reading {
  base: Vec3;
  tip: Vec3;
  inPlane: number;
  offPlane: number;
  total: number;
}

/**
 * The signed angle in the bend plane, plus whatever the plane does not hold.
 *
 * `offPlane` is measured rather than subtracted: turn the base direction by `inPlane` about the
 * axle, and the angle that is still left to the tip direction is what the plane cannot account for.
 * The obvious shortcut — the total angle and the in-plane angle as two sides of a right triangle —
 * is wrong wherever the two directions lean along the axle, because projecting onto a plane can
 * make an angle *larger* than it is in space: Askeptosaurus' own neck reads 17.7° in the plane and
 * 16.6° in all, and the shortcut turned that into a flat zero and hid the disagreement.
 */
export function angleBetween(base: Vec3, tip: Vec3, axis: Vec3): Reading {
  const b = norm(base), t = norm(tip);
  const proj = (v: Vec3): Vec3 => addTo(v, axis, -dot(v, axis));
  const pb = proj(b), pt = proj(t);
  let inPlane = 0;
  if (len(pb) > 1e-9 && len(pt) > 1e-9) {
    const nb = norm(pb), nt = norm(pt);
    inPlane = Math.atan2(dot(axis, cross(nb, nt)), dot(nb, nt));
  }
  const turned: Vec3 = [0, 0, 0];
  rotateAbout(b, axis, inPlane, turned);
  const offPlane = Math.acos(clamp(dot(turned, t), -1, 1));
  const total = Math.acos(clamp(dot(b, t), -1, 1));
  return { base: b, tip: t, inPlane, offPlane, total };
}

/** A traced run of the body's own centre, and the straight direction fitted through it. */
export interface Trace {
  /** Outward from the cut: the first point is the span's own end. */
  points: Vec3[];
  direction: Vec3;
  count: number;
  /**
   * How far the traced points sit from the line fitted through them, over the run's own length.
   *
   * The trace's own opinion of itself, and the number to look at before believing the angle: a run
   * of body is nearly a line, so a small residual means the trace followed one thing and a large
   * one means it wandered — off onto a limb, or round a bend of its own. It is reported rather than
   * acted on, because what to do about it (move the end, shorten the window, narrow the reach, or
   * believe the bone reading instead) is the reviewer's call.
   */
  residual: number;
}

/**
 * The body's own centre line, traced outward from one end of the span.
 *
 * It follows the body rather than a coordinate. Each step predicts where the centre will be — one
 * step on along the direction the trace is currently running — takes the centroid of the vertices
 * within `reach` of that prediction and within half a step of the plane through it, and turns its
 * direction towards where that centroid actually is. So a run that curves is followed round, and a
 * limb that leaves the run is left behind after a single step.
 *
 * The obvious way — bin an axial slab and take each bin's centroid — is the way that fails, and it
 * fails on the animal this tool was built for. Askeptosaurus' left paddle reaches further forward
 * than its own snout, so a slab ahead of the neck averages the head together with a flipper and
 * reports the head running backwards; and its trunk leaves the shoulder at 61° to the body axis, so
 * an axial slab through it is a long oblique cut rather than a section.
 *
 * With a warp it is the same run of body measured afterwards: the trace is laid out on the
 * *original* body, so "the same run" means the same run, and what is averaged is where the warp has
 * put those vertices. Measured rather than predicted, which matters here more than it usually does
 * — predicting the answer from the numbers that produced it is what every reading in this animal's
 * history did.
 */
export function traceCentreline(
  chunks: readonly ArrayLike<number>[],
  doc: Pick<BendDoc, 'bounds' | 'reach'>,
  from: Vec3,
  direction: Vec3,
  distance: number,
  warpFn?: WarpFn,
): Trace | null {
  const reach = Math.max(doc.reach, 1e-4) * doc.bounds.length;
  const r2 = reach * reach;
  const step = Math.max(distance, EPS) / TRACE_STEPS;
  // Only the vertices that could ever be in reach of the run, gathered once.
  const px: number[] = [], py: number[] = [], pz: number[] = [];
  const far = distance + reach * 2;
  for (const c of chunks) for (let i = 0; i + 2 < c.length; i += 3) {
    const dx = c[i] - from[0], dy = c[i + 1] - from[1], dz = c[i + 2] - from[2];
    if (dx * dx + dy * dy + dz * dz > far * far) continue;
    px.push(c[i]); py.push(c[i + 1]); pz.push(c[i + 2]);
  }
  if (!px.length) return null;
  /**
   * The step's own disc: the surface within half a step of the plane through `at`, and near enough
   * to `at` to be the run the trace is on.
   *
   * "Near enough" is `reach`, **or the nearest surface there plus a third, whichever is further**.
   * The second half is not a softening: a body is a shell, so the surface at a station stands at
   * that station's own radius and there is nothing at all at the centre — a reach smaller than the
   * radius would find an empty disc and the trace would stop at its first step. With the band the
   * trace always has the body it is standing on, and `reach` does the job it is for, which is
   * refusing a *different* part of the animal that happens to pass nearby.
   */
  const disc = (at: Vec3, along: Vec3): { c: Vec3; n: number } | null => {
    let nearest = Infinity;
    const near: number[] = [];
    for (let j = 0; j < px.length; j++) {
      const dx = px[j] - at[0], dy = py[j] - at[1], dz = pz[j] - at[2];
      if (Math.abs(dx * along[0] + dy * along[1] + dz * along[2]) > step * 0.75) continue;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < nearest) nearest = d2;
      near.push(j);
    }
    if (!near.length) return null;
    const limit = Math.max(reach, Math.sqrt(nearest) * 1.35);
    const l2 = limit * limit;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const j of near) {
      const dx = px[j] - at[0], dy = py[j] - at[1], dz = pz[j] - at[2];
      if (dx * dx + dy * dy + dz * dz > l2) continue;
      sx += px[j]; sy += py[j]; sz += pz[j]; n++;
    }
    return n > 0 ? { c: [sx / n, sy / n, sz / n], n } : null;
  };
  /** The same disc, measured after a warp: the run is the run, wherever the edit has put it. */
  const warpedDisc = (at: Vec3, along: Vec3, fn: WarpFn): Vec3 | null => {
    let nearest = Infinity;
    const near: number[] = [];
    for (let j = 0; j < px.length; j++) {
      const dx = px[j] - at[0], dy = py[j] - at[1], dz = pz[j] - at[2];
      if (Math.abs(dx * along[0] + dy * along[1] + dz * along[2]) > step * 0.75) continue;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < nearest) nearest = d2;
      near.push(j);
    }
    if (!near.length) return null;
    const limit = Math.max(reach, Math.sqrt(nearest) * 1.35);
    const l2 = limit * limit;
    const w: Vec3 = [0, 0, 0];
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const j of near) {
      const dx = px[j] - at[0], dy = py[j] - at[1], dz = pz[j] - at[2];
      if (dx * dx + dy * dy + dz * dz > l2) continue;
      fn(px[j], py[j], pz[j], w);
      sx += w[0]; sy += w[1]; sz += w[2]; n++;
    }
    return n > 0 ? [sx / n, sy / n, sz / n] : null;
  };
  const points: Vec3[] = [];
  const warped: Vec3[] = [];
  const w: Vec3 = [0, 0, 0];
  let at: Vec3 = [...from] as Vec3;
  let along = norm(direction);
  let count = 0;
  for (let i = 0; i <= TRACE_STEPS; i++) {
    const found = disc(at, along);
    if (!found) break;
    // The step's own centre, kept on the run: the found centroid, but held at the station the
    // trace has reached, so a disc that is fuller on one side moves the trace across the body
    // rather than along it.
    const centre = addTo(found.c, along, dot(sub(at, found.c), along));
    points.push(centre);
    count += found.n;
    if (warpFn) {
      const wc = warpedDisc(at, along, warpFn);
      if (wc) warped.push(wc);
    }
    if (i === TRACE_STEPS) break;
    // Step on, and turn towards where the body actually was: half the old direction, half the new,
    // which follows a curve without chasing the noise in one disc.
    const next = addTo(centre, along, step);
    const ahead = disc(next, along);
    const aim = ahead ? norm(sub(ahead.c, centre)) : along;
    along = norm([along[0] + aim[0], along[1] + aim[1], along[2] + aim[2]]);
    at = addTo(centre, along, step);
  }
  const fit = warpFn ? warped : points;
  if (fit.length < 2) return null;
  // A straight line through the points: the first principal direction, by power iteration on the
  // covariance, which needs no eigen solver and converges in a handful of passes on a run of points
  // that is nearly a line already.
  const mean: Vec3 = [0, 0, 0];
  for (const p of fit) { mean[0] += p[0]; mean[1] += p[1]; mean[2] += p[2]; }
  mean[0] /= fit.length; mean[1] /= fit.length; mean[2] /= fit.length;
  const cov = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (const p of fit) {
    const d = sub(p, mean);
    for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) cov[r * 3 + q] += d[r] * d[q];
  }
  const chord = sub(fit[fit.length - 1], fit[0]);
  if (len(chord) < EPS) return null;
  let v = norm(chord);
  for (let it = 0; it < 24; it++) {
    const m: Vec3 = [
      cov[0] * v[0] + cov[1] * v[1] + cov[2] * v[2],
      cov[3] * v[0] + cov[4] * v[1] + cov[5] * v[2],
      cov[6] * v[0] + cov[7] * v[1] + cov[8] * v[2],
    ];
    if (len(m) < EPS) break;
    v = norm(m);
  }
  // Oriented by the trace's own chord rather than by the body axis, so a run that curves through
  // more than a right angle still reports the direction it goes in and not its negation.
  if (dot(v, chord) < 0) v = [-v[0], -v[1], -v[2]];
  let sq = 0;
  for (const p of fit) {
    const d = sub(p, mean);
    const a = dot(d, v);
    const off = addTo(d, v, -a);
    sq += dot(off, off);
  }
  return { points: fit, direction: v, count, residual: Math.sqrt(sq / fit.length) / Math.max(len(chord), EPS) };
}

/** How far each trace runs: a share of the body's length. */
export const windowLength = (doc: Pick<BendDoc, 'window' | 'bounds'>) => Math.max(doc.window, 1e-4) * doc.bounds.length;

/**
 * Both traces, as the stage draws them and the reading is taken from.
 *
 * Each starts at its own end of the span and runs **outward**, away from the other: the base trace
 * back along the body behind the span, the tip trace on past the span's far cut. So neither ever
 * measures the span itself, which is the thing being changed.
 */
export function traces(doc: BendDoc, chunks: readonly ArrayLike<number>[], warpFn?: WarpFn): { base: Trace | null; tip: Trace | null } {
  const d = spanDirection(doc);
  const w = windowLength(doc);
  return {
    base: traceCentreline(chunks, doc, doc.base, [-d[0], -d[1], -d[2]], w, warpFn),
    tip: traceCentreline(chunks, doc, doc.tip, d, w, warpFn),
  };
}

/**
 * The geometry reading: the body's own centre behind the span against its own centre ahead of it.
 *
 * The base trace runs tail-ward, so its direction points away from the head; it is negated here, so
 * both directions run head-ward and the angle between them is the bend rather than its supplement.
 */
export function readGeometry(doc: BendDoc, chunks: readonly ArrayLike<number>[], warpFn?: WarpFn): Reading | null {
  const t = traces(doc, chunks, warpFn);
  if (!t.base || !t.tip) return null;
  const base: Vec3 = [-t.base.direction[0], -t.base.direction[1], -t.base.direction[2]];
  return angleBetween(base, t.tip.direction, bendBasis(doc).axis);
}

// ---------------------------------------------------------------------------------------------
// The rig
// ---------------------------------------------------------------------------------------------

/** A bone by name, or undefined. */
export const boneNamed = (bones: readonly BoneNode[], name: string) => bones.find((b) => b.name === name);

/** The direction of a chord between two bones' heads, or null if either is missing or they coincide. */
export function boneDirection(bones: readonly BoneNode[], ref: BoneRef): Vec3 | null {
  const a = boneNamed(bones, ref.from), b = boneNamed(bones, ref.to);
  if (!a || !b) return null;
  const v = sub(b.head, a.head);
  return len(v) < EPS ? null : norm(v);
}

/** The bone reading: the chord the chain runs on into the span against the one it runs on out of it. */
export function readBones(doc: BendDoc, bones: readonly BoneNode[] = doc.bones): Reading | null {
  if (!doc.refs) return null;
  const base = boneDirection(bones, doc.refs.base), tip = boneDirection(bones, doc.refs.tip);
  if (!base || !tip) return null;
  return angleBetween(base, tip, bendBasis(doc).axis);
}

/** The bones carried through the warp, for reading what the edit would leave behind. */
export function warpBones(doc: BendDoc, bones: readonly BoneNode[] = doc.bones): BoneNode[] {
  const f = warp(doc);
  const out: Vec3 = [0, 0, 0];
  return bones.map((b) => {
    f(b.head[0], b.head[1], b.head[2], out);
    return { name: b.name, parent: b.parent, head: [out[0], out[1], out[2]] as Vec3 };
  });
}

/** Every ancestor of a bone, nearest first, itself included. */
export function ancestry(bones: readonly BoneNode[], name: string): BoneNode[] {
  const out: BoneNode[] = [];
  let at = boneNamed(bones, name);
  for (let guard = 0; at && guard < 512; guard++) {
    out.push(at);
    at = at.parent ? boneNamed(bones, at.parent) : undefined;
  }
  return out;
}

/**
 * The run of the rig between two bones, in order.
 *
 * Ordinarily the first is an ancestor of the second and the path simply descends. Where it is not,
 * the path goes up to the nearest common ancestor and down again, which is what a chain crossing a
 * fork actually is. An empty answer means the two are in different armatures.
 */
export function chainPath(bones: readonly BoneNode[], ref: BoneRef): BoneNode[] {
  const up = ancestry(bones, ref.from), down = ancestry(bones, ref.to);
  if (!up.length || !down.length) return [];
  const names = new Set(up.map((b) => b.name));
  const meet = down.find((b) => names.has(b.name));
  if (!meet) return [];
  const head = up.slice(0, up.findIndex((b) => b.name === meet.name) + 1);
  const tail = down.slice(0, down.findIndex((b) => b.name === meet.name)).reverse();
  return [...head, ...tail];
}

/** Every bone with no children: where a root-to-leaf path can end. */
const leaves = (bones: readonly BoneNode[]) => {
  const parents = new Set(bones.map((b) => b.parent).filter((p): p is string => !!p));
  return bones.filter((b) => !parents.has(b.name));
};

/** Where a bone sits through the span: 0 at the base cut, 1 at the tip. */
export function boneStation(doc: Pick<BendDoc, 'base' | 'tip' | 'frame'>, b: BoneNode): number {
  return dot(sub(b.head, doc.base), spanDirection(doc)) / spanLength(doc);
}

/**
 * Which run of the rig the span is about, guessed.
 *
 * The chain a bend is about is the one that runs **through** the span, and a limb hanging off it is
 * the one that does not — so the guess is the root-to-leaf path with the most joints inside the
 * span and, where two paths tie, the one that keeps nearest the span's own line. On Askeptosaurus'
 * neck that is chest → neck_00…03 → skull over chest → the forelimb, four joints to one. It is a
 * guess and the panel says so; the two dropdowns are what settles it.
 */
export function defaultChain(doc: BendDoc): BoneRef | null {
  if (!doc.bones.length) return null;
  const f = spanDirection(doc);
  const span = spanLength(doc);
  let best: { ref: BoneRef; inside: number; offset: number } | null = null;
  for (const leaf of leaves(doc.bones)) {
    const path = ancestry(doc.bones, leaf.name).reverse();     // root first
    if (path.length < 2) continue;
    let inside = 0, offset = 0, n = 0;
    for (const b of path) {
      const s = boneStation(doc, b);
      if (s > 0 && s < 1) inside++;
      if (s > -0.2 && s < 1.2) {
        const d = sub(b.head, doc.base);
        offset += len(addTo(d, f, -dot(d, f))) / span;
        n++;
      }
    }
    offset = n > 0 ? offset / n : Infinity;
    if (!best || inside > best.inside || (inside === best.inside && offset < best.offset)) {
      best = { ref: { from: path[0].name, to: leaf.name }, inside, offset };
    }
  }
  return best?.ref ?? null;
}

/**
 * What the bend asks of each joint of the chain, in order.
 *
 * This is the form a builder consumes. Askeptosaurus' `carry_rest` takes a list of bone names and a
 * list of local rotations and poses the rig with them, and `uncurl` produces exactly that: a
 * *local* rotation per joint whose product down the chain is the accumulated one. So the table
 * gives both — `accumulated` is the rotation at that joint's station, `local` is the step from the
 * joint above it — and the axis they are all about is the one number they share.
 *
 * Only joints of the chosen chain are listed: those inside the span, and the first one past it,
 * because that last one carries the whole remaining turn and leaving it out would silently drop the
 * end of the correction.
 */
export interface JointTurn {
  bone: string;
  /** Where the joint sits through the span, 0 at the base cut and 1 at the tip. */
  s: number;
  /** The rotation accumulated by this joint's station, radians about the bend axis. */
  accumulated: number;
  /** The step from the joint above it on the chain: what a pose bone's own rotation would be. */
  local: number;
}

export function jointTurns(doc: BendDoc, bones: readonly BoneNode[] = doc.bones): JointTurn[] {
  if (!doc.chain || !bones.length) return [];
  const path = chainPath(bones, doc.chain);
  if (path.length < 2) return [];
  const stations = path.map((b) => boneStation(doc, b));
  // Where the chain enters the span. Found rather than assumed, because a chain's own order is not
  // its order along the span: an armature root sitting at the file's origin can stand a whole span
  // length *ahead* of a neck, and a walk that started at the first joint past the tip cut would
  // stop before it began.
  const firstInside = stations.findIndex((s) => s > 0 && s < 1);
  if (firstInside < 0) return [];
  const out: JointTurn[] = [];
  for (let i = firstInside; i < path.length; i++) {
    const here = clamp(stations[i], 0, 1);
    const previous = i > 0 ? clamp(stations[i - 1], 0, 1) : 0;
    out.push({ bone: path[i].name, s: here, accumulated: turnAt(doc, here), local: turnAt(doc, here) - turnAt(doc, previous) });
    // The first joint past the tip cut ends the list: it carries the whole remaining turn, and
    // everything beyond it is carried rigidly with it.
    if (stations[i] >= 1) break;
  }
  return out;
}

/**
 * The bone chords the span implies.
 *
 * The base is the last chord of the chain that lies wholly **behind** the base cut, because that is
 * the direction the body is running in as it arrives and it does not move when the span bends. The
 * tip is the last chord of the chain, because a rig has nothing past its last joint to measure a
 * head's own direction with — and that chord is partly inside the span, so it does move, which the
 * panel says rather than hides. Both are dropdowns: they are the question this tool exists to make
 * askable, not an answer it should be giving.
 */
export function defaultRefs(doc: BendDoc): BendDoc {
  if (!doc.chain || !doc.bones.length) return { ...doc, refs: null };
  const path = chainPath(doc.bones, doc.chain);
  if (path.length < 2) return { ...doc, refs: null };
  const stations = path.map((b) => boneStation(doc, b));
  let baseEnd = 0;
  for (let i = 1; i < path.length; i++) if (stations[i] <= 0) baseEnd = i;
  const base = baseEnd > 0
    ? { from: path[baseEnd - 1].name, to: path[baseEnd].name }
    : { from: path[0].name, to: path[1].name };
  let tipEnd = path.length - 1;
  for (let i = 1; i < path.length; i++) if (stations[i] >= 1) { tipEnd = i; break; }
  const tip = { from: path[Math.max(0, tipEnd - 1)].name, to: path[tipEnd].name };
  return { ...doc, refs: { base, tip } };
}

/**
 * Whether a reference moves when the span bends: either of its bones sits inside the span or past
 * it. A joint *on* a cut does not move — nothing at the base cut turns at all — so the test has a
 * thousandth of the span's slack in it, which is what a reviewer typing an end onto a joint's own
 * coordinates rounded to four places leaves behind.
 */
export function refMoves(doc: BendDoc, ref: BoneRef): boolean {
  const a = boneNamed(doc.bones, ref.from), b = boneNamed(doc.bones, ref.to);
  return [a, b].some((x) => !!x && boneStation(doc, x) > 1e-3);
}

// ---------------------------------------------------------------------------------------------
// Both readings, before and after
// ---------------------------------------------------------------------------------------------

/**
 * Both readings, before the edit and after it.
 *
 * "After" is measured rather than predicted: the warp is applied to the vertices and to the bone
 * heads and the same measurement is taken again. A predicted angle would be the tool agreeing with
 * itself, and agreeing with itself is exactly what the three readings that started all this did.
 */
export interface Readings {
  geometry: { before: Reading | null; after: Reading | null };
  bones: { before: Reading | null; after: Reading | null };
}

export function readBend(doc: BendDoc, chunks: readonly ArrayLike<number>[]): Readings {
  const gBefore = readGeometry(doc, chunks);
  const bBefore = readBones(doc);
  const w = isIdentity(doc) ? undefined : warp(doc);
  return {
    geometry: { before: gBefore, after: w ? readGeometry(doc, chunks, w) : gBefore },
    bones: { before: bBefore, after: w ? readBones(doc, warpBones(doc)) : bBefore },
  };
}

// ---------------------------------------------------------------------------------------------
// Measuring
// ---------------------------------------------------------------------------------------------

export interface BendInput {
  /** Positions in the root frame as flat xyz triples, in any number of chunks. */
  chunks: readonly ArrayLike<number>[];
  /** The `anchor_mouth` socket, root frame, when the body has one: the best statement of where the head is. */
  mouth?: Vec3;
  /** A generated body's authored yaw (`previewYaw`), when it has one. */
  yaw?: number;
  /** The rig at bind, root frame. Absent on a generation. */
  bones?: readonly BoneNode[];
  rigged?: boolean;
}

export function measureBend(input: BendInput, meta: { key: string; id: string; collection: string; model: string }): BendDoc {
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
  if (!Number.isFinite(lo[0])) throw new Error('measureBend: no vertices');
  // Best statement first, the stretcher's own order and for its own reason: Rhaeticosaurus' box
  // runs across its flippers, so the box is used only when nothing better exists.
  const byMouth = input.mouth ? frameFromMouth(lo, hi, input.mouth) : null;
  const byYaw = input.yaw === undefined ? null : frameFromYaw(input.yaw);
  const frame = byMouth ?? byYaw ?? frameFor(lo, hi, input.mouth);
  const frameSource: FrameSource = byMouth ? 'mouth' : byYaw ? 'yaw' : 'bounds';
  const doc: BendDoc = {
    version: 1, ...meta, frame, frameSource, vertices, rigged: !!input.rigged,
    bones: (input.bones ?? []).map((b) => ({ name: b.name, parent: b.parent, head: [...b.head] as Vec3 })),
    box: { lo: [lo[0], lo[1], lo[2]], hi: [hi[0], hi[1], hi[2]] },
    bounds: { length: 0, height: 0, width: 0, axisMin: 0, axisMax: 0, lateralMid: 0, upMid: 0 },
    base: [0, 0, 0], tip: [0, 0, 0], baseSource: 'trace', tipSource: 'trace',
    baseNormal: forwardVector(frame), tipRest: forwardVector(frame), tipNormal: forwardVector(frame),
    planeSource: { base: 'trace', tip: 'trace' },
    window: DEFAULT_WINDOW, reach: DEFAULT_REACH, chain: null, refs: null,
    chainSource: 'auto', refsSource: 'auto',
  };
  return reframe(doc, frame, frameSource, input.chunks);
}

/**
 * Put the body in a different frame: re-derive the bounds from the measured box, start the span
 * again at the defaults, seat both ends on the body and re-guess the chain and the references.
 *
 * The span cannot be carried across. Its ends are places on the body found from the old axis, and
 * the whole point of changing the frame is that it was the wrong axis.
 */
export function reframe(doc: BendDoc, frame: BendFrame, frameSource: FrameSource = 'manual', chunks?: readonly ArrayLike<number>[]): BendDoc {
  const { A, L } = axes(frame);
  const { lo, hi } = doc.box;
  const next: BendDoc = {
    ...cloneDoc(doc), frame, frameSource,
    bounds: {
      length: Math.max(hi[A] - lo[A], 1e-6), height: hi[1] - lo[1], width: hi[L] - lo[L],
      axisMin: lo[A], axisMax: hi[A],
      lateralMid: (lo[L] + hi[L]) / 2, upMid: (lo[1] + hi[1]) / 2,
    },
    baseNormal: forwardVector(frame), tipRest: forwardVector(frame), tipNormal: forwardVector(frame),
    planeSource: { base: 'trace', tip: 'trace' },
    baseSource: 'trace', tipSource: 'trace',
    chainSource: 'auto', refsSource: 'auto',
  };
  next.base = pointAtHeadFraction(next, DEFAULT_BASE);
  next.tip = pointAtHeadFraction(next, DEFAULT_TIP);
  return chunks ? seat(next, chunks, true) : defaultRefs({ ...next, chain: defaultChain(next) });
}

/**
 * Seat the span's ends on the body, and — when asked — guess the chain and the references again.
 *
 * Each end is asked for as a place; the seat puts it where the body actually *is* near there, which
 * matters three times over: the bend is anchored at the base end, the span's direction is the line
 * between the two, and each end is where its own trace starts. An end a reviewer has set by hand is
 * left alone. An end with no body near it stays where it was asked for, which is what a bounding
 * box would have said all along.
 */
export function seat(doc: BendDoc, chunks: readonly ArrayLike<number>[], fresh = false): BendDoc {
  const next: BendDoc = cloneDoc(doc);
  const reach = Math.max(doc.reach, 1e-4) * doc.bounds.length;
  /** The body's own centre near a point: the centroid of what is within reach, settled on the mode. */
  const settle = (p: Vec3): Vec3 => {
    let c = p;
    for (let it = 0; it < 6; it++) {
      let sx = 0, sy = 0, sz = 0, n = 0;
      for (const ch of chunks) for (let i = 0; i + 2 < ch.length; i += 3) {
        const dx = ch[i] - c[0], dy = ch[i + 1] - c[1], dz = ch[i + 2] - c[2];
        if (dx * dx + dy * dy + dz * dz > reach * reach) continue;
        sx += ch[i]; sy += ch[i + 1]; sz += ch[i + 2]; n++;
      }
      if (!n) return c;
      const m: Vec3 = [sx / n, sy / n, sz / n];
      const moved = len(sub(m, c));
      c = m;
      if (moved < reach * 1e-3) break;
    }
    return c;
  };
  if (doc.baseSource === 'trace') next.base = settle(doc.base);
  if (doc.tipSource === 'trace') next.tip = settle(doc.tip);
  const keep = keepApart(next);
  next.base = keep.base; next.tip = keep.tip;
  return seatPlanes(reguess(next, fresh || !next.chain), chunks, fresh);
}

/**
 * Seat the two planes on the body: measure which way the creature's axis line actually runs at
 * each end of the span, and point the planes along it.
 *
 * `tipRest` is **always** re-measured, whoever aimed the tip plane. It is not an opinion — it is
 * the animal's own heading where the span leaves it, and the turn is measured from there, so a
 * `tipRest` left behind when the span moved would be a rotation taken from a place the body never
 * was. An *aim* a person has given is kept: a straightened tip plane stays aimed at the base
 * plane while the span is nudged about under it, which is the whole use of the thing.
 *
 * Measured from the traces, which are the same run of body the geometry reading is taken over —
 * so a freshly seated pair of planes **is** that reading, and the panel says the same number twice
 * on purpose. Where a trace finds nothing the span's own chord stands in, which is what a bounding
 * box would have said all along.
 */
export function seatPlanes(doc: BendDoc, chunks: readonly ArrayLike<number>[], force = false): BendDoc {
  const next = cloneDoc(doc);
  const t = traces(next, chunks);
  const chord = spanDirection(next);
  // The base trace runs tailward from the base cut, so the direction the axis line runs *in* along
  // it is its negation; the tip trace already runs headward.
  const into: Vec3 = t.base ? [-t.base.direction[0], -t.base.direction[1], -t.base.direction[2]] : chord;
  const outOf: Vec3 = t.tip ? [...t.tip.direction] as Vec3 : chord;
  const held = isIdentity(next);
  next.tipRest = norm(outOf);
  if (force || next.planeSource.base !== 'manual') {
    next.baseNormal = norm(into);
    next.planeSource = { ...next.planeSource, base: 'trace' };
  }
  if (force || next.planeSource.tip !== 'manual' || held) {
    next.tipNormal = [...next.tipRest] as Vec3;
    next.planeSource = { ...next.planeSource, tip: 'trace' };
  }
  return next;
}

/**
 * Seat the planes on the **bone chords** the reading is between instead of on the traced surface.
 *
 * The human answer on a body whose trace cannot be believed, and Askeptosaurus is that body: the
 * trace ahead of its neck reads a residual of 0.009 and the one behind it 0.062, because its trunk
 * is short, fat, curled and crossed by both forelimbs. There the rig is the thing to read, and
 * which two chords is already a choice this tool makes a person make.
 */
export function seatPlanesFromBones(doc: BendDoc): BendDoc {
  if (!doc.refs || !doc.bones.length) return doc;
  const into = boneDirection(doc.bones, doc.refs.base);
  const outOf = boneDirection(doc.bones, doc.refs.tip);
  if (!into || !outOf) return doc;
  const next = cloneDoc(doc);
  next.baseNormal = into;
  next.tipRest = outOf;
  next.tipNormal = [...outOf] as Vec3;
  next.planeSource = { base: 'bones', tip: 'bones' };
  return next;
}

/**
 * Re-make whatever about the chain and the references is still the tool's own guess. `force` is a
 * body that has none yet, where there is nothing of anybody's to keep.
 */
function reguess(doc: BendDoc, force = false): BendDoc {
  const next = cloneDoc(doc);
  if (force || next.chainSource === 'auto') next.chain = defaultChain(next);
  return (force || next.refsSource === 'auto') ? defaultRefs(next) : next;
}

/**
 * The two ends may not meet: a span of no length has no length for a turn to be spread over, and
 * everything about the document — the direction, the stations, the readings — divides by it. They
 * are kept `MIN_SPAN` of the body apart, and it is the *tip* that is pushed off, because the base
 * is where the bend is anchored.
 */
function keepApart(doc: BendDoc): { base: Vec3; tip: Vec3 } {
  const minimum = doc.bounds.length * MIN_SPAN;
  const v = sub(doc.tip, doc.base);
  if (len(v) >= minimum) return { base: doc.base, tip: doc.tip };
  const d = len(v) < EPS ? forwardVector(doc.frame) : norm(v);
  return { base: doc.base, tip: addTo(doc.base, d, minimum) };
}

/** Which way the body runs. Changing it re-derives everything the old axis decided. */
export const setAxis = (doc: BendDoc, axis: 'x' | 'z', chunks?: readonly ArrayLike<number>[]): BendDoc =>
  axis === doc.frame.axis ? doc : reframe(doc, { ...doc.frame, axis }, 'manual', chunks);

// ---------------------------------------------------------------------------------------------
// Edits
// ---------------------------------------------------------------------------------------------

export type EndName = 'base' | 'tip';

export const cloneDoc = (doc: BendDoc): BendDoc => ({
  ...doc, bounds: { ...doc.bounds }, frame: { ...doc.frame },
  baseNormal: [...doc.baseNormal] as Vec3, tipRest: [...doc.tipRest] as Vec3, tipNormal: [...doc.tipNormal] as Vec3,
  planeSource: { ...doc.planeSource },
  bones: doc.bones.map((b) => ({ ...b, head: [...b.head] as Vec3 })),
  box: { lo: [...doc.box.lo] as Vec3, hi: [...doc.box.hi] as Vec3 },
  base: [...doc.base] as Vec3, tip: [...doc.tip] as Vec3,
  chain: doc.chain ? { ...doc.chain } : null,
  refs: doc.refs ? { base: { ...doc.refs.base }, tip: { ...doc.refs.tip } } : null,
});

/**
 * Put one end of the span somewhere — what a drag on its handle asks for, and what the numeric
 * fields set. Moving an end moves the cut, the span's direction and its length all at once, which
 * is what makes the span two points rather than four numbers.
 */
export function setEnd(doc: BendDoc, which: EndName, at: Vec3): BendDoc {
  if (!at.every((v) => Number.isFinite(v))) return doc;
  const next = cloneDoc(doc);
  next[which] = [at[0], at[1], at[2]];
  next[which === 'base' ? 'baseSource' : 'tipSource'] = 'manual';
  const keep = keepApart(next);
  next.base = keep.base; next.tip = keep.tip;
  // Which joints are inside the span has just changed, so a guessed chain and guessed references
  // are guessed again about where the span is now. A chosen one is left exactly as it was chosen.
  return reguess(next);
}

/** Carry an end by a root-frame displacement — what a drag hands over. */
export const moveEnd = (doc: BendDoc, which: EndName, delta: Vec3): BendDoc =>
  setEnd(doc, which, [doc[which][0] + delta[0], doc[which][1] + delta[1], doc[which][2] + delta[2]]);

/** Put both ends back to the automatic seat and let the body say where they are. */
export function reseat(doc: BendDoc, chunks: readonly ArrayLike<number>[]): BendDoc {
  const next = cloneDoc(doc);
  next.baseSource = 'trace'; next.tipSource = 'trace';
  return seat(next, chunks);
}

/** Put the chain and the chords back to what the span implies, whoever last named them. */
export function reguessRefs(doc: BendDoc): BendDoc {
  const next = cloneDoc(doc);
  next.chainSource = 'auto'; next.refsSource = 'auto';
  return reguess(next, true);
}

/**
 * Aim one of the two planes: say which way the creature's axis line runs through it.
 *
 * The vector is normalised and need not be square to anything — it *is* the plane, since a plane
 * square to a direction is that direction. Aiming the **tip** plane is the bend: the body turns so
 * that its own heading at that end comes onto the aim, and the plane's motion is therefore exactly
 * the motion of the body under it, which is what the old roll control could not be. Aiming the
 * **base** plane moves nothing at all — nothing behind the base cut ever does — and changes what
 * the tip plane is aimed *at*, which is to say what "straight" means here.
 *
 * A direction that says nothing (a zero vector, or nonsense) is refused rather than collapsing the
 * plane, because a plane with no normal has no orientation and every angle taken against it would
 * come back as a NaN a reviewer would read as an answer.
 */
export function setPlaneNormal(doc: BendDoc, which: PlaneEnd, v: Vec3): BendDoc {
  if (!v.every((x) => Number.isFinite(x)) || len(v) < 1e-9) return doc;
  const next = cloneDoc(doc);
  const n = norm(v);
  if (which === 'base') next.baseNormal = n; else next.tipNormal = n;
  next.planeSource = { ...next.planeSource, [which]: 'manual' } as BendDoc['planeSource'];
  return next;
}

/**
 * **Aim the tip plane at the base plane**, which is the whole of what straightening is.
 *
 * The bend is the rotation carrying the tip end's own heading onto the tip plane's aim, so with the
 * two planes aimed the same way that rotation carries the head's heading onto the trunk's and the
 * run between them comes straight. Nothing is solved for and nothing is iterated: the reviewer says
 * which direction they are calling the trunk, and this points the other plane along it.
 *
 * It is still an *aim* rather than a proof. What comes out is measured afterwards — both readings,
 * over the warped mesh and the warped rig — and a base plane aimed somewhere the body's own centre
 * line does not run will straighten the body onto *that*, which is the reviewer's judgement to make
 * and the panel's job to show.
 */
export function straighten(doc: BendDoc): BendDoc {
  const next = cloneDoc(doc);
  next.tipNormal = norm(doc.baseNormal);
  next.planeSource = { ...next.planeSource, tip: 'manual' };
  return next;
}

/** Put the tip plane back on the body's own heading there: no bend, the planes left where they sit. */
export function resetTurn(doc: BendDoc): BendDoc {
  const next = cloneDoc(doc);
  next.tipNormal = [...doc.tipRest] as Vec3;
  return next;
}

/** How much body a trace runs over. Held to something that has vertices in it. */
export function setWindow(doc: BendDoc, fraction: number): BendDoc {
  const next = cloneDoc(doc);
  next.window = clamp(Number.isFinite(fraction) ? fraction : DEFAULT_WINDOW, 0.01, 0.5);
  return next;
}

/** How far off the trace a vertex may sit and still count. */
export function setReach(doc: BendDoc, fraction: number): BendDoc {
  const next = cloneDoc(doc);
  next.reach = clamp(Number.isFinite(fraction) ? fraction : DEFAULT_REACH, 0.005, 0.5);
  return next;
}

/** Which run of the rig the joint table follows. Naming one re-defaults the chords onto it. */
export function setChain(doc: BendDoc, end: keyof BoneRef, bone: string): BendDoc {
  if (!doc.chain) return doc;
  const next = cloneDoc(doc);
  next.chain![end] = bone;
  next.chainSource = 'manual';
  next.refsSource = 'auto';
  return defaultRefs(next);
}

/** Which chord the reading is between. A chord a person has named is never guessed again. */
export function setRef(doc: BendDoc, which: keyof BoneRefs, end: keyof BoneRef, bone: string): BendDoc {
  if (!doc.refs) return doc;
  const next = cloneDoc(doc);
  next.refs![which][end] = bone;
  next.refsSource = 'manual';
  return next;
}

/**
 * Which end of the *body* the head is at.
 *
 * It re-reads "back from the nose", which is what the frame is for, and changes nothing else: the
 * span keeps its two ends, the planes keep their aims and the bend keeps its shape. It used to swap
 * the span's ends and negate the turns with them, so that a span bent one way from the tail end came
 * back as the same shape bent the other way from the head end. Two aimed planes have no such
 * negation — which end of the span the bend is anchored at is a real choice about which part of the
 * animal is held still, and it is one the reviewer already made by placing the two ends.
 */
/**
 * Whether anything actually decided **which end is the head**, as opposed to the axis.
 *
 * The box can only ever pick the axis. `frameFor` takes the longer horizontal side and then, with
 * no mouth socket to read a sign off, returns `forward: 1` — the high end — as a *default*, not as
 * a finding. Every one of the three editors reaches that fallback exactly when `frameSource` is
 * `bounds`, because a mouth or an authored yaw would have won first, so the source is the whole
 * test and no second field has to be kept in step with it.
 *
 * It is worth saying out loud because everything the frame is *for* inverts with it: `axisAt`,
 * `headFractionAt`, "how far back from the nose", and the export's own claim about which end the
 * head is at. Askeptosaurus' published original pose carries no rig, so no mouth socket, and the
 * empty `preview-orientation.json` gives it no authored yaw either — so a reviewer aimed a bend on
 * it under a panel that said the head was at high z while the snout sat at z 0.038 and the
 * shoulders at 0.277, and the two head fractions in that export are both measured from the tail.
 * The bend itself survived it (the rule is "turn about an axle through `base`", which names no
 * end), but nothing that reads a fraction did, and the panel had stated a direction it never
 * earned.
 */
export const forwardEarned = (doc: Pick<BendDoc, 'frameSource'>) => doc.frameSource !== 'bounds';

export function flipForward(doc: BendDoc): BendDoc {
  const next = cloneDoc(doc);
  next.frame = { ...doc.frame, forward: doc.frame.forward === 1 ? -1 : 1 };
  next.frameSource = 'manual';
  return reguess(next);
}

// ---------------------------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------------------------

/**
 * What the body on stage is, so a consumer knows which file the bend describes.
 *
 * The mouth editor's four, plus one this mode needs and that one does not: **`origpose`**, the
 * untouched generation republished beside a body whose builder moved the mesh or carried a pose
 * into the bind (`tools/triassic/base-poses.mjs`). A bend measured on a corrected body and one
 * measured on the body before the correction are different claims about different geometry, and on
 * Askeptosaurus they differ by the whole 67.7° the correction was about — so the file has to say
 * which, and `built` cannot be allowed to mean either.
 */
export type AppliesTo = 'generation' | 'preview' | 'built' | 'twin' | 'origpose';

export interface BendExportInput {
  sha256: string | null;
  sha256Source: 'measured' | 'manifest' | null;
  appliesTo: AppliesTo;
  note: string;
  authoredAt: string;
  /** The readings the panel showed, so a consumer can prove it read the same body the same way. */
  readings: Readings;
  /** The worst squeeze on the inside of the bend. */
  pinch: number;
  /** How straight each geometry trace was: the trace's own opinion of its own reading. */
  traceResidual: { base: number | null; tip: number | null };
}

const round = (v: number, places = 6) => Math.round(v * 10 ** places) / 10 ** places;
const deg = (r: number) => round(r * 180 / Math.PI, 3);
const r3 = (v: Vec3) => v.map((x) => round(x)) as Vec3;

/**
 * A glTF root-frame vector as a Blender Z-up one.
 *
 * The creature builders work in Blender and write glTF out through `[v.x, v.z, −v.y]`, so a bend
 * axis measured here has to be turned round before a builder can pose a bone about it. Doing that
 * in the file rather than leaving it to whoever reads the file is the difference between a number a
 * builder can use and a number a builder has to re-derive — which is the failure this whole tool is
 * about.
 */
export const toBlender = (v: Vec3): Vec3 => [round(v[0]), round(-v[2]), round(v[1])];

const describeReading = (r: Reading | null) => (r === null ? null : {
  base: r3(r.base),
  tip: r3(r.tip),
  inPlaneDegrees: deg(r.inPlane),
  offPlaneDegrees: deg(r.offPlane),
  totalDegrees: deg(r.total),
});

/** "tail_00 → chest", the reference named the way the panel names it. */
export const refLabel = (ref: BoneRef) => `${ref.from} → ${ref.to}`;

/**
 * The document as handed over.
 *
 * Two audiences, so it says everything twice. `bend` is the document itself and is what
 * `fromExport` reads to rebuild the same warp and the same readings. Everything beside it is for
 * the person reading the file: the span as points and as fractions of the body, the axis as a
 * vector in both frames, the turn in degrees, the per-joint table a builder poses a rig with, and —
 * the reason the tool exists — **what was measured, between which two references, before and
 * after**.
 */
export function exportDoc(doc: BendDoc, input: BendExportInput) {
  const basis = bendBasis(doc);
  const joints = jointTurns(doc);
  return {
    schema: 'bend-span/2' as const,
    id: doc.id,
    model: doc.model,
    sha256: input.sha256,
    sha256Source: input.sha256Source,
    appliesTo: input.appliesTo,
    /**
     * What the file is for. On a body with no rig the warp on stage is the whole of the bend and
     * the file describes it; on a rigged one the warp is held at rest and never leaves the page,
     * because every clip re-specifies each joint's translation on every frame and a bent bind pose
     * would be overridden and deformed the moment anything played. Either way the numbers go to the
     * animal's builder — there is no bake.
     *
     * An `origpose` body carries no rig and is still a measurement rather than an edit: the file on
     * stage is a published **copy** of the generation in `tripo-raw/`, so an edit to it would be an
     * edit to a copy nothing is built from, and what the numbers are for is the builder that turns
     * that generation into the body.
     */
    use: doc.rigged || input.appliesTo === 'origpose' ? 'builder-measurement' : 'mesh-edit',
    authoredAt: input.authoredAt,
    note: input.note,
    creature: { key: doc.key, id: doc.id, collection: doc.collection, vertices: doc.vertices, rigged: doc.rigged },
    frame: {
      ...doc.frame, source: doc.frameSource,
      forwardEarned: forwardEarned(doc),
      note: `Model root frame, unscaled: the file's own coordinates with the scene graph flattened. The body runs along ${doc.frame.axis}; the head is ${forwardEarned(doc) ? '' : 'ASSUMED to be '}at the ${doc.frame.forward === 1 ? 'high' : 'low'} end${forwardEarned(doc) ? '' : ' — the bounding box picks the axis and cannot pick the end, so nothing decided this and `forwardEarned` is false. Check it before reading any fraction below: `span.baseHeadFraction`, `span.tipHeadFraction` and every other "back from the nose" reading are measured from whichever end this names, and invert with it. The bend itself does not — it is a turn about an axle through `span.base` and names no end'}. The span does not have to follow that axis — it is two points on the animal — but "up", "lateral" and "how far back from the nose" are measured in this frame.`,
    },
    span: {
      base: r3(doc.base),
      tip: r3(doc.tip),
      baseSource: doc.baseSource,
      tipSource: doc.tipSource,
      baseHeadFraction: round(headFractionAt(doc, doc.base), 4),
      tipHeadFraction: round(headFractionAt(doc, doc.tip), 4),
      direction: r3(spanDirection(doc)),
      length: round(spanLength(doc)),
      percentOfBody: round(spanLength(doc) / doc.bounds.length * 100, 2),
      note: 'Two points on the body. Both cuts are square to the line between them, that line is the span\'s direction, and its length is the distance between them. The bend is anchored at `base`, and both points are where the geometry reading\'s traces start. "trace" is the automatic seat — the body\'s own centre near where the end was asked for — and "manual" is a reviewer who put it there by hand.',
    },
    planes: {
      baseNormal: r3(norm(doc.baseNormal)),
      baseNormalBlenderZUp: toBlender(norm(doc.baseNormal)),
      baseSource: doc.planeSource.base,
      tipRest: r3(norm(doc.tipRest)),
      tipNormal: r3(norm(doc.tipNormal)),
      tipNormalBlenderZUp: toBlender(norm(doc.tipNormal)),
      tipSource: doc.planeSource.tip,
      apartDegrees: deg(angleOf(doc.baseNormal, doc.tipNormal)),
      apartBeforeDegrees: deg(angleOf(doc.baseNormal, doc.tipRest)),
      note: 'Two planes, one at each end of the span, each named by the direction the creature\u2019s axis line runs through it. baseNormal is where it runs in and is a pure reference \u2014 nothing behind the base cut moves under any bend. tipRest is where it ran out when the plane was seated on the body, measured rather than chosen; tipNormal is where it is to run out. apartDegrees is how far the two planes are aimed apart now and apartBeforeDegrees how far they were before the bend, so a zero in the first and the animal\u2019s own curve in the second is a run that has been straightened.',
    },
    axis: {
      vector: r3(basis.axis),
      vectorBlenderZUp: toBlender(basis.axis),
      up: r3(basis.up),
      twistDegrees: deg(twistAngle(doc)),
      note: 'The axle the span turns about, through span.base: the shortest rotation carrying planes.tipRest onto planes.tipNormal, so it is derived from the two planes rather than dialled. A positive turn carries the body towards axis.up. twistDegrees is how far it leans along the span, which is the share of an oblique aim that is a twist of the span about its own length rather than a bend; it is reported rather than clamped, because clamping it would mean the turn no longer carried the tip plane where it was aimed. vectorBlenderZUp is the same direction in a Z-up armature frame ([x, \u2212z, y]).',
    },
    turn: {
      totalDegrees: deg(totalTurn(doc)),
      note: 'The whole the span turns through: the angle between planes.tipRest and planes.tipNormal, spread linearly across the span so the rotation at the base cut is exactly identity and there is no kink there. It is never negative \u2014 which way the body goes is carried by axis.vector.',
    },
    reading: {
      window: doc.window,
      reach: doc.reach,
      windowNote: `The geometry reading traces the body's own centre outward from each end of the span, over ${round(doc.window * 100, 1)}% of the body, following the body rather than a coordinate: each step takes only what is within ${round(doc.reach * 100, 1)}% of the body of where the trace stood one step back, so a limb that reaches past the head is left behind rather than averaged into it.`,
      geometry: {
        baseReference: `the body's traced centre over the ${round(doc.window * 100, 1)}% behind the base cut`,
        tipReference: `the body's traced centre over the ${round(doc.window * 100, 1)}% ahead of the tip cut`,
        baseResidual: input.traceResidual.base === null ? null : round(input.traceResidual.base, 4),
        tipResidual: input.traceResidual.tip === null ? null : round(input.traceResidual.tip, 4),
        residualNote: 'How far each trace sits off its own fitted line, over that run\'s length. A run of body is nearly a line, so a small figure means the trace followed one thing; past about 0.05 it wandered, and the angle it reports is between two directions nothing in the animal actually runs in.',
        before: describeReading(input.readings.geometry.before),
        after: describeReading(input.readings.geometry.after),
      },
      bones: doc.refs ? {
        chain: doc.chain ? refLabel(doc.chain) : null,
        chainSource: doc.chainSource,
        referencesSource: doc.refsSource,
        baseReference: refLabel(doc.refs.base),
        baseMovesWithTheBend: refMoves(doc, doc.refs.base),
        tipReference: refLabel(doc.refs.tip),
        tipMovesWithTheBend: refMoves(doc, doc.refs.tip),
        before: describeReading(input.readings.bones.before),
        after: describeReading(input.readings.bones.after),
      } : null,
      note: 'Every angle is measured between two named references and nothing else. inPlaneDegrees is the part of the turn the bend axis accounts for and is what an edit changes; offPlaneDegrees is what the plane does not hold, and a large one means the axis is aimed wrong rather than that the bend is small. A reference that moves with the bend sits inside the span, so "after" less "before" is not turn.totalDegrees — and is larger than it where that reference sits well off the span\'s own line.',
    },
    joints: joints.map((j) => ({
      bone: j.bone,
      spanFraction: round(j.s, 4),
      accumulatedDegrees: deg(j.accumulated),
      localDegrees: deg(j.local),
    })),
    jointsNote: 'The joints of the chain that lie inside the span, plus the first one past it, in chain order. `local` is the step from the joint above it, which is what a pose bone\'s own rotation is; `accumulated` is the rotation at that joint\'s station, which is the product down the chain. Both are about axis.vectorBlenderZUp in an armature whose bones share one rest orientation. This is the shape `uncurl` returns and `carry_rest` consumes in tools/triassic/creatures/askeptosaurus/build.py.',
    pinch: {
      worst: round(input.pinch, 4),
      note: 'The smallest the inside of the bend is squeezed to, as a fraction of its own length. 1 is no squeeze; below 0 the turn is tighter than the body is thick and the surface has folded through itself.',
    },
    rule: 'A vertex at fraction s through the span (its distance from span.base along span.direction, over span.length) is carried to the bent centreline at s and turned about axis.vector by turn.totalDegrees·s. Behind the base cut s is 0 and nothing moves; past the tip cut s is 1 and the far part is carried rigidly. See docs/viewer-bend.md.',
    bend: doc,
  };
}

export type BendExport = ReturnType<typeof exportDoc>;

/**
 * Read a document back out of an exported file, refusing one measured on a different mesh.
 *
 * Every consumer goes through here rather than reaching into the payload, so "the export is enough
 * to rebuild the warp and the readings, and is refused on the wrong body" is one claim in one
 * place. `actual` is what the consumer measured on the file it is about to read against; a hash
 * that does not match is a bend placed on a mesh that has since changed, and a vertex count that
 * does not match is the same thing said by a file that carried no hash.
 */
export function fromExport(payload: unknown, actual?: { sha256?: string | null; vertices?: number }): BendDoc {
  const p = payload as Partial<BendExport> | null;
  if (!p || typeof p !== 'object') throw new Error('not a bend file');
  if ((p.schema as string) === 'bend-span/1') {
    throw new Error('this bend file was written before the two planes (schema "bend-span/1"): it carries turn rates and a bend-plane roll, which no longer describe a bend. Open the body in the viewer and place the span again.');
  }
  if (p.schema !== 'bend-span/2') throw new Error(`not a bend file (schema "${String(p.schema)}")`);
  const doc = p.bend as BendDoc | undefined;
  if (!doc || typeof doc !== 'object') throw new Error('bend file has no document');
  for (const k of ['window', 'reach'] as const) {
    if (!Number.isFinite(doc[k])) throw new Error(`bend file has no usable "${k}"`);
  }
  for (const k of ['base', 'tip'] as const) {
    const v = doc[k] as unknown;
    if (!Array.isArray(v) || v.length !== 3 || !v.every((n) => Number.isFinite(n))) throw new Error(`bend file has no usable "${k}"`);
  }
  // A plane is its normal, so a normal that is not a direction is a plane with no orientation, and
  // every angle taken against it would come back NaN and read as an answer.
  for (const k of ['baseNormal', 'tipRest', 'tipNormal'] as const) {
    const v = doc[k] as unknown;
    if (!Array.isArray(v) || v.length !== 3 || !v.every((n) => Number.isFinite(n)) || Math.hypot(v[0], v[1], v[2]) < 1e-9) {
      throw new Error(`bend file has no usable "${k}"`);
    }
  }
  if (!doc.planeSource || typeof doc.planeSource !== 'object') throw new Error('bend file has no usable "planeSource"');
  if (!doc.frame || (doc.frame.axis !== 'x' && doc.frame.axis !== 'z')) throw new Error('bend file has no usable frame');
  if (!doc.bounds || !Number.isFinite(doc.bounds.length)) throw new Error('bend file has no usable bounds');
  if (!Array.isArray(doc.bones)) throw new Error('bend file has no usable bone list');
  if (actual) {
    if (p.sha256 && actual.sha256 && p.sha256 !== actual.sha256) {
      throw new Error(`bend file was measured on ${p.model} at sha256 ${p.sha256.slice(0, 12)}… but the file is now ${actual.sha256.slice(0, 12)}…: the body has changed since the span was placed`);
    }
    if (actual.vertices !== undefined && doc.vertices && doc.vertices !== actual.vertices) {
      throw new Error(`bend file was measured on ${doc.vertices} vertices but the body has ${actual.vertices}: the body has changed since the span was placed`);
    }
  }
  return doc;
}

/**
 * "+54.6° in the bend plane · 12.1° out of it · 56.0° in all" — the live readout's own words.
 *
 * All three, because each hides the other two. The in-plane figure is the one an edit changes and
 * the one a target is dialled to; the out-of-plane figure is the tell that the axle is aimed wrong;
 * and the total is the number everybody quotes, which is exactly why it must not be the only one
 * shown — two readings of one animal can differ by thirty degrees in total and by seven in the
 * plane, and a reviewer comparing definitions wants the first.
 */
export function describeReadingText(r: Reading | null): string {
  if (!r) return 'no reading — nothing traceable in the window';
  const d = (x: number) => (x * 180 / Math.PI).toFixed(1);
  const sign = r.inPlane > 0 ? '+' : '';
  return `${sign}${d(r.inPlane)}° in the bend plane · ${d(r.offPlane)}° out of it · ${d(r.total)}° in all`;
}
