/**
 * Decode the paired Tanystropheus exports, prove exact rig/socket/clip parity, then sample real
 * Three.js skinning. The assertions that are this animal's own are about the boom:
 *
 *  - the thirteen cervicals really are a chain, with the skull on the last of them;
 *  - the strike **travels** down that chain — every joint peaks after the one behind it and the
 *    skull last of all — while the *base* keeps the largest share of the arc, because this neck
 *    was stiff and is meant to swing as a beam rather than curl like Dinocephalosaurus';
 *  - the strike reaches **down** into the water as well as across;
 *  - the shore chain hands over: the skinned body at the end of Lower is the body at the start of
 *    SnapLeft and SnapRight, and the body at the end of a Snap is the body at the start of Retract,
 *    so the mechanic's telegraph → strike → recovery plays as one performance;
 *  - Crawl walks the animal under a boom that does not bob.
 *
 *   node tools/triassic/creatures/tanystropheus/audit.mjs --package --decode
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const base = 'public/assets/triassic/creatures/tanystropheus';
const LOOPS = ['Idle', 'Swim', 'Sprint', 'Guard', 'Eat', 'Grab', 'Crawl', 'Drag'];
const CLIPS = 28, JOINTS = 38, SOCKETS = 3, CERVICALS = 13;
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
    fs.mkdirSync('local/triassic-authoring/tanystropheus', { recursive: true });
    fs.writeFileSync('local/triassic-authoring/tanystropheus/tanystropheus' + suffix + '.unpacked.glb', await io.writeBinary(d));
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
  assert.equal(c.length, CLIPS);
  assert.equal(sk[0].joints.length, JOINTS);
  assert.equal(so.length, SOCKETS);
  // The cervicals are a chain, not a fan: each hangs off the one behind it and the skull off the last.
  for (let i = 0; i < CERVICALS; i++) {
    const j = sk[0].joints.find((q) => q.name === `neck_${String(i).padStart(2, '0')}`);
    assert(j, `neck_${i} exists`);
    assert.equal(j.parent, i === 0 ? 'chest' : `neck_${String(i - 1).padStart(2, '0')}`, 'cervical chain');
  }
  assert.equal(sk[0].joints.find((q) => q.name === 'skull').parent, `neck_${CERVICALS - 1}`);
  assert.equal(sk[0].joints.find((q) => q.name === 'jaw').parent, 'skull');
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
  // Every model needs a Grab, and it is a held loop of 0.9 to 1.2 s.
  const grab = c.find((a) => a.name === 'Grab');
  const grabDur = Math.max(...grab.channels.map((ch) => ch.times.at(-1)));
  assert(grabDur >= 0.9 && grabDur <= 1.2, 'Grab is a 0.9-1.2 s held loop: ' + grabDur);
  // The three clips the shore mechanic times against are exactly as long as shore.ts holds them.
  const durOf = (n) => Math.max(...c.find((a) => a.name === n).channels.map((ch) => ch.times.at(-1)));
  assert(Math.abs(durOf('Lower') - 1.5) < 1e-3, 'Lower is the 1.5 s telegraph: ' + durOf('Lower'));
  for (const n of ['SnapLeft', 'SnapRight']) assert(Math.abs(durOf(n) - 0.6) < 1e-3, n + ' is the 0.6 s strike');
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
  /** Every skinned vertex of the whole animal at one phase of one clip, as a flat array. */
  const pose = (clip, phase) => {
    mixer.stopAllAction();
    const action = mixer.clipAction(clip).reset().play();
    action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true;
    mixer.setTime(clip.duration * phase);
    scene.updateMatrixWorld(true);
    for (const m of meshes) m.skeleton.update();
    const out = [];
    for (const m of meshes) {
      const pos = m.geometry.attributes.position;
      for (let j = 0; j < pos.count; j += Math.max(1, Math.floor(pos.count / 750))) {
        v.fromBufferAttribute(pos, j); m.applyBoneTransform(j, v); v.applyMatrix4(m.matrixWorld);
        out.push(v.x, v.y, v.z);
      }
    }
    return out;
  };
  for (const clip of gltf.animations) {
    let maxVertexTravel = 0;
    const initial = pose(clip, 0);
    for (let sample = 1; sample <= 60; sample++) {
      const now = pose(clip, sample / 60);
      for (let i = 0; i < now.length; i += 3) {
        assert(Number.isFinite(now[i]) && Number.isFinite(now[i + 1]) && Number.isFinite(now[i + 2]));
        const d2 = (now[i] - initial[i]) ** 2 + (now[i + 1] - initial[i + 1]) ** 2 + (now[i + 2] - initial[i + 2]) ** 2;
        maxVertexTravel = Math.max(maxVertexTravel, Math.sqrt(d2));
      }
    }
    assert(maxVertexTravel > 0.01, clip.name + ' visibly moving');
    results.push({ clip: clip.name, duration: clip.duration, samples: 61, maxVertexTravel });
  }
  report.playback.push({ suffix, results });

  if (!suffix) {
    // ---- the shore chain, measured on the actual skinned body -------------------------------
    const find = (n) => gltf.animations.find((a) => a.name === n);
    const far = (a, b) => {
      let worst = 0;
      for (let i = 0; i < a.length; i += 3) {
        worst = Math.max(worst, Math.hypot(a[i] - b[i], a[i + 1] - b[i + 1], a[i + 2] - b[i + 2]));
      }
      return worst;
    };
    const lowerEnd = pose(find('Lower'), 1), lowerStart = pose(find('Lower'), 0);
    const chain = {
      'Lower->SnapLeft': far(lowerEnd, pose(find('SnapLeft'), 0)),
      'Lower->SnapRight': far(lowerEnd, pose(find('SnapRight'), 0)),
      'SnapLeft->Retract': far(pose(find('SnapLeft'), 1), pose(find('Retract'), 0)),
      'SnapRight->Retract': far(pose(find('SnapRight'), 1), pose(find('Retract'), 0)),
      'Retract->Idle': far(pose(find('Retract'), 1), pose(find('Idle'), 0)),
      telegraphTravel: far(lowerStart, lowerEnd),
    };
    // The chain's own handovers have to be exact. `Retract->Idle` is reported, not asserted: Idle
    // is a loop and its first frame is a phase of a cycle rather than the rest pose, so the
    // renderer's own crossfade is what closes that gap and a number here only says how small it is.
    for (const k of ['Lower->SnapLeft', 'Lower->SnapRight', 'SnapLeft->Retract', 'SnapRight->Retract']) {
      assert(chain[k] < 2e-3, 'the shore chain must hand over without a jump: ' + k + ' ' + chain[k].toFixed(5));
    }
    assert(chain['Retract->Idle'] < 0.2, 'the recovery must end near the watch: ' + chain['Retract->Idle'].toFixed(4));
    assert(chain.telegraphTravel > 0.25, 'the telegraph must visibly lower the head: ' + chain.telegraphTravel.toFixed(3));
    report.shoreChain = chain;

    // ---- the boom ---------------------------------------------------------------------------
    const bones = {};
    scene.traverse((o) => { if (o.isBone) bones[o.name] = o; });
    const track = (name, n) => {
      mixer.stopAllAction();
      const clip = find(name);
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
    const span = (rows, b, axis) => Math.max(...rows.map((r) => r[b][axis])) - Math.min(...rows.map((r) => r[b][axis]));
    // Bone-local axes keep Blender's convention through the exporter (a bone runs along its own +Y
    // and its yaw is its local Z), so the neck's sweep is the quaternion's z component.
    const yawPeak = (clipName, bone) => {
      const clip = find(clipName);
      const t = clip.tracks.find((k) => k.name === bone + '.quaternion');
      let best = -Infinity, at = 0;
      for (let i = 0; i < t.times.length; i++) {
        const z = Math.abs(t.values[i * 4 + 2]);
        if (z > best) { best = z; at = t.times[i] / clip.duration; }
      }
      return { at, amp: best };
    };
    report.boom = [];
    for (const name of ['SnapLeft', 'SnapRight', 'Ability']) {
      const rows = track(name, 120);
      const joints = [...Array(CERVICALS).keys()].map((i) => yawPeak(name, 'neck_' + String(i).padStart(2, '0')));
      const skull = yawPeak(name, 'skull');
      const amps = joints.map((j) => j.amp);
      const inOrder = joints.slice(1).filter((j, i) => j.at >= joints[i].at - 1e-9).length;
      const skullTravel = span(rows, 'skull', 0), chestTravel = span(rows, 'chest', 0);
      const skullDrop = Math.min(...rows.map((r) => r.skull[1])) - rows[0].skull[1];
      const row = {
        clip: name, jointsWorking: amps.filter((a) => a > Math.max(...amps) * 0.02).length,
        cervicals: CERVICALS,
        medianOverMaxJointAmplitude: [...amps].sort((a, b) => a - b)[Math.floor(CERVICALS / 2)] / Math.max(...amps),
        baseShareOfChain: amps[0] / amps.reduce((s, a) => s + a, 0),
        jointsPeakingInOrder: inOrder, peakPhaseShoulder: joints[0].at, peakPhaseSkull: skull.at,
        skullLateralTravel: skullTravel, chestLateralTravel: chestTravel,
        reachRatio: skullTravel / Math.max(chestTravel, 1e-6), skullDrop,
      };
      assert(row.jointsWorking === CERVICALS, name + ': every cervical must work, not one hinge');
      assert(inOrder >= CERVICALS - 2, name + ': the swing must travel down the beam, in order');
      assert(skull.at > joints[0].at + 0.02, name + ': the skull must snap after the shoulder');
      // The boom is stiff: the base drives it. This is the opposite of Dinocephalosaurus and the
      // assertion is written the other way round on purpose.
      assert(row.baseShareOfChain > 0.20, name + ': the base must drive a stiff neck');
      assert(row.medianOverMaxJointAmplitude > 0.05, name + ': no cervical may be dead');
      assert(row.reachRatio > 8, name + ': the head must reach far further than the body moves');
      if (name !== 'Ability') {
        assert(skullDrop < -0.15, name + ': the strike must reach down into the water: ' + skullDrop.toFixed(3));
      }
      report.boom.push(row);
    }
    // Mirror images, not the same clip twice: the two snaps must go opposite ways.
    {
      const l = track('SnapLeft', 60), r = track('SnapRight', 60);
      const side = (rows) => rows.reduce((s, q) => s + q.skull[0], 0) / rows.length - rows[0].skull[0];
      assert(side(l) * side(r) < 0, 'SnapLeft and SnapRight must swing to opposite sides');
      report.snapSides = { left: side(l), right: side(r) };
    }
    // ---- Crawl: the body walks and the boom does not bob -------------------------------------
    {
      const rows = track('Crawl', 120);
      const foot = span(rows, 'fore_foot_L', 2) + span(rows, 'hind_foot_L', 2);
      const skullY = span(rows, 'skull', 1), skullX = span(rows, 'skull', 0);
      assert(foot > 0.25, 'Crawl must actually step: ' + foot.toFixed(3));
      assert(skullY < foot * 0.5, 'the boom must not bob while the animal walks: ' + skullY.toFixed(3));
      report.crawl = { footTravel: foot, skullRise: skullY, skullLateral: skullX };
    }
    // ---- Severed: the collapse runs along the neck -------------------------------------------
    {
      const clip = find('Severed');
      const pitch = (bone) => {
        const t = clip.tracks.find((k) => k.name === bone + '.quaternion');
        let best = -Infinity, at = 0;
        for (let i = 0; i < t.times.length; i++) {
          const x = Math.abs(t.values[i * 4]);
          if (x > best) { best = x; at = t.times[i] / clip.duration; }
        }
        return { at, amp: best };
      };
      const joints = [...Array(CERVICALS).keys()].map((i) => pitch('neck_' + String(i).padStart(2, '0')));
      const rows = track('Severed', 60);
      const drop = rows[0].skull[1] - Math.min(...rows.map((r) => r.skull[1]));
      assert(drop > 0.5, 'Severed must drop the head: ' + drop.toFixed(3));
      assert(joints.at(-1).amp > joints[0].amp, 'the neck must go slack from its far end first');
      report.severed = { headDrop: drop, baseAmp: joints[0].amp, tipAmp: joints.at(-1).amp };
    }
  }
}
report.exactRigParity = true; report.exactAnimationParity = true; report.exactAnchorParity = true;
report.normalizedWeights = true; report.cervicalChain = true;
delete report.rig;
fs.writeFileSync('tools/triassic/creatures/tanystropheus/paired-audit.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({
  models: report.models, lodTriangleFraction: report.lodTriangleFraction,
  clips: report.clipSignatures.length, exactRigParity: true, exactAnimationParity: true,
  shoreChain: report.shoreChain, boom: report.boom, crawl: report.crawl, severed: report.severed,
  snapSides: report.snapSides,
}, null, 2));
