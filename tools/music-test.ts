/**
 * The area score, driven headlessly: enter an area, dip out of it, come back mid-fade, leave for
 * good. WebAudio and the media elements are stubbed just far enough for the real `GameAudio` to
 * run, so what is under test is the shipped state machine and not a copy of it.
 *
 * Usage: npm run music
 */
import assert from 'node:assert/strict';
import { selectEra } from '../src/content';
import { CAMBRIAN } from '../src/content/cambrian';
import { DEVONIAN } from '../src/content/devonian';
import type { Biome } from '../src/sim/world';

let passes = 0;
const ok = (cond: unknown, msg: string) => { assert.ok(cond, msg); passes++; };

// ---- the smallest browser that will run the audio module ----
let now = 0;                                   // ms, ours to advance
const timers: { at: number; fn: () => void }[] = [];
class FakeParam {
  value = 0;
  cancelScheduledValues() {} setValueAtTime(v: number) { this.value = v; }
  linearRampToValueAtTime(v: number) { this.value = v; }   // ramps land instantly: we test decisions, not slopes
  setTargetAtTime(v: number) { this.value = v; }
}
const node = () => ({ connect() {}, disconnect() {}, gain: new FakeParam(), pan: new FakeParam(), frequency: new FakeParam(), Q: new FakeParam(), type: '', start() {}, stop() {}, buffer: null as unknown });
class FakeCtx {
  currentTime = 0; sampleRate = 48000; destination = node(); state = 'running';
  createGain() { return node(); } createBiquadFilter() { return node(); } createStereoPanner() { return node(); }
  createBufferSource() { return node(); } createMediaElementSource() { return node(); }
  createBuffer() { return { getChannelData: () => new Float32Array(1) }; }
  decodeAudioData() { return Promise.resolve({ duration: 1 }); }
  resume() {} close() {}
}
/** Every element made this session, so a test can see which track is up and where it had got to. */
const elements: FakeAudio[] = [];
class FakeAudio {
  src: string; preload = ''; loop = false; currentTime = 0; duration = 180; paused = false;
  private handlers = new Map<string, (() => void)[]>();
  metadataFired = false;
  constructor(src: string) { this.src = decodeURIComponent(src); elements.push(this); }
  addEventListener(k: string, fn: () => void) { (this.handlers.get(k) ?? this.handlers.set(k, []).get(k)!).push(fn); }
  removeEventListener() {} play() { this.paused = false; return Promise.resolve(); } pause() { this.paused = true; }
  removeAttribute() {} load() {}
  fire(k: string) { for (const fn of this.handlers.get(k) ?? []) fn(); }
  get track() { return this.src.split('/').pop()!.replace('.mp3', ''); }
}
const g = globalThis as unknown as Record<string, unknown>;
g.window = { AudioContext: FakeCtx, addEventListener() {}, removeEventListener() {},
  setTimeout: (fn: () => void, ms: number) => { timers.push({ at: now + ms, fn }); return timers.length; } };
g.document = { addEventListener() {}, removeEventListener() {}, visibilityState: 'visible', hasFocus: () => true };
g.performance = { now: () => now };
g.Audio = FakeAudio;
g.fetch = () => Promise.reject(new Error('no network in this test'));
/**
 * Advance the clock: fire anything the audio module scheduled, let a playing element's own clock
 * run on (which is what makes the resume test mean anything), hand any new element its metadata,
 * and tick the audio the way the render loop does.
 */
const advance = (audio: { update(dt: number): void }, seconds: number, step = 0.25) => {
  for (let t = 0; t < seconds; t += step) {
    now += step * 1000;
    for (const el of elements) {
      if (!el.metadataFired) { el.metadataFired = true; el.fire('loadedmetadata'); }
      if (!el.paused) el.currentTime += step;
    }
    for (const timer of timers.splice(0).sort((a, b) => a.at - b.at)) (timer.at <= now ? timer.fn() : timers.push(timer));
    audio.update(step);
  }
};

for (const era of [CAMBRIAN, DEVONIAN]) {
  selectEra(era);
  const { GameAudio } = await import('../src/audio/audio');
  const { AREA_ENTER, AREA_LEAVE, themeFor } = await import('../src/audio/music');
  const calm = themeFor('shallows')!, danger = themeFor('basin')!;
  ok(calm && danger, `${era.id}: both area themes are loaded (${calm?.name} / ${danger?.name})`);

  elements.length = 0; timers.length = 0; now = 0;
  const audio = new GameAudio();
  audio.init();
  const playing = () => elements.filter((e) => !e.paused).map((e) => e.track);
  const front = () => audio.nowPlaying;
  const opener = front();
  ok(!!opener && opener !== calm.name && opener !== danger.name, `${era.id}: opens on a rotation track (${opener})`);

  // --- entering an area waits out AREA_ENTER, then changes ---
  audio.setBiome('basin' as Biome);
  advance(audio, AREA_ENTER - 1);
  ok(front() === opener, `${era.id}: a second short of the dwell it has not changed yet (${front()})`);
  advance(audio, 2);
  ok(front() === danger.name, `${era.id}: past the dwell it crossfades to the area theme (${front()})`);
  ok(playing().includes(opener!), `${era.id}: ...with the outgoing track still running, so it is a crossfade`);
  ok(elements.find((e) => e.track === danger.name)!.loop, `${era.id}: an area theme loops rather than handing back to the rotation`);

  // --- dipping out for less than AREA_LEAVE changes nothing ---
  const themeEl = elements.find((e) => e.track === danger.name)!;
  themeEl.currentTime = 42;
  audio.setBiome('shelf' as Biome);
  advance(audio, AREA_LEAVE - 1);
  ok(front() === danger.name, `${era.id}: a dip out shorter than the leave dwell is ignored (${front()})`);
  audio.setBiome('basin' as Biome);
  advance(audio, 2);
  ok(front() === danger.name, `${era.id}: ...and coming back leaves it playing, uninterrupted`);
  ok(elements.filter((e) => e.track === danger.name).length === 1, `${era.id}: ...on the same element, not a second copy`);

  // --- staying away hands the score back to where the rotation had got to ---
  audio.setBiome('shelf' as Biome);
  advance(audio, AREA_LEAVE + 2);
  ok(front() === opener, `${era.id}: away past the leave dwell, the rotation track comes back (${front()})`);
  const resumed = elements.filter((e) => e.track === opener).at(-1)!;
  ok(resumed.currentTime > 0, `${era.id}: ...resumed where it was rather than from the top (${resumed.currentTime.toFixed(1)}s)`);

  // --- and the fade reverses if the player turns round inside it ---
  audio.setBiome('basin' as Biome);
  advance(audio, AREA_ENTER + 1);
  ok(front() === danger.name, `${era.id}: back into the deep, back to the deep theme`);
  const before = elements.length;
  audio.setBiome('shelf' as Biome);
  advance(audio, AREA_LEAVE + 1);
  audio.setBiome('basin' as Biome);
  advance(audio, AREA_ENTER + 1);
  ok(front() === danger.name && elements.length === before, `${era.id}: a there-and-back inside the fade reuses the voices (${elements.length - before} new elements)`);
  audio.dispose();
}
console.log(`\nall ${passes} area-score checks passed`);
