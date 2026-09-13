/** Decode actual published LODs and bind scale inputs to their source hashes. */
import {NodeIO} from '@gltf-transform/core';import{ALL_EXTENSIONS}from'@gltf-transform/extensions';import{MeshoptDecoder}from'meshoptimizer';import{readFile,writeFile,mkdir}from'node:fs/promises';import{createHash}from'node:crypto';import path from'node:path';
await MeshoptDecoder.ready;const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const root=process.cwd(),out=path.resolve(root,'../devonian-authoring/scale-reference/decoded');await mkdir(out,{recursive:true});
const shipped=JSON.parse(await readFile('tools/devonian/shipped.json','utf8')).creatures;const hash=x=>createHash('sha256').update(x).digest('hex');
for(const id of(process.argv.length>2?process.argv.slice(2):shipped)){
 if(!shipped.includes(id))throw Error('Unshipped '+id);
 const sourcePath=`public/assets/devonian/creatures/${id}.lod1.glb`,bytes=await readFile(sourcePath),metaBytes=await readFile(`public/assets/devonian/creatures/${id}.json`),doc=await io.readBinary(bytes),modelNodes=doc.getRoot().listNodes().filter(n=>n.getMesh()).map(n=>n.getName());
 for(const ext of doc.getRoot().listExtensionsUsed())if(ext.extensionName==='EXT_meshopt_compression')ext.dispose();
 await io.write(path.join(out,id+'.glb'),doc);await writeFile(path.join(out,id+'.json'),JSON.stringify({id,sourcePath,sourceSHA256:hash(bytes),metadataSHA256:hash(metaBytes),decodedSHA256:hash(await readFile(path.join(out,id+'.glb'))),modelNodes},null,2)+'\n');
}
console.log('Decoded hash-bound scale references at '+out);
