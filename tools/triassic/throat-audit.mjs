/** Audit the actual shipped authored/puppet surfaces over every clip, not builder promises.
 * Edge strain is a diagnostic, not proof of intersection-free or watertight geometry.
 * Run: node tools/triassic/throat-audit.mjs [id...] [--out=path]
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'meshoptimizer';
await MeshoptDecoder.ready;
globalThis.self=globalThis;
globalThis.createImageBitmap=async()=>({width:2048,height:2048,close(){}});
const args=process.argv.slice(2), ids=args.filter(a=>!a.startsWith('--'));
const roster=ids.length?ids:JSON.parse(fs.readFileSync('tools/triassic/shipped.json')).creatures;
const out=args.find(a=>a.startsWith('--out='))?.slice(6)||'docs/triassic/throat-audit.json';
const oral=/lining|mouth[ _]interior|hinge[ _]tissue|beak|palate/i;
const report={schema:1,phases:25,method:'Three.js GLTFLoader/AnimationMixer; all shipped authored and puppet clips, 25 samples including clamped endpoints; skin and hidden oral surfaces recorded separately; mouth region selected by jaw/skull/neck/pouch influences. Strain flags require posed edge >1.5% body length and ratio >2. No automatic claim of intersection-free geometry.',models:[]};
const vec=new THREE.Vector3();
for(const id of roster)for(const suffix of ['', '.puppet']){
 const file=`public/assets/triassic/creatures/${id}${suffix}.glb`;
 if(!fs.existsSync(file))continue;
 const bytes=fs.readFileSync(file),g=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const meshes=[];g.scene.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o)});
 const mixer=new THREE.AnimationMixer(g.scene);
 const sample=()=>{g.scene.updateMatrixWorld(true);for(const m of meshes)m.skeleton.update();return meshes.map(m=>{const p=[];for(let i=0;i<m.geometry.attributes.position.count;i++){m.getVertexPosition(i,vec).applyMatrix4(m.matrixWorld);p.push(vec.clone())}return p})};
 const rest=sample(),box=new THREE.Box3().setFromPoints(rest.flat()),L=Math.max(...box.getSize(vec).toArray());
 const mr=meshes.map((m,mi)=>{const a=m.geometry.attributes, names=m.skeleton.bones.map(b=>b.name),seen=new Set(),edges=[];
 const named=oral.test(m.name+' '+[m.material].flat().map(x=>x.name).join(' '));
 const mouth=i=>{let w=0;for(let k=0;k<4;k++)if(/jaw|skull|neck|pouch/.test(names[a.skinIndex.getComponent(i,k)]))w+=a.skinWeight.getComponent(i,k);return w>.25};
 const ix=m.geometry.index;for(let t=0;t<ix.count;t+=3){let tr=[ix.getX(t),ix.getX(t+1),ix.getX(t+2)];for(let k=0;k<3;k++){const u=tr[k],v=tr[(k+1)%3],key=Math.min(u,v)+','+Math.max(u,v);if(seen.has(key))continue;seen.add(key);edges.push({u,v,r:rest[mi][u].distanceTo(rest[mi][v]),mouth:mouth(u)||mouth(v)})}}
 let mixed=0;for(let i=0;i<a.position.count;i++){let jaw=0,skull=0;for(let k=0;k<4;k++){const n=names[a.skinIndex.getComponent(i,k)],w=a.skinWeight.getComponent(i,k);if(n==='jaw')jaw+=w;if(n==='skull')skull+=w}if(jaw>1e-5&&skull>1e-5)mixed++}
 return {name:m.name,hiddenOral:named,vertices:a.position.count,mixedJawSkullVertices:mixed,edges};});
 const row={id,variant:suffix?'puppet':'authored',sha256:crypto.createHash('sha256').update(bytes).digest('hex'),length:L,meshes:mr.map(({edges,...m})=>m),clips:[]};
 for(const clip of g.animations){mixer.stopAllAction();const action=mixer.clipAction(clip).reset().setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
 const c={name:clip.name,duration:clip.duration,skin:{ratio:1},mouthSkin:{ratio:1},hiddenOral:{ratio:1}};
 for(let p=0;p<25;p++){mixer.setTime(clip.duration*p/24);const pts=sample();for(let mi=0;mi<mr.length;mi++)for(const e of mr[mi].edges){if(e.r<1e-6)continue;const length=pts[mi][e.u].distanceTo(pts[mi][e.v]);if(length<L*.015)continue;const ratio=length/e.r;const cats=mr[mi].hiddenOral?['hiddenOral']:['skin',...(e.mouth?['mouthSkin']:[])];for(const cat of cats)if(ratio>c[cat].ratio)c[cat]={ratio,rest:e.r,posed:length,phase:p/24,mesh:mr[mi].name,vertices:[e.u,e.v]};}}
 row.clips.push(c);
 }
 row.worstMouth=row.clips.reduce((a,c)=>c.mouthSkin.ratio>a.ratio?{...c.mouthSkin,clip:c.name}:a,{ratio:1});
 report.models.push(row);console.log(id,row.variant,row.clips.length,'clips; mouth',row.worstMouth.ratio.toFixed(2));
}
fs.mkdirSync(new URL('.',new URL(out,`file://${process.cwd()}/`)),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
