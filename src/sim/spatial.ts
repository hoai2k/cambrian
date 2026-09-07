import type { Vec3 } from '../shared/math';

/** Simple XZ spatial hash for broad-phase queries. */
export class SpatialHash<T extends { pos: Vec3 }> {
  private cells = new Map<number, T[]>();
  constructor(private cell = 8) {}
  private key(x: number, z: number) {
    return SpatialHash.pack(Math.floor(x / this.cell), Math.floor(z / this.cell));
  }
  /** Cell coordinates to one safe integer: ±33 million cells, so the streamed world never wraps. */
  private static pack(cx: number, cz: number) { return (cx + 33554432) * 67108864 + (cz + 33554432); }
  clear() { this.cells.clear(); }
  insert(item: T) {
    const k = this.key(item.pos.x, item.pos.z);
    let arr = this.cells.get(k);
    if (!arr) this.cells.set(k, (arr = []));
    arr.push(item);
  }
  rebuild(items: Iterable<T>) { this.clear(); for (const it of items) this.insert(it); }
  /** Items whose cell is within `r` of (x,z). Caller still needs an exact distance test. */
  query(x: number, z: number, r: number, out: T[] = []): T[] {
    out.length = 0;
    const c = this.cell;
    const x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c);
    const z0 = Math.floor((z - r) / c), z1 = Math.floor((z + r) / c);
    for (let cx = x0; cx <= x1; cx++)
      for (let cz = z0; cz <= z1; cz++) {
        const arr = this.cells.get(SpatialHash.pack(cx, cz));
        if (arr) for (const it of arr) out.push(it);
      }
    return out;
  }
}
