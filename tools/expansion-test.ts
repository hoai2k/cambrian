import assert from 'node:assert/strict';
import { CREATURES, creature } from '../src/sim/creatures';
import { EXPANSION_CREATURES } from '../src/sim/expansion';
import { makeActor, bodyRadius, clearanceOf, isHidden } from '../src/sim/actors';
import { applyHit } from '../src/sim/combat';
import { beginExpansionAbility, stepExpansionAbility, bloomRate, grazeRate } from '../src/sim/expansion-abilities';
import { emptyInput } from '../src/sim/types';
import { Game } from '../src/sim/game';
import { makeBrain } from '../src/sim/ai';
import { SURFACE_Y } from '../src/sim/world';

assert.equal(CREATURES.length, 21);
assert.equal(new Set(CREATURES.map(c => c.id)).size, 21);
assert.equal(new Set(EXPANSION_CREATURES.map(c => c.ability)).size, 13);
const actor = (id: number, c = 'pikaia', z = 0) => makeActor(id, c as any, 'ambient', { x: 0, y: 6, z }, 1);
for (const d of EXPANSION_CREATURES) {
  const a = actor(1, d.id), enemy = actor(2, 'waptia', .8), ally = actor(3, 'waptia', .8);
  a.yaw = 0; a.state = 'ability'; a.abilityActive = true;
  const others = [a, enemy, ally];
  const ctx = { hit: { events: [], byId: (id: number) => others.find(o => o.id === id), time: 0 }, nearby: () => others, silt: [], allies: (_: any, b: any) => b.id === ally.id };
  assert(beginExpansionAbility(ctx, a, d));
  const hp = ally.hp, pos = { ...ally.vel };
  for (let i = 0; i < 72; i++) { a.stateT = i / 60; if (a.state === 'ability') stepExpansionAbility(ctx, a, d, 1 / 60); }
  assert.equal(ally.hp, hp, `${d.id}: ability harms ally`);
  assert.deepEqual(ally.vel, pos, `${d.id}: ability displaces ally`);
  assert([a.hp, enemy.hp, a.vel.x, a.vel.y, a.vel.z].every(Number.isFinite));
  assert(bodyRadius(a) > 0 && clearanceOf(a) > 0);
  if (d.diet === 'filter') { a.scale = 2.6; assert(bloomRate(a, d) > 0, `${d.id}: giant cannot filter`); }
  if (d.diet === 'grazer' || d.diet === 'deposit') assert(grazeRate(a, d) > 0);
}
// Armor piercing matters against armor, and no more than one corral hit per activation.
const hit = (pierce: number) => { const a = actor(1, 'sidneyia'), v = actor(2, 'olenoides', 1); a.yaw = Math.PI; v.yaw = Math.PI; const before = v.hp; applyHit({events: [], byId: () => undefined, time: 0, rng: Math.random}, a, v, {...creature('sidneyia').heavy, armorPierce: pierce}, 0); return before - v.hp; };
assert(hit(.75) > hit(0));
{
  const a = actor(1, 'burgessomedusa'), v = actor(2, 'olenoides', 1); a.state = 'ability'; a.abilityActive = true; a.yaw = 0;
  const ctx = { hit: {events: [], byId: () => undefined, time: 0}, nearby: () => [v], silt: [], allies: () => false };
  beginExpansionAbility(ctx, a, creature(a.creature)); a.stateT = .4;
  stepExpansionAbility(ctx, a, creature(a.creature), 1/60); const hp = v.hp;
  for (let i=0;i<60;i++) stepExpansionAbility(ctx, a, creature(a.creature), 1/60);
  assert.equal(v.hp, hp);
}
// Every selectable creature can move and finish an ability through the actual simulation.
for (const def of EXPANSION_CREATURES) {
  const g = new Game('reef', [{creature:def.id,device:'keyboard',ready:true}], 432);
  const a = g.players[0];
  for (const o of [...g.actors]) if (o !== a) (g as any).remove(o);
  a.pos = {x:0,y:def.ground ? 0 : 8,z:0}; a.yaw=0; a.spawnProtect=20;
  const f = {...emptyInput(),my:1,camYaw:0,ability:true};
  g.step(1/60,new Map([[0,f]])); f.ability=false;
  assert(a.abilityCd > 0, `${def.id}: ability did not activate`);
  const start={...a.pos};
  for(let i=0;i<300;i++) {g.step(1/60,new Map([[0,f]]));g.events.length=0;}
  assert.notEqual(a.state,'ability',`${def.id}: stuck in ability`);
  assert(!a.abilityActive,`${def.id}: leaked active ability`);
  assert(Math.hypot(a.pos.x-start.x,a.pos.z-start.z)>.2,`${def.id}: cannot move`);
  assert(Object.values(a.pos).every(Number.isFinite));
}
// Ribbon slip clears both player locks and the AI's acquired target/detection.
{
  const a=actor(1), hunter=actor(2,'anomalocaris');
  hunter.lockTarget=a.id;hunter.brain=makeBrain('giant',hunter.pos,()=>.5,{target:a.id,goal:'chase'});
  hunter.brain.detection.set(a.id,1);
  const ctx={hit:{events:[],byId:()=>undefined,time:0},nearby:()=>[hunter],silt:[],allies:()=>false};
  beginExpansionAbility(ctx,a,creature(a.creature));
  assert.equal(hunter.lockTarget,-1);assert.equal(hunter.brain.target,-1);assert(!hunter.brain.detection.has(a.id));
}
// An airborne Ottoia cannot dive into imaginary sediment or spend its cooldown.
{
  const g=new Game('reef',[{creature:'ottoia',device:'keyboard',ready:true}],77),a=g.players[0];
  a.grounded=false;a.pos={x:0,y:20,z:0};a.hopVel=1;
  g.step(1/60,new Map([[0,{...emptyInput(),ability:true}]]));
  assert.equal(a.abilityCd,0);assert.notEqual(a.state,'ability');
}
// Tall radial bodies use their anatomical clearance at the surface too.
for(const id of ['burgessomedusa','ctenorhabdotus'] as const){
  const g=new Game('reef',[{creature:id,device:'keyboard',ready:true}],78),a=g.players[0];
  a.pos={x:0,y:SURFACE_Y+5,z:0};
  g.step(1/60,new Map([[0,emptyInput()]]));
  assert(a.pos.y+clearanceOf(a)<=SURFACE_Y-.8+1e-6,`${id}: body crosses surface`);
}
console.log('PASS: 21 unique options, 13 abilities, ally safety, finite state, armor piercing, one hit per activation, mobile abilities and all-tier feeding.');
