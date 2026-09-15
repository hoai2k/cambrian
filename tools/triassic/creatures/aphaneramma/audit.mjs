/**
 * Package the Aphaneramma family, prove the authored body and its twin are the same rig playing
 * the same samples, then play every clip through Three.js and measure the two things this animal
 * is about: an **anguilliform wave that grows towards the tail**, and **four limbs that actually
 * row** rather than hanging off it.
 *
 *   node tools/triassic/creatures/aphaneramma/audit.mjs --package --decode
 */
import assert from 'node:assert/strict';
import { auditPair, tracker, lateral, beatLag, swingPhase, anchorTravel } from '../_pipeline/paired-audit.mjs';

const id = 'aphaneramma';
const { report, CLIPS, authored, write } = await auditPair({
  id,
  base: `public/assets/triassic/creatures/${id}`,
  here: `tools/triassic/creatures/${id}`,
  local: `local/triassic-authoring/${id}`,
  joints: 26, sockets: 3,
});
const track = tracker(authored);

/** The angle, in degrees, between the tail's own chord (first tail joint to last) and the trunk's,
 *  at its worst phase over the clip. This is the number a swim clip's amplitude has to be tuned
 *  against, and it has to be taken from the joint **positions**: every bone in this rig rests with
 *  an identity rotation and its local +Y along the straight body axis, so a bone's own direction
 *  says nothing at all about the shape of the tail it sits in — measured that way a tail that
 *  visibly hooks reads 9 degrees. A per-joint rotation that looks small also sums down eight
 *  joints, and the rest curve the generation drew is added to all of it. */
function tailBend(rows, from, to, a, b) {
  const ang = (r) => {
    const t = [r[to][0] - r[from][0], r[to][1] - r[from][1], r[to][2] - r[from][2]];
    const s = [r[b][0] - r[a][0], r[b][1] - r[a][1], r[b][2] - r[a][2]];
    const dot = t[0] * s[0] + t[1] * s[1] + t[2] * s[2];
    const lt = Math.hypot(...t); const ls = Math.hypot(...s);
    return Math.acos(Math.max(-1, Math.min(1, dot / Math.max(lt * ls, 1e-9)))) * 180 / Math.PI;
  };
  return Math.max(...rows.map(ang));
}

const LIMBS = ['fore_upper_L', 'fore_upper_R', 'hind_upper_L', 'hind_upper_R'];
const TIPS = LIMBS.map((n) => `${n.replace('upper', 'foot')}:tip`);
/** Head to tail tip, in order, so a travelling wave can be read off the joints themselves. */
const AXIS = ['skull', 'neck_00', 'chest', 'body', 'tail_00', 'tail_02', 'tail_05', 'tail_07'];

// --- locomotion. The wave grows towards the tail, and the limbs row on the same beat.
report.wave = [];
for (const clip of ['Swim', 'Sprint']) {
  const rows = track(clip, [...AXIS, ...TIPS, ...LIMBS, ...AXIS.filter((n) => !n.includes(':')).map((n) => `${n}:yaw`),
    ...LIMBS.map((n) => `${n}:yaw`)]);
  const travel = Object.fromEntries([...AXIS, ...TIPS].map((n) => [n, lateral(rows, n)]));
  // An anguilliform swimmer's amplitude climbs monotonically from the shoulder back. Measured on
  // the joint angles rather than on world positions: the chain is rooted at mid-body, so the
  // joints in front of the pivot swing in antiphase with the ones behind it.
  const amp = Object.fromEntries(AXIS.filter((n) => !n.includes(':')).map((n) => [n, lateral(rows, `${n}:yaw`)]));
  const order = ['chest', 'body', 'tail_00', 'tail_02', 'tail_05', 'tail_07'];
  // **Growing tailward is a property of where the body goes, not of the numbers on the joints.**
  // It used to be read off the joint angles, and that is a different question with a different
  // answer: a caudal chain realising an even wave needs its first joint to turn hardest, because
  // that joint alone carries the tail off the trunk's own heading, so the angles dip at the second
  // joint while the tail's actual sweep goes on growing all the way back. The dip failed a check
  // about amplitude with a fact about levers. Measured where it is seen -- the world lateral sweep
  // of each caudal station -- the wave grows at every step.
  const carried = ['tail_00', 'tail_02', 'tail_05', 'tail_07'];
  let monotone = travel.tail_00 > 0.01;
  for (let i = 1; i < carried.length; i++) if (travel[carried[i]] < travel[carried[i - 1]] * 1.05) monotone = false;
  const phases = order.map((n) => swingPhase(rows, `${n}:yaw`));
  // **The channel is signed by side; the stroke is not.** A left limb and a right limb sweeping
  // backwards together carry *opposite* rotations about the body's long axis, because they point
  // opposite ways — so two limbs rowing in perfect unison read as half a cycle apart on the raw
  // yaw, which is the same trap Rhaeticosaurus' power stroke hit from the other end (four flippers
  // beating together read as pi apart on the lateral). The left limbs' sign is undone here, and
  // what is left is how far *back* each limb is, which is the thing a gait is a pattern of.
  for (const r of rows) {
    for (const n of LIMBS) r[`${n}:stroke`] = [r[`${n}:yaw`][0] * (n.endsWith('_L') ? -1 : 1), 0, 0];
  }
  report.wave.push({
    clip,
    travel,
    jointAmplitude: amp,
    amplitudeGrowsTailward: monotone,
    tailTipOverChest: travel.tail_07 / Math.max(travel.chest, 1e-6),
    worstTailChordToTrunkDegrees: tailBend(rows, 'tail_00', 'tail_07', 'chest', 'body'),
    limbTipTravel: Object.fromEntries(TIPS.map((n) => [n, travel[n]])),
    /** The diagonal couplet: a fore limb and the hind limb on the other side beat together... */
    ...beatLag(rows, 'hind_upper_R:stroke', 'fore_upper_L:stroke'),
    /** ...and the two limbs of one girdle are half a cycle apart. */
    girdleLag: beatLag(rows, 'fore_upper_R:stroke', 'fore_upper_L:stroke').lag,
    phaseOrder: phases.map((p) => p.phase),
  });
}

// --- the strike. The long rostrum is the weapon, and the heavy and the ability sweep it sideways.
report.strike = [];
for (const clip of ['Attack', 'Heavy', 'Ability', 'Bite']) {
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
  const spread = (k) => Math.max(...pos.map((p) => p[k])) - Math.min(...pos.map((p) => p[k]));
  const reachOf = (n) => Math.max(...rows.map((r) => Math.hypot(
    r[n][0] - rows[0][n][0], r[n][1] - rows[0][n][1], r[n][2] - rows[0][n][2])));
  report.strike.push({
    clip, snoutPathLength: total, snoutReach: reachOf('anchor_attack_primary'),
    skullReach: reachOf('skull'), chestReach: reachOf('chest'),
    /** How much of the snout's excursion is across the animal rather than along it. */
    lateralOverForward: spread(0) / Math.max(spread(2), 1e-6),
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
for (const g of report.wave) {
  // An anguilliform body: the wave grows all the way back, and the tail tip goes far further than
  // the shoulder. A body that swings evenly is a stiff plank with a tail on it.
  need(g.amplitudeGrowsTailward, `${g.clip}: the wave must grow towards the tail`);
  need(g.tailTipOverChest > 3.0,
    `${g.clip}: the tail must do the work (${g.tailTipOverChest.toFixed(2)}x the shoulder)`);
  // **And it must travel, not stand.** Every station's yaw has to lag the one in front of it, and
  // by enough to see: the shipped clip carried its lateral extreme only 0.19 of a cycle from the
  // first caudal joint to the last, which is a tail flapping about a hinge rather than a wave
  // running down a body, and is most of why that swim read as a waddle with the limbs doing the
  // work. Phases come back in radians, decreasing tailward.
  let walked = 0;
  for (let i = 1; i < g.phaseOrder.length; i++) {
    let d = g.phaseOrder[i - 1] - g.phaseOrder[i];
    while (d < 0) d += 2 * Math.PI;
    while (d > 2 * Math.PI) d -= 2 * Math.PI;
    need(d < Math.PI, `${g.clip}: the wave runs backwards at station ${i} (${(d / (2 * Math.PI)).toFixed(3)} of a cycle)`);
    walked += d;
  }
  need(walked / (2 * Math.PI) > 0.40,
    `${g.clip}: the wave barely travels (${(walked / (2 * Math.PI)).toFixed(3)} of a cycle from shoulder to tail tip)`);
  // **And the limbs must row.** A limbed swimmer's dash that only waggles the feet while the body
  // does the work reads as a fish with legs attached; the swept angle is measured in build.py from
  // each limb's own direction and this is the same finding in world travel.
  const tip = Math.max(...Object.values(g.limbTipTravel));
  need(tip > 0.45, `${g.clip}: the limbs must take a stroke (${tip.toFixed(3)})`);
  // The diagonal couplet: a fore limb and the opposite hind limb beat together, so the lag between
  // them is near zero and the lag to its own side's partner is half a cycle.
  need(Math.abs(g.lag) < 0.12,
    `${g.clip}: the diagonal couplet must beat together (${g.lag.toFixed(3)})`);
  need(Math.abs(g.girdleLag) > 0.38,
    `${g.clip}: the two limbs of a girdle must alternate (${g.girdleLag.toFixed(3)})`);
}
for (const s of report.strike) {
  need(s.halfTravelInFractionOfClip < 0.40,
    `${s.clip}: half the snout's travel must fall in a short window (${s.halfTravelInFractionOfClip.toFixed(3)})`);
  need(s.clip === 'Bite' || s.snoutReach > 0.25, `${s.clip}: the strike must reach (${s.snoutReach.toFixed(3)})`);
}
{
  // The side swipe is the animal's own named heavy and ability, so it has to *be* one: the snout
  // must go further across the animal than Attack's does, or the three clips are one clip.
  const lat = (n) => report.strike.find((s) => s.clip === n).lateralOverForward;
  need(lat('Heavy') > lat('Attack') * 1.5,
    `Heavy must sweep sideways where Attack goes forward (${lat('Heavy').toFixed(2)} vs ${lat('Attack').toFixed(2)})`);
  need(lat('Ability') > lat('Attack') * 1.5,
    `Ability must sweep sideways where Attack goes forward (${lat('Ability').toFixed(2)} vs ${lat('Attack').toFixed(2)})`);
  const reach = (n) => report.strike.find((s) => s.clip === n).snoutReach;
  need(reach('Ability') > reach('Attack') * 1.1,
    `Ability must reach further than Attack (${reach('Ability').toFixed(3)} vs ${reach('Attack').toFixed(3)})`);
}
for (const j of report.jaw) need(j.minRadians > -0.02, `${j.clip}: the jaw must not close past the bind pose`);
const jaw = (n) => report.jaw.find((j) => j.clip === n);
need(jaw('Bite').maxOpenRadians > 0.45, 'Bite must open the jaw wide');
need(jaw('Bite').mouthSocketTravelInSkullFrame > 0.12, 'the mouth socket must travel with the jaw');
for (const n of ['Attack', 'Heavy', 'Ability', 'Eat', 'Grab', 'Breath']) {
  need(jaw(n).maxOpenRadians > 0.1, `${n} must open the jaw`);
}
for (const n of ['Attack', 'Heavy', 'Ability']) {
  need(jaw(n).peakPhase > 0.2 && jaw(n).peakPhase < 0.8, `${n}: the gape must peak on the drive (${jaw(n).peakPhase})`);
}
// Crawl is the extra, not the locomotion, and the jaw stays shut through it.
need(jaw('Crawl').maxOpenRadians < 0.1, `Crawl must keep its mouth shut (${jaw('Crawl').maxOpenRadians.toFixed(3)})`);
for (const name of ['Attack', 'Heavy', 'Ability', 'Bite']) {
  const row = report.anchorTravel.find((r) => r.clip === name);
  need(row.anchor_attack_primary > 0.02, `${name}: the attack anchor must travel (${row.anchor_attack_primary.toFixed(4)})`);
}
assert.equal(problems.join(' | '), '', 'measured performance checks');
console.log(JSON.stringify({
  models: report.models, clips: report.clips, twinTriangleFraction: report.twinTriangleFraction,
  wave: report.wave.map((w) => ({ clip: w.clip, amplitudeGrowsTailward: w.amplitudeGrowsTailward, phaseOrder: w.phaseOrder,
    tailTipOverChest: w.tailTipOverChest, limbTipTravel: w.limbTipTravel, lag: w.lag })),
  strike: report.strike,
  jaw: report.jaw.filter((j) => ['Bite', 'Attack', 'Heavy', 'Ability', 'Crawl', 'Idle'].includes(j.clip)),
  exactRigParity: true, exactAnimationParity: true,
}, null, 2));
