/**
 * Turns the authored Devonian scenery previews into instanced game props.
 *
 * The library in `public/assets/devonian/props/` is authored for inspection: meshopt-compressed,
 * split across two or three primitives, textured, and from nine thousand to four hundred thousand
 * triangles. None of that survives contact with `loadPropGeometry` in `src/render/props.ts`, which
 * wants exactly one mesh carrying COLOR_0 and loads with a bare GLTFLoader that has no meshopt
 * decoder. The sea shader supplies the material, so textures are dead weight, and these are drawn
 * by the thousand as instanced scenery, so the triangle count has to come down to the order the
 * Cambrian props sit at.
 *
 * So: decode, merge the primitives into one, simplify to a budget, drop everything but position,
 * normal and COLOR_0, and write plain uncompressed GLB into `public/assets/devonian/scenery/`.
 * The previews are left exactly as delivered; this only ever writes to the scenery folder.
 *
 * Usage: node tools/devonian/props/instance.mjs [id ...]
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, joinPrimitives, prune, simplify, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'public/assets/devonian/props';
const OUT = 'public/assets/devonian/scenery';

/**
 * Which authored prop stands in for each of the era's flora kinds, and how many triangles it is
 * worth at instancing density. The budget is per kind, not per prop: a crinoid is a thin column
 * that needs its silhouette, a sediment bed is a slab that does not.
 */
/**
 * `h` is the height the geometry is normalised to, in world units, taken from the stand-in the
 * prop replaces: `FLORA_PHYS` in `src/sim/flora.ts` for a flora kind, or the fallback geometry in
 * `src/render/sea.ts` for the three rock props. This is not cosmetic — the placement multiplies by
 * `f.scale` assuming the stand-in's size, and the sim's cover and collision are computed from
 * FLORA_PHYS, so a prop authored at a different size would part company with its own hitbox. The
 * previews range from 0.06 to 6.6 units tall for kinds whose stand-ins run 0.3 to 9.5.
 */
export const SCENERY = [
  // `as` writes a second copy under the name `src/render/sea.ts` asks for. The sea names three
  // rock props directly (boulder variants and seabed fragments) rather than through a flora kind,
  // so the era's folder answers to those names too and needs no change in the renderer.
  { id: 'carbonate-outcrop', as: 'blade-spire', h: 4.0, tris: 400 },
  { id: 'carbonate-rubble', as: 'talus-shard', h: 0.8, tris: 400 },
  { id: 'crinoid-debris', as: 'pebble-cluster', h: 0.15, tris: 400 },
  { id: 'stalked-crinoid', h: 2.2, tris: 900 },
  { id: 'stalked-crinoid-v2', h: 9.5, tris: 900 },
  { id: 'massive-stromatoporoid', h: 0.7, tris: 700 },
  { id: 'branching-stromatoporoid', h: 0.9, tris: 900 },
  { id: 'massive-tabulate-coral', h: 0.3, tris: 700 },
  { id: 'branching-tabulate-coral', h: 0.5, tris: 900 },
  { id: 'solitary-rugose-coral', h: 0.55, tris: 500 },
  { id: 'colonial-rugose-coral', h: 0.8, tris: 900 },
  { id: 'bryozoan-colony', h: 0.9, tris: 900 },
  { id: 'rhynia', h: 1.8, tris: 600 },
  { id: 'asteroxylon', h: 2.4, tris: 800 },
  { id: 'cladoxylopsid-tree', h: 5.5, tris: 1600 },
  { id: 'archaeopteris', h: 6.5, tris: 1600 },
  { id: 'marine-algae', h: 1.4, tris: 600 },
  { id: 'submerged-log', h: 0.5, tris: 500 },
  { id: 'carbonate-outcrop', h: 1.6, tris: 400 },
  { id: 'large-boulder', h: 1.2, tris: 300 },
  { id: 'carbonate-rubble', h: 0.5, tris: 400 },
  { id: 'brachiopod-bed', h: 0.3, tris: 600 },
  { id: 'shell-hash', h: 0.2, tris: 500 },
  { id: 'crinoid-debris', h: 0.25, tris: 400 },
];

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
await MeshoptSimplifier.ready;

const only = process.argv.slice(2);
const wanted = only.length ? SCENERY.filter((s) => only.includes(s.id)) : SCENERY;
fs.mkdirSync(OUT, { recursive: true });

const triangles = (doc) => doc.getRoot().listMeshes()
  .flatMap((m) => m.listPrimitives())
  .reduce((n, p) => n + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0);

for (const { id, tris, h: targetH, as: alias } of wanted) {
  const src = path.join(SRC, `${id}.glb`);
  if (!fs.existsSync(src)) { console.error(`missing ${src}`); continue; }
  const doc = await io.read(src);
  const before = triangles(doc);
  let scaled = 1;

  // The sea shader colours these from COLOR_0, so UVs, tangents and textures are all dead weight.
  // Stripping runs first: primitives can only be joined once they agree on material and attributes,
  // and the previews split themselves by material.
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      for (const name of prim.listSemantics()) {
        if (name !== 'POSITION' && name !== 'NORMAL' && name !== 'COLOR_0') prim.setAttribute(name, null);
      }
      prim.setMaterial(null);
    }
  }
  // One primitive per mesh: GLTFLoader makes a three.js Mesh per primitive, and the prop loader
  // takes exactly one. joinPrimitives returns the merged primitive rather than editing the mesh,
  // so swap it in and drop the originals.
  for (const mesh of doc.getRoot().listMeshes()) {
    const prims = mesh.listPrimitives();
    if (prims.length < 2) continue;
    const joined = joinPrimitives(prims);
    for (const prim of prims) { mesh.removePrimitive(prim); prim.dispose(); }
    mesh.addPrimitive(joined);
  }
  await doc.transform(
    weld({ tolerance: 0.0001 }),
    simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, tris / before), error: 0.02, lockBorder: false }),
  );
  // The simplifier stops at its error bound, which leaves the noisier beds (shell hash, moss)
  // well over budget. Those are texture rather than silhouette, so let a second pass distort them
  // further rather than ship five thousand triangles per instance.
  if (triangles(doc) > tris * 1.3) {
    await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: tris / triangles(doc), error: 0.15, lockBorder: false }));
  }
  await doc.transform(dedup(), prune({ keepAttributes: false, keepLeaves: false }));

  // Plain GLB out: `loadPropGeometry` builds a bare GLTFLoader with no meshopt decoder, so the
  // compression the previews ship with has to go rather than be re-encoded.
  for (const ext of doc.getRoot().listExtensionsUsed()) ext.dispose();
  // Scenery is instanced, never posed. Leaving a skin behind makes GLTFLoader build a SkinnedMesh
  // whose weights we just stripped, and it throws in normalizeSkinWeights before the prop loads.
  for (const node of doc.getRoot().listNodes()) node.setSkin(null);
  for (const skin of doc.getRoot().listSkins()) skin.dispose();

  // Normalise to the stand-in's height with its base on the ground. Baked into the positions,
  // not a node transform: `loadPropGeometry` hands back the raw geometry and drops the scene graph.
  {
    const prim = doc.getRoot().listMeshes()[0]?.listPrimitives()[0];
    const pos = prim?.getAttribute('POSITION');
    if (pos) {
      const el = [0, 0, 0];
      let lo = Infinity, hi = -Infinity, minY = Infinity;
      for (let i = 0; i < pos.getCount(); i++) { pos.getElement(i, el); lo = Math.min(lo, el[1]); hi = Math.max(hi, el[1]); }
      minY = lo;
      const k = hi > lo ? targetH / (hi - lo) : 1;
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, el);
        pos.setElement(i, [el[0] * k, (el[1] - minY) * k, el[2] * k]);
      }
      scaled = k;
    }
  }

  const out = path.join(OUT, `${alias ?? id}.glb`);
  await io.write(out, doc);
  const after = triangles(doc);
  const kb = Math.round(fs.statSync(out).size / 1024);
  const meshes = doc.getRoot().listMeshes().length;
  const prims = doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives()).length;
  const hasColor = doc.getRoot().listMeshes().every((m) => m.listPrimitives().every((p) => !!p.getAttribute('COLOR_0')));
  console.log(`${(alias ? `${id} as ${alias}` : id).padEnd(34)} ${String(Math.round(before)).padStart(7)} -> ${String(Math.round(after)).padStart(5)} tris  ${String(kb).padStart(4)} KB  x${scaled.toFixed(2)}  meshes=${meshes} prims=${prims} COLOR_0=${hasColor}`);
  if (meshes !== 1 || prims !== 1 || !hasColor) console.error(`  ^ ${id} will not load as an instanced prop`);
}
