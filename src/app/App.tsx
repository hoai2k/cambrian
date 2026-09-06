import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { audio } from '../audio/audio';
import { gamepads, readGamepad, type RawControls } from '../input/input';
import type { AssetProgress } from '../render/assets';
import { Engine, type HudSnapshot } from '../render/engine';
import type { Quality } from '../render/sea';
import { CREATURE_IDS, creature, type CreatureId } from '../sim/creatures';
import type { Mode, PlayerSetup } from '../sim/types';
import { Hud } from './Hud';
import { LoadingScreen } from './Loading';
import { Dialogs, PauseMenu, Results } from './Overlays';
import { SelectScreen } from './Select';
import { TitleScreen } from './Title';
import { Toolbar } from './Toolbar';

export type Screen = 'title' | 'select' | 'playing' | 'results';
export type DialogKind = null | 'help' | 'settings';
export interface Settings { quality: Quality; lookSpeed: number; invertY: boolean; volume: number; muted: boolean; music: boolean; }

const MODES: Mode[] = ['rise', 'frenzy', 'hunted', 'reef'];
const defaultSettings = (): Settings => {
  try { const s = localStorage.getItem('cambrian-settings'); if (s) return { ...{ quality: 'high', lookSpeed: 1, invertY: false, volume: 0.8, muted: false, music: true }, ...JSON.parse(s) }; } catch { /* ignore */ }
  return { quality: 'high', lookSpeed: 1, invertY: false, volume: 0.8, muted: false, music: true };
};

export function App() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [screen, setScreen] = useState<Screen>('title');
  const screenRef = useRef<Screen>('title');
  const [players, setPlayers] = useState<PlayerSetup[]>([]);
  const playersRef = useRef<PlayerSetup[]>([]);
  const [mode, setMode] = useState<Mode>('rise');
  const modeRef = useRef<Mode>('rise');
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
  const [padCount, setPadCount] = useState(0);

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
    try { localStorage.setItem('cambrian-settings', JSON.stringify(settings)); } catch { /* ignore */ }
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
    updatePlayers([{ creature: 'anomalocaris', device, ready: false }]);
    go('select');
    if (viaGesture) void toggleFullscreen();
    else if (!document.fullscreenElement) void document.documentElement.requestFullscreen().catch(() => setNotice('Press the fullscreen button in the corner (browsers only allow it from a click or key).'));
  }, [go, toggleFullscreen, updatePlayers]);

  const startMatch = useCallback(() => {
    const ps = playersRef.current;
    if (!ps.length || !ps.every((p) => p.ready) || !engineRef.current || !loaded) return;
    if (!ps.every((p) => engineRef.current!.assets.isReady(p.creature))) return;
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

  const cycleCreature = useCallback((index: number, dir: number) => {
    const ps = [...playersRef.current];
    const p = ps[index]; if (!p) return;
    const i = CREATURE_IDS.indexOf(p.creature);
    ps[index] = { ...p, creature: CREATURE_IDS[(i + dir + CREATURE_IDS.length) % CREATURE_IDS.length], ready: false };
    updatePlayers(ps); audio.play('ui-move');
  }, [updatePlayers]);
  const setCreature = useCallback((index: number, c: CreatureId) => {
    const ps = [...playersRef.current]; if (!ps[index]) return;
    ps[index] = { ...ps[index], creature: c, ready: false }; updatePlayers(ps); audio.play('ui-move');
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
      if (pads.length !== padCount) setPadCount(pads.length);
      const s = screenRef.current;
      for (const gp of pads) {
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
          if (idx < 0) { if (just('confirm')) addPlayer(gp.index); }
          else {
            const stickX = Math.abs(c.mx) > 0.6 ? Math.sign(c.mx) : 0;
            const dir = just('dright') ? 1 : just('dleft') ? -1 : 0;
            const lastRep = repeat.get(gp.index) ?? 0;
            if (dir) { cycleCreature(idx, dir); repeat.set(gp.index, now); }
            else if (stickX && now - lastRep > 260) { cycleCreature(idx, stickX); repeat.set(gp.index, now); }
            if (just('confirm')) { if (ps[idx].ready) startMatch(); else toggleReady(idx); }
            if (just('back')) { if (ps[idx].ready) toggleReady(idx); else removePlayer(idx); }
            if (just('menu')) startMatch();
            if (just('lock')) changeMode(MODES[(MODES.indexOf(modeRef.current) + MODES.length - 1) % MODES.length]);
            if (just('burst') && c.burst > 0.5) changeMode(MODES[(MODES.indexOf(modeRef.current) + 1) % MODES.length]);
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
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [addPlayer, backToSelect, backToTitle, changeMode, cycleCreature, openDialog, padCount, playAgain, removePlayer, setPausedBoth, startFromTitle, startMatch, toggleReady]);

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
          if (e.code === 'ArrowRight' || e.code === 'KeyD') cycleCreature(idx, 1);
          if (e.code === 'ArrowLeft' || e.code === 'KeyA') cycleCreature(idx, -1);
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
  }, [addKeyboard, backToSelect, backToTitle, changeMode, cycleCreature, openDialog, playAgain, setPausedBoth, startFromTitle, startMatch, toggleReady]);

  // Idle-time preloading: tell the loader what is most likely to be needed next.
  useEffect(() => {
    const e = engineRef.current; if (!e) return;
    if (screen === 'title') e.prioritize(['anomalocaris', 'waptia', 'opabinia', 'marrella'], 'title');
    else if (screen === 'select') {
      const picked = players.map((p) => p.creature);
      const neighbours = players.flatMap((p) => { const i = CREATURE_IDS.indexOf(p.creature); return [CREATURE_IDS[(i + 1) % 8], CREATURE_IDS[(i + 7) % 8]]; });
      e.prioritize([...new Set([...picked, ...neighbours])], 'select');
    } else e.prioritize([...new Set(players.map((p) => p.creature))], 'playing');
  }, [screen, players, loaded]);

  const chosenReady = players.every((p) => progress?.ready.has(p.creature) ?? false);
  const chosenFraction = engineRef.current?.assets.subsetFraction(players.map((p) => p.creature)) ?? 0;
  const allReady = players.length > 0 && players.every((p) => p.ready);
  const modeInfo = useMemo(() => MODE_INFO, []);

  return (
    <main className={`shell screen-${screen}`}>
      <div className="sea-canvas" ref={canvasRef} aria-label="Cambrian sea" />
      <div className="vignette" />

      {!loaded && <LoadingScreen progress={progress} fraction={engineRef.current?.assets.subsetFraction(['anomalocaris', 'waptia']) ?? 0} />}
      {screen === 'title' && loaded && <TitleScreen loaded={loaded} onStart={() => startFromTitle('keyboard', true)} padCount={padCount} />}

      {screen === 'select' && (
        <SelectScreen
          players={players} mode={mode} modes={MODES} modeInfo={modeInfo} loaded={loaded && chosenReady} loadFraction={chosenFraction} allReady={allReady} padCount={padCount}
          onCycle={cycleCreature} onPick={setCreature} onReady={toggleReady} onRemove={removePlayer} onAddKeyboard={addKeyboard}
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

export const MODE_INFO: Record<Mode, { name: string; blurb: string; players: string }> = {
  rise: { name: 'Rise', blurb: 'Hatch as a larva. Eat, grow, fight, hide. Reach Apex and hold it for ninety seconds. Allies share the feast.', players: '1–4 co-op' },
  frenzy: { name: 'Feeding Frenzy', blurb: 'Growth race. First to Apex wins. Eating a rival steals their progress. Bots fill the empty seats.', players: '1–4 versus' },
  hunted: { name: 'Hunter & Hunted', blurb: 'Player one is a giant. Everyone else is small, hungry, and trying to grow up before they get eaten.', players: '2–4 asymmetric' },
  reef: { name: 'Reef', blurb: 'No goal. Start as an adult with every move unlocked and just be an animal in the Cambrian.', players: '1–4 sandbox' },
};

export { creature };
