/**
 * Decode the paired exports, prove exact rig/socket/clip parity, then sample real Three.js
 * skinning. Two gait assertions are specific to this animal: Swim must be tail-driven, and
 * Crawl must be a bounding punt with a long float, not a lizard's trudge.
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
const base='public/assets/triassic/creatures/placodus';
const LOOPS=['Idle','Swim','Sprint','Guard','Eat','Crawl','Pry','Breathe'];
const CLIPS=25,JOINTS=26,SOCKETS=3;
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const data=a=>a?Array.from(a.getArray()):null;
const skeleton=d=>d.getRoot().listSkins().map(s=>({joints:s.listJoints().map(n=>({name:n.getName(),parent:n.getParentNode()?.getName(),t:n.getTranslation(),r:n.getRotation(),s:n.getScale()})),bind:data(s.getInverseBindMatrices())}));
const clips=d=>d.getRoot().listAnimations().map(a=>({name:a.getName(),channels:a.listChannels().map(c=>({node:c.getTargetNode().getName(),path:c.getTargetPath(),interpolation:c.getSampler().getInterpolation(),times:data(c.getSampler().getInput()),values:data(c.getSampler().getOutput())})).sort((x,y)=>(x.node+x.path).localeCompare(y.node+y.path))})).sort((a,b)=>a.name.localeCompare(b.name));
const sockets=d=>d.getRoot().listNodes().filter(n=>n.getName().startsWith('anchor_')).map(n=>({name:n.getName(),parent:n.getParentNode().getName(),t:n.getTranslation(),r:n.getRotation(),metadata:n.getExtras()})).sort((a,b)=>a.name.localeCompare(b.name));
const meshValues=d=>d.getRoot().listMeshes().map(m=>m.listPrimitives().map(p=>p.listSemantics().sort().map(s=>[s,data(p.getAttribute(s))])));
if(process.argv.includes('--decode'))for(const suffix of ['','.puppet']){
 const d=await io.read(base+suffix+'.glb');
 for(const e of d.getRoot().listExtensionsUsed())if(e.extensionName==='EXT_meshopt_compression')e.dispose();
 fs.mkdirSync('local/triassic-authoring/placodus',{recursive:true});
 fs.writeFileSync('local/triassic-authoring/placodus/placodus'+suffix+'.unpacked.glb',await io.writeBinary(d));
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
 // The gastral basket is a rigid part: its bone exists, is skinned, and is never animated.
 assert(sk[0].joints.some(j=>j.name==='gastralia'),'the armour bone is in the skin');
 for(const a of c)for(const ch of a.channels)assert.notEqual(ch.node,'gastralia',a.name+' animates the rigid armour');
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
  const track=(name,n)=>{mixer.stopAllAction();const clip=gltf.animations.find(a=>a.name===name);mixer.clipAction(clip).play();const rows=[];
   for(let i=0;i<=n;i++){mixer.setTime(clip.duration*i/n);scene.updateMatrixWorld(true);const row={phase:i/n};
    for(const b of Object.keys(bones)){bones[b].getWorldPosition(v);row[b]=v.toArray();}rows.push(row);}
   return rows;};
  const span=(rows,b,axis)=>Math.max(...rows.map(r=>r[b][axis]))-Math.min(...rows.map(r=>r[b][axis]));
  const phaseOf=(rows,b,axis,pick)=>rows[rows.map(r=>r[b][axis]).indexOf(pick(...rows.map(r=>r[b][axis])))].phase;
  // glTF axes on this rig: X is the animal's left (lateral), Y up, Z forward.
  report.gait=[];
  for(const name of ['Swim','Sprint']){
   const rows=track(name,120);
   const tip=span(rows,'tail_06',0),skull=span(rows,'skull',0);
   // A travelling wave, not a standing one: read the authored yaw of each caudal joint out of the
   // sampled rotation track and check every joint peaks later than the one in front of it.
   const clip=gltf.animations.find(a=>a.name===name);
   // Bone-local axes keep Blender's convention through the exporter (the bone runs along its own
   // +Y and yaw is its local Z), so the caudal sweep is the quaternion's z component.
   const yawPeak=bone=>{const t=clip.tracks.find(k=>k.name===bone+'.quaternion');
    let best=-Infinity,at=0;for(let i=0;i<t.times.length;i++){const z=t.values[i*4+2];if(z>best){best=z;at=t.times[i]/clip.duration;}}return at;};
   const lags=[...Array(7).keys()].map(i=>yawPeak('tail_0'+i));
   const fore=span(rows,'fore_paddle_L',0)+span(rows,'fore_paddle_R',0);
   for(let i=1;i<7;i++){const d=(lags[i]-lags[i-1]+1)%1;assert(d>0.04&&d<0.20,name+' caudal wave must travel: joint '+i+' lag '+d.toFixed(3));}
   assert(tip>4*skull,name+' must be tail-driven: tip '+tip.toFixed(3)+' vs skull '+skull.toFixed(3));
   assert(skull<.25,name+' skull must not slew: '+skull.toFixed(3));
   assert(fore<tip*.8,name+' forelimbs must trail, not row: '+fore.toFixed(3)+' vs '+tip.toFixed(3));
   report.gait.push({clip:name,tailTipLateral:tip,skullLateral:skull,forePaddleLateral:fore,caudalPhaseLags:lags});
  }
  {
   const rows=track('Crawl',120);
   const y=rows.map(r=>r.body[1]),lo=Math.min(...y),hi=Math.max(...y);
   const floatFraction=y.filter(q=>q>lo+(hi-lo)*.5).length/y.length;
   // The shove is where a paddle is rearmost; the reach is where it is furthest forward.
   const rear=n=>phaseOf(rows,n,2,Math.min),front=n=>phaseOf(rows,n,2,Math.max);
   const forePush=(rear('fore_paddle_L')+rear('fore_paddle_R'))/2,hindPush=(rear('hind_paddle_L')+rear('hind_paddle_R'))/2;
   const foreReach=(front('fore_paddle_L')+front('fore_paddle_R'))/2,hindReach=(front('hind_paddle_L')+front('hind_paddle_R'))/2;
   const gap=(hindPush-forePush+1)%1;
   assert(hi-lo>.15,'Crawl must spring off the floor: rise '+(hi-lo).toFixed(3));
   assert(floatFraction>.55,'Crawl must float for most of the cycle: '+floatFraction.toFixed(3));
   assert(Math.abs(rear('fore_paddle_L')-rear('fore_paddle_R'))<.05,'the fore pair must shove together');
   assert(Math.abs(rear('hind_paddle_L')-rear('hind_paddle_R'))<.05,'the hind pair must shove together');
   assert(gap>.03&&gap<.35,'the hind pair must shove after the fore pair: '+gap.toFixed(3));
   assert(foreReach>.55&&hindReach>.6,'the reach for the next contact must come after the float: '+foreReach.toFixed(3)+'/'+hindReach.toFixed(3));
   const swimRows=track('Swim',120);
   const crawlLimb=span(rows,'hind_paddle_L',1),swimLimb=span(swimRows,'hind_paddle_L',1);
   assert(crawlLimb>swimLimb*1.5,'Crawl must work the limbs far harder than Swim: '+crawlLimb.toFixed(3)+' vs '+swimLimb.toFixed(3));
   report.crawl={bodyRise:hi-lo,floatFraction,forePushPhase:forePush,hindPushPhase:hindPush,
    foreReachPhase:foreReach,hindReachPhase:hindReach,
    hindPaddleTravelCrawl:crawlLimb,hindPaddleTravelSwim:swimLimb};
  }
 }
}
report.exactRigParity=true;report.exactAnimationParity=true;report.exactAnchorParity=true;report.normalizedWeights=true;
report.rigidArmourNeverAnimated=true;delete report.rig;
fs.writeFileSync('tools/triassic/creatures/placodus/paired-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({models:report.models,lodTriangleFraction:report.lodTriangleFraction,clips:report.clipSignatures.length,
 exactRigParity:true,exactAnimationParity:true,gait:report.gait,crawl:report.crawl},null,2));
