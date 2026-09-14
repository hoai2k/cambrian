/**
 * The viewer's stretch document. Run: npm run stretch
 *
 * This one edit has to hold three promises at once, and each of them is a way it could quietly go
 * wrong on a body nobody has looked at closely yet:
 *
 *   - The body keeps its shape. Everything behind the first cut is untouched, to the last decimal
 *     — not "almost", because a stretch that drifted the torso would be found much later, after
 *     the animal was rigged against it.
 *   - The head keeps its shape. Everything past the second cut moves as one rigid piece, so
 *     lengthening a neck never also lengthens the skull.
 *   - The region does exactly what was asked: its length along the stretch direction comes out
 *     `factor` times what it was, and the part in between is scaled uniformly rather than eased,
 *     which would pinch it at the cuts.
 *
 * And one promise about the hand-off: the exported file is enough to rebuild the same warp, since
 * that file is the whole of what leaves the viewer.
 */
import assert from 'node:assert/strict';
import {
  MAX_FACTOR, MAX_TILT, MIN_FACTOR, axisAt, cloneDoc, exportDoc, flipForward, fromExport, headFractionAt, isIdentity,
  levelTilt, measureStretch, normalWarp, regionLength, resetAll, resetFactor, setFactor, setPlaneAt, setTilt,
  shiftOf, stretchDirection, warp, type StretchDoc, type Vec3,
} from '../src/viewer/stretch/stretch';
import { History } from '../src/viewer/sculpt/history';

let passes = 0;
const ok = (cond: unknown, msg: string) => { assert.ok(cond, msg); passes++; };
const near = (a: number, b: number, tol: number, msg: string) => ok(Math.abs(a - b) <= tol, `${msg} (${a} vs ${b})`);

/**
 * A long-necked animal along z: a body from z=-4 to z=0, a neck of radius .2 from 0 to 2, and a
 * head from 2 to 3. The head is the high end, which is what a generation without a mouth socket
 * is assumed to be.
 */
function animal(): Float32Array {
  const out: number[] = [];
  const ring = (z: number, r: number) => {
    for (let k = 0; k < 24; k++) {
      const t = (k / 24) * Math.PI * 2;
      out.push(r * Math.cos(t), r * Math.sin(t), z);
    }
  };
  for (let i = 0; i <= 40; i++) ring(-4 + 4 * (i / 40), 1 - .6 * (i / 40));          // body
  for (let i = 1; i <= 20; i++) ring(2 * (i / 20), .2);                               // neck
  for (let i = 1; i <= 10; i++) ring(2 + i / 10, .2 + .35 * Math.sin(Math.PI * i / 10)); // head
  return new Float32Array(out);
}

const chunks = [animal()];
const meta = { key: 'triassic:test', id: 'test', collection: 'triassic', model: 'test.preview.glb' };
const base = measureStretch({ chunks }, meta);

// ---------------------------------------------------------------------------------- measuring

ok(base.frame.axis === 'z' && base.frame.forward === 1, 'the long axis is found and the head assumed at the high end');
near(base.bounds.length, 7, 1e-6, 'the body is as long as it is');
near(base.bounds.axisMin, -4, 1e-6, 'the tail end is where it was put');
near(base.bounds.axisMax, 3, 1e-6, 'the nose end is where it was put');
ok(base.vertices === chunks[0].length / 3, 'every vertex is counted, for the bake to check against');
ok(isIdentity(base), 'a freshly measured body asks for no stretch');
near(headFractionAt(base, axisAt(base, .25)), .25, 1e-9, 'head fractions and axial coordinates are inverses');
ok(base.from < base.to, 'the first cut is nearer the tail than the second');

// A body lying along x is read the same way, so neither tool depends on how a generation landed.
const alongX = measureStretch({ chunks: [new Float32Array([-3, 0, 0, 3, .5, .4, 0, -.2, -.4])] }, meta);
ok(alongX.frame.axis === 'x', 'a body lying along x is read along x');
// A mouth socket at the low end says the head is there, whatever the exporter's habit.
const reversed = measureStretch({ chunks, mouth: [0, 0, -4] }, meta);
ok(reversed.frame.forward === -1, 'a mouth socket at the low end puts the head at the low end');

// ---------------------------------------------------------------------- the neck, straight back

/** Put the cuts on this animal's actual neck: z = 0 at the shoulder, z = 2 at the skull. */
const neck = (d: StretchDoc) => { const a = cloneDoc(d); a.from = 0; a.to = 2; return a; };
const doubled = setFactor(neck(base), 2);

near(regionLength(doubled), 2, 1e-9, 'the neck is two units long');
near(shiftOf(doubled), 2, 1e-9, 'doubling it moves the head two units');

const out: Vec3 = [0, 0, 0];
const w = warp(doubled);
const at = (x: number, y: number, z: number): Vec3 => { w(x, y, z, out); return [...out] as Vec3; };

assert.deepEqual(at(.5, .3, -1), [.5, .3, -1], 'a vertex on the body does not move at all');
assert.deepEqual(at(0, 0, -4), [0, 0, -4], 'nor does the tail tip');
assert.deepEqual(at(.2, 0, 0), [.2, 0, 0], 'nor one exactly on the first cut');
passes += 3;
assert.deepEqual(at(.2, 0, 2), [.2, 0, 4], 'a vertex on the second cut moves the whole shift');
assert.deepEqual(at(.1, .1, 3), [.1, .1, 5], 'and the nose moves with it, rigidly');
passes += 2;
near(at(0, 0, 1)[2], 2, 1e-9, 'half way through the neck moves half the shift');
near(at(0, 0, .5)[2], 1, 1e-9, 'a quarter of the way through moves a quarter');
near(at(0, 0, 1.5)[2], 3, 1e-9, 'three quarters through moves three quarters');

// The head as a rigid piece: every pair of vertices past the far cut keeps its distance.
const headPts: Vec3[] = [[.2, 0, 2], [0, .4, 2.5], [-.1, -.2, 2.9], [.05, .05, 3]];
for (let i = 0; i < headPts.length; i++) for (let j = i + 1; j < headPts.length; j++) {
  const a0 = headPts[i], b0 = headPts[j];
  const a1 = at(...a0), b1 = at(...b0);
  near(Math.hypot(a1[0] - b1[0], a1[1] - b1[1], a1[2] - b1[2]),
    Math.hypot(a0[0] - b0[0], a0[1] - b0[1], a0[2] - b0[2]), 1e-9, 'the head keeps its shape');
}
// The neck keeps its girth: the stretch is along the direction and nothing across it.
for (const z of [.25, 1, 1.75]) {
  const p = at(.2, 0, z);
  near(Math.hypot(p[0], p[1]), .2, 1e-9, `the neck is no thinner at z=${z}`);
}
// Uniform, not eased: equal steps through the neck come out as equal steps.
const steps = [0, .5, 1, 1.5, 2].map((z) => at(0, 0, z)[2]);
for (let i = 2; i < steps.length; i++) {
  near(steps[i] - steps[i - 1], steps[1] - steps[0], 1e-9, 'the neck stretches evenly along its length');
}

// Shortening is the same edit with a factor below one.
const halved = setFactor(neck(base), .5);
const hw = warp(halved);
hw(0, 0, 3, out);
near(out[2], 2, 1e-9, 'halving the neck brings the head in by half its length');
hw(0, 0, -2, out);
near(out[2], -2, 1e-9, 'and leaves the body where it is');

// An untouched document is an exact identity everywhere, which is what lets the editor skip it.
const idw = warp(neck(base));
for (const p of [[.3, .2, -3], [0, 0, 1], [.1, .1, 2.5]] as Vec3[]) {
  idw(...p, out);
  assert.deepEqual([...out], p, 'factor 1 moves nothing');
  passes++;
}
ok(isIdentity(resetFactor(doubled)), 'reset factor is an identity again');
ok(isIdentity(resetAll(setTilt(setPlaneAt(doubled, 'from', .5), 'side', .3))), 'reset all is too');
near(resetAll(doubled).from, axisAt(base, .34), 1e-9, 'and puts the cuts back at the front third');

// ------------------------------------------------------------------- aiming the lengthening

// The tilts are the angles the views show: each reads back exactly what it was given, whatever
// the other is, which is the whole reason the direction is built from tangents.
for (const side of [-0.6, -0.2, 0, 0.35, 0.9]) for (const top of [-0.5, 0, 0.7]) {
  const d = stretchDirection({ frame: base.frame, tiltSide: side, tiltTop: top });
  near(Math.atan2(d[1], d[2]), side, 1e-9, 'the side view shows the side tilt');
  near(Math.atan2(d[0], d[2]), top, 1e-9, 'the top view shows the top tilt');
  near(Math.hypot(d[0], d[1], d[2]), 1, 1e-12, 'the direction is a unit vector');
}
ok(Math.abs(setTilt(base, 'side', 10).tiltSide - MAX_TILT) < 1e-12, 'a cut may not lie down (+)');
ok(Math.abs(setTilt(base, 'side', -10).tiltSide + MAX_TILT) < 1e-12, 'a cut may not lie down (−)');
ok(setTilt(base, 'top', NaN).tiltTop === 0, 'a nonsense angle is no angle');
ok(setFactor(base, 99).factor === MAX_FACTOR && setFactor(base, 0).factor === MIN_FACTOR, 'the factor stays in range');
ok(setFactor(base, NaN).factor === 1, 'and a nonsense factor is no stretch');

// A neck lengthened at 30° rises as it goes: the head moves along the direction and nowhere else.
const tilted = setFactor(setTilt(neck(base), 'side', Math.PI / 6), 2);
const dir = stretchDirection(tilted);
const tw = warp(tilted);
{
  const L = regionLength(tilted), shift = shiftOf(tilted);
  near(shift, L, 1e-9, 'doubling still moves the head by the neck\'s own length');
  const before: Vec3 = [0, 0, 2.5];
  tw(...before, out);
  near(out[0] - before[0], dir[0] * shift, 1e-9, 'the head moves along the direction (x)');
  near(out[1] - before[1], dir[1] * shift, 1e-9, '...and up it (y)');
  near(out[2] - before[2], dir[2] * shift, 1e-9, '...and along the body (z)');
  ok(out[1] > before[1] + .4, 'a neck aimed upwards lifts the head');
  // The body behind the first cut is still untouched, tilt or no tilt.
  tw(.4, .2, -2, out);
  assert.deepEqual([...out], [.4, .2, -2], 'an angled stretch still leaves the body alone');
  passes++;
}
// A cut is square to the direction, so the region's length is measured along it: the same two
// stations are a *longer* neck when the neck runs diagonally.
ok(regionLength(setTilt(neck(base), 'side', .5)) < regionLength(neck(base)),
  'projected onto a tilted direction, the same two cuts span less of it');

// ------------------------------------------------------------------------------- the cuts

// The cuts may be dragged anywhere but never past each other.
const pushed = setPlaneAt(neck(base), 'from', 5);
ok(pushed.from < pushed.to, 'the first cut cannot be dragged past the second');
near(pushed.to - pushed.from, base.bounds.length * .01, 1e-9, 'it stops a hundredth of the body short');
const pulled = setPlaneAt(neck(base), 'to', -9);
ok(pulled.to > pulled.from, 'and the second cannot be dragged back past the first');
// On a body facing the other way the same rule holds with the axis reversed.
const back = { ...cloneDoc(base), frame: { ...base.frame, forward: -1 as const }, from: 2, to: 0 };
ok(setPlaneAt(back, 'from', -9).from > setPlaneAt(back, 'from', -9).to, 'order is kept on a body facing the other way');
ok(regionLength(setPlaneAt(back, 'from', -9)) > 0, 'and its region still has a positive length');

// Flipping which end is the head keeps the cuts on the same parts of the body.
const leaning = setTilt(neck(base), 'side', .4);
const flipped = flipForward(leaning);
ok(flipped.frame.forward === -1 && flipped.from === 2 && flipped.to === 0, 'flipping swaps which cut is which');
// Exactly the negation, which is the point: a plane with a reversed normal is the same plane, so
// the cut lines stay drawn where the user put them and only the arrow along them turns round.
for (let k = 0; k < 3; k++) {
  near(stretchDirection(flipped)[k], -stretchDirection(leaning)[k], 1e-12, 'the direction reverses exactly, leaving the cuts where they are drawn');
}
ok(regionLength(flipped) > 0, 'and the region still reads as having length');
ok(levelTilt(tilted).tiltSide === 0 && levelTilt(tilted).tiltTop === 0, 'levelling aims it back down the body');
near(levelTilt(tilted).from, tilted.from, 1e-12, '...without moving the cuts');

// ------------------------------------------------------------------------------- normals

// The normal map must be the inverse transpose of the position map. Checked against the positions
// themselves: two nearby points on a surface give a tangent, the warped pair give the warped
// tangent, and the warped normal must still be square to it.
{
  const nw = normalWarp(tilted);
  const p: Vec3 = [.2, 0, 1];
  const n: Vec3 = [1, 0, 0];                                   // outward on the neck's flank
  const tangents: Vec3[] = [[0, 1, 0], [0, .2, 1], [0, -.6, .3]]; // square to n at p
  const nOut: Vec3 = [0, 0, 0];
  nw(...p, ...n, nOut);
  for (const t of tangents) {
    const h = 1e-5;
    const a: Vec3 = [p[0] + t[0] * h, p[1] + t[1] * h, p[2] + t[2] * h];
    tw(...p, out); const p1: Vec3 = [...out] as Vec3;
    tw(...a, out); const a1: Vec3 = [...out] as Vec3;
    const tw1: Vec3 = [(a1[0] - p1[0]) / h, (a1[1] - p1[1]) / h, (a1[2] - p1[2]) / h];
    const dot = nOut[0] * tw1[0] + nOut[1] * tw1[1] + nOut[2] * tw1[2];
    near(dot, 0, 1e-5, 'the warped normal stays square to the warped surface');
  }
  near(Math.hypot(nOut[0], nOut[1], nOut[2]), 1, 1e-9, 'and is still a unit vector');
  // Outside the region a normal is untouched: the body and the head are only translated.
  for (const q of [[.5, 0, -2], [.1, 0, 2.6]] as Vec3[]) {
    nw(...q, 0, 1, 0, nOut);
    assert.deepEqual([...nOut], [0, 1, 0], 'a normal outside the region passes through');
    passes++;
  }
  // An identity document leaves every normal alone, so a bake with no stretch rewrites nothing.
  const idn = normalWarp(neck(base));
  idn(.2, 0, 1, .6, .8, 0, nOut);
  assert.deepEqual([...nOut].map((v) => Math.round(v * 1e9) / 1e9), [.6, .8, 0], 'no stretch, no reshading');
  passes++;
}

// ------------------------------------------------------------------------------- the hand-off

{
  const payload = JSON.parse(JSON.stringify(exportDoc(tilted)));
  ok(payload.format === 'cambrian-stretch' && payload.changed === true, 'the export says what it is and that it changed something');
  near(payload.region.factor, 2, 1e-12, 'it carries the factor');
  near(payload.region.length * payload.region.factor, payload.region.stretched, 1e-6, 'and what that comes to');
  near(payload.direction.tiltSideDegrees, 30, 1e-3, 'angles are given in degrees as well as radians');
  ok(payload.creature.vertices === base.vertices, 'and the vertex count the stretch was measured on');
  near(payload.planes.from.headFraction, headFractionAt(tilted, tilted.from), 1e-4, 'each cut says where it sits on the body');

  // The file is the whole hand-off: a warp rebuilt from it must agree vertex for vertex.
  const rebuilt = warp(fromExport(payload));
  const again: Vec3 = [0, 0, 0];
  for (const p of [[.3, .2, -3], [.2, 0, 0], [0, .1, 1], [.18, .05, 1.7], [.1, .1, 2.5], [0, 0, 3]] as Vec3[]) {
    tw(...p, out); const a: Vec3 = [...out] as Vec3;
    rebuilt(...p, again);
    for (let k = 0; k < 3; k++) near(again[k], a[k], 1e-12, 'the exported file rebuilds the same warp');
  }
  // A file that is not one, or one missing what the warp needs, is refused by name.
  for (const bad of [null, {}, { format: 'cambrian-sculpt' }, { format: 'cambrian-stretch' },
    { format: 'cambrian-stretch', stretch: { ...tilted, factor: 'wide' } },
    { format: 'cambrian-stretch', stretch: { ...tilted, frame: { axis: 'y' } } }]) {
    assert.throws(() => fromExport(bad), /stretch file|not a stretch/, 'a file that cannot be applied is refused');
    passes++;
  }
}

// ------------------------------------------------------------------------------- history

{
  const h = new History(neck(base));
  h.push(setFactor(h.present, 1.5));
  h.push(setPlaneAt(h.present, 'to', 2.5));
  ok(h.present.factor === 1.5 && h.present.to === 2.5, 'two steps land');
  ok(h.undo().to === 2, 'undo takes the cut back');
  ok(h.undo().factor === 1, 'and the stretch with it');
  ok(h.redo().factor === 1.5 && h.canRedo, 'redo restores them in order');
}

console.log(`${passes} stretch assertions passed — measuring, the body and head held still, a uniform region, aimed lengthening, normals, the exported hand-off`);
