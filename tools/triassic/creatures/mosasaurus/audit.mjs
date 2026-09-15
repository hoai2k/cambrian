/**
 * Package the Mosasaurus family, prove the authored body and its twin are the same rig playing the
 * same samples, then play every clip through Three.js and measure the two things this animal is
 * about: **a travelling wave that grows towards a lunate fluke**, and **a jaw that is shut except
 * when it strikes**.
 *
 * That second one is not a formality here. The generation was authored gaping, so the bind pose
 * *is* an open mouth and every locomotion clip has to close it; a clip that simply forgot would
 * look completely normal in a contact sheet of the rest. So the jaw angle is measured against the
 * bind pose on every clip in the file, and the locomotion set is required to be **negative** —
 * shut — rather than merely small.
 *
 *   node tools/triassic/creatures/mosasaurus/audit.mjs --package --decode
 */
import assert from 'node:assert/strict';
import { auditPair, tracker, lateral, beatLag, swingPhase, anchorTravel } from '../_pipeline/paired-audit.mjs';

const id = 'mosasaurus';
const { report, CLIPS, authored, write } = await auditPair({
  id,
  base: `public/assets/triassic/creatures/${id}`,
  here: `tools/triassic/creatures/${id}`,
  local: `local/triassic-authoring/${id}`,
  joints: 24, sockets: 3,
});
const track = tracker(authored);
const LIMBS = ['fore_upper_L', 'fore_upper_R', 'hind_upper_L', 'hind_upper_R'];
const TIPS = LIMBS.map((n) => `${n.replace('upper', 'tip')}:tip`);
const AXIS = ['skull', 'neck_00', 'chest', 'body', 'tail_00', 'tail_02', 'tail_04'];
/** The clips a player spends the match inside: every one of them runs with the mouth shut. */
const SHUT = ['Idle', 'Swim', 'Sprint', 'TurnLeft', 'TurnRight', 'Dive', 'Rise'];

// --- locomotion. The wave grows towards the fluke, and it is the fluke that drives.
report.wave = [];
for (const clip of ['Swim', 'Sprint', 'Idle']) {
  const rows = track(clip, [...AXIS, ...TIPS, ...AXIS.map((n) => `${n}:yaw`)]);
  const travel = Object.fromEntries([...AXIS, ...TIPS].map((n) => [n, lateral(rows, n)]));
  const phases = Object.fromEntries(AXIS.map((n) => [n, swingPhase(rows, `${n}:yaw`)]));
  report.wave.push({
    clip,
    travel,
    /** A travelling wave: each station further back swings further than the one in front of it. */
    growsTowardsTheTail: travel.tail_04 > travel.tail_02 && travel.tail_02 > travel.tail_00
      && travel.tail_00 > travel.body,
    tailOverTrunk: travel.tail_04 / Math.max(travel.body, 1e-6),
    tailOverSkull: travel.tail_04 / Math.max(travel.skull, 1e-6),
    /** …and it travels: the tail's swing lags the trunk's rather than moving with it. */
    ...beatLag(rows, 'tail_04:yaw', 'body:yaw'),
    harmonics: Object.fromEntries(AXIS.map((n) => [n, phases[n].k])),
  });
}

// --- the charge. A C-start coil and one straight run, carried by the body rather than the limbs.
{
  const rows = track('Ability', ['body', 'skull', ...TIPS], 96);
  const pos = rows.map((r) => r.body);
  const step = pos.slice(1).map((p, i) => Math.hypot(p[0] - pos[i][0], p[1] - pos[i][1], p[2] - pos[i][2]));
  const total = step.reduce((a, b) => a + b, 0);
  let bestWindow = step.length;
  for (let a = 0; a < step.length; a++) {
    let sum = 0;
    for (let b = a; b < step.length; b++) {
      sum += step[b];
      if (sum >= total / 2) { bestWindow = Math.min(bestWindow, b - a + 1); break; }
    }
  }
  report.charge = {
    bodyPathLength: total,
    bodyReach: Math.max(...pos.map((p) => Math.hypot(p[0] - pos[0][0], p[1] - pos[0][1], p[2] - pos[0][2]))),
    coil: lateral(rows, 'skull'),
    halfTravelInFractionOfClip: bestWindow / step.length,
  };
}

// --- the strike. A mosasaur has seven short cervicals and does not deliver the head on a neck:
// the whole animal goes with it, so what is measured is the snout arriving fast.
report.strike = [];
for (const clip of ['Attack', 'Heavy', 'Bite']) {
  const rows = track(clip, ['anchor_attack_primary', 'skull', 'chest', 'body'], 96);
  const pos = rows.map((r) => r.anchor_attack_primary);
  const step = pos.slice(1).map((p, i) => Math.hypot(p[0] - pos[i][0], p[1] - pos[i][1], p[2] - pos[i][2]));
  const total = step.reduce((a, b) => a + b, 0);
  let bestWindow = step.length;
  for (let a = 0; a < step.length; a++) {
    let sum = 0;
    for (let b = a; b < step.length; b++) {
      sum += step[b];
      if (sum >= total / 2) { bestWindow = Math.min(bestWindow, b - a + 1); break; }
    }
  }
  const reachOf = (n) => Math.max(...rows.map((r) => Math.hypot(
    r[n][0] - rows[0][n][0], r[n][1] - rows[0][n][1], r[n][2] - rows[0][n][2])));
  report.strike.push({
    clip, snoutPathLength: total, snoutReach: reachOf('anchor_attack_primary'),
    skullReach: reachOf('skull'), chestReach: reachOf('chest'),
    halfTravelInFractionOfClip: bestWindow / step.length,
  });
}

// --- the jaws, against the bind pose. The bind pose is a 33-degree gape, so "shut" is a
// **negative** jaw angle and this is the check that the closing is actually in the file.
report.jaw = [];
for (const clip of CLIPS) {
  const rows = track(clip, ['anchor_mouth'], 60);
  const angles = rows.map((r) => r.jawAngle);
  const gapeTravel = Math.max(...rows.map((r) => Math.hypot(
    r.gape[0] - rows[0].gape[0], r.gape[1] - rows[0].gape[1], r.gape[2] - rows[0].gape[2])));
  report.jaw.push({
    clip,
    maxRadians: Math.max(...angles),
    minRadians: Math.min(...angles),
    peakPhase: rows[angles.indexOf(Math.max(...angles))].phase,
    mouthSocketTravelInSkullFrame: gapeTravel,
  });
}
/** Where the jaw sits at rest in the file: the generation's own gape, and what closing it means. */
report.bindPoseGape = {
  note: 'the bind pose is the generation\'s own open mouth; every angle here is relative to it, so '
    + 'a shut jaw is a negative number and the locomotion clips must all be negative throughout.',
  shutClips: SHUT,
  worstShutAngle: Math.max(...SHUT.map((c) => report.jaw.find((j) => j.clip === c).maxRadians)),
};

report.anchorTravel = anchorTravel(track, CLIPS);
write();

const problems = [];
const need = (ok, msg) => { if (!ok) problems.push(msg); };
for (const w of report.wave) {
  need(w.growsTowardsTheTail, `${w.clip}: the wave must grow towards the fluke`);
  if (w.clip === 'Idle') continue;
  need(w.tailOverTrunk > 4, `${w.clip}: the fluke must drive (${w.tailOverTrunk.toFixed(2)}x the trunk)`);
  need(w.tailOverSkull > 2, `${w.clip}: the fluke must out-swing the head (${w.tailOverSkull.toFixed(2)})`);
  need(Math.abs(w.lag) > 0.04, `${w.clip}: the wave must travel, not stand (${w.lag.toFixed(3)})`);
}
need(report.charge.halfTravelInFractionOfClip < 0.36,
  `Ability must be a charge, not a swell (${report.charge.halfTravelInFractionOfClip.toFixed(3)})`);
need(report.charge.bodyReach > 0.9, `Ability must carry the animal (${report.charge.bodyReach.toFixed(3)})`);
need(report.charge.coil > 0.25, `Ability must coil before it goes (${report.charge.coil.toFixed(3)})`);
for (const s of report.strike) {
  need(s.halfTravelInFractionOfClip < 0.40,
    `${s.clip}: half the snout's travel must fall in a short window (${s.halfTravelInFractionOfClip.toFixed(3)})`);
  need(s.clip === 'Bite' || s.snoutReach > 0.25, `${s.clip}: the strike must reach (${s.snoutReach.toFixed(3)})`);
}
{
  const reachOf = (n) => report.strike.find((s) => s.clip === n).snoutReach;
  need(reachOf('Heavy') > reachOf('Attack') * 1.05,
    `Heavy must commit further than Attack (${reachOf('Heavy').toFixed(3)} vs ${reachOf('Attack').toFixed(3)})`);
}
// **The mouth is shut for everything that is not a strike.** The bind pose gapes, so this is the
// check that every locomotion clip actually carries the closing rotation.
for (const c of SHUT) {
  const j = report.jaw.find((x) => x.clip === c);
  need(j.maxRadians < -0.3, `${c}: the jaw must be shut throughout (worst ${j.maxRadians.toFixed(3)})`);
}
const jaw = (n) => report.jaw.find((j) => j.clip === n);
need(jaw('Bite').maxRadians > 0.25, `Bite must open the jaw past the bind pose (${jaw('Bite').maxRadians.toFixed(3)})`);
need(jaw('Bite').mouthSocketTravelInSkullFrame > 0.30, 'the mouth socket must travel with the jaw');
for (const n of ['Attack', 'Heavy', 'Eat']) {
  need(jaw(n).maxRadians > 0.1, `${n} must open the jaw past the bind pose (${jaw(n).maxRadians.toFixed(3)})`);
}
for (const n of ['Attack', 'Heavy']) {
  need(jaw(n).peakPhase > 0.2 && jaw(n).peakPhase < 0.75, `${n}: the gape must peak on the drive (${jaw(n).peakPhase})`);
}
need(jaw('Ability').maxRadians < 0, `Ability must keep its mouth shut (${jaw('Ability').maxRadians.toFixed(3)})`);
for (const name of ['Attack', 'Heavy', 'Bite']) {
  const row = report.anchorTravel.find((r) => r.clip === name);
  need(row.anchor_attack_primary > 0.02, `${name}: the attack anchor must travel (${row.anchor_attack_primary.toFixed(4)})`);
}
assert.equal(problems.join(' | '), '', 'measured performance checks');
console.log(JSON.stringify({
  models: report.models, clips: report.clips, twinTriangleFraction: report.twinTriangleFraction,
  wave: report.wave, charge: report.charge, strike: report.strike,
  bindPoseGape: report.bindPoseGape,
  jaw: report.jaw.filter((j) => ['Idle', 'Swim', 'Bite', 'Attack', 'Heavy', 'Ability', 'Eat'].includes(j.clip)),
  exactRigParity: true, exactAnimationParity: true,
}, null, 2));
