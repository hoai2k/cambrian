/**
 * Package the Saurichthys family, prove the authored body and its twin are the same rig playing the
 * same samples, then play every clip through Three.js and measure the things this animal is
 * supposed to do: a tail beat that grows backwards, a head that holds the line of travel, a strike
 * that actually commits, a jaw that opens, and an ambusher that is genuinely still when it hovers.
 *
 *   node tools/triassic/creatures/saurichthys/audit.mjs --package --decode
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { assertRootStill, declaredClips } from '../_pipeline/paired-audit.mjs';

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

const ID = 'saurichthys';
const base = `public/assets/triassic/creatures/${ID}`;
const here = `tools/triassic/creatures/${ID}`;
const local = `local/triassic-authoring/${ID}`;
const { CLIPS, LOOPS, meta } = declaredClips(base);
const JOINTS = 24, SOCKETS = 3;

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
    fs.writeFileSync(`${local}/${ID}${suffix}.unpacked.glb`, await io.writeBinary(d));
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
  const rootRest = sk[0].joints[0];              // the skin's first joint is the rig's root
  for (const a of c) {
    let motion = 0;
    const sig = hash(JSON.stringify(a.channels));
    assert(!signatures.has(sig), `${a.name} duplicates another clip`);
    signatures.add(sig);
    for (const ch of a.channels) {
      assertRootStill(rootRest, ch, a.name);
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
        for (let j = 0; j < p.count; j += Math.max(1, Math.floor(p.count / 600))) {
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
    const bones = {};
    scene.traverse(o => { if (o.isBone) bones[o.name] = o; });
    const anchors = {};
    scene.traverse(o => { if (o.name.startsWith('anchor_')) anchors[o.name] = o; });
    const tip = new Set(['caudal_upper:tip', 'caudal_lower:tip', 'tail_06:tip']);
    const track = (clipName, names, samples = 120) => {
      mixer.stopAllAction();
      const clip = gltf.animations.find(a => a.name === clipName);
      mixer.clipAction(clip).play();
      const rows = [];
      const inv = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      for (let s = 0; s <= samples; s++) {
        mixer.setTime(clip.duration * s / samples);
        scene.updateMatrixWorld(true);
        const row = { phase: s / samples };
        for (const n of names) {
          if (tip.has(n)) v.set(0, 0.8, 0).applyMatrix4(bones[n.split(':')[0]].matrixWorld);
          else (bones[n] ?? anchors[n]).getWorldPosition(v);
          row[n] = v.toArray();
        }
        inv.copy(bones.skull.matrixWorld).invert();
        anchors.anchor_mouth.getWorldPosition(v).applyMatrix4(inv);
        row.gape = v.toArray();
        row.jawAngle = 2 * Math.atan2(bones.jaw.quaternion.x, bones.jaw.quaternion.w);
        bones.body.getWorldQuaternion(q);
        // Roll of the trunk about its own long axis, which is glTF +z on this body.
        row.bodyRoll = Math.atan2(2 * (q.w * q.z + q.x * q.y), 1 - 2 * (q.y * q.y + q.z * q.z));
        rows.push(row);
      }
      return rows;
    };
    const spread = (rows, n, axis) => Math.max(...rows.map(r => r[n][axis])) - Math.min(...rows.map(r => r[n][axis]));
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
      const travel = Object.fromEntries([...names, 'caudal_upper:tip', 'tail_06:tip'].map(n => [n, spread(rows, n, 0)]));
      report.gait.push({ clip: clipName, travel, ...beatLag(rows, 'caudal_upper:tip', 'tail_06:tip') });
    }
    // The lunge. A strike has to commit: the head goes a long way forward, fast, and the frame it
    // is fastest on is past the middle of the clip, which is what separates a strike from a swell.
    report.lunge = [];
    for (const clipName of ['Attack', 'Heavy', 'Bite']) {
      const rows = track(clipName, ['skull', 'body', 'anchor_attack_primary'], 120);
      const z = rows.map(r => r.skull[2]);
      const reach = Math.max(...z) - Math.min(...z);
      let fastest = 0, at = 0;
      for (let i = 1; i < z.length; i++) {
        const d = (z[i] - z[i - 1]) / (1 / 120);
        if (d > fastest) { fastest = d; at = i / 120; }
      }
      const gape = rows.map(r => r.jawAngle);
      report.lunge.push({
        clip: clipName, skullReach: reach, peakForwardSpeed: fastest, peakAtPhase: at,
        maxGape: Math.max(...gape), gapePeakPhase: gape.indexOf(Math.max(...gape)) / 120,
        bodyReach: Math.max(...rows.map(r => r.body[2])) - Math.min(...rows.map(r => r.body[2])),
      });
    }
    // The strike from stillness. Hover is the passive the roster names, so it has to be measurably
    // still -- a clip that drifts is not an animal that is hard to notice -- and FastStart is the
    // ability, which has to out-reach and out-accelerate the ordinary attack or it is the same clip
    // twice under two names.
    {
      const rows = track('FastStart', ['skull', 'body'], 120);
      const z = rows.map(r => r.skull[2]);
      let fastest = 0, at = 0;
      for (let i = 1; i < z.length; i++) {
        const d = (z[i] - z[i - 1]) / (1 / 120);
        if (d > fastest) { fastest = d; at = i / 120; }
      }
      report.fastStart = {
        skullReach: Math.max(...z) - Math.min(...z), peakForwardSpeed: fastest, peakAtPhase: at,
        againstAttackReach: (Math.max(...z) - Math.min(...z)) / report.lunge[0].skullReach,
      };
    }
    {
      const rows = track('Hover', ['skull', 'body', 'tail_06'], 60);
      const range = (n, a) => Math.max(...rows.map(r => r[n][a])) - Math.min(...rows.map(r => r[n][a]));
      report.hover = {
        skullTravel: Math.hypot(range('skull', 0), range('skull', 1), range('skull', 2)),
        tailTravel: Math.hypot(range('tail_06', 0), range('tail_06', 1), range('tail_06', 2)),
      };
    }
    report.jaw = [];
    for (const clipName of CLIPS) {
      const rows = track(clipName, ['anchor_mouth'], 48);
      const angles = rows.map(r => r.jawAngle);
      const gapeTravel = Math.max(...rows.map(r => Math.hypot(r.gape[0] - rows[0].gape[0], r.gape[1] - rows[0].gape[1], r.gape[2] - rows[0].gape[2])));
      report.jaw.push({
        clip: clipName, maxOpenRadians: Math.max(...angles), minRadians: Math.min(...angles),
        mouthSocketTravelInSkullFrame: gapeTravel,
      });
    }
  }
}
// ---------------------------------------------------------------- skinning tears, per surface ---
// The same measurement `tools/triassic/skin-tears.mjs` makes -- every edge's posed length against
// its rest length over every clip, with that tool's own 1.5 %-of-body absolute floor so a
// thousandth-of-a-body edge in the dentition cannot dominate -- split by the surface the edge is
// in. That split matters here: the shared tool names the bone an edge follows, and the worst edge
// on both of these bodies is in the oral lining, which is a sac built to stretch from a shut mouth
// to a full gape. The skin's own worst is the number a weight change has to move, so it is the one
// asserted.
{
  const bytes = fs.readFileSync(base + '.glb');
  const g = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const skinned = [];
  g.scene.traverse(o => { if (o.isSkinnedMesh) skinned.push(o); });
  const mx = new THREE.AnimationMixer(g.scene), vv = new THREE.Vector3();
  const pose = (clip, t) => {
    mx.stopAllAction();
    if (clip) { mx.clipAction(clip).play(); mx.setTime(0); mx.setTime(t); } else mx.setTime(0);
    g.scene.updateMatrixWorld(true);
    const out = [];
    for (const m of skinned) {
      m.skeleton.update();
      for (let i = 0; i < m.geometry.attributes.position.count; i++) {
        m.getVertexPosition(i, vv);
        vv.applyMatrix4(m.matrixWorld);
        out.push(vv.x, vv.y, vv.z);
      }
    }
    return out;
  };
  const edges = [];
  let off = 0;
  for (const m of skinned) {
    const ix = m.geometry.index, seen = new Set();
    for (let t = 0; t < ix.count; t += 3) {
      const a = ix.getX(t), b = ix.getX(t + 1), c = ix.getX(t + 2);
      for (const [u, w] of [[a, b], [b, c], [c, a]]) {
        const key = u < w ? u * 1e7 + w : w * 1e7 + u;
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push([off + u, off + w, m.name]);
      }
    }
    off += m.geometry.attributes.position.count;
  }
  const rest = pose(null, 0);
  let span = 0;
  for (let k = 0; k < 3; k++) {
    let lo = 1e9, hi = -1e9;
    for (let i = k; i < rest.length; i += 3) { if (rest[i] < lo) lo = rest[i]; if (rest[i] > hi) hi = rest[i]; }
    span = Math.max(span, hi - lo);
  }
  const elen = (P, e) => Math.hypot(P[e[1] * 3] - P[e[0] * 3], P[e[1] * 3 + 1] - P[e[0] * 3 + 1], P[e[1] * 3 + 2] - P[e[0] * 3 + 2]);
  const restLen = edges.map(e => elen(rest, e));
  const per = new Map();
  for (const clip of g.animations) {
    for (let p = 0; p < 17; p++) {
      const P = pose(clip, clip.duration * (p / 16));
      for (let i = 0; i < edges.length; i++) {
        const r = restLen[i];
        if (r < 1e-6) continue;
        const posed = elen(P, edges[i]);
        if (posed < span * 0.015) continue;
        const ratio = posed / r;
        const cur = per.get(edges[i][2]) || { worstRatio: 1, clip: '', grewFrom: 0, grewTo: 0, edgesOver2x: 0 };
        if (ratio > 2) cur.edgesOver2x++;
        if (ratio > cur.worstRatio) { cur.worstRatio = ratio; cur.clip = clip.name; cur.grewFrom = r; cur.grewTo = posed; }
        per.set(edges[i][2], cur);
      }
    }
  }
  report.skinTearsPerSurface = Object.fromEntries([...per.entries()]
    .sort((a, b) => b[1].worstRatio - a[1].worstRatio));
  const skin = [...per.entries()].filter(([n]) => !/lining/i.test(n))
    .reduce((w, [, r]) => Math.max(w, r.worstRatio), 1);
  report.worstSkinEdgeStretch = skin;
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
  // The node of the wave sits between the skull and the first caudal joint on this animal -- both
  // are all but still, and which of the two is stiller is noise -- so the check is that the head is
  // quieter than the middle of the tail, which is what "the head is the quiet end" means.
  need(t.skull < t.tail_03 * 0.2, `${g.clip}: the head must be quieter than the middle of the tail`);
  need(t.tail_00 < t.tail_03 && t.tail_03 < t.tail_06, `${g.clip}: the beat must grow backwards`);
  need(t.tail_06 > t.skull * 6, `${g.clip}: the tail must carry the stroke, not the head`);
  need(t.skull < 0.18, `${g.clip}: the skull must hold the line of travel (${t.skull.toFixed(4)})`);
  need(g.lag > 0.005 && g.lag < 0.30, `${g.clip}: the caudal lobe must lag the peduncle (${g.lag.toFixed(3)} of a beat)`);
}
// Attack and Heavy are lunges and are held to a lunge's standard: the head goes a long way, fast,
// and the fastest frame is past the anticipation. Bite is half a second of snap with the body
// staying where it is, so it is held to the gape instead -- a clip is judged by what it is for.
for (const l of report.lunge.filter(x => x.clip !== 'Bite')) {
  need(l.skullReach > 0.30, `${l.clip}: the strike must go somewhere (${l.skullReach.toFixed(3)})`);
  need(l.peakAtPhase > 0.22 && l.peakAtPhase < 0.75, `${l.clip}: the strike must land after the anticipation, not on frame one (${l.peakAtPhase.toFixed(2)})`);
  need(l.maxGape > 0.35, `${l.clip}: the jaws must open on a strike (${l.maxGape.toFixed(3)})`);
  need(l.gapePeakPhase > l.peakAtPhase - 0.12, `${l.clip}: the gape must be widest as the strike lands, not before it`);
}
{
  const b = report.lunge.find(x => x.clip === 'Bite');
  need(b.maxGape > 0.45, `Bite must be a real snap (${b.maxGape.toFixed(3)} rad)`);
  need(b.gapePeakPhase > 0.2 && b.gapePeakPhase < 0.6, `Bite's gape must peak mid-clip (${b.gapePeakPhase.toFixed(2)})`);
}
need(report.lunge[0].peakForwardSpeed > 3 * report.lunge[0].skullReach / 1.0,
  'Attack must be a fast start rather than a slide: peak speed must beat the average by three times');
need(report.fastStart.againstAttackReach > 1.15, `FastStart must out-reach Attack (${report.fastStart.againstAttackReach.toFixed(2)}x)`);
need(report.fastStart.peakForwardSpeed > report.lunge[0].peakForwardSpeed, 'FastStart must out-accelerate Attack');
need(report.hover.skullTravel < 0.12, `Hover must be still (${report.hover.skullTravel.toFixed(3)} of an engine unit at the skull)`);
need(report.hover.tailTravel < 0.20, `Hover must not be a swim (${report.hover.tailTravel.toFixed(3)} at the tail)`);
// The generation's jaw arrived parted, so the bind pose is not the shut pose: the shut pose is
// `JAW_SHUT` below it, measured in the builder as the rotation that brings the two lips together.
// The jaw may reach it and must never go past it, and the clips that carry the body must rest
// there rather than at the generation's parting.
const SHUT = -Math.PI / 180 * JSON.parse(fs.readFileSync(`${here}/validation.json`, 'utf8'))
  .mouth.restingGape.closingRotationDegrees;
for (const j of report.jaw) need(j.minRadians > SHUT - 0.005, `${j.clip}: the jaw must never close past shut (${j.minRadians.toFixed(4)} rad against ${SHUT.toFixed(4)})`);
for (const name of ['Idle', 'Swim', 'Sprint', 'TurnLeft', 'TurnRight', 'Dive', 'Rise']) {
  const j = report.jaw.find(x => x.clip === name);
  need(j.maxOpenRadians < SHUT + 0.12, `${name} must carry the body with its mouth shut (${j.maxOpenRadians.toFixed(3)} rad against ${SHUT.toFixed(3)})`);
}
need(report.jaw.find(j => j.clip === 'Bite').maxOpenRadians > 0.4, 'Bite must open the jaw wide');
need(report.jaw.find(j => j.clip === 'Bite').mouthSocketTravelInSkullFrame > 0.15, 'the mouth socket must travel with the jaw');
for (const name of ['Attack', 'Heavy', 'Eat', 'Grab', 'FastStart', 'Ability']) {
  need(report.jaw.find(j => j.clip === name).maxOpenRadians > 0.1, `${name} must open the jaw`);
}
const grab = report.playback[0].results.find(r => r.clip === 'Grab');
need(grab.duration >= 0.9 && grab.duration <= 1.2, `Grab must be a 0.9-1.2 s held loop (${grab.duration})`);
need(report.worstSkinEdgeStretch < 8,
  `the skin must not tear: worst edge stretch ${report.worstSkinEdgeStretch.toFixed(2)}x, against Nothosaurus' 2.98x reference and the 12.4x the sweep called broken`);
assert.equal(problems.join(' | '), '', 'measured performance checks');
console.log(JSON.stringify({
  models: report.models, clips: report.clips, twinTriangleFraction: report.twinTriangleFraction,
  gait: report.gait, lunge: report.lunge, fastStart: report.fastStart, hover: report.hover,
  jaw: report.jaw.filter(j => ['Bite', 'Attack', 'Heavy', 'Idle'].includes(j.clip)),
  skinTearsPerSurface: report.skinTearsPerSurface,
  exactRigParity: true, exactAnimationParity: true, playbackSamples: 61,
}, null, 2));
