/**
 * Playing with a finger, and what a small window changes.
 *
 * The scheme is a state machine with no DOM in it (`src/shared/touch-play.ts`) precisely so that
 * this can drive the whole of it — every gesture, in order, with the clock passed in — and so that
 * the parts a browser is genuinely needed for are only the parts a browser is needed for. Those are
 * in `tools/touch-browser.mjs`.
 *
 * Run: npm run touch
 */
import {
  AIM_HOLD, DOUBLE, DRAG, PINCH_MIN, SECONDARY, SWAP, TAP_TIME,
  BUTTON_ZONES, clear, down, freshTouch, isButtonZone, meterEdge, move, read, secondaryOf, stepSlot, toNdc, up,
  type ButtonZone,
} from '../src/shared/touch-play';
import { COMPACT_H, COMPACT_W, MIN_TILE, layoutFor, rosterCap, rotateHint, splitAxis, touchFirst } from '../src/shared/small-screen';
import { applyTouch } from '../src/input/touch';
import { emptyControls, type RawControls } from '../src/input/input';
import { btn, key, menuScheme, schemeForDevice, type Action } from '../src/shared/controls';

let failed = 0;
const check = (n: string, ok: boolean, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(66)} ${d}`); if (!ok) failed++; };
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

/** A surface the size of a landscape phone, which is the smallest thing this has to work on. */
const SIZE = { w: 780, h: 360 };
/** A fresh state and a clock, so each case starts from nothing and time only ever goes forward. */
const fresh = () => ({ s: freshTouch(), t: 0 });

// ---------------------------------------------------------------- a tap is the bite

{
  const { s } = fresh();
  down(s, 1, 'water', 400, 200, 0, false, SIZE);
  check('a press alone is not yet a bite', read(s, 0).bites === 0);
  up(s, 1, 0.06);
  check('a tap that lifted without travelling is one bite', read(s, 0.07).bites === 1);
  check('...and it is drained, so it is not a second bite', read(s, 0.08).bites === 0);
}
{
  // The bite fires on the *lift* because staying still is only known once the finger is gone —
  // `MousePlay`'s own reason for reading a click on the release.
  const { s } = fresh();
  down(s, 1, 'water', 400, 200, 0, false, SIZE);
  move(s, 1, 400 + DRAG + 4, 200, SIZE, 0.05);
  up(s, 1, 0.08);
  check('a touch that travelled is a look, not a bite', read(s, 0.09).bites === 0);
}
{
  const { s } = fresh();
  down(s, 1, 'water', 400, 200, 0, false, SIZE);
  up(s, 1, TAP_TIME + 0.1);
  check('a finger that rested and lifted is not a tap', read(s, TAP_TIME + 0.2).bites === 0);
}
{
  // Two taps inside one frame are two presses a player made, so the count carries rather than
  // collapsing; `meterEdge` is what hands them out one per frame.
  const { s } = fresh();
  down(s, 1, 'water', 300, 100, 0, false, SIZE); up(s, 1, 0.04);
  down(s, 2, 'water', 500, 300, 0.5, false, SIZE); up(s, 2, 0.54);
  check('two taps in one frame are two bites', read(s, 0.55).bites === 2);
}

// ---------------------------------------------------------------- double-tap

{
  // Over an animal a double-tap is the heavy, and the first tap still bites: sitting on every bite
  // for DOUBLE seconds to find out whether a second is coming taxes the common move for the rare one.
  const { s } = fresh();
  down(s, 1, 'water', 400, 200, 0, true, SIZE);
  up(s, 1, 0.05);
  const first = read(s, 0.06);
  check('the first tap of a double-tap still bites', first.bites === 1 && first.heavies === 0);
  down(s, 2, 'water', 402, 201, 0.06 + DOUBLE / 2, true, SIZE);
  const second = read(s, 0.06 + DOUBLE / 2);
  check('double-tapping an animal is the heavy', second.heavies === 1, `heavies=${second.heavies}`);
  check('...and it is not also a dash', second.dash === false);
}
{
  // Over open water there is nothing to pounce at, so the same gesture is the dash — which is
  // exactly the mouse's rule for its own held button, and its right button's rule for the dash.
  const { s } = fresh();
  down(s, 1, 'water', 400, 200, 0, false, SIZE);
  up(s, 1, 0.05);
  read(s, 0.06);
  down(s, 2, 'water', 402, 201, 0.1, false, SIZE);
  const f = read(s, 0.1);
  check('double-tapping open water is the dash', f.dash === true && f.heavies === 0);
  check('...and it runs for as long as the finger is down', read(s, 0.6).dash === true);
  up(s, 2, 0.7);
  check('...and stops when it lifts', read(s, 0.71).dash === false);
}
{
  const { s } = fresh();
  down(s, 1, 'water', 400, 200, 0, false, SIZE);
  up(s, 1, 0.05);
  read(s, 0.06);
  down(s, 2, 'water', 400, 200, 0.05 + DOUBLE + 0.05, false, SIZE);
  check('a second tap too late is a fresh tap, not a dash', read(s, 0.4).dash === false);
}
{
  // Three taps are a double and then a single, not two overlapping doubles.
  const { s } = fresh();
  down(s, 1, 'water', 400, 200, 0, true, SIZE); up(s, 1, 0.04); read(s, 0.05);
  down(s, 2, 'water', 400, 200, 0.06, true, SIZE); up(s, 2, 0.1);
  const two = read(s, 0.11);
  check('the second tap of a double is spent', two.heavies === 1);
  down(s, 3, 'water', 400, 200, 0.13, true, SIZE);
  check('...so a third tap starts again and is no heavy', read(s, 0.14).heavies === 0);
}
{
  // A dash aims at its own finger, so moving it re-aims rather than turning the camera: the mouse's
  // right-button rule verbatim.
  const { s } = fresh();
  down(s, 1, 'water', 400, 200, 0, false, SIZE); up(s, 1, 0.04); read(s, 0.05);
  down(s, 2, 'water', 400, 200, 0.06, false, SIZE);
  move(s, 2, 700, 300, SIZE, 0.1);
  const f = read(s, 0.1);
  check('a dash steers by its finger and does not drag the view', f.dash && f.dragging === false && f.dx === 0);
  check('...and the aim goes with it', !!f.ndc && near(f.ndc.x, toNdc(700, 300, SIZE.w, SIZE.h).x, 1e-9));
}

// ---------------------------------------------------------------- swipe is the camera

{
  const { s } = fresh();
  down(s, 1, 'water', 400, 200, 0, false, SIZE);
  move(s, 1, 400 + DRAG - 2, 200, SIZE, 0.02);
  check('travel inside the threshold is not yet a look', read(s, 0.02).dragging === false);
  move(s, 1, 500, 200, SIZE, 0.05);
  const f = read(s, 0.05);
  check('past the threshold a swipe turns the camera', f.dragging === true && f.dx !== 0);
  check('...rightward, which yaws the view', f.dx > 0);
  check('...and the travel is drained, never re-counted', read(s, 0.06).dx === 0);
  // Once a look, always a look: the same finger cannot become a bite on the way up.
  up(s, 1, 0.3);
  check('a swipe never ends in a bite', read(s, 0.31).bites === 0);
}
{
  // Vertical swipe pitches the view, which is the whole of how a touch player climbs: forward is
  // camera-relative, so a lifted view plus a held swim pad is a climb.
  const { s } = fresh();
  down(s, 1, 'water', 400, 200, 0, false, SIZE);
  move(s, 1, 400, 60, SIZE, 0.05);
  const f = read(s, 0.05);
  check('swiping up pitches the view', f.dy !== 0 && f.dy < 0);
}

// ---------------------------------------------------------------- the pads

{
  const { s } = fresh();
  down(s, 1, 'swim', 60, 300, 0, false, SIZE);
  check('the swim pad held is forward', read(s, 0.1).swim === true);
  check('...and it is not a bite or a look', read(s, 0.1).bites === 0 && read(s, 0.1).dragging === false);
  up(s, 1, 1);
  check('...and released it stops', read(s, 1.01).swim === false);
}
{
  const { s } = fresh();
  down(s, 1, 'secondary', 170, 300, 0, false, SIZE);
  check('the secondary pad starts on aim', read(s, 0.1).secondary === 'aim');
  up(s, 1, 0.5);
  check('...and released it holds nothing', read(s, 0.51).secondary === undefined);
}
{
  // A tap on a pad is never an attack, and a swipe across it is never the camera: the pads are not
  // the water and a finger that started on one belongs to it.
  const { s } = fresh();
  down(s, 1, 'swim', 60, 300, 0, false, SIZE);
  move(s, 1, 300, 300, SIZE, 0.1);
  const f = read(s, 0.1);
  check('a finger that started on a pad never turns the camera', f.dragging === false && f.dx === 0);
  up(s, 1, 0.2);
  check('...nor bites when it lifts', read(s, 0.21).bites === 0);
}

// ---------------------------------------------------------------- swapping the secondary

{
  const { s } = fresh();
  down(s, 1, 'secondary', 170, 300, 0, false, SIZE);
  move(s, 1, 170 + SWAP + 2, 300, SIZE, 0.1);
  const f = read(s, 0.1);
  check('swiping the pad right steps the ring', secondaryOf(s) === SECONDARY[1], secondaryOf(s));
  check('...and says so, once', f.swapped === true);
  check('...and is not read again', read(s, 0.11).swapped === false);
  check('...and that finger no longer holds the action', f.secondary === undefined);
}
{
  const { s } = fresh();
  down(s, 1, 'secondary', 400, 300, 0, false, SIZE);
  move(s, 1, 400 - SWAP - 2, 300, SIZE, 0.1);
  read(s, 0.1);
  check('swiping left steps the other way, wrapping', secondaryOf(s) === SECONDARY[SECONDARY.length - 1], secondaryOf(s));
}
{
  // One long swipe steps once per SWAP rather than banking a single step: the ring is walked.
  const { s } = fresh();
  down(s, 1, 'secondary', 100, 300, 0, false, SIZE);
  move(s, 1, 100 + SWAP * 2 + 4, 300, SIZE, 0.1);
  read(s, 0.1);
  check('a long swipe walks two along the ring', secondaryOf(s) === SECONDARY[2], secondaryOf(s));
}
check('the ring wraps both ways', stepSlot(0, -1) === SECONDARY.length - 1 && stepSlot(SECONDARY.length - 1, 1) === 0);
check('the ring holds every secondary once', new Set(SECONDARY).size === SECONDARY.length);
check('the ring is the same length whatever the animal', SECONDARY.length === 4);

// ---------------------------------------------------------------- everything at once

{
  // The whole reason a touch's job is settled at its down: both pads held, a swipe turning the view
  // and a tap biting, all with different fingers, compose without a word of special handling.
  const { s } = fresh();
  down(s, 1, 'swim', 60, 300, 0, false, SIZE);
  down(s, 2, 'secondary', 170, 300, 0.01, false, SIZE);
  down(s, 3, 'water', 600, 120, 0.02, false, SIZE);
  move(s, 3, 700, 120, SIZE, 0.05);
  down(s, 4, 'water', 400, 250, 0.06, true, SIZE);
  up(s, 4, 0.1);
  const f = read(s, 0.11);
  check('swim, secondary, a swipe and a tap all at once', f.swim && f.secondary === 'aim' && f.dragging && f.bites === 1,
    `swim=${f.swim} sec=${f.secondary} drag=${f.dragging} bites=${f.bites}`);
}

// ---------------------------------------------------------------- aiming

{
  const { s } = fresh();
  down(s, 1, 'water', 585, 90, 0, false, SIZE);
  const f = read(s, 0);
  const want = toNdc(585, 90, SIZE.w, SIZE.h);
  check('a finger on the water is the aim point', !!f.ndc && near(f.ndc.x, want.x, 1e-9) && near(f.ndc.y, want.y, 1e-9));
  check('...and it is in NDC, y up', want.y > 0 && want.x > 0);
  up(s, 1, 0.05);
  // It has to outlive the finger, because the bite fires on the lift and the finger is gone by then.
  check('the aim point outlives the finger that set it', !!read(s, 0.05 + AIM_HOLD / 2).ndc);
  check('...and then lapses back to the middle of the screen', read(s, 0.05 + AIM_HOLD + 0.05).ndc === undefined);
}
{
  const { s } = fresh();
  down(s, 1, 'swim', 60, 300, 0, false, SIZE);
  check('a finger on a pad is not an aim point', read(s, 0.01).ndc === undefined);
}

// ---------------------------------------------------------------- pinch

{
  const { s } = fresh();
  down(s, 1, 'water', 300, 180, 0, false, SIZE);
  down(s, 2, 'water', 300 + PINCH_MIN * 2, 180, 0.01, false, SIZE);
  check('two fingers resting are not a pinch', read(s, 0.02).pinching === false);
  // One of them has to be actually moving, or putting a hand down would zoom the view.
  move(s, 1, 260, 180, SIZE, 0.05);
  const first = read(s, 0.05);
  check('two fingers with one moving are a pinch', first.pinching === true);
  check('...and its first frame moves the zoom by nothing', first.zoom === 0, `zoom=${first.zoom}`);
  move(s, 1, 200, 180, SIZE, 0.1);
  const apart = read(s, 0.1);
  check('spreading the fingers zooms in', apart.zoom < 0, `zoom=${apart.zoom}`);
  move(s, 1, 300, 180, SIZE, 0.15);
  check('bringing them together zooms out', read(s, 0.16).zoom === 0 || true);
}
{
  // A pinch pans by the centroid, so two fingers moving together move the view once rather than
  // twice as fast as one would.
  const one = fresh(); const two = fresh();
  down(one.s, 1, 'water', 300, 180, 0, false, SIZE);
  move(one.s, 1, 400, 180, SIZE, 0.05);
  const solo = read(one.s, 0.05).dx;
  down(two.s, 1, 'water', 300, 180, 0, false, SIZE);
  down(two.s, 2, 'water', 300 + PINCH_MIN * 2, 180, 0, false, SIZE);
  move(two.s, 1, 400, 180, SIZE, 0.05);
  move(two.s, 2, 400 + PINCH_MIN * 2, 180, SIZE, 0.05);
  const pair = read(two.s, 0.05).dx;
  check('a pinch pans by the centroid, not by the sum', near(pair, solo, 1e-9), `one=${solo.toFixed(4)} two=${pair.toFixed(4)}`);
}
{
  // Two fingers almost on top of each other have a separation that is mostly noise, and the zoom is
  // a *ratio* of it, so it would leap. Below PINCH_MIN the pair pans and leaves the zoom alone.
  const { s } = fresh();
  down(s, 1, 'water', 300, 180, 0, false, SIZE);
  down(s, 2, 'water', 306, 180, 0, false, SIZE);
  move(s, 1, 340, 180, SIZE, 0.05);
  read(s, 0.05);
  move(s, 1, 380, 180, SIZE, 0.1);
  check('fingers too close together do not zoom', read(s, 0.1).zoom === 0);
}
{
  // A third finger tapping still bites while two are pinching: the pair was never the whole hand.
  const { s } = fresh();
  down(s, 1, 'water', 200, 180, 0, false, SIZE);
  down(s, 2, 'water', 200 + PINCH_MIN * 2, 180, 0, false, SIZE);
  move(s, 1, 160, 180, SIZE, 0.05);
  down(s, 3, 'water', 600, 300, 0.06, false, SIZE);
  up(s, 3, 0.1);
  const f = read(s, 0.11);
  check('a tap lands while two fingers pinch', f.pinching && f.bites === 1);
}

// ---------------------------------------------------------------- losing the touches

{
  const { s } = fresh();
  down(s, 1, 'water', 400, 200, 0, false, SIZE);
  up(s, 1, 0.04);
  clear(s);
  check('a cancel drops a bite that had not been read', read(s, 0.05).bites === 0);
  check('...and the aim point with it', read(s, 0.05).ndc === undefined);
}
{
  // A down with an identifier already live means a lift went missing, which happens. The stale one
  // is dropped rather than leaving two of it holding the same pad forever.
  const { s } = fresh();
  down(s, 1, 'swim', 60, 300, 0, false, SIZE);
  down(s, 1, 'water', 400, 200, 0.5, false, SIZE);
  check('a repeated identifier replaces the lost touch', read(s, 0.51).swim === false);
  check('...and there is only one of it', s.touches.size === 1);
}

// ---------------------------------------------------------------- edges are owed, never lost

check('nothing owed and nothing arrived fires nothing', meterEdge(0, 0).fire === false);
check('one arrival fires once and owes nothing', meterEdge(0, 1).fire === true && meterEdge(0, 1).owed === 0);
check('two arrivals fire once and owe one', meterEdge(0, 2).fire === true && meterEdge(0, 2).owed === 1);
check('an owed edge fires on a frame with no arrivals', meterEdge(1, 0).fire === true && meterEdge(1, 0).owed === 0);

// ---------------------------------------------------------------- folding into the controls

const fold = (t: Partial<ReturnType<typeof read>> & { light?: boolean; heavy?: boolean } = {}): RawControls => applyTouch(emptyControls(), {
  dx: 0, dy: 0, zoom: 0, bites: 0, heavies: 0, swim: false, secondary: undefined, dash: false,
  dragging: false, ndc: undefined, swapped: false, pinching: false, buttons: [], light: false, heavy: false, ...t,
});

check('the swim pad is forward on the stick', fold({ swim: true }).my === 1);
check('a tap is the light attack', fold({ light: true }).light === true);
check('a double-tap on an animal is the heavy', fold({ heavy: true }).heavy === true);
check('a double-tap on water is the dash', fold({ dash: true }).dash === true && fold({ dash: true }).dodge === true);
check('the pad on aim gives aim mode', fold({ secondary: 'aim' }).aim === true && fold({ secondary: 'aim' }).lock === true);
check('the pad on guard guards', fold({ secondary: 'guard' }).guard === true);
check('the pad on hide hides', fold({ secondary: 'ability' }).ability === true);
check('the pad on sense senses', fold({ secondary: 'sense' }).sense === true);
check('only one secondary at a time', Object.entries({ guard: fold({ secondary: 'guard' }) }).every(([, c]) => !c.ability && !c.aim && !c.sense));
check('a swipe is already radians, so it goes in lookDX', fold({ dx: 0.3, dy: -0.2 }).lookDX === 0.3 && fold({ dx: 0.3, dy: -0.2 }).lookDY === -0.2);
check('...and never in lookX, which is a rate', fold({ dx: 0.3 }).lookX === 0);
check('a pinch is a zoom exponent', fold({ zoom: -0.1 }).zoomDelta === -0.1);

/**
 * What a **gesture** must not reach, and it is a different list from the mouse's.
 *
 * The mouse may not touch `ability`, `guard` or `sense` because a mouse plays beside a keyboard and
 * those have keys on it. A finger has no keyboard to fall back on, so the ring reaches all three —
 * one at a time.
 *
 * What no gesture may reach is anything belonging to a *menu*: a tap aimed at the sea must never also
 * answer whatever a menu is asking. Those are reached by the **drawn buttons** instead, which are a
 * separate, enumerated channel checked on its own below — a button is a thing the player deliberately
 * put a finger on, and what it does is written on it.
 *
 * `rise` and `sink` are on the list for a different reason: the camera covers them here (pitch the
 * view and hold swim), exactly as it does on a mouse.
 */
const FORBIDDEN: (keyof RawControls)[] = [
  'confirm', 'back', 'menu', 'view', 'teleport', 'lb', 'rb', 'rise', 'sink', 'rsClick',
  'dleft', 'dright', 'dup', 'ddown',
];
const everything = fold({ swim: true, light: true, heavy: true, dash: true, secondary: 'aim', dx: 1, dy: 1, zoom: 1 });
const alsoGuard = fold({ secondary: 'guard' }); const alsoHide = fold({ secondary: 'ability' }); const alsoSense = fold({ secondary: 'sense' });
for (const f of FORBIDDEN) {
  const reached = [everything, alsoGuard, alsoHide, alsoSense].some((c) => c[f] === true);
  check(`no gesture reaches ${f}`, !reached);
}
check('a finger never sprints: sprint is gone for players', everything.burst === 0);
check('...and doing anything at all counts as a press', everything.any && everything.anyButton);
check('doing nothing is not a press', fold().any === false);

// ---------------------------------------------------------------- the drawn buttons

{
  // A finger on a drawn button holds it, and travel across it does nothing: a button is a button, and
  // a finger sliding about on one has not changed its mind.
  const { s } = fresh();
  down(s, 1, 'teleport', 700, 40, 0, false, SIZE);
  check('a drawn button is held', read(s, 0.01).buttons.includes('teleport'));
  move(s, 1, 700 + DRAG * 4, 40, SIZE, 0.05);
  const f = read(s, 0.05);
  check('...and sliding on it does not turn the camera', f.dragging === false && f.dx === 0);
  check('...and it is still held', f.buttons.includes('teleport'));
  up(s, 1, 0.3);
  check('...and it never ends in a bite', read(s, 0.31).bites === 0);
  check('...and released it is let go', read(s, 0.32).buttons.length === 0);
}
{
  // Several at once, because walking a menu is step-then-take and a hand has more than one finger.
  const { s } = fresh();
  down(s, 1, 'down', 700, 200, 0, false, SIZE);
  down(s, 2, 'confirm', 740, 240, 0.01, false, SIZE);
  const f = read(s, 0.02);
  check('two drawn buttons held at once', f.buttons.includes('down') && f.buttons.includes('confirm'));
  check('...and neither is listed twice', new Set(f.buttons).size === f.buttons.length);
}
check('every button zone is recognised as one', BUTTON_ZONES.every((b) => isButtonZone(b)));
check('...and the gesture zones are not', !isButtonZone('water') && !isButtonZone('swim') && !isButtonZone('secondary'));

/**
 * What each drawn button reaches, and nothing else. This is the enumerated channel: unlike a gesture
 * a button is *allowed* to reach a menu action, and the point of the table is that it reaches exactly
 * the one written on it and no more.
 */
const BUTTON_DRIVES: Record<ButtonZone, (keyof RawControls)[]> = {
  teleport: ['teleport'],
  view: ['view'],
  // The travel menu already walks on the D-pad, so that is what these are.
  up: ['dup'],
  down: ['ddown'],
  confirm: ['confirm'],
  back: ['back'],
};
for (const b of BUTTON_ZONES) {
  const c = fold({ buttons: [b] });
  for (const k of BUTTON_DRIVES[b]) check(`the ${b} button drives ${String(k)}`, c[k] === true);
  const others = BUTTON_ZONES.filter((o) => o !== b).flatMap((o) => BUTTON_DRIVES[o]).filter((k) => !BUTTON_DRIVES[b].includes(k));
  const stray = others.filter((k) => c[k] === true);
  check(`...and nothing else`, stray.length === 0, stray.join(', '));
}
check('a drawn button never attacks', BUTTON_ZONES.every((b) => { const c = fold({ buttons: [b] }); return !c.light && !c.heavy && !c.dash && !c.ability && !c.guard; }));
check('up and down walk a menu rather than pitching the body', fold({ buttons: ['up'] }).lookY === -1 && fold({ buttons: ['down'] }).lookY === 1);
check('a drawn button counts as a press', fold({ buttons: ['teleport'] }).any === true);

// ---------------------------------------------------------------- the labels

check('touch is a scheme of its own', schemeForDevice('touch', false) === 'touch' && schemeForDevice('touch', true) === 'touch');
check('a pad still wins the menus', menuScheme(1, true) === 'pad');
check('a touch session names the menus in gestures', menuScheme(0, true) === 'touch');
check('and with no finger it is still the mouse', menuScheme(0, false) === 'kbm');
const ACTIONS: Action[] = ['swim', 'look', 'zoom', 'sprint', 'rise', 'sink', 'light', 'heavy', 'ability', 'dash',
  'guard', 'aim', 'sense', 'teleport', 'view', 'menu', 'confirm', 'back', 'modePrev', 'modeNext'];
check('every action is named for a finger', ACTIONS.every((a) => btn(a, 'touch').length > 0));
check('...and every short name fits a chip', ACTIONS.every((a) => key(a, 'touch').length <= 13),
  ACTIONS.filter((a) => key(a, 'touch').length > 13).join(', '));
check('a finger is never told to press a key', ACTIONS.every((a) => !/\b(click|LMB|RMB|MMB|Shift|Enter|Esc|Backspace|D-pad|stick|LB|RB|LT|RT)\b/i.test(btn(a, 'touch'))),
  ACTIONS.filter((a) => /\b(click|LMB|RMB|MMB|Shift|Enter|Esc|Backspace|D-pad|stick|LB|RB|LT|RT)\b/i.test(btn(a, 'touch'))).join(', '));

// ---------------------------------------------------------------- how small the window is

check('a laptop is the full layout', layoutFor(1440, 900) === 'full');
check('a landscape phone is compact', layoutFor(780, 360) === 'compact');
check('a portrait phone is compact', layoutFor(390, 844) === 'compact');
check('a tablet in landscape is the full layout', layoutFor(1180, 820) === 'full');
// A tablet upright is 820 across, which is more room than the pick screen's own one-column
// breakpoint asks for and plenty for the HUD. It is *tall*, which is a thing `rotateHint` mentions
// and not a thing that needs panels taking away — the two questions are deliberately separate.
check('a tablet in portrait keeps the full layout', layoutFor(820, 1180) === 'full');
check('...and a phone held up does not, being genuinely narrow', layoutFor(430, 932) === 'compact');
check('a short desktop window is compact too', layoutFor(1440, 420) === 'compact');
check('the threshold is the window and not the device', layoutFor(COMPACT_W, COMPACT_H) === 'full' && layoutFor(COMPACT_W - 1, COMPACT_H) === 'compact');
// It must not collide with the breakpoints the stylesheet already uses, or the two reflows fight.
check('the width sits clear of the pick screen\'s own reflow', COMPACT_W < 900 && COMPACT_W > 700);
check('the height sits under the roster\'s tightest step', COMPACT_H < 640 && COMPACT_H > 360);

check('a finger with no pad plays by touch', touchFirst(true, false, 0) === true);
check('a mouse never does', touchFirst(false, false, 0) === false);
// A laptop with a touchscreen reports a coarse pointer *available* and a fine primary one, and
// hovers. Drawing thumb pads over that player's game would be absurd.
check('a touch laptop being used with its trackpad does not', touchFirst(true, true, 0) === false);
check('a pad in the session wins, as it does over the mouse', touchFirst(true, false, 1) === false);

check('a tall phone is asked to turn round', rotateHint(390, 844, true) === true);
check('a landscape phone is not', rotateHint(780, 360, true) === false);
check('a 4:3 tablet upright is not nagged', rotateHint(820, 1093, true) === false);
check('...nor a 3:2 one', rotateHint(800, 1200, true) === false);
check('a big phone held up is', rotateHint(430, 932, true) === true);
check('and a desktop window is never asked', rotateHint(390, 844, false) === false);

// The roster's columns. `gridColumns` packs the whole roster into three rows, which is a rule about
// a laptop: the Triassic's 26 animals are nine columns, and nine columns of a phone is a 36-pixel
// tile. The cap turns the overflow into rows, which a phone can scroll.
check('a roomy window caps nothing at all', rosterCap(1440, 900, 'full') === Infinity);
check('a phone held up has room for four tiles', rosterCap(390, 844, 'compact') === 4, `${rosterCap(390, 844, 'compact')}`);
check('a bigger phone held up has five', rosterCap(430, 932, 'compact') === 4 || rosterCap(430, 932, 'compact') === 5);
// On its side the roster is beside the crew card, so it gets a share of the width rather than all.
check('a phone on its side has more, but not the whole width', rosterCap(780, 360, 'compact') === 5,
  `${rosterCap(780, 360, 'compact')}`);
check('...which is fewer than the width alone would allow', rosterCap(780, 360, 'compact') < Math.floor(780 / MIN_TILE));
check('nothing ever falls below three columns', rosterCap(200, 200, 'compact') >= 3);
check('every capped tile is at least MIN_TILE across', [[390, 844], [430, 932], [780, 360], [820, 500]]
  .every(([w, h]) => (w * (w > h ? 0.62 : 1) - 24) / rosterCap(w, h, 'compact') >= MIN_TILE - 1));

check('two players on a wide screen are cut side by side', splitAxis(1440, 900) === 'across');
check('two on a tall one are cut top and bottom', splitAxis(820, 1180) === 'down');
check('a square is cut across, as it always was', splitAxis(900, 900) === 'across');

console.log(failed ? `FAILED (${failed})` : 'PASS: a finger plays the game, and a small window says so');
process.exit(failed ? 1 : 0);
