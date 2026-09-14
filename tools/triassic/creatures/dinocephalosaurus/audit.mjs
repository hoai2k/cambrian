/**
 * Decode the paired exports, prove exact rig/socket/clip parity, then sample real Three.js
 * skinning. The assertions specific to this animal are all about the neck, because the neck is
 * the animal: it must bend along its whole length rather than pivot at its base, the bend must
 * travel down the chain, and the head must reach a long way while the body stays where it is.
 */
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
const base='public/assets/triassic/creatures/dinocephalosaurus';
const LOOPS=['Idle','Swim','Sprint','Guard','Eat','Grab','Periscope','Breathe'];
const CLIPS=24,JOINTS=57,SOCKETS=3,CERVICALS=32;
const NECK=[...Array(CERVICALS).keys()].map(i=>'neck_'+String(i).padStart(2,'0'));
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const data=a=>a?Array.from(a.getArray()):null;
const skeleton=d=>d.getRoot().listSkins().map(s=>({joints:s.listJoints().map(n=>({name:n.getName(),parent:n.getParentNode()?.getName(),t:n.getTranslation(),r:n.getRotation(),s:n.getScale()})),bind:data(s.getInverseBindMatrices())}));
const clips=d=>d.getRoot().listAnimations().map(a=>({name:a.getName(),channels:a.listChannels().map(c=>({node:c.getTargetNode().getName(),path:c.getTargetPath(),interpolation:c.getSampler().getInterpolation(),times:data(c.getSampler().getInput()),values:data(c.getSampler().getOutput())})).sort((x,y)=>(x.node+x.path).localeCompare(y.node+y.path))})).sort((a,b)=>a.name.localeCompare(b.name));
const sockets=d=>d.getRoot().listNodes().filter(n=>n.getName().startsWith('anchor_')).map(n=>({name:n.getName(),parent:n.getParentNode().getName(),t:n.getTranslation(),r:n.getRotation(),metadata:n.getExtras()})).sort((a,b)=>a.name.localeCompare(b.name));
const meshValues=d=>d.getRoot().listMeshes().map(m=>m.listPrimitives().map(p=>p.listSemantics().sort().map(s=>[s,data(p.getAttribute(s))])));
if(process.argv.includes('--decode'))for(const suffix of ['','.puppet']){
 const d=await io.read(base+suffix+'.glb');
 for(const e of d.getRoot().listExtensionsUsed())if(e.extensionName==='EXT_meshopt_compression')e.dispose();
 fs.mkdirSync('local/triassic-authoring/dinocephalosaurus',{recursive:true});
 fs.writeFileSync('local/triassic-authoring/dinocephalosaurus/dinocephalosaurus'+suffix+'.unpacked.glb',await io.writeBinary(d));
}
const report={models:[]};
for(const suffix of ['','.puppet','.lod1']){
 const file=base+suffix+'.glb';let d=await io.read(file);
 if(process.argv.includes('--package')){
  const before={a:clips(d),m:meshValues(d)};
  d.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.QUANTIZE});
  const bytes=await io.writeBinary(d),after=await io.readBinary(bytes);
  assert.deepEqual(clips(after),before.a,'packing changed an animation array');
  assert.deepEqual(meshValues(after),before.m,'packing changed a mesh attribute');
  fs.writeFileSync(file,bytes);d=after;
 }
 const c=clips(d),sk=skeleton(d),so=sockets(d);
 assert.equal(c.length,CLIPS);assert.equal(sk[0].joints.length,JOINTS);assert.equal(so.length,SOCKETS);
 // Thirty-two cervicals, and they are a chain: each one is the child of the one behind it.
 for(let i=0;i<CERVICALS;i++){
  const j=sk[0].joints.find(q=>q.name===NECK[i]);assert(j,'missing '+NECK[i]);
  assert.equal(j.parent,i?NECK[i-1]:'chest',NECK[i]+' is not in the cervical chain');
 }
 assert.equal(sk[0].joints.find(q=>q.name==='skull').parent,NECK[CERVICALS-1],'the skull rides the last cervical');
 if(!suffix){report.rig=sk;report.sockets=so;report.clipSignatures=c.map(a=>({name:a.name,sha256:hash(JSON.stringify(a))}));}
 else{assert.deepEqual(sk,report.rig,'rig parity');assert.deepEqual(so,report.sockets,'anchor parity');
  assert.deepEqual(c.map(a=>({name:a.name,sha256:hash(JSON.stringify(a))})),report.clipSignatures,'exact clip parity');}
 const signatures=new Set();
 for(const a of c){let motion=0;
  assert(!signatures.has(hash(JSON.stringify(a.channels))),a.name+' duplicates another clip');
  signatures.add(hash(JSON.stringify(a.channels)));
  for(const ch of a.channels){assert.notEqual(ch.node,'root');assert.notEqual(ch.path,'scale');assert(ch.times.at(-1)>0);
   const size=ch.path==='rotation'?4:3;
   for(let i=0;i<ch.values.length;i++){assert(Number.isFinite(ch.values[i]));motion=Math.max(motion,Math.abs(ch.values[i]-ch.values[i%size]));}
   if(LOOPS.includes(a.name))for(let k=0;k<size;k++)assert(Math.abs(ch.values[k]-ch.values[ch.values.length-size+k])<1e-4,a.name+' loop seam');
  }
  assert(motion>1e-3,a.name+' dynamic');
 }
 // Grab is a held loop, and the contract wants it between 0.9 and 1.2 seconds.
 const grab=c.find(a=>a.name==='Grab');assert(grab,'Grab exists');
 const grabDuration=Math.max(...grab.channels.map(ch=>ch.times.at(-1)));
 assert(grabDuration>=.9&&grabDuration<=1.2,'Grab must be a 0.9-1.2 s held loop: '+grabDuration);
 assert(LOOPS.includes('Grab'));
 let tris=0,verts=0;
 for(const m of d.getRoot().listMeshes())for(const p of m.listPrimitives()){
  tris+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3;verts+=p.getAttribute('POSITION').getCount();
  const w=p.getAttribute('WEIGHTS_0');assert(w,'skinned');
  for(let i=0;i<w.getCount();i++)assert(Math.abs(w.getElement(i,[]).reduce((s,v)=>s+v,0)-1)<1e-5,'normalized weights');
 }
 report.models.push({suffix,bytes:fs.statSync(file).size,sha256:hash(fs.readFileSync(file)),triangles:tris,vertices:verts});
}
report.lodTriangleFraction=report.models[1].triangles/report.models[0].triangles;
assert(report.lodTriangleFraction<=.40,'the reduced model must be at most 40% of the triangles');
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:2048,height:2048,close(){}});
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);report.playback=[];
for(const suffix of ['','.puppet']){
 const bytes=fs.readFileSync(base+suffix+'.glb');
 const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const scene=gltf.scene,mixer=new THREE.AnimationMixer(scene),v=new THREE.Vector3(),meshes=[];
 scene.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o)});
 const results=[];
 for(const clip of gltf.animations){
  mixer.stopAllAction();const action=mixer.clipAction(clip).reset().play();action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;
  let maxVertexTravel=0;const initial=[];
  for(let sample=0;sample<=60;sample++){
   mixer.setTime(clip.duration*sample/60);scene.updateMatrixWorld(true);for(const m of meshes)m.skeleton.update();let idx=0;
   for(const m of meshes){const pos=m.geometry.attributes.position;
    for(let j=0;j<pos.count;j+=Math.max(1,Math.floor(pos.count/750))){
     v.fromBufferAttribute(pos,j);m.applyBoneTransform(j,v);v.applyMatrix4(m.matrixWorld);
     assert(v.toArray().every(Number.isFinite));
     if(sample===0)initial.push(v.clone());else maxVertexTravel=Math.max(maxVertexTravel,v.distanceTo(initial[idx]));idx++;}}
  }
  assert(maxVertexTravel>.01,clip.name+' visibly moving');
  results.push({clip:clip.name,duration:clip.duration,samples:61,maxVertexTravel});
 }
 report.playback.push({suffix,results});
 if(!suffix){
  const bones={};scene.traverse(o=>{if(o.isBone)bones[o.name]=o});
  for(const n of NECK)assert(bones[n],'the cervical chain is in the scene');
  const track=(name,n)=>{mixer.stopAllAction();const clip=gltf.animations.find(a=>a.name===name);mixer.clipAction(clip).play();const rows=[];
   for(let i=0;i<=n;i++){mixer.setTime(clip.duration*i/n);scene.updateMatrixWorld(true);const row={phase:i/n};
    for(const b of Object.keys(bones)){bones[b].getWorldPosition(v);row[b]=v.toArray();}rows.push(row);}
   mixer.stopAllAction();return rows;};
  const span=(rows,b,axis)=>Math.max(...rows.map(r=>r[b][axis]))-Math.min(...rows.map(r=>r[b][axis]));
  const travel=(rows,b)=>{let m=0;const a=rows[0][b];for(const r of rows)m=Math.max(m,Math.hypot(r[b][0]-a[0],r[b][1]-a[1],r[b][2]-a[2]));return m;};
  // glTF axes on this rig: X is the animal's left (lateral), Y up, Z forward.
  report.gait=[];
  for(const name of ['Swim','Sprint']){
   const rows=track(name,120);
   const tip=span(rows,'tail_07',0),skull=span(rows,'skull',0);
   const clip=gltf.animations.find(a=>a.name===name);
   const yawPeak=bone=>{const t=clip.tracks.find(k=>k.name===bone+'.quaternion');
    let best=-Infinity,at=0;for(let i=0;i<t.times.length;i++){const z=t.values[i*4+2];if(z>best){best=z;at=t.times[i]/clip.duration;}}return at;};
   const lags=[...Array(8).keys()].map(i=>yawPeak('tail_0'+i));
   for(let i=1;i<8;i++){const d=(lags[i]-lags[i-1]+1)%1;assert(d>0.03&&d<0.22,name+' caudal wave must travel: joint '+i+' lag '+d.toFixed(3));}
   assert(tip>4*skull,name+' must be axial: tail tip '+tip.toFixed(3)+' vs skull '+skull.toFixed(3));
   assert(skull<.30,name+' the head must not slew: '+skull.toFixed(3));
   report.gait.push({clip:name,tailTipLateral:tip,skullLateral:skull,caudalPhaseLags:lags});
  }
  // ---- the neck ------------------------------------------------------------------------------
  // A neck that bends only at its base reads as a hosepipe. Three separate things are checked, on
  // the two clips that are entirely about the neck, plus one on an ordinary swim.
  report.neck=[];
  const idleSkullY=track('Idle',12).reduce((s,r)=>s+r.skull[1],0)/13;
  for(const name of ['NeckStrike','Ability','Periscope','Swim']){
   const clip=gltf.animations.find(a=>a.name===name);
   const rows=track(name,120);
   // 1. how many of the thirty-two joints actually work
   const ptp=n=>{const t=clip.tracks.find(k=>k.name===n+'.quaternion');let lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9];
    for(let i=0;i<t.times.length;i++)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],t.values[i*4+k]);hi[k]=Math.max(hi[k],t.values[i*4+k]);}
    return Math.max(hi[0]-lo[0],hi[1]-lo[1],hi[2]-lo[2]);};
   const amps=NECK.map(ptp);
   // "Working" is relative to the busiest joint in this clip, with an absolute floor at a
   // fortieth of a degree, because the question is whether the bend is spread along the chain and
   // not whether a slow swim happens to be a big movement.
   const busiest=Math.max(...amps);
   const working=amps.filter(a=>a>Math.max(2e-4,.08*busiest)).length;
   // 2. the bend is spread along the chain, not concentrated at one joint
   const sorted=[...amps].sort((a,b)=>a-b);const median=sorted[Math.floor(sorted.length/2)];
   const spread=median/Math.max(...amps);
   // 3. the curve travels: each joint's peak comes after the one behind it
   const peak=n=>{const t=clip.tracks.find(k=>k.name===n+'.quaternion');let best=-Infinity,at=0;
    for(let i=0;i<t.times.length;i++){const z=Math.abs(t.values[i*4+2]);if(z>best){best=z;at=t.times[i]/clip.duration;}}return at;};
   const peaks=NECK.map(peak);
   const rising=peaks.slice(1).filter((p,i)=>p>=peaks[i]-1e-9).length;
   // 4. the head goes somewhere the body does not
   const head=travel(rows,'skull'),chest=travel(rows,'chest');
   const row={clip:name,jointsWorking:working,medianOverMaxAmplitude:spread,
    monotoneRisingPeaks:rising,ofPairs:CERVICALS-1,skullTravel:head,chestTravel:chest,reachRatio:head/Math.max(1e-6,chest)};
   report.neck.push(row);
   assert(working>=30,name+': only '+working+' of 32 cervicals move -- the neck is a hosepipe');
   assert(spread>.12,name+': the bend is concentrated in one joint, median/max '+spread.toFixed(3));
   row.firstPeakPhase=peaks[0];row.lastPeakPhase=peaks[CERVICALS-1];
   if(name==='NeckStrike'||name==='Ability'){
    assert(rising>=Math.round(CERVICALS*.6),name+': the strike must run down the chain, '+rising+' of '+(CERVICALS-1)+' joints peak in order');
    assert(peaks[CERVICALS-1]>peaks[0]+.02,name+': the skull end must peak after the shoulder end, '+peaks[0].toFixed(3)+' then '+peaks[CERVICALS-1].toFixed(3));
    assert(head>6*chest,name+': the head must reach while the body stays put, '+head.toFixed(3)+' vs '+chest.toFixed(3));
   }
   if(name==='Periscope'){
    const mean=rows.reduce((s,r)=>s+r.skull[1],0)/rows.length;row.skullMeanHeight=mean;row.idleSkullHeight=idleSkullY;
    assert(mean>idleSkullY+.5,'Periscope must stand the head up: '+mean.toFixed(3)+' against Idle '+idleSkullY.toFixed(3));
   }
  }
 }
}
report.exactRigParity=true;report.exactAnimationParity=true;report.exactAnchorParity=true;report.normalizedWeights=true;
delete report.rig;
fs.writeFileSync('tools/triassic/creatures/dinocephalosaurus/paired-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({models:report.models,lodTriangleFraction:report.lodTriangleFraction,clips:report.clipSignatures.length,
 exactRigParity:true,exactAnimationParity:true,gait:report.gait,neck:report.neck},null,2));
