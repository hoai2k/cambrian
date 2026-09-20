/**
 * The viewer's mouth document. Run: npm run mouth
 *
 * Guards what the editor is made of, without a browser: the first guess comes from the rig where
 * there is one and from the head's section where there is not; the six numbers compose into a
 * basis in which each angle reads as its own view's angle; the mandible test takes what is below
 * the plane *and* ahead of the hinge and nothing else; a drag on each handle maps back onto the
 * numbers it is meant to set; flipping the head end leaves the plane where it was drawn; and the
 * exported file is enough to rebuild the same test — and is refused on a body whose hash or
 * vertex count no longer matches, which is the whole point of carrying them.
 */
import assert from 'node:assert/strict';
import {
  DEFAULT_DEPTH, HEAD_SHARE, MAX_ANGLE, aimForward, aimHinge, axisBack, backOf, countSides, cutBasis, describeSides,
  exportDoc, flipForward, fromExport, levelCut, mandibleTest, measureHead, measureMouth, moveHinge, setAngle, setAxis,
  setDepth, setLateral, setUp, type MouthDoc, type Vec3,
} from '../src/viewer/mouth/mouth';
import { History } from '../src/viewer/sculpt/history';

let passes = 0;
const ok = (cond: unknown, msg: string) => { assert.ok(cond, msg); passes++; };
const near = (a: number, b: number, tol: number, msg: string) => ok(Math.abs(a - b) <= tol, `${msg} (${a} vs ${b})`);
const nearV = (a: Vec3, b: Vec3, tol: number, msg: string) => ok(a.every((v, i) => Math.abs(v - b[i]) <= tol), `${msg} (${a.map((v) => v.toFixed(4))} vs ${b.map((v) => v.toFixed(4))})`);
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * The stretch test's animal, along z with the head at the high end: a body from z=-4 to 0, a neck
 * of radius .2 from 0 to 2, and a head from 2 to 3 that swells to radius .55 at z=2.5.
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

// ---------------------------------------------------------------------------------- the guess

const guessed = measureMouth({ chunks }, meta);
ok(guessed.frame.axis === 'z' && guessed.frame.forward === 1 && guessed.frameSource === 'bounds', 'with nothing better the frame is the box, and says so');
ok(guessed.vertices === chunks[0].length / 3, 'every vertex is counted, for a consumer to check against');
near(guessed.bounds.length, 7, 1e-6, 'the body is as long as it is');
ok(guessed.seatSource === 'guess', 'a body with no rig gets a guessed seat');
near(guessed.depth, DEFAULT_DEPTH * 7, 1e-9, 'the guessed hinge is a head\'s worth back from the nose');
near(guessed.head.height, 1.1, 1e-6, 'the head\'s section is measured off the front of the body');
near(guessed.head.width, 1.1, 1e-6, 'in both directions');
near(guessed.up, guessed.head.upMid - guessed.head.height * .1, 1e-9, 'the guessed line sits a little below the middle of the head');
near(guessed.lateral, guessed.head.lateralMid, 1e-9, 'and on the midline');
const head = measureHead(chunks, guessed);
ok(head.height === guessed.head.height && head.width === guessed.head.width, 'measureHead is what the document carries');
{
  // The share measured as the head includes the neck here, which does not widen it.
  const front = HEAD_SHARE * 7;
  ok(front > 1 && front < 2, `the head share reaches into the neck on this body (${front.toFixed(2)})`);
}

// A rigged body: the jaw bone is the hinge, the socket sets the line.
const jaw: Vec3 = [0, -.1, 2.2], mouth: Vec3 = [0, -.2, 3], mouthInside: Vec3 = [0, -.05, 2.6];
const rigged = measureMouth({ chunks, jaw, mouth, mouthInside, rigged: true }, meta);
ok(rigged.frameSource === 'mouth', 'a mouth socket frames the body');
ok(rigged.rigged, 'and the document knows the body is rigged');
ok(rigged.seatSource === 'jaw', 'a jaw bone seats the hinge');
near(rigged.depth, 3 - 2.2, 1e-9, 'at the bone\'s own depth back from the nose');
near(rigged.up, -.1, 1e-9, 'at its height');
near(rigged.lateral, 0, 1e-9, 'and its seat');
near(rigged.pitch, Math.atan2(-.1, .8), 1e-9, 'with the mouth line aimed from the hinge at the socket');
ok(rigged.yaw === 0 && rigged.roll === 0, 'and nothing else turned');
const socketed = measureMouth({ chunks, mouth }, meta);
ok(socketed.seatSource === 'socket' && socketed.up === -.2 && socketed.depth === DEFAULT_DEPTH * 7, 'a socket without a jaw bone sets the height and leaves the depth guessed');
// A generation's yaw beats the box and loses to a socket.
ok(measureMouth({ chunks, yaw: 180 }, meta).frameSource === 'yaw', 'an authored yaw frames a generation');
ok(measureMouth({ chunks, yaw: 180 }, meta).frame.forward === -1, 'and says which end the head was at');
ok(measureMouth({ chunks, yaw: 180, mouth }, meta).frameSource === 'mouth', 'but the socket wins over it');

// ---------------------------------------------------------------------------------- the basis

const level = cutBasis(guessed);
nearV(level.forward, [0, 0, 1], 1e-12, 'level, forward is the body axis');
nearV(level.hinge, [1, 0, 0], 1e-12, 'the hinge runs across');
nearV(level.normal, [0, 1, 0], 1e-12, 'and the normal is up');
nearV(level.centre, [guessed.lateral, guessed.up, axisBack(guessed, guessed.depth)], 1e-12, 'the centre is the hinge');
near(backOf(guessed, level.centre[2]), guessed.depth, 1e-12, 'backOf undoes axisBack');
{
  const p = .3, y = -.25, r = .4;
  const pitched = cutBasis({ ...guessed, pitch: p });
  nearV(pitched.forward, [0, Math.sin(p), Math.cos(p)], 1e-12, 'pitch alone reads as the angle in profile');
  nearV(pitched.hinge, [1, 0, 0], 1e-12, 'and leaves the hinge across');
  const yawed = cutBasis({ ...guessed, yaw: y });
  nearV(yawed.forward, [Math.sin(y), 0, Math.cos(y)], 1e-12, 'yaw alone reads as the angle in plan');
  nearV(yawed.hinge, [Math.cos(y), 0, -Math.sin(y)], 1e-12, 'and turns the hinge with it');
  nearV(yawed.normal, [0, 1, 0], 1e-12, 'leaving the plane level');
  const rolled = cutBasis({ ...guessed, roll: r });
  nearV(rolled.hinge, [Math.cos(r), Math.sin(r), 0], 1e-12, 'roll alone reads as the angle from the front');
  nearV(rolled.normal, [-Math.sin(r), Math.cos(r), 0], 1e-12, 'tipping the plane');
  nearV(rolled.forward, [0, 0, 1], 1e-12, 'and leaving the mouth line alone');
  const all = cutBasis({ ...guessed, pitch: p, yaw: y, roll: r });
  for (const [a, b, name] of [[all.forward, all.hinge, 'forward·hinge'], [all.hinge, all.normal, 'hinge·normal'], [all.normal, all.forward, 'normal·forward']] as const) {
    near(dot(a, b), 0, 1e-12, `${name} is square with all three angles set`);
  }
  for (const v of [all.forward, all.hinge, all.normal]) near(Math.hypot(...v), 1, 1e-12, 'unit');
}

// ---------------------------------------------------------------------------------- the test

{
  const test = mandibleTest(rigged);
  const c = cutBasis(rigged).centre;
  ok(test(c[0], c[1] - .05, c[2] + .3), 'below the plane and ahead of the hinge is mandible');
  ok(!test(c[0], c[1] + .05, c[2] + .3), 'above the plane is skull');
  ok(!test(c[0], c[1] - .05, c[2] - .3), 'behind the hinge is not mandible however low it is: the cut does not run back through the neck');
  ok(!test(c[0], c[1] - 1, c[2] - 3), 'nor is the belly');
  // Level cut for a count that can be checked by hand: below y=-.1, ahead of z=2.2.
  const leveled = levelCut(rigged);
  const sides = countSides(chunks, leveled);
  let byHand = 0;
  const a = chunks[0];
  for (let i = 0; i < a.length; i += 3) if (a[i + 1] < -.1 && a[i + 2] > 2.2) byHand++;
  ok(sides.mandible === byHand && byHand > 0, `the count is the vertices below the line ahead of the hinge (${sides.mandible} = ${byHand})`);
  ok(sides.mandible + sides.skull === sides.total && sides.total === rigged.vertices, 'and the two sides make the whole body');
  ok(countSides(chunks, setDepth(leveled, 0)).mandible === 0, 'a hinge at the nose takes nothing');
  ok(countSides(chunks, setDepth(leveled, 1.5)).mandible > sides.mandible, 'a deeper hinge takes more');
}

// ---------------------------------------------------------------------------------- the handles

{
  const moved = moveHinge(rigged, [.1, -.05, -.3]);
  near(moved.depth, rigged.depth + .3, 1e-12, 'dragging the hinge back along the body deepens the cut');
  near(moved.up, rigged.up - .05, 1e-12, 'dragging it down lowers the line');
  near(moved.lateral, rigged.lateral + .1, 1e-12, 'dragging it across re-seats it');
  ok(moved.seatSource === 'manual', 'and the seat is now the human\'s');
  ok(moved.pitch === rigged.pitch, 'the angle is left alone');
  nearV(cutBasis(moved).centre, [cutBasis(rigged).centre[0] + .1, cutBasis(rigged).centre[1] - .05, cutBasis(rigged).centre[2] - .3], 1e-12, 'so the centre moved by exactly the drag');

  const p = .2, y = -.3;
  const aimed = aimForward(levelCut(rigged), [Math.cos(p) * Math.sin(y), Math.sin(p), Math.cos(p) * Math.cos(y)]);
  near(aimed.pitch, p, 1e-12, 'the front handle sets the pitch from where it is dragged to');
  near(aimed.yaw, y, 1e-12, 'and the yaw');
  ok(aimed.roll === 0, 'and not the roll');
  nearV(cutBasis(aimed).forward, [Math.cos(p) * Math.sin(y), Math.sin(p), Math.cos(p) * Math.cos(y)], 1e-12, 'so the mouth line points at the handle');
  const behind = aimForward(aimed, [0, .1, -1]);
  ok(behind === aimed, 'a front handle dragged behind the hinge says nothing about the mouth and is refused');
  const scaled = aimForward(levelCut(rigged), [0, 5 * Math.sin(p), 5 * Math.cos(p)]);
  near(scaled.pitch, p, 1e-12, 'the direction\'s length does not matter');

  const r = .35;
  const tipped = aimHinge(levelCut(rigged), [Math.cos(r), Math.sin(r), 0]);
  near(tipped.roll, r, 1e-12, 'the side handle sets the roll');
  ok(tipped.pitch === 0 && tipped.yaw === 0, 'and only the roll');
  near(aimHinge(levelCut(rigged), [-Math.cos(r), -Math.sin(r), 0]).roll, r, 1e-12, 'from either side of the hinge');
  // With the line pitched, the roll is measured in the plane the hinge actually turns in.
  const pitchedThenTipped = aimHinge(setAngle(rigged, 'pitch', .4), cutBasis({ ...setAngle(rigged, 'pitch', .4), roll: r }).hinge);
  near(pitchedThenTipped.roll, r, 1e-9, 'a roll read off a pitched plane comes back as itself');
}

// ---------------------------------------------------------------------------------- limits

ok(setAngle(rigged, 'pitch', 2).pitch === MAX_ANGLE, 'an angle past the limit is held at it');
ok(setAngle(rigged, 'yaw', -2).yaw === -MAX_ANGLE, 'either way');
ok(setAngle(rigged, 'roll', NaN).roll === 0, 'nonsense is zero, not NaN');
ok(setDepth(rigged, -1).depth === 0, 'the hinge never goes ahead of the nose');
ok(setDepth(rigged, 99).depth === rigged.bounds.length, 'nor behind the tail');
ok(setDepth(rigged, NaN).depth === rigged.depth, 'and nonsense leaves it where it was');
ok(setUp(rigged, NaN).up === rigged.up && setLateral(rigged, NaN).lateral === rigged.lateral, 'the same for the seat');
{
  const squared = levelCut(setAngle(setAngle(rigged, 'yaw', .3), 'roll', -.2));
  ok(squared.pitch === 0 && squared.yaw === 0 && squared.roll === 0, 'squaring zeroes all three angles');
  ok(squared.depth === rigged.depth && squared.up === rigged.up, 'and leaves the hinge where it is');
}

// ---------------------------------------------------------------------------------- the frame

{
  const turned = setAngle(setAngle(moveHinge(rigged, [.1, 0, 0]), 'yaw', .3), 'roll', .2);
  const flipped = flipForward(turned);
  ok(flipped.frame.forward === -1 && flipped.frameSource === 'manual', 'flipping the head end is a manual frame');
  const before = cutBasis(turned), after = cutBasis(flipped);
  nearV(after.centre, before.centre, 1e-12, 'the hinge stays exactly where it was');
  nearV(after.normal, before.normal, 1e-12, 'the plane stays exactly where it was drawn');
  nearV(after.hinge, before.hinge, 1e-12, 'and so does the hinge line');
  nearV(after.forward, [-before.forward[0], -before.forward[1], -before.forward[2]], 1e-12, 'only which side of the hinge is the jaw turns round');
  ok(flipForward(flipped).depth === turned.depth && Math.abs(flipForward(flipped).pitch - turned.pitch) < 1e-12, 'flipping twice is nothing');
  const onX = setAxis(rigged, 'x');
  ok(onX.frame.axis === 'x' && onX.seatSource === 'guess', 'a change of axis re-seats the hinge on the new axis as a guess');
  near(onX.bounds.length, 2, 1e-6, 'and re-measures the body along it');
  ok(setAxis(rigged, 'z') === rigged, 'the same axis is no change');
}

// ---------------------------------------------------------------------------------- the file

{
  const doc = setAngle(moveHinge(rigged, [0, -.02, -.1]), 'roll', .1);
  const sides = countSides(chunks, doc);
  const file = exportDoc(doc, { sha256: 'a'.repeat(64), sha256Source: 'measured', appliesTo: 'built', sides, note: 'a test', authoredAt: '2026-09-20T00:00:00.000Z' });
  ok(file.schema === 'mouth-cut/1' && file.id === 'test' && file.model === meta.model, 'the file says what it is and what it is about');
  ok(file.sha256 === 'a'.repeat(64) && file.sha256Source === 'measured' && file.appliesTo === 'built', 'and which exact file, and what kind');
  ok(file.creature.vertices === doc.vertices && file.creature.rigged, 'and what it was measured on');
  const basis = cutBasis(doc);
  nearV(file.plane.normal, basis.normal, 1e-6, 'the plane is written out as a normal');
  nearV(file.plane.point, basis.centre, 1e-6, 'through a point');
  nearV(file.hinge.axis, basis.hinge, 1e-6, 'and the hinge as an axis');
  near(file.hinge.headFraction, doc.depth / 7, 1e-4, 'and as a share of the body');
  near(file.plane.rollDegrees, .1 * 180 / Math.PI, 1e-3, 'with the angles in degrees for the reader');
  ok(file.sides === sides, 'and the counts the panel showed');
  ok(file.seat.source === 'manual' && file.frame.source === 'mouth', 'and where the seat and the frame came from');

  const back = fromExport(JSON.parse(JSON.stringify(file)));
  assert.deepEqual(back, doc); passes++;
  const same = fromExport(JSON.parse(JSON.stringify(file)), { sha256: 'a'.repeat(64), vertices: doc.vertices });
  ok(countSides(chunks, same).mandible === sides.mandible, 'the file is enough to rebuild the same test');
  assert.throws(() => fromExport(file, { sha256: 'b'.repeat(64) }), /has changed since/, 'a different hash is refused'); passes++;
  assert.throws(() => fromExport(file, { vertices: doc.vertices + 1 }), /has changed since/, 'a different vertex count is refused'); passes++;
  assert.doesNotThrow(() => fromExport(file, { sha256: null, vertices: doc.vertices }), 'a consumer that could not hash still checks the count'); passes++;
  assert.throws(() => fromExport({ format: 'cambrian-stretch' }), /not a mouth file/, 'a stretch file is not a mouth file'); passes++;
  assert.throws(() => fromExport({ schema: 'mouth-cut/1', mouth: { ...doc, depth: 'deep' } }), /"depth"/, 'a document missing a number is refused by name'); passes++;
  assert.throws(() => fromExport(null), /not a mouth file/); passes++;
}

// ---------------------------------------------------------------------------------- history

{
  const h = new History<MouthDoc>(rigged);
  h.replace(setDepth(rigged, 1)); h.replace(setDepth(rigged, 1.2)); h.commit();
  ok(h.present.depth === 1.2 && h.canUndo, 'a drag is a run of replacements and one commit');
  ok(h.undo() === rigged, 'and one undo takes the whole drag back');
  ok(h.redo().depth === 1.2, 'and redo puts it back');
}

ok(describeSides({ mandible: 1204, skull: 10855, total: 12059 }) === '1,204 of 12,059 vertices on the mandible · 10.0%', 'the readout');
ok(describeSides({ mandible: 0, skull: 0, total: 0 }) === '0 of 0 vertices on the mandible · 0.00%', 'even of nothing');

console.log(`PASS: mouth cut — ${passes} checks: the guess from rig, socket or section; the basis; the test; the three handles; flipping; the file and its refusals`);
