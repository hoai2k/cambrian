import { useSyncExternalStore } from 'react';
import type { HudSnapshot, ViewportRect } from '../shared/hud-types';

/**
 * Where the engine's HUD snapshot lives between frames.
 *
 * It arrives twenty-four times a second, and it used to be `App`'s own state — so the whole shell,
 * the pick screen's props, the toolbar, the dialogs and every panel of the HUD re-rendered at that
 * rate to redraw a few bars. Now the snapshot is held here: the HUD and the results panel read it
 * (`useHud`), and `App` reads only the handful of facts it actually decides things on
 * (`useHudShell`), which change a few times a match rather than every frame.
 */
let snap: HudSnapshot | null = null;
const listeners = new Set<() => void>();

/** What the shell decides on: whether there is a match to draw, and where its menus stand. */
export interface HudShell {
  present: boolean;
  canContinue: boolean;
  /** A travel menu, a creature swap or a scoreboard is open in some viewport. */
  playerMenu: boolean;
  teleportOpen: boolean;
  views: { rect: ViewportRect; senseOn: boolean }[];
}

const shellOf = (s: HudSnapshot | null): HudShell => ({
  present: !!s,
  canContinue: !!s?.canContinue,
  playerMenu: !!s?.players.some((p) => p.teleport || p.swap || p.board),
  teleportOpen: !!s?.players.some((p) => p.teleport),
  views: s ? s.players.map((p, i) => ({ rect: s.rects[i] ?? { x: 0, y: 0, w: 1, h: 1 }, senseOn: p.senseOn })) : [],
});

let shell = shellOf(null);
let shellKey = JSON.stringify(shell);

export const hudStore = {
  get: () => snap,
  set(s: HudSnapshot | null) {
    snap = s;
    // The shell is a new object only when something in it changed, which is what lets
    // `useSyncExternalStore` leave `App` alone on an ordinary frame.
    const next = shellOf(s), key = JSON.stringify(next);
    if (key !== shellKey) { shell = next; shellKey = key; }
    for (const l of listeners) l();
  },
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
};

const getShell = () => shell;

/** The latest snapshot; re-renders the caller on every one. For the HUD and the results panel. */
export function useHud() { return useSyncExternalStore(hudStore.subscribe, hudStore.get); }

/** The facts the shell decides on; re-renders the caller only when one of them changes. */
export function useHudShell() { return useSyncExternalStore(hudStore.subscribe, getShell); }
