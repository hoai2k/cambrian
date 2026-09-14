/**
 * What a reviewer has marked on a body, and the file that hands it to a cutting script.
 *
 * The raw Tripo preview bodies carry fins and tails that should not be there, and after welding
 * nineteen of the twenty-one are a *single connected surface* — so no rule can tell the extra fin
 * from the real one, and only a human knows which is which (docs/triassic/preview-mesh-defects.md).
 * This is the machinery behind their pointing: a brush is a sphere in world space, a mark is a
 * vertex index, and a region file is the list of indices plus enough about the mesh it was marked
 * on that applying it to a different mesh is refused rather than silently destructive.
 *
 * Everything here is pure: the brush's "which vertices fall inside this radius" is arithmetic over
 * a position array, which is what `npm run mark` tests without a browser anywhere near it.
 */

/** One mesh of the body on stage, as a region file addresses it. */
export interface MarkMeshInfo {
  /** Ordinal in the file's load order — the address, because names are not unique across exporters. */
  index: number;
  name: string;
  /** Vertices in this mesh. A cutting script refuses a mesh whose count has changed. */
  count: number;
}

/** One byte per vertex per mesh: 1 marked, 0 not. Small enough that a stroke can copy the lot. */
export type Marks = readonly Uint8Array[];

export const emptyMarks = (meshes: readonly { count: number }[]): Uint8Array[] =>
  meshes.map((m) => new Uint8Array(m.count));

export const cloneMarks = (marks: Marks): Uint8Array[] => marks.map((m) => Uint8Array.from(m));

export function markedCount(marks: Marks): number {
  let n = 0;
  for (const mask of marks) for (let i = 0; i < mask.length; i++) if (mask[i]) n++;
  return n;
}

export const totalVertices = (meshes: readonly { count: number }[]): number =>
  meshes.reduce((n, m) => n + m.count, 0);

/**
 * The vertices a brush catches: every one inside a sphere of `radius` about the point the pointer
 * is over. World space, because that is where the pointer's ray hit the surface and where a radius
 * the reviewer can see on screen means something — a mesh-local radius would mean a different size
 * on every model the viewer scales to its stage.
 */
export function brushHits(world: Float32Array, cx: number, cy: number, cz: number, radius: number): number[] {
  const r2 = radius * radius;
  const out: number[] = [];
  for (let i = 0, v = 0; i < world.length; i += 3, v++) {
    const dx = world[i] - cx, dy = world[i + 1] - cy, dz = world[i + 2] - cz;
    if (dx * dx + dy * dy + dz * dz <= r2) out.push(v);
  }
  return out;
}

/** Marks (or unmarks) the hits in place, and says how many vertices actually changed. */
export function paintInto(mask: Uint8Array, hits: readonly number[], erase: boolean): number {
  const want = erase ? 0 : 1;
  let changed = 0;
  for (const v of hits) {
    if (mask[v] === want) continue;
    mask[v] = want;
    changed++;
  }
  return changed;
}

/** A marked region of one mesh, addressed so that applying it to the wrong mesh is detectable. */
export interface RegionMesh {
  index: number;
  name: string;
  /** How many vertices the mesh had when it was marked. */
  vertexCount: number;
  /**
   * The box the marked vertices occupy in the mesh's own coordinates, exactly as the file stores
   * them. A cutting script measures the same box on the vertices it is about to delete: if the
   * indices mean something else there, the box is somewhere else and the cut is refused.
   */
  bounds: { min: [number, number, number]; max: [number, number, number] } | null;
  vertices: number[];
}

export interface RegionFile {
  schema: 'mesh-region/1';
  id: string;
  model: string;
  sha256: string | null;
  markedAt: string;
  note: string;
  /** Vertices in the whole body, so a report can say what share was cut. */
  vertexCount: number;
  markedCount: number;
  /** Per mesh, in the file's load order. This is the authoritative addressing. */
  meshes: RegionMesh[];
  /** A convenience for the single-mesh case, which every Tripo preview is; absent otherwise. */
  vertices?: number[];
}

export interface RegionInput {
  id: string;
  model: string;
  sha256: string | null;
  note: string;
  markedAt: string;
  meshes: readonly MarkMeshInfo[];
  /** Mesh-local positions as the file stores them, three per vertex, one array per mesh. */
  locals: readonly Float32Array[];
  marks: Marks;
}

/**
 * The region file. Only meshes with something marked appear in it — a body whose extra fin is all
 * on one primitive should not export a page of empty arrays — but `vertexCount` counts the whole
 * body, because the share cut is the number a reviewer judges the cut by.
 */
export function buildRegion(input: RegionInput): RegionFile {
  const meshes: RegionMesh[] = [];
  // The mask and the positions are given in the order the meshes are, and `info.index` is what the
  // file is addressed by — the same number in the viewer, but the two are not the same thing and
  // reading one off the other is how a caller marking a single mesh out of a body would get an
  // empty file back.
  for (let m = 0; m < input.meshes.length; m++) {
    const info = input.meshes[m];
    const mask = input.marks[m];
    const local = input.locals[m];
    if (!mask) continue;
    const vertices: number[] = [];
    for (let i = 0; i < mask.length; i++) if (mask[i]) vertices.push(i);
    if (!vertices.length) continue;
    let bounds: RegionMesh['bounds'] = null;
    if (local && local.length >= info.count * 3) {
      const min: [number, number, number] = [Infinity, Infinity, Infinity];
      const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
      for (const v of vertices) {
        for (let k = 0; k < 3; k++) {
          const c = local[v * 3 + k];
          if (c < min[k]) min[k] = c;
          if (c > max[k]) max[k] = c;
        }
      }
      bounds = { min: min.map(round6) as [number, number, number], max: max.map(round6) as [number, number, number] };
    }
    meshes.push({ index: info.index, name: info.name, vertexCount: info.count, bounds, vertices });
  }
  const file: RegionFile = {
    schema: 'mesh-region/1',
    id: input.id,
    model: input.model,
    sha256: input.sha256,
    markedAt: input.markedAt,
    note: input.note,
    vertexCount: totalVertices(input.meshes),
    markedCount: meshes.reduce((n, m) => n + m.vertices.length, 0),
    meshes,
  };
  // One mesh in the file means the addressing has nothing to disambiguate, and a script that only
  // ever meets Tripo previews can read `vertices` straight off. With two it would be a lie by
  // omission, so it is left out and `meshes` is the only answer.
  if (input.meshes.length === 1 && meshes.length === 1) file.vertices = meshes[0].vertices;
  return file;
}

const round6 = (v: number) => Math.round(v * 1e6) / 1e6;

/** "1,204 of 12,059 vertices · 10.0%" — the live readout, and the same words in the export note. */
export function describeMarked(marked: number, total: number): string {
  const share = total > 0 ? (marked / total) * 100 : 0;
  return `${marked.toLocaleString('en')} of ${total.toLocaleString('en')} vertices · ${share.toFixed(share < 1 ? 2 : 1)}%`;
}
