import assert from 'node:assert/strict';
import { Game } from '../src/sim/game';
import { emptyInput } from '../src/sim/types';
import { isAlive } from '../src/sim/actors';
import { applyHit } from '../src/sim/combat';
import { creature } from '../src/sim/creatures';
// Exercise a lethal giant bite directly: AI target selection is intentionally affected by ecology.
const g = new Game('rise', [{ creature: 'waptia', device: 'keyboard', ready: true }], 5);
const p = g.players[0];
p.spawnProtect = 0;
const giant = g.actors.find(a => a.controller === 'giant' && a.creature === 'anomalocaris')!;
p.pos = {x:60,y:4,z:-20}; giant.pos = {x:61,y:4,z:-20};
applyHit({events:g.events,byId:id=>g.byId(id),time:0},giant,p,{...creature(giant.creature).heavy,damage:p.hpMax*10,grab:false},0);
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
console.log(`PASS: lethal combat -> swallowed/dead -> hatch -> living player; respawn at ${respawned.toFixed(2)} s.`);
