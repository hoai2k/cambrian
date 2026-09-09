// Decode temporary render inputs without modifying shipped models.
// Usage: node tools/art/decode-models.mjs [IDs...]
// Defaults remain the original eight. CAMBRIAN_ART_MODELS selects intermediates.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ORIGINALS = ['anomalocaris','canadia','hallucigenia','marrella','olenoides','opabinia','waptia','wiwaxia'];
const EXPANSION = ['pikaia','nectocaris','burgessomedusa','odaraia','ottoia','cambroraster','sidneyia','leanchoilia','isoxys','odontogriphus','ctenorhabdotus','vetulicola','tamisiocaris'];
const ids = process.argv.slice(2).length ? [...new Set(process.argv.slice(2))] : ORIGINALS;
for (const id of ids) if (![...ORIGINALS,...EXPANSION].includes(id)) throw new Error(`Unknown creature ID: ${id}`);
const output = path.resolve(process.env.CAMBRIAN_ART_MODELS || '/tmp/cambrian-art-models');
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder': MeshoptDecoder});
fs.mkdirSync(output, {recursive:true});
for (const id of ids) {
 const doc = await io.read(path.join(ROOT, `public/assets/creatures/${id}.glb`));
 for (const ext of doc.getRoot().listExtensionsUsed()) if(ext.extensionName === 'EXT_meshopt_compression') ext.dispose();
 await io.write(path.join(output, `${id}.glb`),doc);
 console.log(`Decoded ${id} -> ${path.join(output, `${id}.glb`)}`);
}
