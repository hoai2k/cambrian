/** Validate the actual packaged pair and the animated backup body.
 *
 * Which generation is in front is `FRONT` in `build.py` and nothing here names it: the pair is
 * whatever `askeptosaurus.glb`/`.puppet.glb` hold and the backup is whatever `.backup.glb` holds,
 * so the swap is checked by the same code before and after it.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { auditCutAttachment } from '../_pipeline/cut-attachment.mjs';
import { auditPair, tracker, lateral, anchorTravel, hash } from '../_pipeline/paired-audit.mjs';
const id='askeptosaurus',base=`public/assets/triassic/creatures/${id}`,here=`tools/triassic/creatures/${id}`,local=`local/triassic-authoring/${id}`;
const {report,CLIPS,LOOPS,authored,write}=await auditPair({id,base,here,local,joints:33,sockets:3});
const track=tracker(authored);
report.gait=['Swim','Sprint'].map(clip=>{
 const rows=track(clip,['skull','tail_05','tail_11','fore_upper_L:tip','fore_upper_R:tip']);
 const travel=Object.fromEntries(['skull','tail_05','tail_11','fore_upper_L:tip','fore_upper_R:tip'].map(n=>[n,lateral(rows,n)]));
 assert(travel.tail_11>travel.skull*3,`${clip}: tail must drive the stroke`);
 return {clip,travel};
});
report.anchorTravel=anchorTravel(track,CLIPS);
report.jaw=CLIPS.map(clip=>{
 const rows=track(clip,['anchor_mouth']);const angles=rows.map(r=>r.jawAngle);
 assert(Math.min(...angles)>-.005,`${clip}: jaw cannot close through the upper snout`);
 if(['Idle','Swim','Sprint','Dive','Rise','TurnLeft','TurnRight','Dodge','Dash','Heavy','Ability'].includes(clip))assert(Math.max(...angles)<.001,`${clip}: mouth must rest closed`);
 return {clip,maxOpenRadians:Math.max(...angles),minRadians:Math.min(...angles)};
});
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const signature=d=>d.getRoot().listAnimations().map(a=>({name:a.getName(),channels:a.listChannels().map(c=>({node:c.getTargetNode().getName(),path:c.getTargetPath(),times:[...c.getSampler().getInput().getArray()],values:[...c.getSampler().getOutput().getArray()]}))}));
let backup=await io.read(base+'.backup.glb');
if(process.argv.includes('--package')){
 const before=signature(backup);
 backup.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.QUANTIZE});
 const bytes=await io.writeBinary(backup);backup=await io.readBinary(bytes);assert.deepEqual(signature(backup),before,'backup clips unchanged by packaging');fs.writeFileSync(base+'.backup.glb',bytes);
}
assert.deepEqual(backup.getRoot().listAnimations().map(a=>a.getName()).sort(),[...CLIPS].sort(),'backup public clip names');
for (const mesh of backup.getRoot().listMeshes()) for (const primitive of mesh.listPrimitives()) {
 const weights=primitive.getAttribute('WEIGHTS_0'); assert(weights,'backup skin weights');
 for(let i=0;i<weights.getCount();i++){const row=weights.getElement(i,[]);assert(row.every(v=>Number.isFinite(v)&&v>=0));assert(Math.abs(row.reduce((a,b)=>a+b,0)-1)<1e-5,'backup normalized weights');}
}
for (const row of JSON.parse(fs.readFileSync(`${here}/backup-source-manifest.json`))) {
 if(row.retiredFromPublic)continue;assert.equal(hash(fs.readFileSync(row.path)),row.sha256,'original source remains unchanged');
}
const sockets=backup.getRoot().listNodes().filter(n=>n.getName().startsWith('anchor_'));
assert.equal(sockets.length,3);for(const n of sockets)assert(n.getExtras().cambrianAnchor?.version===1);
for(const a of backup.getRoot().listAnimations())for(const c of a.listChannels()){
 assert(c.getTargetNode().getName()!=='root');assert(c.getTargetPath()!=='scale');
 const arr=c.getSampler().getOutput().getArray();assert([...arr].every(Number.isFinite));
 if(LOOPS.includes(a.getName())){const width=c.getTargetPath()==='rotation'?4:3;for(let j=0;j<width;j++)assert(Math.abs(arr[j]-arr[arr.length-width+j])<1e-4,`${a.getName()}: backup loop seam`);}
}
const bytes=fs.readFileSync(base+'.backup.glb');const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');const mixer=new THREE.AnimationMixer(gltf.scene);const meshes=[];gltf.scene.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o)});
const backupTrack=tracker({gltf,scene:gltf.scene,mixer});
const backupJaw=CLIPS.map(clip=>{const rows=backupTrack(clip,['anchor_mouth'],60);const angles=rows.map(r=>r.jawAngle);
 assert(Math.min(...angles)>-.005,`${clip}: backup jaw must not close through its snout`);
 if(['Idle','Swim','Sprint','Dive','Rise','TurnLeft','TurnRight','Dodge','Dash','Heavy','Ability'].includes(clip))assert(Math.max(...angles)<.001,`${clip}: backup mouth closed`);
 return {clip,minRadians:Math.min(...angles),maxOpenRadians:Math.max(...angles)};});
report.backup={jaw:backupJaw,bytes:bytes.length,sha256:hash(bytes),restPose:JSON.parse(fs.readFileSync(`${here}/backup-validation.json`,'utf8')).body+' body; its own axis, rest skeleton and resting constants',clips:[]};
for(const clip of gltf.animations){
 mixer.stopAllAction();const a=mixer.clipAction(clip).reset().play();a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;const initial=[];let travel=0;
 for(let step=0;step<=60;step++){
  mixer.setTime(clip.duration*step/60);gltf.scene.updateMatrixWorld(true);let k=0;
  for(const m of meshes){m.skeleton.update();const p=m.geometry.attributes.position;
   for(let v=0;v<p.count;v+=Math.max(1,Math.floor(p.count/500))){const q=new THREE.Vector3().fromBufferAttribute(p,v);m.applyBoneTransform(v,q);q.applyMatrix4(m.matrixWorld);assert(q.toArray().every(Number.isFinite));if(!step)initial.push(q.clone());else travel=Math.max(travel,q.distanceTo(initial[k]));k++;}
  }
 }
 assert(travel>.01,`${clip.name}: backup visibly moves`);report.backup.clips.push({name:clip.name,duration:clip.duration,samples:61,maxVertexTravel:travel});
}
if(process.argv.includes('--decode')){for(const e of backup.getRoot().listExtensionsUsed())if(e.extensionName==='EXT_meshopt_compression')e.dispose();fs.writeFileSync(`${local}/${id}.backup.unpacked.glb`,await io.writeBinary(backup));}
report.cutAttachment={};
for(const suffix of ['', '.puppet', '.backup']){
 const validation=JSON.parse(fs.readFileSync(`${here}/${suffix==='.backup'?'backup-':''}validation.json`));
 report.cutAttachment[suffix||'authored']=await auditCutAttachment(`${base}${suffix}.glb`,-validation.mouth.hingeY*6);
}
write();console.log(JSON.stringify({models:report.models,clips:CLIPS.length,gait:report.gait,backup:report.backup},null,2));
