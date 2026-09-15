/**
 * Package the Ceratites family, prove the authored body and its twin are the same rig playing the
 * same samples, then play every clip through Three.js and measure the things *this* animal has to
 * do. None of them is a thing any earlier body in this era was asked for, because none of them had
 * a shell, a funnel or an arm crown.
 *
 * Four questions, and each is a number rather than an impression:
 *
 * 1. **Does the shell breathe?** It must not. The coil is one rigid bone with no channel in any
 *    clip, so every vertex it owns has to move as one rigid body with `body`: the check is that the
 *    pairwise distances between shell vertices are unchanged at every phase of every clip, to
 *    floating point. This is the one thing about this body that is easy to get wrong and impossible
 *    to see afterwards, because a shell that flexes by a per cent reads as a shell.
 * 2. **Does the crown do the work?** `Swim` and `Sprint` are a funnel pump with the arms sweeping
 *    against it, and `Attack` and `Grab` are the crown closing, because that is what this animal
 *    reaches with. Measured as arm-tip travel, and against the head's own travel so "the arms move"
 *    cannot be satisfied by moving the whole animal.
 * 3. **Is the attack anchor on something that swings?** The era's rule says the attack anchor goes
 *    on the bone that delivers the blow and is not the skull for an animal that does not lead with
 *    a bite. Here it is an arm tip, so it has to travel further on the strike clips than the mouth
 *    socket does -- which is the difference between an animal that grabs and one that lunges.
 * 4. **Does the beak work as a jaw?** Shut outside the clips that use it, open on them, and the
 *    mouth socket travelling in the skull's own frame so the gape is the beak's and not the body's.
 *
 *   node tools/triassic/creatures/ceratites/audit.mjs --package --decode
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
import { auditPair, tracker, anchorTravel } from '../_pipeline/paired-audit.mjs';

const id = 'ceratites';
const base = `public/assets/triassic/creatures/${id}`;
const validation = JSON.parse(fs.readFileSync(`tools/triassic/creatures/${id}/validation.json`, 'utf8'));
const { report, CLIPS, authored, write } = await auditPair({
  id,
  base,
  here: `tools/triassic/creatures/${id}`,
  local: `local/triassic-authoring/${id}`,
  joints: validation.bones, sockets: 4,
});
const track = tracker(authored);
const ARMS = validation.arms.map((a) => a.name);
// The **joint** at the start of each arm's last segment, not `:tip`. Every bone in these rigs is
// authored with its tail at head + (0, 0.16, 0), so a bone's own +Y is world +Y and not the
// direction of the arm it belongs to: `:tip` on a radial rig measures a point sticking backwards
// out of the wrist, which is a rotation proxy and not the arm's reach. The distal joint's own
// world position is the reach, and it carries the whole chain's accumulated swing.
const TIPS = ARMS.map((n) => `${n}_04`);
const travelOf = (rows, n) => {
  let max = 0;
  for (const r of rows) {
    const d = Math.hypot(r[n][0] - rows[0][n][0], r[n][1] - rows[0][n][1], r[n][2] - rows[0][n][2]);
    if (d > max) max = d;
  }
  return max;
};

// --- 1. the shell must not breathe -------------------------------------------------------------
// Played on the packaged authored body, not on the builder's own pose: the vertices `shell` owns
// are found from the skin weights, and their mutual distances are compared at every phase against
// the bind pose. A rigid part stays rigid or it does not, and there is no tolerance band worth
// having between those two.
await MeshoptDecoder.ready;
globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 2048, height: 2048, close() {} });
{
  const bytes = fs.readFileSync(`${base}.glb`);
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
    .parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const mixer = new THREE.AnimationMixer(gltf.scene);
  const meshes = [];
  gltf.scene.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
  const mesh = meshes.find((m) => m.skeleton.bones.some((b) => b.name === 'shell')
    && m.geometry.attributes.skinIndex);
  const shellBone = mesh.skeleton.bones.findIndex((b) => b.name === 'shell');
  const ji = mesh.geometry.attributes.skinIndex;
  const jw = mesh.geometry.attributes.skinWeight;
  // Purity has to be *exact*, not nearly exact. A vertex holding 0.9995 of the shell and 0.0005 of
  // the head does move when the head does, by about a ten-thousandth of a body -- which is not the
  // shell flexing, it is the boundary ramp doing its job one vertex further in than it looks. So
  // the rigid-body test runs only on vertices the shell owns outright, and the near-pure set is
  // reported beside it as the measured width of that ramp rather than smuggled into the verdict.
  const shellWeight = (v) => {
    let w = 0;
    for (let k = 0; k < 4; k++) if (ji.getComponent(v, k) === shellBone) w += jw.getComponent(v, k);
    return w;
  };
  const pure = [];
  let nearPure = 0;
  for (let v = 0; v < ji.count; v++) {
    const w = shellWeight(v);
    if (w > 0.999) nearPure++;
    if (w >= 1 - 1e-6 && pure.length < 400) pure.push(v);
  }
  assert(pure.length > 100, `the shell must own a solid block of skin outright (${pure.length})`);
  const p = new THREE.Vector3();
  const snapshot = () => {
    const out = [];
    for (const v of pure) {
      p.fromBufferAttribute(mesh.geometry.attributes.position, v);
      mesh.applyBoneTransform(v, p);
      out.push(p.clone());
    }
    return out;
  };
  const pairs = [];
  for (let i = 0; i < pure.length; i += 7) for (let j = i + 13; j < pure.length; j += 53) pairs.push([i, j]);
  mixer.stopAllAction();
  gltf.scene.updateMatrixWorld(true);
  for (const m of meshes) m.skeleton.update();
  const rest = snapshot();
  const restD = pairs.map(([i, j]) => rest[i].distanceTo(rest[j]));
  let worst = 0;
  let worstClip = null;
  for (const clip of gltf.animations) {
    mixer.stopAllAction();
    mixer.clipAction(clip).reset().play();
    for (let s = 0; s <= 24; s++) {
      mixer.setTime(clip.duration * s / 24);
      gltf.scene.updateMatrixWorld(true);
      for (const m of meshes) m.skeleton.update();
      const now = snapshot();
      pairs.forEach(([i, j], k) => {
        const d = Math.abs(now[i].distanceTo(now[j]) - restD[k]);
        if (d > worst) { worst = d; worstClip = `${clip.name}@${(s / 24).toFixed(2)}`; }
      });
    }
  }
  report.rigidShell = { pureShellVertices: pure.length, nearPureShellVertices: nearPure,
                        pairsChecked: pairs.length,
                        worstPairwiseDistanceChange: worst, worstAt: worstClip,
                        shellHasNoAnimationChannel:
                          gltf.animations.every((a) => a.tracks.every((t) => !t.name.startsWith('shell.'))) };
  assert(report.rigidShell.shellHasNoAnimationChannel, 'the shell must carry no animation channel');
  // 5 engine units of body: 1e-5 is two millionths of it, which is packing noise and nothing else.
  assert(worst < 1e-5, `the shell flexes by ${worst} at ${worstClip}`);
}

// --- 2. the crown, and the funnel ---------------------------------------------------------------
report.crown = [];
for (const clip of CLIPS) {
  const rows = track(clip, [...TIPS, 'funnel:tip', 'head', 'shell'], 60);
  const tips = TIPS.map((n) => travelOf(rows, n));
  report.crown.push({
    clip,
    meanArmTipTravel: tips.reduce((a, b) => a + b, 0) / tips.length,
    minArmTipTravel: Math.min(...tips),
    funnelTravel: travelOf(rows, 'funnel:tip'),
    headTravel: travelOf(rows, 'head'),
    shellTravel: travelOf(rows, 'shell'),
  });
}
const crown = (n) => report.crown.find((c) => c.clip === n);

// --- 3. the anchors -----------------------------------------------------------------------------
report.anchorTravel = anchorTravel(track, CLIPS,
  ['anchor_mouth', 'anchor_mouth_inside', 'anchor_attack_primary', 'anchor_grasp']);
const anchor = (n) => report.anchorTravel.find((r) => r.clip === n);

// --- 4. the beak --------------------------------------------------------------------------------
report.beak = [];
for (const clip of CLIPS) {
  const rows = track(clip, ['anchor_mouth'], 48);
  const angles = rows.map((r) => r.jawAngle);
  report.beak.push({
    clip,
    maxOpenRadians: Math.max(...angles),
    minRadians: Math.min(...angles),
    peakPhase: rows[angles.indexOf(Math.max(...angles))].phase,
    mouthSocketTravelInSkullFrame: Math.max(...rows.map((r) => Math.hypot(
      r.gape[0] - rows[0].gape[0], r.gape[1] - rows[0].gape[1], r.gape[2] - rows[0].gape[2]))),
  });
}
const beak = (n) => report.beak.find((b) => b.clip === n);

write();

const problems = [];
const need = (ok, msg) => { if (!ok) problems.push(msg); };

// The shell is carried, never driven: in a clip that is not moving the whole animal it should be
// the quietest thing on the body, and quieter than the head that sticks out of it.
for (const c of ['Swim', 'Sprint', 'Attack', 'Grab', 'Eat']) {
  need(crown(c).shellTravel <= crown(c).headTravel + 1e-9,
    `${c}: the shell must not move more than the head it houses`);
}
// The crown is the locomotion and the weapon, so it has to be used in both roles. Measured against
// the head's own travel: an arm that only moves because the animal moved has not been animated.
for (const c of ['Swim', 'Sprint']) {
  need(crown(c).minArmTipTravel > 0.12, `${c}: every arm must sweep (${crown(c).minArmTipTravel.toFixed(3)})`);
  need(crown(c).minArmTipTravel > 3 * crown(c).headTravel + 0.02,
    `${c}: the arms must move rather than be carried (arms ${crown(c).minArmTipTravel.toFixed(3)} vs head ${crown(c).headTravel.toFixed(3)})`);
  need(crown(c).funnelTravel > 0.05, `${c}: the funnel must pump (${crown(c).funnelTravel.toFixed(3)})`);
}
for (const c of ['Attack', 'Grab', 'Heavy']) {
  need(crown(c).minArmTipTravel > 0.35, `${c}: the crown must close (${crown(c).minArmTipTravel.toFixed(3)})`);
}
// **The attack anchor is an arm tip and not the beak**, which is the whole of this animal's reach:
// on the strike clips it has to out-travel the mouth socket, or it is on the wrong bone.
for (const c of ['Attack', 'Grab']) {
  need(anchor(c).anchor_attack_primary > 2 * anchor(c).anchor_mouth,
    `${c}: the attack anchor must out-travel the mouth (${anchor(c).anchor_attack_primary.toFixed(3)} vs ${anchor(c).anchor_mouth.toFixed(3)})`);
  need(anchor(c).anchor_grasp > 0.2, `${c}: the grasp anchor must reach (${anchor(c).anchor_grasp.toFixed(3)})`);
}
// The beak is shut in the clips that are not about it, and open in the ones that are.
for (const b of report.beak) need(b.minRadians > -0.02, `${b.clip}: the beak must not close past the bind pose`);
for (const c of ['Swim', 'Sprint', 'TurnLeft', 'TurnRight', 'Dive', 'Rise']) {
  need(beak(c).maxOpenRadians < 0.05, `${c}: the beak must stay shut (${beak(c).maxOpenRadians.toFixed(3)})`);
}
need(beak('Bite').maxOpenRadians > 0.45, 'Bite must open the beak');
for (const c of ['Attack', 'Eat']) need(beak(c).maxOpenRadians > 0.25, `${c} must open the beak`);
need(beak('Bite').mouthSocketTravelInSkullFrame > 0.02, 'the mouth socket must travel with the beak');
need(beak('Attack').peakPhase > 0.2 && beak('Attack').peakPhase < 0.7,
  `Attack: the gape must peak on the strike (${beak('Attack').peakPhase})`);

assert.equal(problems.join(' | '), '', 'measured performance checks');
console.log(JSON.stringify({
  models: report.models, clips: report.clips, joints: report.joints,
  twinTriangleFraction: report.twinTriangleFraction,
  rigidShell: report.rigidShell,
  crown: report.crown.filter((c) => ['Idle', 'Swim', 'Sprint', 'Attack', 'Grab', 'Heavy', 'Guard'].includes(c.clip)),
  anchorTravel: report.anchorTravel.filter((r) => ['Swim', 'Attack', 'Grab', 'Bite', 'Eat'].includes(r.clip)),
  beak: report.beak.filter((b) => ['Idle', 'Swim', 'Bite', 'Attack', 'Eat', 'Heavy'].includes(b.clip)),
  exactRigParity: true, exactAnimationParity: true, exactAnchorParity: true,
}, null, 2));
