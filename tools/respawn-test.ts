import { Game } from '../src/sim/game';
import { emptyInput, type InputFrame } from '../src/sim/types';
import { isAlive } from '../src/sim/actors';
// A giant is dropped right onto a larva: the larva must die (bite or swallow) and come back.
const g = new Game('rise', [{ creature: 'waptia', device: 'keyboard', ready: true }], 5);
const p = g.players[0];
p.spawnProtect = 0;
const giant = g.actors.find((a) => a.controller === 'giant' && a.creature === 'anomalocaris')!;
p.pos = { x: 60, y: 4, z: -20 }; giant.pos = { x: 61, y: 4, z: -20 }; giant.brain!.goal = 'hunt'; giant.brain!.target = p.id; giant.brain!.detection.set(p.id, 3); giant.brain!.hunger = 999;
let died = -1, respawned = -1, hatchSeen = false;
for (let t = 0; t < 60 * 20; t++) {
  giant.brain!.detection.set(p.id, 3); giant.brain!.hunger = 999;
  const inputs = new Map<number, InputFrame>(); inputs.set(0, emptyInput());
  g.step(1 / 60, inputs);
  if (died < 0 && !isAlive(p)) died = t / 60;
  if (died >= 0 && respawned < 0 && isAlive(p)) { respawned = t / 60; }
  if (p.state === 'moult' && p.hatching) hatchSeen = true;
  g.events.length = 0;
}
console.log(`player in world: ${g.actors.includes(p)} died at ${died.toFixed(2)}s respawned at ${respawned.toFixed(2)}s hatchSeen=${hatchSeen} final state=${p.state} scale=${p.scale.toFixed(2)} hp=${p.hp.toFixed(0)}/${p.hpMax}`);
if (died < 0 || respawned < 0 || !g.actors.includes(p)) { console.log('RESPAWN TEST FAILED'); process.exit(1); }
