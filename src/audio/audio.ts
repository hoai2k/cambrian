import { ACTIVE_ERA } from '../content';
import { assetPaths } from '../content/asset-paths';
/**
 * Game audio: the sample library in public/assets/sfx (made with tools/gen-sfx.mjs), the reef and
 * drone loops, and the soundtrack.
 *
 * Samples only. There used to be a synthesised understudy for every one of them — oscillator beds
 * standing in for the ambience and the giant's drone, and a bank of tones and noise bursts standing
 * in for each event — on the principle that the game should never be silent. Every sound the game
 * asks for now exists as a file (both eras: `tools/gen-sfx.mjs` and the era tables), so all those
 * stand-ins ever did was play the wrong thing during the second or two before the right one
 * arrived. A cue whose buffer has not landed asks for it and stays quiet; the loops fade in when
 * their file is decoded. Anything genuinely missing belongs in docs/audio-requests.md, not in an
 * oscillator.
 */
import { AUDIBLE_FLOOR, MIN_GAP } from './mix';
import { AREA_ENTER, AREA_FADE, AREA_LEAVE, CROSSFADE, FIRST_FADE, MISSING, openingTrack, pickNext, themeFor, type MusicTrack } from './music';
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
  // Big bodies: `heavy()` in the engine swaps these in when the body is over HUGE_LENGTH.
  'hit-huge': ['hit-huge-1', 'hit-huge-2'], 'crunch-huge': ['crunch-huge'],
  'burst-huge': ['surge-huge'], 'dodge-huge': ['sweep-huge'], 'death-huge': ['death-huge'],
  parry: ['parry'], guardBreak: ['guard-break'], stagger: ['stagger'],
  dodge: ['dodge-1', 'dodge-2'], burst: ['burst'], silt: ['silt'], grab: ['grab'],
  kill: ['kill'], death: ['death'], tierUp: ['tier-up'], hunted: ['hunted'], escape: ['escape'],
  sense: ['sense'], ability: ['ability'], heartbeat: ['heartbeat'], noticed: ['noticed'], respawn: ['respawn'],
  pounce: ['pounce'], swallow: ['swallow'], disintegrate: ['disintegrate'], routed: ['routed'],
  'ui-move': ['ui-move'], 'ui-confirm': ['ui-confirm'], 'ui-back': ['ui-back'], 'ui-join': ['ui-join'], 'ui-start': ['ui-start'], won: ['won'],
};
/**
 * The two always-on beds, from the era rather than from a constant: the Devonian's ambience is
 * cold open water, not the Cambrian reef. Resolved per call, not captured at import, because an
 * era entry page selects its era after this module has loaded (the same reason `music()` is a
 * function).
 */
export const loops = () => ACTIVE_ERA.audio.loops;
/** An era adds its own sounds before the library preloads; the shared table stays as it is. */
export function registerSamples(extra: Record<string, string[]>) { Object.assign(SAMPLES, extra); }
/** URL of a music track in public/music, by name (no extension). See `src/audio/music.ts`. */
export const musicUrl = (name: string) => `${appBase()}${assetPaths.music(name)}`;

export class GameAudio {
  private ctx?: AudioContext;
  private master?: GainNode;
  private sfxBus?: GainNode;
  private ambGain?: GainNode;
  private tensionGain?: GainNode;
  private musicGain?: GainNode;
  private musicStarted = false;
  private music?: MusicVoice;
  /** The last track that actually started playing — see `nextTrack`. */
  private lastHeard?: MusicTrack;
  private biome?: Biome;
  /** The voice on its way out, kept whole so a change of mind can ramp it back rather than restart it. */
  private fadingOut?: MusicVoice;
  private fadeEnds = 0;
  /** Where each track had got to when it was last faded down, so returning resumes it. */
  private resumeAt = new Map<string, number>();
  /** The track the score returns to when the player is nowhere in particular. */
  private roamingTrack?: MusicTrack;
  /** What the area rules want playing, and how long they have wanted it. */
  private areaWant?: MusicTrack;
  private areaWantT = 0;
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
   * Bring up the audio graph. `ambience: false` leaves out the beds — the music and the reef and
   * drone loops — for the audio workbench, which auditions single sounds on a silent stage.
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
    if (this.ambience) this.startSoundtrack();
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
    const beds = loops();
    const names = new Set<string>([...Object.values(SAMPLES).flat(), ...Object.values(beds)]);
    // UI and frequent sounds first, then the beds — by the era's names for them, or the Devonian
    // fetches the Cambrian reef it is never going to play.
    const order = ['ui-start', 'ui-confirm', 'ui-move', 'bite-1', 'hit-light-1', beds.ambient, beds.drone, 'heartbeat', ...names];
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
      if (this.ambience && name === loops().ambient) this.startAmbient();
      if (this.ambience && name === loops().drone) this.startDrone();
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
    // Pick the track up where it was left rather than replaying its opening: a minute in the
    // shallows and back should sound like a passage, not like the score starting over.
    const at = this.resumeAt.get(track.name);
    if (at) el.addEventListener('loadedmetadata', () => { if (Number.isFinite(el.duration)) el.currentTime = Math.min(at, Math.max(0, el.duration - 1)); }, { once: true });
    const gain = ctx.createGain(); gain.gain.value = 0;
    const node = ctx.createMediaElementSource(el);
    node.connect(gain); gain.connect(this.musicGain);
    const voice: MusicVoice = { track, el, node, gain };
    el.addEventListener('timeupdate', () => {
      // Hand over before the end so the tracks overlap rather than leaving a hole. An area theme
      // loops instead: it is meant to hold for as long as the player stays in its water, and the
      // rotation is not where it goes next.
      if (this.music !== voice || el.loop || !Number.isFinite(el.duration)) return;
      if (el.duration - el.currentTime <= CROSSFADE) this.nextTrack();
    });
    el.addEventListener('ended', () => { if (this.music === voice && !el.loop) this.nextTrack(); });
    // A track that is not there (a biome theme not yet delivered) leaves the rotation rather than
    // silencing it. Re-pick against the track it was taking over from: the failed one is already
    // out via MISSING, and without this the rotation can land straight back on what just played.
    el.addEventListener('error', () => { MISSING.add(track.name); if (this.music === voice) this.nextTrack(); });
    el.addEventListener('playing', () => { this.lastHeard = track; }, { once: true });
    void el.play().catch(() => { /* blocked until a gesture; the next track will try again */ });
    return voice;
  }

  /** Ramp one voice to `to` over `seconds`, from wherever its gain is now. */
  private ramp(voice: MusicVoice, to: number, seconds: number) {
    const ctx = this.ctx!;
    voice.gain.gain.cancelScheduledValues(ctx.currentTime);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, ctx.currentTime);
    voice.gain.gain.linearRampToValueAtTime(to, ctx.currentTime + seconds);
  }

  /** Silence `voice`, remember where it had got to, and take it apart. */
  private endVoice(voice: MusicVoice) {
    if (Number.isFinite(voice.el.currentTime)) this.resumeAt.set(voice.track.name, voice.el.currentTime);
    voice.el.pause(); voice.el.removeAttribute('src'); voice.el.load();
    voice.node.disconnect(); voice.gain.disconnect();
    if (this.fadingOut === voice) this.fadingOut = undefined;
  }

  /**
   * Crossfade to `track`. Reversible: asked for the track that is *already* on its way out — the
   * player left an area and came straight back — the two voices swap roles and ramp the other way,
   * so the music never restarts and never jumps. That is the whole trick behind a short excursion
   * sounding like part of the piece.
   */
  private playTrack(track: MusicTrack, fade = CROSSFADE) {
    const ctx = this.ctx; if (!ctx) return;
    if (this.music?.track.name === track.name) return;
    if (this.fadingOut?.track.name === track.name) {
      const back = this.fadingOut, away = this.music;
      this.music = back; this.fadingOut = away;
      this.ramp(back, 1, fade);
      if (away) this.ramp(away, 0, fade);
      this.scheduleTeardown(fade);
      return;
    }
    // A third change inside one fade: the one already leaving has had its turn, and stacking
    // voices would only pile up streams nobody is listening to.
    if (this.fadingOut) this.endVoice(this.fadingOut);
    const outgoing = this.music;
    const voice = this.musicVoice(track);
    if (!voice) return;
    this.music = voice;
    voice.el.loop = !!track.biomes?.length;   // an area theme holds while you are in its area
    this.ramp(voice, 1, fade);
    if (outgoing) { this.fadingOut = outgoing; this.ramp(outgoing, 0, fade); this.scheduleTeardown(fade); }
    if (!track.biomes?.length) this.roamingTrack = track;
  }

  /** Take the outgoing voice apart once the fade it is in has actually finished. */
  private scheduleTeardown(fade: number) {
    this.fadeEnds = performance.now() + fade * 1000 + 200;
    const at = this.fadeEnds;
    window.setTimeout(() => { if (this.fadingOut && this.fadeEnds === at) this.endVoice(this.fadingOut); }, fade * 1000 + 200);
  }

  /**
   * Move on to whatever `pickNext` chooses. The pick is made against the last track the player
   * actually heard, not the current one: an undelivered biome theme is only discovered to be
   * missing once it is chosen, and two of those in a row would otherwise let the rotation land
   * straight back on the track that had just finished.
   */
  private nextTrack() {
    this.playTrack(pickNext(this.lastHeard ?? this.music?.track));
  }

  /** Begin the soundtrack: the opening track, then the random rotation. */
  startSoundtrack() {
    if (this.musicStarted || !this.ctx || !this.musicGain) return;
    this.musicStarted = true;
    this.musicGain.gain.linearRampToValueAtTime(this.musicOn ? this.musicLevel : 0, this.ctx.currentTime + FIRST_FADE);
    this.playTrack(openingTrack(), FIRST_FADE);
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
    // A stream that has only just started reports its length as Infinity until the real value
    // arrives, so wait for a finite one rather than seeking to nowhere.
    const known = () => Number.isFinite(el.duration) && el.duration > 0;
    const seek = () => { if (known()) el.currentTime = Math.max(0, el.duration - CROSSFADE - 1); };
    if (known()) seek(); else el.addEventListener('durationchange', seek, { once: true });
  }

  /**
   * Tell the music where the player is. Called every frame; the decision is taken in `update`,
   * which is where the dwell timers live.
   */
  setBiome(biome: Biome) { this.biome = biome; }

  /**
   * The area score, one step at a time. `themeFor` says what this biome wants; a want has to hold
   * for AREA_ENTER before the score acts on it, and losing one has to hold for AREA_LEAVE before
   * the score gives it up. See the note on those constants in music.ts for why the two differ.
   */
  private stepArea(dt: number) {
    if (!this.ctx || !this.musicStarted || !this.music) return;
    const theme = themeFor(this.biome);
    const target = theme ?? this.roamingTrack;
    if (!target || target.name === this.music.track.name) { this.areaWant = undefined; this.areaWantT = 0; return; }
    if (this.areaWant?.name !== target.name) { this.areaWant = target; this.areaWantT = 0; }
    this.areaWantT += dt;
    // Arriving somewhere is a lower bar than abandoning it: `theme` means we have entered one.
    if (this.areaWantT < (theme ? AREA_ENTER : AREA_LEAVE)) return;
    this.areaWant = undefined; this.areaWantT = 0;
    this.playTrack(target, AREA_FADE);
  }

  private startLoop(name: string, dest: AudioNode) {
    const ctx = this.ctx!; const buf = this.buffers.get(name); if (!buf) return;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    // gentle crossfade seam: start slightly in, with a short loop region trimmed off the ends
    src.loopStart = 0.05; src.loopEnd = Math.max(0.1, buf.duration - 0.05);
    src.connect(dest); src.start(0, 0.05);
  }
  private startAmbient() {
    if (this.ambientStarted || !this.ctx || !this.ambGain) return;
    this.ambientStarted = true;
    this.startLoop(loops().ambient, this.ambGain);
    const t = this.ctx.currentTime;
    this.ambGain.gain.linearRampToValueAtTime(0.55, t + 2.5);
  }
  private startDrone() { if (this.tensionGain) this.startLoop(loops().drone, this.tensionGain); }

  resume() { this.ctx?.resume(); }
  setVolume(v: number) { this.volume = v; this.applyGain(); }
  setMuted(m: boolean) { this.muted = m; this.setVolume(this.volume); }
  setTension(t: number) {
    this.tension = t;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Held at silence until the drone's buffer exists: startDrone() begins the loop the moment it
    // decodes, and a gain already wound up would drop it in at full volume.
    const haveDrone = this.buffers.has(loops().drone);
    this.tensionGain?.gain.setTargetAtTime(haveDrone ? t * 0.7 : 0, now, 0.5);
    if (this.musicGain && this.musicOn) this.musicGain.gain.setTargetAtTime(this.musicLevel * (1 - t * 0.45), now, 0.8);
  }
  update(dt: number) {
    this.stepArea(dt);
    if (!this.ctx || this.tension < 0.2) { this.heartT = 0; return; }
    this.heartT -= dt;
    if (this.heartT <= 0) {
      this.heartT = 1.15 - this.tension * 0.55;
      this.playSample('heartbeat', 0.5 + this.tension * 0.5, 0, 1 + (this.tension - 0.5) * 0.15);
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
    const feeding = kind === 'eat' || kind === 'crunch-huge';   // same curve either size
    const baseVol = kind.startsWith('ui') ? 0.42 : kind === 'noticed' ? 0.3 : feeding ? 0.45 + s * 0.3 : 0.6 + s * 0.35;
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
      // Not decoded yet: fetch it for next time and let this one pass. A stand-in here would only
      // play the wrong sound for the second before the right one is ready.
      if (!this.playSample(name, vol, pan, rate, atten)) void this.load(name);
    }
  }

  dispose() {
    // Stop the music stream first: a media element outlives the audio context it was routed into.
    for (const v of [this.music, this.fadingOut]) if (v) { v.el.pause(); v.el.removeAttribute('src'); v.el.load(); }
    this.music = undefined; this.fadingOut = undefined;
    this.musicStarted = false;
    this.ctx?.close(); this.ctx = undefined; this.started = false;
  }
}
export const audio = new GameAudio();
