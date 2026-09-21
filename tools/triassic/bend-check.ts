/**
 * Read a bend file back against the body it names, and refuse it if the body has changed.
 *
 *   npm run triassic:bend -- <id>-bend.json [--root public]
 *
 * (Bundled through esbuild by the npm script, which is how it imports the viewer's own TypeScript
 * rather than keeping a second copy of the measurement.)
 *
 * The file comes out of the viewer's bend mode (`&mode=bend` on any body). This is the consumer the
 * export is written for: it hashes the GLB the file names, counts its vertices, and hands both to
 * `fromExport`, which refuses a span placed on a mesh that has since been regenerated or rebuilt —
 * a pair of points measured on one body means nothing on another, and would not fail, it would
 * silently bend a different part of a different animal.
 *
 * On a file that matches it re-measures: the span, the two planes, the axle they imply, the turn,
 * the per-joint table, and **both readings over the actual mesh and the actual rig**, before and
 * after. Those last are the
 * point. The tool exists because a diagnosis on Askeptosaurus went wrong three times on numbers
 * nobody could re-take, so a bend file is only worth anything if a second program can take them
 * again and get the same answers — and say so loudly when it does not.
 *
 * It changes nothing. What a builder does with the numbers — a chain of joints posed by these
 * angles about this axle — is that builder's business (`docs/viewer-bend.md`).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import {
  angleOf, apartAfter, bendBasis, fromExport, fullStraightening, jointTurns, pinch, readBend, refLabel,
  refMoves, spanDirection, spanLength, toBlender, totalTurn, traces, twistAngle,
  type BendExport, type BoneNode, type Reading, type Vec3,
} from '../../src/viewer/bend/bend';

const argv = process.argv.slice(2);
const rootIx = argv.indexOf('--root');
const root = rootIx >= 0 ? argv[rootIx + 1] : 'public';
const files = argv.filter((a, i) => !a.startsWith('--') && !(rootIx >= 0 && i === rootIx + 1));
if (files.length !== 1) {
  console.error('usage: npm run triassic:bend -- <bend.json> [--root public]');
  process.exit(2);
}

const payload = JSON.parse(fs.readFileSync(files[0], 'utf8')) as Partial<BendExport>;
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
 * frame the viewer measured in. Positions shared by several nodes count once, under the first node
 * that reaches them, exactly as the viewer's own target does.
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

/** The rig at bind, root frame, with each joint's parent where that parent is itself a joint. */
const parents = new Map<string, string>();
for (const n of gltf.getRoot().listNodes()) for (const c of n.listChildren()) parents.set(c.getName(), n.getName());
const joints = new Set(gltf.getRoot().listSkins().flatMap((s) => s.listJoints()));
const jointNames = new Set([...joints].map((j) => j.getName()));
const bones: BoneNode[] = [...joints].map((j) => {
  const m = j.getWorldMatrix();
  const p = parents.get(j.getName());
  return { name: j.getName(), parent: p && jointNames.has(p) ? p : null, head: [m[12], m[13], m[14]] as Vec3 };
});

let doc;
try { doc = fromExport(payload, { sha256, vertices }); } catch (e) {
  console.error(`! ${(e as Error).message}`);
  console.error(`  ${source} is sha256 ${sha256.slice(0, 12)}… with ${vertices} vertices. Open it in the viewer and place the span again.`);
  process.exit(1);
}
if (!payload.sha256) console.log(`note: ${files[0]} carries no hash, so only the vertex count vouches for the body (${vertices} both ways).`);

// The rig the file carried against the rig in the body, so a chain renamed since is not read as a
// chain that has moved. The readings below are taken over the *file's* rig, which is what the
// viewer measured; a rig that no longer matches is worth knowing about separately.
const drifted = doc.bones.filter((b) => {
  const live = bones.find((x) => x.name === b.name);
  return !live || Math.hypot(live.head[0] - b.head[0], live.head[1] - b.head[1], live.head[2] - b.head[2]) > 1e-4;
});

const basis = bendBasis(doc);
const readings = readBend(doc, chunks);
const t = traces(doc, chunks);
const f4 = (v: number) => v.toFixed(4);
const v4 = (v: readonly number[]) => `[${v.map(f4).join(', ')}]`;
const deg = (r: number) => `${(r * 180 / Math.PI).toFixed(1)}°`;
const say = (r: Reading | null) => (r ? `${r.inPlane > 0 ? '+' : ''}${deg(r.inPlane)} in plane, ${deg(r.offPlane)} out` : 'no reading');

console.log(`${doc.id}: ${source} · ${payload.appliesTo ?? 'unknown'} body · ${payload.use ?? 'unknown use'} · sha256 ${sha256.slice(0, 12)}… · ${vertices} vertices`);
console.log(`  frame      body along ${doc.frame.axis}, head at the ${doc.frame.forward === 1 ? 'high' : 'low'} end (${doc.frameSource})`);
console.log(`  span       ${v4(doc.base)} → ${v4(doc.tip)} (${doc.baseSource}/${doc.tipSource}), ${f4(spanLength(doc))} long — ${(spanLength(doc) / doc.bounds.length * 100).toFixed(1)}% of the body, along ${v4(spanDirection(doc))}`);
console.log(`  planes     in  ${v4(doc.baseNormal)} (${doc.planeSource.base})   out ${v4(doc.tipNormal)} (${doc.planeSource.tip})`);
console.log(`             standing ${deg(fullStraightening(doc))} apart on the body, ${deg(apartAfter(doc))} apart after the bend; the body's own traced heading there was ${v4(doc.tipRest)}, ${deg(angleOf(doc.baseNormal, doc.tipRest))} off the base plane`);
console.log(`  straighten ${doc.straighten.toFixed(3)} of the way from the tip plane to the base plane`);
console.log(`  axle       ${v4(basis.axis)} through the base end · Blender Z-up ${v4(toBlender(basis.axis))} · leaning ${deg(twistAngle(doc))} along the span`);
console.log(`  turn       ${deg(totalTurn(doc))} across the span of a possible ${deg(fullStraightening(doc))}, spread linearly · inside squeezed to ${pinch(doc, chunks).toFixed(3)}`);
console.log(`  geometry   ${say(readings.geometry.before)} → ${say(readings.geometry.after)}`);
console.log(`             between the traced centre over ${(doc.window * 100).toFixed(0)}% of the body behind the base cut and the same ahead of the tip cut (reach ${(doc.reach * 100).toFixed(1)}%)`);
console.log(`             trace residual ${t.base ? t.base.residual.toFixed(3) : '—'} behind, ${t.tip ? t.tip.residual.toFixed(3) : '—'} ahead${Math.max(t.base?.residual ?? 0, t.tip?.residual ?? 0) > 0.05 ? '  ← one of them wandered; that reading is about two directions nothing in the animal runs in' : ''}`);
if (doc.refs) {
  console.log(`  bones      ${say(readings.bones.before)} → ${say(readings.bones.after)}`);
  console.log(`             between ${refLabel(doc.refs.base)}${refMoves(doc, doc.refs.base) ? ' (moves with the bend)' : ''} and ${refLabel(doc.refs.tip)}${refMoves(doc, doc.refs.tip) ? ' (moves with the bend)' : ''}, along the chain ${doc.chain ? refLabel(doc.chain) : '—'}`);
  const table = jointTurns(doc, bones);
  if (table.length) {
    console.log('  per joint  (local ° about the axle, then accumulated)');
    for (const j of table) console.log(`             ${j.bone.padEnd(14)} ${deg(j.local).padStart(8)}   ${deg(j.accumulated).padStart(8)}   at ${(j.s * 100).toFixed(0)}% of the span`);
  } else {
    console.log('  per joint  no joint of the chain lies inside the span');
  }
}
if (payload.note) console.log(`  note       ${payload.note}`);
if (drifted.length) {
  console.log(`  rig        ${drifted.length} of ${doc.bones.length} joints have moved or gone since the span was placed: ${drifted.slice(0, 6).map((b) => b.name).join(', ')}${drifted.length > 6 ? '…' : ''}`);
}

/**
 * The viewer recorded its own readings over the same body. A body that hashes the same and reads
 * differently would mean the two programs measured it differently, which is worth knowing loudly —
 * it is the whole failure this tool was built against.
 */
let bad = false;
const compare = (name: string, recorded: number | null | undefined, here: Reading | null, tol = 0.05) => {
  if (typeof recorded !== 'number' || !here) return;
  const mine = here.inPlane * 180 / Math.PI;
  if (Math.abs(recorded - mine) <= tol) return;
  console.error(`! the viewer recorded ${name} at ${recorded.toFixed(2)}° and this reads ${mine.toFixed(2)}°`);
  bad = true;
};
/**
 * The two planes are the document's own numbers rather than a reading, and they are still worth
 * re-deriving here: `apartDegrees` is what a reviewer reads off the panel as "straight", and a file
 * whose planes and whose printed figure disagree is a file whose planes were edited by hand.
 */
const planeCompare = (name: string, recorded: number | null | undefined, mine: number) => {
  if (typeof recorded !== 'number') return;
  if (Math.abs(recorded - mine) <= 0.05) return;
  console.error(`! the viewer recorded ${name} at ${recorded.toFixed(2)}° and this reads ${mine.toFixed(2)}°`);
  bad = true;
};
planeCompare('the two planes as they stand on the body', payload.planes?.apartDegrees, fullStraightening(doc) * 180 / Math.PI);
// **The contract of the slider, re-taken here rather than reprinted.** At a straighten of 1 this
// is nought; at anything else it is what is left of the straightening. It is measured off the
// plane the rotation actually carries rather than worked back out of the amount, which is the same
// discipline the two readings are held to and for the same reason.
planeCompare('the two planes after the bend', payload.planes?.apartAfterDegrees, apartAfter(doc) * 180 / Math.PI);
planeCompare('the whole straightening available', payload.turn?.fullDegrees, fullStraightening(doc) * 180 / Math.PI);
planeCompare('the turn across the span', payload.turn?.totalDegrees, totalTurn(doc) * 180 / Math.PI);
if (typeof payload.straighten?.amount === 'number' && Math.abs(payload.straighten.amount - doc.straighten) > 1e-6) {
  console.error(`! the viewer recorded a straighten of ${payload.straighten.amount} and the document carries ${doc.straighten}`);
  bad = true;
}
compare('the geometry reading before', payload.reading?.geometry?.before?.inPlaneDegrees, readings.geometry.before);
compare('the geometry reading after', payload.reading?.geometry?.after?.inPlaneDegrees, readings.geometry.after);
compare('the bone reading before', payload.reading?.bones?.before?.inPlaneDegrees, readings.bones.before);
compare('the bone reading after', payload.reading?.bones?.after?.inPlaneDegrees, readings.bones.after);
if (bad) process.exit(1);

console.log('\nOK: the file describes this body, and re-measuring it here gives the readings it recorded.');
console.log('The span, the axle and the angles above are in the model\'s root frame, unscaled.');
