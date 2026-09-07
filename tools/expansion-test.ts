import assert from 'node:assert/strict';
import { CREATURES, creature } from '../src/sim/creatures';
import { EXPANSION_CREATURES } from '../src/sim/expansion';
import { makeActor, bodyRadius, clearanceOf, isHidden } from '../src/sim/actors';
import { applyHit } from '../src/sim/combat';
import { beginExpansionAbility, stepExpansionAbility, bloomRate, grazeRate, HEAVY_STRIKE } from '../src/sim/expansion-abilities';
import { emptyInput } from '../src/sim/types';
import { Game } from '../src/sim/game';
import { makeBrain } from '../src/sim/ai';
import { SURFACE_Y } from '../src/sim/world';
import { HEAVY_SPECIALS } from '../src/sim/concealment';

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
// Every selectable creature can hide, emerge and resume moving through the actual simulation.
for (const def of EXPANSION_CREATURES) {
  const g = new Game('reef', [{creature:def.id,device:'keyboard',ready:true}], 432);
  const a = g.players[0];
  for (const o of [...g.actors]) if (o !== a) (g as any).remove(o);
  a.pos = {x:0,y:def.ground ? 0 : 8,z:0}; a.yaw=0; a.spawnProtect=20;
  const f = {...emptyInput(),my:1,camYaw:0,ability:true};
  g.step(1/60,new Map([[0,f]])); f.ability=false;
  assert.notEqual(a.hideMode, 'none', `${def.id}: hiding did not activate`);
  g.step(1/60,new Map([[0,f]])); f.ability=true; g.step(1/60,new Map([[0,f]])); f.ability=false;
  assert.equal(a.hideMode,'none',`${def.id}: hiding did not cancel`);
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
/**
 * The heavy button and the crosshair have to agree. The HUD lights "RT · <move>" when the aimed
 * target is inside `heavyMove().reach`; pressing it there has to land, and the prompt must not
 * light at all when the button would do nothing (special on cooldown, or a filter feeder that
 * never strikes a target).
 */
{
  const strikers = CREATURES.filter((c) => HEAVY_STRIKE[c.ability]);
  assert(strikers.length >= 4, 'no heavy strikes to check');
  for (const def of strikers) {
    const g = new Game('reef', [{ creature: def.id, device: 'keyboard', ready: true }], 91);
    const a = g.players[0];
    a.pos = { x: 0, y: 12, z: 0 }; a.yaw = 0;
    // Let a benthic creature settle onto the seabed first, so the target sits at its own depth.
    for (let i = 0; i < 60; i++) g.step(1 / 60, new Map([[0, emptyInput()]]));
    a.yaw = 0; a.vel = { x: 0, y: 0, z: 0 }; a.stamina = a.staminaMax; a.abilityCd = 0; a.exhausted = 0;
    const move = g.heavyMove(a);
    assert.equal(move.name, def.abilityName.toUpperCase(), `${def.id}: prompt names the wrong move`);
    assert(move.ready, `${def.id}: rested creature reads as not ready`);
    assert(move.reach > 0, `${def.id}: a strike with no reach`);
    // A body at the far edge of what the crosshair promises, dead ahead and at the same depth.
    const prey = g.spawn('waptia', 'ambient', { x: a.pos.x, y: a.pos.y, z: a.pos.z + move.reach * 0.95 }, 1);
    prey.scale = a.scale; prey.hp = prey.hpMax = 400; prey.iframes = 0;
    a.lockTarget = prey.id; a.aiming = true;
    const before = prey.hp;
    const input = { ...emptyInput(), heavy: true, aim: true, aimTarget: prey.id };
    for (let i = 0; i < 90; i++) g.step(1 / 60, new Map([[0, i < 2 ? input : { ...input, heavy: false }]]));
    assert(prey.hp < before, `${def.id}: RT at a target the crosshair called in range never connected`);
  }
  // Cooldown and exhaustion are what the prompt greys out for, not the pounce's timers.
  const g = new Game('reef', [{ creature: 'opabinia', device: 'keyboard', ready: true }], 92), a = g.players[0];
  // A special on cooldown no longer greys the prompt out: RT falls through to the pounce, so the
  // prompt has to name that instead of a move the button would not play.
  a.abilityCd = 2; a.stamina = a.staminaMax;
  assert.equal(g.heavyMove(a).name, 'POUNCE', 'a special on cooldown still advertises itself');
  assert(g.heavyMove(a).ready, 'the pounce RT falls through to reads as unavailable');
  a.abilityCd = 0; a.stamina = 4;
  assert(!g.heavyMove(a).ready, 'a special with no stamina still advertises itself');
  // A filter feeder's heavy never strikes a target, so the prompt must never offer one.
  for (const id of ['collectorWake', 'pharyngealPump', 'planktonComb']) {
    const def = CREATURES.find((c) => c.ability === id);
    if (!def) continue;
    const fg = new Game('reef', [{ creature: def.id, device: 'keyboard', ready: true }], 93);
    assert.equal(fg.heavyMove(fg.players[0]).reach, 0, `${def.id}: crosshair offers a strike it does not have`);
  }
}

// --- RT always does something: the special when it is ready, the heavy attack or a pounce when
// it is not. The eight creatures whose special sits on RT used to swallow the press entirely
// while the special cooled down, so their `heavy` move was unreachable for a player. ---
{
  const HEAVY_SPECIAL_IDS = EXPANSION_CREATURES.filter((d) => HEAVY_SPECIALS.has(d.ability)).map((d) => d.id);
  assert(HEAVY_SPECIAL_IDS.length > 0, 'no creatures carry a special on RT');
  for (const id of HEAVY_SPECIAL_IDS) {
    const g = new Game('reef', [{ creature: id, device: 'keyboard', ready: true }], 91);
    const p = g.players[0];
    p.spawnProtect = 0; p.pos = { x: 0, y: 6, z: 0 };
    const press = (held: boolean) => g.step(1 / 60, new Map([[0, { ...emptyInput(), heavy: held }]]));
    // first press: the special
    press(true); press(false);
    assert.equal(p.state, 'ability', `${id}: RT did not start the special (state=${p.state})`);
    // run it out, then press again while it is still cooling down
    for (let i = 0; i < 60 * 6 && (p.state !== 'free' || p.abilityCd <= 0); i++) press(false);
    assert(p.state === 'free' && p.abilityCd > 0, `${id}: no cooling-down window to test (state=${p.state} cd=${p.abilityCd.toFixed(2)})`);
    const stamina = p.stamina;
    press(true); press(false);
    assert(p.state === 'attack' || p.state === 'pounce',
      `${id}: RT was swallowed while the special cooled down (state=${p.state})`);
    assert(p.stamina < stamina, `${id}: RT cost nothing, so nothing happened`);
    if (p.state === 'attack') assert.equal(p.moveKind, 'heavy', `${id}: RT fell back to something other than the heavy`);
  }
}

console.log('PASS: 21 unique options, 13 abilities, ally safety, finite state, armor piercing, one hit per activation, hide cancellation, movement, all-tier feeding, the heavy prompt matching the move, and the RT fallback.');
