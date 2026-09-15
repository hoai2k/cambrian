/**
 * Package the Atopodentatus family, prove the authored body and its twin are the same rig playing
 * the same samples, then play every clip through Three.js and measure the two things this animal
 * is about: **four paddles rowing** and **a bar swung sideways**.
 *
 * The locomotion checks are deliberately the opposite way round from Rhaeticosaurus'. That animal
 * flies: its trunk is a stiff box, its tail must not drive, and a flipper tip has to rise and fall
 * further than it slides. This one rows. The stroke is fore and aft, so a paddle tip must slide
 * further than it rises; the two sides alternate rather than beating together; and the long tail is
 * *allowed* to carry a share of the cruise, because a bottom-grazing paddler with sixty caudals
 * that held its tail rigid would read as a plesiosaur with the wrong outline.
 *
 *   node tools/triassic/creatures/atopodentatus/audit.mjs --package --decode
 */
import assert from 'node:assert/strict';
import { auditPair, tracker, lateral, anchorTravel } from '../_pipeline/paired-audit.mjs';

const id = 'atopodentatus';
const { report, CLIPS, authored, write } = await auditPair({
  id,
  base: `public/assets/triassic/creatures/${id}`,
  here: `tools/triassic/creatures/${id}`,
  local: `local/triassic-authoring/${id}`,
  joints: 30, sockets: 3,
});
const track = tracker(authored);
const LIMBS = ['fore_upper_L', 'fore_upper_R', 'hind_upper_L', 'hind_upper_R'];
/**
 * **The blade tip is a bone head, not a `:tip` probe, and on a rower that distinction decides the
 * answer.** `name:tip` asks for a point 0.8 along the bone's own local +Y, and every bone in these
 * rigs rests pointing along the *body* axis rather than along the limb it belongs to -- so for a
 * paddle that probe is a lever sticking out fore-and-aft from the blade, and a rotation that sweeps
 * the blade backwards moves it sideways. Measured that way the row read as a rise. `fore_tip_L`'s
 * own head sits 78 % of the way out along the blade and is a real point on the animal.
 */
const TIPS = LIMBS.map((n) => n.replace('upper', 'tip'));
const AXIS = ['skull', 'neck_00', 'chest', 'body', 'tail_00', 'tail_02', 'tail_05'];

/** How far a named point travels vertically over a clip. */
const vertical = (rows, n) => Math.max(...rows.map((r) => r[n][1])) - Math.min(...rows.map((r) => r[n][1]));
/** How far it travels along the body's own long axis, which after export is glTF z. */
const along = (rows, n) => Math.max(...rows.map((r) => r[n][2])) - Math.min(...rows.map((r) => r[n][2]));

/**
 * The phase of a point's swing on one chosen component. `swingPhase` in the kit reads x, which is
 * the right axis for a tail beat and the wrong one for a row: a rowing paddle's stroke is along the
 * body, so the series that carries the gait is z.
 */
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

/** How far behind `b` the point `a` swings on `axis`, in fractions of one beat, signed. */
function lagOn(rows, a, b, axis) {
  const pa = phaseOn(rows, a, axis); const pb = phaseOn(rows, b, axis);
  if (pa.k !== pb.k) return NaN;
  let lag = (pb.phase - pa.phase) / (2 * Math.PI);
  while (lag <= -0.5) lag += 1;
  while (lag > 0.5) lag -= 1;
  return lag;
}

// --- locomotion. The paddles row, the two sides alternate, and the tail helps.
report.rowing = [];
for (const clip of ['Swim', 'Sprint', 'Idle']) {
  const rows = track(clip, [...AXIS, ...TIPS, ...LIMBS]);
  const travel = Object.fromEntries([...AXIS, ...TIPS].map((n) => [n, lateral(rows, n)]));
  const slide = Object.fromEntries(TIPS.map((n) => [n, along(rows, n)]));
  const rise = Object.fromEntries(TIPS.map((n) => [n, vertical(rows, n)]));
  const stroke = Math.max(...TIPS.map((n) => slide[n]));
  report.rowing.push({
    clip,
    travel,
    paddleTipStroke: slide,
    paddleTipRise: rise,
    /** A row is fore and aft: a paddle tip must slide along the body further than it rises. */
    slideOverRise: Math.min(...TIPS.map((n) => slide[n] / Math.max(rise[n], 1e-6))),
    tailTipShareOfPaddle: travel.tail_05 / stroke,
    trunkShareOfPaddle: travel.body / stroke,
    /**
     * Left against right on the same girdle, measured on the stroke's own axis. A mirrored pair
     * given the *same* joint angle moves in opposite directions along the body, so reading the
     * lag off the joint channel says the two sides are in perfect unison exactly when they are
     * perfectly opposed -- the same trap Rhaeticosaurus' power stroke records, one axis over.
     */
    lag: lagOn(rows, 'fore_tip_L', 'fore_tip_R', 2),
    hindBehindFore: lagOn(rows, 'hind_tip_L', 'fore_tip_L', 2),
  });
}

// --- the hammer sweep. Heavy is a bar swung sideways, so the blow is lateral rather than forward,
// and it has to out-reach the forward strike the same animal's Attack makes.
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
    lateralSwing: lateral(rows, 'anchor_attack_primary'),
    forwardReach: along(rows, 'anchor_attack_primary'),
    skullReach: reachOf('skull'), chestReach: reachOf('chest'),
    halfTravelInFractionOfClip: bestWindow / step.length,
  });
}

// --- the graze. `Ability` is scrapeSieve, a held loop: the head works side to side along the floor
// while the body stays put, which is the opposite shape from a dash.
{
  const rows = track('Ability', ['anchor_mouth', 'skull', 'body'], 96);
  report.graze = {
    headSwing: lateral(rows, 'anchor_mouth'),
    bodySwing: lateral(rows, 'body'),
    bodyDrift: Math.max(...rows.map((r) => Math.hypot(
      r.body[0] - rows[0].body[0], r.body[1] - rows[0].body[1], r.body[2] - rows[0].body[2]))),
    headBelowBody: Math.min(...rows.map((r) => r.anchor_mouth[1] - r.body[1])),
  };
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
  // The paddles do the work, and the stroke is fore and aft.
  need(g.slideOverRise > 1.2,
    `${g.clip}: the paddle tips must slide further than they rise (${g.slideOverRise.toFixed(2)})`);
  if (g.clip !== 'Idle') {
    need(Math.max(...Object.values(g.paddleTipStroke)) > 0.8,
      `${g.clip}: the stroke must be visible (${Math.max(...Object.values(g.paddleTipStroke)).toFixed(3)})`);
    // A rower alternates: left and right on one girdle are half a beat apart.
    need(Math.abs(g.lag) > 0.35,
      `${g.clip}: the two sides must alternate (${g.lag.toFixed(3)} of a beat)`);
    // The tail helps and does not take over. A grazer with sixty caudals is not a stiff box, but
    // the dash is still the paddles'.
    need(g.tailTipShareOfPaddle > 0.08 && g.tailTipShareOfPaddle < 1.1,
      `${g.clip}: the tail should help without taking over (${g.tailTipShareOfPaddle.toFixed(3)})`);
    need(g.trunkShareOfPaddle < 0.2,
      `${g.clip}: the trunk must not wag (${g.trunkShareOfPaddle.toFixed(4)})`);
  }
}
{
  const s = (n) => report.strike.find((r) => r.clip === n);
  // The hammer is a sideways blow with the bar. It has to swing across further than it reaches
  // forward, and further across than the forward strike does.
  need(s('Heavy').lateralSwing > s('Heavy').forwardReach,
    `Heavy must swing across rather than forward (${s('Heavy').lateralSwing.toFixed(3)} vs ${s('Heavy').forwardReach.toFixed(3)})`);
  need(s('Heavy').lateralSwing > s('Attack').lateralSwing * 1.5,
    `Heavy must be the sweep and Attack the strike (${s('Heavy').lateralSwing.toFixed(3)} vs ${s('Attack').lateralSwing.toFixed(3)})`);
  need(s('Attack').forwardReach > s('Attack').lateralSwing,
    `Attack must be a forward strike (${s('Attack').forwardReach.toFixed(3)} vs ${s('Attack').lateralSwing.toFixed(3)})`);
  for (const n of ['Attack', 'Heavy']) {
    need(s(n).halfTravelInFractionOfClip < 0.4,
      `${n}: half the blow's travel must fall in a short window (${s(n).halfTravelInFractionOfClip.toFixed(3)})`);
    need(s(n).snoutReach > 0.25, `${n}: the blow must reach (${s(n).snoutReach.toFixed(3)})`);
  }
}
// The graze is a held loop over one spot, not a swim.
need(report.graze.headSwing > 0.3, `Ability must work the head along the floor (${report.graze.headSwing.toFixed(3)})`);
need(report.graze.headSwing > report.graze.bodySwing * 2,
  `Ability must move the head, not the animal (${report.graze.headSwing.toFixed(3)} vs ${report.graze.bodySwing.toFixed(3)})`);
need(report.graze.headBelowBody < 0, 'Ability must put the mouth below the body');

for (const j of report.jaw) need(j.minRadians > -0.02, `${j.clip}: the jaw must not close past the bind pose`);
const jaw = (n) => report.jaw.find((j) => j.clip === n);
need(jaw('Bite').maxOpenRadians > 0.45, 'Bite must open the jaw wide');
need(jaw('Bite').mouthSocketTravelInSkullFrame > 0.12, 'the mouth socket must travel with the jaw');
for (const n of ['Attack', 'Eat', 'Grab', 'Breath', 'Ability', 'Graze']) {
  need(jaw(n).maxOpenRadians > 0.1, `${n} must open the jaw`);
}
need(jaw('Attack').peakPhase > 0.2 && jaw('Attack').peakPhase < 0.7,
  `Attack: the gape must peak on the drive (${jaw('Attack').peakPhase})`);
// The hammer is a shove with the bar, not a snap: the jaws stay nearly shut through it.
need(jaw('Heavy').maxOpenRadians < 0.2,
  `Heavy must keep its mouth nearly shut (${jaw('Heavy').maxOpenRadians.toFixed(3)})`);
for (const name of ['Attack', 'Heavy', 'Bite']) {
  const row = report.anchorTravel.find((r) => r.clip === name);
  need(row.anchor_attack_primary > 0.02, `${name}: the attack anchor must travel (${row.anchor_attack_primary.toFixed(4)})`);
}
assert.equal(problems.join(' | '), '', 'measured performance checks');
console.log(JSON.stringify({
  models: report.models, clips: report.clips, twinTriangleFraction: report.twinTriangleFraction,
  rowing: report.rowing, strike: report.strike, graze: report.graze,
  jaw: report.jaw.filter((j) => ['Bite', 'Attack', 'Heavy', 'Ability', 'Graze', 'Breath', 'Idle'].includes(j.clip)),
  exactRigParity: true, exactAnimationParity: true,
}, null, 2));
