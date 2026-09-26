import { Game } from '../src/sim/game';
import { emptyInput } from '../src/sim/types';
import { lengthOf } from '../src/sim/actors';

const g = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 41);
const p = g.players[0];
p.state = 'free'; p.spawnProtect = 999;
for (const a of g.actors) if (a !== p) a.pos.x += 2000;
const target = g.spawn('anomalocaris', 'ambient', { x: p.pos.x, y: p.pos.y, z: p.pos.z + 30 }, 0.8);
target.brain = undefined; target.spawnProtect = 0;
const initial = Math.hypot(target.pos.x - p.pos.x, target.pos.z - p.pos.z);
let landed = false;
for (let i = 0; i < 420; i++) {
  if (i > 15) target.pos.x += 0.015; // moving target: the original pointer position is stale
  g.step(1 / 60, new Map([[0, { ...emptyInput(), pursueTarget: target.id, aim: true, aimTarget: target.id }]]));
  if (g.events.some((e) => e.kind === 'pounce' && e.actor === p.id && e.other === target.id)) { landed = true; break; }
  g.events.length = 0;
}
const remaining = Math.hypot(target.pos.x - p.pos.x, target.pos.z - p.pos.z);
if (!landed || remaining >= initial || target.hp >= target.hpMax) {
  throw new Error(`pursuit failed: landed=${landed}, distance=${initial.toFixed(1)}→${remaining.toFixed(1)}, hp=${target.hp}/${target.hpMax}`);
}
console.log(`PASS held pursuit tracked a moving creature and bit it (${initial.toFixed(1)}→${remaining.toFixed(1)} units)`);
