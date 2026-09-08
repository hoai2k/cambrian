/**
 * The Rise record: the growth ladder, the high-water mark it leaves, and starting a match part
 * grown from it. Run: node tools/progress-test.mjs [cambrian|devonian]
 *
 * The point of the file is that there is exactly one copy of these assertions and both eras are
 * put through it. The two eras grow a player in different state — the Cambrian moults tiers on
 * nutrition, the Devonian moults life stages on standing — but everything above that talks to
 * src/sim/ladder.ts, so a feature written once has to behave the same in both. If this file ever
 * needs an `if (era === ...)` in it, the sharing has broken.
 *
 * The era is selected before the simulation modules are imported, because those read ACTIVE_ERA at
 * module top (the same order the entry pages use).
 */
import assert from 'node:assert/strict';
import { selectEra } from '../src/content';
import { CAMBRIAN } from '../src/content/cambrian';
import { DEVONIAN } from '../src/content/devonian';

const which = process.argv[2] === 'devonian' ? 'devonian' : 'cambrian';
selectEra(which === 'devonian' ? DEVONIAN : CAMBRIAN);

const { Game } = await import('../src/sim/game');
const { ladderName, ladderNames, ladderRung, ladderScale, clampRung, LADDER_RUNGS, LADDER_TOP } = await import('../src/sim/ladder');
const { PLAYABLE } = await import('../src/sim/creatures');
const { emptyInput, isCoop, MODE_IDS } = await import('../src/sim/types');
type InputFrame = import('../src/sim/types').InputFrame;
type Mode = import('../src/sim/types').Mode;
type CreatureId = import('../src/sim/creatures').CreatureId;

const DT = 1 / 60;
const tick = (g: InstanceType<typeof Game>, inputs = new Map<number, InputFrame>()) => { g.step(DT, inputs); g.events.length = 0; };
const run = (g: InstanceType<typeof Game>, seconds: number) => { for (let i = 0; i < Math.round(seconds * 60); i++) tick(g); };
let passes = 0;
const ok = (cond: unknown, msg: string) => { assert.ok(cond, `[${which}] ${msg}`); passes++; };

const HERO = PLAYABLE[0].id as CreatureId;
const setup = (creature: CreatureId, startRung = 0) => [{ creature, device: 'keyboard' as const, ready: true, startRung }];

// ---- the ladder itself ----
{
  ok(ladderNames().length === LADDER_RUNGS, `the ladder has ${LADDER_RUNGS} rungs: ${ladderNames().join(' → ')}`);
  ok(ladderNames().every((n) => typeof n === 'string' && n.length > 0), 'every rung is named');
  ok(ladderName(0) !== ladderName(LADDER_TOP), 'the bottom and the top are not the same word');
  // Anything stored can be hand-edited or left over from an older build, so the ladder has to be
  // total: no index may throw or produce a body of an impossible size.
  for (const bad of [-3, -1, 99, 4.7, NaN]) {
    const r = clampRung(bad);
    ok(r >= 0 && r <= LADDER_TOP, `rung ${bad} clamps into range (${r})`);
    ok(Number.isFinite(ladderScale(HERO, bad)) && ladderScale(HERO, bad) > 0, `rung ${bad} still gives a real body scale`);
  }
  for (const c of PLAYABLE) {
    let last = 0;
    for (let r = 0; r < LADDER_RUNGS; r++) {
      const sc = ladderScale(c.id as CreatureId, r);
      ok(sc > last, `${c.id}: rung ${r} is bigger than rung ${r - 1}`);
      last = sc;
    }
  }
}

// ---- starting part-grown ----
{
  // Rung 0 is the ordinary hatch, and must stay exactly what it was before this option existed.
  const plain = new Game('rise', setup(HERO), 11);
  const carried = new Game('rise', setup(HERO, 2), 11);
  ok(Math.abs(plain.players[0].scale - ladderScale(HERO, 0)) < 1e-6, 'rung 0 hatches at the bottom of the ladder');
  ok(carried.players[0].scale > plain.players[0].scale, 'carrying on hatches a bigger body');
  ok(Math.abs(carried.players[0].scale - ladderScale(HERO, 2)) < 1e-6, 'the body is exactly the rung asked for');
  // The whole point: the era's own reading of the body agrees with the ladder's.
  ok(ladderRung(carried, carried.players[0]) === 2, `the era reads the carried body back as rung 2 (${ladderName(2)})`);
  ok(ladderRung(plain, plain.players[0]) === 0, 'and the plain one as rung 0');
  // A body hatched part-grown has to be a working animal, not just a big number.
  const a = carried.players[0];
  ok(a.hp > 0 && a.hp === a.hpMax && a.stamina === a.staminaMax, 'it hatches at full health and stamina');
  run(carried, 4);
  ok(a.hp > 0 && Number.isFinite(a.pos.x) && Number.isFinite(a.pos.y), 'and is still a going concern four seconds in');
  // Every rung, every creature: nothing in the roster hatches broken.
  for (const c of PLAYABLE) for (let r = 0; r < LADDER_RUNGS; r++) {
    const g = new Game('rise', setup(c.id as CreatureId, r), 5);
    ok(ladderRung(g, g.players[0]) === r, `${c.id} hatches on rung ${r}`);
  }
}

// ---- only Rise carries anything on ----
{
  for (const m of MODE_IDS.filter((x) => x !== 'rise')) {
    const plain = new Game(m as Mode, setup(HERO), 7);
    const asked = new Game(m as Mode, setup(HERO, LADDER_TOP), 7);
    ok(Math.abs(plain.players[0].scale - asked.players[0].scale) < 1e-6,
      `${m} ignores a start rung — it hands out its own body`);
  }
}

// ---- the record a match leaves ----
{
  const g = new Game('rise', setup(HERO, 3), 21);
  run(g, 1);
  ok(g.discovery.best.get(HERO) === 3, 'Rise records the rung the player is standing on');
  // The bottom rung is where everyone starts, so it is not a mark: a record of it would say
  // nothing and would show a badge to a player who has never grown anything.
  const bottom = new Game('rise', setup(HERO), 21);
  run(bottom, 1);
  ok(bottom.discovery.best.size === 0, 'and records nothing for a player still on the bottom rung');
  // A record is a high-water mark: it never goes down, even when the player does.
  g.players[0].scale = ladderScale(HERO, 0);
  run(g, 1);
  ok(g.discovery.best.get(HERO) === 3, 'and it does not fall back when the body does');

  for (const m of MODE_IDS.filter((x) => x !== 'rise')) {
    const o = new Game(m as Mode, setup(HERO), 21);
    run(o, 1);
    ok(o.discovery.best.size === 0, `${m} records no growth: it never grew you`);
  }

  // The top of the ladder is the top of the ladder in both eras. Reading `tier` directly used to
  // mean no Devonian animal was ever credited with reaching it, because the Devonian grows stages.
  const top = new Game('rise', setup(HERO, LADDER_TOP), 21);
  run(top, 1);
  ok(top.discovery.apex.has(HERO), 'a player at the top of the ladder is recorded as having reached it');
  ok(top.discovery.best.get(HERO) === LADDER_TOP, 'and the record says so too');
}

// ---- Rise can be carried on after it is finished ----
{
  ok(isCoop('rise'), 'Rise is co-op, so its result is a milestone rather than a verdict');
  const g = new Game('rise', setup(HERO, LADDER_TOP), 3);
  g.state = { status: 'won', winner: 0, message: 'grew up' };
  ok(g.continueMatch(), 'a finished Rise match offers to carry on');
  ok(g.state.status === 'playing', 'and is playing again');
  // The goal must stop asking, or the match would win itself again the moment it resumed.
  run(g, 120);
  ok(g.state.status === 'playing', 'and does not immediately win a second time');
  ok(!g.continueMatch(), 'a match already running has nothing to carry on');

  const versus = new Game('hunted', setup(HERO), 3);
  versus.state = { status: 'won', winner: 0, message: 'won' };
  ok(!versus.continueMatch(), 'the versus mode refuses: its result is a verdict between players');
}

console.log(`${passes} progress assertions passed (${which})`);
