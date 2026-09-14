/**
 * Keeping fullscreen across a change of game.
 *
 * Fullscreen belongs to the document, and switching game is a page load: /cambrian/ and /devonian/
 * are separate documents, so the browser drops fullscreen on the way out and the new page cannot
 * ask for it back on its own — entering needs a user gesture *in that document*. Putting the game
 * behind a query parameter would change nothing; what matters is whether the document unloads.
 * (A player using the browser's own fullscreen — F11, or the window button — keeps it throughout,
 * because that is the window's state and not the document's.)
 *
 * So the preference rides along instead. A page that leaves fullscreen because it is being
 * replaced writes down that the player wanted it, and the next page puts itself back on the first
 * click or key it sees — which, arriving at a title screen, is the press that starts the game
 * anyway. It costs the player nothing they were not already doing.
 *
 * `sessionStorage`, not `localStorage`: this is "they were just in fullscreen a moment ago", not a
 * setting. It follows the tab and is gone when the tab is.
 */
const KEY = 'fullscreen';

/** Called whenever the document enters or leaves fullscreen, so the flag is never a guess. */
export function rememberFullscreen(on: boolean): void {
  try { sessionStorage.setItem(KEY, on ? '1' : '0'); } catch { /* private mode, or storage refused */ }
}

export function wantedFullscreen(): boolean {
  try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; }
}

/** Whether a page that has just loaded should be waiting to put itself back. */
export const shouldRestore = (wanted: boolean, already: boolean): boolean => wanted && !already;

/**
 * Ask for fullscreen, unless the document already has it.
 *
 * Not a toggle: the places that call this — starting a match, and the restore below — mean "be
 * fullscreen", and a toggle in either of them would take a player who is already fullscreen back
 * out of it. The toolbar button is the one control that toggles, because that is what it is for.
 */
export function enterFullscreen(): void {
  if (document.fullscreenElement) return;
  // A browser may refuse (no user gesture — a pad button is not one — an embedded frame, a
  // policy). It is a convenience with an obvious button in the corner, so it fails quietly.
  void document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
}

/**
 * If the player was in fullscreen when they left the last page, go back into it on the first
 * gesture here. Returns a function that cancels the wait.
 *
 * One shot either way: the listeners come off before the request is made, so a browser that
 * refuses is not asked again on every click for the rest of the session.
 */
export function restoreFullscreenOnGesture(): () => void {
  if (!shouldRestore(wantedFullscreen(), !!document.fullscreenElement)) return () => {};
  const off = () => {
    removeEventListener('pointerdown', go);
    removeEventListener('keydown', go);
  };
  const go = () => { off(); enterFullscreen(); };
  addEventListener('pointerdown', go);
  addEventListener('keydown', go);
  return off;
}
