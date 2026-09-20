/**
 * Package the Odontochelys family, prove the authored body and its twin are the same rig playing
 * the same samples, then play every clip through Three.js and measure the three things this animal
 * is about: **a rigid belly plate that no clip ever animates**, **four limbs on a diagonal-couplet
 * gait**, and **a roll that puts the plate between the animal and whatever is coming**.
 *
 * The plastron check is Henodus' `rigidCarapaceNeverAnimated` asked of the other surface, and it is
 * asked *twice*: the bone must carry no channel in any clip, and the plate's own skin must move as
 * one rigid piece with the trunk rather than merely staying near it. A bone with no channel still
 * inherits its parent, so "unanimated" on its own would pass a plate that was quietly being
 * stretched by the bones either side of it.
 *
 *   node tools/triassic/creatures/odontochelys/audit.mjs --package --decode
 */
import assert from 'node:assert/strict';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { auditPair, tracker, lateral, anchorTravel } from '../_pipeline/paired-audit.mjs';

const id = 'odontochelys';
const { report, CLIPS, authored, write } = await auditPair({
  id,
  base: `public/assets/triassic/creatures/${id}`,
  here: `tools/triassic/creatures/${id}`,
  local: `local/triassic-authoring/${id}`,
  joints: 29, sockets: 3,
});
const track = tracker(authored);
const LIMBS = ['fore_upper_L', 'fore_upper_R', 'hind_upper_L', 'hind_upper_R'];
/** Bone heads, not `:tip` probes — see the Atopodentatus audit for why that distinction decides it. */
const TIPS = LIMBS.map((n) => n.replace('upper', 'tip'));
const AXIS = ['skull', 'neck_00', 'chest', 'body', 'plastron', 'tail_00', 'tail_02', 'tail_04'];

const vertical = (rows, n) => Math.max(...rows.map((r) => r[n][1])) - Math.min(...rows.map((r) => r[n][1]));
const along = (rows, n) => Math.max(...rows.map((r) => r[n][2])) - Math.min(...rows.map((r) => r[n][2]));

function phaseOn(rows, n, axis) {
  const series = rows.slice(0, -1).map((r) => r[n][axis]);
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

function lagOn(rows, a, b, axis) {
  const pa = phaseOn(rows, a, axis); const pb = phaseOn(rows, b, axis);
  if (pa.k !== pb.k) return NaN;
  let lag = (pb.phase - pa.phase) / (2 * Math.PI);
  while (lag <= -0.5) lag += 1;
  while (lag > 0.5) lag -= 1;
  return lag;
}

// --- the plastron. Half the check is that no clip carries a channel on the bone at all, read out
// of the **packaged** file rather than trusted from the builder's report.
{
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  const named = [];
  for (const suffix of ['', '.puppet']) {
    const doc = await io.read(`public/assets/triassic/creatures/${id}${suffix}.glb`);
    for (const a of doc.getRoot().listAnimations()) {
      for (const c of a.listChannels()) {
        if (c.getTargetNode().getName() === 'plastron') named.push(`${suffix || 'authored'}:${a.getName()}`);
      }
    }
  }
  const skin = (await io.read(`public/assets/triassic/creatures/${id}.glb`))
    .getRoot().listSkins()[0].listJoints().map((j) => j.getName());
  report.plastron = {
    boneIsAJoint: skin.includes('plastron'),
    thereIsNoCarapaceBone: !skin.includes('carapace'),
    clipsWithAPlastronChannel: named,
  };
  assert.equal(named.length, 0, 'the plastron bone must never be animated');
  assert(report.plastron.boneIsAJoint, 'the plastron must be a joint of the skin');
  assert(report.plastron.thereIsNoCarapaceBone,
    'this animal has no carapace and must not carry a bone for one');
}

// --- locomotion. Four limbs rowing on a diagonal couplet, a trunk that barely bends.
report.rowing = [];
for (const clip of ['Swim', 'Sprint', 'Crawl', 'Idle']) {
  const rows = track(clip, [...AXIS, ...TIPS, ...LIMBS]);
  const travel = Object.fromEntries([...AXIS, ...TIPS].map((n) => [n, lateral(rows, n)]));
  const slide = Object.fromEntries(TIPS.map((n) => [n, along(rows, n)]));
  const rise = Object.fromEntries(TIPS.map((n) => [n, vertical(rows, n)]));
  const stroke = Math.max(...TIPS.map((n) => slide[n]));
  report.rowing.push({
    clip,
    travel,
    limbTipStroke: slide,
    limbTipRise: rise,
    slideOverRise: Math.min(...TIPS.map((n) => slide[n] / Math.max(rise[n], 1e-6))),
    tailTipShareOfLimb: travel.tail_04 / stroke,
    trunkShareOfLimb: travel.body / stroke,
    /**
     * The plate must not move *relative to* the trunk. Comparing its lateral travel against the
     * trunk bone's own is the wrong reading and says so loudly on Crawl: the trunk bone sits on
     * the axis and the plate sits below it, so a body roll sweeps the plate sideways while the
     * bone it is welded to does not move at all -- 0.0615 against 0.0000, and that is rigidity
     * working rather than failing. What rigid means here is that the distance between them never
     * changes.
     */
    plastronOffsetDrift: Math.max(...rows.map((r) => Math.abs(
      Math.hypot(r.plastron[0] - r.body[0], r.plastron[1] - r.body[1], r.plastron[2] - r.body[2])
      - Math.hypot(rows[0].plastron[0] - rows[0].body[0], rows[0].plastron[1] - rows[0].body[1],
        rows[0].plastron[2] - rows[0].body[2])))),
    lag: lagOn(rows, 'fore_tip_L', 'fore_tip_R', 2),
    hindBehindFore: lagOn(rows, 'hind_tip_L', 'fore_tip_L', 2),
  });
}

// --- the belly turn. `Ability` rolls the plate towards the threat and rolls back.
{
  const rows = track('Ability', ['plastron', 'body', 'skull', 'fore_tip_L'], 96);
  // How far round the plate has been carried, as the angle **from its own resting offset** rather
  // than as an absolute bearing: taken as a bearing the series wraps through +/-pi at the top of
  // the roll and the spread reads 6.25 rad, which is the wrap and not the animal.
  const off = (r) => [r.plastron[0] - r.body[0], r.plastron[1] - r.body[1]];
  const [rx, ry] = off(rows[0]);
  const angleFromRest = (r) => {
    const [x, y] = off(r);
    return Math.abs(Math.atan2(x * ry - y * rx, x * rx + y * ry));
  };
  const angles = rows.map(angleFromRest);
  const swing = Math.max(...angles);
  report.bellyTurn = {
    plateRollRadians: swing,
    returnsToRest: angles.at(-1),
    plateRidesTheTrunk: Math.max(...rows.map((r) => Math.abs(
      Math.hypot(r.plastron[0] - r.body[0], r.plastron[1] - r.body[1], r.plastron[2] - r.body[2])
      - Math.hypot(rows[0].plastron[0] - rows[0].body[0], rows[0].plastron[1] - rows[0].body[1],
        rows[0].plastron[2] - rows[0].body[2])))),
  };
}

// --- the bite
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
    forwardReach: along(rows, 'anchor_attack_primary'),
    skullReach: reachOf('skull'), chestReach: reachOf('chest'),
    halfTravelInFractionOfClip: bestWindow / step.length,
  });
}

// --- the jaws
report.jaw = [];
for (const clip of CLIPS) {
  const rows = track(clip, ['anchor_mouth'], 48);
  const angles = rows.map((r) => r.jawAngle);
  const gapeTravel = Math.max(...rows.map((r) => Math.hypot(
    r.gape[0] - rows[0].gape[0], r.gape[1] - rows[0].gape[1], r.gape[2] - rows[0].gape[2])));
  report.jaw.push({
    clip,
    maxOpenRadians: Math.max(...angles),
    minRadians: Math.min(...angles),
    peakPhase: rows[angles.indexOf(Math.max(...angles))].phase,
    mouthSocketTravelInSkullFrame: gapeTravel,
  });
}

report.anchorTravel = anchorTravel(track, CLIPS);
write();

const problems = [];
const need = (ok, msg) => { if (!ok) problems.push(msg); };
for (const g of report.rowing) {
  need(g.slideOverRise > 1.2,
    `${g.clip}: the limb tips must slide further than they rise (${g.slideOverRise.toFixed(2)})`);
  // The plate is rigid on the trunk: carried by the body, never moved relative to it.
  need(g.plastronOffsetDrift < 1e-4,
    `${g.clip}: the plastron must be welded to the trunk (${g.plastronOffsetDrift.toExponential(2)})`);
  if (g.clip !== 'Idle') {
    need(Math.max(...Object.values(g.limbTipStroke)) > 0.7,
      `${g.clip}: the stroke must be visible (${Math.max(...Object.values(g.limbTipStroke)).toFixed(3)})`);
    // A diagonal couplet: left and right alternate on each girdle, and the hind pair is half a beat
    // behind the fore.
    need(Math.abs(g.lag) > 0.35,
      `${g.clip}: the two sides must alternate (${g.lag.toFixed(3)} of a beat)`);
    need(Math.abs(g.hindBehindFore) > 0.3,
      `${g.clip}: the hind pair must be a diagonal couplet behind the fore (${g.hindBehindFore.toFixed(3)})`);
    // A shelled animal is stiff through the middle. The tail is free and is allowed to help.
    need(g.trunkShareOfLimb < 0.12,
      `${g.clip}: the trunk must not wag (${g.trunkShareOfLimb.toFixed(4)})`);
    need(g.tailTipShareOfLimb > 0.05,
      `${g.clip}: the tail should follow (${g.tailTipShareOfLimb.toFixed(3)})`);
  }
}
need(report.bellyTurn.plateRollRadians > 1.0,
  `Ability must roll the plate towards the threat (${report.bellyTurn.plateRollRadians.toFixed(3)} rad)`);
need(report.bellyTurn.returnsToRest < 0.05,
  `Ability must roll back (${report.bellyTurn.returnsToRest.toFixed(3)})`);
need(report.bellyTurn.plateRidesTheTrunk < 0.02,
  `Ability must not stretch the plate off the trunk (${report.bellyTurn.plateRidesTheTrunk.toFixed(4)})`);
{
  const s = (n) => report.strike.find((r) => r.clip === n);
  for (const n of ['Attack', 'Heavy']) {
    need(s(n).halfTravelInFractionOfClip < 0.4,
      `${n}: half the blow's travel must fall in a short window (${s(n).halfTravelInFractionOfClip.toFixed(3)})`);
    need(s(n).snoutReach > 0.2, `${n}: the blow must reach (${s(n).snoutReach.toFixed(3)})`);
    need(s(n).forwardReach > 0.15, `${n}: the bite is a forward strike (${s(n).forwardReach.toFixed(3)})`);
  }
  need(s('Heavy').snoutReach > s('Attack').snoutReach * 1.1,
    `Heavy must reach further than Attack (${s('Heavy').snoutReach.toFixed(3)} vs ${s('Attack').snoutReach.toFixed(3)})`);
}
for (const j of report.jaw) need(j.minRadians > -0.02, `${j.clip}: the jaw must not close past the bind pose`);
const jaw = (n) => report.jaw.find((j) => j.clip === n);
need(jaw('Bite').maxOpenRadians > 0.45, 'Bite must open the jaw wide');
need(jaw('Bite').mouthSocketTravelInSkullFrame > 0.08, 'the mouth socket must travel with the jaw');
for (const n of ['Attack', 'Heavy', 'Eat', 'Grab', 'Breath']) {
  need(jaw(n).maxOpenRadians > 0.1, `${n} must open the jaw`);
}
for (const n of ['Attack', 'Heavy']) {
  need(jaw(n).peakPhase > 0.2 && jaw(n).peakPhase < 0.7, `${n}: the gape must peak on the drive (${jaw(n).peakPhase})`);
}
// The belly turn is a defence, not a bite: the mouth stays shut and the head comes in.
need(jaw('Ability').maxOpenRadians < 0.15,
  `Ability must keep its mouth shut (${jaw('Ability').maxOpenRadians.toFixed(3)})`);
for (const name of ['Attack', 'Heavy', 'Bite']) {
  const row = report.anchorTravel.find((r) => r.clip === name);
  need(row.anchor_attack_primary > 0.02, `${name}: the attack anchor must travel (${row.anchor_attack_primary.toFixed(4)})`);
}
assert.equal(problems.join(' | '), '', 'measured performance checks');
console.log(JSON.stringify({
  models: report.models, clips: report.clips, twinTriangleFraction: report.twinTriangleFraction,
  rowing: report.rowing, bellyTurn: report.bellyTurn, strike: report.strike,
  jaw: report.jaw.filter((j) => ['Bite', 'Attack', 'Heavy', 'Ability', 'Breath', 'Idle'].includes(j.clip)),
  exactRigParity: true, exactAnimationParity: true,
}, null, 2));
