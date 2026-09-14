/**
 * Bake a stretch into a generated body's GLB.
 *
 *   npm run triassic:stretch -- <id>-stretch.json            # say what it would do
 *   npm run triassic:stretch -- <id>-stretch.json --write    # do it
 *   npm run triassic:stretch -- <id>-stretch.json --write --out other.glb
 *
 * (Bundled through esbuild by the npm script, which is how it imports the viewer's own TypeScript
 * rather than keeping a second copy of the maths.)
 *
 * The file comes out of the viewer's stretch mode (`&mode=stretch` on a generated body), and this
 * applies it to `tools/triassic/creatures/<id>/<id>.preview.glb` — the working copy of the raw
 * generation, which `npm run triassic:previews` publishes for the viewer to load. The untouched
 * Tripo output in `<id>/tripo-raw/` is never written to: it is the thing every later artefact is
 * checked against, and a baked GLB that had quietly overwritten it could not be.
 *
 * The warp itself is not implemented here. It is `warp()` and `normalWarp()` from
 * `src/viewer/stretch/stretch.ts`, the same functions the viewer previewed with, so what lands in
 * the file is what was on screen rather than a second implementation that agrees by inspection.
 *
 * Positions move; normals follow the inverse transpose of the map and tangents the map itself, so
 * the generated mesh keeps its own shading instead of being reshaded wholesale by a
 * `computeVertexNormals` it never asked for. Everything else in the file — textures, materials,
 * the node graph — is passed through.
 *
 * After a bake:
 *   node tools/update-asset-sizes.mjs && npm run triassic:previews
 * so the published copy and its manifest match the file that changed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import { fromExport, regionLength, shiftOf, stretchDirection, warp, normalWarp } from '../../src/viewer/stretch/stretch';

const argv = process.argv.slice(2);
const write = argv.includes('--write');
const outIx = argv.indexOf('--out');
const outPath = outIx >= 0 ? argv[outIx + 1] : undefined;
const files = argv.filter((a, i) => !a.startsWith('--') && !(outIx >= 0 && i === outIx + 1));
if (files.length !== 1) {
  console.error('usage: npm run triassic:stretch -- <stretch.json> [--write] [--out <file.glb>]');
  process.exit(2);
}

const payload = JSON.parse(fs.readFileSync(files[0], 'utf8'));
let doc;
try { doc = fromExport(payload); } catch (e) { console.error(`! ${e.message}`); process.exit(1); }

const id = doc.id;
const source = path.join('tools/triassic/creatures', id, `${id}.preview.glb`);
if (!fs.existsSync(source)) {
  console.error(`! no generated body at ${source} — a stretch applies to the raw generation, not to a shipped model`);
  process.exit(1);
}
const dest = outPath ?? source;

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const gltf = await io.read(source);

/**
 * Every primitive, with the matrix into the root frame and back.
 *
 * The document was measured in the root frame — the whole scene graph flattened — so a primitive
 * under a node with a transform has to be taken there and returned, or a stretch would be applied
 * in whatever local frame that node happened to carry. Positions shared by several nodes are done
 * once, under the first node that reaches them, because warping a shared buffer twice would apply
 * the edit twice.
 */
const targets = [];
const seen = new Set();
for (const scene of gltf.getRoot().listScenes()) scene.traverse((node) => {
  const mesh = node.getMesh();
  if (!mesh) return;
  const m = node.getWorldMatrix();
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION');
    if (!pos || seen.has(pos)) continue;
    seen.add(pos);
    targets.push({ prim, m, node: node.getName() || '(unnamed)' });
  }
});
if (!targets.length) { console.error(`! ${source} has no geometry`); process.exit(1); }

const total = targets.reduce((n, t) => n + t.prim.getAttribute('POSITION').getCount(), 0);
if (doc.vertices && doc.vertices !== total) {
  // The stretch names the mesh it was drawn on. A different vertex count means the body has been
  // rebuilt or regenerated since, and the cuts are no longer where the user put them — which would
  // not fail, it would silently stretch the wrong part of a different animal.
  console.error(`! ${files[0]} was measured on ${doc.vertices} vertices but ${source} has ${total}.`);
  console.error('  The body has changed since the stretch was exported. Open it in the viewer and re-cut it.');
  process.exit(1);
}

const d = stretchDirection(doc);
const shift = shiftOf(doc), length = regionLength(doc);
const f3 = (v) => v.toFixed(4);
console.log(`${id}: ${source}`);
console.log(`  region     ${f3(doc.from)} → ${f3(doc.to)} along ${doc.frame.axis} · ${f3(length)} long (${(length / doc.bounds.length * 100).toFixed(1)}% of the body)`);
console.log(`  direction  [${d.map(f3).join(', ')}] · side ${(doc.tiltSide * 180 / Math.PI).toFixed(1)}° · top ${(doc.tiltTop * 180 / Math.PI).toFixed(1)}°`);
console.log(`  stretch    ${doc.factor}× → ${f3(length * doc.factor)} · the head moves ${f3(shift)}`);
console.log(`  vertices   ${total} in ${targets.length} primitive${targets.length === 1 ? '' : 's'}`);

if (Math.abs(doc.factor - 1) < 1e-6) {
  console.log('\n  This stretch asks for no change (factor 1). Nothing to bake.');
  process.exit(0);
}

// ---- the warp, in the root frame, per primitive ----
const move = warp(doc);
const moveNormal = normalWarp(doc);
const out = [0, 0, 0];
let moved = 0, boundsLo = [Infinity, Infinity, Infinity], boundsHi = [-Infinity, -Infinity, -Infinity];
/** Every vertex as it was, in the root frame, so the file that is written can be checked. */
const asGenerated = [];

for (const { prim, m } of targets) {
  const inv = invert(m);
  const pos = prim.getAttribute('POSITION');
  const nor = prim.getAttribute('NORMAL');
  const tan = prim.getAttribute('TANGENT');
  const v = [0, 0, 0], n = [0, 0, 0, 0];
  for (let i = 0; i < pos.getCount(); i++) {
    pos.getElement(i, v);
    const [x, y, z] = apply(m, v[0], v[1], v[2], 1);
    asGenerated.push(x, y, z);
    move(x, y, z, out);
    if (out[0] !== x || out[1] !== y || out[2] !== z) moved++;
    for (let k = 0; k < 3; k++) {
      if (out[k] < boundsLo[k]) boundsLo[k] = out[k];
      if (out[k] > boundsHi[k]) boundsHi[k] = out[k];
    }
    const local = apply(inv, out[0], out[1], out[2], 1);
    pos.setElement(i, local);

    // A normal is not carried by a matrix but by its inverse transpose — the two differ the
    // moment a node carries a non-uniform scale, and a generated node may. Into the root frame
    // that is (M⁻¹)ᵀ, and back out of it (M⁻¹)⁻ᵀ = Mᵀ. Both steps are about the untouched point,
    // which is why the position is read before it is overwritten.
    if (nor) {
      nor.getElement(i, n);
      const [wx, wy, wz] = applyT(inv, n[0], n[1], n[2]);
      moveNormal(x, y, z, wx, wy, wz, out);
      const back = applyT(m, out[0], out[1], out[2]);
      const len = Math.hypot(back[0], back[1], back[2]) || 1;
      nor.setElement(i, [back[0] / len, back[1] / len, back[2] / len]);
    }
    // A tangent lies *in* the surface, so it is carried by the map rather than by its inverse
    // transpose. The handedness in w is untouched: a uniform stretch does not mirror anything.
    if (tan) {
      tan.getElement(i, n);
      const [wx, wy, wz] = apply(m, n[0], n[1], n[2], 0);
      const t = tangentWarp(doc, x, y, z, wx, wy, wz);
      const back = apply(inv, t[0], t[1], t[2], 0);
      const len = Math.hypot(back[0], back[1], back[2]) || 1;
      tan.setElement(i, [back[0] / len, back[1] / len, back[2] / len, n[3]]);
    }
  }
}

console.log(`  moved      ${moved} of ${total} vertices`);
console.log(`  new bounds ${['x', 'y', 'z'].map((k, i) => `${k} ${f3(boundsHi[i] - boundsLo[i])}`).join(' · ')}`);

if (!write) {
  console.log('\n  Dry run. Add --write to apply it.');
  process.exit(0);
}

fs.writeFileSync(dest, await io.writeBinary(gltf));

/**
 * Read the file back and check it is the warp, vertex for vertex.
 *
 * By default this overwrites the working copy of a generation that cost real money to make, and
 * between here and the disk sit an encoder, a quantizer and whatever a future gltf-transform
 * decides to do to a buffer. A wrong file would look perfectly plausible — a body with a longer
 * neck always does — so the check is not "did it write" but "is what came back the edit that was
 * asked for". Float32 is the floor on how close it can be.
 */
{
  const written = await new NodeIO().registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder }).read(dest);
  const back = [];
  const seenBack = new Set();
  for (const scene of written.getRoot().listScenes()) scene.traverse((node) => {
    const wm = node.getWorldMatrix(), mesh = node.getMesh();
    if (!mesh) return;
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      if (!pos || seenBack.has(pos)) continue;
      seenBack.add(pos);
      const v = [0, 0, 0];
      for (let i = 0; i < pos.getCount(); i++) { pos.getElement(i, v); back.push(...apply(wm, v[0], v[1], v[2], 1)); }
    }
  });
  const expect = [0, 0, 0];
  let worst = 0;
  if (back.length !== asGenerated.length) {
    console.error(`! ${dest} came back with ${back.length / 3} vertices, not ${asGenerated.length / 3}`);
    process.exit(1);
  }
  for (let i = 0; i < asGenerated.length; i += 3) {
    move(asGenerated[i], asGenerated[i + 1], asGenerated[i + 2], expect);
    for (let k = 0; k < 3; k++) worst = Math.max(worst, Math.abs(back[i + k] - expect[k]));
  }
  const tolerance = 1e-5 * Math.max(doc.bounds.length, 1);
  if (!(worst <= tolerance)) {
    console.error(`! ${dest} is not the stretch that was asked for: off by ${worst.toExponential(2)}`);
    process.exit(1);
  }
  console.log(`  verified   every vertex is the previewed warp, within ${worst.toExponential(1)}`);
}
// The stretch file lands beside the body it changed. Not for the tool — it reads its input from
// the command line — but because a GLB with a longer neck than the generation it came from should
// say, in the folder, what was done to it and by how much.
const record = path.join('tools/triassic/creatures', id, `${id}.stretch.json`);
if (dest === source) fs.writeFileSync(record, JSON.stringify(payload, null, 2) + '\n');
console.log(`\n  Written: ${dest}${dest === source ? `\n  Recorded: ${record}` : ''}`);
console.log('  Next: node tools/update-asset-sizes.mjs && npm run triassic:previews');

// ---------------------------------------------------------------------------------------------

/** A gltf-transform world matrix (column-major, 16) applied to a point (w=1) or direction (w=0). */
function apply(m, x, y, z, w) {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12] * w,
    m[1] * x + m[5] * y + m[9] * z + m[13] * w,
    m[2] * x + m[6] * y + m[10] * z + m[14] * w,
  ];
}

/** The same matrix's 3×3 transposed, applied to a direction — the normal half of the pair above. */
function applyT(m, x, y, z) {
  return [
    m[0] * x + m[1] * y + m[2] * z,
    m[4] * x + m[5] * y + m[6] * z,
    m[8] * x + m[9] * y + m[10] * z,
  ];
}

/** The tangent's rule: the Jacobian itself, which inside the region scales along the direction. */
function tangentWarp(document, x, y, z, tx, ty, tz) {
  const dir = stretchDirection(document);
  const a = [document.from, document.to].map((at) => {
    const c = [0, 0, 0];
    c[document.frame.axis === 'x' ? 0 : 2] = at;
    c[1] = document.bounds.upMid;
    c[document.frame.axis === 'x' ? 2 : 0] = document.bounds.lateralMid;
    return c[0] * dir[0] + c[1] * dir[1] + c[2] * dir[2];
  });
  const s = (x * dir[0] + y * dir[1] + z * dir[2] - a[0]) / (a[1] - a[0]);
  if (s <= 0 || s >= 1) return [tx, ty, tz];
  const k = (document.factor - 1) * (dir[0] * tx + dir[1] * ty + dir[2] * tz);
  return [tx + dir[0] * k, ty + dir[1] * k, tz + dir[2] * k];
}

/** Inverse of an affine 4×4 in column-major order. Generated nodes carry rotation and scale. */
function invert(m) {
  const a = [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]];
  const det = a[0] * (a[4] * a[8] - a[5] * a[7]) - a[3] * (a[1] * a[8] - a[2] * a[7]) + a[6] * (a[1] * a[5] - a[2] * a[4]);
  if (Math.abs(det) < 1e-20) throw new Error('a node in this file has a singular transform');
  const inv = [
    (a[4] * a[8] - a[5] * a[7]) / det, -(a[1] * a[8] - a[2] * a[7]) / det, (a[1] * a[5] - a[2] * a[4]) / det,
    -(a[3] * a[8] - a[5] * a[6]) / det, (a[0] * a[8] - a[2] * a[6]) / det, -(a[0] * a[5] - a[2] * a[3]) / det,
    (a[3] * a[7] - a[4] * a[6]) / det, -(a[0] * a[7] - a[1] * a[6]) / det, (a[0] * a[4] - a[1] * a[3]) / det,
  ];
  const t = [m[12], m[13], m[14]];
  return [
    inv[0], inv[1], inv[2], 0,
    inv[3], inv[4], inv[5], 0,
    inv[6], inv[7], inv[8], 0,
    -(inv[0] * t[0] + inv[3] * t[1] + inv[6] * t[2]),
    -(inv[1] * t[0] + inv[4] * t[1] + inv[7] * t[2]),
    -(inv[2] * t[0] + inv[5] * t[1] + inv[8] * t[2]), 1,
  ];
}
