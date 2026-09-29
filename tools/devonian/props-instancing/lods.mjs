/**
 * Reduced-detail copies of the Devonian's instanced plants, drawn past `SCENERY_LOD_NEAR` in
 * src/render/sea.ts. Writes `<id>.lod1.glb` beside each prop in public/assets/devonian/props-instanced/.
 * Run: node tools/devonian/props-instancing/lods.mjs
 *
 * The forest and the nursery are carpeted with these at densities that are the cover a hatchling
 * hides in, so a far chunk draws a thousand or more of each: at full detail, the crinoids and the
 * algae alone were 5.5 M of the 9.3 M triangles in a Devonian frame. A far chunk is fog-washed and a
 * plant in it is a few dozen pixels tall, so it gets the same silhouette in a fifth of the geometry.
 *
 * Most kinds are closed solid shapes and meshopt's simplifier does them well at a fixed ratio. The
 * crinoid is not, and has to be rebuilt by structure: it is 727 separate pieces — seventy stacked
 * stem discs of eighteen triangles each, a calyx, ten ribbon arms and six hundred single-triangle
 * pinnules — and a simplifier collapses every thin piece to nothing, leaving a dotted stick with a
 * ball on it. So the stem becomes one six-sided tube through the discs' own centres and colours, the
 * calyx is simplified on its own, the arms are kept whole, and every third pinnule is kept at a
 * size that covers what the other two did.
 *
 * Render-only: collision is measured off the full prop (`npm run shapes`), and a copy that kept the
 * silhouette keeps that true. The copies are checked against their source here — the same material,
 * pigment and pivot, and a bounding box within a few percent — and each run prints the budget.
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { simplify, weld } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '../../..');
const dir = path.join(root, 'public/assets/devonian/props-instanced');

/** How much of each plant a far copy keeps. Chosen by rendering each beside its source. */
const LODS = {
  'devonian-crinoid': 'crinoid',
  'devonian-algal-clump': 0.15,
  'devonian-stromatoporoid': 0.15,
  'devonian-tabulate': 0.15,
  'devonian-rugose': 0.25,
  'devonian-bryozoan': 0.25,
  'devonian-log': 0.25,
};

await Promise.all([MeshoptSimplifier.ready, MeshoptEncoder.ready, MeshoptDecoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

const primOf = (doc) => {
  const meshes = doc.getRoot().listMeshes();
  assert.equal(meshes.length, 1); assert.equal(meshes[0].listPrimitives().length, 1);
  return meshes[0].listPrimitives()[0];
};
const trisOf = (p) => p.getIndices().getCount() / 3;
const boundsOf = (p) => {
  const pos = p.getAttribute('POSITION'), lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.getCount(); i++) pos.getElement(i, []).forEach((x, k) => { lo[k] = Math.min(lo[k], x); hi[k] = Math.max(hi[k], x); });
  return { lo, hi };
};

/** The crinoid, rebuilt from its own parts (see the top of the file). */
function crinoid(doc) {
  const p = primOf(doc);
  const P = p.getAttribute('POSITION'), N = p.getAttribute('NORMAL'), C = p.getAttribute('COLOR_0');
  const idx = p.getIndices().getArray(), n = P.getCount();
  const pos = (i) => P.getElement(i, []), col = (i) => C.getElement(i, []);
  // Pieces: vertices that share a position are one piece whatever their normals say.
  const seen = new Map(), rep = new Int32Array(n);
  for (let i = 0; i < n; i++) { const k = pos(i).map((x) => Math.round(x * 1e4)).join(','); if (!seen.has(k)) seen.set(k, i); rep[i] = seen.get(k); }
  const parent = Int32Array.from({ length: n }, (_, i) => i);
  const find = (x) => { while (parent[x] !== x) x = parent[x] = parent[parent[x]]; return x; };
  for (let t = 0; t < idx.length; t += 3) { const a = find(rep[idx[t]]); parent[find(rep[idx[t + 1]])] = a; parent[find(rep[idx[t + 2]])] = a; }
  const pieces = new Map();
  for (let t = 0; t < idx.length; t += 3) {
    const r = find(rep[idx[t]]);
    let c = pieces.get(r);
    if (!c) pieces.set(r, c = { tris: [], lo: [Infinity, Infinity, Infinity], hi: [-Infinity, -Infinity, -Infinity] });
    c.tris.push(t);
    for (let k = 0; k < 3; k++) pos(idx[t + k]).forEach((x, j) => { c.lo[j] = Math.min(c.lo[j], x); c.hi[j] = Math.max(c.hi[j], x); });
  }
  const all = [...pieces.values()];
  const span = (c, j) => c.hi[j] - c.lo[j];
  // The calyx is the largest single piece; stem discs are small closed pieces below it.
  const calyx = all.reduce((a, b) => (b.tris.length > a.tris.length ? b : a));
  const discs = all.filter((c) => c !== calyx && c.tris.length > 4 && span(c, 0) < 0.06 && span(c, 2) < 0.06 && c.hi[1] <= calyx.hi[1]).sort((a, b) => a.lo[1] - b.lo[1]);
  const pinnules = all.filter((c) => c.tris.length === 1 && c.lo[1] > calyx.lo[1]);
  const kept = all.filter((c) => c !== calyx && !discs.includes(c) && !pinnules.includes(c));
  assert(discs.length > 40, `expected a stem of stacked discs, found ${discs.length}`);

  const out = { pos: [], nor: [], col: [], idx: [] };
  const vert = (p3, n3, c3) => { out.pos.push(...p3); out.nor.push(...n3); out.col.push(...c3); return out.pos.length / 3 - 1; };
  const copyTri = (t, scale = 1) => {
    const v = [0, 1, 2].map((k) => pos(idx[t + k]));
    const m = [0, 1, 2].map((j) => (v[0][j] + v[1][j] + v[2][j]) / 3);
    for (let k = 0; k < 3; k++) out.idx.push(vert(v[k].map((x, j) => m[j] + (x - m[j]) * scale), N.getElement(idx[t + k], []), col(idx[t + k])));
  };

  // The stem: one tube through the discs' centres, a ring per `PER_RING` discs, in their colours.
  const SIDES = 6, PER_RING = 6, STEM_SHADE = 0.85;
  const rings = [];
  for (let i = 0; i < discs.length; i += PER_RING) {
    const g = discs.slice(i, i + PER_RING);
    const centre = [0, 1, 2].map((j) => g.reduce((s, c) => s + (c.lo[j] + c.hi[j]) / 2, 0) / g.length);
    const radius = g.reduce((s, c) => s + (span(c, 0) + span(c, 2)) / 4, 0) / g.length;
    const shade = [0, 0, 0, 0]; let count = 0;
    for (const c of g) for (const t of c.tris) for (let k = 0; k < 3; k++) { col(idx[t + k]).forEach((x, j) => { shade[j] += x; }); count++; }
    // The discs have dark gaps between them that a solid tube does not, so it is a shade darker.
    rings.push({ centre, radius, shade: shade.map((x, j) => (x / count) * (j < 3 ? STEM_SHADE : 1)).slice(0, C.getElementSize()) });
  }
  rings[0].centre[1] = discs[0].lo[1];
  rings.push({ ...rings[rings.length - 1], centre: [...rings[rings.length - 1].centre] });
  rings[rings.length - 1].centre[1] = discs[discs.length - 1].hi[1];
  const base = out.pos.length / 3;
  for (const r of rings) for (let s = 0; s < SIDES; s++) {
    const a = (s / SIDES) * Math.PI * 2, dx = Math.cos(a), dz = Math.sin(a);
    vert([r.centre[0] + dx * r.radius, r.centre[1], r.centre[2] + dz * r.radius], [dx, 0, dz], r.shade);
  }
  for (let r = 0; r + 1 < rings.length; r++) for (let s = 0; s < SIDES; s++) {
    const a = base + r * SIDES + s, b = base + r * SIDES + ((s + 1) % SIDES), c = a + SIDES, d = b + SIDES;
    out.idx.push(a, c, b, b, c, d);
  }

  // The calyx, simplified on its own so nothing else can pull its budget.
  const local = new Map(), cpos = [];
  const cidx = [];
  for (const t of calyx.tris) for (let k = 0; k < 3; k++) {
    const v = idx[t + k];
    if (!local.has(v)) { local.set(v, local.size); cpos.push(...pos(v)); }
    cidx.push(local.get(v));
  }
  const [simple] = MeshoptSimplifier.simplify(new Uint32Array(cidx), new Float32Array(cpos), 3, Math.max(24, Math.round(cidx.length * 0.3 / 3) * 3), 0.05, ['LockBorder']);
  const back = [...local.keys()];
  const cbase = out.pos.length / 3;
  for (const v of back) vert(pos(v), N.getElement(v, []), col(v));
  for (const v of simple) out.idx.push(cbase + v);

  // Arms, the holdfast and anything else small enough to be its own shape: kept whole.
  for (const c of kept) for (const t of c.tris) copyTri(t);
  // Every third pinnule, each grown to cover what three did.
  pinnules.forEach((c, i) => { if (i % 3 === 0) copyTri(c.tris[0], Math.sqrt(3)); });

  p.setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(out.pos)).setBuffer(P.getBuffer()));
  p.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(out.nor)).setBuffer(N.getBuffer()));
  p.setAttribute('COLOR_0', doc.createAccessor().setType(C.getType()).setArray(new Float32Array(out.col)).setBuffer(C.getBuffer()));
  p.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(out.idx)).setBuffer(p.getIndices().getBuffer()));
  for (const a of doc.getRoot().listAccessors()) if (!a.listParents().some((x) => x !== doc.getRoot())) a.dispose();
}

for (const [id, how] of Object.entries(LODS)) {
  const src = path.join(dir, `${id}.glb`);
  const doc = await io.read(src);
  for (const e of doc.getRoot().listExtensionsUsed()) if (e.extensionName === EXTMeshoptCompression.EXTENSION_NAME) e.dispose();
  const before = primOf(doc), fullTris = trisOf(before), full = boundsOf(before);
  const material = before.getMaterial().getName();
  if (how === 'crinoid') crinoid(doc);
  else await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: how, error: 0.05 }));
  const p = primOf(doc), tris = trisOf(p), b = boundsOf(p);
  assert(p.getAttribute('COLOR_0'), `${id}: the copy lost its pigment`);
  assert.equal(p.getMaterial().getName(), material);
  assert(Math.abs(b.lo[1] - full.lo[1]) < 1e-3, `${id}: the pivot moved (${b.lo[1]} against ${full.lo[1]})`);
  for (let j = 0; j < 3; j++) {
    const a = full.hi[j] - full.lo[j], c = b.hi[j] - b.lo[j];
    assert(c > a * 0.9 && c < a * 1.1, `${id}: extent ${'xyz'[j]} ${c.toFixed(3)} against ${a.toFixed(3)}`);
  }
  assert(tris < fullTris * 0.35, `${id}: ${tris} triangles is not a reduced copy of ${fullTris}`);
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  const out = path.join(dir, `${id}.lod1.glb`);
  await io.write(out, doc);
  console.log(`${id.padEnd(26)} ${String(fullTris).padStart(5)} -> ${String(tris).padStart(4)} tris (${(tris / fullTris * 100).toFixed(0)}%)  ${fs.statSync(out).size} bytes`);
}
