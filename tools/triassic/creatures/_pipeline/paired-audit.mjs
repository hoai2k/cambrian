/**
 * The checks every paired Triassic delivery has to pass, in one place.
 *
 * Nothosaurus, Shonisaurus, Placodus, Dinocephalosaurus and Helicoprion each carry their own copy
 * of this, and the copies drifted: one of them plays 61 phases and another 60, one asserts the loop
 * seam on every channel and another only on the first. The four ichthyosauromorphs share it, and
 * each keeps its own `audit.mjs` for the thing only that animal has to prove -- an anguilliform
 * wave, a pouch gulp, a haul-out -- which is where a per-creature check belongs.
 *
 * Nothing here is generic about what an animal *does*. It packages the family, proves the authored
 * body and its twin are the same rig playing the same samples, and hands the caller a live
 * Three.js scene to measure the performance on.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const hash = (x) => crypto.createHash('sha256').update(x).digest('hex');
const data = (a) => (a ? Array.from(a.getArray()) : null);
const skeleton = (d) => d.getRoot().listSkins().map((s) => ({
  joints: s.listJoints().map((n) => ({
    name: n.getName(), parent: n.getParentNode()?.getName(),
    t: n.getTranslation(), r: n.getRotation(), s: n.getScale(),
  })),
  bind: data(s.getInverseBindMatrices()),
}));
const clipsOf = (d) => d.getRoot().listAnimations().map((a) => ({
  name: a.getName(),
  channels: a.listChannels().map((c) => ({
    node: c.getTargetNode().getName(), path: c.getTargetPath(),
    interpolation: c.getSampler().getInterpolation(),
    times: data(c.getSampler().getInput()), values: data(c.getSampler().getOutput()),
  })).sort((x, y) => (x.node + x.path).localeCompare(y.node + y.path)),
})).sort((a, b) => a.name.localeCompare(b.name));
const socketsOf = (d) => d.getRoot().listNodes().filter((n) => n.getName().startsWith('anchor_'))
  .map((n) => ({
    name: n.getName(), parent: n.getParentNode().getName(),
    t: n.getTranslation(), r: n.getRotation(), metadata: n.getExtras(),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));
const meshValues = (d) => d.getRoot().listMeshes()
  .map((m) => m.listPrimitives().map((p) => p.listSemantics().sort().map((s) => [s, data(p.getAttribute(s))])));

/**
 * Package, prove parity, play every clip on both bodies, and return the report plus the loaded
 * authored scene so the caller can measure what this animal in particular is supposed to do.
 */
export async function auditPair({ id, base, here, local, joints, sockets: socketCount,
                                  grabRange = [0.9, 1.2], samples = 61 }) {
  await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
  const meta = JSON.parse(fs.readFileSync(`${base}.json`, 'utf8'));
  const CLIPS = meta.clips; const LOOPS = meta.looping;
  const report = { id, models: [], clips: CLIPS.length, joints, sockets: socketCount };

  if (process.argv.includes('--decode')) {
    fs.mkdirSync(local, { recursive: true });
    for (const suffix of ['', '.puppet']) {
      const d = await io.read(`${base}${suffix}.glb`);
      for (const e of d.getRoot().listExtensionsUsed()) if (e.extensionName === 'EXT_meshopt_compression') e.dispose();
      fs.writeFileSync(`${local}/${id}${suffix}.unpacked.glb`, await io.writeBinary(d));
    }
  }

  for (const suffix of ['', '.puppet', '.lod1']) {
    const file = `${base}${suffix}.glb`;
    let d = await io.read(file);
    if (process.argv.includes('--package')) {
      const before = { a: clipsOf(d), m: meshValues(d) };
      d.createExtension(EXTMeshoptCompression).setRequired(true)
        .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
      const bytes = await io.writeBinary(d); const after = await io.readBinary(bytes);
      // Meshopt packing must not move a single sample or attribute value.
      assert.deepEqual(clipsOf(after), before.a, 'packing changed an animation array');
      assert.deepEqual(meshValues(after), before.m, 'packing changed a mesh attribute');
      fs.writeFileSync(file, bytes);
      d = after;
    }
    const c = clipsOf(d); const sk = skeleton(d); const so = socketsOf(d);
    assert.equal(c.length, CLIPS.length, `${suffix || 'authored'}: clip count`);
    assert.deepEqual(c.map((a) => a.name).sort(), [...CLIPS].sort(), 'clip names');
    assert.equal(sk[0].joints.length, joints, 'joint count');
    assert.equal(so.length, socketCount, 'socket count');
    assert.deepEqual(so.map((s) => s.name), [...meta.anchors].sort(), 'anchor names');
    for (const s of so) assert.equal(s.metadata.cambrianAnchor.version, 1, 'anchor metadata');
    if (!suffix) {
      report.rig = sk; report.socketTable = so;
      report.clipSignatures = c.map((a) => ({ name: a.name, sha256: hash(JSON.stringify(a)) }));
    } else {
      assert.deepEqual(sk, report.rig, 'rig parity');
      assert.deepEqual(so, report.socketTable, 'anchor parity');
      assert.deepEqual(c.map((a) => ({ name: a.name, sha256: hash(JSON.stringify(a)) })),
        report.clipSignatures, 'exact clip parity');
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
            assert(Math.abs(ch.values[k] - ch.values[ch.values.length - size + k]) < 1e-4,
              `${a.name} loop seam on ${ch.node}.${ch.path}`);
          }
        }
      }
      assert(motion > 1e-3, `${a.name} is not a dynamic clip`);
    }
    let tris = 0; let verts = 0;
    for (const m of d.getRoot().listMeshes()) {
      for (const p of m.listPrimitives()) {
        tris += (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3;
        verts += p.getAttribute('POSITION').getCount();
        const w = p.getAttribute('WEIGHTS_0');
        assert(w, 'skin weights present');
        for (let i = 0; i < w.getCount(); i++) {
          assert(Math.abs(w.getElement(i, []).reduce((s, v) => s + v, 0) - 1) < 1e-5, 'weights normalised');
        }
      }
    }
    report.models.push({ suffix, bytes: fs.statSync(file).size, sha256: hash(fs.readFileSync(file)), triangles: tris, vertices: verts });
  }
  report.twinTriangleFraction = report.models[1].triangles / report.models[0].triangles;
  assert(report.twinTriangleFraction < 0.40, 'the twin must be under 40 % of the authored triangles');
  assert.equal(report.models[1].sha256, report.models[2].sha256, 'lod1 must be the twin, byte for byte');

  globalThis.self = globalThis;
  globalThis.createImageBitmap = async () => ({ width: 2048, height: 2048, close() {} });
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  report.playback = [];
  let authored = null;
  for (const suffix of ['', '.puppet']) {
    const bytes = fs.readFileSync(`${base}${suffix}.glb`);
    const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    const scene = gltf.scene;
    const mixer = new THREE.AnimationMixer(scene); const v = new THREE.Vector3();
    const meshes = [];
    scene.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
    const results = [];
    for (const clip of gltf.animations) {
      mixer.stopAllAction();
      const action = mixer.clipAction(clip).reset().play();
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      let maxVertexTravel = 0;
      const initial = [];
      for (let sample = 0; sample < samples; sample++) {
        mixer.setTime(clip.duration * sample / (samples - 1));
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
      results.push({ clip: clip.name, duration: clip.duration, samples, maxVertexTravel });
    }
    report.playback.push({ suffix, results });
    if (!suffix) authored = { gltf, scene, mixer };
  }

  // Every model needs a Grab, and it is a held loop rather than a one-shot.
  const grab = report.playback[0].results.find((r) => r.clip === 'Grab');
  assert(grab, 'every model needs a Grab clip');
  assert(grab.duration >= grabRange[0] - 1e-6 && grab.duration <= grabRange[1] + 1e-6,
    `Grab must be a ${grabRange[0]}-${grabRange[1]} s held loop, not ${grab.duration}`);
  assert(LOOPS.includes('Grab'), 'Grab must loop');

  report.exactRigParity = true;
  report.exactAnimationParity = true;
  report.exactAnchorParity = true;
  report.normalizedWeights = true;
  return { report, meta, CLIPS, LOOPS, authored, write: () => {
    const out = { ...report };
    delete out.rig;
    fs.writeFileSync(`${here}/paired-audit.json`, `${JSON.stringify(out, null, 2)}\n`);
  } };
}

/** A tracker over a played clip: world positions of named bones and sockets, and the jaw angle. */
export function tracker({ gltf, scene, mixer }) {
  const bones = {}; const sockets = {};
  scene.traverse((o) => { if (o.isBone) bones[o.name] = o; });
  scene.traverse((o) => { if (o.name.startsWith('anchor_')) sockets[o.name] = o; });
  const v = new THREE.Vector3(); const inv = new THREE.Matrix4();
  return function track(clipName, names, steps = 120) {
    mixer.stopAllAction();
    const clip = gltf.animations.find((a) => a.name === clipName);
    mixer.clipAction(clip).play();
    const rows = [];
    for (let s = 0; s <= steps; s++) {
      mixer.setTime(clip.duration * s / steps);
      scene.updateMatrixWorld(true);
      const row = { phase: s / steps };
      for (const n of names) {
        // A bone's own head does not move when the bone itself rotates, so a fin lobe is followed
        // by a point out along it. `name:tip` asks for the far end of the named bone.
        //
        // `name:yaw` asks for something else again: the joint's **own** angle rather than where it
        // has ended up. A travelling wave is a property of the joint angles, and measuring it from
        // world positions gets it wrong -- the chain is rooted at mid-body, so the joints in front
        // of the pivot swing in antiphase with the ones behind it and the phases do not order.
        if (n.endsWith(':tip')) {
          v.set(0, 0.8, 0).applyMatrix4(bones[n.split(':')[0]].matrixWorld);
          row[n] = v.toArray();
        } else if (n.endsWith(':yaw')) {
          const q = bones[n.split(':')[0]].quaternion;
          row[n] = [2 * Math.atan2(q.z, q.w), 0, 0];
        } else {
          (bones[n] ?? sockets[n]).getWorldPosition(v);
          row[n] = v.toArray();
        }
      }
      // The gape, measured where only the jaw can change it: the mouth socket in the skull's own
      // frame, so anything the body does to pitch or roll the animal cancels out.
      inv.copy(bones.skull.matrixWorld).invert();
      sockets.anchor_mouth.getWorldPosition(v).applyMatrix4(inv);
      row.gape = v.toArray();
      const q = bones.jaw.quaternion;
      row.jawAngle = 2 * Math.atan2(q.x, q.w);
      rows.push(row);
    }
    return rows;
  };
}

export const lateral = (rows, n) => Math.max(...rows.map((r) => r[n][0])) - Math.min(...rows.map((r) => r[n][0]));

/**
 * How far each socket travels in the world over each clip, and whether it moves at all.
 *
 * `tools/creatures/motion/pose-check.mjs` does this against a `performances/<id>.mjs` module; these
 * bodies author their performance inside `build.py` and have no such module, so the same check is
 * made here, on the **packaged file** rather than on the source of it, which is strictly better
 * evidence. An `anchor_attack_primary` that does not travel on the attack clips is on the wrong
 * bone -- which is the mistake the schema is there to prevent.
 */
export function anchorTravel(track, clips, names = ['anchor_mouth', 'anchor_mouth_inside', 'anchor_attack_primary']) {
  const out = [];
  for (const clip of clips) {
    const rows = track(clip, names, 48);
    const row = { clip };
    for (const n of names) {
      let max = 0;
      for (const r of rows) {
        const d = Math.hypot(r[n][0] - rows[0][n][0], r[n][1] - rows[0][n][1], r[n][2] - rows[0][n][2]);
        if (d > max) max = d;
      }
      row[n] = max;
    }
    out.push(row);
  }
  return out;
}

/**
 * The phase of a point's lateral swing, from the strongest Fourier component of the series rather
 * than from where its largest sample happens to fall: a locomotion clip here holds two whole tail
 * beats, so the argmax of a swing is a coin toss between them.
 */
export function swingPhase(rows, n) {
  const series = rows.slice(0, -1).map((r) => r[n][0]);
  const N = series.length;
  const mean = series.reduce((a, b) => a + b, 0) / N;
  let best = { k: 0, mag: -1, phase: 0 };
  for (let k = 1; k <= 6; k++) {
    let re = 0; let im = 0;
    for (let i = 0; i < N; i++) {
      const a = -2 * Math.PI * k * i / N;
      re += (series[i] - mean) * Math.cos(a);
      im += (series[i] - mean) * Math.sin(a);
    }
    const mag = Math.hypot(re, im);
    if (mag > best.mag) best = { k, mag, phase: Math.atan2(im, re) };
  }
  return best;
}

/** How far behind `b` the point `a` swings, in fractions of one beat, signed. */
export function beatLag(rows, a, b) {
  const pa = swingPhase(rows, a); const pb = swingPhase(rows, b);
  if (pa.k !== pb.k) return { lag: NaN, harmonics: [pa.k, pb.k] };
  let lag = (pb.phase - pa.phase) / (2 * Math.PI);
  while (lag <= -0.5) lag += 1;
  while (lag > 0.5) lag -= 1;
  return { lag, beats: pa.k };
}
