import { ACTIVE_ERA } from '../content';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { audio } from '../audio/audio';
import { gamepads, readGamepad, type RawControls } from '../input/input';
import type { AssetProgress } from '../render/assets';
import { Engine, type HudSnapshot } from '../render/engine';
import type { Quality } from '../render/sea';
import { PLAYABLE_IDS as CREATURE_IDS, PLAYABLE as CREATURES, creature, setEquivalentSizing, type CreatureId } from '../sim/creatures';
import { MODE_IDS, type Mode, type PlayerSetup } from '../sim/types';
import { clampMark } from '../sim/ladder';
import { emptyCodex, hasNewFinds, loadCodex, mergeCodex, recordFinds, type Codex } from './codex';
import { Hud } from './Hud';
import { LoadingScreen, useSlow } from './Loading';
import { Dialogs, PauseMenu, Results, type MenuItem } from './Overlays';
import { debugGame } from '../shared/debug';
import { exportRecording, recordingPhase, resetRecording, startRecording, stopRecording } from './debug-record';
import { atMain, cycle, groupsFor, stops, type Focus, type FocusGroup } from './focus-ring';
import { rectsOf, step as spatialStep, type Dir } from './spatial-nav';
import { gridColumns, SelectScreen } from './Select';
import { TitleScreen } from './Title';
import { Toolbar } from './Toolbar';
import { toolbarPlace } from './toolbar-place';
import { menuScheme } from '../shared/controls';
import { freshCursor, menuPress, MENU_LOCKOUT, type MenuCursor, type MenuEvent } from './menu-cursor';

export type Screen = 'title' | 'select' | 'playing' | 'results';
export type DialogKind = null | 'help' | 'settings';
/**
 * `equivalentSizing` flattens the roster back to one size, the way it was authored — see
 * `setEquivalentSizing` in src/sim/creatures.ts. Off by default, so the roster plays at the
 * animals' natural sizes, and applied between matches rather than during one: body length is an
 * input to almost everything in the simulation, and `src/sim` has to replay the same way from the
 * same inputs.
 */
export interface Settings { quality: Quality; lookSpeed: number; invertY: boolean; volume: number; muted: boolean; music: boolean; equivalentSizing: boolean; }

/** The active era's modes, in its order; the first is the default selection. */
const MODES: Mode[] = ACTIVE_ERA.modes.map((m) => m.id);
const SETTINGS_KEY = ACTIVE_ERA.copy.settingsKey;
const defaultSettings = (): Settings => {
  try { const s = localStorage.getItem(SETTINGS_KEY); if (s) return { ...{ quality: 'high', lookSpeed: 1, invertY: false, volume: 0.8, muted: false, music: true, equivalentSizing: false }, ...JSON.parse(s) }; } catch { /* ignore */ }
  return { quality: 'high', lookSpeed: 1, invertY: false, volume: 0.8, muted: false, music: true, equivalentSizing: false };
};

/**
 * `?screen=select` opens straight on the roster instead of the title.
 *
 * It is how the other era's picker links across: switching game is a page load, and landing the
 * player back on PRESS START would undo the choice they just made. Read once and then wiped from
 * the address bar, so a refresh — or the emblem taking them back to the title — behaves like any
 * other visit. Not a module-level constant: `location` has to be read inside the app, not while
 * this module is being evaluated.
 */
function deepLinkedToSelect(): boolean {
  try { return new URLSearchParams(location.search).get('screen') === 'select'; } catch { return false; }
}

/**
 * One direction out of a pad, for steering a group of buttons.
 *
 * The D-pad answers on the press; the stick repeats on a timer, so holding it walks along a row
 * rather than firing once or running away. `repeat` is the same per-pad map the rest of the loop
 * uses, so a stick cannot drive two things at two rates in one frame.
 */
function padDir(
  c: RawControls,
  just: (k: keyof RawControls) => boolean,
  index: number,
  now: number,
  repeat: Map<number, number>,
): Dir | null {
  if (just('dright')) return 'right';
  if (just('dleft')) return 'left';
  if (just('ddown')) return 'down';
  if (just('dup')) return 'up';
  const x = Math.abs(c.mx) > 0.6 ? Math.sign(c.mx) : 0;
  const y = Math.abs(c.my) > 0.6 ? -Math.sign(c.my) : 0;
  if ((x || y) && now - (repeat.get(index) ?? 0) > 240) {
    repeat.set(index, now);
    // A stick pushed on the diagonal answers on whichever axis it is further along.
    if (Math.abs(c.mx) >= Math.abs(c.my)) return x > 0 ? 'right' : 'left';
    return y > 0 ? 'up' : 'down';
  }
  return null;
}

export function App() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [screen, setScreen] = useState<Screen>(() => (deepLinkedToSelect() ? 'select' : 'title'));
  const screenRef = useRef<Screen>(deepLinkedToSelect() ? 'select' : 'title');
  const [players, setPlayers] = useState<PlayerSetup[]>([]);
  const playersRef = useRef<PlayerSetup[]>([]);
  const [mode, setMode] = useState<Mode>(MODES[0]);
  const modeRef = useRef<Mode>(MODES[0]);
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [paused, setPaused] = useState(false);
  /** The recorder's state, mirrored into React so the pause menu's one button can name itself. */
  const [recPhase, setRecPhase] = useState(recordingPhase);
  const pausedRef = useRef(false);
  /**
   * The in-game menus (pause, results) are navigated rather than button-mapped: `menuSel` is the
   * highlighted choice and `menuShown` whether the highlight is drawn at all. The results screen
   * arrives on its own, in the middle of a fight, so it starts with nothing highlighted — the
   * first press only makes the cursor appear, on the choice that costs least. `menuAt` is when the
   * menu opened; presses within `MENU_LOCKOUT` of that are the tail of the fight, not answers.
   */
  const [menuCursor, setMenuCursor] = useState<MenuCursor>(freshCursor(true));
  const menuCursorRef = useRef<MenuCursor>(freshCursor(true));
  const menuAtRef = useRef(0);
  const menuItemsRef = useRef<MenuItem[]>([]);
  /**
   * Which group of buttons the pad is steering, cycled with the shoulder buttons. See
   * `focus-ring.ts`: `main` is the screen's own business, and the ring reaches the era link, the
   * mode chips and the icon buttons without giving any of them a button of their own.
   */
  const [focus, setFocus] = useState<Focus>(atMain);
  const focusRef = useRef<Focus>(focus);
  /** Where the icon buttons went, for the gamepad loop — which runs outside the render. */
  const toolbarRef = useRef<'left' | 'right' | 'hidden'>('right');
  const setFocusBoth = useCallback((f: Focus) => { focusRef.current = f; setFocus(f); }, []);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const dialogRef = useRef<DialogKind>(null);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const settingsRef = useRef<Settings>(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState<AssetProgress | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isFs, setIsFs] = useState(false);
  const [padIndices, setPadIndices] = useState<number[]>([]);
  const padCount = padIndices.length;
  /** When the player last touched anything. Drives the idle gate on the asset loader. */
  const lastInputRef = useRef(0);
  /**
   * The record as this device holds it: biomes, landmarks, species taken to the top, and the
   * furthest rung each creature has reached in Rise. Held in state as well as in storage because
   * the select screen badges the growth record and offers to start from it, and both have to
   * change the moment a match improves on them.
   */
  const [record, setRecord] = useState<Codex>(loadCodex);
  const recordRef = useRef(record);
  const best = record.best;
  /**
   * Per player: whether they have asked to carry on from their record rather than hatch.
   *
   * Kept as the intent rather than as a rung, so that walking the cursor across a creature with no
   * record and back again does not quietly switch the choice off. It is resolved against the
   * record — and against the mode, since only Rise grows you — at the moment a match starts.
   */
  const [carry, setCarry] = useState<boolean[]>([]);
  const carryRef = useRef<boolean[]>([]);
  /**
   * What this match has added to the record, so the results screen can mark it new.
   *
   * It has to be accumulated as it happens rather than worked out at the end. The record is
   * written live — that is the whole point of it, so leaving keeps what you found — which means
   * by the time the results screen loads the stored record, this match's finds are already in it
   * and there is nothing left to compare against.
   */
  const [fresh, setFresh] = useState<Codex>(emptyCodex);
  const freshRef = useRef<Codex>(fresh);
  const clearFresh = useCallback(() => { freshRef.current = emptyCodex(); setFresh(freshRef.current); }, []);
  const setCarryBoth = useCallback((c: boolean[]) => { carryRef.current = c; setCarry(c); }, []);

  const updatePlayers = useCallback((p: PlayerSetup[]) => { playersRef.current = p; setPlayers(p); }, []);
  /**
   * Fold what a match finds into the record as it finds it — biomes swum through, landmarks come
   * across, species taken to the top, growth marks moved.
   *
   * The HUD snapshot arrives every frame, so this asks the cheap question first and does nothing
   * — no merge, no parse, no write, no re-render — until something is actually new. Recording live
   * rather than at the results screen is the whole point: a player who swims through four biomes
   * and then quits to the title has still seen four biomes.
   */
  const keepFinds = useCallback((found: Codex) => {
    if (!hasNewFinds(recordRef.current, found)) return;
    const { codex, fresh: added } = mergeCodex(recordRef.current, found);
    recordRef.current = codex; setRecord(codex);
    freshRef.current = mergeCodex(freshRef.current, added).codex;
    setFresh(freshRef.current);
    recordFinds(found);
  }, []);
  const go = useCallback((s: Screen) => { screenRef.current = s; setScreen(s); }, []);
  const setPausedBoth = useCallback((p: boolean) => { pausedRef.current = p; setPaused(p); engineRef.current?.setPaused(p || dialogRef.current !== null); }, []);
  const openDialog = useCallback((d: DialogKind) => { dialogRef.current = d; setDialog(d); engineRef.current?.setPaused(pausedRef.current || d !== null); if (d) audio.play('ui-confirm'); else audio.play('ui-back'); }, []);

  // Engine lifecycle
  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new Engine(canvasRef.current, settings.quality, {
      onHud: (s) => {
        setHud(s);
        keepFinds(s.discovery);
        if (s.status !== 'playing' && screenRef.current === 'playing') { go('results'); engineRef.current?.releasePointer(); audio.play(s.status === 'won' ? 'won' : 'death'); }
      },
      onMenu: () => { if (screenRef.current === 'playing') { setPausedBoth(!pausedRef.current); audio.play('ui-confirm'); } },
      onError: (m) => setError(m),
      // The pointer lock went away on its own — Escape, or the window lost focus. Nothing good
      // happens if the match keeps running behind a cursor the player cannot see, so it pauses.
      onPointerLost: () => { if (screenRef.current === 'playing' && !pausedRef.current && !dialogRef.current) { setPausedBoth(true); audio.play('ui-back'); } },
      onLoaded: () => setLoaded(true),
      onProgress: (p) => setProgress(p),
    });
    engineRef.current = engine;
    engine.setLook(settings.lookSpeed, settings.invertY);
    return () => { engine.dispose(); engineRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.setQuality(settings.quality);
    engineRef.current?.setLook(settings.lookSpeed, settings.invertY);
    // Not mid-match: the running simulation is already built around the lengths it started with.
    if (screenRef.current !== 'playing') setEquivalentSizing(settings.equivalentSizing);
    audio.setVolume(settings.volume); audio.setMuted(settings.muted); audio.setMusic(settings.music);
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
  }, [settings]);

  // Fullscreen tracking
  useEffect(() => {
    const on = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      setNotice('');
    } catch { /* A browser may refuse it (no user gesture, an embedded frame, a policy). It is an
      optional convenience with an obvious button in the corner, so it fails quietly. */ }
  }, []);

  /**
   * Load only while the player is not doing anything.
   *
   * Decoding a creature model or an image is main-thread work measured in tens to hundreds of
   * milliseconds, and while it runs nothing else happens: not a render, not a gamepad poll. That
   * is what makes a menu feel like it is ignoring you — the press was real, the page was simply
   * not looking. So the loader is switched off the moment anything is pressed and switched back on
   * after IDLE_MS of quiet, which is long enough to cover the gaps between presses in a burst of
   * menu navigation but short enough that a player who pauses to read gets everything streaming
   * again. Work already in flight is never interrupted.
   *
   * The gate does not apply until the boot assets are in: on the loading screen the player is
   * waiting for exactly this and holding it back would be perverse.
   */
  useEffect(() => {
    const IDLE_MS = 700;
    const mark = () => { lastInputRef.current = performance.now(); };
    const events: (keyof WindowEventMap)[] = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'];
    for (const e of events) window.addEventListener(e, mark, { passive: true });
    const id = setInterval(() => {
      const q = engineRef.current?.assets;
      if (!q) return;
      q.setIdle(!loaded || performance.now() - lastInputRef.current > IDLE_MS);
    }, 100);
    return () => { for (const e of events) window.removeEventListener(e, mark); clearInterval(id); };
  }, [loaded]);

  // Arriving on the roster from the other game's picker: the seat the title screen would have
  // opened. Audio needs no help — any gesture wakes it below — and the parameter is cleared so the
  // address bar stops claiming a screen the player may since have left.
  useEffect(() => {
    if (!deepLinkedToSelect()) return;
    updatePlayers([{ creature: ACTIVE_ERA.defaults.player, device: 'keyboard', ready: false }]);
    try { history.replaceState(null, '', location.pathname + location.hash); } catch { /* a file:// page has no history to rewrite */ }
  }, [updatePlayers]);

  // Any user gesture: wake audio (browsers require it)
  useEffect(() => {
    const wake = () => { audio.init(); audio.resume(); };
    window.addEventListener('pointerdown', wake); window.addEventListener('keydown', wake);
    return () => { window.removeEventListener('pointerdown', wake); window.removeEventListener('keydown', wake); };
  }, []);

  // ---- Screen transitions ----
  const startFromTitle = useCallback((device: PlayerSetup['device'], viaGesture: boolean) => {
    audio.init(); audio.resume(); audio.play('ui-start');
    updatePlayers([{ creature: ACTIVE_ERA.defaults.player, device, ready: false }]);
    go('select');
    // Try for fullscreen on the way in; if the browser will not, say nothing. Starting from a pad
    // is not a gesture it counts, and a transient refusal is not worth a message either.
    if (viaGesture) void toggleFullscreen();
    else if (!document.fullscreenElement) void document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  }, [go, toggleFullscreen, updatePlayers]);

  /**
   * The setups as the simulation wants them: the roster plus, for anyone who asked and has a record
   * to draw on, the rung to hatch at. Only Rise grows a player through the ladder, so only Rise
   * carries anything on; every other mode hands out its own body and the field is left off.
   */
  const withCarry = useCallback((ps: PlayerSetup[]) => ps.map((p, i) => {
    const mark = modeRef.current === 'rise' && carryRef.current[i] ? clampMark(recordRef.current.best[p.creature] ?? 0) : 0;
    return { ...p, startRung: mark > 0 ? mark : 0 };
  }), []);

  const startMatch = useCallback(() => {
    const ps = playersRef.current;
    if (!ps.length || !ps.every((p) => p.ready) || !engineRef.current) return;
    clearFresh();
    // Fixed for the length of the match, whatever the settings panel does while it runs.
    setEquivalentSizing(settingsRef.current.equivalentSizing);
    engineRef.current.startMatch(modeRef.current, withCarry(ps));
    setPausedBoth(false);
    go('playing');
  }, [clearFresh, go, loaded, setPausedBoth, withCarry]);

  const backToSelect = useCallback(() => {
    engineRef.current?.startAttract();
    updatePlayers(playersRef.current.map((p) => ({ ...p, ready: false })));
    setPausedBoth(false);
    setHud(null);
    go('select');
    audio.play('ui-back');
  }, [go, setPausedBoth, updatePlayers]);

  const backToTitle = useCallback(() => {
    engineRef.current?.startAttract();
    updatePlayers([]);
    setPausedBoth(false);
    setHud(null);
    go('title');
    audio.play('ui-back');
  }, [go, setPausedBoth, updatePlayers]);

  /**
   * Carry the finished match on instead of restarting it. Only the co-op modes offer this: the sea,
   * the bodies and everything grown in them stay exactly as they were, and the goal stops watching.
   */
  const keepPlaying = useCallback(() => {
    if (!engineRef.current?.continueMatch()) return;
    setPausedBoth(false);
    go('playing');
  }, [go, setPausedBoth]);

  /**
   * One input into the open menu. `menu-cursor.ts` holds the rules — the lockout, the cursor that
   * has to be woken before it will act, the wrap — and this wires them to the sound and the run.
   */
  const menuInput = useCallback((ev: MenuEvent) => {
    const before = menuCursorRef.current;
    const items = menuItemsRef.current;
    const locked = performance.now() - menuAtRef.current < MENU_LOCKOUT;
    const { cursor, act } = menuPress(before, items.length, ev, locked);
    if (cursor !== before) { menuCursorRef.current = cursor; setMenuCursor(cursor); audio.play('ui-move'); }
    if (act) { const it = items[cursor.sel]; if (it) { audio.play('ui-confirm'); it.run(); } }
  }, []);

  /**
   * The buttons a focus group holds, read from the page rather than mirrored in state.
   *
   * These are the same elements the mouse clicks, so their rectangles are the truth about where
   * they are — which is what `spatial-nav` needs, and what keeps a wrapped row of menu choices
   * navigating the way it looks. Read-only: nothing here writes to the DOM React owns.
   */
  const groupEls = useCallback((group: FocusGroup): HTMLElement[] => {
    const sel = group === 'icons' ? '.toolbar .icon-button'
      : group === 'modes' ? '.mode-picker .mode-chip'
      : group === 'era' ? '.era-switch'
      : '.menu-choices button';
    return [...document.querySelectorAll<HTMLElement>(sel)];
  }, []);

  /** Take the button the ring is pointing at. */
  const runFocused = useCallback(() => {
    const f = focusRef.current;
    const els = groupEls(f.group);
    const el = els[Math.min(f.index, els.length - 1)];
    if (!el) return false;
    audio.play('ui-confirm');
    el.click();
    return true;
  }, [groupEls]);

  /**
   * How far a direction press should move the menu cursor, by where the choices actually are.
   *
   * The choices are a wrapping flex row, so left and right are the natural way along them and the
   * old up/down-only cursor left the first thing a pad player tries doing nothing. Returned as a
   * step so `menu-cursor.ts` keeps owning the rules — the lockout, the cursor that has to be woken,
   * the wrap — and only the geometry lives here.
   */
  const menuStep = useCallback((dir: Dir) => {
    const els = groupEls('main');
    const at = menuCursorRef.current.sel;
    if (els.length < 2) return dir === 'right' || dir === 'down' ? 1 : -1;
    return spatialStep(rectsOf(els), Math.min(at, els.length - 1), dir) - at;
  }, [groupEls]);

  /** Steer inside the focused group, by where its buttons are. */
  const moveFocus = useCallback((dir: Dir) => {
    const f = focusRef.current;
    const els = groupEls(f.group);
    if (els.length <= 1) return;
    const next = spatialStep(rectsOf(els), Math.min(f.index, els.length - 1), dir);
    if (next === f.index) return;
    setFocusBoth({ ...f, index: next });
    audio.play('ui-move');
  }, [groupEls, setFocusBoth]);

  const menuHover = useCallback((i: number) => {
    const cursor = { sel: i, shown: true };
    menuCursorRef.current = cursor; setMenuCursor(cursor);
  }, []);

  const playAgain = useCallback(() => {
    if (!engineRef.current) return;
    clearFresh();
    engineRef.current.startMatch(modeRef.current, withCarry(playersRef.current));
    setPausedBoth(false);
    go('playing');
  }, [clearFresh, go, setPausedBoth, withCarry]);

  /** Move a player's cursor on the roster grid. Locked players must unlock first (B). */
  /**
   * Move the pick cursor around the roster grid.
   *
   * The grid is only rectangular when the roster divides by three. An era whose models arrive in
   * batches has a ragged last row — the Devonian's nine playable species make a 4-wide grid whose
   * bottom row holds one — and the old maths moved within a row modulo the *column count*, so on
   * that row every horizontal press landed back on the creature you were already on. The default
   * pick sat there, which made the first thing a Devonian player ever pressed do nothing.
   *
   * So left and right walk the roster itself and always move, wrapping at the ends; up and down
   * move by a row and clamp into a short one. Both are what a grid of tiles is expected to do,
   * and neither can be a no-op.
   */
  const moveCursor = useCallback((index: number, dx: number, dy: number) => {
    const ps = [...playersRef.current];
    const p = ps[index]; if (!p || p.ready) return;
    const n = CREATURES.length, cols = gridColumns(n), rows = Math.ceil(n / cols);
    const i = CREATURE_IDS.indexOf(p.creature);
    if (i < 0 || n === 0) return;
    let j = i;
    if (dx) j = (i + dx + n) % n;
    if (dy) {
      const r = (Math.floor(j / cols) + dy + rows) % rows;
      const rowLength = Math.min(cols, n - r * cols);
      j = r * cols + Math.min(j % cols, rowLength - 1);
    }
    if (j === i || j < 0 || j >= n) return;
    ps[index] = { ...p, creature: CREATURE_IDS[j] };
    updatePlayers(ps); audio.play('ui-move');
  }, [updatePlayers]);
  const cycleCreature = useCallback((index: number, dir: number) => moveCursor(index, dir, 0), [moveCursor]);
  const setCreature = useCallback((index: number, c: CreatureId) => {
    const ps = [...playersRef.current]; if (!ps[index] || ps[index].ready) return;
    ps[index] = { ...ps[index], creature: c }; updatePlayers(ps); audio.play('ui-move');
  }, [updatePlayers]);
  const toggleReady = useCallback((index: number) => {
    const ps = [...playersRef.current]; if (!ps[index]) return;
    ps[index] = { ...ps[index], ready: !ps[index].ready }; updatePlayers(ps); audio.play(ps[index].ready ? 'ui-confirm' : 'ui-back');
  }, [updatePlayers]);
  /**
   * Start as a hatchling, or carry on from the furthest this creature has been taken in Rise.
   *
   * Silently does nothing outside Rise, or for a creature with no record: there is nothing to
   * carry on from, and a control that appeared to do something and did not would be worse than one
   * that is plainly unavailable — so the card only offers it when it is real.
   */
  const toggleCarry = useCallback((index: number) => {
    const p = playersRef.current[index];
    if (!p || modeRef.current !== 'rise' || !(recordRef.current.best[p.creature] ?? 0)) return;
    const next = [...carryRef.current];
    next[index] = !next[index];
    setCarryBoth(next); audio.play(next[index] ? 'ui-confirm' : 'ui-back');
  }, [setCarryBoth]);
  const removePlayer = useCallback((index: number) => {
    const ps = playersRef.current.filter((_, i) => i !== index);
    if (!ps.length) { backToTitle(); return; }
    // The choice is indexed by seat, so it has to shuffle down with the seats.
    setCarryBoth(carryRef.current.filter((_, i) => i !== index));
    updatePlayers(ps); audio.play('ui-back');
  }, [backToTitle, setCarryBoth, updatePlayers]);
  const addPlayer = useCallback((device: PlayerSetup['device']) => {
    const ps = playersRef.current;
    if (ps.length >= 4 || ps.some((p) => p.device === device)) return;
    updatePlayers([...ps, { creature: CREATURE_IDS[ps.length % CREATURE_IDS.length], device, ready: false }]);
    audio.play('ui-join');
  }, [updatePlayers]);
  /** The keyboard joins once and only once: two players never share one. */
  const addKeyboard = useCallback(() => {
    if (playersRef.current.some((p) => typeof p.device === 'string')) return;
    addPlayer('keyboard');
  }, [addPlayer]);
  const changeMode = useCallback((m: Mode) => { modeRef.current = m; setMode(m); audio.play('ui-move'); updatePlayers(playersRef.current.map((p) => ({ ...p, ready: false }))); }, [updatePlayers]);

  /**
   * Hand the sticks to the next group along. The pad that does it owns the ring, so on a shared
   * choice screen the other players keep steering their own pick.
   */
  const cycleFocus = useCallback((dir: number, owner: number | 'keyboard') => {
    const ring = groupsFor(screenRef.current, pausedRef.current || screenRef.current === 'results', {
      sibling: !!ACTIVE_ERA.copy.sibling, icons: toolbarRef.current !== 'hidden',
    });
    const all = stops(ring, { era: groupEls('era').length, modes: groupEls('modes').length, icons: groupEls('icons').length });
    const f = focusRef.current;
    const from = f.owner === null || f.owner === owner ? f : { group: 'main' as FocusGroup, index: 0 };
    const to = cycle(all, from, dir);
    setFocusBoth({ ...to, owner: to.group === 'main' ? null : owner });
    // A mode chip is a tab: landing on it picks it, which is what the shoulders always did here.
    if (to.group === 'modes') { const m = MODES[to.index]; if (m && m !== modeRef.current) changeMode(m); }
    audio.play('ui-move');
  }, [changeMode, groupEls, setFocusBoth]);


  // ---- Gamepad menu navigation ----
  useEffect(() => {
    const prev = new Map<number, RawControls>();
    const repeat = new Map<number, number>();
    const loop = () => {
      const pads = gamepads();
      const live = pads.map((g) => g.index);
      setPadIndices((old) => (old.length === live.length && old.every((v, i) => v === live[i]) ? old : live));
      for (const gp of pads) {
        // Re-read the screen for every pad. One pad starting the game moves everyone to the
        // select screen immediately, and the pads after it in this same frame must see that —
        // otherwise a second pad pressing at the same moment restarts from the title and throws
        // the first player away.
        const s = screenRef.current;
        const c = readGamepad(gp);
        const p = prev.get(gp.index);
        const just = (k: keyof RawControls) => !!c[k] && !p?.[k];
        const now = performance.now();
        // A pad counts as input too, so the loader holds off while somebody is steering a menu.
        if (c.anyButton || Math.hypot(c.mx, c.my) > 0.3) lastInputRef.current = now;
        if (dialogRef.current) {
          if (just('back') || just('menu')) openDialog(null);
        } else if (s === 'title') {
          // The shoulders reach the era link and the icon buttons; everything else is "press start"
          // until the ring has moved off the screen's own business.
          if (just('lb')) cycleFocus(-1, gp.index);
          else if (just('rb')) cycleFocus(1, gp.index);
          else if (focusRef.current.group !== 'main') {
            const d = padDir(c, just, gp.index, now, repeat);
            if (d) moveFocus(d);
            else if (just('confirm')) runFocused();
            else if (just('back')) setFocusBoth(atMain());
          }
          else if (c.any && !(p?.any)) startFromTitle(gp.index, false);
        } else if (s === 'select') {
          const ps = playersRef.current;
          const idx = ps.findIndex((x) => x.device === gp.index);
          // Any button joins, not just A. The title says PRESS START, so Start has to work here
          // too, and a pad that reports a non-standard mapping still gets its player in.
          if (idx < 0) { if (just('anyButton')) addPlayer(gp.index); }
          else if (focusRef.current.owner === gp.index && focusRef.current.group !== 'main') {
            // This pad has taken the ring off the roster. The others carry on picking.
            if (just('lb')) cycleFocus(-1, gp.index);
            else if (just('rb')) cycleFocus(1, gp.index);
            else {
              const d = padDir(c, just, gp.index, now, repeat);
              if (d) moveFocus(d);
              else if (just('confirm')) runFocused();
              else if (just('back')) setFocusBoth(atMain());
            }
          }
          else {
            const stickX = Math.abs(c.mx) > 0.6 ? Math.sign(c.mx) : 0, stickY = Math.abs(c.my) > 0.6 ? -Math.sign(c.my) : 0;
            const dx = just('dright') ? 1 : just('dleft') ? -1 : 0, dy = just('ddown') ? 1 : just('dup') ? -1 : 0;
            const lastRep = repeat.get(gp.index) ?? 0;
            if (dx || dy) { moveCursor(idx, dx, dy); repeat.set(gp.index, now); }
            else if ((stickX || stickY) && now - lastRep > 240) { moveCursor(idx, stickX, stickY); repeat.set(gp.index, now); }
            if (just('confirm')) { if (ps[idx].ready) startMatch(); else toggleReady(idx); }
            if (just('back')) { if (ps[idx].ready) toggleReady(idx); else removePlayer(idx); }
            if (just('menu')) startMatch();
            // Hatch, or carry on from your record. On `light` — X — because it is the one attack
            // control no other menu action wants; `ability` would be worse rather than better,
            // since two menu actions on one button is the collision that matters here.
            if (just('light')) toggleCarry(idx);
            // LB and RB hand the sticks to the next group along — the roster, the mode chips, the
            // icon buttons. Bind to the raw shoulder buttons, never to a gameplay control: this
            // used to read `burst`, which is button 0 — the same button as confirm — so every A
            // press locked the player in and then changed mode, and changeMode un-readies
            // everyone, which meant nobody could ever lock in or start a match.
            if (just('lb')) cycleFocus(-1, gp.index);
            else if (just('rb')) cycleFocus(1, gp.index);
          }
        } else if ((s === 'playing' && pausedRef.current) || s === 'results') {
          // Deaf for a moment after the menu opens. The results screen arrives on its own, with a
          // hand still working the pad, and a button that was part of the fight must not answer a
          // question it never saw. A button held across the lockout is not an edge afterwards
          // either, so it stays silent until it is released and pressed again.
          const awake = menuCursorRef.current.shown;
          const dir = padDir(c, just, gp.index, now, repeat);
          // The shoulders reach the icon buttons from a menu too, so a pause is a way to the
          // settings without a mouse.
          if (just('lb')) cycleFocus(-1, gp.index);
          else if (just('rb')) cycleFocus(1, gp.index);
          else if (focusRef.current.group !== 'main') {
            if (dir) moveFocus(dir);
            else if (just('confirm')) runFocused();
            else if (just('back')) setFocusBoth(atMain());
          }
          // The choices are a row, so left and right walk them; `spatial-nav` reads where they
          // actually are, which is what makes up and down keep working on a row that wrapped.
          else if (dir) { menuInput({ step: menuStep(dir) }); }
          else if (just('confirm')) menuInput({ confirm: true });
          // Any other button wakes a sleeping cursor, and only that.
          else if (!awake && just('anyButton')) menuInput({ other: true });
          // The pause menu was opened deliberately, so the button that opened it closes it —
          // but never during the lockout, and never before the cursor is awake.
          else if (awake && s === 'playing' && (just('menu') || just('back')) && now - menuAtRef.current >= MENU_LOCKOUT) setPausedBoth(false);
        }
        prev.set(gp.index, c);
      }
      // Forget pads that have gone, so a reconnect starts from a clean edge rather than
      // inheriting the buttons that were held when it vanished.
      for (const index of prev.keys()) if (!live.includes(index)) { prev.delete(index); repeat.delete(index); }
    };
    // Deliberately a timer and not requestAnimationFrame. The Gamepad API is a snapshot: a button
    // that goes down and up between two polls is never seen at all. Polling on animation frames
    // ties menu input to how fast the sea happens to be rendering, and a frame that runs long —
    // parsing a creature model, building chunk geometry — swallows a whole press. At 120 Hz here
    // a tap has to be shorter than 8 ms to be missed.
    const id = setInterval(loop, 1000 / 120);
    return () => clearInterval(id);
    // padIndices is deliberately not a dependency: it is written from inside this loop, and
    // listing it would tear the loop down and rebuild it every time a pad connects, losing the
    // button edges held in `prev`.
  }, [addPlayer, changeMode, menuInput, moveCursor, openDialog, removePlayer, setPausedBoth, startFromTitle, startMatch, toggleCarry, toggleReady]);

  // ---- Keyboard menu navigation ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.matches?.('input,textarea,select')) return;
      const s = screenRef.current;
      if (dialogRef.current) { if (e.code === 'Escape') openDialog(null); return; }
      if (s === 'title') { if (!e.metaKey && !e.ctrlKey && e.code !== 'F11') startFromTitle('keyboard', true); return; }
      if (s === 'select') {
        const ps = playersRef.current;
        const idx = ps.findIndex((x) => x.device === 'keyboard');
        if (idx >= 0) {
          if (e.code === 'ArrowRight' || e.code === 'KeyD') moveCursor(idx, 1, 0);
          if (e.code === 'ArrowLeft' || e.code === 'KeyA') moveCursor(idx, -1, 0);
          if (e.code === 'ArrowDown' || e.code === 'KeyS') moveCursor(idx, 0, 1);
          if (e.code === 'ArrowUp' || e.code === 'KeyW') moveCursor(idx, 0, -1);
          if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (ps[idx].ready) startMatch(); else toggleReady(idx); }
          if (e.code === 'Escape') { if (ps[idx].ready) toggleReady(idx); else backToTitle(); }
          // The keyboard's own way to the same choice the pad makes with Y.
          if (e.code === 'KeyC') toggleCarry(idx);
        } else if (e.code === 'Enter' || e.code === 'Space') addKeyboard();
        if (e.code === 'KeyQ') changeMode(MODES[(MODES.indexOf(modeRef.current) + MODES.length - 1) % MODES.length]);
        if (e.code === 'KeyE') changeMode(MODES[(MODES.indexOf(modeRef.current) + 1) % MODES.length]);
        return;
      }
      if (s === 'results' || (s === 'playing' && pausedRef.current)) {
        // The same rules for the keyboard: a lockout, a cursor, and one key that acts.
        const awake = menuCursorRef.current.shown;
        if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); menuInput({ step: 1 }); return; }
        if (e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); menuInput({ step: -1 }); return; }
        if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); menuInput({ confirm: true }); return; }
        if (e.code === 'Escape' && s === 'playing' && awake && performance.now() - menuAtRef.current >= MENU_LOCKOUT) { setPausedBoth(false); return; }
        menuInput({ other: true });
        return;
      }
      if (s === 'playing') {
        // Escape is `menu` on both keyboard layouts, so for a match with a keyboard player in it
        // the engine already turns it into a pause (`onMenu`). Toggling here as well would flip
        // the pause twice in the same press and leave it exactly where it started — which is what
        // used to happen, and is why Escape appeared to do nothing on a keyboard. Only a match
        // made entirely of controllers needs this path.
        const onKeyboard = playersRef.current.some((pl) => typeof pl.device === 'string');
        if (e.code === 'Escape' && !onKeyboard) { setPausedBoth(!pausedRef.current); audio.play('ui-confirm'); }
        if (pausedRef.current && e.code === 'Enter') setPausedBoth(false);
        return;
      }

    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [addKeyboard, backToTitle, changeMode, menuInput, moveCursor, openDialog, setPausedBoth, startFromTitle, startMatch, toggleCarry, toggleReady]);

  // Idle-time preloading: tell the loader what is most likely to be needed next.
  useEffect(() => {
    const e = engineRef.current; if (!e) return;
    if (screen === 'title') e.prioritize([...ACTIVE_ERA.defaults.title], 'title');
    else if (screen === 'select') {
      const n = CREATURE_IDS.length, cols = gridColumns(n);
      const committed = players.filter((p) => p.ready).map((p) => p.creature);
      const hovered = players.filter((p) => !p.ready).map((p) => p.creature);
      const neighbours = players.flatMap((p) => { const i = CREATURE_IDS.indexOf(p.creature); return [i + 1, i - 1, i + cols, i - cols].filter((j) => j >= 0 && j < n).map((j) => CREATURE_IDS[j]); });
      e.prioritize([...new Set([...committed, ...hovered, ...neighbours])], 'select');
    } else e.prioritize([...new Set(players.map((p) => p.creature))], 'playing');
  }, [screen, players, loaded]);

  const allReady = players.length > 0 && players.every((p) => p.ready);
  // Menus are shared, so they speak whichever device is in the room. A pad the browser has not
  // seen a button from yet does not count — it cannot, the Gamepad API hides it until then — which
  // is why the title screen keeps its own copy about connecting one.
  const scheme = menuScheme(padCount);
  const modeInfo = useMemo(() => MODE_INFO, []);

  /**
   * What the open in-game menu offers, in order. The first entry is the default highlight and is
   * deliberately the least invasive thing on the screen: resuming loses nothing, and carrying a
   * finished co-op run on keeps the sea and everything grown in it. Restarting and quitting sit
   * below, where a stray press cannot reach them.
   */
  const menuItems = useMemo<MenuItem[]>(() => {
    if (screen === 'results') {
      const items: MenuItem[] = [];
      // Co-op modes are milestones, not verdicts: the sea is still there to swim in.
      if (hud?.canContinue) items.push({ label: 'Continue', run: keepPlaying, primary: true });
      items.push({ label: 'Play again', run: playAgain, primary: !hud?.canContinue });
      // Quitting the match lands on the choice screen, which is where you go to play again with
      // something else and where the way back to the title already is. A second button that left
      // the game altogether sat one careless press from the end of a session.
      items.push({ label: 'Quit', run: backToSelect });
      return items;
    }
    if (screen === 'playing' && paused) {
      const items: MenuItem[] = [{ label: 'Resume', run: () => setPausedBoth(false), primary: true }];
      // The match recorder, and only when the URL asked for it (`?debug=game`). One button walking
      // through its own three states, because that is the whole of the tool: record, stop, hand it
      // over. Recording carries on while the menu is open — pausing to think is not a reason to
      // lose the frames — and resuming is what gets you back to the action being recorded.
      if (debugGame()) {
        if (recPhase === 'idle') items.push({ label: 'Start recording', run: () => { startRecording(); setRecPhase('recording'); setPausedBoth(false); } });
        else if (recPhase === 'recording') items.push({ label: 'End recording', run: () => { stopRecording(); setRecPhase('ready'); } });
        else items.push(
          { label: 'Export debug', run: () => { exportRecording(); } },
          { label: 'Discard recording', run: () => { resetRecording(); setRecPhase('idle'); } },
        );
      }
      items.push({ label: 'Quit', run: backToSelect });
      return items;
    }
    return [];
  }, [screen, paused, recPhase, hud?.canContinue, keepPlaying, playAgain, backToSelect]);
  useEffect(() => { menuItemsRef.current = menuItems; }, [menuItems]);
  // The recorder stops itself when its buffer fills, so the menu reads the real state whenever it
  // opens rather than trusting what it last set.
  useEffect(() => { if (paused) setRecPhase(recordingPhase()); }, [paused]);

  // A menu opening resets the cursor. The pause menu was asked for, so its highlight is there at
  // once; the results screen was not, so it shows none until the player touches something.
  /**
   * The boot screen waits to be needed. Switching era from the choice page is a page load, and on a
   * warm one the assets are already in cache: a loading screen shown for two frames on the way
   * through is a flicker, not information.
   */
  const bootSlow = useSlow(!loaded);

  /**
   * The icon buttons sit in somebody's viewport, so they answer to whether that somebody asked for
   * a bare sea. Only in play, and only while there is a HUD to read the split from.
   */
  const toolbar = useMemo(() => {
    if (screen !== 'playing' || !hud) return 'right' as const;
    // A menu is already drawn over the water, so the buttons may as well be there with it.
    const anyMenu = paused || dialog !== null || hud.players.some((p) => p.teleport || p.swap || p.board);
    return toolbarPlace(hud.players.map((p, i) => ({ rect: hud.rects[i] ?? { x: 0, y: 0, w: 1, h: 1 }, senseOn: p.senseOn })), anyMenu);
  }, [screen, hud, paused, dialog]);

  useEffect(() => { toolbarRef.current = toolbar; }, [toolbar]);
  // A screen change puts the sticks back on that screen's own business: a ring pointing at a group
  // the new screen does not have would swallow every press.
  useEffect(() => { setFocusBoth(atMain()); }, [screen, paused, setFocusBoth]);

  const menuOpen = screen === 'results' || (screen === 'playing' && paused);
  useEffect(() => {
    if (!menuOpen) return;
    // The pause menu was asked for, so its cursor is awake at once; the results screen was not.
    const cursor = freshCursor(screen !== 'results');
    menuCursorRef.current = cursor; setMenuCursor(cursor);
    menuAtRef.current = performance.now();
  }, [menuOpen, screen]);

  return (
    <main className={`shell screen-${screen}`}>
      <div className="sea-canvas" ref={canvasRef} aria-label="Cambrian sea" />
      <div className="vignette" />

      {!loaded && bootSlow && <LoadingScreen progress={progress} fraction={progress ? Math.min(1, progress.fraction * 4) : 0} />}
      {screen === 'title' && loaded && <TitleScreen loaded={loaded} onStart={() => startFromTitle('keyboard', true)} padCount={padCount} eraFocused={focus.group === 'era'} />}

      {screen === 'select' && (
        <SelectScreen
          players={players} mode={mode} modes={MODES} modeInfo={modeInfo} allReady={allReady} padIndices={padIndices}
          scheme={scheme}
          best={best} carry={carry} modeFocus={focus.group === 'modes' ? focus.index : -1}
          onPick={setCreature} onReady={toggleReady} onRemove={removePlayer}
          onMode={changeMode} onStart={startMatch} onBack={backToTitle} onCarry={toggleCarry}
        />
      )}

      {(screen === 'playing' || screen === 'results') && hud && <Hud snapshot={hud} />}
      {screen === 'playing' && paused && <PauseMenu scheme={scheme} items={menuItems} sel={menuCursor.sel} shown={menuCursor.shown} onHover={menuHover} />}
      {screen === 'results' && hud && <Results snapshot={hud} players={players} record={record} fresh={fresh} scheme={scheme} items={menuItems} sel={menuCursor.sel} shown={menuCursor.shown} onHover={menuHover} />}

      <Toolbar place={toolbar} isFs={isFs} muted={settings.muted} focus={focus.group === 'icons' ? focus.index : -1} onHelp={() => openDialog(dialog === 'help' ? null : 'help')} onSettings={() => openDialog(dialog === 'settings' ? null : 'settings')} onMute={() => setSettings((s) => ({ ...s, muted: !s.muted }))} onFullscreen={toggleFullscreen} />
      <Dialogs kind={dialog} onClose={() => openDialog(null)} settings={settings} onSettings={setSettings} scheme={scheme} />

      {(notice || error) && (
        <div className={`notice ${error ? 'notice-error' : ''}`} role="status">
          <span>{error || notice}</span>
          <button aria-label="Dismiss" onClick={() => { setNotice(''); setError(''); }}>×</button>
        </div>
      )}
    </main>
  );
}

/** Mode copy comes from the era pack; modes the era does not offer keep a bare entry so lookups never miss. */
export const MODE_INFO: Record<Mode, { name: string; blurb: string; players: string }> = Object.fromEntries(
  MODE_IDS.map((m) => [m, ACTIVE_ERA.modes.find((x) => x.id === m) ?? { name: m, blurb: '', players: '' }]),
) as Record<Mode, { name: string; blurb: string; players: string }>;

export { creature };
