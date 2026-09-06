// Decode temporary render inputs without modifying shipped models.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import fs from 'node:fs';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder': MeshoptDecoder});
fs.mkdirSync('/tmp/cambrian-art-models', {recursive:true});
for (const id of ['anomalocaris','canadia','hallucigenia','marrella','olenoides','opabinia','waptia','wiwaxia']) {
 const doc = await io.read(`public/assets/creatures/${id}.glb`);
 for (const ext of doc.getRoot().listExtensionsUsed()) if(ext.extensionName === 'EXT_meshopt_compression') ext.dispose();
 await io.write(`/tmp/cambrian-art-models/${id}.glb`,doc);
}
