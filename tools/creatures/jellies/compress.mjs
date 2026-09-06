// Run after Blender authoring; retain uncompressed originals under local/.
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {meshopt, prune, dedup} from '@gltf-transform/functions';
import {MeshoptEncoder, MeshoptDecoder} from 'meshoptimizer';
import {mkdir, copyFile, writeFile, readFile, stat} from 'node:fs/promises';
import path from 'node:path';
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const source=path.resolve('../expansion-authoring/jellies');await mkdir(source,{recursive:true});
const rows=[];
for(const id of (process.argv.slice(2).length ? process.argv.slice(2) : ['burgessomedusa','ctenorhabdotus','cambroraster','tamisiocaris'])){
 for(const suffix of ['', '.lod1']){
  const file=path.resolve('public/assets/creatures',id+suffix+'.glb');
  await copyFile(file,path.join(source,id+suffix+'.uncompressed.glb'));
  const doc=await io.read(file);const root=doc.getRoot();
  const clips=root.listAnimations().map(a=>a.getName());
  for(const anim of root.listAnimations()){
   for(const ch of anim.listChannels()){
    const vals=ch.getSampler().getOutput().getArray();
    if(!Array.from(vals).every(Number.isFinite))throw Error(id+' nonfinite animation');
    if(ch.getTargetPath()==='scale' && Array.from(vals).some(v=>Math.abs(v-1)>1e-5))throw Error(id+' animated scale');
    if(ch.getTargetNode().getName()==='root' && ch.getTargetPath()==='translation' && Array.from(vals).some(v=>Math.abs(v)>1e-6))throw Error(id+' moving root');
   }
  }
  const tris=root.listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((k,p)=>k+(p.getIndices()?.getCount()??0)/3,0),0);
  const before=(await stat(file)).size;
  await doc.transform(dedup(),prune(),meshopt({encoder:MeshoptEncoder,level:'medium'}));await io.write(file,doc);
  const after=(await stat(file)).size;
  rows.push({id,suffix,triangles:tris,clips:clips.length,before,after});
 }
}
let prior=[];try{prior=JSON.parse(await readFile('tools/creatures/jellies/export-validation.json','utf8'));}catch{}
const updated=[...prior.filter(p=>!rows.some(r=>r.id===p.id && r.suffix===p.suffix)),...rows];
await writeFile('tools/creatures/jellies/export-validation.json',JSON.stringify(updated,null,2)+'\n');console.log(JSON.stringify(rows,null,2));
