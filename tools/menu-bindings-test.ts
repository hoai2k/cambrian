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
import { readGamepad, type RawControls } from '../src/input/input';

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
  { key: 'ability', used: 'pause: quit to title' },
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

for (const { key, used } of MENU_ACTIONS) {
  console.log(`  ${key.padEnd(9)} button(s) ${buttonsFor.get(key)!.join(', ').padEnd(6)}  ${used}`);
}
console.log(`\n${MENU_ACTIONS.length} menu actions over ${BUTTONS} buttons · ${failures} failure(s)`);
process.exit(failures ? 1 : 0);
