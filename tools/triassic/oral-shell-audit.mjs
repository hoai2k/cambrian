/** Validate the packaged separate-palate/floor contract. Usage: node ... <id> [id ...]. */
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
    for (const node of d.getRoot().listNodes()) {
      if (!node.getMesh() || !/lining/i.test(node.getName() + ' ' + node.getMesh().getName())) continue;
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
    assert(row.meshes.length > 0, `${id}${suffix}: no oral shells found`);
    rows.push(row);
  }
  fs.writeFileSync(`tools/triassic/creatures/${id}/oral-shell-audit.json`, JSON.stringify({ id, method: 'Actual packaged GLBs: one unit bone weight per vertex; every triangle belongs wholly to skull or jaw; every indexed edge is shared by two faces; both closed halves present.', models: rows }, null, 2) + '\n');
  console.log(`${id}: separate closed rigid palate/floor on authored, puppet and LOD`);
}
