/**
 * Move a cursor between on-screen buttons by where they actually are.
 *
 * A menu is a row on one screen and a column on another — the pause and results choices sit in a
 * wrapping flex row, the settings panel stacks — and a cursor that always stepped the list needed
 * up and down whatever the buttons were doing. Left and right did nothing on a row of three, which
 * is the one thing a pad player will try first.
 *
 * So the direction pressed is resolved against the buttons' own rectangles. Nothing here knows
 * what a menu is: it takes rectangles and gives back an index, which keeps it testable and lets
 * the same rule serve every menu.
 */
export interface Rect { x: number; y: number; w: number; h: number }
export type Dir = 'left' | 'right' | 'up' | 'down';

const mid = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/**
 * The button `dir` leads to from `from`, or -1 if nothing lies that way.
 *
 * A candidate counts when its centre is past the current button's edge in that direction, so two
 * buttons on the same row never count as being above one another. Among those, the nearest wins,
 * measured along the direction pressed and penalised for drifting across it — a button straight
 * ahead beats a closer one off to the side, which is what makes a wrapped grid feel right.
 */
export function neighbour(rects: readonly Rect[], from: number, dir: Dir): number {
  const cur = rects[from];
  if (!cur) return -1;
  const c = mid(cur);
  const horizontal = dir === 'left' || dir === 'right';
  const sign = dir === 'left' || dir === 'up' ? -1 : 1;
  let best = -1, bestScore = Infinity;
  for (let i = 0; i < rects.length; i++) {
    if (i === from) continue;
    const m = mid(rects[i]);
    const along = (horizontal ? m.x - c.x : m.y - c.y) * sign;
    const across = Math.abs(horizontal ? m.y - c.y : m.x - c.x);
    // Must be genuinely that way: past the edge of the button we are on, not merely offset.
    const edge = (horizontal ? cur.w : cur.h) / 2;
    if (along <= edge * 0.5) continue;
    const score = along + across * 2;
    if (score < bestScore) { bestScore = score; best = i; }
  }
  return best;
}

/**
 * The index to move to, always. Geometry first; when nothing lies that way — up and down on a
 * single row, or off the end of one — the list order carries the cursor on and wraps, so no press
 * is ever swallowed.
 */
export function step(rects: readonly Rect[], from: number, dir: Dir): number {
  if (rects.length === 0) return from;
  const found = neighbour(rects, from, dir);
  if (found >= 0) return found;
  const forward = dir === 'right' || dir === 'down';
  return (from + (forward ? 1 : -1) + rects.length) % rects.length;
}

/** Read the rectangles of a group of elements, in DOM order. */
export const rectsOf = (els: readonly Element[]): Rect[] =>
  els.map((el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
