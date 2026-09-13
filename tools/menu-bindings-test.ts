/**
 * Guards the menu button bindings against collisions.
 *
 * RawControls names one physical button several times over, because gameplay and menus want
 * different words for it: button 0 is both `confirm` and `burst`, button 1 is `back` and `guard`,
 * button 4 is `lb`, `dodge` and `dash`. That is fine until a menu binds an action to a gameplay
 * name — the select screen used to cycle the game mode on `burst`, which is button 0, so every A
 * press locked the player in and then changed mode, and changing mode un-readies everyone. The
 * result was that A could never lock a creature in and no match could be started.
 *
 * This walks every button through readGamepad() and fails if two actions the menus bind land on
 * the same one. Add an action here whenever the menus start using a new control.
 *
 * Usage: npx esbuild tools/menu-bindings-test.ts --bundle --platform=node --format=esm \
 *          --outfile=/tmp/mb.mjs && node /tmp/mb.mjs
 */
import { applyMouse, emptyControls, readGamepad, type RawControls } from '../src/input/input';

/** Every control the menu code in src/app/App.tsx reads, with where it is used. */
const MENU_ACTIONS: { key: keyof RawControls; used: string }[] = [
  { key: 'confirm', used: 'select: lock in / dive · pause: resume · results: play again' },
  { key: 'back', used: 'select: unlock or leave · results: title · dialogs: close' },
  { key: 'menu', used: 'select: start the match · dialogs: close' },
  { key: 'lb', used: 'select: previous mode' },
  { key: 'rb', used: 'select: next mode' },
  { key: 'dleft', used: 'select: move cursor' },
  { key: 'dright', used: 'select: move cursor' },
  { key: 'dup', used: 'select: move cursor' },
  { key: 'ddown', used: 'select: move cursor' },
  { key: 'heavy', used: 'pause and results: back to select' },
  { key: 'light', used: 'select: hatch or carry on · pause: quit to title · results: keep playing (co-op modes)' },
];

const BUTTONS = 17;

function padWith(pressed: number[]): Gamepad {
  return {
    index: 0, id: 'test', connected: true, mapping: 'standard', timestamp: 0,
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: BUTTONS }, (_, i) => ({
      pressed: pressed.includes(i), touched: pressed.includes(i), value: pressed.includes(i) ? 1 : 0,
    })),
  } as unknown as Gamepad;
}

let failures = 0;
const fail = (m: string) => { console.log('FAIL  ' + m); failures++; };

// Which buttons drive each menu action.
const buttonsFor = new Map<string, number[]>();
for (const { key } of MENU_ACTIONS) buttonsFor.set(key, []);
for (let b = 0; b < BUTTONS; b++) {
  const c = readGamepad(padWith([b]));
  for (const { key } of MENU_ACTIONS) if (c[key]) buttonsFor.get(key)!.push(b);
}

for (const { key, used } of MENU_ACTIONS) {
  const bs = buttonsFor.get(key)!;
  if (!bs.length) fail(`menu action "${key}" (${used}) is not driven by any button`);
}

// Two menu actions on one button is the bug this file exists for: on the screen where both are
// live, one press fires both, and the loser is whichever the code checks first.
for (let b = 0; b < BUTTONS; b++) {
  const hits = MENU_ACTIONS.filter(({ key }) => buttonsFor.get(key)!.includes(b));
  if (hits.length > 1) {
    fail(`button ${b} drives ${hits.length} menu actions at once: ${hits.map((h) => `${h.key} (${h.used})`).join('  AND  ')}`);
  }
}

// A joining pad uses anyButton, so it must see every face button, not just the mapped ones.
const anyMisses = Array.from({ length: BUTTONS }, (_, b) => b).filter((b) => !readGamepad(padWith([b])).anyButton);
if (anyMisses.length) fail(`anyButton (used to join a player) misses button(s) ${anyMisses.join(', ')}`);
// ...and it must not fire on stick movement alone, or drift would add players by itself.
const drifting = { ...padWith([]), axes: [0.9, 0.9, 0.9, 0.9] } as unknown as Gamepad;
if (readGamepad(drifting).anyButton) fail('anyButton fires on stick movement, so drift could join a player');

/**
 * The layout itself, button by button. Menus and gameplay may share a button because they are
 * different screens, but which button does what in play is a decision, and one that has moved
 * more than once; this is where it is written down so a remap that misses a file shows up here
 * rather than in someone's hands. `dodge`/`dash` and `lock`/`aim` are each one action under two
 * names, which is why they are allowed to sit together.
 */
const PAD_LAYOUT: { button: number; name: string; drives: (keyof RawControls)[] }[] = [
  { button: 0, name: 'A', drives: ['dodge', 'dash'] },
  { button: 1, name: 'B', drives: ['guard'] },
  { button: 2, name: 'X', drives: ['light'] },
  { button: 3, name: 'Y', drives: ['ability'] },
  { button: 4, name: 'LB', drives: ['burst'] },
  { button: 5, name: 'RB', drives: ['rise'] },
  { button: 6, name: 'LT', drives: ['lock', 'aim'] },
  { button: 7, name: 'RT', drives: ['heavy'] },
  { button: 10, name: 'Left stick click', drives: ['sink'] },
  { button: 12, name: 'D-pad up', drives: ['sense'] },
  { button: 13, name: 'D-pad down', drives: ['teleport'] },
  { button: 14, name: 'D-pad left', drives: [] },
  { button: 15, name: 'D-pad right', drives: [] },
];
/** Every control a body is driven by, so a button that quietly picks one up is caught. */
const IN_PLAY: (keyof RawControls)[] = ['burst', 'rise', 'sink', 'light', 'heavy', 'ability', 'dodge', 'dash', 'guard', 'lock', 'aim', 'sense', 'teleport'];
for (const { button, name, drives } of PAD_LAYOUT) {
  const c = readGamepad(padWith([button]));
  const on = IN_PLAY.filter((k) => (typeof c[k] === 'number' ? (c[k] as number) > 0 : !!c[k]));
  const missing = drives.filter((k) => !on.includes(k));
  const extra = on.filter((k) => !drives.includes(k));
  if (missing.length) fail(`${name} (button ${button}) should drive ${missing.join(', ')} and does not`);
  if (extra.length) fail(`${name} (button ${button}) also drives ${extra.join(', ')}, which belongs elsewhere`);
  console.log(`  ${name.padEnd(17)} → ${drives.length ? drives.join(', ') : '— (menus only)'}`);
}
/**
 * The mouse, for a session with no controller in it. Same rule as the pad: one button, one action,
 * and never a menu action — a mouse press must not be able to confirm, back out or pause, or a
 * click aimed at the sea would also answer whatever the menus were asking.
 */
const MOUSE: { name: string; press: Partial<Record<'left' | 'middle' | 'right', boolean>>; expect: (keyof RawControls)[] }[] = [
  { name: 'left click', press: { left: true }, expect: ['heavy'] },
  { name: 'right click', press: { right: true }, expect: ['dash', 'dodge'] },
  { name: 'middle click', press: { middle: true }, expect: ['aim', 'lock'] },
];
const MOUSE_FORBIDDEN: (keyof RawControls)[] = ['confirm', 'back', 'menu', 'lb', 'rb', 'view', 'teleport', 'light', 'ability', 'guard', 'rise', 'sink'];
for (const m of MOUSE) {
  const c = applyMouse(emptyControls(), { dx: 0, dy: 0, zoom: 0, left: false, middle: false, right: false, ...m.press });
  for (const k of m.expect) if (!c[k]) fail(`${m.name} does not drive "${String(k)}"`);
  for (const k of MOUSE_FORBIDDEN) if (c[k]) fail(`${m.name} drives the menu/gameplay control "${String(k)}"`);
  const others = MOUSE.filter((o) => o !== m).flatMap((o) => o.expect).filter((k) => !m.expect.includes(k));
  for (const k of others) if (c[k]) fail(`${m.name} also drives "${String(k)}", which belongs to another button`);
  console.log(`  ${m.name.padEnd(13)} → ${m.expect.join(', ')}`);
}

for (const { key, used } of MENU_ACTIONS) {
  console.log(`  ${key.padEnd(9)} button(s) ${buttonsFor.get(key)!.join(', ').padEnd(6)}  ${used}`);
}
console.log(`\n${MENU_ACTIONS.length} menu actions over ${BUTTONS} buttons, ${MOUSE.length} mouse buttons · ${failures} failure(s)`);
process.exit(failures ? 1 : 0);
