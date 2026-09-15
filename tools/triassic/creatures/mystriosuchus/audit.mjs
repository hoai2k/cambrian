/**
 * Package the Mystriosuchus family, prove the authored body and its twin are the same rig playing
 * the same samples, then play every clip through Three.js and measure the two things this animal
 * is about.
 *
 * It is a **shore animal** (`shore: true`), so the questions are not a swimmer's. Its declared
 * locomotion is `Crawl` and that is where its limbs have to do the work; the four clips the
 * simulation drives its post with — `Lower`, `SnapLeft`, `SnapRight`, `Retract` — have to be timed
 * to `src/sim/triassic/shore.ts`'s own clock and the two snaps have to go to *opposite* sides,
 * which is a thing a builder can get backwards invisibly (the shore pass already shipped a strike
 * that named the wrong side, and no check saw it because the hit lands either way).
 *
 *   node tools/triassic/creatures/mystriosuchus/audit.mjs --package --decode
 */
import assert from 'node:assert/strict';
import { auditPair, tracker, lateral, beatLag, anchorTravel } from '../_pipeline/paired-audit.mjs';

const id = 'mystriosuchus';
const { report, CLIPS, authored, write } = await auditPair({
  id,
  base: `public/assets/triassic/creatures/${id}`,
  here: `tools/triassic/creatures/${id}`,
  local: `local/triassic-authoring/${id}`,
  joints: 28, sockets: 3,
});
const track = tracker(authored);
const LIMBS = ['fore_upper_L', 'fore_upper_R', 'hind_upper_L', 'hind_upper_R'];
const TIPS = LIMBS.map((n) => `${n.replace('upper', 'foot')}:tip`);
const AXIS = ['skull', 'neck_00', 'chest', 'thorax', 'body', 'lumbar', 'tail_00', 'tail_02', 'tail_05', 'tail_07'];

// --- the gaits. Crawl is the locomotion; Swim and Sprint are a tail scull with the limbs trailed.
report.gait = [];
for (const clip of ['Crawl', 'Swim', 'Sprint']) {
  const rows = track(clip, [...AXIS, ...TIPS, ...LIMBS, ...AXIS.map((n) => `${n}:yaw`),
    ...LIMBS.map((n) => `${n}:yaw`), 'thorax:yaw', 'lumbar:yaw', 'tail_05:yaw']);
  // The channel is signed by side and the stroke is not: two limbs sweeping backwards together
  // carry opposite rotations about the body's long axis.
  for (const r of rows) {
    for (const n of LIMBS) r[`${n}:stroke`] = [r[`${n}:yaw`][0] * (n.endsWith('_L') ? -1 : 1), 0, 0];
  }
  const travel = Object.fromEntries([...AXIS, ...TIPS].map((n) => [n, lateral(rows, n)]));
  report.gait.push({
    clip,
    travel,
    tailTipOverChest: travel.tail_07 / Math.max(travel.chest, 1e-6),
    /** The armoured trunk's own bend, against the tail's, measured on the joint angles: a bone's
     *  head does not move when the bone rotates, so world travel would read the trunk as frozen
     *  whatever it did. */
    trunkBendOverTailBend: Math.max(lateral(rows, 'thorax:yaw'), lateral(rows, 'lumbar:yaw'))
      / Math.max(lateral(rows, 'tail_05:yaw'), 1e-6),
    limbTipTravel: Object.fromEntries(TIPS.map((n) => [n, travel[n]])),
    /** The diagonal couplet, the gait of every sprawling tetrapod on land and in the water. */
    ...beatLag(rows, 'hind_upper_R:stroke', 'fore_upper_L:stroke'),
    girdleLag: beatLag(rows, 'fore_upper_R:stroke', 'fore_upper_L:stroke').lag,
  });
}

// --- the shore performance. Timed to the mechanic, and the two snaps go opposite ways.
report.shore = [];
for (const clip of ['Lower', 'SnapLeft', 'SnapRight', 'Retract']) {
  const rows = track(clip, ['skull', 'anchor_mouth', 'chest', 'body'], 60);
  const sk = rows.map((r) => r.skull);
  const rest = sk[0];
  const drop = Math.min(...sk.map((p) => p[1])) - rest[1];
  const side = sk.reduce((a, p) => (Math.abs(p[0] - rest[0]) > Math.abs(a) ? p[0] - rest[0] : a), 0);
  report.shore.push({
    clip,
    duration: authored.gltf.animations.find((a) => a.name === clip).duration,
    headDrop: drop,
    headLateralSigned: side,
    reach: Math.max(...rows.map((r) => Math.hypot(
      r.anchor_mouth[0] - rows[0].anchor_mouth[0], r.anchor_mouth[1] - rows[0].anchor_mouth[1],
      r.anchor_mouth[2] - rows[0].anchor_mouth[2]))),
  });
}

// --- the surface lunge. The heavy and the ability are a straight-line charge driven by the tail.
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
    forwardOverLateral: spread(2) / Math.max(spread(0), 1e-6),
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
const gait = (n) => report.gait.find((g) => g.clip === n);
// **Crawl is the locomotion, so Crawl is where the limbs must carry the animal.** This is the era's
// "a limbed swimmer's dash has to paddle" rule applied to the animal the codebase declares: a
// shore animal, whose land motion is its primary.
{
  const g = gait('Crawl');
  const tip = Math.min(...Object.values(g.limbTipTravel));
  need(tip > 0.9, `Crawl: every limb must take a stride (${tip.toFixed(3)})`);
  need(Math.abs(g.lag) < 0.12, `Crawl: the diagonal couplet must move together (${g.lag.toFixed(3)})`);
  need(Math.abs(g.girdleLag) > 0.38, `Crawl: a girdle's two limbs must alternate (${g.girdleLag.toFixed(3)})`);
}
for (const clip of ['Swim', 'Sprint']) {
  const g = gait(clip);
  // In the water the tail is the engine and the armoured trunk is stiff. A crocodile-shaped
  // ambusher that rowed with its legs would be the wrong animal.
  need(g.tailTipOverChest > 3.0,
    `${clip}: the tail must drive (${g.tailTipOverChest.toFixed(2)}x the shoulder)`);
  need(g.trunkBendOverTailBend < 0.25,
    `${clip}: the armoured trunk must stay stiff (${g.trunkBendOverTailBend.toFixed(3)})`);
  // ...but the limbs must not be frozen either.
  const tip = Math.min(...Object.values(g.limbTipTravel));
  need(tip > 0.15, `${clip}: the limbs must not be frozen (${tip.toFixed(3)})`);
}
// The shore performance, against src/sim/triassic/shore.ts.
{
  const s = (n) => report.shore.find((r) => r.clip === n);
  const close = (a, b) => Math.abs(a - b) < 0.02;
  need(close(s('Lower').duration, 1.5), `Lower must run TELEGRAPH (${s('Lower').duration})`);
  need(close(s('SnapLeft').duration, 0.6), `SnapLeft must run the strike window (${s('SnapLeft').duration})`);
  need(close(s('SnapRight').duration, 0.6), `SnapRight must run the strike window (${s('SnapRight').duration})`);
  need(close(s('Retract').duration, 0.9), `Retract must run RECOVER (${s('Retract').duration})`);
  need(s('Lower').headDrop < -0.15, `Lower must put the head down (${s('Lower').headDrop.toFixed(3)})`);
  // **The two snaps must go opposite ways.** The shore pass already shipped a strike that named
  // the wrong side, invisible to every check because the hit lands either way.
  need(s('SnapLeft').headLateralSigned * s('SnapRight').headLateralSigned < 0,
    `the two snaps must swing to opposite sides (${s('SnapLeft').headLateralSigned.toFixed(3)} vs ${s('SnapRight').headLateralSigned.toFixed(3)})`);
  for (const n of ['SnapLeft', 'SnapRight']) {
    need(s(n).reach > 0.4, `${n} must reach into the water (${s(n).reach.toFixed(3)})`);
  }
}
for (const s of report.strike) {
  need(s.halfTravelInFractionOfClip < 0.40,
    `${s.clip}: half the snout's travel must fall in a short window (${s.halfTravelInFractionOfClip.toFixed(3)})`);
  need(s.clip === 'Bite' || s.snoutReach > 0.25, `${s.clip}: the strike must reach (${s.snoutReach.toFixed(3)})`);
  // The surface lunge is a charge, not a sweep: it goes forward.
  need(s.clip === 'Bite' || s.forwardOverLateral > 1.5,
    `${s.clip}: the lunge must go forward (${s.forwardOverLateral.toFixed(2)})`);
}
{
  const reach = (n) => report.strike.find((s) => s.clip === n).snoutReach;
  need(reach('Ability') > reach('Attack') * 1.3,
    `Ability is the surface lunge and must out-reach Attack (${reach('Ability').toFixed(3)} vs ${reach('Attack').toFixed(3)})`);
  need(reach('Heavy') > reach('Attack') * 1.15,
    `Heavy must out-reach Attack (${reach('Heavy').toFixed(3)} vs ${reach('Attack').toFixed(3)})`);
}
for (const j of report.jaw) need(j.minRadians > -0.02, `${j.clip}: the jaw must not close past the bind pose`);
const jaw = (n) => report.jaw.find((j) => j.clip === n);
need(jaw('Bite').maxOpenRadians > 0.45, 'Bite must open the jaw wide');
need(jaw('Bite').mouthSocketTravelInSkullFrame > 0.12, 'the mouth socket must travel with the jaw');
for (const n of ['Attack', 'Heavy', 'Ability', 'Eat', 'Grab', 'Breath', 'Lower', 'SnapLeft', 'SnapRight']) {
  need(jaw(n).maxOpenRadians > 0.1, `${n} must open the jaw`);
}
need(jaw('Crawl').maxOpenRadians < 0.1, `Crawl must keep its mouth shut (${jaw('Crawl').maxOpenRadians.toFixed(3)})`);
for (const name of ['Attack', 'Heavy', 'Ability', 'Bite', 'SnapLeft', 'SnapRight']) {
  const row = report.anchorTravel.find((r) => r.clip === name);
  need(row.anchor_attack_primary > 0.02, `${name}: the attack anchor must travel (${row.anchor_attack_primary.toFixed(4)})`);
}
assert.equal(problems.join(' | '), '', 'measured performance checks');
console.log(JSON.stringify({
  models: report.models, clips: report.clips, twinTriangleFraction: report.twinTriangleFraction,
  gait: report.gait.map((g) => ({ clip: g.clip, tailTipOverChest: g.tailTipOverChest,
    trunkBendOverTailBend: g.trunkBendOverTailBend, limbTipTravel: g.limbTipTravel, lag: g.lag })),
  shore: report.shore, strike: report.strike,
  jaw: report.jaw.filter((j) => ['Bite', 'Attack', 'Heavy', 'Ability', 'Crawl', 'Lower', 'SnapLeft', 'Idle'].includes(j.clip)),
  exactRigParity: true, exactAnimationParity: true,
}, null, 2));
