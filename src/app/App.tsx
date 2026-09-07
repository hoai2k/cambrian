import { ACTIVE_ERA } from '../content';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { audio } from '../audio/audio';
import { gamepads, readGamepad, type RawControls } from '../input/input';
import type { AssetProgress } from '../render/assets';
import { Engine, type HudSnapshot } from '../render/engine';
import type { Quality } from '../render/sea';
import { CREATURE_IDS, CREATURES, creature, type CreatureId } from '../sim/creatures';
import { MODE_IDS, type Mode, type PlayerSetup } from '../sim/types';
import { Hud } from './Hud';
import { LoadingScreen } from './Loading';
import { Dialogs, PauseMenu, Results } from './Overlays';
import { gridColumns, SelectScreen } from './Select';
import { TitleScreen } from './Title';
import { Toolbar } from './Toolbar';

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

  const updatePlayers = useCallback((p: PlayerSetup[]) => { playersRef.current = p; setPlayers(p); }, []);
  const go = useCallback((s: Screen) => { screenRef.current = s; setScreen(s); }, []);
  const setPausedBoth = useCallback((p: boolean) => { pausedRef.current = p; setPaused(p); engineRef.current?.setPaused(p || dialogRef.current !== null); }, []);
  const openDialog = useCallback((d: DialogKind) => { dialogRef.current = d; setDialog(d); engineRef.current?.setPaused(pausedRef.current || d !== null); if (d) audio.play('ui-confirm'); else audio.play('ui-back'); }, []);

  // Engine lifecycle
  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new Engine(canvasRef.current, settings.quality, {
      onHud: (s) => { setHud(s); if (s.status !== 'playing' && screenRef.current === 'playing') { go('results'); audio.play(s.status === 'won' ? 'won' : 'death'); } },
      onMenu: () => { if (screenRef.current === 'playing') { setPausedBoth(!pausedRef.current); audio.play('ui-confirm'); } },
      onError: (m) => setError(m),
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
    } catch { setNotice('Fullscreen needs a click or key press. Use the corner button.'); }
  }, []);

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
    if (viaGesture) void toggleFullscreen();
    else if (!document.fullscreenElement) void document.documentElement.requestFullscreen().catch(() => setNotice('Press the fullscreen button in the corner (browsers only allow it from a click or key).'));
  }, [go, toggleFullscreen, updatePlayers]);

  const startMatch = useCallback(() => {
    const ps = playersRef.current;
    if (!ps.length || !ps.every((p) => p.ready) || !engineRef.current) return;
    if (modeRef.current === 'foodchain') {
      // Food Chain needs one animal per rung: the hunter must have prey and the prey a hunter.
      const rungs = ps.map((p) => creature(p.creature).rung ?? 0);
      if (new Set(rungs).size !== rungs.length) { setNotice('Food Chain: everyone picks from a different rung of the chain.'); audio.play('ui-back'); return; }
    }
    engineRef.current.startMatch(modeRef.current, ps);
    setPausedBoth(false);
    go('playing');
  }, [go, loaded, setPausedBoth]);

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

  const playAgain = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.startMatch(modeRef.current, playersRef.current);
    setPausedBoth(false);
    go('playing');
  }, [go, setPausedBoth]);

  /** Move a player's cursor on the roster grid. Locked players must unlock first (B). */
  const moveCursor = useCallback((index: number, dx: number, dy: number) => {
    const ps = [...playersRef.current];
    const p = ps[index]; if (!p || p.ready) return;
    const n = CREATURES.length, cols = gridColumns(n);
    const i = CREATURE_IDS.indexOf(p.creature);
    let r = Math.floor(i / cols), c = i % cols;
    const rows = Math.ceil(n / cols);
    c = (c + dx + cols) % cols; r = (r + dy + rows) % rows;
    let j = r * cols + c;
    if (j >= n) j = dy !== 0 ? (dy > 0 ? c : (rows - 2) * cols + c) : n - 1;
    if (j >= n || j < 0) j = i;
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
  const removePlayer = useCallback((index: number) => {
    const ps = playersRef.current.filter((_, i) => i !== index);
    if (!ps.length) { backToTitle(); return; }
    updatePlayers(ps); audio.play('ui-back');
  }, [backToTitle, updatePlayers]);
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
    let raf = 0;
    const prev = new Map<number, RawControls>();
    const repeat = new Map<number, number>();
    const loop = () => {
      raf = requestAnimationFrame(loop);
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
          if (just('ability')) backToTitle();
        } else if (s === 'results') {
          if (just('confirm')) playAgain();
          if (just('heavy')) backToSelect();
          if (just('back')) backToTitle();
        }
        prev.set(gp.index, c);
      }
      // Forget pads that have gone, so a reconnect starts from a clean edge rather than
      // inheriting the buttons that were held when it vanished.
      for (const index of prev.keys()) if (!live.includes(index)) { prev.delete(index); repeat.delete(index); }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // padIndices is deliberately not a dependency: it is written from inside this loop, and
    // listing it would tear the loop down and rebuild it every time a pad connects, losing the
    // button edges held in `prev`.
  }, [addPlayer, backToSelect, backToTitle, changeMode, moveCursor, openDialog, playAgain, removePlayer, setPausedBoth, startFromTitle, startMatch, toggleReady]);

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
        } else if (e.code === 'Enter' || e.code === 'Space') addKeyboard();
        if (e.code === 'KeyQ') changeMode(MODES[(MODES.indexOf(modeRef.current) + MODES.length - 1) % MODES.length]);
        if (e.code === 'KeyE') changeMode(MODES[(MODES.indexOf(modeRef.current) + 1) % MODES.length]);
        return;
      }
      if (s === 'playing') {
        if (e.code === 'Escape') { setPausedBoth(!pausedRef.current); audio.play('ui-confirm'); }
        if (pausedRef.current && e.code === 'Enter') setPausedBoth(false);
        return;
      }
      if (s === 'results') {
        if (e.code === 'Enter') playAgain();
        if (e.code === 'Escape') backToSelect();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [addKeyboard, backToSelect, backToTitle, changeMode, moveCursor, openDialog, playAgain, setPausedBoth, startFromTitle, startMatch, toggleReady]);

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
          onPick={setCreature} onReady={toggleReady} onRemove={removePlayer} onAddKeyboard={addKeyboard}
          onMode={changeMode} onStart={startMatch} onBack={backToTitle}
        />
      )}

      {(screen === 'playing' || screen === 'results') && hud && <Hud snapshot={hud} />}
      {screen === 'playing' && paused && <PauseMenu onResume={() => setPausedBoth(false)} onChange={backToSelect} onQuit={backToTitle} />}
      {screen === 'results' && hud && <Results snapshot={hud} players={players} onAgain={playAgain} onChange={backToSelect} onTitle={backToTitle} />}

      <Toolbar isFs={isFs} onHelp={() => openDialog(dialog === 'help' ? null : 'help')} onSettings={() => openDialog(dialog === 'settings' ? null : 'settings')} onFullscreen={toggleFullscreen} />
      <Dialogs kind={dialog} onClose={() => openDialog(null)} settings={settings} onSettings={setSettings} />

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
