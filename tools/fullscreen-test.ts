/**
 * Carrying fullscreen across a change of game. Run: npm run fullscreen
 *
 * The rule is small and the consequences are not: a page that puts itself back into fullscreen
 * when the player did not ask is a page that hijacks the screen, and one that toggles instead of
 * entering takes a player who is already fullscreen straight back out. Both are checked here,
 * against a stubbed document and storage — this is browser behaviour, so there is nothing to
 * simulate beyond the decision.
 */
import assert from 'node:assert/strict';

let passes = 0;
const ok = (cond: unknown, msg: string) => { assert.ok(cond, msg); passes++; };
const eq = (a: unknown, b: unknown, msg: string) => { assert.deepEqual(a, b, msg); passes++; };

/** A document that can be in fullscreen or not, and remembers what it was asked for. */
interface FakeDoc { fullscreenElement: unknown; documentElement: { requestFullscreen: (o?: unknown) => Promise<void> } }
const store = new Map<string, string>();
let asks = 0, refuse = false;
const listeners = new Map<string, Set<() => void>>();
const doc: FakeDoc = {
  fullscreenElement: null,
  documentElement: { requestFullscreen: () => { asks++; return refuse ? Promise.reject(new Error('no')) : (doc.fullscreenElement = 'html', Promise.resolve()); } },
};
Object.assign(globalThis, {
  document: doc,
  sessionStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
  },
  addEventListener: (type: string, fn: () => void) => { (listeners.get(type) ?? listeners.set(type, new Set()).get(type)!).add(fn); },
  removeEventListener: (type: string, fn: () => void) => { listeners.get(type)?.delete(fn); },
});
const fire = (type: string) => [...(listeners.get(type) ?? [])].forEach((fn) => fn());
const waiting = () => (listeners.get('pointerdown')?.size ?? 0) + (listeners.get('keydown')?.size ?? 0);

const { enterFullscreen, rememberFullscreen, restoreFullscreenOnGesture, shouldRestore, wantedFullscreen } = await import('../src/shared/fullscreen');

// ---- the decision ----
eq(shouldRestore(true, false), true, 'wanted, and not in it: put it back');
eq(shouldRestore(false, false), false, 'never asked for: leave the screen alone');
eq(shouldRestore(true, true), false, 'already in it: nothing to do');
eq(shouldRestore(false, true), false, 'in it without having asked: still nothing to do');

// ---- what is written down ----
eq(wantedFullscreen(), false, 'a fresh tab has no preference');
rememberFullscreen(true);
eq(wantedFullscreen(), true, 'entering fullscreen is remembered');
rememberFullscreen(false);
eq(wantedFullscreen(), false, 'and leaving it is too — the flag is never a guess');

// ---- entering is not toggling ----
doc.fullscreenElement = null; asks = 0;
enterFullscreen();
eq(asks, 1, 'a page that is not fullscreen asks for it');
eq(doc.fullscreenElement, 'html', 'and gets it');
enterFullscreen();
eq(asks, 1, 'a page that already is asks for nothing — start must not toggle a player out');

// ---- the wait for a gesture ----
doc.fullscreenElement = null; asks = 0; store.clear();
rememberFullscreen(false);
restoreFullscreenOnGesture();
eq(waiting(), 0, 'a player who was not in fullscreen is not waited on');
fire('pointerdown');
eq(asks, 0, 'and a click does nothing');

rememberFullscreen(true);
const cancel = restoreFullscreenOnGesture();
eq(waiting(), 2, 'a player who was waits on a click or a key');
fire('keydown');
eq(asks, 1, 'the first key puts it back');
eq(waiting(), 0, 'and the wait is over');
fire('pointerdown');
eq(asks, 1, 'a second gesture does not ask again');
cancel();

// A browser that refuses is asked once, not on every click for the rest of the session.
doc.fullscreenElement = null; asks = 0; refuse = true;
rememberFullscreen(true);
restoreFullscreenOnGesture();
fire('pointerdown');
eq(asks, 1, 'a refusal is a refusal');
fire('pointerdown'); fire('keydown');
eq(asks, 1, 'and is not argued with');
refuse = false;

// Already fullscreen when the page loads (the browser's own F11 survives a navigation): no wait.
doc.fullscreenElement = 'html'; asks = 0;
rememberFullscreen(true);
restoreFullscreenOnGesture();
eq(waiting(), 0, 'nothing to wait for when the window is already fullscreen');

// ---- the app uses it the way this module intends ----
const { readFileSync } = await import('node:fs');
const app = readFileSync('src/app/App.tsx', 'utf8');
ok(/rememberFullscreen\(!!document\.fullscreenElement\)/.test(app), 'every entry and exit is written down');
ok(/useEffect\(\(\) => restoreFullscreenOnGesture\(\), \[\]\)/.test(app), 'and every page waits for its gesture');
ok(/enterFullscreen\(\);/.test(app) && !/viaGesture \? void toggleFullscreen/.test(app), 'starting a match enters rather than toggles');
ok(/onFullscreen=\{toggleFullscreen\}/.test(app), 'and the toolbar button is still the one control that toggles');

console.log(`fullscreen: ${passes} checks passed`);
