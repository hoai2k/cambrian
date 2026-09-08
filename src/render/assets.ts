import { assetPaths } from '../content/asset-paths';
import { creaturePortrait } from '../shared/creature-images';
import { ACTIVE_ERA } from '../content';
/**
 * Priority asset loader. Everything heavy (creature GLBs, card images, sound files) goes through one
 * queue so the title screen can appear as soon as the first creature is in, and idle time on the
 * title / select screens streams the rest in the order the player is most likely to need it.
 */
import { CREATURE_IDS, type CreatureId } from '../sim/creatures';
import { ensureLoaded } from './creature';
import { SAMPLES, sfxUrl } from '../audio/audio';
import { appBase } from '../shared/base';

export type AssetKind = 'glb' | 'lod' | 'thumb' | 'select' | 'ui' | 'sfx';
export interface AssetItem { key: string; kind: AssetKind; url: string; size: number; priority: number; status: 'queued' | 'loading' | 'done' | 'failed'; loaded: number; }
export interface AssetProgress { loaded: number; total: number; fraction: number; done: number; count: number; current?: string; ready: Set<CreatureId>; }

/** Known byte sizes so the bar is honest before the first request returns. */
export const GLB_SIZES: Readonly<Partial<Record<CreatureId, number>>> = ACTIVE_ERA.assets.modelBytes;
/** The two images the pick screen actually draws: a 256x192 grid tile and a 1600x1200 hero. */
const THUMB_SIZE = 60_000, SELECT_SIZE = 700_000;

/**
 * Every sample the active era can play, taken from the audio library itself rather than a list
 * kept alongside it. An era registers its own sounds before this runs (see src/devonian/main.tsx),
 * so the Devonian warms its own library and the Cambrian warms its own; neither fetches the
 * other's. `sfxUrl` is the audio module's own resolver, which knows an era's sounds live in a
 * directory of their own.
 */
export const sfxFiles = () => [...new Set(Object.values(SAMPLES).flat())];
/** Sounds the menus use, which are worth having before anything a match needs. */
const UI_SFX = ['ui-start', 'ui-confirm', 'ui-move', 'ui-back', 'ui-join'];

/** Never cached at module level: an era entry page sets the base after this module is imported. */
const base = () => appBase();

export class AssetQueue {
  private items = new Map<string, AssetItem>();
  private active = 0;
  private concurrency = 2;
  private listeners = new Set<(p: AssetProgress) => void>();
  readonly ready = new Set<CreatureId>();
  private disposed = false;

  constructor() {
    const B = base();
    // A creature still borrowing another's body has no art of its own either; the pick screen
    // falls back to a placeholder for it at render time. Requesting images that are not there
    // just to have them fail is noise in the network panel and two wasted round trips each.
    const standIns = ACTIVE_ERA.assets.standIns ?? {};
    const hasArt = (id: CreatureId) => !(id in standIns);
    CREATURE_IDS.forEach((id, i) => {
      this.items.set(`glb:${id}`, { key: `glb:${id}`, kind: 'glb', url: `${B}${assetPaths.model(id)}`, size: GLB_SIZES[id]!, priority: 100 + i, status: 'queued', loaded: 0 });
      // The two images the pick screen draws. These used to be the `.card` cutout, which the pick
      // screen never shows — so the grid it does show arrived one request at a time as it opened.
      if (hasArt(id)) {
        this.items.set(`thumb:${id}`, { key: `thumb:${id}`, kind: 'thumb', url: `${B}${creaturePortrait(id, 'thumb').src}`, size: THUMB_SIZE, priority: 200 + i, status: 'queued', loaded: 0 });
        this.items.set(`select:${id}`, { key: `select:${id}`, kind: 'select', url: `${B}${creaturePortrait(id, 'select').src}`, size: SELECT_SIZE, priority: 250 + i, status: 'queued', loaded: 0 });
      }
      // Decimated copies used for anything small on screen. Small files, so they stream early.
      this.items.set(`lod:${id}`, { key: `lod:${id}`, kind: 'lod', url: `${B}${assetPaths.model(id, 1)}`, size: 600_000, priority: 90 + i, status: 'queued', loaded: 0 });
    });
    // The pick screen's other art: one painted panel per mode it offers.
    ACTIVE_ERA.modes.forEach((m, i) => this.items.set(`ui:mode-${m.id}`, {
      key: `ui:mode-${m.id}`, kind: 'ui', url: `${B}${assetPaths.ui(`mode-${m.id}.webp`)}`, size: 40_000, priority: 260 + i, status: 'queued', loaded: 0,
    }));
    sfxFiles().forEach((n, i) => this.items.set(`sfx:${n}`, { key: `sfx:${n}`, kind: 'sfx', url: sfxUrl(n), size: /ambient/.test(n) ? 265_000 : /drone|anoxia/.test(n) ? 145_000 : 12_000, priority: 300 + i, status: 'queued', loaded: 0 }));
  }

  /**
   * Whether the loader may start anything new. The queue is switched off while the player is
   * touching the controls and back on once they have been still for a moment (see App): decoding a
   * creature model blocks the main thread for long enough to swallow a button press, and a menu
   * that drops presses is worse than a model that arrives a second later. Work already in flight
   * finishes either way, so nothing is torn in half.
   */
  private idle = true;
  setIdle(idle: boolean) {
    if (idle === this.idle) return;
    this.idle = idle;
    if (idle) this.pump();
  }

  onProgress(fn: (p: AssetProgress) => void) { this.listeners.add(fn); fn(this.progress()); return () => this.listeners.delete(fn); }

  /**
   * Re-rank the queue. `creatures` are the ones most likely to be needed, in order (selected first,
   * then roster neighbours). Cards for the visible roster come right after the selected models;
   * sounds trail everything but stay ahead of unlikely models once the UI ones are in.
   */
  prioritize(creatures: CreatureId[], phase: 'boot' | 'title' | 'select' | 'playing') {
    for (const id of creatures) this.wanted.add(id);
    const order = [...creatures, ...CREATURE_IDS.filter((c) => !creatures.includes(c))];
    order.forEach((id, i) => {
      const glb = this.items.get(`glb:${id}`)!, lod = this.items.get(`lod:${id}`)!;
      const thumb = this.items.get(`thumb:${id}`), hero = this.items.get(`select:${id}`);
      // Small files that cut distant-creature cost dramatically: load them before the models of
      // creatures nobody picked.
      lod.priority = (phase === 'playing' ? 15 : 90) + i;
      // On the select screen the visible art matters as much as the model of the pick itself.
      glb.priority = (i < creatures.length ? 10 : 100) + i;
      // The whole grid of tiles is what the pick screen opens on, so on the title screen — where
      // the player is about to go there — every tile outranks everything else. The heroes are big
      // and only a few are ever shown, so they follow, in the order a pick is likely.
      if (thumb) thumb.priority = phase === 'playing' ? 60 + i : 1 + i;
      if (hero) hero.priority = phase === 'boot' ? 220 + i : phase === 'title' ? (i < 6 ? 22 + i : 220 + i) : phase === 'select' ? (i < 3 ? 2 + i : 40 + i) : 70 + i;
    });
    // Panels are wanted the moment the pick screen opens, so they ride with the grid tiles.
    ACTIVE_ERA.modes.forEach((m, i) => { const it = this.items.get(`ui:mode-${m.id}`); if (it) it.priority = phase === 'playing' ? 80 + i : 2 + i; });
    for (const [i, n] of sfxFiles().entries()) {
      const it = this.items.get(`sfx:${n}`); if (!it) continue;
      it.priority = (UI_SFX.includes(n) ? 40 : phase === 'playing' ? 20 : 120) + i;
    }
    this.pump();
  }

  /**
   * Creatures whose full-detail model the queue may fetch in the background: the ones the era
   * boots with, plus whatever the players have picked. Everything else stays on its decimated
   * copy until something actually needs the full body, at which point the renderer asks for it
   * directly (`ensureLoaded`) and the loader fetches it then.
   *
   * This is the difference between a menu that streams a handful of models and one that streams
   * the whole roster: the Devonian ships 302 MB of creature models against the Cambrian's 113 MB,
   * and hoovering all of it up behind the title screen is felt as lag on every frame that has to
   * share the main thread with a meshopt decode.
   */
  private wanted = new Set<CreatureId>(ACTIVE_ERA.defaults.boot);

  private pump() {
    if (this.disposed || !this.idle) return;
    while (this.active < this.concurrency) {
      const next = [...this.items.values()]
        .filter((i) => i.status === 'queued' && (i.kind !== 'glb' || this.wanted.has(i.key.slice(4) as CreatureId)))
        .sort((a, b) => a.priority - b.priority)[0];
      if (!next) break;
      void this.run(next);
    }
  }

  private async run(item: AssetItem) {
    this.active++; item.status = 'loading'; this.emit(item.key);
    try {
      if (item.kind === 'glb') {
        const id = item.key.slice(4) as CreatureId;
        await ensureLoaded(id, (loaded, total) => { item.loaded = loaded; if (total > 0) item.size = total; this.emit(item.key); });
        this.ready.add(id);
      } else if (item.kind === 'lod') {
        await ensureLoaded(item.key.slice(4) as CreatureId, (loaded, total) => { item.loaded = loaded; if (total > 0) item.size = total; this.emit(item.key); }, 1);
      } else if (item.kind === 'ui') {
        await new Promise<void>((res, rej) => { const img = new Image(); img.onload = () => res(); img.onerror = () => rej(new Error('img')); img.src = item.url; });
      } else if (item.kind === 'thumb' || item.kind === 'select') {
        await new Promise<void>((res, rej) => {
          const img = new Image();
          const kind = item.kind === 'thumb' ? 'thumb' as const : 'select' as const;
          const id = item.key.slice(kind.length + 1);
          const fallback = `${base()}${creaturePortrait(id, kind).fallback}`;
          let triedFallback = item.url === fallback;
          img.onload = () => res();
          img.onerror = () => {
            if (triedFallback) { rej(new Error('img')); return; }
            triedFallback = true; img.src = fallback;
          };
          img.src = item.url;
        });
      } else {
        const res = await fetch(item.url); if (!res.ok) throw new Error(String(res.status));
        item.size = Number(res.headers.get('content-length')) || item.size;
        await res.arrayBuffer(); // primes the HTTP cache; the audio module fetches from cache when it decodes
      }
      item.loaded = item.size; item.status = 'done';
    } catch { item.status = 'failed'; item.loaded = item.size; }
    this.active--; this.emit(); this.pump();
  }

  progress(): AssetProgress {
    let loaded = 0, total = 0, done = 0, count = 0; let current: string | undefined;
    for (const it of this.items.values()) {
      total += it.size; loaded += Math.min(it.loaded, it.size); count++;
      if (it.status === 'done' || it.status === 'failed') done++;
      if (it.status === 'loading' && !current && it.kind === 'glb') current = it.key.slice(4);
    }
    return { loaded, total, fraction: total ? loaded / total : 1, done, count, current, ready: this.ready };
  }
  /** Progress of just the creatures that matter right now (for the boot screen / start gate). */
  subsetFraction(ids: CreatureId[]) {
    let l = 0, t = 0;
    for (const id of ids) { const it = this.items.get(`glb:${id}`)!; l += Math.min(it.loaded, it.size); t += it.size; }
    return t ? l / t : 1;
  }
  isReady(id: CreatureId) { return this.ready.has(id); }
  /** For the headless checks: whether the loader is currently allowed to start anything. */
  get isIdle() { return this.idle; }
  /** For the headless checks: how many items are queued, loading and done. */
  counts() { const c = { queued: 0, loading: 0, done: 0, failed: 0 }; for (const i of this.items.values()) c[i.status]++; return c; }
  /**
   * Whether this creature's pick-screen tile is in. The boot gate waits on it before showing the
   * title. A creature with no art of its own has nothing to wait for, so it is reported ready
   * rather than stalling the gate until its timeout.
   */
  isCardReady(id: CreatureId) { const it = this.items.get(`thumb:${id}`); return !it || it.status === 'done' || it.status === 'failed'; }
  private emit(_key?: string) { const p = this.progress(); for (const fn of this.listeners) fn(p); }
  dispose() { this.disposed = true; this.listeners.clear(); }
}
