import { Game } from '../src/sim/game';
import { emptyInput, type InputFrame } from '../src/sim/types';
import { bandOf, isAlive, lengthOf } from '../src/sim/actors';
import { dist } from '../src/shared/math';
let failed = 0;
const check = (n: string, ok: boolean, d: string) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(44)} ${d}`); if (!ok) failed++; };
const run = (g: Game, f: InputFrame, steps: number) => { const m = new Map([[0, f]]); for (let i = 0; i < steps; i++) { g.step(1 / 60, m); g.events.length = 0; } };

// --- LB tap with a stick direction = sidestep dodge; LB held = sprint ---
{
  const g = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 7);
  const p = g.players[0]; p.pos = { x: 10, y: 8, z: 10 }; p.spawnProtect = 0;
  run(g, emptyInput(), 5);
  run(g, { ...emptyInput(), dash: true, mx: 1, camYaw: 0 }, 2);
  check('LB + stick right dashes at once', p.state === 'dodge', `state=${p.state} iframes=${p.iframes.toFixed(2)}`);
  // queued: hold LB with a neutral stick, then move
  const g3 = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 7);
  const r = g3.players[0]; r.pos = { x: 10, y: 8, z: 10 }; r.spawnProtect = 0;
  run(g3, { ...emptyInput(), dash: true }, 30);
  check('LB held with neutral stick does not dash or sprint', r.state === 'free' && Math.hypot(r.vel.x, r.vel.z) < 0.8, `state=${r.state} speed=${Math.hypot(r.vel.x, r.vel.z).toFixed(2)}`);
  run(g3, { ...emptyInput(), dash: true, my: 1 }, 2);
  check('...then dashes the moment the stick moves', r.state === 'dodge', `state=${r.state}`);
  run(g3, { ...emptyInput(), dash: true, my: 1 }, 90);
  const sp = Math.hypot(r.vel.x, r.vel.z);
  check('...and sprints while still held', r.state === 'free' && sp > 7, `speed=${sp.toFixed(1)}`);
  const g2 = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 7);
  const q = g2.players[0]; q.pos = { x: 10, y: 8, z: 10 }; q.spawnProtect = 0;
  run(g2, { ...emptyInput(), my: 1 }, 60);
  const cruise = Math.hypot(q.vel.x, q.vel.z);
  run(g2, { ...emptyInput(), my: 1, dash: true }, 60);
  const sprint = Math.hypot(q.vel.x, q.vel.z);
  check('LB held sprints (faster than cruise)', sprint > cruise * 1.3 && q.state === 'free', `cruise=${cruise.toFixed(1)} sprint=${sprint.toFixed(1)}`);
}
// --- LT aims at prey; X pounces when in range and eats it ---
{
  const g = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 9);
  const p = g.players[0]; p.pos = { x: 10, y: 8, z: 10 }; p.yaw = 0; p.spawnProtect = 0;
  const prey = g.spawn('waptia', 'ambient', { x: 10, y: 8, z: 10 + 6 }, 0.3);
  prey.brain = undefined as never; (prey as any).controller = 'swarm';
  // the renderer decides what the centred crosshair is over and passes the id in aimTarget
  run(g, { ...emptyInput(), aim: true, aimTarget: prey.id }, 3);
  check('LT hold takes the crosshair target', p.lockTarget === prey.id && p.aiming, `target=${p.lockTarget} prey=${prey.id} band=${bandOf(p, prey)}`);
  check('crosshair in range at 6 units', p.aimInRange, `range=${g.pounceRange(p).toFixed(1)}`);
  const eatsBefore = p.eats;
  run(g, { ...emptyInput(), aim: true, aimTarget: prey.id, heavy: true }, 2);
  check('X while aiming starts a pounce', p.state === 'pounce', `state=${p.state}`);
  run(g, { ...emptyInput(), aim: true, aimTarget: prey.id }, 90);
  check('pounce reaches and eats the prey', p.eats > eatsBefore || !isAlive(prey), `eats ${eatsBefore}->${p.eats} preyAlive=${isAlive(prey)} d=${dist(p.pos, prey.pos).toFixed(1)}`);
}
// --- prey abundance at two very different sizes ---
for (const [creatureId, mode, scale] of [['waptia', 'rise', 0.25], ['anomalocaris', 'reef', 2.6]] as const) {
  const g = new Game(mode, [{ creature: creatureId, device: 'keyboard', ready: true }], 3);
  const p = g.players[0]; if (mode === 'reef') { p.scale = scale; p.tier = 4; } p.pos = { x: 60, y: 6, z: -30 }; p.state = 'free';
  run(g, emptyInput(), 60 * 12);
  const L = lengthOf(p);
  let small = 0; for (const o of g.actors) if (o.id !== p.id && isAlive(o) && dist(o.pos, p.pos) < 45 + L * 4) { const b = bandOf(p, o); if (b === 'snack' || b === 'prey') small++; }
  check(`${creatureId} at scale ${scale} has prey nearby`, small >= 14, `${small} snack/prey within ${(45 + L * 4).toFixed(0)}u (L=${L.toFixed(1)})`);
}
console.log(failed ? `\n${failed} FAILED` : '\nall hunt tests passed'); process.exit(failed ? 1 : 0);
