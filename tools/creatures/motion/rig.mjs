/**
 * Rig model for clip authoring straight into a creature GLB: joints, rest pose, forward
 * kinematics and a Pose that expresses motion anatomically ("bend this bone toward the
 * midline by 0.4 rad") rather than as raw local Euler angles whose meaning depends on the
 * exporter's bone roll.
 *
 * Coordinates are the exported glTF ones: +Y up, +Z forward, +X the creature's left.
 * A bone's own axis is its local +Y (the Blender convention the sources export with).
 */
import { NodeIO, Animation, AnimationChannel, AnimationSampler, Accessor } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { readFile } from 'node:fs/promises';
import { Quaternion, Vector3, Matrix4 } from 'three';
const vec = (a) => (Array.isArray(a) ? new Vector3(a[0], a[1], a[2]) : new Vector3().copy(a));

export const FPS = 30;

export async function makeIO() {
  await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
  return new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
}

export class Rig {
  /** @param {import('@gltf-transform/core').Document} doc */
  constructor(doc) {
    this.doc = doc;
    const root = doc.getRoot();
    const skin = root.listSkins()[0];
    if (!skin) throw new Error('no skin');
    this.skin = skin;
    /** @type {Map<import('@gltf-transform/core').Node, import('@gltf-transform/core').Node>} */
    this.parentOf = new Map();
    for (const n of root.listNodes()) for (const c of n.listChildren()) this.parentOf.set(c, n);
    this.joints = skin.listJoints();
    this.byName = new Map(this.joints.map((j) => [j.getName(), j]));
    // Sockets are plain child nodes of bones carrying cambrianAnchor extras.
    this.anchors = new Map(root.listNodes().filter((n) => n.getExtras()?.cambrianAnchor).map((n) => [n.getName(), n]));
    this.rest = new Map();
    for (const n of root.listNodes()) this.rest.set(n, { t: new Vector3(...n.getTranslation()), r: new Quaternion(...n.getRotation()), s: new Vector3(...n.getScale()) });
    this.restWorld = new Map();
    const world = (n) => {
      if (this.restWorld.has(n)) return this.restWorld.get(n);
      const p = this.parentOf.get(n), r = this.rest.get(n);
      const m = new Matrix4().compose(r.t, r.r, r.s);
      if (p) m.premultiply(world(p));
      this.restWorld.set(n, m); return m;
    };
    for (const n of root.listNodes()) world(n);
  }
  joint(name) { const j = this.byName.get(name); if (!j) throw new Error(`no joint ${name}`); return j; }
  has(name) { return this.byName.has(name); }
  /** Names matching a regexp, in skin order. */
  names(re) { return this.joints.map((j) => j.getName()).filter((n) => re.test(n)); }
  restWorldRot(node) { return new Quaternion().setFromRotationMatrix(this.restWorld.get(node)); }
  restWorldPos(node) { return new Vector3().setFromMatrixPosition(this.restWorld.get(node)); }
  /**
   * World direction of the bone in the rest pose: toward its child joint of the same family
   * (or its only child), else away from its parent for a leaf. Cambrian rigs export bone local
   * +Y along the bone so both agree; several Devonian rigs give every bone the same local axis,
   * where only the joint positions say which way a limb runs.
   */
  restDir(node) {
    if (!this.dirCache) this.dirCache = new Map();
    if (this.dirCache.has(node)) return this.dirCache.get(node).clone();
    const fam = (n) => n.replace(/[-\d]+(?=(_|$))/g, '#').replace(/[LR](?=\d*$)/, '');
    const kids = node.listChildren().filter((c) => this.byName.get(c.getName()) === c);
    const me = this.restWorldPos(node);
    let target = kids.length === 1 ? kids[0] : kids.find((c) => fam(c.getName()) === fam(node.getName())) ?? kids[0];
    let d;
    if (target) d = this.restWorldPos(target).sub(me);
    else if (this.parentOf.get(node) && this.byName.has(this.parentOf.get(node).getName())) d = me.clone().sub(this.restWorldPos(this.parentOf.get(node)));
    if (!d || d.lengthSq() < 1e-8) d = new Vector3(0, 1, 0).applyQuaternion(this.restWorldRot(node));
    d.normalize(); this.dirCache.set(node, d);
    return d.clone();
  }

  /** World matrices for a pose (anything the pose does not touch stays at rest). */
  worldOf(pose) {
    const out = new Map();
    const world = (n) => {
      if (out.has(n)) return out.get(n);
      const p = this.parentOf.get(n);
      const { t, r, s } = pose.local(this, n);
      const m = new Matrix4().compose(t, r, s);
      if (p) m.premultiply(world(p));
      out.set(n, m); return m;
    };
    for (const n of this.doc.getRoot().listNodes()) world(n);
    return out;
  }
}

/** One frame of motion, accumulated as anatomical operations and resolved to local TRS. */
export class Pose {
  constructor(rig) { this.rig = rig; this.delta = new Map(); this.shiftV = new Map(); }
  /** Local delta quaternion (in the bone's rest frame) for a joint, created on demand. */
  d(name) { const j = this.rig.joint(name); let q = this.delta.get(j); if (!q) { q = new Quaternion(); this.delta.set(j, q); } return q; }
  /** Rotate about a world-space axis (as seen in the rest pose) by `angle`. */
  spin(name, axisWorld, angle) {
    if (!angle) return this;
    const j = this.rig.joint(name);
    const local = vec(axisWorld).normalize().applyQuaternion(this.rig.restWorldRot(j).invert());
    this.d(name).multiply(new Quaternion().setFromAxisAngle(local, angle));
    return this;
  }
  /** Bend the bone so that its tip moves toward `moveDirWorld`. */
  bend(name, moveDirWorld, angle) {
    if (!angle) return this;
    const j = this.rig.joint(name);
    const dir = this.rig.restDir(j);
    const axis = new Vector3().crossVectors(dir, vec(moveDirWorld));
    if (axis.lengthSq() < 1e-8) return this; // move direction is along the bone: nothing to bend toward
    return this.spin(name, axis, angle);
  }
  /** Roll about the bone's own axis. */
  twist(name, angle) {
    if (!angle) return this;
    this.d(name).multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), angle));
    return this;
  }
  /** Translate the joint by a world-space vector (as seen in the rest pose). */
  shift(name, vWorld) {
    const j = this.rig.joint(name);
    const p = this.rig.parentOf.get(j);
    const v = vec(vWorld).applyQuaternion(p ? this.rig.restWorldRot(p).invert() : new Quaternion());
    const cur = this.shiftV.get(j) ?? new Vector3(); cur.add(v); this.shiftV.set(j, cur);
    return this;
  }
  local(rig, node) {
    const r = rig.rest.get(node);
    const q = this.delta.get(node), s = this.shiftV.get(node);
    return { t: s ? r.t.clone().add(s) : r.t, r: q ? r.r.clone().multiply(q) : r.r, s: r.s };
  }
}

/** Sample a clip definition into an Animation on the document, keyed at 30 fps, linear. */
export function sampleClip(rig, def, { authoredOn, pass, basePose } = {}) {
  const frames = Math.round(def.duration * FPS);
  const poses = [];
  // A performance may declare a base pose (a resting shape the bind pose lacks); it underlies
  // every clip unless the clip says `base: false` and handles that shape itself.
  const withBase = basePose && def.base !== false;
  for (let f = 0; f <= frames; f++) {
    const u = f / frames, pose = new Pose(rig);
    if (withBase) basePose(pose);
    def.pose(u, pose, f / FPS);
    poses.push(pose);
  }
  const doc = rig.doc, buffer = doc.getRoot().listBuffers()[0];
  const anim = doc.createAnimation(def.name);
  if (pass) anim.setExtras({ cambrianClip: { version: 1, pass, authoredOn, loop: !!def.loop } });
  const times = new Float32Array(frames + 1); for (let f = 0; f <= frames; f++) times[f] = f / FPS;
  const timeAcc = doc.createAccessor().setType(Accessor.Type.SCALAR).setArray(times).setBuffer(buffer);
  const endTimes = doc.createAccessor().setType(Accessor.Type.SCALAR).setArray(new Float32Array([0, frames / FPS])).setBuffer(buffer);
  const channel = (node, path, acc, input) => {
    const sampler = doc.createAnimationSampler().setInput(input).setOutput(acc).setInterpolation(AnimationSampler.Interpolation.LINEAR);
    const ch = doc.createAnimationChannel().setTargetNode(node).setTargetPath(path).setSampler(sampler);
    anim.addSampler(sampler).addChannel(ch);
  };
  for (const j of rig.joints) {
    const rest = rig.rest.get(j);
    const rot = new Float32Array((frames + 1) * 4);
    let prev = null;
    for (let f = 0; f <= frames; f++) {
      const { r } = poses[f].local(rig, j);
      const q = r.clone();
      if (prev && prev.dot(q) < 0) q.set(-q.x, -q.y, -q.z, -q.w); // keep the short arc for linear slerp
      rot.set([q.x, q.y, q.z, q.w], f * 4); prev = q;
    }
    channel(j, AnimationChannel.TargetPath.ROTATION, doc.createAccessor().setType(Accessor.Type.VEC4).setArray(rot).setBuffer(buffer), timeAcc);
    const moved = poses.some((p) => p.shiftV.has(j));
    if (moved) {
      const tr = new Float32Array((frames + 1) * 3);
      for (let f = 0; f <= frames; f++) { const { t } = poses[f].local(rig, j); tr.set([t.x, t.y, t.z], f * 3); }
      channel(j, AnimationChannel.TargetPath.TRANSLATION, doc.createAccessor().setType(Accessor.Type.VEC3).setArray(tr).setBuffer(buffer), timeAcc);
    } else {
      channel(j, AnimationChannel.TargetPath.TRANSLATION, doc.createAccessor().setType(Accessor.Type.VEC3).setArray(new Float32Array([...rest.t.toArray(), ...rest.t.toArray()])).setBuffer(buffer), endTimes);
    }
    // No scale channel: nothing here animates scale, and a constant one would only restate the
    // bind scale (which the Devonian check refuses unless it is exactly identity).
  }
  // Contract checks: loops close on themselves, one-shots start and end at rest, root never moves.
  const root = rig.joints[0];
  const dist = (a, b) => Math.max(...rig.joints.map((j) => { const x = a.local(rig, j), y = b.local(rig, j); return Math.max(Math.abs(1 - Math.abs(x.r.dot(y.r))) * 4, x.t.distanceTo(y.t)); }));
  const restPose = new Pose(rig); if (basePose) basePose(restPose);   // a base:false clip still starts and ends in the base shape
  const seam = def.loop ? dist(poses[0], poses[frames]) : Math.max(dist(poses[0], restPose), dist(poses[frames], restPose));
  if (seam > 1e-4) throw new Error(`${def.name}: ${def.loop ? 'loop seam' : 'does not start/end at rest'} (${seam.toExponential(2)})`);
  for (const p of poses) if (p.delta.has(root) || p.shiftV.has(root)) throw new Error(`${def.name}: root must not move`);
  return { anim, frames, poses };
}

export async function loadRig(io, file) {
  const doc = await io.readBinary(new Uint8Array(await readFile(file)));
  return new Rig(doc);
}

/**
 * Re-pose an existing animation onto a base pose: every rotation key of a joint the base moves
 * is post-multiplied by the base delta, so the authored motion rides on the new resting shape.
 * The base fades out where the clip's own pose already departs strongly from the bind pose
 * (`fade` = [from, to] in radians over the affected joints), so a reach that was authored from a
 * straight trunk still arrives straight.
 */
export function rebaseAnimation(rig, source, name, basePose, { fade = [.15, .6], pass, authoredOn } = {}) {
  const base = new Pose(rig); basePose(base);
  const doc = rig.doc, buffer = doc.getRoot().listBuffers()[0];
  const anim = doc.createAnimation(name);
  anim.setExtras({ ...source.getExtras(), cambrianClip: { version: 1, pass, authoredOn, rebased: true } });
  const affected = new Set(base.delta.keys());
  // The clip's deviation from bind per key time, over the affected joints.
  const rotChannels = source.listChannels().filter((c) => c.getTargetPath() === 'rotation' && affected.has(c.getTargetNode()));
  const deviation = (t) => {
    let d = 0;
    for (const c of rotChannels) {
      const q = sampleQuat(c.getSampler(), t), r = rig.rest.get(c.getTargetNode()).r;
      d = Math.max(d, 2 * Math.acos(Math.min(1, Math.abs(q.dot(r)))));
    }
    return d;
  };
  const weightAt = (t) => { const d = deviation(t), x = Math.min(1, Math.max(0, (d - fade[0]) / (fade[1] - fade[0]))); return 1 - x * x * (3 - 2 * x); };
  const samplers = new Map();
  for (const ch of source.listChannels()) {
    const node = ch.getTargetNode(), path = ch.getTargetPath(), sm = ch.getSampler();
    let out = sm.getOutput();
    if (path === 'rotation' && affected.has(node)) {
      const times = sm.getInput().getArray(), src = sm.getOutput().getArray(), dst = new Float32Array(src.length);
      const B = base.delta.get(node);
      let prev = null;
      for (let k = 0; k < times.length; k++) {
        const q = new Quaternion(src[k * 4], src[k * 4 + 1], src[k * 4 + 2], src[k * 4 + 3]);
        const w = weightAt(times[k]);
        const b = new Quaternion().slerp(B, w); // identity → B by weight
        q.multiply(b);
        if (prev && prev.dot(q) < 0) q.set(-q.x, -q.y, -q.z, -q.w);
        dst.set([q.x, q.y, q.z, q.w], k * 4); prev = q;
      }
      out = doc.createAccessor().setType(Accessor.Type.VEC4).setArray(dst).setBuffer(buffer);
    }
    const key = sm; let ns = samplers.get(key);
    if (!ns || out !== sm.getOutput()) { ns = doc.createAnimationSampler().setInput(sm.getInput()).setOutput(out).setInterpolation(sm.getInterpolation()); samplers.set(key, ns); anim.addSampler(ns); }
    anim.addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath(path).setSampler(ns));
  }
  return anim;
}
function sampleQuat(sampler, t) {
  const times = sampler.getInput().getArray(), v = sampler.getOutput().getArray();
  const q = (k) => new Quaternion(v[k * 4], v[k * 4 + 1], v[k * 4 + 2], v[k * 4 + 3]);
  if (t <= times[0]) return q(0);
  if (t >= times[times.length - 1]) return q(times.length - 1);
  let k = 0; while (times[k + 1] < t) k++;
  const a = q(k), b = q(k + 1), f = (t - times[k]) / (times[k + 1] - times[k]);
  return sampler.getInterpolation() === 'STEP' ? a : a.slerp(b, f);
}
