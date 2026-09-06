/**
 * Smooth motion: the per-step transform snapshot the renderer interpolates from, and the absence
 * of the two things that made creatures jitter — plant contact resolved on alternate steps, and
 * teleports sliding instead of snapping.
 */
import { Game } from '../src/sim/game';
import { emptyInput, type Actor, type InputFrame } from '../src/sim/types';
import { isAlive, lengthOf } from '../src/sim/actors';

let failed = 0;
const check = (n: string, ok: boolean, d: string) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(56)} ${d}`); if (!ok) failed++; };
const run = (g: Game, f: InputFrame, steps: number) => { const m = new Map([[0, f]]); for (let i = 0; i < steps; i++) { g.step(1 / 60, m); g.events.length = 0; } };
/** The renderer snaps rather than interpolating when a step moved a body further than this. */
const snapThreshold = (a: Actor) => Math.max(2, lengthOf(a) * 3);

// --- prevT is the transform as it was before the step ---
{
  const g = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 21);
  const p = g.players[0]; p.spawnProtect = 0;
  run(g, { ...emptyInput(), my: 1, camYaw: Math.PI }, 120);
  const before = g.actors.map((a) => ({ a, x: a.pos.x, y: a.pos.y, z: a.pos.z, yaw: a.yaw, pitch: a.pitch, bank: a.bank }));
  run(g, { ...emptyInput(), my: 1, camYaw: Math.PI }, 1);
  let worst = 0, worstAng = 0;
  for (const b of before) {
    const t = b.a.prevT;
    worst = Math.max(worst, Math.abs(t.x - b.x), Math.abs(t.y - b.y), Math.abs(t.z - b.z));
    worstAng = Math.max(worstAng, Math.abs(t.yaw - b.yaw), Math.abs(t.pitch - b.pitch), Math.abs(t.bank - b.bank));
  }
  check('prevT holds the transform from before the step', worst === 0 && worstAng === 0, `${before.length} actors, max drift ${worst}/${worstAng}`);
  const moved = before.filter((b) => Math.hypot(b.a.pos.x - b.x, b.a.pos.y - b.y, b.a.pos.z - b.z) > 1e-6).length;
  check('...and the step actually moved things', moved > before.length * 0.5, `${moved}/${before.length} moved`);
  const inRange = g.actors.every((a) => Math.hypot(a.pos.x - a.prevT.x, a.pos.y - a.prevT.y, a.pos.z - a.prevT.z) < snapThreshold(a));
  check('ordinary motion stays under the snap threshold', inRange, 'nothing would be mistaken for a teleport');
}

// --- nothing buzzes against plants: the push runs every step, like every other body's ---
{
  const g = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 21);
  const p = g.players[0]; p.spawnProtect = 0;
  run(g, { ...emptyInput(), my: 1, camYaw: Math.PI }, 240);
  type Rec = { prev: { x: number; y: number; z: number }; prevD: { x: number; y: number; z: number }; flips: number; steps: number; ctrl: string };
  const recs = new Map<number, Rec>();
  for (const a of g.actors) if (isAlive(a)) recs.set(a.id, { prev: { ...a.pos }, prevD: { x: 0, y: 0, z: 0 }, flips: 0, steps: 0, ctrl: a.controller });
  const N = 420;
  const m = new Map([[0, { ...emptyInput(), my: 1, camYaw: Math.PI }]]);
  for (let i = 0; i < N; i++) {
    g.step(1 / 60, m); g.events.length = 0;
    for (const a of g.actors) {
      const r = recs.get(a.id); if (!r || !isAlive(a)) continue;
      const d = { x: a.pos.x - r.prev.x, y: a.pos.y - r.prev.y, z: a.pos.z - r.prev.z };
      const len = Math.hypot(d.x, d.y, d.z), plen = Math.hypot(r.prevD.x, r.prevD.y, r.prevD.z);
      const dot = d.x * r.prevD.x + d.y * r.prevD.y + d.z * r.prevD.z;
      // a step that reverses the previous step's direction: sustained reversals are a buzz
      if (len > 1e-4 && plen > 1e-4 && dot / (len * plen) < -0.5) r.flips++;
      r.steps++; r.prev = { ...a.pos }; r.prevD = d;
    }
  }
  const list = [...recs.values()].filter((r) => r.steps >= N * 0.9);
  const rate = (r: Rec) => r.flips / r.steps * 100;
  const rates = list.map(rate).sort((a, b) => b - a);
  const buzzing = list.filter((r) => rate(r) > 25);
  console.log(`  ${list.length} creatures over ${N} steps · worst reversal rate ${rates[0]?.toFixed(1)}% · median ${rates[Math.floor(rates.length / 2)]?.toFixed(1)}%`);
  check('nothing oscillates step to step', buzzing.length === 0, buzzing.length ? buzzing.map((r) => `${r.ctrl} ${rate(r).toFixed(0)}%`).join(', ') : `worst ${rates[0]?.toFixed(1)}%`);
  check('...swarms in particular are steady', list.filter((r) => r.ctrl === 'swarm' && rate(r) > 10).length === 0, `${list.filter((r) => r.ctrl === 'swarm').length} school members`);
}

// --- a teleport is a jump the renderer must snap across, not interpolate ---
{
  const g = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }, { creature: 'waptia', device: 'keyboard2', ready: true }], 8);
  const [a, b] = g.players;
  a.spawnProtect = 0; b.spawnProtect = 0;
  b.pos = { x: 400, y: 8, z: -900 };
  run(g, emptyInput(), 5);
  const ok = g.teleport(0, 1);
  const jump = Math.hypot(a.pos.x - a.prevT.x, a.pos.y - a.prevT.y, a.pos.z - a.prevT.z);
  check('a teleport reads as a jump, not as motion', ok && jump > snapThreshold(a), `moved ${jump.toFixed(0)} units, threshold ${snapThreshold(a).toFixed(1)}`);
}

console.log(failed ? `\n${failed} FAILED` : '\nall motion tests passed');
process.exit(failed ? 1 : 0);
