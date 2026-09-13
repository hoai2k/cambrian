/**
 * Debug entry points, opened by a URL parameter and never linked to from the game.
 *
 * There are two kinds, and the difference matters. `?debug=local` opens the local state editor
 * *instead of* the game — it replaces the whole app. `?debug=game` opens nothing: it arms the
 * match recorder inside the ordinary game, which adds a button to the pause menu and otherwise
 * changes nothing about how the game plays. Both are development tools: nothing advertises them,
 * nothing links to them, and neither does anything at all unless its parameter is present.
 */
export type DebugScreen = 'local';

const SCREENS: readonly DebugScreen[] = ['local'];

/** The value of the `debug` parameter, whatever it is. */
function debugParam(search: string): string | null {
  try { return new URLSearchParams(search).get('debug'); } catch { return null; }
}

/** Which debug screen this URL asks for, if any. Safe to call anywhere, including before boot. */
export function debugScreen(search = typeof location === 'undefined' ? '' : location.search): DebugScreen | undefined {
  const v = debugParam(search);
  return SCREENS.find((s) => s === v);
}

/**
 * Whether this URL arms the match recorder (`?debug=game`).
 *
 * Distinct from `debugScreen` because it does not replace anything: the game is the game, and the
 * only difference is that the pause menu grows a way to record what happened and hand it over. A
 * recording is for answering "why did that not work" with the match's own numbers instead of a
 * description of them.
 */
export function debugGame(search = typeof location === 'undefined' ? '' : location.search): boolean {
  return debugParam(search) === 'game';
}
