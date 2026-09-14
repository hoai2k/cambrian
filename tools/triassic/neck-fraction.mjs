/**
 * How much of a built body is neck, measured off the packaged rig rather than asserted.
 *
 *   node tools/triassic/neck-fraction.mjs <glb>
 *
 * Tanystropheus is the animal this is for: the research says the neck is about half the animal on
 * thirteen hyperelongate cervicals, and whether the generation actually delivers that is a thing to
 * measure, not to assume. Under the rule that a Tripo body is worked and not authored, a neck that
 * comes up short is fixed by stretching the neck the generation has (Nothosaurus' builder lengthened
 * its intake neck 1.97x) or by going back for a regeneration — never by modelling one.
 *
 * A bone's length is the magnitude of its child's *local* translation, which is independent of every
 * rotation above it, so a chain's length is the sum of those magnitudes. Differencing naively
 * accumulated world positions is not the same thing and is wrong the moment any parent carries a
 * rotation — which, on a rig laid out along a curved intake axis, is every one of them.
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

const doc = await io.read(process.argv[2]);
const root = doc.getRoot();

const named = new Map();
const collect = (node) => {
  named.set(node.getName(), node);
  for (const c of node.listChildren()) collect(c);
};
for (const s of root.listScenes()) for (const n of s.listChildren()) collect(n);

const seg = (name) => {
  const t = named.get(name).getTranslation();
  return Math.hypot(t[0], t[1], t[2]);
};
const chain = (prefix) => {
  const names = [...named.keys()].filter((n) => new RegExp(`^${prefix}\\d+$`).test(n))
    .sort((a, b) => Number(a.match(/\d+$/)[0]) - Number(b.match(/\d+$/)[0]));
  let L = 0;
  for (let i = 1; i < names.length; i++) L += seg(names[i]);
  return { names, L };
};

const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
for (const m of root.listMeshes()) {
  for (const p of m.listPrimitives()) {
    const pos = p.getAttribute('POSITION');
    if (!pos) continue;
    const a = pos.getMin([]), b = pos.getMax([]);
    for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], a[i]); mx[i] = Math.max(mx[i], b[i]); }
  }
}
const L = Math.max(...mx.map((v, i) => v - mn[i]));

const neck = chain('neck_');
const tail = chain('tail_');
// the skull hangs off the last cervical, so its own offset is the last span of the neck
const neckTotal = neck.L + (named.has('skull') ? seg('skull') : 0);

console.log(`${process.argv[2]}`);
console.log(`  body length (mesh bounds)     ${L.toFixed(3)}`);
console.log(`  cervicals                     ${neck.names.length}`);
console.log(`  neck, first cervical to skull ${neckTotal.toFixed(3)}  = ${(100 * neckTotal / L).toFixed(1)} % of the body`);
console.log(`  caudals                       ${tail.names.length}, chain ${tail.L.toFixed(3)} = ${(100 * tail.L / L).toFixed(1)} %`);
