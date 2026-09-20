/**
 * Record the skinning-tear sweep into a body's `validation.json`.
 *
 *   node tools/triassic/creatures/_pipeline/record-tears.mjs <id>
 *
 * `tools/triassic/skin-tears.mjs` is the measurement and this is the bookkeeping: it runs the same
 * sweep -- every edge of every skinned mesh, 17 phases of every clip, against the rest pose -- and
 * writes the worst figure into the builder's own report, because a number that lives only in a
 * terminal is a number the next session has to re-derive.
 *
 * It reports **two** figures, and the split is the point. A body's oral lining is one skinned tube
 * whose roof rides the skull and whose floor rides the jaw: the wall between them is *built to
 * stretch*, because that is what holds the mouth closed at rest and keeps it closed to the eye at
 * full gape. Its rest length at a shut mouth is nearly nothing, so its ratio at gape is enormous
 * and means only that the mouth opened. The skin is the half `skin-tears.mjs` was written for --
 * Coelophysis' ribboned feet, Macrocnemus' limbs -- and is where a figure approaching Placodus'
 * 12.4x is a defect to fix in the weights rather than ship. Reporting one number for both hides the
 * half that matters behind the half that does not.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

await MeshoptDecoder.ready;
globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 2048, height: 2048, close() {} });

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../../..');
const id = process.argv[2];
if (!id) throw new Error('usage: record-tears.mjs <id>');
const file = path.join(ROOT, 'public/assets/triassic/creatures', `${id}.glb`);
const reportPath = path.join(ROOT, 'tools/triassic/creatures', id, 'validation.json');

const THRESH = 2;
const PHASES = 17;
const buf = fs.readFileSync(file);
const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  .parseAsync(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '');
const skinned = [];
gltf.scene.traverse((o) => { if (o.isSkinnedMesh) skinned.push(o); });
const mixer = new THREE.AnimationMixer(gltf.scene);
const v = new THREE.Vector3();

function sample(clip, t) {
  mixer.stopAllAction();
  if (clip) { mixer.clipAction(clip).play(); mixer.setTime(0); mixer.setTime(t); } else mixer.setTime(0);
  gltf.scene.updateMatrixWorld(true);
  const out = [];
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

const edges = [];
{
  let base = 0;
  for (const m of skinned) {
    const idx = m.geometry.index;
    const sk = m.geometry.attributes.skinIndex;
    const sw = m.geometry.attributes.skinWeight;
    const dom = (i) => {
      let bi = 0, bw = -1;
      for (let k = 0; k < 4; k++) {
        const w = sw.getComponent(i, k);
        if (w > bw) { bw = w; bi = sk.getComponent(i, k); }
      }
      return m.skeleton.bones[bi]?.name ?? `#${bi}`;
    };
    const seen = new Set();
    for (let t = 0; t < idx.count; t += 3) {
      const a = idx.getX(t), b = idx.getX(t + 1), c = idx.getX(t + 2);
      for (const [u, w] of [[a, b], [b, c], [c, a]]) {
        const key = u < w ? u * 1e7 + w : w * 1e7 + u;
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push([base + u, base + w, dom(u), /lining/i.test(m.name) ? 'oralLining' : 'skin']);
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
const L = Math.max(...mx.map((x, i) => x - mn[i]));
const len = (P, i, j) => Math.hypot(P[j * 3] - P[i * 3], P[j * 3 + 1] - P[i * 3 + 1], P[j * 3 + 2] - P[i * 3 + 2]);
const restLen = edges.map(([u, w]) => len(rest, u, w));

const parts = { skin: null, oralLining: null };
for (const clip of gltf.animations) {
  for (let p = 0; p < PHASES; p++) {
    const P = sample(clip, clip.duration * (p / (PHASES - 1)));
    for (let e = 0; e < edges.length; e++) {
      const r = restLen[e];
      if (r < 1e-6) continue;
      // The same absolute floor `skin-tears.mjs` uses: a stretch that ends shorter than 1.5 % of
      // body length is a tenth of a millimetre of oral geometry, not a torn surface.
      const posed = len(P, edges[e][0], edges[e][1]);
      if (posed < L * 0.015) continue;
      const ratio = posed / r;
      const key = edges[e][3];
      const g = parts[key] ?? { worstRatio: 1, clip: '', bone: '', grewFrom: 0, grewTo: 0, instancesOverTwice: 0 };
      if (ratio > THRESH) g.instancesOverTwice++;
      if (ratio > g.worstRatio) {
        g.worstRatio = ratio; g.clip = clip.name; g.bone = edges[e][2];
        g.grewFrom = r; g.grewTo = posed;
      }
      parts[key] = g;
    }
  }
}

const round = (g) => g && ({
  ...g,
  worstRatio: Number(g.worstRatio.toFixed(2)),
  grewFrom: Number(g.grewFrom.toFixed(4)),
  grewTo: Number(g.grewTo.toFixed(4)),
});
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
report.skinTears = {
  tool: 'tools/triassic/skin-tears.mjs',
  phasesPerClip: PHASES,
  clips: gltf.animations.length,
  edges: edges.length,
  bodyLength: Number(L.toFixed(3)),
  skin: round(parts.skin),
  oralLining: round(parts.oralLining),
  note: 'The lining wall is built to stretch -- roof on the skull, floor on the jaw -- so its ratio '
    + 'at full gape says the mouth opened, not that anything tore. `skin` is the figure to compare '
    + "against the shore batch's (Nothosaurus 2.98x, Tanystropheus 6.1x, Placodus 12.4x).",
};
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`${id}: skin ${report.skinTears.skin?.worstRatio ?? '-'}x`
  + ` (${report.skinTears.skin?.bone} in ${report.skinTears.skin?.clip}),`
  + ` lining ${report.skinTears.oralLining?.worstRatio ?? '-'}x`);
