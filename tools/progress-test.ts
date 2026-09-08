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
const { ladderName, ladderNames, ladderRung, ladderScale, clampMark, fillOf, rungOf, MARK_NEAR_TOP, LADDER_RUNGS, LADDER_TOP } = await import('../src/sim/ladder');
const { PLAYABLE } = await import('../src/sim/creatures');
const { emptyInput, isCoop, MODE_IDS, TIER_NEED } = await import('../src/sim/types');
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
/** Two seats in the same sea, for the rules that are per player rather than per match. */
const pair = (a: CreatureId, aRung: number, b: CreatureId, bRung = 0) => [
  { creature: a, device: 'keyboard' as const, ready: true, startRung: aRung },
  { creature: b, device: 'keyboard2' as const, ready: true, startRung: bRung },
];
/** Put a player on the top rung the way growing there would, whichever era this is. */
const raiseToTop = (g: InstanceType<typeof Game>, i: number) => {
  const p = g.players[i];
  p.scale = ladderScale(p.creature as CreatureId, LADDER_TOP);
  p.tier = LADDER_TOP as typeof p.tier;
  DEV?.setStage(g, p, LADDER_TOP);
};
// The Devonian keeps growth in its own side table, so a test that wants a body *put* on a rung
// has to reach it. Nothing in the game does this — it moults — but a test must not have to run
// twenty minutes of feeding to reach the case it is checking.
const DEV = which === 'devonian'
  ? await import('../src/sim/devonian/state').then((m) => ({
      setStage: (g: InstanceType<typeof Game>, a: import('../src/sim/types').Actor, stage: number) => {
        const d = m.devActor(g, a); d.stage = stage; d.standing = m.STAGE_AT[stage];
      },
      standing: (g: InstanceType<typeof Game>, a: import('../src/sim/types').Actor) => m.devActor(g, a).standing,
      fill: (g: InstanceType<typeof Game>, a: import('../src/sim/types').Actor) => m.stageProgress(m.devActor(g, a)),
    }))
  : undefined;
/** How full this body's growth meter is, in whichever currency the era counts. */
const meterFill = (g: InstanceType<typeof Game>, a: import('../src/sim/types').Actor) =>
  DEV ? DEV.fill(g, a) : a.nutrition / TIER_NEED[a.tier];

// ---- the ladder itself ----
{
  ok(ladderNames().length === LADDER_RUNGS, `the ladder has ${LADDER_RUNGS} rungs: ${ladderNames().join(' → ')}`);
  ok(ladderNames().every((n) => typeof n === 'string' && n.length > 0), 'every rung is named');
  ok(ladderName(0) !== ladderName(LADDER_TOP), 'the bottom and the top are not the same word');
  // Anything stored can be hand-edited or left over from an older build, so the ladder has to be
  // total: no index may throw or produce a body of an impossible size.
  for (const bad of [-3, -1, 99, 4.7, NaN, Infinity]) {
    const m = clampMark(bad);
    ok(m >= 0 && m <= LADDER_TOP, `mark ${bad} clamps into range (${m})`);
    ok(rungOf(bad) >= 0 && rungOf(bad) <= LADDER_TOP, `and stands on a real rung (${rungOf(bad)})`);
    ok(fillOf(bad) >= 0 && fillOf(bad) < 1, `with a sane fill (${fillOf(bad)})`);
    ok(Number.isFinite(ladderScale(HERO, bad)) && ladderScale(HERO, bad) > 0, `mark ${bad} still gives a real body scale`);
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
}

// ---- a part-grown mark hatches a part-grown meter ----
{
  // 3.5 means "the rung below the top, half way through it". The body is the whole rung's size —
  // there is no animal between two rungs — and the meter carries the fraction.
  const half = new Game('rise', setup(HERO, MARK_NEAR_TOP), 31);
  const plain = new Game('rise', setup(HERO, rungOf(MARK_NEAR_TOP)), 31);
  const a = half.players[0];
  ok(rungOf(MARK_NEAR_TOP) === LADDER_TOP - 1, `the near-top mark stands on ${ladderName(MARK_NEAR_TOP)}`);
  ok(fillOf(MARK_NEAR_TOP) === 0.5, 'half way through it');
  ok(Math.abs(a.scale - plain.players[0].scale) < 1e-6, 'a part-grown body is the size of the rung it is on');
  ok(ladderRung(half, a) === rungOf(MARK_NEAR_TOP), 'and reads as that rung');
  ok(Math.abs(meterFill(half, a) - 0.5) < 0.02, `with its growth meter half full (${(meterFill(half, a) * 100).toFixed(0)}%)`);
  ok(meterFill(plain, plain.players[0]) < 0.02, 'where a whole mark starts the meter empty');
  // A quarter and three quarters, so the fraction is carried rather than special-cased at a half.
  for (const f of [0.25, 0.75]) {
    const g = new Game('rise', setup(HERO, 2 + f), 31);
    ok(Math.abs(meterFill(g, g.players[0]) - f) < 0.02, `a mark of 2.${f * 100} fills the meter ${f * 100}%`);
  }
  // The top rung has nothing above it, so it can never be partial.
  ok(fillOf(LADDER_TOP) === 0, 'the top rung is never part grown');
  ok(fillOf(LADDER_TOP + 3) === 0, '...however the stored number was mangled');
}

// ---- the top rung is banked by finishing, never by arriving ----
{
  const g = new Game('rise', setup(HERO), 41);
  raiseToTop(g, 0);
  run(g, 2);
  ok(g.discovery.best.get(HERO) === MARK_NEAR_TOP,
    `standing on ${ladderName(LADDER_TOP)} banks ${ladderName(MARK_NEAR_TOP)}, part grown — not the top`);
  ok(g.discovery.apex.has(HERO), 'though the codex still credits having been there');
  // Hold it out and the run finishes; that is what writes the top.
  run(g, 95);
  ok(g.state.status === 'won', 'holding the top for ninety seconds wins the run');
  ok(g.discovery.best.get(HERO) === LADDER_TOP, `and only then is ${ladderName(LADDER_TOP)} banked`);
}

// ---- arriving on the top rung is a victory lap, not a second win ----
{
  const g = new Game('rise', setup(HERO, LADDER_TOP), 43);
  const a = g.players[0];
  ok(a.carriedTop, 'a player who came in on the top rung is marked as having done so');
  ok(ladderRung(g, a) === LADDER_TOP, 'and is standing on it');
  run(g, 130);
  ok(g.state.status === 'playing', 'the clock never runs for them: the sea just stays open');
  ok(!g.discovery.best.has(HERO), 'and nothing is banked by arriving');
  // Someone who grew there normally is not marked, and does get the clock.
  const grew = new Game('rise', setup(HERO), 43);
  ok(!grew.players[0].carriedTop, 'a player who hatched at the bottom is not');
  // A near-top mark is a head start, not a free pass: it still has to grow the last rung.
  const nearly = new Game('rise', setup(HERO, MARK_NEAR_TOP), 43);
  ok(!nearly.players[0].carriedTop, 'and neither is one who came in part grown below the top');
}

// ---- one player's victory lap does not take the goal away from the other ----
{
  const g = new Game('rise', pair(HERO, LADDER_TOP, HERO, 0), 47);
  const [lap, racer] = g.players;
  ok(lap.carriedTop && !racer.carriedTop, 'one seat carried a finished run in, the other did not');
  raiseToTop(g, 1);
  run(g, 95);
  ok(g.state.status === 'won', 'the player who grew to the top still wins it');
  ok(g.state.winner === racer.player, `and it is credited to them (seat ${g.state.winner})`);
  ok(g.discovery.best.get(racer.creature as CreatureId) === LADDER_TOP, 'their record banks the top');
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
