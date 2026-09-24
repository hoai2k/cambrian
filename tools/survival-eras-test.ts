/**
 * Survival in the Devonian and the Triassic, which keep their ladders in standing rather than in
 * the Cambrian's nutrition. Run once per era: `npm run survival` does both.
 */
import assert from 'node:assert/strict';
import { selectEra } from '../src/content';
import { DEVONIAN } from '../src/content/devonian';
import { TRIASSIC } from '../src/content/triassic';
const era = process.argv[2] === 'triassic' ? 'triassic' : 'devonian';
selectEra(era === 'triassic' ? TRIASSIC : DEVONIAN);
const { Game } = await import('../src/sim/game');
const { PLAYABLE_IDS, creature } = await import('../src/sim/creatures');
const { ladderMark, ladderRung, placeOnLadder } = await import('../src/sim/ladder');
const { devActor, STAGE_AT, PRIME_STAGE } = await import('../src/sim/devonian/state');
const { SURVIVAL_TOP_SECONDS } = await import('../src/sim/survival');
const { emptyInput } = await import('../src/sim/types');
type Id = (typeof PLAYABLE_IDS)[number];

const game = (id: Id) => {
  const g = new Game('survival', [{ creature: id, device: 'keyboard' as const, ready: true }], 83);
  g.skipHatch();
  g.players[0].spawnProtect = 1000;
  return g;
};
const run = (g: InstanceType<typeof Game>, seconds: number) => { for (let i = 0; i < seconds * 60; i++) { g.step(1 / 60, new Map([[0, emptyInput()]])); g.events.length = 0; } };

const g = game(PLAYABLE_IDS[0]);
const p = g.players[0];
const before = ladderMark(g, p);
run(g, 2);
assert(ladderMark(g, p) > before, `${era}: timed XP advances the era's ladder`);
assert(p.hunger < 100, `${era}: hunger falls`);

// Every animal climbs at one pace. Time used to go through the era's food-chain weighting, which is
// there to even out *meal size* — so a rung-4 predator grew at a sixth of a rung-1 snack's rate.
const byRung = [...PLAYABLE_IDS].sort((a, b) => (creature(a).rung ?? 2) - (creature(b).rung ?? 2));
const low = byRung[0], high = byRung[byRung.length - 1];
const rate = (id: Id) => {
  const gg = game(id), a = gg.players[0];
  const s0 = devActor(gg, a).standing;
  run(gg, 10);
  return (devActor(gg, a).standing - s0) / 10;
};
const want = STAGE_AT[PRIME_STAGE] / SURVIVAL_TOP_SECONDS;
const rLow = rate(low), rHigh = rate(high);
assert(creature(low).rung !== creature(high).rung, `${era}: two rungs to compare`);
assert(Math.abs(rLow - want) / want < 0.05 && Math.abs(rHigh - want) / want < 0.05,
  `${era}: rung ${creature(low).rung} ${rLow.toFixed(4)}/s and rung ${creature(high).rung} ${rHigh.toFixed(4)}/s both grow at ${want.toFixed(4)}/s`);

placeOnLadder(g, p, 3.4);
(g as unknown as { respawn(a: typeof p): void }).respawn(p);
assert.equal(ladderRung(g, p), 2, `${era}: a death costs a whole rung`);
console.log(`PASS ${era} Survival growth at one pace for rung ${creature(low).rung} and rung ${creature(high).rung}, hunger and the rung a death costs`);
