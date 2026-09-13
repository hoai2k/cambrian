/**
 * Position transplant for Devonian sculpt-port candidates whose rebuild has no UV map and
 * placeholder materials, so `transplant-materials.mjs`'s index-based attribute copy cannot apply
 * (the shipped model's vertices are split along UV seams; the rebuild's are not, so shipped and
 * rebuild primitives never have matching counts).
 *
 *   node tools/devonian/transplant-positions.mjs <shipped.glb> <base.glb> <candidate.glb> <out.glb>
 *
 * Keeps the shipped GLB entirely -- materials, textures, UVs, tangents, skins, weights,
 * animations, sockets, extras -- and replaces only its vertex POSITIONs (and, from those,
 * recomputed NORMALs) with the port's deformed positions. The correspondence is found in two
 * stages:
 *
 *   1. base <-> candidate: `base` is a bare rebuild from the port's own builder with unchanged
 *      proportions (so its positions reproduce the shipped ones); `candidate` is the same builder
 *      with the sculpted edit applied. Built by the same code, a named mesh's primitives are
 *      normally index-aligned one for one between the two files (same vertex count and order,
 *      only the sculpted region's positions differ) -- that is asserted per mesh and used
 *      directly where it holds. Blender's Decimate is position-sensitive, though, so a mesh split
 *      across several primitives by material can decimate to a slightly different vertex count
 *      per primitive between the two files even when the *mesh's* pooled total is essentially
 *      unchanged (observed on both shipped creatures' LOD1: a few dozen vertices out of several
 *      thousand on an unrelated eye mesh, a single vertex out of ~24,000 on the sculpted body
 *      mesh). Where a mesh's primitives are not all individually count-matched, this pools that
 *      mesh's own primitives on each side and pairs them by nearest root-frame position instead
 *      -- reported as such, with the pairing distance, rather than silently assumed exact.
 *
 *   2. shipped <-> base: every shipped vertex, regardless of which (UV-seam-split) primitive it
 *      lives in, is matched by root-frame position against *all* base vertices gathered above,
 *      exactly (quantised to 1e-4 of the shipped model's bounds) or else by nearest neighbour
 *      within a small radius -- reported per shipped primitive, and refused if it is not almost
 *      entirely exact.
 *
 * TANGENT, UVs, COLOR_0, JOINTS_0/WEIGHTS_0, skins, animations, sockets and extras are never
 * touched. The output is written uncompressed -- packaging (meshopt) is a separate step, see
 * tools/devonian/package.mjs, whose NodeIO setup this copies exactly.
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { unpartition } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const [shippedPath, basePath, candidatePath, outPath] = process.argv.slice(2);
if (!shippedPath || !basePath || !candidatePath || !outPath) {
  console.error('usage: transplant-positions.mjs <shipped.glb> <base.glb> <candidate.glb> <out.glb>');
  process.exit(2);
}

await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder,
});

const shippedDoc = await io.read(shippedPath);
const baseDoc = await io.read(basePath);
const candidateDoc = await io.read(candidatePath);

// ---------------------------------------------------------------------------------------------
// geometry helpers: root-frame transforms, a tiny 4x4 inverse, and a uniform-grid nearest-point
// index (exact quantised bucket first, else an expanding-ring nearest search).
// ---------------------------------------------------------------------------------------------

function transformPoint(m, p) {
  const [x, y, z] = p;
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

// Standard cofactor-expansion 4x4 inverse; m is a flat column-major 16-array (glTF/gl-matrix
// convention, matching transformPoint above).
function invertMat4(m) {
  const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
  const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
  const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
  const a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];
  const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
  const det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  assert(Math.abs(det) > 1e-20, 'Singular node world matrix; cannot invert to local frame');
  const inv = 1 / det;
  return [
    (a11 * b11 - a12 * b10 + a13 * b09) * inv,
    (a02 * b10 - a01 * b11 - a03 * b09) * inv,
    (a31 * b05 - a32 * b04 + a33 * b03) * inv,
    (a22 * b04 - a21 * b05 - a23 * b03) * inv,
    (a12 * b08 - a10 * b11 - a13 * b07) * inv,
    (a00 * b11 - a02 * b08 + a03 * b07) * inv,
    (a32 * b02 - a30 * b05 - a33 * b01) * inv,
    (a20 * b05 - a22 * b02 + a23 * b01) * inv,
    (a10 * b10 - a11 * b08 + a13 * b06) * inv,
    (a01 * b08 - a00 * b10 - a03 * b06) * inv,
    (a30 * b04 - a31 * b02 + a33 * b00) * inv,
    (a21 * b02 - a20 * b04 - a23 * b00) * inv,
    (a11 * b07 - a10 * b09 - a12 * b06) * inv,
    (a00 * b09 - a01 * b07 + a02 * b06) * inv,
    (a31 * b01 - a30 * b03 - a32 * b00) * inv,
    (a20 * b03 - a21 * b01 + a22 * b00) * inv,
  ];
}

function dist2(a, b) {
  const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
  return dx * dx + dy * dy + dz * dz;
}

class SpatialIndex {
  constructor(cellSize) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }
  cellCoord(p) {
    return [Math.round(p[0] / this.cellSize), Math.round(p[1] / this.cellSize), Math.round(p[2] / this.cellSize)];
  }
  insert(pos, value) {
    const [cx, cy, cz] = this.cellCoord(pos);
    const key = `${cx},${cy},${cz}`;
    let bucket = this.cells.get(key);
    if (!bucket) { bucket = []; this.cells.set(key, bucket); }
    bucket.push({ pos, value });
  }
  // Exact hit: the query's own quantised cell, nearest entry within it.
  exact(pos) {
    const [cx, cy, cz] = this.cellCoord(pos);
    const bucket = this.cells.get(`${cx},${cy},${cz}`);
    if (!bucket) return null;
    let best = null, bestD = Infinity;
    for (const e of bucket) { const d = dist2(e.pos, pos); if (d < bestD) { bestD = d; best = e; } }
    return best ? { value: best.value, distance: Math.sqrt(bestD) } : null;
  }
  // Expanding-ring nearest search over the grid. Stops once the closest match found so far is
  // provably closer than anything an unexplored ring could contain.
  nearest(pos, maxRing = 4096) {
    const [cx, cy, cz] = this.cellCoord(pos);
    let best = null, bestD = Infinity;
    for (let r = 0; r <= maxRing; r++) {
      if (best !== null && r * this.cellSize > Math.sqrt(bestD) + this.cellSize) break;
      let any = false;
      for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) !== r) continue;
        const bucket = this.cells.get(`${cx + dx},${cy + dy},${cz + dz}`);
        if (!bucket) continue;
        any = true;
        for (const e of bucket) { const d = dist2(e.pos, pos); if (d < bestD) { bestD = d; best = e; } }
      }
      if (r === 0) any = true; // always look at least at the centre cell before judging emptiness
    }
    return best ? { value: best.value, distance: Math.sqrt(bestD) } : null;
  }
}

// ---------------------------------------------------------------------------------------------
// collect (node, mesh, primitiveIndex, primitive, worldMatrix) for every mesh primitive reachable
// from a document's scenes, in traversal order.
// ---------------------------------------------------------------------------------------------

function collectPrimitives(doc) {
  const out = [];
  for (const scene of doc.getRoot().listScenes()) {
    scene.traverse((node) => {
      const mesh = node.getMesh();
      if (!mesh) return;
      const worldMatrix = Array.from(node.getWorldMatrix());
      mesh.listPrimitives().forEach((prim, primIndex) => {
        const pos = prim.getAttribute('POSITION');
        if (!pos) return;
        out.push({ node, mesh, meshName: mesh.getName(), nodeName: node.getName(), primIndex, prim, pos, worldMatrix });
      });
    });
  }
  return out;
}

function rootFramePositions(entry) {
  const { pos, worldMatrix } = entry;
  const n = pos.getCount();
  const v = [0, 0, 0];
  const out = new Array(n);
  for (let i = 0; i < n; i++) { pos.getElement(i, v); out[i] = transformPoint(worldMatrix, v); }
  return out;
}

function groupByMeshName(entries) {
  const groups = new Map();
  for (const e of entries) {
    let g = groups.get(e.meshName);
    if (!g) { g = []; groups.set(e.meshName, g); }
    g.push(e);
  }
  // Stable order: as encountered (primIndex ascending within a mesh already holds from traversal).
  return groups;
}

// ---------------------------------------------------------------------------------------------
// stage 1: base <-> candidate correspondence, per named mesh.
// ---------------------------------------------------------------------------------------------

const baseEntries = collectPrimitives(baseDoc);
const candidateEntries = collectPrimitives(candidateDoc);
const baseGroups = groupByMeshName(baseEntries);
const candidateGroups = groupByMeshName(candidateEntries);

console.log(`transplant-positions: shipped=${shippedPath}`);
console.log(`  base=${basePath}`);
console.log(`  candidate=${candidatePath}`);
console.log('-- stage 1: base <-> candidate --');

// pairs: [{ basePos:[x,y,z], candidatePos:[x,y,z] }] in the model's root frame, pooled globally.
const correspondences = [];
let meshesIndexAligned = 0, meshesPositionPaired = 0, meshesUnmatched = 0;

for (const [meshName, baseEntriesForMesh] of baseGroups) {
  const candidateEntriesForMesh = candidateGroups.get(meshName);
  if (!candidateEntriesForMesh) {
    meshesUnmatched++;
    console.log(`  UNMATCHED  "${meshName}" -- no candidate mesh with this name; left untransplanted`);
    continue;
  }
  const basePooled = baseEntriesForMesh.flatMap(rootFramePositions);
  const candidatePooled = candidateEntriesForMesh.flatMap(rootFramePositions);

  // Fast path: every primitive, in order, has an equal vertex count on both sides -- true index
  // alignment, per primitive, is then exactly the pooled concatenation order too.
  const perPrimitiveAligned = baseEntriesForMesh.length === candidateEntriesForMesh.length &&
    baseEntriesForMesh.every((e, i) => e.pos.getCount() === candidateEntriesForMesh[i].pos.getCount());

  if (perPrimitiveAligned) {
    assert.equal(basePooled.length, candidatePooled.length);
    for (let i = 0; i < basePooled.length; i++) correspondences.push({ basePos: basePooled[i], candidatePos: candidatePooled[i] });
    meshesIndexAligned++;
    console.log(`  OK         "${meshName}" -- ${baseEntriesForMesh.length} primitive(s), index-aligned, ${basePooled.length} vertices`);
    continue;
  }

  // Fallback: Decimate landed on a different vertex count (usually per sub-primitive of a
  // material-split mesh) between the two files. Pool the mesh's own primitives on each side and
  // pair by nearest root-frame position instead -- honest about the approximation, and reported.
  // The grid cell is sized off this pool's own point spacing (its bounds divided by a cube root
  // of its count) rather than the whole model's 1e-4 quantum: at pool scale that quantum is far
  // finer than the gap between neighbouring vertices, so almost every cell would hold at most one
  // point and an exact-quantised miss would need to expand many empty rings to find another --
  // this is a plain nearest-neighbour search, not the exact/fallback distinction stage 3 makes.
  const spacing = boundsOf(candidatePooled) / Math.max(1, Math.cbrt(candidatePooled.length)) || 1e-6;
  const grid = new SpatialIndex(spacing);
  for (const p of candidatePooled) grid.insert(p, p);
  let worst = 0, sumD = 0;
  for (const p of basePooled) {
    const hit = grid.nearest(p);
    assert(hit, `no candidate vertex at all for mesh "${meshName}"`);
    correspondences.push({ basePos: p, candidatePos: hit.value });
    worst = Math.max(worst, hit.distance);
    sumD += hit.distance;
  }
  meshesPositionPaired++;
  const baseCounts = baseEntriesForMesh.map((e) => e.pos.getCount()).join('+');
  const candCounts = candidateEntriesForMesh.map((e) => e.pos.getCount()).join('+');
  console.log(`  POOLED     "${meshName}" -- primitive counts differ (base ${baseCounts} vs candidate ${candCounts}); ` +
    `paired ${basePooled.length} base vertices to nearest of ${candidatePooled.length} candidate vertices ` +
    `(mean ${(sumD / basePooled.length).toFixed(6)}, worst ${worst.toFixed(6)})`);
}
for (const meshName of candidateGroups.keys()) {
  if (!baseGroups.has(meshName)) console.log(`  UNMATCHED  "${meshName}" -- candidate mesh has no base counterpart`);
}
console.log(`  ${meshesIndexAligned} mesh(es) index-aligned, ${meshesPositionPaired} mesh(es) position-paired, ${meshesUnmatched} unmatched`);
assert(correspondences.length > 0, 'No base/candidate correspondence at all; refusing to transplant');

function boundsOf(points) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const p of points) for (let k = 0; k < 3; k++) { if (p[k] < lo[k]) lo[k] = p[k]; if (p[k] > hi[k]) hi[k] = p[k]; }
  return Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]);
}

// ---------------------------------------------------------------------------------------------
// stage 2: the global base spatial hash, keyed on quantised root-frame position.
// ---------------------------------------------------------------------------------------------

const shippedEntries = collectPrimitives(shippedDoc);
const shippedPooledForBounds = shippedEntries.flatMap(rootFramePositions);
const bounds = boundsOf(shippedPooledForBounds);
assert(bounds > 0, 'Degenerate shipped model bounds');
const quantStep = bounds * 1e-4;
const refusalThreshold = bounds * 1e-3;

const baseHash = new SpatialIndex(quantStep);
for (const { basePos, candidatePos } of correspondences) baseHash.insert(basePos, candidatePos);

console.log(`-- stage 2: base spatial hash -- ${correspondences.length} vertices, bounds=${bounds.toFixed(4)}, ` +
  `quantise=${quantStep.toExponential(3)}, refusal beyond=${refusalThreshold.toExponential(3)}`);

// ---------------------------------------------------------------------------------------------
// stage 3: remap every shipped vertex; recompute smooth normals from the new positions.
// ---------------------------------------------------------------------------------------------

console.log('-- stage 3: shipped vertex remap --');
let anyRefused = false;
const primReports = [];

for (const entry of shippedEntries) {
  const { prim, pos, worldMatrix, meshName, primIndex } = entry;
  const n = pos.getCount();
  const inv = invertMat4(worldMatrix);
  const newLocal = new Float32Array(n * 3);
  let exactCount = 0, fallbackCount = 0, badFallbackCount = 0, worstFallback = 0;
  const v = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    pos.getElement(i, v);
    const world = transformPoint(worldMatrix, v);
    let hit = baseHash.exact(world);
    if (hit) exactCount++;
    else {
      hit = baseHash.nearest(world);
      assert(hit, `no base vertex found at all for a vertex of "${meshName}"#${primIndex}`);
      fallbackCount++;
      if (hit.distance > refusalThreshold) { badFallbackCount++; worstFallback = Math.max(worstFallback, hit.distance); }
    }
    const local = transformPoint(inv, hit.value);
    newLocal[i * 3] = local[0]; newLocal[i * 3 + 1] = local[1]; newLocal[i * 3 + 2] = local[2];
  }
  pos.setArray(newLocal);

  // Area-weighted smooth normals from the new local-frame positions.
  const normals = new Float64Array(n * 3);
  const indices = prim.getIndices();
  const mode = prim.getMode();
  if (mode !== 4 /* TRIANGLES */) {
    console.log(`  WARNING    "${meshName}"#${primIndex} -- primitive mode ${mode} is not TRIANGLES; normals left unchanged`);
  } else {
    const idx = indices ? indices.getArray() : null;
    const triCount = idx ? idx.length / 3 : n / 3;
    const p0 = [0, 0, 0], p1 = [0, 0, 0], p2 = [0, 0, 0];
    for (let t = 0; t < triCount; t++) {
      const i0 = idx ? idx[t * 3] : t * 3, i1 = idx ? idx[t * 3 + 1] : t * 3 + 1, i2 = idx ? idx[t * 3 + 2] : t * 3 + 2;
      p0[0] = newLocal[i0 * 3]; p0[1] = newLocal[i0 * 3 + 1]; p0[2] = newLocal[i0 * 3 + 2];
      p1[0] = newLocal[i1 * 3]; p1[1] = newLocal[i1 * 3 + 1]; p1[2] = newLocal[i1 * 3 + 2];
      p2[0] = newLocal[i2 * 3]; p2[1] = newLocal[i2 * 3 + 1]; p2[2] = newLocal[i2 * 3 + 2];
      const e1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
      const e2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
      const fn = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      for (const i of [i0, i1, i2]) { normals[i * 3] += fn[0]; normals[i * 3 + 1] += fn[1]; normals[i * 3 + 2] += fn[2]; }
    }
    const normalsOut = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const x = normals[i * 3], y = normals[i * 3 + 1], z = normals[i * 3 + 2];
      const len = Math.hypot(x, y, z);
      if (len > 1e-20) { normalsOut[i * 3] = x / len; normalsOut[i * 3 + 1] = y / len; normalsOut[i * 3 + 2] = z / len; }
      else { normalsOut[i * 3] = 0; normalsOut[i * 3 + 1] = 1; normalsOut[i * 3 + 2] = 0; }
    }
    let normalAccessor = prim.getAttribute('NORMAL');
    if (!normalAccessor) {
      normalAccessor = shippedDoc.createAccessor().setType('VEC3');
      prim.setAttribute('NORMAL', normalAccessor);
    }
    normalAccessor.setArray(normalsOut);
  }

  const fallbackPct = (100 * fallbackCount / n).toFixed(3);
  const badPct = (100 * badFallbackCount / n).toFixed(3);
  const refused = badFallbackCount / n > 0.01;
  if (refused) anyRefused = true;
  primReports.push({ meshName, primIndex, n, exactCount, fallbackCount, badFallbackCount, worstFallback, refused });
  console.log(`  ${refused ? 'REFUSED' : 'OK'}       "${meshName}"#${primIndex} -- ${n} vertices, ${exactCount} exact, ` +
    `${fallbackCount} fallback (${fallbackPct}%), ${badFallbackCount} beyond threshold (${badPct}%), worst=${worstFallback.toExponential(3)}`);
}

if (anyRefused) {
  console.error('transplant-positions: REFUSED -- at least one primitive exceeded 1% fallbacks beyond 1e-3 of the bounds');
  process.exit(1);
}

await shippedDoc.transform(unpartition());
const bytes = await io.writeBinary(shippedDoc);
await writeFile(outPath, bytes);
console.log(`wrote ${outPath} (${bytes.length} bytes)`);
