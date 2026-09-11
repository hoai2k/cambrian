import assert from 'node:assert/strict';
import { Game } from '../src/sim/game';
import { emptyInput } from '../src/sim/types';
import { isAlive } from '../src/sim/actors';
import { applyHit } from '../src/sim/combat';
import { creature } from '../src/sim/creatures';
// Exercise a lethal giant bite directly: AI target selection is intentionally affected by ecology.
const g = new Game('rise', [{ creature: 'waptia', device: 'keyboard', ready: true }], 5);
g.skipHatch();   // out of the egg: this is about the bite that follows
const p = g.players[0];
p.spawnProtect = 0;
const giant = g.actors.find(a => a.controller === 'giant' && a.creature === 'anomalocaris')!;
p.pos = {x:60,y:4,z:-20}; giant.pos = {x:61,y:4,z:-20};
applyHit({events:g.events,byId:id=>g.byId(id),time:0,rng:g.rng},giant,p,{...creature(giant.creature).heavy,damage:p.hpMax*10,grab:false},0);
assert(!isAlive(p),'Lethal giant hit must kill or swallow the larva');
let respawned=-1,hatchSeen=false;
for(let t=0;t<60*12;t++){
  g.step(1/60,new Map([[0,emptyInput()]]));
  if(respawned<0&&isAlive(p))respawned=t/60;
  if(p.state==='moult'&&p.hatching)hatchSeen=true;
  g.events.length=0;
}
assert(respawned>=0&&g.actors.includes(p),'Player must respawn in the world');
assert(hatchSeen,'Respawn must play its hatch/moult state');
// ---- the egg holds the body to the crack, and no further ----
{
  const { HATCH_TIME, HATCH_FREE, HATCH_HOLD } = await import('../src/sim/game');
  assert(Math.abs(HATCH_HOLD - HATCH_TIME * HATCH_FREE) < 1e-9,
    'the hold has to end exactly where the shell splits, or the player waits on an animation');
  const e = new Game('rise', [{ creature: 'waptia', device: 'keyboard', ready: true }], 9);
  const h = e.players[0];
  assert(h.hatching && h.state === 'moult' && Math.abs(h.stateDur - HATCH_HOLD) < 1e-9,
    `a run starts in an egg held for the hold (${h.stateDur})`);
  const push = new Map([[0, { ...emptyInput(), my: 1, camYaw: 0 }]]);
  const run = (seconds: number) => { const at = { ...h.pos }; for (let i = 0; i < seconds * 60; i++) { e.step(1 / 60, push); e.events.length = 0; } return Math.hypot(h.pos.x - at.x, h.pos.z - at.z); };
  const held = run(HATCH_HOLD - 0.2);
  assert(held < 0.05, `inside the shell the stick does nothing (${held.toFixed(2)} units)`);
  const freed = run(1.2);
  assert(h.state === 'free' && !h.hatching, `the hold ends at the crack (state ${h.state})`);
  assert(freed > 1, `and the body answers the stick from there (${freed.toFixed(2)} units)`);
  console.log(`PASS: held still for ${HATCH_HOLD.toFixed(1)} s in the shell, swimming ${freed.toFixed(1)} units in the second after the crack.`);
}

console.log(`PASS: lethal combat -> swallowed/dead -> hatch -> living player; respawn at ${respawned.toFixed(2)} s.`);
