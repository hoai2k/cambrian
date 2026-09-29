import { ACTIVE_ERA } from '../content';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { audio } from '../audio/audio';
import type { AssetProgress } from '../render/assets';
import type { Engine } from '../render/engine';
import type { HudSnapshot } from '../shared/hud-types';
import { hudStore, useHud, useHudShell } from './hud-store';
import type { TouchTravelActions } from './Hud';
import type { Quality } from '../render/sea';
import { PLAYABLE_IDS as CREATURE_IDS, creature, setEquivalentSizing, type CreatureId } from '../sim/creatures';
import { MODE_IDS, type Mode, type PlayerSetup } from '../sim/types';
import { clampMark } from '../sim/ladder';
import { RULES } from '../sim/era-rules';
import { emptyCodex, hasNewFinds, loadCodex, mergeCodex, recordFinds, type Codex } from './codex';
import { Hud } from './Hud';
import { LoadingScreen, useSlow } from './Loading';
import { Dialogs, PauseMenu, Results, type MenuItem } from './Overlays';
import { TEXT } from '../shared/text';
import { debugGame } from '../shared/debug';
import { enterFullscreen, rememberFullscreen, restoreFullscreenOnGesture } from '../shared/fullscreen';
import { exportRecording, recordingPhase, resetRecording, startRecording, stopRecording } from '../shared/debug-record';
import { atMain, cycle, groupsFor, stops, type Focus, type FocusGroup } from './focus-ring';
import { rectsOf, step as spatialStep, type Dir } from './spatial-nav';
import { gridColumns, SelectScreen } from './Select';
import type { ExtraId } from './roster-grid';
import type { DepthLayout } from './depth-layout';
import type { RosterView } from './Select';
import { visitorsInBrowser, type EraId, type Visitor } from '../content/visitors';
import { registerVisitorAssets } from '../content/asset-paths';
import { admitVisitors } from '../sim/creatures';
import { TitleScreen } from './Title';
import { Toolbar } from './Toolbar';
import { toolbarPlace } from './toolbar-place';
import { menuScheme } from '../shared/controls';
import { SECONDARY, type Secondary } from '../shared/touch-play';
import { rosterCap } from '../shared/small-screen';
import { qualityForDevice } from '../shared/mobile-memory';
import { RotateHint, TouchPads } from './TouchPads';
import { useSmallScreen } from './use-small-screen';
import { assignSeatSchemes } from '../shared/seat-schemes';
import { freshCursor, menuPress, MENU_LOCKOUT, type MenuCursor, type MenuEvent } from './menu-cursor';
import { useLatest, useStateRef } from './use-latest';
import * as lineup from './lineup';
import { usePadMenus, type MenuWiring } from './use-pad-menus';
import { useMenuKeys } from './use-menu-keys';

export type Screen = 'title' | 'select' | 'playing' | 'results';
export type DialogKind = null | 'help' | 'settings';
/**
 * `equivalentSizing` flattens the roster back to one size, the way it was authored — see
 * `setEquivalentSizing` in src/sim/creatures.ts. Off by default, so the roster plays at the
 * animals' natural sizes, and applied between matches rather than during one: body length is an
 * input to almost everything in the simulation, and `src/sim` has to replay the same way from the
 * same inputs.
 */
export interface Settings {
  quality: Quality; lookSpeed: number; invertY: boolean; volume: number; muted: boolean; music: boolean;
  /** Distinguishes a deliberate high setting from the old automatic high default on mobile. */
  qualityExplicit?: boolean;
  equivalentSizing: boolean; shoreAnimals: boolean;
  /**
   * What the touch player's secondary pad is set to, and how many touch matches they have played.
   *
   * The chosen pad action outlasts a match, so a player who plays as a hider does not have to
   * swipe back to it every time they hatch.
   */
  secondary: Secondary;
  /** How the pick screen's roster is drawn on a desktop: the list, or the Size view (`depth-layout.ts`). */
  rosterView: RosterView;
}

/** The active era's modes, in its order; the first is the default selection. */
const MODES: Mode[] = ACTIVE_ERA.modes.map((m) => m.id);
const SETTINGS_KEY = ACTIVE_ERA.copy.settingsKey;
const defaultSettings = (): Settings => {
  // Re-evaluate old automatic defaults against this device; an explicit Settings choice wins.
  const defaults: Settings = { quality: qualityForDevice(undefined), lookSpeed: 1, invertY: false, volume: 0.8, muted: false, music: true, equivalentSizing: false, shoreAnimals: false, secondary: 'aim', rosterView: 'list' };
  try {
    const s = localStorage.getItem(SETTINGS_KEY);
    if (s) {
      const saved = JSON.parse(s) as Partial<Settings>;
      return { ...defaults, ...saved, secondary: SECONDARY.includes(saved.secondary as Secondary) ? saved.secondary! : 'aim', rosterView: saved.rosterView === 'size' ? 'size' : 'list', quality: qualityForDevice(saved) };
    }
  } catch { /* ignore */ }
  return defaults;
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

export function App() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [screen, go, screenRef] = useStateRef<Screen>(() => (deepLinkedToSelect() ? 'select' : 'title'));
  const [players, setPlayersBoth, playersRef] = useStateRef<PlayerSetup[]>([]);
  const [mode, setModeBoth, modeRef] = useStateRef<Mode>(MODES[0]);
  const hud = useHudShell();
  const [paused, setPausedState, pausedRef] = useStateRef(false);
  const [pauseScores, setPauseScores] = useState(false);
  /** The recorder's state, mirrored into React so the pause menu's one button can name itself. */
  const [recPhase, setRecPhase] = useState(recordingPhase);
  /**
   * The in-game menus (pause, results) are navigated rather than button-mapped: `menuSel` is the
   * highlighted choice and `menuShown` whether the highlight is drawn at all. The results screen
   * arrives on its own, in the middle of a fight, so it starts with nothing highlighted — the
   * first press only makes the cursor appear, on the choice that costs least. `menuAt` is when the
   * menu opened; presses within `MENU_LOCKOUT` of that are the tail of the fight, not answers.
   */
  const [menuCursor, setMenuCursorBoth, menuCursorRef] = useStateRef<MenuCursor>(freshCursor(true));
  const menuAtRef = useRef(0);
  /**
   * Which group of buttons the pad is steering, cycled with the shoulder buttons. See
   * `focus-ring.ts`: `main` is the screen's own business, and the ring reaches the era link, the
   * mode chips and the icon buttons without giving any of them a button of their own.
   */
  const [focus, setFocusBoth, focusRef] = useStateRef<Focus>(atMain);
  /** Where the icon buttons went, for the gamepad loop — which runs outside the render. */
  const toolbarRef = useRef<'left' | 'right' | 'hidden'>('right');
  const [dialog, setDialogBoth, dialogRef] = useStateRef<DialogKind>(null);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const settingsRef = useLatest(settings);
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState<AssetProgress | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isFs, setIsFs] = useState(false);
  const [padIndices, setPadIndices] = useState<number[]>([]);
  const padCount = padIndices.length;
  /** How much room this window has, and whether a finger is what is working it. */
  const small = useSmallScreen(padCount);
  // The reef bed is the sea's sound, and only a match shows the sea: the title and the choice
  // screen are paper, so the water is heard from the dive in and fades when the menus return.
  useEffect(() => { audio.setWater(screen === 'playing' || screen === 'results'); }, [screen]);
  const orientationBlocked = small.rotate && screen === 'playing' && !paused && dialog === null;
  /**
   * Which device the one local seat joins on.
   *
   * There is exactly one of them either way — the keyboard has always joined once and only once, and
   * a screen has one pair of hands — so this is a *renaming* of that seat rather than a new kind of
   * player: `'touch'` reads the keyboard underneath it too (`controlsFor`), every key binding stays
   * live, and `typeof device === 'string'` still means "the local seat" everywhere it is asked.
   */
  const hand: PlayerSetup['device'] = small.touch ? 'touch' : 'keyboard';
  const handRef = useLatest(hand);
  /**
   * The most roster columns this window has room for. One number, read by the screen that draws the
   * grid, the cursor that walks it and the loader that guesses which portraits are next — the three
   * have to agree or the cursor lands on one tile while another lights up.
   */
  const cols = rosterCap(small.width, small.height, small.layout);
  const colsRef = useLatest(cols);
  /** Whether the choice screen is showing one card at a time (`carouselView`), as the screen reports it. */
  const carouselRef = useRef(false);
  const onView = useCallback((on: boolean) => { carouselRef.current = on; }, []);
  /**
   * The Size view's layout while it is on screen, as the screen drew it — null in the list. The
   * cursor walks these rectangles, so it goes where the eye does rather than down a list order the
   * picture does not show.
   */
  const depthRef = useRef<DepthLayout | null>(null);
  const onDepth = useCallback((layout: DepthLayout | null) => { depthRef.current = layout; }, []);
  /** The secondary pad, mirrored into state so the pad's label re-renders when a swipe lands. */
  const [secondary, setSecondary] = useState<Secondary>('aim');
  /**
   * Set for a moment after a swipe, so the pad can say what it has become and then go back to being
   * a pad. It clears itself on a timer rather than on the next frame: the swap is a thing the player
   * did on purpose and is worth acknowledging for long enough to read.
   */
  const [swapped, setSwapped] = useState(false);
  /** Counted rather than flagged, so a second swipe restarts the moment instead of being swallowed. */
  const [swapTick, setSwapTick] = useState(0);
  useEffect(() => {
    if (!swapTick) return;
    setSwapped(true);
    const t = setTimeout(() => setSwapped(false), 900);
    return () => clearTimeout(t);
  }, [swapTick]);
  /** When the player last touched anything. Drives the idle gate on the asset loader. */
  const lastInputRef = useRef(0);
  /**
   * The record as this device holds it: biomes, landmarks, species taken to the top, and the
   * furthest rung each creature has reached in Rise or Survival. Held in state as well as in storage because
   * the select screen badges the growth record and offers to start from it, and both have to
   * change the moment a match improves on them.
   */
  const [record, setRecordBoth, recordRef] = useStateRef<Codex>(loadCodex);
  const best = record.best;
  /**
   * Per player: whether they have asked to carry on from their record rather than hatch.
   *
   * Kept as the intent rather than as a rung, so that walking the cursor across a creature with no
   * record and back again does not quietly switch the choice off. It is resolved against the
   * record and the current mode at the moment a match starts.
   */
  const [carry, setCarryBoth, carryRef] = useStateRef<boolean[]>([]);
  /**
   * The buttons in the pick grid beside the creatures. Random is always there; Visitors only where
   * this device has taken something to the top in another game. Held in a ref as well as state
   * because the cursor maths runs from callbacks that must see the current grid, and the grid the
   * cursor walks has to be the grid that is drawn.
   */
  /**
   * Animals from outside this game's roster: the standing guests, which are always here once their
   * bodies have shipped, and whatever this device has taken to the top somewhere else. Between them
   * they are what the Visitors button holds, and the button appears only when there is one.
   */
  const visitors = useMemo(() => visitorsInBrowser(ACTIVE_ERA.id as EraId), []);
  useEffect(() => {
    if (!visitors.length) return;
    admitVisitors(visitors.map((v) => v.def));
    registerVisitorAssets(visitors.map((v) => ({ id: v.id, era: v.era })));
  }, [visitors]);
  const extras = useMemo<ExtraId[]>(() => (visitors.length ? ['random', 'visitors'] : ['random']), [visitors]);
  const extrasRef = useLatest<readonly ExtraId[]>(extras);
  const visitorsRef = useLatest<readonly Visitor[]>(visitors);
  /**
   * What this match has added to the record, so the results screen can mark it new.
   *
   * It has to be accumulated as it happens rather than worked out at the end. The record is
   * written live — that is the whole point of it, so leaving keeps what you found — which means
   * by the time the results screen loads the stored record, this match's finds are already in it
   * and there is nothing left to compare against.
   */
  const [fresh, setFreshBoth, freshRef] = useStateRef<Codex>(emptyCodex);
  const clearFresh = useCallback(() => { setFreshBoth(emptyCodex()); }, [setFreshBoth]);

  /**
   * Every change to the lineup goes through here, which is why the seats' colours are settled here
   * too: two players on the same animal have to be told apart, and the one place that knows the
   * whole lineup is the one place that can say which of them is the duplicate.
   */
  const updatePlayers = useCallback((p: PlayerSetup[]) => {
    setPlayersBoth(assignSeatSchemes(p, Math.random));
  }, [setPlayersBoth]);
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
    setRecordBoth(codex);
    setFreshBoth(mergeCodex(freshRef.current, added).codex);
    recordFinds(found);
  }, [recordRef, freshRef, setRecordBoth, setFreshBoth]);
  const setPausedBoth = useCallback((p: boolean) => { setPausedState(p); engineRef.current?.setPaused(p || dialogRef.current !== null); }, [setPausedState, dialogRef]);
  const openDialog = useCallback((d: DialogKind) => { setDialogBoth(d); engineRef.current?.setPaused(pausedRef.current || d !== null); if (d) audio.play('ui-confirm'); else audio.play('ui-back'); }, [setDialogBoth, pausedRef]);

  // Engine lifecycle.
  //
  // The engine, and three.js with it, is most of the game's script, and the title screen needs none
  // of it to be drawn. So it is fetched after the title painting is on screen rather than ahead of
  // it: the page used to stay blank until about 400 KB of compressed script had arrived. Anything
  // that talks to the engine re-runs once it exists (`engineReady`).
  const [engineReady, setEngineReady] = useState(false);
  useEffect(() => {
    let cancelled = false, engine: Engine | undefined;
    void titleShown().then(() => import('../render/engine')).then(({ Engine }) => {
      if (cancelled || !canvasRef.current) return;
      engine = makeEngine(new Engine(canvasRef.current, settings.quality, engineCallbacks()));
    });
    return () => { cancelled = true; engine?.dispose(); engineRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function engineCallbacks(): ConstructorParameters<typeof Engine>[2] {
    return {
      onHud: (s) => {
        hudStore.set(s);
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
      // A swipe on the secondary pad. Remembered, so the choice outlasts the match, and flagged for a
      // moment so the pad can show what it has become without making a UI sound in the HUD.
      onSecondary: (sec) => {
        setSecondary(sec);
        setSettings((x) => ({ ...x, secondary: sec }));
        setSwapTick((n) => n + 1);
      },
    };
  }
  function makeEngine(engine: Engine) {
    engineRef.current = engine;
    engine.setOrientationBlocked(false);
    // Visitors stream like anything else. Queued here rather than where they are registered,
    // because the queue builds its URLs from `assetPaths` and there is no queue to add them to
    // until the engine exists.
    for (const v of visitorsRef.current) engine.assets.addVisitor(v.id);
    engine.setLook(settings.lookSpeed, settings.invertY);
    setEngineReady(true);
    return engine;
  }

  useLayoutEffect(() => { engineRef.current?.setOrientationBlocked(orientationBlocked); }, [orientationBlocked, engineReady]);

  useEffect(() => {
    engineRef.current?.setQuality(settings.quality);
    engineRef.current?.setLook(settings.lookSpeed, settings.invertY);
    // Sizing is not mid-match: the running simulation is already built around the lengths it
    // started with. The shore is, because it is only ever a question of what stands on the beach
    // from the next step on, and a player who turns it on wants to see it now rather than next
    // match (see `setShoreAnimals` in src/sim/triassic/shore.ts).
    if (screenRef.current !== 'playing') setEquivalentSizing(settings.equivalentSizing);
    RULES.settings?.shoreAnimals?.(settings.shoreAnimals);
    audio.setVolume(settings.volume); audio.setMuted(settings.muted); audio.setMusic(settings.music);
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
  }, [settings, engineReady]);

  /**
   * Fullscreen tracking, and carrying it across a change of game.
   *
   * Every entry and exit is written down (`rememberFullscreen`), including the exit the browser
   * performs when this document is replaced by another game's — so the page the player lands on
   * knows they were in fullscreen and puts itself back on their first click or key there, which on
   * a title screen is the press that starts the game anyway. See src/shared/fullscreen.ts for why
   * it cannot simply be kept.
   */
  useEffect(() => {
    const on = () => { setIsFs(!!document.fullscreenElement); rememberFullscreen(!!document.fullscreenElement); };
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  useEffect(() => restoreFullscreenOnGesture(), []);
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

  // Arriving on the roster from the other game's picker.
  //
  // It used to open the seat the title screen would have — a keyboard player, on the era's default
  // animal — and that is wrong twice over. A seat is a *claim*: it belongs to whoever pressed
  // something to take it, and arriving at a screen is not pressing anything, so the roster would
  // show somebody playing before anybody had chosen. (The keyboard takes its seat when it is used
  // to choose: `setCreature` below opens one, as Enter and the pads always did.) And the audio it
  // said needed no help does: switching game is a page *load*, so the new document has had no
  // gesture of its own and its context starts suspended — the title screen's press start is what
  // normally wakes it, and a player who skipped past the title skipped that too. Arriving is not a
  // gesture either, so this cannot simply resume; what it can do is be ready the instant the first
  // click or key lands, which is what `wake` below is for. What was lost was the *ui-start* that
  // the press would have played, and the era's own beds and rotation starting with it.
  useEffect(() => {
    if (!deepLinkedToSelect()) return;
    audio.init(); audio.resume();
    try { history.replaceState(null, '', location.pathname + location.hash); } catch { /* a file:// page has no history to rewrite */ }
  }, []);

  // Any user gesture: wake audio (browsers require it)
  useEffect(() => {
    const wake = () => { audio.init(); audio.resume(); };
    window.addEventListener('pointerdown', wake); window.addEventListener('keydown', wake);
    return () => { window.removeEventListener('pointerdown', wake); window.removeEventListener('keydown', wake); };
  }, []);

  // ---- Screen transitions ----
  const startFromTitle = useCallback((device: PlayerSetup['device']) => {
    audio.init(); audio.resume(); audio.play('ui-start');
    updatePlayers([{ creature: ACTIVE_ERA.defaults.player, device, ready: false }]);
    go('select');
    // Be fullscreen on the way in; if the browser will not, say nothing. Starting from a pad is not
    // a gesture it counts, and a transient refusal is not worth a message either. Not a toggle: a
    // player who is already fullscreen — which, since the preference now rides across a change of
    // game, is the usual way to arrive — would otherwise be taken straight back out of it.
    enterFullscreen();
  }, [go, updatePlayers]);

  /**
   * The setups as the simulation wants them: the roster plus, for anyone who asked and has a record
   * to draw on, the rung to hatch at. Rise and Survival share the earned ladder record.
   */
  const withCarry = useCallback((ps: PlayerSetup[]) => ps.map((p, i) => {
    const mark = lineup.carriesRecord(modeRef.current) && carryRef.current[i] ? clampMark(recordRef.current.best[p.creature] ?? 0) : 0;
    return { ...p, startRung: mark > 0 ? mark : 0 };
  }), []);

  const startMatch = useCallback(() => {
    const ps = playersRef.current;
    if (!ps.length || !ps.every((p) => p.ready) || !engineRef.current) return;
    clearFresh();
    // Fixed for the length of the match, whatever the settings panel does while it runs.
    setEquivalentSizing(settingsRef.current.equivalentSizing);
    RULES.settings?.shoreAnimals?.(settingsRef.current.shoreAnimals);
    // The pad goes back where the player left it before the first frame, or the match opens holding
    // something they did not choose.
    engineRef.current.setSecondary(settingsRef.current.secondary);
    setSecondary(settingsRef.current.secondary);
    engineRef.current.startMatch(modeRef.current, withCarry(ps));
    setPausedBoth(false);
    go('playing');
  }, [clearFresh, go, loaded, setPausedBoth, withCarry]);

  const backToSelect = useCallback(() => {
    engineRef.current?.startAttract();
    updatePlayers(lineup.unready(playersRef.current));
    setPausedBoth(false);
    hudStore.set(null);
    go('select');
    audio.play('ui-back');
  }, [go, setPausedBoth, updatePlayers]);

  const backToTitle = useCallback(() => {
    engineRef.current?.startAttract();
    updatePlayers([]);
    setPausedBoth(false);
    hudStore.set(null);
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
    if (cursor !== before) { setMenuCursorBoth(cursor); audio.play('ui-move'); }
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
      : group === 'views' ? '.roster-tabs [role=tab]'
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
    setMenuCursorBoth({ sel: i, shown: true });
  }, [setMenuCursorBoth]);

  const playAgain = useCallback(() => {
    if (!engineRef.current) return;
    clearFresh();
    engineRef.current.startMatch(modeRef.current, withCarry(playersRef.current));
    setPausedBoth(false);
    go('playing');
  }, [clearFresh, go, setPausedBoth, withCarry]);

  // ---- The lineup ----
  // What each press does to the lineup is `lineup.ts` (pure, and `npm run lineup` holds it); these
  // wire it to the refs it reads, the sound it makes and the one choke point every lineup change
  // goes through (`updatePlayers`).
  /** Apply a lineup change: the new seats, and the sound the change makes. */
  const commitLineup = useCallback((change: lineup.LineupChange | null) => {
    if (!change) return false;
    updatePlayers(change.players); audio.play(change.sound);
    return true;
  }, [updatePlayers]);
  /** What the pick cursor walks right now: the roster, the grid's buttons, the column cap and the view on screen. */
  const pickGrid = useCallback((): lineup.PickGrid => ({
    ids: CREATURE_IDS, extras: extrasRef.current, cols: colsRef.current, depth: depthRef.current,
    carousel: carouselRef.current, visitors: visitorsRef.current,
  }), [extrasRef, colsRef, visitorsRef]);

  /**
   * Move the pick cursor around the roster grid (`lineup.moveCursor`).
   *
   * The grid is only rectangular when the roster divides by three. An era whose models arrive in
   * batches has a ragged last row — the Devonian's nine playable species make a 4-wide grid whose
   * bottom row holds one — and the old maths moved within a row modulo the *column count*, so on
   * that row every horizontal press landed back on the creature you were already on. The default
   * pick sat there, which made the first thing a Devonian player ever pressed do nothing.
   *
   * So left and right walk the grid itself and always move, wrapping at the ends; up and down move
   * by a row and land on the nearest column that is occupied. Both are what a grid of tiles is
   * expected to do, and neither can be a no-op.
   *
   * The grid also holds buttons now — Random, and Visitors where the player has earned one — so
   * this walks a *model* of the layout (src/app/roster-grid.ts) rather than indexing the roster.
   * A button has a position and no index in the creature list, and arithmetic over the roster
   * would put the cursor on one tile while another lit up. Locked players must unlock first (B).
   */
  const moveCursor = useCallback((index: number, dx: number, dy: number) => {
    commitLineup(lineup.moveCursor(playersRef.current, index, dx, dy, pickGrid()));
  }, [commitLineup, pickGrid]);
  const setCreature = useCallback((index: number, c: CreatureId) => {
    // Choosing an animal with nobody seated *is* the keyboard joining. A player who reached the
    // roster without pressing start (from the other game's picker) has no seat, and clicking a
    // creature is exactly the gesture that should open one — on the animal they clicked, rather
    // than on a default somebody has to correct.
    const change = lineup.setCreature(playersRef.current, index, c, handRef.current);
    if (change?.joined) { updatePlayers(change.players); audio.init(); audio.resume(); audio.play(change.sound); return; }
    commitLineup(change);
  }, [commitLineup, updatePlayers, handRef]);
  const toggleReady = useCallback((index: number) => {
    commitLineup(lineup.toggleReady(playersRef.current, index, ACTIVE_ERA.defaults.player));
  }, [commitLineup]);
  /**
   * Take whatever the cursor is on. On a creature that is locking in, which is what confirm has
   * always meant here; on one of the grid's buttons it is pressing the button.
   *
   * Random hands you a creature and leaves the cursor on it rather than locking in as well: it is
   * an answer to "I don't mind", not a commitment, and a player who dislikes the roll should be
   * able to press it again or walk away from it.
   */
  const activate = useCallback((index: number) => {
    const r = lineup.activate(playersRef.current, index, pickGrid(), Math.random);
    if (r === 'start') startMatch();
    else if (r === 'toggle') toggleReady(index);
    else commitLineup(r);
  }, [commitLineup, pickGrid, startMatch, toggleReady]);
  /** A pointer press on one of the grid's buttons: put that seat's cursor on it, then take it. */
  const pressExtra = useCallback((index: number, id: ExtraId) => {
    const ps = lineup.pointAtExtra(playersRef.current, index, id);
    if (!ps) return;
    playersRef.current = ps;
    updatePlayers(ps);
    activate(index);
  }, [activate, updatePlayers]);
  /**
   * Start as a hatchling, or carry on from the furthest this creature has been taken in Rise.
   *
   * Silently does nothing outside Rise, or for a creature with no record: there is nothing to
   * carry on from, and a control that appeared to do something and did not would be worse than one
   * that is plainly unavailable — so the card only offers it when it is real.
   */
  const toggleCarry = useCallback((index: number) => {
    const next = lineup.toggleCarry(playersRef.current, carryRef.current, index, modeRef.current, recordRef.current.best);
    if (!next) return;
    setCarryBoth(next); audio.play(next[index] ? 'ui-confirm' : 'ui-back');
  }, [setCarryBoth]);
  const removePlayer = useCallback((index: number) => {
    const r = lineup.removePlayer(playersRef.current, carryRef.current, index);
    if (r === 'empty') { backToTitle(); return; }
    // The choice is indexed by seat, so it has to shuffle down with the seats.
    setCarryBoth(r.carry);
    updatePlayers(r.players); audio.play('ui-back');
  }, [backToTitle, setCarryBoth, updatePlayers]);
  const addPlayer = useCallback((device: PlayerSetup['device']) => {
    commitLineup(lineup.addPlayer(playersRef.current, device, CREATURE_IDS));
  }, [commitLineup]);
  /** The local seat joins once and only once (`lineup.hasLocalSeat`). */
  const addKeyboard = useCallback(() => {
    if (lineup.hasLocalSeat(playersRef.current)) return;
    addPlayer(handRef.current);
  }, [addPlayer, handRef]);
  const changeMode = useCallback((m: Mode) => { setModeBoth(m); audio.play('ui-move'); updatePlayers(lineup.unready(playersRef.current)); }, [setModeBoth, updatePlayers]);

  /**
   * Hand the sticks to the next group along. The pad that does it owns the ring, so on a shared
   * choice screen the other players keep steering their own pick.
   */
  const cycleFocus = useCallback((dir: number, owner: number | 'keyboard') => {
    const ring = groupsFor(screenRef.current, pausedRef.current || screenRef.current === 'results', {
      link: !!ACTIVE_ERA.copy.trilogy, icons: toolbarRef.current !== 'hidden', views: groupEls('views').length > 0,
    });
    const all = stops(ring, { era: groupEls('era').length, modes: groupEls('modes').length, views: groupEls('views').length, icons: groupEls('icons').length });
    const f = focusRef.current;
    const from = f.owner === null || f.owner === owner ? f : { group: 'main' as FocusGroup, index: 0 };
    const to = cycle(all, from, dir);
    setFocusBoth({ ...to, owner: to.group === 'main' ? null : owner });
    // A mode chip is a tab: landing on it picks it, which is what the shoulders always did here.
    if (to.group === 'modes') { const m = MODES[to.index]; if (m && m !== modeRef.current) changeMode(m); }
    // So are the roster's List and Size tabs.
    if (to.group === 'views') groupEls('views')[to.index]?.click();
    audio.play('ui-move');
  }, [changeMode, groupEls, setFocusBoth]);


  // ---- Menu navigation: the pads, and the keyboard ----
  // Both run outside the render (a timer, a listener) and read the shell through refs; what they
  // may do is the `MenuWiring` below. The effects re-subscribe on exactly the callbacks they always
  // did (see the hooks).
  const menuWiring: MenuWiring = {
    screenRef, dialogRef, pausedRef, playersRef, focusRef, menuCursorRef, menuAtRef, lastInputRef, handRef, modeRef, modes: MODES,
    setPadIndices, openDialog, cycleFocus, moveFocus, runFocused, setFocusBoth, startFromTitle, addPlayer, addKeyboard, moveCursor,
    activate, toggleReady, removePlayer, startMatch, toggleCarry, menuInput, menuStep, setPausedBoth, backToTitle, changeMode,
  };
  usePadMenus(menuWiring);
  useMenuKeys(menuWiring);


  // Idle-time preloading: tell the loader what is most likely to be needed next.
  useEffect(() => {
    const e = engineRef.current; if (!e) return;
    if (screen === 'title') e.prioritize([...ACTIVE_ERA.defaults.title], 'title');
    else if (screen === 'select') {
      const n = CREATURE_IDS.length, cols = gridColumns(n, colsRef.current);
      const committed = players.filter((p) => p.ready).map((p) => p.creature);
      const hovered = players.filter((p) => !p.ready).map((p) => p.creature);
      const neighbours = players.flatMap((p) => { const i = CREATURE_IDS.indexOf(p.creature); return [i + 1, i - 1, i + cols, i - cols].filter((j) => j >= 0 && j < n).map((j) => CREATURE_IDS[j]); });
      e.prioritize([...new Set([...committed, ...hovered, ...neighbours])], 'select', committed, hovered);
    } else e.prioritize([...new Set(players.map((p) => p.creature))], 'playing');
  }, [screen, players, loaded, engineReady]);

  const allReady = players.length > 0 && players.every((p) => p.ready);
  // Menus are shared, so they speak whichever device is in the room. A pad the browser has not
  // seen a button from yet does not count — it cannot, the Gamepad API hides it until then — which
  // is why the title screen keeps its own copy about connecting one.
  const scheme = menuScheme(padCount, small.touch);
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
      if (hud.canContinue) items.push({ label: TEXT.results.continue, run: keepPlaying, primary: true });
      items.push({ label: TEXT.results.playAgain, run: playAgain, primary: !hud.canContinue });
      // Quitting the match lands on the choice screen, which is where you go to play again with
      // something else and where the way back to the title already is. A second button that left
      // the game altogether sat one careless press from the end of a session.
      items.push({ label: TEXT.results.quit, run: backToSelect });
      return items;
    }
    if (screen === 'playing' && paused) {
      const items: MenuItem[] = [{ label: TEXT.pause.resume, run: () => setPausedBoth(false), primary: true }];
      if (small.touch) {
        items.push({ label: TEXT.hud.pads.travel, run: () => {
          if (engineRef.current?.openTouchTravel()) setPausedBoth(false);
        } });
        items.push({ label: TEXT.hud.pads.scores, run: () => setPauseScores((open) => !open) });
      }
      // The match recorder, and only when the URL asked for it (`?debug=game`). One button walking
      // through its own three states, because that is the whole of the tool: record, stop, hand it
      // over. Recording carries on while the menu is open — pausing to think is not a reason to
      // lose the frames — and resuming is what gets you back to the action being recorded.
      if (debugGame()) {
        if (recPhase === 'idle') items.push({ label: TEXT.pause.startRecording, run: () => { startRecording(); setRecPhase('recording'); setPausedBoth(false); } });
        else if (recPhase === 'recording') items.push({ label: TEXT.pause.endRecording, run: () => { stopRecording(); setRecPhase('ready'); } });
        else items.push(
          { label: TEXT.pause.exportRecording, run: () => { exportRecording(); } },
          { label: TEXT.pause.discardRecording, run: () => { resetRecording(); setRecPhase('idle'); } },
        );
      }
      items.push({ label: TEXT.pause.quit, run: backToSelect });
      return items;
    }
    return [];
  }, [screen, paused, small.touch, recPhase, hud.canContinue, keepPlaying, playAgain, backToSelect]);
  useEffect(() => { if (!paused) setPauseScores(false); }, [paused]);
  const menuItemsRef = useLatest(menuItems);
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
   * How far the boot has got, and what it is doing. The fraction is scaled because the assets the
   * loader counts go on arriving long after the game is playable: what the player is waiting for
   * is the first quarter of them.
   */
  const bootFraction = progress ? Math.min(1, progress.fraction * 4) : 0;
  const bootStatus = useMemo(() => {
    // The line above the bar already says the sea is waking, so this says who and how far.
    const name = progress?.current ? creature(progress.current as never)?.name : undefined;
    return `${name ? `${name} · ` : ''}${Math.round(bootFraction * 100)}%`;
  }, [progress, bootFraction]);

  // One object for as long as the seat is a touch seat, so the HUD's props do not change every render.
  const touchTravel = useMemo<TouchTravelActions | undefined>(() => small.touch ? {
    dismiss: () => engineRef.current?.closeTouchTravel(),
    select: (index) => engineRef.current?.touchTravelSelect(index),
    swapStep: (dir) => engineRef.current?.touchSwapStep(dir),
    swapToggle: () => engineRef.current?.touchSwapToggle(),
    swapBack: () => engineRef.current?.touchSwapBack(),
    swapConfirm: () => engineRef.current?.touchSwapConfirm(),
  } : undefined, [small.touch]);

  /**
   * The icon buttons sit in somebody's viewport, so they answer to whether that somebody asked for
   * a bare sea. Only in play, and only while there is a HUD to read the split from.
   */
  const toolbar = useMemo(() => {
    if (screen !== 'playing' || !hud.present) return 'right' as const;
    // A menu is already drawn over the water, so the buttons may as well be there with it.
    const anyMenu = paused || dialog !== null || hud.playerMenu;
    return toolbarPlace(hud.views, anyMenu);
  }, [screen, hud, paused, dialog]);

  useEffect(() => { toolbarRef.current = toolbar; }, [toolbar]);
  // A screen change puts the sticks back on that screen's own business: a ring pointing at a group
  // the new screen does not have would swallow every press.
  useEffect(() => { setFocusBoth(atMain()); }, [screen, paused, setFocusBoth]);

  const menuOpen = screen === 'results' || (screen === 'playing' && paused);
  useEffect(() => {
    if (!menuOpen) return;
    // The pause menu was asked for, so its cursor is awake at once; the results screen was not.
    setMenuCursorBoth(freshCursor(screen !== 'results'));
    menuAtRef.current = performance.now();
  }, [menuOpen, screen]);

  return (
    <main className={`shell screen-${screen} layout-${small.layout} ${small.touch ? 'is-touch' : ''}`}>
      {/* Named for whichever game this is, not for the one it was written in. */}
      <div className="sea-canvas" ref={canvasRef} aria-label={ACTIVE_ERA.title} />
      <div className="vignette" />

      {/*
        * The boot screen is for a boot the player is not already looking at a screen for: deep
        * linked to the roster, say. On the title it would be the title's own painting a second
        * time over the title itself, so the title carries the bar instead.
        */}
      {!loaded && bootSlow && screen !== 'title' && <LoadingScreen progress={progress} fraction={bootFraction} />}
      {/*
        * The title screen is drawn from the first frame, before the creatures have streamed in. It
        * used to wait for `loaded`, and until then the only thing on the page was the sea the
        * engine had already started drawing — so arriving from a link showed the game's water for
        * a moment and then cut to the title, which read as landing in the wrong place. It has
        * always known how to draw itself unloaded (the era's loading line in place of PRESS
        * START), and a key or a pad button has always been able to start from it either way, so
        * the wait bought nothing. The boot screen still stacks over it when a load is slow.
        */}
      {screen === 'title' && (
        <TitleScreen
          loaded={loaded} onStart={() => startFromTitle(handRef.current)} padCount={padCount} eraFocused={focus.group === 'era'}
          progress={bootSlow ? bootFraction : null} status={bootSlow ? bootStatus : undefined}
        />
      )}

      {screen === 'select' && (
        <SelectScreen
          players={players} mode={mode} modes={MODES} modeInfo={modeInfo} allReady={allReady} padIndices={padIndices}
          scheme={scheme}
          best={best} carry={carry} modeFocus={focus.group === 'modes' ? focus.index : -1} viewFocus={focus.group === 'views' ? focus.index : -1}
          rosterView={settings.rosterView} onRosterView={(v) => setSettings((x) => ({ ...x, rosterView: v }))} onDepth={onDepth}
          extras={extras} onExtra={pressExtra} maxCols={cols}
          layout={small.layout} onStep={(i, dir) => moveCursor(i, dir, 0)} onView={onView}
          visitorCount={visitors.length} visitorOrigin={(id) => visitors.find((v) => v.id === id)?.origin}
          onPick={setCreature} onReady={toggleReady} onRemove={removePlayer}
          onMode={changeMode} onStart={startMatch} onBack={backToTitle} onCarry={toggleCarry}
        />
      )}

      {(screen === 'playing' || screen === 'results') && hud.present && <LiveHud touchTravel={touchTravel} />}
      {/*
        * The pads are drawn only while the game is actually being played: paused, on the results
        * screen or in a dialog the fingers belong to the buttons, which is the same rule the mouse
        * follows (`syncPointer`). They are also the one thing on screen that must not be drawn for a
        * player who is not using them, so `small.touch` gates them rather than the window size —
        * a narrow desktop window gets the compact layout and no pads at all.
        */}
      {screen === 'playing' && !paused && !dialog && small.touch && (
        <TouchPads
          secondary={secondary}
          // The nudge is worth one or two matches and then it is in the way. It also stands down the
          // moment the player swipes, because at that point they have plainly found it.
          swapped={swapped}
          teleportOpen={hud.teleportOpen}
          onPause={() => { setPausedBoth(true); }}
        />
      )}
      {screen === 'playing' && paused && <PauseMenu items={menuItems} sel={menuCursor.sel} shown={menuCursor.shown} onHover={menuHover} board={small.touch && pauseScores ? engineRef.current?.pauseScoreboard() : undefined} />}
      {screen === 'results' && hud.present && <LiveResults players={players} record={record} fresh={fresh} items={menuItems} sel={menuCursor.sel} shown={menuCursor.shown} onHover={menuHover} />}

      {(!small.touch || screen !== 'playing' || paused) && <Toolbar place={toolbar} isFs={isFs} muted={settings.muted} focus={focus.group === 'icons' ? focus.index : -1} onHelp={() => openDialog(dialog === 'help' ? null : 'help')} onSettings={() => openDialog(dialog === 'settings' ? null : 'settings')} onMute={() => setSettings((s) => ({ ...s, muted: !s.muted }))} onFullscreen={toggleFullscreen} />}
      <Dialogs kind={dialog} onClose={() => openDialog(null)} settings={settings} onSettings={setSettings} scheme={scheme} />

      {(notice || error) && (
        <div className={`notice ${error ? 'notice-error' : ''}`} role="status">
          <span>{error || notice}</span>
          <button aria-label={TEXT.common.dismiss} onClick={() => { setNotice(''); setError(''); }}>×</button>
        </div>
      )}
      {orientationBlocked && <RotateHint onPause={() => { setPausedBoth(true); }} />}
    </main>
  );
}

/** Mode copy comes from the era pack; modes the era does not offer keep a bare entry so lookups never miss. */
export const MODE_INFO: Record<Mode, { name: string; blurb: string; players: string }> = Object.fromEntries(
  MODE_IDS.map((m) => [m, ACTIVE_ERA.modes.find((x) => x.id === m) ?? { name: m, blurb: '', players: '' }]),
) as Record<Mode, { name: string; blurb: string; players: string }>;

export { creature };

/** The HUD, reading every snapshot from the store itself so the shell around it need not (`hud-store.ts`). */
function LiveHud({ touchTravel }: { touchTravel?: TouchTravelActions }) {
  const snapshot = useHud();
  return snapshot ? <Hud snapshot={snapshot} touchTravel={touchTravel} /> : null;
}

/** The results panel, on the same terms as `LiveHud`. */
function LiveResults(props: Omit<Parameters<typeof Results>[0], 'snapshot'>) {
  const snapshot = useHud();
  return snapshot ? <Results snapshot={snapshot as HudSnapshot} {...props} /> : null;
}

/**
 * Resolves once the title painting is on screen — or at once, where there is none to wait for (a
 * deep link to the roster) — so the engine is not fetched ahead of the picture the player is waiting
 * to see. Bounded, so a painting that never arrives cannot hold the game back.
 */
function titleShown(): Promise<void> {
  return new Promise((resolve) => {
    const done = () => { clearTimeout(timer); resolve(); };
    const timer = setTimeout(done, 1500);
    requestAnimationFrame(() => {
      const img = document.querySelector<HTMLImageElement>('.title-illustration');
      if (!img || img.complete) done();
      else { img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); }
    });
  });
}
