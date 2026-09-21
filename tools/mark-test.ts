/**
 * The viewer's region marking. Run: npm run mark
 *
 * Guards the arithmetic the brush and the export are made of, without a browser: a brush catches
 * exactly the vertices inside its sphere and nothing on the far side of the body, erasing is the
 * same brush the other way round, a stroke is one undo step, and a region file addresses the mesh
 * it was marked on well enough that applying it to a different one can be refused — the indices
 * are real indices, the bounds are the box those vertices actually occupy, and the single-mesh
 * shorthand only appears when there is nothing to disambiguate.
 */
import assert from 'node:assert/strict';
import {
  brushHits, buildRegion, cloneMarks, describeMarked, emptyMarks, markedCount, paintInto, totalVertices,
} from '../src/viewer/mark/region';
import { History } from '../src/viewer/sculpt/history';
import { buttonRoles, schemeIsUsable } from '../src/viewer/pointer-scheme';

// Two rings of eight around the z axis, a unit apart: a stand-in for a body with a fin on it, small
// enough that every answer below can be counted by hand.
function ring(z: number, radius: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < 8; i++) {
    const t = (i / 8) * Math.PI * 2;
    out.push(radius * Math.cos(t), radius * Math.sin(t), z);
  }
  return out;
}
const body = new Float32Array([...ring(0, 1), ...ring(2, 1)]);
// A second mesh standing well away from the first: the fin, as a separate primitive.
const fin = new Float32Array([0, 3, 0, .2, 3.1, 0, -.2, 3.1, 0]);
const meshes = [{ index: 0, name: 'body', count: body.length / 3 }, { index: 1, name: 'fin', count: fin.length / 3 }];

// ---- the brush ----
assert.equal(totalVertices(meshes), 19);
// A sphere about the first ring's +x vertex, wide enough for its two neighbours and no wider.
const near = brushHits(body, 1, 0, 0, 0.8);
assert.deepEqual(near, [0, 1, 7], 'the brush takes the point it is on and its neighbours round the ring');
// The same brush does not reach the ring a whole unit away along z, nor the far side of the body.
assert.ok(!near.some((v) => v >= 8), 'the brush does not reach through to the next station');
assert.ok(!near.includes(4), 'the brush does not reach the far side of the body');
assert.deepEqual(brushHits(body, 1, 0, 0, 0.01), [0], 'a brush smaller than the spacing takes one vertex');
assert.deepEqual(brushHits(body, 0, 0, 40, 1), [], 'a brush nowhere near the body takes nothing');
assert.equal(brushHits(body, 0, 0, 1, 10).length, 16, 'a brush bigger than the body takes all of it');
// The radius is inclusive, so a vertex exactly on the rim is caught rather than flickering.
assert.deepEqual(brushHits(new Float32Array([2, 0, 0]), 0, 0, 0, 2), [0], 'a vertex on the rim is inside the brush');

// ---- painting and erasing ----
const marks = emptyMarks(meshes);
assert.equal(markedCount(marks), 0);
assert.equal(paintInto(marks[0], near, false), 3, 'three vertices changed');
assert.equal(paintInto(marks[0], near, false), 0, 'painting the same vertices again changes nothing');
assert.equal(markedCount(marks), 3);
assert.equal(paintInto(marks[0], [0], true), 1, 'erasing unmarks');
assert.equal(markedCount(marks), 2);
paintInto(marks[0], [0], false);

// A copy is a copy: the undo stack holds states, not views of one mutable buffer.
const copy = cloneMarks(marks);
paintInto(copy[0], [4], false);
assert.equal(markedCount(marks), 3, 'painting a copy leaves the original alone');
assert.equal(markedCount(copy), 4);

// ---- a stroke is one step ----
const history = new History<Uint8Array[]>(cloneMarks(marks));
history.push(copy);
assert.equal(markedCount(history.present), 4);
assert.deepEqual([...history.undo()[0]], [...marks[0]], 'undo restores the marks byte for byte');
assert.equal(markedCount(history.redo()), 4, 'redo puts the stroke back');

// ---- the region file ----
const region = buildRegion({
  id: 'atopodentatus', model: 'assets/triassic/creatures/atopodentatus.preview.glb',
  sha256: 'abc123', note: 'the three ventral fins', markedAt: '2026-09-13T00:00:00.000Z',
  meshes, locals: [body, fin], marks: copy,
});
assert.equal(region.schema, 'mesh-region/1');
assert.equal(region.id, 'atopodentatus');
assert.equal(region.sha256, 'abc123');
assert.equal(region.vertexCount, 19, 'the count is the whole body, so a report can say what share was cut');
assert.equal(region.markedCount, 4);
assert.equal(region.meshes.length, 1, 'a mesh with nothing marked is left out');
assert.equal(region.meshes[0].index, 0);
assert.equal(region.meshes[0].vertexCount, 16, 'the mesh carries the count a cutting script must find');
assert.deepEqual(region.meshes[0].vertices, [0, 1, 4, 7], 'indices, ascending');
assert.equal(region.vertices, undefined, 'two meshes on the body means the per-mesh list is the only answer');
// The bounds are the box those vertices occupy in the file's own coordinates: 0, 1, 4 and 7 of the
// first ring run from the −x vertex round to +x, all at z = 0.
const b = region.meshes[0].bounds!;
assert.ok(Math.abs(b.min[0] + 1) < 1e-6 && Math.abs(b.max[0] - 1) < 1e-6, `bounds span the ring in x: ${JSON.stringify(b)}`);
assert.ok(Math.abs(b.min[2]) < 1e-6 && Math.abs(b.max[2]) < 1e-6, 'the marked vertices are all on the first station');
for (const v of region.meshes[0].vertices) {
  for (let k = 0; k < 3; k++) {
    assert.ok(body[v * 3 + k] >= b.min[k] - 1e-6 && body[v * 3 + k] <= b.max[k] + 1e-6, 'every marked vertex is inside the bounds it quotes');
  }
}

// One mesh has nothing to disambiguate, so the file also answers the simple question directly.
const single = buildRegion({
  id: 'fin-only', model: 'fin.glb', sha256: null, note: '', markedAt: '2026-09-13T00:00:00.000Z',
  meshes: [meshes[1]], locals: [fin], marks: [Uint8Array.from([0, 1, 1])],
});
assert.deepEqual(single.vertices, [1, 2], 'a single-mesh body exports its indices at the top level too');
assert.deepEqual(single.meshes[0].vertices, single.vertices);
assert.equal(single.sha256, null, 'a body the manifest has no hash for says so rather than inventing one');

// Nothing marked at all is a file with no meshes in it, not a file claiming a mesh with no vertices.
const empty = buildRegion({
  id: 'none', model: 'fin.glb', sha256: null, note: '', markedAt: '2026-09-13T00:00:00.000Z',
  meshes: [meshes[1]], locals: [fin], marks: emptyMarks([meshes[1]]),
});
assert.deepEqual(empty.meshes, []);
assert.equal(empty.markedCount, 0);
assert.equal(empty.vertices, undefined);

// ---- the readout ----
assert.equal(describeMarked(1204, 12059), '1,204 of 12,059 vertices · 10.0%');
assert.equal(describeMarked(3, 12059), '3 of 12,059 vertices · 0.02%');
assert.equal(describeMarked(0, 0), '0 of 0 vertices · 0.00%');

// ---- the pointer scheme the mode runs under ----
// The brush owns the left button, which is the one thing that makes mark mode different from the
// other two editors. So the orbit moves to the right and the pan to the middle — a pan it has to
// have somewhere, and the wheel already dollies.
{
  const r = buttonRoles('paint');
  assert.equal(r.left, null, 'the brush has the left button, so the orbit does not');
  assert.equal(r.right, 'rotate', 'right orbits');
  assert.equal(r.middle, 'pan', 'and middle pans — the wheel is the dolly here');
  assert.ok(schemeIsUsable('paint'), 'both of the camera\'s questions are answered, once each');
  assert.notDeepEqual(buttonRoles('paint'), buttonRoles('view'), 'and it is not the view scheme');
}

console.log('PASS: mark regions — brush radius, erase, stroke history, region file addressing, bounds, single-mesh shorthand, readout, paint pointer scheme');
