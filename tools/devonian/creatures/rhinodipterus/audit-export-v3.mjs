// V3 port of audit-export.mjs: reads the v3-candidate/ GLB and writes to v3-eye-audit(-lod)/
// instead of v2-eye-audit(-lod)/. Mesh names (head_envelope_closed, eye_globe_L/R) are unchanged
// by the study, so the selector is identical.
import fs from 'node:fs/promises';import path from 'node:path';import{createHash}from'node:crypto';import{NodeIO}from'@gltf-transform/core';
const lod=process.argv.includes('--lod');
const root=path.resolve(import.meta.dirname,'../../../..'),local=path.resolve(root,'../devonian-authoring/rhinodipterus'),out=path.join(local,lod?'v3-eye-audit-lod':'v3-eye-audit');await fs.mkdir(out,{recursive:true});
const file=path.join(local,'v3-candidate/rhinodipterus'+(lod?'.lod1':'')+'.glb'),bytes=await fs.readFile(file),doc=await new NodeIO().readBinary(bytes),meshes=[];
for(const n of doc.getRoot().listNodes())if(n.getMesh())for(const [pi,p]of n.getMesh().listPrimitives().entries()){
 const a=p.getAttribute('POSITION'),m=n.getWorldMatrix(),positions=[];for(let i=0;i<a.getCount();i++){const v=a.getElement(i,[]);positions.push([m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12],m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13],m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]]);}
 meshes.push({name:n.getName(),primitive:pi,material:p.getMaterial().getName(),positions,indices:Array.from(p.getIndices().getArray())});
}
await fs.writeFile(path.join(out,'rhinodipterus.geometry.json'),JSON.stringify({id:'rhinodipterus',revision:'V3 candidate',sha256:createHash('sha256').update(bytes).digest('hex'),meshes}));
await fs.writeFile(path.join(out,'selectors.json'),JSON.stringify({rhinodipterus:{headMesh:'head_envelope_closed',eyeMeshes:['eye_globe_L','eye_globe_R']}}));
console.log(out);console.log('Textures',doc.getRoot().listTextures().map(t=>t.getName()));
