/**
 * The pick screen's layout and its cursor, which must be the same grid. Run: npm run roster
 *
 * Navigation used to be index arithmetic over the creature list, safe only because the tiles were
 * rendered from that same list in that same order. A button in the grid has a position and no
 * index, and getting this wrong is silent: the cursor lands on one tile while another lights up.
 */
import { gridColumns, gridStep, rosterGrid, sameSlot, type ExtraId, type Slot } from '../src/app/roster-grid';

let failed = 0;
const check = (n: string, ok: boolean, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(64)} ${d}`); if (!ok) failed++; };
const ids = (n: number) => Array.from({ length: n }, (_, i) => `c${i}`);
const creature = (id: string): Slot => ({ kind: 'creature', id });
const extra = (id: ExtraId): Slot => ({ kind: 'extra', id });
const at = (m: ReturnType<typeof rosterGrid>, s: Slot) => m.cells.find((c) => sameSlot(c.slot, s))!;
const show = (s: Slot) => `${s.kind}:${s.id}`;

// --- the roster is laid out exactly as it was, whatever else is in the grid ---
{
  for (const n of [8, 9, 12, 21, 24]) {
    const bare = rosterGrid(ids(n));
    const withExtras = rosterGrid(ids(n), ['random', 'visitors']);
    const moved = bare.cells.filter((c, i) => c.row !== withExtras.cells[i].row || c.col !== withExtras.cells[i].col);
    check(`${n} creatures: the roster does not move when buttons are added`, moved.length === 0, `${bare.cols} cols`);
  }
}

// --- a narrow window caps the columns, and the overflow becomes rows ---
{
  // Three rows is a rule about a laptop. The Triassic's 26 animals come to nine columns, which on a
  // phone is a 36-pixel tile; capped, the same roster is four columns and seven scrollable rows.
  check('uncapped, the roster packs into three rows', gridColumns(26) === 9);
  check('capped, it takes the cap', gridColumns(26, 4) === 4);
  const capped = rosterGrid(ids(26), [], 4);
  check('...and the overflow becomes rows', capped.cols === 4 && capped.rows === 7, `${capped.cols}x${capped.rows}`);
  check('...with every creature still placed exactly once', capped.cells.length === 26
    && new Set(capped.cells.map((c) => c.slot.id)).size === 26);
  check('...in reading order', capped.cells.every((c, i) => c.row === Math.floor(i / 4) && c.col === i % 4));

  // A cap only ever takes columns away, so a roomy window is untouched and a short roster cannot be
  // stretched into a grid wider than it wants.
  check('a cap above what the roster wants changes nothing', gridColumns(21, 99) === gridColumns(21));
  check('...and no cap at all is the same again', gridColumns(21, Infinity) === gridColumns(21));
  check('a short roster is not widened by a large cap', gridColumns(8, 12) === 4);
  // Four is the floor under the cap: nothing may ask for a grid too narrow to be a grid.
  check('the cap cannot go below three', gridColumns(26, 1) === 3 && gridColumns(26, 0) === 3);

  // And the cursor walks the capped grid, because it is the same model the screen draws from —
  // which is the whole reason the cap is a parameter here rather than a number in the stylesheet.
  const from = creature('c3');
  const down = gridStep(capped, from, 0, 1);
  check('the cursor steps down a capped row', sameSlot(down, creature('c7')), show(down));
  const right = gridStep(capped, creature('c3'), 1, 0);
  check('...and right, wrapping onto the next row', sameSlot(right, creature('c4')), show(right));
}

// --- the extras sit at the right, on the last row when it has room and below it when it has not ---
{
  // 21 in 7x3 is exactly full, so there is no room on the last row.
  const full = rosterGrid(ids(21), ['random']);
  const r = at(full, extra('random'));
  check('a full grid puts the button on a row of its own', r.row === 3, `row ${r.row} of ${full.rows}`);
  check('...at the rightmost column', r.col === full.cols - 1, `col ${r.col} of ${full.cols - 1}`);

  // 9 in 4x3 leaves three free cells on the last row.
  const ragged = rosterGrid(ids(9), ['random']);
  const rr = at(ragged, extra('random'));
  check('a ragged last row takes the button in', rr.row === 2 && ragged.rows === 3, `row ${rr.row} of ${ragged.rows}`);
  check('...still at the rightmost column, not trailing the roster', rr.col === ragged.cols - 1, `col ${rr.col}, last creature at col ${at(ragged, creature('c8')).col}`);
  check('...leaving a gap between the roster and it', rr.col > at(ragged, creature('c8')).col + 1);

  // Two extras need two free cells.
  const two = rosterGrid(ids(9), ['random', 'visitors']);
  const a = at(two, extra('random')), b = at(two, extra('visitors'));
  check('two buttons sit side by side, ending at the right', a.row === b.row && b.col === two.cols - 1 && a.col === b.col - 1, `cols ${a.col},${b.col}`);
  // ...and drop together rather than splitting when only one would fit.
  const tight = rosterGrid(ids(11), ['random', 'visitors']);   // 4 cols, last row holds 3
  const ta = at(tight, extra('random')), tb = at(tight, extra('visitors'));
  check('two buttons never split across rows', ta.row === tb.row, `rows ${ta.row},${tb.row} (grid ${tight.rows} rows)`);
}

// --- the cursor reaches everything, and never lands on a hole ---
{
  const m = rosterGrid(ids(9), ['random', 'visitors']);
  const seen = new Set<string>();
  let cur: Slot = creature('c0');
  for (let i = 0; i < m.cells.length * 2; i++) { seen.add(show(cur)); cur = gridStep(m, cur, 1, 0); }
  check('walking right reaches every tile', seen.size === m.cells.length, `${seen.size}/${m.cells.length}`);
  check('...and comes back to where it started', sameSlot(cur, creature('c0')), show(cur));
  // Down from the roster must be able to reach a button on a row of its own.
  const f = rosterGrid(ids(21), ['random']);
  let d: Slot = creature('c20');                 // last creature, bottom-right of a full 7x3
  d = gridStep(f, d, 0, 1);
  check('down from the last creature reaches a button on its own row', sameSlot(d, extra('random')), show(d));
  check('...and up from the button goes back into the roster', gridStep(f, extra('random'), 0, -1).kind === 'creature');
  // Every press from every tile must land somewhere real.
  for (const c of m.cells) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const to = gridStep(m, c.slot, dx, dy);
    if (!m.cells.some((x) => sameSlot(x.slot, to))) { check(`a press from ${show(c.slot)} lands on a real tile`, false, `${dx},${dy} → ${show(to)}`); }
  }
  check('every press from every tile lands on a real tile', true, `${m.cells.length} tiles x 4`);
}

// --- a grid with no extras behaves exactly as the roster always did ---
{
  const m = rosterGrid(ids(21));
  check('columns are unchanged', m.cols === gridColumns(21) && m.cols === 7, `${m.cols}`);
  check('right from the last creature wraps to the first', sameSlot(gridStep(m, creature('c20'), 1, 0), creature('c0')));
  check('down wraps through the rows', sameSlot(gridStep(m, creature('c0'), 0, 1), creature('c7')), show(gridStep(m, creature('c0'), 0, 1)));
  // The ragged-row case the old arithmetic was fixed for: 9 creatures in 4 columns.
  const r = rosterGrid(ids(9));
  check('down into a ragged last row clamps to a real tile', sameSlot(gridStep(r, creature('c7'), 0, 1), creature('c8')), show(gridStep(r, creature('c7'), 0, 1)));
}

console.log(failed ? `FAILED (${failed})` : 'all passed');
process.exit(failed ? 1 : 0);
