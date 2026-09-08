/**
 * The record of what a player has found, and — the point of this file — *when* it is written.
 * Run: node tools/codex-test.mjs [cambrian|devonian]
 *
 * Biomes, landmarks and species taken to the top used to be saved by the results screen alone, so
 * a player who swam through half the sea and then quit to the title had nothing to show for it.
 * They are written as the match finds them now, which is what most of this file is guarding.
 *
 * Writing live costs the results screen the trick it used to mark finds new — comparing the store
 * against the match no longer works, because the store already contains the match — so the shell
 * accumulates what each match added instead. `mergeCodex` returning that list is the other half of
 * the contract here.
 */
import assert from 'node:assert/strict';
import { selectEra } from '../src/content';
import { CAMBRIAN } from '../src/content/cambrian';
import { DEVONIAN } from '../src/content/devonian';

const which = process.argv[2] === 'devonian' ? 'devonian' : 'cambrian';
const era = which === 'devonian' ? DEVONIAN : CAMBRIAN;
selectEra(era);

/** A localStorage that behaves like the real one, including throwing when told to. */
const store = new Map<string, string>();
let failWrites = false;
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { if (failWrites) throw new Error('quota'); store.set(k, String(v)); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => store.clear(),
};

const { anyFinds, emptyCodex, hasNewFinds, loadCodex, mergeCodex, recordFinds, saveCodex } = await import('../src/app/codex');
const { LADDER_TOP } = await import('../src/sim/ladder');
const { BIOMES } = await import('../src/sim/world');
const { PLAYABLE } = await import('../src/sim/creatures');
type Codex = import('../src/app/codex').Codex;

let passes = 0;
const ok = (cond: unknown, msg: string) => { assert.ok(cond, `[${which}] ${msg}`); passes++; };
const KEY = `${era.copy.settingsKey}-codex`;
const HERO = PLAYABLE[0].id;
const OTHER = PLAYABLE[1].id;
const found = (p: Partial<Codex>): Codex => ({ ...emptyCodex(), ...p });
const reset = () => { store.clear(); failWrites = false; };

// ---- per era, and nothing shared ----
{
  reset();
  saveCodex(found({ biomes: [BIOMES[0]] }));
  ok(store.has(KEY), `the record is stored under ${KEY}`);
  ok([...store.keys()].every((k) => k.startsWith(era.copy.settingsKey)), 'and nothing is written outside this era\'s keys');
}

// ---- a match's finds are written as it finds them ----
{
  reset();
  ok(!store.has(KEY), 'nothing stored yet');
  // This is the shape the HUD hands over every frame while a match is running.
  const fresh1 = recordFinds(found({ biomes: [BIOMES[1]] }));
  ok(loadCodex().biomes.join() === BIOMES[1], 'a biome swum through is in the record straight away');
  ok(fresh1.biomes.join() === BIOMES[1], 'and is reported as new');
  // No results screen, no win, no explicit save: leaving now must keep it.
  ok(JSON.parse(store.get(KEY)!).biomes.join() === BIOMES[1], 'without anything having finished the match');

  const fresh2 = recordFinds(found({ biomes: [BIOMES[1], BIOMES[2]] }));
  ok(loadCodex().biomes.length === 2, 'a second biome is added to the first');
  ok(fresh2.biomes.join() === BIOMES[2], 'and only the one that was actually new is reported');
  ok(!anyFinds(recordFinds(found({ biomes: [BIOMES[1], BIOMES[2]] }))), 'seeing them again adds nothing');
}

// ---- every kind of find, not just biomes ----
{
  reset();
  const fresh = recordFinds(found({
    biomes: [BIOMES[3]], landmarks: ['arch'], apex: [HERO], best: { [HERO]: 2 },
  }));
  const c = loadCodex();
  ok(c.biomes.join() === BIOMES[3], 'biomes are recorded');
  ok(c.landmarks.join() === 'arch', 'landmarks are recorded');
  ok(c.apex.join() === HERO, 'species taken to the top are recorded');
  ok(c.best[HERO] === 2, 'growth marks are recorded');
  ok(fresh.landmarks.join() === 'arch' && fresh.apex.join() === HERO && fresh.best[HERO] === 2, 'and all of it is reported new');
}

// ---- the record only ever grows ----
{
  reset();
  recordFinds(found({ biomes: [BIOMES[0], BIOMES[1]], best: { [HERO]: 3 } }));
  // A later match that found less must not take anything away: this is a record, not a state dump.
  recordFinds(found({ biomes: [BIOMES[0]], best: { [HERO]: 1 } }));
  const c = loadCodex();
  ok(c.biomes.length === 2, 'a later match that saw less does not erase what an earlier one saw');
  ok(c.best[HERO] === 3, 'and a lower growth mark never lowers the record');
  ok(!anyFinds(recordFinds(found({ best: { [HERO]: 3 } }))), 'matching the record is not news');
  ok(recordFinds(found({ best: { [HERO]: LADDER_TOP } })).best[HERO] === LADDER_TOP, 'beating it is');
}

// ---- the cheap check agrees with the merge, because it is what guards it ----
{
  const seen = found({ biomes: [BIOMES[0]], landmarks: ['arch'], apex: [HERO], best: { [HERO]: 2 } });
  const cases: [string, Codex][] = [
    ['nothing at all', emptyCodex()],
    ['only what is already known', found({ biomes: [BIOMES[0]], landmarks: ['arch'], apex: [HERO], best: { [HERO]: 2 } })],
    ['a lower mark', found({ best: { [HERO]: 1 } })],
    ['a new biome', found({ biomes: [BIOMES[0], BIOMES[4]] })],
    ['a new landmark', found({ landmarks: ['arch', 'stack'] })],
    ['a new apex', found({ apex: [HERO, OTHER] })],
    ['a higher mark', found({ best: { [HERO]: 3 } })],
    ['a first mark for another creature', found({ best: { [OTHER]: 1 } })],
  ];
  for (const [name, f] of cases) {
    const merged = anyFinds(mergeCodex(seen, f).fresh);
    ok(hasNewFinds(seen, f) === merged, `the frame check and the merge agree on ${name} (${merged ? 'new' : 'nothing'})`);
  }
}

// ---- storing is a bonus, never something a match depends on ----
{
  reset();
  failWrites = true;
  let threw = false;
  try { recordFinds(found({ biomes: [BIOMES[0]] })); } catch { threw = true; }
  ok(!threw, 'a browser that refuses to store (private mode, full quota) does not break the match');
  failWrites = false;
  // And a corrupt record reads as an empty one rather than taking a screen down with it.
  store.set(KEY, '{not json');
  ok(loadCodex().biomes.length === 0, 'a corrupt record reads as empty');
  store.set(KEY, JSON.stringify({ biomes: 'not-an-array', best: 5, apex: [42, HERO] }));
  const c = loadCodex();
  ok(Array.isArray(c.biomes) && c.biomes.length === 0, 'a wrong-typed field reads as empty');
  ok(c.apex.join() === HERO, 'and a list keeps the entries it can use');
}

console.log(`${passes} codex assertions passed (${which})`);
