/**
 * Package the Cymbospondylus family, prove the authored body and its twin are the same rig playing
 * the same samples, then play every clip through Three.js and measure the things *this* animal is
 * supposed to do: an anguilliform wave that is already working at mid-body and runs down the chain
 * in order, a head held on the line of travel, caudal lobes that lag the peduncle, and an attack
 * that cocks, commits and follows through rather than swelling.
 *
 *   node tools/triassic/creatures/cymbospondylus/audit.mjs --package --decode
 */
import assert from 'node:assert/strict';
import { auditPair, tracker, lateral, beatLag, swingPhase, anchorTravel } from '../_pipeline/paired-audit.mjs';

const id = 'cymbospondylus';
const { report, CLIPS, authored, write } = await auditPair({
  id,
  base: `public/assets/triassic/creatures/${id}`,
  here: `tools/triassic/creatures/${id}`,
  local: `local/triassic-authoring/${id}`,
  joints: 29, sockets: 3,
});
const track = tracker(authored);
const CHAIN = ['skull', 'neck', 'chest', 'body', 'tail_00', 'tail_02', 'tail_04', 'tail_06', 'tail_08'];

// --- locomotion. What makes this animal anguilliform rather than thunniform is not one number
// but two: the wave **travels** -- every station peaks later than the one in front of it -- and
// nearly a whole wavelength is on the body at once, where a thunniform beat holds about a quarter
// of one in the peduncle alone. Both are read off the played rig rather than asserted.
report.gait = [];
for (const clip of ['Swim', 'Sprint']) {
  const rows = track(clip, [...CHAIN, 'caudal_upper', 'caudal_upper:tip', 'tail_08:tip',
    ...['chest', 'tail_00', 'tail_02', 'tail_04', 'tail_06', 'tail_08', 'caudal_upper'].map((n) => `${n}:yaw`)]);
  const travel = Object.fromEntries([...CHAIN, 'caudal_upper', 'caudal_upper:tip', 'tail_08:tip']
    .map((n) => [n, lateral(rows, n)]));
  const wavefront = ['chest', 'tail_00', 'tail_02', 'tail_04', 'tail_06', 'tail_08'];
  const ref = swingPhase(rows, 'chest:yaw');
  let running = 0;
  const lags = wavefront.map((n, i) => {
    if (i === 0) return { station: n, lagInBeats: 0 };
    // Accumulated station by station, so a lag that adds up past half a beat is not wrapped back
    // round: a whole wavelength on the body is exactly what is being measured.
    const { lag } = beatLag(rows, `${n}:yaw`, `${wavefront[i - 1]}:yaw`);
    running += lag;
    return { station: n, lagInBeats: running };
  });
  let inOrder = 0;
  for (let i = 1; i < lags.length; i++) if (lags[i].lagInBeats >= lags[i - 1].lagInBeats - 1e-6) inOrder++;
  report.gait.push({
    clip,
    travel,
    headShareOfTip: travel.skull / travel['tail_08:tip'],
    wavefront: lags,
    stationsPeakingInOrder: `${inOrder} / ${lags.length - 1}`,
    wavelengthsOnTheBody: lags.at(-1).lagInBeats,
    beatsPerClip: ref.k,
    ...beatLag(rows, 'caudal_upper:yaw', 'tail_08:yaw'),
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

// --- the strike. A committed drive gets most of its travel in a short window; a smooth sine does
// not, and that difference is the whole of the reviewer's note about a clip reading as a swell.
report.strike = [];
for (const clip of ['Attack', 'Heavy', 'Lunge', 'Bite']) {
  const rows = track(clip, ['anchor_attack_primary', 'body', 'tail_08'], 96);
  const pos = rows.map((r) => r.anchor_attack_primary);
  const step = pos.slice(1).map((p, i) => Math.hypot(p[0] - pos[i][0], p[1] - pos[i][1], p[2] - pos[i][2]));
  const total = step.reduce((a, b) => a + b, 0);
  // the shortest run of consecutive frames that carries half of all the snout's travel
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
  need(t.tail_02 < t.tail_04 && t.tail_04 < t.tail_06 && t.tail_06 < t['tail_08:tip'],
    `${g.clip}: the beat must grow backwards`);
  need(t['tail_08:tip'] > t.skull * 6, `${g.clip}: the tail must carry the stroke, not the head`);
  // The wave has to travel, in order, from the shoulder to the tail.
  need(g.stationsPeakingInOrder === `${g.wavefront.length - 1} / ${g.wavefront.length - 1}`,
    `${g.clip}: the wave must run down the body in order (${g.stationsPeakingInOrder})`);
  // Anguilliform, not thunniform: most of a wavelength lives on the body at once.
  need(g.wavelengthsOnTheBody > 0.55,
    `${g.clip}: the body must carry most of a wavelength (${g.wavelengthsOnTheBody.toFixed(3)})`);
  need(t['tail_08:tip'] > 0.6, `${g.clip}: the beat must be visible (${t['tail_08:tip'].toFixed(3)})`);
  need(t.skull < 0.06 * 6, `${g.clip}: the skull must hold the line of travel (${t.skull.toFixed(4)})`);
  need(g.lag > 0.005 && g.lag < 0.35, `${g.clip}: the caudal lobe must lag the peduncle (${g.lag.toFixed(3)})`);
}
for (const j of report.jaw) need(j.minRadians > -0.02, `${j.clip}: the jaw must not close past the bind pose`);
const jaw = (n) => report.jaw.find((j) => j.clip === n);
need(jaw('Bite').maxOpenRadians > 0.45, 'Bite must open the jaw wide');
need(jaw('Bite').mouthSocketTravelInSkullFrame > 0.15, 'the mouth socket must travel with the jaw');
for (const n of ['Attack', 'Heavy', 'Lunge', 'Eat', 'Ability', 'Grab']) {
  need(jaw(n).maxOpenRadians > 0.1, `${n} must open the jaw`);
}
// The gape belongs to the strike, not to the button: it is widest around the drive, not at the end.
for (const n of ['Attack', 'Heavy', 'Lunge']) {
  need(jaw(n).peakPhase > 0.2 && jaw(n).peakPhase < 0.65,
    `${n}: the gape must peak on the drive (${jaw(n).peakPhase})`);
}
for (const s of report.strike) {
  need(s.halfTravelInFractionOfClip < 0.34,
    `${s.clip}: half the snout's travel must fall in under a third of the clip (${s.halfTravelInFractionOfClip.toFixed(3)})`);
  // Bite is half a second of snap with the body barely moving; the three committed strikes carry
  // the animal forward and are held to a real reach.
  need(s.clip === 'Bite' || s.snoutReach > 0.35,
    `${s.clip}: the strike must actually reach (${s.snoutReach.toFixed(3)})`);
}
for (const name of ['Attack', 'Heavy', 'Bite']) {
  const row = report.anchorTravel.find((r) => r.clip === name);
  need(row.anchor_attack_primary > 0.02,
    `${name}: the attack anchor must travel (${row.anchor_attack_primary.toFixed(4)})`);
}
assert.equal(problems.join(' | '), '', 'measured performance checks');
console.log(JSON.stringify({
  models: report.models, clips: report.clips, twinTriangleFraction: report.twinTriangleFraction,
  gait: report.gait, strike: report.strike,
  jaw: report.jaw.filter((j) => ['Bite', 'Attack', 'Heavy', 'Lunge', 'Ability', 'Idle'].includes(j.clip)),
  exactRigParity: true, exactAnimationParity: true,
}, null, 2));
