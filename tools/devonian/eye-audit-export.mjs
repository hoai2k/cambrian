/** Snapshot and decode committed geometry; does not read mutable authoring outputs. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
const root=path.resolve(import.meta.dirname,'../..'), revision=process.argv[2]||'1e43197';
const working=revision==='--working';
const label=working?'working-'+new Date().toISOString().replace(/[:.]/g,'-'):revision;
const out=path.resolve(root,'../devonian-authoring/eye-audit',label); await fs.mkdir(out,{recursive:true});
const ids=process.argv.slice(3).length?process.argv.slice(3):JSON.parse(execFileSync('git',['show',`${working?'HEAD':revision}:tools/devonian/shipped.json`],{cwd:root})).creatures;
if(ids.some(id=>!/^[-a-z]+$/.test(id)))throw new Error('Invalid creature ID');
await MeshoptDecoder.ready;const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
for(const id of ids){
 const asset=`public/assets/devonian/creatures/${id}.glb`, bytes=working?await fs.readFile(path.join(root,asset)):execFileSync('git',['show',`${revision}:${asset}`],{cwd:root,maxBuffer:100*1024*1024});
 const doc=await io.readBinary(bytes), meshes=[];
 for(const node of doc.getRoot().listNodes())if(node.getMesh()){
  const m=node.getWorldMatrix();
  for(const [pi,p]of node.getMesh().listPrimitives().entries()){
   const pa=p.getAttribute('POSITION'),positions=[];for(let i=0;i<pa.getCount();i++){let v=pa.getElement(i,[]);positions.push([m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12],m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13],m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]]);}
   meshes.push({name:node.getName(),primitive:pi,material:p.getMaterial()?.getName(),positions,indices:Array.from(p.getIndices()?.getArray()||positions.flatMap((_,i)=>i))});
  }
 }
 await fs.writeFile(path.join(out,`${id}.geometry.json`),JSON.stringify({id,revision:label,sha256:createHash('sha256').update(bytes).digest('hex'),coordinateSystem:'glTF +Y up +Z forward, rest/bind mesh world space',meshes}));
 await fs.writeFile(path.join(out,`${id}.source.py`),working?await fs.readFile(path.join(root,`tools/devonian/creatures/${id}/build.py`)):execFileSync('git',['show',`${revision}:tools/devonian/creatures/${id}/build.py`],{cwd:root}));
 console.log(id,meshes.map(m=>`${m.name}/${m.material}: ${m.positions.length}`).join('; '));
}
console.log(out);
