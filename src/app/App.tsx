import { ACTIVE_ERA } from '../content';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { audio } from '../audio/audio';
import { gamepads, readGamepad, type RawControls } from '../input/input';
import type { AssetProgress } from '../render/assets';
import { Engine, type HudSnapshot } from '../render/engine';
import type { Quality } from '../render/sea';
import { PLAYABLE_IDS as CREATURE_IDS, PLAYABLE as CREATURES, creature, type CreatureId } from '../sim/creatures';
import { MODE_IDS, type Mode, type PlayerSetup } from '../sim/types';
import { clampMark } from '../sim/ladder';
import { loadCodex, recordBest } from './codex';
import { Hud } from './Hud';
import { LoadingScreen } from './Loading';
import { Dialogs, PauseMenu, Results } from './Overlays';
import { gridColumns, SelectScreen } from './Select';
import { TitleScreen } from './Title';
import { Toolbar } from './Toolbar';
import { menuScheme } from '../shared/controls';

export type Screen = 'title' | 'select' | 'playing' | 'results';
export type DialogKind = null | 'help' | 'settings';
export interface Settings { quality: Quality; lookSpeed: number; invertY: boolean; volume: number; muted: boolean; music: boolean; }

/** The active era's modes, in its order; the first is the default selection. */
const MODES: Mode[] = ACTIVE_ERA.modes.map((m) => m.id);
const SETTINGS_KEY = ACTIVE_ERA.copy.settingsKey;
const defaultSettings = (): Settings => {
  try { const s = localStorage.getItem(SETTINGS_KEY); if (s) return { ...{ quality: 'high', lookSpeed: 1, invertY: false, volume: 0.8, muted: false, music: true }, ...JSON.parse(s) }; } catch { /* ignore */ }
  return { quality: 'high', lookSpeed: 1, invertY: false, volume: 0.8, muted: false, music: true };
};

export function App() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [screen, setScreen] = useState<Screen>('title');
  const screenRef = useRef<Screen>('title');
  const [players, setPlayers] = useState<PlayerSetup[]>([]);
  const playersRef = useRef<PlayerSetup[]>([]);
  const [mode, setMode] = useState<Mode>(MODES[0]);
  const modeRef = useRef<Mode>(MODES[0]);
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const dialogRef = useRef<DialogKind>(null);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
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
   * The furthest rung of the growth ladder each creature has reached in Rise on this device, kept
   * per era. Held in state as well as in storage because the select screen badges it and offers to
   * start there, and both have to change the moment a match improves on it.
   */
  const [best, setBest] = useState<Partial<Record<CreatureId, number>>>(() => loadCodex().best);
  const bestRef = useRef(best);
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
   * Which creatures this match has beaten the record for, so the results screen can say so.
   *
   * It has to be tracked as it happens rather than worked out at the end. The record is written
   * live — that is the whole point of it, so quitting to the title keeps what you grew — which
   * means by the time the results screen loads the stored record, this match's marks are already
   * in it and there is nothing left to compare against.
   */
  const [beaten, setBeaten] = useState<CreatureId[]>([]);
  const beatenRef = useRef<CreatureId[]>([]);
  const clearBeaten = useCallback(() => { beatenRef.current = []; setBeaten([]); }, []);
  const setCarryBoth = useCallback((c: boolean[]) => { carryRef.current = c; setCarry(c); }, []);

  const updatePlayers = useCallback((p: PlayerSetup[]) => { playersRef.current = p; setPlayers(p); }, []);
  /**
   * Fold a match's Rise high-water marks into the record as they happen.
   *
   * The HUD snapshot arrives every frame, so this compares against what we already hold and does
   * nothing — no parse, no write, no re-render — until a mark actually moves. Recording live
   * rather than at the results screen is deliberate: growing a creature two stages and then
   * quitting to the title still grew it two stages, and that should be in the record.
   */
  const keepBest = useCallback((found: Partial<Record<CreatureId, number>>) => {
    let moved = false;
    for (const [k, n] of Object.entries(found) as [CreatureId, number][]) if (n > (bestRef.current[k] ?? -1)) { moved = true; break; }
    if (!moved) return;
    const next = { ...bestRef.current };
    const beat: CreatureId[] = [];
    for (const [k, n] of Object.entries(found) as [CreatureId, number][]) if (n > (next[k] ?? -1)) { next[k] = n; beat.push(k); }
    bestRef.current = next; setBest(next);
    const marks = beat.filter((k) => !beatenRef.current.includes(k));
    if (marks.length) { beatenRef.current = [...beatenRef.current, ...marks]; setBeaten(beatenRef.current); }
    recordBest(found);
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
        keepBest(s.discovery.best);
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

  // Any user gesture: wake audio (browsers require it)  // Any user gesture: wake audio (browsers require it)
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
    const mark = modeRef.current === 'rise' && carryRef.current[i] ? clampMark(bestRef.current[p.creature] ?? 0) : 0;
    return { ...p, startRung: mark > 0 ? mark : 0 };
  }), []);

  const startMatch = useCallback(() => {
    const ps = playersRef.current;
    if (!ps.length || !ps.every((p) => p.ready) || !engineRef.current) return;
    clearBeaten();
    engineRef.current.startMatch(modeRef.current, withCarry(ps));
    setPausedBoth(false);
    go('playing');
  }, [clearBeaten, go, loaded, setPausedBoth, withCarry]);

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

  const playAgain = useCallback(() => {
    if (!engineRef.current) return;
    clearBeaten();
    engineRef.current.startMatch(modeRef.current, withCarry(playersRef.current));
    setPausedBoth(false);
    go('playing');
  }, [clearBeaten, go, setPausedBoth, withCarry]);

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
    if (!p || modeRef.current !== 'rise' || !(bestRef.current[p.creature] ?? 0)) return;
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
  const addKeyboard = useCallback(() => {
    const used = playersRef.current.map((p) => p.device);
    addPlayer(used.includes('keyboard') ? 'keyboard2' : 'keyboard');
  }, [addPlayer]);
  const changeMode = useCallback((m: Mode) => { modeRef.current = m; setMode(m); audio.play('ui-move'); updatePlayers(playersRef.current.map((p) => ({ ...p, ready: false }))); }, [updatePlayers]);

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
          if (c.any && !(p?.any)) startFromTitle(gp.index, false);
        } else if (s === 'select') {
          const ps = playersRef.current;
          const idx = ps.findIndex((x) => x.device === gp.index);
          // Any button joins, not just A. The title says PRESS START, so Start has to work here
          // too, and a pad that reports a non-standard mapping still gets its player in.
          if (idx < 0) { if (just('anyButton')) addPlayer(gp.index); }
          else {
            const stickX = Math.abs(c.mx) > 0.6 ? Math.sign(c.mx) : 0, stickY = Math.abs(c.my) > 0.6 ? -Math.sign(c.my) : 0;
            const dx = just('dright') ? 1 : just('dleft') ? -1 : 0, dy = just('ddown') ? 1 : just('dup') ? -1 : 0;
            const lastRep = repeat.get(gp.index) ?? 0;
            if (dx || dy) { moveCursor(idx, dx, dy); repeat.set(gp.index, now); }
            else if ((stickX || stickY) && now - lastRep > 240) { moveCursor(idx, stickX, stickY); repeat.set(gp.index, now); }
            if (just('confirm')) { if (ps[idx].ready) startMatch(); else toggleReady(idx); }
            if (just('back')) { if (ps[idx].ready) toggleReady(idx); else removePlayer(idx); }
            if (just('menu')) startMatch();
            // Y: hatch, or carry on from your record. Bound to `light` rather than to `ability`,
            // which is D-pad right in play and so would fire on every rightward cursor move here.
            if (just('light')) toggleCarry(idx);
            // LB and RB cycle the mode. Bind to the raw shoulder buttons, never to a gameplay
            // control: this used to read `burst`, which is button 0 — the same button as confirm —
            // so every A press locked the player in and then changed mode, and changeMode
            // un-readies everyone, which meant nobody could ever lock in or start a match.
            if (just('lb')) changeMode(MODES[(MODES.indexOf(modeRef.current) + MODES.length - 1) % MODES.length]);
            if (just('rb')) changeMode(MODES[(MODES.indexOf(modeRef.current) + 1) % MODES.length]);
          }
        } else if (s === 'playing' && pausedRef.current) {
          if (just('confirm')) setPausedBoth(false);
          if (just('heavy')) backToSelect();
          if (just('light')) backToTitle();
        } else if (s === 'results') {
          if (just('confirm')) playAgain();
          if (just('light')) keepPlaying();
          if (just('heavy')) backToSelect();
          if (just('back')) backToTitle();
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
  }, [addPlayer, backToSelect, backToTitle, changeMode, keepPlaying, moveCursor, openDialog, playAgain, removePlayer, setPausedBoth, startFromTitle, startMatch, toggleCarry, toggleReady]);

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
      if (s === 'results') {
        if (e.code === 'Enter') playAgain();
        if (e.code === 'Space') keepPlaying();
        if (e.code === 'Escape') backToSelect();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [addKeyboard, backToSelect, backToTitle, changeMode, keepPlaying, moveCursor, openDialog, playAgain, setPausedBoth, startFromTitle, startMatch, toggleCarry, toggleReady]);

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

  return (
    <main className={`shell screen-${screen}`}>
      <div className="sea-canvas" ref={canvasRef} aria-label="Cambrian sea" />
      <div className="vignette" />

      {!loaded && <LoadingScreen progress={progress} fraction={progress ? Math.min(1, progress.fraction * 4) : 0} />}
      {screen === 'title' && loaded && <TitleScreen loaded={loaded} onStart={() => startFromTitle('keyboard', true)} padCount={padCount} />}

      {screen === 'select' && (
        <SelectScreen
          players={players} mode={mode} modes={MODES} modeInfo={modeInfo} allReady={allReady} padIndices={padIndices}
          scheme={scheme}
          best={best} carry={carry}
          onPick={setCreature} onReady={toggleReady} onRemove={removePlayer} onAddKeyboard={addKeyboard}
          onMode={changeMode} onStart={startMatch} onBack={backToTitle} onCarry={toggleCarry}
        />
      )}

      {(screen === 'playing' || screen === 'results') && hud && <Hud snapshot={hud} />}
      {screen === 'playing' && paused && <PauseMenu scheme={scheme} onResume={() => setPausedBoth(false)} onChange={backToSelect} onQuit={backToTitle} />}
      {screen === 'results' && hud && <Results snapshot={hud} players={players} beaten={beaten} scheme={scheme} onAgain={playAgain} onContinue={keepPlaying} onChange={backToSelect} onTitle={backToTitle} />}

      <Toolbar isFs={isFs} muted={settings.muted} onHelp={() => openDialog(dialog === 'help' ? null : 'help')} onSettings={() => openDialog(dialog === 'settings' ? null : 'settings')} onMute={() => setSettings((s) => ({ ...s, muted: !s.muted }))} onFullscreen={toggleFullscreen} />
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
