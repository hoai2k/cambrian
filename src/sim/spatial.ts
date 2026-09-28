import type { Vec3 } from '../shared/math';

/**
 * Cells either side of the origin whose key is a small integer. V8 hashes a small integer (a Smi,
 * 31 bits) directly, where a larger number is a heap double hashed through its bits — and the
 * query below does several lookups per body per step, which made the key the hot path. Past this
 * the key falls back to the full-range packing, on the negative side so the two never collide: the
 * sea is endless and nothing may assume a bound on it, only that most of it is near the middle.
 */
const NEAR = 16384;

/** Cell coordinates to one key: a Smi near the origin, a negative safe integer beyond it. */
function cellKey(cx: number, cz: number) {
  if (cx >= -NEAR && cx < NEAR && cz >= -NEAR && cz < NEAR) return (cx + NEAR) * (2 * NEAR) + (cz + NEAR);
  return -1 - ((cx + 33554432) * 67108864 + (cz + 33554432));
}

/** Simple XZ spatial hash for broad-phase queries. */
export class SpatialHash<T extends { pos: Vec3 }> {
  private cells = new Map<number, T[]>();
  constructor(private cell = 8) {}
  clear() { this.cells.clear(); }
  insert(item: T) {
    const k = cellKey(Math.floor(item.pos.x / this.cell), Math.floor(item.pos.z / this.cell));
    let arr = this.cells.get(k);
    if (!arr) this.cells.set(k, (arr = []));
    arr.push(item);
  }
  rebuild(items: Iterable<T>) { this.clear(); for (const it of items) this.insert(it); }
  /**
   * Where each of `items` (as inserted, in this order) falls in the order `query` returns things
   * in: by cell, x then z, and by insertion within a cell.
   */
  ranks(items: readonly T[]): number[] {
    const c = this.cell;
    const at = items.map((it, i) => ({ i, cx: Math.floor(it.pos.x / c), cz: Math.floor(it.pos.z / c) }));
    at.sort((a, b) => a.cx - b.cx || a.cz - b.cz || a.i - b.i);
    const rank = new Array<number>(items.length);
    at.forEach((a, r) => { rank[a.i] = r; });
    return rank;
  }
  /**
   * Items whose cell is within `r` of (x,z). Caller still needs an exact distance test. The order
   * is part of the contract — cells by x then z, items in insertion order — because callers resolve
   * contacts one after another and the simulation must replay exactly.
   */
  query(x: number, z: number, r: number, out: T[] = []): T[] {
    out.length = 0;
    const c = this.cell, cells = this.cells;
    const x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c);
    const z0 = Math.floor((z - r) / c), z1 = Math.floor((z + r) / c);
    let n = 0;
    for (let cx = x0; cx <= x1; cx++)
      for (let cz = z0; cz <= z1; cz++) {
        const arr = cells.get(cellKey(cx, cz));
        if (arr) for (let i = 0; i < arr.length; i++) out[n++] = arr[i];
      }
    return out;
  }
}

/**
 * Items that each reach a distance of their own, found by what a body can actually touch.
 *
 * `SpatialHash` files an item under the one cell its centre is in, so a caller has to search out to
 * the *largest* reach anything has — which for the flora is one tall plant's, and put some 180
 * plants in front of every body every step to find the one it was touching. This files each item
 * under every cell its own reach covers, so a query only visits the cells the body covers.
 *
 * It returns what a `SpatialHash.query` out to the largest reach would have returned and an exact
 * test would have kept, **in the same order**: callers resolve contacts one after another, so the
 * order is part of the simulation. Each item carries its rank in that order (`SpatialHash.ranks`)
 * and the hits, a handful at most, are sorted back into it. The caller keeps its own exact test.
 */
export class ReachHash<T extends { pos: Vec3 }> {
  private cells = new Map<number, ReachEntry<T>[]>();
  constructor(private cell = 4) {}
  clear() { this.cells.clear(); }
  /** File every item under each cell its disc of `reach(item)` touches. */
  rebuild(items: readonly T[], reach: (item: T) => number, rank: readonly number[]) {
    this.clear();
    const c = this.cell;
    items.forEach((item, i) => {
      const r = reach(item) + SLACK;
      const x0 = Math.floor((item.pos.x - r) / c), x1 = Math.floor((item.pos.x + r) / c);
      const z0 = Math.floor((item.pos.z - r) / c), z1 = Math.floor((item.pos.z + r) / c);
      const e: ReachEntry<T> = { item, reach: r, x0, z0, rank: rank[i] };
      for (let cx = x0; cx <= x1; cx++)
        for (let cz = z0; cz <= z1; cz++) {
          const k = cellKey(cx, cz);
          let arr = this.cells.get(k);
          if (!arr) this.cells.set(k, (arr = []));
          arr.push(e);
        }
    });
  }
  /** Every item whose own reach comes within `r` of (x,z), in rank order. */
  query(x: number, z: number, r: number, out: T[] = []): T[] {
    out.length = 0;
    const c = this.cell, cells = this.cells, hits = this.hits;
    hits.length = 0;
    const x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c);
    const z0 = Math.floor((z - r) / c), z1 = Math.floor((z + r) / c);
    for (let cx = x0; cx <= x1; cx++)
      for (let cz = z0; cz <= z1; cz++) {
        const arr = cells.get(cellKey(cx, cz));
        if (!arr) continue;
        for (let i = 0; i < arr.length; i++) {
          const e = arr[i];
          // An item filed under several of the cells searched is taken from the first of them only:
          // the corner where its own box and the search box start to overlap.
          if (cx !== (e.x0 > x0 ? e.x0 : x0) || cz !== (e.z0 > z0 ? e.z0 : z0)) continue;
          const dx = x - e.item.pos.x, dz = z - e.item.pos.z, R = e.reach + r;
          if (dx * dx + dz * dz <= R * R) hits.push(e);
        }
      }
    if (hits.length > 1) hits.sort(byRank);
    for (let i = 0; i < hits.length; i++) out[i] = hits[i].item;
    hits.length = 0;
    return out;
  }
  private hits: ReachEntry<T>[] = [];
}

interface ReachEntry<T> { item: T; reach: number; x0: number; z0: number; rank: number }
/**
 * Added to every reach, so rounding in this filter can never drop an item the caller's own exact
 * test would have kept: this only has to find a superset, and the caller decides.
 */
const SLACK = 1e-6;
const byRank = (a: { rank: number }, b: { rank: number }) => a.rank - b.rank;
