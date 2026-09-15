/**
 * Package the Rhaeticosaurus family, prove the authored body and its twin are the same rig playing
 * the same samples, then play every clip through Three.js and measure the one thing this animal is
 * about: **four hydrofoils doing the work while the trunk holds still**. A plesiosaur's trunk is a
 * stiff box, so the checks here are the opposite way round from the fishes' — the tail must move
 * *less* than the flippers, not more — and `Ability` is a power stroke with all four in phase
 * rather than the alternating cruise.
 *
 *   node tools/triassic/creatures/rhaeticosaurus/audit.mjs --package --decode
 */
import assert from 'node:assert/strict';
import { auditPair, tracker, lateral, beatLag, swingPhase, anchorTravel } from '../_pipeline/paired-audit.mjs';

const id = 'rhaeticosaurus';
const { report, CLIPS, authored, write } = await auditPair({
  id,
  base: `public/assets/triassic/creatures/${id}`,
  here: `tools/triassic/creatures/${id}`,
  local: `local/triassic-authoring/${id}`,
  joints: 30, sockets: 3,
});
const track = tracker(authored);
const LIMBS = ['fore_upper_L', 'fore_upper_R', 'hind_upper_L', 'hind_upper_R'];
const TIPS = LIMBS.map((n) => `${n.replace('upper', 'tip')}:tip`);
const AXIS = ['skull', 'neck_02', 'neck_00', 'chest', 'body', 'tail_00', 'tail_02', 'tail_04'];

/** How far a named point travels vertically over a clip — the flight stroke is up and down. */
const vertical = (rows, n) => Math.max(...rows.map((r) => r[n][1])) - Math.min(...rows.map((r) => r[n][1]));

/** `swingPhase`, but on the vertical component, which is the axis a flight stroke lives on. */
function verticalPhase(rows, n) {
  const series = rows.slice(0, -1).map((r) => r[n][1]);
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

// --- locomotion. The flippers fly; the trunk does not undulate and the tail does not drive.
report.flight = [];
for (const clip of ['Swim', 'Sprint', 'Glide']) {
  const rows = track(clip, [...AXIS, ...TIPS, ...LIMBS,
    ...['fore_upper_L', 'fore_upper_R', 'hind_upper_L', 'hind_upper_R'].map((n) => `${n}:yaw`)]);
  const travel = Object.fromEntries([...AXIS, ...TIPS].map((n) => [n, lateral(rows, n)]));
  const rise = Object.fromEntries(TIPS.map((n) => [n, vertical(rows, n)]));
  const tipRise = Math.max(...TIPS.map((n) => rise[n]));
  report.flight.push({
    clip,
    travel,
    flipperTipRise: rise,
    /** The stroke is up and down: a flipper tip must rise and fall further than it slides sideways. */
    riseOverSlide: Math.min(...TIPS.map((n) => rise[n] / Math.max(travel[n], 1e-6))),
    tailTipShareOfFlipper: travel['tail_04'] / tipRise,
    trunkShareOfFlipper: travel.body / tipRise,
    chestShareOfFlipper: travel.chest / tipRise,
    /** Hind behind fore: the wake gait, measured rather than asserted. */
    ...beatLag(rows, 'hind_upper_L:yaw', 'fore_upper_L:yaw'),
  });
}

// --- the power stroke. All four at once, and it has to carry the animal further than a cruise beat.
{
  const rows = track('Ability', [...TIPS, 'body', 'chest'], 96);
  // **Measured on the vertical, not the lateral.** `swingPhase` reads the x component, and a
  // mirrored pair of flippers moves in opposite x directions — so four flippers beating in perfect
  // unison read as pi radians apart, which is the opposite of the finding. The flight stroke is up
  // and down, so that is the axis the phase is taken on.
  const phases = TIPS.map((n) => verticalPhase(rows, n));
  const spread = Math.max(...phases.map((p) => p.phase)) - Math.min(...phases.map((p) => p.phase));
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
  report.powerStroke = {
    flipperPhaseSpreadRadians: spread,
    bodyPathLength: total,
    bodyReach: Math.max(...pos.map((p) => Math.hypot(p[0] - pos[0][0], p[1] - pos[0][1], p[2] - pos[0][2]))),
    halfTravelInFractionOfClip: bestWindow / step.length,
  };
}

// --- the neck strike. The head is put on the prey by the neck, so the skull must travel further
// than the shoulder does on the attack clips, and it must do it in a short window.
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
for (const g of report.flight) {
  if (g.clip === 'Glide') {
    need(g.tailTipShareOfFlipper < 1.5, `${g.clip}: nothing should be driving`);
    continue;
  }
  // The flippers do the work. A tail tip that moves further than a flipper tip would be a fish
  // with legs attached, which is the reading this animal must not have.
  need(g.tailTipShareOfFlipper < 0.45,
    `${g.clip}: the tail must not drive (${g.tailTipShareOfFlipper.toFixed(3)} of the flipper)`);
  need(g.trunkShareOfFlipper < 0.05,
    `${g.clip}: the trunk is a stiff box (${g.trunkShareOfFlipper.toFixed(4)})`);
  need(g.chestShareOfFlipper < 0.12,
    `${g.clip}: the shoulder must hold still (${g.chestShareOfFlipper.toFixed(4)})`);
  // The stroke is up and down, which is what makes it flight rather than rowing.
  need(g.riseOverSlide > 1.2,
    `${g.clip}: the flipper tips must rise and fall more than they slide (${g.riseOverSlide.toFixed(2)})`);
  need(Math.max(...Object.values(g.flipperTipRise)) > 0.8,
    `${g.clip}: the stroke must be visible (${Math.max(...Object.values(g.flipperTipRise)).toFixed(3)})`);
  // The hind pair works in the fore pair's wake.
  need(Math.abs(g.lag) > 0.05 && Math.abs(g.lag) < 0.45,
    `${g.clip}: the hind pair must lag the fore (${g.lag.toFixed(3)})`);
}
// All four in phase on the power stroke, and it has to be explosive.
need(report.powerStroke.flipperPhaseSpreadRadians < 0.5,
  `Ability must beat all four flippers together (${report.powerStroke.flipperPhaseSpreadRadians.toFixed(3)} rad apart)`);
need(report.powerStroke.halfTravelInFractionOfClip < 0.34,
  `Ability must be a stroke, not a swell (${report.powerStroke.halfTravelInFractionOfClip.toFixed(3)})`);
need(report.powerStroke.bodyReach > 0.8,
  `Ability must carry the animal (${report.powerStroke.bodyReach.toFixed(3)})`);
for (const s of report.strike) {
  // The neck is what puts the head on the prey: the skull must out-travel the shoulder. Bite is
  // exempt and should be — it is half a second of snap with the head already where it needs to be,
  // and the whole animal simply lunges, so skull and shoulder travel together by construction.
  need(s.clip === 'Bite' || s.skullReach > s.chestReach * 1.5,
    `${s.clip}: the neck must deliver the head (skull ${s.skullReach.toFixed(3)} vs chest ${s.chestReach.toFixed(3)})`);
  need(s.halfTravelInFractionOfClip < 0.36,
    `${s.clip}: half the snout's travel must fall in a short window (${s.halfTravelInFractionOfClip.toFixed(3)})`);
  need(s.clip === 'Bite' || s.snoutReach > 0.25, `${s.clip}: the strike must reach (${s.snoutReach.toFixed(3)})`);
}
// Heavy is the snatch. Built from the same three shapes as Attack with the same numbers the two
// measured an identical reach, which is two names for one clip; the snatch takes the neck right out.
{
  const reachOf = (n) => report.strike.find((s) => s.clip === n).snoutReach;
  need(reachOf('Heavy') > reachOf('Attack') * 1.15,
    `Heavy must reach further than Attack (${reachOf('Heavy').toFixed(3)} vs ${reachOf('Attack').toFixed(3)})`);
}
for (const j of report.jaw) need(j.minRadians > -0.02, `${j.clip}: the jaw must not close past the bind pose`);
const jaw = (n) => report.jaw.find((j) => j.clip === n);
need(jaw('Bite').maxOpenRadians > 0.45, 'Bite must open the jaw wide');
need(jaw('Bite').mouthSocketTravelInSkullFrame > 0.12, 'the mouth socket must travel with the jaw');
for (const n of ['Attack', 'Heavy', 'Eat', 'Grab', 'Breath']) {
  need(jaw(n).maxOpenRadians > 0.1, `${n} must open the jaw`);
}
for (const n of ['Attack', 'Heavy']) {
  need(jaw(n).peakPhase > 0.2 && jaw(n).peakPhase < 0.7, `${n}: the gape must peak on the drive (${jaw(n).peakPhase})`);
}
// The power stroke is a dash, not a bite: the mouth stays shut through it.
need(jaw('Ability').maxOpenRadians < 0.2,
  `Ability must keep its mouth shut (${jaw('Ability').maxOpenRadians.toFixed(3)})`);
for (const name of ['Attack', 'Heavy', 'Bite']) {
  const row = report.anchorTravel.find((r) => r.clip === name);
  need(row.anchor_attack_primary > 0.02, `${name}: the attack anchor must travel (${row.anchor_attack_primary.toFixed(4)})`);
}
assert.equal(problems.join(' | '), '', 'measured performance checks');
console.log(JSON.stringify({
  models: report.models, clips: report.clips, twinTriangleFraction: report.twinTriangleFraction,
  flight: report.flight, powerStroke: report.powerStroke, strike: report.strike,
  jaw: report.jaw.filter((j) => ['Bite', 'Attack', 'Heavy', 'Ability', 'Breath', 'Idle'].includes(j.clip)),
  exactRigParity: true, exactAnimationParity: true,
}, null, 2));
