/**
 * Decode the paired exports, prove exact rig/socket/clip parity, then sample real Three.js
 * skinning. Two gait assertions are specific to this animal, and they are the inverse of
 * Placodus': Henodus has to ROW -- a flat armoured disc has no trunk to send a wave down, so the
 * limbs must out-travel the tail in Swim and Sprint rather than trail behind it -- and Crawl must
 * be a bounding punt with a long float rather than a lizard's trudge.
 *
 *   node tools/triassic/creatures/henodus/audit.mjs --package --decode
 */
import fs from 'node:fs';
import { auditCutAttachment } from '../_pipeline/cut-attachment.mjs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { declaredClips } from '../_pipeline/paired-audit.mjs';
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const base = 'public/assets/triassic/creatures/henodus';
const { CLIPS, LOOPS } = declaredClips(base);
const JOINTS = 25, SOCKETS = 3;
const hash = x => crypto.createHash('sha256').update(x).digest('hex');
const data = a => a ? Array.from(a.getArray()) : null;
const skeleton = d => d.getRoot().listSkins().map(s => ({ joints: s.listJoints().map(n => ({ name: n.getName(), parent: n.getParentNode()?.getName(), t: n.getTranslation(), r: n.getRotation(), s: n.getScale() })), bind: data(s.getInverseBindMatrices()) }));
const clips = d => d.getRoot().listAnimations().map(a => ({ name: a.getName(), channels: a.listChannels().map(c => ({ node: c.getTargetNode().getName(), path: c.getTargetPath(), interpolation: c.getSampler().getInterpolation(), times: data(c.getSampler().getInput()), values: data(c.getSampler().getOutput()) })).sort((x, y) => (x.node + x.path).localeCompare(y.node + y.path)) })).sort((a, b) => a.name.localeCompare(b.name));
const sockets = d => d.getRoot().listNodes().filter(n => n.getName().startsWith('anchor_')).map(n => ({ name: n.getName(), parent: n.getParentNode().getName(), t: n.getTranslation(), r: n.getRotation(), metadata: n.getExtras() })).sort((a, b) => a.name.localeCompare(b.name));
const meshValues = d => d.getRoot().listMeshes().map(m => m.listPrimitives().map(p => p.listSemantics().sort().map(s => [s, data(p.getAttribute(s))])));
if (process.argv.includes('--decode')) for (const suffix of ['', '.puppet']) {
  const d = await io.read(base + suffix + '.glb');
  for (const e of d.getRoot().listExtensionsUsed()) if (e.extensionName === 'EXT_meshopt_compression') e.dispose();
  fs.mkdirSync('local/triassic-authoring/henodus', { recursive: true });
  fs.writeFileSync('local/triassic-authoring/henodus/henodus' + suffix + '.unpacked.glb', await io.writeBinary(d));
}
const report = { models: [] };
for (const suffix of ['', '.puppet', '.lod1']) {
  const file = base + suffix + '.glb'; let d = await io.read(file);
  if (process.argv.includes('--package')) {
    const before = { a: clips(d), m: meshValues(d) };
    d.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
    const bytes = await io.writeBinary(d), after = await io.readBinary(bytes);
    assert.deepEqual(clips(after), before.a, 'packing changed an animation array');
    assert.deepEqual(meshValues(after), before.m, 'packing changed a mesh attribute');
    fs.writeFileSync(file, bytes); d = after;
  }
  const c = clips(d), sk = skeleton(d), so = sockets(d);
  assert.equal(c.length, CLIPS.length, `${suffix || 'authored'}: clip count`);
  assert.deepEqual(c.map((a) => a.name).sort(), [...CLIPS].sort(), 'clip names');
  assert.equal(sk[0].joints.length, JOINTS); assert.equal(so.length, SOCKETS);
  // The fused shell is a rigid part: its bone exists, is skinned, and is never animated.
  assert(sk[0].joints.some(j => j.name === 'carapace'), 'the carapace bone is in the skin');
  for (const a of c) for (const ch of a.channels) assert.notEqual(ch.node, 'carapace', a.name + ' animates the rigid carapace');
  if (!suffix) { report.rig = sk; report.sockets = so; report.clipSignatures = c.map(a => ({ name: a.name, sha256: hash(JSON.stringify(a)) })); }
  else {
    assert.deepEqual(sk, report.rig, 'rig parity'); assert.deepEqual(so, report.sockets, 'anchor parity');
    assert.deepEqual(c.map(a => ({ name: a.name, sha256: hash(JSON.stringify(a)) })), report.clipSignatures, 'exact clip parity');
  }
  const signatures = new Set();
  for (const a of c) {
    let motion = 0;
    assert(!signatures.has(hash(JSON.stringify(a.channels))), a.name + ' duplicates another clip');
    signatures.add(hash(JSON.stringify(a.channels)));
    for (const ch of a.channels) {
      assert.notEqual(ch.node, 'root'); assert.notEqual(ch.path, 'scale'); assert(ch.times.at(-1) > 0);
      const size = ch.path === 'rotation' ? 4 : 3;
      for (let i = 0; i < ch.values.length; i++) { assert(Number.isFinite(ch.values[i])); motion = Math.max(motion, Math.abs(ch.values[i] - ch.values[i % size])); }
      if (LOOPS.includes(a.name)) for (let k = 0; k < size; k++) assert(Math.abs(ch.values[k] - ch.values[ch.values.length - size + k]) < 1e-4, a.name + ' loop seam');
    }
    assert(motion > 1e-3, a.name + ' dynamic');
  }
  let tris = 0, verts = 0;
  for (const m of d.getRoot().listMeshes()) for (const p of m.listPrimitives()) {
    tris += (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3; verts += p.getAttribute('POSITION').getCount();
    const w = p.getAttribute('WEIGHTS_0'); assert(w, 'skinned');
    for (let i = 0; i < w.getCount(); i++) assert(Math.abs(w.getElement(i, []).reduce((s, v) => s + v, 0) - 1) < 1e-5, 'normalized weights');
  }
  report.models.push({ suffix, bytes: fs.statSync(file).size, sha256: hash(fs.readFileSync(file)), triangles: tris, vertices: verts });
}
report.lodTriangleFraction = report.models[1].triangles / report.models[0].triangles;
assert(report.lodTriangleFraction <= .40, 'the reduced model must be at most 40% of the triangles');
globalThis.self = globalThis; globalThis.createImageBitmap = async () => ({ width: 2048, height: 2048, close() { } });
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder); report.playback = [];
for (const suffix of ['', '.puppet']) {
  const bytes = fs.readFileSync(base + suffix + '.glb');
  const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const scene = gltf.scene, mixer = new THREE.AnimationMixer(scene), v = new THREE.Vector3(), meshes = [];
  scene.traverse(o => { if (o.isSkinnedMesh) meshes.push(o) });
  const results = [];
  for (const clip of gltf.animations) {
    mixer.stopAllAction(); const action = mixer.clipAction(clip).reset().play(); action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true;
    let maxVertexTravel = 0; const initial = [];
    for (let sample = 0; sample <= 60; sample++) {
      mixer.setTime(clip.duration * sample / 60); scene.updateMatrixWorld(true); for (const m of meshes) m.skeleton.update(); let idx = 0;
      for (const m of meshes) {
        const pos = m.geometry.attributes.position;
        for (let j = 0; j < pos.count; j += Math.max(1, Math.floor(pos.count / 750))) {
          v.fromBufferAttribute(pos, j); m.applyBoneTransform(j, v); v.applyMatrix4(m.matrixWorld);
          assert(v.toArray().every(Number.isFinite));
          if (sample === 0) initial.push(v.clone()); else maxVertexTravel = Math.max(maxVertexTravel, v.distanceTo(initial[idx])); idx++;
        }
      }
    }
    assert(maxVertexTravel > .01, clip.name + ' visibly moving');
    results.push({ clip: clip.name, duration: clip.duration, samples: 61, maxVertexTravel });
  }
  report.playback.push({ suffix, results });
  if (!suffix) {
    const bones = {}; scene.traverse(o => { if (o.isBone) bones[o.name] = o });
    const track = (name, n) => {
      mixer.stopAllAction(); const clip = gltf.animations.find(a => a.name === name); mixer.clipAction(clip).play(); const rows = [];
      for (let i = 0; i <= n; i++) {
        mixer.setTime(clip.duration * i / n); scene.updateMatrixWorld(true); const row = { phase: i / n };
        for (const b of Object.keys(bones)) { bones[b].getWorldPosition(v); row[b] = v.toArray(); }
        rows.push(row);
      }
      return rows;
    };
    const span = (rows, b, axis) => Math.max(...rows.map(r => r[b][axis])) - Math.min(...rows.map(r => r[b][axis]));
    const travel = (rows, b) => {
      let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
      for (const r of rows) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], r[b][k]); hi[k] = Math.max(hi[k], r[b][k]); }
      return Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]);
    };
    const phaseOf = (rows, b, axis, pick) => rows[rows.map(r => r[b][axis]).indexOf(pick(...rows.map(r => r[b][axis])))].phase;
    // glTF axes on this rig: X is the animal's left (lateral), Y up, Z forward.
    report.gait = [];
    for (const name of ['Swim', 'Sprint']) {
      const rows = track(name, 120);
      const tip = travel(rows, 'tail_05'), skull = span(rows, 'skull', 0);
      const paddles = ['fore_paddle_L', 'fore_paddle_R', 'hind_paddle_L', 'hind_paddle_R'].map(b => travel(rows, b));
      const row = paddles.reduce((s, q) => s + q, 0) / 4;
      // The row, not a waggle: every paddle has to travel, and the fore pair has to run half a
      // cycle out of phase with the hind pair so the animal is always pulling on something.
      for (const q of paddles) assert(q > .25, name + ' every limb must row: ' + q.toFixed(3));
      assert(row > tip, name + ' must be limb-driven, not tail-driven: paddles ' + row.toFixed(3) + ' vs tail tip ' + tip.toFixed(3));
      assert(skull < .25, name + ' skull must not slew: ' + skull.toFixed(3));
      const rear = n => phaseOf(rows, n, 2, Math.min);
      const gap = (rear('hind_paddle_L') - rear('fore_paddle_L') + 1) % 1;
      assert(gap > .3 && gap < .7, name + ' the hind pair must row against the fore pair: ' + gap.toFixed(3));
      report.gait.push({ clip: name, paddleTravelMean: row, tailTipTravel: tip, skullLateral: skull, forePaddleTravel: paddles.slice(0, 2), hindPaddleTravel: paddles.slice(2), forehindPhaseGap: gap });
    }
    {
      const rows = track('Crawl', 120);
      const y = rows.map(r => r.body[1]), lo = Math.min(...y), hi = Math.max(...y);
      const floatFraction = y.filter(q => q > lo + (hi - lo) * .5).length / y.length;
      const rear = n => phaseOf(rows, n, 2, Math.min), front = n => phaseOf(rows, n, 2, Math.max);
      const forePush = (rear('fore_paddle_L') + rear('fore_paddle_R')) / 2, hindPush = (rear('hind_paddle_L') + rear('hind_paddle_R')) / 2;
      const foreReach = (front('fore_paddle_L') + front('fore_paddle_R')) / 2, hindReach = (front('hind_paddle_L') + front('hind_paddle_R')) / 2;
      const gap = (hindPush - forePush + 1) % 1;
      assert(hi - lo > .10, 'Crawl must spring off the floor: rise ' + (hi - lo).toFixed(3));
      assert(floatFraction > .55, 'Crawl must float for most of the cycle: ' + floatFraction.toFixed(3));
      assert(Math.abs(rear('fore_paddle_L') - rear('fore_paddle_R')) < .05, 'the fore pair must shove together');
      assert(Math.abs(rear('hind_paddle_L') - rear('hind_paddle_R')) < .05, 'the hind pair must shove together');
      assert(gap > .03 && gap < .35, 'the hind pair must shove after the fore pair: ' + gap.toFixed(3));
      report.crawl = { bodyRise: hi - lo, floatFraction, forePushPhase: forePush, hindPushPhase: hindPush, foreReachPhase: foreReach, hindReachPhase: hindReach };
    }
  }
}
report.exactRigParity = true; report.exactAnimationParity = true; report.exactAnchorParity = true; report.normalizedWeights = true;
report.rigidCarapaceNeverAnimated = true; delete report.rig;
report.posteriorJawAttachment = {};
for (const suffix of ['', '.puppet']) {
  report.posteriorJawAttachment[suffix || 'authored'] = await auditCutAttachment(
    `${base}${suffix}.glb`, .437 * 5);
}
fs.writeFileSync('tools/triassic/creatures/henodus/paired-audit.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({
  models: report.models, lodTriangleFraction: report.lodTriangleFraction, clips: report.clipSignatures.length,
  exactRigParity: true, exactAnimationParity: true, gait: report.gait, crawl: report.crawl,
}, null, 2));
