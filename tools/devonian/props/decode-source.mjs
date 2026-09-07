// Losslessly decode the accepted fish source into the local props authoring directory.
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const output=path.resolve(root,'../devonian-authoring/props/remains-source.glb');
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const doc=await io.read(path.join(root,'public/assets/devonian/creatures/dunkleosteus.glb'));
for(const ext of doc.getRoot().listExtensionsUsed())if(ext.extensionName==='EXT_meshopt_compression')ext.dispose();
fs.mkdirSync(path.dirname(output),{recursive:true});await io.write(output,doc);console.log(output);

fs.writeFileSync(path.join(path.dirname(output),'remains-source.provenance.json'),JSON.stringify({model:'assets/devonian/creatures/dunkleosteus.glb',sha256:createHash('sha256').update(fs.readFileSync(path.join(root,'public/assets/devonian/creatures/dunkleosteus.glb'))).digest('hex')},null,2)+'\n');
