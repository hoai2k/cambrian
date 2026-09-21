/**
 * The viewer's bend document. Run: npm run bend
 *
 * Guards what the editor is made of, without a browser: the span is two points and everything
 * follows from them; each end is an **oriented plane** and the bend is whatever carries the axis
 * line from the one to the other, so aiming both the same way straightens the run between them;
 * the warp holds the body behind the base cut exactly still, carries the far part rigidly, and
 * bends the part between without changing its length; the rotation at the base cut is identity by
 * construction however far apart the planes are aimed, so no number can kink the body there; the
 * per-joint table is what a builder poses a rig with and adds back up to the whole turn; the
 * readings say which two references they are between and are measured after the edit rather than
 * predicted; the trace follows the body past a limb that crosses it; and the exported file is
 * enough to rebuild all of it — refused on a body whose hash or vertex count no longer matches, and
 * refused outright where it was written against the turn rates the planes replaced.
 */
import assert from 'node:assert/strict';
import {
  DEFAULT_REACH, DEFAULT_STRAIGHTEN, DEFAULT_WINDOW, MIN_SPAN, STRAIGHTEN_MAX, STRAIGHTEN_MIN,
  angleBetween, angleOf, apartAfter, bendBasis, bendRotation, boneStation,
  chainPath, describeReadingText, exportDoc, flipForward, forwardEarned, fromExport, fullStraightening,
  headFractionAt, isIdentity, jointTurns,
  measureBend, moveEnd, normalWarp, pinch, readBend, readBones, readGeometry, refLabel, refMoves,
  reguessRefs, reseat, resetTurn, rotateAbout, seat, seatPlanes, seatPlanesFromBones, setAxis, setChain,
  setEnd, setPlaneNormal, setReach, setRef, setStraighten, setWindow, spanDirection, spanLength,
  straightenFully, tipCarried, toBlender,
  totalTurn, traceCentreline, traces, turnAt, twistAngle, warp, warpBones,
  type BendDoc, type BoneNode, type Vec3,
} from '../src/viewer/bend/bend';
import { buttonRoles, schemeIsUsable } from '../src/viewer/pointer-scheme';
import { History } from '../src/viewer/sculpt/history';

let passes = 0;
const ok = (cond: unknown, msg: string) => { assert.ok(cond, msg); passes++; };
const near = (a: number, b: number, tol: number, msg: string) => ok(Math.abs(a - b) <= tol, `${msg} (${a} vs ${b})`);
const nearV = (a: readonly number[], b: readonly number[], tol: number, msg: string) =>
  ok(a.every((v, i) => Math.abs(v - b[i]) <= tol), `${msg} ([${a.map((v) => v.toFixed(4))}] vs [${b.map((v) => v.toFixed(4))}])`);
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const deg = (r: number) => r * 180 / Math.PI;
const rad = (d: number) => d * Math.PI / 180;

/**
 * A document whose applied turn is exactly `radians` about `axis`: the tip plane set `radians` the
 * *other* way off the base plane, and the slider at 1 so the whole of that straightening is taken.
 *
 * Which is the model in one line. The turn is a fraction of the angle between two planes that
 * describe the body, so asking for a particular turn means saying where the two planes stand and
 * how much of the way to go — and at a full straighten the bend is the rotation carrying the tip
 * plane onto the base plane, which is `radians` about `axis` by construction.
 * `[-1, 0, 0]` on this fixture lifts the tip the way up is.
 */
function bendBy(doc: BendDoc, radians: number, axis: Vec3 = [-1, 0, 0]): BendDoc {
  const out: Vec3 = [0, 0, 0];
  rotateAbout(doc.baseNormal, axis, -radians, out);
  return setStraighten(setPlaneNormal(doc, 'tip', out), 1);
}

/**
 * The stretch and mouth tests' animal, along z with the head at the high end: a body from z=−4 to
 * 0, a neck of radius .2 from 0 to 2, and a head from 2 to 3 that swells to radius .55 at z=2.5.
 */
function animal(): Float32Array {
  const out: number[] = [];
  const ring = (z: number, r: number) => {
    for (let k = 0; k < 24; k++) {
      const t = (k / 24) * Math.PI * 2;
      out.push(r * Math.cos(t), r * Math.sin(t), z);
    }
  };
  for (let i = 0; i <= 40; i++) ring(-4 + 4 * (i / 40), 1 - .6 * (i / 40));
  for (let i = 1; i <= 20; i++) ring(2 * (i / 20), .2);
  for (let i = 1; i <= 10; i++) ring(2 + i / 10, .2 + .35 * Math.sin(Math.PI * i / 10));
  return new Float32Array(out);
}

const chunks = [animal()];
const meta = { key: 'triassic:test', id: 'test', collection: 'triassic', model: 'assets/triassic/creatures/test.glb' };
const mouth: Vec3 = [0, 0, 3];

/** A straight chain down the neck, the way a rig lays one: trunk, four cervicals, skull. */
const bones: BoneNode[] = [
  { name: 'root', parent: null, head: [0, 0, -4] },
  { name: 'body', parent: 'root', head: [0, 0, -2] },
  { name: 'chest', parent: 'body', head: [0, 0, 0] },
  { name: 'neck_00', parent: 'chest', head: [0, 0, .5] },
  { name: 'neck_01', parent: 'neck_00', head: [0, 0, 1] },
  { name: 'neck_02', parent: 'neck_01', head: [0, 0, 1.5] },
  { name: 'skull', parent: 'neck_02', head: [0, 0, 2] },
  { name: 'jaw', parent: 'skull', head: [0, -.05, 2.05] },
  // A limb hanging off the chest, which is what the chain guess has to not follow.
  { name: 'fin_L', parent: 'chest', head: [.6, -.2, .3] },
  { name: 'fin_L_tip', parent: 'fin_L', head: [1.2, -.4, .6] },
];

// ---------------------------------------------------------------------------------- the measure

const guessed = measureBend({ chunks }, meta);
ok(guessed.frame.axis === 'z' && guessed.frame.forward === 1 && guessed.frameSource === 'bounds', 'with nothing better the frame is the box, and says so');
// **The box picks the axis and cannot pick the end**, and saying otherwise cost a real reviewer a
// real export: Askeptosaurus' published original pose carries no rig and so no mouth socket, and
// there is no authored yaw for it either, so the panel said "the head is at the high end" of z
// while the snout sat at z 0.038 and the shoulders at 0.277 — and both head fractions in the file
// that came out are measured from the tail. Nothing may state that direction as a finding when
// nothing found it.
ok(!forwardEarned(guessed), 'the box has not earned which end is the head, and the document says so');
ok(forwardEarned(measureBend({ chunks, mouth }, meta)) && forwardEarned(measureBend({ chunks, yaw: 180 }, meta)),
  'a socket or an authored yaw does earn it');
ok(guessed.vertices === chunks[0].length / 3, 'every vertex is counted, for a consumer to check against');
near(guessed.bounds.length, 7, 1e-6, 'the body is as long as it is');
ok(!guessed.rigged && guessed.bones.length === 0 && guessed.refs === null, 'a body with no rig has no chain and no bone reading');
ok(guessed.window === DEFAULT_WINDOW && guessed.reach === DEFAULT_REACH, 'the reading\'s own settings are in the document, not hidden in a constant');
ok(guessed.straighten === DEFAULT_STRAIGHTEN && DEFAULT_STRAIGHTEN === 0, 'and the slider starts at nothing: the editor opens on the animal as it stands');
ok(guessed.version === 2, 'the document says which shape it is, because the tip plane changed meaning at schema 3');
ok(measureBend({ chunks, mouth }, meta).frameSource === 'mouth', 'a mouth socket frames the body');
ok(measureBend({ chunks, yaw: 180 }, meta).frame.forward === -1, 'and an authored yaw says which end the head was at');
ok(measureBend({ chunks, yaw: 180, mouth }, meta).frameSource === 'mouth', 'the socket wins over the yaw');
assert.throws(() => measureBend({ chunks: [new Float32Array(0)] }, meta), /no vertices/); passes++;

// The span is two points, and everything about it follows from them.
const neck = seatPlanes(setEnd(setEnd(measureBend({ chunks, mouth, bones, rigged: true }, meta), 'base', [0, 0, 0]), 'tip', [0, 0, 2]), chunks);
near(spanLength(neck), 2, 1e-12, 'the span is as long as the gap between its ends');
nearV(spanDirection(neck), [0, 0, 1], 1e-12, 'and runs from the base end to the tip end');
{
  // A span aimed across the body axis: still a span, which is the whole reason the ends are points.
  const oblique = setEnd(neck, 'tip', [1, 0, 1]);
  near(spanLength(oblique), Math.SQRT2, 1e-12, 'a span that leaves the body axis is measured along itself');
  nearV(spanDirection(oblique), [1 / Math.SQRT2, 0, 1 / Math.SQRT2], 1e-12, 'and aims where its ends put it');
  const tiny = setEnd(neck, 'tip', [0, 0, 1e-9]);
  ok(spanLength(tiny) >= neck.bounds.length * MIN_SPAN - 1e-9, 'two ends may not meet: the tip is pushed off rather than dividing through zero');
}

// --------------------------------------------------------------------------------- the planes

{
  nearV(neck.baseNormal, [0, 0, 1], .02, 'seated on a straight body, the base plane says the axis runs in along the body');
  nearV(neck.tipRest, [0, 0, 1], .02, 'and the tip plane says it runs out the same way');
  nearV(neck.tipNormal, neck.tipRest, 1e-12, 'a freshly seated tip plane is the body\'s own measured heading, not an aim');
  ok(isIdentity(neck), 'so the two agree and there is no bend at all');
  near(totalTurn(neck), 0, 1e-9, 'nor any turn');
  ok(neck.planeSource.base === 'trace' && neck.planeSource.tip === 'trace', 'both were measured rather than chosen, and the document says so');

  const level = bendBasis(neck);
  nearV(level.forward, [0, 0, 1], 1e-12, 'forward runs along the span');
  near(Math.hypot(...level.axis), 1, 1e-12, 'the axle is a unit vector even with nothing to turn about');
  near(dot(level.up, level.forward), 0, 1e-12, 'and up is square to the span');

  const out: Vec3 = [0, 0, 0];
  warp(bendBy(neck, rad(30)))(0, 0, 2, out);
  ok(out[1] > 0, 'aiming the tip plane up about −x lifts the tip');
  const swung: Vec3 = [0, 0, 0];
  warp(bendBy(neck, rad(30), [0, 1, 0]))(0, 0, 2, swung);
  ok(swung[0] > 0, 'and about +y it swings it towards +lateral — the plane goes where it is aimed');

  // The axle is derived from the two planes and nothing else: no roll, no dial.
  const up30 = bendBy(neck, rad(30));
  nearV(bendRotation(up30).axis, [-1, 0, 0], .02, 'the axle is the hinge the two planes imply');
  near(deg(bendRotation(up30).angle), 30, 1e-6, 'and at a full straighten the turn is the whole angle between them');
  near(deg(angleOf(up30.baseNormal, up30.tipNormal)), 30, 1e-6, 'which is what "the planes are N° apart" means');
  near(deg(fullStraightening(up30)), 30, 1e-6, 'and is the straightening the slider is a fraction of');
  near(deg(twistAngle(up30)), 0, 1e-6, 'a hinge square to the span carries no twist');
  // **The axle does not move with the amount.** It is a fact about the two planes, so every angle
  // in the panel stays read in one plane while the slider is dragged through nothing and out the
  // other side — which is exactly where a sign convention would otherwise flip under a reviewer.
  for (const f of [0, .25, 1, 1.5, -.5]) {
    nearV(bendRotation(setStraighten(up30, f)).axis, bendRotation(up30).axis, 1e-12, 'the axle is the planes\' and not the slider\'s');
  }

  // A plane aimed at nothing is refused: a plane with no normal has no orientation, and every
  // angle taken against it would come back NaN and read as an answer.
  ok(setPlaneNormal(neck, 'tip', [0, 0, 0]) === neck, 'a zero direction leaves the plane where it was');
  ok(setPlaneNormal(neck, 'base', [NaN, 0, 1]) === neck, 'and so does nonsense');
  const aimed = setPlaneNormal(neck, 'tip', [0, 2, 0]);
  near(Math.hypot(...aimed.tipNormal), 1, 1e-12, 'an aim is normalised, because a plane is a direction');
  ok(aimed.planeSource.tip === 'manual', 'and is then a person\'s answer rather than the tool\'s measurement');
  ok(aimed.planeSource.base === 'trace', 'the other plane is left alone');
}

// ------------------------------------------------------------------------------- the straighten

{
  // **The slider, and the contract it makes.** The two planes describe the body; this says how far
  // of the way from the one to the other the run between them is carried. Everything here is the
  // arithmetic of that, and the last two checks are the promise: at 1 the two planes finish
  // parallel, measured over the warp rather than read back off the number that produced it.
  const curve = bendBy(neck, rad(35));            // planes 35° apart, slider at 1
  near(deg(fullStraightening(curve)), 35, 1e-9, 'the two planes stand 35° apart whatever the slider says');
  for (const f of [0, .25, .5, 1]) {
    near(deg(totalTurn(setStraighten(curve, f))), 35 * f, 1e-9, `the turn applied is exactly ${f} of the straightening`);
    near(deg(fullStraightening(setStraighten(curve, f))), 35, 1e-9, 'and the planes never move when the slider does');
  }
  ok(isIdentity(setStraighten(curve, 0)), 'at nothing there is no bend at all');
  const still: Vec3 = [0, 0, 0];
  warp(setStraighten(curve, 0))(.1, .15, 1.2, still);
  nearV(still, [.1, .15, 1.2], 0, 'and the body is left exactly where it stands, to the last decimal');
  // Past 1 and below 0: the two ends of a control a reviewer walks past the answer and back with.
  near(deg(totalTurn(setStraighten(curve, 1.5))), 52.5, 1e-9, 'past 1 it overshoots');
  near(deg(totalTurn(setStraighten(curve, -.5))), -17.5, 1e-9, 'and below 0 it bends the other way, which is further the way the animal already goes');
  ok(totalTurn(setStraighten(curve, -.5)) < 0 && totalTurn(setStraighten(curve, .5)) > 0, 'the sign of the turn is the slider\'s');
  ok(setStraighten(curve, 9).straighten === STRAIGHTEN_MAX && setStraighten(curve, -9).straighten === STRAIGHTEN_MIN,
    'a figure outside the range is held to it rather than taken');
  ok(setStraighten(curve, NaN) === curve, 'and nonsense leaves the document exactly as it was');

  // **The contract.** At 1 the two planes are parallel — and it is measured on the plane the warp
  // actually carried, not worked back out of the rotation that was asked for.
  const flat = setStraighten(curve, 1);
  near(deg(apartAfter(flat)), 0, 1e-9, 'at 1 the tip plane finishes parallel to the base plane');
  nearV(tipCarried(flat), flat.baseNormal, 1e-9, 'landing on it exactly');
  // Measured again through the warp itself: two points on the tip plane's own normal, both past
  // the tip cut where the body is carried rigidly, so the direction between them after the bend is
  // where that plane has really gone.
  {
    const f = warp(flat);
    const a: Vec3 = [0, 0, 0], b: Vec3 = [0, 0, 0];
    const at = flat.tip, n = flat.tipNormal;
    f(at[0], at[1], at[2], a);
    f(at[0] + n[0] * .4, at[1] + n[1] * .4, at[2] + n[2] * .4, b);
    const carried: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    near(deg(angleOf(carried, flat.baseNormal)), 0, 1e-6,
      'and the warp itself carries that plane onto the base plane, measured through the map rather than predicted from it');
  }
  // Halfway is halfway, measured the same way.
  const half = setStraighten(curve, .5);
  near(deg(apartAfter(half)), 17.5, 1e-9, 'at a half the planes are left half the straightening apart');
  ok(deg(apartAfter(setStraighten(curve, 0))) > 34.9, 'and at nothing they are as far apart as the body has them');
  // The slider and the planes are separate answers, which is the whole of the split: re-seating
  // the planes on the body does not throw the amount away, and it used to have to.
  const reseated = seatPlanes(half, chunks, true);
  near(reseated.straighten, .5, 1e-12, 'seating the planes again keeps the amount');
  near(setEnd(half, 'tip', [0, 0, 1.4]).straighten, .5, 1e-12, 'and so does moving the span under it');
  near(straightenFully(half).straighten, 1, 1e-12, 'Straighten it is the slider at one');
  near(resetTurn(half).straighten, 0, 1e-12, 'and No bend is the slider at nothing');
  nearV(resetTurn(half).tipNormal, half.tipNormal, 1e-12, 'neither of them moves a plane: the planes are what the body is, not what is wanted of it');
}

// ---------------------------------------------------------------------------------- the warp

{
  const bent = bendBy(neck, rad(40));
  const f = warp(bent);
  const out: Vec3 = [0, 0, 0];
  // Behind the base cut: nothing at all, to the last decimal.
  for (const p of [[0, 0, -1], [.5, .3, -3.5], [0, .9, -4]] as Vec3[]) {
    f(p[0], p[1], p[2], out);
    nearV(out, p, 0, 'the body behind the base cut does not move at all');
  }
  // Past the tip cut: one rigid transform, so the head keeps its shape and its size.
  const a: Vec3 = [0, 0, 0], b: Vec3 = [0, 0, 0];
  f(0, 0, 2.5, a); f(.3, .2, 3, b);
  near(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), Math.hypot(.3, .2, .5), 1e-9, 'the head past the tip cut is carried rigidly');
  // The span's own centreline keeps its length: it bends rather than sweeping round a pivot.
  let arc = 0;
  const prev: Vec3 = [0, 0, 0], here: Vec3 = [0, 0, 0];
  f(0, 0, 0, prev);
  for (let i = 1; i <= 400; i++) {
    f(0, 0, 2 * i / 400, here);
    arc += Math.hypot(here[0] - prev[0], here[1] - prev[1], here[2] - prev[2]);
    prev[0] = here[0]; prev[1] = here[1]; prev[2] = here[2];
  }
  near(arc, 2, 2e-4, 'and the span keeps its own length through the bend');
  // The tip's tangent has turned by the whole accumulated angle.
  const t1: Vec3 = [0, 0, 0], t2: Vec3 = [0, 0, 0];
  f(0, 0, 1.999, t1); f(0, 0, 2, t2);
  const tangent: Vec3 = [t2[0] - t1[0], t2[1] - t1[1], t2[2] - t1[2]];
  near(deg(Math.atan2(tangent[1], tangent[2])), 40, .1, 'the span leaves the tip cut turned by the total turn');
  near(deg(turnAt(bent, 1)), 40, 1e-9, 'which is what the accumulated turn says');
  near(deg(turnAt(bent, 0)), 0, 1e-12, 'and nothing has turned at the base cut');
}
{
  // **The base cut cannot kink, by construction.** This is what the pair of turn rates was for, and
  // an orientation per plane gives it for nothing: the rotation at the base cut is the rotation
  // carrying the tip plane's rest onto itself, which is identity whatever the planes are aimed at.
  for (const d of [rad(10), rad(120), rad(179)]) {
    near(deg(turnAt(bendBy(neck, d), 0)), 0, 1e-12, 'nothing turns at the base cut, at any aim');
  }
  near(deg(turnAt(bendBy(neck, rad(30)), .5)), 15, 1e-9, 'the turn is spread linearly, so halfway along is half of it');
  near(deg(turnAt(bendBy(neck, rad(30)), 1)), 30, 1e-9, 'and all of it at the tip cut');
  // Two unit vectors can be at most a half turn apart, so a full straightening can never wrap the
  // span round on itself — which the old rates had to be clamped to guarantee.
  const back = bendBy(neck, rad(300));
  ok(deg(totalTurn(back)) <= 180 + 1e-9, `a wild aim still straightens through at most half a turn (${deg(totalTurn(back)).toFixed(1)}°)`);
  ok(isIdentity(neck) && !isIdentity(bendBy(neck, rad(6))), 'the slider at nothing is no edit, and a straightening of six degrees is');
  ok(isIdentity(resetTurn(bendBy(neck, rad(60)))), 'and No bend puts the body back exactly as it stands');
  // Straightening is the whole point, and it is one act: carry the run all of the way.
  const curved = setPlaneNormal(neck, 'base', [0, .5, 1]);
  const flat = straightenFully(curved);
  near(flat.straighten, 1, 1e-12, 'straightening it is the slider at one');
  near(deg(apartAfter(flat)), 0, 1e-9, 'so the two planes finish parallel, measured after the bend');
  ok(deg(totalTurn(flat)) > 20, 'and the turn that gets there is the angle the body was off by');
}
{
  // Normals follow the rotation, and the stretch along the span that a bend is.
  const bent = bendBy(neck, rad(40));
  const n = normalWarp(bent);
  const out: Vec3 = [0, 0, 0];
  n(0, 0, -1, 0, 1, 0, out);
  nearV(out, [0, 1, 0], 1e-12, 'behind the base cut a normal is untouched');
  n(0, 0, 3, 0, 1, 0, out);
  near(deg(Math.atan2(-out[2], out[1])), 40, .01, 'past the tip cut it is turned by the whole rotation');
  n(0, .2, 1, 0, 1, 0, out);
  near(Math.hypot(...out), 1, 1e-9, 'and it stays a unit vector inside the span');
}
{
  const squeezed = bendBy(neck, rad(60));
  ok(pinch(squeezed, chunks) < 1 && pinch(squeezed, chunks) > 0, 'a moderate bend squeezes the inside without folding it');
  ok(pinch(neck, chunks) === 1, 'and no turn squeezes nothing');
  ok(pinch(bendBy(neck, rad(170)), chunks) < pinch(squeezed, chunks), 'a tighter turn squeezes harder');
}

// ---------------------------------------------------------------------------------- the trace

{
  const t = traces(neck, chunks);
  ok(t.base && t.tip, 'both ends trace a run of body');
  nearV(t.base!.direction, [0, 0, -1], .02, 'the base trace runs back down the trunk');
  nearV(t.tip!.direction, [0, 0, 1], .02, 'and the tip trace on into the head');
  ok(t.base!.residual < .02 && t.tip!.residual < .02, 'a straight run reads as a straight run');
  const g = readGeometry(neck, chunks)!;
  near(deg(g.total), 0, 1, 'so a straight body measures no bend at all');
}
{
  // A limb crossing the run: the trace follows the body past it rather than averaging the two.
  const blade: number[] = [];
  for (let i = 0; i <= 30; i++) for (let k = 0; k < 12; k++) {
    const t = (k / 12) * Math.PI * 2;
    // A flat paddle out to the side at the shoulder, reaching from z = .2 to z = 1.4 — right
    // across the neck — and standing .9 off the midline, which is where Askeptosaurus' does.
    blade.push(.9 + .18 * Math.cos(t), -.25 + .06 * Math.sin(t), .2 + 1.2 * (i / 30));
  }
  const withLimb = [chunks[0], new Float32Array(blade)];
  const d = setEnd(setEnd(measureBend({ chunks: withLimb, mouth }, meta), 'base', [0, 0, 0]), 'tip', [0, 0, 2]);
  const t = traces(d, withLimb);
  nearV(t.tip!.direction, [0, 0, 1], .05, 'the trace ahead of the span keeps to the head with a paddle across it');
  ok(Math.abs(t.tip!.points[t.tip!.points.length - 1][0]) < .3, 'and never sets off out along the paddle');
}
{
  // The window and the reach are the definition, and the document carries them.
  ok(setWindow(neck, .9).window === .5 && setWindow(neck, 0).window === .01, 'the window is held to something with body in it');
  ok(setReach(neck, 99).reach === .5 && setReach(neck, NaN).reach === neck.reach, 'and so is the reach');
  const wide = setWindow(neck, .3);
  ok((traces(wide, chunks).base?.count ?? 0) > (traces(neck, chunks).base?.count ?? 0), 'a longer window measures more body');
}

// ---------------------------------------------------------------------------------- the readings

{
  const bent = bendBy(neck, rad(25));
  const r = readBend(bent, chunks);
  near(deg(r.geometry.after!.inPlane) - deg(r.geometry.before!.inPlane), 25, .5,
    'a turn of 25° moves the geometry reading by 25°, because both windows are outside the span');
  ok(r.geometry.before!.offPlane < rad(1), 'and nothing is left out of the plane on a body bent in it');
  ok(r.geometry.after!.offPlane < rad(2), 'nor after it, because the plane the angles are read in is the one the planes imply');
  // The reading plane is the one the two *planes* imply, and it no longer has to be aimed at all:
  // that used to be a control and a button, and both were wrong more often than they were right.
  // Read about some other axle — here a quarter turn away — and the same bend comes back as almost
  // entirely out of plane, which is the tell the readout exists to give.
  const bendUp = warp(bent);
  const askew = bendBy(neck, rad(25), [0, 1, 0]);
  const misread = readGeometry(askew, chunks, bendUp)!;
  ok(deg(misread.offPlane) > 20, `a bend the plane does not hold reads as out of plane (${deg(misread.offPlane).toFixed(1)}°)`);
  ok(Math.abs(deg(misread.inPlane)) < 5, 'and almost nothing reads as in it');
  const reread = readGeometry(bent, chunks, bendUp)!;
  ok(deg(reread.offPlane) < 2, 'read in the plane the bend is actually in, it is back in the plane');
  ok(Math.abs(deg(reread.inPlane)) > 20, 'and the turn is then the number that plane holds');
}
{
  const r = angleBetween([0, 0, 1], [0, 1, 0], [-1, 0, 0]);
  near(deg(r.inPlane), 90, 1e-9, 'the reading is signed about the axle');
  near(deg(angleBetween([0, 0, 1], [0, -1, 0], [-1, 0, 0]).inPlane), -90, 1e-9, 'either way');
  near(deg(r.total), 90, 1e-9, 'and the plain three-dimensional angle is there too');
  ok(describeReadingText(null).includes('no reading'), 'a window with nothing in it says so rather than reporting zero');
  ok(describeReadingText(r).startsWith('+90.0°'), 'and the readout is the two numbers in words');
}

// ---------------------------------------------------------------------------------- the rig

{
  const rigged = measureBend({ chunks, mouth, bones, rigged: true }, meta);
  ok(rigged.rigged && rigged.bones.length === bones.length, 'a rigged body carries its whole rig');
  const span = seat(setEnd(setEnd(rigged, 'base', [0, 0, 0]), 'tip', [0, 0, 2]), chunks, true);
  ok(span.chain !== null, 'and the span guesses which run of it the bend is about');
  const path = chainPath(span.bones, span.chain!).map((b) => b.name);
  ok(path.includes('neck_01') && !path.includes('fin_L'), `the guess follows the neck rather than the limb hanging off the same joint (${path.join(' → ')})`);
  ok(span.refs !== null, 'and names the two chords the bone reading is between');
  ok(!refMoves(span, span.refs!.base), 'the base chord lies behind the span, so it does not move when the span bends');
  ok(refMoves(span, span.refs!.tip), 'the tip chord reaches into it, so it does — which the panel says rather than hides');
  near(readBones(span)!.total, 0, rad(1), 'a straight chain reads as no bend');
  near(boneStation(span, span.bones.find((b) => b.name === 'neck_01')!), .5, 1e-9, 'a joint halfway along the span is at half of it');
  ok(boneStation(span, span.bones.find((b) => b.name === 'body')!) < 0, 'and one behind the base cut is behind it');

  const bent = bendBy(span, rad(30));
  const after = readBones(bent, warpBones(bent))!;
  ok(deg(after.inPlane) > 10, 'bending the span turns the chord the chain leaves on');
  ok(deg(after.inPlane) < 30, 'by less than the whole turn, because that chord starts inside the span');

  // The per-joint table: what `carry_rest` consumes, and it adds up to the whole turn.
  const table = jointTurns(bent);
  assert.deepEqual(table.map((j) => j.bone), ['neck_00', 'neck_01', 'neck_02', 'skull'],
    'the table is the joints inside the span plus the first one past it, in chain order'); passes++;
  near(deg(table[table.length - 1].accumulated), 30, 1e-9, 'the last joint carries the whole accumulated turn');
  near(deg(table.reduce((s, j) => s + j.local, 0)), 30, 1e-9, 'and the local steps add back up to it');
  for (let i = 1; i < table.length; i++) ok(table[i].s >= table[i - 1].s, 'the table runs along the span');
  ok(jointTurns(setEnd(setEnd(bent, 'base', [0, 0, 2.6]), 'tip', [0, 0, 2.9])).length === 0,
    'a span with no joint of the chain inside it lists none rather than guessing');

  // Which chords the reading is between is the question the tool exists to make askable.
  const other = setRef(setRef(span, 'base', 'from', 'root'), 'base', 'to', 'chest');
  ok(refLabel(other.refs!.base) === 'root → chest', 'a reference can be renamed to either bone');
  ok(other.refsSource === 'manual', 'and is then a person\'s answer rather than the tool\'s guess');
  ok(setChain(span, 'to', 'fin_L_tip').chain!.to === 'fin_L_tip', 'and the chain itself pointed at a limb, if that is the run being asked about');
  ok(setChain(span, 'to', 'fin_L_tip').refs !== null, 'which re-defaults the references onto it');
  // A guess goes stale the moment the span moves, and is made again; an answer is not taken back.
  const moved = setEnd(span, 'tip', [0, 0, 1.2]);
  ok(moved.refs!.tip.to !== span.refs!.tip.to || moved.refs!.tip.from !== span.refs!.tip.from,
    `moving the span re-guesses the chord the reading leaves on (${refLabel(span.refs!.tip)} → ${refLabel(moved.refs!.tip)})`);
  const chosen = setEnd(other, 'tip', [0, 0, 1.2]);
  ok(refLabel(chosen.refs!.base) === 'root → chest', 'a chord a person named survives the span moving under it');
  ok(refLabel(reguessRefs(chosen).refs!.base) !== 'root → chest', 'and can be handed back to the tool on purpose');
}

// ---------------------------------------------------------------------------------- the ends

{
  const rigged = measureBend({ chunks, mouth, bones, rigged: true }, meta);
  const moved = moveEnd(rigged, 'base', [0, .1, .2]);
  nearV(moved.base, [rigged.base[0], rigged.base[1] + .1, rigged.base[2] + .2], 1e-12, 'dragging an end carries it by exactly the drag');
  ok(moved.baseSource === 'manual', 'and the end is now the human\'s');
  ok(moved.tipSource === rigged.tipSource, 'the other end is left alone');
  const put = setEnd(rigged, 'tip', [0, 0, 1.4]);
  nearV(put.tip, [0, 0, 1.4], 1e-12, 'a typed end goes exactly where it is typed');
  ok(setEnd(rigged, 'tip', [NaN, 0, 0]) === rigged, 'and nonsense is refused rather than moving it to nowhere');
  const off = setEnd(setEnd(rigged, 'base', [0, .7, 0]), 'tip', [0, .5, 2]);
  const back = reseat(off, chunks);
  ok(Math.abs(back.base[1]) < Math.abs(off.base[1]) * .5, 'a re-seat pulls an end off the surface and back onto the body\'s own centre');
  ok(Math.abs(back.tip[1]) < Math.abs(off.tip[1]) * .5, 'both of them');
  ok(back.baseSource === 'trace' && back.tipSource === 'trace', 'and says it was the tool that put them there');
  // An end in open water has no body to be pulled onto, and stays where it was asked for rather
  // than being dragged across the animal to whatever happened to be nearest.
  const adrift = reseat(setEnd(rigged, 'base', [0, 9, 0]), chunks);
  nearV(adrift.base, [0, 9, 0], 1e-9, 'an end with no body near it stays where it was put');
}

// --------------------------------------------------------------------- seating the planes again

{
  const rigged = seat(setEnd(setEnd(measureBend({ chunks, mouth, bones, rigged: true }, meta), 'base', [0, 0, 0]), 'tip', [0, 0, 2]), chunks, true);
  // An aim a person gave survives the span moving under it \u2014 which direction they are calling
  // the run the span leaves on is their answer, not the tool's \u2014 but `tipRest` never does: it is the
  // the body's own heading where the span leaves it, and a stale one would be a measurement of a
  // place the body never was.
  const aimed = setPlaneNormal(rigged, 'tip', [0, .5, 1]);
  const moved = seatPlanes(setEnd(aimed, 'tip', [0, 0, 1.4]), chunks);
  nearV(moved.tipNormal, aimed.tipNormal, 1e-12, 'an aim a person gave survives the span moving under it');
  ok(moved.planeSource.tip === 'manual', 'and is still theirs');
  nearV(moved.tipRest, [0, 0, 1], .05, 'while the body\'s own heading there is measured again');
  const forced = seatPlanes(aimed, chunks, true);
  nearV(forced.tipNormal, forced.tipRest, 1e-12, 'seating the planes on purpose hands both back to the body');
  ok(forced.planeSource.tip === 'trace', 'and says so');
  // And the amount is untouched by either: the planes and the slider are separate answers, and
  // neither takes the other back. Under the aim-only scheme they could not be, because the turn
  // *was* where the tip plane had been dragged to, so re-seating that plane threw the bend away.
  near(seatPlanes(setStraighten(aimed, .6), chunks).straighten, .6, 1e-12, 'seating the planes leaves the straighten amount alone');
  near(seatPlanes(setStraighten(aimed, .6), chunks, true).straighten, .6, 1e-12, 'even when it is done on purpose');

  // The bone chords instead of the traced surface: the answer on a body whose trunk trace wanders.
  const fromBones = seatPlanesFromBones(rigged);
  nearV(fromBones.baseNormal, [0, 0, 1], 1e-9, 'the base plane takes the chord the chain runs in on');
  nearV(fromBones.tipRest, [0, 0, 1], 1e-9, 'and the tip plane the chord it runs out on');
  ok(fromBones.planeSource.base === 'bones' && fromBones.planeSource.tip === 'bones', 'and both say where they came from');
  ok(isIdentity(fromBones), 'a straight chain seats two planes that agree, so there is no bend');
  ok(seatPlanesFromBones({ ...rigged, refs: null }) !== null, 'a body with no references is left alone rather than throwing');
}

// ---------------------------------------------------------------------------------- the frame

{
  const rigged = seat(setEnd(setEnd(measureBend({ chunks, mouth, bones, rigged: true }, meta), 'base', [0, 0, 0]), 'tip', [0, 0, 2]), chunks, true);
  const turned = bendBy(rigged, rad(20));
  const flipped = flipForward(turned);
  ok(flipped.frame.forward === -1 && flipped.frameSource === 'manual', 'flipping the head end is a manual frame');
  // It re-reads "back from the nose" and nothing else. It used to swap the span's ends and negate
  // the turns with them; two aimed planes have no such negation, and which end the bend is anchored
  // at is a real choice the reviewer already made by placing the two ends.
  nearV(flipped.base, turned.base, 1e-12, 'the span keeps its base end');
  nearV(flipped.tip, turned.tip, 1e-12, 'and its tip end');
  near(deg(totalTurn(flipped)), deg(totalTurn(turned)), 1e-9, 'and the bend keeps its shape');
  near(headFractionAt(flipped, flipped.tip) + headFractionAt(turned, turned.tip), 1, 1e-9,
    'what changes is which end of the body “back from the nose” counts from');
  nearV(flipForward(flipped).base, turned.base, 1e-12, 'flipping twice is nothing');
  const onX = setAxis(rigged, 'x', chunks);
  ok(onX.frame.axis === 'x', 'the axis can be set by hand');
  near(onX.bounds.length, 2, 1e-6, 'which re-measures the body along it');
  ok(setAxis(rigged, 'z') === rigged, 'and the same axis is no change');
}

// ---------------------------------------------------------------------------------- the file

{
  const placed = seat(setEnd(setEnd(measureBend({ chunks, mouth, bones, rigged: true }, meta), 'base', [0, 0, 0]), 'tip', [0, 0, 2]), chunks, true);
  const doc = bendBy(placed, rad(20));
  const readings = readBend(doc, chunks);
  const t = traces(doc, chunks);
  const file = exportDoc(doc, {
    sha256: 'a'.repeat(64), sha256Source: 'measured', appliesTo: 'built', note: 'a test',
    authoredAt: '2026-09-20T00:00:00.000Z', readings, pinch: pinch(doc, chunks),
    traceResidual: { base: t.base?.residual ?? null, tip: t.tip?.residual ?? null },
  });
  ok(file.schema === 'bend-span/3' && file.id === 'test' && file.model === meta.model, 'the file says what it is and what it is about');
  ok(file.sha256 === 'a'.repeat(64) && file.appliesTo === 'built' && file.use === 'builder-measurement', 'and which exact file, and that a rigged body is a measurement rather than an edit');
  ok(exportDoc({ ...doc, rigged: false }, { sha256: null, sha256Source: null, appliesTo: 'generation', note: '', authoredAt: '', readings, pinch: 1, traceResidual: { base: null, tip: null } }).use === 'mesh-edit',
    'while an unrigged one is the edit on stage');
  // The original pose is a measurement too, though it carries no rig: the file on stage is a
  // published copy of the generation the builder reads, so an edit to it would edit a copy.
  ok(exportDoc({ ...doc, rigged: false }, { sha256: null, sha256Source: null, appliesTo: 'origpose', note: '', authoredAt: '', readings, pinch: 1, traceResidual: { base: null, tip: null } }).use === 'builder-measurement',
    'and the untouched original pose is a measurement for the builder rather than a mesh edit');
  // **The file must not claim a head end it has not earned either.** This document's frame came
  // from a mouth socket, so it has; the one taken off a box has not, and both the flag and the note
  // have to say which, because `span.baseHeadFraction` and every other "back from the nose" figure
  // in the file invert with it while the bend itself does not.
  ok(file.frame.forwardEarned === true && !/ASSUMED/.test(file.frame.note),
    'a frame read off a socket states the head end plainly');
  const boxed = exportDoc({ ...doc, frameSource: 'bounds' }, {
    sha256: null, sha256Source: null, appliesTo: 'generation', note: '', authoredAt: '',
    readings, pinch: 1, traceResidual: { base: null, tip: null },
  });
  ok(boxed.frame.forwardEarned === false && /ASSUMED/.test(boxed.frame.note)
    && boxed.frame.note.includes('baseHeadFraction'),
    'and one taken off the box says the head end is assumed, and which readings turn round with it');
  nearV(file.span.base, doc.base, 1e-5, 'the span is written out as its two points');
  nearV(file.span.direction, spanDirection(doc), 1e-5, 'with the direction they imply');
  nearV(file.planes.baseNormal, doc.baseNormal, 1e-5, 'both planes are in it, as the directions they are');
  nearV(file.planes.tipNormal, doc.tipNormal, 1e-5, 'aim and all');
  nearV(file.planes.tipRest, doc.tipRest, 1e-5, 'with the body\'s own heading there beside the aim');
  nearV(file.planes.baseNormalBlenderZUp, toBlender(doc.baseNormal), 1e-9, 'and in the builders\' own Z-up frame, so nobody re-derives them');
  near(file.planes.apartDegrees, 20, 1e-3, 'how far apart the two planes stand on the body');
  near(file.planes.apartBeforeDegrees, 20, 1e-3, 'which is the same measurement under the name a reader comparing it with the one below looks for');
  near(file.planes.apartAfterDegrees, 0, 1e-3, 'and how far apart they are once the bend has carried the tip plane: nothing, at a full straighten');
  near(file.planes.restApartDegrees, 0, .5, 'with the body\'s own measured heading against the base plane beside them');
  nearV(file.planes.tipCarried, tipCarried(doc), 1e-5, 'and the tip plane where the bend has put it');
  near(file.straighten.amount, 1, 1e-9, 'the slider is in the file, because it is half of what the document says');
  assert.deepEqual(file.straighten.range, [STRAIGHTEN_MIN, STRAIGHTEN_MAX]); passes++;
  ok(file.planes.baseSource === 'trace' && file.planes.tipSource === 'manual', 'each plane says where its aim came from');
  near(file.turn.fullDegrees, 20, 1e-3, 'the whole straightening the two planes stand apart by');
  near(file.turn.appliedDegrees, 20, 1e-3, 'and what was actually applied of it');
  near(file.turn.totalDegrees, 20, 1e-3, 'the turn in degrees for the reader');
  {
    // Half of it, in the file: the same two planes, a different amount, and every number that
    // depends on the amount moving while every number that describes the body stays put.
    const halfDoc = setStraighten(doc, .5);
    const halfFile = exportDoc(halfDoc, {
      sha256: null, sha256Source: null, appliesTo: 'built', note: '', authoredAt: '',
      readings: readBend(halfDoc, chunks), pinch: pinch(halfDoc, chunks), traceResidual: { base: null, tip: null },
    });
    near(halfFile.planes.apartDegrees, file.planes.apartDegrees, 1e-9, 'the two planes are the same two planes at any amount');
    near(halfFile.turn.appliedDegrees, 10, 1e-3, 'and half the straightening is half the turn');
    near(halfFile.planes.apartAfterDegrees, 10, 1e-3, 'leaving them half of it apart afterwards');
  }
  near(file.axis.twistDegrees, 0, 1e-3, 'and how much of the aim is a twist rather than a bend');
  nearV(file.axis.vectorBlenderZUp, toBlender(bendBasis(doc).axis), 1e-9, 'and the axle in the builders\' own frame, so nobody has to turn it round by hand');
  ok(file.reading.geometry.baseReference.includes('behind the base cut'), 'the file names the two references the geometry reading is between');
  ok(file.reading.bones!.baseReference === refLabel(doc.refs!.base), 'and the two the bone reading is between');
  ok(file.reading.bones!.tipMovesWithTheBend === true, 'and says which of them moves with the bend');
  ok(file.reading.geometry.before !== null && file.reading.geometry.after !== null, 'with both readings, before and after');
  ok(file.joints.length > 0 && file.joints.every((j) => typeof j.localDegrees === 'number'), 'the per-joint table is in it');
  near(file.joints.reduce((s, j) => s + j.localDegrees, 0), 20, 1e-3, 'and adds up to the whole turn');
  ok(file.pinch.worst > 0 && file.pinch.worst < 1, 'the squeeze on the inside of the bend is recorded');

  const back = fromExport(JSON.parse(JSON.stringify(file)));
  assert.deepEqual(back, doc); passes++;
  const rebuilt = readBend(fromExport(JSON.parse(JSON.stringify(file)), { sha256: 'a'.repeat(64), vertices: doc.vertices }), chunks);
  near(deg(rebuilt.geometry.after!.inPlane), deg(readings.geometry.after!.inPlane), 1e-9, 'the file is enough to rebuild the same reading');
  const rewarped: Vec3 = [0, 0, 0], original: Vec3 = [0, 0, 0];
  warp(back)(0, .15, 1.3, rewarped); warp(doc)(0, .15, 1.3, original);
  nearV(rewarped, original, 1e-12, 'and the same warp, vertex for vertex');

  assert.throws(() => fromExport(file, { sha256: 'b'.repeat(64) }), /has changed since/, 'a different hash is refused'); passes++;
  assert.throws(() => fromExport(file, { vertices: doc.vertices + 1 }), /has changed since/, 'a different vertex count is refused'); passes++;
  assert.doesNotThrow(() => fromExport(file, { sha256: null, vertices: doc.vertices }), 'a consumer that could not hash still checks the count'); passes++;
  assert.throws(() => fromExport({ schema: 'mouth-cut/1' }), /not a bend file/, 'a mouth file is not a bend file'); passes++;
  assert.throws(() => fromExport({ format: 'cambrian-stretch' }), /not a bend file/, 'nor is a stretch file'); passes++;
  // The rates the planes replaced. A file written against them describes a shape this cannot make,
  // so it is refused by name rather than half-read \u2014 its turn numbers would simply be ignored.
  assert.throws(() => fromExport({ schema: 'bend-span/1', bend: { ...doc } }), /written before the two planes/, 'a file from before the planes is refused, and says why'); passes++;
  // **And so is the aim-only schema, for the same kind of reason and a sharper one.** In
  // `bend-span/2` the tip plane was a *target* and the turn was however far it had been dragged
  // off the body's own heading, about an axle that could be any direction square to that heading;
  // here the tip plane describes the body and the axle is fixed by the two planes, so the
  // rotations a v3 document can express are a strictly smaller set. A v2 file read as a v3 one
  // would fail nowhere: it would quietly describe a different bend of a different part of the
  // animal, which is the one thing this whole tool exists to stop happening.
  assert.throws(() => fromExport({ schema: 'bend-span/2', bend: { ...doc } }), /target rather than a description/, 'an aim-only file is refused by name, and says why'); passes++;
  assert.throws(() => fromExport({ schema: 'bend-span/3', bend: { ...doc, tipNormal: [0, 0, 0] } }), /"tipNormal"/, 'a plane with no orientation is refused by name'); passes++;
  assert.throws(() => fromExport({ schema: 'bend-span/3', bend: { ...doc, baseNormal: 'up' } }), /"baseNormal"/, 'and so is one that is not a direction at all'); passes++;
  assert.throws(() => fromExport({ schema: 'bend-span/3', bend: { ...doc, window: 'a lot' } }), /"window"/, 'a document missing a number is refused by name'); passes++;
  assert.throws(() => fromExport({ schema: 'bend-span/3', bend: { ...doc, straighten: 'all of it' } }), /"straighten"/, 'and one with no usable amount, because the amount is half of what the document says'); passes++;
  assert.throws(() => fromExport({ schema: 'bend-span/3', bend: { ...doc, tip: [0, 0] } }), /"tip"/, 'and one missing an end'); passes++;
  assert.throws(() => fromExport(null), /not a bend file/); passes++;
}

// -------------------------------------------------------------------------- straightening a curve

{
  // The headline case, on a body built bent: a trunk running along z and a neck leaving it at 35\u00b0.
  // Seat the planes, aim them the same way, and the run between them comes straight \u2014 measured on
  // the warped mesh rather than predicted from the numbers that produced it.
  const bentBody: number[] = [];
  const ring = (c: Vec3, along: Vec3, r: number) => {
    const u: Vec3 = Math.abs(along[1]) < .9 ? [0, 1, 0] : [1, 0, 0];
    const e1: Vec3 = [u[1] * along[2] - u[2] * along[1], u[2] * along[0] - u[0] * along[2], u[0] * along[1] - u[1] * along[0]];
    const l1 = Math.hypot(...e1);
    const a1: Vec3 = [e1[0] / l1, e1[1] / l1, e1[2] / l1];
    const a2: Vec3 = [along[1] * a1[2] - along[2] * a1[1], along[2] * a1[0] - along[0] * a1[2], along[0] * a1[1] - along[1] * a1[0]];
    for (let k = 0; k < 24; k++) {
      const t = (k / 24) * Math.PI * 2, cs = Math.cos(t) * r, sn = Math.sin(t) * r;
      bentBody.push(c[0] + a1[0] * cs + a2[0] * sn, c[1] + a1[1] * cs + a2[1] * sn, c[2] + a1[2] * cs + a2[2] * sn);
    }
  };
  const lean = rad(35);
  const neckDir: Vec3 = [0, Math.sin(lean), Math.cos(lean)];
  for (let i = 0; i <= 40; i++) ring([0, 0, -4 + 4 * (i / 40)], [0, 0, 1], 1 - .6 * (i / 40));
  for (let i = 1; i <= 30; i++) {
    const d = 2 * (i / 30);
    ring([0, neckDir[1] * d, neckDir[2] * d], neckDir, .2);
  }
  const curved = [new Float32Array(bentBody)];
  const doc = seatPlanes(setEnd(setEnd(measureBend({ chunks: curved, mouth: [0, 2 * neckDir[1], 2 * neckDir[2]] }, meta), 'base', [0, 0, 0]), 'tip', [0, neckDir[1] * 1.6, neckDir[2] * 1.6]), curved);
  const before = readBend(doc, curved).geometry.before!;
  ok(deg(before.total) > 20, `the body's own curve is there to be read (${deg(before.total).toFixed(1)}\u00b0 between the two traced runs)`);
  near(deg(fullStraightening(doc)), deg(before.total), 3,
    'and the two planes, freshly seated, say the same thing the geometry reading does');
  ok(isIdentity(doc), 'the editor opens on that curve with the slider at nothing, so nothing has been done to the animal yet');

  // **The slider walked up, and the curve measured out of the body at every step.** This is the
  // whole promise in one loop: drag it and the run between the two planes comes straight, with
  // what is outside them left exactly where it stands. Every figure is measured over the warped
  // mesh rather than worked back out of the amount that produced it.
  let left = Infinity;
  for (const f of [0, .25, .5, .75, 1]) {
    const at = setStraighten(doc, f);
    const g = readBend(at, curved);
    const off = Math.abs(deg((f > 0 ? g.geometry.after! : g.geometry.before!).total));
    ok(off < left - 3, `at ${f} of the straightening the run reads ${off.toFixed(1)} degrees off, less than the ${left === Infinity ? 'curve it started at' : left.toFixed(1)} before it`);
    left = off;
    near(deg(turnAt(at, 0)), 0, 1e-12, 'with nothing at all turned at the base cut');
    const held: Vec3 = [0, 0, 0];
    warp(at)(0, 0, -2, held);
    nearV(held, [0, 0, -2], 0, 'and the trunk behind it untouched to the last decimal');
  }
  // Past the answer and back the other way, which is what the two ends of the slider are for.
  const over = readBend(setStraighten(doc, 1.4), curved).geometry.after!;
  ok(Math.abs(deg(over.total)) > 5, `past 1 the run is carried past straight and bends the other way (${deg(over.total).toFixed(1)} degrees)`);
  const more = readBend(setStraighten(doc, -.5), curved).geometry.after!;
  ok(deg(more.total) > deg(before.total) + 5, `and below 0 it bends further the way the animal already goes (${deg(more.total).toFixed(1)} against ${deg(before.total).toFixed(1)})`);

  const flat = straightenFully(doc);
  near(deg(apartAfter(flat)), 0, 1e-9, 'all of the way leaves the two planes parallel, measured after the bend');
  const after = readBend(flat, curved).geometry.after!;
  ok(Math.abs(deg(after.total)) < 5, `and the run between them comes straight, measured over the warped mesh (${deg(after.total).toFixed(1)}\u00b0)`);
}

// ---------------------------------------------------------------------------------- history

{
  const doc = measureBend({ chunks, mouth }, meta);
  const h = new History<BendDoc>(doc);
  // A drag of the straighten slider is exactly this: a run of replacements and one commit when the
  // button comes up, so the whole sweep from nothing to the answer is one press of Undo.
  const turned = bendBy(doc, rad(12));
  h.replace(setStraighten(turned, .3)); h.replace(setStraighten(turned, 1)); h.commit();
  near(deg(totalTurn(h.present)), 12, 1e-6, 'a drag is a run of replacements and one commit');
  ok(h.undo() === doc, 'and one undo takes the whole drag back');
  near(deg(totalTurn(h.redo())), 12, 1e-6, 'and redo puts it back');
}

// ---------------------------------------------------------------------------------- a raw trace

{
  // `traceCentreline` on its own: the thing every geometry reading is built out of.
  const t = traceCentreline(chunks, { bounds: { length: 7, height: 2, width: 2, axisMin: -4, axisMax: 3, lateralMid: 0, upMid: 0 }, reach: DEFAULT_REACH }, [0, 0, 0], [0, 0, 1], 1.5)!;
  ok(t.points.length > 2, 'a trace is a run of points along the body');
  nearV(t.points[0], [0, 0, 0], .05, 'starting where it was asked to');
  nearV(t.direction, [0, 0, 1], .02, 'and running where the body runs');
  ok(t.count > 0 && t.residual < .02, 'with a count and its own opinion of how straight it was');
  ok(traceCentreline(chunks, { bounds: { length: 7, height: 2, width: 2, axisMin: -4, axisMax: 3, lateralMid: 0, upMid: 0 }, reach: DEFAULT_REACH }, [0, 40, 0], [0, 0, 1], 1.5) === null,
    'and nothing at all where there is no body');
}

// ---- the pointer scheme the mode runs under ----
// Bend mode's handles take the left button only where the pointer is on one, so the stage keeps the
// view scheme — left orbits, right pans. The pan is the point: the old editor scheme bound none at
// all, so a zoomed-in neck could not be brought into the middle of the view.
{
  const r = buttonRoles('view');
  ok(r.left === 'rotate' && r.right === 'pan' && r.middle === 'dolly', 'bend mode runs on the view scheme');
  ok(schemeIsUsable('view'), 'which binds a rotate and a pan, to one button each');
  ok(buttonRoles('paint').left === null, 'and is not the paint scheme, whose left button is the brush\'s');
}

console.log(`bend: ${passes} checks passed`);
