import { Game } from '../src/sim/game';
import { emptyInput, type InputFrame } from '../src/sim/types';
import { isAlive, lengthOf } from '../src/sim/actors';
import { kill } from '../src/sim/combat';
import { makeBrain } from '../src/sim/ai';
let failed = 0;
const check = (n: string, ok: boolean, d: string) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(48)} ${d}`); if (!ok) failed++; };
const stepN = (g: Game, n: number, f: InputFrame = emptyInput(), onEvents?: (t: number) => void) => { const m = new Map([[0, f]]); for (let i = 0; i < n; i++) { g.step(1 / 60, m); onEvents?.((i + 1) / 60); g.events.length = 0; } };
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

// --- a killed wild creature rolls belly-up and drifts upward ---
{
  const g = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 4);
  const p = g.players[0]; p.pos = { x: 60, y: 6, z: -30 };
  const o = g.spawn('waptia', 'ambient', { x: 70, y: 6, z: -30 }, 0.9); o.brain = makeBrain('needs', o.pos, g.rng);
  const hitCtx = { events: g.events, byId: (id: number) => g.byId(id), time: 0 };
  kill(hitCtx, o, p);
  const y0 = o.pos.y;
  stepN(g, 60 * 4);
  check('corpse turns upside down', Math.abs(wrap(o.bank - Math.PI)) < 0.6, `bank=${o.bank.toFixed(2)} (pi=${Math.PI.toFixed(2)})`);
  check('corpse floats upward', o.pos.y > y0 + 0.6, `y ${y0.toFixed(1)} -> ${o.pos.y.toFixed(1)}`);
  check('corpse still in the world (not eaten)', g.actors.includes(o) && o.state === 'dead', `state=${o.state}`);
}
// --- a player corpse dissolves at ~2.6 s and respawns at 3 s ---
{
  const g = new Game('reef', [{ creature: 'waptia', device: 'keyboard', ready: true }], 6);
  const p = g.players[0]; p.pos = { x: 60, y: 6, z: -30 }; p.spawnProtect = 0;
  const hitCtx = { events: g.events, byId: (id: number) => g.byId(id), time: 0 };
  kill(hitCtx, p, undefined);
  let sparkAt = -1, respawnAt = -1;
  const m = new Map([[0, emptyInput()]]);
  for (let i = 0; i < 60 * 6; i++) {
    g.step(1 / 60, m);
    for (const e of g.events) if (e.kind === 'disintegrate' && e.actor === p.id && sparkAt < 0) sparkAt = (i + 1) / 60;
    if (respawnAt < 0 && isAlive(p)) respawnAt = (i + 1) / 60;
    g.events.length = 0;
  }
  check('player corpse sparkles just before respawn', sparkAt > 2.4 && sparkAt < 2.8, `sparkles at ${sparkAt.toFixed(2)}s`);
  check('player respawns at ~3 s', respawnAt > 2.9 && respawnAt < 3.3, `respawn at ${respawnAt.toFixed(2)}s`);
}
// --- swallowed player: 3 s total, sparkles come from the predator ---
{
  const g = new Game('reef', [{ creature: 'waptia', device: 'keyboard', ready: true }], 9);
  const p = g.players[0]; p.pos = { x: 60, y: 6, z: -30 }; p.spawnProtect = 0; p.hp = 1;
  const giant = g.spawn('anomalocaris', 'giant', { x: 60, y: 6, z: -30 + 2 }, 3.5); giant.brain = makeBrain('giant', giant.pos, g.rng);
  let swallowAt = -1, sparkAt = -1, respawnAt = -1, sparkOther = -1;
  const m = new Map([[0, emptyInput()]]);
  for (let i = 0; i < 60 * 8; i++) {
    if (swallowAt < 0) { giant.pos = { x: p.pos.x, y: p.pos.y, z: p.pos.z - lengthOf(giant) * 0.5 }; giant.yaw = 0; giant.brain!.goal = 'hunt'; giant.brain!.target = p.id; giant.brain!.detection.set(p.id, 3); giant.brain!.hunger = 999; giant.brain!.courage = 1; }
    g.step(1 / 60, m);
    for (const e of g.events) {
      if (e.kind === 'swallow' && e.other === p.id && swallowAt < 0) swallowAt = (i + 1) / 60;
      if (e.kind === 'disintegrate' && e.actor === p.id && sparkAt < 0) { sparkAt = (i + 1) / 60; sparkOther = e.other ?? -1; }
    }
    if (swallowAt >= 0 && respawnAt < 0 && isAlive(p)) respawnAt = (i + 1) / 60;
    g.events.length = 0;
  }
  check('player gets swallowed', swallowAt > 0, `at ${swallowAt.toFixed(2)}s`);
  check('sparkles come from the predator at ~2.6 s after', sparkOther === giant.id && sparkAt - swallowAt > 2.4 && sparkAt - swallowAt < 2.8, `+${(sparkAt - swallowAt).toFixed(2)}s from actor ${sparkOther} (giant ${giant.id})`);
  check('respawn ~3 s after the swallow', respawnAt - swallowAt > 2.9 && respawnAt - swallowAt < 3.3, `+${(respawnAt - swallowAt).toFixed(2)}s`);
}
console.log(failed ? `\n${failed} FAILED` : '\nall corpse tests passed'); process.exit(failed ? 1 : 0);
