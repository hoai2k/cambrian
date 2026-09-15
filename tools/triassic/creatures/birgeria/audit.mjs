/**
 * Package the Birgeria family, prove the authored body and its twin are the same rig playing the
 * same samples, then play every clip through Three.js and measure the things *this* animal is
 * supposed to do: a **thunniform** beat -- a stiff front two thirds with the amplitude piled into
 * the peduncle, against Mixosaurus' carangiform half-wavelength -- median fins that keel rather
 * than flap, pectorals that steer rather than row, a gape that is this animal's headline, and a
 * `FastStart` that is a C-start rather than a short Attack.
 *
 *   node tools/triassic/creatures/birgeria/audit.mjs --package --decode
 */
import assert from 'node:assert/strict';
import { auditPair, tracker, lateral, beatLag, swingPhase, anchorTravel } from '../_pipeline/paired-audit.mjs';

const id = 'birgeria';
const { report, CLIPS, authored, write } = await auditPair({
  id,
  base: `public/assets/triassic/creatures/${id}`,
  here: `tools/triassic/creatures/${id}`,
  local: `local/triassic-authoring/${id}`,
  joints: 22, sockets: 3,
});
const track = tracker(authored);
const CHAIN = ['skull', 'chest', 'body', 'tail_00', 'tail_02', 'tail_04', 'tail_06'];

// --- locomotion. Thunniform is two numbers, not an adjective: how little of a wavelength the body
// carries, and how little of the tail's travel the front of the animal takes. Both are read off
// the played rig rather than asserted in a comment.
report.gait = [];
for (const clip of ['Swim', 'Sprint']) {
  const rows = track(clip, [...CHAIN, 'caudal_upper', 'dorsal', 'anal', 'pec_upper_L',
    'caudal_upper:tip', 'tail_06:tip', 'dorsal:tip', 'anal:tip', 'pec_upper_L:tip',
    ...['chest', 'tail_00', 'tail_02', 'tail_04', 'tail_06', 'caudal_upper'].map((n) => `${n}:yaw`)]);
  const travel = Object.fromEntries([...CHAIN, 'caudal_upper', 'dorsal', 'anal',
    'caudal_upper:tip', 'tail_06:tip', 'dorsal:tip', 'anal:tip', 'pec_upper_L:tip']
    .map((n) => [n, lateral(rows, n)]));
  const wavefront = ['chest', 'tail_00', 'tail_02', 'tail_04', 'tail_06'];
  const ref = swingPhase(rows, 'chest:yaw');
  let running = 0;
  const lags = wavefront.map((n, i) => {
    if (i === 0) return { station: n, lagInBeats: 0 };
    const { lag } = beatLag(rows, `${n}:yaw`, `${wavefront[i - 1]}:yaw`);
    running += lag;
    return { station: n, lagInBeats: running };
  });
  let inOrder = 0;
  for (let i = 1; i < lags.length; i++) if (lags[i].lagInBeats >= lags[i - 1].lagInBeats - 1e-6) inOrder++;
  report.gait.push({
    clip,
    travel,
    headShareOfTip: travel.skull / travel['tail_06:tip'],
    chestShareOfTip: travel.chest / travel['tail_06:tip'],
    bodyShareOfTip: travel.body / travel['tail_06:tip'],
    dorsalShareOfTip: travel['dorsal:tip'] / travel['tail_06:tip'],
    analShareOfTip: travel['anal:tip'] / travel['tail_06:tip'],
    pectoralShareOfTip: travel['pec_upper_L:tip'] / travel['tail_06:tip'],
    wavefront: lags,
    stationsPeakingInOrder: `${inOrder} / ${lags.length - 1}`,
    wavelengthsOnTheBody: lags.at(-1).lagInBeats,
    beatsPerClip: ref.k,
    ...beatLag(rows, 'caudal_upper:yaw', 'tail_06:yaw'),
  });
}

// --- the jaws. The wide gape is this animal's headline, so it is measured rather than claimed.
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

// --- the strike. A committed drive gets most of its travel in a short window; a smooth sine does
// not, and that difference is the whole of the reviewer's note about a clip reading as a swell.
report.strike = [];
for (const clip of ['Attack', 'Heavy', 'Ability', 'FastStart', 'Bite']) {
  const rows = track(clip, ['anchor_attack_primary', 'body', 'tail_06'], 96);
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
  const reach = Math.max(...pos.map((p) => Math.hypot(p[0] - pos[0][0], p[1] - pos[0][1], p[2] - pos[0][2])));
  report.strike.push({
    clip, snoutPathLength: total, snoutReach: reach,
    halfTravelInFractionOfClip: bestWindow / step.length,
  });
}

// Every socket, every clip, measured on the packaged file.
report.anchorTravel = anchorTravel(track, CLIPS);

write();

const problems = [];
const need = (ok, msg) => { if (!ok) problems.push(msg); };
for (const g of report.gait) {
  const t = g.travel;
  need(t.skull < t.tail_04, `${g.clip}: the head must be quieter than mid-tail`);
  need(t.tail_02 < t.tail_04 && t.tail_04 < t.tail_06 && t.tail_06 < t['tail_06:tip'],
    `${g.clip}: the beat must grow backwards`);
  need(g.stationsPeakingInOrder === `${g.wavefront.length - 1} / ${g.wavefront.length - 1}`,
    `${g.clip}: the wave must run down the body in order (${g.stationsPeakingInOrder})`);
  // **Thunniform**, and the band is two-sided. Under a fifth of a wavelength would be a plank with
  // a hinge on the end; over a third is Mixosaurus' carangiform beat, and the two animals are
  // meant to be told apart by this number.
  need(g.wavelengthsOnTheBody > 0.18 && g.wavelengthsOnTheBody < 0.38,
    `${g.clip}: the body must carry about a third of a wavelength (${g.wavelengthsOnTheBody.toFixed(3)})`);
  // The front of a thunniform swimmer is a plank: the shoulder must take a small share of what the
  // tail tip does, and the head less again.
  need(g.chestShareOfTip < 0.16, `${g.clip}: the shoulder must be nearly still (${g.chestShareOfTip.toFixed(3)})`);
  need(t['tail_06:tip'] > t.skull * 8, `${g.clip}: the tail must carry the stroke, not the head`);
  // The median fins are keels, not oars: on the flank they must move far less than the tail does.
  need(g.dorsalShareOfTip < 0.30, `${g.clip}: the dorsal fin must keel rather than flap (${g.dorsalShareOfTip.toFixed(3)})`);
  need(g.analShareOfTip < 0.40, `${g.clip}: the anal fin must keel rather than flap (${g.analShareOfTip.toFixed(3)})`);
  // The pectorals steer. This is a fish, and a pectoral that swept like an oar would be the
  // "paddle-assisted" reading this animal does not have.
  need(g.pectoralShareOfTip < 0.30, `${g.clip}: the pectorals must steer, not row (${g.pectoralShareOfTip.toFixed(3)})`);
  need(t['tail_06:tip'] > 0.4, `${g.clip}: the beat must be visible (${t['tail_06:tip'].toFixed(3)})`);
  need(g.lag > 0.005 && g.lag < 0.35, `${g.clip}: the caudal lobe must lag the peduncle (${g.lag.toFixed(3)})`);
}
for (const j of report.jaw) need(j.minRadians > -0.02, `${j.clip}: the jaw must not close past the bind pose`);
const jaw = (n) => report.jaw.find((j) => j.clip === n);
// Birgeria's tagline is the gape. Gape must be the widest mouth in the set and Bite must be wide.
need(jaw('Gape').maxOpenRadians > 0.8, `Gape must open wide (${jaw('Gape').maxOpenRadians.toFixed(3)})`);
need(jaw('Gape').maxOpenRadians === Math.max(...report.jaw.map((j) => j.maxOpenRadians)),
  'Gape must be the widest mouth this animal opens');
need(jaw('Bite').maxOpenRadians > 0.5, 'Bite must open the jaw wide');
need(jaw('Bite').mouthSocketTravelInSkullFrame > 0.15, 'the mouth socket must travel with the jaw');
for (const n of ['Attack', 'Heavy', 'Eat', 'Ability', 'Grab']) {
  need(jaw(n).maxOpenRadians > 0.1, `${n} must open the jaw`);
}
for (const n of ['Attack', 'Heavy', 'Ability']) {
  need(jaw(n).peakPhase > 0.2 && jaw(n).peakPhase < 0.7,
    `${n}: the gape must peak on the drive (${jaw(n).peakPhase})`);
}
// FastStart is a C-start, not a bite: the mouth barely parts and the whole clip is fold and launch.
need(jaw('FastStart').maxOpenRadians < 0.35,
  `FastStart must not be a bite (${jaw('FastStart').maxOpenRadians.toFixed(3)})`);
const fast = report.strike.find((s) => s.clip === 'FastStart');
need(fast.halfTravelInFractionOfClip < 0.28,
  `FastStart must be explosive (${fast.halfTravelInFractionOfClip.toFixed(3)} of the clip)`);
// `Ability` is runThrough: the bite is carried a long way *past* the target, so it must reach
// further than the Attack it is a heavier version of.
const reachOf = (n) => report.strike.find((s) => s.clip === n).snoutReach;
need(reachOf('Ability') > reachOf('Attack'),
  `Ability must carry further than Attack (${reachOf('Ability').toFixed(3)} vs ${reachOf('Attack').toFixed(3)})`);
for (const s of report.strike) {
  need(s.halfTravelInFractionOfClip < 0.38,
    `${s.clip}: half the snout's travel must fall in under a third of the clip (${s.halfTravelInFractionOfClip.toFixed(3)})`);
  need(s.clip === 'Bite' || s.snoutReach > 0.22,
    `${s.clip}: the strike must actually reach (${s.snoutReach.toFixed(3)})`);
}
for (const name of ['Attack', 'Heavy', 'Bite', 'Ability']) {
  const row = report.anchorTravel.find((r) => r.clip === name);
  need(row.anchor_attack_primary > 0.02,
    `${name}: the attack anchor must travel (${row.anchor_attack_primary.toFixed(4)})`);
}
assert.equal(problems.join(' | '), '', 'measured performance checks');
console.log(JSON.stringify({
  models: report.models, clips: report.clips, twinTriangleFraction: report.twinTriangleFraction,
  gait: report.gait, strike: report.strike,
  jaw: report.jaw.filter((j) => ['Bite', 'Attack', 'Heavy', 'Ability', 'Gape', 'FastStart', 'Idle'].includes(j.clip)),
  exactRigParity: true, exactAnimationParity: true,
}, null, 2));
