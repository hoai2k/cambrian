/**
 * Debug entry points, opened by a URL parameter and never linked to from the game.
 *
 * There are three kinds, and the differences matter. `?debug=local` opens the local state editor
 * *instead of* the game — it replaces the whole app. `?debug=game` opens nothing: it arms the
 * match recorder inside the ordinary game, which adds a button to the pause menu and otherwise
 * changes nothing about how the game plays. And a bare `?debug`, on the trilogy page only, opens
 * the index of all of them. All are development tools: nothing advertises them, nothing links to
 * them from anywhere a visitor goes, and none does anything at all unless its parameter is present.
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

/**
 * Whether this URL asks for the debug index: a bare `?debug`, with no value.
 *
 * The index is the trilogy page's, not a game's. These tools were only ever reachable by knowing
 * the parameter, which meant knowing they existed; the index is the one place that says what there
 * is. It deliberately takes the *valueless* parameter, so it can never collide with a named screen:
 * every `?debug=<something>` is a specific tool, and `?debug` on its own is the list of them.
 *
 * `?debug=` counts too. A parameter written with a trailing `=` and nothing after it is the same
 * statement as one written without — both say "debug, unspecified" — and a URL that loses its empty
 * value in a round trip through a form or a link shortener should still open the index.
 *
 * On a game page this is not consulted at all: `?debug` there is not a screen (`debugScreen`
 * returns nothing) and does not arm the recorder, so a game URL carrying it is simply the game.
 */
export function debugIndex(search = typeof location === 'undefined' ? '' : location.search): boolean {
  return debugParam(search) === '';
}
