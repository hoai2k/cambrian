/** Preserve originals; decode compressed source LODs and bake their material colour factors. */
import {NodeIO}from'@gltf-transform/core';import {ALL_EXTENSIONS}from'@gltf-transform/extensions';import {MeshoptDecoder}from'meshoptimizer';import fs from'node:fs/promises';import path from'node:path';import {createHash}from'node:crypto';
const root=path.resolve(import.meta.dirname,'../../..');const here=path.join(root,'tools/devonian/props-instancing');const local=path.resolve(root,'../devonian-authoring/props-instancing');const cfg=JSON.parse(await fs.readFile(path.join(here,'config.json'),'utf8'));await fs.mkdir(path.join(local,'decoded'),{recursive:true});await MeshoptDecoder.ready;const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});const report=[];
for(const p of cfg.props){
 const file=path.join(root,'public/assets/devonian/props',p.source+'.lod1.glb');const bytes=await fs.readFile(file);const doc=await io.readBinary(bytes);const buffer=doc.getRoot().listBuffers()[0];let triangles=0;
 for(const mesh of doc.getRoot().listMeshes())for(const prim of mesh.listPrimitives()){
  const mat=prim.getMaterial(),factor=mat?.getBaseColorFactor()??[1,1,1,1];if(mat?.getBaseColorTexture()||mat?.getNormalTexture()||mat?.getMetallicRoughnessTexture())throw Error(`Source LOD must be texture-free: ${p.source}`);
  const position=prim.getAttribute('POSITION'),prior=prim.getAttribute('COLOR_0');const colors=new Float32Array(position.getCount()*4);
  for(let i=0;i<position.getCount();i++){const c=prior?.getElement(i,[])??[1,1,1,1];for(let k=0;k<4;k++)colors[i*4+k]=(c[k]??1)*factor[k];}
  prim.setAttribute('COLOR_0',doc.createAccessor('BakedPigment',buffer).setType('VEC4').setArray(colors));triangles+=(prim.getIndices()?.getCount()??position.getCount())/3;
 }
 for(const mat of doc.getRoot().listMaterials())mat.setBaseColorFactor([1,1,1,1]).setMetallicFactor(0);
 for(const ext of doc.getRoot().listExtensionsUsed())if(ext.extensionName==='EXT_meshopt_compression')ext.dispose();
 const decoded=path.join(local,'decoded',p.id+'.glb');await io.write(decoded,doc);report.push({id:p.id,source:file,sha256:createHash('sha256').update(bytes).digest('hex'),decoded,sourceTriangles:triangles});
}
await fs.writeFile(path.join(local,'sources.json'),JSON.stringify(report,null,2));console.log(report.map(p=>({id:p.id,triangles:p.sourceTriangles})));
