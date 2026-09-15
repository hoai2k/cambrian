/**
 * Package the Archelon family, prove the authored body and its twin are the same rig playing the
 * same samples, then play every clip through Three.js and measure the two things this animal is
 * about: **two hydrofoil forelimbs doing the work over a shell that cannot bend**, and a beak whose
 * heavy attack is a crush rather than a snatch.
 *
 * The checks are the opposite way round from the fishes' — the tail must move *less* than the
 * flippers, not more — and there is one this era has not needed before: the carapace bone must
 * carry **no animation channel at all** in any clip, on every file in the family.
 *
 *   node tools/triassic/creatures/archelon/audit.mjs --package --decode
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import { auditPair, tracker, lateral, beatLag, anchorTravel } from '../_pipeline/paired-audit.mjs';

const id = 'archelon';
const base = `public/assets/triassic/creatures/${id}`;
const { report, CLIPS, authored, write } = await auditPair({
  id,
  base,
  here: `tools/triassic/creatures/${id}`,
  local: `local/triassic-authoring/${id}`,
  joints: 25, sockets: 3,
});
const track = tracker(authored);
const FORE = ['fore_upper_L', 'fore_upper_R'];
const HIND = ['hind_upper_L', 'hind_upper_R'];
const FORE_TIPS = FORE.map((n) => `${n.replace('upper', 'tip')}:tip`);
const HIND_TIPS = HIND.map((n) => `${n.replace('upper', 'tip')}:tip`);
const AXIS = ['skull', 'neck_01', 'neck_00', 'chest', 'body', 'shell', 'tail_00', 'tail_01'];

/** How far a named point travels vertically over a clip — the flight stroke is up and down. */
const vertical = (rows, n) => Math.max(...rows.map((r) => r[n][1])) - Math.min(...rows.map((r) => r[n][1]));

/** How much the separation of two bones varies over a clip: zero for a rigid relationship. */
function rigidity(rows, a, b) {
  const d = rows.map((r) => Math.hypot(r[a][0] - r[b][0], r[a][1] - r[b][1], r[a][2] - r[b][2]));
  return Math.max(...d) - Math.min(...d);
}

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

// --- **the carapace is rigid, and this is where that is a fact rather than an intention.**
// `T.patch_glb` drops root motion and scale from every body; forced sampling still writes a
// constant channel for a bone nobody keyed, and a constant channel is not an animation but it is
// also not nothing. The builder strips them; this proves they are gone in all three files.
{
  await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
  const rows = [];
  for (const suffix of ['', '.puppet', '.lod1']) {
    const d = await io.read(`${base}${suffix}.glb`);
    const joints = d.getRoot().listSkins()[0].listJoints().map((n) => n.getName());
    assert(joints.includes('shell'), 'the carapace bone must be in the skin');
    let channels = 0;
    for (const a of d.getRoot().listAnimations()) {
      for (const c of a.listChannels()) {
        if (['shell', 'root'].includes(c.getTargetNode().getName())) channels++;
      }
    }
    rows.push({ suffix: suffix || 'authored', shellOrRootChannels: channels });
    assert.equal(channels, 0, `${suffix || 'authored'}: the carapace must carry no channel`);
  }
  report.rigidCarapace = rows;
  report.rigidCarapaceNeverAnimated = true;
}

// --- locomotion. The forelimbs fly; the shell does not undulate and the tail does not drive.
report.flight = [];
for (const clip of ['Swim', 'Sprint']) {
  const rows = track(clip, [...AXIS, ...FORE_TIPS, ...HIND_TIPS,
    ...[...FORE, ...HIND].map((n) => `${n}:yaw`)]);
  const travel = Object.fromEntries([...AXIS, ...FORE_TIPS, ...HIND_TIPS].map((n) => [n, lateral(rows, n)]));
  const rise = Object.fromEntries(FORE_TIPS.map((n) => [n, vertical(rows, n)]));
  const tipRise = Math.max(...FORE_TIPS.map((n) => rise[n]));
  report.flight.push({
    clip,
    travel,
    forelimbTipRise: rise,
    /** The stroke is up and down: a flipper tip must rise and fall further than it slides. */
    riseOverSlide: Math.min(...FORE_TIPS.map((n) => rise[n] / Math.max(travel[n], 1e-6))),
    tailTipShareOfFlipper: travel['tail_01'] / tipRise,
    trunkShareOfFlipper: travel.body / tipRise,
    /**
     * The girdle is inside the shell and the shell is rigid, so neither may move **relative to the
     * trunk**. That is not a comparison of how far each travels: two bones rigidly fixed to each
     * other at different offsets sweep different distances the moment their parent rotates, and
     * reading it that way called a perfectly rigid shell 0.03 loose. What is constant under a rigid
     * relationship is the *separation*, so that is what is measured.
     */
    shoulderAgainstTrunk: rigidity(rows, 'chest', 'body'),
    shellAgainstTrunk: rigidity(rows, 'shell', 'body'),
    /** The hind pair steers in the forelimbs' wake rather than adding thrust. */
    hindTipRiseShareOfFore: Math.max(...HIND_TIPS.map((n) => vertical(rows, n))) / tipRise,
    ...beatLag(rows, 'hind_upper_L:yaw', 'fore_upper_L:yaw'),
  });
}

// --- the power stroke. Both forelimbs at once, and it has to carry the animal further than a beat.
{
  const rows = track('Ability', [...FORE_TIPS, 'body', 'chest'], 96);
  // Measured on the vertical, not the lateral: a mirrored pair moves in opposite x directions, so
  // two flippers beating in unison read as pi radians apart on the x component.
  const phases = FORE_TIPS.map((n) => verticalPhase(rows, n));
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

// --- the strike. Archelon's neck is short and its weapon is the beak, so what is measured here is
// the beak arriving, not a neck flying out.
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
  const open = angles.filter((a) => a > 0.2).length / angles.length;
  // The crush, as a number: how long the beak stays out at the far end of its travel. Archelon
  // bears down on an ammonite rather than snatching at one, so its heavy attack is a longer dwell
  // on the target than its light one, not a longer reach.
  const snout = track(clip, ['anchor_attack_primary'], 48).map((r) => r.anchor_attack_primary);
  const far = snout.map((p) => Math.hypot(p[0] - snout[0][0], p[1] - snout[0][1], p[2] - snout[0][2]));
  const peak = Math.max(...far);
  const dwell = peak > 1e-6 ? far.filter((d) => d > peak * 0.75).length / far.length : 0;
  const gapeTravel = Math.max(...rows.map((r) => Math.hypot(
    r.gape[0] - rows[0].gape[0], r.gape[1] - rows[0].gape[1], r.gape[2] - rows[0].gape[2])));
  report.jaw.push({
    clip,
    maxOpenRadians: Math.max(...angles),
    minRadians: Math.min(...angles),
    peakPhase: rows[angles.indexOf(Math.max(...angles))].phase,
    /** How much of the clip the beak spends closed on something — the crush, as a number. */
    fractionOfClipHeldOpen: open,
    fractionOfClipAtFullReach: dwell,
    mouthSocketTravelInSkullFrame: gapeTravel,
  });
}

report.anchorTravel = anchorTravel(track, CLIPS);
write();

const problems = [];
const need = (ok, msg) => { if (!ok) problems.push(msg); };
for (const g of report.flight) {
  need(g.tailTipShareOfFlipper < 0.45,
    `${g.clip}: the tail must not drive (${g.tailTipShareOfFlipper.toFixed(3)} of the flipper)`);
  need(g.trunkShareOfFlipper < 0.06,
    `${g.clip}: the shell is a box (${g.trunkShareOfFlipper.toFixed(4)})`);
  // The shoulder girdle is fused inside the carapace and the carapace is rigid: neither may move
  // relative to the trunk by anything at all.
  need(g.shoulderAgainstTrunk < 1e-6,
    `${g.clip}: the girdle is inside the shell (${g.shoulderAgainstTrunk.toExponential(2)})`);
  need(g.shellAgainstTrunk < 1e-6,
    `${g.clip}: the carapace is rigid (${g.shellAgainstTrunk.toExponential(2)})`);
  need(g.riseOverSlide > 1.2,
    `${g.clip}: the forelimb tips must rise and fall more than they slide (${g.riseOverSlide.toFixed(2)})`);
  need(Math.max(...Object.values(g.forelimbTipRise)) > 0.8,
    `${g.clip}: the stroke must be visible (${Math.max(...Object.values(g.forelimbTipRise)).toFixed(3)})`);
  // The hind pair steers rather than drives: it must move, and less than the forelimbs.
  need(g.hindTipRiseShareOfFore > 0.1 && g.hindTipRiseShareOfFore < 0.75,
    `${g.clip}: the hind pair steers behind the forelimbs (${g.hindTipRiseShareOfFore.toFixed(3)})`);
  need(Math.abs(g.lag) > 0.05 && Math.abs(g.lag) < 0.45,
    `${g.clip}: the hind pair must lag the fore (${g.lag.toFixed(3)})`);
}
need(report.powerStroke.flipperPhaseSpreadRadians < 0.5,
  `Ability must beat both forelimbs together (${report.powerStroke.flipperPhaseSpreadRadians.toFixed(3)} rad apart)`);
need(report.powerStroke.halfTravelInFractionOfClip < 0.34,
  `Ability must be a stroke, not a swell (${report.powerStroke.halfTravelInFractionOfClip.toFixed(3)})`);
need(report.powerStroke.bodyReach > 0.8,
  `Ability must carry the animal (${report.powerStroke.bodyReach.toFixed(3)})`);
for (const s of report.strike) {
  need(s.halfTravelInFractionOfClip < 0.40,
    `${s.clip}: half the beak's travel must fall in a short window (${s.halfTravelInFractionOfClip.toFixed(3)})`);
  need(s.clip === 'Bite' || s.snoutReach > 0.20, `${s.clip}: the strike must reach (${s.snoutReach.toFixed(3)})`);
}
// **Heavy is the crush, and that is a different shape rather than a bigger one.** Built from the
// same three ramps as Attack with the same numbers the two would be one clip under two names;
// Archelon does not snatch, so the difference is held time on the target and a wider bite, not
// more reach. Both halves are measured.
{
  const jawOf = (n) => report.jaw.find((j) => j.clip === n);
  need(jawOf('Heavy').fractionOfClipAtFullReach > jawOf('Attack').fractionOfClipAtFullReach * 1.25,
    `Heavy must hold the beak on the target longer than Attack (${jawOf('Heavy').fractionOfClipAtFullReach.toFixed(3)} vs ${jawOf('Attack').fractionOfClipAtFullReach.toFixed(3)})`);
  need(jawOf('Heavy').maxOpenRadians > jawOf('Attack').maxOpenRadians * 1.1,
    `Heavy must bite wider than Attack (${jawOf('Heavy').maxOpenRadians.toFixed(3)} vs ${jawOf('Attack').maxOpenRadians.toFixed(3)})`);
}
for (const j of report.jaw) need(j.minRadians > -0.02, `${j.clip}: the beak must not close past the bind pose`);
const jaw = (n) => report.jaw.find((j) => j.clip === n);
need(jaw('Bite').maxOpenRadians > 0.40, 'Bite must open the beak wide');
// A beak is short: the mouth socket sits 0.21 units in front of the hinge, so the arc it sweeps at
// a 0.46 rad gape is about a tenth of a unit. The floor is what that lever can actually deliver.
need(jaw('Bite').mouthSocketTravelInSkullFrame > 0.06, `the mouth socket must travel with the jaw (${jaw('Bite').mouthSocketTravelInSkullFrame.toFixed(3)})`);
for (const n of ['Attack', 'Heavy', 'Eat', 'Grab', 'Breath']) {
  need(jaw(n).maxOpenRadians > 0.1, `${n} must open the beak`);
}
for (const n of ['Attack', 'Heavy']) {
  need(jaw(n).peakPhase > 0.2 && jaw(n).peakPhase < 0.75, `${n}: the gape must peak on the drive (${jaw(n).peakPhase})`);
}
need(jaw('Ability').maxOpenRadians < 0.2,
  `Ability must keep its mouth shut (${jaw('Ability').maxOpenRadians.toFixed(3)})`);
for (const name of ['Attack', 'Heavy', 'Bite']) {
  const row = report.anchorTravel.find((r) => r.clip === name);
  need(row.anchor_attack_primary > 0.02, `${name}: the attack anchor must travel (${row.anchor_attack_primary.toFixed(4)})`);
}
assert.equal(problems.join(' | '), '', 'measured performance checks');
console.log(JSON.stringify({
  models: report.models, clips: report.clips, twinTriangleFraction: report.twinTriangleFraction,
  rigidCarapace: report.rigidCarapace, flight: report.flight, powerStroke: report.powerStroke,
  strike: report.strike,
  jaw: report.jaw.filter((j) => ['Bite', 'Attack', 'Heavy', 'Ability', 'Breath', 'Idle'].includes(j.clip)),
  exactRigParity: true, exactAnimationParity: true,
}, null, 2));
void fs;
