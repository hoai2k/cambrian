/**
 * The sand a burrowing body throws: the mapping from "which hiding state did it just move between"
 * to "what does that owe the shower".
 *
 * Pure, because the decision is (`sandThrow` in src/render/fx.ts) — the renderer keeps only the
 * accumulator that turns a rate into whole grains, and everything worth being wrong about is here.
 * The three moments the effect exists for are going down, being covered, and coming back up; the
 * two that must cost nothing are a body that was never in the floor and one lying still under it.
 */
import assert from 'node:assert/strict';
import { sandThrow, type BurrowPhase, type SandThrow } from '../src/render/fx';

let checks = 0;
const check = (what: string, ok: boolean, detail = '') => {
  assert.ok(ok, `FAIL  ${what} ${detail}`);
  checks++;
  console.log(`PASS  ${what}${detail ? `  ${detail}` : ''}`);
};

const throwFor = (was: BurrowPhase, now: BurrowPhase, L = 2): SandThrow => {
  const t = sandThrow(was, now, L);
  assert.ok(t, `expected a shower for ${was} → ${now}`);
  return t;
};

// Nothing at all for a body that has nothing to do with the seabed, or one already settled in it.
check('a body that was never in the floor throws nothing', sandThrow('none', 'none', 2) === null);
check('...and one lying still under it throws nothing either', sandThrow('burrowed', 'burrowed', 2) === null,
  'staying buried moves no sand');

// Going down is a rate: the animal is working itself under for as long as it takes.
const down = throwFor('none', 'descending');
check('working down into the floor is a continuous shower', down.perSecond > 0 && down.grains === 0,
  `${down.perSecond}/s`);
const stillDown = throwFor('descending', 'descending');
check('...and it keeps running while the descent does', stillDown.perSecond === down.perSecond);

// Being covered, and surfacing, are each one throw.
const covered = throwFor('descending', 'burrowed');
check('the floor closing over it is one throw', covered.grains > 0 && covered.perSecond === 0,
  `${covered.grains} grains`);
const up = throwFor('burrowed', 'none');
check('coming up is one throw as well', up.grains > 0 && up.perSecond === 0, `${up.grains} grains`);
check('...and a harder one than going under', up.grains > covered.grains && up.up > covered.up,
  `${up.grains} grains at ${up.up.toFixed(2)} up against ${covered.grains} at ${covered.up.toFixed(2)}`);

// Abandoning the descent half way is a surfacing too: the body is back in the water either way.
const abandoned = throwFor('descending', 'none');
check('giving up part way down still throws sand', abandoned.grains === up.grains,
  'a body that stops digging is a body coming back out');

// Every shower is sized on the animal, because a Marrella and a giant do not move the same floor.
for (const phase of [['descending', 'burrowed'], ['burrowed', 'none']] as const) {
  const small = throwFor(phase[0], phase[1], 0.6), big = throwFor(phase[0], phase[1], 12);
  check(`a bigger body throws more sand further (${phase[0]} → ${phase[1]})`,
    big.grains > small.grains && big.spread > small.spread && big.speed > small.speed && big.size > small.size,
    `${small.grains} grains over ${small.spread.toFixed(2)} against ${big.grains} over ${big.spread.toFixed(2)}`);
}

// A hatchling is very nearly a point, and a shower of nothing is no shower: the body floor keeps
// the effect visible on the smallest animal on any roster.
const hatchling = throwFor('descending', 'burrowed', 0.01);
check('a hatchling still throws a shower somebody can see', hatchling.spread > 0.1 && hatchling.grains > 0,
  `${hatchling.grains} grains over ${hatchling.spread.toFixed(2)}`);

// Grains have to outlive the frame that made them or the throw is a flash.
for (const t of [down, covered, up]) check('every shower lasts long enough to be read', t.life > 0.5, `${t.life}s`);

console.log(`\n${checks} sand assertions passed`);
