/**
 * Package the Phragmoteuthis family, prove the authored body and its twin are the same rig playing
 * the same samples, then play every clip through Three.js and measure what *this* animal has to do.
 *
 * 1. **Does the mantle stay stiff?** A phragmoteuthid has a rigid internal shell up its back, so
 *    the mantle is one bone with no bend. The vertices that bone owns outright must keep their
 *    mutual distances exactly, at every phase of every clip — the same test Ceratites' shell gets,
 *    for the same reason and with the same absence of a tolerance band worth having.
 * 2. **Does it squeeze?** The jet is a radial contraction and the contract forbids scale channels,
 *    so it is two flank bones with translation channels. That is easy to write and easy to get
 *    wrong, so the check is not "were the bones keyed" but the *measured width of the animal*: the
 *    lateral span of the mid-mantle, played out, has to shrink on `Sprint` and on `Ability` and not
 *    on the clips that are not about it.
 * 3. **Do the fins carry a travelling wave?** They are the locomotion — this body does not jet in
 *    the simulation (`swimStyle: 'omnidirectional'` and no `shell: true`), so its cruise is the fin
 *    undulation. A wave means each band peaks later than the one in front of it, and a turn means
 *    the two fins run their waves in *opposite* directions, which is measured as a half-beat phase
 *    difference between the sides rather than as one fin being louder.
 * 4. **Is the weapon used?** `heavy: 'Hook latch'` is the tentacle pair, so on the strike clips the
 *    two tentacles must out-travel the eight arms and the attack anchor must out-travel the mouth.
 *
 *   node tools/triassic/creatures/phragmoteuthis/audit.mjs --package --decode
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
import { auditPair, tracker, anchorTravel, swingPhase, beatLag } from '../_pipeline/paired-audit.mjs';

const id = 'phragmoteuthis';
const base = `public/assets/triassic/creatures/${id}`;
const validation = JSON.parse(fs.readFileSync(`tools/triassic/creatures/${id}/validation.json`, 'utf8'));
const { report, CLIPS, authored, write } = await auditPair({
  id,
  base,
  here: `tools/triassic/creatures/${id}`,
  local: `local/triassic-authoring/${id}`,
  joints: validation.bones, sockets: 4, grabRange: [1.0, 1.2],
});
const track = tracker(authored);
const TENTACLES = validation.arms.filter((a) => a.tentacle);
const ARMS = validation.arms.filter((a) => !a.tentacle);
const distal = (a) => `${a.name}_${String(a.joints - 1).padStart(2, '0')}`;
const travelOf = (rows, n) => {
  let max = 0;
  for (const r of rows) {
    const d = Math.hypot(r[n][0] - rows[0][n][0], r[n][1] - rows[0][n][1], r[n][2] - rows[0][n][2]);
    if (d > max) max = d;
  }
  return max;
};

await MeshoptDecoder.ready;
globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 2048, height: 2048, close() {} });
const bytes = fs.readFileSync(`${base}.glb`);
const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  .parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const mixer = new THREE.AnimationMixer(gltf.scene);
const meshes = [];
gltf.scene.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
const skin = meshes.find((m) => m.skeleton.bones.some((b) => b.name === 'body')
  && m.geometry.attributes.skinIndex && m.geometry.attributes.position.count > 5000);
const boneIndex = (n) => skin.skeleton.bones.findIndex((b) => b.name === n);
const ji = skin.geometry.attributes.skinIndex;
const jw = skin.geometry.attributes.skinWeight;
const weightOn = (v, bone) => {
  let w = 0;
  for (let k = 0; k < 4; k++) if (ji.getComponent(v, k) === bone) w += jw.getComponent(v, k);
  return w;
};
const pose = (v, out) => {
  out.fromBufferAttribute(skin.geometry.attributes.position, v);
  skin.applyBoneTransform(v, out);
  return out;
};

// --- 1. the mantle must not bend ----------------------------------------------------------------
{
  const b = boneIndex('body');
  const pure = [];
  let nearPure = 0;
  for (let v = 0; v < ji.count; v++) {
    const w = weightOn(v, b);
    if (w > 0.999) nearPure++;
    if (w >= 1 - 1e-6 && pure.length < 400) pure.push(v);
  }
  // Fewer outright-owned vertices than Ceratites' shell has, and that is the design rather than a
  // weakness: the squeeze's feather deliberately spreads most of the flank across three bones, so
  // what the mantle owns alone is the dorsal and ventral strips between them. The rigid-body test
  // is exact, so a few dozen points and the hundreds of pairs between them settle it.
  assert(pure.length > 30, `the mantle must own a block of skin outright (${pure.length})`);
  const p = new THREE.Vector3();
  const snap = () => pure.map((v) => pose(v, p).clone());
  const pairs = [];
  for (let i = 0; i < pure.length; i += 2) for (let j = i + 3; j < pure.length; j += 7) pairs.push([i, j]);
  mixer.stopAllAction();
  gltf.scene.updateMatrixWorld(true);
  for (const m of meshes) m.skeleton.update();
  const rest = snap();
  const restD = pairs.map(([i, j]) => rest[i].distanceTo(rest[j]));
  let worst = 0; let worstAt = null;
  for (const clip of gltf.animations) {
    mixer.stopAllAction();
    mixer.clipAction(clip).reset().play();
    for (let s = 0; s <= 24; s++) {
      mixer.setTime(clip.duration * s / 24);
      gltf.scene.updateMatrixWorld(true);
      for (const m of meshes) m.skeleton.update();
      const now = snap();
      pairs.forEach(([i, j], k) => {
        const d = Math.abs(now[i].distanceTo(now[j]) - restD[k]);
        if (d > worst) { worst = d; worstAt = `${clip.name}@${(s / 24).toFixed(2)}`; }
      });
    }
  }
  report.stiffMantle = { pureMantleVertices: pure.length, nearPureMantleVertices: nearPure,
                         pairsChecked: pairs.length, worstPairwiseDistanceChange: worst, worstAt };
  assert(worst < 1e-5, `the mantle bends by ${worst} at ${worstAt}`);
}

// --- 2. the squeeze, measured as the animal's own width -----------------------------------------
// Not "were the flank bones keyed" but "is the animal narrower": the lateral span of the vertices
// the two flank bones own, played out over each clip.
{
  const L = boneIndex('mantle_L'); const R = boneIndex('mantle_R');
  const flank = [];
  for (let v = 0; v < ji.count; v++) if (weightOn(v, L) > 0.6 || weightOn(v, R) > 0.6) flank.push(v);
  assert(flank.length > 80, `the squeeze must own flank skin (${flank.length})`);
  const p = new THREE.Vector3();
  report.squeeze = [];
  for (const clip of gltf.animations) {
    mixer.stopAllAction();
    mixer.clipAction(clip).reset().play();
    let wide = -Infinity; let narrow = Infinity;
    for (let s = 0; s <= 24; s++) {
      mixer.setTime(clip.duration * s / 24);
      gltf.scene.updateMatrixWorld(true);
      for (const m of meshes) m.skeleton.update();
      let lo = Infinity; let hi = -Infinity;
      for (const v of flank) { const x = pose(v, p).x; if (x < lo) lo = x; if (x > hi) hi = x; }
      wide = Math.max(wide, hi - lo); narrow = Math.min(narrow, hi - lo);
    }
    report.squeeze.push({ clip: clip.name, widest: wide, narrowest: narrow, contraction: wide - narrow });
  }
}
const squeeze = (n) => report.squeeze.find((s) => s.clip === n);

// --- 3. the fins ---------------------------------------------------------------------------------
// Measured on the **skin**, not on a bone proxy. Each fin band rotates about its own bone axis, so
// `tracker`'s `:tip` -- a point 0.8 along the bone's own +Y -- sits exactly on the axis of rotation
// and never moves: the first pass of this check read every fin travel as 0.000 while the fins were
// working perfectly. What a fin does is move the blade hanging off that axis, so the blade is what
// is measured: the vertices each band owns, posed, at 96 phases.
report.fins = [];
{
  const FIN_BANDS = ['00', '01', '02'];
  const owned = {};
  const tipVertex = {};
  for (const side of ['L', 'R']) {
    for (const b of FIN_BANDS) {
      const n = `fin_${side}_${b}`;
      const bi = boneIndex(n);
      // Two things this cannot be. Not a **majority-owned** set: the bands blend into each other by
      // design, so the aftmost one owns no vertex outright at all and a 0.6 cut reads it as absent.
      // And not a weighted **centroid** either, which is what the second pass used: this generation
      // meshes its left fin with 1141 thin vertices and its right with 652 while the two reach
      // 0.1099 and 0.1055 from the axis, so a centroid sits at a different radius on each side and
      // reported the right fin travelling 45 % of the left while the two bones were swinging
      // through exactly the same 38.8 degrees. The **outermost** vertex of each band is the fin
      // tip, and it compares like with like however the surface was triangulated.
      const list = [];
      for (let v = 0; v < ji.count; v++) { const w = weightOn(v, bi); if (w > 0.15) list.push([v, w]); }
      assert(list.length > 20, `${n} must own blade (${list.length})`);
      owned[n] = list;
      const q = new THREE.Vector3();
      let best = list[0][0]; let bestX = -Infinity;
      for (const [v] of list) {
        q.fromBufferAttribute(skin.geometry.attributes.position, v);
        if (Math.abs(q.x) > bestX) { bestX = Math.abs(q.x); best = v; }
      }
      tipVertex[n] = best;
    }
  }
  const p = new THREE.Vector3();
  for (const clip of gltf.animations) {
    mixer.stopAllAction();
    mixer.clipAction(clip).reset().play();
    const series = {};
    for (const n of Object.keys(owned)) series[n] = [];
    const STEPS = 96;
    for (let s = 0; s <= STEPS; s++) {
      mixer.setTime(clip.duration * s / STEPS);
      gltf.scene.updateMatrixWorld(true);
      for (const m of meshes) m.skeleton.update();
      for (const n of Object.keys(owned)) {
        pose(tipVertex[n], p);
        series[n].push([p.x, p.y, p.z]);
      }
    }
    const travel = (n) => {
      const a = series[n];
      let max = 0;
      for (const q of a) max = Math.max(max, Math.hypot(q[0] - a[0][0], q[1] - a[0][1], q[2] - a[0][2]));
      return max;
    };
    // The wave is written on the bands' dorsoventral swing, so that is the series compared -- with
    // each fin's **common mode removed** first. A turn adds a steady lean to all three bands of a
    // fin at once, and that lean has the same period as the wave, so a Fourier phase taken on the
    // raw series is dragged onto the lean and every band reports the same phase: the wave measured
    // 0.025 beats of lag where the clip writes 0.175. A travelling wave is the differential part of
    // the motion by definition, so the side's own mean is what it travels against.
    const mean = {};
    for (const side of ['L', 'R']) {
      mean[side] = series['fin_L_00'].map((_, i) => FIN_BANDS
        .reduce((a, b) => a + series[`fin_${side}_${b}`][i][1], 0) / FIN_BANDS.length);
    }
    const rows = series['fin_L_00'].map((_, i) => Object.fromEntries(
      Object.keys(owned).map((n) => [n, [series[n][i][1] - mean[n[4]][i], 0, 0]])));
    const lag = (a, b) => beatLag(rows, a, b).lag;
    report.fins.push({
      clip: clip.name,
      tipTravel: { L: travel('fin_L_02'), R: travel('fin_R_02') },
      bandLagLeft: lag('fin_L_02', 'fin_L_00'),
      bandLagRight: lag('fin_R_02', 'fin_R_00'),
      sideLag: lag('fin_L_01', 'fin_R_01'),
      amplitude: { L: swingPhase(rows, 'fin_L_01').mag, R: swingPhase(rows, 'fin_R_01').mag },
    });
  }
}
const fin = (n) => report.fins.find((f) => f.clip === n);

// --- 4. the crown, the tentacles and the anchors -------------------------------------------------
report.crown = [];
for (const clip of CLIPS) {
  const names = [...TENTACLES.map(distal), ...ARMS.map(distal), 'head', 'body', 'funnel:tip'];
  const rows = track(clip, names, 60);
  const tent = TENTACLES.map((a) => travelOf(rows, distal(a)));
  const arms = ARMS.map((a) => travelOf(rows, distal(a)));
  report.crown.push({
    clip,
    minTentacleTravel: Math.min(...tent),
    meanArmTravel: arms.reduce((a, b) => a + b, 0) / arms.length,
    minArmTravel: Math.min(...arms),
    funnelTravel: travelOf(rows, 'funnel:tip'),
    headTravel: travelOf(rows, 'head'),
    bodyTravel: travelOf(rows, 'body'),
  });
}
const crown = (n) => report.crown.find((c) => c.clip === n);
report.anchorTravel = anchorTravel(track, CLIPS,
  ['anchor_mouth', 'anchor_mouth_inside', 'anchor_attack_primary', 'anchor_grasp']);
const anchor = (n) => report.anchorTravel.find((r) => r.clip === n);

// --- 5. the beak ---------------------------------------------------------------------------------
report.beak = [];
for (const clip of CLIPS) {
  const rows = track(clip, ['anchor_mouth'], 48);
  const angles = rows.map((r) => r.jawAngle);
  report.beak.push({
    clip, maxOpenRadians: Math.max(...angles), minRadians: Math.min(...angles),
    peakPhase: rows[angles.indexOf(Math.max(...angles))].phase,
    mouthSocketTravelInSkullFrame: Math.max(...rows.map((r) => Math.hypot(
      r.gape[0] - rows[0].gape[0], r.gape[1] - rows[0].gape[1], r.gape[2] - rows[0].gape[2]))),
  });
}
const beak = (n) => report.beak.find((b) => b.clip === n);

write();

const problems = [];
const need = (ok, msg) => { if (!ok) problems.push(msg); };

// The squeeze is the jet, and it belongs to the two clips that are about emptying the mantle.
need(squeeze('Sprint').contraction > 0.08, `Sprint must squeeze the mantle (${squeeze('Sprint').contraction.toFixed(4)})`);
need(squeeze('Ability').contraction > 0.10, `Ability must empty the mantle (${squeeze('Ability').contraction.toFixed(4)})`);
for (const c of ['TurnLeft', 'TurnRight', 'Bite', 'Attack']) {
  need(squeeze(c).contraction < 0.02, `${c} is not about the jet and must not squeeze (${squeeze(c).contraction.toFixed(4)})`);
}
// The fins are the cruise, and the wave has to travel down them rather than flap as one plate.
for (const c of ['Swim', 'TurnLeft', 'TurnRight']) {
  need(fin(c).tipTravel.L > 0.05 && fin(c).tipTravel.R > 0.05,
    `${c}: both fins must work (${fin(c).tipTravel.L.toFixed(3)} / ${fin(c).tipTravel.R.toFixed(3)})`);
  need(Math.abs(fin(c).bandLagLeft) > 0.03 && Math.abs(fin(c).bandLagRight) > 0.03,
    `${c}: the fin wave must travel (${fin(c).bandLagLeft} / ${fin(c).bandLagRight})`);
}
// A turn runs the two fins against each other; a cruise runs them together.
need(Math.abs(fin('Swim').sideLag) < 0.12, `Swim: the fins must run together (${fin('Swim').sideLag})`);
for (const c of ['TurnLeft', 'TurnRight']) {
  need(Math.abs(fin(c).sideLag) > 0.18, `${c}: the fins must run against each other (${fin(c).sideLag})`);
}
// The tentacles are the weapon.
for (const c of ['Attack', 'Heavy']) {
  need(crown(c).minTentacleTravel > 1.4 * crown(c).meanArmTravel,
    `${c}: the tentacles must out-reach the arms (${crown(c).minTentacleTravel.toFixed(3)} vs ${crown(c).meanArmTravel.toFixed(3)})`);
  need(anchor(c).anchor_attack_primary > 2 * anchor(c).anchor_mouth,
    `${c}: the attack anchor must out-travel the mouth (${anchor(c).anchor_attack_primary.toFixed(3)} vs ${anchor(c).anchor_mouth.toFixed(3)})`);
}
need(anchor('Grab').anchor_grasp > 0.2, `Grab: the grasp anchor must reach (${anchor('Grab').anchor_grasp.toFixed(3)})`);
// **The beak is not animated, in any clip, and that is the check.** It sits at the bottom of a well
// of arms and is never on screen; what this animal reaches with, catches with and is read by is the
// crown and its two tentacles, and `anchor_mouth` riding a still `jaw` is the whole of what the game
// needs to know about its mouth. A gape authored down there is motion spent where nothing can see
// it, and it stretches the oral lining for nothing.
for (const b of report.beak) {
  need(Math.abs(b.maxOpenRadians) < 1e-4 && Math.abs(b.minRadians) < 1e-4,
    `${b.clip}: the beak must not be animated (${b.maxOpenRadians.toFixed(5)} / ${b.minRadians.toFixed(5)})`);
  need(b.mouthSocketTravelInSkullFrame < 1e-4,
    `${b.clip}: the mouth socket must hold still in the skull's own frame (${b.mouthSocketTravelInSkullFrame.toFixed(5)})`);
}

// --- 6. a grab reaches and shuts; a hit jabs and hauls back ---------------------------------------
// The shipped Attack shot the tentacles out on the *windup* and then spent the whole strike hauling
// them back in: the attack anchor was furthest forward at u=0.25 and furthest back at u=0.44, 1.45
// units of travel that is almost all retraction. That is a jab that has already missed, and it is
// what the note this was raised on called "hits with tentacles" against the "lithe grab forward" it
// should be. Since the heavy is a *hook latch*, the move is a grab and the grab has three parts.
//
// **What cannot be measured here is a forward swing**, and finding that out is most of the work.
// These arms lie along the animal's own axis at rest with their tips at the very front of its
// bounding box, so no rotation carries a tip further forward: swinging one "forward" about the crown
// tangent lifts it over the head, and converging it past the axis brings it down the other side.
// Two corrections measured exactly that (0.048 forward against 0.321 back, then 0.099 against
// 0.120) before the geometry was read rather than argued with. So the three parts are measured as
// what they actually are.
report.strike = [];
for (const c of ['Attack', 'Bite', 'Grab', 'Heavy']) {
  const rows = track(c, ['anchor_attack_primary', 'head', 'arm_03_06', 'arm_04_06'], 48);
  // 1. The crown protracts. `head` is the parent of all twelve appendages, so its own forward
  //    travel is the reach, and it has to come after the gather rather than with it.
  const hz = rows.map((r) => r.head[2]);
  const protraction = Math.max(...hz) - hz[0];
  const gatherBack = hz[0] - Math.min(...hz);
  const reachPhase = rows[hz.indexOf(Math.max(...hz))].phase;
  const gatherPhase = rows[hz.indexOf(Math.min(...hz))].phase;
  // 2. No tentacle whips back. Measured in the head's own frame, so the protraction cannot pay for
  //    a retraction: the tip's forward extent relative to the crown must never fall far below where
  //    it rests. This is the number the old clip failed, and it failed it by a body's width.
  const local = (r, n) => r[n][2] - r.head[2];
  const whip = Math.max(...['arm_03_06', 'arm_04_06'].map((n) =>
    local(rows[0], n) - Math.min(...rows.map((r) => local(r, n)))));
  // 3. The grab shuts. The two tentacle tips must end up closer together than they opened.
  const spanOf = (r) => Math.hypot(...[0, 1, 2].map((k) => r.arm_03_06[k] - r.arm_04_06[k]));
  const spans = rows.map(spanOf);
  const opened = Math.max(...spans);
  const shut = Math.min(...spans.slice(Math.floor(spans.indexOf(opened))));
  report.strike.push({ clip: c, protraction, gatherBack, reachPhase, gatherPhase,
    tentacleWhipBackInCrownFrame: whip, tentacleSpanOpen: opened, tentacleSpanShut: shut });
  // A twentieth of a body length. It is deliberately not larger: the head is the crown's
  // parent and the skin between it and the mantle pays for every unit of it -- at 0.36 the
  // head/body junction tore 5.77x against this body's standing 5.37x, and at 0.25 it is 4.28x.
  need(protraction > 0.22, `${c}: the crown must be driven forward (${protraction.toFixed(3)})`);
  need(protraction > 3 * gatherBack,
    `${c}: the crown must go forward rather than back (forward ${protraction.toFixed(3)} vs back ${gatherBack.toFixed(3)})`);
  need(reachPhase > gatherPhase,
    `${c}: the reach must come after the gather (reach at ${reachPhase.toFixed(2)}, gather at ${gatherPhase.toFixed(2)})`);
  // A quarter of the tentacle's own forward extent (2.02 units from the crown at rest). The
  // shipped clips gave up 1.07, 1.03 and 0.76 of it on Attack, Heavy and Grab.
  need(whip < 0.50, `${c}: the tentacles must not whip back into the crown (${whip.toFixed(3)})`);
  need(opened - shut > 0.18, `${c}: the grab must shut (opened ${opened.toFixed(3)}, shut ${shut.toFixed(3)})`);
}

assert.equal(problems.join(' | '), '', 'measured performance checks');
console.log(JSON.stringify({
  models: report.models, clips: report.clips, joints: report.joints,
  twinTriangleFraction: report.twinTriangleFraction,
  stiffMantle: report.stiffMantle,
  squeeze: report.squeeze.filter((s) => ['Idle', 'Swim', 'Sprint', 'Ability', 'Attack', 'TurnLeft'].includes(s.clip)),
  fins: report.fins.filter((f) => ['Idle', 'Swim', 'Sprint', 'TurnLeft', 'TurnRight'].includes(f.clip)),
  crown: report.crown.filter((c) => ['Swim', 'Sprint', 'Attack', 'Heavy', 'Grab'].includes(c.clip)),
  anchorTravel: report.anchorTravel.filter((r) => ['Swim', 'Attack', 'Heavy', 'Grab', 'Bite'].includes(r.clip)),
  beak: report.beak.filter((b) => ['Idle', 'Swim', 'Bite', 'Attack', 'Eat', 'Heavy'].includes(b.clip)),
  strike: report.strike,
  exactRigParity: true, exactAnimationParity: true, exactAnchorParity: true,
}, null, 2));
