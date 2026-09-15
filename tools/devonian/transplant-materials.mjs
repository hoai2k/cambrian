/**
 * Material transplant for Devonian sculpt-port candidates.
 *
 *   node tools/devonian/transplant-materials.mjs <shipped.glb> <candidate.glb> <out.glb>
 *
 * A sculpt port rebuilds a creature's geometry from its builder with only proportions changed, so
 * a candidate and the shipped model it replaces are almost the same mesh — but the rebuild cannot
 * reproduce the shipped materials and comes back with flat placeholder colours. This copies, for
 * each candidate primitive, the shipped counterpart's material (textures, samplers, texture infos,
 * normal/occlusion/emissive maps, alphaMode, doubleSided, factors), its TEXCOORD_0/TEXCOORD_1,
 * COLOR_0 (vertex pigment — the LOD's baked pigment included) and TANGENT if present.
 *
 * POSITION, NORMAL, JOINTS_0/WEIGHTS_0, skins, nodes, animations and extras are never touched.
 *
 * A candidate primitive is paired with a shipped one by mesh name + primitive index; when that
 * pairing does not exist (the rebuild renamed its meshes, as these placeholder exports do) it falls
 * back to a shipped primitive with the same material name and the same POSITION count that has not
 * already been claimed by another candidate primitive. Either way, the transplant only proceeds
 * when the two primitives' POSITION counts are exactly equal: copying UV/colour/tangent data by
 * vertex index across a count mismatch would silently misalign every value onto the wrong vertex
 * (this is common here — the placeholder mesh has no UV seams, so it was never split into as many
 * vertices as the shipped, textured one) — so a count mismatch is refused, not forced, and reported
 * as such; a primitive with no shipped counterpart at all is reported as unmatched.
 *
 * The output is written uncompressed. Packaging (meshopt, LOD texture stripping) is a separate
 * step — see tools/devonian/package.mjs, whose NodeIO setup this copies exactly.
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { copyToDocument, createDefaultPropertyResolver, unpartition } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const [shippedPath, candidatePath, outPath] = process.argv.slice(2);
if (!shippedPath || !candidatePath || !outPath) {
  console.error('usage: transplant-materials.mjs <shipped.glb> <candidate.glb> <out.glb>');
  process.exit(2);
}

await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder,
});

const shippedDoc = await io.read(shippedPath);
const candidateDoc = await io.read(candidatePath);

const EXT_BY_NAME = new Map(ALL_EXTENSIONS.map((E) => [E.EXTENSION_NAME, E]));
const resolve = createDefaultPropertyResolver(candidateDoc, shippedDoc);
const extensionsCreated = new Set();

// The writer only serialises an ExtensionProperty's extension if that Extension has been created
// on the target Document first (gltf-transform's own copyToDocument/mergeDocuments guidance).
function ensureExtensions(material) {
  for (const ext of material.listExtensions()) {
    if (extensionsCreated.has(ext.extensionName)) continue;
    const ExtClass = EXT_BY_NAME.get(ext.extensionName);
    assert(ExtClass, `unknown extension "${ext.extensionName}" on shipped material "${material.getName()}"`);
    candidateDoc.createExtension(ExtClass);
    extensionsCreated.add(ext.extensionName);
  }
}

function copyAccessor(sourceAccessor) {
  return copyToDocument(candidateDoc, shippedDoc, [sourceAccessor], resolve).get(sourceAccessor);
}

const shippedMeshes = shippedDoc.getRoot().listMeshes();
const shippedByName = new Map();
for (const mesh of shippedMeshes) if (!shippedByName.has(mesh.getName())) shippedByName.set(mesh.getName(), mesh);

const claimed = new Set();

function findShippedPrimitive(candidateMesh, candidatePrim) {
  const byName = shippedByName.get(candidateMesh.getName());
  if (byName) {
    const primIndex = candidateMesh.listPrimitives().indexOf(candidatePrim);
    const p = byName.listPrimitives()[primIndex];
    if (p && !claimed.has(p)) return { prim: p, how: 'mesh name + primitive index' };
  }
  const wantMat = candidatePrim.getMaterial()?.getName();
  const wantCount = candidatePrim.getAttribute('POSITION')?.getCount();
  if (wantMat != null && wantCount != null) {
    for (const mesh of shippedMeshes) {
      for (const p of mesh.listPrimitives()) {
        if (claimed.has(p)) continue;
        if (p.getMaterial()?.getName() !== wantMat) continue;
        if (p.getAttribute('POSITION')?.getCount() !== wantCount) continue;
        return { prim: p, how: 'material name + vertex count' };
      }
    }
  }
  return null;
}

const report = [];
let transplanted = 0, refused = 0, unmatched = 0;

for (const mesh of candidateDoc.getRoot().listMeshes()) {
  mesh.listPrimitives().forEach((prim, primIndex) => {
    const label = `${mesh.getName()}#${primIndex}`;
    const found = findShippedPrimitive(mesh, prim);
    const candidateCount = prim.getAttribute('POSITION')?.getCount() ?? null;
    if (!found) {
      unmatched++;
      report.push(`UNMATCHED  ${label}  material="${prim.getMaterial()?.getName() ?? '(none)'}" vcount=${candidateCount} — no shipped primitive found by name+index or by material name + vertex count`);
      return;
    }
    const { prim: shippedPrim, how } = found;
    const shippedCount = shippedPrim.getAttribute('POSITION').getCount();
    if (shippedCount !== candidateCount) {
      refused++;
      report.push(`REFUSED    ${label}  matched by ${how} — vertex count differs: shipped ${shippedCount} vs candidate ${candidateCount}`);
      return;
    }
    claimed.add(shippedPrim);

    const shippedMat = shippedPrim.getMaterial();
    if (shippedMat) {
      ensureExtensions(shippedMat);
      const targetMat = copyToDocument(candidateDoc, shippedDoc, [shippedMat], resolve).get(shippedMat);
      prim.setMaterial(targetMat);
    }
    const copiedAttrs = [];
    for (const semantic of ['TEXCOORD_0', 'TEXCOORD_1', 'COLOR_0', 'TANGENT']) {
      const src = shippedPrim.getAttribute(semantic);
      if (!src) continue;
      prim.setAttribute(semantic, copyAccessor(src));
      copiedAttrs.push(semantic);
    }
    transplanted++;
    report.push(`OK         ${label}  matched by ${how}, vcount=${candidateCount} — material="${shippedMat?.getName() ?? '(none)'}", attrs=[${copiedAttrs.join(', ')}]`);
  });
}

console.log(`transplant-materials: shipped=${shippedPath} candidate=${candidatePath}`);
for (const line of report) console.log('  ' + line);
console.log(`  ${transplanted} transplanted, ${refused} refused (vertex count mismatch), ${unmatched} unmatched`);

await candidateDoc.transform(unpartition());
const bytes = await io.writeBinary(candidateDoc);
await writeFile(outPath, bytes);
console.log(`wrote ${outPath} (${bytes.length} bytes)`);
