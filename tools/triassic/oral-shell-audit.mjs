/** Validate the packaged separate-palate/floor contract. Usage: node ... <id> [id ...].
 *
 * A body may also carry **no oral lining at all** -- Dinocephalosaurus, whose cut is closed by its
 * seated hinge tissue alone, and the two cephalopods, whose crowns are the closed surface the
 * generation delivered. That is a verdict, not an omission (`docs/triassic/throat-repairs/oral-verdicts.md`),
 * so it is reported cleanly rather than failed: every variant must agree that there is nothing, and
 * the hidden oral parts that *are* present (hinge tissue) are listed so nothing named like a mouth
 * slips past as "no lining".
 */
const ORAL = /lining|mouth[ _]interior|hinge[ _]tissue|beak|palate/i;
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const ids = process.argv.slice(2);
assert(ids.length, 'specify the rebuilt species to audit');
for (const id of ids) {
  const rows = [];
  for (const suffix of ['', '.puppet', '.lod1']) {
    const file = `public/assets/triassic/creatures/${id}${suffix}.glb`;
    const bytes = fs.readFileSync(file), d = await io.readBinary(bytes);
    const row = { variant: suffix || 'authored', sha256: crypto.createHash('sha256').update(bytes).digest('hex'), meshes: [] };
    row.otherOralMeshes = [];
    for (const node of d.getRoot().listNodes()) {
      if (!node.getMesh()) continue;
      const label = node.getName() + ' ' + node.getMesh().getName();
      if (!/lining/i.test(label)) {
        if (ORAL.test(label + ' ' + node.getMesh().listPrimitives().map(p => p.getMaterial()?.getName() || '').join(' ')))
          row.otherOralMeshes.push(node.getName());
        continue;
      }
      const bones = node.getSkin().listJoints().map(n => n.getName());
      for (const p of node.getMesh().listPrimitives()) {
        const j = p.getAttribute('JOINTS_0'), w = p.getAttribute('WEIGHTS_0'), ix = p.getIndices();
        const owners = [];
        for (let i = 0; i < w.getCount(); i++) {
          const ji = j.getElement(i, []), wi = w.getElement(i, []);
          const active = wi.flatMap((value, k) => value > 1e-6 ? [[bones[ji[k]], value]] : []);
          assert.equal(active.length, 1, `${id}${suffix}: lining vertex ${i} blends bones`);
          assert(['skull', 'jaw'].includes(active[0][0]), 'lining is owned by a non-mouth bone');
          assert(Math.abs(active[0][1] - 1) < 1e-6, 'lining weight is not normalized');
          owners.push(active[0][0]);
        }
        const triangles = { skull: 0, jaw: 0 }, edges = new Map();
        for (let t = 0; t < ix.getCount(); t += 3) {
          const v = [ix.getScalar(t), ix.getScalar(t + 1), ix.getScalar(t + 2)];
          assert(v.every(i => owners[i] === owners[v[0]]), `${id}${suffix}: a triangle bridges the jaws`);
          triangles[owners[v[0]]]++;
          for (let k = 0; k < 3; k++) {
            const a = v[k], b = v[(k + 1) % 3], key = `${Math.min(a, b)},${Math.max(a, b)}`;
            edges.set(key, (edges.get(key) || 0) + 1);
          }
        }
        assert(triangles.skull > 0 && triangles.jaw > 0, 'both palate and floor must be present');
        const boundaryEdges = [...edges.values()].filter(n => n !== 2).length;
        assert.equal(boundaryEdges, 0, `${id}${suffix}: oral shells are open or nonmanifold`);
        row.meshes.push({ name: node.getName(), vertices: w.getCount(), triangles, boundaryEdges, mixedVertices: 0, bridgingTriangles: 0 });
      }
    }
    row.oralShells = row.meshes.length ? 'separate palate and floor' : 'none';
    rows.push(row);
  }
  const none = rows.filter(r => r.oralShells === 'none').length;
  assert(none === 0 || none === rows.length, `${id}: the variants disagree about whether there is an oral lining (${rows.map(r => r.variant + ': ' + r.oralShells).join(', ')})`);
  const verdict = none ? 'no oral lining: nothing to be mixed' : 'separate closed rigid palate/floor';
  fs.writeFileSync(`tools/triassic/creatures/${id}/oral-shell-audit.json`, JSON.stringify({ id, verdict, method: 'Actual packaged GLBs: one unit bone weight per vertex; every triangle belongs wholly to skull or jaw; every indexed edge is shared by two faces; both closed halves present. A body with no lining mesh is reported as such, with the hidden oral parts it does carry listed, and all three variants must agree.', models: rows }, null, 2) + '\n');
  const other = [...new Set(rows.flatMap(r => r.otherOralMeshes))];
  console.log(none
    ? `${id}: no oral lining on authored, puppet or LOD -- nothing to be mixed${other.length ? ` (other hidden oral parts: ${other.join(', ')})` : ''}`
    : `${id}: separate closed rigid palate/floor on authored, puppet and LOD`);
}
