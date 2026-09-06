/**
 * Generates decimated copies of the creature GLBs for distant/small rendering.
 * Usage: node tools/make-lods.mjs [ratio] [creature ...]   (writes public/assets/creatures/<id>.lod1.glb)
 */
import fs from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { simplify, weld, dedup, prune } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

const args = process.argv.slice(2);
const ratio = args.length && Number.isFinite(Number(args[0])) ? Number(args.shift()) : 0.14;
const only = new Set(args);
if (!(ratio > 0 && ratio <= 1)) throw new Error('LOD ratio must be greater than 0 and at most 1');
await MeshoptSimplifier.ready; await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder,
});
const dir = 'public/assets/creatures';
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.glb') && !x.includes('.lod') && (!only.size || only.has(x.replace('.glb', ''))))) {
  const doc = await io.read(`${dir}/${f}`);
  const before = doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives())
    .reduce((s, p) => s + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0);
  // Distant creatures only ever play idle/locomotion/death, and their textures are a few pixels
  // on screen: dropping the rest is what makes these files small enough to be worth streaming.
  const KEEP = new Set(['Idle', 'Swim', 'Crawl', 'Death']);
  for (const anim of doc.getRoot().listAnimations()) {
    if (KEEP.has(anim.getName())) continue;
    for (const ch of anim.listChannels()) ch.dispose();
    for (const sm of anim.listSamplers()) sm.dispose();
    anim.dispose();
  }
  for (const tex of doc.getRoot().listTextures()) tex.dispose();
  for (const mat of doc.getRoot().listMaterials()) {
    mat.setBaseColorTexture(null).setNormalTexture(null).setMetallicRoughnessTexture(null)
      .setOcclusionTexture(null).setEmissiveTexture(null);
  }
  await doc.transform(dedup(), weld(), simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.02 }), prune({ keepExtras: true }));
  const after = doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives())
    .reduce((s, p) => s + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0);
  const out = `${dir}/${f.replace('.glb', '.lod1.glb')}`;
  await io.write(out, doc);
  console.log(`${f.padEnd(20)} ${Math.round(before)} -> ${Math.round(after)} tris (${(after / before * 100).toFixed(0)}%)  ${(fs.statSync(out).size / 1e6).toFixed(2)} MB`);
}
