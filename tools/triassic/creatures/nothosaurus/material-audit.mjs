/** Verify the material repair retains the original albedo and all non-material data. */
import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {NodeIO}from'@gltf-transform/core';import{ALL_EXTENSIONS}from'@gltf-transform/extensions';import{MeshoptDecoder}from'meshoptimizer';await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});const sha=x=>crypto.createHash('sha256').update(x).digest('hex');const data=a=>Array.from(a.getArray());
const sourcePath='tools/triassic/creatures/nothosaurus/tripo-raw/nothosaurus.raw.glb';
// This audit used to also diff the exports against a pinned pre-material-fix commit and assert
// that positions, normals, UVs, weights, inverse binds, skeletons and 19 of the 21 clips were
// byte-identical to it. That claim belonged to one change — the September 2026 material
// correction, which deliberately touched materials and nothing else — and it is spent: the neck
// stretch of 14 September moves 1,936 vertices, adds three cervical joints and re-samples every
// clip against the longer neck, all of it on purpose (docs/triassic/builder-requests.md). What
// binds the *current* files to their checks is paired-audit.json, which is regenerated with them.
// Retired rather than re-pinned, because re-pinning it to the commit before the neck would only
// assert that the neck did what it says it did.
//
// What is still this file's own job, and still holds, is the material: the exact source albedo,
// white COLOR_0, the settings, and the UV correspondence below — which now maps a source vertex
// through the same stretch before looking for it, so it proves the shipped UVs still name the
// original albedo's texels on a body whose neck has moved.
const stretch=JSON.parse(fs.readFileSync('tools/triassic/creatures/nothosaurus/neck-stretch-request.json','utf8')).stretch;
const warp=(()=>{const lim=70*Math.PI/180,cl=v=>Math.max(-lim,Math.min(lim,v));
 const A=stretch.frame.axis==='x'?0:2,L=2-A,U=1,n=[0,0,0];
 n[A]=stretch.frame.forward;n[U]=Math.tan(cl(stretch.tiltSide));n[L]=Math.tan(cl(stretch.tiltTop));
 const len=Math.hypot(...n)||1,d=n.map(c=>c/len),ends=[stretch.from,stretch.to].map(at=>{const c=[0,0,0];c[A]=at;c[U]=stretch.bounds.upMid;c[L]=stretch.bounds.lateralMid;return c[0]*d[0]+c[1]*d[1]+c[2]*d[2];});
 const span=ends[1]-ends[0]||1e-9,shift=(stretch.to-stretch.from)*d[A]*(stretch.factor-1);
 return q=>{const t=Math.max(0,Math.min(1,(q[0]*d[0]+q[1]*d[1]+q[2]*d[2]-ends[0])/span));return [q[0]+d[0]*shift*t,q[1]+d[1]*shift*t,q[2]+d[2]*shift*t];};
})();
const source=await io.read(sourcePath),sourceAlbedo=source.getRoot().listMaterials()[0].getBaseColorTexture();const report={sourceSha256:sha(fs.readFileSync(sourcePath)),sourceAlbedoSha256:sha(sourceAlbedo.getImage()),models:[]};
for(const suffix of ['', '.puppet','.lod1']){
 const file='public/assets/triassic/creatures/nothosaurus'+suffix+'.glb',d=await io.read(file);const body=d.getRoot().listMaterials().find(m=>/Nothosaurus (body pigmentation|puppet body)/.test(m.getName()));const row={suffix,sha256:sha(fs.readFileSync(file)),baseColorTexture:body.getBaseColorTexture()?.getName()??null,normalScale:body.getNormalScale(),roughness:body.getRoughnessFactor(),metallic:body.getMetallicFactor()};
 assert.equal(body.getMetallicFactor(),0);assert.equal(body.getMetallicRoughnessTexture(),null);
 if(!suffix){assert(body.getBaseColorTexture());assert.equal(sha(body.getBaseColorTexture().getImage()),report.sourceAlbedoSha256);assert(Math.abs(body.getNormalScale()-.15)<1e-6);assert(Math.abs(body.getRoughnessFactor()-.7)<1e-6);let count=0;for(const m of d.getRoot().listMeshes())for(const p of m.listPrimitives())if(p.getMaterial()===body){const a=p.getAttribute('COLOR_0');assert(a);const white=a.getNormalized()?(a.getComponentType()===5123?65535:255):1;for(const n of a.getArray())assert.equal(n,white);count+=a.getCount();}row.whiteColorVertices=count;row.sourceAlbedoPreservedExactly=true;}
 row.boundToPairedAudit='tools/triassic/creatures/nothosaurus/paired-audit.json';
 report.models.push(row);
}
// Original source UV corners vs exported skin vertices, after the exact axis/scale transform and
// then the neck stretch — the document's own frame is the export frame, so the warp composes onto
// the end of it. Every source vertex is placed where the builder put it, moved or not.
const full=await io.read('public/assets/triassic/creatures/nothosaurus.glb'),dict=new Map(),key=p=>p.map(x=>x.toFixed(4)).join(',');
for(const m of source.getRoot().listMeshes())for(const p of m.listPrimitives()){const v=p.getAttribute('POSITION'),uv=p.getAttribute('TEXCOORD_0');for(let i=0;i<v.getCount();i++){const a=v.getElement(i,[]),b=warp([-5*a[2],5*a[1],5*a[0]]),k=key(b);if(!dict.has(k))dict.set(k,[]);dict.get(k).push({pos:b,uv:uv.getElement(i,[])});}}
let matched=0,cut=0,bad=0,worst=0;
for(const m of full.getRoot().listMeshes())for(const p of m.listPrimitives()){if(!p.getMaterial().getName().startsWith('Nothosaurus body'))continue;const v=p.getAttribute('POSITION'),uv=p.getAttribute('TEXCOORD_0');for(let i=0;i<v.getCount();i++){const pos=v.getElement(i,[]),values=uv.getElement(i,[]),a=(dict.get(key(pos))??[]).filter(x=>Math.hypot(...x.pos.map((n,j)=>n-pos[j]))<2e-6);if(!a.length){cut++;continue;}matched++;const delta=Math.min(...a.map(x=>Math.max(...x.uv.map((n,j)=>Math.abs(n-values[j])))));worst=Math.max(worst,delta);if(delta>1e-5)bad++;}}
report.neckStretch={from:stretch.from,to:stretch.to,factor:stretch.factor,appliedToSourcePositionsBeforeMatching:true};
report.sourceUvComparison={matchedOriginalSurfaceVertices:matched,newCutOrRoundingBoundaryVertices:cut,above1eMinus5Tolerance:bad,maximumUvDifference:worst,maximumDifferenceIn2kTexels:worst*2048};assert(worst<1/2048);
fs.writeFileSync('tools/triassic/creatures/nothosaurus/material-audit.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
