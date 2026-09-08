/**
 * Debug entry points, opened by a URL parameter and never linked to from the game.
 *
 * `?debug=local` on either era's page (`/?debug=local`, `/devonian/?debug=local`) opens the local
 * state editor instead of the game. It is a development tool: nothing advertises it, nothing in
 * the game links to it, and it does nothing at all unless the parameter is present.
 */
export type DebugScreen = 'local';

const SCREENS: readonly DebugScreen[] = ['local'];

/** Which debug screen this URL asks for, if any. Safe to call anywhere, including before boot. */
export function debugScreen(search = typeof location === 'undefined' ? '' : location.search): DebugScreen | undefined {
  try {
    const v = new URLSearchParams(search).get('debug');
    return SCREENS.find((s) => s === v);
  } catch { return undefined; }
}
