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
import { appBase } from '../shared/base';

export type AssetKind = 'glb' | 'lod' | 'card' | 'sfx';
export interface AssetItem { key: string; kind: AssetKind; url: string; size: number; priority: number; status: 'queued' | 'loading' | 'done' | 'failed'; loaded: number; }
export interface AssetProgress { loaded: number; total: number; fraction: number; done: number; count: number; current?: string; ready: Set<CreatureId>; }

/** Known byte sizes so the bar is honest before the first request returns. */
export const GLB_SIZES: Readonly<Partial<Record<CreatureId, number>>> = ACTIVE_ERA.assets.modelBytes;
const CARD_SIZE = 1_010_000;
export const SFX_FILES = ['ui-start', 'ui-confirm', 'ui-move', 'ui-back', 'ui-join', 'bite-1', 'bite-2', 'bite-3', 'crunch-1', 'crunch-2', 'hit-light-1', 'hit-light-2', 'hit-heavy-1', 'hit-heavy-2', 'ambient-reef', 'giant-drone', 'heartbeat', 'parry', 'guard-break', 'stagger', 'dodge-1', 'dodge-2', 'burst', 'silt', 'grab', 'kill', 'death', 'tier-up', 'hunted', 'escape', 'sense', 'ability', 'won'];

const BASE = appBase();

export class AssetQueue {
  private items = new Map<string, AssetItem>();
  private active = 0;
  private concurrency = 2;
  private listeners = new Set<(p: AssetProgress) => void>();
  readonly ready = new Set<CreatureId>();
  private disposed = false;

  constructor() {
    CREATURE_IDS.forEach((id, i) => {
      this.items.set(`glb:${id}`, { key: `glb:${id}`, kind: 'glb', url: `${BASE}${assetPaths.model(id)}`, size: GLB_SIZES[id]!, priority: 100 + i, status: 'queued', loaded: 0 });
      this.items.set(`card:${id}`, { key: `card:${id}`, kind: 'card', url: `${BASE}${creaturePortrait(id, 'card').src}`, size: CARD_SIZE, priority: 200 + i, status: 'queued', loaded: 0 });
      // Decimated copies used for anything small on screen. Small files, so they stream early.
      this.items.set(`lod:${id}`, { key: `lod:${id}`, kind: 'lod', url: `${BASE}${assetPaths.model(id, 1)}`, size: 600_000, priority: 90 + i, status: 'queued', loaded: 0 });
    });
    SFX_FILES.forEach((n, i) => this.items.set(`sfx:${n}`, { key: `sfx:${n}`, kind: 'sfx', url: `${BASE}${assetPaths.sfx(n)}`, size: n.startsWith('ambient') ? 265_000 : n.startsWith('giant') ? 145_000 : 12_000, priority: 300 + i, status: 'queued', loaded: 0 }));
  }

  onProgress(fn: (p: AssetProgress) => void) { this.listeners.add(fn); fn(this.progress()); return () => this.listeners.delete(fn); }

  /**
   * Re-rank the queue. `creatures` are the ones most likely to be needed, in order (selected first,
   * then roster neighbours). Cards for the visible roster come right after the selected models;
   * sounds trail everything but stay ahead of unlikely models once the UI ones are in.
   */
  prioritize(creatures: CreatureId[], phase: 'boot' | 'title' | 'select' | 'playing') {
    const order = [...creatures, ...CREATURE_IDS.filter((c) => !creatures.includes(c))];
    order.forEach((id, i) => {
      const glb = this.items.get(`glb:${id}`)!; const card = this.items.get(`card:${id}`)!; const lod = this.items.get(`lod:${id}`)!;
      // Small files that cut distant-creature cost dramatically: load them before the models of
      // creatures nobody picked.
      lod.priority = (phase === 'playing' ? 15 : 90) + i;
      // On the select screen the visible cards matter as much as the model of the pick itself.
      glb.priority = (i < creatures.length ? 10 : 100) + i;
      card.priority = phase === 'boot' || phase === 'title' ? 1 + i : phase === 'select' ? (i < 3 ? 3 + i : 30 + i) : 50 + i;
    });
    SFX_FILES.forEach((n, i) => { const it = this.items.get(`sfx:${n}`)!; it.priority = (n.startsWith('ui') ? 40 : phase === 'playing' ? 20 : 120) + i; });
    this.pump();
  }

  private pump() {
    if (this.disposed) return;
    while (this.active < this.concurrency) {
      const next = [...this.items.values()].filter((i) => i.status === 'queued').sort((a, b) => a.priority - b.priority)[0];
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
      } else if (item.kind === 'card') {
        await new Promise<void>((res, rej) => {
          const img = new Image();
          const fallback = `${BASE}${creaturePortrait(item.key.slice(5), 'card').fallback}`;
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
  isCardReady(id: CreatureId) { return this.items.get(`card:${id}`)?.status === 'done'; }
  private emit(_key?: string) { const p = this.progress(); for (const fn of this.listeners) fn(p); }
  dispose() { this.disposed = true; this.listeners.clear(); }
}
