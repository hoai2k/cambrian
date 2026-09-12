/** Same geometry.json shape as ../../eye-audit-export.mjs, for an arbitrary local GLB (that
 * script only reads public/assets or a git revision, neither of which fits a scratch candidate).
 *
 *   node extract_geometry.mjs <out-dir> <id> <full.glb> <lod.glb>
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

const [outDir, id, fullPath, lodPath] = process.argv.slice(2);
await fs.mkdir(outDir, { recursive: true });
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

for (const [suffix, file] of [['', fullPath], ['.lod1', lodPath]]) {
  const bytes = await fs.readFile(file);
  const doc = await io.readBinary(bytes);
  const meshes = [];
  for (const node of doc.getRoot().listNodes()) {
    if (!node.getMesh()) continue;
    const m = node.getWorldMatrix();
    for (const [pi, p] of node.getMesh().listPrimitives().entries()) {
      const pa = p.getAttribute('POSITION');
      const positions = [];
      for (let i = 0; i < pa.getCount(); i++) {
        const v = pa.getElement(i, []);
        positions.push([m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12], m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13], m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]]);
      }
      meshes.push({ name: node.getName(), primitive: pi, material: p.getMaterial()?.getName(), positions, indices: Array.from(p.getIndices()?.getArray() || positions.flatMap((_, i) => i)) });
    }
  }
  const name = id + suffix;
  await fs.writeFile(path.join(outDir, `${name}.geometry.json`), JSON.stringify({ id: name, revision: 'sculpt-candidate', asset: file, sha256: createHash('sha256').update(bytes).digest('hex'), coordinateSystem: 'glTF +Y up +Z forward, rest/bind mesh world space', meshes }));
  console.log(name, meshes.map((m) => `${m.name}/${m.material}: ${m.positions.length}`).join('; '));
}
