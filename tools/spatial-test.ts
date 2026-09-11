/**
 * Menu cursors move by where the buttons are. Run: npm run spatial
 *
 * The rule this guards is that a direction press is answered by the geometry and never swallowed:
 * left and right work along a row, up and down down a column, and whichever axis the layout does
 * not use falls back to the list order rather than doing nothing.
 */
import assert from 'node:assert/strict';
import { neighbour, step, type Dir, type Rect } from '../src/app/spatial-nav';

let passes = 0;
const ok = (cond: unknown, msg: string) => { assert.ok(cond, msg); passes++; };
const eq = (a: unknown, b: unknown, msg: string) => { assert.equal(a, b, msg); passes++; };

/** The pause menu as it is actually laid out: a row of choices, 10px apart. */
const row = (n: number, w = 120, h = 40, y = 300): Rect[] =>
  Array.from({ length: n }, (_, i) => ({ x: 40 + i * (w + 10), y, w, h }));
const column = (n: number, w = 200, h = 44, x = 60): Rect[] =>
  Array.from({ length: n }, (_, i) => ({ x, y: 100 + i * (h + 8), w, h }));

// ---- a row answers left and right ----
{
  const r = row(3);
  eq(step(r, 0, 'right'), 1, 'right moves along a row');
  eq(step(r, 1, 'right'), 2, '...and on');
  eq(step(r, 2, 'left'), 1, 'left comes back');
  eq(neighbour(r, 1, 'up'), -1, 'nothing is above a button in a single row');
  eq(neighbour(r, 1, 'down'), -1, 'nor below it');
  // ...but the press still has to do something, or the control feels broken.
  eq(step(r, 0, 'down'), 1, 'down falls back to the list order');
  eq(step(r, 1, 'up'), 0, 'and up walks it back');
  eq(step(r, 2, 'right'), 0, 'the ends wrap');
  eq(step(r, 0, 'left'), 2, 'both ways');
}

// ---- a column answers up and down ----
{
  const c = column(4);
  eq(step(c, 0, 'down'), 1, 'down moves down a column');
  eq(step(c, 3, 'up'), 2, 'up moves up it');
  eq(neighbour(c, 1, 'right'), -1, 'nothing is beside a button in a single column');
  eq(step(c, 1, 'right'), 2, '...so left and right fall back to the list');
  eq(step(c, 3, 'down'), 0, 'and wrap');
}

// ---- a wrapped row: geometry beats list order ----
{
  // Four buttons that wrapped onto two lines, as `flex-wrap` leaves them.
  const g: Rect[] = [
    { x: 40, y: 300, w: 120, h: 40 }, { x: 170, y: 300, w: 120, h: 40 },
    { x: 40, y: 350, w: 120, h: 40 }, { x: 170, y: 350, w: 120, h: 40 },
  ];
  eq(step(g, 0, 'down'), 2, 'down goes to the button below, not the next in the list');
  eq(step(g, 1, 'down'), 3, 'in either column');
  eq(step(g, 2, 'up'), 0, 'and back up');
  eq(step(g, 0, 'right'), 1, 'right stays on the row');
  eq(step(g, 3, 'left'), 2, 'left too');
}

// ---- a button straight ahead beats a nearer one off to the side ----
{
  const r: Rect[] = [
    { x: 0, y: 100, w: 80, h: 30 },     // from
    { x: 200, y: 100, w: 80, h: 30 },   // straight right, further
    { x: 120, y: 400, w: 80, h: 30 },   // nearer in x, but a long way down
  ];
  eq(neighbour(r, 0, 'right'), 1, 'straight ahead wins over closer-but-off-axis');
}

// ---- degenerate input cannot crash a menu ----
{
  eq(step([], 0, 'left'), 0, 'an empty menu stays put');
  eq(step(row(1), 0, 'right'), 0, 'a single button has nowhere to go');
  eq(neighbour(row(3), 9, 'left'), -1, 'an out-of-range cursor finds nothing');
  for (const d of ['left', 'right', 'up', 'down'] as Dir[]) {
    const to = step(row(3), 0, d);
    ok(to >= 0 && to < 3, `${d} always lands on a real button (${to})`);
  }
}

console.log(`${passes} spatial navigation assertions passed`);
