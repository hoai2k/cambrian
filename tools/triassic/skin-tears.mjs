/**
 * Skinning tears: edges stretched far past their rest length, swept over every clip of a body.
 *
 *   node tools/triassic/skin-tears.mjs <glb> [ratio]
 *
 * This exists because the paired audits could not see the defect it measures. They play 61 phases
 * of every clip through the real GLTFLoader and AnimationMixer and check where every skinned vertex
 * *is* — travel from rest, bounds, envelopes. All of that passed on a Coelophysis whose head
 * renders as a flat blade and whose hind feet trail off in ribbons, because travel from rest is
 * bounded the whole time: no vertex moves more than 15 % of body length even while the foot it
 * belongs to is pulled inside out. What is wrong is not where the vertices are but how far apart
 * they are from each other, and only an edge-length comparison sees that.
 *
 * Two thresholds, because one is not enough. A **ratio** (default 2x) catches the stretch, and an
 * **absolute floor** of 1.5 % of body length throws away the noise: the oral lining and the teeth
 * carry edges a thousandth of a body long, and a 12x stretch of one of those is a tenth of a
 * millimetre and invisible, while 0.09 -> 0.42 on a skull is a torn head. Reporting only the ratio
 * ranked Tanystropheus' jaw above Coelophysis' feet, which is backwards.
 *
 * Read the output as: the clip, the worst ratio anywhere in it, the bone dominating that edge, how
 * many edge-instances over all phases exceed the ratio, what the worst edge grew from and to, and
 * the bones with the most torn edges. Limb bones dominating the list means the limb skinning is at
 * fault, which is what it currently says for Macrocnemus and Coelophysis.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
import fs from 'node:fs';

await MeshoptDecoder.ready;
globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 2048, height: 2048, close() {} });

const file = process.argv[2];
const THRESH = Number(process.argv[3] || 2);
const PHASES = 17;

const buf = fs.readFileSync(file);
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const gltf = await loader.parseAsync(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '');
const skinned = [];
gltf.scene.traverse((o) => { if (o.isSkinnedMesh) skinned.push(o); });
const mixer = new THREE.AnimationMixer(gltf.scene);

function sample(clip, t) {
  mixer.stopAllAction();
  if (clip) { mixer.clipAction(clip).play(); mixer.setTime(0); mixer.setTime(t); }
  else { mixer.setTime(0); }
  gltf.scene.updateMatrixWorld(true);
  const out = [];
  const v = new THREE.Vector3();
  for (const m of skinned) {
    m.skeleton.update();
    for (let i = 0; i < m.geometry.attributes.position.count; i++) {
      m.getVertexPosition(i, v);
      v.applyMatrix4(m.matrixWorld);
      out.push(v.x, v.y, v.z);
    }
  }
  return out;
}

// edge list once, with the dominant bone of each edge's first vertex
const edges = [];
{
  let base = 0;
  for (const m of skinned) {
    const idx = m.geometry.index;
    const sk = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
    const dom = (i) => {
      let bi = 0, bw = -1;
      for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; bi = sk.getComponent(i, k); } }
      return m.skeleton.bones[bi]?.name ?? ('#' + bi);
    };
    const seen = new Set();
    for (let t = 0; t < idx.count; t += 3) {
      const a = idx.getX(t), b = idx.getX(t + 1), c = idx.getX(t + 2);
      for (const [u, v] of [[a, b], [b, c], [c, a]]) {
        const key = u < v ? u * 1e7 + v : v * 1e7 + u;
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push([base + u, base + v, dom(u)]);
      }
    }
    base += m.geometry.attributes.position.count;
  }
}

const rest = sample(null, 0);
const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
for (let i = 0; i < rest.length; i += 3) for (let k = 0; k < 3; k++) {
  if (rest[i + k] < mn[k]) mn[k] = rest[i + k];
  if (rest[i + k] > mx[k]) mx[k] = rest[i + k];
}
const L = Math.max(...mx.map((v, i) => v - mn[i]));
const len = (P, i, j) => Math.hypot(P[j * 3] - P[i * 3], P[j * 3 + 1] - P[i * 3 + 1], P[j * 3 + 2] - P[i * 3 + 2]);
const restLen = edges.map(([u, v]) => len(rest, u, v));

const rows = [];
for (const clip of gltf.animations) {
  let worst = 1, worstBone = '', torn = 0, grew = [0, 0];
  const bones = new Map();
  for (let p = 0; p < PHASES; p++) {
    const P = sample(clip, clip.duration * (p / (PHASES - 1)));
    for (let e = 0; e < edges.length; e++) {
      const r = restLen[e];
      if (r < 1e-6) continue;
      const ratio = len(P, edges[e][0], edges[e][1]) / r;
      // An absolute floor as well as a ratio: an edge going 0.001 -> 0.012 is a tenth of a
      // millimetre of oral geometry and invisible, while 0.09 -> 0.42 is a torn head. Only count a
      // stretch that ends up longer than 1.5 % of body length.
      const posed = len(P, edges[e][0], edges[e][1]);
      if (posed < L * 0.015) continue;
      if (ratio > THRESH) { torn++; bones.set(edges[e][2], (bones.get(edges[e][2]) || 0) + 1); }
      if (ratio > worst) { worst = ratio; worstBone = edges[e][2]; grew = [r, posed]; }
    }
  }
  const top = [...bones.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
    .map(([n, c]) => `${n}:${c}`).join(' ');
  rows.push({ clip: clip.name, worst, worstBone, torn, top, grew });
}
rows.sort((a, b) => b.worst - a.worst);
console.log(`\n${file}   ${edges.length} edges x ${PHASES} phases x ${gltf.animations.length} clips`);
console.log(`${'clip'.padEnd(12)} ${'worst'.padStart(7)}  ${'on bone'.padEnd(15)} ${('>' + THRESH + 'x').padStart(7)}  worst bones`);
for (const r of rows) {
  if (r.worst < 1.6 && !r.torn) continue;
  console.log(`${r.clip.padEnd(12)} ${r.worst.toFixed(2).padStart(6)}x  ${r.worstBone.padEnd(15)} ${String(r.torn).padStart(7)}  ${r.grew[0].toFixed(3)}->${r.grew[1].toFixed(3)}  ${r.top}`);
}
const any = rows.filter((r) => r.torn).length;
console.log(`${any} of ${rows.length} clips tear an edge past ${THRESH}x`);
