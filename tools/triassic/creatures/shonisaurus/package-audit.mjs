import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { MeshoptEncoder,MeshoptDecoder } from 'meshoptimizer';
import { appendAnchors } from '../../../creatures/add-anchors.mjs';
const base='local/triassic-authoring/shonisaurus', out='public/assets/triassic/creatures', here='tools/triassic/creatures/shonisaurus';
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const hash=a=>createHash('sha256').update(a).digest('hex');
const arr=a=>Array.from(a?.getArray()??[]);
const anchors=JSON.parse(fs.readFileSync(`${here}/anchors.json`));
const feeding=new Set(['Bite','Attack','Heavy','Eat']);
const meta=JSON.parse(fs.readFileSync(`${out}/shonisaurus.json`));
const buildReport=JSON.parse(fs.readFileSync(`${here}/build-report.json`));
// The runtime's oral classifier (src/shared/oral-geometry.ts). This animal carries **one** thing it
// matches and no palate, floor, throat tube or tooth row: the seam web, the ruled surface between
// the two copies of the rim the mandible split drew through solid head behind the modelled gape.
// It is hidden in play like all oral geometry; the point of naming it here is that nothing *else*
// may appear, which is the verdict this body has always shipped under.
const ORAL=/lining|mouth[ _]interior|hinge[ _]tissue|beak|palate/i;
const SEAM_WEB='Mouth interior seam web';
const numDigest=a=>hash(Buffer.from(new Float64Array(arr(a)).buffer));
function skeleton(doc){const skin=doc.getRoot().listSkins()[0];return {joints:skin.listJoints().map(n=>({name:n.getName(),parent:n.getParentNode()?.getName(),translation:n.getTranslation(),rotation:n.getRotation(),scale:n.getScale()})),inverseBind:numDigest(skin.getInverseBindMatrices())};}
function geometry(doc){return doc.getRoot().listMeshes().map(m=>({name:m.getName(),primitives:m.listPrimitives().map(p=>({triangles:(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,attributes:p.listSemantics().sort().map(s=>[s,numDigest(p.getAttribute(s))])}))}));}
function clips(doc){return doc.getRoot().listAnimations().map(a=>({name:a.getName(),channels:a.listChannels().map(c=>({node:c.getTargetNode().getName(),path:c.getTargetPath(),input:numDigest(c.getSampler().getInput()),output:numDigest(c.getSampler().getOutput())})).sort((a,b)=>(a.node+a.path).localeCompare(b.node+b.path))})).sort((a,b)=>a.name.localeCompare(b.name));}
function removeNeutralExportNoise(doc){
 for(const action of doc.getRoot().listAnimations())for(const channel of [...action.listChannels()]){
  const values=arr(channel.getSampler().getOutput());
  if(channel.getTargetPath()==='scale'){
   assert(values.every(value=>Math.abs(value-1)<1e-5),`${action.getName()}: non-neutral scale channel`);channel.dispose();continue;
  }
  if(channel.getTargetNode().getName()==='root'){
   const size=channel.getSampler().getOutput().getElementSize();
   const rest=values.slice(0,size);
   assert(values.every((value,index)=>Math.abs(value-rest[index%size])<1e-5),`${action.getName()}: root motion`);
   channel.dispose();
  }
 }
}
function check(doc,label){
 const root=doc.getRoot(), animations=root.listAnimations(),names=animations.map(a=>a.getName());assert.deepEqual([...names].sort(),[...meta.clips].sort());
 for(const n of root.listNodes())if(n.getMesh())for(const p of n.getMesh().listPrimitives())assert(n.getName()===SEAM_WEB||!ORAL.test(`${n.getName()} ${n.getMesh().getName()} ${p.getMaterial()?.getName()??''}`),`${label} ${n.getName()}: oral geometry beyond the seam web, on an animal that carries none`);
 // The twin's rostrum is two separate closed lofts, so it has no cut and nothing to fill: the web
 // belongs to the authored body alone, and that is a fact about the twin rather than an omission.
 assert.equal(root.listNodes().filter(n=>n.getName()===SEAM_WEB).length,label==='full'?1:0,`${label}: the seam web belongs to the authored body alone`);
 const signatures=new Set();let weights=0,tris=0;const winding=[];
 for(const m of root.listMeshes())for(const p of m.listPrimitives()){
  tris+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3;
  if(m.getName().startsWith('Puppet')){const vs=p.getAttribute('POSITION').getArray(),ids=p.getIndices().getArray();let volume=0;for(let k=0;k<ids.length;k+=3){const a=ids[k]*3,b=ids[k+1]*3,c=ids[k+2]*3;volume+=(vs[a]*(vs[b+1]*vs[c+2]-vs[b+2]*vs[c+1])+vs[a+1]*(vs[b+2]*vs[c]-vs[b]*vs[c+2])+vs[a+2]*(vs[b]*vs[c+1]-vs[b+1]*vs[c]))/6;}assert(volume>0,`${m.getName()}: inward single-sided shell`);winding.push({mesh:m.getName(),signedVolume:volume,doubleSided:p.getMaterial().getDoubleSided()});}

  for(const a of p.listAttributes())for(const n of arr(a))assert(Number.isFinite(n));
  const w=p.getAttribute('WEIGHTS_0');assert(w,`${label} ${m.getName()} is unskinned`);
  for(let i=0;i<w.getCount();i++){const v=w.getElement(i,[]);assert(Math.abs(v.reduce((a,b)=>a+b,0)-1)<1e-5);assert(v.every(n=>n>=0&&n<=1));weights++;}
 }
 const measures=[];
 for(const a of animations){let dynamic=0,duration=0,seam=0,signature=[];
  for(const c of a.listChannels()){
   const sm=c.getSampler(),times=arr(sm.getInput()),values=arr(sm.getOutput()),size=sm.getOutput().getElementSize(),target=c.getTargetNode().getName(),path=c.getTargetPath();
   assert(times.length>1);for(let i=1;i<times.length;i++)assert(times[i]>times[i-1]);duration=Math.max(duration,times.at(-1));
   let range=0;for(let i=0;i<values.length;i++)range=Math.max(range,Math.abs(values[i]-values[i%size]));
   if(path==='scale')assert(values.every(v=>Math.abs(v-1)<1e-6),'Animated scale forbidden');
   if(target==='root')assert(range<1e-6,'Root motion forbidden');
   if(target==='jaw'&&!feeding.has(a.getName()))assert(range<1e-7,`${label} ${a.getName()}: mouth moves outside feeding`);
   if(range>1e-5&&path!=='scale')dynamic++;
   if(meta.looping.includes(a.getName())){let direct=0,negated=0;for(let k=0;k<size;k++){direct=Math.max(direct,Math.abs(values[k]-values[values.length-size+k]));negated=Math.max(negated,Math.abs(values[k]+values[values.length-size+k]));}seam=Math.max(seam,Math.min(direct,path==='rotation'?negated:Infinity));}
   signature.push([target,path,values]);
  }
  assert(dynamic>0&&duration>0);assert(seam<1e-5,`${label} loop seam ${a.getName()}`);const sig=hash(JSON.stringify(signature));assert(!signatures.has(sig),'Duplicate actions');signatures.add(sig);measures.push({name:a.getName(),duration,dynamicChannels:dynamic,seam});
 }
 const socketRecords=root.listNodes().filter(n=>n.getName().startsWith('anchor_')).map(n=>({name:n.getName(),parent:n.getParentNode().getName(),translation:n.getTranslation(),extras:n.getExtras()}));assert.equal(socketRecords.length,3);
 for(const n of socketRecords)assert.equal(n.parent,n.extras.cambrianAnchor.parentBone);
 return {closedSurfaceWinding:winding,triangles:tris,weightedVertices:weights,bones:skeleton(doc).joints.length,clips:measures,sockets:socketRecords};
}
const results={},docs={};
for(const [src,suffix]of [['full',''],['puppet','.puppet']]){
 const doc=await io.read(`${base}/shonisaurus.${src}.uncompressed.glb`);removeNeutralExportNoise(doc);const before={skeleton:skeleton(doc),clips:clips(doc),geometry:geometry(doc)};
 doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.QUANTIZE});
 const bytes=appendAnchors(Buffer.from(await io.writeBinary(doc)),anchors).bytes;assert(bytes.length<25*1024*1024);
 const file=`${out}/shonisaurus${suffix}.glb`;fs.writeFileSync(file,bytes);const decoded=await io.read(file);assert.deepEqual(skeleton(decoded),before.skeleton);assert.deepEqual(clips(decoded),before.clips);assert.deepEqual(geometry(decoded),before.geometry);docs[src]=decoded;results[src]={...check(decoded,src),bytes:bytes.length,sha256:hash(bytes)};
}
assert.deepEqual(skeleton(docs.full),skeleton(docs.puppet));assert.deepEqual(clips(docs.full),clips(docs.puppet));assert.deepEqual(results.full.sockets,results.puppet.sockets);assert(results.puppet.triangles<results.full.triangles*.4);
fs.copyFileSync(`${out}/shonisaurus.puppet.glb`,`${out}/shonisaurus.lod1.glb`);
fs.writeFileSync(`${here}/validation.json`,JSON.stringify({passed:true,exactSkeletonParity:true,exactAnimationParity:true,exactSocketParity:true,losslessAnimationPackaging:true,losslessMeshAttributePackaging:true,nonfeedingJawMotion:false,mouthOpeningClips:[...feeding],oralGeometry:buildReport.oralGeometry,eyes:buildReport.eyes,...results},null,2)+'\n');
console.log(JSON.stringify({full:results.full.bytes,puppet:results.puppet.bytes,fullTriangles:results.full.triangles,puppetTriangles:results.puppet.triangles,bones:results.full.bones,clips:meta.clips.length,parity:'exact'},null,2));

for(const kind of ['full','puppet']){const doc=docs[kind];for(const ext of doc.getRoot().listExtensionsUsed())if(ext.extensionName==='EXT_meshopt_compression')ext.dispose();await io.write(`${base}/shonisaurus.${kind}.decoded.glb`,doc);}
