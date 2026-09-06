/** Evaluate exported skin deformation and clip contracts with the game's Three.js loader.
 * Textures are omitted only for this headless CPU validation; game GLBs are untouched.
 * Usage: node tools/creatures/soft/validate.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import {AnimationMixer, LoopOnce, Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
await MeshoptDecoder.ready;
const ids=['pikaia','nectocaris','ottoia','odontogriphus','vetulicola'];
const required={Idle:null,Attack:1,Hit:.6,Death:1.6,TurnLeft:2.4,TurnRight:2.4,Dive:2.4,Rise:2.4,Bite:.5,Heavy:1.1,Guard:1,Parry:.35,Dodge:.4,Eat:.8,Stagger:1.2,Ability:1.2,Moult:1.5};
function headless(raw){
 const len=raw.readUInt32LE(12),g=JSON.parse(raw.subarray(20,20+len));
 for(const mesh of g.meshes)for(const p of mesh.primitives)delete p.material;
 g.materials=[];
 const js=Buffer.from(JSON.stringify(g));const pad=Buffer.alloc((4-js.length%4)%4,32);const bin=raw.subarray(20+len);
 const out=Buffer.alloc(20);out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length+js.length+pad.length+bin.length,8);out.writeUInt32LE(js.length+pad.length,12);out.writeUInt32LE(0x4e4f534a,16);
 const result=Buffer.concat([out,js,pad,bin]);return result.buffer.slice(result.byteOffset,result.byteOffset+result.byteLength);
}
const result={};
for(const id of ids){
 result[id]={};
 for(const suffix of ['','.lod1']){
  const file=path.resolve('public/assets/creatures',id+suffix+'.glb');const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(headless(fs.readFileSync(file)),'');
  const clips=gltf.animations;const mesh=[];gltf.scene.traverse(o=>{if(o.isSkinnedMesh)mesh.push(o);});if(!mesh.length)throw Error(id+' missing skin');
  const expected={...required,[['ottoia','odontogriphus'].includes(id)?'Crawl':'Swim']:['ottoia','odontogriphus'].includes(id)?2:2.4};if(id==='nectocaris')expected.Grab=.9;
  for(const [name,duration]of Object.entries(expected)){
   const clip=clips.find(c=>c.name===name);if(!clip)throw Error(id+' missing '+name);if(duration&&Math.abs(clip.duration-duration)>1e-5)throw Error(id+' timing '+name+' '+clip.duration);
  }
  for(const c of clips)for(const t of c.tracks)if(/\.scale$/.test(t.name))throw Error(id+' animated scale');
  const mixer=new AnimationMixer(gltf.scene);const report={};
  function sample(){
   gltf.scene.updateMatrixWorld(true);let out=[];
   for(const m of mesh){m.skeleton.update();const pos=m.geometry.attributes.position;const step=Math.max(1,Math.floor(pos.count/160));for(let i=0;i<pos.count;i+=step){const v=new Vector3().fromBufferAttribute(pos,i);m.applyBoneTransform(i,v);if(![v.x,v.y,v.z].every(Number.isFinite))throw Error(id+' nonfinite exported skin');out.push(v);}}
   return out;
  }
  for(const c of clips){
   mixer.stopAllAction();const a=mixer.clipAction(c);a.reset().setLoop(LoopOnce,1);a.clampWhenFinished=true;a.play();mixer.setTime(0);const base=sample();let displacement=0;
   for(const frac of [.2,.4,.6,.8]){mixer.setTime(c.duration*frac);const next=sample();for(let i=0;i<base.length;i++)displacement=Math.max(displacement,base[i].distanceTo(next[i]));}
   if(displacement<1e-4)throw Error(id+' static action '+c.name);
   mixer.setTime(c.duration);const end=sample();const seam=Math.max(...base.map((p,i)=>p.distanceTo(end[i])));
   if(c.name!=='Death'&&seam>1e-3)throw Error(id+' exported seam '+c.name+' '+seam);
   report[c.name]={seconds:c.duration,maximumSampledDisplacement:displacement,endpointDistance:seam};
  }
  result[id][suffix||'full']={meshes:mesh.length,clips:report};console.log(id+suffix+': '+clips.length+' deforming clips; finite; timing / endpoints / skin passed');
 }
}
fs.mkdirSync('tools/creatures/soft/reports',{recursive:true});fs.writeFileSync('tools/creatures/soft/reports/exported-skin-validation.json',JSON.stringify(result,null,2)+'\n');
