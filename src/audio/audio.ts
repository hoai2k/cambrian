import { assetPaths } from '../content/asset-paths';
/**
 * Game audio. Generated sample library (public/assets/sfx, made with tools/gen-sfx.mjs) with a
 * synthesized fallback for anything that has not loaded yet, so the game is never silent.
 */
import { AUDIBLE_FLOOR, MIN_GAP } from './mix';
import { biomeHasTrack, BIOME_HOLD, CROSSFADE, FIRST_FADE, MISSING, OPENING_TRACK, pickNext, type MusicTrack } from './music';
import type { Biome } from '../sim/world';
import { appBase, setAppBase } from '../shared/base';

/** One playing music track: a streaming media element on its own gain, for crossfading. */
interface MusicVoice { track: MusicTrack; el: HTMLAudioElement; node: MediaElementAudioSourceNode; gain: GainNode }

/**
 * Prefix for the asset folders. The game page sits at the app root, but a built bundle's
 * BASE_URL is './', so a page one directory down (the workbench) would resolve samples to
 * `/workbench/assets/`. Those pages call `setAssetBase('../')` before playing anything.
 */
/** Kept for the workbench; the game itself steers every path through appBase(). */
export function setAssetBase(base: string) { setAppBase(base); }
/** URL of a sample file in the library, by bare name (no extension). */
/** A sample name may carry a directory ('devonian/jet-1'): an era's own library beside the shared one. */
export const sfxUrl = (name: string) => `${appBase()}${name.includes('/') ? `assets/${name.replace(/^([^/]+)\//, '$1/sfx/')}.mp3` : assetPaths.sfx(name)}`;

/** event kind → sample files (variants are chosen at random) */
export const SAMPLES: Record<string, string[]> = {
  eat: ['bite-1', 'bite-2', 'bite-3'],
  crunch: ['crunch-1', 'crunch-2'],
  hit: ['hit-light-1', 'hit-light-2'],
  'hit-heavy': ['hit-heavy-1', 'hit-heavy-2'],
  parry: ['parry'], guardBreak: ['guard-break'], stagger: ['stagger'],
  dodge: ['dodge-1', 'dodge-2'], burst: ['burst'], silt: ['silt'], grab: ['grab'],
  kill: ['kill'], death: ['death'], tierUp: ['tier-up'], hunted: ['hunted'], escape: ['escape'],
  sense: ['sense'], ability: ['ability'], heartbeat: ['heartbeat'], noticed: ['noticed'], respawn: ['respawn'],
  pounce: ['pounce'], swallow: ['swallow'], disintegrate: ['disintegrate'], routed: ['routed'],
  'ui-move': ['ui-move'], 'ui-confirm': ['ui-confirm'], 'ui-back': ['ui-back'], 'ui-join': ['ui-join'], 'ui-start': ['ui-start'], won: ['won'],
};
export const LOOPS = { ambient: 'ambient-reef', drone: 'giant-drone' } as const;
/** An era adds its own sounds before the library preloads; the shared table stays as it is. */
export function registerSamples(extra: Record<string, string[]>) { Object.assign(SAMPLES, extra); }
/** URL of a music track in public/music, by name (no extension). See `src/audio/music.ts`. */
export const musicUrl = (name: string) => `${appBase()}${assetPaths.music(name)}`;

export class GameAudio {
  private ctx?: AudioContext;
  private master?: GainNode;
  private sfxBus?: GainNode;
  private ambGain?: GainNode;
  private synthAmbGain?: GainNode;
  private tensionGain?: GainNode;
  private synthTensionGain?: GainNode;
  private musicGain?: GainNode;
  private musicStarted = false;
  private music?: MusicVoice;
  private biome?: Biome;
  private biomeCueAt = -BIOME_HOLD;
  private ambience = true;
  musicOn = true;
  private musicLevel = 0.3;
  private buffers = new Map<string, AudioBuffer>();
  private previews = new Map<string, AudioBuffer>();
  private loading = new Set<string>();
  private heartT = 0;
  private tension = 0;
  private started = false;
  private ambientStarted = false;
  private lastPlay = new Map<string, { t: number; vol: number }>();
  volume = 0.8;
  muted = false;

  /**
   * Bring up the audio graph. `ambience: false` leaves out the beds — music, the reef loop and
   * the synth drones — for the audio workbench, which auditions single sounds on a silent stage.
   */
  init(opts: { ambience?: boolean } = {}) {
    if (this.started) return;
    this.started = true;
    this.ambience = opts.ambience !== false;
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;
    this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : this.volume; this.master.connect(ctx.destination);
    this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = 0.9; this.sfxBus.connect(this.master);
    // Sample-based ambience and tension (start silent, fade in once loaded)
    this.ambGain = ctx.createGain(); this.ambGain.gain.value = 0; this.ambGain.connect(this.master);
    this.tensionGain = ctx.createGain(); this.tensionGain.gain.value = 0; this.tensionGain.connect(this.master);
    this.musicGain = ctx.createGain(); this.musicGain.gain.value = 0; this.musicGain.connect(this.master);
    // Synth fallbacks: drones through a low-pass, plus a filtered noise wash
    if (!this.ambience) { void this.preload(); this.watchFocus(); return; }
    this.synthAmbGain = ctx.createGain(); this.synthAmbGain.gain.value = 0; this.synthAmbGain.connect(this.master);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.connect(this.synthAmbGain);
    for (const [f, type] of [[55, 'sine'], [82.5, 'triangle'], [110.2, 'sine']] as const) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = f < 60 ? 0.35 : 0.14; o.connect(g); g.connect(lp); o.start();
    }
    const noise = this.noiseSource(); const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 600; nf.Q.value = 0.5;
    const ng = ctx.createGain(); ng.gain.value = 0.05; noise.connect(nf); nf.connect(ng); ng.connect(this.synthAmbGain);
    this.synthAmbGain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 3);
    this.synthTensionGain = ctx.createGain(); this.synthTensionGain.gain.value = 0; this.synthTensionGain.connect(this.master);
    const td = ctx.createOscillator(); td.type = 'sawtooth'; td.frequency.value = 41; const tf = ctx.createBiquadFilter(); tf.type = 'lowpass'; tf.frequency.value = 160;
    td.connect(tf); tf.connect(this.synthTensionGain); td.start();
    this.startSoundtrack();
    void this.preload();
    this.watchFocus();
  }
  /** (focus) silence the game when the tab or window is not in front */
  private watchFocus() {
    const onVis = () => this.applyGain();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onVis); window.addEventListener('focus', onVis);
  }
  private focused() { return document.visibilityState === 'visible' && document.hasFocus(); }
  private applyGain() {
    if (!this.master || !this.ctx) return;
    const target = this.muted || !this.focused() ? 0 : this.volume;
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
  }

  private async preload() {
    const names = new Set<string>([...Object.values(SAMPLES).flat(), ...Object.values(LOOPS)]);
    // UI and frequent sounds first
    const order = ['ui-start', 'ui-confirm', 'ui-move', 'bite-1', 'hit-light-1', 'ambient-reef', 'giant-drone', 'heartbeat', ...names];
    for (const n of order) await this.load(n);
  }
  private async load(name: string): Promise<AudioBuffer | undefined> {
    if (!this.ctx) return undefined;
    if (this.buffers.has(name)) return this.buffers.get(name);
    if (this.loading.has(name)) return undefined;
    this.loading.add(name);
    try {
      const res = await fetch(sfxUrl(name));
      if (!res.ok) throw new Error(String(res.status));
      const buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
      this.buffers.set(name, buf);
      if (this.ambience && name === LOOPS.ambient) this.startAmbient();
      if (this.ambience && name === LOOPS.drone) this.startDrone();
      return buf;
    } catch { return undefined; } finally { this.loading.delete(name); }
  }

  // ---------- music ----------
  /**
   * Tracks are streamed through media elements rather than decoded into AudioBuffers: they run
   * for minutes, and a decoded one costs tens of megabytes where a stream costs nothing. It also
   * gives us `ended` and `currentTime` for free, which is how the hand-over is timed.
   */
  private musicVoice(track: MusicTrack): MusicVoice | undefined {
    const ctx = this.ctx; if (!ctx || !this.musicGain) return undefined;
    const el = new Audio(musicUrl(track.name));
    el.preload = 'auto';
    const gain = ctx.createGain(); gain.gain.value = 0;
    const node = ctx.createMediaElementSource(el);
    node.connect(gain); gain.connect(this.musicGain);
    const voice: MusicVoice = { track, el, node, gain };
    el.addEventListener('timeupdate', () => {
      // Hand over before the end so the tracks overlap rather than leaving a hole.
      if (this.music !== voice || !el.duration) return;
      if (el.duration - el.currentTime <= CROSSFADE) this.nextTrack();
    });
    el.addEventListener('ended', () => { if (this.music === voice) this.nextTrack(); });
    // A track that is not there (a biome theme not yet delivered) leaves the rotation rather than silencing it.
    el.addEventListener('error', () => { MISSING.add(track.name); if (this.music === voice) this.nextTrack(); });
    void el.play().catch(() => { /* blocked until a gesture; the next track will try again */ });
    return voice;
  }

  /** Fade `voice` out over `seconds` and tear it down. */
  private endVoice(voice: MusicVoice, seconds: number) {
    const ctx = this.ctx!;
    voice.gain.gain.cancelScheduledValues(ctx.currentTime);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, ctx.currentTime);
    voice.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + seconds);
    window.setTimeout(() => {
      voice.el.pause(); voice.el.removeAttribute('src'); voice.el.load();
      voice.node.disconnect(); voice.gain.disconnect();
    }, seconds * 1000 + 200);
  }

  /** Start `track`, crossfading out whatever is playing. */
  private playTrack(track: MusicTrack, fade = CROSSFADE) {
    const ctx = this.ctx; if (!ctx) return;
    const outgoing = this.music;
    const voice = this.musicVoice(track);
    if (!voice) return;
    this.music = voice;
    voice.gain.gain.linearRampToValueAtTime(1, ctx.currentTime + fade);
    if (outgoing) this.endVoice(outgoing, fade);
  }

  /** Move on to whatever `pickNext` chooses. */
  private nextTrack() {
    this.playTrack(pickNext(this.music?.track, this.biome));
  }

  /** Begin the soundtrack: the opening track, then the random rotation. */
  startSoundtrack() {
    if (this.musicStarted || !this.ctx || !this.musicGain) return;
    this.musicStarted = true;
    this.musicGain.gain.linearRampToValueAtTime(this.musicOn ? this.musicLevel : 0, this.ctx.currentTime + FIRST_FADE);
    this.playTrack(OPENING_TRACK, FIRST_FADE);
  }

  setMusic(on: boolean) {
    this.musicOn = on;
    if (this.musicGain && this.ctx) this.musicGain.gain.setTargetAtTime(on ? this.musicLevel * (1 - this.tension * 0.45) : 0, this.ctx.currentTime, 0.5);
    // Stop the stream outright when the music is off, so a silent track is not still downloading
    // and counting down towards the next one.
    if (this.music) { if (on) void this.music.el.play().catch(() => {}); else this.music.el.pause(); }
  }

  /** What is playing right now, for the audio workbench. */
  get nowPlaying(): string | undefined { return this.music?.track.name; }
  /** Workbench: hand over to the next track now. */
  skipTrack() { if (this.music) this.nextTrack(); }
  /**
   * Workbench: jump to just before the hand-over, to hear one track give way to the next
   * without sitting through the whole thing.
   */
  seekToHandover() {
    const el = this.music?.el;
    if (!el) return;
    // A stream that has only just started may not know its own length yet; wait for it rather
    // than silently doing nothing.
    const seek = () => { if (el.duration) el.currentTime = Math.max(0, el.duration - CROSSFADE - 1); };
    if (el.duration) seek(); else el.addEventListener('loadedmetadata', seek, { once: true });
  }

  /**
   * Tell the music where the player is. A biome with a track of its own cues that track; the
   * change is rate-limited by BIOME_HOLD so a player weaving across an edge does not thrash the
   * score. No track names a biome yet, so today this only records where we are, and the biome
   * then steers `pickNext` when the current track ends.
   */
  setBiome(biome: Biome) {
    if (biome === this.biome) return;
    this.biome = biome;
    if (!this.ctx || !this.music || !biomeHasTrack(biome)) return;
    if (this.music.track.biomes?.includes(biome)) return;         // already the right music
    const now = this.ctx.currentTime;
    if (now - this.biomeCueAt < BIOME_HOLD) return;
    this.biomeCueAt = now;
    this.playTrack(pickNext(this.music.track, biome));
  }

  private startLoop(name: string, dest: AudioNode) {
    const ctx = this.ctx!; const buf = this.buffers.get(name); if (!buf) return;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    // gentle crossfade seam: start slightly in, with a short loop region trimmed off the ends
    src.loopStart = 0.05; src.loopEnd = Math.max(0.1, buf.duration - 0.05);
    src.connect(dest); src.start(0, 0.05);
  }
  private startAmbient() {
    if (this.ambientStarted || !this.ctx || !this.ambGain || !this.synthAmbGain) return;
    this.ambientStarted = true;
    this.startLoop(LOOPS.ambient, this.ambGain);
    const t = this.ctx.currentTime;
    this.ambGain.gain.linearRampToValueAtTime(0.55, t + 2.5);
    this.synthAmbGain.gain.linearRampToValueAtTime(0, t + 2.5);
  }
  private startDrone() { if (this.tensionGain) this.startLoop(LOOPS.drone, this.tensionGain); }

  resume() { this.ctx?.resume(); }
  private noiseSource() {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; src.start(); return src;
  }
  setVolume(v: number) { this.volume = v; this.applyGain(); }
  setMuted(m: boolean) { this.muted = m; this.setVolume(this.volume); }
  setTension(t: number) {
    this.tension = t;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const haveDrone = this.buffers.has(LOOPS.drone);
    this.tensionGain?.gain.setTargetAtTime(haveDrone ? t * 0.7 : 0, now, 0.5);
    if (this.musicGain && this.musicOn) this.musicGain.gain.setTargetAtTime(this.musicLevel * (1 - t * 0.45), now, 0.8);
    this.synthTensionGain?.gain.setTargetAtTime(haveDrone ? 0 : t * 0.3, now, 0.5);
  }
  update(dt: number) {
    if (!this.ctx || this.tension < 0.2) { this.heartT = 0; return; }
    this.heartT -= dt;
    if (this.heartT <= 0) {
      this.heartT = 1.15 - this.tension * 0.55;
      if (this.buffers.has('heartbeat')) this.playSample('heartbeat', 0.5 + this.tension * 0.5, 0, 1 + (this.tension - 0.5) * 0.15);
      else { this.thump(0.5 + this.tension * 0.5); setTimeout(() => this.thump(0.3 + this.tension * 0.3), 140); }
    }
  }

  /**
   * One sfx voice. `muffle` is the distance factor from the listener (1 = right here, 0 = at the
   * audible limit); below 1 it rolls off the highs, so far-off bites and clacks read as soft
   * thuds instead of a carpet of clicks — water swallows high frequencies over distance.
   */
  private voice(buf: AudioBuffer, vol: number, pan = 0, rate = 1, muffle = 1, loop = false) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate; src.loop = loop;
    const g = ctx.createGain(); g.gain.value = Math.min(1.5, vol);
    const p = ctx.createStereoPanner(); p.pan.value = pan;
    src.connect(g);
    if (muffle < 0.999) {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
      lp.frequency.value = 480 + 19000 * Math.pow(Math.max(0, muffle), 1.6);
      g.connect(lp); lp.connect(p);
    } else g.connect(p);
    p.connect(this.sfxBus!); src.start();
    return src;
  }

  private playSample(name: string, vol: number, pan = 0, rate = 1, muffle = 1) {
    const buf = this.buffers.get(name); if (!this.ctx || !buf || !this.sfxBus) return false;
    this.voice(buf, vol, pan, rate, muffle);
    return true;
  }

  /** Decode an audio file by URL, cached. Used by `preview` and by the workbench's level meter. */
  async decode(url: string): Promise<AudioBuffer | undefined> {
    const ctx = this.ctx; if (!ctx) return undefined;
    const have = this.previews.get(url);
    if (have) return have;
    try {
      const res = await fetch(url); if (!res.ok) return undefined;
      const buf = await ctx.decodeAudioData(await res.arrayBuffer());
      this.previews.set(url, buf);
      return buf;
    } catch { return undefined; }
  }

  /**
   * Play one audio file through the sfx bus and hand back a stop handle. The audio workbench
   * uses this to audition the library file by file (loops included); the game goes through
   * `play()`, which picks the file and the volume for an event kind.
   */
  async preview(url: string, opts: { vol?: number; pan?: number; atten?: number; loop?: boolean } = {}) {
    const ctx = this.ctx; if (!ctx || !this.sfxBus) return undefined;
    const buf = await this.decode(url); if (!buf) return undefined;
    const atten = opts.atten ?? 1;
    const src = this.voice(buf, (opts.vol ?? 0.8) * atten, opts.pan ?? 0, 1, atten, opts.loop);
    return { duration: buf.duration, stop: () => { try { src.stop(); } catch { /* already ended */ } } };
  }

  /**
   * Play a game or UI event. `strength` scales volume and slightly pitch; `atten` is the
   * distance attenuation from the listener (1 = at the camera, 0 = out of earshot).
   */
  play(kind: string, strength = 1, pan = 0, atten = 1) {
    if (!this.ctx) return;
    if (atten <= AUDIBLE_FLOOR) return;               // out of earshot: never queued, never heard
    const s = Math.min(2, Math.max(0.2, strength));
    let key = kind;
    if (kind === 'hit' && s > 1.1) key = 'hit-heavy';
    if (kind === 'eat' && s > 0.5) key = 'crunch';
    const baseVol = kind.startsWith('ui') ? 0.42 : kind === 'noticed' ? 0.3 : kind === 'eat' ? 0.45 + s * 0.3 : 0.6 + s * 0.35;
    const vol = baseVol * atten;

    // Rate-limit spammy kinds so a reef full of grazers is not a machine gun. A louder (nearer)
    // event still gets through inside the window — quiet distant ones must never mask the one
    // that is happening to you.
    const minGap = MIN_GAP[kind] ?? 0;
    if (minGap) {
      const now = performance.now(); const last = this.lastPlay.get(kind);
      if (last && now - last.t < minGap && vol <= last.vol * 1.15) return;
      this.lastPlay.set(kind, { t: now, vol });
    }

    const list = SAMPLES[key] ?? SAMPLES[kind];
    if (list) {
      const name = list[Math.floor(Math.random() * list.length)];
      const rate = (0.94 + Math.random() * 0.12) * (kind === 'eat' ? 1.15 - Math.min(0.3, s * 0.3) : 1);
      if (this.playSample(name, vol, pan, rate, atten)) return;
      void this.load(name);
    }
    this.synth(kind, s * atten, pan);
  }

  // ---------- synthesized fallbacks ----------
  private thump(vol: number) {
    const ctx = this.ctx; if (!ctx || !this.master) return;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(70, ctx.currentTime); o.frequency.exponentialRampToValueAtTime(38, ctx.currentTime + 0.18);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol * 0.5, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    o.connect(g); g.connect(this.master); o.start(); o.stop(ctx.currentTime + 0.25);
  }
  private tone(freq: number, dur: number, vol: number, type: OscillatorType = 'sine', slide?: number, pan = 0) {
    const ctx = this.ctx; if (!ctx || !this.master) return;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), ctx.currentTime + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    const p = ctx.createStereoPanner(); p.pan.value = pan;
    o.connect(g); g.connect(p); p.connect(this.master); o.start(); o.stop(ctx.currentTime + dur + 0.05);
  }
  private burstNoise(dur: number, vol: number, freq: number, q = 1, pan = 0, sweep?: number) {
    const ctx = this.ctx; if (!ctx || !this.master) return;
    const src = this.noiseSource();
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(freq, ctx.currentTime); if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, ctx.currentTime + dur); f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    const p = ctx.createStereoPanner(); p.pan.value = pan;
    src.connect(f); f.connect(g); g.connect(p); p.connect(this.master); src.stop(ctx.currentTime + dur + 0.05);
  }
  private synth(kind: string, s: number, pan: number) {
    switch (kind) {
      case 'hit': this.burstNoise(0.12, 0.35 * s, 700, 0.8, pan); this.tone(120, 0.16, 0.35 * s, 'sine', 55, pan); break;
      case 'eat': this.tone(520 + Math.random() * 200, 0.08, 0.12, 'triangle', 300, pan); this.burstNoise(0.05, 0.08, 2400, 2, pan); break;
      case 'kill': this.tone(160, 0.5, 0.35, 'sawtooth', 50, pan); this.burstNoise(0.3, 0.3, 500, 0.6, pan, 120); break;
      case 'death': this.tone(220, 0.9, 0.3, 'sine', 40, pan); break;
      case 'parry': this.tone(1800, 0.25, 0.3, 'square', 2400, pan); this.burstNoise(0.08, 0.2, 3000, 4, pan); break;
      case 'guardBreak': this.tone(300, 0.35, 0.35, 'square', 90, pan); this.burstNoise(0.2, 0.25, 900, 1, pan); break;
      case 'stagger': this.tone(200, 0.2, 0.2, 'triangle', 120, pan); break;
      case 'dodge': this.burstNoise(0.25, 0.14, 900, 0.7, pan, 300); break;
      case 'silt': this.burstNoise(0.6, 0.18, 400, 0.5, pan, 150); break;
      case 'burst': this.burstNoise(0.35, 0.1, 600, 0.6, pan, 1200); break;
      case 'ability': this.burstNoise(0.4, 0.2, 1200, 1, pan, 300); this.tone(440, 0.4, 0.15, 'triangle', 660, pan); break;
      case 'grab': this.tone(90, 0.3, 0.3, 'sawtooth', 60, pan); this.burstNoise(0.15, 0.2, 400, 1, pan); break;
      case 'tierUp': [0, 0.12, 0.24, 0.4].forEach((d, i) => setTimeout(() => { this.tone([261, 329, 392, 523][i], 0.8, 0.25, 'triangle'); }, d * 1000)); this.thump(1); break;
      case 'hunted': this.tone(55, 1.2, 0.35, 'sawtooth', 45); this.thump(1); break;
      case 'escape': [0, 0.18].forEach((d, i) => setTimeout(() => this.tone([880, 1320][i], 0.9, 0.18, 'sine'), d * 1000)); break;
      case 'noticed': case 'sense': this.tone(330, 0.3, 0.12, 'sine', 220); break;
      case 'respawn': this.tone(392, 0.5, 0.15, 'triangle', 523); break;
      case 'ui-move': this.tone(700, 0.06, 0.08, 'square'); break;
      case 'ui-confirm': this.tone(520, 0.12, 0.15, 'triangle', 780); break;
      case 'ui-back': this.tone(400, 0.12, 0.12, 'triangle', 260); break;
      case 'ui-start': [0, 0.1, 0.2].forEach((d, i) => setTimeout(() => this.tone([392, 523, 784][i], 0.5, 0.2, 'triangle'), d * 1000)); this.thump(1); break;
      case 'ui-join': this.tone(660, 0.2, 0.15, 'triangle', 990); break;
      case 'won': [0, 0.15, 0.3, 0.45, 0.7].forEach((d, i) => setTimeout(() => this.tone([392, 494, 587, 784, 988][i], 1.2, 0.22, 'triangle'), d * 1000)); break;
    }
  }
  dispose() {
    // Stop the music stream first: a media element outlives the audio context it was routed into.
    if (this.music) { this.music.el.pause(); this.music.el.removeAttribute('src'); this.music.el.load(); this.music = undefined; }
    this.musicStarted = false;
    this.ctx?.close(); this.ctx = undefined; this.started = false;
  }
}
export const audio = new GameAudio();
