/**
 * The match recorder (`?debug=game`).
 *
 * Run: npm run record
 *
 * The recorder exists to answer "why did that not work" with the match's own numbers, so the thing
 * worth testing is not that it produces JSON — it is that the JSON *says something true about a
 * frame*. These drive real grab attempts, one that succeeds and one that cannot, and check that the
 * recording distinguishes them and names the reason. The reason is written from inside the gates
 * that decide, so a recording that disagreed with the game would be a bug in the game.
 */
import assert from 'node:assert/strict';
import { applyScaleStats, bodyRadius, lengthOf } from '../src/sim/actors';
import { creature } from '../src/sim/creatures';
import { Game } from '../src/sim/game';
import { emptyInput, type InputFrame } from '../src/sim/types';
import {
  exportRecording, recordStep, recordingPhase, resetRecording, startRecording, stopRecording,
} from '../src/app/debug-record';

let passes = 0;
const ok = (cond: unknown, msg: string) => { assert.ok(cond, msg); passes++; console.log(`PASS  ${msg}`); };

/** Drive a player at a giant for `seconds`, recording every step, and hand back the recording. */
function record(creatureId: 'opabinia' | 'waptia', dist: number, hold: Partial<InputFrame>, seconds = 6) {
  const g = new Game('reef', [{ creature: creatureId, device: 'keyboard', ready: true }], 21);
  const p = g.players[0]; p.spawnProtect = 0; p.vel = { x: 0, y: 0, z: 0 };
  const o = g.spawn('anomalocaris', 'giant', { x: 40, y: 14, z: -70 }, 3.5);
  o.brain = undefined; o.spawnProtect = 0; o.yaw = Math.PI; o.vel = { x: 0, y: 0, z: 0 };
  p.pos = { x: 40, y: 14, z: -70 + dist }; p.yaw = Math.PI;
  g.hash.rebuild(g.actors);
  const frame: InputFrame = { ...emptyInput(), camYaw: Math.PI, ...hold };
  const inputs = new Map([[0, frame]]);
  resetRecording();
  startRecording();
  for (let i = 0; i < 60 * seconds; i++) {
    o.pos = { x: 40, y: 14, z: -70 }; o.vel = { x: 0, y: 0, z: 0 }; o.spawnProtect = 0;
    g.step(1 / 60, inputs);
    recordStep(g, p, frame, g.events);
    g.events.length = 0;
  }
  stopRecording();
  // The recorder hands its finished shape to the export path only; read it back the same way the
  // browser would, by serialising it.
  return { g, p, o };
}

/** The recording as JSON, read back out of the export path so the test sees what the file holds. */
function exported(): Record<string, unknown> {
  let captured = '';
  const blobs: string[] = [];
  // A tiny DOM stub: enough for `exportRecording` to build its anchor and hand over the text.
  const g = globalThis as unknown as Record<string, unknown>;
  g.URL = { createObjectURL: (b: { text: string }) => { blobs.push(b.text); return 'blob:test'; }, revokeObjectURL: () => {} };
  g.Blob = class { text: string; constructor(parts: string[]) { this.text = parts.join(''); } };
  g.document = {
    createElement: () => ({ href: '', download: '', click: () => {}, remove: () => {} }),
    body: { appendChild: () => {} },
  };
  const okExport = exportRecording();
  assert.ok(okExport, 'the export path produced a file');
  captured = blobs[0] ?? '';
  return JSON.parse(captured) as Record<string, unknown>;
}

type Near = { id: number; what: string; band: string; gap: number; dist: number; offAim: number };
type Sample = { t: number; why: string; state: string; graspT: number; rideHost: number; near: Near[]; input: Record<string, unknown> };

// --- a grab that works: the recording says so, and says what it took hold of ---
{
  const { p, o } = record('opabinia', 14, { heavy: true });
  assert.ok(p.rideHost === o.id, 'the attempt this recording is of actually took hold');
  const rec = exported() as unknown as { samples: Sample[]; events: { kind: string }[]; seconds: number; version: number };
  ok(rec.version === 1 && rec.samples.length > 0, `the recording has ${rec.samples.length} samples over ${rec.seconds}s`);
  ok(rec.samples.every((s) => typeof s.why === 'string'), 'every sample carries the grip’s own account of itself');
  const took = rec.samples.find((s) => s.why.startsWith('took hold of'));
  ok(!!took, `the frame it took hold is named: "${took?.why}"`);
  ok(rec.samples.some((s) => s.rideHost === o.id), 'and the samples after it show the hold');
  ok(rec.samples.some((s) => s.input.heavy === true), 'the button that was held is in the record');
  ok(rec.events.some((e) => e.kind === 'grab'), 'the grab event is in the record');
}

// --- a grab that cannot work: the recording says which gate stopped it ---
{
  // Nothing held down at all. The grip is never armed, and the recording should say exactly that
  // rather than leaving someone to infer it from the absence of a hold.
  const { p } = record('opabinia', 14, {}, 3);
  assert.ok(p.rideHost < 0, 'the attempt this recording is of did not take hold');
  const rec = exported() as unknown as { samples: Sample[] };
  ok(rec.samples.some((s) => s.why === 'no attack button held'), 'an unarmed grip is named as unarmed');
}

// --- a grip that is still closing: the record shows the clock, which is the usual answer ---
// "I held it and nothing happened" is most often "you held it for less time than this animal needs",
// and that is only answerable if the record carries both numbers.
{
  const { p, o } = record('waptia', 3, { light: true }, 2);
  void p; void o;
  const rec = exported() as unknown as { samples: Sample[] };
  const closing = rec.samples.find((s) => /^closing on .* held [\d.]+s of [\d.]+s$/.test(s.why));
  ok(!!closing, `a grip part-way closed says how far: "${closing?.why}"`);
  // The surface gap is what every reach test uses, so it is what the record has to carry.
  ok(rec.samples.every((s) => s.near.every((n) => typeof n.gap === 'number' && typeof n.band === 'string')),
    'each body near the player carries its surface gap and how the player reads its size');
  ok(rec.samples.some((s) => s.near.some((n) => n.offAim >= 0)), '...and how far off the aim it is');
}

// --- states that are not the grip's fault are named as themselves ---
{
  const { p } = record('waptia', 14, { light: true }, 1);
  void p;
  const rec = exported() as unknown as { samples: Sample[] };
  ok(rec.samples.some((s) => s.why.startsWith('busy: state=')),
    'a frame spent mid-attack says so rather than blaming the reach');
}

// --- a slow frame does not write the same thing down twice ---
// The engine clears its event list once a frame but may run up to three simulation steps inside
// one, so the list a later step sees still holds what the earlier ones put there.
{
  resetRecording();
  startRecording();
  const g = new Game('reef', [{ creature: 'opabinia', device: 'keyboard', ready: true }], 21);
  const p = g.players[0]; p.spawnProtect = 0;
  const o = g.spawn('anomalocaris', 'giant', { x: 40, y: 14, z: -70 }, 3.5);
  o.brain = undefined; o.spawnProtect = 0; o.yaw = Math.PI;
  p.pos = { x: 40, y: 14, z: -70 + 14 }; p.yaw = Math.PI;
  g.hash.rebuild(g.actors);
  const frame: InputFrame = { ...emptyInput(), camYaw: Math.PI, heavy: true };
  const inputs = new Map([[0, frame]]);
  // Three steps to a frame, and the list cleared only at the end of one, as the engine does it.
  for (let f = 0; f < 120; f++) {
    for (let sub = 0; sub < 3; sub++) {
      o.pos = { x: 40, y: 14, z: -70 }; o.vel = { x: 0, y: 0, z: 0 }; o.spawnProtect = 0;
      g.step(1 / 60, inputs);
      recordStep(g, p, frame, g.events);
    }
    g.events.length = 0;
  }
  stopRecording();
  const rec = exported() as unknown as { events: { t: number; kind: string }[] };
  const grabs = rec.events.filter((e) => e.kind === 'grab');
  ok(grabs.length > 0, `a grab across slow frames is still recorded (${grabs.length})`);
  ok(grabs.length === new Set(grabs.map((e) => `${e.t}:${e.kind}`)).size,
    '...exactly once, not once per sub-step');
}

// --- the body a recording is about is in the record, however big it is ---
// The first real recording of a failed grab carried 1133 samples and not one of them listed a
// single neighbour: the player was a hatchling three quarters of a unit long, the range was six of
// *its* body lengths from *its* centre, and the giant it was clinging to had its middle twice that
// far away. The one animal the recording existed to explain never appeared in it. What is near has
// to be measured the way a grip is measured — surface to surface.
{
  const g = new Game('reef', [{ creature: 'opabinia', device: 'keyboard', ready: true }], 21);
  const p = g.players[0]; p.spawnProtect = 0; p.vel = { x: 0, y: 0, z: 0 };
  // A hatchling: the size the player actually was, not the adult the other cases use.
  p.scale = 0.18; applyScaleStats(p, creature('opabinia'));
  const o = g.spawn('anomalocaris', 'giant', { x: 40, y: 14, z: -70 }, 6);
  o.brain = undefined; o.spawnProtect = 0; o.yaw = Math.PI; o.vel = { x: 0, y: 0, z: 0 };
  // Alongside the flank, a body's length off its surface — close by every measure the grip uses,
  // and far outside any radius drawn round the hatchling's own centre.
  p.pos = { x: 40 + bodyRadius(o) + lengthOf(p), y: 14, z: -70 };
  p.yaw = -Math.PI / 2;
  g.hash.rebuild(g.actors);
  const frame: InputFrame = { ...emptyInput(), camYaw: -Math.PI / 2, heavy: true };
  resetRecording(); startRecording();
  for (let i = 0; i < 30; i++) { g.step(1 / 60, new Map([[0, frame]])); recordStep(g, p, frame, g.events); g.events.length = 0; }
  stopRecording();
  const rec = exported() as unknown as { samples: Sample[] };
  const first = rec.samples[0];
  const anom = first.near.find((n) => n.what === 'Anomalocaris');
  ok(!!anom, `a giant whose centre is ${first.near.length ? '' : 'far '}off is still in the record`);
  ok(!!anom && anom.gap < lengthOf(p) * 6 && anom.dist > lengthOf(p) * 6,
    `...found by the gap between the surfaces (${anom?.gap}), not the distance between the centres (${anom?.dist})`);
  ok(!!anom && anom.band === 'giant', `...and it is read as what it is: ${anom?.band}`);
}

// --- the recorder is off unless it is asked for, and stays off ---
{
  resetRecording();
  ok(recordingPhase() === 'idle', 'a reset recorder is idle');
  const g = new Game('reef', [{ creature: 'opabinia', device: 'keyboard', ready: true }], 21);
  const p = g.players[0];
  const f = emptyInput();
  for (let i = 0; i < 60; i++) { g.step(1 / 60, new Map([[0, f]])); recordStep(g, p, f, g.events); g.events.length = 0; }
  ok(recordingPhase() === 'idle', '...and a step recorded into an idle recorder does nothing');
  ok(!exportRecording(), '...and there is nothing to export');
}

console.log(`\n${passes} recorder assertions passed`);
