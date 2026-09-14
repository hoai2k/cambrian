/** Decode the V3 candidate's full and LOD geometry for the frozen eye auditor.
 * V3 counterpart of audit-export.mjs (added, never edited): reads v3-candidate,
 * writes v3-audit-full / v3-audit-lod, and names the V3 head/eye meshes. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder, MeshoptEncoder} from 'meshoptimizer';
const H=import.meta.dirname, R=path.resolve(H,'../../../..'), L=path.resolve(R,'../devonian-authoring/bothriolepis');
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder,'meshopt.encoder':MeshoptEncoder});
const selectors={bothriolepis:{headMesh:'bothriolepis_cuirass_v3',eyeMeshes:['Closed inset eye L','Closed inset eye R']}};
for(const suffix of ['', '.lod1']){
 const out=path.join(L, suffix?'v3-audit-lod':'v3-audit-full');
 await fs.mkdir(out,{recursive:true});
 const asset=path.join(L,'v3-candidate',`bothriolepis${suffix}.glb`);
 const bytes=await fs.readFile(asset), doc=await io.readBinary(bytes), meshes=[];
 for(const node of doc.getRoot().listNodes()) if(node.getMesh()){
  const m=node.getWorldMatrix();
  for(const [pi,p] of node.getMesh().listPrimitives().entries()){
   const pa=p.getAttribute('POSITION'), positions=[];
   for(let i=0;i<pa.getCount();i++){const v=pa.getElement(i,[]);
    positions.push([m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12],m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13],m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]]);}
   meshes.push({name:node.getName(),primitive:pi,material:p.getMaterial()?.getName(),positions,
                indices:Array.from(p.getIndices()?.getArray()||positions.flatMap((_,i)=>i))});
  }
 }
 await fs.writeFile(path.join(out,'bothriolepis.geometry.json'),JSON.stringify({id:'bothriolepis',
   revision:'local-v3-candidate'+suffix,asset,sha256:createHash('sha256').update(bytes).digest('hex'),
   coordinateSystem:'glTF +Y up +Z forward; exported world-space rest geometry',meshes}));
 await fs.writeFile(path.join(out,'selectors.json'),JSON.stringify(selectors,null,1));
 console.log(out);
}
