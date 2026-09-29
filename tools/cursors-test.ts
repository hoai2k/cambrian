/**
 * The cursor is the crosshair in mouse play, so what it draws is a readout like any other.
 * Run: npm run cursors
 */
import { cursorFor, cursorImageFor, cursorState, type CursorState } from '../src/shared/cursors';
import { checker, finish } from './lib/test';

const check = checker(56);
const m = (o: Partial<{ dragging: boolean; dashing: boolean; hidden: boolean }> = {}) =>
  ({ dragging: false, dashing: false, hidden: false, ...o });

// What the buttons are *doing* outranks what the cursor is *over*: a press in progress is the more
// urgent fact, and a cursor that still said "edible" while the camera was being dragged would be
// describing something the button is no longer about to do.
check('over nothing, it is the plain cross', cursorState(m(), 'none') === 'idle');
check('over something you could eat, it says so', cursorState(m(), 'edible') === 'edible');
check('over a fight, it says that instead', cursorState(m(), 'attack') === 'attack');
check('a middle drag is looking around, whatever is under it', cursorState(m({ dragging: true }), 'edible') === 'look');
check('a dash is the dash, whatever is under it', cursorState(m({ dashing: true }), 'attack') === 'zoom');
check('...and it outranks a drag', cursorState(m({ dashing: true, dragging: true }), 'none') === 'zoom');
check('steering or a chase puts the pointer away', cursorState(m({ hidden: true, dashing: true }), 'attack') === 'hidden');
// The dash is drawn by the HUD so it can move — the CSS pointer is put away under it — and what it
// draws is the ordinary cross, flung into the distance, rather than an arrow of its own.
check('the dash puts the CSS pointer away', cursorFor('zoom') === 'none' && cursorFor('hidden') === 'none');
check('...and its mark is the idle cross', cursorImageFor('zoom') === cursorImageFor('idle') && cursorImageFor('idle').startsWith('data:image/svg+xml,'));

// Every state has to *look* different, or the readout says nothing. And each has to be a real CSS
// cursor value with a fallback after it, because a data URI the browser rejects leaves no pointer
// at all — the one failure a player cannot recover from without alt-tabbing.
const STATES: CursorState[] = ['idle', 'edible', 'attack', 'look'];
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
finish('PASS: the cursor says what it is over and what the buttons are doing');
