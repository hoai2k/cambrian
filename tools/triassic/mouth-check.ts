/**
 * Read a mouth file back against the body it names, and refuse it if the body has changed.
 *
 *   npm run triassic:mouth -- <id>-mouth.json [--root public]
 *
 * (Bundled through esbuild by the npm script, which is how it imports the viewer's own TypeScript
 * rather than keeping a second copy of the test.)
 *
 * The file comes out of the viewer's mouth mode (`&mode=mouth` on any body). This is the consumer
 * the export is written for: it hashes the GLB the file names, counts its vertices, and hands both
 * to `fromExport`, which refuses a cut aimed on a mesh that has since been regenerated or rebuilt
 * — a hinge depth measured on one body means nothing on another, and would not fail, it would
 * silently put the jaw somewhere else. On a file that matches it prints the hinge and the plane in
 * the model's own frame, re-runs the mandible test over the actual mesh and compares the counts
 * with the ones the viewer recorded, so a builder reading the numbers knows they describe the
 * body in front of it.
 *
 * It changes nothing. What a builder does with the numbers — a hinge bone seated here, a cut
 * plane at this normal — is that builder's business (`docs/viewer-mouth.md`).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { countSides, cutBasis, fromExport, type MouthExport } from '../../src/viewer/mouth/mouth';

const argv = process.argv.slice(2);
const rootIx = argv.indexOf('--root');
const root = rootIx >= 0 ? argv[rootIx + 1] : 'public';
const files = argv.filter((a, i) => !a.startsWith('--') && !(rootIx >= 0 && i === rootIx + 1));
if (files.length !== 1) {
  console.error('usage: npm run triassic:mouth -- <mouth.json> [--root public]');
  process.exit(2);
}

const payload = JSON.parse(fs.readFileSync(files[0], 'utf8')) as Partial<MouthExport>;
const model = typeof payload.model === 'string' ? payload.model : '';
const source = path.join(root, model);
if (!model || !fs.existsSync(source)) {
  console.error(`! ${files[0]} names ${model || '(no model)'}, which is not under ${root}/`);
  process.exit(1);
}
const bytes = fs.readFileSync(source);
const sha256 = createHash('sha256').update(bytes).digest('hex');

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const gltf = await io.read(source);

/**
 * Every primitive's positions in the root frame — the whole scene graph flattened, which is the
 * frame the viewer measured in. Positions shared by several nodes count once, under the first
 * node that reaches them, exactly as the viewer's own target does.
 */
const chunks: Float32Array[] = [];
const seen = new Set<object>();
for (const scene of gltf.getRoot().listScenes()) scene.traverse((node) => {
  const mesh = node.getMesh();
  if (!mesh) return;
  const m = node.getWorldMatrix();
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION');
    if (!pos || seen.has(pos)) continue;
    seen.add(pos);
    const n = pos.getCount();
    const out = new Float32Array(n * 3);
    const v = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      pos.getElement(i, v);
      const [x, y, z] = v;
      out[i * 3] = m[0] * x + m[4] * y + m[8] * z + m[12];
      out[i * 3 + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
      out[i * 3 + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
    }
    chunks.push(out);
  }
});
const vertices = chunks.reduce((n, c) => n + c.length / 3, 0);
if (!vertices) { console.error(`! ${source} has no geometry`); process.exit(1); }

let doc;
try { doc = fromExport(payload, { sha256, vertices }); } catch (e) {
  console.error(`! ${(e as Error).message}`);
  console.error(`  ${source} is sha256 ${sha256.slice(0, 12)}… with ${vertices} vertices. Open it in the viewer and aim the cut again.`);
  process.exit(1);
}
if (!payload.sha256) console.log(`note: ${files[0]} carries no hash, so only the vertex count vouches for the body (${vertices} both ways).`);

const basis = cutBasis(doc);
const sides = countSides(chunks, doc);
const f4 = (v: number) => v.toFixed(4);
const v4 = (v: readonly number[]) => `[${v.map(f4).join(', ')}]`;
const deg = (r: number) => `${(r * 180 / Math.PI).toFixed(1)}°`;
console.log(`${doc.id}: ${source} · ${payload.appliesTo ?? 'unknown'} body · sha256 ${sha256.slice(0, 12)}… · ${vertices} vertices`);
console.log(`  frame      body along ${doc.frame.axis}, head at the ${doc.frame.forward === 1 ? 'high' : 'low'} end (${doc.frameSource}); seat from ${doc.seatSource}`);
console.log(`  hinge      ${f4(doc.depth)} back from the nose (${(doc.depth / doc.bounds.length * 100).toFixed(1)}% of the body) at ${v4(basis.centre)}, axis ${v4(basis.hinge)}`);
console.log(`  plane      normal ${v4(basis.normal)}, mouth line ${v4(basis.forward)} · pitch ${deg(doc.pitch)} · yaw ${deg(doc.yaw)} · roll ${deg(doc.roll)}`);
console.log(`  mandible   ${sides.mandible} of ${sides.total} vertices (${(sides.mandible / sides.total * 100).toFixed(1)}%) below the plane and ahead of the hinge`);
if (payload.note) console.log(`  note       ${payload.note}`);

// The viewer recorded its own count over the same test. A body that hashes the same and counts
// differently would mean the two read the file differently, which is worth knowing loudly.
const recorded = payload.sides?.mandible;
if (typeof recorded === 'number' && recorded !== sides.mandible) {
  const drift = Math.abs(recorded - sides.mandible) / Math.max(sides.total, 1);
  console.error(`! the viewer counted ${recorded} mandible vertices on this file and this reads ${sides.mandible} (${(drift * 100).toFixed(2)}% of the body apart)`);
  if (drift > 0.005) process.exit(1);
  console.error('  Within rounding of vertices on the plane itself; the cut is the same.');
}
console.log('\nOK: the file describes this body. The hinge and the plane above are in the model\'s root frame, unscaled.');
