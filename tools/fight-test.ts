/** Fight balance: peers take a couple of hits, giants take three to kill you, you can rout a giant, and being killed by a giant swallows you. */
import { CORPSE_WINDOW, Game } from '../src/sim/game';
import { emptyInput, type InputFrame } from '../src/sim/types';
import { isAlive, lengthOf, bandOf } from '../src/sim/actors';
import { makeBrain } from '../src/sim/ai';
let failed = 0;
const check = (n: string, ok: boolean, d: string) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(46)} ${d}`); if (!ok) failed++; };
const run = (g: Game, f: InputFrame, steps: number, extra?: (i: number) => void) => { const m = new Map([[0, f]]); for (let i = 0; i < steps; i++) { extra?.(i); g.step(1 / 60, m); g.events.length = 0; } };
const fresh = (seed = 5) => { const g = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], seed); const p = g.players[0]; p.pos = { x: 60, y: 6, z: -30 }; p.spawnProtect = 0; p.yaw = 0; return { g, p }; };

// --- giant bites needed to kill an adult ---
{
  const { g, p } = fresh();
  const giant = g.spawn('anomalocaris', 'giant', { x: 60, y: 6, z: -27 }, 3.5); giant.brain = makeBrain('giant', giant.pos, g.rng);
  let bites = 0; const hp0 = p.hp;
  const m = new Map([[0, emptyInput()]]);
  for (let i = 0; i < 60 * 30 && isAlive(p); i++) {
    giant.pos = { x: p.pos.x, y: p.pos.y, z: p.pos.z - lengthOf(giant) * 0.5 }; giant.yaw = 0; giant.brain!.goal = 'hunt'; giant.brain!.target = p.id; giant.brain!.detection.set(p.id, 3); giant.brain!.hunger = 999; giant.brain!.courage = 1;
    g.step(1 / 60, m);
    for (const e of g.events) if (e.kind === 'hit' && e.actor === giant.id && e.other === p.id) bites++;
    g.events.length = 0;
  }
  check('giant kills an adult in about 3 bites', bites >= 2 && bites <= 4, `bites=${bites} hp0=${hp0} hpMax=${p.hpMax} state=${p.state}`);
  check('killed by a giant = swallowed, not a plain corpse', p.state === 'swallowed' || (p.state === 'dead' && p.eaten >= 1) || p.hatching, `state=${p.state}`);
  run(g, emptyInput(), 60 * (CORPSE_WINDOW + 2));
  check('...and the player respawns afterwards', isAlive(p) && g.actors.includes(p), `state=${p.state}`);
}
// --- peer prey: a couple of hits ---
{
  const { g, p } = fresh(8);
  const prey = g.spawn('waptia', 'ambient', { x: 60, y: 6, z: -30 + lengthOf(p) * 0.5 }, 0.8);   // ~0.55 of an adult anomalocaris: prey band
  prey.brain = makeBrain('needs', prey.pos, g.rng);
  console.log(`   prey band=${bandOf(p, prey)} preyHp=${prey.hpMax}`);
  let bites = 0;
  for (let i = 0; i < 60 * 12 && isAlive(prey); i++) {
    prey.pos = { x: p.pos.x, y: p.pos.y, z: p.pos.z + lengthOf(p) * 0.45 }; prey.vel = { x: 0, y: 0, z: 0 };
    const f = { ...emptyInput(), light: i % 20 < 2 };
    g.step(1 / 60, new Map([[0, f]]));
    for (const e of g.events) if (e.kind === 'hit' && e.actor === p.id) bites++;
    g.events.length = 0;
  }
  check('slightly smaller prey dies in 1-3 bites', !isAlive(prey) && bites >= 1 && bites <= 3, `bites=${bites} alive=${isAlive(prey)}`);
}
// --- routing a giant: bite it enough and it runs ---
{
  const { g, p } = fresh(11);
  const giant = g.spawn('anomalocaris', 'giant', { x: 60, y: 6, z: -30 + lengthOf(p) * 0.5 }, 3.5); giant.brain = makeBrain('giant', giant.pos, g.rng); giant.brain!.goal = 'notice';
  let bites = 0, routedAt = -1;
  for (let i = 0; i < 60 * 25; i++) {
    if (giant.brain!.goal !== 'flee') { giant.pos = { x: p.pos.x, y: p.pos.y, z: p.pos.z + lengthOf(p) * 0.5 }; giant.vel = { x: 0, y: 0, z: 0 }; giant.brain!.goal = 'notice'; }
    p.hp = p.hpMax;
    const f = { ...emptyInput(), light: i % 20 < 2 };
    g.step(1 / 60, new Map([[0, f]]));
    for (const e of g.events) { if (e.kind === 'hit' && e.actor === p.id) bites++; if (e.kind === 'routed' && routedAt < 0) routedAt = bites; }
    g.events.length = 0;
    if (giant.brain!.goal === 'flee') break;
  }
  check('a giant breaks off after 4-10 bites', giant.brain!.goal === 'flee' && routedAt >= 4 && routedAt <= 10, `routed after ${routedAt} bites, goal=${giant.brain!.goal}, giant hp ${Math.round(giant.hp)}/${giant.hpMax}`);
}
// --- regen ---
{
  const { g, p } = fresh(2);
  p.hp = p.hpMax * 0.3; p.sinceHit = 0;
  run(g, emptyInput(), 60 * 5); const at5 = p.hp;
  run(g, emptyInput(), 60 * 15); const at20 = p.hp;
  check('health regenerates after 6 s out of the fight', at5 <= p.hpMax * 0.31 && at20 > p.hpMax * 0.6, `5s=${Math.round(at5)} 20s=${Math.round(at20)} / ${p.hpMax}`);
}
console.log(failed ? `\n${failed} FAILED` : '\nall fight tests passed'); process.exit(failed ? 1 : 0);
