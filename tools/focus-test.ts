/**
 * The shoulder-button focus ring. Run: npm run focus
 *
 * One gesture reaches every button on a screen that is not the screen's own business — the era
 * link, the mode chips, the icons — so what matters is that the ring is in screen order, always
 * contains a way back to the main content, and never offers a group the screen has not drawn.
 */
import assert from 'node:assert/strict';
import { atMain, cycle, groupsFor, stops, type FocusGroup, type Stop } from '../src/app/focus-ring';

let passes = 0;
const ok = (cond: unknown, msg: string) => { assert.ok(cond, msg); passes++; };
const eq = (a: unknown, b: unknown, msg: string) => { assert.deepEqual(a, b, msg); passes++; };
const ALL = { sibling: true, icons: true };

// ---- each screen offers what it draws, left to right ----
eq(groupsFor('title', false, ALL), ['era', 'main', 'icons'], 'the title reaches the other era and the icons');
eq(groupsFor('title', false, { sibling: false, icons: true }), ['main', 'icons'], 'an era with no sibling offers no link');
eq(groupsFor('select', false, ALL), ['main', 'modes', 'icons'], 'the choice screen reaches the modes and the icons');
eq(groupsFor('playing', false, ALL), ['main', 'icons'], 'in play there are only the icons');
eq(groupsFor('playing', true, ALL), ['main', 'icons'], 'a pause menu owns the pad: its choices and the icons');
eq(groupsFor('results', true, ALL), ['main', 'icons'], 'and so does the results screen');
eq(groupsFor('select', false, { sibling: true, icons: false }), ['main', 'modes'], 'hidden icons are not in the ring');

// ---- main is always reachable, on every screen and configuration ----
for (const screen of ['title', 'select', 'playing', 'results'] as const) {
  for (const sibling of [true, false]) for (const icons of [true, false]) for (const menu of [true, false]) {
    const ring = groupsFor(screen, menu, { sibling, icons });
    ok(ring.includes('main'), `${screen} always keeps a way back to its own business`);
    ok(ring.length >= 1 && new Set(ring).size === ring.length, `${screen}: no duplicates`);
  }
}

// ---- the ring stops on every button, one press at a time ----
{
  // The choice screen as it ships: three modes, four icons, and the roster as one stop.
  const all = stops(groupsFor('select', false, ALL), { modes: 3, icons: 4 });
  eq(all.length, 1 + 3 + 4, 'one stop per button, plus the roster');
  eq(all[0], { group: 'main', index: 0 }, 'the roster comes first');
  eq(all.slice(1, 4).map((s) => s.index), [0, 1, 2], 'then each mode chip in turn');
  eq(all.slice(4).map((s) => s.group), ['icons', 'icons', 'icons', 'icons'], 'then the icons');

  // A press moves one button, which is what the mode chips already did.
  let at: Stop = { group: 'main', index: 0 };
  at = cycle(all, at, 1); eq(at, { group: 'modes', index: 0 }, 'right lands on the first mode');
  at = cycle(all, at, 1); eq(at, { group: 'modes', index: 1 }, '...then the second, not past them all');
  at = cycle(all, at, -1); eq(at, { group: 'modes', index: 0 }, 'and left steps back one');
  at = cycle(all, at, -1); eq(at, { group: 'main', index: 0 }, 'back onto the roster');
  at = cycle(all, at, -1); eq(at, { group: 'icons', index: 3 }, 'and left again wraps to the last icon');

  // A full lap in either direction comes home, on every screen.
  for (const screen of ['title', 'select', 'results'] as const) {
    const list = stops(groupsFor(screen, screen === 'results', ALL), { era: 1, modes: 3, icons: 4 });
    for (const dir of [1, -1]) {
      let s: Stop = { group: 'main', index: 0 };
      for (let i = 0; i < list.length; i++) s = cycle(list, s, dir);
      eq(s, { group: 'main', index: 0 }, `${screen}: a full lap ${dir > 0 ? 'right' : 'left'} comes home`);
    }
  }
}

// ---- a stop the screen no longer has cannot keep the sticks ----
{
  const all = stops(groupsFor('playing', true, ALL), { icons: 4 });
  eq(cycle(all, { group: 'modes', index: 1 }, 1), { group: 'main', index: 0 }, 'a vanished group drops back to main');
  eq(cycle(all, { group: 'icons', index: 9 }, 1), { group: 'main', index: 0 }, 'and so does an index past the end');
  eq(cycle([], { group: 'icons', index: 0 }, 1), { group: 'main', index: 0 }, 'an empty ring still answers');
  eq(stops(['main'], {}), [{ group: 'main', index: 0 }], 'a screen with nothing else is just itself');
  eq(stops(groupsFor('select', false, ALL), { modes: 0, icons: 0 }).length, 1, 'groups with no buttons contribute no stops');
}

// ---- the resting state ----
{
  const f = atMain();
  eq([f.group, f.index, f.owner], ['main', 0, null], 'the ring rests on the screen itself, owned by nobody');
}

console.log(`${passes} focus ring assertions passed`);
