/** Actual GLTF playback checks. Run from repo root: node tools/hallucigenia-test.mjs */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 512, height: 512, close() {} });
for (const suffix of ['', '.lod1']) {
  const file = `public/assets/creatures/hallucigenia${suffix}.glb`;
  const bytes = fs.readFileSync(file);
  assert(bytes.length < 25_000_000);
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const model = gltf.scene;
  model.updateMatrixWorld(true);
  const bones = [], meshes = [], sockets = [];
  model.traverse(o => { if (o.isBone) bones.push(o); if (o.isSkinnedMesh) meshes.push(o); if (o.userData.cambrianAnchor) sockets.push(o); });
  assert.equal(bones.filter(b => b.name.startsWith('neck_')).length, 3);
  assert.equal(bones.filter(b => b.name.startsWith('spine_')).length, 14);
  assert.equal(sockets.length, 11);
  const feet = [];
  for (let i = 0; i < 7; i++) for (const [side, sign] of [['L', -1], ['R', 1]]) {
    const bone = model.getObjectByName(`leg_${String(i).padStart(2, '0')}_${side}_tip`);
    const point = new THREE.Vector3(sign * .52, .07, -(-.65 + i * .4 + .05));
    feet.push({ bone, local: bone.worldToLocal(point.clone()), heights: [], forward: [] });
  }
  const mixer = new THREE.AnimationMixer(model);
  let vertexSamples = 0;
  for (const clip of gltf.animations) {
    mixer.stopAllAction();
    const action = mixer.clipAction(clip).setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true; action.play();
    for (let frame = 0; frame <= 48; frame++) {
      mixer.setTime(clip.duration * frame / 48); model.updateMatrixWorld(true);
      for (const mesh of meshes) {
        mesh.skeleton.update();
        for (let v = 0; v < mesh.geometry.attributes.position.count; v += 11) {
          const p = mesh.getVertexPosition(v, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
          assert(p.toArray().every(Number.isFinite), `${clip.name}: nonfinite skin`);
          assert(p.length() < 5, `${clip.name}: exploded skin ${p.toArray()}`);
          vertexSamples++;
        }
      }
      if (clip.name === 'Crawl') for (const foot of feet) {
        const p = foot.bone.localToWorld(foot.local.clone());
        foot.heights.push(p.y); foot.forward.push(p.z);
      }
    }
    if (['Crawl', 'Idle'].includes(clip.name)) {
      const end = bones.map(b => b.matrixWorld.clone());
      action.reset().play(); mixer.setTime(0); model.updateMatrixWorld(true);
      for (let i = 0; i < bones.length; i++) {
        const error = Math.max(...bones[i].matrixWorld.elements.map((v, j) => Math.abs(v - end[i].elements[j])));
        assert(error < .002, `${clip.name}: seam ${bones[i].name} ${error}`);
      }
    }
  }
  for (const foot of feet) {
    const lift = Math.max(...foot.heights) - Math.min(...foot.heights);
    const stride = Math.max(...foot.forward) - Math.min(...foot.forward);
    assert(lift > .12 && lift < .25, `${foot.bone.name}: lift ${lift}`);
    assert(stride > .22 && stride < .34, `${foot.bone.name}: stride ${stride}`);
    assert(Math.min(...foot.heights) > .045, `${foot.bone.name}: floor penetration`);
    assert(foot.heights.filter(h => Math.abs(h - .07) < .015).length > 24, `${foot.bone.name}: missing stance`);
  }
  // Adjacent feet have different lift timing, while both sides share the same stride range.
  assert(feet[0].heights.some((h, i) => Math.abs(h - feet[2].heights[i]) > .08));
  console.log(file, { clips: gltf.animations.length, sockets: sockets.length, vertexSamples, metachronalGait: true, loopSeams: 'pass', bytes: bytes.length });
}
