// Mean/spread of a packaged body's COLOR_0, decoding meshopt so the shipped file can be read.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

for (const file of process.argv.slice(2)) {
  const doc = await io.read(file);
  const vals = [];
  for (const m of doc.getRoot().listMeshes()) {
    for (const p of m.listPrimitives()) {
      const c = p.getAttribute('COLOR_0');
      if (!c) continue;
      const a = [];
      for (let i = 0; i < c.getCount(); i++) {
        c.getElement(i, a);
        vals.push((a[0] + a[1] + a[2]) / 3);
      }
    }
  }
  if (!vals.length) { console.log(file, 'no COLOR_0'); continue; }
  vals.sort((x, y) => x - y);
  const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
  const sd = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
  console.log(`${file.split('/').pop().padEnd(34)} n=${String(vals.length).padStart(5)}  `
    + `mean ${mean.toFixed(4)}  median ${vals[vals.length >> 1].toFixed(4)}  sd ${sd.toFixed(4)}`);
}
