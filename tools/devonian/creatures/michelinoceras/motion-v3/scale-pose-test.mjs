// Measure actual skinned pose displacement from hash-bound scale canonicalization.
import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict';
import { createHash } from 'node:crypto'; import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
globalThis.self = globalThis; globalThis.createImageBitmap = async () => ({ width: 1, height: 1, data: new Uint8Array([255, 255, 255, 255]), close() {} });
const root = path.resolve(process.cwd(), '../devonian-authoring/michelinoceras/motion-v3');
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
async function load(file) { const b = fs.readFileSync(file); return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset+b.byteLength), ''); }
const rows = [];
for (const suffix of ['', '.lod1']) {
  const file = `michelinoceras${suffix}.glb`, source = path.join(root, 'runtime-candidate-01', file), result = path.join(root, 'runtime-canonical-01', file);
  const a = await load(source), b = await load(result), am = new THREE.AnimationMixer(a.scene), bm = new THREE.AnimationMixer(b.scene);
  const meshes = []; a.scene.traverse(o => { if (o.isSkinnedMesh) meshes.push(o); });
  const bones = []; a.scene.traverse(o => { if (o.isBone) bones.push(o); });
  const aSkeletons = new Set(meshes.map(o => o.skeleton));
  const bSkeletons = new Set(meshes.map(o => b.scene.getObjectByName(o.name).skeleton));
  let maxVertexDisplacement = 0, samples = 0;
  for (const clip of a.animations) {
    am.stopAllAction(); bm.stopAllAction();
    const aa = am.clipAction(clip).setLoop(THREE.LoopOnce, 1).play(), ba = bm.clipAction(b.animations.find(c => c.name === clip.name)).setLoop(THREE.LoopOnce, 1).play();
    aa.paused = ba.paused = true;
    for (const fraction of [0, .25, .5, .75, 1]) {
      aa.time = ba.time = clip.duration*fraction; am.update(0); bm.update(0);
      a.scene.updateWorldMatrix(true, true); b.scene.updateWorldMatrix(true, true);
      for (const s of [...aSkeletons, ...bSkeletons]) s.update();
      for (const bone of bones) {
        const other = b.scene.getObjectByName(bone.name);
        assert.deepEqual(bone.position.toArray(), other.position.toArray(), 'local translation changed');
        assert.deepEqual(bone.quaternion.toArray(), other.quaternion.toArray(), 'local rotation changed');
        assert.deepEqual(other.scale.toArray(), [1, 1, 1], 'canonical animated scale is not exactly identity');
      }
      for (const mesh of meshes) {
        const other = b.scene.getObjectByName(mesh.name), count = mesh.geometry.attributes.position.count;
        for (const index of [0, Math.floor(count/2), count-1]) {
          const p = mesh.getVertexPosition(index, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
          const q = other.getVertexPosition(index, new THREE.Vector3()).applyMatrix4(other.matrixWorld);
          const error = p.distanceTo(q); assert(Number.isFinite(error)); maxVertexDisplacement = Math.max(maxVertexDisplacement, error); samples++;
        }
      }
    }
  }
  assert(maxVertexDisplacement < 1e-5, 'unit-scale cleanup exceeds frozen positional bound');
  rows.push({ file, sourceSha256: hash(source), canonicalSha256: hash(result), clips: a.animations.length, poseSamples: a.animations.length*5,
    skinnedVertexSamples: samples, maximumWorldVertexDisplacement: maxVertexDisplacement, localRotationsAndTranslationsExact: true, canonicalBoneScalesExactlyIdentity: true });
}
fs.writeFileSync(path.join(root, 'runtime-canonical-01/posed-scale-comparison.json'), JSON.stringify({ status: 'PASS', positionalBoundModelUnits: 1e-5, rows }, null, 2)+'\n');
console.log('MICHELINOCERAS_SCALE_POSE_PASS', JSON.stringify(rows));
