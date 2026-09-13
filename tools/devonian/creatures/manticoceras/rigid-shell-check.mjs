/** Verify the actual full/LOD shell skin cannot deform with arms, head or funnel. */
import fs from 'node:fs/promises';import path from 'node:path';import{createHash}from'node:crypto';import{NodeIO}from'@gltf-transform/core';
const home=import.meta.dirname,local=path.resolve(home,'../../../../../devonian-authoring/manticoceras'),results=[];
for(const suffix of['','.lod1']){
 const file=path.join(local,'initial-candidate/manticoceras'+suffix+'.glb'),bytes=await fs.readFile(file),doc=await new NodeIO().readBinary(bytes),shell=[];
 for(const node of doc.getRoot().listNodes()){
  if(!node.getMesh()||!(/shell|body chamber/i.test(node.getName())))continue;
  const joints=node.getSkin().listJoints(),bodyIndex=joints.findIndex(j=>j.getName()==='body');let count=0;
  for(const p of node.getMesh().listPrimitives()){
   const js=p.getAttribute('JOINTS_0'),ws=p.getAttribute('WEIGHTS_0');
   for(let i=0;i<ws.getCount();i++){const w=ws.getElement(i,[]),j=js.getElement(i,[]);for(let k=0;k<w.length;k++)if(w[k]>1e-6&&j[k]!==bodyIndex)throw Error('Nonrigid shell '+node.getName());count++;}
  }
  shell.push({name:node.getName(),vertices:count,soleBone:'body'});
 }
 if(shell.length!==4)throw Error('Expected outer shell, chamber, aperture and central protoconch');results.push({file:path.basename(file),sha256:createHash('sha256').update(bytes).digest('hex'),shell});
}
await fs.writeFile(path.join(home,'rigid-shell-validation.json'),JSON.stringify(results,null,2));console.log('PASS both rigid shells, four parts each');
