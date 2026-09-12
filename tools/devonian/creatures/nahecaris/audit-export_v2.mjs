// v2 copy of audit-export.mjs, reading v2-candidate instead of initial-candidate and writing to
// distinctly-named output dirs so the shipped candidate's own eye-audit exports are untouched.
import fs from 'node:fs/promises';import path from 'node:path';import{createHash}from'node:crypto';import{NodeIO}from'@gltf-transform/core';
const lod=process.argv.includes('--lod');
const root=path.resolve(import.meta.dirname,'../../../..'),local=path.resolve(root,'../devonian-authoring/nahecaris'),out=path.join(local,lod?'v2cand-eye-audit-lod':'v2cand-eye-audit');await fs.mkdir(out,{recursive:true});
const file=path.join(local,'v2-candidate/nahecaris'+(lod?'.lod1':'')+'.glb'),bytes=await fs.readFile(file),doc=await new NodeIO().readBinary(bytes),meshes=[];
for(const n of doc.getRoot().listNodes())if(n.getMesh())for(const [pi,p]of n.getMesh().listPrimitives().entries()){
 const a=p.getAttribute('POSITION'),m=n.getWorldMatrix(),positions=[];for(let i=0;i<a.getCount();i++){const v=a.getElement(i,[]);positions.push([m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12],m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13],m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]]);}
 meshes.push({name:n.getName(),primitive:pi,material:p.getMaterial().getName(),positions,indices:Array.from(p.getIndices().getArray())});
}
await fs.writeFile(path.join(out,'nahecaris.geometry.json'),JSON.stringify({id:'nahecaris',revision:'v2 shape-study candidate',sha256:createHash('sha256').update(bytes).digest('hex'),meshes}));
await fs.writeFile(path.join(out,'selectors.json'),JSON.stringify({nahecaris:{headMesh:'head_envelope_closed',eyeMeshes:['eye_globe_L','eye_globe_R']}}));
console.log(out);console.log('Textures',doc.getRoot().listTextures().map(t=>t.getName()));
