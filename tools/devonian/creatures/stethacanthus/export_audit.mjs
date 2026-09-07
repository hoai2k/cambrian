/** Decode candidate-only full and LOD geometry for the independent frozen eye auditor. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
const H=import.meta.dirname,R=path.resolve(H,'../../../..'),L=path.resolve(R,'../devonian-authoring/stethacanthus/v2');
const io=new NodeIO();
for(const suffix of ['', '.lod1']){
 const out=path.join(L,suffix?'audit-lod':'audit-full');await fs.mkdir(out,{recursive:true});
 const asset=path.join(L,'candidate',`stethacanthus${suffix}.glb`),bytes=await fs.readFile(asset),doc=await io.readBinary(bytes),meshes=[];
 for(const node of doc.getRoot().listNodes())if(node.getMesh()){
  const m=node.getWorldMatrix();
  for(const [pi,p]of node.getMesh().listPrimitives().entries()){
   const pa=p.getAttribute('POSITION'),positions=[];for(let i=0;i<pa.getCount();i++){let v=pa.getElement(i,[]);positions.push([m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12],m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13],m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]]);}
   meshes.push({name:node.getName(),primitive:pi,material:p.getMaterial()?.getName(),positions,indices:Array.from(p.getIndices()?.getArray()||positions.flatMap((_,i)=>i))});
  }
 }
 await fs.writeFile(path.join(out,'stethacanthus.geometry.json'),JSON.stringify({id:'stethacanthus',revision:'local-v2-candidate'+suffix,asset,sha256:createHash('sha256').update(bytes).digest('hex'),coordinateSystem:'glTF +Y up +Z forward; exported world-space rest geometry',meshes}));
 console.log(out);
}
