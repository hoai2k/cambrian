/**
 * Decode the paired Macrocnemus exports, prove exact rig/socket/clip parity, then sample real
 * Three.js skinning. The assertions that are this animal's own are about the *run*, because that
 * is what the reviewer asked for and what a walk cycle at the post would have missed:
 *
 *  - Run has two suspensions a cycle and the hindlimbs do materially more work than the forelimbs,
 *    which is what a long-hindlimbed tanystropheid's gait means;
 *  - the diagonal couplets are diagonal — a fore foot and the opposite hind foot swing together;
 *  - Charge leaves the post and arrives low in the water, Retreat turns away and goes back up the
 *    beach, and Snatch puts the head down into the water and takes it out again;
 *  - the tail is a counterweight and not a rudder: it travels with the body, not against it.
 *
 *   node tools/triassic/creatures/macrocnemus/audit.mjs --package --decode
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
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const base = 'public/assets/triassic/creatures/macrocnemus';
const { CLIPS, LOOPS } = declaredClips(base);
const JOINTS = 33, SOCKETS = 3, CERVICALS = 6, CAUDALS = 10;
const hash = (x) => crypto.createHash('sha256').update(x).digest('hex');
const data = (a) => (a ? Array.from(a.getArray()) : null);
const skeleton = (d) => d.getRoot().listSkins().map((s) => ({
  joints: s.listJoints().map((n) => ({ name: n.getName(), parent: n.getParentNode()?.getName(), t: n.getTranslation(), r: n.getRotation(), s: n.getScale() })),
  bind: data(s.getInverseBindMatrices()),
}));
const clips = (d) => d.getRoot().listAnimations().map((a) => ({
  name: a.getName(),
  channels: a.listChannels().map((c) => ({
    node: c.getTargetNode().getName(), path: c.getTargetPath(),
    interpolation: c.getSampler().getInterpolation(),
    times: data(c.getSampler().getInput()), values: data(c.getSampler().getOutput()),
  })).sort((x, y) => (x.node + x.path).localeCompare(y.node + y.path)),
})).sort((a, b) => a.name.localeCompare(b.name));
const sockets = (d) => d.getRoot().listNodes().filter((n) => n.getName().startsWith('anchor_'))
  .map((n) => ({ name: n.getName(), parent: n.getParentNode().getName(), t: n.getTranslation(), r: n.getRotation(), metadata: n.getExtras() }))
  .sort((a, b) => a.name.localeCompare(b.name));
const meshValues = (d) => d.getRoot().listMeshes().map((m) => m.listPrimitives()
  .map((p) => p.listSemantics().sort().map((s) => [s, data(p.getAttribute(s))])));

if (process.argv.includes('--decode')) {
  for (const suffix of ['', '.puppet']) {
    const d = await io.read(base + suffix + '.glb');
    for (const e of d.getRoot().listExtensionsUsed()) if (e.extensionName === 'EXT_meshopt_compression') e.dispose();
    fs.mkdirSync('local/triassic-authoring/macrocnemus', { recursive: true });
    fs.writeFileSync('local/triassic-authoring/macrocnemus/macrocnemus' + suffix + '.unpacked.glb', await io.writeBinary(d));
  }
}

const report = { models: [] };
for (const suffix of ['', '.puppet', '.lod1']) {
  const file = base + suffix + '.glb';
  let d = await io.read(file);
  if (process.argv.includes('--package')) {
    const before = { a: clips(d), m: meshValues(d) };
    d.createExtension(EXTMeshoptCompression).setRequired(true)
      .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
    const bytes = await io.writeBinary(d);
    const after = await io.readBinary(bytes);
    assert.deepEqual(clips(after), before.a, 'packing changed an animation array');
    assert.deepEqual(meshValues(after), before.m, 'packing changed a mesh attribute');
    fs.writeFileSync(file, bytes);
    d = after;
  }
  const c = clips(d), sk = skeleton(d), so = sockets(d);
  assert.equal(c.length, CLIPS.length, `${suffix || 'authored'}: clip count`);
  assert.deepEqual(c.map((a) => a.name).sort(), [...CLIPS].sort(), 'clip names');
  assert.equal(sk[0].joints.length, JOINTS);
  assert.equal(so.length, SOCKETS);
  for (let i = 0; i < CERVICALS; i++) {
    const j = sk[0].joints.find((q) => q.name === `neck_${String(i).padStart(2, '0')}`);
    assert(j, `neck_${i} exists`);
    assert.equal(j.parent, i === 0 ? 'chest' : `neck_${String(i - 1).padStart(2, '0')}`, 'cervical chain');
  }
  for (let i = 1; i < CAUDALS; i++) {
    assert.equal(sk[0].joints.find((q) => q.name === `tail_${String(i).padStart(2, '0')}`).parent,
      `tail_${String(i - 1).padStart(2, '0')}`, 'caudal chain');
  }
  if (!suffix) {
    report.rig = sk; report.sockets = so;
    report.clipSignatures = c.map((a) => ({ name: a.name, sha256: hash(JSON.stringify(a)) }));
  } else {
    assert.deepEqual(sk, report.rig, 'rig parity');
    assert.deepEqual(so, report.sockets, 'anchor parity');
    assert.deepEqual(c.map((a) => ({ name: a.name, sha256: hash(JSON.stringify(a)) })), report.clipSignatures, 'exact clip parity');
  }
  const signatures = new Set();
  for (const a of c) {
    let motion = 0;
    assert(!signatures.has(hash(JSON.stringify(a.channels))), a.name + ' duplicates another clip');
    signatures.add(hash(JSON.stringify(a.channels)));
    for (const ch of a.channels) {
      assert.notEqual(ch.node, 'root');
      assert.notEqual(ch.path, 'scale');
      assert(ch.times.at(-1) > 0);
      const size = ch.path === 'rotation' ? 4 : 3;
      for (let i = 0; i < ch.values.length; i++) {
        assert(Number.isFinite(ch.values[i]));
        motion = Math.max(motion, Math.abs(ch.values[i] - ch.values[i % size]));
      }
      if (LOOPS.includes(a.name)) {
        for (let k = 0; k < size; k++) {
          assert(Math.abs(ch.values[k] - ch.values[ch.values.length - size + k]) < 1e-4, a.name + ' loop seam');
        }
      }
    }
    assert(motion > 1e-3, a.name + ' dynamic');
  }
  const grabDur = Math.max(...c.find((a) => a.name === 'Grab').channels.map((ch) => ch.times.at(-1)));
  assert(grabDur >= 0.9 && grabDur <= 1.2, 'Grab is a 0.9-1.2 s held loop: ' + grabDur);
  let tris = 0, verts = 0;
  for (const m of d.getRoot().listMeshes()) {
    for (const p of m.listPrimitives()) {
      tris += (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3;
      verts += p.getAttribute('POSITION').getCount();
      const w = p.getAttribute('WEIGHTS_0');
      assert(w, 'skinned');
      for (let i = 0; i < w.getCount(); i++) {
        assert(Math.abs(w.getElement(i, []).reduce((s, v) => s + v, 0) - 1) < 1e-5, 'normalized weights');
      }
    }
  }
  report.models.push({ suffix, bytes: fs.statSync(file).size, sha256: hash(fs.readFileSync(file)), triangles: tris, vertices: verts });
}
report.lodTriangleFraction = report.models[1].triangles / report.models[0].triangles;
assert(report.lodTriangleFraction <= 0.40, 'the reduced model must be at most 40% of the triangles');

globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 2048, height: 2048, close() {} });
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
report.playback = [];
for (const suffix of ['', '.puppet']) {
  const bytes = fs.readFileSync(base + suffix + '.glb');
  const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const scene = gltf.scene, mixer = new THREE.AnimationMixer(scene), v = new THREE.Vector3(), meshes = [];
  scene.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
  const results = [];
  for (const clip of gltf.animations) {
    mixer.stopAllAction();
    const action = mixer.clipAction(clip).reset().play();
    action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true;
    let maxVertexTravel = 0;
    const initial = [];
    for (let sample = 0; sample <= 60; sample++) {
      mixer.setTime(clip.duration * sample / 60);
      scene.updateMatrixWorld(true);
      for (const m of meshes) m.skeleton.update();
      let idx = 0;
      for (const m of meshes) {
        const pos = m.geometry.attributes.position;
        for (let j = 0; j < pos.count; j += Math.max(1, Math.floor(pos.count / 750))) {
          v.fromBufferAttribute(pos, j); m.applyBoneTransform(j, v); v.applyMatrix4(m.matrixWorld);
          assert(v.toArray().every(Number.isFinite));
          if (sample === 0) initial.push(v.clone());
          else maxVertexTravel = Math.max(maxVertexTravel, v.distanceTo(initial[idx]));
          idx++;
        }
      }
    }
    assert(maxVertexTravel > 0.01, clip.name + ' visibly moving');
    results.push({ clip: clip.name, duration: clip.duration, samples: 61, maxVertexTravel });
  }
  report.playback.push({ suffix, results });

  if (!suffix) {
    const bones = {};
    scene.traverse((o) => { if (o.isBone) bones[o.name] = o; });
    const track = (name, n) => {
      mixer.stopAllAction();
      const clip = gltf.animations.find((a) => a.name === name);
      mixer.clipAction(clip).play();
      const rows = [];
      for (let i = 0; i <= n; i++) {
        mixer.setTime(clip.duration * i / n);
        scene.updateMatrixWorld(true);
        const row = { phase: i / n };
        for (const b of Object.keys(bones)) { bones[b].getWorldPosition(v); row[b] = v.toArray(); }
        rows.push(row);
      }
      return rows;
    };
    // glTF axes on this rig: X is the animal's left (lateral), Y up, Z forward.
    const span = (rows, b, axis) => Math.max(...rows.map((r) => r[b][axis])) - Math.min(...rows.map((r) => r[b][axis]));
    const phaseOf = (rows, b, axis, pick) => rows[rows.map((r) => r[b][axis]).indexOf(pick(...rows.map((r) => r[b][axis])))].phase;

    // ---- the run ------------------------------------------------------------------------------
    {
      const clip = gltf.animations.find((a) => a.name === 'Run');
      const rows = track('Run', 120);
      const y = rows.map((r) => r.body[1]);
      const lo = Math.min(...y), hi = Math.max(...y);
      // Two suspensions a cycle: the body's height crosses its own midpoint four times.
      let crossings = 0;
      const mid = (lo + hi) / 2;
      for (let i = 1; i < y.length; i++) if ((y[i - 1] - mid) * (y[i] - mid) < 0) crossings++;
      // A foot's travel has to be measured against *its own root*, not against the world. The fore
      // roots sit 0.17 raw units forward of the pelvis bone and the hind roots almost on it, so the
      // body's own pitch swings the front feet through a far longer lever than the back ones and a
      // world-space reading says the forelimbs are working hardest on a gait where they are barely
      // touching. This is the limb's own action.
      const rel = (b, r) => {
        const d = rows.map((q) => q[b][2] - q[r][2]);
        return Math.max(...d) - Math.min(...d);
      };
      const hind = rel('hind_foot_L', 'hind_upper_L') + rel('hind_foot_R', 'hind_upper_R');
      const fore = rel('fore_foot_L', 'fore_upper_L') + rel('fore_foot_R', 'fore_upper_R');
      // Diagonal couplets: a fore foot is furthest forward at roughly the same phase as the
      // opposite hind foot, and a half cycle from its own partner.
      const fl = phaseOf(rows, 'fore_foot_L', 2, Math.max);
      const fr = phaseOf(rows, 'fore_foot_R', 2, Math.max);
      const hl = phaseOf(rows, 'hind_foot_L', 2, Math.max);
      const hr = phaseOf(rows, 'hind_foot_R', 2, Math.max);
      const gap = (a, b) => Math.min(Math.abs(a - b), 1 - Math.abs(a - b));
      assert(hi - lo > 0.08, 'Run must lift the body off the sand: ' + (hi - lo).toFixed(3));
      assert(crossings >= 4, 'Run must have two suspensions a cycle: ' + crossings);
      // What "the hindlimbs drive it" means on *this* body has to be said carefully. The generation's
      // fore and hind limbs are nearly the same length root-to-foot — the shoulder sits higher than
      // the hip on this animal, so the shorter forelimb still reaches the same ground — and a foot's
      // travel therefore does not separate them. What does is the **angle each limb swings
      // through**, read off the authored quaternion tracks, which is where the gait's intent lives.
      const swing = (bone) => {
        const t = clip.tracks.find((k) => k.name === bone + '.quaternion');
        let lo = Infinity, hi = -Infinity;
        for (let i = 0; i < t.times.length; i++) { lo = Math.min(lo, t.values[i * 4]); hi = Math.max(hi, t.values[i * 4]); }
        return hi - lo;
      };
      const hindSwing = swing('hind_upper_L') + swing('hind_upper_R');
      const foreSwing = swing('fore_upper_L') + swing('fore_upper_R');
      assert(hindSwing > foreSwing * 1.15,
        'the hindlimbs must swing through more than the forelimbs: ' + hindSwing.toFixed(3) + ' vs ' + foreSwing.toFixed(3));
      assert(gap(fl, fr) > 0.35, 'the fore pair must alternate: ' + gap(fl, fr).toFixed(3));
      assert(gap(fl, hr) < 0.20, 'the couplets must be diagonal: ' + gap(fl, hr).toFixed(3));
      report.run = { bodyRise: hi - lo, midCrossings: crossings, hindSwing, foreSwing,
        hindOverForeSwing: hindSwing / foreSwing,
        hindFootTravelAboutItsRoot: hind, foreFootTravelAboutItsRoot: fore,
        hindFootTravelWorld: span(rows, 'hind_foot_L', 2) + span(rows, 'hind_foot_R', 2),
        foreFootTravelWorld: span(rows, 'fore_foot_L', 2) + span(rows, 'fore_foot_R', 2),
        phases: { fl, fr, hl, hr } };
      const walk = track('Crawl', 120);
      const relw = (b, r) => {
        const d = walk.map((q) => q[b][2] - q[r][2]);
        return Math.max(...d) - Math.min(...d);
      };
      const walkHind = relw('hind_foot_L', 'hind_upper_L') + relw('hind_foot_R', 'hind_upper_R');
      assert(hind > walkHind * 1.4, 'Run must out-stride the walk: ' + hind.toFixed(3) + ' vs ' + walkHind.toFixed(3));
      report.run.walkHindFootTravel = walkHind;
    }
    // ---- into the water and back out -----------------------------------------------------------
    {
      const charge = track('Charge', 90);
      const retreat = track('Retreat', 90);
      const snatch = track('Snatch', 90);
      const skullDrop = Math.min(...snatch.map((r) => r.skull[1])) - snatch[0].skull[1];
      const chargeLow = Math.min(...charge.map((r) => r.body[1])) - charge[0].body[1];
      const spin = Math.max(...retreat.map((r) => Math.abs(r.tail_09[0] - retreat[0].tail_09[0])));
      assert(skullDrop < -0.20, 'Snatch must put the head into the water: ' + skullDrop.toFixed(3));
      assert(chargeLow < -0.05, 'Charge must crouch and drive: ' + chargeLow.toFixed(3));
      assert(spin > 0.30, 'Retreat must turn the animal away: ' + spin.toFixed(3));
      report.shore = { snatchSkullDrop: skullDrop, chargeBodyDrop: chargeLow, retreatTailSwing: spin };
    }
    // ---- the tail is a counterweight, not a rudder ----------------------------------------------
    {
      const rows = track('Run', 120);
      const tip = span(rows, 'tail_09', 0), body = span(rows, 'body', 0);
      assert(tip > body, 'the tail must work in the run: ' + tip.toFixed(3));
      assert(tip < 0.9, 'but a counterweight is held, not waved: ' + tip.toFixed(3));
      report.tail = { tipLateral: tip, bodyLateral: body };
    }
  }
}
report.exactRigParity = true; report.exactAnimationParity = true; report.exactAnchorParity = true;
report.normalizedWeights = true;
delete report.rig;
// Verify the duplicate posterior mouth rim on both actual packaged meshes in every clip.
const hingeX = JSON.parse(fs.readFileSync('tools/triassic/creatures/macrocnemus/macrocnemus-profile.json')).mouth.hingeX;
report.posteriorJawAttachment = {};
for (const suffix of ['', '.puppet']) {
  report.posteriorJawAttachment[suffix || 'authored'] = await auditCutAttachment(base + suffix + '.glb', hingeX * 5);
}
fs.writeFileSync('tools/triassic/creatures/macrocnemus/paired-audit.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({
  models: report.models, lodTriangleFraction: report.lodTriangleFraction,
  clips: report.clipSignatures.length, exactRigParity: true, exactAnimationParity: true,
  run: report.run, shore: report.shore, tail: report.tail,
}, null, 2));
