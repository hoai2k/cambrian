/**
 * Where everything on the pick screen sits, and how a cursor walks it.
 *
 * The roster used to be the only thing in the grid, so navigation could be index arithmetic over
 * the creature list: right was `i + 1`, down was `i + cols`, and the tiles were rendered from the
 * same array in the same order, so the two could not disagree. Adding a button to the grid breaks
 * that identity — the button has a position but no index in the roster — and the failure is silent
 * and horrible: the cursor lands on a tile that is not the one lighting up.
 *
 * So the layout is a model, and the screen and the cursor both read it. Nothing here touches the
 * DOM, which is what makes it testable: the grid the test walks is the grid that is drawn.
 *
 * Extras (Random, Visitors) are **right-aligned**: they take the rightmost columns of the last row
 * if that row has room for all of them, and otherwise a row of their own, still at the right. That
 * is what keeps them off the roster's alignment — a ragged last row keeps its creatures where they
 * were, and a full one is not disturbed at all.
 */
export type ExtraId = 'random' | 'visitors';
export type Slot =
  | { kind: 'creature'; id: string }
  | { kind: 'extra'; id: ExtraId };

export interface Placed { slot: Slot; row: number; col: number; }
export interface GridModel {
  cols: number;
  rows: number;
  /** Every occupied cell, in reading order. Holes are simply absent. */
  cells: Placed[];
}

/**
 * Grid columns: three rows at most, so 21 creatures sit in 7 x 3 and 8 sit in 4 x 2 — unless the
 * window says it has room for fewer, in which case the overflow becomes *rows*.
 *
 * `cap` only ever takes columns away (`rosterCap` in `src/shared/small-screen.ts` is `Infinity` on
 * any window with room), so a short roster lays out exactly as it always did. It exists because
 * three rows is a rule about a laptop: the Triassic's 26 animals come to nine columns, and nine
 * columns of a phone is a 36-pixel tile. Four is a floor under the cap so nothing can ask for a
 * grid too narrow to be a grid.
 */
export const gridColumns = (n: number, cap = Infinity) =>
  Math.max(1, Math.min(Math.max(4, Math.ceil(n / 3)), Math.max(3, cap)));

export function rosterGrid(ids: readonly string[], extras: readonly ExtraId[] = [], cap = Infinity): GridModel {
  const n = ids.length, cols = gridColumns(n, cap);
  const cells: Placed[] = [];
  for (let i = 0; i < n; i++) cells.push({ slot: { kind: 'creature', id: ids[i] }, row: Math.floor(i / cols), col: i % cols });
  const full = Math.ceil(n / cols);
  let rows = Math.max(1, full);
  if (extras.length) {
    const lastRowUsed = n - (full - 1) * cols;              // creatures on the final row
    const freeOnLast = full > 0 ? cols - lastRowUsed : cols;
    // Room on the last row for all of them, or a row of their own. Either way hard against the
    // right-hand column, so they line up under the rightmost card rather than trailing the roster.
    const row = extras.length <= freeOnLast ? full - 1 : full;
    rows = row + 1;
    const start = cols - extras.length;
    for (let i = 0; i < extras.length; i++) cells.push({ slot: { kind: 'extra', id: extras[i] }, row, col: start + i });
  }
  return { cols, rows, cells };
}

export const sameSlot = (a: Slot, b: Slot) => a.kind === b.kind && a.id === b.id;

/**
 * Move a cursor. Left and right walk every tile there is in reading order and wrap round the whole
 * grid, which is what the roster always did and is how an extra is reached without a special press.
 * Up and down move a row and land on the nearest column that is actually occupied, so a ragged row
 * — or a row holding nothing but the extras — can never swallow the press.
 */
export function gridStep(model: GridModel, from: Slot, dx: number, dy: number): Slot {
  const at = model.cells.findIndex((c) => sameSlot(c.slot, from));
  if (at < 0) return model.cells.length ? model.cells[0].slot : from;
  if (dx) {
    const n = model.cells.length;
    return model.cells[(at + dx + n) % n].slot;
  }
  if (dy) {
    const cur = model.cells[at];
    for (let step = 1; step <= model.rows; step++) {
      const r = (cur.row + dy * step + model.rows * step) % model.rows;
      const row = model.cells.filter((c) => c.row === r);
      if (!row.length) continue;
      let best = row[0];
      for (const c of row) if (Math.abs(c.col - cur.col) < Math.abs(best.col - cur.col)) best = c;
      return best.slot;
    }
  }
  return from;
}
