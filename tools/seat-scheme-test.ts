/**
 * Telling duplicate picks apart. Run: npx tsx tools/seat-scheme-test.ts
 *
 * Four seats and one roster means two players on the same animal is ordinary, and until this they
 * were drawn identically. The rule under test: the first seat on a creature is never touched, the
 * ones after it are, they never collide with each other, and an assignment sticks rather than
 * re-rolling every time somebody else changes their mind.
 */
import { selectEra } from '../src/content';
import { CAMBRIAN } from '../src/content/cambrian';
import { DEVONIAN } from '../src/content/devonian';
import { TRIASSIC } from '../src/content/triassic';

let failed = 0;
const check = (n: string, ok: boolean, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(62)} ${d}`); if (!ok) failed++; };

// Every era has its own palette pack and they are not the same size — the Devonian's animals are
// authored in colour and the Triassic's pack is younger — so the rule is checked in all three, one
// process each. Not a loop: these modules read ACTIVE_ERA at module top, so a second `selectEra` in
// the same process changes nothing and every era would silently be tested as the Cambrian.
const which = process.argv[2] === 'devonian' ? 'devonian' : process.argv[2] === 'triassic' ? 'triassic' : 'cambrian';
const era = which === 'devonian' ? DEVONIAN : which === 'triassic' ? TRIASSIC : CAMBRIAN;
selectEra(era);
const { PLAYABLE } = await import('../src/sim/creatures');
const { SCHEMES, schemeForCreature } = await import('../src/shared/palettes');
const { alternateSchemes, assignSeatSchemes } = await import('../src/shared/seat-schemes');
console.log(`--- ${era.id} ---`);
const A = PLAYABLE[0].id, B = PLAYABLE[1].id;
/** A fixed sequence standing in for randomness, so a run is reproducible. */
const rolls = (...xs: number[]) => { let i = 0; return () => xs[i++ % xs.length]; };
const seats = (...ids: string[]) => ids.map((creature) => ({ creature }));

{
  const out = assignSeatSchemes(seats(A, A, A, A), rolls(0, 0.3, 0.6, 0.9));
  check('the first seat on a creature keeps its authored colours', out[0].scheme === undefined, `${A} → authored`);
  check('...and every seat after it is repainted', out.slice(1).every((p) => !!p.scheme), out.slice(1).map((p) => p.scheme).join(', '));
  check('...never twice with the same palette', new Set(out.slice(1).map((p) => p.scheme)).size === 3);
  check('...and never with the creature\'s own authored one', out.every((p) => p.scheme !== schemeForCreature(A)));
  check('...only ever with a palette that actually repaints', out.slice(1).every((p) => SCHEMES.find((s) => s.id === p.scheme)?.colors));
}
{
  // One seat each: nobody is a duplicate, so nobody is recoloured.
  const out = assignSeatSchemes(seats(A, B), rolls(0.5));
  check('two players on different animals are both left alone', out.every((p) => p.scheme === undefined));
}
{
  // Stickiness: seat 1 keeps what it had when an unrelated seat changes.
  const first = assignSeatSchemes(seats(A, A), rolls(0.42));
  const held = first[1].scheme;
  const next = assignSeatSchemes([...first, { creature: B }], rolls(0.9));
  check('an assignment sticks when somebody else joins', next[1].scheme === held, `${held} kept`);
  // ...and is given up when the seat stops being a duplicate.
  const solo = assignSeatSchemes([first[1]], rolls(0.1));
  check('...and is given up when the seat becomes the first on its creature', solo[0].scheme === undefined);
}
{
  // A stored scheme that is no longer a legal answer is replaced rather than kept.
  const out = assignSeatSchemes([{ creature: A }, { creature: A, scheme: 'not-a-scheme' }], rolls(0.2));
  check('a palette the pack does not have is replaced', !!out[1].scheme && out[1].scheme !== 'not-a-scheme', String(out[1].scheme));
}
{
  // The pool is big enough for a full lobby on one creature, on every creature in the roster.
  const thin = PLAYABLE.filter((c) => alternateSchemes(c.id).length < 3);
  check('every creature has palettes enough for four seats', thin.length === 0, thin.length ? thin.map((c) => c.id).join(', ') : `${alternateSchemes(A).length} for ${A}`);
}
{
  // Determinism: the same lineup and the same rolls give the same colours.
  const one = assignSeatSchemes(seats(A, A, A), rolls(0.11, 0.55, 0.77));
  const two = assignSeatSchemes(seats(A, A, A), rolls(0.11, 0.55, 0.77));
  check('the same lineup and the same rolls give the same colours', JSON.stringify(one) === JSON.stringify(two));
}

console.log(failed ? `FAILED (${failed})` : `all passed (${era.id})`);
process.exit(failed ? 1 : 0);
