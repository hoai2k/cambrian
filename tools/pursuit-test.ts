import { Game } from '../src/sim/game';
import { emptyInput } from '../src/sim/types';
import { lengthOf } from '../src/sim/actors';

const g = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 41);
const p = g.players[0];
p.state = 'free'; p.spawnProtect = 999;
for (const a of g.actors) if (a !== p) a.pos.x += 2000;
const target = g.spawn('anomalocaris', 'ambient', { x: p.pos.x, y: p.pos.y, z: p.pos.z + 10 }, 0.8);
target.brain = undefined; target.spawnProtect = 0;
const initial = Math.hypot(target.pos.x - p.pos.x, target.pos.z - p.pos.z);
g.step(1 / 60, new Map([[0, { ...emptyInput(), light: true, aim: true, aimTarget: target.id }]]));
if (p.state !== 'attack') throw new Error('first tap did not begin a bite');
g.step(1 / 60, new Map([[0, { ...emptyInput(), pursueTarget: target.id, pursueDash: true, aim: true, aimTarget: target.id }]]));
if (p.state !== 'pounce') throw new Error('second tap waited for the first bite to finish');
g.events.length = 0;
let landed = false;
for (let i = 0; i < 420; i++) {
  if (i > 15) target.pos.x += 0.015; // moving target: the original pointer position is stale
  g.step(1 / 60, new Map([[0, { ...emptyInput(), pursueTarget: target.id, pursueDash: true, aim: true, aimTarget: target.id }]]));
  if (g.events.some((e) => e.kind === 'pounce' && e.actor === p.id && e.other === target.id)) { landed = true; break; }
  g.events.length = 0;
}
const remaining = Math.hypot(target.pos.x - p.pos.x, target.pos.z - p.pos.z);
if (!landed || remaining >= initial || target.hp >= target.hpMax) {
  throw new Error(`pursuit failed: landed=${landed}, distance=${initial.toFixed(1)}→${remaining.toFixed(1)}, hp=${target.hp}/${target.hpMax}`);
}
console.log(`PASS committed pursuit tracked a moving creature and bit it (${initial.toFixed(1)}→${remaining.toFixed(1)} units)`);

const far = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 42);
const hunter = far.players[0]; hunter.state = 'free'; hunter.spawnProtect = 999;
for (const a of far.actors) if (a !== hunter) a.pos.x += 2000;
const distant = far.spawn('anomalocaris', 'ambient', { x: hunter.pos.x, y: hunter.pos.y, z: hunter.pos.z + 100 }, 0.8);
distant.brain = undefined; distant.spawnProtect = 0;
let exceeded = false; let hit = false;
for (let i = 0; i < 420; i++) {
  far.step(1 / 60, new Map([[0, { ...emptyInput(), pursueTarget: distant.id, pursueDash: true, aim: true, aimTarget: distant.id }]]));
  hit ||= far.events.some((e) => e.kind === 'pounce' && e.actor === hunter.id && e.other === distant.id);
  exceeded ||= !!hunter.pursuit?.spent;
  far.events.length = 0;
}
if (!exceeded || hit || hunter.state === 'pounce' || (hunter.pursuit?.traveled ?? 0) > (hunter.pursuit?.max ?? 0) + 3)
  throw new Error(`dash limit failed: spent=${exceeded}, hit=${hit}, state=${hunter.state}, travel=${hunter.pursuit?.traveled}/${hunter.pursuit?.max}`);
console.log('PASS distant target ended the chase after one dash distance');

const mouse = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 43);
const swimmer = mouse.players[0]; swimmer.state = 'free'; swimmer.spawnProtect = 999;
for (const a of mouse.actors) if (a !== swimmer) a.pos.x += 2000;
const quarry = mouse.spawn('anomalocaris', 'ambient', { x: swimmer.pos.x, y: swimmer.pos.y, z: swimmer.pos.z + 30 }, 0.8);
quarry.brain = undefined; quarry.spawnProtect = 0;
let mouseHit = false;
for (let i = 0; i < 420; i++) {
  mouse.step(1 / 60, new Map([[0, { ...emptyInput(), pursueTarget: quarry.id, aim: true, aimTarget: quarry.id }]]));
  if (mouse.events.some((e) => e.kind === 'pounce' && e.actor === swimmer.id && e.other === quarry.id)) { mouseHit = true; break; }
  mouse.events.length = 0;
}
if (!mouseHit) throw new Error('held mouse pursuit stopped before biting');
console.log('PASS held mouse pursuit still follows beyond one dash distance');
