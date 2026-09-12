/**
 * The viewer's sculpt document. Run: npm run sculpt
 *
 * Guards the contract between what the sculpt editor shows, what it warps and what it exports:
 * measuring a body gives a table the builders could have written; an untouched table warps every
 * vertex to itself; a station moved by hand moves the surface at that station by exactly that
 * much, scales the interior proportionally and leaves the rest of the body alone; the axis map
 * stays monotone whatever a station is shifted to; and undo/redo restores documents exactly.
 */
import assert from 'node:assert/strict';
import {
  autoSlope, evaluate, exportDoc, isIdentity, measure, remapAxis, resetStations, setShift, setTangent, setValue, warp,
  type SculptDoc,
} from '../src/viewer/sculpt/profile';
import { History } from '../src/viewer/sculpt/history';

// A spindle along z: radius r(z) = 1 - (z/4)^2 over z ∈ [-4, 4], flattened to 60% in x, with the
// mouth at +z so the head is the high end.
function spindle(): Float32Array {
  const out: number[] = [];
  for (let i = 0; i <= 80; i++) {
    const z = -4 + 8 * (i / 80);
    const r = Math.max(0, 1 - (z / 4) ** 2);
    for (let k = 0; k < 24; k++) {
      const t = (k / 24) * Math.PI * 2;
      out.push(.6 * r * Math.cos(t), r * Math.sin(t), z);
    }
  }
  return new Float32Array(out);
}

const positions = spindle();
const meta = { key: 'test:spindle', id: 'spindle', collection: 'test', model: 'spindle.glb' };
const doc = measure({ chunks: [positions], mouth: [0, 0, 4] }, meta);

// ---- measuring ----
assert.equal(doc.frame.axis, 'z');
assert.equal(doc.frame.forward, 1, 'the mouth at +z makes +z the head end');
assert.equal(doc.stations.length, 20);
assert.ok(Math.abs(doc.bounds.length - 8) < 1e-6);
const mid = doc.stations[10];
assert.ok(Math.abs(mid.axis - .21) < .01, `middle station sits near the middle: ${mid.axis}`);
assert.ok(mid.base.dorsal > .95 && mid.base.dorsal <= 1, `dorsal at the middle is the radius: ${mid.base.dorsal}`);
assert.ok(mid.base.ventral < -.95, `ventral at the middle is minus the radius: ${mid.base.ventral}`);
assert.ok(Math.abs(mid.base.width - .6 * mid.base.dorsal) < .02, 'width follows the flattening');
assert.equal(doc.stations[19].headFraction, 0, 'the last station (+z) is the nose');
assert.equal(doc.stations[0].headFraction, 1, 'the first station (-z) is the tail');
assert.deepEqual(doc.regions.map((r) => r.name), ['Head', 'Fore body', 'Mid body', 'Hind body', 'Tail']);
for (const r of doc.regions) assert.ok(r.from <= r.to);
const covered = doc.regions.flatMap((r) => Array.from({ length: r.to - r.from + 1 }, (_, k) => r.from + k)).sort((a, b) => a - b);
assert.deepEqual(covered, [...doc.stations.keys()], 'regions partition the stations');
assert.ok(isIdentity(doc));

// ---- identity warp ----
const same = warp(doc);
const out: [number, number, number] = [0, 0, 0];
let worst = 0;
for (let i = 0; i < positions.length; i += 3) {
  same(positions[i], positions[i + 1], positions[i + 2], out);
  worst = Math.max(worst, Math.abs(out[0] - positions[i]), Math.abs(out[1] - positions[i + 1]), Math.abs(out[2] - positions[i + 2]));
}
assert.ok(worst < 1e-9, `an untouched document moves nothing (worst ${worst})`);

// ---- a raised dorsal line at one station ----
const raised = setValue(doc, 10, 'dorsal', mid.base.dorsal + .5);
assert.ok(!isIdentity(raised));
const w = warp(raised);
w(0, mid.base.dorsal, mid.axis, out);
assert.ok(Math.abs(out[1] - (mid.base.dorsal + .5)) < 1e-9, `the top of the station rises by the edit: ${out[1]}`);
w(0, mid.base.ventral, mid.axis, out);
assert.ok(Math.abs(out[1] - mid.base.ventral) < 1e-9, 'the bottom of the station stays');
w(0, (mid.base.dorsal + mid.base.ventral) / 2, mid.axis, out);
assert.ok(Math.abs(out[1] - (mid.base.dorsal + .5 + mid.base.ventral) / 2) < 1e-9, 'the midline moves to the new middle');
w(.3, .2, mid.axis, out);
assert.ok(Math.abs(out[0] - .3) < 1e-9, 'a dorsal edit leaves the width alone');
// Four stations away the Catmull-Rom support has run out and nothing moves.
const far = doc.stations[14];
w(0, far.base.dorsal, far.axis, out);
assert.ok(Math.abs(out[1] - far.base.dorsal) < 1e-9, 'the change is local to the neighbouring spans');
assert.ok(Math.abs(out[2] - far.axis) < 1e-9);

// ---- width scales the lateral offset proportionally ----
const wider = setValue(doc, 10, 'width', mid.base.width * 2);
const w2 = warp(wider);
w2(.3, 0, mid.axis, out);
assert.ok(Math.abs(out[0] - .6) < 1e-9, `lateral offset doubles with the width: ${out[0]}`);
w2(-.3, 0, mid.axis, out);
assert.ok(Math.abs(out[0] + .6) < 1e-9, 'both sides, mirrored');

// ---- ventral cannot cross dorsal, width cannot go negative ----
const crossed = setValue(doc, 10, 'ventral', mid.base.dorsal + 1);
assert.equal(crossed.stations[10].edit.ventral, crossed.stations[10].edit.dorsal);
assert.equal(setValue(doc, 10, 'width', -3).stations[10].edit.width, 0);

// ---- shifting a station keeps the axis map monotone ----
const gap = doc.stations[1].axis - doc.stations[0].axis;
const shifted = setShift(doc, 10, gap * 5);
assert.ok(shifted.stations[10].shift < gap, 'a shift is clamped short of the next station');
let prev = -Infinity;
for (let a = doc.bounds.axisMin; a <= doc.bounds.axisMax; a += .01) {
  const m = remapAxis(shifted.stations, a);
  assert.ok(m >= prev - 1e-12, `axis map is monotone at ${a}`);
  prev = m;
}
const w3 = warp(setShift(doc, 10, gap * .5));
w3(0, 0, mid.axis, out);
assert.ok(Math.abs(out[2] - (mid.axis + gap * .5)) < 1e-9, 'a vertex at the station moves with it');
w3(0, 0, doc.stations[15].axis, out);
assert.ok(Math.abs(out[2] - doc.stations[15].axis) < 1e-9, 'a vertex at an unshifted station stays');

// ---- tangents ----
const auto = autoSlope(doc.stations, 10, 'dorsal', 'edit');
const pulled = setTangent(doc, 10, 'dorsal', auto + 2);
assert.ok(!isIdentity(pulled), 'a pulled tangent is an edit');
const between = (doc.stations[10].axis + doc.stations[11].axis) / 2;
assert.ok(evaluate(pulled.stations, 'dorsal', 'edit', between) > evaluate(doc.stations, 'dorsal', 'edit', between), 'a steeper slope lifts the span after the station');
assert.ok(Math.abs(evaluate(pulled.stations, 'dorsal', 'edit', doc.stations[10].axis) - doc.stations[10].base.dorsal) < 1e-12, 'the station itself does not move');
assert.ok(isIdentity(setTangent(pulled, 10, 'dorsal', undefined)), 'releasing the tangent restores automatic');
assert.ok(isIdentity(resetStations(setValue(setShift(pulled, 3, .1), 7, 'width', 9))), 'reset puts everything back');

// ---- export ----
const exported = exportDoc(setValue(doc, 10, 'dorsal', mid.base.dorsal * 1.5));
assert.equal(exported.format, 'cambrian-sculpt');
assert.equal(exported.changed, true);
assert.equal(exported.stations[10].dorsal.percent, 50);
assert.equal(exported.stations[9].dorsal.percent, 0);
assert.equal(exported.creature.id, 'spindle');
assert.equal(exportDoc(doc).changed, false);

// ---- history ----
const h = new History<SculptDoc>(doc);
h.push(raised);
h.replace(setValue(raised, 10, 'dorsal', 3));
h.push(wider);
assert.equal(h.undo(), raised === h.present ? raised : h.present);
assert.equal(h.present.stations[10].edit.dorsal, mid.base.dorsal + .5, 'undo returns the last committed step, not the drag intermediate');
assert.equal(h.undo(), doc);
assert.ok(!h.canUndo);
assert.equal(h.redo(), raised);
assert.equal(h.redo(), wider);
assert.ok(!h.canRedo);
h.undo(); h.push(shifted);
assert.ok(!h.canRedo, 'a new step after undo drops the redo branch');

console.log('PASS: sculpt document — measuring, identity warp, local dorsal/ventral/width edits, monotone axis shifts, tangents, export, history');
