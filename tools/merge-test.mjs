// Run from repo root: node tools/merge-test.mjs
// The part merge must be lossless: the skinned surface a rig draws after merging is the same
// surface, vertex for vertex, that it drew before — under every clip, at every time.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
const { mergeSkinnedParts } = await import('../src/render/merge-skins.ts');
globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 512, height: 512, close() {} });

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const load = async (path) => {
  const b = fs.readFileSync(path);
  return loader.parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '');
};

/** Order-independent summary of the posed surface: vertex count, bounds and centroid, in world space. */
function survey(root) {
  const v = new THREE.Vector3();
  const min = new THREE.Vector3(Infinity, Infinity, Infinity), max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  const sum = new THREE.Vector3();
  let n = 0, tris = 0;
  root.updateWorldMatrix(true, true);
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const g = o.geometry, pos = g.getAttribute('position');
    tris += (g.index ? g.index.count : pos.count) / 3;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      if (o instanceof THREE.SkinnedMesh) o.applyBoneTransform(i, v);
      v.applyMatrix4(o.matrixWorld);
      min.min(v); max.max(v); sum.add(v); n++;
    }
  });
  return { n, tris, min: min.toArray(), max: max.toArray(), centroid: sum.divideScalar(n || 1).toArray() };
}
const close = (a, b, eps, what) => assert(Math.abs(a - b) <= eps, `${what}: ${a} vs ${b}`);

let checks = 0, merged = 0;
const dirs = ['public/assets/devonian/creatures', 'public/assets/creatures'];
for (const dir of dirs) {
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.glb') && !f.includes('lod')).sort()) {
    const path = `${dir}/${file}`;
    const plain = await load(path), fused = await load(path);
    const before = countMeshes(plain.scene);
    mergeSkinnedParts(fused.scene, fused.animations);
    const after = countMeshes(fused.scene);
    assert(after <= before, `${file}: merge added meshes`);
    if (after < before) merged++;

    // Materials survive: the palette hook and the recolour slots read them by name.
    assert.deepEqual(materialNames(fused.scene), materialNames(plain.scene), `${file}: materials changed`);
    // Sockets survive: the anchors are read off the model by name.
    for (const name of anchorNames(plain.scene)) assert(fused.scene.getObjectByName(name), `${file}: lost socket ${name}`);

    const mixA = new THREE.AnimationMixer(plain.scene), mixB = new THREE.AnimationMixer(fused.scene);
    for (const clip of plain.animations) {
      const a = mixA.clipAction(clip).play();
      const b = mixB.clipAction(fused.animations.find((c) => c.name === clip.name)).play();
      for (const f of [0, 0.37, 0.74]) {
        mixA.setTime(clip.duration * f); mixB.setTime(clip.duration * f);
        const s1 = survey(plain.scene), s2 = survey(fused.scene);
        assert.equal(s2.n, s1.n, `${file} ${clip.name}: vertex count`);
        assert.equal(s2.tris, s1.tris, `${file} ${clip.name}: triangles`);
        for (let i = 0; i < 3; i++) {
          close(s2.min[i], s1.min[i], 1e-4, `${file} ${clip.name} min${i}`);
          close(s2.max[i], s1.max[i], 1e-4, `${file} ${clip.name} max${i}`);
          close(s2.centroid[i], s1.centroid[i], 1e-4, `${file} ${clip.name} centroid${i}`);
        }
        checks++;
      }
      a.stop(); b.stop();
    }
    process.stdout.write(`${file.padEnd(24)} meshes ${String(before).padStart(4)} -> ${String(after).padStart(4)}\n`);
  }
}
function countMeshes(root) { let n = 0; root.traverse((o) => { if (o.isMesh) n++; }); return n; }
function materialNames(root) { const s = new Set(); root.traverse((o) => { if (o.isMesh) for (const m of [o.material].flat()) s.add(m.name); }); return [...s].sort(); }
function anchorNames(root) { const s = []; root.traverse((o) => { if (o.userData.cambrianAnchor) s.push(o.name); }); return s; }

assert(merged > 0, 'nothing merged');
console.log(`PASS: ${checks} posed surveys across both eras, ${merged} rigs merged`);
