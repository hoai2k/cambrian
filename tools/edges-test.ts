/**
 * Rising-edge detection, the thing three input loops used to hand-roll.
 *
 * Usage: npx esbuild tools/edges-test.ts --bundle --platform=node --format=esm --outfile=/tmp/e.mjs && node /tmp/e.mjs
 */
import { Edges } from '../src/shared/edges';

let failed = 0;
const check = (n: string, ok: boolean, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(56)} ${d}`); if (!ok) failed++; };

{
  const e = new Edges();
  check('a first press is an edge', e.step({ a: true }).a === true);
  check('...and holding it is not', e.step({ a: true }).a === false);
  check('...nor is releasing it', e.step({ a: false }).a === false);
  check('...and pressing it again is', e.step({ a: true }).a === true);
}
{
  // The fault this replaces: a key read but forgotten in the remembering stayed "just pressed"
  // for as long as it was held. Every key in the bag is remembered, because it is one list.
  const e = new Edges();
  const one = e.step({ a: true, b: true, c: false });
  check('every key in the bag gets an edge', one.a && one.b && !one.c);
  const two = e.step({ a: true, b: true, c: true });
  check('...and every one of them is remembered', !two.a && !two.b && two.c);
}
{
  // Reading twice in one frame must not invent a second press.
  const e = new Edges();
  e.step({ a: true });
  check('a second read in the same frame sees no edge', e.step({ a: true }).a === false);
}
{
  // `hold` is what stops the button that opened a menu from also answering its first question.
  const e = new Edges();
  e.hold('confirm');
  check('a held key does not fire on the next frame', e.step({ confirm: true }).confirm === false);
  check('...but does once released and pressed again', e.step({ confirm: false }).confirm === false && e.step({ confirm: true }).confirm === true);
}
{
  // A pad that goes away and comes back must not inherit the buttons it vanished holding.
  const e = new Edges();
  e.step({ a: true });
  e.clear();
  check('a cleared tracker sees a fresh press', e.step({ a: true }).a === true);
}

console.log(failed ? `\n${failed} FAILED` : '\nall edge tests passed'); process.exit(failed ? 1 : 0);
