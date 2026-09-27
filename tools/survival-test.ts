import assert from 'node:assert/strict';
import { Game } from '../src/sim/game';
import { emptyInput } from '../src/sim/types';
import { ladderMark, placeOnLadder } from '../src/sim/ladder';
import { MODE_IDS } from '../src/sim/types';
import { lengthOf } from '../src/sim/actors';

const setup = [{ creature: 'waptia' as const, device: 'keyboard' as const, ready: true }];
const survival = new Game('survival', setup, 31);
const rise = new Game('rise', setup, 31);
survival.skipHatch(); rise.skipHatch();
assert.deepEqual(MODE_IDS, ['rise', 'survival', 'reef']);
assert.equal(survival.players[0].hunger, 100);
const sp = survival.players[0], rp = rise.players[0];
sp.spawnProtect = rp.spawnProtect = 1000;
const before = ladderMark(survival, sp);
for (let i = 0; i < 60; i++) { survival.step(1 / 60, new Map([[0, emptyInput()]])); survival.events.length = 0; }
assert(sp.hunger < 100, 'Survival hunger falls with time');
assert(ladderMark(survival, sp) > before, 'Survival gains XP with time');
assert.equal(rp.nutrition, 0, 'Rise growth does not tick with time');
const heal = new Game('rise', setup, 47);
heal.skipHatch();
const hp = heal.players[0];
hp.spawnProtect = 1000;
const advance = (burst = 0) => {
  hp.sinceHit = 10;
  const old = hp.hp;
  heal.step(1 / 60, new Map([[0, { ...emptyInput(), burst }]]));
  heal.events.length = 0;
  return hp.hp - old;
};
hp.hp = hp.hpMax * 0.5;
heal.world.floraHash.clear();
const ordinary = advance();
assert(ordinary > 0, 'Health recovers at rest');
assert.equal(advance(1), 0, 'Sprinting pauses recovery');
const plant = { pos: { ...hp.pos }, kind: 'vauxia' as const, scale: 1, sy: 1, rot: 0, shade: 1, H: lengthOf(hp), R: 2, maxB: 0, bx: 0, bz: 0, bvx: 0, bvz: 0, active: true };
heal.world.flora.push(plant);
heal.world.floraHash.insert(plant);
hp.hp = hp.hpMax * 0.5;
const sheltered = advance();
assert(Math.abs(sheltered / ordinary - 2) < 0.1, 'A nearby seafloor plant doubles recovery');
const food = survival.actors.find((a) => a !== sp && a.controller !== 'player' && a.controller !== 'giant')!;
assert(food, 'A creature is available to eat');
const sim = survival as unknown as { canEat(a: typeof sp, food: typeof food): boolean; gainNutrition(a: typeof sp, food: typeof food, amount: number): void; respawn(a: typeof sp): void; nutritionValue(a: typeof sp, food: typeof food): number };
sp.hunger = 100;
assert(!sim.canEat(sp, food), 'A full player cannot eat');
sp.hunger = 0;
assert(sim.canEat(sp, food), 'An empty player can eat');
// Any room at all is room to eat. It used to ask whether the *whole* meal fitted, and a kill half
// again your own length is worth the full bar, so it could only be eaten at exactly zero.
sp.hunger = 60;
assert(sim.canEat(sp, food), 'A player with room eats a meal bigger than the room');
sim.gainNutrition(sp, food, 500);
assert.equal(sp.hunger, 100, '...and the bar tops out at full');
// Grazing, filter feeding and bones arrive with no body to measure. They fed nothing in Survival,
// so every grazer and filter feeder starved whatever it did.
sp.hunger = 40;
(survival as unknown as { gainNutrition(a: typeof sp, food: undefined, amount: number): void }).gainNutrition(sp, undefined, 5);
assert.equal(sp.hunger, 45, 'Food without a body (grazing, a bloom, bones) fills the stomach');
// Small prey is paid on the size ratio, not its square: a half-size kill is ten, not five.
{
  const { hungerWorth } = await import('../src/sim/survival');
  assert.equal(hungerWorth(0.5, 5), 10, 'a half-size meal is worth ten');
  assert.equal(hungerWorth(1.5, 100), 100, 'a big meal keeps the growth formula');
}
const xp = ladderMark(survival, sp);
sim.gainNutrition(sp, food, sim.nutritionValue(sp, food));
assert(sp.hunger > 0, 'Eating refills hunger');
assert.equal(ladderMark(survival, sp), xp, 'Eating does not award Survival growth');
placeOnLadder(survival, sp, 3.8);
sim.respawn(sp);
assert.equal(Math.floor(ladderMark(survival, sp)), 2, 'Survival death drops exactly one tier');
// A whole rung measured from where you stood, not from the start of the rung: 2.5 goes to 1.5.
placeOnLadder(survival, sp, 2.5);
sim.respawn(sp);
assert(Math.abs(ladderMark(survival, sp) - 1.5) < 0.05, `a death costs one rung from where you stood (${ladderMark(survival, sp).toFixed(2)})`);

const { STARVE_TIME, SURVIVAL_TOP_SECONDS, CAMBRIAN_LADDER } = await import('../src/sim/survival');
const fresh = () => {
  const g = new Game('survival', setup, 53); g.skipHatch();
  const a = g.players[0]; a.spawnProtect = 1000;
  for (const o of [...g.actors]) if (o !== a) g.remove(o);
  return { g, a, step: (n = 1, f = emptyInput()) => { for (let i = 0; i < n; i++) { g.step(1 / 60, new Map([[0, f]])); g.events.length = 0; } } };
};
// Starving eats the body over seconds rather than ending it on the frame the bar meets zero.
{
  const { a, step } = fresh();
  a.hunger = 0; a.hp = a.hpMax;
  step(60);
  assert(a.state !== 'dead' && a.hp < a.hpMax * 0.98, `a second of starving costs health and is not death (${(a.hp / a.hpMax).toFixed(2)})`);
  step(60 * (STARVE_TIME + 2));
  assert.equal(a.state, 'dead', 'starving long enough kills');
}
// The Cambrian's pace: the whole ladder in SURVIVAL_TOP_SECONDS.
{
  const { a, step } = fresh();
  const n0 = a.nutrition;
  step(600);
  const perSecond = (a.nutrition - n0) / 10;
  assert(Math.abs(perSecond - CAMBRIAN_LADDER / SURVIVAL_TOP_SECONDS) < 0.02, `Cambrian growth runs at ${perSecond.toFixed(3)}/s`);
}
// Hit growth follows the damage done, with no floor, and a team-mate pays nothing.
{
  const { hitSeconds } = await import('../src/sim/survival');
  assert(hitSeconds(2, 1, false) === hitSeconds(0.2, 1, false) * 10, 'hit growth follows the hit strength, with no floor');
  assert.equal(hitSeconds(0, 1, false), 0, 'a ping off a shell that did nothing pays nothing');
  assert.equal(hitSeconds(2, 1, true), 0, 'hitting a team-mate grows nothing');
  assert.equal(hitSeconds(2, 0.5, false), 0, 'something smaller than a peer is not a fight to grow from');
  assert(hitSeconds(1, 1.5, false) > hitSeconds(1, 1, false), 'something bigger pays more');
}
// Stamina is back: a player's bar is spent by effort and comes back at rest, in Survival as in Rise.
{
  const g = new Game('survival', setup, 61); g.skipHatch();
  const a = g.players[0]; a.spawnProtect = 1000;
  for (let i = 0; i < 10; i++) { g.step(1 / 60, new Map([[0, emptyInput()]])); g.events.length = 0; }
  const full = a.stamina;
  for (let i = 0; i < 20; i++) { g.step(1 / 60, new Map([[0, { ...emptyInput(), dash: true, my: 1 }]])); g.events.length = 0; }
  assert(a.stamina < full, `a dash spends a player's stamina (${full.toFixed(0)} -> ${a.stamina.toFixed(0)})`);
}
// Holding Apex in Survival finishes the run the way Rise does, and the match can be carried on.
{
  const { g, a, step } = fresh();
  a.tier = 4; a.nutrition = 0;
  const pr = (g as unknown as { progress: { apexT: number }[] }).progress[0];
  pr.apexT = 89.9;
  step(12);
  assert.equal(g.state.status, 'won', 'held Apex ends a Survival run with a result');
  assert(g.continueMatch(), 'and Survival can be carried on past it');
  assert.equal(g.state.status, 'playing', '...back to playing');
}
console.log('PASS Survival hunger, starving, eating, growth pace, hit growth, apex and the rung a death costs');
