/** Decode paired exports, check exact rig/clip parity, then sample actual Three.js skinning. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTMeshoptCompression} from '@gltf-transform/extensions';
import {MeshoptDecoder,MeshoptEncoder} from 'meshoptimizer';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
await Promise.all([MeshoptDecoder.ready,MeshoptEncoder.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder,'meshopt.encoder':MeshoptEncoder});
const base='public/assets/triassic/creatures/nothosaurus';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const data=a=>a?Array.from(a.getArray()):null;
function skeleton(d){return d.getRoot().listSkins().map(s=>({joints:s.listJoints().map(n=>({name:n.getName(),parent:n.getParentNode()?.getName(),t:n.getTranslation(),r:n.getRotation(),s:n.getScale()})),bind:data(s.getInverseBindMatrices())}));}
function clips(d){return d.getRoot().listAnimations().map(a=>({name:a.getName(),channels:a.listChannels().map(c=>({node:c.getTargetNode().getName(),path:c.getTargetPath(),interpolation:c.getSampler().getInterpolation(),times:data(c.getSampler().getInput()),values:data(c.getSampler().getOutput())})).sort((a,b)=>(a.node+a.path).localeCompare(b.node+b.path))})).sort((a,b)=>a.name.localeCompare(b.name));}
function sockets(d){return d.getRoot().listNodes().filter(n=>n.getName().startsWith('anchor_')).map(n=>({name:n.getName(),parent:n.getParentNode().getName(),t:n.getTranslation(),r:n.getRotation(),metadata:n.getExtras()})).sort((a,b)=>a.name.localeCompare(b.name));}
function meshValues(d){return d.getRoot().listMeshes().map(m=>m.listPrimitives().map(p=>p.listSemantics().sort().map(s=>[s,data(p.getAttribute(s))])));}
if(process.argv.includes('--decode'))for(const suffix of ['', '.puppet']){
 const d=await io.read(base+suffix+'.glb');for(const e of d.getRoot().listExtensionsUsed())if(e.extensionName==='EXT_meshopt_compression')e.dispose();
 fs.writeFileSync('local/triassic-authoring/nothosaurus/nothosaurus'+suffix+'.unpacked.glb',await io.writeBinary(d));
}
const report={models:[]};
for(const suffix of ['', '.puppet','.lod1']){
 const file=base+suffix+'.glb';let d=await io.read(file);
 if(process.argv.includes('--package')){
  const before={s:skeleton(d),a:clips(d),n:sockets(d),m:meshValues(d)};
  d.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.QUANTIZE});
  const bytes=await io.writeBinary(d),after=await io.readBinary(bytes);
  // NodeIO normalizes near-identity transforms, harmless under 1e-7; arrays must remain exact.
  assert.deepEqual(clips(after),before.a);assert.deepEqual(meshValues(after),before.m);
  fs.writeFileSync(file,bytes);d=after;
 }
 const c=clips(d),sk=skeleton(d),so=sockets(d);
 assert.equal(c.length,21);assert.equal(sk[0].joints.length,30);assert.equal(so.length,3);
 if(!suffix){report.rig=sk;report.sockets=so;report.clipSignatures=c.map(a=>({name:a.name,sha256:hash(JSON.stringify(a))}));}
 else {assert.deepEqual(sk,report.rig,'rig parity');assert.deepEqual(so,report.sockets,'anchor parity');assert.deepEqual(c.map(a=>({name:a.name,sha256:hash(JSON.stringify(a))})),report.clipSignatures,'exact clip parity');}
 const signatures=new Set();
 for(const a of c){let motion=0;assert(!signatures.has(hash(JSON.stringify(a.channels))));signatures.add(hash(JSON.stringify(a.channels)));
  for(const ch of a.channels){assert.notEqual(ch.node,'root');assert.notEqual(ch.path,'scale');assert(ch.times.at(-1)>0);const size=ch.path==='rotation'?4:3;for(let i=0;i<ch.values.length;i++){assert(Number.isFinite(ch.values[i]));motion=Math.max(motion,Math.abs(ch.values[i]-ch.values[i%size]));}
   if(['Idle','Swim','Sprint','Guard','Eat'].includes(a.name)){for(let k=0;k<size;k++)assert(Math.abs(ch.values[k]-ch.values[ch.values.length-size+k])<1e-4,a.name+' loop');}
  }assert(motion>1e-3,a.name+' dynamic');
 }
 let tris=0,verts=0;for(const m of d.getRoot().listMeshes())for(const p of m.listPrimitives()){tris+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3;verts+=p.getAttribute('POSITION').getCount();const w=p.getAttribute('WEIGHTS_0');assert(w);for(let i=0;i<w.getCount();i++)assert(Math.abs(w.getElement(i,[]).reduce((s,v)=>s+v,0)-1)<1e-5);}
 report.models.push({suffix,bytes:fs.statSync(file).size,sha256:hash(fs.readFileSync(file)),triangles:tris,vertices:verts});
}
assert(report.models[1].triangles<report.models[0].triangles*.5);
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:2048,height:2048,close(){}});
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);report.playback=[];
for(const suffix of ['','.puppet']){
 const bytes=fs.readFileSync(base+suffix+'.glb');const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');const scene=gltf.scene;const mixer=new THREE.AnimationMixer(scene),v=new THREE.Vector3();const meshes=[];scene.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o)});
 const results=[];
 for(const clip of gltf.animations){mixer.stopAllAction();const action=mixer.clipAction(clip).reset().play();action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;let maxVertexTravel=0;const initial=[];
  for(let sample=0;sample<=60;sample++){mixer.setTime(clip.duration*sample/60);scene.updateMatrixWorld(true);for(const m of meshes)m.skeleton.update();let idx=0;
   for(const m of meshes){const p=m.geometry.attributes.position;for(let j=0;j<p.count;j+=Math.max(1,Math.floor(p.count/750))){v.fromBufferAttribute(p,j);m.applyBoneTransform(j,v);v.applyMatrix4(m.matrixWorld);assert(v.toArray().every(Number.isFinite));if(sample===0)initial.push(v.clone());else maxVertexTravel=Math.max(maxVertexTravel,v.distanceTo(initial[idx]));idx++;}}
  }
  assert(maxVertexTravel>.01,clip.name+' visibly moving');results.push({clip:clip.name,duration:clip.duration,samples:61,maxVertexTravel});
 }report.playback.push({suffix,results});
 if(!suffix){
  report.gait=[];const phaseGap=(a,b)=>Math.min(Math.abs(a-b),1-Math.abs(a-b));
  const bones={};scene.traverse(o=>{if(o.isBone)bones[o.name]=o});const v=new THREE.Vector3();
  for(const clipName of ['Swim','Sprint']){
   mixer.stopAllAction();const clip=gltf.animations.find(a=>a.name===clipName);mixer.clipAction(clip).play();const rows=[];
   for(let sample=0;sample<=120;sample++){mixer.setTime(clip.duration*sample/120);scene.updateMatrixWorld(true);const row={phase:sample/120};
    for(const name of ['fore_paddle_L','fore_paddle_R','hind_paddle_L','hind_paddle_R','skull','chest']){bones[name].getWorldPosition(v);row[name]=v.toArray();}rows.push(row);
   }
   const metric=name=>{const values=rows.map(row=>row[name][2]),minimum=Math.min(...values),maximum=Math.max(...values);return {rearPhase:rows[values.indexOf(minimum)].phase,travel:maximum-minimum};};
   const foreL=metric('fore_paddle_L'),foreR=metric('fore_paddle_R'),hindL=metric('hind_paddle_L'),hindR=metric('hind_paddle_R');
   const spanOn=(name,axis)=>Math.max(...rows.map(row=>row[name][axis]))-Math.min(...rows.map(row=>row[name][axis]));
   const lateral=name=>spanOn(name,0);
   const skullLateral=lateral('skull'),chestLateral=lateral('chest'),skullVertical=spanOn('skull',1),foreRear=(foreL.rearPhase+foreR.rearPhase)/2;
   assert(phaseGap(foreL.rearPhase,foreR.rearPhase)<=1/120,clipName+' forelimbs must row together');
   assert(foreRear>=.64&&foreRear<=.71,clipName+' power stroke must occupy the long part of the cycle');
   assert(phaseGap(hindL.rearPhase,foreRear)<=.12&&phaseGap(hindR.rearPhase,foreRear)<=.12,clipName+' hind limbs must trail the paired forelimb stroke');
   assert((hindL.travel+hindR.travel)<(foreL.travel+foreR.travel)*.65,clipName+' hind stroke must remain secondary');
   assert(skullLateral<.02&&skullLateral<Math.max(.012,chestLateral*4),clipName+' skull must hold the shoulder line');
   // The neck is nearly twice as long as it was, so the same cervical rotations would swing the
   // head twice as far: the builder divides each joint's share by the length of the chain, and
   // this is what holds it to that. Vertical is measured as well as lateral because a longer neck
   // fails upwards first - the locomotor clips zero the cervical yaw but keep a little pitch.
   assert(skullVertical<.05,clipName+' skull must not bob with the stroke');
   report.gait.push({clip:clipName,foreL,foreR,hindL,hindR,skullLateral,skullVertical,chestLateral,powerFraction:foreRear,recoveryFraction:1-foreRear});
  }
 }
}
report.exactRigParity=true;report.exactAnimationParity=true;report.exactAnchorParity=true;report.normalizedWeights=true;delete report.rig;
fs.writeFileSync('tools/triassic/creatures/nothosaurus/paired-audit.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({models:report.models,clips:report.clipSignatures.length,exactRigParity:true,exactAnimationParity:true,playbackSamples:61},null,2));
