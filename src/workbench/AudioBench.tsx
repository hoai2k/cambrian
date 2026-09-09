/**
 * Audio workbench: every sound the game can make, on one page, played through the real audio
 * module so what you hear is what the game plays — same file pick, same volume shaping, same
 * distance falloff.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { audio, musicUrl, registerSamples, SAMPLES, sfxUrl } from '../audio/audio';
import { distanceAtten } from '../audio/mix';
import { music, openingTrack } from '../audio/music';
import { BEDS, DEVONIAN_BEDS, DEVONIAN_GROUPS, GROUPS, type SoundEntry } from './audio-catalogue';
import { DEVONIAN_SAMPLES } from '../content/devonian/sfx';

// The game registers an era's samples when that era's entry loads. The workbench is neither era,
// so it registers them all up front and lists both libraries.
registerSamples(DEVONIAN_SAMPLES);
const ALL_GROUPS = [...GROUPS, ...DEVONIAN_GROUPS];
const ALL_BEDS = [...BEDS, ...DEVONIAN_BEDS];
import { formatLevel, isQuiet, measure, QUIET_MID_PEAK, type Level } from './levels';

/** Every file the catalogue can reach, so we can report on the library as a whole. */
const filesOf = (kind: string) => SAMPLES[kind] ?? [];

type FileInfo = { ok: boolean; kb: number };

/** A camera distance to reason about: roughly what a mid-tier specimen is framed at. */
const REF_DISTANCE = 6;

export function AudioBench() {
  const [ready, setReady] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [strength, setStrength] = useState(1);
  const [pan, setPan] = useState(0);
  const [distance, setDistance] = useState(0);
  const [info, setInfo] = useState<Record<string, FileInfo>>({});
  const [last, setLast] = useState<string>('');
  const [nowPlaying, setNowPlaying] = useState<string | undefined>();
  const [levels, setLevels] = useState<Record<string, Level>>({});
  const [metering, setMetering] = useState(false);
  const stops = useRef<(() => void)[]>([]);

  const atten = useMemo(() => distanceAtten(distance, REF_DISTANCE), [distance]);

  const start = useCallback(() => {
    audio.init({ ambience: false });      // no music, no reef bed: audition on a silent stage
    audio.resume();
    audio.setVolume(volume);
    setReady(true);
  }, [volume]);

  useEffect(() => { if (ready) audio.setVolume(volume); }, [ready, volume]);

  // Follow the soundtrack so the hand-over from one track to the next is visible as it happens.
  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => setNowPlaying(audio.nowPlaying), 250);
    return () => window.clearInterval(id);
  }, [ready]);

  // Report on the library itself: which files are actually on disk, and how big they are.
  useEffect(() => {
    let live = true;
    const names = allFiles();
    void (async () => {
      const found: Record<string, FileInfo> = {};
      for (const n of names) {
        try {
          const res = await fetch(sfxUrl(n), { method: 'HEAD' });
          // A dev/preview server answers an unknown path with index.html, so a 200 is not proof
          // on its own — the file only counts as present if what came back is audio.
          const audioType = (res.headers.get('content-type') ?? '').startsWith('audio');
          found[n] = { ok: res.ok && audioType, kb: Math.round(Number(res.headers.get('content-length') ?? 0) / 1024) };
        } catch { found[n] = { ok: false, kb: 0 }; }
      }
      if (live) setInfo(found);
    })();
    return () => { live = false; };
  }, []);

  const stopAll = useCallback(() => { for (const s of stops.current) s(); stops.current = []; }, []);

  /**
   * Measure every sample, and flag the ones that will not read on a small speaker. This is the
   * check that catches a sound which is "there" but inaudible in play.
   */
  const measureAll = useCallback(async () => {
    if (!ready || metering) return;
    setMetering(true);
    const found: Record<string, Level> = {};
    for (const n of allFiles()) {
      const l = await measure(sfxUrl(n));
      if (l) { found[n] = l; setLevels({ ...found }); }
    }
    setMetering(false);
    const quiet = Object.entries(found).filter(([, l]) => isQuiet(l)).map(([n]) => n);
    setLast(quiet.length ? `too quiet to read on a small speaker: ${quiet.join(', ')}` : 'every sample carries above 150 Hz');
  }, [ready, metering]);

  /** Play a sound the way the game plays it: by event kind, through `audio.play`. */
  const playKind = useCallback((kind: string, spatial: boolean) => {
    if (!ready) return;
    audio.play(kind, strength, spatial ? pan : 0, spatial ? atten : 1);
    setLast(`${kind}${spatial ? ` · ${Math.round(atten * 100)}% at ${distance.toFixed(0)}m` : ''}`);
  }, [ready, strength, pan, atten, distance]);

  /** Play one raw file, bypassing the kind → file pick. */
  const playFile = useCallback(async (file: string, url = sfxUrl(file), loop = false) => {
    if (!ready) return;
    const h = await audio.preview(url, { vol: 0.8, pan, atten, loop });
    if (h) { stops.current.push(h.stop); setLast(`${file} · ${h.duration.toFixed(2)}s`); }
    else setLast(`${file} · could not be played`);
  }, [ready, pan, atten]);

  // Anything the audio module can play but the catalogue does not describe.
  const undocumented = useMemo(() => {
    const listed = new Set(ALL_GROUPS.flatMap((g) => g.sounds.map((s) => s.kind)));
    return Object.keys(SAMPLES).filter((k) => !listed.has(k));
  }, []);

  return (
    <div className="bench">
      <header className="bench-head">
        <div>
          <a className="back" href="../">← Cambrian Conquest</a>
          <h1>Audio workbench</h1>
          <p className="sub">
            Every sound in the game, played through the real audio module. Pause over the space around a sound’s controls to read where it fires from.
          </p>
        </div>
        {!ready
          ? <button className="primary" onClick={start}>Enable audio</button>
          : <button className="primary" onClick={stopAll}>Stop everything</button>}
      </header>

      <section className="controls" aria-label="Playback controls">
        <Slider label="Master volume" value={volume} min={0} max={1} step={0.01} onChange={setVolume} format={(v) => `${Math.round(v * 100)}%`} />
        <Slider label="Strength" value={strength} min={0.2} max={2} step={0.05} onChange={setStrength} format={(v) => v.toFixed(2)}
          hint="What the sim passes for how hard the event landed. Above 1.1 a hit becomes a heavy hit; above 0.5 an eat becomes a crunch." />
        <Slider label="Distance" value={distance} min={0} max={70} step={0.5} onChange={setDistance} format={(v) => `${v.toFixed(0)} m → ${Math.round(distanceAtten(v, REF_DISTANCE) * 100)}%`}
          hint={`How far from the camera the event happened, for a view framed at ${REF_DISTANCE} m. Applies to world sounds only — the same falloff the game uses, highs rolled off included.`} />
        <Slider label="Pan" value={pan} min={-1} max={1} step={0.05} onChange={setPan} format={(v) => (v === 0 ? 'centre' : v < 0 ? `${Math.round(-v * 100)}% left` : `${Math.round(v * 100)}% right`)} />
        <div className="readout">
          <button className="chip" disabled={!ready || metering} onClick={() => void measureAll()}
            title={`Decode every sample and report its peak above 150 Hz — below ${QUIET_MID_PEAK} dB a sound will not read on a laptop speaker.`}>
            {metering ? 'measuring…' : 'measure levels'}
          </button>
          <span aria-live="polite">{last ? `▶ ${last}` : ready ? 'Ready.' : 'Audio is off until you enable it.'}</span>
        </div>
      </section>

      {ALL_GROUPS.map((g) => (
        <section key={g.title} className="group">
          <h2>{g.title}</h2>
          <p className="blurb">{g.blurb}</p>
          <ul className="sounds">
            {g.sounds.map((s) => (
              <SoundRow key={s.kind} sound={s} info={info} levels={levels} disabled={!ready}
                onPlayKind={() => playKind(s.kind, s.spatial)} onPlayFile={(f) => void playFile(f)} />
            ))}
          </ul>
        </section>
      ))}

      <section className="group">
        <h2>Beds &amp; music</h2>
        <p className="blurb">The reef beds loop for the whole match; the soundtrack plays one track at a time and rotates at random when one ends. The workbench starts without any of them so single sounds can be heard clean — play them here to audition. Music is streamed, so a track starts a few hundred milliseconds after the click.</p>
        <ul className="sounds">
          {ALL_BEDS.map((b) => (
            <li key={b.file} className="row">
              <button className="name" disabled={!ready} onClick={() => void playFile(b.file)}>
                <b>{b.label}</b><small>loop</small>
              </button>
              <FileChip file={b.file} info={info} levels={levels} disabled={!ready} onPlay={() => void playFile(b.file)} />
              <p className="usage" role="note">{b.usage}</p>
            </li>
          ))}
          <li className="row soundtrack">
            <button className="name" disabled={!ready} onClick={() => { audio.startSoundtrack(); setLast('soundtrack started'); }}>
              <b>Soundtrack</b><small>{nowPlaying ? `now: ${nowPlaying}` : 'stopped'}</small>
            </button>
            <button className="chip" disabled={!ready || !nowPlaying} onClick={() => { audio.skipTrack(); setLast('skipped to the next track'); }}>skip to next</button>
            <button className="chip" disabled={!ready || !nowPlaying} onClick={() => { audio.seekToHandover(); setLast('seeking to the hand-over'); }}>hear the hand-over</button>
            <p className="usage" role="note">
              Runs the real director: the opening track first, then a random pick from the rotation
              each time one ends, crossfading over five seconds. “Hear the hand-over” jumps to six
              seconds before the end of the current track so the transition can be heard without
              waiting out the whole thing.
            </p>
          </li>
          {music().map((t) => (
            <li key={t.name} className="row">
              <button className="name" disabled={!ready} onClick={() => void playFile(t.name, musicUrl(t.name))}>
                <b>{t.name}</b><small>{t === openingTrack() ? 'opening' : 'rotation'}</small>
              </button>
              <span className="chip">public/music/{t.name}.mp3</span>
              <p className="usage" role="note">
                {t === openingTrack()
                  ? 'The opening track. Fades in over four seconds with the first user gesture, and hands over to a random track from the rotation when it ends.'
                  : 'Part of the random rotation, picked once the opening track finishes. Never repeats back to back while another track is available.'}
                {t.biomes?.length ? ` Cued on entering: ${t.biomes.join(', ')}.` : ' Not tied to a biome.'}
                {' '}Ducks by up to 45% as tension rises.
              </p>
            </li>
          ))}
        </ul>
      </section>

      {undocumented.length > 0 && (
        <section className="group warn">
          <h2>Not in the catalogue</h2>
          <p className="blurb">
            The audio module can play these, but <code>src/workbench/audio-catalogue.ts</code> does not describe them:
            {' '}{undocumented.join(', ')}.
          </p>
        </section>
      )}
    </div>
  );
}

function SoundRow({ sound, info, levels, disabled, onPlayKind, onPlayFile }: {
  sound: SoundEntry; info: Record<string, FileInfo>; levels: Record<string, Level>; disabled: boolean;
  onPlayKind: () => void; onPlayFile: (file: string) => void;
}) {
  const files = filesOf(sound.kind);
  return (
    <li className="row">
      <button className="name" disabled={disabled} onClick={onPlayKind}>
        <b>{sound.label}</b>
        <small>{sound.kind}{sound.spatial ? ' · world' : ' · flat'}</small>
      </button>
      {files.length
        ? files.map((f) => <FileChip key={f} file={f} info={info} levels={levels} disabled={disabled} onPlay={() => onPlayFile(f)} />)
        : <span className="chip missing">no sample — synthesized fallback only</span>}
      {sound.alts?.map((f) => (
        <FileChip key={f} file={f} info={info} levels={levels} disabled={disabled} alt onPlay={() => onPlayFile(f)} />
      ))}
      <p className="usage" role="note">{sound.usage}</p>
    </li>
  );
}

function FileChip({ file, info, levels, disabled, alt, onPlay }: {
  file: string; info: Record<string, FileInfo>; levels: Record<string, Level>;
  disabled: boolean; alt?: boolean; onPlay: () => void;
}) {
  const i = info[file];
  const level = levels[file];
  const missing = i && !i.ok;
  const quiet = level && isQuiet(level);
  const cls = `chip${missing ? ' missing' : ''}${quiet ? ' quiet' : ''}${alt ? ' alt' : ''}`;
  // Screen-reader label only — a native tooltip here would fight the row's usage hint.
  const title = alt ? `Backup take, not wired into the game. Play ${file}.mp3` : `Play ${file}.mp3 on its own`;
  return (
    <button className={cls} disabled={disabled} onClick={onPlay}
      aria-label={level ? `${title}. Peak above 150 Hz ${level.midPeak.toFixed(1)} dB, full peak ${level.peak.toFixed(1)} dB` : title}>
      {file}.mp3
      {missing ? ' — missing' : i?.kb ? ` · ${i.kb} KB` : ''}
      {level ? ` · ${formatLevel(level)}` : ''}
      {alt ? ' · backup' : ''}
    </button>
  );
}

/** Every file the catalogue can reach: wired samples, backup takes and the loops. */
function allFiles(): Set<string> {
  return new Set<string>([
    ...Object.values(SAMPLES).flat(),
    ...ALL_GROUPS.flatMap((g) => g.sounds.flatMap((s) => s.alts ?? [])),
    ...ALL_BEDS.map((b) => b.file),
  ]);
}

function Slider({ label, value, min, max, step, onChange, format, hint }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; format: (v: number) => string; hint?: string;
}) {
  return (
    <label className="slider" title={hint}>
      <span className="slider-label">{label}<b>{format(value)}</b></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
