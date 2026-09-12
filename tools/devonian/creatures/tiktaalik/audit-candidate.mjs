/** Decode a local candidate for the shared independent eye-volume auditor.
 *
 * TIKTAALIK_CHECK_SUFFIX (default v2) selects the candidate directory (<suffix>-candidate) and
 * the revision label, so a v3 candidate can be audited without touching the v2 candidate.
 */
import fs from 'node:fs/promises';import path from 'node:path';import {createHash}from'node:crypto';import {NodeIO}from'@gltf-transform/core';
const SUFFIX=process.env.TIKTAALIK_CHECK_SUFFIX||'v2';
const root=path.resolve(import.meta.dirname,'../../../..');const local=path.resolve(root,'../devonian-authoring/tiktaalik');const io=new NodeIO();
for(const level of ['full','lod']){
 const file=path.join(local,SUFFIX+'-candidate',`tiktaalik${level==='lod'?'.lod1':''}.glb`);const bytes=await fs.readFile(file);const doc=await io.readBinary(bytes);const meshes=[];
 for(const node of doc.getRoot().listNodes())if(node.getMesh()){
  const m=node.getWorldMatrix();for(const [pi,p]of node.getMesh().listPrimitives().entries()){
   const a=p.getAttribute('POSITION');const positions=[];for(let i=0;i<a.getCount();i++){const v=a.getElement(i,[]);positions.push([m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12],m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13],m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]]);}meshes.push({name:node.getName(),primitive:pi,material:p.getMaterial()?.getName(),positions,indices:Array.from(p.getIndices().getArray())});
  }
 }
 // Keep the README's documented 'eye-audit-full'/'eye-audit-lod' names for the default v2
 // candidate; only a non-default suffix (e.g. v3) gets its own directory, so as not to move the
 // v2 output the README's reproduce steps and eye-audit.py invocation still name literally.
 const out=path.join(local,SUFFIX==='v2'?'eye-audit-'+level:'eye-audit-'+SUFFIX+'-'+level);await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'tiktaalik.geometry.json'),JSON.stringify({id:'tiktaalik',revision:'local-'+SUFFIX+'-'+level,asset:file,sha256:createHash('sha256').update(bytes).digest('hex'),coordinateSystem:'glTF +Y up +Z forward',meshes}));console.log(out);
}
