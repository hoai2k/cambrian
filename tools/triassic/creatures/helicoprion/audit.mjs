/**
 * Package the Helicoprion family, prove the authored body and its twin are the same rig playing
 * the same samples, then play every clip through Three.js and measure the things this animal is
 * supposed to do: a tail beat that grows backwards, caudal lobes that lag the peduncle, and a
 * jaw that actually opens.
 *
 *   node tools/triassic/creatures/helicoprion/audit.mjs --package --decode
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

const base = 'public/assets/triassic/creatures/helicoprion';
const here = 'tools/triassic/creatures/helicoprion';
const local = 'local/triassic-authoring/helicoprion';
const meta = JSON.parse(fs.readFileSync(base + '.json', 'utf8'));
const validation = JSON.parse(fs.readFileSync(here + '/validation.json', 'utf8'));
const CLIPS = meta.clips, LOOPS = meta.looping;
const JOINTS = 23, SOCKETS = 3;

const hash = x => crypto.createHash('sha256').update(x).digest('hex');
const data = a => (a ? Array.from(a.getArray()) : null);
const skeleton = d => d.getRoot().listSkins().map(s => ({
  joints: s.listJoints().map(n => ({ name: n.getName(), parent: n.getParentNode()?.getName(), t: n.getTranslation(), r: n.getRotation(), s: n.getScale() })),
  bind: data(s.getInverseBindMatrices()),
}));
const clips = d => d.getRoot().listAnimations().map(a => ({
  name: a.getName(),
  channels: a.listChannels().map(c => ({
    node: c.getTargetNode().getName(), path: c.getTargetPath(),
    interpolation: c.getSampler().getInterpolation(),
    times: data(c.getSampler().getInput()), values: data(c.getSampler().getOutput()),
  })).sort((x, y) => (x.node + x.path).localeCompare(y.node + y.path)),
})).sort((a, b) => a.name.localeCompare(b.name));
const sockets = d => d.getRoot().listNodes().filter(n => n.getName().startsWith('anchor_'))
  .map(n => ({ name: n.getName(), parent: n.getParentNode().getName(), t: n.getTranslation(), r: n.getRotation(), metadata: n.getExtras() }))
  .sort((a, b) => a.name.localeCompare(b.name));
const meshValues = d => d.getRoot().listMeshes()
  .map(m => m.listPrimitives().map(p => p.listSemantics().sort().map(s => [s, data(p.getAttribute(s))])));

if (process.argv.includes('--decode')) {
  fs.mkdirSync(local, { recursive: true });
  for (const suffix of ['', '.puppet']) {
    const d = await io.read(base + suffix + '.glb');
    for (const e of d.getRoot().listExtensionsUsed()) if (e.extensionName === 'EXT_meshopt_compression') e.dispose();
    fs.writeFileSync(`${local}/helicoprion${suffix}.unpacked.glb`, await io.writeBinary(d));
  }
}

const report = { models: [], clips: CLIPS.length, joints: JOINTS, sockets: SOCKETS };
for (const suffix of ['', '.puppet', '.lod1']) {
  const file = base + suffix + '.glb';
  let d = await io.read(file);
  if (process.argv.includes('--package')) {
    const before = { s: skeleton(d), a: clips(d), n: sockets(d), m: meshValues(d) };
    d.createExtension(EXTMeshoptCompression).setRequired(true)
      .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
    const bytes = await io.writeBinary(d), after = await io.readBinary(bytes);
    // Meshopt packing must not move a single sample or attribute value.
    assert.deepEqual(clips(after), before.a, 'packing changed an animation array');
    assert.deepEqual(meshValues(after), before.m, 'packing changed a mesh attribute');
    fs.writeFileSync(file, bytes);
    d = after;
  }
  const c = clips(d), sk = skeleton(d), so = sockets(d);
  assert.equal(c.length, CLIPS.length, `${suffix || 'authored'}: clip count`);
  assert.deepEqual(c.map(a => a.name).sort(), [...CLIPS].sort(), 'clip names');
  assert.equal(sk[0].joints.length, JOINTS, 'joint count');
  assert.equal(so.length, SOCKETS, 'socket count');
  assert.deepEqual(so.map(s => s.name), [...meta.anchors].sort(), 'anchor names');
  for (const s of so) assert.equal(s.metadata.cambrianAnchor.version, 1, 'anchor metadata');
  if (!suffix) {
    report.rig = sk; report.sockets = so;
    report.clipSignatures = c.map(a => ({ name: a.name, sha256: hash(JSON.stringify(a)) }));
  } else {
    assert.deepEqual(sk, report.rig, 'rig parity');
    assert.deepEqual(so, report.sockets, 'anchor parity');
    assert.deepEqual(c.map(a => ({ name: a.name, sha256: hash(JSON.stringify(a)) })), report.clipSignatures, 'exact clip parity');
  }
  const signatures = new Set();
  for (const a of c) {
    let motion = 0;
    const sig = hash(JSON.stringify(a.channels));
    assert(!signatures.has(sig), `${a.name} duplicates another clip`);
    signatures.add(sig);
    for (const ch of a.channels) {
      assert.notEqual(ch.node, 'root', 'no root motion');
      assert.notEqual(ch.path, 'scale', 'no scale channels');
      assert(ch.times.at(-1) > 0);
      const size = ch.path === 'rotation' ? 4 : 3;
      for (let i = 0; i < ch.values.length; i++) {
        assert(Number.isFinite(ch.values[i]));
        motion = Math.max(motion, Math.abs(ch.values[i] - ch.values[i % size]));
      }
      if (LOOPS.includes(a.name)) {
        for (let k = 0; k < size; k++) {
          assert(Math.abs(ch.values[k] - ch.values[ch.values.length - size + k]) < 1e-4, `${a.name} loop seam on ${ch.node}.${ch.path}`);
        }
      }
    }
    assert(motion > 1e-3, `${a.name} is not a dynamic clip`);
  }
  let tris = 0, verts = 0;
  for (const m of d.getRoot().listMeshes()) for (const p of m.listPrimitives()) {
    tris += (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3;
    verts += p.getAttribute('POSITION').getCount();
    const w = p.getAttribute('WEIGHTS_0');
    assert(w, 'skin weights present');
    for (let i = 0; i < w.getCount(); i++) {
      assert(Math.abs(w.getElement(i, []).reduce((s, v) => s + v, 0) - 1) < 1e-5, 'weights normalised');
    }
  }
  report.models.push({ suffix, bytes: fs.statSync(file).size, sha256: hash(fs.readFileSync(file)), triangles: tris, vertices: verts });
}
// The twin is the reduced model as well as the comparison body, so it has to be one.
report.twinTriangleFraction = report.models[1].triangles / report.models[0].triangles;
assert(report.twinTriangleFraction < 0.40, 'twin must be under 40 % of the authored triangles');
assert.equal(report.models[1].sha256, report.models[2].sha256, 'lod1 must be the twin, byte for byte');

globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 2048, height: 2048, close() {} });
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
report.playback = [];
for (const suffix of ['', '.puppet']) {
  const bytes = fs.readFileSync(base + suffix + '.glb');
  const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const scene = gltf.scene;
  const mixer = new THREE.AnimationMixer(scene), v = new THREE.Vector3();
  const meshes = [];
  scene.traverse(o => { if (o.isSkinnedMesh) meshes.push(o); });
  const results = [];
  for (const clip of gltf.animations) {
    mixer.stopAllAction();
    const action = mixer.clipAction(clip).reset().play();
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    let maxVertexTravel = 0;
    const initial = [];
    for (let sample = 0; sample <= 60; sample++) {
      mixer.setTime(clip.duration * sample / 60);
      scene.updateMatrixWorld(true);
      for (const m of meshes) m.skeleton.update();
      let idx = 0;
      for (const m of meshes) {
        const p = m.geometry.attributes.position;
        for (let j = 0; j < p.count; j += Math.max(1, Math.floor(p.count / 750))) {
          v.fromBufferAttribute(p, j);
          m.applyBoneTransform(j, v);
          v.applyMatrix4(m.matrixWorld);
          assert(v.toArray().every(Number.isFinite), `${clip.name} produced a non-finite vertex`);
          if (sample === 0) initial.push(v.clone());
          else maxVertexTravel = Math.max(maxVertexTravel, v.distanceTo(initial[idx]));
          idx++;
        }
      }
    }
    assert(maxVertexTravel > 0.01, `${clip.name} must visibly move`);
    results.push({ clip: clip.name, duration: clip.duration, samples: 61, maxVertexTravel });
  }
  report.playback.push({ suffix, results });

  if (!suffix) {
    // What this animal's motion has to be, measured off the played rig rather than asserted.
    const bones = {};
    scene.traverse(o => { if (o.isBone) bones[o.name] = o; });
    const sockets = {};
    scene.traverse(o => { if (o.name.startsWith('anchor_')) sockets[o.name] = o; });
    // A bone's own head does not move when the bone itself rotates, so a fin lobe is followed by
    // a point out along it. `tip` asks for the far end of the named bone instead of its root.
    const tip = new Set(['caudal_upper:tip', 'caudal_lower:tip', 'tail_06:tip']);
    const track = (clipName, names, samples = 120) => {
      mixer.stopAllAction();
      const clip = gltf.animations.find(a => a.name === clipName);
      mixer.clipAction(clip).play();
      const rows = [];
      const inv = new THREE.Matrix4();
      for (let s = 0; s <= samples; s++) {
        mixer.setTime(clip.duration * s / samples);
        scene.updateMatrixWorld(true);
        const row = { phase: s / samples };
        for (const n of names) {
          if (tip.has(n)) {
            v.set(0, 0.8, 0).applyMatrix4(bones[n.split(':')[0]].matrixWorld);
          } else {
            (bones[n] ?? sockets[n]).getWorldPosition(v);
          }
          row[n] = v.toArray();
        }
        // The gape, measured where only the jaw can change it: the mouth socket in the skull's
        // own frame. Anything the body does to pitch or roll the animal cancels out here.
        inv.copy(bones.skull.matrixWorld).invert();
        sockets.anchor_mouth.getWorldPosition(v).applyMatrix4(inv);
        row.gape = v.toArray();
        const q = bones.jaw.quaternion;
        row.jawAngle = 2 * Math.atan2(q.x, q.w);
        rows.push(row);
      }
      return rows;
    };
    const lateral = (rows, n) => Math.max(...rows.map(r => r[n][0])) - Math.min(...rows.map(r => r[n][0]));
    /**
     * The phase of a point's lateral swing, taken from the strongest Fourier component of the
     * series rather than from where its largest sample happens to fall. A locomotion clip here
     * holds two whole tail beats, so the argmax of a swing is a coin toss between them and
     * reports a full beat of lag as half a clip.
     */
    const swingPhase = (rows, n) => {
      const series = rows.slice(0, -1).map(r => r[n][0]);
      const N = series.length;
      const mean = series.reduce((a, b) => a + b, 0) / N;
      let best = { k: 0, mag: -1, phase: 0 };
      for (let k = 1; k <= 6; k++) {
        let re = 0, im = 0;
        for (let i = 0; i < N; i++) {
          const a = -2 * Math.PI * k * i / N;
          re += (series[i] - mean) * Math.cos(a);
          im += (series[i] - mean) * Math.sin(a);
        }
        const mag = Math.hypot(re, im);
        if (mag > best.mag) best = { k, mag, phase: Math.atan2(im, re) };
      }
      return best;
    };
    /** How far behind `b` the point `a` swings, in fractions of one beat, signed. */
    const beatLag = (rows, a, b) => {
      const pa = swingPhase(rows, a), pb = swingPhase(rows, b);
      if (pa.k !== pb.k) return { lag: NaN, harmonics: [pa.k, pb.k] };
      let lag = (pb.phase - pa.phase) / (2 * Math.PI);
      while (lag <= -0.5) lag += 1;
      while (lag > 0.5) lag -= 1;
      return { lag, beats: pa.k };
    };
    report.gait = [];
    for (const clipName of ['Swim', 'Sprint']) {
      const names = ['skull', 'chest', 'body', 'tail_00', 'tail_03', 'tail_06', 'caudal_upper'];
      const rows = track(clipName, [...names, 'caudal_upper:tip', 'tail_06:tip']);
      const travel = Object.fromEntries([...names, 'caudal_upper:tip', 'tail_06:tip'].map(n => [n, lateral(rows, n)]));
      report.gait.push({
        clip: clipName, travel,
        ...beatLag(rows, 'caudal_upper:tip', 'tail_06:tip'),
      });
    }
    // The whorl is the animal. The jaw must open, and it must only ever open: the tooth spiral
    // sits against the palate in the bind pose, so a clip that closed past it would drive the
    // whorl up through the roof of the mouth.
    report.jaw = [];
    for (const clipName of CLIPS) {
      const rows = track(clipName, ['anchor_mouth'], 48);
      const angles = rows.map(r => r.jawAngle);
      const gapeTravel = Math.max(...rows.map(r => Math.hypot(r.gape[0] - rows[0].gape[0], r.gape[1] - rows[0].gape[1], r.gape[2] - rows[0].gape[2])));
      report.jaw.push({
        clip: clipName, maxOpenRadians: Math.max(...angles), minRadians: Math.min(...angles),
        peakPhase: rows[angles.indexOf(Math.max(...angles))].phase,
        mouthSocketTravelInSkullFrame: gapeTravel,
      });
    }
  }
}
report.exactRigParity = true;
report.exactAnimationParity = true;
report.exactAnchorParity = true;
report.normalizedWeights = true;
delete report.rig;
fs.writeFileSync(`${here}/paired-audit.json`, JSON.stringify(report, null, 2) + '\n');

// Measurements are written before they are judged, so a failure leaves the numbers behind.
const problems = [];
const need = (ok, msg) => { if (!ok) problems.push(msg); };
for (const g of report.gait) {
  const t = g.travel;
  // Body-caudal undulation: the wave grows backwards, and the braincase is the quiet end.
  need(t.skull < t.tail_00, `${g.clip}: the head must be quieter than the first caudal joint`);
  need(t.tail_00 < t.tail_03 && t.tail_03 < t.tail_06, `${g.clip}: the beat must grow backwards`);
  need(t.tail_06 >= t.caudal_upper * 0.5, `${g.clip}: the caudal fin must be carried by the tail`);
  need(t.tail_06 > t.skull * 6, `${g.clip}: the tail must carry the stroke, not the head`);
  need(t.skull < 0.16, `${g.clip}: the skull must hold the line of travel (${t.skull.toFixed(4)})`);
  // The caudal fin trails the peduncle, which is what makes a lunate tail a fin and not a plate.
  need(g.lag > 0.01 && g.lag < 0.30, `${g.clip}: the caudal lobe must lag the peduncle (${g.lag.toFixed(3)} of a beat)`);
}
// **The bind pose is a gape and not an occlusion**, which is the correction this check carries.
// It used to read "the jaw must never close past the bind pose", which is right for a generation
// that arrived with its mouth shut and wrong for this one: it held the animal's mouth open in every
// clip it has, Idle included. `validation.restingGape.closingRotationRadians` is the measured
// rotation that brings the mandible's dorsal margin onto the palate's ventral one, and the jaw may
// travel anywhere from there up. Nothing may go *past* shut, which would be teeth through a palate.
const shut = -validation.restingGape.closingRotationRadians;
const jaw = (n) => report.jaw.find((j) => j.clip === n);
for (const j of report.jaw) {
  need(j.minRadians > shut - 0.005, `${j.clip}: the jaw must not close past the measured shut pose (${j.minRadians.toFixed(4)} rad against ${shut.toFixed(4)})`);
}
// The clips that are not about swimming shut it. A ram feeder cruising open-mouthed is the animal
// feeding; holding station open-mouthed is the animal forgetting to.
for (const name of ['Idle', 'Guard']) {
  need(jaw(name).maxOpenRadians < shut + 0.05, `${name} must hold the mouth shut (${jaw(name).maxOpenRadians.toFixed(4)})`);
}
// Eat is one bite: open off the shut pose, and shut again through the bind pose to swallow.
need(jaw('Eat').maxOpenRadians > 0.4, 'Eat must open the jaw properly');
need(jaw('Eat').minRadians < shut + 0.005, 'Eat must close the mouth fully to swallow');
need(jaw('Eat').peakPhase > 0.1 && jaw('Eat').peakPhase < 0.45,
  `Eat must open early and shut on the swallow (peak at ${jaw('Eat').peakPhase})`);
need(jaw('Bite').maxOpenRadians > 0.4, 'Bite must open the jaw wide');
need(jaw('Bite').mouthSocketTravelInSkullFrame > 0.15, 'the mouth socket must travel with the jaw');
for (const name of ['Attack', 'Heavy', 'Ability', 'Grab']) {
  need(jaw(name).maxOpenRadians > 0.1, `${name} must open the jaw`);
}
assert.equal(problems.join(' | '), '', 'measured performance checks');
console.log(JSON.stringify({
  models: report.models, clips: report.clips, twinTriangleFraction: report.twinTriangleFraction,
  gait: report.gait, jaw: report.jaw.filter(j => ['Bite', 'Attack', 'Ability', 'Idle'].includes(j.clip)),
  exactRigParity: true, exactAnimationParity: true, playbackSamples: 61,
}, null, 2));
