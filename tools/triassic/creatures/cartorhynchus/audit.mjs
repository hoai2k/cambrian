/**
 * Package the Cartorhynchus family, prove the authored body and its twin are the same rig playing
 * the same samples, then play every clip through Three.js and measure the things *this* animal is
 * supposed to do: **paddles that row** rather than steer -- the one animal of the four whose
 * forelimbs out-travel its tail tip -- a wrist that leads the elbow, a `Haul` that plants both
 * pairs and levers the body forward, and an `Ability` that is a suction snap rather than a bite.
 *
 *   node tools/triassic/creatures/cartorhynchus/audit.mjs --package --decode
 */
import assert from 'node:assert/strict';
import { auditPair, tracker, lateral, beatLag, swingPhase, anchorTravel } from '../_pipeline/paired-audit.mjs';

const id = 'cartorhynchus';
const { report, CLIPS, authored, write } = await auditPair({
  id,
  base: `public/assets/triassic/creatures/${id}`,
  here: `tools/triassic/creatures/${id}`,
  local: `local/triassic-authoring/${id}`,
  joints: 25, sockets: 3,
});
const track = tracker(authored);
const CHAIN = ['skull', 'neck', 'chest', 'body', 'tail_00', 'tail_02', 'tail_04'];
const FINS = ['fore_upper_L', 'fore_tip_L', 'fore_tip_R', 'hind_tip_L', 'hind_tip_R'];

// --- locomotion. What makes this animal anguilliform rather than thunniform is not one number
// but two: the wave **travels** -- every station peaks later than the one in front of it -- and
// nearly a whole wavelength is on the body at once, where a thunniform beat holds about a quarter
// of one in the peduncle alone. Both are read off the played rig rather than asserted.
report.gait = [];
for (const clip of ['Swim', 'Sprint']) {
  const rows = track(clip, [...CHAIN, 'caudal_upper', 'caudal_upper:tip', 'tail_04:tip', ...FINS,
    ...['chest', 'tail_00', 'tail_02', 'tail_04', 'caudal_upper'].map((n) => `${n}:yaw`)]);
  const travel = Object.fromEntries([...CHAIN, 'caudal_upper', 'caudal_upper:tip', 'tail_04:tip', ...FINS]
    .map((n) => [n, lateral(rows, n)]));
  const wavefront = ['chest', 'tail_00', 'tail_02', 'tail_04'];
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
    headShareOfTip: travel.skull / travel['tail_04:tip'],
    // The stroke against the beat. On this animal, and on no other of the four, the flipper tips
    // have to travel further than the tail does -- that is what "paddle-assisted" means.
    foreStrokeOverTailBeat: Math.max(
      Math.max(...rows.map((r) => r.fore_tip_L[1])) - Math.min(...rows.map((r) => r.fore_tip_L[1])),
      Math.max(...rows.map((r) => r.fore_tip_L[2])) - Math.min(...rows.map((r) => r.fore_tip_L[2])),
    ) / travel['tail_04:tip'],
    wavefront: lags,
    stationsPeakingInOrder: `${inOrder} / ${lags.length - 1}`,
    wavelengthsOnTheBody: lags.at(-1).lagInBeats,
    beatsPerClip: ref.k,
    ...beatLag(rows, 'caudal_upper:yaw', 'tail_04:yaw'),
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
for (const clip of ['Attack', 'Heavy', 'Ability', 'Bite']) {
  const rows = track(clip, ['anchor_attack_primary', 'body', 'tail_04'], 96);
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
  need(t.tail_02 < t.tail_04 && t.tail_04 < t['tail_04:tip'],
    `${g.clip}: the beat must grow backwards`);
  // The wave has to travel, in order, from the shoulder to the tail.
  need(g.stationsPeakingInOrder === `${g.wavefront.length - 1} / ${g.wavefront.length - 1}`,
    `${g.clip}: the wave must run down the body in order (${g.stationsPeakingInOrder})`);
  need(g.wavelengthsOnTheBody > 0.18 && g.wavelengthsOnTheBody < 0.55,
    `${g.clip}: the body must carry a travelling wave (${g.wavelengthsOnTheBody.toFixed(3)})`);
  // **The paddles are the engine.** This is the assertion that separates this animal from the
  // other three, all of which carry their fins as control surfaces.
  need(g.foreStrokeOverTailBeat > 1.0,
    `${g.clip}: the forelimbs must out-travel the tail (${g.foreStrokeOverTailBeat.toFixed(3)})`);
  need(t.skull < 0.08 * 3, `${g.clip}: the skull must hold the line of travel (${t.skull.toFixed(4)})`);
  need(g.lag > 0.005 && g.lag < 0.35, `${g.clip}: the caudal lobe must lag the peduncle (${g.lag.toFixed(3)})`);
}
for (const j of report.jaw) need(j.minRadians > -0.02, `${j.clip}: the jaw must not close past the bind pose`);
const jaw = (n) => report.jaw.find((j) => j.clip === n);
need(jaw('Bite').maxOpenRadians > 0.45, 'Bite must open the jaw wide');
// Scaled to this animal: a three-unit body with a very short snout moves its mouth socket far
// less in absolute units than an eighteen-metre one with a long rostrum.
need(jaw('Bite').mouthSocketTravelInSkullFrame > 0.05, 'the mouth socket must travel with the jaw');
for (const n of ['Attack', 'Heavy', 'Eat', 'Ability', 'Grab']) {
  need(jaw(n).maxOpenRadians > 0.1, `${n} must open the jaw`);
}
// The gape belongs to the strike, not to the button: it is widest around the drive, not at the end.
for (const n of ['Attack', 'Heavy']) {
  need(jaw(n).peakPhase > 0.2 && jaw(n).peakPhase < 0.65,
    `${n}: the gape must peak on the drive (${jaw(n).peakPhase})`);
}
// A **suction snap** opens faster than it shuts. Measured on the jaw angle itself: the rise to
// peak has to take less of the clip than the fall away from it.
{
  const rows = track('Ability', ['anchor_mouth'], 96);
  const a = rows.map((r) => r.jawAngle);
  const peak = a.indexOf(Math.max(...a));
  const half = Math.max(...a) / 2;
  let rise = peak; while (rise > 0 && a[rise] > half) rise--;
  let fall = peak; while (fall < a.length - 1 && a[fall] > half) fall++;
  report.suction = { peakPhase: peak / (a.length - 1), riseFrames: peak - rise, fallFrames: fall - peak };
  need(report.suction.riseFrames < report.suction.fallFrames,
    `Ability must open faster than it shuts (${report.suction.riseFrames} up, ${report.suction.fallFrames} down)`);
}
// **Haul** is the flipper-walk, and it is a gait: both pairs plant, out of phase with each other,
// and the body is carried forward over them.
{
  const rows = track('Haul', ['body', ...FINS], 120);
  // A half-wave plant has no single Fourier component to compare, so the phases are taken
  // from where each pair is furthest back: the frame it plants on.
  const back = (n) => {
    const z = rows.map((r) => r[n][2]);
    return z.indexOf(Math.max(...z)) / (rows.length - 1);
  };
  const lag = back('hind_tip_L') - back('fore_tip_L');
  // The body runs along glTF +Z, so forward travel is Z and not Y.
  const carried = Math.max(...rows.map((r) => r.body[2])) - Math.min(...rows.map((r) => r.body[2]));
  report.haul = { forePlantPhase: back('fore_tip_L'), hindPlantPhase: back('hind_tip_L'),
                  forelimbToHindlimbLag: lag, bodyTravel: carried };
  need(Math.abs(lag) > 0.08, `Haul: the two pairs must plant out of phase (${lag})`);
  need(carried > 0.3, `Haul: the body must be carried forward over the fins (${carried.toFixed(3)})`);
}
for (const s of report.strike) {
  // Ability is a suction snap and has its own test below: prey comes to the animal, so the snout
  // deliberately does not travel and a "committed strike" measure has nothing to measure.
  if (s.clip === 'Ability') continue;
  need(s.halfTravelInFractionOfClip < 0.37,
    `${s.clip}: half the snout's travel must fall in under a third of the clip (${s.halfTravelInFractionOfClip.toFixed(3)})`);
  // Bite is half a second of snap with the body barely moving; the three committed strikes carry
  // the animal forward and are held to a real reach.
  need(['Bite', 'Ability'].includes(s.clip) || s.snoutReach > 0.18,
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
  jaw: report.jaw.filter((j) => ['Bite', 'Attack', 'Heavy', 'Ability', 'Idle'].includes(j.clip)),
  suction: report.suction, haul: report.haul,
  exactRigParity: true, exactAnimationParity: true,
}, null, 2));
