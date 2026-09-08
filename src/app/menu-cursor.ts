/**
 * The rules for an in-game menu that is steered rather than button-mapped.
 *
 * Both menus used to give every choice its own pad button — A resumed, RT went back to select, Y
 * quit — which is three live shortcuts on a screen that can appear on its own, the instant a match
 * ends, while a hand is still fighting. A pad has no idea it has stopped being a fight.
 *
 * So a menu has one cursor and one button that acts, and three rules stand between a fight and an
 * answer:
 *
 *  1. **A lockout.** Nothing at all is read for `MENU_LOCKOUT` after the menu opens.
 *  2. **A cursor that has to be woken.** The results screen starts with nothing highlighted; the
 *     first press or nudge only makes the cursor appear, and takes no choice.
 *  3. **A harmless default.** The cursor wakes on entry 0, which each menu makes the choice that
 *     costs least — resume, or carry the finished run on.
 *
 * Kept apart from the shell so the rules can be read, and tested, on their own.
 */

/** Milliseconds an in-game menu ignores input after it opens. */
export const MENU_LOCKOUT = 700;

export interface MenuCursor {
  /** Which choice is highlighted. */
  sel: number;
  /** Whether the highlight is drawn at all — false means "nothing selected yet". */
  shown: boolean;
}

/** What arrived: a nudge up or down the list, the confirm button, or any other button. */
export interface MenuEvent { step?: number; confirm?: boolean; other?: boolean }

export interface MenuResult {
  cursor: MenuCursor;
  /** True only when the highlighted choice should actually be taken. */
  act: boolean;
}

/**
 * Apply one input to the cursor. `locked` is whether the menu is still inside its lockout, in
 * which case the input is dropped entirely — including the wake, so the tail of a fight cannot
 * even bring the cursor up.
 */
export function menuPress(cursor: MenuCursor, count: number, ev: MenuEvent, locked = false): MenuResult {
  if (locked || count <= 0) return { cursor, act: false };
  // Rule 2: while the cursor is asleep, every input spends itself waking it, and nothing else.
  if (!cursor.shown) return { cursor: { sel: cursor.sel, shown: true }, act: false };
  if (ev.step) return { cursor: { sel: (cursor.sel + ev.step + count) % count, shown: true }, act: false };
  if (ev.confirm) return { cursor, act: true };
  return { cursor, act: false };
}

/** The cursor a menu opens with. A menu the player did not ask for starts with nothing selected. */
export const freshCursor = (asked: boolean): MenuCursor => ({ sel: 0, shown: asked });
