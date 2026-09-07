/** Decode a local candidate for the shared independent eye-volume auditor. */
import fs from 'node:fs/promises';import path from 'node:path';import {createHash}from'node:crypto';import {NodeIO}from'@gltf-transform/core';
const root=path.resolve(import.meta.dirname,'../../../..');const local=path.resolve(root,'../devonian-authoring/acanthostega');const io=new NodeIO();
for(const level of ['full','lod']){
 const file=path.join(local,'v1-candidate',`acanthostega${level==='lod'?'.lod1':''}.glb`);const bytes=await fs.readFile(file);const doc=await io.readBinary(bytes);const meshes=[];
 for(const node of doc.getRoot().listNodes())if(node.getMesh()){
  const m=node.getWorldMatrix();for(const [pi,p]of node.getMesh().listPrimitives().entries()){
   const a=p.getAttribute('POSITION');const positions=[];for(let i=0;i<a.getCount();i++){const v=a.getElement(i,[]);positions.push([m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12],m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13],m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]]);}meshes.push({name:node.getName(),primitive:pi,material:p.getMaterial()?.getName(),positions,indices:Array.from(p.getIndices().getArray())});
  }
 }
 const out=path.join(local,'eye-audit-'+level);await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'acanthostega.geometry.json'),JSON.stringify({id:'acanthostega',revision:'local-v1-'+level,asset:file,sha256:createHash('sha256').update(bytes).digest('hex'),coordinateSystem:'glTF +Y up +Z forward',meshes}));console.log(out);
}
