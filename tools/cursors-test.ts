/**
 * The cursor is the crosshair in mouse play, so what it draws is a readout like any other.
 * Run: npm run cursors
 */
import { cursorFor, cursorState, type CursorState } from '../src/shared/cursors';

let failed = 0;
const check = (n: string, ok: boolean, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(56)} ${d}`); if (!ok) failed++; };
const m = (o: Partial<{ dragging: boolean; right: boolean; pressing: boolean }> = {}) =>
  ({ dragging: false, right: false, pressing: false, ...o });

// What the buttons are *doing* outranks what the cursor is *over*: a press in progress is the more
// urgent fact, and a cursor that still said "edible" while the camera was being dragged would be
// describing something the button is no longer about to do.
check('over nothing, it is the plain cross', cursorState(m(), 'none') === 'idle');
check('over something you could eat, it says so', cursorState(m(), 'edible') === 'edible');
check('over a fight, it says that instead', cursorState(m(), 'attack') === 'attack');
check('a press on a target is winding up a pounce', cursorState(m({ pressing: true }), 'edible') === 'target');
check('...and on a fight it is the same wind-up', cursorState(m({ pressing: true }), 'attack') === 'target');
check('a press over nothing is not a wind-up', cursorState(m({ pressing: true }), 'none') === 'idle');
check('a drag is looking around, whatever is under it', cursorState(m({ dragging: true }), 'edible') === 'look');
check('the right button is the dash, whatever is under it', cursorState(m({ right: true }), 'attack') === 'zoom');
check('...and it outranks a drag', cursorState(m({ right: true, dragging: true }), 'none') === 'zoom');

// Every state has to *look* different, or the readout says nothing. And each has to be a real CSS
// cursor value with a fallback after it, because a data URI the browser rejects leaves no pointer
// at all — the one failure a player cannot recover from without alt-tabbing.
const STATES: CursorState[] = ['idle', 'edible', 'attack', 'target', 'zoom', 'look'];
const drawn = STATES.map(cursorFor);
check('every state draws something', drawn.every((c) => c.length > 0));
check('...and no two are the same drawing', new Set(drawn).size === drawn.length, `${new Set(drawn).size} of ${drawn.length}`);
for (const s of STATES) {
  const c = cursorFor(s);
  const ok = c === 'grabbing' || (c.startsWith('url("data:image/svg+xml,') && /,\s*(crosshair|pointer|auto)$/.test(c));
  check(`${s} is a usable cursor with a fallback`, ok, c.slice(0, 34));
}
// Off the match the page's own pointer comes back: a targeting reticle over a Quit button is a lie
// about what a click does.
check('the menus get the ordinary pointer back', cursorFor('menu') === '');

console.log(failed ? `FAILED (${failed})` : 'PASS: the cursor says what it is over and what the buttons are doing');
process.exit(failed ? 1 : 0);
