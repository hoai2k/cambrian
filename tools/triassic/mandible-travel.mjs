/** How much of the jaw bone's own rotation does the *front of the mandible* actually take? (T3D-37)
 *
 * `lag.mjs`' `follows` is accumulated over the ball of vertices round the joint, so it says nothing
 * about the tooth row at the snout — which is exactly where a band that is too wide leaves the jaw
 * behind. This measures the tip: every skin vertex in the front fifth of the mouth and below the
 * mouth line, and how far it actually travels between the rest pose and the clip's widest gape
 * against how far a rigid rotation of the jaw bone would have carried it.
 *
 *   node tools/triassic/mandible-travel.mjs <glb> <Clip> <t> [--profile]
 *
 * The front fifth is taken along glTF +Z (every Triassic body faces +Z) over the vertices carrying any
 * `jaw` weight. Cymbospondylus' height-band sweep is the reason it exists: `lag.mjs` read 1.00 while
 * this read 0.446 at `Bite`.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
import fs from 'node:fs';
await MeshoptDecoder.ready;
globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 2048, height: 2048, close() {} });

const [file, clipName, tArg] = process.argv.slice(2);
const buf = fs.readFileSync(file);
const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  .parseAsync(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '');
const skinned = [];
gltf.scene.traverse((o) => { if (o.isSkinnedMesh) skinned.push(o); });
const mixer = new THREE.AnimationMixer(gltf.scene);
const clip = gltf.animations.find((a) => a.name === clipName);
const jawBone = skinned[0].skeleton.bones.find((b) => b.name === 'jaw');

function sample(t) {
  mixer.stopAllAction();
  if (t !== null) { mixer.clipAction(clip).play(); mixer.setTime(0); mixer.setTime(t); }
  else mixer.setTime(0);
  gltf.scene.updateMatrixWorld(true);
  const out = []; const v = new THREE.Vector3();
  for (const m of skinned) {
    m.skeleton.update();
    for (let i = 0; i < m.geometry.attributes.position.count; i++) { m.getVertexPosition(i, v); v.applyMatrix4(m.matrixWorld); out.push(v.clone()); }
  }
  return out;
}
const jawW = [];
for (const m of skinned) {
  const sk = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
  for (let i = 0; i < sk.count; i++) {
    let w = 0;
    for (let k = 0; k < 4; k++) if (m.skeleton.bones[sk.getComponent(i, k)]?.name === 'jaw') w += sw.getComponent(i, k);
    jawW.push(w);
  }
}
const rest = sample(null);
// the jaw bone's rigid transform at the posed frame, relative to rest
const restJaw = jawBone.matrixWorld.clone();
const posed = sample(Number(tArg));
const poseJaw = jawBone.matrixWorld.clone();
const rigid = new THREE.Matrix4().multiplyMatrices(poseJaw, restJaw.clone().invert());

// the mouth's extent along the body: take it from the vertices that carry any jaw weight
const withJaw = rest.filter((p, i) => jawW[i] > 0.02);
const zs = withJaw.map((p) => p.z).sort((a, b) => a - b);
const back = zs[0], front = zs[zs.length - 1];
const cut = front - (front - back) * 0.20;      // the front fifth of the jaw's own reach
let n = 0, sumActual = 0, sumRigid = 0, sumW = 0, worst = 1e9;
const tmp = new THREE.Vector3();
for (let i = 0; i < rest.length; i++) {
  if (jawW[i] < 0.02 || rest[i].z < cut) continue;
  tmp.copy(rest[i]).applyMatrix4(rigid);
  const r = tmp.distanceTo(rest[i]);
  if (r < 1e-6) continue;
  const a = posed[i].distanceTo(rest[i]);
  n++; sumActual += a; sumRigid += r; sumW += jawW[i];
  worst = Math.min(worst, a / r);
}
// **`--profile`: the whole tooth row, not just its tip** (T3D-39). The front fifth says nothing
// about a jaw that *bows* -- full travel at the chin and a rear half the skull holds back -- which is
// the failure a ramp through the mandible risks (Mixosaurus at 0.05 of a body). So the jaw-weighted
// skin ahead of the hinge is cut into five bins from the hinge to the front of the mouth and each
// bin reports the same figure: how far it travelled over how far the jaw bone alone would have
// carried it. A rigid mandible reads 1.00 in every bin; a bow reads low at the back.
let profile;
if (process.argv.includes('--profile')) {
  const hingeZ = new THREE.Vector3().setFromMatrixPosition(restJaw).z;
  // The tooth row is the mandible's, so where the body carries its mandible as a mesh of its own
  // (every cut jaw does) only that mesh is binned: the skull's lip beside the corner of the mouth
  // takes part of the jaw on purpose, and counted here it would read as a jaw that lags.
  const meshOf = [];
  for (const m of skinned) for (let i = 0; i < m.geometry.attributes.position.count; i++) meshOf.push(m.name);
  const jawMesh = skinned.some((m) => /lower.?jaw|mandible/i.test(m.name));
  const ahead = rest.map((p, i) => i).filter((i) => jawW[i] > 0.02 && rest[i].z > hingeZ
    && (!jawMesh || /lower.?jaw|mandible/i.test(meshOf[i])));
  const far = Math.max(...ahead.map((i) => rest[i].z));
  profile = [0, 1, 2, 3, 4].map((k) => {
    const lo = hingeZ + (far - hingeZ) * k / 5, hi = hingeZ + (far - hingeZ) * (k + 1) / 5;
    let a = 0, r = 0, m = 0, w = 0;
    for (const i of ahead) {
      if (rest[i].z < lo || rest[i].z > hi) continue;
      tmp.copy(rest[i]).applyMatrix4(rigid);
      const rr = tmp.distanceTo(rest[i]);
      if (rr < 1e-6) continue;
      a += posed[i].distanceTo(rest[i]); r += rr; m++; w += jawW[i];
    }
    return { fromHinge: +(k / 5).toFixed(1), vertices: m, meanJawWeight: m ? +(w / m).toFixed(3) : null,
             travelOverRigid: r ? +(a / r).toFixed(3) : null };
  });
}
console.log(JSON.stringify({
  file, clip: clipName, t: Number(tArg),
  frontFifthVertices: n,
  meanJawWeightThere: +(sumW / n).toFixed(3),
  travelOverRigid: +(sumActual / sumRigid).toFixed(3),
  worstVertex: +worst.toFixed(3),
  ...(profile ? { toothRowFromHingeToFront: profile } : {}),
}));
